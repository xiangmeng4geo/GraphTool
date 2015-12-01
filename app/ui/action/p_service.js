Core.init(function(model) {
	var ipc = require('electron').ipcRenderer;

	var C = Core;C.Win.WIN.show();
	var _require = C.require;
	var util = _require('util');
	var util_file = util.file;
	var util_path = util.path;
	var path = require('path');
	var CONST_PATH_OUTPUT = _require('const').PATH.OUTPUT;

	_require('p_main_map');

	model.emit('tree.ready');

	model.on('error', function(err) {

	});
	var _confCurrent;
	function _error(msg) {
		model.emit(new Error('[command error] '+msg));
		ipc.send('cb', {
			key: _confCurrent._id,
			err: msg
		});
	}
	function _changeProduct(product_name) {
		var conf = _require('product_conf').read(product_name);
		if (conf) {
			_require('datareader').setModel(model).parseConf(conf);
		}
	}
	function _changeFile(file_path) {
		var conf = util_file.readJson(file_path);
		if (!conf) {
			_error('file ['+file_path+'] not exists or empty or data error!');
		} else {
			conf = util.extend(true, {
				data: {
					type: 'shanxi'
				}
			}, conf);
			_confCurrent.__conf = conf;
			model.emit('map.changeconfig', conf);
		}
	}
	model.on('map.afterRender', function(err, time_used) {
		if (!err) {
			var conf = _confCurrent.__conf;
			var save_path = conf.savepath;
			var save_dir, filename;
			if (save_path) {
				if (!/\.(png|jpg)$/i.test(save_path)) {
					save_dir = save_path;
				} else {
					save_dir = path.dirname(save_path);
					filename = path.basename(save_path);
				}
			}
			if (!save_dir) {
				save_dir = CONST_PATH_OUTPUT;
			}
			if (!filename) {
				filename = util.encrypt(util.serialize(conf))+'.png';
			}

			save_path = path.join(save_dir, filename);
			model.emit('export', save_path);
		}
    });
	model.on('afterExport', function(save_path, time_used){
		ipc.send('cb', {
			key: _confCurrent._id,
			data: {
				path: save_path,
				time: time_used
			}
		});
	})
	model.on('command.conf', function(conf) {
		_confCurrent = conf;
		var file = conf.file;
		var name = conf.name;
		if (file) {
			_changeFile(file);
		} else if (name) {
			_changeProduct(name);
		}
	});
	require('remote').getCurrentWindow().webContents.emit('ready');
})
