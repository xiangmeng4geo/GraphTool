/**
 * exec after webContents trigger 'did-finish-load'
 */
! function(window_global) {
	'use strict'

	var _req = require;
	var path = _req('path');
	var fs = _req('fs');
	var _remote = _req('remote');
	var ipc = _req('electron').ipcRenderer;

	var dialog = _req('./dialog');
	var _alert = dialog.alert;
	var win_instance = _remote.getCurrentWindow();
	var CONST = win_instance.CONST;
	var CONST_PATH = CONST.PATH;
	var CONST_PATH_UI = CONST_PATH.UI;
	var CONST_PATH_UI_ACTION = path.join(CONST_PATH_UI, 'action');
	var CONST_PATH_UI_STYLE = path.join(CONST_PATH_UI, 'style');
	var CONST_PATH_WORKBENCH = CONST_PATH.WORKBENCH;
	var CONST_PATH_COMMON = CONST_PATH.COMMON;

	var logger = _req(path.join(CONST_PATH_COMMON, 'logger'));

	// 方便各子模块部通信
	function Model() {}
	_req('util').inherits(Model, _req("events").EventEmitter);

	var model = new Model();

	model.on('log', function(msg) {
		logger.info(msg);
	});

	function _error(err) {
		// console.log(err);
		var info = err.msg || err.message || err;
		logger.error(info);
	}
	//统一处理其它库里的错误信息
	model.on('error', _error);

	var EXT_JS = '.js';
	var EXT_ARR = ['', EXT_JS, '.json', '.node'];

	function is_exists_module(url) {
		for (var i = 0, j = EXT_ARR.length; i < j; i++) {
			var _url_new = url + EXT_ARR[i];
			if (fs.existsSync(_url_new)) {
				return _url_new;
			}
		}
		return '';
	}

	function require_safe(req, url, showError) {
		if (is_exists_module(url)) {
			try {
				return req(url);
			} catch (e) {
				e.stack = '[module error]' + url + '\n' + e.stack;
				_error(e);
			}
		} else {
			if (showError) {
				var err_msg = '[not exists]' + url;
				_error(new Error(err_msg));
			}
		}
	}
	/**
	 * load jascript in core/ui/action/
	 */
	function load(url, subpath) {
		var _p = path.resolve(CONST_PATH_UI_ACTION, subpath || '', url);
		return require_safe(_req, _p);
	}

	/**
	 * 直接加载workbench下的后端模块
	 */
	function loadCommon(url, subpath) {
		var _p = path.resolve(CONST_PATH_COMMON, subpath || '', url);
		return require_safe(_req, _p);
	}
	/**
	 * load module in workbench
	 */
	function _loadRemote(url) {
		var _p = path.resolve(CONST_PATH_WORKBENCH, url);
		return require_safe(_remote.require, _p);
	}
	/**
	 * load javascript file in action/lib
	 */
	// function script(url, cb) {
	// 	var _p = path.resolve(CONST_PATH_UI_ACTION + '/lib', url);
	// 	var js_path = is_exists_module(_p);
	// 	return $.getScript(js_path, cb);
	// }
	var paths_require = [CONST_PATH_COMMON, CONST_PATH_UI_ACTION, CONST_PATH_UI_ACTION + '/lib']

	function _require(name) {
		for (var i = 0, j = paths_require.length; i < j; i++) {
			var result = require_safe(_req, path.resolve(paths_require[i], name), false);
			// console.log(result, path.resolve(paths_require[i], name));
			if (result) {
				return result;
			}
		}
		model.emit('error', new Error('[module error]' + name));
	}

	/**
	 * catch error
	 * 可选订阅事件
	 */
	function safe(fn_subscibe, cb) {
		if (cb === undefined) {
			cb = fn_subscibe;
		} else {
			fn_subscibe();
		}
		try {
			cb(model);
		} catch (e) {
			logger.error(e.stack);
		}
	}

	var event_list = {};
	/**
	 * 订阅事件
	 */
	function subscibe(name, callback) {
		ipc.send('subscibe', name);
		if (!event_list[name]) {
			event_list[name] = [];
			ipc.on(name, function(data) {
				var list = event_list[name];
				if (list && list.length > 0) {
					list.forEach(function(cb) {
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
	function emit(name, data) {
		if ('ready' === name) {
			return win_instance.show();
		}
		ipc.send('emit', {
			'type': name,
			'msg': data
		});
	}

	// 添加css
	function addLink(v, cb) {
		$head.append($('<link rel="stylesheet" href="' + path.resolve(CONST_PATH_UI_STYLE, v + EXT_CSS) +
			'" type="text/css"/>').on('load', cb).on('error', cb));
	}

	// 处理main进程发过来的事件
	subscibe('ui', function(data) {
		model.emit(data.type, data.msg);
	});

	var Win = {
		open: function(name, option) {
			option || (option = {});
			var is_subwin = option.is_sub;

			var win_remote = _loadRemote('window');
			var win = win_remote.open(name, option.param);
			if (is_subwin) {
				win_remote.setSub(win_instance.id, win.id);
			}
			return win;
		},
		openSub: function(name, option) {
			return this.open(name, $.extend({
				is_sub: true
			}, option));
		},
		close: function(confirm, cb_before_close) {
			if (confirm) {
				dialog.confirm('确实要退出吗？', function() {
					cb_before_close && cb_before_close();
					window.close();
				});
			} else {
				window.close();
			}
		},
		WIN: win_instance
	}
	var $ = load('lib/j');
	_require('prop');

	var EXT_CSS = '.css';
	var $head = $('head');
	var $body = $('body');
	var Core = {
		CONST: CONST,
		$: $,
		model: model,
		on: subscibe,
		emit: emit,
		require: _require,
		init: safe,
		Win: Win,
		addLink: addLink
	};
	window_global.Core = Core;

	{
		var util = _require('util');
		function _getListence() {
			var conf = util.verification.get();
			if (conf) {
				var listence = conf.l;
				if (listence) {
					listence = util.encrypt.decode(listence.reverse());
					if (listence) {
						var arr = listence.split('|');
						var time_start = new Date(parseInt(arr[0])),
							time_end = new Date(parseInt(arr[1]));
						var time_now = new Date();
						return {
							s: time_start,
							e: time_end,
							n: time_now,
							f: time_end > time_start && time_now > time_start && time_now < time_end
						}
					}
				}
			}
		}
		if (!CONST.DEBUG) {
			var Store = _require('store');
			var cache_name = '_l_n';
			var delay = 1000*60;// 1分钟
			var flag_notice = false;
			function _check() {
				var listence = _getListence();
				if (listence) {
					var time_schedule = Store.get(cache_name);
					if(time_schedule){
						time_schedule = new Date(parseInt(time_schedule));
					}
					var flag = listence.f && (!time_schedule || time_schedule > listence.s && time_schedule < listence.e);
					if (!flag && flag_notice) {
						_alert('您的软件已经过期，请联系管理员!');
					}
					flag_notice = true;
					if (!time_schedule || time_schedule < listence.s) {
						time_schedule = listence.s;
					}
					Store.set(cache_name, time_schedule.getTime()+delay);

					// 可根据此在其它页面应用
					CONST.LISTENCE = {
						s: listence.s,
						e: listence.e,
						f: flag
					};
				} else {
					_alert('没有正确的序列号，请联系管理员，程序将退出！');
				}
				setTimeout(_check, delay);
			}
			setTimeout(_check, 0);
		}
	}
	safe(function() {
		var str_css = $body.attr('css');

		var len_css = 0;
		// 保证css优先加载
		function fn_css() {
			if (--len_css <= 0) {
				fn_js();
			}
		}

		function fn_js() {
			// show content
			// http://www.w3schools.com/tags/att_global_hidden.asp
			$('tmpl').removeAttr('hidden');

			var reg = RegExp("(file:///)?" + (encodeURI(CONST_PATH_UI).replace(/\(/g, '\\(').replace(/\)/g, '\\)')) +
				"/?([^.]+).(.+)$");
			var m = reg.exec(location.href);
			if (m) {
				// load default javascript for page base on page name

				// eg: 	"login.html" => "p_login"
				// 		"user/login.html" => "p_user_login"
				// load('p_'+m[2].replace(/\//, '_'));
				load('p_' + m[2].replace(/\//, '_'));
			}

			if ($body.attr('waiting') === undefined) {
				emit('ready');
			}
		}
		if (str_css) {
			var css_arr = str_css.split(/\s+/);
			len_css = css_arr.length;
			css_arr.forEach(function(v) {
				addLink(v, fn_css);
			});
		} else {
			fn_js();
		}
	});
}(window)
