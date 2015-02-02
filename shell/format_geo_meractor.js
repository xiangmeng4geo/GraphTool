var fs = require('fs'),
	path = require('path');

function number_fixed(num,len){
	len || (len = 2);
	return Number(num.toFixed(len));
}

var radians = Math.PI / 180,
	degrees = 180 / Math.PI,
	px = 3800000;//转成px
	// px = 1;
var Mercator = (function(){
	var MERACTOR_RATIO = 20037508.34/180;
	/*Web墨卡托坐标与WGS84坐标互转*/
	var Meractor_cache_lnglat = {};// 进行缓存，减小重复计算量
	return {
		name: 'mercator',
		project: function(lnglat){
			var lng = lnglat.x;
			var lat = lnglat.y;
			var cache_name = lng+'_'+lat;
			var cache_val = Meractor_cache_lnglat[cache_name];
			if(cache_val){
				return cache_val;
			}
			var x = lng * MERACTOR_RATIO;
			var y = Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180);
			y = y * MERACTOR_RATIO;
			var val = {x: x/px,y: y/px};
			Meractor_cache_lnglat[cache_name] = val;
			return val;
		},
		invert: function(mercator){
			var x = mercator.x/MERACTOR_RATIO;
			var y = mercator.y/MERACTOR_RATIO;
			y = 180/Math.PI*(2*Math.atan(Math.exp(y*Math.PI/180))-Math.PI/2);
			return {x: x*px,y: y*px};
		}
	}
})();
var Albers = (function(){
	var pv = {};
	pv.radians = function(degrees) { return radians * degrees; };
	pv.degrees = function(radians) { return degrees * radians; };
	function albers(lat0, lng0, phi1, phi2) {
	    if (lat0 == undefined) lat0 = 23.0;  // Latitude_Of_Origin
	    if (lng0 == undefined) lng0 = -96.0; // Central_Meridian
	    if (phi1 == undefined) phi1 = 29.5;  // Standard_Parallel_1
	    if (phi2 == undefined) phi2 = 45.5;  // Standard_Parallel_2
	 
	    lat0 = pv.radians(lat0);
	    lng0 = pv.radians(lng0);
	    phi1 = pv.radians(phi1);
	    phi2 = pv.radians(phi2);
	 
	    var n = 0.5 * (Math.sin(phi1) + Math.sin(phi2)),
	        c = Math.cos(phi1),
	        C = c*c + 2*n*Math.sin(phi1),
	        p0 = Math.sqrt(C - 2*n*Math.sin(lat0)) / n;
	 
	    return {
	    	name: 'albers',
	        project: function(latlng) {
	            var theta = n * (pv.radians(latlng.x) - lng0),
	                p = Math.sqrt(C - 2*n*Math.sin(pv.radians(latlng.y))) / n;
	            var result = {
	                x: p * Math.sin(theta)/px,
	                y: p0 - p * Math.cos(theta)/px
	            };
	            return result;
	        },
	        invert: function(xy) {
	            var theta = Math.atan(xy.x / (p0 - xy.y)),
	                p = Math.sqrt(xy.x*xy.y + Math.pow(p0 - xy.y, 2));
	            return {
	                lng: pv.degrees(lon0 + theta/n),
	                lat: pv.degrees(Math.asin( (C - p*p*n*n) / (2*n)))
	            };
	        }
	    };
	}
	return albers(35, 105, 27, 45);
})();

