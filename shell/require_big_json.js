var date_start = new Date();
var data = require('./data/china_province.meractor.json');
var date_end = new Date();
console.log(data.projector, date_end.getTime() - date_start.getTime() + 'ms!');