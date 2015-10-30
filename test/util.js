/* global __dirname */
/* global it */
/* global describe */
var assert = require('assert');
var fs = require('fs');
var util = require('util');

describe('Util', function() {
	var equal = assert.equal;
	var Util = require('../app/workbench/util');
	describe('verification', function () {
		it('[function get] should get result, and result.name should not be undefined', function () {
			var result = Util.verification.get();
			equal(true, result && result.name !== undefined);
		});

		it('[function set] should set listence', function(){
			var result_old = Util.verification.get();
			var listence_test = 'hello';
			Util.verification.set(listence_test);

			var result_new = Util.verification.get();
			equal(listence_test, result_new.l);
			Util.verification.set(result_old.l);
		})
	});
	describe('file', function(){
		var util_file = Util.file;
		var file = './test.txt';
		var content = 'hello world';
		var obj = {name: content};
		it('[function exists] should not exists', function(){
			equal(false, util_file.exists('/a/b/c/d'));
		})
		it('[function exists] should exists', function(){
			equal(true, util_file.exists(__dirname));
		})
		it('[function read] should read content(string and object)', function(){
			fs.writeFileSync(file, content);

			var c = util_file.read(file);
			equal(content, c);

			fs.writeFileSync(file, JSON.stringify(obj));
			equal(content, util_file.read(file, true).name);

			fs.unlinkSync(file);
		});
		it('[function write] should write content(string and object)', function(){
			util_file.write(file, content);
			var c = util_file.read(file);

			equal(content, c);

			util_file.write(file, obj);

			equal(content, util_file.read(file, true).name);

			fs.unlinkSync(file);
		});
		it('[function rm] should remove a file or path', function(){
			fs.writeFileSync(file, content);

			util_file.rm(file);

			equal(false, util_file.exists(file));

			var p_1 = './a';

			util_file.exists(p_1) || fs.mkdirSync(p_1);

			util_file.rm(p_1);
			equal(false, util_file.exists(p_1));
		});
	});
	describe('encrypt', function(){
		var util_encrypt = Util.encrypt;
		it('[function encrypt]', function(){
			var result = util_encrypt(context);
			equal('46cebaee0d91743b50f9ded9e38e11e9d42380b1', result);
		})
		it('[function decode and encode]', function(){
			var context = 'hello';
			var result = util_encrypt.encode(context);
			var result_decode = util_encrypt.decode(result);
			equal(context, result_decode);
		});
	});
	describe('path', function(){
		var util_path = Util.path;
		it('[function join] path join, should replace "\\" to "/"', function(){
			var result = util_path.join('a', 'b', 'c');
			equal('a/b/c', result);
		});
	});

	describe('grid', function(){
		var grid = Util.grid;

		it('[function grid] should get a array', function(){
			var result = grid(10, 10, 30, 30, 2);

			equal(true, util.isArray(result) && result.length > 0 && result[0].length > 0);
		});
	});
});

require('./async/main-test.js');