var fs = require('fs');
var core = require('../core/node_modules/core');
var genListence = require('./listence/gen').gen;
var util = core.util;

var info = {
	key: 'private_key',
	name: 'admin',
	pwd: '123'
}
info.pwd = util.encrypt(info.pwd,info.key);
info.l = genListence('2015-04-15', '2015-05-20');
console.log(info);
var content = JSON.stringify(info);
content = core.util.encrypt.encode(content);
fs.writeFile('../core/conf/verification.json', content);
