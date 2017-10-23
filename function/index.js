const parseHtmlImports = require('./parseHtmlImports');
const parseJsImports = require('./parseJsImports');
const url = require('url');

// gcloud beta functions deploy twoBun --stage-bucket staging.two-bun-no.appspot.com --trigger-http

//2bun.no/polygit.org/components/iron-location/iron-location.html?X=polymer.html
//2bun.no/polygit.org/components/iron-location/iron-location.html?X=polymer.html&X=boot.html
function createManifestWithExcludes(link) {
  //wrap individual queries as array
  if (typeof link.query.X === "string")
    link.query.X = [link.query.X];
  if (Array.isArray(link.query.X))
    return link.query.X.map((X) => ({excludeUrl: X}));
  return [];
}


exports.twoBun = (req, resp) => {
  const link = url.parse(req.url, true);
  const manifest = createManifestWithExcludes(link);
  let bundle;
  if (link.pathname.endsWith('html'))
    bundle = parseHtmlImports('https:/' + link.path, manifest);
  else if (link.pathname.endsWith('js'))
    bundle = parseJsImports('https:/' + link.path);//, manifest);
  else //(link.pathname.endsWith('js.map'))
    bundle = '';
  let manifestJSON = manifest.map((entry) => ({
    link: entry.url,
    exclude: entry.excludeUrl,
    dependencies: entry.dependencies ? entry.dependencies.map((dep) => dep.url) : undefined
  }));
  const ext = link.pathname.split('.').pop();
  setHeaders(resp, ext, Buffer.byteLength(bundle,'utf8'));
  resp.write(bundle);
  resp.end();
};

const TYPE = {
  js: 'application/javascript',
  css: 'test/css',
  html: 'text/html',
  json: 'application/json',
  map: 'application/octet-stream'
};

function setHeaders(resp, extention, bodySize) {
  const type = TYPE[extention] || 'text/plain';
  resp.setHeader('Content-Type', type);
  resp.setHeader('Content-Length', bodySize);
  resp.setHeader('Access-Control-Allow-Origin', '*');
};