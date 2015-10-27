!function(){
	'use strict'

	let fs = require('fs'),
		path = require('path'),
		crypto = require('crypto');

	const file_verification = 'verification';
	let CONST = require('./const');
	let CONST_PATH_CONF = CONST.PATH.CONF;

	var Util = {};

	/**
	 * 文件工具类
	 */
	let file = {}
	{
		function rmfileSync(p, is_not_rmmyself_if_directory) {
		    //如果文件路径不存在或文件路径不是文件夹则直接返回
		    try{
		    	if(fs.existsSync(p)){
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
		file.read = function(_p, is_return_json){
			if(fs.existsSync(_p)){
				let content = fs.readFileSync(_p, 'utf-8');
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
		file.write = function(_p, content){
			if(typeof content === 'object'){
				content = JSON.stringify(content);
			}
			fs.writeFileSync(_p, content);
		}
		file.exists = function(_p){
			return fs.existsSync(_p);
		}
		file.rm = rmfileSync;
	}

	/**
	 * 加密与解密
	 */
	let encrypt = {};
	{
		const DEFAULT_PRIVATE_KEY = '20150529';
		const METHOD_ALGORITHM = 'aes-256-cbc';
		encrypt = function(str, key){
			if(str && str.toString){
				return crypto.createHash('sha1').update(str.toString() + (key||DEFAULT_PRIVATE_KEY)).digest('hex');
			}
			return '';
		}

		const DEFAULT_KEY = 'GraphTool'+DEFAULT_PRIVATE_KEY;
		encrypt.encode = function(str){
			var cip = crypto.createCipher(METHOD_ALGORITHM, DEFAULT_KEY);
			return cip.update(str, 'binary', 'hex') + cip.final('hex');
		}
		encrypt.decode = function(str){
			var decipher = crypto.createDecipher(METHOD_ALGORITHM, DEFAULT_KEY);
			try{
				return decipher.update(str, 'hex', 'binary') + decipher.final('binary');
			}catch(e){}
		}
	}

	/**
	 * 用于验证
	 */
	const path_file_verification = path.join(CONST_PATH_CONF, file_verification+'.json');
	let verification = {
		set: function(l){
			let conf = verification.get();
			conf.l = l;
			file.write(path_file_verification, encrypt.encode(JSON.stringify(conf)));
		}, get: function(){
			let content = file.read(path_file_verification);
			content = encrypt.decode(content);
			return content? JSON.parse(content): null;
		}
	}

	Util.verification = verification;
	Util.file = file;
	Util.encrypt = encrypt;
	module.exports = Util;
}();
