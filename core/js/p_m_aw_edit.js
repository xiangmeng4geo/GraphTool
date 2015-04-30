Core.safe(function(){
	var C = Core;
	var CoreWindow = C.Window;
	var ConfUser = C.Lib.conf.User;
	var MsgTypeAW_EDIT = Core.Const.msgType.AW_EDIT;


	var $text_taskname = $('#text_taskname');
	var $task_type = $('[name=task_type]');

	var weeks = ['一', '二', '三', '四', '五', '六', '日'];
	var html = '';
	for(var i = 0, j = weeks.length; i<j; i++){
		html += '<option value="'+i+'">周'+weeks[i]+'</option>';
	}
	$('#select_week').html(html);

	var html = '';
	for(var i = 1; i<= 31; i++){
		html += '<option value="'+i+'">'+i+'</option>';
	}
	$('#select_day').html(html);
	var $cb_open = $('#cb_open');
	function reset(){
		var time = new Date();
		var hours = time.getHours();
		var minutes = time.getMinutes();
		if(hours < 10){
			hours = '0'+hours;
		}
		if(minutes < 10){
			minutes = '0'+minutes;
		}
		$('[type=time]').val(hours+':'+minutes);

		$text_taskname.val('');
		
	}
	reset();

	var $tree = $('#tree');
	CoreWindow.get().show();
	CoreWindow.onMessage(function(e){
		var data = e.data;
		var type = data.type;
		if(type == MsgTypeAW_EDIT){
			data = data.data;
			var index = data.index;
			
			var products = [];
			if(index != undefined){
				var tasks = ConfUser.getTasks();
				var task = tasks[index] || {};
				var crontab = task.crontab;
				if(crontab){
					var $task_type_check = $task_type.filter('[value='+crontab.type+']');
					$task_type_check.prop('checked', true);
					var $p = $task_type_check.parent();
					$p.find('select option[value='+crontab.extra+']').attr('selected', true);
					$p.find('[type=time]').val(crontab.time);
				}
				$text_taskname.val(task.name);
				$cb_open.prop('checked', task.open);
				products = task.p || [];
			}else{
				reset();
			}
			var Tree = (function(){
				var tree_data = ConfUser.getTree();
				
				function createNode(data, prefix){
					if(prefix != undefined){
						prefix += '_';
					}else{
						prefix = '';
					}
					var isexpand = prefix.split('_').length < 2;
					var arr = [];
					$.each(data, function(i,v){
						var id = prefix+i;
						var is_hasChildren = v.childNodes && v.childNodes.length > 0;
						var name = v.name;
						var opt = {
							"id" : id,
						    "text" : name,
						    value: name,
						    // "showcheck" : true,
						    "complete" : true,
						    "isexpand" : isexpand,
						    "checkstate" : 0,
						    "hasChildren" : is_hasChildren
						};
						if(is_hasChildren){
							opt.ChildNodes = createNode(v.childNodes,id);
						}else{
							opt.showcheck = true;
						}
						if(products.indexOf(name) > -1){
							opt.checkstate = 1;
						}
						arr.push(opt);
					});
					return arr;
				}
				var contextmenu_item;
				/*初始化树形菜单*/
				function initTree(){
					var root;
					if(tree_data){
						var tree_opt = createNode(tree_data);
					}
					root = tree_opt;
					
					$tree.treeview({
						data: root,
						showcheck: 1,
						cbiconpath: 'img/jquery.tree/',
				        // onnodeclick:function(item){
				        // 	alert(item.text+' '+item.value);
				        // },
				        onnodecontextmenu: function(e,item){
				        	contextmenu_item = item;
				        	if(is_admin){
				        		menu_manage_delete.enabled = !contextmenu_item.ChildNodes || contextmenu_item.ChildNodes.length == 0;
				        	}
				        	if(menu_tree.items.length > 0){
				        		menu_tree.popup(e.clientX, e.clientY);
				        	}
				        },
				        onnodedblclick: function(e,item){
				        	$doc.trigger(ConstEvent.PRODUCT_CHANGE, {
				        		name: item.text,
				        		callback: function(err, data){
				        			if(err){
				        				alert(err.msg);
				        			}
					        		// if(err){
					        		// 	alert("错误："+err.msg);
					        		// }else{
					        		// 	alert('用时:'+ data.time);
					        		// }
					        	}
				        	});
				        }   
				    });
				    // $doc.on(ConstEvent.GEOMAP_INITED,function(){
				    // 	// console.log('ConstEvent.GEOMAP_INITED');
				    // 	$tree.getFirstSubItem().dblclick();
				    // });
				}
				/*更新文件*/
				function updateProductTreeConf(){
					ConfUser.setTree(JSON.stringify(tree_data));
				}
				initTree();
			})();
		}
	});
	$('#btn_save').click(function(){
		var name = $text_taskname.val().trim();
		if(!name){
			return alert('请输入自动作业名称！');
		}
		var $cb_type = $task_type.filter(':checked');
		var task_type = $cb_type.val();
		if(!task_type){
			return alert('请选择作业的执行频率！');
		}
		var time = $cb_type.parent().find('[type=time]').val();
		if(!time){
			return alert('请输入正确的时间！');
		}
		var products = $tree.getCheckedNodes();
		if(products.length <= 0){
			return alert('请选择作业要操作的产品！');
		}

		var data = {
			name: name, 
			crontab: {
				type: task_type,
				time: time,
				extra: $cb_type.parent().find('select').val() || 0
			},
			p: products,
			open: $cb_open.prop('checked')
		}
		CoreWindow.sendMsg(MsgTypeAW_EDIT, data, opener);
		$btn_cancel.click();
	});
	var $btn_cancel = $('#btn_cancel').click(function(){
		CoreWindow.close();
	});
});