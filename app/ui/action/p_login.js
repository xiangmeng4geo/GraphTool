/* global Core */
Core.init(function(){
	'use strict'

	var C = Core;
	var $ = C.$;
	var _require = C.require;

	var Store = _require('store');
	var Dialog = _require('dialog');
	var dialog_alert = Dialog.alert;
	var util = _require('util');
	var util_verification = util.verification;

	function close(){
		window.close();
	}

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

	function _showLoading(cb) {
		var $main = $('.main');
		var width = $main.width(),
			height = $main.height();
		var $canvas = $('<canvas>').css({
			position: 'absolute',
			left: 0,
			top: 0,
			'z-index': 102,
			'background-color': 'rgba(0, 0, 0, 0.8)'
		}).addClass('br5').attr({
			width: width,
			height: height
		}).appendTo('.main');

		var lightLoader = _require('p_login_loading');
		var cl = new lightLoader($canvas.get(0), width, height);
		cl.updateLoader = function() {
			this.loaded += 0.6;
			if (this.loaded >= 100) {
				cl.stop();
				cb();
			}
		}
		cl.init();
	}
	var verification = util_verification.get();
	function afterLogin(login_flag, true_fn, false_fn){
		if(login_flag){
			var start_time = new Date();
			var min_init_time = 2000;
			var num_loaded = 2;
			function cb() {
				if (--num_loaded <= 0) {
					C.emit('login.closed');
					close();
				}
			}
			_showLoading(cb);
			(true_fn || function(){})();
			C.on('main.loaded', cb);
			C.Win.open('main');
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