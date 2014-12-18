var fs = require('fs'),
	path = require('path');

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
	
	function number_fixed(num,len){
		len || (len = 4);
		return Number(num.toFixed(len));
	}
    var MERACTOR_RATIO = 20037508.34/180;
	var px = 3800000;//转成px
	/*Web墨卡托坐标与WGS84坐标互转*/
	var Meractor_cache_lnglat = {};// 进行缓存，减小重复计算量
	var Meractor_lngLatToPoint = function(lnglat){
		var lng = lnglat[0];
		var lat = lnglat[1];
		var cache_name = lng+'_'+lat;
		var cache_val = Meractor_cache_lnglat[cache_name];
		if(cache_val){
			return cache_val;
		}
		var x = lng * MERACTOR_RATIO;
		var y = Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180);
		y = y * MERACTOR_RATIO;
		var val = [number_fixed(x/px), number_fixed(y/px)];
		Meractor_cache_lnglat[cache_name] = val;
		return val;
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
		fs.writeFile(save_file_path,content_info,function(err){
			if(err){
				return console.log(err);
			}
			console.log(save_file_path,'save successfully!');
		});
	}
	var num_total = 0;
	function formatCoordinates(val){
		var arr = [];
		var first_v = val[0];
		var min_x = max_x = first_v[0],
			min_y = max_y = first_v[1];
		var len = val.length;
		// if(len < 200){
		// 	return;
		// }
		num_total += len;
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
			arr.push(Meractor_lngLatToPoint(v));
		});
		return {
			arr: arr,
			min_x: min_x,
			min_y: min_y,
			max_x: max_x,
			max_y: max_y
		};
	}
	function formatFile(file_path,format_path_fn){
		fs.readFile(file_path,{encoding: 'utf8'},function(err,data){
			if(err){
				console.log(err);
			}else{
				var min_x = min_y = Number.MAX_VALUE,
					max_x = max_y = Number.MIN_VALUE;
				function getExtremum(val){
					if(val.min_x < min_x){
						min_x = val.min_x;
					}
					if(val.min_y < min_y){
						min_y = val.min_y;
					}
					if(val.max_x > max_x){
						max_x = val.max_x;
					}
					if(val.max_y > max_y){
						max_y = val.max_y;
					}
				}
				data = JSON.parse(data);
				var newData = {type: data.type,features: []};
				data.features.forEach(function(v,i){
					var geometry = v.geometry;
					var type = geometry.type;
					
					var coordinates = [];
					if('Polygon' == type){
						geometry.coordinates.forEach(function(v_1){
							var val = formatCoordinates(v_1);
							if(val){
								getExtremum(val);
								coordinates.push(val.arr);
							}
						});
					}else if('MultiPolygon' == type){
						geometry.coordinates.forEach(function(v_coordinates){
							var arr = [];
							v_coordinates.forEach(function(v_1){
								var val = formatCoordinates(v_1);
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
						properties: {}
					});
				});
				newData.projector = 'meractor';

				newData.srcSize = {
					left: min_x,
					top: max_y,
					width: max_x - min_x,
					height: max_y - min_y
				};
				saveData(newData,format_path_fn(file_path));
				console.log(num_total+' points!');
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
format(file_path,function(source_path){
	// return path.join(__dirname,'./data',path.basename(source_path).replace('.json','.meractor.json'));
	return source_path.replace('data-source','data').replace('.json','.meractor.json');
});