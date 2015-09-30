!function(){
	var http = require('http'),
		fs = require('fs'),
		path = require('path'),
		os = require('os');
	var exec = require('child_process').exec;

	var dir_tmp_os = os.tmpdir();
	var mainexe = _format_path(process.execPath);
	var GUI,App;
	function Updater(){

	}
	Updater.init = function(gui){
		GUI = gui;
		App = gui.App;
	}
	var prop = Updater.prototype;
	prop.check = function(data, cb){
		var _this = this;
		_this.data = data;
		http.get(data.url, function(res){
			var content = '';
			res.on('data', function(d){
				content += d;
			}).on('end', function(){
				var result = JSON.parse(content);
				var v_old = data.version,
					v_new = result.version;

				_this._v_old = v_old;
				_this._v_new = v_new;
				_this._info = result;

				cb && cb(null, {
					v_old: v_old,
					v_new: v_new,
					flag_new: v_old && v_new && v_old !== v_new
				});
			});
		}).on('error', function(e){
			cb && cb(e);
		});
	}
	prop.download = function(ondownloadprogress, onunrar, onfinish){
		var _this = this,
			_info = _this._info,
			_info_down = _info.download,
			_url = _info_down.url,
			_size = _info_down.size;

		var filename_new = path.join(dir_tmp_os, _this._v_new+path.extname(_url));
		var ws_download = fs.createWriteStream(filename_new);
		var _win_current = GUI.Window.get().window;
		http.get(_url, function(res){
			var downloaded_size = 0;
			res.on('data', function(d){
				downloaded_size += d.length;
				ondownloadprogress && ondownloadprogress({
					total: _size,
					position: downloaded_size
				});
			}).on('end', function(){
				require('./unrar')(filename_new, onunrar, function(data){
					var _dir = data.path;
					_this._download_dir = _dir;
					onfinish && onfinish(_dir);
				});
				// _win_current.onmessage = function(e){
				// 	var data = e.data;
				// 	if(data.isfinish){
				// 		win.close(true);
				// 		onfinish && onfinish(data.path);
				// 	}else{
				// 		onunrar && onunrar(data.filename);
				// 	}
				// }
				// var win = GUI.Window.open('./unrar_worker.html', {
				// 	show: false
				// });
				// win.on('loaded', function(){
				// 	try{
				// 		win.window.postMessage(filename_new, _win_current.location.origin);
				// 	}catch(e){
				// 		console.log(e);
				// 	}
				// });
			});
			res.pipe(ws_download);
		}).on('error', function(e){
			onfinish & onfinish(e);
		});	
	}
	function _format_path(dir){
		var arr = dir.split(path.sep);
		arr[0] = arr[0].toLowerCase();
		return arr.join(path.sep);
	}
	prop.install = function(){
		var _this = this;console.log(_this);
		var dir_project = _format_path(_this.data.basepath), 
			dir_download = _format_path(_this._download_dir);

		var command = mainexe.replace(dir_project, dir_download)+' '+path.join(dir_download, 'updater/')+' '+dir_download+' '+dir_project;
		command = 'start '+ command;
		console.log(command);
		exec(command).on('exit', function(){
			console.log('exit');
			App.quit();
		});
	}
	Updater.restart = function(cb_install, cb_check){
		var argv = App.argv;
		if (argv.length) {
			cb_install && cb_install();
			var path_tmp = argv[0];
			var path_project = argv[1];
			exec('xcopy /e/i/y/c '+path_tmp+' '+path_project, function(){
				exec('rmdir /s/q '+path_tmp, function(){
					console.log('end rmdir');
				});
				var command = mainexe.replace(path_tmp, path_project)+' '+path_project;
				command = 'start '+ command;
				exec(command).on('exit', function(){
					App.quit()	
				});				
			})
		}else{
			GUI.Window.get().show();
			cb_check && cb_check();
		}
	}
	module.exports = Updater;
}()