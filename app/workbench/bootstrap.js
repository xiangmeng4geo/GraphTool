/* global process */
/* global global */
/* global __dirname */
!function(){
	"use strict";

	var app = require('app');
	var electron = require('electron');
	var ipc = electron.ipcMain;
	var crashReporter = electron.crashReporter;
	var BrowserWindow = require('browser-window');
	var path = require('path');
	var _window = require('./window');
	var logger = require('../common/logger');
	var CONST = require('../common/const');
	var CONST_COMMAND = CONST.COMMAND;
	var util = require('../common/util');
	var util_file_mkdir = util.file.mkdir;

	// 创建必要的目录
	util_file_mkdir(CONST.PATH.CACHE);

	global.gtStart = (new Date).getTime();

	// 捕获系统级错误，方便调试
	process.on('uncaughtException', function(err){
		console.log(err);
		logger.error(err);
	});

	app.on('window-all-closed', function () {
		app.quit();
	});
	var subscibe_list = {};
	ipc.on('subscibe', function(e, type){
		var sender = e.sender;
		var id = BrowserWindow.fromWebContents(sender).id;

		var list = subscibe_list[type] || (subscibe_list[type] = []);
		if(list.indexOf(id) == -1){
			list.push(id);
		}
	});
	function _emit(data){
		var type = data.type;
		var msg = data.msg;
		var list = subscibe_list[type];
		if(list && list.length > 0){
			list.forEach(function(id){
				var win = BrowserWindow.fromId(id);
				if(win){
					win.send(type, msg);
				}
			});
		}
	}
	ipc.on('emit', function(e, data){
		_emit(data);
	});

	/**
	 * 确保主程序是单例模式
	 */
	function ensure_single(onSingle){
		var net = require('net');
		var socket = path.join('\\\\?\\pipe', app.getName());
		net.connect({path: socket}, function(){
			app.quit();
		}).on('error', function(err){
			try{
				require('fs').unlinkSync(socket);
			}catch(e){
				if(e.code != 'ENOENT'){
					throw e;
				}
			}
			onSingle();
			net.createServer(function(c){
				var tt_focus;
				var tt_data;
				var str = '';
				c.on('data', function(d){
					str += d;
					clearTimeout(tt_data);
					clearTimeout(tt_focus);
					if (CONST_COMMAND) {
						tt_data = setTimeout(function() {
							// 解析命令行参数
							require('./command')(str, function(err, msg) {
								var info = {};
								err && (info.err = err);
								msg && (info.msg = msg);
								var str = JSON.stringify(info);
								(err || msg) && c.write(str);
								c.end('\n');
							});
						}, 100);
					}
				}).on('end', function(){
					/**
					 * 直接写在end事件里的回调一直不会触发！！
					 */
				});
				tt_focus = setTimeout(function() {
					if (str) {//命令行调用
						return;
					}

					// ui主进程启动时直接得到焦点，否则重新打开
					if (_window.isOpenedUi()) {
						_window.setFocusToLast();
					} else {
						_getMainWin();
					}
				}, 100);
			}).listen(socket);
		}).on('data', function(){
		}).on('close', function(){
		});
	}
	function _getMainWin(is_use_single) {
		var loginWin = _window.getInstance('login');
		ipc.on('wait.main', function(e, data){
			loginWin.send('wait.login', true);
		});
		function cb() {
			_window.load(loginWin, 'login');
		}
		if (is_use_single) {
			ensure_single(cb);
		} else {
			cb();
		}
		return loginWin;
	}

	app.on('ready', function() {

			var a = crashReporter.start({
				productName: app.getName(),
				companyName: '华新创新网络',
				submitURL: 'http://10.14.85.116/php/crashreporter/',
				autoSubmit: true,
				ignoreSystemCrashHandler: true,
				extra: {
					content: 'tonny test',
					name: 'tonny'
				}
			});
			console.log(crashReporter, a);
		_getMainWin(true);
	});
}();
