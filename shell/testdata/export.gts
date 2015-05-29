var fs = require('fs'),
	path = require('path'),
	os = require('os'),
	util = require('./util');

var dir_current = __dirname;

//目录可以放在core的同级（开发环境），也可以放在主程序安装目录下（生产环境）
var dir_core = path.join(dir_current, '../../core');
if(!fs.existsSync(dir_core)){
	dir_core = path.join(dir_current, '../../');
}
var dir_config = path.join(dir_core, 'config');
var dir_data = path.join(dir_current, 'data');
var dir_tmp = os.tmpdir() || os.tmpDir;

function _getParam(conf_of_product){
	var conf_in_out = conf_of_product.in_out;
	var dir_in = conf_in_out.dir_in;
	if(fs.existsSync(dir_in) ){
		var param = [dir_in];
		var conf_file = conf_of_product.file;
		var conf_file_rule = conf_in_out.file_rule;
		if(conf_file_rule.type == "1"){
			var rule_common = conf_file_rule.common;
			param.push(rule_common.prefix+rule_common.date_format+rule_common.postfix+'.'+rule_common.file_suffix);
		}else{
			param.push(conf_file_rule.custom);
		}
		if(conf_file.is_newest){
			param.push(conf_file.newest_days);
		}else{
			param.push(conf_file.time_start);
			param.push(conf_file.time_end);
		}
		return param;
	}
}

function _getNewest(dir, rule){
	var time_start, time_end;
	var args = arguments;
	var file;
	if(args.length == 3){
		var days = args[2];
		time_end = new Date();
		time_start = new Date();
		time_start.setDate(time_start.getDate()-days);
	}else{
		time_start = new Date(args[2]),
		time_end = new Date(args[3]);
	}

	for(; time_start <= time_end;){
		var file_name = time_end.format(rule);
		var file_path = path.join(dir, file_name);
		if(fs.existsSync(file_path)){
			var mtime = fs.statSync(file_path).mtime;
			if(mtime >= time_start){
				return file_path;
			}
		}
		time_end.setDate(time_end.getDate() - 1);
	}
}

function dealConfigFile(file_name){
	var config = require(path.join(dir_config, file_name));
	if(config){
		var conf_file = config.file;
		var conf_in_out = config.in_out;
		if(conf_file && conf_in_out){
			var param = _getParam(config);
			if(param){
				var file_newest = _getNewest.apply(null, param);
				if(file_newest && fs.existsSync(file_newest)){
					var path_to_save = path.join(dir_data, path.basename(file_name, '.json'));//encrypt(dir_in);
					util.mkdirSync(path_to_save);
					var file_name_save = path.basename(file_newest);
					util.copySync(file_newest, path.join(path_to_save, '___'+file_name_save));

					conf_file.is_newest = true;
					conf_file.newest_days = 999;
					conf_in_out.file_rule.type = 2;
					conf_in_out.file_rule.custom = file_name_save;
					fs.writeFileSync(path.join(path_to_save, file_name), JSON.stringify(config));
				}
			}
		}else{
			if(/sys_product_tree/.test(file_name)){
				var path_to_save = path.join(dir_data, 'sys');
				util.mkdirSync(path_to_save);
				util.copySync(path.join(dir_config, file_name), path.join(path_to_save, file_name));
			}
		}
		console.log(file_name);
	}
}


util.rmfileSync(dir_data, true);
util.mkdirSync(dir_data);
fs.readdir(dir_config, function(err, files){
	if(err){
		console.log(err);
	}else{
		if(files && files.length > 0){
			files.forEach(function(file){
				dealConfigFile(file);
			});
			console.log('\n导出数据完成！');
		}else{
			console.log('\n没有要处理的配置文件！');
		}
	}
});