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
	var command = require('./command');
	var CONST = require('./const');
	// var util = require('./util');
	// var util_file_mkdir = util.file.mkdir
	//
	// // 创建必要的目录
	// util_file_mkdir(CONST.PATH.CACHE);

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

	// 把ipc当成一个EventEmitter处理,Util.Model.[emit|log]触发
	ipc.on('ui', function(data) {
		_emit({
			type: data.name,
			msg: {
				type: data.type,
				msg: data.msg
			}
		});
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
			net.createServer(function(c){
				var tt_data;
				var str = '';
				c.on('data', function(d){
					str += d;
					clearTimeout(tt_data);
					tt_data = setTimeout(function() {
						command(str, function(msg) {
							msg && c.write(msg);
							c.end('\n');
						});

					}, 100);
				}).on('end', function(){
					/**
					 * 直接写在end事件里的回调一直不会触发！！
					 */
				});
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
