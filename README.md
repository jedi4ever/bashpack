# Bashpacker

**bashpacker** packs a nodejs project into a single bash file that can be executed without the need to install nodejs or anything else
It will include the nodejs binary to be executed

## Installation:

    $ npm install bashpack

## CLI options

    Usage: build [options] <basedir>,<startscript>

    Options:

      -h, --help                      output usage information
      --log-level <loglevel>          Set loglevel [info]
      --log-timestamp                 Show timestamps in log entries [false]
      --log-colorize                  Use colors in log output [true]
      --log-pretty-print              Pretty print [true]
      -m, --log-mute                  Disable ouput
      -d, --debug                     Enable debug level
      -o, --output-file <outputfile>  Outputfile [bashpack.run]
      -f, --force                     Force overwrite
      --temp-dir <directory>          Directory to use for tempory [auto-detect from TMP_DIR]
      -e, --exclude <patterns>        Pattern to exclude ['.git/*']
      -l, --libs <pattern>            Shared libraries to include []
      --exclude-file <excludefile>    File that contains the (shell)patterns to exclude
      --include-node <flag>           Include node binary in the bashpack [true]
      --node-binary <node-filename>   File path to node binary [auto-detect from path]

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
    $ bashpack init

    # Create a bash script 'statsd.run' from 'current dir' and launch 'bin/statsd' on run
    $ bashpack . bin/statsd -o statsd.run

    # Now run the bashpack
    $ ./statsd.run exampleConfig.js

## Sample code usage

    var BashPack = require('bashpack');
    var bashPack = new BashPack();
    var baseDir = '.';
    var startScript = 'bin/statsd';

    bashPack.build(baseDir, startScript, function(err) {
      if (err) {
        console.log('error happened:'+ err.message);
      }
    });

## bashpack run files options

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

## Inspired by

Makeself - <https://github.com/megastep/makeself>

Tweaks made:
- fix for md5 to work
- prefix the archive options (info, list, check) with --bashpack-
- pass all arguments directly to script that is started

## Limitations

When the bashpack is created, it will include the '.node' (native modules) for the architecture it is created on.
There is currently no good way of providing multi-architecture node/native modules.

If your module does not have native module dependencies, you can specify a node file from another architecture to be included

Also it can not guess the additional shared libs your application was compiled against, so you have to manually specify them.

## Todos/Ideas

- provide option to specify tempdir
- report error if bashpack is run on the wrong architecture
- integrate .bashpack-ignore in package.json
- ability to pass nodejs options
- grunt plugin

- include DYLIBS in bashpack

- guess the startScript from the main in the package.json
- guess the archive name from the module description
- bashpackignore syntax to be similar from gitignore & npmignore

- auto-build backfrom from npm (download, install --production, dedupe, bashpack)
- copy baseDir first and rebuild it from a clean node_modules dir

- auto-download nodejs binary/arch/version/etc to be included

- multi architecture bashpacks : by including multiple nodejs binaries in the bashpack and selecting the correct one
