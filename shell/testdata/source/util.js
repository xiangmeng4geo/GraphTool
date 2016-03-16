!function() {
	var path = require('path');
	var fs = require('fs');
	var util = require('util');
	var path_user = path.join(require('os').homedir(), 'BPA', 'GT');
	var path_config = path.join(path_user, 'config');
	var PATH_DATA = path.join(__dirname, 'data');
	var PATH_DATA_CONFIG = path.join(PATH_DATA, 'config');
	var PATH_DATA_DATA = path.join(PATH_DATA, 'data');
	var PATH_DATA_GEOFILE = path.join(PATH_DATA, 'geo');

	/*时间格式化*/
	Date.prototype.format = Date.prototype.format || function(format,is_not_second){
		format || (format = 'yyyy-MM-dd hh:mm:ss');
		var o = {
			"M{2}" : this.getMonth()+1, //month
			"d{2}" : this.getDate(),    //day
			"h{2}" : this.getHours(),   //hour
			"m{2}" : this.getMinutes(), //minute
			"q{2}" : Math.floor((this.getMonth()+3)/3),  //quarter
		}
		if(!is_not_second){
			o["s{2}"] = this.getSeconds(); //second
			o["S{2}"] = this.getMilliseconds() //millisecond
		}
		if(/(y{4}|y{2})/.test(format)){
			format = format.replace(RegExp.$1,(this.getFullYear()+"").substr(4 - RegExp.$1.length));
		}
		for(var k in o){
			if(new RegExp("("+ k +")").test(format)){
				format = format.replace(RegExp.$1,RegExp.$1.length==1 ? o[k] :("00"+ o[k]).substr((""+ o[k]).length));
			}
		}

		return format;
	}
	var _exports = {};
	var _start = function(option) {
		var name = option.name;
		var path = require('path');
		var app = require('app');
		var electron = require('electron');
		var BrowserWindow = require('browser-window');
		var shouldQuit = app.makeSingleInstance(function() {
			var wins = BrowserWindow.getAllWindows();
			if (wins && wins.length > 0) {
				var w = wins[0];
				w.setAlwaysOnTop(true);
				w.restore();
				w.focus();
				w.setAlwaysOnTop(false);
			}
			return true;
		});
		if (shouldQuit) {
			app.quit();
			return;
		}
		app.on('window-all-closed', function () {
			app.quit();
		});
		app.on('ready', function() {
			var win = new BrowserWindow({
				width: option.width || 1000,
				height: option.height || 1000,
				show: true,
				autoHideMenuBar: true
			});
			win.loadURL(path.join('file://' , __dirname, name+ '.html'));
			win.show();
			win.openDevTools();
			var content = win.webContents;
			content.on('dom-ready', function() {
				var js = 'require("./'+name+'")'
				content.executeJavaScript(js);
			})
		});
	}
	function exists(_p){
		return fs.existsSync(_p);
	}
	/**
	 * 文件工具类
	 */
	function rmfileSync(p, is_not_rmmyself_if_directory) {
	    //如果文件路径不存在或文件路径不是文件夹则直接返回
	    try{
	    	if(exists(p)){
		    	var stat = fs.statSync(p);
		    	if(stat.isDirectory()){
		    		var files = fs.readdirSync(p);
		    		files.forEach(function(file) {
			            var fullName = path.join(p, file);
			            if (fs.statSync(fullName).isDirectory()) {
			                rmfileSync(fullName);
			            } else {
			                fs.unlinkSync(fullName);
			            }
			        });
				    !is_not_rmmyself_if_directory && fs.rmdirSync(p);
		    	}else{
		    		fs.unlinkSync(p);
		    	}
		    }
	    	return true;
	    }catch(e){}
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
		if (!fs.existsSync(fromPath)) {
			return;
		}
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
	function readdir(dir, attr) {
		attr || (attr = {});
		var is_not_recursive = attr.is_not_recursive;
		if(fs.existsSync(dir)) {
			var stat = fs.statSync(dir);
			if(stat.isDirectory()) {
				var return_val = [];
				var files = fs.readdirSync(dir);
				var is_mtime = attr.mtime;
				files.sort().forEach(function(file) {
					var fullName = path.join(dir, file);
					var stat_file = fs.statSync(fullName);
					var isDir = stat_file.isDirectory();
					var obj = {name: fullName, isDir: isDir};
					if(is_mtime){
						obj.mtime = stat_file.mtime;
					}
					if (isDir) {
						obj.sub = is_not_recursive? []: readdir(fullName);
					}
					return_val.push(obj);
				});
				return return_val;
			}
		}
	}
	var copyDirSync = function(fromPath, toPath) {
		var cache = {};
		function _init(list) {
			if (!list || list.length == 0) {
				return;
			}
			list.forEach(function(v) {
				if (!v.isDir) {
					cache[v.name] = 1;
				} else {
					_init(v.sub);
				}
			});
		}
		_init(readdir(fromPath));
		for (var i in cache) {
			var old_path = i;
			var new_path = old_path.replace(fromPath, toPath);
			copyFileSync(old_path, new_path)
		}
		return true;
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
		alert: function(msg, cb) {
			_getDialog('showMessageBox', {
				type: 'info',
				buttons: ['yes'],
				title: '系统提示',
				message: msg,
				icon: null
			}, cb);
		},
		save: function(default_filepath, callback) {
			_getDialog('showSaveDialog', {
				title: '选择保存路径',
	            defaultPath: default_filepath,
	            filters: [{
			        "name": "zip文件",
			        "extensions": ["zip"]
			    }]
			}, function(file_path) {
				if (file_path) {
					callback && callback(file_path);
				}
			});
		}
	}
	_exports.getProductTree = function() {
		try {
			return require(path.join(path_config, '.sys/sys_product_tree'));
		} catch(e){}
	}
	_exports.getSys = function() {
		try {
			return require(path.join(path_config, '.sys/sys'));
		} catch(e){}
	}
	_exports.file = {};
	_exports.file.write = function(file_path, content_str) {
		mkdirSync(path.dirname(file_path));

		fs.writeFileSync(file_path, content_str);
	}
	_exports.file.exists = exists;
	_exports.file.copy = copyFileSync;
	_exports.file.rm = rmfileSync;
	_exports.file.copyDir = copyDirSync;

	var PATH_DATA = path.join(__dirname, 'data');
	var PATH_DATA_CONFIG = path.join(PATH_DATA, 'config');
	var PATH_DATA_DATA = path.join(PATH_DATA, 'data');
	var PATH_DATA_GEOFILE = path.join(PATH_DATA, 'geo');

	_exports.CONST = {
		PATH_CONFIG_USER: path_config,
		PATH_DATA: PATH_DATA,
		PATH_DATA_CONFIG: PATH_DATA_CONFIG,
		PATH_DATA_DATA: PATH_DATA_DATA,
		PATH_DATA_GEOFILE: PATH_DATA_GEOFILE
	};

	module.exports = _exports;
}()