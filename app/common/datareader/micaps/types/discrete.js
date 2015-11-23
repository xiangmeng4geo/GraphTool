!function(){
    var path = require('path');
    var PATH_WORKBENCH = path.join(__dirname, '../../..');
    var util = require(path.join(PATH_WORKBENCH, 'util'));

    var DEFAULT_VALUE = 999999;
	var DEFAULT_COLOR = 'rgba(0,0,0,0)';
	var REG_DATA_NUM = /^\d+\s+(\d+)$/;
	var REG_DATA = /^(\d+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(-?[\d.]+)$/;

    function _parse_file(lines, option, cb){
		option || (option = {});
		var default_option = {
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
			val_col: 5,      //读取第N列值
			arithmetic: null
		}
		var REG_DEFAULT_VAL = /9{4,}/;
		for(var i in default_option){
			if(option[i] === undefined || option[i] === null){
				option[i] = default_option[i];
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
							return v*val;
						}
					})[type];
				}
			}
			return function(val){
				return val;
			}
		})();
		var default_val = option.default_val;
		var val_col = option.val_col - 1;
		var numOfCols = option.num_of_cols - 3;
		var REG_DATA = new RegExp('^\\d+\\s+[\\d.]+\\s+[\\d.]+(\\s+[-\\d.]+){'+numOfCols+'}$');
		var data = [];
		lines.forEach(function(line){
			line = line.trim();
			if(REG_DATA.test(line)){
				var arr = line.split(/\s+/);
				var v = arr[val_col];
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

        var lnglat_arr = util.grid(option.x0, option.y0, option.x1, option.y1, option.grid_space);
        var interpolate_method = option.interpolate;


        // 当interpolate选项设置为false时不进行插值，直接把文件里的数据返回
        if(!!interpolate_method === false){
            return cb(null, {
                data: data
            });
        }
        interpolate_method = require(path.join(PATH_WORKBENCH, 'interpolate/'+interpolate_method));
        interpolate_method(data, lnglat_arr, option, function(err, new_data){
            if(err){
                return cb(err);
            }
            // 对格点上的数据值进行格式化，减小文件体积
    		for(var i = 0, j = new_data.length; i < j; i++){
    			var items = new_data[i];
    			for(var y = 0, y_len = items.length; y < y_len; y++){
    				items[y].v = parseFloat(util.Digit.toFixed(items[y].v));
    			}
    		}
            cb(null, {
    			data: data,
    			interpolate: new_data
    		})
        });
	}

    exports.parse = _parse_file;
}()
