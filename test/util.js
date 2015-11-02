var path = require('path');
var assert = require('assert');

var PATH_APP = path.join(__dirname, '../app/');

exports.load = function(url){
    return require(path.join(PATH_APP, url));
}
exports.equal = assert.equal;
