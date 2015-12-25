var assert = require('assert');
var util = require('../../util');

describe('conrec', function() {
	var tool = util.load('common/conrec/tool');

	var polygon = [{
		x: 10,
		y: 0
	}, {
		x: 100,
		y: 0
	}, {
		x: 100,
		y: 100
	}, {
		x: 10,
		y: 100
	}];

	var line = [{
		x: 10,
		y: 40
	}, {
		x: 100,
		y: 30
	}];
	var line_inner = [{
		x: 30, 
		y: 30
	}, {
		x: 50, 
		y: 30
	}, {
		x: 50, 
		y: 50
	}, {
		x: 30, 
		y: 50
	}, {
		x: 30, 
		y: 30
	}];
	it('tool.isClosed', function() {
		var isClosed = tool.isClosed;
		isClosed(polygon).should.to.equal(false);
		isClosed(line).should.to.equal(false);
		isClosed(line_inner).should.to.equal(true);
	});
	it('tool.splitPolygonByLine', function() {
		var splitPolygonByLine = tool.splitPolygonByLine;

		var result = splitPolygonByLine(polygon, line);
		// console.log(JSON.stringify(result));
		result.should.have.length(2);

		var result_island = splitPolygonByLine(polygon, line_inner);
		// console.log(JSON.stringify(result_island));
		result_island.should.have.length(2);
	});
	it('tool.getBond', function() {
		var getBound = tool.getBound;

		getBound(polygon).should.deep.equal({
			x_min: 10,
			x_max: 100,
			y_min: 0,
			y_max: 100
		});

		getBound(line).should.deep.equal({
			x_min: 10,
			x_max: 100,
			y_min: 30,
			y_max: 40
		});
		getBound(line_inner).should.deep.equal({
			x_min: 30,
			x_max: 50,
			y_min: 30,
			y_max: 50
		});
	});
});