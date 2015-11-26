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
	$('#btn_setting').click(function(){
		try {
			win_setting.isFocused();
			win_setting.focus();
		} catch(e){
			win_setting = Win.openSub('setting');
		}
	});

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
