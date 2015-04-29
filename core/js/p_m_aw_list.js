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
	var html = '';
	$.each(tasks, function(i, v){
		if(!v){
			html += '<tr>'+
						'<td>&nbsp;</td>'+
						'<td></td>'+
						'<td></td>'+
						'<td></td>'+
					'</tr>';
		}else{
			html += '<tr class="has" data-index='+i+'>'+
						'<td>&nbsp;</td>'+
						'<td></td>'+
						'<td></td>'+
						'<td></td>'+
					'</tr>';
		}
	});
	var $tasks = $('.tasks table');
	$tasks.append(html);

	CoreWindow.get().show();
	$('#btn_add').click(function(){
		var win_aw_edit = Page.aw_edit(function(){
			CoreWindow.sendMsg(ConstMsgTypeAW_EDIT, {
				
			}, win_aw_edit.window);
		});
	});
	$tasks.delegate('.has', 'dblclick', function(){
		var index = $(this).data('index');
		var win_aw_edit = Page.aw_edit(function(){
			CoreWindow.sendMsg(ConstMsgTypeAW_EDIT, {
				index: index
			}, win_aw_edit.window);
		});
	});
	$('#btn_save').click(function(){

	});
	$('#btn_cancel').click(function(){
		CoreWindow.close();
	});
});