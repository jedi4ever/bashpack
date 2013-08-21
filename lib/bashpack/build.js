'use strict';

var fs = require('fs');
var path = require('path');

var nodeFetcher = require('node-fetcher');
var temp = require('temp');
var async = require('async');

var logger;

var build = function(projectDir, startScript ,options,callback) {
  var self = this;
  var settings = self.settings;
  logger = self.logger;
  var tempDir;
  var binDir;

  async.series([
               function(callback) { // ValidateSettings
    self.validate(projectDir, startScript, options, callback);
  },
  function(callback) { // Create a temporary build directory
    createBuildDir(function(err, dirPath) {
      tempDir = dirPath;
      callback(err,dirPath);
    });
  },
  function(callback) { // Copy to the tempdirectory
    logger.info('Copying the project to a temporary directory');
    copyProjectDir(projectDir, tempDir,callback);
  },
  function(callback) { // Create .bashpack/{bin,lib} directory
    createBashPackDirs(tempDir,callback);
  },
  function(callback) { // Run npm install --production
    logger.info('Running `npm install --production` on the temporary directory');
    runInstallProduction(tempDir, callback);
  },
  function(callback) { // Download node
    // Check if we need to include the node binary
    if (!settings.skipNodeInclude) {
      binDir = path.join(tempDir, '.bashpack','bin');
      logger.info('Downloading node [ ' +  [ settings.node.version , settings.node.platform , settings.node.arch ].join('-') + ' ]');
      nodeFetcher.download(settings.node.version, settings.node.platform , settings.node.arch , path.join(binDir, 'node'), callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Copy (native) libs
    if (settings.libs) {
      logger.info('Adding native libs');
      copyLibs(settings.libs, tempDir,callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Make node executable
    if (!settings.skipNodeInclude) {
      logger.info('Make node executable');
      fs.chmod(path.join(binDir, 'node'), '0755', callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Copy the start.sh & make it executable
    logger.info('Adding the start script');
    copyStartSh(tempDir,callback);
  },
  function(callback) { // Build the makeself archive
    logger.info('Assembling the bashpack "'+ settings.outputFile + '"');
    makeSelf(tempDir, settings.outputFile, settings.name, settings.excludeFile, startScript, callback);
  }
  ],function(err) {
    if (err) {
      return callback(err);
    } else {
      return callback(null, settings.outputFile);
    }
  });

};

module.exports = build;

var createBuildDir = function(callback) {
  temp.mkdir('bashpack' , function(err, dirPath) {
    logger.debug('created temp buildDir ' + dirPath);
    callback(err,dirPath);
  });
};

var copyProjectDir = function(source, destination, callback) {
  var ncp = require('ncp').ncp;
  var options = {};
  options.filter = function(filename) {
    var relPath = path.relative(source,filename);
    var keep = true;
    // Remove node_modules
    if (relPath.match(/^node_modules/)) {
      keep=false;
    }
    // Remove .git
    if (relPath.match(/^.git/)) {
      keep=false;
    }
    // Check .npmignore
    // Check .gitignore
    // https://npmjs.org/doc/developers.html
    if (keep) {
      logger.debug('Copying ' + filename);
    }
    return keep;
  };

  ncp(source, destination, options, function (err) {
    callback(err);
  });
};

var createBashPackDirs = function(directory, callback) {
  async.series([ function(callback) {
    fs.mkdir(path.join(directory,'.bashpack'),function(e){
      if(!e || (e && e.code === 'EEXIST')){
        callback(null);
      } else {
        callback(e);
      }
    });
  }, function(callback) {
    fs.mkdir(path.join(directory,'.bashpack','bin'),function(e){
      if(!e || (e && e.code === 'EEXIST')){
        callback(null);
      } else {
        callback(e);
      }
    });
  }, function(callback) {
    fs.mkdir(path.join(directory,'.bashpack','lib'),function(e){
      if(!e || (e && e.code === 'EEXIST')){
        callback(null);
      } else {
        callback(e);
      }
    });
  }],function(err) {
    callback(err);
  });
};

var runInstallProduction = function(cwd, callback) {
  var spawn = require('child_process').spawn;

  var child = spawn('npm',['install', '--production'], { cwd: cwd });

  child.stdout.resume();
  child.stdout.on('data', function(data) {
    logger.debug(data.toString());
  });

  child.stderr.on('data', function(data) {
    logger.debug(data.toString());
  });

  child.on('close', function(code) {
    if (code === 0) {
      return callback(null);
    } else {
      return callback(new Error('Npm Install failed'));
    }
  });

};

var copyStartSh = function(destDir, callback) {
  // Prepare start script to be included in the run file
  var startFile = path.join(__dirname, '..' , '..', 'scripts','start.sh');
  var destFile = path.join(destDir,'.bashpack', 'bin', 'start.sh');
  logger.debug('Copying start.sh to ' + destFile);

  var startFileStream = fs.createReadStream(startFile);
  var destStream = fs.createWriteStream(destFile);

  destStream.on('error', callback);

  startFileStream.on('error', callback);

  destStream.on('finish', function() {
    fs.chmodSync(destFile, '0755');
    callback(null);
  });

  startFileStream.pipe(destStream);
};

var copyLib = function(lib, destDir, callback) {
  var startFileStream = fs.createReadStream(lib);
  var destFile = path.join(destDir, '.bashpack' , 'lib' , path.basename(lib));
  var destStream = fs.createWriteStream(destFile);

  destStream.on('error', callback);

  startFileStream.on('error', callback);

  destStream.on('finish', function() {
    callback(null);
  });

  startFileStream.pipe(destStream);
};

var copyLibs = function(libs, destDir, callback) {
  async.each(libs,
             function(lib,callback2) {
               copyLib(lib, destDir, callback2);
             }, function(err) {
               callback(err);
             });
};

var makeSelf = function(projectDir, outputFile , name, excludeFile , startScript , callback) {
  var makeselfPath = path.join(__dirname,'..', '..', 'makeself','makeself.sh');
  var execArgs = [];
  //var execResult ;

  // First pass at creating the run file
  // This will include the files from the projectDir that have not been excluded
  execArgs = [
    '--bzip2',
    '--nox11',
    projectDir,
    outputFile,
    name,
    './.bashpack/bin/start.sh',
    startScript
  ];

  // If we have an excludeFile, we pass it as another options
  if (excludeFile) {
    execArgs.unshift(path.resolve(excludeFile));
    execArgs.unshift('--exclude-file');
    //execArgs.unshift('.git/*');
    //execArgs.unshift('--exclude');
    }

    logger.debug(execArgs);

    var spawn = require('child_process').spawn;

    var child = spawn(makeselfPath,execArgs, { cwd: '.' });

    child.stdout.resume();
    child.stdout.on('data', function(data) {
      logger.debug(data.toString());
    });

    child.stderr.on('data', function(data) {
      logger.debug(data.toString());
    });

    child.on('close', function(code) {
      if (code === 0) {
        return callback(null);
      } else {
        return callback(new Error('Make self failed'));
      }
    });
  };

