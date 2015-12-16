/* global __dirname */
/**
 * 定义常量
 */
! function() {
	'use strict'

	var path = require('path');

	function format(url) {
		var arr = url.replace(/\\/g, '/').split(':');
		return [arr[0].toUpperCase(), arr[1]].join(':');
	}
	var path_base = format(path.join(__dirname, '..'));
	var path_ui_conf = format(path.join(path_base, 'conf/ui'));
	var path_ui = format(path.join(path_base, 'ui'));
	var path_workbench = format(path.join(path_base, 'workbench'));
	var path_common = format(path.join(path_base, 'common'));
	var path_conf = format(path.join(path_base, 'conf'));
	var path_config = format(path.join(path_base, 'config'));
	var path_cache = format(path.join(path_base, 'cache'));
	var path_output = format(path.join(path_base, 'output'));
	var path_gallery = format(path.join(path_base, 'image'));

	var path_img_ball = format(path.join(path_ui, 'img/ball.png'));

	var conf = {
		GEO: {
			FILE: format(path.join(path_base, 'data', 'sx.json')),
			FLAGS: [{
				text: '无',
				val: ''
			}, {
				text: path_img_ball,
				val: path_img_ball,
				type: 'img'
			}]
		},
		COLOR: {
			TRANSPANT: 'rgba(0,0,0,0)'
		},
		PATH: {
			BASE: path_base,
			CONF: path_conf,
			CONFIG: path_config,
			UI: path_ui,
			UI_CONF: path_ui_conf,
			WORKBENCH: path_workbench,
			COMMON: path_common,
			CACHE: path_cache,
			OUTPUT: path_output,
			GALLERY: path_gallery
		},
		LOG: {
			PATH: format(path.join(path_base, 'logs')),
			DELAY: 10, // 异步写日志间隔(s)
			DAYS: 3 // 日志保留天数
		},
		TOOLBAR: (function() {
			var arr = [
				[{
					id: 'move',
					title: '移动'
				}, {
					id: 'zoomin',
					title: '放大'
				}, {
					id: 'zoomout',
					title: '缩小'
				}, {
					id: 'reset',
					title: '还原地图状态'
				}],
				[{
						id: 'text',
						title: '添加文字'
					}, {
						id: 'img',
						title: '添加图片'
					}, {
						id: 'gallery',
						title: '打开图片库'
					},
					// {
					// 	id: 'polygon',
					// 	title: '添加多边形'
					// }
				],
				[{
					id: 'save',
					title: '保存图片'
				}]
			];
			arr.forEach(function(v) {
				v.forEach(function(item) {
					item.icon = path.join(path_ui, 'img/toolbar', item.id + '.png')
				})
			});
			return arr;
		})()
	};

	var conf_const;
	try {
		conf_const = require('../conf/const');
	} catch (e) {}

	for (var i in conf_const) {
		conf[i] = conf_const[i];
	}
	module.exports = conf;
}();