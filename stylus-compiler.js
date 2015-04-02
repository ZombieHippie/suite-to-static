var Stylus = require('stylus')
// var CSSComb = require('csscomb')
// var comb = new CSSComb({

// })

exports.compile = function (stylusCode, filename, callback) {
  Stylus(stylusCode)
  .set('filename', filename)
  .render(function (err, cssString) {
    // TODO alphabetizing cssString
    callback(err, cssString)
    //callback(err, comb.processString(cssString))
  })
}