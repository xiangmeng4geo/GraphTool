var assert = require('assert');
var util = require('../util');

describe('conrec', function() {
    var idw = util.load('common/interpolate/idw');
    var Util = util.load('common/util');
    var conrec = util.load('common/conrec');
    var x0 = 0, y0 = 0, x1 = 10, y1 = 10;
    var v0 = 0, v1 = 30;
    var DEFAULT_VAL = 999999;
    var TIME_LITTLE = 10;
    var arr = Util.grid(0, 0, 10, 10);

    var data = [
        { x: 1, y: 1, v: 10},
        { x: 2, y: 1, v: 10},
        { x: 1, y: 1, v: 10},
        { x: 1, y: 1, v: 10},
        { x: 1, y: 1, v: 10},
        { x: 1, y: 1, v: 10},
    ];
    var data = [];
    for(var i = 0; i< 30; i++){
        data.push({
            x: x0 + Math.random()* x1,
            y: y0 + Math.random() * y1,
            v: v0 + Math.random() * v1
        });
    }
    var blendent = [{
			"val": {
				"n": "温度",
				"v": "102"
			},
			"color_start": "#0000ff",
			"color_end": "#ff0000",
			"is_stripe": false,
			"number_min": "-30",
			"number_max": "40",
			"number_level": "8",
			"colors": [{
				"is_checked": true,
				"color": "#1f1885",
				"color_text": "#ffffff",
				"val": [0, 10],
				"text": "1, 10",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#1149d8",
				"color_text": "#ffffff",
				"val": [10, 15],
				"text": "10, 15",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#4db4f5",
				"color_text": "#000000",
				"val": [15, 20],
				"text": "15,20",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#f9de46",
				"color_text": "#000000",
				"val": [20, 25],
				"text": "20, 25",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#f9f2bb",
				"color_text": "#000000",
				"val": [25, 30],
				"text": "25, 30",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#f9de46",
				"color_text": "#000000",
				"val": [30, 99999],
				"text": "30以上",
				"order": 0
			}]
		}]
    it('should get error', function(done) {
        idw(data, arr, function(e, data){
            conrec(data, null, false, function(err, data) {
                err.should.is.a('error');
                done();
            })
        })
    })
    it('should get result', function(done) {
        idw(data, arr, function(err, data){
            conrec(data, blendent, false, function(err, data) {
            	// console.log(data.list);
                expect(err).to.be.a('null');
                data.should.have.property('list');
                done();
            });
        })
    })
});
