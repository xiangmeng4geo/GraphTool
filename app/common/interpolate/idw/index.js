!function() {
	var child_process = require('child_process');
	var path = require('path');
	var util = require('../../util');
	/* 
	经过测试在8核的电脑上同时fork了100个子进程，正常运行

	** 这里暂时当最少2个cpu时用子进程，否则在当前进程处理

	http://stackoverflow.com/questions/31252188/node-js-child-process-limits

	the cpu has two cores, a single core can support multiple threads, 
	and child processes do run in their own threads, so the answer is of 
	course yes. though, a simple test would have likely brought you to 
	the same conclusion.
	*/
	var is_can_use_fork = require('os').cpus().length >= 2;

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