/* global process */
/* global global */
/* global __dirname */
!function(){
	// "use strict";

	var path = require('path');
	var app = require('app');
	var electron = require('electron');
	var BrowserWindow = require('browser-window');

	app.on('ready', function() {
		var win = new BrowserWindow({
			width: 1000,
			height: 1000,
			show: true
		});
		win.loadURL(path.join('file://' , __dirname,  'index.html'));
		win.show();
	});
}();
