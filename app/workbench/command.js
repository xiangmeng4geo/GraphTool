!function() {
    function _parse(command, cb) {
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
        // console.log(params);

        // 这里控制是异步还是同步
        setTimeout(function() {
            cb && cb('正在处理。。。');
        }, 5000)
    }
    _parse('-f e:/test/1.txt -c -d abc');
    module.exports = _parse;
}()
