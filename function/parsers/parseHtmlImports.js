const url = require('url');
const request = require('sync-request');
const htmlParser = require('htmlparser2');
const serializeDOM = require('dom-serializer');
const parseJsImports = require('./parseJsImports');

function isScript(node) {
  return node && node.type === 'script' && node.name === 'script' && node.attribs.src;
}

function isModule(node) {
  return isScript(node) && node.attribs.type === 'module';
}

function isHtmlImport(node) {
  return node && node.type === 'tag' && node.name === 'link' && node.attribs.rel === 'import';
}

function wrapScriptData(entry) {
  return [
    {
      type: "comment",
      data: " [script module start] " + entry.url,
    },
    {
      type: "script",
      name: "script",
      attribs: {},
      children: [
        {
          data: entry.jsdata,
          type: "text"
        }
      ]
    },
    {
      type: "comment",
      data: " [script module stop] " + entry.url,
    }
  ];
}

let wrapLoaderTagAsAlreadyResolved = function (loaderTag) {
  return {
    type: "comment",
    data: " [resolved module] " + serializeDOM(loaderTag)
  };
};

function wrapParsedHtml(entry) {
  return [{type: "comment", data: " [html import start] " + entry.url}]
    .concat(entry.domData)
    .concat([{type: "comment", data: " [html import stop] " + entry.url}]);
}

function getDepHtmlLink(node) {
  if (node.name === 'script')
    return node.attribs.src;
  if (node.name === 'link')
    return node.attribs.href;
  throw new Error("added a node as a dependency that is not handled");
}

function bundleHtmlFiles(manifest) {
  let bundle;
  for (let file of manifest) {
    if (bundle === undefined) {
      bundle = file.domData;
      continue;
    }
    let dom;
    //js file import
    if (file.jsdata)                      //js import
      dom = wrapScriptData(file);
    else if (file.domData)                //html import
      dom = wrapParsedHtml(file);
    else                                  //already resolved or not downloaded import
      dom = wrapLoaderTagAsAlreadyResolved(file.loaderTag);

    //todo this splicing is more difficult as it needs to work with the dom as a tree structure.
    let loaderIndex = bundle.indexOf(file.loaderTag);
    bundle.splice.apply(bundle, [loaderIndex, 1].concat(dom));
  }
  return bundle;
}

//todo this function needs to be done on the dom as a tree structure.
function getAllImportingTags(dom) {
  //each loaderTag is a {parent, index, nodeItself};
  return dom.filter((node) => (isScript(node) || isHtmlImport(node)));
}

//todo this function needs to be done on the dom as a tree structure.
function getAllImportingTagsFromChildren(dom) {
  //each loaderTag is a {parent, index, nodeItself};
  return dom.filter((node) => (isScript(node) || isHtmlImport(node)));
}

function getFileNameFromPath(path) {
  return path.substr(path.lastIndexOf('/') + 1);
}

function parseHtmlImports(manifest, entry) {
  let isResolvedOrExcluded = !!manifest.find((file) => {
    const filePath = entry.url.split("?")[0];
    return file.url === entry.url || filePath.endsWith(file.excludeUrl);
  });
  manifest.push(entry);
  if (isResolvedOrExcluded)
    return;

  if (isModule(entry.loaderTag)) {
    entry.jsdata = parseJsImports(entry.url);
  } else if (isScript(entry.loaderTag)) {
    entry.jsdata = request('GET', entry.url).getBody().toString();
  }
  //else if (isCss(entry.loaderTag)) {}
  //else if (isImage(entry.loaderTag)) {}
  else if (!entry.loaderTag || isHtmlImport(entry.loaderTag)) {
    entry.htmlData = request('GET', entry.url).getBody().toString();
    entry.domData = htmlParser.parseDOM(entry.htmlData);

    const loaderTags = getAllImportingTags(entry.domData);
    entry.dependencies = loaderTags.map((loaderTag) => ({
      // parent: entry,
      url: url.resolve(entry.url, getDepHtmlLink(loaderTag)),
      loaderTag: loaderTag
    }));
    for (let dep of entry.dependencies)
      parseHtmlImports(manifest, dep);
  }
}

module.exports = function (link, manifest) {
  let entry = {
    // parent: null,
    url: link,
    loaderTag: null
  };
  parseHtmlImports(manifest, entry);
  console.log(manifest);
  const bundleDOM = bundleHtmlFiles(manifest);
  return serializeDOM(bundleDOM);
};