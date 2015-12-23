!function() {
	var child_process = require('child_process');
	var path = require('path');
	var util = require('../../util');
	var is_can_use_fork = require('os').cpus().length > 4;

	// is_can_use_fork = false;
	var path_idw = path.join(__dirname, 'idw');

	function interpolate(data, lnglat_arr, option, cb) {
		if (util.isFunction(option)) {
			cb = option;
			option = null;
		}
		var param = {
			data: data,
			lnglat_arr: lnglat_arr,
			option: option
		};
		if (is_can_use_fork) {
			var child_idw = child_process.fork(path_idw, null, {
				silent: true
			});
			child_idw.on('message', function(msg) {
				var err, result;
				if (msg) {
					err = msg.err;
					result = msg.result;
				}
				cb && cb(err, result);
			});
			child_idw.send(param);
		} else {
			var result = require(path_idw)(param);
			cb && cb(null, result);
		}		
	}
	interpolate.info = function(cb){
		cb_info = cb;
	}
	module.exports = interpolate;
}();