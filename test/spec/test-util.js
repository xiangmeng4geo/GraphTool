/* global __dirname */
/* global it */
/* global describe */
var fs = require('fs');
var util = require('util');

describe('Util', function() {
	var util_test = require('../util');
	var equal = util_test.equal;
	var Util = util_test.load('workbench/util');
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

	describe('Digit', function(){
		var toFixed = Util.Digit.toFixed;
		it('[function toFixed]', function(){
			equal('10.24', toFixed(10.2356985, 2));
		});
	});
	describe('Polygon', function(){
		var Polygon = Util.Polygon;
		var items = [{
			x: 0,
			y: 0
		}, {
			x: 10,
			y: 0
		}, {
			x: 10,
			y: 10
		}, {
			x: 0,
			y: 10
		}];
		it('[function isPointIn] should in', function(){
			var result = Polygon.isPointIn(items, 2, 2);
			equal(true, result);
		});
		it('[function isPointIn] should not in', function(){
			var result = Polygon.isPointIn(items, 20, 20);
			equal(false, result);
		});
		it('[function isPolygonIn] should in', function(){
			var sub_items = [{
				x: 1,
				y: 1
			}, {
				x: 2,
				y: 1
			}, {
				x: 2,
				y: 2
			}];
			var result = Polygon.isPolygonIn(items, sub_items);
			equal(true, result);
		});
		it('[function isPolygonIn] should not in', function(){
			var sub_items = [{
				x: 1,
				y: 1
			}, {
				x: 2,
				y: 1
			}, {
				x: 20,
				y: 20
			}];
			result = Polygon.isPolygonIn(items, sub_items);
			equal(false, result);
		});
	});

	describe('serialize', function(){
		var serialize = Util.serialize;
		it('serialize value', function(){
			var result;
			result = serialize(1);
			result.should.be.a('string');
			result.should.equal('1');

			result = serialize('test');
			result.should.be.a('string');
			result.should.equal('test');

			result = serialize([1, 2, 3]);
			result.should.be.a('string');
			result.should.equal('1_2_3');

			result = serialize({name: 'test', age: 10});
			result.should.be.a('string');
			result.should.equal('10_age_name_test');

			result = serialize({name: 'test', v: [1, 2, 3]});
			result.should.be.a('string');
			result.should.equal('1_2_3_name_test_v');

			result = serialize();
			result.should.be.a('string');
			result.should.equal('_');
		});
	});

	describe('isfunction', function() {
		var isFunction = Util.isFunction;
		it('should be function', function() {
			isFunction(function(){}).should.equal(true);
			isFunction(new Function()).should.equal(true);
		})
		it('should not be function', function() {
			isFunction(1).should.equal(false);
			isFunction({}).should.equal(false);
		})
	});
	describe('isArray', function() {
		var isArray = Util.isArray;
		it('should be Array', function() {
			isArray([]).should.equal(true);
			isArray(new Array()).should.equal(true);
		})
		it('should not be Array', function() {
			isArray(1).should.equal(false);
			isArray({}).should.equal(false);
		})
	});
	describe('isPlainObject', function() {
		var isPlainObject = Util.isPlainObject;
		it('should be PlainObject', function() {
			isPlainObject({}).should.equal(true);
		})
		it('should not be PlainObject', function() {
			isPlainObject(1).should.equal(false);
			isPlainObject([]).should.equal(false);

			function Person() {
				this.name = 'Person';
			}
			isPlainObject(new Person()).should.equal(false);
		})
	});
	describe('extend', function() {
		var extend = Util.extend;
		it('should get extend object', function() {
			extend({age: 10}, {name: 'test'}).should.deep.equal({age: 10, name: 'test'});
			extend({age: 10}, {name: 'test'}, {man: [1, 2, 3]}).should.deep.equal({age: 10, name: 'test', man: [1, 2, 3]});
		})
	});
});
