var fs = require('fs'),
	path = require('path'),
	os = require('os'),
	util = require('./util');

var dir_current = __dirname;
var COLOR_TRANSPANT = 'rgba(0,0,0,0)';

//目录可以放在core的同级（开发环境），也可以放在主程序安装目录下（生产环境）
var dir_core = '../../core';
if(!fs.existsSync(dir_core)){
	dir_core = '../../';
}
require.extensions['.gts'] = require.extensions['.js'];

var parse_micaps = require(path.join(dir_core, 'node_modules/micaps_parser/parser')).parse;
var raster2vector = require(path.join(dir_core, 'node_modules/micaps_parser/utils/raster2vector')).raster2vector;
var GeoClipper = require(path.join(dir_core, 'node_modules/micaps_parser/utils/geoclipper'));

var dir_data = path.join(dir_current, './data');
var dir_data_clip = path.join(dir_current, './data_clip');

util.rmfileSync(dir_data_clip, true);
util.mkdirSync(dir_data_clip);


function _doclip14(data, fn_getColor){
	var time_start = new Date();
	new GeoClipper(null, null, function(){
		var geoClipper = this;
		var areas_new = [];
		data.areas.forEach(function(area){
			var symbols = area.symbols;
			var val_area = symbols? symbols.text : '';
			var color = fn_getColor(val_area, area.code);
			area.c = color;
			area.is_stripe = area.code == 24;
			var result = geoClipper.doClip(area.items);
			var scale = result.scale || 1;
			var paths = result.paths;
			for(var i = 0, j = paths.length; i<j; i++){
				var area_new = {};
				for(var attr in area){
					area_new[attr] = area[attr];
				}
				var path = paths[i];
				var items_new = [];
				for(var i_p = 0, j_p = path.length; i_p < j_p; i_p++){
					var item = path[i_p];
					items_new.push({
						x: item.X / scale,
						y: item.Y /scale
					});
				}
				area_new.items = items_new;
				areas_new.push(area_new);
			}
		});
		data.areas = areas_new;
	});
	console.log(new Date() - time_start + 'ms!');
}
function _doclipInterpolate(areas){
	var areas_old = areas.splice(0);
	var time_start = new Date();
	new GeoClipper(null, null, function(){
		var geoClipper = this;
		areas_old.forEach(function(area){
			var items_xy = [];
			area.items.forEach(function(item){
				items_xy.push({
					x: parseFloat(item.lng),
					y: parseFloat(item.lat)
				});
			});
			var result = geoClipper.doClip(items_xy);
			var scale = result.scale || 1;
			var paths = result.paths;
			for(var i = 0, j = paths.length; i<j; i++){
				var area_new = {};
				for(var attr in area){
					area_new[attr] = area[attr];
				}
				var path = paths[i];
				var items_new = [];
				for(var i_p = 0, j_p = path.length; i_p < j_p; i_p++){
					var item = path[i_p];
					items_new.push({
						lng: item.X / scale,
						lat: item.Y /scale
					});
				}
				area_new.items = items_new;
				areas.push(area_new);
			}
		});
		console.log(new Date() - time_start + 'ms!');
	});
}

fs.readdir(dir_data, function(err, dirs){
	if(err){
		console.log(err);
	}else{
		if(dirs && dirs.length > 0){
			dirs.forEach(function(dir){
				// if(dir != '24小时变温实况'){
				// 	return;
				// }
				var product_dir = path.join(dir_data, dir);
				var files = fs.readdirSync(product_dir);
				var data_file_name = files.filter(function(v){
					if(v.indexOf('__') == 0){
						return v;
					}
				});
				if(data_file_name.length > 0){
					var data_file = path.join(product_dir, data_file_name[0]);
					var conf_file_name = files.filter(function(v){
						if(path.extname(v) == '.json'){
							return v;
						}
					});
					var conf = require(path.join(product_dir, conf_file_name[0]));
					var conf_file = conf.file;
					var conf_in_out = conf.in_out;
					var conf_file_rule = conf_in_out.file_rule;
					var conf_other = conf.other;
					var conf_interpolation = conf_other.interpolation;
					parse_micaps(data_file, {
						val_col: conf_file_rule.col,
						grid_space: conf_interpolation && conf_interpolation.option || 0.2,
						interpolation_all: conf_interpolation && conf_interpolation.flag, //传入micaps解析需要参数
						arithmetic: conf_file_rule.arithmetic
					}, function(err, data){
						if(err){
							console.log(err);
						}else if(data){
							err = null;
							data.path = data_file;
							
							var blendent = conf.legend.blendent;
							var len_blendent = blendent.length;
							var isHaveManyBlendent = len_blendent > 1;
							function getColorByCondition(val, range){
								for(var i = 0,j=range.length;i<j;i++){
									var case_range = range[i];
									if(case_range.is_checked){
										var val_range = case_range.val;
										if(val >= val_range[0] && val < val_range[1]){
											return case_range.color;
										}
									}
								}
								return COLOR_TRANSPANT;
							}
							function getColor(val, code){
								if(isHaveManyBlendent){
									for(var i = 0;i<len_blendent;i++){
										var v = blendent[i];
										if(code == v.val.v){
											return getColorByCondition(val, v.colors);
										}
									}
								}
								return getColorByCondition(val, blendent[0].colors);
							}
							var interpolate = data.interpolate;
							if(interpolate){
								var _interpolate_width,
									_interpolate_height;
								try{
									_interpolate_width = interpolate.length;
									_interpolate_height = interpolate[0].length;
								}catch(e){}
								var _new_interpolate_data = [];
								for(var i = 0; i < _interpolate_width; i++){
			                        var arr = [];
			                        for(var j = 0; j< _interpolate_height; j++){
			                            var v = interpolate[i][j];
			                            var color = getColor(v.v);
			                            arr.push({
			                            	x: v.x,
			                            	y: v.y,
			                            	c: color || COLOR_TRANSPANT
			                            });
			                        }
			                        _new_interpolate_data.push(arr);  
			                    }
			                    data = raster2vector(_new_interpolate_data, COLOR_TRANSPANT);
			                    _doclipInterpolate(data);
							}else{
								if(data.type == 14){
									_doclip14(data, getColor);
								}
							}
							var data_json = JSON.stringify(data);
							var save_path = path.join(dir_data_clip, dir+'.json');
							fs.writeFileSync(save_path, data_json); //异步保存数据
							console.log(dir);
						}
					});
				}
			});
		}
	}
});
