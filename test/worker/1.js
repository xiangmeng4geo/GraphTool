var child = require('child_process').fork('./2');
child.on('message', function(m){
	console.log('got message:', m);
});
child.send({
	fileName: 'test', 
	cb: function(){
		console.log(123);
	}
});