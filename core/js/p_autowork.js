Core.safe(function(){
	var util_lib = Core.Lib.util,
		util_file = util_lib.file,
		util_path = util_lib.path;
	var CoreWindow = Core.Window;
	var gui = CoreWindow.getGui();
	var tray = new gui.Tray({ title: 'Tray', icon: util_path.join(util_file.path.core, 'img/icon_64x64.png') });
	tray.tooltip = '自动作业';

	// Give it a menu
	var menu = new gui.Menu();
	var MenuItem = gui.MenuItem;
	var item_start = new MenuItem({ label: '启动' });
	var item_stop = new MenuItem({ label: '暂停' });
	var item_setting = new MenuItem({ label: '配置' });
	var item_log = new MenuItem({ label: '查看日志' });
	var item_quit = new MenuItem({ label: '退出' });
	item_quit.on('click',function(){
		currentWindow.close(true);
	});
	item_start.on('click',function(){
		// CoreWindow.close();
	});
	item_stop.on('click',function(){
		// CoreWindow.close();
	});
	item_setting.on('click', function(){
		Core.Page.aw_list();
	});
	menu.append(item_start);
	menu.append(item_stop);
	menu.append(item_setting);
	menu.append(item_log);
	menu.append(item_quit);
	tray.menu = menu;


return;
	var queue = ["降水预报20150415_2", "降水预报20150415"];//执行队列
	var running = false;

	// 检测要自动生成图片的产品，并放入队列
	function check(){
		run();
	}
	// var $doc_exec;
	win_index = Core.Page.main();
	win_index.once('inited', function(){
		// win_index.show();
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