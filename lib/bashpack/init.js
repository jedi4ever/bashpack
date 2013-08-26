'use strict';

var merge = require('hashmerge');

var async = require('async');
var fs    = require('fs');
var path  = require('path');

var logger;

var initConfig = function bashPackInit(projectDir, options, callback) {
  var self = this;
  logger = self.logger;

  // Override settings
  var defaults = {};
  var settings = merge(defaults,self.settings);

  // ProjectDir needs to be specified
  logger.debug(settings);
  logger.debug('projectDir specified %s',projectDir);
  if(projectDir === undefined) {
    return callback(new Error(projectDir+' is not specified'));
  }

  async.series([ function(callback){

    logger.debug('validating ProjectDir');
    validateProjectDir(projectDir, callback);
  }, function(callback) {
    logger.debug('validating ConfigFile');
    validateConfigFile(projectDir, self.settings, callback);
  }, function(callback) {
    copyConfigFile(projectDir, callback);
  }], function(err) {
    callback(err);
  });


};

module.exports = initConfig;


var validateProjectDir = function(projectDir,callback) {

  // ProjectDir needs to be specified
  if(projectDir === undefined) {
    return callback(new Error(projectDir + ' is not specified'));
  } else {
    logger.debug('projectDir specified %s',projectDir);
  }

  logger.debug('verifying if projectDir ' + projectDir + ' is a directory and exists');

  fs.stat(projectDir, function(err, stats) {
    logger.debug('got fs.stat of projectDir' + stats);
    if (err) {
      logger.debug('Error reading projectDir stats');
      return callback(err);
    } else {
      logger.debug('Good, projectDir exists now see if it is a directory');
      if (stats.isDirectory()) {
        logger.debug('Good, projectDir is a directory');
        return callback(null);
      } else {
        return callback(new Error(projectDir + ' is not a directory or does not exist'));
      }
    }
  });

};

var validateConfigFile = function(projectDir, settings, callback) {

  var configFile = settings.configName;

  logger.debug('checking if configFile is a file and exists');
  fs.stat(configFile, function(err, stats) {
    logger.debug(stats);
    if (err) {
      logger.debug('configFile does not exit. Good');
      return callback(null);
    } else {
      if (settings.force) {
        logger.warn('configFile "'+configFile+'" already exists. But we will remove it as --force has been specified');
        return callback(null);
      } else {
        return callback(new Error('configFile  "'+configFile+'" already exists. Use --force to overwrite'));
      }
    }
  });

};

var copyConfigFile = function(destDir, callback) {
  // Prepare start script to be included in the run file
  var configFile = path.join(__dirname,'..','..', 'template','bashpack.json');
  var destFile = path.join(destDir,'bashpack.json');
  logger.debug('Copying configFile template to ' + destFile);

  var configFileStream = fs.createReadStream(configFile);
  var destStream = fs.createWriteStream(destFile);

  destStream.on('error', callback);

  configFileStream.on('error', callback);

  destStream.on('close', function() {
    callback(null);
  });

  configFileStream.pipe(destStream);
};
