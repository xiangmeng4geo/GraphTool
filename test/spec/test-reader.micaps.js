var util = require('../util');
var equal = util.equal;
var Util = util.load('workbench/util'),
    Util_file = Util.file,
    Util_path = Util.path;

describe('datareader.micaps', function(){
    function _getDataPath(name){
        return Util_path.join(__dirname, '../data/micaps', name);
    }
    var read_micaps = util.load('workbench/datareader/micaps');
    it('[type 14] file = 14.1(get no areas)', function(done){
        read_micaps({
            file: _getDataPath('14.1')
        }, function(err, data){
            try{
                if(data.lines.length == 37 &&
                    data.line_symbols.length == 2 &&
                    data.symbols.length == 22
                ){
                    done();
                }else{
                    throw new Error('not equal length');
                }
            }catch(e){
                done(e);
            }
        });
    });
    it('[type 14] file = 14.2(get some areas)', function(done){
        read_micaps({
            file: _getDataPath('14.2')
        }, function(err, data){
            try{
                if(
                    data.areas.length == 11 &&
                    data.symbols.length == 5
                ){
                    done();
                }else{
                    throw new Error('not equal length');
                }
            }catch(e){
                done(e);
            }
        });
    });
    it('[type 1] only get real values', function(done){
        read_micaps({
            file: _getDataPath('1.1'),
            interpolate: false,
            val_col: 4
        }, function(err, data){
            try{
                var d = data.data;
                if(d.length > 0){
                    var v = d[0];
                    // 尝试读取第一行数据
                    if(v.x == 11.92 && v.y == 78.92 && v.v == 7){
                        return done();
                    }
                }
            }catch(e){}

            done(new Error('read data error'));
        });
    });
    it('[type 1] only get interpolate values', function(done){
        var default_val = 999999;
        read_micaps({
            file: _getDataPath('1.1'),
            val_col: 4,
            default_val: default_val
        }, function(err, data){
            try{
                var d = data.data;
                if(d.length > 0){
                    var v = d[0];
                    // 尝试读取第一行数据
                    if(v.x == 11.92 && v.y == 78.92 && v.v == 7){
                        var data_interpolate = data.interpolate;
                        var num_total = 0,
                            num_default = 0;
                        for(var i = 0, j = data_interpolate.length; i<j; i++){
                            for(var ii = 0, item = data_interpolate[i], jj = item.length; ii<jj; ii++){
                                if(data_interpolate[i][ii].v == default_val){
                                    num_default++;
                                }
                                num_total++;
                            }
                        }
                        if(num_default > 0 && num_default != num_total){
                            return done();
                        }
                    }
                }
            }catch(e){}

            done(new Error('interpolate data error'));
        });
    });
});
