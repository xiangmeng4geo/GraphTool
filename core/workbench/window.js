!function(){
	'use strict'
	/**
	 * 这里主要操作窗口
	 */
	
	let path = require('path');
	let fs = require('fs');
	let CONST = require('./const');
	let PATH = CONST.PATH;
	let BrowserWindow = require('browser-window');
	
	/**
	 * 得到一个`browser-window`实例
	 */
	let get_win = function(name){
		let conf;
		try{
			conf = require(path.join(PATH.UI_CONF, name+'.json'));
		}catch(e){
			conf = {
				width: 800,
				height: 600
			}
		}
		let win = new BrowserWindow(conf);
		
		win.CONST = CONST;	
		return win;
	}
	
	/**
	 * 加载页面
	 */
	let win_load = function(win, name){
		if(win){
			win.loadUrl(path.join('file://' , PATH.UI, name+ '.html'));
			// console.log(win.webContents);
			let content = win.webContents;
			content.on('did-finish-load', function(){
				fs.readFile(path.join(PATH.UI, 'action/core.js'), function(e, str_js){
					content.executeJavaScript(str_js.toString());
				});
			});			
		}
	}
	
	module.exports = {
		getInstance: get_win,
		load: win_load
	}
}()