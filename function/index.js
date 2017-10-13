const parseHtmlImports = require('./parsers/parseHtmlImports');
const parseJsImports = require('./parsers/parseJsImports');
const url = require('url');

// gcloud beta functions deploy twoBun --stage-bucket staging.two-bun-no.appspot.com --trigger-http

function getEntryType(link) {
  let typeMap = {
    js: 'application/javascript',
    css: 'test/css',
    html: 'text/html',
    json: 'application/json',
    map: 'application/octet-stream'
  };
  return typeMap[link.split("?")[0].split('.').pop()];
}

//2bun.no/polygit.org/components/iron-location/iron-location.html?X=polymer.html
//2bun.no/polygit.org/components/iron-location/iron-location.html?X=polymer.html&X=boot.html
function createManifestWithExcludes(link) {
  const linkObj = url.parse(link, true);
  //wrap individual queries as array
  if (typeof linkObj.query.X === "string")
    linkObj.query.X = [linkObj.query.X];
  if (Array.isArray(linkObj.query.X))
    return linkObj.query.X.map((X) => ({excludeUrl: X}));
  return [];
}


exports.twoBun = (req, resp) => {
  console.log("server is getting request: " + req.url);
  if (req.url === '/') {
    resp.write('Specify url 2bun');
    resp.end();
  }

  const manifest = createManifestWithExcludes(req.url);

  let bundle;
  if (req.url.endsWith('html'))
    bundle = parseHtmlImports('http:/' + req.url, manifest);
  else if (req.url.endsWith('js'))
    bundle = parseJsImports('http:/' + req.url);//, manifest);
  else //(req.url.endsWith('js.map'))
    bundle = "";

  let manifestJSON = manifest.map((entry) => ({
    link: entry.url,
    exclude: entry.excludeUrl,
    dependencies: entry.dependencies ? entry.dependencies.map((dep) => dep.url) : undefined
  }));
  resp.setHeader('Content-Type', getEntryType(req.url));
  // resp.write("<!--" + JSON.stringify(manifestJSON, null, '\t') + "-->" + bundle);
  resp.write(/*"<!--" + JSON.stringify(manifestJSON, null, '\t') + "-->" + */bundle);
  resp.end();
};