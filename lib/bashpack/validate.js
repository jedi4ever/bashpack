'use strict';

var logger;

var merge = require('hashmerge');
var fs    = require('fs');
var async = require('async');
var path  = require('path');

var validateSettings = function (projectDir, startScript ,options,callback) {

  var self = this;
  logger = self.logger;
  var settings = merge({}, self.settings);

  async.series([ function(callback) { // Validate ProjectDir
    logger.debug('validating ProjectDir');
    validateProjectDir(projectDir, callback);
  },
  function(callback) { // Validate Config File
    if (settings.configFile) {
      logger.debug('validating configFile');
      validateConfigFile(projectDir, settings, callback);
    } else {
      logger.debug('no configFile was specified');
      return callback(null);
    }
  },
  function(callback) { // Read ConfigFile if specified
    logger.debug('reading configFile');
    if (settings.configFile) {
      readConfigFile(settings.configFile, function(err, configSettings) {
        if (err) {
          return callback(err);
        } else {
          var originalSettings = merge({}, settings);
          settings = merge(originalSettings, configSettings);
        }
      });
    }
    return callback(null);
  },
  function(callback) { // Validate the startScript
    logger.debug('validating startScript');
    validateStartScript(projectDir, startScript, callback);
  },
  function(callback) { // Validate the outputFile
    validateOutputFile(settings, callback);
  },
  function(callback) { // Validate the excludeFile
    validateExcludeFile(settings, callback);
  },
  function(callback) { // Validate the libs
    validateLibs(settings, callback);
  },
  function(callback) { // Validate the node Binary
    validateNodeBinary(settings, callback);
  }
  ],function(err) {
    callback(err);
  });
};

var validateProjectDir = function(projectDir,callback) {
  // ProjectDir needs to be specified
  logger.debug('projectDir specified %s',projectDir);

  if(projectDir === undefined) {
    return callback(new Error(projectDir + ' is not specified'));
  }

  logger.debug('verifying if projectDir ' + projectDir + ' is a directory and exists');
  fs.stat(projectDir, function(err, stats) {
    logger.debug('got fs.stat of projectDir');
    if (err) {
      logger.debug('Error reading projectDir stats');
      return callback(err);
    } else {
      logger.debug('Good, projectDir exists now see if it is a directory');
      if (stats.isDirectory()) {
        return callback(null);
      } else {
        return callback(new Error(projectDir + ' is not a directory or does not exist'));
      }
    }
  });
};

var validateConfigFile = function(projectDir, settings, callback) {

  var configFile = settings.configFile;

  // Try to find a bashpack config file
  if (!configFile) {
    // If no config is specified try to find it from the projectDir
    configFile = path.join(projectDir,settings.configName);
  } else {
    configFile = settings.configFile;
  }

  logger.debug('checking if configFile is a file and exists');
  fs.stat(configFile, function(err, stats) {
    if (err) {
      logger.debug('configFile does not exit');
      return callback(new Error('configFile ' + configFile + ' does not exist.'));
    } else {
      if (!stats.isFile()) {
        return callback(new Error('configFile ' + configFile + ' is not a file.'));
      } else {
        return callback(null);
      }
    }
  });

};

var readConfigFile = function(configFile, callback) {
  // we assume configFile exists
  // let's see if it is valid JSON
  try {
    var configFileContents = fs.readFileSync(configFile,'utf8');
    var configFileSettings = JSON.parse(configFileContents);
    callback(null, configFileSettings);
  } catch (err) {
    return callback(new Error('error reading configFile "' + configFile + '" : ' + err.message));
  }
};

var validateStartScript = function(projectDir, startScript, callback) {
  // StartScript needs to be specified
  logger.debug('startScript specified %s',startScript);
  if(startScript === undefined) {
    return callback(new Error('startScript ' + startScript + ' is not specified'));
  }

  // Calculate the full path of the startscript
  var fullStartScript = path.resolve(projectDir ,startScript);
  logger.debug('full path for startScript %s',fullStartScript);

  // Check if startScript is a file & exists
  fs.stat(fullStartScript, function(err, stats) {
    if (err) {
      return callback(new Error('startScript ' + fullStartScript+' does not exist. Remember that it needs to be relative to the projectDir'));
    } else {
      if (!stats.isFile()) {
        return callback(new Error('startScript ' + fullStartScript+' is not a file.'));
      } else {
        return callback(null);
      }
    }
  });
};

var validateOutputFile = function(settings, callback) {
  var outputFile = settings.outputFile;

  // The resulting archive will be written to outputFile
  logger.debug('outputFile speficied %s',outputFile);

  // outputFile needs to be specified
  if(outputFile === undefined) {
    return callback(new Error('outputFile '+outputFile+' is not specified'));
  }

  fs.stat(outputFile, function(err, stats) {
    if (err) {
      logger.debug('outputFile does not yet exist. Good!');
      return callback(null);
    } else {
      if (stats.isFile()) {
        if (!settings.force) {
          return callback(new Error('outputFile "' + outputFile + '" already exists. Use --force to overwrite'));
        } else {
          logger.warn('outputFile "' + outputFile + '" already exists. Overwriting as --force has been specified');
          fs.unlink(outputFile, function (err) {
            if (err) {
              return callback(err);
            } else {
              return callback(null);
            }
          });
        }
      } else {
        return callback(new Error(outputFile + ' exists but is not a file'));
      }
    }
  });

};

var validateExcludeFile = function(settings, callback) {

  /*
  // First check if a manual excludeFile was specified
  // excludeFile contains the patterns passed to tar to exclude files from the archive

  if (settings.excludeFile !== undefined) {
  if(!shell.test('-f',excludeFile)) {
  return callback(new Error('excludeFile "' + settings.excludeFile+'" is not a file or does not exist. '));
  } else {
  excludeFile = settings.excludeFile;
  }
  }else {
  logger.debug('no excludeFile specified');
  }

  // let's check the exclude patterns
  if (settings.excludeFile === undefined) {

  if (settings.exclude.length > 0) {
  logger.info('Excluding following patterns: ',JSON.stringify(settings.exclude));

  // We create a temporary excludeFile
  var TempExcludeFileObject = new Tempfile();
  excludeFile = TempExcludeFileObject.path;

  fs.writeFileSync(excludeFile, settings.exclude.join('\n'));

  } else {
  logger.debug('No excludes specified');
  }
  }
  */
  callback(null);
};


var validateLib = function(lib, callback) {
  fs.stat(lib, function(err, stats) {
    if (err) {
      return callback(err);
    } else {
      if (stats.isFile()) {
        return callback(null);
      } else {
        return callback(new Error('We could not find the lib specified. ' + lib));
      }
    }
  });
};

var validateLibs = function(settings, callback) {
  logger.debug('Libs specified: ' + JSON.stringify(settings.libs));

  if (settings.libs) {
    async.each(settings.libs, validateLib,function(err) {
      return callback(err);
    });
  } else {
    return callback(null);
  }

};

var validateNodeBinary = function(settings, callback) {

  if (settings.nodeBinary) {
    fs.stat(settings.nodeBinary, function(err, stats) {
      if (err) {
        return callback(err);
      } else {
        if (stats.isFile()) {
          return callback(null);
        } else {
          return callback(new Error('We could not find the nodeBinary specified. ' + settings.nodeBinary));
        }
      }
    });
  } else {
    return callback(null);
  }

};


module.exports = validateSettings;
