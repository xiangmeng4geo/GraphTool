Core.safe(function(){
	var queue = ["降水预报20150415_2", "降水预报20150415"];//执行队列
	var running = false;

	// 检测要自动生成图片的产品，并放入队列
	function check(){
		run();
	}
	// var $doc_exec;
	win_index = Core.Page.main();
	win_index.once('inited', function(){
		win_index.show();
		$doc_exec = $(win_index.window.document);
		check();
	});
	
	function run(){
		if(queue.length > 0 && !running){
			running = true;
			var item_exec = queue.shift();
			if(item_exec){
				win_index.emit(Core.Const.Event.PRODUCT_CHANGE, item_exec, function(err, data){
	        		if(err){
	        			alert("错误1："+err.msg);
	        		}else{
	        			console.log('用时1:'+ data.time+'ms!保存在:'+data.path);
	        		}
	        	});
	        	running = false;
	        	setTimeout(run, 1000);
			}
			running = false;
		}
	}
});