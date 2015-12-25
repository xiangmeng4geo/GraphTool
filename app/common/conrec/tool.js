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
	// 线分割面(前提是这条线的两个端点在多边形上)
	function _splitPolygonByLine(polygon, line) {
		polygon = polygon.slice(0);
		line = line.slice(0);
		if (!_isClosed(polygon)) {
			polygon.push(polygon[0]);
		}

		if (_isClosed(line)) {
			;
			var sub = line.slice(0);
			if (_getArea(polygon) * _getArea(line) > 0) {
				sub.reverse();
			}
			return [{
				items: polygon,
				sub: sub
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
				}
				if (index_end == -1 && x_p_end_line >= x_min && x_p_end_line <= x_max && y_p_end_line >= y_min && y_p_end_line <= y_max) {
					index_end = i;
				}
			}

			var index_start = Math.min(index_first, index_end) + 1,
				index_end = Math.max(index_first, index_end) + 1;
			var part1 = polygon.slice(index_start, index_end),
				part2 = polygon.slice(index_end).concat(polygon.slice(0, index_start));

			if (index_first > index_end) {
				part1 = part1.concat(line);
				line.reverse();
				part2 = part2.concat(line);
			} else {
				var line_new = line.slice(0);
				line_new.reverse();
				part2 = part2.concat(line_new);
				part1 = part1.concat(line);
			}
			if (!_isClosed(part1)) {
				part1.push(part1[0]);
			}
			if (!_isClosed(part2)) {
				part2.push(part2[0]);
			}
			return [{
				item: part1
			}, {
				item: part2
			}];

		}
		return [];
	}
	module.exports = {
		getArea: _getArea,
		splitPolygonByLine: _splitPolygonByLine,
		isClosed: _isClosed,
		getBound: _getBound
	}
}()