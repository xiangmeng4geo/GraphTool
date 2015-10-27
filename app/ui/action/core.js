/**
 * exec after webContents trigger 'did-finish-load'
 */
!function(){
	'use strict'

	let path = require('path');
	let _remote = require('remote');
	let ipc = require('ipc');

	let win_instance = _remote.getCurrentWindow();
	const CONST = win_instance.CONST;
	const CONST_PATH = CONST.PATH;
	const CONST_PATH_UI = CONST_PATH.UI;
	const CONST_PATH_UI_ACTION = path.join(CONST_PATH_UI, 'action');
	const CONST_PATH_UI_STYLE = path.join(CONST_PATH_UI, 'style');

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

	let logger = remote('logger');

	/**
	 * catch error
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

	let event_list = {};
	function subscibe(name, callback){
		ipc.send('subscibe', name);
		if(!event_list[name]){
			event_list[name] = [];
			ipc.on(name, function(data){
				let list = event_list[name];
				if(list && list.length > 0){
					list.forEach(cb => {
						cb(data);
					});
				}
			});
		}
		event_list[name].push(callback);
	}
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

	let $ = load('lib/j');
	Core.CONST = CONST;
	Core.$ = $;
	Core.load = load;
	Core.remote = remote;
	Core.init = safe;
	window.Core = Core;

	safe(function(){
		const EXT_CSS = '.css';
		let $head = $('head');
		let $body = $('body');
		let str_css = $body.attr('css');
		if(str_css){
			str_css.split(/\s+/).forEach(v => {
				$head.append('<link rel="stylesheet" href="'+path.resolve(CONST_PATH_UI_STYLE, v+EXT_CSS)+'" type="text/css" />');
			});
		}
		let reg = RegExp('(file:///)?'+CONST_PATH_UI+'/?(.+)\.html');
		let m = reg.exec(location.href);
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
		// $('')
		// ipc.on('wait.login', win_instance.show);
		// ipc.send('wait.main', true);

		
	});
}()
