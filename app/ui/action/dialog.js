!function(){
	'use strict'
	
	let remote = require('remote');
	
	let dialog = remote.require('dialog');
	let win_instance = remote.getCurrentWindow();
	
	let Dialog = {
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