var fs = require('fs');
var path = require('path');

// Helper to deep merge hash objects
var merge = require('./utils/merge');

// To run shell like commands
var shell = require('shelljs');
// To properly escape shell commands arguments
var quote = require('shell-quote').quote;

// To create temporary directories
var Tempdir = require('temporary/lib/dir');

// Main Constructor
function BashPack(config) {

  // The overall defaults if not specified
  var _defaults = {
    logMute: true, // no output by default
    logLevel: 'info',
    logTimestamp: false,
    logPrettyPrint: false,
    includeNode: true,
    name: 'the anonymous module',
    outputFile: 'bashpack.run',
    excludeFile: undefined // no exclude file speficied
  };

  // Merge the config specified with our defaults
  var _settings = merge(_defaults,config);

  // Configure a logger with our settings
  var logger = require('./utils/logger.js')(_settings);

  // Safe a pointer to ourself
  var self = this;

  // Main Build function
  // baseDir     : the top directory to pack (String)
  // startScript : the node script we will run (String)
  // options     : can override constructor options (Hash)
  // callback    : function run on error and completion (Function)
  this.build = function bashPackBuild(baseDir, startScript ,options,callback) {

    // Override settings with options specified
    var settings = merge(_settings,options);

    // Basedir needs to be specified
    logger.debug('baseDir specified %s',baseDir);
    if(baseDir === undefined) {
      return callback(new Error(baseDir+' is not specified'));
    }

    // BaseDir needs to be a directory
    if(!shell.test('-d',baseDir)) {
      return callback(new Error(baseDir+' is not a directory or does not exist'));
    }

    // StartScript needs to be specified
    logger.debug('startScript specified %s',startScript);
    if(startScript === undefined) {
      return callback(new Error("startScript "+startScript+' is not specified'));
    }

    // Calculate the full path of the startscript
    var fullStartScript = path.resolve(baseDir ,startScript);
    logger.debug('full path for startScript %s',fullStartScript);

    // Check if startScript is a file & exists
    if(!shell.test('-f',fullStartScript)) {
      return callback(new Error('startScript ' + fullStartScript+' is not a file or does not exist. Remember that it needs to be relative to the baseDir'));
    }

    // The resulting archive will be written to outputFile
    var outputFile = settings.outputFile;
    logger.debug('outputFile used %s',outputFile);
    // outputFile needs to be specified
    if(outputFile === undefined) {
      return callback(new Error("outputFile "+outputFile+' is not specified'));
    }

    // excludeFile contains the patterns passed to tar to exclude files from the archive
    var excludeFile = settings.excludeFile;
    if (excludeFile !== undefined) {
      if(!shell.test('-f',excludeFile)) {
        return callback(new Error('excludeFile' + excludeFile+' is not a file or does not exist. '));
      }
    }else {
      logger.debug('no excludeFile specified');
    }

    // Determine the node binary
    var nodePath ;

    // A node binary was specified
    if (settings.nodeBinary) {
      if(!shell.test('-f',settings.nodeBinary)) {
        return callback(new Error('We could not find the node-binary specified. '+settings.nodeBinary));
      } else {
        nodePath = settings.nodeBinary;
        logger.info('Node binary found at: '+nodePath);
      }

    } else {
      // Autodetect node file from path
      nodePath = shell.which('node');
      if (nodePath === null) {
        return callback(new Error('could not find a node binary in your path'));
      } else {
        logger.info('Node binary found at: '+nodePath);
      }
    }
    var name = settings.name;

    // Exit on all errors
    shell.config.fatal = true;

    // Silence the scripts output
    shell.config.silent = true;

    var makeselfPath = path.join(__dirname,'..','makeself','makeself.sh');
    var execArgs = [];
    var execArgsString = '';
    var execResult ;

    // First pass at creating the run file
    // This will include the files from the baseDir that have not been excluded
    execArgs = [
      '--bzip2',
      '--nox11',
      baseDir,
      outputFile,
      name,
      './.bashpack/bin/start.sh',
      startScript
    ];

    // If we have an excludeFile, we pass it as another options
    if (excludeFile) execArgs.unshift('--exclude '+path.resolve(excludeFile));

    execArgsString = quote(execArgs);
    logger.debug("First Pass: arguments for makeself: "+execArgsString);

    execResult = shell.exec( makeselfPath + ' '+execArgsString);
    if (execResult.code !== 0) {
      return callback(new Error('First pass failed',execResult.output));
    }
    logger.debug(execResult.output);

    // Get a temporary directory
    var tempDirObject = new Tempdir();
    var tempDir = tempDirObject.path;
    logger.debug('Using temporary directory '+tempDir);

    // Create the temporary bin directory
    var bashPackBinDir = tempDir+'/.bashpack/bin';
    logger.debug('Creating the '+bashPackBinDir+' directory');
    shell.mkdir('-p', bashPackBinDir);


    // Check if we need to include the node binary
    if (!settings.skipNodeInclude) {


      // Prepare nodejs binary to be included in the run file
      logger.debug('cp '+nodePath +' '+ bashPackBinDir);
      shell.cp(nodePath,bashPackBinDir);

      var dstNode= path.join(bashPackBinDir,'node');
      logger.debug('chmod u+x '+dstNode);
      shell.chmod('u+x',dstNode);
    } else {
      logger.debug('skipping inclusion of node-binary');
    }

    // Prepare start script to be included in the run file
    var startFile = path.join(__dirname, '..', 'scripts','start.sh');
    shell.cp(startFile,bashPackBinDir);
    shell.chmod('u+x',bashPackBinDir+'/start.sh');

    // Append the extra files to the run file
    execArgs = [
      '--append',
      '--nox11',
      tempDir,
      outputFile
    ];
    execArgsString = quote(execArgs);
    logger.debug("Second Pass: arguments for makeself: "+execArgsString);
    shell.exec( makeselfPath + ' '+execArgsString);

    // All went well
    return callback(null);

  };

}

exports = module.exports = BashPack;
