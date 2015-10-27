/* global __dirname */
/**
 * 定义常量
 */
!function(){
	'use strict'
	
	let path = require('path');
	
	function format(url){
		let arr = url.replace(/\\/g, '/').split(':');
		return [arr[0].toUpperCase(), arr[1]].join(':');
	}
	let path_base = format(path.join(__dirname, '..'));
	let path_ui_conf = format(path.join(path_base, 'conf/ui'));
	let path_ui = format(path.join(path_base, 'ui'));
	let path_workbench = format(path.join(path_base, 'workbench'));
	let path_conf = format(path.join(path_base, 'conf'));
	
	module.exports = {
		PATH: {
			BASE: path_base,
			CONF: path_conf,
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