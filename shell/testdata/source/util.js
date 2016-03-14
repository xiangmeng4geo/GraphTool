!function() {
	var path = require('path');
	var fs = require('fs');
	var util = require('util');
	var path_user = path.join(require('os').homedir(), 'BPA', 'GT');
	var path_config = path.join(path_user, 'config');

	var _exports = {};
	var _start = function(name) {
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
			win.loadURL(path.join('file://' , __dirname, name+ '.html'));
			var content = win.webContents;
			content.on('did-finish-load', function() {
				var js = 'require("./'+name+'")'
				content.executeJavaScript(js);
			})
			win.show();
		});
	}
	function exists(_p){
		return fs.existsSync(_p);
	}
	// 同步新建目录
	function mkdirSync(mkPath) {
		try{
			var parentPath = path.dirname(mkPath);
			if(!exists(parentPath)){
				mkdirSync(parentPath);
			}
			if(!exists(mkPath)){
				fs.mkdirSync(mkPath);
			}
			return true;
		}catch(e){}
	}
	/*同步拷贝文件*/
	var copyFileSync = function(fromPath, toPath){
		if(fs.existsSync(toPath)){
			fs.unlinkSync(toPath);
		}else{
			mkdirSync(path.dirname(toPath));
		}
		var BUF_LENGTH = 64*1024
		var buff = new Buffer(BUF_LENGTH)
		var fdr = fs.openSync(fromPath, 'r');
		var fdw = fs.openSync(toPath, 'w');
		var bytesRead = 1;
		var pos = 0;
		while (bytesRead > 0){
			bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
			fs.writeSync(fdw,buff,0,bytesRead);
			pos += bytesRead;
		}
		
		fs.closeSync(fdr);
		fs.closeSync(fdw);
	}
	_exports.init = function(name, cb_render) {
		if (process.type == 'renderer') {
			cb_render && cb_render();
		} else {
			_start(name);
		}
	}
	_exports.ui = {};
	_exports.ui.checked = function($cb, flag) {
		if (util.isBoolean(flag)) {
			$cb.prop('checked', flag);
		} else {
			return $cb.prop('checked');
		}
	}
	function _getDialog(method, param, cb) {
		var remote = require('remote');
		var dialog = remote.require('dialog');

		dialog[method](remote.getCurrentWindow(), param, cb);
	}
	_exports.ui.dialog = {
		alert: function(msg) {
			_getDialog('showMessageBox', {
				type: 'info',
				buttons: ['yes'],
				title: '系统提示',
				message: msg,
				icon: null
			});
		}
	}
	_exports.getProductTree = function() {
		return require(path.join(path_config, '.sys/sys_product_tree'));
	}
	_exports.getSys = function() {
		return require(path.join(path_config, '.sys/sys'));
	}
	_exports.file = {};
	_exports.file.write = function(file_path, content_str) {
		mkdirSync(path.dirname(file_path));

		fs.writeFileSync(file_path, content_str);
	}
	_exports.file.exists = exists;
	_exports.file.copy = copyFileSync;

	module.exports = _exports;
}()