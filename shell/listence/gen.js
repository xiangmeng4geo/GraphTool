var fs = require('fs');
var path = require('path');
var util = require('../../app/common/util');

function gen(time_start, time_end, is_from_command){
	time_start = new Date(time_start),
	time_end = new Date(time_end);
	var source_str = [time_start.getTime(), time_end.getTime()].join('|');
	var listen_str = util.encrypt.encode(source_str);
	listen_str = listen_str.reverse().toUpperCase();
	if(is_from_command){
		return '('+[time_start.format('yyyy-MM-dd'), time_end.format('yyyy-MM-dd')].join('|')+')'+'\t'+listen_str+'\n\r';
	}else{
		return listen_str;
	}
}
var args = [].slice.call(process.argv);
//命令行进行指定文件压缩
if(args.length >= 2){
	var time_s = new Date(),
		time_e = new Date();
		time_e.setMonth(time_e.getMonth() + 1);

	var time_start = args[2] || time_s,
		time_end = args[3] || time_e;
	var result = gen(time_start, time_end, true);
	fs.appendFileSync(path.join(__dirname, './listence'), result);
	console.log(result);
}

exports.gen = gen;
var info = {
	key: 'private_key',
	name: 'admin',
	pwd: '123'
}
info.pwd = util.encrypt(info.pwd, info.key);
exports.verification = function(time_start, time_end) {
	info.l = gen(time_start, time_end);
	return util.encrypt.encode(JSON.stringify(info));
}