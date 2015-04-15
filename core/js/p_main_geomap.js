Core.safe(function(){
	var CoreWindow = Core.Window;
	var Const = Core.Const,
		ConstMsgType = Const.msgType,
		ConstEvent = Const.Event,
		ConstFileType = Const.fileRule.file_type,
		ConstTemplate = Const.template || [800, 800];
	// CoreWindow.get().showDevTools();	
	var color_toRGB = Core.Color.toRGB

	var Logger = Core.util.Logger,
		Timer = Logger.Timer;
		
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


	var LABEL_TYPE_RECT = 1;//圆角矩标注
	var MY_SHAPES = [{
		src: 'data:image/png;base64,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',
		text: '圆角矩标注',
		type: LABEL_TYPE_RECT
	}];

	var conf_of_product; // 用于缓存已经加载的当前产品配置
	var data_of_micaps; // 用于缓存加载的micaps数据
	var conf_export; //保存导出图片设置

	var $body = $('body'),
		$doc = $(document);
	var COLOR_TRANSPANT = 'rgba(0,0,0,0)';
	var $geomap = $('#geomap');
	var $geomap_container = $('#geomap_container');
	var $geomap_layer = $geomap_container;//$('#geomap_layer');
	$geomap_container.css({
		width: ConstTemplate[0],
		height: ConstTemplate[1]
	});
	var width_geomap = $geomap.width(),
		height_geomap = $geomap.height();
	// 替换标题里的时间
	function _replace_date(text, is_use_publish_time){
		if(!conf_of_product || !data_of_micaps || !text){
			return text;
		}
		var file_rule = conf_of_product.in_out.file_rule,
			file_type = file_rule.file_type || ConstFileType.shikuang.v,
			file_hour = file_rule.file_hour || 0;

		var time = new Date(is_use_publish_time? data_of_micaps.mtime: data_of_micaps.time);
			
		if(ConstFileType.forecast.v == file_type && !is_use_publish_time){
			var one = new Date(time.getTime());
			one.setHours(one.getHours()+(file_hour-24));
			var two = new Date(one.getTime());
			two.setHours(two.getHours()+24);

			text = one.format(text);
			text = two.format(text);
			// text = two.format(text.replace(/y1/g,'yy').replace(/M1/g,'MM').replace(/d1/g,'dd').replace(/h1/g,'hh'));
		}else{
			text = time.format(text);
		}
		return text;
	}
	// 得到图例的缓存图片
	var _LegendImage;
	var _get_legend_img = (function(){
		var legend_util = file_util.tmp.legend;
		return function(product_name, width, height){
			var img_path = legend_util.getPath(product_name, width, height);
			if(!legend_util.isNew(product_name, width, height)){
				_LegendImage(img_path, conf_of_product.legend);
			}
			return img_path+'?'+Math.random();
		}
	})();
	
	var $current_text; // 用于操作当前编辑的文字对象
	var on_receive_style; //全局得到样式后的回调
	var _cache_e_contextmenu; // 用于缓存contextmenu事件对象
	var is_img = Core.util.isImg;
	// 引入amd模块加载器	
	Core.Html.addScript('./js/libs/esl.js', false, function(){
		var developmod = false;
		// if(developmod){
		// 	require.config({
		//         packages: [
		//             {
		//                 name: 'zrender',
		//                 location: '../../../git_project/zrender-2.0.5/src/',
		//                 main: 'zrender'
		//             }
		//         ],
		//         paths: {
		//         	'GeoMap': 'js/libs/GeoMap',
		//         	'LegendImage': 'js/libs/LegendImage'
		//         }
		//     });
		// }else{
			var fileLocation= './js/libs/zr'
			require.config({
		        paths:{
		            'zrender': fileLocation,
		            'zrender/shape/Base': fileLocation,
		            'zrender/shape/BrokenLine': fileLocation,
		            'zrender/shape/Polygon': fileLocation,
		            'zrender/Group': fileLocation,
		            'zrender/tool/util': fileLocation,
		            'zrender/tool/area': fileLocation,
		            'zrender/shape/Image': fileLocation,
		            'zrender/shape/Text': fileLocation,
		            'zrender/shape/Rectangle': fileLocation,
		            'GeoMap': './js/libs/GeoMap',
		            'LabelRect': './js/libs/LabelRect',
		            'LegendImage': './js/libs/LegendImage'
		        }
		    });
		// }
		init(true);
	});
	
	// var gm;
	var initing = false;
	var Loading = (function(){
		var $html;
		function show(callback){
			if(!$html){
				$html = $('<div class="loading"><div>正在处理。。。</div></div>').appendTo($geomap_container);
			}
			$html.show(function(){
				setTimeout(callback, 0)
			});
		}
		function hide(){
			$html && $html.hide();
		}
		return {
			show: show,
			hide: hide
		}
	})();
	
	
	// 地图添加的图层类
	var MapLayer = (function(){
		$doc.on('click.maylayer', function(){
			$('.map_layer').addClass('off').trigger('edit', false);
		});
		// 定义文字和图片的右键菜单	
		var menu_layer = new Menu();
		var menu_layer_delete = new MenuItem({label: '删除'});
		menu_layer_delete.on('click',function(){
			var $layer = menu_layer._layer;
			if($layer){
				var fn_on_delete = $layer.data('on_delete');
				$layer.remove();
				fn_on_delete && fn_on_delete();
			}
		});

		/*更改各图层的z-index*/
		function _changeZ(is_add){
			var $layer = menu_layer._layer;
			if($layer){
				var pos_layer = $layer.position(),
					left_layer = pos_layer.left,
					top_layer = pos_layer.top,
					width_layer = $layer.width(),
					height_layer = $layer.height(),
					bottom_layer = top_layer + height_layer,
					right_layer = left_layer + width_layer,
					zindex_layer = parseInt($layer.css('z-index')) || 0;

				var zindex_max = Number.MIN_VALUE,
					zindex_min = Number.MAX_VALUE;
				var $layer_over = $('.map_layer').filter(function(){
					var $this = $(this);
					if(!$this.is($layer)){
						var w = $this.width(),
							h = $this.height();
						var pos = $this.position(),
							left = pos.left,
							top = pos.top;

						var lt_x = Math.max(left, left_layer),
							lt_y = Math.max(top, top_layer),
							rb_x = Math.min(left+w, right_layer),
							rb_y = Math.min(top+h, bottom_layer);

						if(lt_x < rb_x && lt_y < rb_y){
							return $this;
						}
					}
				}).each(function(){
					var $this = $(this);
					var zindex = parseInt($this.css('z-index')) || 0;
					if(zindex > zindex_max){
						zindex_max = zindex;
					}else if(zindex < zindex_min){
						zindex_min = zindex;
					}
				});
				
				if(zindex_max != Number.MIN_VALUE || zindex_min != Number.MAX_VALUE){
					var to_zindex = is_add? zindex_max+1: zindex_min-1;
					if(to_zindex < 0){
						var zindex_abs = -to_zindex;
						$layer_over.each(function(){
							$(this).css('z-index', (parseInt($(this).css('z-index'))||0)+zindex_abs);
						});
						to_zindex = 0;
					}
					$layer.css('z-index', to_zindex);
				}
			}
		}
		var menu_layer_add_z = new MenuItem({label: '置于上层'});
		menu_layer_add_z.on('click',function(){
			_changeZ(true);
		});
		var menu_layer_minus_z = new MenuItem({label: '置于下层'});
		menu_layer_minus_z.on('click',function(){
			_changeZ(false);
		});

		menu_layer.append(menu_layer_delete);
		menu_layer.append(new gui.MenuItem({ type: 'separator' }));
		menu_layer.append(menu_layer_add_z);
		menu_layer.append(menu_layer_minus_z);

		function _createLayer(option){
			var css = option.css;
			var $html = $('<div class="map_layer off"></div>');
			if(css){
				if($.isPlainObject(css)){
					$html.css(css);
				}else{
					$html.attr('style', css);
				}
			}
			var rotate_option = option.rotate;
			if(rotate_option){
				$html.rotatable(rotate_option);
			}
			var resizable_option = option.resize,
				draggable_option = option.drag;
			$html.css('position','absolute').resizable($.extend({
				handles: 'all'
			}, resizable_option)).draggable(draggable_option).on('click', function(e){
				e.stopPropagation();
				$(this).removeClass('off').trigger('edit', true);
			}).on('contextmenu',function(e){
				e.stopPropagation();
				menu_layer._layer = $html;
				menu_layer.popup(e.clientX, e.clientY);
			});
			return $html;
		}
		// 文字图层
		function TextLayer(option){
			var pos = option.position;
			var ondblclick = option.ondblclick;
			var $html = _createLayer({
				css: option.style
			});
			$html.css(pos).addClass('texteditor').append('<span>'+(option.text||'')+'</span>');
			$html.on('dblclick',function(){
				var $this = $(this);
				var text = $this.text(),
					style = $this.attr('style');

				var win_textstyle = Core.Page.textStyle(function(e){
					CoreWindow.sendMsg(ConstMsgType.CONF_STYLE, {
						text: text,
						style: style
					},win_textstyle.window);
				});
				on_receive_style = function(data){
					$this.css(data.style).find('span').text(data.text);
				};

				ondblclick && ondblclick.call(this);
			});

			return $html;
		}
		// 图片图层
		function ImageLayer(option, callback){
			var pos = option.position;
			var src = option.src;
			if(!/^http/.test(src) && !file_util.exists(src.replace(/\?.*$/, ''))){
				callback();
				return;
			}
			var img = new Image();
			img.onload = function(){
				var width = this.width,
					height = this.height;
				var toWidth = 80,
					toHeight = 80*height/width;
				if(option.width && option.height){
					toWidth = option.width;
					toHeight = option.height;
				}
				if(pos.center){
					if(!isNaN(pos.left)){
						pos.left -= toWidth/2;
					}
					if(!isNaN(pos.top)){
						pos.top -= toHeight/2;
					}
				}
				var css = pos;
				css.width = toWidth;
				css.height = toHeight;
				var $html = _createLayer({
					css: css,
					rotate: {}
				});
				$html.addClass('map_layer_image').append('<img src="'+option.src+'"/>');
				
				callback($html, {
					width: width,
					height: height,
					width_show: toWidth,
					height_show: toHeight
				});
			}
			img.onerror = function(){
				callback();
			}
			img.src = src;
		}
		var LabelRect;
		function BoxLayer(option, callback){
			var text = option.text || '';

			var $html = _createLayer({
				css: {
					left: option.x,
					top: option.y,
					width: option.width,
					height: option.height
				},
				resize: {
					resize: function(e, ui){
						var pos = ui.position,
							size = ui.size;
						labelRect.modify({
							x: pos.left,
							y: pos.top,
							width: size.width,
							height: size.height
						});
						
	                	$text.css({
	                		width: size.width - 20,
	                		height: size.height - 20
	                	});
					}
				},
				drag: {
					handle: '.handle',
					start: function(e, ui){
						last_pos_box = ui.position;
						var arrow = labelRect.shape.arrows[0];
						last_pos_arrow = {
							x: arrow.x,
							y: arrow.y
						}
					},
					drag: function(e, ui) {
						var pos = ui.position;
						labelRect.modify({
							x: pos.left,
							y: pos.top,
							arrows: {
								x: last_pos_arrow.x + (pos.left - last_pos_box.left),
								y: last_pos_arrow.y + (pos.top - last_pos_box.top)
							}
						});
						
					}
				}
			}).on('edit', function(e, editable){
				labelRect.setEditable(editable);
			}).on('dblclick',function(){
				var text = $text.text(),
					style = $text.attr('style');
				var bg_color = labelRect.options.color;
				style += (style?';':'')+'background-color:'+bg_color;
				var win_textstyle = Core.Page.textStyle(function(e){
					CoreWindow.sendMsg(ConstMsgType.CONF_STYLE, {
						text: text,
						style: style
					}, win_textstyle.window);
				});
				on_receive_style = function(conf){
					var style = conf.style;
					if(style){
						var bg_color = style['background-color'];
						if(bg_color){
							labelRect.modify({
								color: bg_color
							}, true);
						}
						delete style['background-color']
					}
					
					$text.css(style).text(conf.text);
				}
			}).appendTo($geomap_container);

			$html.addClass('map_layer_box').append('<div class="text">'+text+'</div><div class="handle"></div>');

			option && (option.container = $geomap_container, option.map_layer = $html);
			var labelRect = new LabelRect(option);
			$html.data('on_delete', function(){
        		labelRect.dispose();
        	});
			var $text = $html.find('.text').css({
        		width: option.width - 20,
        		height: option.height - 20
        	});
		}
		
		return {
			init: function(_labelRect){
				LabelRect = _labelRect;
			},
			text: TextLayer,
			img: ImageLayer,
			box: BoxLayer
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
				if(on_receive_style){
					var fn = on_receive_style;
					on_receive_style = null;
					fn({
						text: text,
						style: styleObj
					});
					return;
				}
			}
		});
		initing = true;
		require(['GeoMap', 'LegendImage', 'LabelRect'],function(GeoMap, LegendImage, LabelRect){
			MapLayer.init(LabelRect);
			function _getProjector(){
				var conf_sys = ConfUser.getSys();
				return conf_sys && conf_sys.projector || GeoMap.PROJECT_ALBERS; // GeoMap.PROJECT_ALBERS, GeoMap.PROJECT_MERCATOR
			}
			var gm_projector = _getProjector();
			window.GeoMap = GeoMap;
			_LegendImage = LegendImage;
			gm = new GeoMap({
				container: $geomap,
				projector: gm_projector,
				geo: {
					src: './data/',
					name: ['china']
				},
				onready: function(){
				}
				// jsonLoader: file_util.getJson
			});
			// 绑定缩放事件及重置按钮 
			!function(){
				var maptt;
				var zoom_step = 1.2;
				$geomap_container.on('mousewheel', function(e, delta){
					clearTimeout(maptt);
					maptt = setTimeout(function(){
						gm.zoom(e.originalEvent.wheelDelta > 0 ? zoom_step: 1/zoom_step, {x: e.offsetX, y: e.offsetY});
					}, 30);
				});
				gm.draggable();
				var $tools = $('#map_tool div').click(function(){
					$tools.removeClass('on');
					$(this).addClass('on');
				});
				$('#map_tool_reset').click(function(){
					// gm.draggable({
					//   disabled: true
					// });
					gm.reset(true);
				});
			}();
			
			
			// 根据配色方案进行地图元素初始化
			function render_conf(data, blendent, params){
				var str_notice = '请先配置产品图例！';
				var len_blendent = 0;
				if(!blendent || (len_blendent = blendent.length) == 0){
					return alert(str_notice);
				}
				var mapbg_color = '#ffffff';
				try{
					var conf_map_color = conf_of_product.other.mapbg_color;
					if(conf_map_color.flag){
						mapbg_color = conf_map_color.val;
					}
				}catch(e){}
				// 添加背景色让地图不透明
				gm.addOverlay(new GeoMap.Rectangle({
					style: {
						x: 0,
						y: 0,
						width: width_geomap,
						height: height_geomap,
						color: mapbg_color
					}
				}));
				
				for(var i = 0; i < len_blendent; i++){
					var colors = blendent[i].colors;
					for(var i_c = 0, j_c = colors.length; i_c < j_c; i_c++){
						var range = colors[i_c].val;
						if(range[0] === ''){
							range[0] = Number.NEGATIVE_INFINITY;
						}
						if(range[1] === ''){
							range[1] = Number.POSITIVE_INFINITY;
						}
					}
				}
				Timer.start('render micaps');
				// 对图例进行验证
				for(var i = 0; i<len_blendent; i++){
					var v = blendent[i];
					if(!v || !v.colors){
						return alert(str_notice);
					}
				}
				var isHaveManyBlendent = len_blendent > 1;
				function getColorByCondition(val, range){
					for(var i = 0,j=range.length;i<j;i++){
						var case_range = range[i];
						if(case_range.is_checked){
							var val_range = case_range.val;
							if(val >= val_range[0] && val < val_range[1]){
								return case_range.color;
							}
						}
					}
					return COLOR_TRANSPANT;
				}
				function getColor(val, code){
					if(isHaveManyBlendent){
						for(var i = 0;i<len_blendent;i++){
							var v = blendent[i];
							if(code == v.val.v){
								return getColorByCondition(val, v.colors);
							}
						}
					}
					return getColorByCondition(val, blendent[0].colors);
				}
		        // 3类里的插值结果
				var interpolate = data.interpolate;
				if(interpolate){
					var _interpolate_width,
						_interpolate_height;
					try{
						_interpolate_width = interpolate.length;
						_interpolate_height = interpolate[0].length;
					}catch(e){}
					var _new_interpolate_data = [];
					for(var i = 0; i < _interpolate_width; i++){
                        var arr = [];
                        for(var j = 0; j< _interpolate_height; j++){
                            var v = interpolate[i][j];
                            var color = getColor(v.v);
                            arr.push({
                            	x: v.x,
                            	y: v.y,
                            	c: color || COLOR_TRANSPANT
                            });
                        }
                        _new_interpolate_data.push(arr);  
                    }
                    Timer.start('raster2vector');
                    var polygons = file_util.micaps.raster2vector(_new_interpolate_data, COLOR_TRANSPANT, params);
					// var polygons = raster2vector(_new_interpolate_data, COLOR_TRANSPANT);
                    Timer.end('raster2vector', 1);
					for(var i = 0, j = polygons.length; i<j; i++){
						var point_arr = [];
						var polygon = polygons[i];
						var color = polygon.color;
						for(var i_p = 0, items = polygon.items, j_p = items.length; i_p<j_p; i_p++){
							var v = items[i_p];
							var point = new GeoMap.Point(v.lng, v.lat);
							point_arr.push(point);
						}
						var polygonShape = new GeoMap.Polygon(point_arr, {
							style: {
								strokeColor: COLOR_TRANSPANT, 
								color: color,
							}
						});
						gm.addOverlay(polygonShape);   //增加面
					}
					// gm.addOverlay(interpolation_overlay);   //渲染插值结果
				}
				// 14类中的面
				var areas = data.areas;
				if(areas){
					/*判断是不是大风降温数据 {*/
					var is_bigwind = false;
					for(var i = 0, j = areas.length; i<j; i++){
						var text = areas[i].symbols.text;
						if(/^040$/.test(text.trim())){
							is_bigwind = true;
							break;
						}
					}
					/*判断是不是大风降温数据 }*/
					$.each(areas, function(i,v){
						var point_arr = [];
						$.each(v.items,function(v_i,v_v){
							var point = new GeoMap.Point(v_v.x,v_v.y);
							point_arr.push(point);
						});
						var color = 'rgba(0,0,0,0)';

						var symbols = v.symbols;
						var val_area = symbols? symbols.text : '';

						// 只对大风降温数据进行处理
						if(is_bigwind){
							if(/^0/.test(val_area)){
								// 02、03表示沙尘；04表示大风
								if(val_area === '040'){
									var polyline = new GeoMap.Polyline(point_arr, {
										style: {
											strokeColor : '#ff0000',
											lineWidth : 2,
										},
										zlevel: GeoMap.ZLEVEL.NOCLIP
									});
									gm.addOverlay(polyline);   //增加折线
								}
								return;
							}
						}
						color = getColor(val_area, v.code);
						if(color){
							if(v.code == 24){
								// strokeColor = 'red';
								color = new GeoMap.Pattern.Streak({
									strokeStyle: color,
									space: 1
								});
							}
							var polygon = new GeoMap.Polygon(point_arr, {
								style: {
									strokeColor: color, 
									color: color,
									lineWidth: 0.2
								}
							});
							gm.addOverlay(polygon);   //增加面
						}
					});
				}
				// 14类中的特殊线，如冷锋、暖锋
				var line_symbols = data.line_symbols;
				if(line_symbols){
					var color_symbols = {
						2: 'blue',
						3: 'red',
						38: 'red'
					};
					$.each(line_symbols,function(i, v){
						if(v.code == 0){
							return;
						}
						var point_arr = [];
						$.each(v.items,function(v_i,v_v){
							var point = new GeoMap.Point(v_v.x, v_v.y);
							point_arr.push(point);
						});
						var option_special = {
							code: v.code,
							width: 20, //线上标识图形的大小（如暖锋大小）
							space_point: 10 //两个线上标识图形的间隔经纬度点数
						};
						var option = {
							style: {
								strokeColor : color_symbols[v.code],
								lineWidth : 2,
							},
							zlevel: GeoMap.ZLEVEL.NOCLIP
						};

						// 霜冻线在地图内，其它都可在地图区域外
						if(v.code == 38){
							delete option.zlevel;
							option_special.width = 14;
						}
						var polyline = new GeoMap.Polyline(point_arr, option, option_special);
						gm.addOverlay(polyline);   //增加折线
					});
				}
				// 14类中的普通线
				var lines = data.lines;
				if(lines){
					$.each(lines, function(i, line){
						var point_arr = [];
						var points = line.point;
						if(points.length >= 2){
							$.each(points,function(p_i, p_v){
								var point = new GeoMap.Point(p_v.x, p_v.y);
								point_arr.push(point);
							});
							var polyline = new GeoMap.Polyline(point_arr,{
								style: {
									strokeColor : '#1010FF',
									lineWidth : 2,
								},
								zlevel: GeoMap.ZLEVEL.NOCLIP
							});
							gm.addOverlay(polyline);   //增加折线
						}
						var flags = line.flags;
						if(flags && flags.items && flags.items.length > 0){
							var text = flags.text;
							$.each(flags.items,function(i,v){
								gm.addOverlay(new GeoMap.Text(text, 'left:'+v.x+'px;top:'+v.y+'px;font-size: 12px'));
							});
						}
					});
				}
				var symbols = data.symbols;
				if(symbols){
					$.each(symbols, function(i, v){
						var type = v.type;
						
						var text = '',
							color = '#1010FF';
						
						if('60' == type){
							text = 'H';
							color = 'red';
						}else if('61' == type){
							text = 'L';
						}else if('37' == type){
							text = '台';
							color = 'green';
						}
						var textShape = new GeoMap.Text(text, 'color:'+color+';left:'+(v.x)+'px;top:'+v.y+'px;font-size: 30px', null, {
							pos: {
								x: v.x,
								y: v.y
							},
							zlevel: GeoMap.ZLEVEL.NOCLIP
						});
						gm.addOverlay(textShape);
					});
				}
				Timer.end('render micaps');
			}
			function addTitle(conf_title, pos, is_use_publish_time){
				if(conf_title && conf_title.is_show){
					var text = conf_title.text;
					if(text){
						return MapLayer.text({
							position: pos,
							text: _replace_date(text, is_use_publish_time),
							style: conf_title.style
						}).appendTo($geomap_layer);
					}
				}
			}
			function _afterRender(){
				initing = false;
				Loading.hide();
				gm.refresh();
			}
			// 当产品更换时触发
			$doc.on(ConstEvent.PRODUCT_CHANGE, function(e, product_name){
				// if(product_name && (!conf_of_product || conf_of_product.name != product_name)){
				if(gm.isReady && product_name){
					// 清空地图及样式
					$('.map_layer, .map_layer_box_c').remove();
					gm.clearLayers();
					// $geomap_container.removeAttr('style');
					// setTimeout(function(){
						// MapLayer.box({
						// 	x: 100,
						// 	y: 100,
						// 	width: 200,
						// 	height: 100
						// });
					// }, 10);
					Loading.show(function(){
						conf_of_product = ConfUser.get(product_name);
						if(!conf_of_product || !conf_of_product.title || !conf_of_product.legend || !conf_of_product.in_out){
							Loading.hide();
							return alert('请对该产品进行配置！');
						}
						conf_of_product.name = product_name;

						var conf_other = conf_of_product.other;
						function _afterConfig(){
							var logo = conf_other.logo;
							if(logo){
								add_maplayer_img(logo, {
									left: 20,
									top: 20
								});
							}

							conf_export = {};
							var bg_flag = false, bgcolor_flag = false;
							
							var conf_bgimg = conf_other.bg_img;
							if(conf_bgimg){
								if(conf_bgimg.flag && conf_bgimg.val){
									bg_flag = true;
									conf_export.bgimg = conf_bgimg.val;//$('<img src="'+conf_bgimg.val+'"/>').get(0);
								}
							}
							if(!bg_flag){
								var conf_bgcolor = conf_other.bg_color;
								if(conf_bgcolor){
									if(conf_bgcolor.flag && conf_bgcolor.val){
										conf_export.bgcolor = conf_bgcolor.val;
										bgcolor_flag = true;
									}
									
								}
							}
							$geomap_container.css('background-image', bg_flag?'url("'+conf_bgimg.val.replace(/\\/g,'/')+'")': 'none');
							$geomap_container.css('background-color', bgcolor_flag?conf_bgcolor.val:'');
							var conf_title = conf_of_product.title || {};//当没有配置文件时title == undefined
							var $html_title1 = addTitle(conf_title.title_1, {
								left: 110,
								top: 20
							});
							var $html_title2 = addTitle(conf_title.title_2, {
								left: 110,
								top: 80
							});
							var $html_title3;

							var conf_legend = conf_of_product.legend;
							var is_show_legend = conf_legend.is_show_legend,
								is_updown = conf_legend.is_updown;

							function _add_southsealogo(pos, callback){
								var logo_southsea = conf_other.logo_southsea;
								if(logo_southsea && logo_southsea.flag){
									add_maplayer_img(logo_southsea.p, pos, callback);
								}else{
									callback && callback();
								}
							}
							function _add_title3(pos){
								var _title_3 = conf_title.title_3;
								if(_title_3){
									if(!is_updown){
										var m = /font-size: (\d+)px/.exec(_title_3.style);
										var height = m? parseFloat(m[1]) + 10: 30;
										if(!isNaN(pos.top)){
											pos.top -= height;
										}else{
											pos.bottom += height;
										}
									}
									
									$html_title3 = addTitle(_title_3, pos, true);
									$html_title3 && $html_title3.data('use_mtime', true);
								}
							}
							
							var _width = $geomap_layer.width();
							if(is_show_legend){
								var img_src = _get_legend_img(product_name, width_geomap, height_geomap);
								function _add_legend(pos, width, height, callback){
									new MapLayer.img({
										position: pos,
										width: width,
										height: height,
										src: img_src
									},function($html, param){
										$geomap_layer.append($html);
										callback && callback($html, param);
									});
								}
								var img = new Image();
								img.onload = function(){
									var width = this.width,
										height = this.height;
									if(is_updown){
										var scale = _width/1024;
										var toWidth = width * scale,
											toHeight = height * scale;
										_add_southsealogo({
											left: 10,
											top: 'auto',
											bottom: 10
										}, function($html, param){
											if($html && param){
												var pos = {
													left: 10 + param.width_show + 10,
													top: 'auto',
													bottom: 10
												}
											}else{
												var pos = {
													left: 10,
													top: 'auto',
													bottom: 10
												};
											}
											_add_legend(pos, toWidth, toHeight);
											_add_title3({
												left: 'auto',
												right: 10,
												top: 'auto',
												bottom: 10
											});
										});
									}else{
										var toWidth = Math.min(width, _width),
											toHeight = toWidth*height/width;

										_add_legend({
											left: 0,
											top: 'auto',
											bottom: 0
										},toWidth, toHeight,function($html, param){
											var pos = $html.position();
											_add_title3({
												left: 10, 
												top: pos.top
											});
											_add_southsealogo({
												left: 'auto',
												right: 10,
												top: 'auto',
												bottom: param.height_show + 10
											});
										});
									}
								}
								img.onerror = img.onload;
								img.src = img_src;
							}else{
								var pos_southsea,
									pos_title3;
								if(is_updown){
									pos_southsea = {
										left: 10,
										top: 'auto',
										bottom: 10
									};
									pos_title3 = {
										left: 'auto',
										right: 10,
										top: 'auto',
										bottom: 10
									}
								}else{
									pos_southsea = {
										left: 'auto',
										right: 10,
										top: 'auto',
										bottom: 10
									};
									pos_title3 = {
										left: 10,
										top: 'auto',
										bottom: 10
									}
								}
								_add_southsealogo(pos_southsea);
								_add_title3(pos_title3);
							}
							
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
								// console.log(file_newest, param);
								if(file_newest){
									Timer.start('read micaps');
									var conf_interpolation = conf_other.interpolation;
									file_util.micaps.getData(file_newest, {
										val_col: conf_file_rule.col,
										grid_space: 0.2,
										interpolation_all: conf_interpolation && conf_interpolation.flag, //传入micaps解析需要参数
										arithmetic: conf_file_rule.arithmetic
									}, function(err, data, params){
										// console.log(err, data);
										Timer.end('read micaps');
										if(err){
											alert(err.msg || '读取数据错误！');
										}else{
											data_of_micaps = data;
											$html_title1 && $html_title1.find('span').text(function(){
												return _replace_date($(this).text());
											});
											$html_title2 && $html_title2.find('span').text(function(){
												return _replace_date($(this).text());
											});
											$html_title3 && $html_title3.find('span').text(function(){
												return _replace_date($(this).text(), true);
											});
											render_conf(data_of_micaps, conf_of_product.legend.blendent, params);
										}
										_afterRender()
									});
									
								}else{
									alert('没有找到符合条件的文件，请检查产品相关配置！');
									_afterRender()
								}
							}else{
								alert("请配置该产品的数据源路径！");
								_afterRender()
							}
						}
						var new_projector = _getProjector();
						var _template = conf_other.template;
						var new_w = _template[0],
							new_h = _template[1];
						if(new_projector != gm_projector || new_w != width_geomap || new_h != height_geomap){
							width_geomap = new_w;
							height_geomap = new_h;
							$geomap_container.css({
								width: width_geomap,
								height: height_geomap
							});
							gm.config({
								projector: new_projector,
								w: new_w,
								h: new_h
							}, _afterConfig);
						}else{
							_afterConfig();
						}
					});
				}
			});
		});
	}
	function _get_save_img_name(){
		var filename;
		try{
			filename = _replace_date(conf_of_product.in_out.out_filename);//优先使用用户自定义文件名
		}catch(e){}

		return filename || conf_of_product.name+'_'+width_geomap+'x'+height_geomap+'.png';
	}
	/*右侧地图的右键功能*/
	!function(){
		/*导出图片*/
		var _save_img = function(){
			if(gm && conf_of_product){
				$('<input type="file" nwsaveas="'+_get_save_img_name()+'" nwworkingdir="'+conf_of_product.in_out.dir_out+'"/>').on('change',function(){
					Timer.start('save image');
					var save_file_name = $(this).val();
					Loading.show(function(){
						var img_data = gm.toDataURL();
						var $div_container = $('<div style="position: absolute; left: -999px;top: 0;width: '+width_geomap+'px; height: '+height_geomap+'px"></div>').appendTo($('body'));
						
						var gm_export = new GeoMap({
							container: $div_container,
							isnotMirror: true
						});
						gm_export.addOverlay(new GeoMap.Image(img_data));

						var imgnum_waiting_draw = 0;
						var tt_draw;
						$geomap_layer.find('.map_layer').sort(function(a, b){
							return $(a).css('z-index') > $(b).css('z-index');
						}).each(function(i,v){
							var $layer = $(this);
							var layer;
							if($layer.is('.texteditor')){
								$layer.css($layer.position()); // 修复样式里的left和top为auto情况
								var padding_top = parseFloat($layer.css('padding-top')) || 0,
									padding_right = parseFloat($layer.css('padding-right')) || 0,
									padding_bottom = parseFloat($layer.css('padding-bottom')) || 0,
									padding_left = parseFloat($layer.css('padding-left')) || 0;
								gm_export.addOverlay(new GeoMap.Text(_replace_date($layer.text()),$layer.attr('style'), [padding_top, padding_right, padding_bottom, padding_left]));
							}else if($layer.is('.map_layer_image')){
								var pos = $layer.position();
								var img = $layer.find('img').get(0);
								gm_export.addOverlay(new GeoMap.Image(img, pos.left, pos.top, $layer.width(), $layer.height()));
							}else if($layer.is('.map_layer_box')){
								var pos = $layer.position();
								var $canvas = $layer.find('canvas');
								var pos_canvas = $canvas.position();
								gm_export.addOverlay(new GeoMap.Image($canvas.get(0), pos.left + pos_canvas.left, pos.top + pos_canvas.top, $canvas.width(), $canvas.height()));
								
								var $text = $layer.find('.text');
								var text = $text.text();
								if(text){
									var pos_text = $text.position();
									var style = $text.clone().css({
										left: pos.left + pos_text.left,
										top: pos.top + pos_text.top
									}).attr('style');
									gm_export.addOverlay(new GeoMap.Text(text, style));
								}
							}
						});
						// 软件到期后对生成的图片进行水印处理
						if(!Core.safe.l){
							var x = Math.random()* width_geomap*0.7,
								y = Math.random()*height_geomap*0.7;
							var text_no_authorization = '华风创新出品';
							gm_export.addOverlay(new GeoMap.Text(text_no_authorization, 'font-size: 40px;color: red;left:'+x+'px;top:'+y+'px', null, {
								textAlign: 'center'
							}));
						}

						// 防止背景图片没有加载完成
						function _export(){
							img_data = gm_export.toDataURL(conf_export);

							file_util.img.saveBase64(save_file_name, img_data);
							$div_container.remove();
							Loading.hide();
							var time = Timer.end('save image');
							alert('成功导出图片, 用时'+time+'毫秒!');
						}
						var _bgimg = conf_export.bgimg;
						if(_bgimg && file_util.exists(_bgimg)){
							var img = new Image();
							img.onload = function(){
								conf_export.bgimg = img;
								_export();
							}
							img.src = _bgimg;
						}else{
							_export();
						}
					});
				}).click();
			}else{
				alert('请先选择要操作的产品！');
			}
		}
		/*添加文字*/
		var _add_text = function(){
			on_receive_style = function(data){
				var pos = _cache_e_contextmenu? {
					left: _cache_e_contextmenu.offsetX,
					top: _cache_e_contextmenu.offsetY
				}:{
					left: width_geomap/2,
					top: width_geomap/2
				};
				var $text = MapLayer.text({
					position: pos
				}).appendTo($geomap_layer);
				$text.css(data.style).find('span').text(data.text);
			}
			var win_textstyle = Core.Page.textStyle(function(e){
				CoreWindow.sendMsg(ConstMsgType.CONF_STYLE,{},win_textstyle.window);
			});
		}
		/*显示图标库文件*/
		var _show_entrepot_images = (function(){
			var $tool_image,$tool_image_main;
			var isReload = false;
			var files_loaded;
			$('#btn_setting').click(function(){
				isReload = true;
			});

			var cache_file = {};
			function showFiles($container, key){
				var html = '';
				if(key == 'my_shape'){
					$.each(MY_SHAPES, function(i, shape){
						html += '<li><img src="'+shape.src+'" draggable="true"/><span>'+shape.text+'</span></li>';
					});
				}else{
					var files = cache_file[key];
					$.each(files,function(i,v){
						var name = path_util.basename(v);
						if(is_img(name)){
							name = name.replace(path_util.extname(v),'');
							html += '<li><img src="'+v+'" draggable="true"/><span>'+name+'</span></li>';
						}
					});
				}
				
				$container.html(html);
			}
			/*当重新配置图片库时要重新加载*/
			function reloadFiles(){
				if(!files_loaded || isReload){
					files_loaded = file_util.readdir(icon_path);
					if(!$tool_image){
						$tool_image = $('<div class="tool_image"><div class="btn_close_tool_image"></div><div class="tool_image_main"></div></div>').appendTo('#work_container');
						$tool_image.delegate('select','change',function(){
							showFiles($tool_image.find('ul'), $(this).val());
						});
						$tool_image.delegate('.btn_close_tool_image','click',function(){
							$tool_image.slideUp();
						});
						$tool_image_main = $tool_image.find('.tool_image_main');
					}
					var html_select = '<select>';
					function _getHeight(){
						return $tool_image.height() - 80;
					}
					$(window).on('resized', function(){
						$('.list_container').css({
							height: _getHeight()
						});
					})
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
					html_select += '<option value="my_shape">标注图形</option>';
					$.each(files_loaded,function(i,v){
						html_select += createOption(v,0,i);
					});
					html_select += '</select>';
					$tool_image_main.children().remove();
					$tool_image_main.html(html_select+'<div class="list_container" style="height: '+(_getHeight())+'px"><ul class="clear"></ul></div>');
					var val = $tool_image_main.find('select').val();
					showFiles($tool_image_main.find('ul'), val);
				}
			}
			return function(){
				reloadFiles();
				$tool_image.slideDown();
			}
		})();

		/*添加外部图片*/
		var _add_img_external = function(){
			$('<input type="file" nwworkingdir="'+file_util.path.image+'" />').on('change',function(){
				add_maplayer_img($(this).val(), {
					left: $geomap_layer.width()/2,
					top: $geomap_layer.height()/2
				});
			}).click();
		}
		$('#btn_add_text').click(_add_text);
		$('#btn_add_img').click(_show_entrepot_images);
		$('#btn_export').click(_save_img);
		$('#btn_add_img_external').click(_add_img_external);
		$geomap_layer.on('contextmenu',function(e_contextmenu){
			_cache_e_contextmenu = e_contextmenu; // 暂存事件对象
			var $this = $(this);
			var menu_map = $this.data('menu');
			if(!menu_map){
				menu_map = new Menu();
				var menu_add_text = new MenuItem({label: '添加文字'});
				menu_add_text.on('click', _add_text);
				
				var menu_add_img_external = new MenuItem({label: '添加外部图片'});
				menu_add_img_external.on('click', _add_img_external);
				var menu_add_img_entrepot = new MenuItem({label: '添加图片库图片'});

				
				menu_add_img_entrepot.on('click', _show_entrepot_images);

				var menu_save_img = new MenuItem({ label: '导出图片' });
				menu_save_img.on('click', _save_img);

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
	}();
	
	// 向地图添加图片
	function add_maplayer_img(src, pos, callback){
		if(is_img(src)){
			MapLayer.img({
				position: pos,
				src: src
			},function($html, param){
				$html && $geomap_layer.append($html);
				callback && callback($html, param);
			});
		}else{
			callback && callback();
		}
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
		if(drag_img){
			for(var i = 0, j = MY_SHAPES.length; i<j; i++){
				var shape = MY_SHAPES[i];
				if(shape.src == drag_img){
					if(LABEL_TYPE_RECT == shape.type){
						MapLayer.box({
							x: x,
							y: y,
							width: 200,
							height: 100
						});
						return;
					}
				}
			}
			add_maplayer_img(drag_img, {
				center: true,
				left: x,
				top: y
			});
		}else{
			var files = dataTransfer.files;
			if(files.length > 0){
				$.each(files,function(i,file){
					add_maplayer_img(file.path, {
						center: true,
						left: x+i*10,
						top: y+i*10
					});
				})
			}
		}
		return false;
	});
});