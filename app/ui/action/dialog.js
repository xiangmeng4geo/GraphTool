!function(){
	'use strict'

	var remote = require('remote');

	var dialog = remote.require('dialog');
	var win_instance = remote.getCurrentWindow();

	var Dialog = {
		alert: function(msg){
			dialog.showMessageBox(win_instance, {
				type: 'info',
				buttons: ['yes'],
				title: '系统提示',
				message: msg,
				icon: null
			});
		},
		/*
		confirm1({
			title: '标题',
			detail: '详细信息',
			msg: '消息',
			buttons: [{
				name: '打开消息',
				cb: function() {

				}
			}, {
				name: 'yes'
			}]
		})*/
		confirm1: function(options) {
			var msg = options.msg,
				buttons = options.buttons || ['yes', 'no'],
				detail = options.detail,
				title = options.title || '系统提示';

			var button_names = [];
			for (var i = 0, j = buttons.length; i<j; i++) {
				button_names.push(buttons[i].name);
			}
			var conf = {
				type: 'info',
				buttons: button_names,
				title: title,
				message: msg,
				icon: null
			};
			if (detail) {
				conf.detail = detail;
			}
			return dialog.showMessageBox(win_instance, conf, function(index){
				var btn = buttons[index];
				var cb = btn.cb;
				cb && cb();
			});
		},
		confirm: function(msg, cb_yes, cb_no) {
			return this.confirm1({
				buttons: [{
					name: 'yes',
					cb: cb_yes
				}, {
					name: 'no',
					cb: cb_no
				}]
			});
			// return dialog.showMessageBox(win_instance, {
			// 	type: 'info',
			// 	buttons: ['yes', 'no'],
			// 	title: '系统提示',
			// 	message: msg,
			// 	icon: null
			// }, function(index){
			// 	if (index == 0) {
			// 		cb_yes && cb_yes();
			// 	} else {
			// 		cb_no && cb_no();
			// 	}
			// });
		},
		open: function(options, callback) {
			return dialog.showOpenDialog(win_instance, options, callback);
		},
		save: function(options, callback) {
			return dialog.showSaveDialog(win_instance, options, callback);
		}
	};
	module.exports = Dialog;
}()
