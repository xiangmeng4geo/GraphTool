!function(){
    var path = require('path');
    var PATH_COMMON = path.join(__dirname, '../../..');
    var util = require(path.join(PATH_COMMON, 'util'));

    var DEFAULT_VALUE = 999999;
	var DEFAULT_COLOR = 'rgba(0,0,0,0)';
	var REG_DATA_NUM = /^\d+\s+(\d+)$/;
	var REG_DATA = /^(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)$/;

    function _parse_file(lines, option, cb){
		option = util.extend(true, {
			x0: 72.5,
			y0: 17.5,
			x1: 137,
			y1: 55,
			grid_space: 0.5,
			numOfNearest: 4,
			default_val: DEFAULT_VALUE,
			interpolation_all: false,
            interpolate: 'idw', //当interpolate == false时不进行插值
			num_of_cols: 5, //数据列数
			col: 5,      //读取第N列值
			arithmetic: null
		}, option);
		var REG_DEFAULT_VAL = /9{4,}/;
        var x0 = option.x0,
            y0 = option.y0,
            x1 = option.x1,
            y1 = option.y1,
            grid_space = option.grid_space;
        var bound = option.bound;
        if (bound) {
            var wn = bound.wn,
                es = bound.es;
            // 用数据里的显示边界对数据进行修正
            if (wn && wn.length == 2 && es && es.length == 2) {
                x0 = Math.min(x0, wn[0], es[0]);
                y0 = Math.min(y0, wn[1], es[1]);
                x1 = Math.max(x1, wn[0], es[0]);
                y1 = Math.max(y1, wn[1], es[1]);

                var num = 80;
                var space = Math.abs(Math.min((x1 - x0)/num, (y1 - y0)/num));
                grid_space = Math.min(space, grid_space);
                // grid_space = 3;
                x0 -= grid_space;
                y0 -= grid_space;
                x1 += grid_space;
                y1 += grid_space;
            }
        }

		var arithmetic = (function(){
			var methods = {'*': 1};

			var option_arithmetic = option.arithmetic;
			var type;
			if(option_arithmetic && (type = option_arithmetic.type) && methods[type]){
				var val = option_arithmetic.val;
				if(val){
					return ({
						'*': function(v){
							return parseInt(v*val*1000)/1000;
						}
					})[type];
				}
			}
			return function(val){
				return val;
			}
		})();
		var default_val = option.default_val;
		var col = option.col - 1;
		var numOfCols = option.num_of_cols - 3;
		var REG_DATA = new RegExp('^\\d+\\s+[\\d.]+\\s+[\\d.]+(\\s+[-\\d.]+){'+numOfCols+'}$');
		var data = [];
		lines.forEach(function(line){
			line = line.trim();
			if(REG_DATA.test(line)){
				var arr = line.split(/\s+/);
				var v = arr[col];
				if(!isNaN(v) && !REG_DEFAULT_VAL.test(v)){
					data.push({
						x: parseFloat(arr[1]),
						y: parseFloat(arr[2]),
						// z: parseFloat(arr[3]),
						v: arithmetic(parseFloat(v)),
					});
				}
			}
		});

        var lnglat_arr = util.grid(x0, y0, x1, y1, grid_space);
        var interpolate_method = option.interpolate;


        // 当interpolate选项设置为false时不进行插值，直接把文件里的数据返回
        if(!!interpolate_method === false){
            return cb(null, {
                data: data
            });
        }
        // console.log(data);
        interpolate_method = require(path.join(PATH_COMMON, 'interpolate/'+interpolate_method));
        // data = data.slice(0, 25000);
        interpolate_method(data, lnglat_arr, option, function(err, result){
            if(err){
                return cb(err);
            }
            var new_data = result.data;
            // 对格点上的数据值进行格式化，减小文件体积
    		for(var i = 0, j = new_data.length; i < j; i++){
    			var items = new_data[i];
    			for(var y = 0, y_len = items.length; y < y_len; y++){
    				items[y].v = parseFloat(util.Digit.toFixed(items[y].v));
    			}
    		}
            cb(null, {
    			data: data,
    			interpolate: new_data,
                flag_interpolate: result.flag
    		})
        });
        // console.log('async after idw');
	}

    exports.parse = _parse_file;
}()
