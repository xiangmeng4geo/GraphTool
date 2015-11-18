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
		}
	};
	module.exports = Dialog;
}()
