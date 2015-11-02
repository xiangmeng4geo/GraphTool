var assert = require('assert');
var util = require('../util');

var equal = assert.equal;

// idw插值为异步，要充分测试其异步性

describe('interpolate.idw', function(){
    this.timeout(20000);
    var idw = util.load('workbench/interpolate/idw');
    var Util = util.load('workbench/util');
    var Logger = util.load('workbench/logger');
    // idw.info(function(msg){
    //     Logger.info(msg);
    // });
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
    var time_start, time_end, time_done;
    it('idw interpolation_all = false, should get some default val', function(done){
        time_start = new Date();
        idw(data, arr, {
            numOfNearest: 4,
            default_val: DEFAULT_VAL,
            interpolation_all: false
        }, function(err, data){
            var num_value = 0,
                num_total = 0,
                num_default = 0;
            for(var i = 0, j = arr.length; i<j; i++){
                for(var ii = 0, item = arr[i], jj = item.length; ii<jj; ii++){
                    var v = data[i][ii].v;
                    if(v >= v0 && v <= v1){
                        num_value++;
                    }else if(v == DEFAULT_VAL){
                        num_default++;
                    }
                    num_total++;
                }
            }
            var result = num_default + num_value == num_total && num_default > 0;
            time_done = new Date();
            done(result? null: new Error('get no default val'));
        });
        time_end = new Date();
    });
    it('[interpolation_all = false]idw should a async function,and should takes a little time', function(){
        equal(true, time_end - time_start < TIME_LITTLE && time_done - time_end > TIME_LITTLE);
    });
    time_start = time_end = null;
    it('idw interpolation_all = true, should not get default val', function(done){
        time_start = new Date();
        idw(data, arr, {
            numOfNearest: 4,
            default_val: DEFAULT_VAL,
            interpolation_all: true
        }, function(err, data){
            var num_value = 0,
                num_total = 0,
                num_default = 0;
            for(var i = 0, j = arr.length; i<j; i++){
                for(var ii = 0, item = arr[i], jj = item.length; ii<jj; ii++){
                    var v = data[i][ii].v;
                    if(v >= v0 && v <= v1){
                        num_value++;
                    }else if(v == DEFAULT_VAL){
                        num_default++;
                    }
                    num_total++;
                }
            }
            var result = num_default + num_value == num_total && num_default == 0;
            time_done = new Date();
            done(result? null: new Error('get some default val'));
        });
        time_end = new Date();
    });
    it('[interpolation_all = true]idw should a async function,and should takes a little time', function(){
        equal(true, time_end - time_start < TIME_LITTLE && time_done - time_end > TIME_LITTLE);
    });
});
