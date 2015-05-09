/*格式化各省地理数据*/
var fs = require('fs'),
	path = require('path');

var dir_current = __dirname;
var dir_source = path.join(dir_current, 'data-source');

function _getBound(coordinates){
	var min_x = min_y = Number.MAX_VALUE;
	var max_x = max_y = Number.MIN_VALUE;

	coordinates.forEach(function(v){
		var x = v[0],
			y = v[1];
		if(x < min_x){
			min_x = x;
		}
		if(x > max_x){
			max_x = x;
		}
		if(y < min_y){
			min_y = y;
		}
		if(y > max_y){
			max_y = y;
		}
	});
	return [min_x, min_y, max_x, max_y];
}


function _format(province_name){
	var data_path = path.join(dir_source, province_name+'.json');
	if(fs.existsSync(data_path)){
		var data = require(data_path);
		var data_names = require(path.join(dir_source, province_name+'_names.json'));
		var cache_names = {};
		data_names.features.forEach(function(v){
			var p = v.properties;
			cache_names[p['NAME']] = [p['POINT_X'], p['POINT_Y']];
		});
		var data_new = {
			type: "FeatureCollection"
		};
		var min_x_global = min_y_global = Number.MAX_VALUE;
		var max_x_global = max_y_global = Number.MIN_VALUE;
		function _resetBound(bound){
			var x_min = bound[0];
			if(x_min < min_x_global){
				min_x_global = x_min;
			}
			var y_min = bound[1];
			if(y_min < min_y_global){
				min_y_global = y_min;
			}

			var x_max = bound[2];
			if(x_max > max_x_global){
				max_x_global = x_max;
			}
			var y_max = bound[3];
			if(y_max > max_y_global){
				max_y_global = y_max;
			}
		}
		var features_new = [];
		data.features.forEach(function(v){
			var geometry = v.geometry;
			if(geometry.type == 'Polygon'){
				_resetBound(_getBound(geometry.coordinates[0]));
			}else{
				geometry.coordinates.forEach(function(v){
					_resetBound(_getBound(v[0]));
				});
			}
			var p = v.properties;
			var name = p.NAME;
			features_new.push({
				properties: {
					cname: name,
					name: name,
					cp: cache_names[name]
				},
				geometry: geometry,
				type: "Feature"
			});
		});
		data_new.features = features_new;
		data_new.srcSize = {
			width: max_x_global - min_x_global,
			height: max_y_global - min_y_global,
			left: min_x_global,
			top: max_y_global
		};
		var save_file = path.join(dir_current, '../../core/data', province_name+'.json');
		fs.writeFileSync(save_file, JSON.stringify(data_new));
		console.log(save_file);
	}else{
		console.log(data_path, '不存在！');
	}
}

['hebei'].forEach(function(v){
	_format(v);
});