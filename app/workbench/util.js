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
	let file = {
		read: function(_p, is_return_json){
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
		},
		write: function(_p, content){
			if(typeof content === 'object'){
				content = JSON.stringify(content);
			}
			fs.writeFileSync(_p, content);
		}
	}
	
	/**
	 * 加密与解密
	 */
	let encrypt = {};
	{
		const DEFAULT_PRIVATE_KEY = '20150529';
		const METHOD_ALGORITHM = 'aes-256-cbc';
		encrypt = function(str){
			if(str && str.toString){
				return crypto.createHash('sha1').update(str.toString() + DEFAULT_PRIVATE_KEY).digest('hex');
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
	let verification = {
		set: function(l){
			let conf = verification.get();
			conf.l = l;
			file.write(conf);
		}, get: function(){
			let f = path.join(CONST_PATH_CONF, file_verification+'.json');
			let content = file.read(f);
			content = encrypt.decode(content);
			return content? JSON.parse(content): null;
		}
	}
	
	Util.verification = verification;
	module.exports = Util;
}();