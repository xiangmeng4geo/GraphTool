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

	Core.WIN.openDevTools();
	// var addon = require('f:/source/node_projects/node_modules/webworker-threads');
	// console.log(addon);
	// function fibo(n) {
	// 	return n > 1 ? fibo(n - 1) + fibo(n - 2) : 1;
	// }
	// // require('path').join(__dirname, '../../webworker-threads');
	// /// Then, we create a worker thread with the `Threads.create` call:
	// // var Threads = require(require('path').join(__dirname, '../../webworker-threads'));
	// var Threads = require('webworker-threads');
	// var t = Threads.create();
	// /// In the next step, we load the function into the worker thead.
	// /// We get the function's source with `fibo.toString()` and we 
	// /// call `t.eval(source)` to evalutate it into the worker thread's context:
	// t.eval(fibo);
	// /// Now, we are ready to call this function.
	// /// We use the `t.eval` function again, with two arguments this time.  
	// /// The first argument is the expression to evaluate.  
	// /// The second one is a callback that receives the result (or an error if there was one).
	// t.eval('fibo(10)', function(err, result) {
	// 	if (err) throw err; // something abnormal
	// 	// print the result
	// 	console.log('fibo(10)=' + result);
	// 	// chain with next step
	// 	step2();
	// });

	// var Threads = require('webworker-threads');
	var Threads = require('f:/source/node_projects/WebWorkerThreads');
	var t = Threads.create();

	// Listening to 'data' events from the worker thread
	t.on('data', function(n, result) {
		console.log(arguments);
	});
	var js = require('path').join(__dirname, '../1.js');
	console.log(js);
	/// At this point we load the worker code:
	t.load(js);
	/// And we start the game by emitting the first `next` event:
	t.emit('init', require('util'));
	t.emit('next', 1);


	// t.on('data', function(){
	// 	console.log('main', arguments);
	// });
	// var js = require('path').join(__dirname, '../1.js');
	// console.log(js);
	// t.load(js);
	// t.emit('data');
	// t.on('data', function(n, result){
	// 	console.log(arguments);
	// });
	// function work(a, b){
	// 	thread.emit('data', JSON.stringify([a, b]));
	// 	var time_start = new Date();
	// 	while(1){
	// 		if(new Date() - time_start >= 10*1000){
	// 			break;
	// 		}
	// 	}	
	// 	thread.emit('data', 'after 10s');
	// }
	// t.eval(work);
	// t.eval('work(1, {name:"tonny"})');
	// var worker = new Threads.Worker(function(){
	// 	this.onmessage = function(e){
	// 		console.log('from main', e.data);
	// 		var time_start = new Date();
	// 		while(1){
	// 			if(new Date() - time_start >= 10*1000){
	// 				postMessage('after 10s');
	// 				break;
	// 			}
	// 		}	
	// 	}
	// });
	// worker.onmessage = function(e){
	// 	console.log('got msg: ', e.data);
	// };
	// worker.postMessage('begin');

	// function run(){
	// 	console.log(new Date());
	// 	setTimeout(run, 500);
	// }
	// run();
});
