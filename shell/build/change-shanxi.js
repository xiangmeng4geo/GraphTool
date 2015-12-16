var fs = require('fs'),
	path = require('path');

var dir_ia32 = path.join(__dirname, 'ia32');
var dir_x64 = path.join(__dirname, 'x64');

var const_file_ia32 = path.join(dir_ia32, 'resources/app/conf/const.json');
var const_file_x64 = path.join(dir_x64, 'resources/app/conf/const.json');

var content = require(const_file_ia32);
content.DATA_TYPE = [{
	"text": "命令行",
	"val": "shanxi"
}];
content = JSON.stringify(content);

fs.writeFileSync(const_file_ia32, content);
fs.writeFileSync(const_file_x64, content);
