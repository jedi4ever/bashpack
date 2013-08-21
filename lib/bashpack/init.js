'use strict';

//var merge = require('hashmerge');

var initConfig = function bashPackInit(projectDir, options, callback) {
  var self = this;
  var logger = self.logger;

  // Override settings
  //var settings = merge(self.settings,options);

  // ProjectDir needs to be specified
  logger.debug('projectDir specified %s',projectDir);
  if(projectDir === undefined) {
    return callback(new Error(projectDir+' is not specified'));
  }

  // ProjectDir needs to be a directory
  /*
  if(!shell.test('-d',projectDir)) {
    return callback(new Error('projectDir "'+projectDir+'" is not a directory or does not exist'));
  }
  */

  // Check if configFile exists
  //var configFile = path.join(projectDir,settings.configName);

  /*
  if(shell.test('-f',configFile)) {
    if (!settings.force) {
      return callback(new Error('configFile  "'+configFile+'" already exists. Use --force to overwrite'));
    } else {
      logger.warn('configFile "'+configFile+'" already exists. But we can we remove it as --force has been specified');
      shell.rm(configFile);
    }
  }

  logger.info('Creating bashpack configFile "'+configFile+'"');
  shell.cp(path.join(__dirname,'..','template','bashpack.json'),projectDir);

  */
};

module.exports = initConfig;
