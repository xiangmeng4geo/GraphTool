!function(){
	var fs = require('fs'),
		path = require('path'),
		crypto = require('crypto');

	var encrypt = function (str, private_key){
	    if(str && str.toString){
	        return crypto.createHash('sha1').update(str.toString()+(private_key||'util')).digest('hex');
	    }
	    return '';
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

	// 同步新建目录
	function mkdirSync(mkPath){
		try{
			var parentPath = path.dirname(mkPath);
			if(!fs.existsSync(parentPath)){
				mkdirSync(parentPath);
			}
			if(!fs.existsSync(mkPath)){
				fs.mkdirSync(mkPath);
			}
			return true;
		}catch(e){}
	}
	// 同步拷贝文件
	function copySync(fromPath,toPath){
		try{
			if(fs.existsSync(toPath)){
				fs.unlinkSync(toPath);
			}else{
				mkdirSync(path.dirname(toPath));
			}
			var BUF_LENGTH = 64*1024
			var buff = new Buffer(BUF_LENGTH)
			var fdr = fs.openSync(fromPath, 'r');
			var fdw = fs.openSync(toPath, 'w');
			var bytesRead = 1;
			var pos = 0;
			while (bytesRead > 0){
				bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
				fs.writeSync(fdw,buff,0,bytesRead);
				pos += bytesRead;
			}
			
			fs.closeSync(fdr);
			fs.closeSync(fdw);
			return true;
		}catch(e){}
	}
	exports.encrypt = encrypt;
	exports.rmfileSync = rmfileSync;
	exports.mkdirSync = mkdirSync;
	exports.copySync = copySync;
}()