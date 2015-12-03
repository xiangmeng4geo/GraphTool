/* global Core */
Core.init(function(){
	'use strict'

	var C = Core;
	C.on('login.closed', function(){
		C.emit('ready');
	});
}, function(model){
	'use strict'

	var C = Core;
	var $ = C.$;
	var CONST_TOOLBAR = C.CONST.TOOLBAR;
	var _require = C.require;
	var product_conf = _require('product_conf');
	var Win = C.Win;
	var WIN = Win.WIN;
	var _alert = _require('dialog').alert;

	C.emit('main.loaded');
	// var win = C.remote('window');

	var $doc = $(document);

	$('.btn_min').click(function(){
		WIN.minimize();
	});
	var $btn_max = $('.btn_max').click(function(){
		if(WIN.isMaximized()){
			WIN.unmaximize();
		}else{
			WIN.maximize();
		}
	});
	// 对左右布局进行拖拽调整宽度
	{
		$doc.on('mouseup.resize', function(){
			$doc.off('mousemove.resize');
		});
		var $c_left = $('#c_left'),
			$c_right = $('#c_right');
		var $resize_horizontal = $('resize-horizontal').on('mousedown.resize', function(e_down){
			var x_old = e_down.pageX;
			$doc.off('mousemove.resize').on('mousemove.resize', function(e_move){
				var w_old = $c_left.width();
				var x_new = e_move.pageX;
				var x = x_new - x_old;
				var w_new = w_old + x;
				if(w_new >= 200 && w_new <= 500){
					$c_left.width(w_new);
					$resize_horizontal.css({
						left: '+='+x
					});
					$c_right.css({
						left: '+='+x
					});
					x_old = x_new;
				}
			});
		});
	}
	$('#btn_quite, .btn_close').click(function(){
		window.close();
	});
	var win_setting;
	$('#btn_setting_sys').click(function(){
		try {
			win_setting.isFocused();
			win_setting.focus();
		} catch(e){
			win_setting = Win.openSub('setting');
		}
	});
	!function() {
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
	{
		var html = '';
		for (var i = 0, j = CONST_TOOLBAR.length; i<j; i++) {
			var items = CONST_TOOLBAR[i];
			for (var i_items = 0, j_items = items.length; i_items<j_items; i_items++) {
				var val = items[i_items];
				html += '<div class="toolbar_btn '+val.id+'" title="'+val.title+'"><img src="'+val.icon+'"/></div>';
			}
			if (i != j-1) {
				html += '<div class="toolbar_split"></div>';
			}
		}
		$('.toolbar').append(html);
	}
	model.on('product.change', function(productName){
		// console.log(arguments);
		// _alert(productName);
		var conf = product_conf.read(productName);
		if (conf) {
			_require('datareader').setModel(model).parseConf(conf);
		} else {
			_alert('请先对产品进行配置!');
		}
	});
	['map', 'tree'].forEach(function(v){
		_require('p_main_'+v);
	});
});
