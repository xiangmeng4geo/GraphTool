!function(){
	var fs = require('fs'),
		path = require('path'),
		os = require('os'),
		util = require('./util.gts');
	
	//目录可以放在core的同级（开发环境），也可以放在主程序安装目录下（生产环境）
	var dir_core = '../../core';
	if(!fs.existsSync(dir_core)){
		dir_core = '../../';
	}
	var GeoClipper = require(path.join(dir_core, 'node_modules/micaps_parser/utils/geoclipper'));

	function _doclip14(data, callback){
		var time_start = new Date();
		new GeoClipper(null, null, function(){
			var geoClipper = this;
			var areas_new = [];
			data.areas.forEach(function(area){
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
			callback && callback({
				time: new Date() - time_start
			});
		});
	}
	var fn_clip = {
		14: _doclip14
	};

	var args = [].slice.call(process.argv);
	//命令行进行指定文件压缩
	if(args.length >= 4){
		var file_source = args[2],
			file_save = args[3];

		fs.readFile(file_source, {encoding: 'utf8'}, function(err, content){
			if(err){
				return console.log(err);
			}
			var data = JSON.parse(content);
			var type = data.type;
			if(type){
				var fn = fn_clip[type];
				if(fn){
					return fn(data, function(param){
						fs.writeFile(file_save, JSON.stringify(data));
						console.log('clip '+file_source+' takes '+param.time+'ms!');
					});
				}
			}
			console.log('error');
		});
	}else{
		console.log('please input file_source and file_save');
	}
}()