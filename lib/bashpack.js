'use strict';

// Helper to deep merge hash objects
var merge = require('hashmerge');

// Main Constructor
var BashPack = function(config) {

  // The overall defaults if not specified
  var _defaults = {
    logMute: true, // no output by default
    logLevel: 'info',
    logTimestamp: false,
    logPrettyPrint: false,
    includeNode: true,
    exclude: [ '.git/*','doc/*','test/*' ],
    name: 'the anonymous module',
    outputFile: ['bashpack' , process.platform , process.arch].join('-') + '.run',
    configName: 'bashpack.json',
    libs: undefined,          // Array of native libs to add and load
    force: false,             // overwrite Bashpack outputFile
    excludeFile: undefined ,  // no exclude file speficied
    nodePlatform: process.platform, // darwin, linux, sunos
    nodeArch: process.arch,         // x86 | x64
    nodeVersion: 'system',           // system, latest, 0.10.x..
    nodeBinary: undefined     // Override node file used
  };

  // Save a pointer to ourself
  var self = this;

  // Merge the config specified with our defaults
  self.settings = merge(_defaults,config);

  // Configure a logger with our settings
  self.logger = require('./utils/logger.js')(self.settings);

};

exports = module.exports = BashPack;
// Auto load functions
var fs = require('fs');
var path = require('path');
var methodsPath = path.join(__dirname,'bashpack');

var methods = fs.readdirSync(methodsPath);
methods.forEach(function(filename) {
  if (path.extname(filename) === '.js' ) {
    var methodName = path.basename(filename, '.js');
    BashPack.prototype[methodName] = require(path.join(__dirname, './bashpack', methodName));
  }
});
