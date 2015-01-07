Core.safe(function(){
	var CoreWindow = Core.Window;
	var Const = Core.Const,
		ConstMsgType = Const.msgType,
		ConstEvent = Const.Event,
		ConstFileType = Const.fileRule.file_type;

	var ConfUser = Core.Lib.conf.User;	

	var gui = CoreWindow.getGui(),
		Menu = gui.Menu,
		MenuItem = gui.MenuItem;

	var util = Core.Lib.util,
		file_util = util.file,
		micaps_file_util = file_util.micaps,
		path_util = util.path,
		file_path = file_util.path,
		icon_path = file_path.icon,
		image_path = file_path.image;

	var conf_of_product; // 用于缓存已经加载的当前产品配置
	var data_of_micsps; // 用于缓存加载的micaps数据

	function _replace_date(text){
		if(!conf_of_product || !data_of_micsps){
			return text;
		}

		var file_rule = conf_of_product.in_out.file_rule,
			file_type = file_rule.file_type || ConstFileType.shikuang.v,
			file_hour = file_rule.file_hour || 0;

		var time = new Date(data_of_micsps.time);
			
		if(ConstFileType.forecast.v == file_type){
			var one = new Date(time.getTime());
			one.setHours(one.getHours()+file_hour);
			var two = new Date(one.getTime());
			two.setHours(two.getHours()+Math.min(24, file_hour));

			text = one.format(text);
			text = two.format(text);
			// text = two.format(text.replace(/y1/g,'yy').replace(/M1/g,'MM').replace(/d1/g,'dd').replace(/h1/g,'hh'));
		}else{
			text = time.format(text);
		}
		return text;
	}
	var $doc = $(document);
	var $current_text; // 用于操作当前编辑的文字对象
	var _cache_e_contextmenu; // 用于缓存contextmenu事件对象
	var is_img = Core.util.isImg;
	// 引入amd模块加载器	
	Core.Html.addScript('./js/libs/esl.js',false,function(){
		var fileLocation= '../../../git_project/GeoMap_projection/src/zrender'
		var developmod = true;
		if(developmod){
			require.config({
		        packages: [
		            {
		                name: 'zrender',
		                location: '../../../git_project/zrender-2.0.5/src/',
		                main: 'zrender'
		            }
		        ],
		        paths: {
		        	'GeoMap': 'js/libs/GeoMap'
		        }
		    });
		}else{
			require.config({
		        paths:{
		            'zrender': fileLocation,
		            'zrender/shape/Base': fileLocation,
		            'zrender/shape/BrokenLine': fileLocation,
		            'zrender/shape/Polygon': fileLocation,
		            'zrender/Group': fileLocation,
		            'zrender/tool/util': fileLocation,
		            'GeoMap': 'js/libs/GeoMap'
		        }
		    });
		}
		init(true);
	});
	
	var $geomap = $('#geomap');
	// var gm;
	var initing = false;
	var Loading = (function(){
		var $html;
		function show(callback){
			if(!$html){
				$html = $('<div class="loading"><div>正在处理。。。</div></div>').appendTo($geomap_container);
			}
			$html.show(callback);
		}
		function hide(){
			$html && $html.hide();
		}
		return {
			show: show,
			hide: hide
		}
	})();
	function init(is_show_mask){
		/*初始化onmessage监听器*/
		CoreWindow.onMessage(function(e){
			var data = e.data;
			var type = data.type;
			if(ConstMsgType.CONF_STYLE == type){
				data = data.data;
				var style = data.style,
					text = data.text;

				var styleObj = {};
				if(style){
					var styleArr = style.split(/;\s*/);
					$.each(styleArr,function(i,v){
						var arr = v.split(/:\s+/);
						if(arr[0]){
							styleObj[arr[0]] = arr[1];
						}
					});
				}
				if(!$current_text){
					$current_text = MapLayer.text({
						position: {
							left: _cache_e_contextmenu.offsetX,
							top: _cache_e_contextmenu.offsetY
						}
					}).appendTo($geomap_layer);
				}
				$current_text.css(styleObj).find('span').text(text);
				$current_text = null;
			}
		});
		initing = true;
		require(['GeoMap'],function(GeoMap){
			window.GeoMap = GeoMap;
			gm = new GeoMap({
				container: $geomap
			});
			// 根据配色方案进行地图元素初始化
			function render_conf(data, blendent){
				var isHaveManyBlendent = blendent.length > 1;
				function getColorByCondition(val, range){
					for(var i = 0,j=range.length;i<j;i++){
						var case_range = range[i];
						var val_range = case_range.val;
						if(val >= val_range[0] && val < val_range[1]){
							return case_range.color;
						}
					}
				}
				function getColor(code, val){
					if(isHaveManyBlendent){
						for(var i = 0,j = blendent.length;i<j;i++){
							var v = blendent[i];
							if(code == v.val.v){
								return getColorByCondition(val, v.colors);
							}
						}
					}else{
						return getColorByCondition(val, blendent[0].colors);
					}
				}
				$.each(data.areas,function(i,v){
					var point_arr = [];
					$.each(v.items,function(v_i,v_v){
						var point = new GeoMap.Point(v_v.x,v_v.y);
						point_arr.push(point);
					});
					var radom_color = Color[Math.floor(Math.random()*Color.length)];
					var strokeColor = 'rgba(0,0,0,0)';

					var symbols = v.symbols;
					var val_area = symbols? symbols.text : '';
					strokeColor = getColor(v.code, val_area);
					radom_color = strokeColor;
					if(v.code == 24){
						// strokeColor = 'red';
						radom_color = new GeoMap.Pattern.Streak({
							strokeStyle: strokeColor,
							space: 1
						});
					}
					var polygon = new GeoMap.Polygon(point_arr, {
						style: {
							strokeColor: strokeColor, 
							color: radom_color,
							lineWidth: 0.2
						}
					});
					gm.addOverlay(polygon);   //增加面
				});

				var line_symbols = data.line_symbols;
				if(line_symbols){
					$.each(line_symbols,function(i,v){
						if(v.code == 0){
							return;
						}
						var point_arr = [];
						$.each(v.items,function(v_i,v_v){
							var point = new GeoMap.Point(v_v.x, v_v.y);
							point_arr.push(point);
						});
						var polyline = new GeoMap.Polyline(point_arr,{
							style: {
								strokeColor : 'blue',
								lineWidth : 2,
							}
						});
						gm.addOverlay(polyline);   //增加折线
					});
				}
			}
			Loading.show();
			var Color = ['red','blue','#000','#123','#f26','#ccc','#333'];
			
			var china_json = '../../../git_project/GeoMap/json/china_mask.geo.json';
			china_json = '../shell/data/china_mask.geo.meractor.json';
			china_json = '../shell/data/china_province.meractor.json';
			china_json = '../../../git_project/GeoMap/json/china.geo.json';
			gm.loadGeo([china_json],{
				style: {
					// color: '#F5F3F0',
					maskColor: 'white'
				},
				is_show_mask: is_show_mask
			},function(points){
				// gm.addMask(points,{
				// 	is_lnglat: false
				// });
				function addTitle(conf_title, pos){
					if(conf_title && conf_title.is_show){
						var text = conf_title.text;
						if(text){
							MapLayer.text({
								position: pos,
								text: text,
								style: conf_title.style
							}).appendTo($geomap_layer);
						}
					}
				}
				$doc.on(ConstEvent.PRODUCT_CHANGE, function(e, product_name){
					if(product_name){
						$('.map_layer').remove();
						gm.clearLayers();
						conf_of_product = ConfUser.get(product_name);
						if(!conf_of_product){
							return alert('请对该产品进行配置！');
						}
						// console.log(conf_of_product);
						var conf_other = conf_of_product.other;
						var logo = conf_other.logo;
						if(logo){
							add_maplayer_img(logo, 20, 20);
						}
						var conf_title = conf_of_product.title;
						addTitle(conf_title.title_1, {
							left: 110,
							top: 20
						});
						addTitle(conf_title.title_2, {
							left: 110,
							top: 80
						});
						addTitle(conf_title.title_3, {
							left: 20,
							top: 700
						});

						var conf_in_out = conf_of_product.in_out;
						var dir_in = conf_in_out.dir_in;
						if( file_util.exists(dir_in) ){
							var param = [dir_in];
							var conf_file = conf_of_product.file;
							var conf_file_rule = conf_in_out.file_rule;
							if(conf_file_rule.type == "1"){
								var rule_common = conf_file_rule.common;
								param.push(rule_common.prefix+rule_common.date_format+rule_common.postfix+'.'+rule_common.file_suffix);
							}else{
								param.push(conf_file_rule.custom);
							}
							if(conf_file.is_newest){
								param.push(conf_file.newest_days);
							}else{
								param.push(conf_file.time_start);
								param.push(conf_file.time_end);
							}
							var file_newest = micaps_file_util.getNewest.apply(null,param);
							if(file_newest){
								data_of_micsps = file_util.readFile(file_newest,true);
								render_conf(data_of_micsps, conf_of_product.legend.blendent);
							}else{
								alert('没有找到符合条件的文件，请检查产品相关配置！');
							}
						}else{
							alert("请配置该产品的数据源路径！");
						}
						initing = false;

						Loading.hide();				
					}
				});

				$doc.trigger(ConstEvent.GEOMAP_INITED);
			});
		});
	}
	
	// 地图添加的图层类
	var MapLayer = (function(){
		// 定义文字和图片的右键菜单	
		var menu_layer = new Menu();
		var menu_layer_delete = new MenuItem({label: '删除'});
		menu_layer_delete.on('click',function(){
			var $layer = menu_layer._layer;
			if($layer){
				$layer.remove();
			}
		});
		menu_layer.append(menu_layer_delete);
		// 文字图层
		function TextLayer(option){
			var pos = option.position;
			var ondblclick = option.ondblclick;
			var $html = $('<div class="texteditor map_layer">');
			var style = option.style;
			if(style){
				$html.attr('style',style);
			}

			$html.html('<span>'+(option.text||'')+'</span>')
				.css(pos)
				.addClass('off')
				.resizable()
				.draggable()
				.css('position','absolute')
				.on('mouseenter',function(){
					$(this).removeClass('off');
				}).on('mouseleave',function(){
					$(this).addClass('off');
				}).on('dblclick',function(){
					var $this = $(this);
					var text = $this.text(),
						style = $this.attr('style');

					var win_textstyle = Core.Page.textStyle(function(e){
						CoreWindow.sendMsg(ConstMsgType.CONF_STYLE,{
							text: text,
							style: style
						},win_textstyle.window);
					});
					$current_text = $this;
					ondblclick && ondblclick.call(this);
				}).on('contextmenu',function(e){
					e.stopPropagation();
					menu_layer._layer = $(this);
					menu_layer.popup(e.clientX, e.clientY);
				});
			
			return $html;
		}
		// 图片图层
		function ImageLayer(option,callback){
			var pos = option.position;
			var src = option.src;
			var img = new Image();
			img.onload = function(){
				var width = this.width,
					height = this.height;
				var $html = $('<div class="map_layer map_layer_image off"><img src="'+option.src+'"></div>')
					.css(pos)
					.css({
						width: 80,
						height: 80*height/width
					})
					.resizable()
					.draggable()
					.css('position','absolute');
				$html.on('mouseenter',function(){
					$(this).removeClass('off');
				}).on('mouseleave',function(){
					$(this).addClass('off');
				}).on('contextmenu',function(e){
					e.stopPropagation();
					menu_layer._layer = $(this);
					menu_layer.popup(e.clientX, e.clientY);
				});
				callback($html);
			}
			img.src = src;
		}
		return {
			text: TextLayer,
			img: ImageLayer
		}
	})();
	
	var $geomap_layer = $('#geomap_layer');
	/*右侧地图的右键功能*/
	var $geomap_container = $('#geomap_container');
	$geomap_layer.on('contextmenu',function(e_contextmenu){
		_cache_e_contextmenu = e_contextmenu; // 暂存事件对象
		var $this = $(this);
		var menu_map = $this.data('menu');
		if(!menu_map){
			menu_map = new Menu();
			var menu_add_text = new MenuItem({label: '添加文字'});
			menu_add_text.on('click',function(e){
				var win_textstyle = Core.Page.textStyle(function(e){
					CoreWindow.sendMsg(ConstMsgType.CONF_STYLE,{},win_textstyle.window);
				});
			});
			
			var menu_add_img_external = new MenuItem({label: '添加外部图片'});
			menu_add_img_external.on('click',function(){
				$('<input type="file" nwworkingdir="./image" />').on('change',function(){
					add_maplayer_img($(this).val(), $geomap_layer.width()/2, $geomap_layer.height()/2);
				}).click();
			});
			var menu_add_img_entrepot = new MenuItem({label: '添加图片库图片'});

			/*显示图标库文件*/
			var show_entrepot_images = (function(){
				var $tool_image,$tool_image_main;
				var isReload = false;
				var files_loaded;
				$('#btn_setting').click(function(){
					isReload = true;
				});
				function showFiles($container,files){
					var html = '';
					$.each(files,function(i,v){
						var name = path_util.basename(v);
						if(is_img(name)){
							name = name.replace(path_util.extname(v),'');
							html += '<li><img src="'+v+'" draggable="true"/><span>'+name+'</span></li>';
						}
					});
					$container.html(html);
				}
				/*当重新配置图片库时要重新加载*/
				function reloadFiles(){
					if(!files_loaded || isReload){
						var cache_file = {};
						files_loaded = file_util.readdir(icon_path);
						if(!$tool_image){
							$tool_image = $('<div class="tool_image"><div class="btn_close_tool_image"></div><div class="tool_image_main"></div></div>').appendTo('#c_left');
							$tool_image.delegate('select','change',function(){
								showFiles($tool_image.find('ul'),cache_file[$(this).val()]);
							});
							$tool_image.delegate('.btn_close_tool_image','click',function(){
								$tool_image.slideUp();
							});
							$tool_image_main = $tool_image.find('.tool_image_main');
						}
						var html_select = '<select>';
						function createOption(val,tab,index){
							var html = '';
							var is_dir = !!val.sub;
							if(is_dir){
								var html_tab = '';
								for(var i = 0;i<tab;i++){
									html_tab += '　　';
								}
								if(html_tab){
									html_tab += '|--';
								}
								
								var key = tab+'_'+index;
								var path_val = val.name;
								var name = path_util.basename(path_val);
								var html_sub = '';
								var files = [];
								$.each(val.sub,function(i_sub,v_sub){
									if(!v_sub.sub){
										files.push(v_sub.name);
									}
									html_sub += createOption(v_sub,1+tab,i_sub);
								});
								cache_file[key] = files;
								html += '<option value="'+key+'">'+html_tab+name+'</option>';
								html += html_sub;
							}
							return html;
						}
						$.each(files_loaded,function(i,v){
							html_select += createOption(v,0,i);
						});
						html_select += '</select>';
						$tool_image_main.children().remove();
						$tool_image_main.html(html_select+'<ul class="clear"></ul>');
						showFiles($tool_image_main.find('ul'),cache_file[$tool_image_main.find('select').val()]);
					}
				}
				return function(){
					reloadFiles();
					$tool_image.slideDown();
				}
			})();
			menu_add_img_entrepot.on('click',function(){
				show_entrepot_images();
			});

			var menu_save_img = new MenuItem({ label: '导出图片' });
			menu_save_img.on('click',function(){
				if(gm){
					$('<input type="file" nwsaveas="a.png" />').on('change',function(){
						var save_file_name = $(this).val();
						Loading.show(function(){
							var img_data = gm.toDataURL();

							var $div_container = $('<div style="position: absolute; left: -999px;top: 0;width: '+$geomap.width()+'px; height: '+$geomap.height()+'px"></div>').appendTo($('body'));
							
							var gm_export = new GeoMap({
								container: $div_container
							});
							gm_export.addOverlay(new GeoMap.Image(img_data));

							var imgnum_waiting_draw = 0;
							var tt_draw;
							$geomap_layer.find('>div').each(function(i,v){
								var $layer = $(this);
								var layer;
								if($layer.is('.texteditor')){
									gm_export.addOverlay(new GeoMap.Text(_replace_date($layer.text()),$layer.attr('style')));
								}else if($layer.is('.map_layer_image')){
									var pos = $layer.position();
									var img = $layer.find('img').get(0);
									gm_export.addOverlay(new GeoMap.Image(img, pos.left, pos.top, $layer.width(), $layer.height()));
								}
							});
							img_data = gm_export.toDataURL();
							img_data = img_data.substring(img_data.indexOf('base64,')+7);
							img_data = new Buffer(img_data, 'base64');
							util.writeFile(save_file_name, img_data);
							$div_container.remove();
							alert('成功导出图片!');
							Loading.hide();
						});
					}).click();
				}
			});

			menu_map.append(menu_add_text);
			menu_map.append(new gui.MenuItem({ type: 'separator' }));
			menu_map.append(menu_add_img_external);
			menu_map.append(menu_add_img_entrepot);
			menu_map.append(new gui.MenuItem({ type: 'separator' }));
			menu_map.append(menu_save_img);

			$this.data('menu',menu_map);
		}
		menu_map.popup(e_contextmenu.clientX, e_contextmenu.clientY);
	})
	
	// 向地图添加图片
	function add_maplayer_img(src, x, y, i){
		var dis = 10*(i||0);
		MapLayer.img({
			position: {
				left: x + dis,
				top: y + dis
			},
			src: src
		},function($html){
			$geomap_layer.append($html);
		});
	}

	$geomap_layer.on('dragover',function(e){
		e.preventDefault();
	}).on('dragenter',function(e){
		e.preventDefault();
	}).on('drop', function(e){
		e.preventDefault();
		e.stopPropagation();
		e = e.originalEvent;
		var dataTransfer = e.dataTransfer;
		var drag_img = dataTransfer.getData('Text');
		var x = e.offsetX,y = e.offsetY;
		if(drag_img && is_img(drag_img)){
			add_maplayer_img(drag_img, x, y);
		}else{
			var files = dataTransfer.files;
			if(files.length > 0){
				$.each(files,function(i,file){
					add_maplayer_img(file.path, x, y, i);
				})
			}
		}
		return false;
	});
});