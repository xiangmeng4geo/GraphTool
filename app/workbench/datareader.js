!function(){
    var util = require('./util');
    var util_path = util.path;
    var util_file = util.file;
    var CONST = require('./const');

    var _log = util.Model.log;
    var _model;
    var Reader = {};
    Reader.read = function(opt, cb){
        var s_start = new Date();
        var type = opt.type;
        var _reader;
        try{
            _reader = require('./datareader/'+type);
        } catch(e) {
            cb(new Error('no support method of reader!'));
        }
        if (_reader) {
            var key = util.serialize.md5(opt);
            var cache_path = util_path.join(CONST.PATH.CACHE, key);

            var cache_val = util_file.read(cache_path, true);

            if (cache_val) {
                _log ('Reader.read from cache ['+cache_path+']');
                cb && cb(null, cache_val);
            } else {
                _reader(opt, function(err, data) {
                    var msg = 'Reader.read takes '+(new Date()-s_start)+' ms!';
                    util.Model.log(msg);

                    if (!err && data) {
                        util_file.write(cache_path, data);
                    }
                    cb && cb.apply(null, arguments);
                })
            }
        }
    }
    Reader.save = function(opt){
    }
    module.exports = Reader;
}()
