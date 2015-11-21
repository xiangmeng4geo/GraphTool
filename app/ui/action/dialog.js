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
		confirm: function(msg, cb_yes, cb_no) {
			return dialog.showMessageBox(win_instance, {
				type: 'info',
				buttons: ['yes', 'no'],
				title: '系统提示',
				message: msg,
				icon: null
			}, function(index){
				if (index == 0) {
					cb_yes && cb_yes();
				} else {
					cb_no && cb_no();
				}
			});
		}
	};
	module.exports = Dialog;
}()
