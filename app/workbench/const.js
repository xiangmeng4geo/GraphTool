/* global __dirname */
/**
 * 定义常量
 */
!function(){
	'use strict'
	
	var path = require('path');
	
	function format(url){
		var arr = url.replace(/\\/g, '/').split(':');
		return [arr[0].toUpperCase(), arr[1]].join(':');
	}
	var path_base = format(path.join(__dirname, '..'));
	var path_ui_conf = format(path.join(path_base, 'conf/ui'));
	var path_ui = format(path.join(path_base, 'ui'));
	var path_workbench = format(path.join(path_base, 'workbench'));
	var path_conf = format(path.join(path_base, 'conf'));
	var path_config = format(path.join(path_base, 'config'));

	module.exports = {
		PATH: {
			BASE: path_base,
			CONF: path_conf,
			CONFIG: path_config,
			UI: path_ui,
			UI_CONF: path_ui_conf,
			WORKBENCH: path_workbench
		},
		LOG: {
			PATH: format(path.join(path_base, 'logs')),
			DELAY: 10, 	// 异步写日志间隔(s)
			DAYS: 3		// 日志保留天数
		}
	}
}();