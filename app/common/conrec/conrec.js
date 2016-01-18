!function() {
	var Conrec = (function() {
		var EPSILON = 1e-20;

		var pointsEqual = function(a, b) {
			var x = a.x - b.x,
				y = a.y - b.y;
			return x * x + y * y < EPSILON;
		}

		var reverseList = function(list) {
			var pp = list.head;

			while (pp) {
				// swap prev/next pointers
				var temp = pp.next;
				pp.next = pp.prev;
				pp.prev = temp;

				// continue through the list
				pp = temp;
			}

			// swap head/tail pointers
			var temp = list.head;
			list.head = list.tail;
			list.tail = temp;
		}

		var ContourBuilder = function(level) {
			this.level = level;
			this.s = null;
			this.count = 0;
		}
		ContourBuilder.prototype.remove_seq = function(list) {
			// if list is the first item, static ptr s is updated
			if (list.prev) {
				list.prev.next = list.next;
			} else {
				this.s = list.next;
			}

			if (list.next) {
				list.next.prev = list.prev;
			}
			--this.count;
		}
		ContourBuilder.prototype.addSegment = function(a, b) {
			var ss = this.s;
			var ma = null;
			var mb = null;
			var prependA = false;
			var prependB = false;

			while (ss) {
				if (ma == null) {
					// no match for a yet
					if (pointsEqual(a, ss.head.p)) {
						ma = ss;
						prependA = true;
					} else if (pointsEqual(a, ss.tail.p)) {
						ma = ss;
					}
				}
				if (mb == null) {
					// no match for b yet
					if (pointsEqual(b, ss.head.p)) {
						mb = ss;
						prependB = true;
					} else if (pointsEqual(b, ss.tail.p)) {
						mb = ss;
					}
				}
				// if we matched both no need to continue searching
				if (mb != null && ma != null) {
					break;
				} else {
					ss = ss.next;
				}
			}

			// c is the case selector based on which of ma and/or mb are set
			var c = ((ma != null) ? 1 : 0) | ((mb != null) ? 2 : 0);

			console.log(ma && ma.closed ?'Y':'', mb && mb.closed ?'Y':'');
			switch (c) {
				case 0: // both unmatched, add as new sequence
					var aa = {
						p: a,
						prev: null
					};
					var bb = {
						p: b,
						next: null
					};
					aa.next = bb;
					bb.prev = aa;

					// create sequence element and push onto head of main list. The order
					// of items in this list is unimportant
					ma = {
						head: aa,
						tail: bb,
						next: this.s,
						prev: null,
						closed: false
					};
					if (this.s) {
						this.s.prev = ma;
					}
					this.s = ma;

					++this.count; // not essential - tracks number of unmerged sequences
					break;

				case 1: // a matched, b did not - thus b extends sequence ma
					var pp = {
						p: b
					};

					if (prependA) {
						pp.next = ma.head;
						pp.prev = null;
						ma.head.prev = pp;
						ma.head = pp;
					} else {
						pp.next = null;
						pp.prev = ma.tail;
						ma.tail.next = pp;
						ma.tail = pp;
					}
					break;

				case 2: // b matched, a did not - thus a extends sequence mb
					var pp = {
						p: a
					};

					if (prependB) {
						pp.next = mb.head;
						pp.prev = null;
						mb.head.prev = pp;
						mb.head = pp;
					} else {
						pp.next = null;
						pp.prev = mb.tail;
						mb.tail.next = pp;
						mb.tail = pp;
					}
					break;

				case 3: // both matched, can merge sequences
					// if the sequences are the same, do nothing, as we are simply closing this path (could set a flag)

					if (ma === mb) {
						var pp = {
							p: ma.tail.p,
							next: ma.head,
							prev: null
						};
						ma.head.prev = pp;
						ma.head = pp;
						ma.closed = true;
						break;
					}

					// there are 4 ways the sequence pair can be joined. The current setting of prependA and
					// prependB will tell us which type of join is needed. For head/head and tail/tail joins
					// one sequence needs to be reversed
					switch ((prependA ? 1 : 0) | (prependB ? 2 : 0)) {
						case 0: // tail-tail
							// reverse ma and append to mb
							reverseList(ma);
							// fall through to head/tail case
						case 1: // head-tail
							// ma is appended to mb and ma discarded
							mb.tail.next = ma.head;
							ma.head.prev = mb.tail;
							mb.tail = ma.tail;

							//discard ma sequence record
							this.remove_seq(ma);
							break;

						case 3: // head-head
							// reverse ma and append mb to it
							reverseList(ma);
							// fall through to tail/head case
						case 2: // tail-head
							// mb is appended to ma and mb is discarded
							ma.tail.next = mb.head;
							mb.head.prev = ma.tail;
							ma.tail = mb.tail;

							//discard mb sequence record
							this.remove_seq(mb);
							break;
					}
			}
		}

		/**
		 * Implements CONREC.
		 *
		 * @param {function} drawContour function for drawing contour.  Defaults to a
		 *                               custom "contour builder", which populates the
		 *                               contours property.
		 */
		var Conrec = function(drawContour) {
			if (!drawContour) {
				var c = this;
				c.contours = {};
				/**
				 * drawContour - interface for implementing the user supplied method to
				 * render the countours.
				 *
				 * Draws a line between the start and end coordinates.
				 *
				 * @param startX    - start coordinate for X
				 * @param startY    - start coordinate for Y
				 * @param endX      - end coordinate for X
				 * @param endY      - end coordinate for Y
				 * @param contourLevel - Contour level for line.
				 */
				this.drawContour = function(startX, startY, endX, endY, contourLevel, k) {
					// console.log(startX, startY, endX, endY, contourLevel, k);
					var cb = c.contours[k];
					if (!cb) {
						cb = c.contours[k] = new ContourBuilder(contourLevel);
					}
					cb.addSegment({
						x: startX,
						y: startY
					}, {
						x: endX,
						y: endY
					});
				}
				this.contourList = function() {
					var l = [];
					var a = c.contours;
					for (var k in a) {
						var s = a[k].s;
						var level = a[k].level;
						while (s) {
							var h = s.head;
							var l2 = [];
							l2.level = level;
							l2.k = k;
							while (h && h.p) {
								l2.push(h.p);
								h = h.next;
							}
							l.push(l2);
							s = s.next;
						}
					}
					l.sort(function(a, b) {
						return b.k - a.k
					});
					return l;
				}
			} else {
				this.drawContour = drawContour;
			}
			this.h = new Array(5);
			this.sh = new Array(5);
			this.xh = new Array(5);
			this.yh = new Array(5);
		}

		/**
		 * contour is a contouring subroutine for rectangularily spaced data
		 *
		 * It emits calls to a line drawing subroutine supplied by the user which
		 * draws a contour map corresponding to real*4data on a randomly spaced
		 * rectangular grid. The coordinates emitted are in the same units given in
		 * the x() and y() arrays.
		 *
		 * Any number of contour levels may be specified but they must be in order of
		 * increasing value.
		 *
		 *
		 * @param {number[][]} d - matrix of data to contour
		 * @param {number} ilb,iub,jlb,jub - index bounds of data matrix
		 *
		 *             The following two, one dimensional arrays (x and y) contain
		 *             the horizontal and vertical coordinates of each sample points.
		 * @param {number[]} x  - data matrix column coordinates
		 * @param {number[]} y  - data matrix row coordinates
		 * @param {number} nc   - number of contour levels
		 * @param {number[]} z  - contour levels in increasing order.
		 */
		Conrec.prototype.contour = function(d, ilb, iub, jlb, jub, x, y, nc, z) {
			var h = this.h,
				sh = this.sh,
				xh = this.xh,
				yh = this.yh;
			var drawContour = this.drawContour;
			this.contours = {};

			/** private */
			var xsect = function(p1, p2) {
				return (h[p2] * xh[p1] - h[p1] * xh[p2]) / (h[p2] - h[p1]);
			}

			var ysect = function(p1, p2) {
				return (h[p2] * yh[p1] - h[p1] * yh[p2]) / (h[p2] - h[p1]);
			}

			var m1;
			var m2;
			var m3;
			var case_value;
			var dmin;
			var dmax;
			var x1 = 0.0;
			var x2 = 0.0;
			var y1 = 0.0;
			var y2 = 0.0;

			// The indexing of im and jm should be noted as it has to start from zero
			// unlike the fortran counter part
			var im = [0, 1, 1, 0];
			var jm = [0, 0, 1, 1];

			// Note that castab is arranged differently from the FORTRAN code because
			// Fortran and C/C++ arrays are transposed of each other, in this case
			// it is more tricky as castab is in 3 dimensions
			var castab = [
				[
					[0, 0, 8],
					[0, 2, 5],
					[7, 6, 9]
				],
				[
					[0, 3, 4],
					[1, 3, 1],
					[4, 3, 0]
				],
				[
					[9, 6, 7],
					[5, 2, 0],
					[8, 0, 0]
				]
			];

			var LEVEL_DEFAUTL = -4;
			var K_DEFAULT = -2;
			function _isDefault (v) {
				return v == LEVEL_DEFAUTL;
			}
			function _xsect(x1, v1, x2, v2, k) {
				return (k - v1)/(v2 - v1)* (x2 - x1) + x1;
			}
			function _ysect(y1, v1, y2, v2, k) {
				return (k - v1)/(v2 - v1)* (y2 - y1) + y1;
			}
			// function _sect(x1, v1, x2, v2, k) {
			// 	if (_isDefault(v1) || _isDefault(v2)) {
			// 		return (x1 + x2) / 2;
			// 	}
			// 	return (k - v1)/(v2 - v1)* (x2 - x1) + x1;
			// }
			function _sect(x1, v1, x2, v2, v) {
				if (_isDefault(v1) || _isDefault(v2)) {
					return (x1 + x2) / 2;
				}
				var h1 = v1 - v,
					h2 = v2 -v;
				return (h2*x1 - h1*x2)/(h2 - h1);
			}
			function _sectByPoint(p1, p2, v) {
				var v1 = p1.v,
					v2 = p2.v;
				var x = _sect(p1.x, v1, p2.x, v2, v),
					y = _sect(p1.y, v1, p2.y, v2, v);

				return {
					x: x,
					y: y,
					v: v
				}	
			}
			function _checkBetween(p1, p2, v) {
				var v1 = p1.v,
					v2 = p2.v;
				if (_isDefault(v1) || _isDefault(v2)) {
					return true;
				}
				return v >= Math.min(v1, v2) && v <= Math.max(v1, v2);
			}
			function _drawLevel (line1, line2, is_draw_default) {
				var p1 = line1.p1,
					p2 = line1.p2,
					p3 = line2.p1,
					p4 = line2.p2;
				var v1 = line1.v,
					v2 = line2.v;
					
				if (is_draw_default) {
					var p1_new = _sectByPoint(p1, p2, LEVEL_DEFAUTL),
						p2_new = _sectByPoint(p3, p4, LEVEL_DEFAUTL);
					_drawDefaultLineByPoint(p1_new, p2_new);
				}
				for (var k = 0; k < nc; k++) {
					var _level = z[k];

					if (_checkBetween(p1, p2, _level) && _checkBetween(p3, p4, _level)) {
						var p1_new = _sectByPoint(p1, p2, _level),
							p2_new = _sectByPoint(p3, p4, _level);

						_drawLineByPoint(p1_new, p2_new, k);
					}
				}
			}
			function _drawLineByPoint(p1, p2, index) {
				index = index || 0;
				var x1 = p1.x,
					x2 = p2.x,
					y1 = p1.y,
					y2 = p2.y;
				_drawLine(x1, y1, x2, y2, index);
			}
			var _arr_cache_data = [];
			function _drawLine(x1, y1, x2, y2, index) {
				// console.log(x1, y1, x2, y2, index);
				_arr_cache_data.push(arguments);
				// drawContour(x1, y1, x2, y2, z[index] || index, index);
			}
			function _parse_cache_data() {
				for (var i = 0, j = _arr_cache_data.length; i<j; i++) {
					var item = _arr_cache_data[i];
					var x1 = item[0],
						y1 = item[1],
						x2 = item[2],
						y2 = item[3],
						index = item[4];
					var flag = false;
					if (index == K_DEFAULT) {
						flag = true;
					} else {
						var index1 = _get_k_from_cache(x1, y1);
						var index2 = _get_k_from_cache(x2, y2);
						if ((index1 == undefined && index2 == undefined) || (index == index1 || index == index2)) {
							flag = true;
						}	
					}
					if (flag) {
						drawContour(x1, y1, x2, y2, z[index] || index, index);
					}
				}
			}
			function _drawDefaultLineByPoint(p1, p2) {
				_drawLineByPoint(p1, p2, K_DEFAULT);
			}
			var _cache_normal = {};
			function _add_cache_normal(x1, y1, x2, y2, level, k) {
				var k1 = x1+'_'+y1,
					k2 = x2+'_'+y2;

				_cache_normal[k1] = k;
				_cache_normal[k2] = k;
			}
			function _get_k_from_cache(x, y) {
				return _cache_normal[x+'_'+y];
			}
			for (var j = (jub - 1); j >= jlb; j--) {
				for (var i = ilb; i <= iub - 1; i++) {
					var _a = d[i][j],
						_b = d[i][j + 1],
						_c = d[i + 1][j],
						_d = d[i + 1][j + 1];

					var _arr = [];
					var _cache_v = {};
					var _len_unique = 0;
					[_a, _b, _c, _d].forEach(function(_v) {
						if (!_isDefault(_v)) {
							_arr.push(_v);
							if (_cache_v[_v]) {
								_cache_v[_v]++;
							} else {
								_len_unique++;
								_cache_v[_v] = 1;
							}
						}
					});
					var _len_arr = _arr.length;
					var dmin = Math.min.apply(Math, _arr);
					var dmax = Math.max.apply(Math, _arr);
					// 这里处理有默认值的情况
					if (_len_arr >= 0 &&_len_arr <= 3) {
						if (_len_arr == 0) {
							continue;
						}

					  //      A 	
					  //   a ---- c
					  //   |	  |
					  // D |	  | B
					  //   |      |
					  //   b ---- d
					  //      C
						var _is_default_a = _isDefault(_a),
							_is_default_b = _isDefault(_b),
							_is_default_c = _isDefault(_c),
							_is_default_d = _isDefault(_d);


						var index_x_a = i, index_y_a = i,
							index_x_b = i, index_y_b = i + 1,
							index_x_c = i+1, index_y_c = i,
							index_x_d = i+1, index_y_d = i+1;

						var x_min = x[i],
							x_max = x[i+1],
							y_min = y[j],
							y_max = y[j+1];

						var x_a = x_min, y_a = y_min,
							x_b = x_min, y_b = y_max,
							x_c = x_max, y_c = y_min,
							x_d = x_max, y_d = y_max;

						var p_a = {
							x: x_a,
							y: y_a,
							v: _a
						}, p_b = {
							x: x_b,
							y: y_b,
							v: _b
						}, p_c = {
							x: x_c,
							y: y_c,
							v: _c
						}, p_d = {
							x: x_d,
							y: y_d,
							v: _d
						};
						var line_A = {
							p1: p_a,
							p2: p_c
						}, line_B = {
							p1: p_c,
							p2: p_d
						}, line_C = {
							p1: p_b,
							p2: p_d
						}, line_D = {
							p1: p_a,
							p2: p_b
						};

						// if (_len_arr != 2) {
						// 	continue;
						// }
						switch(_len_arr) {
							case 1:
								var _line_one, _line_two;
								if (!_is_default_a) {
									_line_one = line_A;
									_line_two = line_D;
								} else if (!_is_default_b) {
									_line_one = line_C;
									_line_two = line_D;
								} else if (!_is_default_c) {
									_line_one = line_A;
									_line_two = line_B;
								} else if (!_is_default_d) {
									_line_one = line_B;
									_line_two = line_C;
								}

								_drawLevel(_line_one, _line_two, true);
								break;
							case 2:
								var _flag_one = _is_default_a && _is_default_d,
									_flag_two = _is_default_b && _is_default_c;
								
								// 对向有值
								if (_flag_one || _flag_two) {
									if ((_len_unique == 1 && _flag_one) || (_len_unique == 2 && _flag_two)) {
										_drawLevel(line_A, line_D, true);
										_drawLevel(line_B, line_C, true);
									} else {
										_drawLevel(line_A, line_B, true);
										_drawLevel(line_D, line_C, true);	
									}
								} else {
									// 上下分布
									if (_is_default_a != _is_default_b) {
										_drawLevel(line_B, line_D, true);

										if (_is_default_a) {
											_drawLevel(line_B, line_C);
											_drawLevel(line_C, line_D);
										} else {
											_drawLevel(line_A, line_B);
											_drawLevel(line_B, line_D);
										}
									} else {
										_drawLevel(line_A, line_C, true);
										if (_is_default_a) {
											_drawLevel(line_A, line_B);
											_drawLevel(line_C, line_B);
										} else {
											_drawLevel(line_A, line_D);
											_drawLevel(line_C, line_D);
										}
									}
								}
								break;
							case 3:
								var _line_one, _line_two;
								if (_is_default_a) {
									_line_one = line_A;
									_line_two = line_D;
								} else if (_is_default_b) {
									_line_one = line_C;
									_line_two = line_D;
								} else if (_is_default_c) {
									_line_one = line_A;
									_line_two = line_B;
								} else if (_is_default_d) {
									_line_one = line_B;
									_line_two = line_C;
								}

								_drawLevel(_line_one, _line_two, true);

								if (_len_unique == 2) {
									var _arr_line_group = [];
									if (_is_default_a) {
										if (_c == _d) {
											_arr_line_group.push([line_A, line_D]);
											_arr_line_group.push([line_C, line_D]);
										} else if (_d == _b) {
											_arr_line_group.push([line_B, line_D]);
											_arr_line_group.push([line_A, line_B]);
										} else if (_c == _b) {
											_arr_line_group.push([line_B, line_C]);
										}
									} else if (_is_default_b) {
										if (_a == _c) {
											_arr_line_group.push([line_B, line_D]);
											_arr_line_group.push([line_C, line_D]);
										} else if (_a == _d) {
											_arr_line_group.push([line_A, line_B]);
										} else if (_c == _b) {
											_arr_line_group.push([line_A, line_C]);
											_arr_line_group.push([line_A, line_D]);
										}
									} else if (_is_default_c) {
										if (_a == _b) {
											_arr_line_group.push([line_A, line_C]);
											_arr_line_group.push([line_B, line_C]);
										} else if (_a == _d) {
											_arr_line_group.push([line_C, line_D]);
										} else if (_c == _b) {
											_arr_line_group.push([line_B, line_D]);
											_arr_line_group.push([line_A, line_D]);
										}
									} else if (_is_default_d) {
										if (_a == _c) {
											_arr_line_group.push([line_B, line_D]);
											_arr_line_group.push([line_D, line_C]);
										} else if (_a == _b) {
											_arr_line_group.push([line_A, line_C]);
											_arr_line_group.push([line_A, line_B]);
										} else if (_c == _b) {
											_arr_line_group.push([line_A, line_D]);
										}
									}
									_arr_line_group.forEach(function(v) {
										_drawLevel(v[0], v[1]);
									});
								} else if (_len_unique == 3) {
									var _arr_line_group = [];
									if (_is_default_a) {
										_arr_line_group.push([line_A, line_B]);
										_arr_line_group.push([line_B, line_C]);
										_arr_line_group.push([line_C, line_D]);
									} else if (_is_default_b) {
										_arr_line_group.push([line_A, line_B]);
										_arr_line_group.push([line_B, line_C]);
										_arr_line_group.push([line_D, line_A]);
									} else if (_is_default_c) {
										_arr_line_group.push([line_B, line_C]);
										_arr_line_group.push([line_C, line_D]);
										_arr_line_group.push([line_D, line_A]);
									} else if (_is_default_d) {
										_arr_line_group.push([line_A, line_B]);
										_arr_line_group.push([line_C, line_D]);
										_arr_line_group.push([line_D, line_A]);
									}
									_arr_line_group.forEach(function(v) {
										_drawLevel(v[0], v[1]);
									});
								}
								break;
						}

						continue;
					}
					// var temp1, temp2;
					// temp1 = Math.min(_a, _b);
					// temp2 = Math.min(_c, _d);
					// dmin = Math.min(temp1, temp2);
					// temp1 = Math.max(_a, _b);
					// temp2 = Math.max(_c, _d);
					// dmax = Math.max(temp1, temp2);

					if (dmax >= z[0] && dmin <= z[nc - 1]) {
						for (var k = 0; k < nc; k++) {
							if (z[k] >= dmin && z[k] <= dmax) {
								for (var m = 4; m >= 0; m--) {
									if (m > 0) {
										// The indexing of im and jm should be noted as it has to
										// start from zero
										h[m] = d[i + im[m - 1]][j + jm[m - 1]] - z[k];
										xh[m] = x[i + im[m - 1]];
										yh[m] = y[j + jm[m - 1]];
									} else {
										h[0] = 0.25 * (h[1] + h[2] + h[3] + h[4]);
										xh[0] = 0.5 * (x[i] + x[i + 1]);
										yh[0] = 0.5 * (y[j] + y[j + 1]);
									}
									if (h[m] > 0.0) {
										sh[m] = 1;
									} else if (h[m] < 0.0) {
										sh[m] = -1;
									} else
										sh[m] = 0;
								}
								//
								// Note: at this stage the relative heights of the corners and the
								// centre are in the h array, and the corresponding coordinates are
								// in the xh and yh arrays. The centre of the box is indexed by 0
								// and the 4 corners by 1 to 4 as shown below.
								// Each triangle is then indexed by the parameter m, and the 3
								// vertices of each triangle are indexed by parameters m1,m2,and
								// m3.
								// It is assumed that the centre of the box is always vertex 2
								// though this isimportant only when all 3 vertices lie exactly on
								// the same contour level, in which case only the side of the box
								// is drawn.
								//
								//
								//      vertex 4 +-------------------+ vertex 3
								//               | \               / |
								//               |   \    m=3    /   |
								//               |     \       /     |
								//               |       \   /       |
								//               |  m=2    X   m=2   |       the centre is vertex 0
								//               |       /   \       |
								//               |     /       \     |
								//               |   /    m=1    \   |
								//               | /               \ |
								//      vertex 1 +-------------------+ vertex 2
								//
								//
								//
								//               Scan each triangle in the box
								//
								for (m = 1; m <= 4; m++) {
									m1 = m;
									m2 = 0;
									if (m != 4) {
										m3 = m + 1;
									} else {
										m3 = 1;
									}
									case_value = castab[sh[m1] + 1][sh[m2] + 1][sh[m3] + 1];
									if (case_value != 0) {
										switch (case_value) {
											case 1: // Line between vertices 1 and 2
												x1 = xh[m1];
												y1 = yh[m1];
												x2 = xh[m2];
												y2 = yh[m2];
												break;
											case 2: // Line between vertices 2 and 3
												x1 = xh[m2];
												y1 = yh[m2];
												x2 = xh[m3];
												y2 = yh[m3];
												break;
											case 3: // Line between vertices 3 and 1
												x1 = xh[m3];
												y1 = yh[m3];
												x2 = xh[m1];
												y2 = yh[m1];
												break;
											case 4: // Line between vertex 1 and side 2-3
												x1 = xh[m1];
												y1 = yh[m1];
												x2 = xsect(m2, m3);
												y2 = ysect(m2, m3);
												break;
											case 5: // Line between vertex 2 and side 3-1
												x1 = xh[m2];
												y1 = yh[m2];
												x2 = xsect(m3, m1);
												y2 = ysect(m3, m1);
												break;
											case 6: //  Line between vertex 3 and side 1-2
												x1 = xh[m3];
												y1 = yh[m3];
												x2 = xsect(m1, m2);
												y2 = ysect(m1, m2);
												break;
											case 7: // Line between sides 1-2 and 2-3
												x1 = xsect(m1, m2);
												y1 = ysect(m1, m2);
												x2 = xsect(m2, m3);
												y2 = ysect(m2, m3);
												break;
											case 8: // Line between sides 2-3 and 3-1
												x1 = xsect(m2, m3);
												y1 = ysect(m2, m3);
												x2 = xsect(m3, m1);
												y2 = ysect(m3, m1);
												break;
											case 9: // Line between sides 3-1 and 1-2
												x1 = xsect(m3, m1);
												y1 = ysect(m3, m1);
												x2 = xsect(m1, m2);
												y2 = ysect(m1, m2);
												break;
											default:
												break;
										}
										// Put your processing code here and comment out the printf
										//printf("%f %f %f %f %f\n",x1,y1,x2,y2,z[k]);
										_add_cache_normal(x1, y1, x2, y2, z[k], k);
										drawContour(x1, y1, x2, y2, z[k], k);
									}
								}
							}
						}
					}
				}
			}
			_parse_cache_data();
		}
		return Conrec;
	})();

	module.exports = Conrec;
}()