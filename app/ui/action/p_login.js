/* global Core */
Core.safe(function(){
	'use strict'
	
	let C = Core;
	let $ = C.$;
	let remote = C.remote;
	
	let Store = C.load('store');
	let Dialog = C.load('dialog');
	let dialog_alert = Dialog.alert;
	
	let win = remote('window');
	
	function close(){
		win.getCurrent().close();
	}
	$('.btn_close').on('click', close);
	
	let $username = $('#username'),
		$userpwd = $('#userpwd');
	let $cb_remember = $('#cb_remember'),
		$cb_autologin = $('#cb_autologin');
	let is_remember = Store.get('user_is_remember', false);
	$cb_remember.prop('checked', is_remember);
	
	var is_encrypt = false;
	if(is_remember){
		var pwd = Store.get('user_pwd');
		if(pwd){
			is_encrypt = true;
			$userpwd.on('change',function(){
				is_encrypt = false;
			});
		}
		$userpwd.val(pwd);
	}
	
	var is_autologin = Store.get('user_is_autologin', false);
	$cb_autologin.prop('checked', is_autologin);
	
	let verification = {};
	function afterLogin(login_flag, true_fn, false_fn){
		if(login_flag){
			var $initializing = $('.initializing').show();
			var start_time = new Date();
			var min_init_time = 2000;
			(true_fn || function(){})();
			
			win.open('main');
			close();
		}else{
			(false_fn || function(){
				dialog_alert('您输入的用户和密码错误，请重新输入！');
			})();
		}
	}
	function wrapPwd(pwd){
		// return util.encrypt(pwd,verification.key);
	}
	function login(name, pwd, is_autologin){
		if(!is_autologin){
			pwd = wrapPwd(pwd);
		}
		return (name == verification.name && pwd == verification.pwd)
	}
	if(is_autologin){
		var name = Store.get('user_name');
		var pwd = Store.get('user_pwd');
		if(name && pwd){
			return afterLogin(login(name, pwd, true));
		}
	}
	$username.val(Store.get('user_name'));
	// Core.Window.onKeyEnter(function(){
	// 	$btn_login.click();
	// });
	var $btn_login = $('#btn_login').click(function(){
		var username = $username.val();
		if(!username){
			return dialog_alert('请输入用户名!');
		}
		var pwd = $userpwd.val();
		if(!pwd){
			return dialog_alert('请输入密码!');
		}

		afterLogin(login(username, pwd, is_encrypt),function(){
			Store.set('user_name',username);
			var is_remember = $cb_remember.prop('checked');
			Store.set('user_is_remember',is_remember);
			var is_autologin = $cb_autologin.prop('checked');
			Store.set('user_is_autologin',is_autologin);
			if(is_remember){
				Store.set('user_pwd',is_encrypt?pwd:wrapPwd(pwd));
			}else{
				Store.rm('user_pwd');
			}
		});
	});
});