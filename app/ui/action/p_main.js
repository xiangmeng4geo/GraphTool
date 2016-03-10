/* global Core */
Core.init(function() {
	'use strict'

	var C = Core;
	C.on('login.closed', function() {
		C.emit('ready');
		// C.Win.WIN.maximize();
	});
}, function(model) {
	'use strict'

	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var product_conf = _require('product_conf');
	var Win = C.Win;
	var WIN = Win.WIN;
	var _alert = _require('dialog').alert;

	C.emit('main.loaded');
	// var win = C.remote('window');

	var $console_panel = $('#console_panel');
	var msg_list = [];
	function _fn_log_user(msg) {
		var is_error = msg instanceof Error;
		model.emit(is_error? 'error':'log', msg);
		// var info = '<p '+(is_error?'style="color:red"':'')+'>'+(new Date().format('hh:mm:ss'))+' ['+(is_error?'error':'info') + '] "'+(msg.msg || msg.message || msg)+'"</p>'
		// // msg_list.unshift();
		// $console_panel.html(info);
	}
	model.on('log.user', _fn_log_user);
	model.on('log.user.error', function(err) {
		var info = err.msg || err.message || err;
		_alert(info);
		_fn_log_user(err);
	});

	var $loading = $('.loading');

	model.on('loading.show', function() {
		$loading.show();
	});
	model.on('loading.hide', function() {
		$loading.hide();
	});
	var $doc = $(document);

	$('.btn_min').click(function() {
		WIN.minimize();
	});
	var $btn_max = $('.btn_max').click(function() {
		if (WIN.isMaximized()) {
			WIN.unmaximize();
		} else {
			WIN.maximize();
		}
	});
	// 对左右布局进行拖拽调整宽度
	{
		$doc.on('mouseup.resize', function() {
			$doc.off('mousemove.resize');
		});
		var $c_left = $('#c_left'),
			$c_right = $('#c_right');
		var $resize_horizontal = $('resize-horizontal').on('mousedown.resize', function(e_down) {
			var x_old = e_down.pageX;
			$doc.off('mousemove.resize').on('mousemove.resize', function(e_move) {
				var w_old = $c_left.width();
				var x_new = e_move.pageX;
				var x = x_new - x_old;
				var w_new = w_old + x;
				if (w_new >= 200 && w_new <= 500) {
					$c_left.width(w_new);
					$resize_horizontal.css({
						left: '+=' + x
					});
					$c_right.css({
						left: '+=' + x
					});
					x_old = x_new;
				}
			});
		});
	}
	$('#btn_quite').click(function() {
		Win.close(true, function() {
			_require('store').rm('user_pwd');
			Win.open('login');
		});
		
	});
	var $btn_close_main = $('.btn_close_main').click(function() {
		Win.close(true);
	});
	var _singleOpen = (function() {
		var _cache = {};
		return function(name) {
			var win = _cache[name];
			try {
				win.isFocused();
				win.focus();
			} catch (e) {
				_cache[name] = Win.openSub(name);
			}
		}
	})();
	$('#btn_about').click(function() {
		_singleOpen('about');
	});
	$('#btn_listence').click(function() {
		_singleOpen('listence');
	});
	$('#btn_setting_sys').click(function() {
		_singleOpen('setting');
	});
	! function() {
		function _close(e) {
			e.stopPropagation();
			$setting_list.hide();
		}
		var $btn_setting = $('.btn_setting'),
			$setting_list = $btn_setting.find('ul');
		$doc.on('click', _close);
		$setting_list.on('click', _close).on('mouseleave', _close);
		$btn_setting.click(function(e) {
			e.stopPropagation();
			if ($setting_list.is(':visible')) {
				$setting_list.stop(true, true).slideUp();
			} else {
				$setting_list.stop(true, true).slideDown();
			}
		});
	}();
	['map', 'tree', 'tool'].forEach(function(v) {
		_require('p_main_' + v);
	});
	model.on('product.change', function(productName) {
		// console.log(arguments);
		// _alert(productName);
		var conf = product_conf.read(productName);
		if (conf) {
			// 延时执行，防止对其它事件影响
			setTimeout(function() {
				_require('datareader').setModel(model).parseConf(conf);
			}, 0)
		} else {
			_alert('请先对产品进行配置!');
		}
	});
});