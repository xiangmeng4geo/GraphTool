!function() {
    var app = require('app');
    var ipc = require('electron').ipcMain;
    var window = require('./window');
    var win;
    app.on('ready', function() {
        // 主进程直接打开服务窗口
        win = window.open('service');
    });
    
    function _runjs(conf) {
        var js = 'Core.init(function(m){m.emit("command.conf", '+JSON.stringify(conf)+')})';
        win.webContents.executeJavaScript(js);
    }
    var _cb_cache = {};
    var id = 0;
    function _setCache(conf, cb) {
        if (conf.sync) {
            var key = id++;
            conf._id = key;
            _cb_cache[key] = {
                time: new Date(),
                cb: cb
            };
        }
    }
    ipc.on('cb', function(e, data) {
        var key = data.key;
        var cache_val = _cb_cache[key];
        if (cache_val) {
            var cb = cache_val.cb;
            cb && cb(null, JSON.stringify(data.data));
        }
    });
    function _openUi(conf, cb) {
        _setCache(conf, cb);
        if (!conf.sync) {
            cb(null, 'dealing...');
        }
        
        try {
            win.isFocused();
            _runjs(conf);
        } catch(e){
            win = window.getInstance('service');
            
            win.webContents.on('ready', function() {
                _runjs(conf);
            });
            window.load(win, 'service');
        }
    }
    /**
     * cb调用的参数：[err, msg]
     *     msg: {path: '图片存储路径', time: '所用毫秒数'} 
     */
    function _parse(command, cb) {
        cb || (cb = function(){});
        var arr = command.split(/\s+/);
        var params = [];
        var tmp;

        var c = [];
        while ((tmp = arr.shift())) {
            if (tmp.charAt(0) !== '-') {
                c.push(tmp);
                params.push(c.splice(0));
            } else {
                if (c.length > 0) {
                    params.push(c.splice(0));
                }
                c.push(tmp);
            }

        }
        if (c.length > 0) {
            params.push(c.splice(0));
        }
        var conf = {};
        for (var i = 0, j = params.length; i<j; i++) {
            var item = params[i];
            var val = item[1];
            switch (item[0]) {
                case '-name':
                    conf['name'] = val;
                    break;
                case '-file':
                    conf['file'] = val;
                    break;
                case '-sync':
                    conf['sync'] = true;
            }
        }
        if (!conf.name && !conf.file) {
            cb('command error, use -name or -file'); 
        } else {
            _openUi(conf, cb);
        }
        // console.log(params);

        // 这里控制是异步还是同步
        // setTimeout(function() {
        //     cb(null, '正在处理。。。');
        // }, 5000)
    }
    // _parse('-f e:/test/1.txt -c -d abc', function() {
    //     console.log(arguments);
    // });
    module.exports = _parse;
}()
