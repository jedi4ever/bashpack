var winston = require('winston');
var merge = require('./merge');

var logger = function(options) {

  var defaults = {
    logLevel: 'info',
    mute: true,
    colorize: true,
    timestamp: true,
    prettyPrint: true
  };

  var settings = merge(defaults,options);

  var wlogger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
      level: settings.logLevel,
      timestamp: settings.timestamp,
      colorize: settings.colorize,
      prettyPrint: settings.prettyPrint,
      silent: settings.mute
    })
    //new (winston.transports.File)({ filename: 'somefile.log' })
    ]
  });
  // Set the npm levels as expected
  wlogger.setLevels(winston.config.npm.levels);
  return wlogger;
};


module.exports = logger;
