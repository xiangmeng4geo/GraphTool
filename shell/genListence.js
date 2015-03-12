var core = require('../core/node_modules/core');
var util = core.util;


var buf1 = 'test'+(new Date().getTime()), key = 'test';
console.log(buf1);
var str = util.encrypt.encode(buf1, key);
console.log(str);

console.log(util.encrypt.decode(str, key));