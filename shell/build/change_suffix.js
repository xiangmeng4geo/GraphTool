var fs = require('fs'),
	path = require('path');

var TRANSLATION = {
	'.html': '.gt',
	'.js': '.gts',
	'.css': '.gtc'
};
function changeSuffix(dir){
	var files = fs.readdirSync(dir);
	files.forEach(function(file){
		var pathname = path.join(dir, file),
			stat = fs.lstatSync(pathname);
		
		if(stat.isDirectory()){
			if(file == 'css' || file == 'js'){
				if(file == 'css'){
					file = 'c';
				}else{
					file = 'j';
				}
				var new_pathname = path.join(dir, file);
				fs.renameSync(pathname, new_pathname);
				changeSuffix(new_pathname);
			}else{
				changeSuffix(pathname);
			}
		}else{
			var ext = path.extname(pathname);
			var toExt = TRANSLATION[ext];
			if(toExt){
				var newPathName = path.join(dir, path.basename(pathname, ext) + toExt);
				newPathName = newPathName;
				fs.renameSync(pathname, newPathName);
				if(ext == '.html'){
					var content = fs.readFileSync(newPathName, 'utf8');
					content = content.replace(/\.css/g,'.gtc').replace(/css(?=\/)/g,'c')
						.replace(/\.js/g,'.gts').replace(/js(?=\/)/g,'j');
					fs.writeFileSync(newPathName, content);
				}
			}
		}
	});
}


var args = [].slice.call(process.argv);
//命令行进行指定文件压缩
if(args.length > 2){
	var dir = args[2];
	changeSuffix(dir);
}