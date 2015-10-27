!function(){
	'use strict'

	var fs = require('fs'),
		path = require('path'),
		crypto = require('crypto');

	var file_verification = 'verification';
	var CONST = require('./const');
	var CONST_PATH_CONF = CONST.PATH.CONF;

	var Util = {};

	/**
	 * 文件工具类
	 */
	function rmfileSync(p, is_not_rmmyself_if_directory) {
	    //如果文件路径不存在或文件路径不是文件夹则直接返回
	    try{
	    	if(exists(p)){
		    	var stat = fs.statSync(p);
		    	if(stat.isDirectory()){
		    		var files = fs.readdirSync(p);
		    		files.forEach(function(file) {
			            var fullName = path.join(p, file);
			            if (fs.statSync(fullName).isDirectory()) {
			                rmfileSync(fullName);
			            } else {
			                fs.unlinkSync(fullName);
			            }
			        });
				    !is_not_rmmyself_if_directory && fs.rmdirSync(p);
		    	}else{
		    		fs.unlinkSync(p);
		    	}
		    }
	    	return true;
	    }catch(e){}
	}
	function read(_p, is_return_json){
		if(exists(_p)){
			var content = fs.readFileSync(_p, 'utf-8');
			if(is_return_json){
				try{
					return JSON.parse(content);
				}catch(e){}
			}else{
				return content;
			}
		}
		return null;
	}
	function write(_p, content){
		if(typeof content === 'object'){
			content = JSON.stringify(content);
		}
		fs.writeFileSync(_p, content);
	}
	function exists(_p){
		return fs.existsSync(_p);
	}
	var file = {
		read: read,
		write: write,
		exists: exists,
		rm: rmfileSync
	}

	/**
	 * 加密与解密
	 */
	var DEFAULT_PRIVATE_KEY = '20150529';
	var METHOD_ALGORITHM = 'aes-256-cbc';
	/**
	 * 对字符串进行不可逆加密
	 */
	var encrypt = function(str, key){
		if(str && str.toString){
			return crypto.createHash('sha1').update(str.toString() + (key||DEFAULT_PRIVATE_KEY)).digest('hex');
		}
		return '';
	}

	var DEFAULT_KEY = 'GraphTool'+DEFAULT_PRIVATE_KEY;
	/**
	 * 对字符串进行可逆加密
	 */
	encrypt.encode = function(str){
		var cip = crypto.createCipher(METHOD_ALGORITHM, DEFAULT_KEY);
		return cip.update(str, 'binary', 'hex') + cip.final('hex');
	}
	/**
	 * 解密字符串
	 */
	encrypt.decode = function(str){
		var decipher = crypto.createDecipher(METHOD_ALGORITHM, DEFAULT_KEY);
		try{
			return decipher.update(str, 'hex', 'binary') + decipher.final('binary');
		}catch(e){}
	}

	/**
	 * 用于验证
	 */
	var path_file_verification = path.join(CONST_PATH_CONF, file_verification+'.json');
	var verification = {
		set: function(l){
			var conf = verification.get();
			conf.l = l;
			file.write(path_file_verification, encrypt.encode(JSON.stringify(conf)));
		}, get: function(){
			var content = file.read(path_file_verification);
			content = encrypt.decode(content);
			return content? JSON.parse(content): null;
		}
	}

	Util.verification = verification;
	Util.file = file;
	Util.encrypt = encrypt;
	module.exports = Util;
}();
