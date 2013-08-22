# Bashpacker

**bashpacker** packs a nodejs project into a single bash file that can be executed without the need to install nodejs or anything else
It will include the nodejs binary to be executed

[![Build Status](https://travis-ci.org/jedi4ever/bashpack.png?branch=master)](https://travis-ci.org/jedi4ever/bashpack)

## Installation:

    $ npm install -g bashpack

## CLI options

### Create init file
    $ ./bin/bashpack init --help

    Usage: init [options] <projectdir>

    Options:

      -h, --help   output usage information
      -f, --force  Force overwrite


### Build a bashpack

    $ ./bin/bashpack  build --help

      Usage: build [options] <projectdir>,<startscript>

      Options:

        -h, --help                           output usage information
        --log-level <loglevel>               Set loglevel [info]
        --log-timestamp                      Enable timestamps in log-output
        --no-log-colorize                    Disable colors in log-output
        --no-log-pretty-print                Disable pretty-print log-output
        -m, --log-mute                       Disable log-output
        -d, --debug                          Enable debug level
        -o, --output-file <outputfile>       Outputfile [bashpack.run]
        -f, --force                          Force overwrite
        -e, --exclude <patterns>             Pattern to exclude ['.git/*']
        -l, --libs <pattern>                 Shared libraries to include []
        -X, --exclude-file <excludefile>     File that contains the patterns to exclude [auto-detect from $projectdir/{.gitignore, .npmignore, .bashpackignore
        -s, --skip-node-include              Don't include a node binary in the bashpack
        -b, --node-binary <node-filename>    File path to node binary
        --node-version <node-version>        Node version to include. Use system|latest|va.b.c [system]
        --node-platform <node-platform>      Node platform to download. darwin|linux|sunos [darwin]
        --node-arch <node-arch>              Node arch to download. x86|x64 [x64]
        -c, --config-file <config-filename>  JSON File containing bashpack settings [auto-detect from $projectdir/bashpack.json]

By default it includes your 'system' node-binary in your bashpack.run file.
If you specify a `node-version` it will download the node-binary from `http://nodejs.org/download`

If you want to avoid the inclusion of a node-binary use the `--skip-node-include` option

## Sample CLI usage

This is how we would create a bashpack from the statsd project

    # Get a fresh repo
    $ git clone https://github.com/etsy/statsd.git
    $ cd statsd

    # Install all dependencies (--production will limit the ones needed for production)
    $ npm install --production

    # Dedupe the node_modules used by dependencies
    $ npm dedupe

    # Create a bashpack config
    $ bashpack init .

    # Create a bash script 'statsd.run' from 'current dir' and launch 'bin/statsd' on run
    $ bashpack . bin/statsd -o statsd.run

    # Now run the bashpack
    $ ./statsd.run exampleConfig.js

## Sample code usage

    var BashPack = require('bashpack');
    var bashPack = new BashPack();
    var projectDir = '.';
    var startScript = 'bin/statsd';
    var options = {
      outputFile: 'mybashpack.run'
    };

    bashPack.build(projectDir, startScript, options, function(err, filename) {
      if (err) {
        console.log('error happened:'+ err.message);
      } else {
        console.log('created bashpack '+ filename);
      }
    });

## Build Options/Defaults

```js
  var _defaults = {
    logMute: true, // no output by default
    logLevel: 'info',
    logTimestamp: false,
    logPrettyPrint: false,
    includeNode: true,
    exclude: [ '.git/*','doc/*','test/*' ],
    name: 'the anonymous module',
    outputFile: ['bashpack' , process.platform , process.arch].join('-') + '.run',
    configName: 'bashpack.json',
    libs: undefined,          // Array of native libs to add and load
    force: false,             // overwrite Bashpack outputFile
    excludeFile: undefined ,  // no exclude file speficied
    nodePlatform: process.platform, // darwin, linux, sunos
    nodeArch: process.arch,         // x86 | x64
    nodeVersion: 'system',           // system, latest, 0.10.x..
    nodeBinary: undefined     // Override node file used
  };
```

## ignore files

Bashpack reads packIgnores from: `.gitignore`, `.npmignore`, `.bashpackignore`
The file **override** the ignores, they do NOT merge

## bashpack run files options
A bashpack file, is a shell script, with a payload.
As the payload is bzip2-ed, they are small compared to the node-binary size.

Running a bashpack is simple ``./bashpack.run``.
All arguments specified will be directly passed to the node startScript

In addition to that, the bashpack also responds to some internal commands (prefixed with --bashpack)

    # Show bashpack help
    ./bashpack.run --bashpack-help

    # List all included files
    ./bashpack.run --bashpack-list

    # Check integrity of bashpack
    ./bashpack.run --check

    # Info on creation
    ./bashpack.run --bashpack-info

    # Don't run the script
    ./bashpack.run --bashpack-noexec

    # Extract in a directory
    ./bashpack.run --bashpack-target /opt/somedir

    # Treat the bashpack as a tar file
    ./bashpack.run --bashpack-tar -tvf

## Tips

- if you like to create a '.deb', '.rpm' etc.. package - consider using [fpm](https://github.com/jordansissel/fpm)
- to speed up execution of your bashpack.run file, you need trim down the files that are included. You can do this by adding paths/patterns to the exclude
- also if you do this from your working directory and you did not specify ``--production`` to your ``npm install``, your node_modules will be larger than necessary. Consider running this on a clean projectdir with ``--production``


## Limitations

### Dependencies

- the bashpack.run file uses uuencode, bzip2 , tar . These need to be in your path when running the bashpack.run file

### Native modules
When the bashpack is created, it will include the '.node' (native modules) for the architecture it is created on.
There is currently no good way of providing multi-architecture node/native modules.

If your module does not have native module dependencies, you can specify a node file from another architecture to be included

Also it can not guess the additional shared libs your application was compiled against, so you have to manually specify them.

### Platforms

- any unix-alike , or macosx should work
- windows is currently not supported

## Todos/Ideas
- build a bashpack from a GIT repo or NPM Tarball

- report warning  if packing on a different architecture
- report error if bashpack is run on the wrong architecture
- ability to pass nodejs options

- include DYLIBS in bashpack

- multi architecture bashpacks : by including multiple nodejs binaries in the bashpack and selecting the correct one


## Inspired by

Makeself - <https://github.com/megastep/makeself>

Tweaks made:

- fix for md5 to work
- prefix the archive options (info, list, check) with --bashpack-
- pass all arguments directly to script that is started

