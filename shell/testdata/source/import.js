!function() {
	var util = require('./util');
	util.init({
		name: 'import',
		width: 600,
		height: 500
	}, function() {
		var fs = require('fs');
		var path = require('path');
		var $ = require('./lib/j');

		var util_file = util.file;

		var CONST = util.CONST;
		var PATH_CONFIG_USER = CONST.PATH_CONFIG_USER;
		var PATH_DATA = CONST.PATH_DATA;
		var PATH_DATA_CONFIG = CONST.PATH_DATA_CONFIG;
		var PATH_DATA_DATA = CONST.PATH_DATA_DATA;
		var PATH_DATA_GEOFILE = CONST.PATH_DATA_GEOFILE;

		var PATH_CONFIG_DATA = path.join(path.dirname(PATH_CONFIG_USER), 'testdata');
		var PATH_CONFIG_GEO = path.join(path.dirname(PATH_CONFIG_USER), 'geo');

		var $textarea = $('textarea');
		function _log(msg, is_clear) {
			if (is_clear) {
				$textarea.val(msg||'');
			} else {
				if (msg.indexOf('(') !== 0) {
					msg = '    '+msg;
				}
				$textarea.val($textarea.val()+'\n'+msg);
				$textarea.scrollTop($textarea.get(0).scrollHeight);
				console.log(msg);
			}
		}
		function _req(name, defaultVal) {
			try {
				var name_module = path.resolve(PATH_DATA_CONFIG, name);
				delete require.cache[name_module];
				return require(name_module);
			} catch(e) {
				console.log(e);
			}
			return defaultVal;
		}
		function _dealProduct(cb) {
			var treeData = _req('.tree', []);
			util_file.write(path.join(PATH_CONFIG_USER, '.sys', 'sys_product_tree.json'), JSON.stringify(treeData));
			_log('产品列表导出完成！');

			var arr_product = [];
			function _copy(arr) {
				arr.forEach(function(v) {
					var children = v.childNodes;
					if (children) {
						_copy(children);
					} else {
						arr_product.push(v.name);
					}
				});
			}
			_copy(treeData);

			function _run() {
				var name = arr_product.shift();
				console.log(name, arr_product);
				if (!name) {
					cb && cb();
					return;
				}
				_log('处理 '+name);
				var conf = _req(name);
				if (conf) {
					try {
						conf.data.val.dir_in = PATH_CONFIG_DATA;
					} catch(e){}
					try {
						var filename = conf.data.val.file_rule.val_custom;
						util_file.copy(path.join(PATH_DATA_DATA, filename), path.join(PATH_CONFIG_DATA, filename));
						_log('复制 '+filename);
					} catch(e){}
					try {
						var conffilename = name+'.json';
						util_file.write(path.join(PATH_CONFIG_USER, conffilename), JSON.stringify(conf));
						_log('写入 '+conffilename);
					} catch(e){}
				}

				setTimeout(_run, 10);
			}
			_run();
		}
		var PATH_SYS = path.join(PATH_CONFIG_USER, '.sys', 'sys.json');
		function _dealLegend() {
			var confSys = _req(PATH_SYS, {});
			var legend = _req('.legend', []);
			confSys.legend = legend;
			util_file.write(PATH_SYS, JSON.stringify(confSys));

			_log('图例导出完成！');
		}
		function _dealMap(cb) {
			var confSys = _req(PATH_SYS, {});
			var maps = _req('.maps', []);

			var arr_maps = [];
			var cache = {};
			maps.forEach(function(conf) {
				var list = conf.maps;
				list.forEach(function(map) {
					var file = map.file;
					var filename_new = path.join(PATH_CONFIG_GEO, file);
					cache[file] = filename_new;
					map.file = filename_new;
				});
			});
			for (var i in cache) {
				arr_maps.push({
					file: i,
					namenew: cache[i]
				});
			}

			confSys.geo = maps;
			function _run() {
				var item = arr_maps.shift();
				if (!item) {
					util_file.write(PATH_SYS, JSON.stringify(confSys));
					_log('地图导出完成！');

					cb && cb();
					return;
				}

				var file = item.file;
				var namenew = item.namenew;
				util_file.copy(path.join(PATH_DATA_GEOFILE, file), namenew);
				_log('复制 '+file);

				setTimeout(_run, 10);
			}
			_run();
		}
		var is_dealing = false;
		$('#btn_yes').click(function() {
			if (is_dealing) {
				return;
			}
			is_dealing = true;

			_log('', true);
			
			var step = 1;
			_log('('+(step++)+') 正在备份旧配置文件');
			if (util_file.exists(PATH_CONFIG_USER)) {
				var new_dirname = 'config_bak_'+(new Date().getTime());
				util_file.copyDir(PATH_CONFIG_USER, path.join(path.dirname(PATH_CONFIG_USER), new_dirname));
				_log('原数据备份在['+new_dirname+']下');
			}
			_log('('+(step++)+') 正在导出产品配置');
			_dealProduct(function() {
				_log('('+(step++)+') 正在导出地图配置');
				_dealMap(function() {
					_log('('+(step++)+') 正在导出图例配置');
					_dealLegend();

					_log('----------------成功导入！--------------');

					is_dealing = false;
				});
			});
		});
	});
}()