var reg = /{{(T2|T1||T0|T|W|H)?([^{}]+?)}}/gi;

var data = {
	t: new Date(),
	t1: new Date('2014/12/15 12:00'),
	t2: new Date('2015/10/11 03:00'),
	w: 100,
	h: 200
}
/*时间格式化*/
Date.prototype.format = function(format,is_not_second){
	format || (format = 'yyyy-MM-dd hh:mm:ss');
	var o = {
		"M{2}" : this.getMonth()+1, //month
		"d{2}" : this.getDate(),    //day
		"h{2}" : this.getHours(),   //hour
		"m{2}" : this.getMinutes(), //minute
		"q{2}" : Math.floor((this.getMonth()+3)/3),  //quarter
	}
	if(!is_not_second){
		o["s{2}"] = this.getSeconds(); //second
		o["S{2}"] = this.getMilliseconds() //millisecond
	}
	if(/(y{4}|y{2})/.test(format)){
		format = format.replace(RegExp.$1,(this.getFullYear()+"").substr(4 - RegExp.$1.length));
	}
	for(var k in o){
		if(new RegExp("("+ k +")").test(format)){
			format = format.replace(RegExp.$1,RegExp.$1.length==1 ? o[k] :("00"+ o[k]).substr((""+ o[k]).length));
		}
	}

	return format;
}

var _format = function(data) {
	data = data || {};
	return function(str) {
		return str.replace(reg, function(m0, m1, m2, m3) {
			// console.log(m1, m2);
			var val = data[m1] || data['t'];
			if (val) {
				if (val instanceof Date) {
					return (val).format(m2)
				} else {
					return val+m2;
				}
			} else {
				return m0;
			}
		});
	}
};
var str = '{{(yyyy-MM-dd hh:mm:ss)}} ({{tyyyy-MM-dd}})  ({{t0yyyy-MM}}) ({{t1yyyyMMdd}}) - ({{t2yyyyMMdd}}) _ ({{w100}}) ({{wabc}}) _ ({{htest}})';

var fn_format = _format(data);
var result = fn_format(str);
console.log(str);
console.log(result);
var result = fn_format('{{w}}*{{h}}');
console.log(result);
var result = fn_format('rr{{yyyyMMddhh}}bb.000');
console.log(result);
