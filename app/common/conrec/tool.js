!function() {
	var PI = Math.PI;
	var MIN_POINT_NUM = 30;
	var NUM_MIN = 0.00001;

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
		return bound_checking.x_min - bound.x_min >= -NUM_MIN &&
			   bound.x_max - bound_checking.x_max >= -NUM_MIN && 
			   bound_checking.y_min - bound.y_min >= -NUM_MIN && 
			   bound.y_max - bound_checking.y_max >= -NUM_MIN;
		// return bound.x_min <= bound_checking.x_min &&
		// 		bound.x_max >= bound_checking.x_max &&
		// 		bound.y_min <= bound_checking.y_min &&
		// 		bound.y_max >= bound_checking.y_max;
	}
	// B样条插值平滑算法
	var _smoothBSpline = function(is_points_array){
	    // https://github.com/Tagussan/BSpline
	    var BSpline = function(points,degree,copy){
	        if(copy){
	            this.points = []
	            for(var i = 0;i<points.length;i++){
	                this.points.push(points[i]);
	            }
	        }else{
	            this.points = points;
	        }
	        this.degree = degree;
	        this.dimension = points[0].length;
	        if(degree == 2){
	            this.baseFunc = this.basisDeg2;
	            this.baseFuncRangeInt = 2;
	        }else if(degree == 3){
	            this.baseFunc = this.basisDeg3;
	            this.baseFuncRangeInt = 2;
	        }else if(degree == 4){
	            this.baseFunc = this.basisDeg4;
	            this.baseFuncRangeInt = 3;
	        }else if(degree == 5){
	            this.baseFunc = this.basisDeg5;
	            this.baseFuncRangeInt = 3;
	        }
	    };

	    BSpline.prototype.seqAt = function(dim){
	        var points = this.points;
	        var margin = this.degree + 1;
	        return function(n){
	            if(n < margin){
	                return points[0][dim];
	            }else if(points.length + margin <= n){
	                return points[points.length-1][dim];
	            }else{
	                return points[n-margin][dim];
	            }
	        };
	    };

	    BSpline.prototype.basisDeg2 = function(x){
	        if(-0.5 <= x && x < 0.5){
	            return 0.75 - x*x;
	        }else if(0.5 <= x && x <= 1.5){
	            return 1.125 + (-1.5 + x/2.0)*x;
	        }else if(-1.5 <= x && x < -0.5){
	            return 1.125 + (1.5 + x/2.0)*x;
	        }else{
	            return 0;
	        }
	    };

	    BSpline.prototype.basisDeg3 = function(x){
	        if(-1 <= x && x < 0){
	            return 2.0/3.0 + (-1.0 - x/2.0)*x*x;
	        }else if(1 <= x && x <= 2){
	            return 4.0/3.0 + x*(-2.0 + (1.0 - x/6.0)*x);
	        }else if(-2 <= x && x < -1){
	            return 4.0/3.0 + x*(2.0 + (1.0 + x/6.0)*x);
	        }else if(0 <= x && x < 1){
	            return 2.0/3.0 + (-1.0 + x/2.0)*x*x;
	        }else{
	            return 0;
	        }
	    };

	    BSpline.prototype.basisDeg4 = function(x){
	        if(-1.5 <= x && x < -0.5){
	            return 55.0/96.0 + x*(-(5.0/24.0) + x*(-(5.0/4.0) + (-(5.0/6.0) - x/6.0)*x));
	        }else if(0.5 <= x && x < 1.5){
	            return 55.0/96.0 + x*(5.0/24.0 + x*(-(5.0/4.0) + (5.0/6.0 - x/6.0)*x));
	        }else if(1.5 <= x && x <= 2.5){
	            return 625.0/384.0 + x*(-(125.0/48.0) + x*(25.0/16.0 + (-(5.0/12.0) + x/24.0)*x));
	        }else if(-2.5 <= x && x <= -1.5){
	            return 625.0/384.0 + x*(125.0/48.0 + x*(25.0/16.0 + (5.0/12.0 + x/24.0)*x));
	        }else if(-1.5 <= x && x < 1.5){
	            return 115.0/192.0 + x*x*(-(5.0/8.0) + x*x/4.0);
	        }else{
	            return 0;
	        }
	    };

	    BSpline.prototype.basisDeg5 = function(x){
	        if(-2 <= x && x < -1){
	            return 17.0/40.0 + x*(-(5.0/8.0) + x*(-(7.0/4.0) + x*(-(5.0/4.0) + (-(3.0/8.0) - x/24.0)*x)));
	        }else if(0 <= x && x < 1){
	            return 11.0/20.0 + x*x*(-(1.0/2.0) + (1.0/4.0 - x/12.0)*x*x);
	        }else if(2 <= x && x <= 3){
	            return 81.0/40.0 + x*(-(27.0/8.0) + x*(9.0/4.0 + x*(-(3.0/4.0) + (1.0/8.0 - x/120.0)*x)));
	        }else if(-3 <= x && x < -2){
	            return 81.0/40.0 + x*(27.0/8.0 + x*(9.0/4.0 + x*(3.0/4.0 + (1.0/8.0 + x/120.0)*x)));
	        }else if(1 <= x && x < 2){
	            return 17.0/40.0 + x*(5.0/8.0 + x*(-(7.0/4.0) + x*(5.0/4.0 + (-(3.0/8.0) + x/24.0)*x)));
	        }else if(-1 <= x && x < 0){
	            return 11.0/20.0 + x*x*(-(1.0/2.0) + (1.0/4.0 + x/12.0)*x*x);
	        }else{
	            return 0;
	        }
	    };

	    BSpline.prototype.getInterpol = function(seq,t){
	        var f = this.baseFunc;
	        var rangeInt = this.baseFuncRangeInt;
	        var tInt = Math.floor(t);
	        var result = 0;
	        for(var i = tInt - rangeInt;i <= tInt + rangeInt;i++){
	            result += seq(i)*f(t-i);
	        }
	        return result;
	    };


	    BSpline.prototype.calcAt = function(t){
	        t = t*((this.degree+1)*2+this.points.length);//t must be in [0,1]
	        // var x = parseFloat(this.getInterpol(this.seqAt('x'),t).toFixed(4)),
	        //     y = parseFloat(this.getInterpol(this.seqAt('y'),t).toFixed(4))

	        var x = this.getInterpol(this.seqAt('x'),t),
	            y = this.getInterpol(this.seqAt('y'),t);

	        // 数组形式访问较快
	        // https://github.com/tonny-zhang/docs/issues/1#user-content-1
	        return is_points_array? [x, y]: {x: x, y: y};
	    };
	    // degree = [2, 5]; factor = [2, 10]
	    return function(points, degree, factor){
			degree = degree || 4;
			var len = points.length;
			var num = len * (factor || 5);
			num < MIN_POINT_NUM && (num = Math.max(num*5, MIN_POINT_NUM));
			// console.log('factor = '+factor+', len = '+len +', num = '+num+', degree = '+degree);
			var spline = new BSpline(points, degree, true);
			var points_return = [];
			var space = 1/num;
			var x_last, y_last;
			for(var t = 0; t <= 1; t += space){
				var interpol = spline.calcAt(t);
				var x = is_points_array? interpol[0]: interpol.x;
				var y = is_points_array? interpol[1]: interpol.y;
				if (x === x_last && y === y_last) {
					continue;
				}
				x_last = x;
				y_last = y;
				points_return.push(interpol);
			}
			var first = points[0],
				end = points[len - 1];
			if (is_points_array) {
				points_return.unshift([first.x, first.y]);
				points_return.push([end.x, end.y]);
			} else {
				points_return.unshift(first);
				points_return.push(end);
			}
			return points_return;
	    }
	};
	function _smoothItems(items, min_dis, is_points_array) {
		min_dis || (min_dis = 0);
		var len = items.length;
		var is_small = len < MIN_POINT_NUM;
		var startPoint = items[0];
		var items_new = [startPoint];
		for(var i = 1, j = len-1; i<j; i++){
			var item = items[i];
			if(is_small || Math.pow(startPoint.x - item.x, 2) + Math.pow(startPoint.y - item.y, 2) > min_dis){
				items_new.push(item);
				startPoint = item;
			}
		}
		items_new.push(items[len-1]);

		// 只对闭合曲线进行处理
		if (_isClosed(items_new)) {
			// !!可对点少的多边形，进行变形处理
			// 找到三个点间角度最小的点做项
			var max_index = 0;
			var max_angle = 0;
			for (var i = 1, j = items_new.length-1; i<j; i++) {
				var p = items_new[i],
				p_prev = items_new[i == 0? j-1: i - 1],
				p_next = items_new[i+1 == j? 0: i+1];
				var x_p = p.x,
				x_prev = p_prev.x,
				x_next = p_next.x,
				y_p = p.y,
				y_prev = p_prev.y,
				y_next = p_next.y;

				if (x_p == x_prev && x_p == x_next || (y_p == y_prev && y_p == y_next)) {
					max_index = i;
					// max_angle = Math.PI;
					break;
				} else {
					// 向量运算，得到向量夹角
					var vector_a_x = x_p - x_prev,
					    vector_a_y = y_p - y_prev,
					    vector_b_x = x_next - x_p,
					    vector_b_y = y_next - y_p;

					var cos_angle = (vector_a_x * vector_b_x + vector_a_y * vector_b_y)/
					(Math.sqrt(vector_a_x*vector_a_x + vector_a_y*vector_a_y) + Math.sqrt(vector_b_x*vector_b_x + vector_b_y*vector_b_y))

					var angle = PI - Math.acos(cos_angle);
					if (max_angle < angle) {
					    max_angle = angle;
					    max_index = i;
					}
				}
			}
			if (max_index > 0) {
				items_new.pop();
				items_new = items_new.slice(max_index).concat(items_new.slice(0, max_index));
				items_new.push(items_new[0]); // 使新线闭合
			}
		}
		// console.log('items_new', items_new);
		//   console.log('j='+j, max_index, max_angle/ Math.PI*180, arr);
		return _smoothBSpline(is_points_array)(items_new, 4);
	}
	// 线分割面(前提是这条线的两个端点在多边形上)
	function _splitPolygonByLine(polygon, line) {
		var items_polygon = polygon.items.slice(0);
		line = line.slice(0);
		if (_isClosed(items_polygon)) {
			items_polygon.pop();
		}

		if (_isClosed(line)) {
			var line_closed = line.slice(0);
			if (_getArea(items_polygon) * _getArea(line_closed) > 0) {
				line_closed.reverse();
			}

			items_polygon.push(items_polygon[0]);

			var part1 = {
				items: items_polygon
			};
			var part2 = {
				items: line
			};
			var sub = polygon.sub || [];
			var sub_one = [];
			var bound_line_closed = _getBound(line_closed);
			var sub_two;
			// 对大环切带小环的面进行处理
			for (var i = 0, j = sub.length; i<j; i++) {
				var sub_item = sub[i];
				var bound_sub_item = _getBound(sub_item);
				if (_isBoundInBound(bound_line_closed, bound_sub_item)) {
					if (undefined == sub_two) {
						sub_two = [];
					}
					sub_two.push(sub_item);
				} else {
					sub_one.push(sub_item);
				}
			}
			sub_one.push(line_closed);
			if (sub_two && sub_two.length > 0) {
				part2.sub = sub_two;
			}
			if (sub_one.length > 0) {
				part1.sub = sub_one;
			}
			return [part1, part2];
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
					var flag_first = -1;
					if (x_p_first_line == x_v && y_p_first_line == y_v) {
						flag_first = true;
					} else if (x_p_first_line == x_v_next && y_p_first_line == y_v_next) {
						flag_first = false;
					}
					if (flag_first != -1) {
						var result = _change(x_p_first_line, y_p_first_line, x_v, y_v, x_v_next, y_v_next, flag_first);
						var x_result = result.x,
							y_result = result.y;
						p_first_line.x = x_p_first_line = x_result;
						p_first_line.y = y_p_first_line = y_result;
					}
				}
				if (index_end == -1 && x_p_end_line >= x_min && x_p_end_line <= x_max && y_p_end_line >= y_min && y_p_end_line <= y_max) {
					index_end = i;
					var flag_end = -1;
					if (x_p_end_line == x_v && y_p_end_line == y_v) {
						flag_end = true;
					} else if (x_p_end_line == x_v_next && y_p_end_line == y_v_next) {
						flag_end = false;
					}
					if (flag_end != -1) {
						var result = _change(x_p_end_line, y_p_end_line, x_v, y_v, x_v_next, y_v_next, flag_end);
						var x_result = result.x,
							y_result = result.y;
						p_end_line.x = x_p_end_line = x_result;
						p_end_line.y = y_p_end_line = y_result;
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
			var line_reverse = line.slice(0);	
			line_reverse.reverse();
			var area_line = _getArea(line);
			var area_part = 0; // 防止出一个点或一条直线面积为0的情况
			var len_part1 = part1.length,
				len_part2 = part2.length;
			// if (len_part1 > 0 && (area_part = _getArea(part1)) !== 0) {
			// 	if (area_part * area_line > 0) { // 同方向
			// 		part1 = part1.concat(line_reverse);
			// 		part2 = part2.concat(line);
			// 	} else {
			// 		part1 = part1.concat(line);
			// 		part2 = part2.concat(line_reverse);
			// 	}
			// } else if (len_part2 > 0 && (area_part = _getArea(part2)) !== 0) {
			// 	if (area_part * area_line > 0) { // 同方向
			// 		part1 = part1.concat(line);
			// 		part2 = part2.concat(line_reverse);
			// 	} else {
			// 		part1 = part1.concat(line_reverse);
			// 		part2 = part2.concat(line);
			// 	}
			// } else {
				// 点很少的情况会出现面积为0的情况
				/*分割后的两个部分不可能点都为1个，如果有一个部分是一个点的话对线的判断逻辑会有误差，因此这里加强判断*/
				if (len_part1 > 1) {
					var p_part1 = part1[0];
					var x_p_part1 = p_part1.x,
						y_p_part1 = p_part1.y;
					var cha = (Math.pow(x_p_part1 - x_p_first_line, 2) + Math.pow(y_p_part1 - y_p_first_line, 2)) -
						(Math.pow(x_p_part1 - x_p_end_line, 2) + Math.pow(y_p_part1 - y_p_end_line, 2));
					if (cha > 0) {
						part1 = part1.concat(line);
						part2 = part2.concat(line_reverse);
					} else {
						part1 = part1.concat(line_reverse);
						part2 = part2.concat(line);
					}
				} else if (len_part2 > 1) {
					var p_part2 = part2[0];
					var x_p_p_part2 = p_part2.x,
						y_p_p_part2 = p_part2.y;
					var cha = (Math.pow(x_p_p_part2 - x_p_first_line, 2) + Math.pow(y_p_p_part2 - y_p_first_line, 2)) -
						(Math.pow(x_p_p_part2 - x_p_end_line, 2) + Math.pow(y_p_p_part2 - y_p_end_line, 2));
					if (cha >0) {
						part1 = part1.concat(line_reverse);
						part2 = part2.concat(line);
					} else {
						part1 = part1.concat(line);
						part2 = part2.concat(line_reverse);
					}
				}
			// }
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
			} else {

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
	function _splitPolygonsByLines(polygons, lines, fn_getcolor, flag_add_area) {
		var polygons_result = [];

		var polygons_dealing = polygons.slice(0),
			lines_dealing = [];

		lines.map(function(line, i) {
			line.bound || (line.bound = _getBound(line));
			line.id = i;
			lines_dealing.push(line);
		});

		// lines_dealing = lines_dealing.splice(3, 1);
		// console.log(polygons_dealing.slice(), lines_dealing.slice());
		var _num_test = 0;
		var _test;
		var _progress = {};
		var _id_progress = 0;
		while(true && _num_test++ < 5000) {
			var _polygon = polygons_dealing.shift();
			var _items = _polygon.items;
			var bound_polygon = _getBound(_items);
			var sub = _polygon.sub;
			var sub_bound_arr = null;;
			if (sub) {
				sub_bound_arr = [];
				sub.map(function(v) {
					sub_bound_arr.push(_getBound(v));
				});
			}
			var line_in = null;
			for (var i = 0, j = lines_dealing.length; i<j; i++) {
				var line = lines_dealing[i];
				var bound_line = line.bound;
				if (_isBoundInBound(bound_polygon, bound_line)) {
					var _p_test = line[Math.floor(line.length/2)];

					// 用线的中点测试是否真正在多边形中（在多边形边界内不一定真正在多边形内，如，在多边形的缺角）
					var is_in = isPointIn(_items, _p_test.x, _p_test.y);
					if (is_in && sub_bound_arr) {
						for (var i_sub = 0, j_sub = sub_bound_arr.length; i_sub < j_sub; i_sub++) {
							if (_isBoundInBound(sub_bound_arr[i_sub], bound_line) && isPointIn(sub[i_sub], _p_test.x, _p_test.y)) {
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
				// console.log('line_in.id = '+line_in.id);
				var sub_polygons = _splitPolygonByLine(_polygon, line_in);
				if (fn_getcolor) {
					sub_polygons.map(function(v) {
						v.line = line_in;
					});				
				}

				_progress[_id_progress++] = sub_polygons;
				polygons_dealing = sub_polygons.concat(polygons_dealing);// 放在队列最前优先处理
			} else {
				// _polygon.id = polygons_result.length;
				fn_getcolor && fn_getcolor(_polygon);
				delete _polygon.line;
				if (!fn_getcolor || _polygon.color) {
					if (flag_add_area) {
						_polygon.area = _getArea(_polygon.items);
					}
					polygons_result.push(_polygon);
				}
			}
			if (polygons_dealing.length == 0) {
				break;
			}
		}
		
		// polygons_result.progress = _progress;
		return polygons_result;
	}
	// 对conrec得到的线进行分组（主要针对局部插值）
	var LEVEL_DEFAULT = -2;
	function _groupLines(lines, bound, step) {
		var lines_open = [],
			lines_closed = [],
			lines_out_bound = [],
			lines_waiting_deal = [];

		var x_min = bound.x_min,
			x_max = bound.x_max,
			y_min = bound.y_min,
			y_max = bound.y_max;
		lines.map(function(line, i) {
			var _flag_isClosed = _isClosed(line);

			var line_obj = line;
			line_obj.bound = _getBound(line);
			line_obj._isClosed = _flag_isClosed;
			if (_flag_isClosed) {
				if (line.k == LEVEL_DEFAULT) {
					lines_out_bound.push(line_obj);
				} else {
					lines_closed.push(line_obj);
				}
			} else {
				var a = line[0],
					x_a = a.x,
					y_a = a.y,
					b = line[line.length - 1],
					x_b = b.x,
					y_b = b.y;
				if (((x_a == x_min && y_a >= y_min && y_a <= y_max) || 
					(x_a == x_max && y_a >= y_min && y_a <= y_max) || 
					(y_a == y_min && x_a >= x_min && x_a <= x_max) ||
					(y_a == y_max && x_a >= x_min && x_a <= x_max)) && 
					((x_b == x_min && y_b >= y_min && y_b <= y_max) || 
					(x_b == x_max && y_b >= y_min && y_b <= y_max) || 
					(y_b == y_min && x_b >= x_min && x_b <= x_max) ||
					(y_b == y_max && x_b >= x_min && x_b <= x_max))) {
					lines_open.push(line_obj);
				} else if (line.k != LEVEL_DEFAULT) {
					lines_waiting_deal.push(line_obj);
				}
			}
		});
		// console.log('open = '+lines_open.length+', close = '+lines_closed.length+', out = '+lines_out_bound.length+', wait = '+lines_waiting_deal.length);
		var _cache_line = {};
		for (var i = 0, j = lines_out_bound.length; i<j; i++) {
			var line_out = lines_out_bound[i];
			var bound_line_out = line_out.bound;
			var arr_lines_in = [];
			for (var i_line = 0, j_line = lines_waiting_deal.length; i_line<j_line; i_line++) {
				var line_test = lines_waiting_deal[i_line];
				var _first = line_test[0],
					_end = line_test[line_test.length - 1];
				if (_isBoundInBound(bound_line_out, line_test.bound) && isPointIn(line_out, _first.x, _first.y)) {
					line_test._dis = _getDis(_first.x, _first.y, _end.x, _end.y);
					arr_lines_in.push(line_test);
					lines_waiting_deal.splice(i_line, 1);
					j_line--;
					i_line--;
				}
			}
			if (arr_lines_in.length == 0) {
				lines_closed.push(line_out);
			} else {
				arr_lines_in.sort(function(a, b) {
					return a._dis - b._dis;
				});
				// if (i == 4) {
					// console.log(arr_lines_in.slice());
					_cache_line['line'+i] = {
						out: line_out,
						arr_in: arr_lines_in
					};
				// }
			}
		}
		for (var i in _cache_line) {
			lines_closed = lines_closed.concat(_attemptCloseLines(_cache_line[i], step));
		}
		// console.log('open = '+lines_open.length+', close = '+lines_closed.length+', _cache_line = ', _cache_line);

		// 长度从长到短
		lines_open.sort(function(a, b) {
			return b.length - a.length;
		});
		lines_closed.sort(function(a, b) {
			return b.length - a.length;
		});
		return lines_open.concat(lines_closed);
	}
	function _getDis(x1, y1, x2, y2) {
		return Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2);
	}
	function _getDisByPoint(p1, p2) {
		return _getDis(p1.x, p1.y, p2.x, p2.y);
	}
	function _getMinDisToOut(x, y, items) {
		var index_min = 0;
		var dis = _getDis(x, y, items[0].x, items[0].y);

		for (var i = 1, j = items.length; i<j; i++) {
			var d = _getDis(x, y, items[i].x, items[i].y);
			if (d < dis) {
				dis = d;
				index_min = i;
			}
		}
		return {
			d: dis,
			i: index_min
		};
	}
	// 查看首尾点是否可以连结（和其它线段有交点的不可以连结）
	function _isCanLinkSelf(items) {
		var len = items.length;
		var first = items[0],
			end = items[len - 1];
		var x_first = first.x,
			y_first = first.y,
			x_end = end.x,
			y_end = end.y;

		var x_min = Math.min(x_first, x_end),
			x_max = Math.max(x_first, x_end),
			y_min = Math.min(y_first, y_end),
			y_max = Math.max(y_first, y_end);
		for (var i = 0, j = i+1; i<len-1; i++, j++) {
			var one = items[i],
				two = items[j];
			var x_one = one.x,
				y_one = one.y,
				x_two = two.x,
				y_two = two.y;
			var is_have_same_point = ((x_first == x_one && y_first == y_one) ||
										(x_first == x_two && y_first == y_two) ||
										(x_end == x_one && y_first == y_one) ||
										(x_end == x_two && y_first == y_two));
			if (x_first == x_end) {
				// 在不同侧
				// console.log('test11', x_one - x_first, x_two - x_first);
				var flag = (x_one - x_first) * (x_two - x_first);
				if (flag < 0) {
					var y_min_1 = Math.min(y_one, y_two),
						y_max_1 = Math.max(y_one, y_two);
					if (y_min_1 >= y_min || y_max_1 <= y_max_1) {
						// console.log('test1', y_min_1, y_min, y_max_1, y_max_1);
						return false;
					}
				} else if (flag == 0) {
					// 为相反方向时线重合（有相交）
					if (x_one == x_two && (y_end - y_first) * (y_two - y_one) < 0) {
						return false;
					}
				}
			} else {
				var k = (y_first - y_end) / (x_first - x_end);
				var b = (x_first * y_end - x_end * y_first)/(x_first - x_end);

				var y1 = k*x_one + b,
					y2 = k*x_two + b;
				// 在不同侧
				// console.log('y1='+y1+', y_one = '+y_one+',y2='+y2+', y_two = '+y_two);
				var flag = (y1 - y_one) * (y2 - y_two);
				if (flag <= 0) {
					if (x_one == x_two) {
						if (!is_have_same_point) {
							if (y1 > y_min && y1 < y_max) {
								return false;
							}
						}
					} else {
						var k_test = (y_one - y_two) / (x_one - x_two);
						if (is_have_same_point) {
							// 有相同点且斜率相同且方向相反
							if (k == k_test && (y_end - y_first) * (y_two - y_one) < 0) {
								return false;
							}
						} else {
							var b_test = (x_one * y_two - x_two * y_one) / (x_one - x_two);
							var x_test = (b_test - b) / (k - k_test);
							var y_test = k * x_test + b;
							// 两线段有交点
							if (x_test >= x_min && x_test <= x_max && y_test >= y_min && y_test <= y_max) {
								return false;
							}
						}
					}
				}
			}
		}
		return true;
	}
	// 连接两条线
	function _linkLines(items_one, items_two) {
		items_one = items_one.slice();
		items_two = items_two.slice();

		var p_first_one = items_one[0],
			p_end_one = items_one[items_one.length - 1],
			p_first_two = items_two[0],
			p_end_two = items_two[items_two.length - 1];
		var dis_a = _getDisByPoint(p_first_one, p_first_two),
			dis_b = _getDisByPoint(p_first_one, p_end_two),
			dis_c = _getDisByPoint(p_end_one, p_first_two),
			dis_d = _getDisByPoint(p_end_one, p_end_two);

		var dis_min = Math.min(dis_a, dis_b, dis_c, dis_d);
		if (dis_min == dis_a) {
			items_one.reverse();
			return items_one.concat(items_two);
		} else if (dis_min == dis_b) {
			return items_two.concat(items_one);
		} else if (dis_min == dis_c) {
			return items_one.concat(items_two);
		} else if (dis_min == dis_d) {
			items_two.reverse();
			return items_one.concat(items_two);
		}
	}
	function _closeByOutline(line, outline) {
		outline = outline.slice();
		var p_first_line = line[0];
		if (_getDisByPoint(p_first_line, outline[0]) < 
			_getDisByPoint(p_first_line, outline[outline.length - 1])) {
			outline.reverse();
		}
		var items_new = outline;
		// outline.unshift(line[line.length - 1]);
		// outline.push(p_first_line);
		// for (var i = 1, j = outline.length - 2; i<=j; i++) {
		// 	var prev = outline[i-1],
		// 		current = outline[i],
		// 		next = outline[i+1];

		// 	var x = (prev.x + current.x*2 + next.x)/4,
		// 		y = (prev.y + current.y*2 + next.y)/4;
		// 	items_new.push({
		// 		x: x,
		// 		y: y
		// 	});
		// }
		return line.concat(items_new);
	}
	function _attemptCloseLines(obj, step) {
		var dis_max_can_link = Math.pow(step, 2) * 2;
		var line_out = obj.out,
			arr_in = obj.arr_in;

		// arr_in.splice(1);
		// arr_in = [arr_in[1]];
		var p_first_out = line_out[0],
			p_end_out = line_out[line_out.length - 1];
		var x_p_first_out = p_first_out.x,
			y_p_first_out = p_first_out.y,
			x_p_end_out = p_end_out.x,
			y_p_end_out = p_end_out.y;

		var arr_return = [line_out];
		
		var temp_line;
		while((temp_line = arr_in.shift())) {
			var len_items = temp_line.length;
			var k = temp_line.k;
			var p_first = temp_line[0],
				p_end = temp_line[len_items - 1];
			var x_p_first = p_first.x,
				y_p_first = p_first.y,
				x_p_end = p_end.x,
				y_p_end = p_end.y;

			// arr_return.push(temp_line);
			// continue;

			var is_little_points = len_items < 4;
			var dis_min = _getDis(x_p_first, y_p_first, x_p_end, y_p_end);
			if (dis_min < dis_max_can_link && !is_little_points) {
				// console.log(dis_min , dis_max_can_link, len_items);
				// 处理首尾两个点连结时和其它线段有交点
				
				var flag = _isCanLinkSelf(temp_line);
				if (flag) {
					temp_line.push(temp_line[0]);
					arr_return.push(temp_line);
					continue;
				}
			}
			// continue;
			var dis_min_in = dis_min,
				index_min_in = -1;
			// 寻找距离此线最近的线
			for (var i = 0, j = arr_in.length; i<j; i++) {
				var line_in = arr_in[i],
					k_in = line_in.k;
				if (k_in == k) {
					var p_first_test = line_in[0],
						p_end_test = line_in[line_in.length - 1];
					var x_p_first_test = p_first_test.x,
						y_p_first_test = p_first_test.y,
						x_p_end_test = p_end_test.x,
						y_p_end_test = p_end_test.y;

					var dis_test = _getDis(x_p_first, y_p_first, x_p_first_test, y_p_first_test);
					if (dis_test < dis_min_in) {
						dis_min_in = dis_test;
						index_min_in = i;
					}
					dis_test = _getDis(x_p_first, y_p_first, x_p_end_test, y_p_end_test);
					if (dis_test < dis_min_in) {
						dis_min_in = dis_test;
						index_min_in = i;
					}
					dis_test = _getDis(x_p_end, y_p_end, x_p_first_test, y_p_first_test);
					if (dis_test < dis_min_in) {
						dis_min_in = dis_test;
						index_min_in = i;
					}
					dis_test = _getDis(x_p_end, y_p_end, x_p_end_test, y_p_end_test);
					if (dis_test < dis_min_in) {
						dis_min_in = dis_test;
						index_min_in = i;
					}
				}
			}

			var dis_min_out_first = _getMinDisToOut(x_p_first, y_p_first, line_out),
				dis_min_out_end = _getMinDisToOut(x_p_end, y_p_end, line_out);

			var dis_min_out = Math.min(dis_min_out_first.d, dis_min_out_end.d);

			// 两个线组成新的线
			if (dis_min_in < dis_max_can_link && dis_min_in < dis_min && index_min_in != -1) {
				var line_in_test = arr_in[index_min_in];

				temp_line = _linkLines(line_in_test, temp_line);
				temp_line.k = k;
				arr_in.splice(index_min_in, 1);
				arr_in.push(temp_line); // 把新组成的线重新放回等待下次处理
			} else if (dis_min <= dis_min_out && !is_little_points) { //自身闭合
				temp_line.push(temp_line[0]);
				arr_return.push(temp_line);
			} else { // 与个层线形成闭合
				var index_min = Math.min(dis_min_out_first.i, dis_min_out_end.i),
					index_max = Math.max(dis_min_out_first.i, dis_min_out_end.i);

				var items_new;
				if (index_max - index_min + 1 < line_out.length/2) {
					items_new = line_out.slice(index_min, index_max+1);
				} else {
					items_new = line_out.slice(index_max).concat(line_out.slice(0, index_min + 1));
				}

				temp_line = _closeByOutline(temp_line, items_new);

				// var p_first_new = items_new[0],
				// 	p_end_new = items_new[items_new.length - 1];
				// var x_p_first_new = p_first_new.x,
				// 	y_p_first_new = p_first_new.y,
				// 	x_p_end_new = p_end_new.x,
				// 	y_p_end_new = p_end_new.y;

				// if (_getDis(x_p_first, y_p_first, x_p_first_new, y_p_first_new) <
				// 	_getDis(x_p_first, y_p_first, x_p_end_new, y_p_end_new)) {
				// 	items_new.reverse();
				// }
				// temp_line = temp_line.concat(items_new);
				temp_line.push(temp_line[0]);
				temp_line.k = k;
				arr_return.push(temp_line);
			}
		}
		return arr_return;
	}
	module.exports = {
		getArea: _getArea,
		splitPolygonByLine: _splitPolygonByLine,
		splitPolygonsByLines: _splitPolygonsByLines,
		isClosed: _isClosed,
		getBound: _getBound,
		isBoundInBound: _isBoundInBound,
		smoothItems: _smoothItems,
		groupLines: _groupLines,
		linkLines: _linkLines
	}
}()