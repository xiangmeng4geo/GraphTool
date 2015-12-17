!function(){
	'use strict'

	var fs = require('fs');
	var path = require('path');
	var util = require('./util');

	var IS_DEBUG = true; // 是否是debug模式
	var CONST_LOG = require('./const').LOG;
	var PATH_LOG = CONST_LOG.PATH;
	var LOG_DELAY = CONST_LOG.DELAY || 10;

	var EOL = require('os').EOL;


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

	util.file.mkdir(PATH_LOG);
	var fn_show = (function(){
		return IS_DEBUG? function(msg, cb){
			console.log(msg);
			cb();
		}: function(msg, cb){
			var log_file_path = path.join(PATH_LOG, format_date(new Date(), 'yyyy-MM-dd'));
			fs.appendFile(log_file_path, msg, cb);
		}
	})();
	var msg_stack = [];
	var dealTime = 0;
	function log(msg, type){
		if(msg instanceof Error){
			msg = msg.stack;
		}
		msg_stack.push([new Date(), type, msg]);

		if(!dealTime){
			dealTime = setTimeout(deal, LOG_DELAY);
		}
	}

	function deal(){
		var msgs = msg_stack.splice(0);

		if(msgs.length == 0){
			dealTime = 0;
			return;
		}
		msgs = msgs.map(function(v){
			return ['['+v[1]+']', format_date(v[0], '<yyyy-MM-dd hh:mm:ss>'), v[2]].join('\t');
		});

		fn_show(msgs.join(EOL)+EOL, function(){
			dealTime = setTimeout(deal, LOG_DELAY);
		});
	}

	var Logger = {};
	['info', 'error'].map(function(v){
		Logger[v] = function(msg){
			log(msg, v);
		}
	});

	Logger.DEBUG = IS_DEBUG;
	module.exports = Logger
}();
