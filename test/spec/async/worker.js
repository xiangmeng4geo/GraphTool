!function(){
	var T = thread;
	function run(time){
		time = time*1000;
		var time_start = new Date();
		while(1){
			if(new Date() - time_start > time){
				return 'after '+time;
			}
		}
	}
	T.on('init', function(time){
		var result = run(time);
		T.emit('data', result);
	});
}();