const fs = require('fs');
const Url = require('url');
const Request = require('request');
const htmlParser = require('htmlparser2');
const serializeDOM = require('dom-serializer');

// gcloud beta functions deploy twoBun --stage-bucket staging.two-bun-no.appspot.com --trigger-http

exports.twoBun = (req, resp) => {
  if (req.url === '/') {
    resp.write('Specify url 2bun');
    resp.end();
  }
  const manifest = resolveImports(null, { url: __dirname + req.url, parsed: null });
  const bundleDOM = bundleFiles(manifest);
  const bundle = serializeDOM(bundleDOM);

  resp.setHeader('Content-Type', TYPE['html']);
  resp.write(bundle);
  resp.end();
}

function resolveImports(initiator, dependency, manifest = []) {
  const _dependency = {
    initiator: initiator,
    dependencies: [],
    url: dependency.url,
    loaderTag: dependency.parsed
  };
  _dependency.data = fs.readFileSync(_dependency.url, 'utf8');
  _dependency.name = _dependency.url.substr(_dependency.url.lastIndexOf('/') + 1);

  if (initiator)
    _dependency.initiator.dependencies.push(_dependency);

  manifest.push(_dependency);

  if (!_dependency.loaderTag || isHtmlImport(_dependency.loaderTag)) {
    _dependency.parsed = parseDOM(_dependency.data, _dependency.name, _dependency.url);

    let dependencies = _dependency.parsed.filter((node) => (isScript(node) || isHtmlImport(node)));
    dependencies = dependencies.map((dep) => ({ url: Url.resolve(_dependency.url, getDepLink(dep)), parsed: dep }));
    for (let dep of dependencies) {
      let isResolved = manifest.find((file) => file.url === dep.url);
      if (!isResolved)
        resolveImports(_dependency, dep, manifest);
    }
  }
  return manifest;
  // else if isOtherStuff...
}

function isScript(node) {
  return node && node.type === 'script' && node.name === 'script' && node.attribs.src;
}

function isHtmlImport(node) {
  return node && node.type === 'tag' && node.name === 'link' && node.attribs.rel === 'import';
}

function parseDOM(data, name, url) {
  data = `
<!-- [importHtml] module ${name} from ${url} -->

${data}

<!-- [importHtml] endmodule ${name} from ${url} -->

`;
  return htmlParser.parseDOM(data);
}

function getDepLink(node) {
  if (node.name === 'script')
    return node.attribs.src;
  if (node.name === 'link')
    return node.attribs.href;
  throw new Error("added a node as a dependency that is not handled");
}

function bundleFiles(manifest) {
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

const TYPE = {
  js: 'application/javascript',
  css: 'test/css',
  html: 'text/html',
  json: 'application/json',
  map: 'application/octet-stream'
}