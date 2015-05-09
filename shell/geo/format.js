var fs = require('fs'),
	path = require('path');
var util = require('./util');

var DIS_MIN_SQUART = Math.pow(0.05, 2);
function parseData(data, file_path, save_path){
	var added_point_num = total_point_num = 0;
	var arc_arr = data.arc_arr;
	var arc_arr_new = [];
	arc_arr.forEach(function(arc, i){
		var len = arc.length;
		var added_point = arc.shift();
		var new_arc = [added_point];
		var tmp = null;
		while((tmp = arc.shift())){
			var dis_squart = Math.pow(added_point[0] - tmp[0], 2) + Math.pow(added_point[1] - tmp[1], 2);
			// console.log(added_point, tmp, dis_squart, DIS_MIN_SQUART);
			if(dis_squart >= DIS_MIN_SQUART){
				added_point = tmp;
				new_arc.push(added_point);
				added_point_num++;
			}
			total_point_num++;
		}
		arc_arr_new[i] = new_arc;
	});
	data.arc_arr = arc_arr_new;
	console.log('total_point_num = '+total_point_num, ',added_point_num = '+added_point_num);
	reback(data, file_path, save_path);
}
function _get_cityname(name){
	if(name){
		return name.replace(/(壮族|回族|维吾尔)?(省|市|自治区|特别行政区)/,'');
	}
}
function _getSrcSize(areas){
	var min_x = min_y = Number.MAX_VALUE,
		max_x = max_y = Number.MIN_VALUE;

	areas.forEach(function(items){
		items.forEach(function(v){
			var x = v[0],
				y = v[1];
			if(min_x > x){
				min_x = x;
			}
			if(max_x < x){
				max_x = x;
			}
			if(min_y > y){
				min_y = y;
			}
			if(max_y < y){
				max_y  = y;
			}
		});
	});
	return {
		width: max_x - min_x,
		height: max_y - min_y,
		left: min_x,
		top: max_y
	}
}
// 还原数据
function reback(data, file_path, save_path){
	var province_pos = require('./lnglat.json');
	var reback_file_path = file_path+'.reback.json';

	var arc_cache = data.arc_cache;
	var arc_arr = data.arc_arr;
	var data_new = {
		"type": "FeatureCollection",
		"crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
		"features": [],
		"srcSize":{"left":73.5,"top":53.56,"width":61.59,"height":35.4}
	};

	var data_source = require(file_path);
	var features_source = data_source.features;
	var features = [];
	var num = 0;
	data.data.forEach(function(v, i){
		var f = features_source[i];
		var new_areas = [];
		v.areas.forEach(function(area, i_area){
			// if(!(i == 0 && (i_area <= 10))){
			// 	return;
			// }
			var items = [];
			// console.log(area, i, i_area);
			area.forEach(function(arc_index){
				var points = arc_arr[arc_index.index].slice();
				// console.log(points.length, arc_index.dir)
				if(arc_index.dir == -1){
					points.reverse();
				}
				items = items.concat(points);
			});
			num += items.length;

			new_areas.push(items);
		});
		var is_multi = new_areas.length > 1;
		var prov_code = f.properties.PROV_CODE;
		new_areas.sort(function(a, b){
			return b.length - a.length;
		});
		new_areas = new_areas.slice(0, 460000 == prov_code?1:5); //对海南和小岛屿进行处理
		
		f.geometry.coordinates = is_multi? [new_areas]: new_areas;
		var properties = f.properties;
		var name = properties['NAME'],
			cname = properties['CAPNAME'],
			prov_code = properties['PROV_CODE'];
		name = _get_cityname(name);
		var new_properties = {
			name: name, 
			cname: _get_cityname(cname), 
			prov_code: prov_code, 
			cp: province_pos[name],
			srcSize: _getSrcSize(new_areas)
		};
		f.properties = new_properties;
		features.push(f);
	});
	data_new.features = features;
	fs.writeFileSync(reback_file_path, JSON.stringify(data_new));
	console.log('write file', reback_file_path);
	
	fs.writeFileSync(save_path, JSON.stringify(data_new));
	console.log('write file', save_path);
}
var TYPE_NATION = 1,
	TYPE_PROVINCE_ENDPOINT = 2,
	TYPE_PROVINCE_NODE = 3;
