Core.init(function(model) {
	var ipc = require('electron').ipcRenderer;

	var C = Core;//C.Win.WIN.show();
	var _require = C.require;
	var util = _require('util');
	var isPlainObject = util.isPlainObject;
	var util_file = util.file;
	var util_path = util.path;
	var path = require('path');
	var CONST = _require('const');
	var CONST_SIZE = CONST.SIZE;
	var CONST_PATH_OUTPUT = CONST.PATH.OUTPUT;
	var isImg = _require('component').util.isImg;
	var getSys = _require('product_conf').getSys;

	if (CONST.DEBUG) {
		C.emit('ready');
	}
	_require('p_main_map');

	model.emit('tree.ready');

	function fn_err(err) {
		_error(err.msg || err.message || err);
	}
	model.on('error', fn_err);
	model.on('log.user.error', fn_err);
	var _confCurrent;
	function _error(msg) {
		model.emit(new Error('[command error] '+msg));
		ipc.send('cb', {
			key: _confCurrent._id,
			err: msg
		});
		_end();
	}
	var queue = [];
	var isDealing = false;
	function _end() {
		isDealing = false;
		_deal();
	}
	function _deal() {
		if (queue.length == 0 || isDealing) {
			return;
		}
		isDealing = true;
		var conf = queue.shift();
		_confCurrent = conf;
		var api = conf.api;
		if (api) {
			if (api == 'getMapCenter') {
				_getMapCenter(_finish);
				return;
			}
		}
		var file = conf.file;
		var name = conf.name;
		if (file) {
			_changeFile(file);
		} else if (name) {
			_changeProduct(name);
		}
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
				},
				width: CONST_SIZE.WIDTH,
				height: CONST_SIZE.HEIGHT,
				showLegendRange: true
			}, conf);
			var map = conf.map;
			if (!map || (!isPlainObject(map) && typeof map !== 'string') || !getSys.getGeo(map)) {
				return _error('请正确配置map字段!');
			}
			var legend = conf.legend;
			if (!legend || (!isPlainObject(legend) && typeof legend !== 'string') || !getSys.getLegend(legend)) {
				return _error('请正确配置legend字段!');
			}

			_confCurrent.__conf = conf;
			model.emit('map.changeconfig', conf);
		}
	}
	function _getMapCenter(cb) {
		var tt;
		model.emit('api.getMapCenter', function(point) {
			clearTimeout(tt);
			cb && cb({
				lng: Number(point[0].toFixed(4)),
				lat: Number(point[1].toFixed(4))
			})
		});
		
		tt = setTimeout(function() {
			cb = null;
			_error('getMapCenter get error!');
		}, 500);
	}
	function _finish(data) {
		ipc.send('cb', {
			key: _confCurrent._id,
			data: data
		});
		_end();
	}
	window.test = _getMapCenter;
	model.on('map.afterRender', function(err, time_used) {
		if (!err) {
			var conf = _confCurrent.__conf;
			var save_path = conf.savepath;
			var save_dir, filename;
			if (save_path) {
				if (!isImg(save_path)) {
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
		} else {
			_error(err);
		}
    });
	model.on('afterExport', function(save_path, time_used){
		_finish({
			path: save_path,
			time: time_used
		});
	})
	model.on('command.conf', function(conf) {
		queue.push(conf);
		_deal();
	});
	require('remote').getCurrentWindow().webContents.emit('ready');
})
