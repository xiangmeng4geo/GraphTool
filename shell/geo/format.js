var fs = require('fs'),
	path = require('path');
var util = require('./util');

var DIS_MIN_SQUART = Math.pow(0.005, 2);
function parseData(data, file_path){
	var added_point_num = total_point_num = 0;
	var arc_arr = data.arc_arr;
	// arc_arr.forEach(function(v, i){
	// 	console.log(i, v);
	// })
	console.log(arc_arr[0]);
	return;
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
		// console.log(len, '->', new_arc.length);return;
		arc_arr_new[i] = new_arc;
	});
	data.arc_arr = arc_arr_new;
	console.log(total_point_num, added_point_num);
	// arc_arr_new.forEach(function(v, i){
	// 	console.log(i, v);
	// })
	// return;
	reback(data, file_path);
}
// 还原数据
function reback(data, file_path){
	var reback_file_path = file_path+'.reback.json';

	var arc_cache = data.arc_cache;
	var arc_arr = data.arc_arr;
	// arc_arr.forEach(function(v){
	// 	console.log(v);
	// })
	// return;
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
		v.areas.forEach(function(area){
			var items = [];
			area.forEach(function(arc_index){console.log(arc_arr[arc_index].length);
				items = items.concat(arc_arr[arc_index]);
			});
			num += items.length;
			new_areas.push(items);
		});
		var is_multi = new_areas.length > 1;
		f.geometry.coordinates = is_multi? [[new_areas]]: [new_areas];
		features.push(f);
	});
	console.log(num);
	data_new.features = features;
	fs.writeFileSync(reback_file_path, JSON.stringify(data_new));
	console.log('write file', reback_file_path);
}
var TYPE_NATION = 1,
	TYPE_PROVINCE_ENDPOINT = 2,
	TYPE_PROVINCE_NODE = 3;
function format(file_path){
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
			console.log(1);
			var num_test = 0;
			// 对点的类型进行初始化
			var _cache_point = {};//保存点和面的对应关系
			var cachepoint_file_path = file_path+'.cachepoint.json';
			if(fs.existsSync(cachepoint_file_path)){
				_cache_point = require(cachepoint_file_path);
			}else{
				data_new.forEach(function(v, i){
					v.areas.forEach(function(v_area, i_area){
						v_area.forEach(function(v_area_items, i_items){
							var x = v_area_items[0],
								y = v_area_items[1],
								key = x+'_'+y;
							var _indexs = _cache_point[key] || (_cache_point[key] = []);
							
							var key = [i, i_area, i_items].join();
							var is_in = false;
							for(var _i_test = 0, _j_test = _indexs.length; _i_test<_j_test; _i_test++){
								if(key == _indexs[_i_test].join()){
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
				for(var i in _cache_point){
					var indexs = _cache_point[i];
					var len = indexs.length;
					var type;
					if(len == 1){
						type = TYPE_NATION;
					}else if(len > 2){
						type = TYPE_PROVINCE_ENDPOINT;
					}else{
						
					}
				}
				fs.writeFileSync(cachepoint_file_path, JSON.stringify(_cache_point));
			}
			console.log(12);
			// 把面拆成弧段数组
			var arc_arr = [];	//保存arc数据
			var arc_cache = {}; //保存arc索引关系
			data_new.forEach(function(v, i){
				v.areas.forEach(function(v_area, i_area){
					var endpoint_index = [];
					for(var i = 0, j = v_area.length; i<j; i++){
						var v_area_item = v_area[i];
						var key = v_area_item[0] + '_' + v_area_item[1];
						var areas_index = _cache_point[key];
						if(areas_index && areas_index.length >= 3){
							console.log(areas_index);
							endpoint_index.push(i);
						}
					}
					// console.log(endpoint_index);
					var len = endpoint_index.length;
					console.log(len, v_area.length, v_area.slice().length);
					var arcs = [];
					if(len == 0){
						arcs.push(v_area.slice());
					}else{
						var a = endpoint_index.slice();
						var index_start = endpoint_index.shift();
						if(index_start > 0){
							var arc_start = v_area.slice(0, index_start);
						}else{
							endpoint_index.unshift(0);
						}
						for(var i = 0, j = 1; i < len && j < len; i++, j = i+1){
							var i_s = endpoint_index[i],
								i_e = endpoint_index[j];
							arcs.push(v_area.slice(i_s, i_e));
						}
						if(arc_start){
							var arc_last = arcs[arcs.length-1];
							if(arc_last){
								arc_start.reverse();
								arc_start.unshift(0);
								arc_start.unshift(arc_last.length);
								arc_last.splice.apply(arc_last, arc_start);
							}else{
								arcs.push(arc_start);
							}
						}
					}
					var indexs = [];
					var len = arcs.length;
					if(len > 1){
						arcs.forEach(function(arc, i){
							var cache_key = null;
							if(len > 1){
								var p_start = arc[0],
									key_start = p_start[0] + '_' + p_start[1];
								var p_end = arcs[i + 1 < len?i+1: 0],
									key_end = p_end[0] + '_' + p_end[1];
								cache_key = key_start + '|' + key_end;
							}
							var index_cache = arc_cache[cache_key];
							if(index_cache !== undefined){
								indexs.push(index_cache);
							}else{
								// console.log(arc.length);
								var index = arc_arr.push(arc) - 1;
								indexs.push(index);
								arc_cache[cache_key] = index;
							}
						});
					}else{
						var index = arc_arr.push(arcs[0]) - 1;
						indexs.push(index);
					}
					
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
		}
	});
}

format('./data-source/china_province.json');