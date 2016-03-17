var path = require('path');
var fs = require('fs');

var archiver = require('archiver');
var asar = require('../source/lib/asar_stream');
// var list = asar.listPackage('F:/source/node_projects/GraphTool/shell/testdata/target/export/resources/atom.asar');
// console.log(list);
// asar.createPackageFromFiles('d://test', 'd://1.asar', list);

// source_dir = 'd:/test';
// asar.createPackage(source_dir, 'd://1.asar', function() {
// 	// console.log(arguments);
// });


var source_dir = 'F:\\source\\node_projects\\GraphTool\\shell\\testdata\\target\\export\\resources\\atom.asar';
var archive = archiver('zip');
var output = fs.createWriteStream('d://1.zip');
output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
});

archive.on('error', function(err){
    throw err;
});
archive.pipe(output);

archive.append(fs.createReadStream('d:/22.png'), {
	name: '22.png'
});
archive.append(asar.getStream(source_dir), {
	name: 'resources/atom.asar'
});

archive.finalize();