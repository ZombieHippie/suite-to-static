var CoffeeScript = require('coffee-script')

// returns string of JavaScript code
exports.compile = function (coffeeScriptCode, filename, callback) {
  try {
    var res = CoffeeScript.compile(coffeeScriptCode, {filename: filename, bare: true})
    callback(null, res)
  } catch (err) {
    callback(err)
  }
}