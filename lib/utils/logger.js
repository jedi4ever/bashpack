var winston = require('winston');
var merge = require('./merge');

var logger = function(options) {

  var defaults = {
    logLevel: 'info',
    logMute: true,
    logColorize: true,
    logTimestamp: true,
    logPrettyPrint: true
  };

  var settings = merge(defaults,options);

  var wlogger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
      level: settings.logLevel,
      timestamp: settings.logTimestamp,
      colorize: settings.logColorize,
      prettyPrint: settings.logPrettyPrint,
      silent: settings.logMute
    })
    //new (winston.transports.File)({ filename: 'somefile.log' })
    ]
  });
  // Set the npm levels as expected
  wlogger.setLevels(winston.config.npm.levels);
  return wlogger;
};


module.exports = logger;
