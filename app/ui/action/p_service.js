Core.init(function(model) {
	var C = Core;
	var _require = C.require;
	var util = _require('util');
	var util_file = util.file;
	
	_require('p_main_map');
	
	model.emit('tree.ready');
	
	model.on('error', function(err) {
		
	});
	function _error(msg) {
		model.emit(new Error('[command error] '+msg));
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
			_error('file ['+file_path+'] not exists or empty!');
		} else {
			conf = util.extend(true, {
				data: {
					type: 'shanxi'
				}
			}, conf);
			model.emit('map.changeconfig', conf);
		}
	}
	model.on('command.conf', function(conf) {
		var file = conf.file;
		var name = conf.name;
		if (file) {
			_changeFile(file);
		} else if (name) {
			_changeProduct(name);
		}
	});
})