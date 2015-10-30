/* global Core */
Core.init(function(){
	'use strict'

	var C = Core;
	C.on('login.closed', function(){
		C.emit('ready');
	});
}, function(){
	'use strict'

	var C = Core;
	var $ = C.$;
	var WIN = C.WIN;

	C.emit('main.loaded');
	var win = C.remote('window');

	var $doc = $(document);
	$doc.on('product.change', function(e, productName){
		// console.log(arguments);
		C.load('dialog').alert(productName);
	});
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
	$('#btn_quite').click(function(){
		window.close();
	});
	$('#btn_setting').click(function(){
		win.open('setting');
	});

	['tree'].forEach(function(v){
		C.load('p_main_'+v);
	});
});