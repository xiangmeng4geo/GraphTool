!function() {
    var window = require('./window');
    var win;
    function _runjs(conf) {
        var js = 'Core.init(function(m){m.emit("command.conf", '+JSON.stringify(conf)+')})';
        console.log(js);
        win.webContents.executeJavaScript(js);
    }
    function _openUi(conf, cb) {
        if (!conf.sync) {
            cb(null, 'dealing...');
        }
        // conf = {
        //     file: 'H:/docs/2015/蓝PI相关/各方需求/陕西/data.json'
        // }
        try {
            win.isFocused();
            _runjs(conf);
        } catch(e){
            win = window.getInstance('service');
            
            win.webContents.on('after-js', function() {console.log(123);
                setTimeout(function() {
                    _runjs(conf);
                }, 1000);
            });
            window.load(win, 'service');
        }
    }
    
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
        console.log(conf);
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
    _parse('-f e:/test/1.txt -c -d abc', function() {
        console.log(arguments);
    });
    module.exports = _parse;
}()
