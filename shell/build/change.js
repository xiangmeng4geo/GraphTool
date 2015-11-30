var fs = require('fs'),
	path = require('path');

var logger_path = path.join(__dirname, 'target/common/logger.js');

var content = fs.readFileSync(logger_path).toString();
var reg = /\.DEBUG=([^,]+),/;
var m = reg.exec(content);
if (m) {
    var reg_replace = RegExp(','+m[1]+'=!0,');
    content = content.replace(reg_replace, ','+m[1]+'=0,');

    fs.writeFileSync(logger_path, content);
}
