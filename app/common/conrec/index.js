!function() {
	var _model;
	var util = require('../util');
	var tool = require('./tool');
	var util_color = util.color;
	var tool_getArea = tool.getArea;
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
				arr.push({
					x: v.x,
					y: v.y,
					v: v.v,
					level: color_level,
					c: color || COLOR_TRANSPANT
				});

				// var _d = -2;
				// if (!(i == 0 || i == _interpolate_width - 1 || j == 0 || j == _interpolate_height - 1)) {
				// 	_d = color_level * 2
				// }
				_arr_d.push(color_level * 2);
			}
			_new_interpolate_data.push(arr);
			data_arr.push(_arr_d);
		}

		var peak_1 = _new_interpolate_data[0][0];
		var peak_2_tmp = _new_interpolate_data[_new_interpolate_data.length-1],
			peak_2 = peak_2_tmp[peak_2_tmp.length-1];
		/*
			  0
			-----
		  3	|	|  1
			-----
			  2
		*/
		function _getLineNum(point) {
			var x = point.x,
				y = point.y;
			if (x == x0) {
				return 3;
			}
			if (x == x1) {
				return 1;
			}
			if (y == y0) {
				return 0;
			}
			if (y == y1) {
				return 2;
			}

			return -1;
		}
		var x0 = peak_1.x,
			y0 = peak_1.y,
			x1 = peak_2.x,
			y1 = peak_2.y;
		console.log(x0, y0, x1, y1);
		var p_arr = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
		// 用四个顶点和线的两个端点，分成6个线段
		function _getSection(line){
			var p_first = line[0],
				p_end = line[line.length - 1];

			var return_val = p_arr.slice(0);
			function _insert(x, y) {
				for (var i = 0, j = return_val.length; i<j; i++) {
					var v = return_val[i],
						v_next = return_val[i == j-1?0:i+1];
					var x_v = v[0],
						y_v = v[1],
						x_v_next = v_next[0],
						y_v_next = v_next[1];
					var x_max = Math.max(x_v, x_v_next),
						x_min = Math.min(x_v, x_v_next),
						y_max = Math.max(y_v, y_v_next),
						y_min = Math.min(y_v, y_v_next);
					if ((x_max == x && x_min == x && y_max >= y && y_min <= y) || (y_max == y && y_min == y && x_max >= x && x_min <= x)) {
						return_val.splice(i+1, 0, [x, y, 1]);
						return;
					}
				}	
			}
			_insert(p_first.x, p_first.y);
			_insert(p_end.x, p_end.y);

			var index_1 = -1;
			for (var i = 0, j = return_val.length; i<j; i++) {
				if (return_val[i][2] == 1) {
					if (index_1 == -1) {
						index_1 = i;
						break;
					}
				}
			}
			if (index_1 > -1) { 
				return_val = return_val.slice(index_1).concat(return_val.slice(0, index_1));
			}
			var is_use_first = false;
			var one = [], two = [];
			for (var i = 0, j = return_val.length; i<j; i++) {
				var v = return_val[i],
					v_next = return_val[i == j-1?0: i+1];
				var to_part = is_use_first? two:one;
				to_part.push([v, v_next]);
				if (v[2] == 1 && i > 0) {
					if (!is_use_first) {
						is_use_first = true;
					}
				}
			}
			return [one, two];
		}
		var zArr = [];
		var colors = blendent[0].colors;
		colors.sort(function(a, b) {
			return a.val[0] - b.val[1];
		});
		// 2*k+1 做分界线
		colors.map(function(v, i) {
			zArr.push(i * 2 + 1);
		});

		var xArr = [],
			yArr = [];
		rasterData.map(function(v) {
			xArr.push(v[0].x);
		});
		rasterData[0].map(function(v) {
			yArr.push(v.y);
		});
		// sortEsc(xArr);
		// sortEsc(yArr);

		console.log(data_arr);
		var c = new Conrec();
		c.contour(data_arr, 0, xArr.length - 1, 0, yArr.length - 1, xArr, yArr, zArr.length, zArr);
		var list = c.contourList();
		for (var i = 0, j = list.length; i<j; i++) {
			list[i].id = i;
		}
		
		function _getNextLine(line) {
			var key = line.key;
			var section = _getSection(line);
			var one = section[0],
				two = section[1];
			console.log('one = ', one, 'two = ', two);
			function _inPart(part, point) {
				var x = point.x,
					y = point.y;
				for (var i = 0, j = part.length; i<j; i++) {
					var p = part[i];
					var p_1 = p[0],
						p_2 = p[1];
					var x_p_1 = p_1[0],
						x_p_1 = p_1[1],
						x_p_2 = p_2[0],
						y_p_2 = p_2[1];
					var x_min = Math.min(x_p_1, x_p_2),
						x_max = Math.max(x_p_1, x_p_2),
						y_min = Math.min(y_p_1, y_p_2),
						y_max = Math.max(y_p_1, y_p_2);
					if ((x_max == x && x_min == x && y_max >= y && y_min <= y) || (y_max == y && y_min == y && x_max >= x && x_min <= x)) {
						return true;
					}	
				}
			}
			function _getNext(part) {
				for (var i_line = 0, j_line = lines.length; i_line<j_line; i_line++) {
					var _line = lines[i_line];
					if (_line.key == key) {
						continue;
					}

					var p_first = _line[0],
						p_end = _line[_line.length - 1];
					
					if (_inPart(part, p_first) && _inPart(part, p_end)) {

					}
				}
				
			}
			_getNext(one);
		}
		for (var i = 0, j = list.length; i<j; i++) {
			var items = list[i];
			var _area = tool_getArea(items);
			// 保证线的方向一致
			if (_area < 0) {
				items.reverse();
			}
			var p_first = items[0],
				p_end = items[items.length - 1];
			var is_closed = p_first.x == p_end.x && p_first.y == p_end.y;
			items.is_closed = is_closed;

			if (!is_closed) {
				_getNextLine(items);
				// items.len = val;
				// var line_num_first = _getLineNum(p_first),
				// 	line_num_end = _getLineNum(p_end);
				// if (line_num_first > -1 && line_num_end > -1) {
				// 	if (line_num_first == line_num_end) { //在同一边

				// 	} else {
				// 		if (Math.abs(line_num_first - line_num_end) == 2) { // 在对向的两边

				// 		} else { //在相邻的两条边上

				// 		}
				// 	}
				// }
			}
		}

		var val_return = {
			interpolate_data: _new_interpolate_data,
			lines: list,
			// list: list_return,
			// r: relation
		};
		cb(null, val_return);
	}
	conrec.setModel = function(model) {
		_model = model;
		return conrec;
	};

	module.exports = conrec;
}();