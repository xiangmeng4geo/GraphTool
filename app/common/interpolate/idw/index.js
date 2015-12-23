!function() {
	var child_process = require('child_process');
	var path = require('path');
	var util = require('../../util');

	var path_idw = path.join(__dirname, 'idw');

	function interpolate(data, lnglat_arr, option, cb) {
		if (util.isFunction(option)) {
			cb = option;
			option = null;
		}

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
		child_idw.send({
			data: data,
			lnglat_arr: lnglat_arr,
			option: option
		});
	}
	interpolate.info = function(cb){
		cb_info = cb;
	}
	module.exports = interpolate;
}();