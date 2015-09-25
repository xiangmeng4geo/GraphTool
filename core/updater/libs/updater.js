!function(){
	var http = require('http'),
		fs = require('fs'),
		path = require('path'),
		os = require('os');
	var exec = require('child_process').exec;

	var dir_tmp_os = os.tmpdir();
	var mainexe = _format_path(process.execPath);
	var App;

	function Updater(){

	}
	Updater.init = function(gui){
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
				var result = JSON.parse(content);console.log(result);
				var v_old = data.version,
					v_new = result.version;

				_this._v_old = v_old;
				_this._v_new = v_new;
				_this._info = result;

				cb && cb({
					flag_new: v_old && v_new && v_old !== v_new
				});
			});
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
					onfinish && onfinish(null, {
						path: _dir
					});
				});
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
		var _this = this;
		var dir_project = _format_path(_this.data.basepath), 
			dir_download = _format_path(_this._download_dir);

		var command = mainexe.replace(dir_project, dir_download)+' '+path.join(dir_download, 'updater/')+' '+dir_download+' '+dir_project;
		console.log(command);
		exec(command);
		setTimeout(function(){
			App.quit();
		}, 1000);
	}
	Updater.restart = function(cb){
		var argv = App.argv;
		if (argv.length) {
			var path_tmp = argv[0];
			var path_project = argv[1];
			exec('copy /y '+path_tmp+' '+path_project, function(){
				exec('rmdir /s/q '+path_tmp, function(){
					console.log('end rmdir');
				});
				var command = mainexe.replace(path_tmp, path_project)+' '+path_project;
				exec(command, function(){
					console.log('end copy');
					App.quit()	
				});				
			})
			
		}else{
			cb && cb();
		}
	}
	module.exports = Updater;
}()