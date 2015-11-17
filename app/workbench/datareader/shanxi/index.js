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
                var a = line.split('|');
                arr.push({
                    name: a[0],
                    x: parseFloat(a[1]),
                    y: parseFloat(a[2]),
                    v: parseFloat(a[3])
                });
            });

            cb && cb(null, arr);
        });
    }
    function _parse(options, callback) {
        callback || (callback = function() {});
        var file_path = options.file;
        _getData(file_path, function(err, data) {
            if (err) {
                callback(new Error('no file'));
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

                    var num = 50;
                    var lnglat_arr = util.grid(lng0, lat0, lng1, lat1, Math.min((lng1 - lng0)/num, (lat1 - lat0)/num));

                    idw(data, lnglat_arr, function(err_idw, data_idw) {
                        if (err_idw) {
                            callback(new Error('idw interpolate error'));
                        } else {
                            callback(null, {
                                data: data,
                                interpolate: data_idw
                            });
                        }
                    });
                } else {
                    callback(new Error('no data'));
                }
            }
        });
    }

    module.exports = _parse;
}()
