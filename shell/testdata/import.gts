var fs = require('fs'),
	path = require('path'),
	os = require('os'),
	util = require('./util.gts');

var dir_current = __dirname;

//目录可以放在core的同级（开发环境），也可以放在主程序安装目录下（生产环境）
var dir_core = path.join(dir_current, '../../app');
if(!fs.existsSync(dir_core)){
	dir_core = path.join(dir_current, '../../');
}
var dir_config = path.join(dir_core, 'config');
var dir_data = path.join(dir_current, 'data');
var dir_tmp = path.join(os.tmpdir() || os.tmpDir(), 'gt_testdata');
console.log(dir_tmp);

util.mkdirSync(dir_config);
util.mkdirSync(dir_tmp);
util.mkdirSync(path.join(dir_config, '.sys'));
fs.readdir(dir_data, function(err, dirs){
	if(err){
		console.log(err);
	}else{
		if(dirs && dirs.length > 0){
			dirs.forEach(function(dir){
				var product_dir = path.join(dir_data, dir);
				var files = fs.readdirSync(product_dir);
				var conf_files = [],
					conf_data = [];

				files.forEach(function(file){
					var filename = file;
					file = path.join(product_dir, file);
					if(filename == 'sys_product_tree.json'){
						conf_files.push({
							p: file,
							is_sys: true
						});
						return;
					}

					if(path.extname(file) == '.json' && filename.indexOf('___') != 0){
						var conf_file = require(file);
						if(conf_file.file && conf_file.in_out){
							conf_files.push({
								p: file,
								conf: conf_file
							});
							return;
						}
					}
					conf_data.push({
						p: file
					});
				});
				conf_data.forEach(function(file, i){
					var to_path = path.join(dir_tmp, dir);
					util.mkdirSync(to_path);
					var save_file = path.join(to_path, path.basename(file.p).replace('___', ''));
					conf_data[i].toP = save_file;
					util.copySync(file.p, save_file);
				});

				conf_files.forEach(function(file){
					var filename = path.basename(file.p);
					var save_file = path.join(dir_config, filename);
					if(file.is_sys){
						return util.copySync(file.p, path.join(dir_config, '.sys', filename));
					}
					var conf = file.conf;
					var filename = conf.in_out.file_rule.custom;
					var path_data_new = '';
					for(var i = 0, j = conf_data.length; i<j; i++){
						if(path.basename(conf_data[i].p).replace('___', '') == filename){
							path_data_new = path.dirname(conf_data[i].toP);
							break;
						}
					}
					if(path_data_new){
						var is_newest = conf.file.is_newest;
						var val_newest = {};
						if (is_newest) {
							val_newest = {
								"newest_days": 999
							}
						} else {
							val_newest = {
								"start": conf.file.time_start,
								end: conf.file.time_end
							}
						}
						var file_rule = conf.in_out.file_rule;
						var is_common = file_rule.type == 1;
						var val_rule = {};
						if (is_common) {
							val_rule = file_rule.common;
						} else {
							val_rule = conf.in_out.file_rule.custom;
						}
						var conf_new = {
							"data": {
								"type": "micaps",
								"val": {
									"file": {
										"is_newest": is_newest,
										"val": val_newest
									},
									"dir_in": path_data_new,
									"file_rule": {
										"is_common": is_common,
										"val": val_rule
									},
									"file_type": file_rule.file_type,
									"file_hour": file_rule.file_hour,
									"col": file_rule.col,
									"arithmetic": file_rule.arithmetic
								}
							},
							"other": {
								"map": "",
								"legend": ""
							}
						};
						fs.writeFileSync(save_file, JSON.stringify(conf_new));
					}
				});
			});

			console.log('导入数据完成！');
		}else{
			console.log('没有要处理的配置文件！');
		}
	}
});
