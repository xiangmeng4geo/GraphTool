!function(){
	var is_admin = true;
	var CONF_NAME_SYS_PRODUCT_TREE = 'sys_product_tree';
	var nwCore = Core.require('core'),
		nwConf = nwCore.conf,
		Page = Core.Page;

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
		var tree_data = nwConf.get(CONF_NAME_SYS_PRODUCT_TREE);
		
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
				    "isexpand" : true,
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
				    "text" : '根目录',
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
			nwConf.write(CONF_NAME_SYS_PRODUCT_TREE,JSON.stringify(tree_data));
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
					if(data.is_modify){
						operate_item.name = d_name;
					}else{
						if(!operate_item.childNodes){
							operate_item.childNodes = [];
						}
						operate_item.childNodes.push(add_item);
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

	var $win = $(window);
	var $c_right = $('#c_right');
	var _init_size_TT;
	function _init_size(){
		clearTimeout(_init_size_TT);
		_init_size_TT = setTimeout(function(){
			$c_right.css({
				width: $win.width() - 300 + 10,
				height: $win.height() - $c_right.offset().top
			});
		}, 10);
	}
	_init_size();
	$win.on('resize', _init_size);
	Page.inited();
}();