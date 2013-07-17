describe('BashPack', function () {

  // Packing can take a long time
  this.timeout(4000);

  var outputFile;

  beforeEach(function(done) {
    outputFile = tempFile.path;
    done();
  })

  afterEach(function(done) {
    // Cleanup our temporary file after creation
    if (fs.existsSync(outputFile)) {
      tempFile.unlinkSync();
    }
    done();
  })


  describe('Hello World', function () {
    it('should return an error if the base directory does not exist', function(done) {
      var bashPack = new BashPack();
      var baseDir = '/nowedontexist';
      var startScript;
      var opts = { outputFile: outputFile };

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

    it('should return an error if the startScript does not exist', function(done) {
      var bashPack = new BashPack();
      var baseDir = path.join(__dirname,'data','hello-world');
      var opts = { outputFile: outputFile };
      var startScript;

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

    it('should return an error if the node-binary does not exist', function(done) {
      var bashPack = new BashPack();
      var baseDir = path.join(__dirname,'data','hello-world');
      var opts = { 
        nodeBinary: '/i-dont-exist',
        outputFile: outputFile };
      var startScript;

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

    it('should not return an error on the hello-world baseDir with startScript ', function(done) {
      var opts = { outputFile: outputFile };
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello-world');
      var startScript = 'lib/hello.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        done();
      });
    })

    it('should not return an error on the hello-world baseDir with startScript ', function(done) {
      var opts = { outputFile: outputFile };
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello world');
      var startScript = 'lib/hello me.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        done();
      });
    })

    it('should not return an error on the hello-world with --skip-node-include', function(done) {
      var opts = { outputFile: outputFile, skipNodeInclude: true };
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello-world');
      var startScript = 'lib/hello.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        var results = shell.exec(outputFile + ' --bashpack-list');
        expect(results.code).to.be(0);
        done();
      });
    })

    it('should not include the "doc" dir on hello-world with --exclude "./doc/*"', function(done) {
      var opts = { outputFile: outputFile, skipNodeInclude: true , exclude: [ './doc/*' ]};
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello-world');
      var startScript = 'lib/hello.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        var results = shell.exec(outputFile + ' --bashpack-list');
        expect(results.code).to.be(0);
        expect(results.output).not.to.contain('doc');
        done();
      });
    })

    it('should not fail on a non existing --libs ', function(done) {
      var opts = { outputFile: outputFile, skipNodeInclude: true , libs: [ '/blabla']};
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello-world');
      var startScript = 'lib/hello.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

  });
});
