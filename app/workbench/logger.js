!function(){
	'use strict'
	
	let fs = require('fs');
	let path = require('path');
	
	const CONST_LOG = require('./const').LOG;
	const PATH_LOG = CONST_LOG.PATH;
	const LOG_DELAY = CONST_LOG.DELAY || 10;
	
	const EOL = require('os').EOL;
	
	
	function format_date(date, format){
		format || (format = 'yyyy-MM-dd hh:mm:ss');
		var o = {
			"M+" : date.getMonth()+1, //month
			"d+" : date.getDate(),    //day
			"h+" : date.getHours(),   //hour
			"m+" : date.getMinutes(), //minute
			"s+" : date.getSeconds(), //second
			"q+" : Math.floor((date.getMonth()+3)/3),  //quarter
			"S" : date.getMilliseconds() //millisecond
		}
		if(/(y+)/.test(format)){
			format = format.replace(RegExp.$1,(date.getFullYear()+"").substr(4 - RegExp.$1.length));
		} 
		for(var k in o){
			if(new RegExp("("+ k +")").test(format)){
				format = format.replace(RegExp.$1,RegExp.$1.length==1 ? o[k] :("00"+ o[k]).substr((""+ o[k]).length));
			}
		}
		
		return format;
	}
	
	if(!fs.existsSync(PATH_LOG)){
		fs.mkdirSync(PATH_LOG);
	}
	let msg_stack = [];
	let dealTime = 0;
	function log(msg, type){
		msg_stack.push([new Date(), type, msg]);
		
		if(!dealTime){
			dealTime = setTimeout(deal, LOG_DELAY);
		}
	}
	function deal(){
		let msgs = msg_stack.splice(0);
		
		if(msgs.length == 0){
			dealTime = 0;
			return;
		}
		msgs = msgs.map(v => {
			return [`[${v[1]}]`, format_date(v[0]), v[2]].join('\t');
		});
		
		let log_file_path = path.join(PATH_LOG, format_date(new Date(), 'yyyy-MM-dd'));
		fs.appendFile(log_file_path, msgs.join(EOL)+EOL, () => {
			setTimeout(deal, LOG_DELAY);
		});
	}
	
	let fns = {};
	['info', 'error'].map(v => {
		fns[v] = function(msg){
			log(msg, v);
		}
	});
	module.exports = fns
}();