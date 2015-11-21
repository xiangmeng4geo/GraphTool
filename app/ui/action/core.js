/**
 * exec after webContents trigger 'did-finish-load'
 */
!function(window_global){
	'use strict'

	var path = require('path');
	var fs = require('fs');
	var _remote = require('remote');
	var ipc = require('ipc');

	var win_instance = _remote.getCurrentWindow();
	var CONST = win_instance.CONST;
	var CONST_PATH = CONST.PATH;
	var CONST_PATH_UI = CONST_PATH.UI;
	var CONST_PATH_UI_ACTION = path.join(CONST_PATH_UI, 'action');
	var CONST_PATH_UI_STYLE = path.join(CONST_PATH_UI, 'style');
	var CONST_PATH_WORKBENCH = CONST_PATH.WORKBENCH;

	var logger = require(path.join(CONST_PATH_WORKBENCH, 'logger'));

	// 方便各子模块部通信
	function Model() {}
	require('util').inherits(Model, require("events").EventEmitter);

	var model = new Model();

	model.on('log', function(msg) {
		console.log(msg);
	});

	var Core = {
		model: model
	};
	var EXT_JS = '.js';
	var EXT_ARR = ['', EXT_JS, '.json', '.node'];
	function is_exists_module(url){
		for(var i = 0, j = EXT_ARR.length; i<j; i++){
			var _url_new = url+EXT_ARR[i];
			if(fs.existsSync(_url_new)){
				return _url_new;
			}
		}
		return false;
	}
	function require_safe(req, url){
		if(is_exists_module(url)){
			try{
				return req(url);
			}catch(e){
				e.stack = '[module error]'+url+'\n' + e.stack;
				logger.error(e);
			}
		}else{
			var err_msg = '[not exists]' + url;
			logger.error(new Error(err_msg));
		}
	}
	/**
	 * load jascript in core/ui/action/
	 */
	function load(url, subpath){
		var _p = path.resolve(CONST_PATH_UI_ACTION, subpath||'', url);
		return require_safe(require, _p);
	}
	
	/**
	 * 直接加载workbench下的后端模块
	 */
	function loadRemote(url, subpath) {
		var _p = path.resolve(CONST_PATH_WORKBENCH, subpath||'', url);
		return require_safe(require, _p);
	}
	/**
	 * load module in workbench
	 */
	function _loadRemote(url){
		var _p = path.resolve(CONST_PATH_WORKBENCH, url);
		return require_safe(_remote.require, _p);
	}
	/**
	 * load javascript file in action/lib
	 */
	function script(url, cb) {
		var _p = path.resolve(CONST_PATH_UI_ACTION + '/lib', url);
		var js_path = is_exists_module(_p);
		return $.getScript(js_path, cb);
	}

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
			cb(model);
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

	// 处理main进程发过来的事件
	subscibe('ui', function(data) {
		model.emit(data.type, data.msg);
	});
	Core.on = subscibe;
	Core.emit = emit;

	var $ = load('lib/j');
	Core.CONST = CONST;
	Core.$ = $;
	Core.load = load;
	Core.loadLib = function(url) {
		return load(url, 'lib');
	}
	Core.loadRemote = loadRemote;
	Core.script = script;
	Core.remote = _loadRemote;
	Core.init = safe;
	Core.WIN = win_instance;
	window_global.Core = Core;

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
			// load('p_'+m[2].replace(/\//, '_'));
			load('p_'+m[2].replace(/\//, '_'));
		}

		// show content
		// http://www.w3schools.com/tags/att_global_hidden.asp
		$('tmpl').removeAttr('hidden');
		if($body.attr('waiting') === undefined){
			emit('ready');
		}
	});
}(window)
