var path = require('path');

var PATH_APP = path.join(__dirname, '../app/');

exports.load = function(url){
    return require(path.join(PATH_APP, url));
}
var chai = require('chai');
var should = chai.should();
global.assert = chai.assert;
global.expect = chai.expect;
exports.equal = require('assert').equal;
