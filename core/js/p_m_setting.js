Core.safe(function(){
	var $c_bottom_fieldset = $('#c_bottom > fieldset');
	var $c_top_li = $('#c_top li').click(function(){
		var $this = $(this);
		$c_top_li.removeClass('on');
		$this.addClass('on');
		$c_bottom_fieldset.removeClass('on');
		$c_bottom_fieldset.eq($this.index()).addClass('on');
	});

	var util = Core.Lib.util,
		file_util = util.file,
		path_util = util.path,
		file_path = file_util.path,
		icon_path = file_path.icon,
		image_path = file_path.image;

	function is_img(file_path){
		return /\.(jpg|bmp|gif|png)$/i.test(file_path)
	}
	/*初始化右键菜单*/
	var CoreWindow = Core.Window;
	var gui = CoreWindow.getGui(),
		Menu = gui.Menu,
		MenuItem = gui.MenuItem;
		
	var menu_tree = new Menu();
	var menu_add_files = new MenuItem({ label: '从文件导入' }),
		menu_add_dir = new MenuItem({ label: '从文件夹导入' }),
		menu_add_folder = new MenuItem({label: '新建资源库'}),
		menu_delete_folder = new MenuItem({label: '删除资源库'});
	function copyFiles(files){
		var item = menu_tree._treeitem;
		var toDir = item.path;
		var success_num = 0;
		$.each(files,function(i,v){
			if(is_img(v.name)){
				var from_path = v.path,
					to_path = path_util.join(toDir,v.name);
				if(from_path != to_path){
					if(file_util.copy(from_path,to_path)){
						item.files.push(to_path);
						success_num++;
					}					
				}
			}
		});
		if(success_num){
			alert('成功导入'+success_num+'个图片！');
		}else{
			alert('没有找到图片！');
		}
	}
	menu_add_files.on('click',function(){
		$('<input type="file" multiple accept=".jpg,.gif,.bmp,.png"/>').on('change',function(){
			var files = $(this)[0].files;
			copyFiles(files);
		}).click();
	});
	menu_add_dir.on('click',function(){
		$('<input type="file" multiple accept=".jpg,.gif,.bmp,.png" nwdirectory/>').on('change',function(){
			var from_dir = $(this).val();
			var item = menu_tree._treeitem;
			var toDir = item.path;
			var files = file_util.readdir(from_dir);
			var files_arr = [];
			$.each(files,function(i,v){
				var name = v.name;
				files_arr.push({
					name: path_util.basename(name),
					path: name
				})
			});
			copyFiles(files_arr);
		}).click();
	});
	menu_add_folder.on('click',function(){
		var name = prompt('请输入资源库名称！');
		if(name){
			var item = menu_tree._treeitem;
			var toDir = item.path;
			var flag = file_util.mkdir(path_util.join(toDir,name));
			alert('操作'+(flag?'成功':'失败')+'!');
		}
	});
	menu_delete_folder.on('click',function(){
		if(confirm('确定要删除资源库吗？')){
			var item = menu_tree._treeitem;
			var toDir = item.path;
			var flag = file_util.rm(toDir);
			alert('操作'+(flag?'成功':'失败')+'!');
		}
	});
	menu_tree.append(menu_add_files);
	menu_tree.append(menu_add_dir);
	menu_tree.append(new gui.MenuItem({ type: 'separator' }));
	menu_tree.append(menu_add_folder);
	menu_tree.append(menu_delete_folder);
	function init_tree(tree_id,list_id,dir){
		var files = file_util.readdir(dir);
		function createNode(data,prefix){
			if(prefix != undefined){
				prefix += '_';
			}else{
				prefix = '';
			}
			
			prefix != undefined|| (prefix = 'r');
			var arr_opt = [],
				arr_file = [];
			if(data && data.length > 0){
				$.each(data,function(i,v){
					var id = prefix+i;
					var is_dir = !!v.sub;
					if(is_dir){
						var opt = {
							"id" : id,
						    "text" : path_util.basename(v.name),
						    "showcheck" : true,
						    "complete" : true,
						    "isexpand" : true,
						    "checkstate" : 1,
						    path: v.name
						};
						var result = createNode(v.sub,id);
						var ChildNodes = result[0];
						if(ChildNodes.length > 0){
							opt.ChildNodes = ChildNodes;
							opt.hasChildren = true;
						}
						opt.files = result[1];
						arr_opt.push(opt);
					}else{
						arr_file.push(v);
					}
				});
			}

			return [arr_opt,arr_file];
		}
		var tree_opt = createNode(files)[0];
		var $list = $('#'+list_id);
		$list.click(function(e){
			var $target = $(e.target);
			if($target.is('li') || ($target = $target.closest('li')).length > 0){
				if($target.hasClass('on')){
					$target.removeClass('on');
				}else{
					$target.addClass('on');
				}
			}
		});
		function showFiles(files){
			var html = '';
			if(files.length > 0){
				$.each(files,function(i,v){
					var file_path = v.name,
						extname = path_util.extname(file_path);
					if(is_img(extname)){
						var name = path_util.basename(file_path).replace(extname,'');
						html += '<li><div><img src="'+file_path+'"/><span>'+name+'</span></div></li>';
					}
				});
			}else{
				html += '<li class="no_files">暂时无可以显示的文件</li>';
			}
			$list.html(html);
		}
		$('#'+tree_id).treeview({
			data: tree_opt,
			showcheck: false,
			cbiconpath: 'img/jquery.tree/',
			onnodeclick: function(item){
				showFiles(item.files);
			},
	        onnodecontextmenu: function(e,item){
	        	menu_tree._treeitem = item;
	        	menu_tree.popup(e.clientX, e.clientY);
	        },
	        onnodedblclick: function(e){
	        }   
	    });
	}
	init_tree('tree_icon','file_list_icon',icon_path);
	init_tree('tree_image','file_list_image',image_path);
});