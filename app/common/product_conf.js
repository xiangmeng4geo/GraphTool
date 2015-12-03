/**
 * 主要操作/app/config下文件（用户配置文件）
 */
!function(){
	var util = require('./util');
	var util_path = util.path;
	var util_file = util.file;
	var CONST_PATH_CONFIG = require('./const').PATH.CONFIG;
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
		var conf = _getSys() || {};
		var geo = conf.geo || [];
		if (!name) {
			// name 等于空字符串时加载默认地图
			if (name === '') {
				for (var i = 0, j = geo.length; i<j; i++) {
					if (geo[i].default) {
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
		var conf = _getSys() || {};
		var legend = conf.legend || [];
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
		setTree: _saveTree
	};

	module.exports = config;
}()
