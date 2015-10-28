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
	var config = {
		read: _readConfig,
		save: _saveConfig,
		rm: _rmConfig
	};

	module.exports = config;
}()