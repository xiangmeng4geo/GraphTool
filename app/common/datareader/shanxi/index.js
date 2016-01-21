!function() {
    var fs = require('fs');
    var idw = require('../../interpolate/idw');
    var util = require('../../util');

    function _getData(file_path, cb) {
        fs.readFile(file_path, function(err, data) {
            if (err) {
                return cb && cb(err);
            }
            var arr = [];
            var lines = data.toString().split(/[\r\n]+/);
            lines.forEach(function(line) {
                if ((line = line.trim())) {
                    var a = line.split('|');
                    if (isNaN(a[1]) || isNaN(a[2]) || isNaN(a[3])) {
                        return;
                    }
                    arr.push({
                        name: a[0],
                        x: parseFloat(a[1]),
                        y: parseFloat(a[2]),
                        v: parseFloat(a[3])
                    });
                }
            });

            cb && cb(null, arr);
        });
    }
    function _parse(options, callback) {
        callback || (callback = function() {});
        var file_path = options.file;
        if (!file_path) {
            callback({
                msg: 'no option.file'
            });
            return;
        }
        var error_msg = '['+file_path+']';
        var bound = options.bound;
        _getData(file_path, function(err, data) {
            if (err) {
                callback({
                    msg: error_msg + '[no exists!]'
                });
            } else {
                if (data && data.length > 0) {
                    var first = data[0];
                    var lng0 = lng1 = first.x,
                        lat0 = lat1 = first.y;

                    for (var i = 1, j = data.length; i<j; i++) {
                        var v = data[i];
                        var x = v.x,
                            y = v.y;
                        if (x < lng0) {
                            lng0 = x;
                        }
                        if (x > lng1) {
                            lng1 = x;
                        }
                        if (y < lat0) {
                            lat0 = y;
                        }
                        if (y > lat1) {
                            lat1 = y;
                        }
                    }
                    if (bound) {
                        var wn = bound.wn,
                            es = bound.es;
                        if (wn && wn.length == 2 && es && es.length == 2) {
                            lng0 = Math.min(lng0, wn[0], es[0]);
                            lat0 = Math.min(lat0, wn[1], es[1]);
                            lng1 = Math.max(lng1, wn[0], es[0]);
                            lat1 = Math.max(lat1, wn[1], es[1]);
                        }
                    }
                    var num = 50;
                    var space = Math.abs(Math.min((lng1 - lng0)/num, (lat1 - lat0)/num));
                    var space_add = space;

                    var lnglat_arr = util.grid(lng0 - space_add, lat0 - space_add, lng1 + space_add, lat1 + space_add, space);

                    idw(data, lnglat_arr, function(err_idw, result) {
                        if (err_idw) {
                            callback({
                                msg: error_msg + '[idw interpolate error!]'
                            });
                        } else {
                            callback(null, {
                                data: data,
                                interpolate: result.data,
                                flag_interpolate: result.flag
                            });
                        }
                    });
                } else {
                    callback({
                        msg: error_msg + '[no data!]'
                    });
                }
            }
        });
    }

    module.exports = _parse;
}()
