Core.safe(function(){
	var C = Core;
	var CoreWindow = C.Window;
	var ConstMsgTypeAW_EDIT = C.Const.msgType.AW_EDIT;
	var Page = C.Page;
	var ConfUser = C.Lib.conf.User;
	var tasks = ConfUser.getTasks();
	tasks || (tasks = []);
	var len = tasks.length;
	var min_num = 9;
	if(len < min_num){
		var arr = new Array(min_num - len);
		arr.unshift(0);
		arr.unshift(len);
		tasks.splice.apply(tasks, arr);
	}
	var frequency_arr = {
		1: function(){return '每天'},
		2: function(extra){
			return '每周'+(['一', '二', '三', '四', '五', '六', '日'][extra]);
		},
		3: function(extra){
			return '每月'+ extra+'日'
		}
	}
	function getHtmlOfTask(task, is_no_tr){
		var crontab = task.crontab;
		var html_task = (is_no_tr?'':'<tr class="has">')+
							'<td>'+task.name+'</td>'+
							'<td>'+frequency_arr[crontab.type](crontab.extra)+crontab.time+'</td>'+
							'<td>'+task.p.join(',')+'</td>'+
							'<td>'+(task.open?'开启':'关闭')+'</td>'+
						(is_no_tr?'':'</tr>');
		var $html_task = $(html_task);
		if(!is_no_tr){
			$html_task.data('task', task);
		}			
		return $html_task;			
	}
	
	var html_no_task = '<tr>'+
						'<td>&nbsp;</td>'+
						'<td></td>'+
						'<td></td>'+
						'<td></td>'+
					'</tr>';
	var $tasks = $('.tasks table');
	$.each(tasks, function(i, v){
		if(!v){
			$tasks.append(html_no_task);
		}else{
			$tasks.append(getHtmlOfTask(v));
		}
	});

	var $current_task_item;
	CoreWindow.onMessage(function(e){
		var data = e.data;
		var type = data.type;
		if(type == ConstMsgTypeAW_EDIT){
			data = data.data;
			if(!$current_task_item){
				var $html = getHtmlOfTask(data);
				var $last_has = $tasks.find('.has').last();
				if($last_has.length > 0){
					$last_has.after($html);
				}else{
					$tasks.find('tr:first').after($html);
				}
				$tasks.find('tr:not(.has)').last().remove();
			}else{
				$current_task_item.data('task', data);
				$current_task_item.html(getHtmlOfTask(data, true));
			}
		}
	});
	CoreWindow.get().show();
	function showEdit(){
		var win_aw_edit = Page.aw_edit(function(){
			CoreWindow.sendMsg(ConstMsgTypeAW_EDIT, {
				index: $current_task_item? $tasks.find('.has').index($current_task_item): null
			}, win_aw_edit.window);
		});
	}
	$('#btn_add').click(function(){
		$current_task_item = null;
		showEdit();
	});
	$('#btn_delete').click(function(){
		if($task_selected){
			if(confirm('确定要删除？')){
				$task_selected.remove();
				$tasks.append(html_no_task);
			}
		}else{
			alert('请先选中要操作的对象！');
		}
	});
	$('#btn_modify').click(function(){
		if($task_selected){
			$task_selected.dblclick();
		}else{
			alert('请先选中要操作的对象！');
		}
	});
	var $task_selected;
	$tasks.delegate('.has', 'dblclick', function(){
		$current_task_item = $(this);
		showEdit();
	}).delegate('.has', 'click', function(){
		$task_selected = $(this);
		$task_selected.addClass('on').siblings().removeClass('on');
	});
	$('#btn_save').click(function(){
		var tasks = [];
		$tasks.find('.has').each(function(){
			tasks.push($(this).data('task'));
		});
		ConfUser.setTasks(JSON.stringify(tasks));
		$btn_cancel.click();
	});
	var $btn_cancel = $('#btn_cancel').click(function(){
		CoreWindow.close();
	});
});