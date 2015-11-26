!function(){
    var util = require('./util');
    var util_path = util.path;
    var util_file = util.file;
    var CONST = require('./const');
    var product_conf = require('./product_conf');

    // var _log = util.Model.log;
    function _log(msg) {
        _model && _model.emit('log', msg);
    }
    var _model;
    var Reader = {};
    Reader.setModel = function(model) {
        _model = model;
        return Reader;
    }
    Reader.read = function(opt, cb){
        var s_start = new Date();
        var type = opt.type;
        var _reader;
        try{
            _reader = require('./datareader/'+type);
        } catch(e) {
            cb(new Error('no support ['+type+'] method of reader!'));
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
                    _log(msg);

                    if (!err && data) {
                        util_file.write(cache_path, data);
                    }
                    cb && cb.apply(null, arguments);
                })
            }
        }
        return Reader;
    }
    // 解析产品的配置文件
    Reader.parseConf = function(conf) {
        var s_time = new Date();
        var _parser;
        try{
            _parser = require('./datareader/'+conf.data.type+'/parse');
        } catch(e) {
            console.log(e);
            _model && _model.emit('error', new Error('no support parse method of reader!'));
        }
        if (_parser) {
            _parser(conf, _model);
        }
        return Reader;
    }
    Reader.save = function(opt){
    }
    module.exports = Reader;
}()
