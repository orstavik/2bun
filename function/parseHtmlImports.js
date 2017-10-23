const url = require('url');
const https = require('https');
const deasync = require('deasync');
// const request = require('sync-request');
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
  for (let i = manifest.length-1; i >= 0; i--) {
    let file = manifest[i];
    let dom;
    //js file import
    if (file.jsdata)                      //js import
      dom = wrapScriptData(file);
    else if (file.domData)                //html import
      dom = wrapParsedHtml(file);
    else                                  //already resolved or not downloaded import
      dom = wrapLoaderTagAsAlreadyResolved(file.loaderTag.node);

    //todo this splicing is more difficult as it needs to work with the dom as a tree structure.

    // let loaderIndex = bundle.indexOf(file.loaderTag);
    // bundle.splice.apply(bundle, [loaderIndex, 1].concat(dom));
    if (!file.loaderTag)
      return file.domData;
    let loaderIndex = file.loaderTag.parent.indexOf(file.loaderTag.node);
    file.loaderTag.parent.splice.apply(file.loaderTag.parent, [loaderIndex, 1].concat(dom));
  }
}

//todo this function needs to be done on the dom as a tree structure.
// function getAllImportingTags(dom) {
//   //each loaderTag is a {parent, index, nodeItself};
//   return dom.filter((node) => (isScript(node) || isHtmlImport(node)));
// }

//todo this function needs to be done on the dom as a tree structure.
function getAllImportingTags(nodes) {
  //each loaderTag is a {parent, index, nodeItself};
  let result = [];
  for (let i = 0; i < nodes.length; i++) {
    let node = nodes[i];
    if (isScript(node) || isHtmlImport(node))
      result.push({
        node: node,
        index: i,
        parent: nodes
      });
    else if (node.children)
      result = result.concat(getAllImportingTags(node.children, result));
  }
  return result;
}

function getFileNameFromPath(path) {
  return path.substr(path.lastIndexOf('/') + 1);
}

let I = 0;

function parseHtmlImports(manifest, entry) {
  let isResolvedOrExcluded = !!manifest.find((file) => {
    const filePath = entry.url.split("?")[0];
    return file.url === entry.url || filePath.endsWith(file.excludeUrl);
  });
  manifest.push(entry);
  if (isResolvedOrExcluded)
    return;

  if (!entry.loaderTag || isHtmlImport(entry.loaderTag.node)) {
    entry.htmlData = syncGet(entry.url);
    entry.domData = htmlParser.parseDOM(entry.htmlData);

    const loaderTags = getAllImportingTags(entry.domData);
    entry.dependencies = loaderTags.map((loaderTag) => ({
      // parent: entry,
      url: url.resolve(entry.url, getDepHtmlLink(loaderTag.node)),
      loaderTag: loaderTag
    }));
    for (let dep of entry.dependencies)
      parseHtmlImports(manifest, dep);
  } else if (isModule(entry.loaderTag.node)) {
    entry.jsdata = parseJsImports(entry.url);
  } else if (isScript(entry.loaderTag.node)) {
    entry.jsdata = syncGet(entry.url);
  }
  //else if (isCss(entry.loaderTag)) {}
  //else if (isImage(entry.loaderTag)) {}
}

function syncGet(link) {
  let end = false;
  let data = '';
  https.get(link, (newResp) => {
    newResp.on('data', (chunk) => {
      data += chunk;
    }).on('end', () => {
      console.log(link, I++, Buffer.byteLength(data,'utf8'));
      end = true;
    });
  });
  deasync.loopWhile(() => !end);
  return data;
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