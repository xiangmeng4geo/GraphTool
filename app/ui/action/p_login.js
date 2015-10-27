/* global Core */
Core.init(function(){
	'use strict'

	var C = Core;
	var $ = C.$;
	var remote = C.remote;

	var Store = C.load('store');
	var Dialog = C.load('dialog');
	var dialog_alert = Dialog.alert;
	var util = remote('util');
	var util_verification = util.verification;
	var win = remote('window');

	function close(){
		window.close();
	}

	C.emit('ready');
	$('.btn_close').on('click', close);

	var $username = $('#username'),
		$userpwd = $('#userpwd');
	var $cb_remember = $('#cb_remember'),
		$cb_autologin = $('#cb_autologin');
	var is_remember = Store.get('user_is_remember', false);
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

	var verification = util_verification.get();
	function afterLogin(login_flag, true_fn, false_fn){
		if(login_flag){
			var $initializing = $('.initializing').show();
			var start_time = new Date();
			var min_init_time = 2000;
			(true_fn || function(){})();

			C.on('main.loaded', function(){
				setTimeout(function(){
					C.emit('login.closed');
					close();
				}, min_init_time);
			});
			win.open('main');
		}else{
			(false_fn || function(){
				dialog_alert('您输入的用户和密码错误，请重新输入！');
			})();
		}
	}
	function wrapPwd(pwd){
		return util.encrypt(pwd, verification.key);
	}
	function login(name, pwd, is_autologin){
		if(!is_autologin){
			pwd = wrapPwd(pwd);
		}
		return (name == verification.name && pwd == verification.pwd)
	}
	$username.val(Store.get('user_name'));
	if(is_autologin){
		var name = Store.get('user_name');
		var pwd = Store.get('user_pwd');
		if(name && pwd){
			return afterLogin(login(name, pwd, true));
		}
	}
	$(document).off('keypress').on('keypress',function(e){
		if(e.which == 13){
			$btn_login.click();
		}
	});
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
