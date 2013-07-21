#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";
var URL_DEFAULT = "";
var RETRY_MS = 5000;

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var cheerioHtmlFile = function(data) {
    return cheerio.load(data);
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var loadFile = function(path, callback) {
    fs.readFile(path, function(err, data) {
      if (err) throw err;
      callback(data);
    });
};

var loadUrl = function(url, callback) {
    rest.get(url).on('complete', function(data) {
      if (data instanceof Error) {
        this.retry(RETRY_MS);
      } else {
        callback(data);
      }
    });
};

var checkHtmlFile = function(content, checksfile) {
    $ = cheerioHtmlFile(content);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    printResult(out);
};

var printResult = function(checkJson) {
    var outJson = JSON.stringify(checkJson, null, 4);
    console.log(outJson);
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var callback = function(data) {
    return checkHtmlFile(data)
        };

var loadContent = function(path, url, checksfile) {
    if (path) {
      loadFile(path, function(data) {
        checkHtmlFile(data, checksfile);
      });
    } else if (url) {
      loadUrl(url, function(data) {
        checkHtmlFile(data, checksfile);
      });
    } else {
      console.log('Need either a file path or url.');
    }
};

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file [html_file]', 'Path to index.html')
        .option('-u, --url [url]', 'URL to check')
        .parse(process.argv);
    loadContent(program.file, program.url, program.checks);
    //checkHtmlFile(program.file, program.checks);
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
