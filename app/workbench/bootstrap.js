/* global process */
/* global global */
/* global __dirname */
!function(){
	"use strict";
	
	let path = require('path');
	let window = require('./window');
	let app = require('app');
	let logger = require('./logger');
	
	global.gtStart = (new Date).getTime();
	
	// 捕获系统级错误，方便调试
	process.on('uncaughtException', function(err){
		logger.error(err.stack);
	});
	
	app.on('window-all-closed', function () {
		app.quit();
	});
	
	/**
	 * 确保主程序是单例模式
	 */
	function ensure_single(onSingle){
		let net = require('net');
		let socket = path.join('\\\\?\\pipe', app.getName());
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
				let win = window.getLast();
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
		let loginWin = window.getInstance('login');
		
		ensure_single(() => {
			window.load(loginWin, 'login');
		});
	});
}();