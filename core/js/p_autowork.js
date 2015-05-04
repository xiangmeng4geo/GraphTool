Core.safe(function(){
	var C = Core;
	var util_lib = C.Lib.util,
		util_file = util_lib.file,
		util_path = util_lib.path;
	var ConfUser = C.Lib.conf.User;
	var CoreWindow = C.Window;
	var gui = CoreWindow.getGui();
	var tray = new gui.Tray({ title: 'Tray', icon: util_path.join(util_file.path.core, 'img/icon.png') });
	tray.tooltip = '自动作业';

	// Give it a menu
	var menu = new gui.Menu();
	var MenuItem = gui.MenuItem;
	var item_start = new MenuItem({ label: '启动' });
	var item_stop = new MenuItem({ label: '停止' });
	item_stop.enabled = false;
	var item_setting = new MenuItem({ label: '配置' });
	var item_log = new MenuItem({ label: '查看日志' });
	var item_quit = new MenuItem({ label: '退出' });
	item_quit.on('click',function(){
		CoreWindow.close(true);
	});
	item_start.on('click',function(){
		check();
		item_start.enabled = false;
		item_setting.enabled = false;
		item_stop.enabled = true;
	});
	item_stop.on('click',function(){
		clearTimeout(run_flag);
		clearTimeout(check_flag);
		running = false;
		item_setting.enabled = true;
		item_start.enabled = true;
		item_stop.enabled = false;
	});
	item_setting.on('click', function(){
		C.Page.aw_list();
	});
	menu.append(item_start);
	menu.append(item_stop);
	menu.append(item_setting);
	menu.append(item_log);
	menu.append(item_quit);

	var queue = [];//执行队列
	var running = false;
	var run_flag, check_flag;

	var TYPE_EVERYDAY = 1,
		TYPE_EVERYWEEK = 2,
		TYPE_EVERYMONTH = 3;
	var delay_check = 10*1000;

	var lasttime_check = new Date();
	// 检测要自动生成图片的产品，并放入队列
	function check(){
		console.log('check');
		var now = new Date();
		var tasks = ConfUser.getTasks();
		for(var i = 0, j = tasks.length; i<j; i++){
			var task = tasks[i];
			if(!task || !task.open){
				continue;
			}
			var crontab = task.crontab;
			var type = crontab.type;
			var extra = crontab.extra;
			if(type == TYPE_EVERYWEEK){
				if(7 - now.getDay() != extra){
					continue;
				}
			}else if(type == TYPE_EVERYMONTH){
				if(now.getDate() != extra){
					continue;
				}
			}
			var arr_time = crontab.time.split(':');
			var time_check = new Date(now.getTime());
			time_check.setHours(arr_time[0]);
			time_check.setMinutes(arr_time[1]);
			time_check.setSeconds(0);
			var cha = now - time_check;
			console.log(cha, cha >= 0 && cha <= delay_check, time_check, now);
			if(cha >= 0 && cha <= Math.max(delay_check, lasttime_check - now)){
				var products = task.p;
				for(var i = 0, j = products.length; i<j; i++){
					var pro = products[i];
					if(queue.indexOf(pro) == -1){
						queue.push(pro);
					}
				}
			}
		}
		run();
		lasttime_check = now;
		check_flag = setTimeout(check, delay_check);
	}
	window.check = check;
	win_index = Core.Page.main();
	win_index.once('inited', function(){
		win_index.show();

		tray.menu = menu;
	});
	// win_index.emit('debug')
	function run(){
		if(queue.length > 0 && !running){
			running = true;
			var item_exec = queue.shift();
			if(item_exec){
				win_index.emit(Core.Const.Event.PRODUCT_CHANGE, item_exec, function(err, data){
	        		if(err){
	        			console.log("error:"+err.msg);
	        		}else{
	        			console.log('takes:'+ data.time+'ms!save at:'+data.path);
	        		}
	        		running = false;
	        		run_flag = setTimeout(run, 500);
	        	});
			}else{
				running = false;
			}
		}
	}
});