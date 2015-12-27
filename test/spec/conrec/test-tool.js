var assert = require('assert');
var util = require('../../util');

describe('conrec', function() {
	var tool = util.load('common/conrec/tool');

	var polygon = {
		items: [{
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
		}]
	};

	var line = [{
		x: 10,
		y: 40
	}, {
		x: 100,
		y: 30
	}];
	var line1 = [{
		x: 10,
		y: 40
	}, {
		x: 20,
		y: 0
	}];
	var line2 = [{
		x: 10,
		y: 0
	}, {
		x: 20,
		y: 20
	}, {
		x: 10,
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
	var line_inner1 = [{
		x: 20,
		y: 50
	}, {
		x: 50,
		y: 50
	}, {
		x: 50,
		y: 70
	}, {
		x: 20,
		y: 70
	}, {
		x: 20,
		y: 50
	}];
	var line3 = [{
		x: 50,
		y: 0
	}, {
		x: 50,
		y: 10
	}, {
		x: 60,
		y: 10
	}, {
		x: 60,
		y: 0
	}];
	var line4 = [{
		x: 40,
		y: 0
	}, {
		x: 40,
		y: 20
	}, {
		x: 70,
		y: 20
	}, {
		x: 70,
		y: 0
	}];
	var line5 = [{
		x: 40,
		y: 0
	}, {
		x: 40,
		y: 20
	}, {
		x: 100,
		y: 20
	}];
	var line6 = [{
		x: 80,
		y: 0
	}, {
		x: 100,
		y: 30
	}];
	it('tool.isClosed', function() {
		var isClosed = tool.isClosed;
		isClosed(polygon.items).should.to.equal(false);
		isClosed(line).should.to.equal(false);
		isClosed(line_inner).should.to.equal(true);
	});
	it('tool.splitPolygonByLine', function() {
		var splitPolygonByLine = tool.splitPolygonByLine;

		var result = splitPolygonByLine(polygon, line);
		// console.log(JSON.stringify(result));
		result.should.have.length(2);
		result.should.deep.equal([{
			items: [{
				x: 100,
				y: 100
			}, {
				x: 10,
				y: 100
			}, {
				x: 10,
				y: 40
			}, {
				x: 100,
				y: 30
			}, {
				x: 100,
				y: 100
			}]
		}, {
			items: [{
				x: 10,
				y: 0
			}, {
				x: 100,
				y: 0
			}, {
				x: 100,
				y: 30
			}, {
				x: 10,
				y: 40
			}, {
				x: 10,
				y: 0
			}]
		}]);

		var result = splitPolygonByLine(polygon, line_inner);
		// console.log(JSON.stringify(result));
		result.should.have.length(2);
		result.should.deep.equal([{
			items: [{
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
			}, {
				x: 10,
				y: 0
			}],
			sub: [
				[{
					x: 30,
					y: 30
				}, {
					x: 30,
					y: 50
				}, {
					x: 50,
					y: 50
				}, {
					x: 50,
					y: 30
				}, {
					x: 30,
					y: 30
				}]
			]
		}, {
			items: [{
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
			}]
		}]);

		var result = splitPolygonByLine(polygon, line1);
		// console.log(JSON.stringify(result));
		result.should.have.length(2);
		result.should.deep.equal([{
			items: [{
				x: 100,
				y: 0
			}, {
				x: 100,
				y: 100
			}, {
				x: 10,
				y: 100
			}, {
				x: 10,
				y: 40
			}, {
				x: 20,
				y: 0
			}, {
				x: 100,
				y: 0
			}]
		}, {
			items: [{
				x: 10,
				y: 0
			}, {
				x: 20,
				y: 0
			}, {
				x: 10,
				y: 40
			}, {
				x: 10,
				y: 0
			}]
		}]);

		var result = splitPolygonByLine(polygon, line2);
		// console.log(JSON.stringify(result));
		result.should.have.length(2);
		result.should.deep.equal([{
			items: [{
				x: 100,
				y: 0
			}, {
				x: 100,
				y: 100
			}, {
				x: 10,
				y: 100
			}, {
				x: 10,
				y: 30
			}, {
				x: 20,
				y: 20
			}, {
				x: 10,
				y: 0
			}, {
				x: 100,
				y: 0
			}]
		}, {
			items: [{
				x: 10,
				y: 0
			}, {
				x: 10,
				y: 0
			}, {
				x: 20,
				y: 20
			}, {
				x: 10,
				y: 30
			}, {
				x: 10,
				y: 0
			}]
		}]);
	});

	it('tool.getBond', function() {
		var getBound = tool.getBound;

		getBound(polygon.items).should.deep.equal({
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

	it('tool.splitPolygonsByLines', function() {
		var splitPolygonsByLines = tool.splitPolygonsByLines;

		var result = splitPolygonsByLines([polygon], [line, line1]);
		result.should.have.length(3);
		result.should.deep.equal([{
			"items": [{
				"x": 100,
				"y": 100
			}, {
				"x": 10,
				"y": 100
			}, {
				"x": 10,
				"y": 40
			}, {
				"x": 100,
				"y": 30
			}, {
				"x": 100,
				"y": 100
			}]
		}, {
			"items": [{
				"x": 100,
				"y": 0
			}, {
				"x": 100,
				"y": 30
			}, {
				"x": 10,
				"y": 40
			}, {
				"x": 20,
				"y": 0
			}, {
				"x": 100,
				"y": 0
			}]
		}, {
			"items": [{
				"x": 10,
				"y": 40
			}, {
				"x": 10,
				"y": 0
			}, {
				"x": 20,
				"y": 0
			}, {
				"x": 10,
				"y": 40
			}]
		}]);

		var result = splitPolygonsByLines([polygon], [line, line1, line_inner1]);
		result.should.have.length(4);
		result.should.deep.equal([{
			"items": [{
				"x": 100,
				"y": 100
			}, {
				"x": 10,
				"y": 100
			}, {
				"x": 10,
				"y": 40
			}, {
				"x": 100,
				"y": 30
			}, {
				"x": 100,
				"y": 100
			}],
			"sub": [
				[{
					"x": 20,
					"y": 50
				}, {
					"x": 20,
					"y": 70
				}, {
					"x": 50,
					"y": 70
				}, {
					"x": 50,
					"y": 50
				}, {
					"x": 20,
					"y": 50
				}]
			]
		}, {
			"items": [{
				"x": 20,
				"y": 50
			}, {
				"x": 50,
				"y": 50
			}, {
				"x": 50,
				"y": 70
			}, {
				"x": 20,
				"y": 70
			}, {
				"x": 20,
				"y": 50
			}]
		}, {
			"items": [{
				"x": 100,
				"y": 0
			}, {
				"x": 100,
				"y": 30
			}, {
				"x": 10,
				"y": 40
			}, {
				"x": 20,
				"y": 0
			}, {
				"x": 100,
				"y": 0
			}]
		}, {
			"items": [{
				"x": 10,
				"y": 40
			}, {
				"x": 10,
				"y": 0
			}, {
				"x": 20,
				"y": 0
			}, {
				"x": 10,
				"y": 40
			}]
		}])

		var result = splitPolygonsByLines([polygon], [line3, line4]);
		// console.log(JSON.stringify(result));
		result.should.have.length(3);
		result.should.deep.equal([{
			"items": [{
				"x": 60,
				"y": 0
			}, {
				"x": 60,
				"y": 10
			}, {
				"x": 50,
				"y": 10
			}, {
				"x": 50,
				"y": 0
			}, {
				"x": 60,
				"y": 0
			}]
		}, {
			"items": [{
				"x": 50,
				"y": 0
			}, {
				"x": 50,
				"y": 10
			}, {
				"x": 60,
				"y": 10
			}, {
				"x": 60,
				"y": 0
			}, {
				"x": 70,
				"y": 0
			}, {
				"x": 70,
				"y": 20
			}, {
				"x": 40,
				"y": 20
			}, {
				"x": 40,
				"y": 0
			}, {
				"x": 50,
				"y": 0
			}]
		}, {
			"items": [{
				"x": 100,
				"y": 0
			}, {
				"x": 100,
				"y": 100
			}, {
				"x": 10,
				"y": 100
			}, {
				"x": 10,
				"y": 0
			}, {
				"x": 40,
				"y": 0
			}, {
				"x": 40,
				"y": 20
			}, {
				"x": 70,
				"y": 20
			}, {
				"x": 70,
				"y": 0
			}, {
				"x": 100,
				"y": 0
			}]
		}]);
		var result = splitPolygonsByLines([polygon], [line3, line5]);
		// console.log(JSON.stringify(result));
		result.should.have.length(3);
		result.should.deep.equal([{
			"items": [{
				"x": 60,
				"y": 0
			}, {
				"x": 60,
				"y": 10
			}, {
				"x": 50,
				"y": 10
			}, {
				"x": 50,
				"y": 0
			}, {
				"x": 60,
				"y": 0
			}]
		}, {
			"items": [{
				"x": 100,
				"y": 100
			}, {
				"x": 10,
				"y": 100
			}, {
				"x": 10,
				"y": 0
			}, {
				"x": 40,
				"y": 0
			}, {
				"x": 40,
				"y": 20
			}, {
				"x": 100,
				"y": 20
			}, {
				"x": 100,
				"y": 100
			}]
		}, {
			"items": [{
				"x": 50,
				"y": 0
			}, {
				"x": 50,
				"y": 10
			}, {
				"x": 60,
				"y": 10
			}, {
				"x": 60,
				"y": 0
			}, {
				"x": 100,
				"y": 0
			}, {
				"x": 100,
				"y": 20
			}, {
				"x": 40,
				"y": 20
			}, {
				"x": 40,
				"y": 0
			}, {
				"x": 50,
				"y": 0
			}]
		}]);

		var result = splitPolygonsByLines([polygon], [line_inner, line6]);
		// console.log(JSON.stringify(result));
		result.should.have.length(3);
		result.should.deep.equal([{
			"items": [{
				"x": 100,
				"y": 0
			}, {
				"x": 100,
				"y": 30
			}, {
				"x": 80,
				"y": 0
			}, {
				"x": 100,
				"y": 0
			}]
		}, {
			"items": [{
				"x": 100,
				"y": 100
			}, {
				"x": 10,
				"y": 100
			}, {
				"x": 10,
				"y": 0
			}, {
				"x": 80,
				"y": 0
			}, {
				"x": 100,
				"y": 30
			}, {
				"x": 100,
				"y": 100
			}],
			"sub": [
				[{
					"x": 30,
					"y": 30
				}, {
					"x": 30,
					"y": 50
				}, {
					"x": 50,
					"y": 50
				}, {
					"x": 50,
					"y": 30
				}, {
					"x": 30,
					"y": 30
				}]
			]
		}, {
			"items": [{
				"x": 30,
				"y": 30
			}, {
				"x": 50,
				"y": 30
			}, {
				"x": 50,
				"y": 50
			}, {
				"x": 30,
				"y": 50
			}, {
				"x": 30,
				"y": 30
			}]
		}]);
	});
});