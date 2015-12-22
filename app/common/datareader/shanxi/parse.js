!function() {
	var util = require('../../util');
	var util_file = util.file;
	var exec = require('child_process').exec;
	//这里要捕捉到命令的错误输出，一定不可以把错误重定向
	function _run(command, callback, timeout){
		callback || (callback = function(){});
		// add timeout option
		var runCommand = exec(command, {
			timeout: parseInt(timeout) || 0
		}, function(error, stdout, stderr){
			if(error || stderr){
				callback(error||stderr);
			}else{
				callback(null, stdout && stdout.replace(/^\s*|\s*$/g,''));
			}
		});
	}
	function _parse(conf, model) {
		var command = conf.data.val.command;
		var conf_result;
		_run(command, function(err, conf_path) {
			if (err) {
				model.emit('error', err);
			} else {
				conf_result = util_file.readJson(conf_path);
				if (!conf_result) {
					err = new Error('get content of "'+conf_path+'" error!');
					model.emit('error', err);
				}
			}

			model.emit('map.changeconfig', util.extend(true, {
				map: conf.other.map,
				legend: conf.other.legend,
				legendStyle: conf.other.legend_style,
				showData: true,
				data: {
					type: 'shanxi'
				}
			}, conf_result));
		});
	}
	module.exports = _parse;
}()
