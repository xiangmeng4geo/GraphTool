/* global global */
/* global process */
!function(){
	'use strict'
	/**
	 * 这里主要操作窗口
	 */
	var IS_PROCESS_MAIN =  process.type == 'browser';
	var path = require('path');
	var fs = require('fs');
	var CONST = require('../common/const');
	var PATH = CONST.PATH;
	var BrowserWindow = IS_PROCESS_MAIN? require('browser-window'): require('remote').require('browser-window');

	var win_stack = global.win_stack || (global.win_stack = []);
	/**
	 * 得到一个`browser-window`实例
	 */
	var get_win = function(name){
		var conf;
		try{
			conf = require(path.join(PATH.UI_CONF, name+'.json'));
		}catch(e){
			conf = {
				width: 800,
				height: 600
			}
		}
		/**
		 * 考虑到transparent对窗体的很多限制，暂时取消
		 *
		 * https://github.com/atom/electron/blob/master/docs/api/frameless-window.md#limitations
		 */
		// conf.transparent = true;
		conf.show = false;
		var win = new BrowserWindow(conf);
		// win.openDevTools();
		// 当窗口关闭时清除`win_stack`中的标识
		win.on('close', function(){
			var id = this.id;
			for(var i = 0, j = win_stack.length; i<j; i++){
				if(id === win_stack[i]){
					// console.log('splice', win_stack.splice(i, 1));
					break;
				}
			}
		});
		win_stack.push(win.id);
		// console.log('push', win.id)
		win.CONST = CONST;
		return win;
	}

	/**
	 * 加载页面
	 */
	var win_load = function(win, name){
		if(win){
			win.loadURL(path.join('file://' , PATH.UI, name+ '.html'));
			var content = win.webContents;
			content.on('did-finish-load', function(){
				var path_core = path.join(PATH.UI, 'action/core').replace(/\\/g, '/');
				var js = 'require("'+path_core+'")';
				// var js = 'var __src=document.createElement("script");__src.src="'+path_core+'.js";document.body.appendChild(__src)';
				// console.log(js);
				content.executeJavaScript(js);
				// fs.readFile(, function(e, str_js){
				// 	content.executeJavaScript(str_js.toString());
				// });
			});
		}
		return win;
	}
	/**
	 * 打开一个窗口，是getInstance和load的结合
	 */
	var open = function(name){
		var win = get_win(name);
		win_load(win, name);
		return win;
	}

	module.exports = {
		getInstance: get_win,
		load: win_load,
		open: open,
		/**
		 * 得到最后一个打开的窗口
		 */
		getLast: function(){
			var id = win_stack[win_stack.length-1];
			if(id !== undefined){
				return BrowserWindow.fromId(id);
			}
		}
	}
}()
