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
	var param = '';
	T.on('initData', function(msg) {
		T.emit('info', 'from worker:'+msg);
		param += msg;
	});
	T.on('initEnd', function(time){
		var result = run(time);
		T.emit('data', 'param = '+param+', result = '+result);
	});
}();