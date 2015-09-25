var fs = require('fs'),
	path = require('path');
var readRARContent = require('./libunrar');

function toBuffer(ab) {
    var buffer = new Buffer(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        buffer[i] = view[i];
    }
    return buffer;
}
module.exports = function(path_rar, path_save, onunrar, onfinish){
	if(typeof path_save === 'function'){
		onfinish = onunrar;
		onunrar = path_save;
		path_save = path_rar+'_dir';
	}
	// console.log(path_rar, path_save, onunrar, onfinish);
	fs.existsSync(path_save) || fs.mkdirSync(path_save);

	fs.readFile(path_rar, function(err, data){
		var rarContent = readRARContent([{name: path.basename(path_rar), content: new Uint8Array(data)}], '', function(){
			// console.log(arguments);
			onunrar && onunrar.apply(null, arguments);
		});
		var rec = function(entry, path_check) {
			var dealPath = path_check.replace(path_save, '');
			// if(dealPath){
			// 	onunrar && onunrar(dealPath);
			// }
			if(entry.type === 'file') {
				fs.writeFileSync(path_check, toBuffer(entry.fileContent.buffer));
			} else if(entry.type === 'dir') {
				var ls = entry.ls;
				Object.keys(ls).forEach(function(k){
					var p = path.join(path_check, k);
					if(ls[k].type === 'dir'){
						fs.existsSync(p) || fs.mkdirSync(p);
					}
					
					rec(entry.ls[k], p)
				})
			} else {
				// throw "Unknown type"
			}
		}
		rec(rarContent, path_save);
		onfinish && onfinish({
			path: path_save
		});
	})
}