function format(file_path, save_path){
	var data_file_path = file_path+'.data.json';
	// if(fs.existsSync(data_file_path)){
	// 	var data = require(data_file_path);
	// 	parseData(data, file_path);
	// 	return;
	// }
	fs.readFile(file_path, {
		encoding: 'utf8'
	}, function(err, data){
		if(err){
			console.log(err);
		}else{
			data = JSON.parse(data);
			
			var data_new = [];
			function pushArr(arr, item){
				var area = util.getArea(item);
				// 保证全部逆时针
				if(area > 0){
					item.reverse();
				}
				item.area = Math.abs(area);
				arr.push(item);
			}
			data.features.forEach(function(v, i){
				var geo = v.geometry;
				var coordinates = geo.coordinates;
				var areas = [];
				if(geo.type == 'MultiPolygon'){
					coordinates.forEach(function(v_coor){
						pushArr(areas, v_coor[0]);
					});
				}else if(geo.type == 'Polygon'){
					pushArr(areas, coordinates[0]);
				}
				data_new.push({
					index: i, 
					areas: areas
				});
			});
			// data_new = data_new.splice(0, 3);
			fs.writeFileSync(file_path+'.newdata.json', JSON.stringify(data_new));
			var num_test = 0;
			// 对点的类型进行初始化
			var _cache_point = {};//保存点和面的对应关系
			var cachepoint_file_path = file_path+'.cachepoint.json';
			if(false && fs.existsSync(cachepoint_file_path)){
				_cache_point = require(cachepoint_file_path);
			}else{
				data_new.forEach(function(v, i){
					v.areas.forEach(function(v_area, i_area){
						v_area.forEach(function(v_area_items, i_items){
							var x = v_area_items[0],
								y = v_area_items[1],
								key = x+'_'+y;
							
							var _indexs = _cache_point[key] || (_cache_point[key] = []);
							
							var key_area = [i, i_area].join();
							var is_in = false;
							
							for(var _i_test = 0, _j_test = _indexs.length; _i_test<_j_test; _i_test++){
								if(key_area == _indexs[_i_test].slice(0, 2).join()){
									is_in = true;
									break;
								}
							}
							if(!is_in){
								_indexs.push([i, i_area, i_items]);
							}
						});
					});
				});
				// 在这里判断点左右的是不是拥有一样的面关系即可得到这个是不是一个端点
				//!!!!!
				function _getIndexKey(cache_key){
					var indexs = _cache_point[cache_key];
					var val = [];
					indexs.forEach(function(v){
						val.push(v.slice(0, 2).join());
					});
					return val.join('|');
				}
				var num_total = 0,
					num_endpoint = 0,
					num_endpoint_1 = 0;
				for(var i in _cache_point){
					num_total++;
					var indexs = _cache_point[i];
					var len = indexs.length;
					var type;
					if(len <= 1){
						type = TYPE_NATION;
					}else if(len > 2){
						type = TYPE_PROVINCE_ENDPOINT;
						num_endpoint++;
					}else{
						var info = indexs[0];
						var a = info[0],
							b = info[1],
							c = info[2];
						var area = data_new[a].areas[b];
						var len_area = area.length;
						var c_prev = c - 1 < 0? len_area - 1: c - 1,
							c_next = c + 1 < len_area? c + 1: 0;

						var p_prev = area[c_prev],
							key_prev = p_prev.join('_'),
							p_next = area[c_next],
							key_next = p_next.join('_');

						var indexs_prev = _getIndexKey(key_prev),
							indexs_next = _getIndexKey(key_next);

						var key = indexs_prev + '|' + indexs_next;

						var info = indexs[1];
						var a = info[0],
							b = info[1],
							c = info[2];
						var area = data_new[a].areas[b];
						var len_area = area.length;
						var c_prev = c - 1 < 0? len_area - 1: c - 1,
							c_next = c + 1 < len_area? c + 1: 0;
						var p_prev = area[c_prev],
							key_prev = p_prev.join('_'),
							p_next = area[c_next],
							key_next = p_next.join('_');

						var indexs_prev = _getIndexKey(key_prev),
							indexs_next = _getIndexKey(key_next);

						if(indexs_prev+'|' + indexs_next == key ||
						   indexs_next+'|' + indexs_prev == key){
							type = TYPE_PROVINCE_NODE;
						}else{
							type = TYPE_PROVINCE_ENDPOINT;
							num_endpoint++;
						}
					}
					_cache_point[i].type = type;
				}
				console.log('num_total = ',num_total, ',num_endpoint = ', num_endpoint);
				fs.writeFileSync(cachepoint_file_path, JSON.stringify(_cache_point));
			}
			var data_endpoint = [];
			for(var i in _cache_point){
				var p = _cache_point[i];
				if(p.type == TYPE_PROVINCE_ENDPOINT){
					var arr = i.split('_');
					data_endpoint.push({
						lng: arr[0],
						lat: arr[1],
						len: _cache_point[i]
					});
				}
			}
			fs.writeFileSync( file_path+'.endpoint.json', JSON.stringify(data_endpoint));
			console.log('write', file_path+'.endpoint.json');
			// 把面拆成弧段数组
			var arc_arr = [];	//保存arc数据
			var arc_cache = {}; //保存arc索引关系
			data_new.forEach(function(v, i_data){
				v.areas.forEach(function(v_area, i_area){
					var flag_test = (i_data == 0 && (i_area < 10));
					// if(!flag_test){
					// 	return;
					// }
					var endpoint_index = [];
					for(var i = 0, j = v_area.length; i<j; i++){
						var v_area_item = v_area[i];
						var key = v_area_item[0] + '_' + v_area_item[1];
						var areas_index = _cache_point[key];
						if(areas_index.type == TYPE_PROVINCE_ENDPOINT){
							endpoint_index.push(i);
						}
					}
					// if(flag_test){
					// 	console.log('endpoint_index', endpoint_index);
					// }
					// console.log('endpoint_index', endpoint_index);
					var len = endpoint_index.length;
					// console.log(len, v_area.length, v_area.slice().length);
					var arcs = [];
					if(len == 0){
						arcs.push(v_area.slice());
					}else{
						// console.log('endpoint_index', endpoint_index);
						// var a = endpoint_index.slice();
						var index_start = endpoint_index[0];
						if(index_start > 0){
							var arc_start = v_area.slice(0, index_start+1);
							// console.log(1);
						}
						for(var i = 0, j = endpoint_index.length; i<j; i++){
							var i_s = endpoint_index[i],
								i_e = endpoint_index[i+1];
							if(i_e !== undefined){
								i_e += 1;
							}
							var arc = v_area.slice(i_s, i_e);
							// console.log(_cache_point[arc[0].join('_')].type == TYPE_PROVINCE_ENDPOINT,
							// 		_cache_point[arc[arc.length-1].join('_')].type == TYPE_PROVINCE_ENDPOINT, i, j);
							// console.log(2, i_s, i_e);
							arcs.push(arc);
						}
						if(arc_start){
							// arc_start.reverse();
							var arc_last = arcs[arcs.length-1];
							if(arc_last && arc_last.length > 0){
								if(_cache_point[arc_last[arc_last.length-1].join('_')].type == TYPE_PROVINCE_ENDPOINT){
									arcs.push(arc_start);
								}else{
									arc_last = arc_last.concat(arc_start);
									arcs[arcs.length-1] = arc_last;
								}
							}else{
								arcs.push(arc_start);
							}
						}
					}
					
					var indexs = [];
					arcs.forEach(function(arc, i){
						var key_start = arc[0].join('_'),
							key_end = arc[arc.length-1].join('_');
						var key = key_start + '|' + key_end;
						var index_cache = arc_cache[key];
						if(index_cache !== undefined){
							indexs.push({
								index: index_cache,
								dir: 1
							});
						}else{
							index_cache = arc_cache[key_end + '|' + key_start];
							if(index_cache !== undefined){
								indexs.push({
									index: index_cache,
									dir: -1
								});
							}else{
								var index = arc_arr.push(arc) - 1;
								arc_cache[key] = index;
								indexs.push({
									index: index,
									dir: 1
								});
							}
						}
					});
					v.areas[i_area] = indexs;
				});
			});

			var data_parse = {
				data: data_new,
				arc_arr: arc_arr,
				arc_cache: arc_cache,
				cache_point: _cache_point
			};
			fs.writeFileSync(data_file_path, JSON.stringify(data_parse));
			console.log('write file', data_file_path);
			parseData(data_parse, file_path, save_path);
		}
	});
}

format('./data-source/china_province.json', '../../core/data/china.json');