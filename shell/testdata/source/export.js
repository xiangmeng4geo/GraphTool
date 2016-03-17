!function() {
	var path = require('path');
	var fs = require('fs');
	var util = require('./util');

	util.init({
		name: 'export'
	}, function() {
		var fs = require('fs');
		
		// 0.21.0
		var archiver = require('archiver');

		var electron = require('electron');
	    var shell = electron.shell;
		var $ = require('./lib/j');
		var tree = require('./lib/j.tree');

		var $cb_product = $('#cb_product');
		var $cb_map = $('#cb_map');
		var $cb_legend = $('#cb_legend');

		var $tree_product = $('#tree_product');
		var $tree_map = $('#tree_map');
		var $tree_legend = $('#tree_legend');

		var util_ui_checked = util.ui.checked;
		var _alert = util.ui.dialog.alert;

		var CONST = util.CONST;
		var path_config = CONST.PATH_CONFIG_USER;

		var PATH_DATA = CONST.PATH_DATA;
		var PATH_DATA_CONFIG = CONST.PATH_DATA_CONFIG;
		var PATH_DATA_DATA = CONST.PATH_DATA_DATA;
		var PATH_DATA_GEOFILE = CONST.PATH_DATA_GEOFILE;

		process.on('uncaughtException', function(err) {
			var msg = '发生错误，请联系管理员!';
			_log(msg);
			_alert(msg);
		});
		var $log = $('#log'),
			$logTextarea = $log.find('textarea');
		function _log(msg, is_clear) {
			if (is_clear) {
				$logTextarea.val(msg||'');
			} else {
				$logTextarea.val($logTextarea.val()+'\n'+msg);
				$logTextarea.scrollTop($logTextarea.get(0).scrollHeight);
				console.log(msg);
			}
		}
		function _getNewest(dir, rule){
			var time_start,time_end;
			var args = arguments;
			var file;
			if(args.length == 3){
				var days = args[2];
				time_end = new Date();
				time_start = new Date();
				time_start.setDate(time_start.getDate() - days);
			}else{
				time_start = new Date(args[2]),
				time_end = new Date(args[3]);
			}

			for(; time_start <= time_end; ){
				var file_name = time_end.format(rule);
				var file_path = path.join(dir, file_name);
				if(util.file.exists(file_path)){
					var mtime = fs.statSync(file_path).mtime;
					if(mtime >= time_start){
						return file_path;
					}
				}
				time_end.setDate(time_end.getDate() - 1);
			}
		}
		function _parse(data) {
			var data_conf = data.val;
			var dir_in = data_conf.dir_in;
			var param = [dir_in];

			var file_rule = data_conf.file_rule;
			var is_common = file_rule.is_common;
			
			if (is_common) {
				var val_file_rule = file_rule.val_common || {};
				param.push(val_file_rule.prefix + val_file_rule.date_format + val_file_rule.postfix + '.' + val_file_rule.file_suffix);
			} else {
				param.push(file_rule.val_custom);
			}
			var file = data_conf.file;
			var is_newest = file.is_newest;
			var val_is_newest = file.val;
			if (is_newest) {
				param.push(val_is_newest.newest_days);
			} else {
				param.push(val_is_newest.start);
				param.push(val_is_newest.end);
			}

			return _getNewest.apply(null, param);
		}
		function _isChecked(obj) {
			if (obj.state.selected) {
				return true;
			}

			var children = obj.children;
			if (children) {
				for (var i = 0, j = children.length; i<j; i++) {
					if (_isChecked(children[i])) {
						return true;
					}
				}
			}
			return false;
		}
		function _getAllChecked(streeInstance) {
			var tree_new = [];
			var json = streeInstance.get_json()[0].children;
			function getNodes(arr) {
	            if (!arr) {
	                return null;
	            }
	            var d = [];
	            arr.forEach(function(v) {
	                var obj = {
	                    name: v.text
	                }
	                if (_isChecked(v)) {
	                	if (v.type == 'default') {
	                		var children = getNodes(v.children);
	                		if (children.length > 0) {
	                			obj.childNodes = children;
	                		}
	                	}
	                	d.push(obj);
	                }
	            });
	            return d;
	        }
	        return getNodes(json);
		}
		var PATH_ZIP_RESOURCES = 'resources'
		var PATH_ZIP_APP = path.join(PATH_ZIP_RESOURCES, 'app');
		var PATH_ZIP_DATA = path.join(PATH_ZIP_APP, 'data');
		var PATH_ZIP_DATA_CONFIG = path.join(PATH_ZIP_DATA, 'config');
		var PATH_ZIP_DATA_DATA = path.join(PATH_ZIP_DATA, 'data');
		var PATH_ZIP_DATA_GEO = path.join(PATH_ZIP_DATA, 'geo');
		var TYPE_JSON = 1;
		var TYPE_PATH = 2;
		var TYPE_STRING = 3;
		function _exportProduct(writer, cb) {
			var result = _getAllChecked(tree_product);
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
			_copy(result);
			var n_dealed = 0;
			var n_total = arr_product.length;
			function _run() {
				n_dealed++;
				var name = arr_product.shift();
				if (!name) {
					// util.file.write(path.join(PATH_DATA_CONFIG, '.tree.json'), JSON.stringify(result));
					writer(path.join(PATH_ZIP_DATA_CONFIG, '.tree.json'), {
						type: TYPE_JSON,
						val: result
					});
					cb && cb();
					return;
				}
				try {
					var conf = require(path.join(path_config, name));
				} catch(e){
				}
				if (conf) {
					var conf_val = conf.data.val;
					conf_val.file = {
						is_newest: true,
						val: {
							newest_days: 999
						}
					}

					var file_path = null;
					try {
						file_path = _parse(conf.data);
					} catch(e){}
					if (util.file.exists(file_path)) {
						var file_name = path.basename(file_path);
						// util.file.copy(file_path, path.join(PATH_DATA_DATA, file_name));
						writer(path.join(PATH_ZIP_DATA_DATA, name, file_name), {
							type: TYPE_PATH,
							val: file_path
						});

						_log('\t复制'+file_path);

						conf_val.file_rule.is_common = false;
						conf_val.file_rule.val_custom = file_name;
					}
					conf_val.dir_in = '';
					// util.file.write(path.join(PATH_DATA_CONFIG, name+'.json'), JSON.stringify(conf));
					writer(path.join(PATH_ZIP_DATA_CONFIG, name+'.json'), {
						type: TYPE_JSON,
						val: conf
					});
					_log(n_dealed+'/'+n_total+' 成功处理'+name);
				}
				setImmediate(_run, 10);
			}
			_run();
			
		}
		function _exportMap(writer) {
			var result = _getAllChecked(tree_map);
			var data_map = [];
			var cache = {};
			result.forEach(function(map) {
				cache[map.name] = 1;
			});
			data_sys_geo.forEach(function(map) {
				if (cache[map.name]) {
					var maps_new = [];
					map.maps.forEach(function(map_file) {
						var file = map_file.file;
						var file_name = path.basename(file);
						if (util.file.exists(file)) {
							var file_name = path.basename(file);
							writer(path.join(PATH_ZIP_DATA_GEO, file_name), {
								type: TYPE_PATH,
								val: file
							});
							map_file.file = file_name;
							maps_new.push(map_file);
							_log('复制 '+file_name);
						} else {
							_log(file+'不存在！');
						}						
					});
					if (maps_new.length > 0) {
						map.maps = maps_new;
						data_map.push(map);		
					}
				}
			});
			writer(path.join(PATH_ZIP_DATA_CONFIG, '.maps.json'), {
				type: TYPE_JSON,
				val: data_map
			});
			_log('成功导出'+data_map.length+'条地图配置！');
		}
		function _exportLegend(writer) {
			var result = _getAllChecked(tree_legend);
			var data = [];
			var cache = {};
			result.forEach(function(map) {
				cache[map.name] = 1;
			});
			data_sys_legend.forEach(function(legend) {
				if (cache[legend.name]) {
					data.push(legend);
				}
			});

			// util.file.write(path.join(PATH_DATA_CONFIG, '.legend.json'), JSON.stringify(data));
			writer(path.join(PATH_ZIP_DATA_CONFIG, '.legend.json'), {
				type: TYPE_JSON,
				val: data
			});
			_log('成功导出'+data.length+'条地图配置！');
		}

		var treeDataProduct = [{
	        name: '全部产品',
	        childNodes: util.getProductTree() || []
	    }];
	    if (treeDataProduct) {
	        var data = [];

	        function getNodes(arr, level) {
	            if (!arr) {
	                return null;
	            }
	            var d = [];
	            arr.forEach(function(v) {
	                var name = v.name;
	                var child = getNodes(v.childNodes, level+1);
	                d.push({
	                    // icon: child ? 'folder' : 'file',
	                    text: name,
	                    state: {
	                        // selected: true,
	                        opened: true
	                    },
	                    children: child,
	                    type: child ? 'default' : 'file'
	                });
	            });
	            return d;
	        }
	        treeDataProduct = getNodes(treeDataProduct, 0);
	    }
	    var tree_product;
	    var $tree = $tree_product.jstree({
	        'core': {
	            "themes": {
	                "stripes": true,
	            },
	            data: treeDataProduct,
	            "check_callback": true
	        },
	        'types': {
	            'default': {
	                'icon': 'jstree-themeicon-hidden test'
	            },
	            'file': {
	                'valid_children': [],
	                'icon': 'jstree-themeicon-hidden test'
	            }
	        },
	        "plugins": ["contextmenu", "types", "unique", "checkbox"]
	    }).on('ready.jstree', function() {
	    	tree_product = $tree.jstree();
	    	tree_product.check_all();
	    });
	    

	    window.$tree = $tree;

	    var data_sys = util.getSys() || {};
	    var data_sys_geo = data_sys.geo || [];
	    var data_sys_legend = data_sys.legend || [];

	    function _getGeoChild() {
	    	var arr = [];
	    	for (var i = 0, j = data_sys_geo.length; i<j; i++) {
	    		arr.push({
	    			text: data_sys_geo[i].name
	    		});
	    	}
	    	return arr;
	    }
	    function _getLegendChild() {
	    	var arr = [];
	    	for (var i = 0, j = data_sys_legend.length; i<j; i++) {
	    		arr.push({
	    			text: data_sys_legend[i].name
	    		});
	    	}
	    	return arr;
	    }
	    var treeDataGeo = [{
	    	text: '全部地图',
	    	state: {
                opened: true
            },
	    	children: _getGeoChild()
	    }];
	    var treeDataLegend = [{
	    	text: '全部图例',
	    	state: {
                opened: true
            },
	    	children: _getLegendChild()
	    }];

	    function _zip(save_path) {
			var archive = archiver('zip');
			var output = fs.createWriteStream(save_path);
			output.on('close', function() {
			  console.log(archive.pointer() + ' total bytes');
			  _afterExport();
			});

			archive.on('error', function(err){
			    throw err;
			});
			archive.pipe(output);
			return archive;
	    }
	    var _getWriter = function(zip) {
	    	return function(file_path, content) {
	    		var type = content.type;
	    		var val = content.val;
    			var source;
	    		if (type == TYPE_JSON) {
	    			source = JSON.stringify(val);
	    		} else if (type == TYPE_PATH) {
	    			source = fs.createReadStream(val);
	    		} else if (type == TYPE_STRING) {
	    			source = val;
	    		}
	    		if (source) {
		    		zip.append(source, {
		    			name: file_path
		    		});
	    		}
	    	}
	    }
	    function _initTree($treeObj, data) {
	    	var $tree = $treeObj.jstree({
		        'core': {
		            "themes": {
		                "stripes": true,
		            },
		            data: data,
		            "check_callback": true
		        },
		        'types': {
		            'default': {
		                'icon': 'jstree-themeicon-hidden test'
		            },
		            'file': {
		                'valid_children': [],
		                'icon': 'jstree-themeicon-hidden test'
		            }
		        },
		        "plugins": ["contextmenu", "types", "unique", "checkbox"]
		    }).on('ready.jstree', function(e, obj) {
		    	var instance = obj.instance;
		    	instance.check_all();
		    });
		    return $tree.jstree();
	    }
	    function _exportSource(zip) {
	    	function copy(file_path, name) {
	    		if (util.file.exists(file_path)) {
	    			console.log(file_path);
	    			var stream = fs.createReadStream(file_path);
	    			zip.append(stream, {
			    		name: name
			    	});
	    		}
	    	}
	    	zip.bulk({
	    		cwd: path.join(__dirname, '../../'),
	    		src: ['*.*']
	    	});
	    	zip.bulk({
	    		cwd: path.join(__dirname, '../../'),
	    		src: ['locales/**/**']
	    	}, {
	    		name: 'locales'
	    	});

	    	zip.append(require('./lib/asar_stream').getStream(path.join(__dirname, '../atom.asar')), {
	    		name: path.join(PATH_ZIP_RESOURCES, 'atom.asar')
	    	});
	    	copy(path.join(__dirname, 'import.html'), path.join(PATH_ZIP_APP, 'import.html'));
	    	copy(path.join(__dirname, 'import.js'), path.join(PATH_ZIP_APP, 'import.js'));
	    	copy(path.join(__dirname, 'util.js'), path.join(PATH_ZIP_APP, 'util.js'));
	    	copy(path.join(__dirname, 'lib/j.js'), path.join(PATH_ZIP_APP, 'lib/j.js'));
	    	_getWriter(zip)(path.join(PATH_ZIP_APP, 'package.json'), {
	    		type: TYPE_JSON,
	    		val: {
	    			main: 'import.js'
	    		}
	    	});
	    }
	    var file_path_save;
	    var tree_map = _initTree($('#tree_map'), treeDataGeo);
	    var tree_legend = _initTree($('#tree_legend'), treeDataLegend);
	    function _afterExport() {
	    	$btn_export.val(val_btn_export);
			_log('------------- 导出成功! -------------');
			shell.showItemInFolder(file_path_save);

	    }
		function _export() {
			var flag_product = _isChecked(tree_product.get_json()[0]);
			if (!flag_product) {
				return _alert('没有要导出的产品！');
			}

			var flag_map = _isChecked(tree_map.get_json()[0]);
			if (!flag_map) {
				return _alert('没有要导出的地图！');
			}
			var flag_legend = _isChecked(tree_legend.get_json()[0]);
			if (!flag_legend) {
				return _alert('没有要导出的图例！');
			}

			file_path_save = null;
			util.ui.dialog.save(path.join('蓝PI制图测试数据_'+(new Date().format('yyyy-MM-dd'))+'.zip'), function(file_path) {
				file_path_save = file_path;
				var zip = _zip(file_path_save);
				var writer = _getWriter(zip);
				var step = 1;
				_log('('+(step++)+') 正在导出产品配置及相关数据文件');
				_exportProduct(writer, function() {
					_log('('+(step++)+') 正在导出地图配置及相关数据文件');
					_exportMap(writer);
					_log('('+(step++)+') 正在导出图例配置');
					_exportLegend(writer);

					_exportSource(zip);
					zip.finalize();

					_log('正在处理压缩文件：'+file_path_save);
				});
			});
		}
		var $btn_export = $('#btn_export').click(function() {
			if ($btn_export.val() == val_dealing) {
				return;
			}
			_log('', true);
			$btn_export.val(val_dealing);
			setTimeout(_export, 10);
		});
		var val_dealing = '正在处理';
		var val_btn_export = $btn_export.val();
	});
}()