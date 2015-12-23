exports.parse = function(lines, option, cb){
	var path = require('path');
    var PATH_COMMON = path.join(__dirname, '../../..');
    var util = require(path.join(PATH_COMMON, 'util'));

    var DEFAULT_VALUE = 999999;
	var REG_TITLE = /^((-?[\d.]+)(\s+|$)){19}/,
		REG_BLANK = /\s+/;

	var lineExtra = option.lineExtra;
	var lineTitle = lineExtra[1].trim();
	if(REG_TITLE.test(lineTitle)){
		var arr = lineTitle.split(REG_BLANK);
		var space_lng = parseFloat(arr[6]),
			space_lat = parseFloat(arr[7]),
			lng_start = parseFloat(arr[8]),
			lng_end = parseFloat(arr[9]),
			lat_start = parseFloat(arr[10]),
			lat_end = parseFloat(arr[11]),
			num_lng = parseFloat(arr[12]),
			num_lat = parseFloat(arr[13]);
		var china_start_lng = 70,
			china_start_lat = 12,
			china_end_lng = 140,
			china_end_lat = 60;
						
		var data = [];
		var vals = lines.join('\s').trim().split(REG_BLANK);

		// 对数据进行处理，防止出现间隔太小的数据
		var SPACE_MIN = 0.2;
		var cha_lng = 1,
			cha_lat = 1;

		var NUM_MAX = 100;
		if (num_lng > NUM_MAX) {
			cha_lng = Math.ceil(Math.abs(lng_end - lng_start)/NUM_MAX/Math.abs(space_lng));
		}
		if (num_lat > NUM_MAX) {
			cha_lat = Math.ceil(Math.abs(lat_end - lat_start)/NUM_MAX/Math.abs(space_lat));
		}
		console.log('cha_lng = '+cha_lng+', cha_lat = '+ cha_lat+', num_lat = '+num_lat+', num_lng = '+num_lng)
		// cha_lng	= cha_lng > SPACE_MIN? Math.ceil(SPACE_MIN/space_lng): 1;
		// cha_lat	= cha_lat > SPACE_MIN? Math.ceil(SPACE_MIN/cha_lat): 1;

		var data_test = [];
		var index_read = 0;
		for(var i = 0; i<num_lat; i++){
			// var items = [];
			for(var j = 0; j<num_lng; j++){
				var x = lng_start + space_lng * j,
					y = lat_start + space_lat * i;
				var val = parseFloat(vals[index_read++]);
				if(x >= china_start_lng && x <= china_end_lng && y >= china_start_lat && y <= china_end_lat){
				// 	// if(x%cha_lng == 0 && y%cha_lat == 0){
				// 	if (i%cha_lng == 0 && j%cha_lat == 0){
						data_test.push({
							x: x,
							y: y,
							v: val
						});
				// 	}
				}
			}
			// if(items.length > 0){
			// 	data.push(items);
			// }	
		}
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
        var lnglat_arr = util.grid(x0, y0, x1, y1, grid_space);
        var interpolate_method = option.interpolate;


        // 当interpolate选项设置为false时不进行插值，直接把文件里的数据返回
        if(!!interpolate_method === false){
            return cb(null, {
                data: data
            });
        }
        console.log(data_test);
        interpolate_method = require(path.join(PATH_COMMON, 'interpolate/'+interpolate_method));
        // data = data.slice(0, 25000);
        interpolate_method(data_test, lnglat_arr, option, function(err, new_data){
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
		// var is_reverse = lat_start > lat_end; //保证纬度从小到大
		// console.log('is_reverse = '+is_reverse+', space_lat = '+space_lat+', lat_start = '+lat_start+', lat_end = '+lat_end);	
		// // 重组保证和其它类型的格式及顺序一致
		// var data_new = [];
		// for(var i = 0, j = data.length; i<j; i++){
		// 	var items = data[i];
		// 	for(var i_1 = 0, j_1 = items.length; i_1<j_1; i_1++){
		// 		(data_new[i_1] || (data_new[i_1] = []))[is_reverse?'unshift': 'push'](items[i_1]);
		// 	}
		// }
		// console.log(data_new);
		// cb && cb(null, {
		// 	interpolate: data_new
		// });
	}
}