function work(a, b){
	var time_start = new Date();
	while(1){
		if(new Date() - time_start >= 10*1000){
			console.log('work after 3s');
			break;
		}
	}	
}
process.on('message', function(m) {
  console.log('CHILD got message:', m);
  work();
  process.send({ msg: 'child after 3s' });	
  process.exit();	  
});

process.send({ foo: 'bar' });