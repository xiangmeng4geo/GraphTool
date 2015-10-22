/* global global */
/* global __dirname */
!function(){
	"use strict";
	
	let path = require('path');
	let window = require('./window');
	let app = require('app');
	
	global.gtStart = (new Date).getTime();
		
	app.on('window-all-closed', function () {
		app.quit();
	});
	
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
					win.restore();
					win.focus();
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