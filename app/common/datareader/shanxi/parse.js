!function() {
	var util_file = require('../../util').file;
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
		_run(command, function(err, conf_path) {
			if (err) {
				model.emit('error', err);
			} else {
				var conf_result = util_file.readJson(conf_path);
				if (!conf_result) {
					return model.emit('error', new Error('get content of "'+conf_path+'" error!'));
				}
				conf_result.data.type = 'shanxi';
				conf_result.map = conf.other.map;
				conf_result.legend = conf.other.legend;

				model.emit('map.changeconfig', conf_result);
			}
		});
	}
	module.exports = _parse;
}()
