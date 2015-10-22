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
	module.exports = {
		PATH: {
			BASE: path_base,
			UI_CONF: path_ui_conf,
			UI: path_ui
		}
	}
}();