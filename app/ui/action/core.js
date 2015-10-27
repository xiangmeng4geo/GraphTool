/**
 * exec after webContents trigger 'did-finish-load'
 */
!function(){
	'use strict'
	
	let path = require('path');
	let _remote = require('remote');
	let win_instance = _remote.getCurrentWindow();
	const CONST = win_instance.CONST;
	const CONST_PATH = CONST.PATH;
	const CONST_PATH_UI = CONST_PATH.UI;
	const CONST_PATH_UI_ACTION = path.join(CONST_PATH_UI, 'action');
	const CONST_PATH_UI_STYLE = path.join(CONST_PATH_UI, 'style');
	
	var Core = {};
	
	/**
	 * catch error
	 */
	function safe(cb){
		try{
			cb();
		}catch(e){
			console.log(e);
		}
	}
	
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
	
	let $ = load('lib/j');
	Core.CONST = CONST;
	Core.$ = $;
	Core.load = load;
	Core.remote = remote;
	Core.safe = safe;
	window.Core = Core;
	
	safe(function(){
		const EXT_CSS = '.css';
		let $head = $('head');
		let str_css = $('body').attr('css');
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
			load('p_'+m[2].replace(/\//, '_'));
		}
		
		// show content
		// http://www.w3schools.com/tags/att_global_hidden.asp
		$('tmpl').removeAttr('hidden');
		win_instance.show();
	});
}()