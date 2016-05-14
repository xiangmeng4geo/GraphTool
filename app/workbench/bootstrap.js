/* global process */
/* global global */
/* global __dirname */
!function(){
	// "use strict";

	var electron = require('electron');
	var app = electron.app;
	var ipc = electron.ipcMain;
	var crashReporter = electron.crashReporter;
	var BrowserWindow = electron.BrowserWindow;//require('browser-window');
	var path = require('path');
	var _window = require('./window');
	var logger = require('../common/logger');
	var CONST = require('../common/const');
	var CONST_COMMAND = CONST.COMMAND;
	var util = require('../common/util');
	var util_file_mkdir = util.file.mkdir;

	var is_use_command = CONST_COMMAND;
	if (!is_use_command) {
		var argv = process.argv;
		for (var i = 0, j = argv.length; i<j; i++) {
			if (argv[i].indexOf('--command') > -1) {
				is_use_command = true;
				break;
			}
		}
	}
	if (is_use_command) {
		// 和解耦合
		require('./command');
	}
	// 启动处理缓存和日志文件的子进程
	require('child_process').fork(path.join(__dirname, '../common/cache'));

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
    ipc.on('emit1', function(e, data){
        console.log(arguments);
		_emit(data);
	});
	function _login() {
		var loginWin = _window.getInstance('login');
		ipc.on('wait.main', function(e, data){
			loginWin.send('wait.login', true);
		});
		_window.load(loginWin, 'login');
	}
	var shouldQuit = app.makeSingleInstance(function() {
		if (_window.isOpenedUi()) {
			_window.setFocusToLast();
		} else {
			_login();
		}
	});
	if (shouldQuit) {
		app.quit();
		return;
	}
	app.on('ready', function() {
        _window.shortcut();
		_login();
	});
}();
