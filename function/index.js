const parseHtmlImports = require('./parsers/parseHtmlImports');
const parseJsImports = require('./parsers/parseJsImports');

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
  const entryType = req.url.split('.').pop();
  let bundle;
  if (req.url.endsWith('html'))
    bundle = parseHtmlImports('http:/' + req.url);
  else if (req.url.endsWith('js'))
    bundle = parseJsImports('http:/' + req.url);
  else //(req.url.endsWith('js.map'))
     bundle = "";

  resp.setHeader('Content-Type', TYPE[entryType]);
  resp.write(bundle);
  resp.end();
};