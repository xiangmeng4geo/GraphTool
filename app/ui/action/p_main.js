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

	C.emit('main.loaded');
});