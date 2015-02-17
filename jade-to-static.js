#!/usr/bin/env node

var fs = require('fs')
  , argv = require('yargs').argv
  , http = require('http')
  , jade = require('jade')
  , static = require('node-static')
  , pathUtil =require('path')
  , srcpath = pathUtil.resolve(argv.in)
  , outpath = pathUtil.resolve(argv.out)
  , jadeRe = /\.jade$/
  , port = parseInt(argv.port) || 8080
  , fileServer = new static.Server(outpath || '.')

process.chdir(outpath)

var jadeFiles = require('recursive-readdir')(srcpath, ['*.extend.jade', '*.include.jade'], function (err, files) {
  // Files is an array of filename 
  for (var i = 0, filename, outfilename; i < files.length; i++) {
    try {
      filename = files[i];
      outfilename = filename.replace(srcpath, outpath).replace(jadeRe, ".html");
      fs.writeFileSync(
        outfilename,
        jade.renderFile(filename, {
          filename: filename.replace(jadeRe, ''),
          pretty: true
        })
      )
      console.log("Wrote: " + outfilename)
    } catch (error) {
      console.log(error)
    }
  }
});

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