var format = (function(){
	function formatDir(dir,format_path_fn){
		fs.readdir(dir, function(err, files) {
			if(err){
				return console.log(err);
			}

			files.forEach(function(item) {
				var tmpPath = path.join(dir, item);
				fs.stat(tmpPath, function(err1, stats) {
					if(err1){
						console.log(err1);
					}else{
						if (stats.isDirectory()) {
							formatDir(tmpPath,format_path_fn);
						}else{
							formatFile(tmpPath,format_path_fn);
						}
					}
				})
			});
		});
	}
	

	/*同步递归创建目录*/
	var mkdirSync = function(mkPath){
		var parentPath = path.dirname(mkPath);
		if(!fs.existsSync(parentPath)){
			mkdirSync(parentPath);
		}

		if(!fs.existsSync(mkPath)){
			fs.mkdirSync(mkPath);
		}
	}
	function saveData(content_info,save_file_path){
		if(typeof content_info != 'string'){
			content_info = JSON.stringify(content_info);
		}
		mkdirSync(path.dirname(save_file_path));
		fs.writeFile(save_file_path,content_info, {
			encoding: 'utf8'
		}, function(err){
			if(err){
				return console.log(err);
			}
			console.log(save_file_path,'save successfully!');
		});
	}
	var num_total = 0;
	function formatCoordinates(val, is_small_prov){
		var arr = [];
		var first_v = val[0];
		var min_x = max_x = first_v[0],
			min_y = max_y = first_v[1];
		var len = val.length;
		if(len < 200 && !is_small_prov){
			return;
		}
		val.forEach(function(v){
			var x = v[0],
				y = v[1];
			if(x < min_x){
				min_x = x;
			}
			if(y < min_y){
				min_y = y;
			}
			if(x > max_x){
				max_x = x;
			}
			if(y > max_y){
				max_y = y;
			}
			var val = global_projector.project({x: x, y: y});

			arr.push([val.x, val.y]);
		});
		
		return {
			arr: arr,
			min_x: min_x,
			min_y: min_y,
			max_x: max_x,
			max_y: max_y
		};
	}
	function _get_cityname(name){
		if(name){
			return name.replace(/(壮族|回族|维吾尔)?(省|市|自治区|特别行政区)/,'');
		}
	}
	var SPACE = 0.05,
		SPACE_SMALL = {
			'110000': 0.04, //北京
			'120000': 0.04, //天津
			'710000': 0.049,	//台湾
			'460000': 0.04, //海南
			'810000': 0.02,//香港
			'820000': 0.001	//澳门
		}; //这里控制过滤点之间距离，可能用这个参数出不同分辨率的地图数据
	function _scale(val, scale, small_prov_code){
		var newVal = [];

		var _space = SPACE_SMALL[small_prov_code] || SPACE;
		val.forEach(function(v, i){
			var x = v[0]*scale,
				y = v[1]*scale;
			var is_can_add = true;
			var len = newVal.length;
			if(len > 0){
				var before_val = newVal[len-1];
				var dis = Math.sqrt(Math.pow(before_val[0] - x, 2), Math.pow(before_val[1] - y, 2));

				if(dis < _space){
					is_can_add = false;
				}
			}
			if(is_can_add){
				newVal.push([number_fixed(x), number_fixed(y)]);
			}
		});
		var len = newVal.length;
		if(len < (_space == SPACE?200: 10)){
			return;
		}
		num_total += len;
		return newVal;
	}
	function _is_small_prov(properties){
		var prov_code = properties.prov_code;
		return prov_code == 820000 || prov_code == 810000 || prov_code == 710000;
	}
	function formatFile(file_path,format_path_fn){
		fs.readFile(file_path, {
			encoding: 'utf8'
		}, function(err,data){
			if(err){
				console.log(err);
			}else{
				var min_x_file = min_y_file = Number.MAX_VALUE,
					max_x_file = max_y_file = Number.MIN_VALUE;
				function getExtremum(val){
					if(val.min_x < min_x_file){
						min_x_file = val.min_x;
					}
					if(val.min_y < min_y_file){
						min_y_file = val.min_y;
					}
					if(val.max_x > max_x_file){
						max_x_file = val.max_x;
					}
					if(val.max_y > max_y_file){
						max_y_file = val.max_y;
					}
				}
				data = JSON.parse(data);
				var newData = {type: data.type,features: []};

				data.features.forEach(function(v,i){
					var properties = v.properties;
					var name = properties['NAME'],
						cname = properties['CAPNAME'],
						prov_code = properties['PROV_CODE'];
					var new_properties = {name: _get_cityname(name), cname: _get_cityname(cname), prov_code: prov_code};
					var _flag_is_small_prov = _is_small_prov(new_properties);

					var geometry = v.geometry;
					var type = geometry.type;
					
					var coordinates = [];
					if('Polygon' == type){
						geometry.coordinates.forEach(function(v_1){
							var val = formatCoordinates(v_1, _flag_is_small_prov);
							if(val){
								getExtremum(val);
								coordinates.push(val.arr);
							}
						});
					}else if('MultiPolygon' == type){
						geometry.coordinates.forEach(function(v_coordinates){
							var arr = [];
							v_coordinates.forEach(function(v_1){
								var val = formatCoordinates(v_1, _flag_is_small_prov);
								if(val){
									getExtremum(val);
									arr.push(val.arr);
								}
								
							});
							coordinates.push(arr);
						});
					}
					var geometry_meractor = {type: type,coordinates: coordinates};
					newData.features.push({
						type: v.type,
						geometry: geometry_meractor,
						properties: new_properties
					});
				});
				newData.projector = global_projector.name;

				newData.srcSize = {
					left: number_fixed(min_x_file),
					top: number_fixed(max_y_file),
					width: number_fixed(max_x_file - min_x_file),
					height: number_fixed(max_y_file - min_y_file)
				};
				var width_relative = 100;
				var px_size_china_left_top = global_projector.project({x: newData.srcSize.left, y: newData.srcSize.top}),
					px_size_china_right_bottom = global_projector.project({x: newData.srcSize.left+newData.srcSize.width, y: newData.srcSize.top-newData.srcSize.height});

				var px_size_china = {width: px_size_china_right_bottom.x - px_size_china_left_top.x,height: px_size_china_left_top.y - px_size_china_right_bottom.y};
			
				var scale = width_relative/px_size_china.width;
				newData.scale = scale;

				newData.features.forEach(function(v,i){
					var prov_code = v.properties.prov_code;
					var geometry = v.geometry;
					var type = geometry.type;
					
					var coordinates = [];
					if('Polygon' == type){
						var new_coordinates = [];
						geometry.coordinates.forEach(function(v_1, i_1){
							var v = _scale(v_1, scale, prov_code);
							v && new_coordinates.push(v);
						});
						geometry.coordinates = new_coordinates;
					}else if('MultiPolygon' == type){
						var new_coordinates_multi = [];
						geometry.coordinates.forEach(function(v_coordinates, i_coordinates){
							var new_coordinates = [];
							v_coordinates.forEach(function(v_1, i_1){
								var v = _scale(v_1, scale, prov_code);
								v && new_coordinates.push(v);
							});
							new_coordinates.length > 0 && new_coordinates_multi.push(new_coordinates);
						});
						geometry.coordinates = new_coordinates_multi;
					}
				});
				
				saveData(newData,format_path_fn(file_path));
				console.log(global_projector.name+' '+num_total+' points!');
			}
		});
	}
	return function(data_path,format_path_fn){
		data_path = path.normalize(data_path);
		fs.stat(data_path,function(err,stats){
			if(err){
				console.log(err);
			}else{
				if(stats.isDirectory()){
					formatDir(data_path,format_path_fn);
				}else{
					formatFile(data_path,format_path_fn);
				}
			}
		});
	}
})();

var file_path = 'E:/source/git_project/GeoMap/json/china_mask.geo.json';
file_path = './data-source/';
// file_path = './data-source/china.geo.json';
var args = [].slice.call(process.argv);
var global_projector = Mercator;
//命令行进行指定文件压缩
if(args.length > 2){
	var projector = args[2];
	if(projector == 'albers'){
		global_projector = Albers;
		// number_fixed = function(num){
		// 	return num;
		// }
	}
}
format(file_path,function(source_path){
	// return path.join(__dirname,'./data',path.basename(source_path).replace('.json','.meractor.json'));
	return source_path.replace('data-source','data').replace('.json','.'+global_projector.name+'.json');
});

