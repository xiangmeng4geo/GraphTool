!function() {
	var _model;
	var util = require('../util');
	var tool = require('./tool');
	var util_color = util.color;
	// var tool_getArea = tool.getArea;
	var tool_isClosed = tool.isClosed;
	var tool_getBound = tool.getBound;
	var tool_smoothItems = tool.smoothItems;
	// var tool_isBoundInBound = tool.isBoundInBound;
	var splitPolygonsByLines = tool.splitPolygonsByLines;  
	var utils_polygon = util.Polygon;
  	var isPointIn = utils_polygon.isPointIn;
    var isPolygonIn = utils_polygon.isPolygonIn;
	var Conrec = require('./conrec');

	var util_log = function(msg) {
		_model && _model.emit('log', msg);
	}
	function sortEsc(arr) {
		arr.sort(function(a, b) {
			return a - b;
		});
	}

	function sortDesc(arr) {
		arr.sort(function(a, b) {
			return b - a;
		});
	}
	function conrec(rasterData, blendent, is_points_array /*返回的点是否为数组*/ , cb) {
		var color_method = util_color(blendent);
		if (!color_method) {
			return cb(new Error('conrec use blendent error!'));
		}

		var _interpolate_width,
			_interpolate_height;
		try {
			_interpolate_width = rasterData.length;
			_interpolate_height = rasterData[0].length;
		} catch (e) {
			return cb(new Error('conrec data error!'));
		}

		var c_cache = {};
		var data_arr = [];
		var _new_interpolate_data = [];
		for (var i = 0; i < _interpolate_width; i++) {
			var arr = [];
			var _arr_d = [];
			for (var j = 0; j < _interpolate_height; j++) {
				var v = rasterData[i][j];
				var color_info = color_method(v.v, null, true);
				var color = color_info[0],
					color_level = color_info[1];
				c_cache[color] = true;
				arr.push({
					x: v.x,
					y: v.y,
					v: v.v,
					level: color_level,
					c: color || COLOR_TRANSPANT
				});
				_arr_d.push(color_level * 2);
			}
			_new_interpolate_data.push(arr);
			data_arr.push(_arr_d);
		}
		var peak_1 = _new_interpolate_data[0][0];
		var peak_2_tmp = _new_interpolate_data[_new_interpolate_data.length-1],
			peak_2 = peak_2_tmp[peak_2_tmp.length-1];

		var x0 = peak_1.x,
			y0 = peak_1.y,
			x1 = peak_2.x,
			y1 = peak_2.y;
		var polygon = {
			items: [{
				x: x0,
				y: y0
			}, {
				x: x1,
				y: y0
			}, {
				x: x1,
				y: y1
			}, {
				x: x0,
				y: y1
			}]
		};		
		var zArr = [];
		// 对分割线进行过滤，减小计算
		var colors = blendent[0].colors.filter(function(c, i) {
			c.k = i*2 + 1;
			if (c_cache[c.color]) {
				return true;
			}
		});
		// 2*k+1 做分界线
		colors.map(function(v, i) {
			zArr.push(v.k);
		});

		var xArr = [],
			yArr = [];
		rasterData.map(function(v) {
			xArr.push(v[0].x);
		});
		rasterData[0].map(function(v) {
			yArr.push(v.y);
		});
		var c = new Conrec();
		c.contour(data_arr, 0, xArr.length - 1, 0, yArr.length - 1, xArr, yArr, zArr.length, zArr);
		var lines = c.contourList();
		var x_start = rasterData[0][0].x, x_step = rasterData[1][0].x - rasterData[0][0].x,
      		y_start = rasterData[0][0].y, y_step = rasterData[0][1].y - rasterData[0][0].y;
		
		function _isInPolygonForColor(polygon, x_p, y_p) {
			var items = polygon.items;
			var sub = polygon.sub;
			if(isPointIn(items, x_p, y_p)) {
				var is_in_sub = false;
				if (sub) {
					for (var i_sub = 0, j_sub = sub.length; i_sub<j_sub; i_sub++) {
						var items_sub = sub[i_sub];
						if (isPointIn(items_sub, x_p, y_p)) {
							is_in_sub = true;
							break;
						}
					}
				}
				if (!is_in_sub) {
					return true;
				}
			}
			return false;
		}
		function _getColor(polygon) {
			var line = polygon.line;
			var items = polygon.items;
			var sub = polygon.sub;
			var p_test = null;
			for (var i_line = 0, j_line = line.length; i_line < j_line; i_line++) {
				var point = line[i_line];// 取中间点
				var x = point.x,
					y = point.y;
				var x_per = (x - x_start) / x_step,
	          		y_per = (y - y_start) / y_step;
	          	if(x_per % 1 == 0 && y_per % 1 == 0) {
					try{
						return rasterData[x_per][y_per];
					}catch(e){}
	          	} else {
		          	var x_min = Math.floor(x_per),
						x_max = Math.ceil(x_per),
						y_min = Math.floor(y_per),
						y_max = Math.ceil(y_per);

	          		var p = [];
					try{
						p.push([rasterData[x_min][y_min], x_min, y_min]);
					}catch(e){};
					try{
						p.push([rasterData[x_max][y_min], x_max, y_min]);
					}catch(e){};
					try{
						p.push([rasterData[x_min][y_max], x_min, y_max]);
					}catch(e){};
					try{
						p.push([rasterData[x_max][y_max], x_max, y_max]);
					}catch(e){};

					for(var i = 0, j = p.length; i<j; i++){
						var val = p[i];
						if (!val[0]) {
							continue;
						}
						var x_p = val[0].x,
							y_p = val[0].y;
						if (_isInPolygonForColor(polygon, x_p, y_p)) {
							return _new_interpolate_data[val[1]][val[2]];
						}
					}
					if (p.length > 0) {
						p_test = p;
					}
	          	}
	        }
	        if (p_test) {
	        	var _p_arr = [];
	        	var v_sum = 0;
	        	for (var i = 0, j = p_test.length; i<j; i++) {
	        		var item = p_test[i][0];
	        		_p_arr.push(item);
	        		if (!/9{3,}/.test(item.v)) {
	        			v_sum += item.v;
	        		}
	        	}
	        	var v_test = v_sum/j;
	        	var _bound_test = tool_getBound(_p_arr);
	        	var x_min_test = _bound_test.x_min,
	        		x_max_test = _bound_test.x_max,
	        		x_step_test = x_max_test - x_min_test,
	        		y_min_test = _bound_test.y_min,
	        		y_max_test = _bound_test.y_max,
	        		y_step_test = y_max_test - y_min_test;

	        	var num_test = 0;
	        	while (num_test++ < 100) {
	        		var x_test = x_min_test + x_step_test * Math.random(),
	        			y_test = y_min_test + y_step_test * Math.random();
	        		// console.log('test begin', num_test, x_test, y_test);
	        		if (_isInPolygonForColor(polygon, x_test, y_test)) {
	        			var c = color_method(v_test);
	        			// console.log('test', num_test, x_test, y_test, c);
	        			return {
	        				x: x,
	        				y: y,
	        				c: c
	        			}
	        		}
	        	}
	        	// _model.emit('render', [new Shape.Text('_'+x_min_test+'_'+x_max_test+'_'+y_min_test+'_'+y_max_test, 'lng: '+x_min_test+'; lat: '+y_min_test+';color: #0000ff; font-size: 20px;')]);
	        }
		}
		// console.log('polygon = ', polygon);
		// console.log('lines.length = '+lines.length);

		var MIN_DIS = Math.pow(0.2, 2);
	    if (x_step < 0.5) {
	        MIN_DIS = Math.pow(Math.max(0.1, x_step*2), 2)
	    }
	    // console.log('old', lines[0]);
	    // console.log('new', tool_smoothItems(lines[0], MIN_DIS, false));
	    var lines_open = [],
			lines_closed = [];
		lines.map(function(line, i) {
			var _flag_isClosed = tool_isClosed(line);
			var line_obj = {
				bound: tool_getBound(line),
				_isClosed: _flag_isClosed,
				items: line
			}
			line._isClosed = _flag_isClosed;
			if (_flag_isClosed) {
				lines_closed.push(line_obj);
			} else {
				lines_open.push(line_obj);
			}
		});

		// 长度从长到短
		lines_open.sort(function(a, b) {
			return b.items.length - a.items.length;
		});
		lines_closed.sort(function(a, b) {
			return b.items.length - a.items.length;
		});
		lines = lines_open.concat(lines_closed);
		for (var i = 0, j = lines.length; i<j; i++) {
			lines[i].items = tool_smoothItems(lines[i].items, MIN_DIS, false);
		}
		var result = splitPolygonsByLines([polygon], lines, function(polygon) {
			var p = _getColor(polygon);
			if (p) {
				var color = p.c;
				var text = p.v;
				if (color && color != 'rgba(0,0,0,0)') {
					polygon.color = color;
				}
			}
		});
		var return_val = {
			list: result,
			lines: lines
		}
		cb && cb(null, return_val);
	}
	conrec.setModel = function(model) {
		_model = model;
		return conrec;
	}

	module.exports = conrec;
}();