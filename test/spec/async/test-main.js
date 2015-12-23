/* global __dirname */
/* global it */
/* global describe */
var assert = require('assert');
var path = require('path');
var util = require('../../util');

describe('Util.async', function() {
	var equal = assert.equal;
	var Async = util.load('common/util').Async;

	var time_start,
		time_end;
	it('load js file', function(done){
		time_start = new Date();
		Async.init(path.join(__dirname, 'worker.js'), function(result) {
			// console.log('info: result = '+result);
		})(1, function(result){
			// console.log(result, time_start, time_end);
			// equal(true, time_end - time_start);
			// console.log('result1 = '+result);
			done();

		})
		time_end = new Date();
		// console.log('hello afte async function');
	});
	it('load js file should use few time', function(){
		var time_used = time_end - time_start;
		equal(true, time_used >= 0 && time_used < 5);
	});

	it('run function', function(done){
		time_start = new Date();
		Async.init(function(){
			var T = thread;
			function run(time){
				time = time*1000;
				var time_start = new Date();
				while(1){
					if(new Date() - time_start > time){
						return 'after '+time;
					}
				}
			}
			var param_str = '';
			T.on('initData', function(data) {
				param_str += data;
			});
			T.on('initEnd', function(){
				var result = run(JSON.parse(param_str));
				T.emit('data', result);
			});
		})(2, function(result){
			// console.log(result, time_start, time_end);
			done();
		});
		time_end = new Date();
		// console.log('hello afte async function');
	});
	it('run function should use few time', function(){
		var time_used = time_end - time_start;
		equal(true, time_used >= 0 && time_used < 5);
	});
});
