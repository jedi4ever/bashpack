var fs = require('fs');
var path = require('path');

var json = JSON.parse(fs.readFileSync(path.join(__dirname,'..','package.json'), 'utf8'));

var version = json.version;
module.exports = version;
