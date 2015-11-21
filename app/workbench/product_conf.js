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
	
	var CONST_SYSCONF_NAME = 'sys';
	var CONST_SYS_PRODUCT_TREE_NAME = 'sys_product_tree';
	function _getSysConf() {
		return _readConfig(CONST_SYSCONF_NAME);
	}
	function _saveSysConf(json) {
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
		rm: _rmConfig,
		getSys: _getSysConf,
		setSys: _saveSysConf,
		getTree: _getTree,
		setTree: _saveTree
	};

	module.exports = config;
}()