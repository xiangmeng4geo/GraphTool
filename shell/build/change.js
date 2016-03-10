var fs = require('fs'),
	path = require('path');

var const_file = path.join(__dirname, 'target/common/const.js')
var content = fs.readFileSync(const_file).toString();
content = content.replace(/\.COMMAND=([^,;]+)/, '.COMMAND=0');
content = content.replace(/DEBUG:([^,;]+),/, '');
fs.writeFileSync(const_file, content);

// 有效期可以通过命令行传入
var month = 1;
var argv = process.argv;
if (argv.length > 2) {
	month = parseInt(argv[2]) || month;
}

// 对序列号进行处理
var time_start = new Date();
var time_end = new Date(time_start.getTime());
time_end.setMonth(time_end.getMonth() + month);
var result = require('../listence/gen').verification(time_start, time_end);

fs.writeFileSync(path.join(__dirname, 'target/conf/verification.json'), result);

console.log();
console.log('序列号如下：');
console.log(result);
console.log();
console.log('month = '+month+', 有效其从 ['+(time_start.format())+'] 到 ['+time_end.format()+']');