!function() {
	var util = require('../util');
	var utils_polygon = util.Polygon;
  	var isPointIn = utils_polygon.isPointIn;
	//面积为正可以判断多边型正面，面积为负表示多边形背面
	function _getArea(points) {
		var S = 0;
		for (var i = 0, j = points.length - 1; i < j; i++) {
			var p_a = points[i],
				p_b = points[i + 1];
			S += p_a.x * p_b.y - p_b.x * p_a.y;
		}
		var p_a = points[j],
			p_b = points[0];
		S += p_a.x * p_b.y - p_b.x * p_a.y;
		return S / 2;
	}

	function _isClosed(items) {
		var first = items[0],
			end = items[items.length - 1];

		return first.x == end.x && first.y == end.y;
	}
	function _getBound(items) {
		var first = items[0];
		var x_min = first.x,
			y_min = first.y;
		var x_max = x_min,
			y_max = y_min;

		for (var i = 1, j = items.length; i<j; i++) {
			var val = items[i];
			var x = val.x,
				y = val.y;
			if (x > x_max) {
				x_max = x;
			}
			if (x < x_min) {
				x_min = x;
			}
			if (y > y_max) {
				y_max = y;
			}
			if (y < y_min) {
				y_min = y;
			}
		}
		return {
			x_min: x_min, 
			y_min: y_min,
			x_max: x_max,
			y_max: y_max
		}
	}
	function _isBoundInBound(bound, bound_checking) {
		return bound.x_min <= bound_checking.x_min &&
				bound.x_max >= bound_checking.x_max &&
				bound.y_min <= bound_checking.y_min &&
				bound.y_max >= bound_checking.y_max;
	}
	// 线分割面(前提是这条线的两个端点在多边形上)
	function _splitPolygonByLine(polygon, line) {
		var items_polygon = polygon.items.slice(0);
		// polygon = polygon.slice(0);
		line = line.slice(0);
		if (_isClosed(items_polygon)) {
			items_polygon.pop();
		}

		if (_isClosed(line)) {
			var sub = line.slice(0);
			if (_getArea(items_polygon) * _getArea(line) > 0) {
				sub.reverse();
			}

			items_polygon.push(items_polygon[0]);
			var sub_arr = polygon.sub || [];
			sub_arr.push(sub);
			return [{
				items: items_polygon,
				sub: sub_arr
			}, {
				items: line
			}];
		} else {
		console.log(line[0], line[line.length-1]);
			var p_first_line = line[0],
				p_end_line = line[line.length - 1];
			var x_p_first_line = p_first_line.x,
				y_p_first_line = p_first_line.y,
				x_p_end_line = p_end_line.x,
				y_p_end_line = p_end_line.y;

			var index_first = index_end = -1;
			var num_add_first = num_add_end = 0;
			var first_add;
			var end_add;
			// 对在顶点的点进行移位
			function _change(x, y, x_v, y_v, x_v_next, y_v_next, is_v) {
				var scale = Number.MIN_VALUE;
				if (!is_v) {
					scale = -scale;
				}
				return {
					x: x + (x_v_next - x)*scale,
					y: y + (y_v_next - y)*scale
				}
			}

			// console.log(polygon);
			for (var i = 0, j = items_polygon.length-1; i<=j; i++) {
				var v = items_polygon[i],
					v_next = items_polygon[i==j?0:i + 1];
				var x_v = v.x,
					y_v = v.y,
					x_v_next = v_next.x,
					y_v_next = v_next.y;

				var x_min = Math.min(x_v, x_v_next),
					x_max = Math.max(x_v, x_v_next),
					y_min = Math.min(y_v, y_v_next),
					y_max = Math.max(y_v, y_v_next);

				if (index_first == -1 && x_p_first_line >= x_min && x_p_first_line <= x_max && y_p_first_line >= y_min && y_p_first_line <= y_max) {
					index_first = i;
					if (x_p_first_line == x_v && y_p_first_line == y_v) {
						var result = _change(x_p_first_line, y_p_first_line, x_v, y_v, x_v_next, y_v_next, true);
						var x_result = result.x,
							y_result = result.y;
						p_first_line.x = x_p_first_line = x_result;
						p_first_line.y = y_p_first_line = y_result;
					} else if (x_p_first_line == x_v_next && y_p_first_line == y_v_next) {
						var result = _change(x_p_first_line, y_p_first_line, x_v, y_v, x_v_next, y_v_next, false);
						var x_result = result.x,
							y_result = result.y;
						p_first_line.x = x_p_first_line = x_result;
						p_first_line.y = y_p_first_line = y_result;
					}
				}
				if (index_end == -1 && x_p_end_line >= x_min && x_p_end_line <= x_max && y_p_end_line >= y_min && y_p_end_line <= y_max) {
					index_end = i;
					if (x_p_end_line == x_v && y_p_end_line == y_v) {
						var result = _change(x_p_end_line, y_p_end_line, x_v, y_v, x_v_next, y_v_next, true);
						var x_result = result.x,
							y_result = result.y;
						p_first_line.x = x_p_first_line = x_result;
						p_first_line.y = y_p_first_line = y_result;
					} else if (x_p_end_line == x_v_next && y_p_end_line == y_v_next) {
						var result = _change(x_p_end_line, y_p_end_line, x_v, y_v, x_v_next, y_v_next, false);
						var x_result = result.x,
							y_result = result.y;
						p_first_line.x = x_p_first_line = x_result;
						p_first_line.y = y_p_first_line = y_result;
					}
				}
			}
			if (first_add) {
				items_polygon.splice(first_add.i, 0, first_add.v);
				index_end += 1;
			}
			if (end_add) {
				items_polygon.splice(end_add.i + (first_add?1: 0), 0, end_add.v);
			}
			// console.log('line=',line);
			// console.log(first_add, end_add);
			// console.log(polygon);
			// console.log('num_add_first = '+num_add_first+', num_add_end = '+num_add_end);

			// console.log('index_first = '+index_first+', index_end = '+index_end+', x_p_first_line = '+x_p_first_line+', y_p_first_line = '+y_p_first_line);
			var index_start = Math.min(index_first, index_end) + 1,
				index_stop = Math.max(index_first, index_end) + 1;
			// console.log('index_start = '+index_start+', index_stop = '+index_stop);
			
			var part1 = items_polygon.slice(index_start, index_stop),
				part2 = items_polygon.slice(index_stop).concat(items_polygon.slice(0, index_start));

			if (index_first > index_end) {
				var line_new = line.slice(0);
				line_new.reverse();
				part1 = part1.concat(line);
				part2 = part2.concat(line_new);
			} else {
				var line_new = line.slice(0);
				line_new.reverse();
				part1 = part1.concat(line_new);
				part2 = part2.concat(line);
			}
			if (!_isClosed(part1)) {
				part1.push(part1[0]);
			}
			if (!_isClosed(part2)) {
				part2.push(part2[0]);
			}
			var sub = polygon.sub;
			var subone = [], subtwo = [];
			if (sub) {
				for (var i = 0, j = sub.length; i<j; i++) {
					var sub_items = sub[i];
					var b = _getBound(sub_items);
					var x = b.x_min + (b.x_max - b.x_min)/2,
						y = b.y_min + (b.y_max - b.y_min)/2;

					(isPointIn(part1, x, y)? subone: subtwo).push(sub_items);
				}
			}
			var one = {items: part1},
				two = {items: part2};
			if (subone && subone.length > 0) {
				one.sub = subone;
			}
			if (subtwo && subtwo.length > 0) {
				two.sub = subtwo;
			}
			return [one, two];

		}
		return [];
	}
	function _splitPolygonsByLines(polygons, lines, fn_getcolor) {
		var polygons_result = [];

		var polygons_dealing = polygons.slice(0),
			lines_dealing = lines.slice(0);

		lines_dealing.map(function(line, i) {
			line.bound = _getBound(line);
			// line.isClosed = _isClosed(line)? 1: 0;
			// line.id = i;
		});	
		// lines_dealing.sort(function(a, b) {
		// 	return b.isClosed - a.isClosed;
		// });
		var _num_test = 0;
		while(true && _num_test++ < 5000) {
			var _polygon = polygons_dealing.shift();
			// console.log('_polygon = ', _polygon);
			var bound_polygon = _getBound(_polygon.items);
			var sub = _polygon.sub;
			var sub_bound_arr;
			if (sub) {
				sub_bound_arr = [];
				sub.map(function(v) {
					sub_bound_arr.push(_getBound(v));
				});
			}
			// console.log('bound_polygon = ', bound_polygon);
			var line_in = null;
			// console.log('lines_dealing.length = ', lines_dealing.length, lines_dealing);
			for (var i = 0, j = lines_dealing.length; i<j; i++) {
				var line = lines_dealing[i];
				// console.log(i, 'line = ', line);
				var bound_line = line.bound;
				if (_isBoundInBound(bound_polygon, bound_line)) {
					var is_in = true;
					if (sub_bound_arr) {
						for (var i_sub = 0, j_sub = sub_bound_arr.length; i_sub < j_sub; i_sub++) {
							if (_isBoundInBound(sub_bound_arr[i_sub], bound_line)) {
								is_in = false;
								break;
							}
						}
					}
					if (is_in) {
						line_in = lines_dealing.splice(i, 1)[0];
						break;
					}
				}
			}
			// console.log('line_in = ', line_in);
			if (line_in) {
				var sub_polygons = _splitPolygonByLine(_polygon, line_in);
				if (fn_getcolor) {
					sub_polygons.map(function(v) {
						v.line = line_in;
					});
				}
				// console.log('sub_polygons = ', sub_polygons);
				polygons_dealing = sub_polygons.concat(polygons_dealing);// 放在队列最前优先处理
				// console.log('polygons_dealing = ', polygons_dealing);
			} else {
				// _polygon.id = polygons_result.length;
				fn_getcolor && fn_getcolor(_polygon);
				// console.log('push polygon = ', _polygon);
				polygons_result.push(_polygon);
			}
			if (polygons_dealing.length == 0) {
				break;
			}
		}
		// console.log(JSON.stringify(polygons_result));
		// console.log((polygons_result));
		return polygons_result;
	}
	module.exports = {
		getArea: _getArea,
		splitPolygonByLine: _splitPolygonByLine,
		splitPolygonsByLines: _splitPolygonsByLines,
		isClosed: _isClosed,
		getBound: _getBound,
		isBoundInBound: _isBoundInBound
	}
}()