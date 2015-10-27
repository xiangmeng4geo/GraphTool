/* global process */
!function(){
	'use strict'
	/**
	 * 这里主要操作窗口
	 */
	const IS_PROCESS_MAIN =  process.type == 'browser';
	let path = require('path');
	let fs = require('fs');
	let CONST = require('./const');
	let PATH = CONST.PATH;
	let BrowserWindow = IS_PROCESS_MAIN? require('browser-window'): require('remote').require('browser-window');

	let win_stack = [];
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
		conf.transparent = true;
		conf.show = false;
		let win = new BrowserWindow(conf);
		win.openDevTools();
		// 当窗口关闭时清除`win_stack`中的标识
		win.on('close', function(){
			let id = this.id;
			for(let i = 0, j = win_stack.length; i<j; i++){
				if(id === win_stack[i]){
					win_stack.splice(i, 1);
					break;
				}
			}
		});
		win_stack.push(win.id);
		win.CONST = CONST;
		return win;
	}

	/**
	 * 加载页面
	 */
	let win_load = function(win, name){
		if(win){
			win.loadUrl(path.join('file://' , PATH.UI, name+ '.html'));
			let content = win.webContents;
			content.on('did-finish-load', function(){
				fs.readFile(path.join(PATH.UI, 'action/core.js'), function(e, str_js){
					content.executeJavaScript(str_js.toString());
				});
			});
		}
	}
	/**
	 * 打开一个窗口，是getInstance和load的结合
	 */
	let open = function(name){
		let win = get_win(name);
		win_load(win, name);
	}

	module.exports = {
		getInstance: get_win,
		load: win_load,
		open: open,
		/**
		 * 得到最后一个打开的窗口
		 */
		getLast: function(){
			let id = win_stack[win_stack.length-1];
			if(id !== undefined){
				return BrowserWindow.fromId(id);
			}
		}
	}
}()
