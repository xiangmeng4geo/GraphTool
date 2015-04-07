var fs = require('fs');
var path = require('path');
var core = require('../../core/node_modules/core');
var util = core.util;

String.prototype.reverse = function(){
	return this.split('').reverse().join('');
}
function gen(time_start, time_end, is_from_command){
	time_start = new Date(time_start),
	time_end = new Date(time_end);
	var source_str = [time_start.getTime(), time_end.getTime()].join('|');
	var listen_str = util.encrypt.encode(source_str);
	listen_str = listen_str.reverse().toUpperCase();
	if(is_from_command){
		return source_str+'\t'+listen_str+'\n\r';
	}else{
		return listen_str;
	}
}
var args = [].slice.call(process.argv);
//命令行进行指定文件压缩
if(args.length >= 2){
	var time_start = args[2] || '2015-04-01',
		time_end = args[3] || '2017-05-01';
	fs.appendFileSync(path.join(__dirname, './listence.txt'), gen(time_start, time_end, true));
}


exports.gen = gen;