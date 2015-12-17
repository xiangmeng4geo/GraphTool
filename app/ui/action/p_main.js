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
		Win.open('login');
		$btn_close_main.click();
	});
	var $btn_close_main = $('.btn_close_main').click(function() {
		window.close();
	});
	var win_about;
	$('#btn_about').click(function() {
		try {
			win_about.isFocused();
			win_about.focus();
		} catch (e) {
			win_about = Win.openSub('about');
		}
	});
	var win_setting;
	$('#btn_setting_sys').click(function() {
		try {
			win_setting.isFocused();
			win_setting.focus();
		} catch (e) {
			win_setting = Win.openSub('setting');
		}
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
