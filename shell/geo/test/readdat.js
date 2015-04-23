var fs = require('fs'),
	util = require('../util');
var source_path = './1.dat';

fs.readFile(source_path, {
	encoding: 'binary'
}, function(err, data){
	fs.writeFile(source_path+'.txt', data);
	return;
	// console.log(i, data.read);

	// console.log(i, data.readUInt16LE(41), String.fromCharCode(data.readInt8(41)));
	for(var i = 0, j = data.length; i<j && i < 200; i++){
		// if(i >= 97){
		// 	console.log(i, data.readDoubleLE(i));
		// }else{
			console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
		// }
		
	}
	return;
	var i = 0;
	console.log(i, data.readUInt16BE(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt8(i)));
	i++;
	console.log(i, data.readUInt8(i), String.fromCharCode(data.readUInt16BE(i)), data.readUInt16LE(i), String.fromCharCode(data.readUInt16LE(i)), data.readUInt32LE(i), String.fromCharCode(data.readUInt32LE(i)));
	i++;
	console.log(i, data.readUInt16BE(i), String.fromCharCode(data.readUInt16BE(i)));
	i++;
});

// var fs = require('fs');
// var readStream = fs.createReadStream(source_path);
// readStream.pipe(process.stdout);

// var crypto = require('crypto');
// var fs = require('fs');

// var readStream = fs.createReadStream(source_path);
// var hash = crypto.createHash('sha1');
// var result = '';
// readStream
//   .on('data', function (chunk) {
//     result += chunk;
//   })
//   .on('end', function () {
//     console.log(i, result);
//   });
