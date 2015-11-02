/* global __dirname */
/* global it */
/* global describe */
var assert = require('assert');
var path = require('path');
var util = require('../../util');

describe('Util.async', function() {
	this.timeout(10000);
	var equal = assert.equal;
	var Async = util.load('workbench/util').Async;

	var time_start,
		time_end;
	it('load js file', function(done){
		time_start = new Date();
		Async.init(path.join(__dirname, 'worker.js'))(1, function(result){
			// console.log(result, time_start, time_end);
			// equal(true, time_end - time_start);

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
			T.on('init', function(time){
				var result = run(time);
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
