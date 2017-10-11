const rollup = require('rollup');
const rollupPluginWeblinks = require('rollup-plugin-weblinks');
const deasync = require('deasync');

module.exports = function(link) {
  const inputOptions = {
    input: link,
    plugins: [ rollupPluginWeblinks() ]
  };
  const outputOptions = {
    file: 'bundle.js',
    format: 'iife',
  }

  let bundle;
  rollup.rollup(inputOptions)
    .then(bundle => bundle.generate(outputOptions))
    .then(result => {
      bundle = result.code
    });
  deasync.loopWhile(() => !bundle);
  return bundle;
}