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
      "type": "script",
      "name": "script",
      "attribs": {},
      "children": [
        {
          "data": entry.data,
          "type": "text"
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
    .concat(entry.dataParsed)
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
  let bundle = manifest[0].parsed;
  for (let file of manifest.slice(1)) {
    //todo this splicing is more difficult as it needs to work with the dom as a tree structure.
    let loaderIndex = bundle.indexOf(file.loaderTag);
    bundle.splice.apply(bundle, [loaderIndex, 1].concat(file.parsed));
  }
  return bundle;
}

//todo this function needs to be done on the dom as a tree structure.
function getAllImportingTags(dom) {
  return dom.filter((node) => (isScript(node) || isHtmlImport(node)));
}

function parseHtmlImports(manifest, entry) {
  entry.name = entry.url.substr(entry.url.lastIndexOf('/') + 1);
  // console.log(entry.url);
  // console.log(manifest.length);
  let isResolved = manifest.find((file) => file.url === entry.url);
  manifest.push(entry);
  if (isResolved) {
    // console.log("duplicate");
    entry.parsed = wrapLoaderTagAsAlreadyResolved(entry.loaderTag);
    // entry.parsed = htmlParser.parseDOM(`<!-- [resolved module] ${serializeDOM(entry.loaderTag)} -->`)[0];
    return;
  }

  if (isModule(entry.loaderTag)) {
    entry.data = parseJsImports(entry.url);
  } else {
    entry.data = request('GET', entry.url).getBody().toString();
  }
  // if (entry.url.endsWith(".html"))
    entry.dataParsed = htmlParser.parseDOM(entry.data);
  if (isScript(entry.loaderTag))
    entry.parsed = wrapScriptData(entry);
  else
    entry.parsed = wrapParsedHtml(entry);

  let loaderTags = getAllImportingTags(entry.parsed);
  entry.dependencies = loaderTags.map((loaderTag) => ({
    parent: entry,
    url: url.resolve(entry.url, getDepHtmlLink(loaderTag)),
    loaderTag: loaderTag
  }));
  for (let dep of entry.dependencies)
    parseHtmlImports(manifest, dep);
}

module.exports = function (link) {
  let entry = {
    parent: null,
    url: link,
    loaderTag: null
  };
  const manifest = [];
  parseHtmlImports(manifest, entry);
  console.log(manifest);
  const bundleDOM = bundleHtmlFiles(manifest);
  return serializeDOM(bundleDOM);
};