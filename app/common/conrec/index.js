!function() {
	var _model;
	var util = require('../util');
	var tool = require('./tool');
	var util_color = util.color;
	var tool_getArea = tool.getArea;
	var tool_isClosed = tool.isClosed;
	var tool_getBound = tool.getBound;
	var tool_isBoundInBound = tool.isBoundInBound;
	var tool_splitPolygonByLine = tool.splitPolygonByLine;  
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
		var polygon = [{
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
		}];		
		var zArr = [];
		var colors = blendent[0].colors;
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

		// console.log(data_arr);
		var c = new Conrec();
		c.contour(data_arr, 0, xArr.length - 1, 0, yArr.length - 1, xArr, yArr, zArr.length, zArr);
		var lines = c.contourList();

		var lines_open = [],
			lines_closed = [];
		for (var i = 0, j = lines.length; i<j; i++) {
			var line = lines[i];
			line.key = 'line_'+i;
			line.bound = tool_getBound(line);
			line.area = tool_getArea(line);
			var _is_closed = tool_isClosed(line);
			(_is_closed? lines_closed: lines_open).push(line);
		}
		// // 不闭合线面积从
		// lines_open.sort(function(a, b) {
		// 	return a.area - b.area;
		// });

		// 面积从大到小（保证不会有大的闭合线去分割带clip的面）
		lines_closed.sort(function(a, b) {
			return b.area - a.area;
		});
		var deal_line_cache = {};
		var polygons_done = [];

		var x_start = rasterData[0][0].x, x_step = rasterData[1][0].x - rasterData[0][0].x,
      		y_start = rasterData[0][0].y, y_step = rasterData[0][1].y - rasterData[0][0].y;

		function _getColor(polygon, line) {
			var items = polygon.items;
			var sub = polygon.sub;
			var point = line[Math.ceil(line.length /2)];// 取中间点
			var x = point.x,
				y = point.y;
			var x_per = (x - x_start) / x_step,
          		y_per = (y - y_start) / y_step;
          	if(x_per % 1 == 0 && y_per % 1 == 0) {
				try{
					return rasterData[x_per][y_per].c;
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
					var x_p = val[0].x,
						y_p = val[0].y;
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
							return _new_interpolate_data[val[1]][val[2]].c;
						}
					}
				}
          	}
		}
		function _checkPolygon(polygon) {
			var bound_polygon = tool_getBound(polygon.items);

			var return_lines = [];
			var line_check = lines_closed.slice(0).concat(lines_open.slice(0));
			for (var i = 0, j = line_check.length; i<j; i++) {
				var line = line_check[i];
				var bound_line = tool_getBound(line);
				if (tool_isBoundInBound(bound_polygon, bound_line)) {
					return_lines.push(line);
				}
			}
			return return_lines;
		}
		function _splitPolygonByLines(polygon, lines) {

		}
		function _splitPolygons(polygons, line) {
			polygons = polygons.splice(0);
			var polygon;
			while((polygon = polygons.shift())) {
				var parts = tool_splitPolygonByLine(polygon.items, line);
				if (parts.length == 2) {
					var one = parts[0],
						two = parts[1];
					console.log(polygon, one, two);
					if (_checkPolygon(one).length == 0) {
						var c = _getColor(one, line);
						one.color = c;
						polygons_done.push(one);
						console.log('put AAAAAAA');
					} else {
						polygon_dealing.push(one);
					}
					if (_checkPolygon(two).length == 0) {
						var c = _getColor(two, line);
						two.color = c;
						polygons_done.push(two);
						console.log('put BBBBBBBBB');
					} else {
						polygon_dealing.push(two);
					}

					console.log('polygons_done.length = '+polygons_done.length+', line.key = '+line.key);
				}
			}
		}
		console.log('lines_open = ', lines_open);
		console.log('lines_closed = ', lines_closed);
		var line_dealing;
		var polygon_dealing = [{
			items: polygon
		}];
		while((line_dealing = lines_open.shift())) {
			_splitPolygons(polygon_dealing, lines_open.shift());
			_splitPolygons(polygon_dealing, lines_open.shift());
			_splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
			// _splitPolygons(polygon_dealing, lines_open.shift());
		}

		// while((line_dealing = lines_open.shift())) {
		// 	_splitPolygons(polygon_dealing, line_dealing);
		// }

		var return_val = {
			list: polygons_done,
			lines: lines
		}
		console.log(return_val);
		cb && cb(null, return_val);
	}
	conrec.setModel = function(model) {
		_model = model;
		return conrec;
	}

	module.exports = conrec;
}();