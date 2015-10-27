/* global Core */
Core.init(function(){
	'use strict'

	let C = Core;
	C.on('login.closed', function(){
		C.emit('ready');
	});
}, function(){
	'use strict'

	let C = Core;
	let $ = C.$;

	C.emit('main.loaded');
});