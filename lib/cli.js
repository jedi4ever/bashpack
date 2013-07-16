var merge = require('./utils/merge');

var BashPack = require('./bashpack');

var bashPackBuild = function bashPackBuild(projectDir, startScript, options) {

  // By default we show all output
  var defaults = {
    logMute: false,
    logTimestamp: false
  };

  var settings = merge(defaults, options);

  if (options.debug) {
    settings.logLevel = 'debug';
  }

  var logger = require('./utils/logger')(settings);
  logger.info("Starting the bashpack creation");

  // Show errors in case we have some
  var catchErrors = function(err) {
    if (err) {
      logger.error(err.message);
      process.exit(-1);
    } else {
      logger.info('bashpack successfully created!');
      logger.info('Thank you for trying bashpack');
    }
  };

  // Initialize main object
  var bashPack = new BashPack(settings);
  // Initiate the build process
  bashPack.build(projectDir, startScript, settings, catchErrors);
};

var bashPackInit = function bashPackInit(projectDir, options) {
  console.log('Not implemented yet');
}

module.exports = {
  build: bashPackBuild,
  init: bashPackInit
};
