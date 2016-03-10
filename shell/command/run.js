var path = require('path');
var fs = require('fs');
var tmpDir = path.join(require('os').tmpDir(), 'BPA');
if (!fs.existsSync(tmpDir)) {
	fs.mkdirSync(tmpDir);
}


var exec = require('child_process').exec;
//这里要捕捉到命令的错误输出，一定不可以把错误重定向
var command = function(command,callback,timeout){
	callback || (callback = function(){});
	// add timeout option
	var runCommand = exec(command,{timeout: +timeout || 0},function(error, stdout, stderr){
		if(error || stderr){
			callback(error||stderr);
		}else{
			callback(null,stdout&&stdout.replace(/^\s*|\s*$/g,''));
		}
	});
}

var bin_path = path.join(__dirname, 'command32.exe');

function run(conf_name) {
	var data_dir = path.join(__dirname, '../../test/data/command');
	var conf_path = path.join(data_dir, conf_name);
	var conf = require(conf_path);
	try {
		var file = conf.data.file;
		if (!path.isAbsolute(file)) {
			file = path.join(data_dir, file);
		}
		conf.data.file = file;
	} catch(e){}

	var file_name_new = path.join(tmpDir, conf_name);
	fs.writeFileSync(file_name_new, JSON.stringify(conf));

	var command_str = bin_path+' -sync -file "'+file_name_new+'"';
	console.log();
	command(command_str, function(err, result) {
		console.log(conf_name, err, result);
		console.log();
	});
}

// run('rain.json');
// run('tmp.json');
// run('rain-1.json');
// run('rain-2.json');
run('20160310.json');