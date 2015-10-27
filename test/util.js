/* global it */
/* global describe */
var assert = require('assert');

		
describe('Util', function() {
	var Util = require('../app/workbench/util');
	describe('verification', function () {
		it('should get result, and result.name should be "admin"', function () {
			var result = Util.verification.get();
			assert.equal(true, result && result.name === 'admin');
		});
	});
});
