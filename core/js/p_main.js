!function(){
	var is_admin = true;
	var nwCore = Core.require('core'),
		nwConf = nwCore.conf,
		Page = Core.Page;

	var ConfUser = Core.Lib.conf.User;
		
	var CoreWindow = Core.Window;
	var Const = Core.Const,
		ConstMsgType = Const.msgType,
		ConstEvent = Const.Event;

	var $doc = $(document);
	$('#btn_quite').click(function(){
		Page.logout();
	});
	$('#btn_setting').click(Page.setting);

	var Tree = (function(){
		var tree_data = ConfUser.getTree();
		
		function createNode(data,prefix){
			if(prefix != undefined){
				prefix += '_';
			}else{
				prefix = '';
			}
			prefix != undefined|| (prefix = 'r');
			var arr = [];
			$.each(data,function(i,v){
				var id = prefix+i;
				var is_hasChildren = v.childNodes && v.childNodes.length > 0;
				var opt = {
					"id" : id,
				    "text" : v.name,
				    "showcheck" : false,
				    "complete" : true,
				    "isexpand" : false,
				    "checkstate" : 0,
				    "hasChildren" : is_hasChildren
				};
				if(is_hasChildren){
					opt.ChildNodes = createNode(v.childNodes,id);
				}
				arr.push(opt);
			});
			return arr;
		}
		var contextmenu_item;
		var $tree = $('#tree');
		/*初始化树形菜单*/
		function initTree(){
			var root;
			if(tree_data){
				var tree_opt = createNode(tree_data);
			}
			if(is_admin){
				root = {
					"id" : 'root',
				    "text" : '产品列表',
				    "showcheck" : false,
				    "complete" : true,
				    "isexpand" : true,
				    "checkstate" : 0,
				    "hasChildren" : !!tree_opt
				};
				if(tree_opt){
					root.ChildNodes = tree_opt;
				}
				root = [root];
			}else{
				root = tree_opt;
			}
			
			$tree.treeview({
				data: root,
				showcheck: false,
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
		        	$doc.trigger(ConstEvent.PRODUCT_CHANGE,item.text);
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
		
		/*得到当前节点对应的数据*/
		function getCurrentItem(){
			if(tree_data){
				var arr_ids = contextmenu_item.id.split('_');
				var operate_item;
				$.each(arr_ids,function(i,v){
					if(i == 0){
						operate_item = tree_data[v];
					}else{
						operate_item = operate_item.childNodes[v];
					}
				});
				return operate_item;
			}
		}
		/*删除当前节点*/
		function deleteCurrentItem(){
			if(confirm('确定要删除"'+contextmenu_item.text+'"吗？')){
				var arr_ids = contextmenu_item.id.split('_');
				var operate_item;
				var len = arr_ids.length;
				var str = '';
				for(var i = 0;i<len;i++){
					if(i != 0){
						str += '["childNodes"]'
					}
					if(i == len - 1){
						str += '.splice('+arr_ids[i]+',1)';
					}else{
						str += '['+arr_ids[i]+']';
					}
				}
				new Function('this'+str).call(tree_data);
				initTree();
				updateProductTreeConf();
			}
		}
		function _is_in_tree(name, tree){
			if(tree){
				if(tree.name == name){
					return true;
				}else{
					var c = tree.childNodes;
					if(c){
						for(var i = 0, j = c.length; i < j; i++){
							var t = c[i];
							return _is_in_tree(name, t);
						}
					}
				}
			}
		}
		function _is_in_tree(name, tree){
			if(tree){
				for(var i = 0, j = tree.length; i < j; i++){
					var node = tree[i];
					// alert('name = '+name+', node.name = '+ node.name);
					if(name == node.name){
						return true;
					}else{
						var c = node.childNodes;
						if(c && _is_in_tree(name, c)){
							return true;
						}
					}
				}
			}
		}
		function _is_exists(pro_name){
			if(_is_in_tree(pro_name, tree_data)){
				return true;
			}
		}
		/*和其它窗体进行通信*/
		CoreWindow.onMessage(function(e){
			var data = e.data;
			var type = data.type;
			if(ConstMsgType.ADD_PRODUCT == type){
				data = data.data;
				var d_type = data.type,
					d_name = data.name;
				
				var operate_item = getCurrentItem();
				var add_item = {
					name: d_name
				};
				if(operate_item){
					if(_is_exists(d_name)){//Core.Lib.util.file.exists(ConfUser.getPath(d_name))
						alert('名称为“'+d_name+'”的产品已经存在，添加会把以前配置文件覆盖,系统将放弃本次操作！');
					}else{
						if(data.is_modify){
							if(!operate_item.childNodes){
								ConfUser.rename(operate_item.name, d_name); //重命名配置文件
							}
							operate_item.name = d_name;
						}else{
							if(!operate_item.childNodes){
								operate_item.childNodes = [];
							}
							operate_item.childNodes.push(add_item);
						}
					}
				}else{
					if(!tree_data){
						tree_data = [];
					}
					tree_data.push(add_item);
				}
				
				data_tree = createNode(tree_data);
				initTree();
				updateProductTreeConf();
			}
		});
		/*初始化右键菜单*/
		var gui = CoreWindow.getGui(),
			Menu = gui.Menu,
			MenuItem = gui.MenuItem;
		$('title').text(gui.App.manifest.description);
		var menu_tree = new Menu();
		if(is_admin){
			var menu_manage = new Menu();
			var menu_manage_update = new MenuItem({ label: '修改' });
			var menu_manage_add = new MenuItem({ label: '添加' });
			var menu_manage_delete = new MenuItem({ label: '删除' });

			menu_manage_update.on('click', function(){
				var win_addproduct = Page.addProduct(function(){
					CoreWindow.sendMsg(ConstMsgType.ADD_PRODUCT, {
						name: contextmenu_item.text 
					}, win_addproduct.window);
				});
			});
			menu_manage_add.on('click',Page.addProduct);
			menu_manage_delete.on('click',deleteCurrentItem);

			menu_manage.append(menu_manage_add);
			menu_manage.append(menu_manage_update);
			menu_manage.append(menu_manage_delete);
			menu_tree.append(new MenuItem({ label: '管理', submenu: menu_manage }));
			menu_tree.append(new MenuItem({ type: 'separator' }));
		}

		var $geomap = $('#geomap');
		var menu_conf = new MenuItem({ label: '产品配置' });
		menu_conf.on('click',function(){
			var win_confproduct = Page.confProduct(function(){
				CoreWindow.sendMsg(ConstMsgType.CONF_PRODUCT, {
					name: contextmenu_item.text,
					width: $geomap.width(),
					height: $geomap.height()
				}, win_confproduct.window);
			});
		});
		menu_tree.append(menu_conf);
	})();

	var $slide_down = $('#slide_down'),
		$btn_slide = $('#btn_slide');
	var flag_is_over = false;
	$slide_down.on('mouseenter', function(){
		flag_is_over = true;
	}).on('mouseleave', function(){
		flag_is_over = false;
	});
	var tt;
	$('.user_info').on('mouseenter', function(){
		// flag_is_over = true;
		$slide_down.stop().slideDown();
		$btn_slide.addClass('open');
	}).on('mouseleave', function(){
		clearTimeout(tt);
		tt = setTimeout(function(){
			if(!flag_is_over){
				$slide_down.stop().slideUp();
				$btn_slide.removeClass('open');
			}
		}, 50);
	});
	var height_top_container = $('.top_container').height();
	var $win = $(window);
	var $c_right = $('#c_right'),
		$work_container = $('#work_container');
	var _init_size_TT;
	function _init_size(){
		clearTimeout(_init_size_TT);
		_init_size_TT = setTimeout(function(){
			var height_c_right = $win.height() - height_top_container;
			$c_right.css({
				width: $win.width()+ 10,
				height: height_c_right
			});
			$work_container.css({
				height: height_c_right - $('#c_top').height() - 2
			});
			$win.trigger('resized');
		}, 10);
	}
	_init_size();
	$win.on('resize', _init_size);
	!function(){
		// 设置半小时提醒一次
		var space_notice = 1000*60*30;
		var last_time = 0;
		$doc.on('no_v', function(e, listence){
			if(listence){
				var now = new Date();
				if(now - last_time > space_notice){
					last_time = now;
					alert('您的软件已经到期，为保证您的使用请联系管理员！');
				}
			}
		});
	}();
	$('#btn_listence').click(Page.listence);
	$('#btn_about').click(Page.about);
	$('#btn_doc').click(Page.doc);
	Page.inited();
}();