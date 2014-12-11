var fs = require('fs');
var core = require('../core/node_modules/core');
var util = core.util;

var info = {
	key: 'private_key',
	name: 'admin',
	pwd: '123'
}
info.pwd = util.encrypt(info.pwd,info.key);


fs.writeFile('../core/conf/verification.json',JSON.stringify(info));
