'use strict';

var fs = require('fs');
var path = require('path');

var nodeFetcher = require('node-fetcher');
var temp = require('temp');
var async = require('async');
var minimatch = require('minimatch') ;

var logger;

var build = function(projectDir, startScript ,options,callback) {
  var self = this;
  var settings = self.settings;
  logger = self.logger;
  var tempDir;
  var binDir;

  async.series([ function(callback) { // ValidateSettings
    logger.debug('validating Settings');
    self.validate(projectDir, startScript, options, callback);
  },
  function(callback) { // Create a temporary build directory
    logger.debug('creating temporary directory');
    createBuildDir(function(err, dirPath) {
      tempDir = dirPath;
      callback(err,dirPath);
    });
  },
  function(callback) { // Find additional ignore patterns
    logger.info('Reading existing .gitignore, .npmignore or .bashpackignore');
    readIgnores(projectDir, function(err, patterns) {
      if (settings.exclude) {
        settings.exclude.push.apply(settings.exclude, patterns);
      } else {
        settings.exclude =  patterns;
      }
      return callback();
    });
  },
  function(callback) { // Copy to the tempdirectory
    logger.info('Copying the project to a temporary directory');
    copyProjectDir(projectDir, tempDir,settings.exclude , callback);
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
      logger.info('Downloading node [ ' +  [ settings.nodeVersion , settings.nodePlatform , settings.nodeArch ].join('-') + ' ]');
      nodeFetcher.download(settings.nodeVersion, settings.nodePlatform , settings.nodeArch , path.join(binDir, 'node'), callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Copy (native) libs
    logger.info('Checking for native libs to add');
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
  ],function(err, results) {
    logger.debug(results);
    if (err) {
      logger.debug('an error has occured during the build process' + err);
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

var ignoreFile = function(entry, excludes ) {

  // Always ignore the following
  if (entry.match(/^node_modules/)) { return true ;}
  if (entry.match(/^.git/)) { return true ;}
  if (entry.match(/^CVS/)) { return true ;}
  if (entry.match(/^.svn/)) { return true ; }
  if (entry.match(/^.hg/)) { return true ; }
  if (entry.match(/^.DS_Store/)) { return true ; }
  if (entry.match(/^.lock-wscript/)) { return true ; }
  if (entry.match(/^npm-debug.log/)) { return true ; }
  if (entry.match(/^\.wafpickle-[0-9]+$/)) { return true ; }
  if (entry.match(/^\..*\.swp$/)) { return true ; }
  if (entry.match(/^\._/)) { return true; }

  var ignore = false;
  if (excludes) {
    for (var i = 0 ; i < excludes.length ; i++) {
      var minimatched = minimatch(entry, excludes[i]);
      if (minimatched) {
        ignore = true;
        break;
      }
    }
  }
  return ignore;
  // Check .npmignore
  // Check .gitignore
  // https://npmjs.org/doc/developers.html
};

var readIgnores = function(projectDir, callback) {

  return callback(null, []);

};

var copyProjectDir = function(sourceDir , destination, excludes, callback) {
  var ncp = require('ncp').ncp;
  var options = {};

  options.filter = function(filename) {
    var relPath = path.relative(sourceDir,filename);

    var fileIgnored = ignoreFile(relPath, excludes );

    if (fileIgnored) {
      logger.info('Ignoring ' + filename);
      return false;
    } else {
      logger.debug('Copying ' + filename);
      return true;
    }
  };

  ncp(sourceDir, destination, options, function (err) {
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

  destStream.on('close', function() {
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

  destStream.on('close', function() {
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

