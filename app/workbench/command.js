!function() {
    var CONST = require('../common/const');
    var path = require('path');
    var app = require('app');
    var electron = require('electron');
    var ipc = electron.ipcMain;
    var Menu = electron.Menu;
    var Tray = electron.Tray;
    var Shell = electron.shell;
    var _window = require('./window');
    var dialog = require('dialog');

    function showTray() {
        var appIcon = new Tray(path.join(CONST.PATH.UI, 'img/favicon.ico'));
        // setTimeout(function() {
        //     appIcon.displayBalloon({
        //         title: 'test',
        //         content: 'content'
        //     });
        // }, 2000);
        var contextMenu = Menu.buildFromTemplate([
            {
                label: '日志',
                click: function() {
                    Shell.openItem(CONST.LOG.PATH);
                }
            },
            {
                label: '退出',
                click: function() {
                    if (_window.isOpenedUi()) {
                        if (win) {
                            dialog.showMessageBox(win, {
                				type: 'info',
                				buttons: ['yes', 'no'],
                				title: '系统提示',
                				message: "主界面还在运行，是否强制退出？",
                				icon: null
                			}, function(index){
                				if (index == 0) {
                					app.quit();
                				}
                			});
                        }
                    } else {
                        app.quit();
                    }
                }
            }
        ]);
        appIcon.setToolTip('后台运行');
        appIcon.setContextMenu(contextMenu);
    }
    var win;
    app.on('ready', function() {
        _runSocket();
        showTray();
        // 主进程直接打开服务窗口
        win = _window.open('service');
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
            var err = data.err;
            if (cb) {
                if (err) {
                    cb(JSON.stringify(err));
                } else {
                    cb(null, JSON.stringify(data.data));
                }
            }
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
            win = _window.getInstance('service');

            win.webContents.on('ready', function() {
                _runjs(conf);
            });
            _window.load(win, 'service');
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
                case '-api':
                    conf['api'] = val;    
            }
        }
        if (!conf.name && !conf.file && !conf.api) {
            cb('command error, use -name or -file or -api');
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

    // 启动socket供外部调用
    function _runSocket() {
        var net = require('net');
        var socket = path.join('\\\\?\\pipe', 'BPA-GRAPHTOOL-COMMAND');
        net.connect({path: socket}, function(){
            
        }).on('error', function(err){
            try{
                require('fs').unlinkSync(socket);
            }catch(e){
                if(e.code != 'ENOENT'){
                    throw e;
                }
            }

            net.createServer(function(c){
                var tt_data ;
                var str = '';
                c.on('data', function(d){
                    str += d;
                    clearTimeout(tt_data);
                    tt_data = setTimeout(function() {
                        // 解析命令行参数
                        _parse(str, function(err, msg) {
                            var info = {};
                            err && (info.err = err);
                            msg && (info.msg = msg);
                            var str = JSON.stringify(info);
                            (err || msg) && c.write(str);
                            c.end('\n');
                        });
                    }, 100);
                }).on('end', function(){
                    /**
                     * 直接写在end事件里的回调一直不会触发！！
                     */
                });
            }).listen(socket);
        });
    }
    module.exports = _parse;
}()
