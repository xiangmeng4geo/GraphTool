/* global process */
/* global global */
/* global __dirname */
!function(){
	"use strict";
	
	var app = require('app');
	var ipc = require('ipc');
	var BrowserWindow = require('browser-window');
	var path = require('path');
	var _window = require('./window');
	var logger = require('./logger');
	
	global.gtStart = (new Date).getTime();
	
	// 捕获系统级错误，方便调试
	process.on('uncaughtException', function(err){
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
	ipc.on('emit', function(e, data){
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
	});
	/**
	 * 确保主程序是单例模式
	 */
	function ensure_single(onSingle){
		var net = require('net');
		var socket = path.join('\\\\?\\pipe', app.getName());
		net.connect({path: socket}, function(){
			app.terminate();
		}).on('error', function(err){
			try{
				require('fs').unlinkSync(socket);
			}catch(e){
				if(e.code != 'ENOENT'){
					throw e;
				}
			}
			onSingle();
			net.createServer(function(){
				var win = _window.getLast();
				if(win){
					win.setAlwaysOnTop(true);
					win.restore();
					win.focus();
					win.setAlwaysOnTop(false);
				}
			}).listen(socket);
		}).on('data', function(){
		}).on('close', function(){
		});
	}
	app.on('ready', function () {
		var loginWin = _window.getInstance('login');
		ipc.on('wait.main', function(e, data){
			loginWin.send('wait.login', true);
		});
		ensure_single(function() {
			_window.load(loginWin, 'login');
		});
	});
}();