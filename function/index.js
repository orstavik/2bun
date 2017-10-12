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
  if (req.url === '/') {
    resp.write('Specify url 2bun');
    resp.end();
  }
  const entryType = req.url.split('.').pop();
  let bundle;
  if (entryType === 'html')
    bundle = parseHtmlImports('http:/' + req.url);
  else if (entryType === 'js')
    bundle = parseJsImports('http:/' + req.url);

  resp.setHeader('Content-Type', TYPE[entryType]);
  resp.write(bundle);
  resp.end();
};