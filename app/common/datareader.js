!function() {
    var util = require('./util');
    var util_path = util.path;
    var util_file = util.file;
    var CONST = require('./const');
    var debug = CONST.DEBUG;
    var product_conf = require('./product_conf');
    var product_conf_util_assets = product_conf.util.assets;

    // var _log = util.Model.log;
    function _log(msg) {
        _model && _model.emit('log.user', msg);
    }
    function _err(err) {
        _model && _model.emit('log.user.error', err);
    }
    var _model;
    var Reader = {};
    Reader.setModel = function(model) {
        _model = model;
        return Reader;
    }
    Reader.read = function(opt, cb) {
        var s_start = new Date();
        var type = opt.type;
        var _reader;
        try {
            _reader = require('./datareader/' + type);
        } catch (e) {
            cb(new Error('no support [' + type + '] method of reader!'));
        }
        if (_reader) {
            // 让文件的修改时间参与缓存
            var file_path = opt.file;
            if (file_path && util_file.exists(file_path)) {
                var stat = util_file.stat(file_path);
                if (stat) {
                    opt._mtime = stat.mtime;
                }
            }
            var key = util.serialize.md5(opt);
            var cache_path = util_path.join(CONST.PATH.CACHE, key);

            var cache_val;

            if (!debug && (cache_val = util_file.read(cache_path, true))) {
                _log('Reader.read from cache [' + cache_path + ']');
                cb && cb(null, cache_val);
            } else {
                _reader(opt, function(err, data) {
                    var msg = 'Reader.read takes ' + (new Date() - s_start) + ' ms!';
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
        try {
            _parser = require('./datareader/' + conf.data.type + '/parse');
        } catch (e) {
            _err(new Error('no support parse method of reader!'));
        }
        if (_parser) {
            if (conf) {
                var assets = conf.assets;
                if (assets) {
                    conf.assets = product_conf_util_assets(assets, conf);
                }
                // conf.assets = product_conf_util_assets(conf.assets, !!conf.flag_sys_assets)
            }
            _parser(conf, _model);
        }
        return Reader;
    }
    Reader.save = function(opt) {
    }
    module.exports = Reader;
} ()