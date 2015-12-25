!function() {
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
		return bound.x_min < bound_checking.x_min &&
				bound.x_max > bound_checking.x_max &&
				bound.y_min < bound_checking.y_min &&
				bound.y_max > bound_checking.y_max;
	}
	// 线分割面(前提是这条线的两个端点在多边形上)
	function _splitPolygonByLine(polygon, line) {
		polygon = polygon.slice(0);
		line = line.slice(0);
		if (!_isClosed(polygon)) {
			polygon.push(polygon[0]);
		}

		if (_isClosed(line)) {
			var sub = line.slice(0);
			if (_getArea(polygon) * _getArea(line) > 0) {
				sub.reverse();
			}
			return [{
				items: polygon,
				sub: [sub]
			}, {
				items: line
			}];
		} else {
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
					x: x + scale,
					y: y + scale
				}
			}

			for (var i = 0, j = polygon.length - 1; i<j; i++) {
				var v = polygon[i],
					v_next = polygon[i + 1];
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
				polygon.splice(first_add.i, 0, first_add.v);
				index_end += 1;
			}
			if (end_add) {
				polygon.splice(end_add.i + (first_add?1: 0), 0, end_add.v);
			}
			// console.log('line=',line);
			// console.log(first_add, end_add);
			// console.log(polygon);
			// console.log('num_add_first = '+num_add_first+', num_add_end = '+num_add_end);

			// console.log('index_first = '+index_first+', index_end = '+index_end+', x_p_first_line = '+x_p_first_line+', y_p_first_line = '+y_p_first_line);
			var index_start = Math.min(index_first, index_end) + 1,
				index_stop = Math.max(index_first, index_end) + 1;
			// console.log('index_start = '+index_start+', index_stop = '+index_stop);
			
			var part1 = polygon.slice(index_start, index_stop),
				part2 = polygon.slice(index_stop).concat(polygon.slice(0, index_start));

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
			return [{
				items: part1
			}, {
				items: part2
			}];

		}
		return [];
	}
	module.exports = {
		getArea: _getArea,
		splitPolygonByLine: _splitPolygonByLine,
		isClosed: _isClosed,
		getBound: _getBound,
		isBoundInBound: _isBoundInBound
	}
}()