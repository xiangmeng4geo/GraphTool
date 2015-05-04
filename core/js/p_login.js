Core.safe(function(){
	var core = Core.Lib;
	var conf = core.conf;
	var util = core.util,
		Store = Core.Store;
	// Core.Window.get().showDevTools();	
	var coreWindow = Core.Window;
	var win = coreWindow.get();

	var _frame = Core.frame;
	_frame.move($('.top'));
	$('.btn_close').on('click', _frame.close);
	// /*测试 ｛*/
	// win.close();
	// return Core.Page.confProduct();
	// /*} 测试*/

	$('#btn_cancel').click(function(){
		win.close();
	});
	var $username = $('#username'),
		$userpwd = $('#userpwd');
	var verification = conf.getVerification();
	function wrapPwd(pwd){
		return util.encrypt(pwd,verification.key);
	}
	function login(name,pwd,is_autologin){
		if(!is_autologin){
			pwd = wrapPwd(pwd);
		}
		return (name == verification.name && pwd == verification.pwd)
	}
	var $cb_remember = $('#cb_remember'),
		$cb_autologin = $('#cb_autologin');
	var is_remember = Store.get('user_is_remember',false);
	$cb_remember.prop('checked',is_remember);

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
	var is_autologin = Store.get('user_is_autologin',false);
	$cb_autologin.prop('checked',is_autologin);
	if(is_autologin){
		var name = Store.get('user_name');
		var pwd = Store.get('user_pwd');
		if(name && pwd){
			return afterLogin(login(name,pwd,true));
		}
	}
	// win.showDevTools();
	win.show();
	win.focus();
	function afterLogin(login_flag,true_fn,false_fn){
		if(login_flag){
			var $initializing = $('.initializing').show();
			var start_time = new Date();
			var min_init_time = 2000;
			(true_fn || function(){})();
			var win_index = Core.Page.main();
			var fn_inited = function(){
				Core.require('child_process').exec(process.execPath+' '+Core.Lib.util.file.path.core+'/autowork');
				var init_time = (new Date()-start_time)/1000;
				// win_index.removeAllListeners();
				setTimeout(function(){
					win_index.show();
					win_index.focus();
					win.close();
				},min_init_time-init_time);
			}
			win_index.once('inited',fn_inited);
		}else{
			(false_fn || function(){
				alert('您输入的用户和密码错误，请重新输入！');
			})();
		}
	}

	$username.val(Store.get('user_name'));
	
	Core.Window.onKeyEnter(function(){
		$btn_login.click();
	});
	var $btn_login = $('#btn_login').click(function(){
		var username = $username.val();
		if(!username){
			return alert('请输入用户名!');
		}
		var pwd = $userpwd.val();
		if(!pwd){
			return alert('请输入密码!');
		}

		afterLogin(login(username,pwd,is_encrypt),function(){
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