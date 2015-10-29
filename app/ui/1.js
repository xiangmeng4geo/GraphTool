!function(){
	// 1. 数据传递都是字符串传递
	// 2. 不能引用外部模块
	var util;
	thread.on('init', function(u){
		util = u;
		thread.emit('data', 'got util', util);
	});
	thread.on('next', function(){
		thread.emit('data', 0, arguments, util);
		/*这里不能引用外部模块*/
		// require('util')
		work(1, 2);
	});
	function work(a, b){
		thread.emit('data', a, b);
		var time_start = new Date();
		while(1){
			if(new Date() - time_start >= 3*1000){
				break;
			}
		}	
		thread.emit('data', 'after 3s');
	}

	module.exports = {
		name: 'test modules'
	}
}()