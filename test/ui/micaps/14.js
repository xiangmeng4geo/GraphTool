!function() {
	var path = require('path');
	var fs = require('fs');
	require(path.join(__dirname, '../../../app/ui/action/core.js'));

	var C = Core,
		$ = C.$,
		_require = C.require,
		util = _require('util'),
		util_color = util.color;

	// 初始化地图
	map = new BMap.Map("allmap");
	map.centerAndZoom(new BMap.Point(116.404, 39.915), 5);
	map.enableScrollWheelZoom();

	// 显示要测试的问题数据列表
	var dir_data = path.join(__dirname, '../../data/micaps/14');
	var file_list = fs.readdirSync(dir_data);
	var html_file_list = '';
	var file_name_old = localStorage.getItem('file_name');
	file_list.forEach(function(v) {
		html_file_list += '<option value="'+v+'" '+(file_name_old == v?'selected':'')+'>'+v+'</option>';
	});
	var $dataList = $('#dataList').html(html_file_list).on('change', function() {
		localStorage.setItem('file_name', $(this).val());
	});

	// 显示要使用图例
	var product_conf = _require('product_conf');
	var conf_data_sys = product_conf.getSys() || {};
	var conf_data_legend = conf_data_sys.legend || (conf_data_sys.legend = []);
	var html_legend = '';
	var name_legend_cache = localStorage.getItem('name_legend_cache');
	conf_data_legend.forEach(function(v, i) {
		if (v.name == name_legend_cache) {
			var is_selected = true;
		}
		html_legend += '<option value="'+i+'" '+(is_selected?'selected': '')+'>'+v.name+'</option>';
	});
	var $legend = $('#legend').html(html_legend).on('change', function() {
		localStorage.setItem('name_legend_cache', conf_data_legend[$legend.val()].name);
	});

	$('select,[type=checkbox]').on('change', _showData);

	function is_checked($checkbox) {
		return $checkbox.prop('checked');
	}

	var $cb_line_sr = $('#cb_line_sr'), //是否显示雨雪分界线
		$cb_line_sd = $('#cb_line_sd'), //是否显示霜冻线
		$cb_val = $('#cb_val'),//是否显示区域值
		$cb_val_code = $('#cb_val_code'),//是否显示雨雪编码
		$cb_val_code_other = $('#cb_val_code_other');//是否显示其它编码
	var _flag_is_added_svg_pattern = false;
	// 添加百度地图的雨夹雪区域显示
	var _add_svg_pattern = function(blendent){
		$('defs').remove();
		mySvg = $('#allmap svg').get(0);
		if(!mySvg){
			setTimeout(function() {
				_add_svg_pattern(blendent);
			}, 20);
			return;
		}
		var svgNS = mySvg.namespaceURI;

		var defs = document.createElementNS(svgNS,'defs');
		mySvg.appendChild(defs);

		$.each(blendent.colors, function(i, v){
			var c = v.color;
			var name = 'rain_snow_'+(c.replace('#', ''));	
			var pattern = document.createElementNS(svgNS, 'pattern');
			pattern.setAttribute('id', name);
		    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
		    pattern.setAttribute('width', 1000);
		    pattern.setAttribute('height', 4);
		    pattern.setAttribute('x', 12);
		    pattern.setAttribute('y', 12);
		    pattern.setAttribute('patternTransform', 'rotate(-45)');

		    var rect = document.createElementNS(svgNS, 'rect');
		    rect.setAttribute('x', 0);
		    rect.setAttribute('y', 0);
		    rect.setAttribute('width', 9999);
		    rect.setAttribute('height', 1);
		    rect.setAttribute('style', 'stroke: '+c);
		    pattern.appendChild(rect);

		    defs.appendChild(pattern);
		});
	}
	/*处理特殊线的颜色*/
	var COLOR_LINE = {
		"38": {
			"name": "霜冻线",
			"color": "rgb(204, 51, 51)"
		},
		"2": {
			"name": "冷锋",
			"color": "#0000FE"
		},
		"3": {
			"name": "暖锋",
			"color": "#FF0000"
		}
	};
	function getLineColor(code){
		var conf = COLOR_LINE[code];
		return conf?conf.color:'blue';
	}
	var NUM_SPAN_SYMBOL = 6,
		NUM_SYMBOL_ENDPOINT = 5,
		NUM_SYMBOL_OF_TWO_SYMBOL = 20;
	function draw_line_symbols_flag(code,items,index){
		if(code == 2 || code == 3){
			var len_condition = items.length-NUM_SYMBOL_ENDPOINT;
			for(var i_o = NUM_SYMBOL_ENDPOINT;i_o<len_condition;i_o+=NUM_SYMBOL_OF_TWO_SYMBOL){
				var items_span = items.slice(i_o,i_o+NUM_SPAN_SYMBOL);
				// console.log(index,i_o,items.length,items_span.length);
				if(items_span.length == NUM_SPAN_SYMBOL){
					var point_arr = [];
					var a =  items_span[0],
						b = items_span[items_span.length - 1];
					var x1 = a.x,y1 = a.y,
						x2 = b.x,y2 = b.y;
					var dist = Math.sqrt(Math.pow(x1-x2,2)+Math.pow(y1-y2,2));
					var x,y;
					var max_x = Math.max(x1,x2),
						max_y = Math.max(y1,y2);
					if(code == 2){
						if(x1 == x2){
							// console.log(11);
							x = max_x + Math.abs(dist * Math.cos(Math.PI/4));
							y = max_y - Math.abs((y1-y2)/Math.sin(Math.PI/4));
						}else if(y1 == y2){
							// console.log(12);
							x = max_x + Math.abs((x1 - x2)/Math.sin(Math.PI/4));
							y = max_y - Math.abs(dist * Math.cos(Math.PI/4));
						}else{
							dist *= Math.sin(Math.PI/4);
							var radiu = 3/4 * Math.PI - Math.atan((y1-y2)/(x1-x2));
							var cha_x = Math.abs(dist * Math.cos(radiu));
							
							// x = 135-radiu/Math.PI*180 < 0? max_x + cha_x: max_x - cha_x; 
							x = max_x + cha_x; 
							y = max_y - Math.abs(dist * Math.sin(radiu));
						}
						items_span.push({
							x: x,
							y: y
						});
					}else if(code == 3){
						var middle_x = x2+(x1-x2)/2,
							middle_y = y2+(y1-y2)/2;
						// setTimeout(function(){
							var marker = new BMap.Marker(new BMap.Point(middle_x, middle_y));
							marker.addEventListener("click",function(){
								var p = marker.getPosition();  //获取marker的位置
								alert(i+" marker的位置是" + p.lng + "," + p.lat);    
							});
							map.addOverlay(marker);
						// },400);
						var r = dist / 2;
						var start_radiu = 0;
						if(x1 == x2){
							start_radiu = 90;
						}else if(y1 == y2){
							start_radiu = 0;
						}else{
							start_radiu = Math.atan((y1-y2)/(x1-x2))/Math.PI*180;
						}
						var arr = [];
						
						if(start_radiu > 0){
							start_radiu = 180 + start_radiu;
						}
						var len = 180-start_radiu;
						// console.log(index,'start_radiu',start_radiu,len);
						// if(index == 0){
						// 	continue;
						// }
						var _index = 0;
						for(var i = -start_radiu;i<len;i++){
							var radiu = i * Math.PI/180;
							// console.log(_index++,index,i,len,radiu);
							var cha_x = r * Math.cos(radiu);
							var x =  middle_x + cha_x;
							var y = middle_y - r * Math.sin(radiu);
							// console.log(r,Math.sqrt(Math.pow(x-middle_x,2)+Math.pow(y-middle_y,2)));
							arr.push({
								x: x,
								y: y
							});
						}
						var circle_a = arr[0],
							circle_b = arr[arr.length-1];
						var circle_x1 = circle_a.x,circle_y1 = circle_a.y,
							circle_x2 = circle_b.x,circle_y2 = circle_b.y;
						if(Math.pow(circle_x1-x1,2)+Math.pow(circle_y1-y1,2) < Math.pow(circle_x2-x2,2)+Math.pow(circle_y2-y2,2)){
							arr.reverse();
						}
						items_span = items_span.concat(arr);
						// console.log(items_span);
					}
					// console.log(items_span.length);
					$.each(items_span,function(i,v){
						var point = new BMap.Point(v.x, v.y);
						point_arr.push(point);
						// setTimeout(function(){
						// 	var marker = new BMap.Marker(point);
						// 	marker.addEventListener("click",function(){
						// 		var p = marker.getPosition();  //获取marker的位置
						// 		alert(i+" marker的位置是" + p.lng + "," + p.lat);    
						// 	});
						// 	map.addOverlay(marker);
						// },i*400);
					});
					var color = getLineColor(code);
					var polygon = new BMap.Polygon(point_arr, {strokeColor: color, fillColor: color,fillOpacity: 0.8, strokeWeight: 1, strokeOpacity:1});
					map.addOverlay(polygon);
					
				}
			}
			
			// var points = [];
			// var i = 5;
			// while(i < items.length){
			// 	var one = items.slice(i,i+1);
			// 	i+=10;
			// 	var two = items.slice(i,i+1);
			// 	i+= 30;
			// 	if(one.length == 1 && two.length == 1){
			// 		points.push([one,two]);
			// 	}
			// }
			// $.each(points,function(i,v){
			// 	var one = v[0][0],
			// 		two = v[1][0];
			// 	var radiu = Math.atan((two.y - one.y)/(two.x - one.x)) / Math.PI * 180;
			// 	map.addOverlay(new Icon_Layer(new BMap.Point((two.x + one.x)/2,(two.y + one.y)/2),-radiu,code == 2?'cool':'warm'));
			// });
		}else if(code == 38){
			var SPACE_NUM = 6;
			var color = getLineColor(38);
			// $.each(items.slice(0,items.length-SPACE_NUM),function(i,v){
			// 	if(i > 0 && i % SPACE_NUM == 0){
			// 		var point_before = items[i-1],
			// 			point_current = v;
			// 		var radiu = Math.atan((point_current.y - point_before.y)/(point_current.x - point_before.x)) / Math.PI * 180 +180;
			// 		if(point_current.x < point_before.x){
			// 			radiu += 180;
			// 		}
			// 		var icon_Layer = new Icon_Layer(new BMap.Point((point_current.x + point_before.x)/2,(point_current.y + point_before.y)/2),-radiu,'frost_line');
			// 		$(icon_Layer.getDiv()).find('div').css({
			// 			'background-color': color
			// 		});
			// 		map.addOverlay(icon_Layer);
					
			// 	}
			// });
		}
	}
	function render(data) {
		window.data = data;
		var legend = conf_data_legend[$legend.val()];
		if (legend) {
			var blendent = legend.blendent;
			if (blendent.length > 0) {
				for (var i = 0, j = blendent.length; i<j; i++) {
					if (blendent[i].val.v == 24) {
						_add_svg_pattern(blendent[i]);
						break;
					}
				}
			}
			var fn_color = util_color(blendent);
			var areas = data.areas;
			areas.forEach(function(area, i) {
				var point_arr = [];
				area.items.forEach(function(v_v){
					var point = new BMap.Point(v_v.x, v_v.y);
					point_arr.push(point);
				});
				var symbols = area.symbols;
				var code = area.code;
				// console.log(code, symbols.text);
				var color = fn_color(symbols?symbols.text:0, code);
				if (code == 24) {
					color = 'url(#rain_snow_'+(color.replace('#', ''))+')';
				}

				var polygon = new BMap.Polygon(point_arr, {strokeColor: color, fillColor: color,fillOpacity: 0.8, strokeWeight: 1, strokeOpacity:1});
				polygon.i = i;
				polygon.addEventListener("click",function(){
					console.log('index = '+polygon.i); 
				});
				map.addOverlay(polygon);   //增加面

				if(symbols && is_checked($cb_val)){
					var text = symbols.text;
					if(text >= 0){
						$.each(symbols.items,function(i_text,v_text){
							var label = new BMap.Label(text, {
								position: new BMap.Point(v_text.x,v_text.y),
								offset: new BMap.Size(-17, -10)
							});  // 创建文本标注对象
							label.setStyle({
								 color : "#F00",
								 fontSize : "16px",
								 height : "20px",
								 lineHeight : "20px",
								 fontFamily:"微软雅黑",
								 width: '34px',
								 textAlign: 'center',
								 border: 'none',
								 background: 'none',
								 fontWeight: 'bold',
								 textShadow: '0 0 5px white'
							 });
							map.addOverlay(label);
						});
					}
				}
			});

			var lines = data.lines;		
			$.each(lines, function(i,v){
				var point_arr = [];
				var points = v.point;
				if(points.length >= 2){
					$.each(points,function(p_i,p_v){
						var point = new BMap.Point(p_v.x, p_v.y);
						point_arr.push(point);
					});
					var polyline = new BMap.Polyline(point_arr, {strokeColor:"#1010FF", strokeWeight: v.weight||1, strokeOpacity:1});
					map.addOverlay(polyline);   //增加折线
				}
				var flags = v.flags;
				if(flags && flags.items && flags.items.length > 0){
					var text = flags.text;
					$.each(flags.items,function(i,v){
						var label = new BMap.Label(text, {
							position: new BMap.Point(v.x,v.y),
							offset: new BMap.Size(-17, -10)
						});  // 创建文本标注对象
						label.setStyle({
							 color : "#1010FF",
							 fontSize : "12px",
							 height : "20px",
							 lineHeight : "20px",
							 fontFamily:"微软雅黑",
							 width: '34px',
							 textAlign: 'center',
							 border: 'none',
							 background: 'none'
						 });
						map.addOverlay(label);
					});
				}
			});

			var symbols = data.symbols;
			$.each(symbols,function(i,v){
				var type = v.type;
				var text = '',
					color = '#1010FF';
				var style = {
					 color : color,
					 fontSize : "30px",
					 height : "20px",
					 lineHeight : "20px",
					 fontFamily:"微软雅黑",
					 width: '34px',
					 textAlign: 'center',
					 border: 'none',
					 background: 'none'
				};
				if('60' == type){
					text = 'H';
					color = 'red';
				}else if('61' == type){
					text = 'L';
				}else if('37' == type){
					text = '台';
					color = 'green';
				}
				else if(23 == type || 24 == type || 26 == type || 48 == type){// 处理雨雪的极值
					if (!is_checked($cb_val_code)) {
						return;
					}
					text = v.type;
					// if(text == 0){
					// 	return;
					// }
					style.fontSize = '20px';
					style.fontShadow = '0 0 3px white';
					color = 'black';
				}
				else{//测试特殊点标识
					if (!is_checked($cb_val_code_other)) {
						return;
					}
					color = 'white';
					text = type;
				}
				style.color = color;
				var label = new BMap.Label(text, {
					position: new BMap.Point(v.x,v.y),
					offset: new BMap.Size(-17, -10)
				});  // 创建文本标注对象
				label.setStyle(style);
				map.addOverlay(label);
			});

			var line_symbols = data.line_symbols;
			if(line_symbols){
				$.each(line_symbols,function(i,v){
					var code = v.code;
					if (code == 38 && !is_checked($cb_line_sd)) {
						return;
					}
					if (code == 0 && !is_checked($cb_line_sr)) {
						return;
					}
					var point_arr = [];
					draw_line_symbols_flag(v.code,v.items,i);
					$.each(v.items,function(v_i,v_v){
						var point = new BMap.Point(v_v.x, v_v.y);
						point_arr.push(point);
					});
					var polyline = new BMap.Polyline(point_arr, {strokeColor: getLineColor(v.code), strokeWeight: 1, strokeOpacity: 1});
					map.addOverlay(polyline);   //增加折线
				});
			}
		} else {
			console.log('no legend');
		}
	}
	var datareader = _require('datareader');
	function _showData() {
		map.clearOverlays();
		var file = path.join(dir_data, $dataList.val());
		datareader.read({
			type: 'micaps',
			file: file
		}, function(err, data) {
			if (!err) {
				render(data);

				var obj = {};
				var areas = data.areas;
				if (areas) {
					areas.forEach(function(v, i) {
						var code = v.code;
						if (obj[code]) {
							obj[code]++;
						} else {
							obj[code] = 1;
						}
					});
				}
				console.log(obj);
			}
			console.log(file);
			console.log(err, data);
		});
	}
	_showData();
}()