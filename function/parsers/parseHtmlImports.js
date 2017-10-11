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

function parseDOM(data, name, link) {
  data = `
<!-- [importHtml] module ${name} from ${link} -->

${data}

<!-- [importHtml] endmodule ${name} from ${link} -->

`;
  return htmlParser.parseDOM(data);
}

function getDepHtmlLink(node) {
  if (node.name === 'script')
    return node.attribs.src;
  if (node.name === 'link')
    return node.attribs.href;
  throw new Error("added a node as a dependency that is not handled");
}

function bundleHtmlFiles(manifest) {
  let bundle = manifest.entry.parsed;
  for (let file of manifest.files) {
    let loaderIndex = bundle.indexOf(file.loaderTag);
    if (isScript(file.loaderTag)) {
      file.data = '<script>' + file.data + '</script>';
      file.parsed = htmlParser.parseDOM(file.data);
    }
    bundle.splice.apply(bundle, [loaderIndex, 1].concat(file.parsed));
  }
  return commentResolvedLoaders(bundle);
}

function commentResolvedLoaders(bundle) {
  return bundle.map((node) => {
    if (isScript(node) || isHtmlImport(node)) {
      return htmlParser.parseDOM(`<!-- [resolved module] ${serializeDOM(node)} -->`)[0];
    } else {
      return node;
    }
  });
}

function parseHtmlImports(initiator, dependency, manifest) {
  let _dependency;
  if (!manifest) {
    _dependency = {
      dependencies: [],
      url: dependency.url,
    };
    manifest = {
      entry: _dependency,
      files: []
    };
  } else {
    _dependency = {
      initiator: initiator,
      dependencies: [],
      url: dependency.url,
      loaderTag: dependency.parsed
    };
    _dependency.initiator.dependencies.push(_dependency);
    manifest.files.push(_dependency);
  }
  if (isModule(_dependency.loader)) {
    _dependency.data = parseJsImports(_dependency.url);
  } else {
    _dependency.data = request('GET', _dependency.url).getBody().toString();
  }
  _dependency.name = _dependency.url.substr(_dependency.url.lastIndexOf('/') + 1);
  _dependency.parsed = parseDOM(_dependency.data, _dependency.name, _dependency.url);

  let dependencies = _dependency.parsed.filter((node) => (isScript(node) || isHtmlImport(node)));
  dependencies = dependencies.map((dep) => ({ url: url.resolve(_dependency.url, getDepHtmlLink(dep)), parsed: dep }));
  for (let dep of dependencies) {
    let isResolved = manifest.files.find((file) => file.url === dep.url) || manifest.entry.url === dep.url;
    if (!isResolved)
      parseHtmlImports(_dependency, dep, manifest);
  }
  return manifest;
}

module.exports = function(link) {
  const manifest = parseHtmlImports(null, { url: link, parsed: null });
  const bundleDOM = bundleHtmlFiles(manifest);
  return serializeDOM(bundleDOM);
};