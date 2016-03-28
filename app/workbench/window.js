/* global global */
/* global process */
!function(){
	'use strict'
	/**
	 * 这里主要操作窗口
	 */
	// var IS_PROCESS_MAIN =  process.type == 'browser';
    var electron = require('electron');
    var globalShortcut = electron.globalShortcut;
	var path = require('path');
	var fs = require('fs');
	var CONST = require('../common/const');
	var util = require('../common/util');
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
		}catch(e){}
		conf = util.extend({
			width: 800,
			height: 600,
			show: true,
			autoHideMenuBar: true,
    		useContentSize: true
		}, conf);
		/**
		 * 考虑到transparent对窗体的很多限制，暂时取消
		 *
		 * https://github.com/atom/electron/blob/master/docs/api/frameless-window.md#limitations
		 */
		conf.transparent = false;
		conf.show = false;

		var win = new BrowserWindow(conf);
		if (conf.debug) {
			win.openDevTools();
		}
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
			var path_core = path.join(PATH.UI, 'action/core').replace(/\\/g, '/');
			win.loadURL(path.join('file://' , PATH.UI, name+ '.html'));
			var content = win.webContents;
			var js = '';
			if (param) {
				js = 'var _PARAM_ = '+JSON.stringify(param)+';';
			}
			js += 'require("'+path_core+'")';
			content.on('dom-ready', function() {
				content.executeJavaScript(js);
			});
			// content.on('did-finish-load', function(){
			// // 	var js = '';
			// // 	if (param) {
			// // 		js = 'var _PARAM_ = '+JSON.stringify(param)+';';
			// // 	}
			// // 	js += 'require("'+path_core+'")';
			// // 	var js = 'var __src=document.createElement("script");__src.src="'+path_core+'.js";document.body.appendChild(__src)';
			// // 	console.log(js);
			// // 	js += ';alert(123);console.log(123)';
			// 	content.executeJavaScript(js, true, function(result) {
			// 		console.log(result);
			// 	});
			// // 	// fs.readFile(, function(e, str_js){
			// // 	// 	content.executeJavaScript(str_js.toString());
			// // 	// });
			// });
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
    // 注册快捷键供开发者调试
    function registerShortcut() {
        globalShortcut.register('Alt+Shift+i', function() {
            var win = BrowserWindow.getFocusedWindow();
            win.openDevTools();
        });
    }
	function _shake(win) {
		if (win.___shake) {
			return;
		}
		var t = 0,
			z = 3;
		var pos = win.getPosition();
		var left = pos[0],
			top = pos[1];
		win.___shake = setInterval(function() {
			var i = t / 180 * Math.PI,
				x = Math.sin(i) * z,
				y = Math.cos(i) * z;
			win.setPosition(left + x, top + y);
			if ((t += 90) > 1080) {
				clearInterval(win.___shake);
				delete win.___shake;
			}
		}, 30);
	}

	// 实现类alert效果，父窗口得到焦点时子窗口抖动
	function _sub(name, param) {
		var win = get_win(name);
		var win_parent = BrowserWindow.getFocusedWindow();
		if (win_parent) {
			function _rmListener() {
				win_parent.removeListener('focus', _fn_focus);
			}
			function _fn_focus() {
				try {
					win_parent.blur();
					
					win.setAlwaysOnTop(true);
					win.restore();
					win.focus();
					win.setAlwaysOnTop(false);
					_shake(win);
				} catch(e) {
					_rmListener();
				}
			}
			win_parent.on('focus', _fn_focus);
			win.on('close', _rmListener);
		}
		win_load(win, name, param);
		win.show();
		return win;
	}
	
	module.exports = {
		getInstance: get_win,
		load: win_load,
		open: open,
		isOpenedUi: _isOpenedUi,
		setFocusToLast: _focusLastOfUi,
		setSub: setSub,
        shortcut: registerShortcut,
		sub: _sub
	}
}()
