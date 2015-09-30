// process.on('message', function(filename_new){
// 	console.log('message:');
// 	process.send('hello');
// 	// require('./unrar')(filename_new, function(e, data){
// 	// 	data.err = e;
// 	// 	process.send(data);
// 	// }, function(data){
// 	// 	process.send({
// 	// 		path: data.path,
// 	// 		isfinish: true
// 	// 	});
// 	// });
// });
console.log('unrar worker');
onmessage = function(e){
	var filename_new = e.data;
	require('./unrar')(filename_new, function(e, data){
		data.err = e;
		postMessage(data);
	}, function(data){
		postMessage({
			path: data.path,
			isfinish: true
		});
	});
}