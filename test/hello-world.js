describe('BashPack', function () {

  this.timeout(4000);

  describe('Hello World', function () {
    it('should return an error if the base directory does not exist', function(done) {
      var bashPack = new BashPack();
      var baseDir = '/nowedontexist';
      var startScript;
      var opts = {};

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

    it('should return an error if the startScript does not exist', function(done) {
      var bashPack = new BashPack();
      var baseDir = path.join(__dirname,'data','hello-world');
      var opts = {};
      var startScript;

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

    it('should return an error if the node-binary does not exist', function(done) {
      var bashPack = new BashPack();
      var baseDir = path.join(__dirname,'data','hello-world');
      var opts = { nodeBinary: '/i-dont-exist'};
      var startScript;

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).not.to.be(null)
        done();
      });
    })

    it('should not return an error on the hello-world baseDir with startScript ', function(done) {
      var opts = {};
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello-world');
      var startScript = 'lib/hello.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        done();
      });
    })

    it('should not return an error on the hello-world baseDir with startScript ', function(done) {
      var opts = { logLevel: 'info', logMute: true};
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello world');
      var startScript = 'lib/hello me.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        done();
      });
    })

    it('should not return an error on the hello-world with --skip-node-include', function(done) {
      var opts = { logLevel: 'info', logMute: true , skipNodeInclude: true };
      var bashPack = new BashPack(opts);
      var baseDir = path.join(__dirname,'data','hello-world');
      var startScript = 'lib/hello.js';

      bashPack.build(baseDir, startScript, opts, function(err) {
        expect(err).to.be(null)
        done();
      });
    })

  });
});
