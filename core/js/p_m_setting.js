Core.safe(function(){
	var CONF_PRODUCTNAME = "系统";
	var util = Core.Lib.util,
		Conf_User = Core.Lib.conf.User,
		file_util = util.file,
		path_util = util.path,
		file_path = file_util.path,
		icon_path = file_path.icon,
		image_path = file_path.image;
	var CoreWindow = Core.Window;
	var _const = Core.Const,
		const_map = _const.map,
		const_map_zones = const_map && const_map.zones || [],
		const_projector = _const.projector,
		const_template = _const.template;

	function selected_option($select, val){
		$select.find('option').each(function(i,v){
			var $this = $(this);
			if($this.val() == val){
				$this.attr('selected','selected');
			}
		});
	}
	var $c_bottom_fieldset = $('#c_bottom > fieldset');
	var $c_top_li = $('#c_top li').click(function(){
		var $this = $(this);
		$c_top_li.removeClass('on');
		$this.addClass('on');
		$c_bottom_fieldset.removeClass('on');
		$c_bottom_fieldset.eq($this.index()).addClass('on');
	});
	$('.file_dir').click(function(){
		$(this).parent().prev().click();
	});
	$('.file_dir_nw').on('change',function(){
		var $this = $(this);
		$this.next().find('.text_file_dir').val($this.val());
	});
	$('.logos .file_dir_nw').attr('nwworkingdir', file_util.path.icon); // 指定默认目录

	
	var $text_file_southsea_logo = $('#text_file_southsea_logo'),
		$text_file_company_logo = $('#text_file_company_logo'),
		$checkbox_show_southsea = $('#checkbox_show_southsea'),
		$checkbox_show_logo = $('#checkbox_show_logo'),
		$select_map_projector = $('#select_map_projector'),
		$tb_template = $('#tb_template'),
		$cb_map_river = $('#cb_map_river'),
		$cb_map_railway = $('#cb_map_railway'),
		$cb_map_cname = $('#cb_map_cname'),
		$color_map_cname = $('#color_map_cname'),
		$color_map_river = $('#color_map_river'),
		$select_map_zone = $('#select_map_zone');

	var html_zone = '';
	$.each(const_map_zones, function(i, zone){
		var name = zone.name;
		html_zone += '<option value="'+name+'">'+name+'</option>';
	});
	$select_map_zone.append(html_zone);

	var conf_sys = Conf_User.getSys();
	var projector_user = '';
	var arr_template = [];
	if(conf_sys){
		var logos = conf_sys.logos;
		if(logos){
			var logo_southsea = logos.southsea;
			if(logo_southsea){
				$checkbox_show_southsea.prop('checked', logo_southsea.flag);
				$text_file_southsea_logo.val(logo_southsea.p);
			}
			var logo_company = logos.company;
			if(logo_company){
				$checkbox_show_logo.prop('checked', logo_company.flag);
				$text_file_company_logo.val(logo_company.p);
			}
		}
		var templates = conf_sys.templates || [];
		arr_template = arr_template.concat(templates);

		var conf_map = conf_sys.map;
		if(conf_map){
			projector_user = conf_map.projector;
			var conf_map_layers = conf_map.layers;
			if(conf_map_layers){
				var conf_river = conf_map_layers.river;
				if(conf_river){
					$cb_map_river.prop('checked', conf_river.flag);
					$color_map_river.val(conf_river.color);
				}
				var conf_railway = conf_map_layers.railway;
				if(conf_railway){
					$cb_map_railway.prop('checked', conf_railway.flag);
				}
				var conf_cname = conf_map_layers.cname;
				if(conf_cname){
					$cb_map_cname.prop('checked', conf_cname.flag);
					$color_map_cname.val(conf_cname.color);
				}
			}
			var conf_map_zone = conf_map.zone;
			if(conf_map_zone){
				selected_option($select_map_zone, conf_map_zone);
			}
		}
	}
	var html_map_projector = '';
	$.each(const_projector, function(i, v){
		var val = v.v;
		html_map_projector += '<option value="'+val+'" '+(val == projector_user? 'selected': '')+'>'+v.n+'</option>';
	});
	$select_map_projector.html(html_map_projector);

	var html_template = '';
	$.each(arr_template, function(i, v){
		html_template += '<tr>'+
							'<td class="fn_contextmenu">'+(v._isSys?'&nbsp;': '<input type="checkbox" '+(v.flag?'checked':'')+' class="t_f"/>')+'</td>'+
							'<td contentEditable="true" class="t_n">'+v.n+'</td>'+
							'<td><input type="number" value="'+v.t[0]+'" class="t_t_0"/>X<input type="number" value="'+v.t[1]+'" class="t_t_1"/></td>'+
						   '</tr>';
	});
	$tb_template.append(html_template);

	$('#btn_cancel').click(CoreWindow.close);
	$('#btn_save').click(function(){
		var templates = [];
		$tb_template.find('tr').slice(2).each(function(i, v){
			var $this = $(this);
			templates.push({
				n: $this.find('.t_n').text(),
				t: [parseInt($this.find('.t_t_0').val()) || 0, parseInt($this.find('.t_t_1').val()) || 0],
				flag: $this.find('.t_f').prop('checked')
			});
		});
		var save_data = {
			logos: {
				southsea: {
					flag: $checkbox_show_southsea.prop('checked'),
					p: $text_file_southsea_logo.val()
				},
				company: {
					flag: $checkbox_show_logo.prop('checked'),
					p: $text_file_company_logo.val()
				}
			},
			templates: templates,
			map: {
				projector: $select_map_projector.val(),
				layers: {
					river: {
						flag: $cb_map_river.prop('checked'),
						color: $color_map_river.val()
					},
					railway: {
						flag: $cb_map_railway.prop('checked')
					},
					cname: {
						flag: $cb_map_cname.prop('checked'),
						color: $color_map_cname.val()
					}
				},
				zone: $select_map_zone.val() || ''
			}
		};
		Conf_User.write(CONF_PRODUCTNAME,save_data,true);
		CoreWindow.close();
	});


	var is_img = Core.util.isImg;
	/*初始化右键菜单*/
	var CoreWindow = Core.Window;
	var gui = CoreWindow.getGui(),
		Menu = gui.Menu,
		MenuItem = gui.MenuItem;

	var _contextmenu = (function(){
		var $_target;
		var menu = new Menu();
		var menu_add_above = new MenuItem({label: '在上方添加'});
		var menu_add_below = new MenuItem({label: '在下方添加'});
		var menu_delete = new MenuItem({label: '删除'});

		function _addCheckbox($box){
			if($box.find('td:first input').length == 0){
				$box.find('td:first').append('<input type="checkbox" class="t_f" checked/>');
			}
			return $box;
		}
		menu_add_above.on('click', function(){
			var $p = $_target.parent();
			_addCheckbox($p.clone()).hide().insertBefore($p).fadeIn();
		});
		menu_add_below.on('click', function(){
			var $p = $_target.parent();
			_addCheckbox($p.clone()).hide().insertAfter($p).fadeIn();
		});
		menu_delete.on('click', function(){
			if(confirm('确定要删除这一项吗？')){
				$_target.parent().fadeOut(function(){
					$(this).remove();
				});
			}
		});
		menu.append(menu_add_above);
		menu.append(menu_add_below);
		menu.append(menu_delete);
		return function(e){
			$_target = $(e.target);
			var enabled = $_target.find('input').length > 0;
			menu_add_above.enabled = enabled;
			menu_delete.enabled = enabled;
			menu.popup(e.clientX, e.clientY);
		}
	})();
	$('.template').delegate('.fn_contextmenu', 'contextmenu', _contextmenu);
		
	var menu_tree = new Menu();
	var menu_add_files = new MenuItem({ label: '从文件导入' }),
		menu_add_dir = new MenuItem({ label: '从文件夹导入' }),
		menu_add_folder = new MenuItem({label: '新建资源库'}),
		menu_delete_folder = new MenuItem({label: '删除资源库'});
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
			if(flag){
				$(menu_tree._contextmenu_e.target).closest('.bbit-tree').addNode({
				    "text" : name,
				    "showcheck" : true,
				    "complete" : true,
				    "isexpand" : true,
				    "checkstate" : 1,
				    path: path_util.join(toDir,name),
				    files: []
				});
			}
		}
	});
	menu_delete_folder.on('click',function(){
		if(confirm('确定要删除资源库吗？')){
			var item = menu_tree._treeitem;
			var toDir = item.path;
			var flag = file_util.rm(toDir);
			alert('操作'+(flag?'成功':'失败')+'!');
			if(flag){
				$(menu_tree._contextmenu_e.target).closest('.bbit-tree').rmNode(item.id);
			}
		}
	});
	menu_tree.append(menu_add_files);
	menu_tree.append(menu_add_dir);
	menu_tree.append(new gui.MenuItem({ type: 'separator' }));
	menu_tree.append(menu_add_folder);
	menu_tree.append(menu_delete_folder);

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
		refreshFiles();
		if(success_num){
			alert('成功导入'+success_num+'个图片！');
		}else{
			alert('没有找到图片！');
		}
	}
	/*刷新右侧文件列表*/
	function refreshFiles(){
		var item = menu_tree._treeitem;
		var toDir = item.path;
		var files = file_util.readdir(toDir);
		item.files = files;
		showFiles($('fieldset.on .tree_right ul'), files);
	}
	/*显示文件列表*/
	function showFiles($container,files){
		var html = '';
		if(files && files.length > 0){
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
		$container.html(html);
	}
	/*初始化树形菜单*/
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
						    "complete" : false,
						    "isexpand" : true,
						    "checkstate" : 0,
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
		
		$('#'+tree_id).treeview({
			data: tree_opt,
			showcheck: false,
			cbiconpath: 'img/jquery.tree/',
			onnodeclick: function(item){
				showFiles($list, item.files);
			},
	        onnodecontextmenu: function(e,item){
	        	menu_tree._treeitem = item;
	        	menu_tree._contextmenu_e = e;
	        	menu_tree.popup(e.clientX, e.clientY);
	        },
	        onnodedblclick: function(e){
	        }   
	    });
	}
	init_tree('tree_icon','file_list_icon',icon_path);
	// init_tree('tree_image','file_list_image',image_path);
});