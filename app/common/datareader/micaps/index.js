!function(){
    var fs = require('fs'),
        path = require('path');
    var util_extend = require('../../util').extend;
    var ERROR_NO_DATA = {
        code: 1,
        msg: 'no data'
    },
    ERROR_NO_TYPE = {
        code: 2,
        msg: 'no data TYPE'
    },
    ERROR_NOT_SUPPORT = {
        code: 3,
        msg: 'no support this type'
    }
    function parse(options, callback){
        callback || (callback = function(){});
        options = util_extend(true, {}, options);
        var file_path = options.file;
        if (!file_path) {
            return callback(new Error('没有符合条件的数据文件，请查看相应配置是否正确！'));
        }
        fs.readFile(file_path, {
            encoding: 'utf8'
        }, function(err, content){
            if(err){
                callback(err);
            }else{
                var line_arr = [];
                var arr = content.toString().split(/[\r\n]+/);
                arr.map(function(v){
                    v = v.trim();
                    if(!!v){
                        line_arr.push(v);
                    }
                });

                if(line_arr.length > 0){
                    var m = /diamond\s+(\d+)/.exec(line_arr[0]);
                    var type;
                    if(m && (type = m[1])){
                        var parser;
                        try{
                            parser = require('./types/'+type);
                        }catch(e){
                            callback && callback(ERROR_NOT_SUPPORT);
                            return;
                        }

                        options.lineExtra = line_arr.slice(0, 2);

                        var _val = options.val;
                        if (_val) {
                            delete options.val;
                            options = util_extend(options, _val);
                        }
                        parser.parse(line_arr.slice(2), options, function(err, data_return){
                            data_return.type = type;
                            var stat = fs.statSync(file_path);
                            var file_time = new Date(stat.mtime);
                            data_return.mtime = file_time.getTime() // 可以做为数据的制作时间

                            // 从"  15  03  12  14   4693"这样的字符串里提取日期
                            m = /^(([12]\d)?\d{2})\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})/.exec(line_arr[1].trim());

                            if(m){
                                var year = file_time.getFullYear(),// 暂时以文件的修改时间里的年数据代替
                                    month = m[3],
                                    day = m[4],
                                    hour = m[5];
                                var str_hour = path.basename(file_path).replace(/\..+/g,'').replace(/\D+$/,'').substr(-2);
                                if(str_hour.length == 2 && !isNaN(str_hour)){
                                    hour = parseInt(str_hour);
                                }
                                var time = new Date(year+'-'+month+'-'+day+' '+hour+':00').getTime();
                                data_return.time = time;

                                var val_option = options.val;
                                if (val_option) {
                                    var file_type = val_option.file_type;
                                    var file_hour = val_option.file_hour || 0;
                                    var one = new Date(time);
                                    var two = new Date(time);

                                    // 预报
                                    if (file_type == 2) {
                                        one.setHours(one.getHours() + (file_hour - 24));
                                        two.setTime(one.getTime());
                                        two.setHours(two.getHours() + 24);
                                    } else { //实况
                                        one.setHours(one.getHours() - file_hour);
                                    }

                                    data_return.t1 = one.getTime();
                                    data_return.t2 = two.getTime();
                                }
                            }

                            callback && callback(null, data_return);
                        });
                    }else{
                        callback(ERROR_NO_TYPE);
                    }
                }else{
                    callback(ERROR_NO_DATA);
                }
            }
        });
    }

    module.exports = parse;
}();