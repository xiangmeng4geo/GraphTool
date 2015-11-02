var assert = require('assert');
var fs = require('fs');

describe('product_conf', function() {
	var equal = assert.equal;
	var deepEqual = assert.deepEqual;

	var name = 'test',
		json = {name: 'hello'};
	var Config = require('../util').load('workbench/product_conf');
	it('[functon read] should not read a not exists conf file', function(){
		var result = Config.read(name+Math.random());
		equal(null, result);
	});
	it('[function save] should get json', function(){
		Config.save(name, json);

		deepEqual(json, Config.read(name));

		Config.rm(name);
	});
})
