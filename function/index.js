const parseHtmlImports = require('./parsers/parseHtmlImports');
const parseJsImports = require('./parsers/parseJsImports');
const url = require('url');

// gcloud beta functions deploy twoBun --stage-bucket staging.two-bun-no.appspot.com --trigger-http

const TYPE = {
  js: 'application/javascript',
  css: 'test/css',
  html: 'text/html',
  json: 'application/json',
  map: 'application/octet-stream'
};

exports.twoBun = (req, resp) => {
  console.log("server is getting request: " + req.url);
  if (req.url === '/') {
    resp.write('Specify url 2bun');
    resp.end();
  }

  let manifest = [];
  //check if first argument is a exclusion parameter
  //2bun.no/-Xpolymer.html/polygit.org/components/iron-location/iron-location.html
  //2bun.no/polygit.org/components/iron-location/iron-location.html?X=polymer.html
  // manifest = [{excludeUrl: "legacy-element-mixin.html"}];
  const reqUrl = url.parse(req.url, true);
  const entryType = reqUrl.path.split('.').pop();
  if (reqUrl.query.X)
    manifest = [{excludeUrl: reqUrl.query.X}];
  let bundle;
  if (req.url.endsWith('html'))
    bundle = parseHtmlImports('http:/' + reqUrl.path, manifest);
  else if (req.url.endsWith('js'))
    bundle = parseJsImports('http:/' + reqUrl.path);//, manifest);
  else //(req.url.endsWith('js.map'))
    bundle = "";

  resp.setHeader('Content-Type', TYPE[entryType]);
  resp.write(bundle);
  resp.end();
};