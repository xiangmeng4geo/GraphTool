/**
 * exec after webContents trigger 'did-finish-load'
 */
!function(){
	'use strict'

	var path = require('path');
	var _remote = require('remote');
	var ipc = require('ipc');

	var win_instance = _remote.getCurrentWindow();
	var CONST = win_instance.CONST;
	var CONST_PATH = CONST.PATH;
	var CONST_PATH_UI = CONST_PATH.UI;
	var CONST_PATH_UI_ACTION = path.join(CONST_PATH_UI, 'action');
	var CONST_PATH_UI_STYLE = path.join(CONST_PATH_UI, 'style');

	var Core = {};
	
	/**
	 * load jascript in core/ui/action/
	 */
	function load(url){
		return require(path.resolve(CONST_PATH_UI_ACTION, url));
	}
	/**
	 * load module in workbench
	 */
	function remote(url){
		return _remote.require(path.resolve(CONST_PATH.WORKBENCH, url));
	}

	var logger = remote('logger');

	/**
	 * catch error
	 * 可选订阅事件
	 */
	function safe(fn_subscibe, cb){
		if(cb === undefined){
			cb = fn_subscibe;
		}else{
			fn_subscibe();
		}
		try{
			cb();
		}catch(e){
			logger.error(e.stack);
		}
	}

	var event_list = {};
	/**
	 * 订阅事件
	 */
	function subscibe(name, callback){
		ipc.send('subscibe', name);
		if(!event_list[name]){
			event_list[name] = [];
			ipc.on(name, function(data){
				var list = event_list[name];
				if(list && list.length > 0){
					list.forEach(function(cb){
						cb(data);
					});
				}
			});
		}
		event_list[name].push(callback);
	}
	/**
	 * 触发事件
	 */
	function emit(name, data){
		if('ready' === name){
			return win_instance.show();
		}
		ipc.send('emit', {
			'type': name,
			'msg': data
		});
	}
	Core.on = subscibe;
	Core.emit = emit;

	var $ = load('lib/j');
	Core.CONST = CONST;
	Core.$ = $;
	Core.load = load;
	Core.remote = remote;
	Core.init = safe;
	window.Core = Core;

	safe(function(){
		var EXT_CSS = '.css';
		var $head = $('head');
		var $body = $('body');
		var str_css = $body.attr('css');
		if(str_css){
			str_css.split(/\s+/).forEach(function(v){
				$head.append('<link rel="stylesheet" href="'+path.resolve(CONST_PATH_UI_STYLE, v+EXT_CSS)+'" type="text/css" />');
			});
		}
		var reg = RegExp('(file:///)?'+CONST_PATH_UI+'/?(.+)\.html');
		var m = reg.exec(location.href);
		if(m){
			// load default javascript for page base on page name

			// eg: 	"login.html" => "p_login"
			// 		"user/login.html" => "p_user_login"
			try{
				load('p_'+m[2].replace(/\//, '_'));
			}catch(e){}
		}

		// show content
		// http://www.w3schools.com/tags/att_global_hidden.asp
		$('tmpl').removeAttr('hidden');
	});
}()
