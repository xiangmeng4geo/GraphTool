Core.safe(function(){
	var CoreWindow = Core.Window;
	var msgType = Core.Const.msgType;
	var gui = CoreWindow.getGui(),
		Menu = gui.Menu,
		MenuItem = gui.MenuItem;

	var util = Core.Lib.util,
		file_util = util.file,
		path_util = util.path,
		file_path = file_util.path,
		icon_path = file_path.icon,
		image_path = file_path.image;

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
	function init(is_show_mask){
		initing = true;
		require(['GeoMap'],function(GeoMap){
			window.GeoMap = GeoMap;
			gm = new GeoMap({
				container: $geomap
			});
			var Color = ['red','blue','#000','#123','#f26','#ccc','#333'];
			
			var china_json = '../../../git_project/GeoMap/json/china_mask.geo.json';
			china_json = '../shell/data/china_mask.geo.meractor.json';
			// china_json = '../shell/data/china_province.meractor.json';
			// china_json = '../../../git_project/GeoMap/json/china.geo.json';
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
				var data_url = 'http://10.14.85.116/nodejs_project/micaps/data/micaps/14/rr111314.024.json';
				$.getJSON(data_url,function(data){
					$.each(data.areas,function(i,v){
						var point_arr = [];
						$.each(v.items,function(v_i,v_v){
							var point = new GeoMap.Point(v_v.x,v_v.y);
							point_arr.push(point);
						});
						var radom_color = Color[Math.floor(Math.random()*Color.length)];
						var strokeColor = 'rgba(0,0,0,0)';
						if(v.code == 24){
							strokeColor = 'red';
							radom_color = new GeoMap.Pattern.Streak({
								strokeStyle: strokeColor,
								space: 2
							});

						}
						var polygon = new GeoMap.Polygon(point_arr, {
							style: {
								strokeColor: strokeColor, 
								color: radom_color,
								fillOpacity: 0.9, 
								strokeWeight: 1, 
								strokeOpacity:1
							},
							zlevel: 1
						});
						gm.addOverlay(polygon,GeoMap.GROUP.SHAPE);   //增加面
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
								},
								zlevel: 1
							});
							gm.addOverlay(polyline,GeoMap.GROUP.SHAPE);   //增加折线
						});
					}

					initing = false;
				});
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
				var id = $layer.attr('id');
				MapLayer.clearCache(id);
				$layer.remove();
			}
		});
		menu_layer.append(menu_layer_delete);
		function TextLayer(option){
			var pos = option.position;
			var ondblclick = option.ondblclick;
			return $('<div class="texteditor">')
				.html('<span></span>')
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
						CoreWindow.sendMsg(msgType.CONF_STYLE,{
							text: text,
							style: style
						},win_textstyle.window);
					});
					ondblclick && ondblclick.call(this);
				}).on('contextmenu',function(e){
					e.stopPropagation();
					menu_layer._layer = $(this);
					menu_layer.popup(e.clientX, e.clientY);
				});
		}
		function ImageLayer(option,callback){
			var pos = option.position;
			var src = option.src;
			var img = new Image();
			img.onload = function(){
				var width = this.width,
					height = this.height;
				var $html = $('<div class="map_layer_image off"  id="'+id+'"><img src="'+option.src+'"></div>')
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
	$('#geomap_container').on('contextmenu',function(e_contextmenu){
		var $this = $(this);
		var menu_map = $this.data('menu');
		if(!menu_map){
			var $current_text,contextmenu_postion;
			CoreWindow.onMessage(function(e){
				var data = e.data;
				var type = data.type;
				if(msgType.CONF_STYLE == type){
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
								left: e_contextmenu.offsetX,
								top: e_contextmenu.offsetY
							},
							ondblclick: function(){
								$current_text = $(this);
							}
						}).appendTo($geomap_layer);
					}
					$current_text.css(styleObj).find('span').text(text);
					$current_text = null;
				}
			});
			menu_map = new Menu();
			var menu_add_text = new MenuItem({label: '添加文字'});
			menu_add_text.on('click',function(e){
				var win_textstyle = Core.Page.textStyle(function(e){
					CoreWindow.sendMsg(msgType.CONF_STYLE,{},win_textstyle.window);
				});
			});
			var middle_pos_e = {
				offsetX: $geomap_layer.width()/2,
				offsetY: $geomap_layer.height()/2
			};
			var menu_add_img_external = new MenuItem({label: '添加外部图片'});
			menu_add_img_external.on('click',function(){
				$('<input type="file" nwworkingdir="./image" />').on('change',function(){
					add_maplayer_img(middle_pos_e,$(this).val());
				}).click();
			});
			var menu_add_img_entrepot = new MenuItem({label: '添加图片库图片'});

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
					// $container.find('img').on('dragstart',function(e){
					// 	e.preventDefault();
					// 	e.stopPropagation();
					// 	var src = $(this).attr('src');
					// 	$geomap_layer.data('drag_img',src);
					// 	console.log($geomap_layer.data('drag_img'));
					// 	// var dataTransfer = e.originalEvent.dataTransfer;
					// 	// dataTransfer.setDragImage($(this).get(0),0,0);
					// 	// dataTransfer.setData('Text',src);
					// 	return false;
					// });
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
			menu_map.append(menu_add_text);
			menu_map.append(new gui.MenuItem({ type: 'separator' }));
			menu_map.append(menu_add_img_external);
			menu_map.append(menu_add_img_entrepot);
			menu_map.append(new gui.MenuItem({ type: 'separator' }));

			var menu_save_img = new MenuItem({ label: '导出图片' });
			menu_save_img.on('click',function(){
				if(gm){
					$('<input type="file" nwsaveas="a.png" />').on('change',function(){
						var save_file_name = $(this).val();
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
								gm_export.addOverlay(new GeoMap.Text($layer.text(),$layer.attr('style')));
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
					}).click();
				}
			});
			menu_map.append(menu_save_img);

			$this.data('menu',menu_map);
		}
		menu_map.popup(e_contextmenu.clientX, e_contextmenu.clientY);
	})
	
	function add_maplayer_img(e,src,i){
		var dis = 10*(i||0);
		MapLayer.img({
			position: {
				left: e.offsetX + dis,
				top: e.offsetY + dis
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
		if(drag_img && is_img(drag_img)){
			add_maplayer_img(e,drag_img);
		}else{
			var files = dataTransfer.files;
			if(files.length > 0){
				$.each(files,function(i,file){
					add_maplayer_img(e,file.path,i);
				})
			}
		}
		return false;
	});
});