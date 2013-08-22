var BashPack = require('../lib/bashpack');
var path = require('path');
var fs = require('fs');
var expect = require('expect.js');

var realTimeout = process.env.TRAVIS ? 12000 : 4000 ;

describe.skip('BashPack Self', function () {

  // Packing can take a long time
  this.timeout(realTimeout);

  var outputFile;

  beforeEach(function(done) {
    done();
  });

  afterEach(function(done) {
    done();
  });


  it('should work on ourselves', function(done) {
    var bashPack = new BashPack({ force: true});
    var baseDir = path.join(__dirname, '..');
    var startScript = './bin/bashpack';
    var opts = { outputFile: outputFile};

    bashPack.build(baseDir, startScript, opts, function(err) {
      expect(err).to.be(null);
      done();
    });
  });


});
