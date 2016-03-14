!function() {
	var path = require('path');
	var fs = require('fs');
	var util = require('./util');

	util.init('export', function() {
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

		var path_user = path.join(require('os').homedir(), 'BPA', 'GT');
		var path_config = path.join(path_user, 'config');

		var PATH_DATA = path.join(__dirname, 'data');
		var PATH_DATA_CONFIG = path.join(PATH_DATA, 'config');
		var PATH_DATA_DATA = path.join(PATH_DATA, 'data');
		var PATH_DATA_GEOFILE = path.join(PATH_DATA, 'geo');

		var $log = $('#log'),
			$logTextarea = $log.find('textarea');
		function _log(msg) {
			$logTextarea.val($logTextarea.val()+'\n'+msg);
			console.log(msg);
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
		function _exportProduct() {
			var result = _getAllChecked(tree_product);
			function _copy(arr) {
				arr.forEach(function(v) {
					var children = v.childNodes;
					if (children) {
						_copy(children);
					} else {
						try {
							var conf = require(path.join(path_config, v.name));
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
								util.file.copy(file_path, path.join(PATH_DATA_DATA, file_name));

								_log('\t复制'+file_path);

								conf_val.file_rule.is_common = false;
								conf_val.file_rule.val_custom = file_name;
							}
							conf_val.dir_in = '';
							_log('成功处理'+v.name);
						}
					}
				});
			}
			_copy(result);
			util.file.write(path.join(PATH_DATA_CONFIG, '.tree.json'), JSON.stringify(result));
		}
		function _exportMap() {
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
							util.file.copy(file, path.join(PATH_DATA_GEOFILE, file_name));
							map_file.file = file_name;
							maps_new.push(map_file);
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
			util.file.write(path.join(PATH_DATA_CONFIG, '.maps.json'), JSON.stringify(data_map));
			_log('成功导出'+data_map.length+'条地图配置！');
		}
		function _exportLegend() {
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

			util.file.write(path.join(PATH_DATA_CONFIG, '.legend.json'), JSON.stringify(data));
			_log('成功导出'+data.length+'条地图配置！');
		}

		var treeDataProduct = [{
	        name: '全部产品',
	        childNodes: util.getProductTree()
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
	                        opened: level < 1
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

	    var data_sys = util.getSys();
	    var data_sys_geo = data_sys.geo;
	    var data_sys_legend = data_sys.legend;

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
	    	children: _getGeoChild()
	    }];
	    var treeDataLegend = [{
	    	text: '全部图例',
	    	children: _getLegendChild()
	    }];


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
	    var tree_map = _initTree($('#tree_map'), treeDataGeo);
	    var tree_legend = _initTree($('#tree_legend'), treeDataLegend);
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

			if (flag_product) {
				_exportProduct();
			}
			if (flag_map) {
				_exportMap();
			}
			if (flag_legend) {
				_exportLegend();
			}

			_alert('导出成功！');
		}
		$('#btn_export').click(_export);
	});
}()