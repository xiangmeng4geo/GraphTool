process.on('message', function(m){
	console.log('child got message: ', arguments);
});

setTimeout(function(){
	process.send('from child!');
}, 2000);