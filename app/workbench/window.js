/* global global */
/* global process */
!function(){
	'use strict'
	/**
	 * 这里主要操作窗口
	 */
	// var IS_PROCESS_MAIN =  process.type == 'browser';
	var path = require('path');
	var fs = require('fs');
	var CONST = require('../common/const');
	var PATH = CONST.PATH;
	// var BrowserWindow = IS_PROCESS_MAIN? require('browser-window'): require('remote').require('browser-window');
	var BrowserWindow = require('browser-window');
	var win_stack = global.win_stack || (global.win_stack = []);
	var win_sub = global.win_sub || (global.win_sub = {});
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
		conf.titleBarStyle = 'hidden';
		var win = new BrowserWindow(conf);
		// win.openDevTools();
		// 当窗口关闭时清除`win_stack`中的标识
		win.on('close', function(e){
			var sub_windows = win_sub[win.id];
			if (sub_windows && sub_windows.length > 0) {
				sub_windows.forEach(function(w) {
					var _sub = BrowserWindow.fromId(w);
					_sub && _sub.close();
				});
			}

			// e.preventDefault();
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
	var win_load = function(win, name, param){
		if(win){
			win.loadURL(path.join('file://' , PATH.UI, name+ '.html'));
			var content = win.webContents;
			content.on('did-finish-load', function(){
				var path_core = path.join(PATH.UI, 'action/core').replace(/\\/g, '/');
				var js = '';
				if (param) {
					js = 'var _PARAM_ = '+JSON.stringify(param)+';';
				}
				js += 'require("'+path_core+'")';
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
	var open = function(name, param){
		var win = get_win(name);
		win_load(win, name, param);
		return win;
	}
	/**
	 * 设置窗口关系
	 */
	function setSub(parentId, subId) {
		(win_sub[parentId] || (win_sub[parentId] = [])).push(subId);
	}

	/**
	 * 让UI进程的最后一个窗口得到焦点
	 */
	function _focusLastOfUi() {
		var wins = BrowserWindow.getAllWindows();
		for (var i = wins.length - 1; i>=0; i--) {
			var w = wins[i];
			if (w) {
				var url = w.getURL();
				if (!/service\.\w+$/.test(url)) {
					w.setAlwaysOnTop(true);
					w.restore();
					w.focus();
					w.setAlwaysOnTop(false);
					break;
				}
			}
		}
	}
	/**
	 * UI进程是否已经打开（login.html或main.html是否打开）
	 */
	function _isOpenedUi() {
		var wins = BrowserWindow.getAllWindows();
		for (var i = wins.length - 1; i>=0; i--) {
			var w = wins[i];
			if (w) {
				var url = w.getURL();
				if (/(login|main)\.\w+$/.test(url)) {
					return true;
				}
			}
		}
	}
	module.exports = {
		getInstance: get_win,
		load: win_load,
		open: open,
		isOpenedUi: _isOpenedUi,
		setFocusToLast: _focusLastOfUi,
		setSub: setSub
	}
}()
