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
	$doc.on('product.change', function(){
		console.log(arguments);
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
	$('.titlebar').on('dblclick', function(){alert(1);
		$btn_max.click();
	}).on('contextmenu', function(){
		alert(2);
	});
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