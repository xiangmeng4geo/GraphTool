var assert = require('assert');
var util = require('../util');

describe('Util.color', function() {
    var CONST = util.load('common/const');
    var Util = util.load('common/util');
    var color = Util.color;

    it('should get false', function() {
        color().should.equal(false);
        color([]).should.equal(false);
        color([1]).should.equal(false);
        color([{}]).should.equal(false);
    });

    it('should get Function', function() {
        color([{
            colors: []
        }]).should.is.a('function');

        var blendent = [{
            colors: [{
                "color": "#000000",
                "val": [-9999, 0]
            }, {
                "color": "#111111",
                "val": [0, 5]
            }, {
                "color": "#222222",
                "val": [5, 10]
            }, {
                "color": "#333333",
                "val": [10, 15]
            }, {
                "color": "#444444",
                "val": [15, 9999]
            }]
        }];
        var result = color(blendent);
        result.should.is.a('function');

        result(4.5).should.equal('#111111');
        result(16).should.equal('#444444');

        result = color(blendent, true);
        result.should.is.a('function');
        result(4.5).should.equal(CONST.COLOR.TRANSPARENT);
        result(16).should.equal(CONST.COLOR.TRANSPARENT);
    });
})
