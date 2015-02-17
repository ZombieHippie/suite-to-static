#!/usr/bin/env node
process.chdir(__dirname)

try {

var fs = require('fs')
  , argv = require('yargs').argv
  , http = require('http')
  , jade = require('jade')
  , static = require('node-static')
  , pathUtil =require('path')
  , srcpath = pathUtil.resolve(argv.in)
  , outpath = pathUtil.resolve(argv.out)
  , port = parseInt(argv.port) || 8080
  , fileServer = new static.Server(outpath || '.')

process.chdir(outpath)

var jadeFiles = require('recursive-readdir')(srcpath, ['*.extend.jade', '*.include.jade'], function (err, files) {
  // Files is an array of filename 
  console.log(files);
});

} catch (error) {
  return console.log(require('./print-help'))
}

/*
try {
  jade.renderFile('.' + req.url, {
  filename: '.' + req.url.replace(jadeRe, ''),
  pretty: true
  })
} catch (parseError) {
  console.error(parseError)
}
*/

fileServer.serveDir = function (pathname, req, res, finish) {
  fs.readdir(pathname, function(err, results) {
    res.writeHead(200, {'Content-Type': 'text/html'})
    res.end(jade.render('pre\n if pathname.length\n  a(href="../") ..\n  br\n each file in results\n  a(href=pathname+"\/"+file)=file\n  br', {
      results: results,
      pathname: req.url.length === 1 ? '' : req.url
    }))
    finish(200, {})
  })
}

http.createServer(function (req, res) {
  req.addListener('end', function () {
    fileServer.serve(req, res)
  }).resume()
}).listen(port)
