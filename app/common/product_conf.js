/**
 * 主要操作/app/config下文件（用户配置文件）
 */
!function(){
	var util = require('./util');
	var util_path = util.path;
	var util_file = util.file;
	var CONST = require('./const');
	var CONST_PATH_CONFIG = CONST.PATH.CONFIG;
	var CONST_SIZE = CONST.SIZE;
	var CONST_EXT = '.json';

	function _getPathByName(name){
		return util_path.join(CONST_PATH_CONFIG, name)+CONST_EXT;
	}
	function _readConfig(name){
		return util_file.read(_getPathByName(name), true);
	}
	function _saveConfig(name, json){
		return util_file.write(_getPathByName(name), json);
	}
	function _rmConfig(name){
		return util_file.rm(_getPathByName(name));
	}
	function _renameConfig(name_old, name_new) {
		return util_file.rename(_getPathByName(name_old), _getPathByName(name_new));
	}

	var CONST_SYSCONF_NAME = '.sys/sys';
	var CONST_SYS_PRODUCT_TREE_NAME = '.sys/sys_product_tree';
	function _getSys() {
		return _readConfig(CONST_SYSCONF_NAME);
	}
	_getSys.getGeo = function(name) {
		// 命令行传入配置
		if (util.isPlainObject(name)) {
			return name;
		}
		var conf = _getSys() || {};
		var geo = conf.geo || [];
		if (!name) {
			// name 等于空字符串时加载默认地图
			if (name === '') {
				for (var i = 0, j = geo.length; i<j; i++) {
					if (geo[i].is_default) {
						return geo[i];
					}
				}
			}
			return geo;
		} else {
			name = name.trim();
			for (var i = 0, j = geo.length; i<j; i++) {
				if (name == geo[i].name) {
					return geo[i];
				}
			}
		}
	}
	_getSys.getLegend = function(name) {
		// 命令行传入配置
		if (util.isPlainObject(name)) {
			// 对颜色进行排序，保证值从小到大
			var colors = name.colors;
			if (colors) {
				colors.sort(function(a, b) {
					return a.val[0] - b.val[0];
				});
			}
			return {
				"blendent": [util.extend(name, {
					val: {
						v: '',
						code: ''
					}
				})]
			}
		}
		var conf = _getSys() || {};
		var legend = conf.legend || [];
		legend.unshift({
			name: '无'
		});
		if (!name) {
			return legend;
		} else {
			name = name.trim();
			for (var i = 0, j = legend.length; i<j; i++) {
				if (name === legend[i].name) {
					return legend[i];
				}
			}
		}
	}
	var SIZE_DEFAULT = {
		name: CONST_SIZE.NAME,
		width: CONST_SIZE.WIDTH,
		height: CONST_SIZE.HEIGHT
	};
	_getSys.getSize = function(index) {
		var conf = _getSys() || {};
		var size = conf.size || [];
		size.unshift(SIZE_DEFAULT);
		if (index !== undefined) {
			var val = size[index];
			if (!val) {
				for (var i = 0, j = size.length; i<j; i++) {
					var v = size[i];
					if (v.is_default) {
						val = v;
						break;
					}
				}
			}
			return val;
		} else {
			return size;
		}
	}
	_getSys.getAssets = function(key) {
		var conf = _getSys() || {};
		var assets = conf.assets || [];
		if (key) {
			for (var i = 0, j = assets.length; i<j; i++) {
				var item = assets[i];
				if (item.id == key) {
					return item;
				}
			}
		} else {
			return assets;
		}
	}
	function _assets(assets, is_use_sys) {
		if (!is_use_sys) {
			return assets;
		} else {
			var assets_new = [];
			for (var i = 0, j = assets.length; i<j; i++) {
				var item = assets[i];
				if (item.flag) {
					var key = item.key;
					if (key) {
						item = _getSys.getAssets(key);
					}
					if (item) {
						assets_new.push(item);
					}
				}
			}
			return assets_new;
		}
	}
	function _saveSys(json) {
		return _saveConfig(CONST_SYSCONF_NAME, json);
	}
	function _getTree() {
		return _readConfig(CONST_SYS_PRODUCT_TREE_NAME);
	}
	function _saveTree(json) {
		return _saveConfig(CONST_SYS_PRODUCT_TREE_NAME, json);
	}
	var config = {
		read: _readConfig,
		save: _saveConfig,
		rename: _renameConfig,
		rm: _rmConfig,
		getSys: _getSys,
		setSys: _saveSys,
		getTree: _getTree,
		setTree: _saveTree,
		util: {
			assets: _assets
		}
	};

	module.exports = config;
}()
