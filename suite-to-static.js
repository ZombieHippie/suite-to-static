#!/usr/bin/env node

var fs = require('fs')
  , argv = require('yargs').argv
  , http = require('http')
  , jade = require('jade')
  , stylusCompiler = require('./stylus-compiler')
  , coffeeCompiler = require('./coffee-script-compiler')
  , pathUtil =require('path')
  , srcpath = pathUtil.resolve(argv.in)
  , outpath = pathUtil.resolve(argv.out)
  , jadeRe = /\.jade$/
  , jadeIgnores = /\.(include|extend)\.jade$/
  , requiredFileRE = /\.(json|cson)$/
  , port = parseInt(argv.port) || 8080
  , cson = require("./cson")

var fileServer = null
if (argv.noserver == null) {
  var StaticServer = require('node-static')
  fileServer = new StaticServer.Server(outpath || '.')
}

process.chdir(outpath)

parsedFiles = {}

var buildLocals = function (jadeString, filename) {
  // This regex matches the form: //-someVar = require("../some-file.cson")
  // and tries to read that given file as JSON or CSON
  var RE = /\/\/\-(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g;
  var match
  var locals = {}
  while (match = RE.exec(jadeString), match != null) {
    var requiredFile = pathUtil.resolve(pathUtil.dirname(filename), match[2])
    if (parsedFiles[requiredFile] == null)
      parsedFiles[requiredFile] = cson.parse(fs.readFileSync(requiredFile, "utf8"))
    locals[match[1]] = parsedFiles[requiredFile]
  }
  return locals
}

function renderJade (filename, outfilename) {
  try {
    var jadeContents = fs.readFileSync(filename, "utf8")
    var locals = buildLocals(jadeContents, filename)
    
    locals.filename = filename.replace(jadeRe, '')
    locals.pretty = true
    fs.writeFileSync(
      outfilename,
      jade.renderFile(filename, locals)
    )
    console.log("Wrote: " + outfilename)
  } catch (error) {
    console.error("Jade Error: ")
    console.error(error)
  }
}

function renderCoffee (filename, outfilename) {
  var coffeeContents = fs.readFileSync(filename, "utf8")
  coffeeCompiler.compile(coffeeContents, filename, function (err, js) {
    if (err) {
      console.error("Coffee Error: ")
      console.error(err)
    } else {
      fs.writeFileSync(
        outfilename,
        js
      )
      console.log("Wrote: " + outfilename)
    }
  })
}

function renderStylus (filename, outfilename) {
  var stylusContents = fs.readFileSync(filename, "utf8")
  stylusCompiler.compile(stylusContents, filename, function (err, css) {
    if (err) {
      console.error("Stylus Error: ")
      console.error(err)
    } else {
      fs.writeFileSync(
        outfilename,
        css
      )
      console.log("Wrote: " + outfilename)
    }
  })
}

var allJadeFiles = null;

function handleFileChange (filename, outfilename) {
  console.log("Handle file change: " + filename)
  switch(pathUtil.extname(filename).toLowerCase()) {
    case ".jade":
      var isNotJadeFile = !jadeRe.exec(filename)
      var isExtendOrIncludeJadeFile = jadeIgnores.exec(filename) 
      if (isNotJadeFile || isExtendOrIncludeJadeFile) {
        var isRequiredFile = requiredFileRE.exec(filename)
        if (isRequiredFile) {
          // reset parsed file
          parsedFiles[filename] = null
        }
        for (var i = 0; i < allJadeFiles.length; i++) {
          renderJade(allJadeFiles[i].in, allJadeFiles[i].out)
        }
      } else {
        renderJade(filename, outfilename)
      }
      break;
    case ".coffee":
      renderCoffee(filename, outfilename)
      break;
    case ".styl":
      renderStylus(filename, outfilename)
      break;
    default:
      break;
  }
}

var timeout = null;
function watchForCompile (filename, outfilename) {
  fs.watch(filename, function () {
    if (timeout != null)
      clearTimeout(timeout)
    timeout = setTimeout(handleFileChange, 200, filename, outfilename)
  })
}

// Read `in` directory recursively
require('recursive-readdir')(srcpath, function (err, files) {
  allJadeFiles = files.filter(function (element) {
    return !element.match(jadeIgnores) && element.match(jadeRe)
  }).map(function (originalName) {
    return {
      in : originalName,
      out: originalName.replace(srcpath, outpath).replace(jadeRe, ".html")
    }
  })

  // Files is an array of filename
  for (var i = 0; i < files.length; i++) {
    try {
      var filename = files[i];
      var outfilename = filename.replace(srcpath, outpath);
      switch(pathUtil.extname(filename).toLowerCase()) {
        case ".jade":
          outfilename = outfilename.replace(jadeRe, ".html");
          if (!jadeIgnores.exec(filename) && jadeRe.exec(filename))
            renderJade(filename, outfilename)
          break;
        case ".coffee":
          outfilename = outfilename.replace(/\.coffee$/i, '.js')
          renderCoffee(filename, outfilename)
          break;
        case ".styl":
          outfilename = outfilename.replace(/\.styl$/i, '.css')
          renderStylus(filename, outfilename)
          break;
        default:
          break;
      }
      watchForCompile(filename, outfilename)    
    } catch (error) {
      console.log(error)
    }
  }
})

if (fileServer != null) {
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
  console.log("listening")
}
