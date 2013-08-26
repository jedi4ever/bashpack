'use strict';

var fs = require('fs');
var path = require('path');

var nodeFetcher = require('node-fetcher');
var temp = require('temp');
var async = require('async');
//var minimatch = require('minimatch') ;

var logger;

var build = function(projectDir, startScript ,options,callback) {
  var self = this;
  var settings = self.settings;
  logger = self.logger;
  var tempDir;
  var binDir;
  var includeFileList;

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
    buildFileList(projectDir, settings.exclude, function(err, fileList) {
      includeFileList = fileList ;
      return callback(err);
    });
  },
  function(callback) { // Copy to the tempdirectory
    logger.info('Copying the project to a temporary directory');
    copyProjectDir(projectDir, tempDir, includeFileList , callback);
  },
  function(callback) { // Create .bashpack/{bin,lib} directory
    createBashPackDirs(tempDir,callback);
  },
  function(callback) { // Run npm install --production
    logger.info('Running `npm install --production` on the temporary directory');
    runInstallProduction(tempDir, settings, callback);
  },
  function(callback) { // Download node
    // Check if we need to include the node binary
    if (!settings.skipNodeInclude) {

      if ((settings.nodeVersion === 'system') && (settings.nodePlatform !== process.platform)) {
        logger.warn('overriding node-version with "latest" as you specified a different platform than yours');
        settings.nodeVersion = 'latest';
      }

      binDir = path.join(tempDir, '.bashpack','bin');
      logger.info('Downloading node [ ' +  [ settings.nodeVersion , settings.nodePlatform , settings.nodeArch ].join('-') + ' ]');
      nodeFetcher.download(settings.nodeVersion, settings.nodePlatform , settings.nodeArch , path.join(binDir, 'node'), callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Copy (native) libs
    logger.info('Checking for native libs to add');
    if (settings.libs && settings.libs.length > 0) {
      logger.info('Adding native libs');
      copyLibs(settings.libs, tempDir,callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Make node executable
    if (!settings.skipNodeInclude) {
      logger.info('Making node executable chmod +x ');
      fs.chmod(path.join(binDir, 'node'), '0755', callback);
    } else {
      callback(null);
    }
  },
  function(callback) { // Copy the start.sh & make it executable
    logger.info('Adding the makeself start script');
    copyStartSh(tempDir,callback);
  },
  function(callback) { // Build the makeself archive
    logger.info('Assembling the bashpack "'+ settings.outputFile + '"');
    makeSelf(tempDir, settings.outputFile, settings.name, settings.excludeFile, startScript, callback);
  },
  function(callback) { // Check for native libraries
    if (settings.nodeVersion !== 'system' && settings.nodePlatform !== process.platform) {
      logger.warn('You have build for a plaform[' +settings.nodePlatform + '] that is different than yours[' + process.platform + ']');
      logger.warn('If you have any native libraries you depend on, the resulting bashpack might not work');
    }
    callback(null);
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

var Ignore = require('fstream-ignore');

var buildFileList = function(projectDir, excludes, callback) {

  // https://npmjs.org/doc/developers.html
  // Always ignore the following
  //if (entry.match(/^\.wafpickle-[0-9]+$/)) { return true ; }
  //if (entry.match(/^\..*\.swp$/)) { return true ; }
  //if (entry.match(/^\._/)) { return true; }

  var fileList = {};

  var ignoreFiles = [];

   // Check for ignore files
  if (fs.existsSync(path.join(projectDir, '.bashpackignore'))) {
    logger.info('found .bashpackignore');
    ignoreFiles.push('.bashpackignore');
  } else {
    if (fs.existsSync(path.join(projectDir, '.npmignore'))) {
      logger.info('found .npmignore');
      ignoreFiles.push('.npmignore');
    } else {
      if (fs.existsSync(path.join(projectDir, '.gitignore'))) {
        logger.info('found .gitgnore');
        ignoreFiles.push('.gitignore');
      }
    }
  }

  var internalExcludes = [
    'node_modules',
    '.git',
    'CVS',
    '.svn',
    '.hg',
    '.DS_Store',
    '.lock-wscript',
    'npm-debug.log',
    '._'
  ];


  var ignore = new Ignore({
    path: projectDir,
    ignoreFiles: ignoreFiles
  });

  ignore.addIgnoreRules(internalExcludes, 'internal rules');

  if (excludes) {
    ignore.addIgnoreRules(excludes, 'user specified rules');
  }

  ignore.on('child', function(c) {
    var filename = c.path.substr(c.root.path.length + 1);
    fileList[filename] = true;
    logger.debug('adding file ' + filename);
  });

  ignore.on('end', function() {
    logger.debug('done compiling fileList');
    return callback(null, fileList);
  });

};


var ignoreFile = function(entry , fileList ) {

  if (fileList[entry]) {
    return false;
  } else {
    return true;
  }

};


var copyProjectDir = function(sourceDir , destination, includeFileList, callback) {
  var ncp = require('ncp').ncp;
  var options = {};

  options.filter = function(filename) {
    var relPath = path.relative(path.resolve(sourceDir),filename);

    var fileIgnored = ignoreFile(relPath, includeFileList );

    // The top directory gives a relPath == ''
    if (relPath === '') {
      return true;
    }

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

/*
var loggerStream = {
  write: function(message, encoding) {
    logger.info(message);
  }
};
*/

var runInstallProduction = function(cwd, settings, callback) {
  var npm = require('npm');
  var npmConfig = {
    production: true,
    loglevel: 'http',
    pretty: false
  };

  if (settings.logLevel === 'debug') {
    npmConfig.loglevel = 'verbose';
  }

  if (settings.logMute) {
    npmConfig.loglevel = 'silent';
  }

  //npmConfig.logstream = loggerStream;

  var originCwd = process.cwd();

  logger.debug('changing to projectDir', cwd);
  process.chdir(cwd);
  npm.load(npmConfig, function(err) {
    if(err) {
      process.chdir(originCwd);
      return callback(new Error('Npm config failed' +  err));
    }

    npm.commands.install([ ], function(err, data) {
      logger.debug(data);
      if (err) {
        process.chdir(originCwd);
        return callback(new Error('Npm install failed' +  err));
      } else {
        process.chdir(originCwd);
        return callback(null);
      }
    });

    // Doesn't seem to ouput something
    /*
    npm.logger.on('log', function(message) {
      logger.info('mermem');
      logger.info(message);
    });
    */
  });

};

/*
var runInstallProduction2 = function(cwd, callback) {
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
*/

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

