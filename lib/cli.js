var merge = require('./utils/merge');

var BashPack = require('./bashpack');

var bashPackBuild = function bashPackBuild(baseDir, startScript, options) {


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

  // Show errors in case we have some
  var catchErrors = function(err) {
    if (err) {
      logger.error(err.message);
      process.exit(-1);
    }
  };

  // Initialize main object
  var bashPack = new BashPack(settings);
  // Initiate the build process
  bashPack.build(baseDir, startScript, settings, catchErrors);
};

module.exports = {
  build: bashPackBuild
};
