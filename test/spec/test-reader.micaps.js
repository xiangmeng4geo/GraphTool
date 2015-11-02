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
    it('[type 1]', function(done){
        read_micaps({
            file: _getDataPath('1.1')
        }, function(err, data){
            console.log(data[0][0]);

            done();
        });
    });
});
