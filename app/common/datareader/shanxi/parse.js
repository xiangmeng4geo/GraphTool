!function() {
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
		_run(command, function(err, content) {
			if (err) {
				model.emit('error', err);
			} else {
				model.emit('map.changeconfig', content);
			}
		});

	}
	module.exports = _parse;
}()
