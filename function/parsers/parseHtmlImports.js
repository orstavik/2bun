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
  let bundle = manifest[0].parsed;
  for (let file of manifest.slice(1)) {
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

function parseHtmlImports(manifest, entry) {
  if (isModule(entry.loader)) {
    entry.data = parseJsImports(entry.url);
  } else {
    entry.data = request('GET', entry.url).getBody().toString();
  }
  entry.name = entry.url.substr(entry.url.lastIndexOf('/') + 1);
  entry.parsed = parseDOM(entry.data, entry.name, entry.url);

  let dependencies = entry.parsed.filter((node) => (isScript(node) || isHtmlImport(node)));
  dependencies = dependencies.map((loaderTag) => {
    let child = {
      parent: entry,
      url: url.resolve(entry.url, getDepHtmlLink(loaderTag)),
      loaderTag: loaderTag,
      dependencies: []
    };
    entry.dependencies.push(child);
    return child;
    }
  );
  for (let dep of dependencies) {
    let isResolved = manifest.find((file) => file.url === dep.url);
    if (!isResolved) {
      manifest.push(dep);
      parseHtmlImports(manifest, dep);
    }
  }
  return manifest;
}

module.exports = function (link) {
  let entry = {
    parent: null,
    dependencies: [],
    url: link,
    loaderTag: null
  };
  const manifest = parseHtmlImports([], entry);
  const bundleDOM = bundleHtmlFiles(manifest);
  return serializeDOM(bundleDOM);
};