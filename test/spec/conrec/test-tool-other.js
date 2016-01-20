var assert = require('assert');
var util = require('../../util');

describe('conrec.tool', function() {
	var tool = util.load('common/conrec/tool');
	it('tool.linkLines', function() {
		var linkLines = tool.linkLines;

		var line1 = [{
			x: 0, 
			y: 0
		}, {
			x: 10, 
			y: 0
		}, {
			x: 12, 
			y: 5
		}];

		var line2 = [{
			x: 13, 
			y: 5
		}, {
			x: 13, 
			y: 10
		}, {
			x: 0, 
			y: 6
		}]

		var result = linkLines(line1, line2);
		result.should.deep.equal(line1.concat(line2));

		var line3 = line2.slice();
		line3.reverse();
		var result = linkLines(line1, line3);
		line3.reverse();
		result.should.deep.equal(line1.concat(line3));

		var line4 = line1.slice();
		line4.reverse();
		var result = linkLines(line4, line2);
		line4.reverse();
		result.should.deep.equal(line4.concat(line2));
		
		var line5 = line2.slice();
		line5.reverse();
		var line6 = line1.slice();
		line6.reverse();
		var result = linkLines(line5, line6);

		result.should.deep.equal(line5.concat(line6));
	});
});