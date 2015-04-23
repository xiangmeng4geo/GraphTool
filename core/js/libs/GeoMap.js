define('GeoMap',['zrender',
	'zrender/shape/Base',
	'zrender/shape/Polygon',
	'zrender/shape/BrokenLine',
	'zrender/tool/util',
	'zrender/shape/Text',
	'zrender/shape/Image',
	'zrender/shape/Rectangle',
	'zrender/shape/Circle',
	'zrender/tool/area'],function(Zrender, Base, Polygon, BrokenLine, util, TextShape, ImageShape, Rectangle, Circle, util_area){

	var COLOR_TRANSPARENT = 'rgba(0,0,0,0)';
	var Logger = Core.util.Logger,
		Timer = Logger.Timer;

	var ZINDEX_MAP = 2,
		ZINDEX_LAYER = 1,
		ZINDEX_NO_CLIP = 3,
		ZINDEX_MAP_TEXT = 4,
		ZINDEX_LAYER_RIVER = 5;

	// retina 屏幕优化
    var devicePixelRatio = window.devicePixelRatio || 1;
    devicePixelRatio = Math.max(devicePixelRatio, 1);

    var radians = Math.PI / 180,
		degrees = 180 / Math.PI,
		px = 3800000;//转成px
	// px = 1;
	var Mercator = (function(){
		var MERCATOR_RATIO = 20037508.34/180;
		/*Web墨卡托坐标与WGS84坐标互转*/
		var Mercator_cache_lnglat = {};// 进行缓存，减小重复计算量
		return {
			name: 'mercator',
			project: function(lnglat){
				var lng = parseFloat(lnglat.x);
				var lat = parseFloat(lnglat.y);
				var cache_name = lng+'_'+lat;
				var cache_val = Mercator_cache_lnglat[cache_name];
				// if(cache_val){
				// 	return cache_val;
				// }
				var x = lng * MERCATOR_RATIO;
				var y = Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180);
				y = y * MERCATOR_RATIO;
				var val = {x: x/px,y: y/px};
				// Mercator_cache_lnglat[cache_name] = val;

				return val;
			},
			invert: function(mercator){
				var x = mercator.x/MERCATOR_RATIO;
				var y = mercator.y/MERCATOR_RATIO;
				y = 180/Math.PI*(2*Math.atan(Math.exp(y*Math.PI/180))-Math.PI/2);
				return {x: x*px,y: y*px};
			}
		}
	})();
	var Albers = (function(){
		var pv = {};
		pv.radians = function(degrees) { return radians * degrees; };
		pv.degrees = function(radians) { return degrees * radians; };
		function albers(lat0, lng0, phi1, phi2) {
		    if (lat0 == undefined) lat0 = 23.0;  // Latitude_Of_Origin
		    if (lng0 == undefined) lng0 = -96.0; // Central_Meridian
		    if (phi1 == undefined) phi1 = 29.5;  // Standard_Parallel_1
		    if (phi2 == undefined) phi2 = 45.5;  // Standard_Parallel_2
		 
		    lat0 = pv.radians(lat0);
		    lng0 = pv.radians(lng0);
		    phi1 = pv.radians(phi1);
		    phi2 = pv.radians(phi2);
		 
		    var n = 0.5 * (Math.sin(phi1) + Math.sin(phi2)),
		        c = Math.cos(phi1),
		        C = c*c + 2*n*Math.sin(phi1),
		        p0 = Math.sqrt(C - 2*n*Math.sin(lat0)) / n;
		 
		    return {
		    	name: 'albers',
		        project: function(lnglat) {
		        	var lng = parseFloat(lnglat.x);
					var lat = parseFloat(lnglat.y);
					
		            var theta = n * (pv.radians(lng) - lng0),
		                p = Math.sqrt(C - 2*n*Math.sin(pv.radians(lat))) / n;
		            var result = {
		                x: p * Math.sin(theta)/px,
		                y: p0 - p * Math.cos(theta)/px
		            };
		            return result;
		        },
		        invert: function(xy) {
		            var theta = Math.atan(xy.x / (p0 - xy.y)),
		                p = Math.sqrt(xy.x*xy.y + Math.pow(p0 - xy.y, 2));
		            return {
		                lng: pv.degrees(lon0 + theta/n),
		                lat: pv.degrees(Math.asin( (C - p*p*n*n) / (2*n)))
		            };
		        }
		    };
		}
		return albers(35, 105, 27, 45);
	})();

	var china_src_size = {
		height: 35.4638,
		left: 73.4766,
		top: 53.5693,
		width: 61.6113
	};
	var default_conf = {
		container: 'body'
	};
	/*初始化一些配置*/
	var _init_geomap = function(){
		var _this = this;
		var conf = _this.conf;
		var container = $(conf.container);
		var width_container = container.width(),
			height_container = container.height();

		var px_size_china_left_top = _this.projector.project({x: china_src_size.left, y: china_src_size.top}),
			px_size_china_right_bottom = _this.projector.project({x: china_src_size.left+china_src_size.width, y: china_src_size.top-china_src_size.height});

		var px_size_china = {width: px_size_china_right_bottom.x - px_size_china_left_top.x,height: px_size_china_left_top.y - px_size_china_right_bottom.y};
	
		var scale_x = width_container/px_size_china.width,
			scale_y = height_container/(px_size_china.height);

		
		var center = conf.center||{x: china_src_size.left+china_src_size.width/2,y: china_src_size.top - china_src_size.height/2};
		var center_xy = _this.projector.project(center);
		
		var _scale_size = width_container/800;
		_this._data = {
			scale: Math.min(scale_x,scale_y),
			zoom: 1,
			center: {
				lng: center.x,
				lat: center.y,
				x: center_xy.x,
				y: center_xy.y
			},
			translat: [width_container/2, height_container/2],
			width: width_container,
			height: height_container,
			overlays: []
		}
		_this._data_o = $.extend(true,{},_this._data);

		_this.MAX_ZOOM = 3*_scale_size;
		_this.MIN_ZOOM = 0.5*_scale_size;

		if(!conf.isnotMirror && !_this.mirror){
			_this.mirror = $('<img class="geomap_mirror" draggable=false>').appendTo(container.parent());
		}
	}
	
	function _init_mirror(){
		var _this = this;
		var conf = _this.conf;
		if(!conf.isnotMirror){
			var $mirror = _this.mirror;
			var $container = $(conf.container);
			
			var img_data = _this.toDataURL();
			var data = _this._data;
			$mirror.attr('src', img_data).css({
				left: 0,
				top: 0,
				'transform-origin': (data.width/2)+'px '+(data.height/2)+'px',
				'transform': 'scale(1)'
			}).show();
			$container.addClass('mirror');
		}
	}
	var GeoMap = function(conf){
		var _this = this;
		_this.isReady = true;
		_this.conf = conf = $.extend({},default_conf,conf);
		_this.canvas = Zrender.init($(conf.container).get(0));
		_this.jsonLoader = conf.jsonLoader || $.getJSON;
		var fn_ready = conf.onready;
		if(fn_ready){
			_this.on('ready', fn_ready);
		}
		var fn_afterAddOverlays = conf.onafteraddoverlays;
		if(fn_afterAddOverlays){
			_this.on('afteraddoverlays', fn_afterAddOverlays);
		}
		_this.config(conf);
	};
	GeoMap.PROJECT_MERCATOR = 'mercator';
	GeoMap.PROJECT_ALBERS = 'albers';
	GeoMap.ZLEVEL = {
		MAP: ZINDEX_MAP,
		LAYER: ZINDEX_LAYER,
		NOCLIP: ZINDEX_NO_CLIP
	};
	var GeoMapProp = GeoMap.prototype;
	// 对配置进行更改，主要用于投影及尺寸
	GeoMapProp.config = function(conf, callback){
		var _this = this;
		// _this.conf = conf = $.extend({}, default_conf, _this.conf, conf);
		var new_projector = Albers;
		var conf_map = conf.map;
		if(conf_map){
			if(conf_map.projector == 'mercator'){
				new_projector = Mercator;
			}
		}
		var old_projector = _this.projector;
		var _data = _this._data;
		var w_conf = conf.w,
			h_conf = conf.h;
		if(_data && w_conf && h_conf){
			var w = _data.width,
				h = _data.height;
			if(w != w_conf || h != h_conf){
				_this.canvas.resize();
			}
		}
		_this.projector = new_projector;
		_init_geomap.call(_this);

		//对数据进行缓存
		_this._data.map = conf_map;
		_this._data_o.map = conf_map;
		var geo = _this.conf.geo;
		if((!old_projector || old_projector.name != new_projector.name) && geo){
			var src = geo.src,
				name = geo.name;
			var arr_json = [];
			if(!$.isArray(name)){
				name = [name];
			}
			$.each(name, function(i, v){
				arr_json[i] = src + '/' + v +'.json';
			});
			var _canvs = _this.canvas;
			_canvs.clear();
			var overlays_weather = [];
			if(_data){
				var overlays = _data.overlays;
				$.each(overlays, function(i, v){
					var shape = v.shape;
					var zlevel = shape.zlevel;
					if(zlevel == ZINDEX_MAP || zlevel == ZINDEX_MAP_TEXT){
					}else{
						overlays_weather.push(v);
					}
				});
			}
			_this.loadGeo(arr_json, null, function(){
				$.each(overlays_weather, function(i, v){
					_this.addOverlay(v);
				});
				_changeCnameColor.call(_this);
				_addRiver.call(_this);
				_init_mirror.call(_this);
				_this.reset();
				callback && callback();
			});
		}else{
			if(_data){
				var overlays = _data.overlays;
			}
			if(overlays){
				_this._data.overlays = overlays;
			}
			_changeCnameColor.call(_this);
			_addRiver.call(_this);
			// _this.reset();
			callback && callback();
		}
	}
	GeoMapProp.on = function(event_name, event_callback){
		var _this = this;
		if(event_name && ({}).toString.call(event_callback) === '[object Function]'){
			var _events = _this._events;
			if(!_events){
				_events = _this._events = {};
			}
			(_events[event_name] || (_events[event_name] = [])).push(event_callback);
		}
		
		return _this;
	}
	GeoMapProp.off = function(event_name, event_callback){
		var _this = this;
		var _events = _this._events;
		if(_events){
			if(!event_callback){
				delete _events[event_name];
			}else{
				var list = _events[event_name];
				if(list){
					for(var i = 0, j = list.length; i<j; i++){
						if(list[i] == event_callback){
							list.splice(i, 1);
							j--;
							i--;
						}
					}
				}
			}
		}
		return _this;
	}
	GeoMapProp.emit = function(event_name, data){
		var _this = this;
		var _events = _this._events;
		if(_events){
			var list = _events[event_name];
			if(list){
				for(var i = 0, j = list.length; i<j; i++){
					try{
						list[i](data);
					}catch(e){console.log(e.stack)}
				}
			}
		}
	}
	/*地图拖拽*/
	GeoMapProp.draggable = function(option){
		var _this = this,
			data = _this._data;
		var $drag_obj = $(this.mirror);
		var per = 0.3
		var w = data.width*per,
			h = data.height*per;
		var draggable_option = $.extend({
			disabled: false,
			containment: [-w+300, -h, w+300, h],
			stop: function(){
				_reset.call(_this, RESET_TYPE_DRAG);
			}
		}, option);

		$drag_obj.draggable(draggable_option);
	}
	/*地图缩放*/
	GeoMapProp.zoom = function(scale, origin){
		if(scale != 1 && scale > 0){
			var _this = this,
				zoom = _this._data.zoom,
				$mirror = $(_this.mirror);
			scale *= zoom;
			if(scale >= _this.MIN_ZOOM && scale <= _this.MAX_ZOOM){
				_this._data.zoom = scale;
				$mirror.css({
					'transform-origin': origin.x+'px '+origin.y+'px',
					'transform': 'scale('+scale+')'
				});
				_reset.call(_this, RESET_TYPE_ZOOM);
			}
		}
	}
	GeoMapProp.reset = function(){
		_reset.call(this, RESET_TYPE_RESET);
	}
	GeoMapProp.reset_drag = function(){
		_reset.call(this, RESET_TYPE_DRAG);
	}
	GeoMapProp.reset_zoom = function(){
		_reset.call(this, RESET_TYPE_ZOOM);
	}
	function _changeCnameColor(){
		var _this = this,
			canvas = _this.canvas,
			_data = _this._data;
		var overlays = _data.overlays,
			_map = _data.map;
		var layers, conf_cname;
		if(overlays && _map && (layers = _map.layers) && (conf_cname = layers.cname)){
			var flag = conf_cname.flag;
			var color_cname = flag? conf_cname.color: COLOR_TRANSPARENT;
			var is_have_text = false;
			$.each(overlays, function(i, v){
				var shape = v.shape;
				var zlevel = shape.zlevel;
				if(zlevel == ZINDEX_MAP_TEXT){
					is_have_text = true;
					var id = shape.id;
					canvas.modShape(id, {style: {
						color: color_cname
					}})
				}
			});
			canvas.refresh();
		}
	}
	function _addRiver(){
		var _this = this;
		var is_add_river = false,
			river_color = '#353FC3',
			key;
		var _data = _this._data;
		try{
			var conf_river = _data.map.layers.river;
			is_add_river = conf_river.flag;
			river_color = conf_river.color || river_color;
			key = JSON.stringify(conf_river);
		}catch(e){}

		if(key && _this.key_river != key){
			_this.clearLayers(ZINDEX_LAYER_RIVER);
			_this.key_river = key;
		}
		
		if(is_add_river){
			var geo = _this.conf.geo;
			_this.jsonLoader(geo.src+'/'+geo.name+'_river.json', function(data){
				if(data){
					for(var i = 0, j = data.length; i<j; i++){
						var point_arr = [];
						var river = data[i];
						for(var i_r = 0, j_r = river.length; i_r<j_r; i_r++){
							var item = river[i_r];
							var point = new GeoMap.Point(item[0], item[1]);
							point_arr.push(point);
						}
						var polyline = new GeoMap.Polyline(point_arr, {
							style: {
								strokeColor : river_color,
								lineWidth : 1,
							},
							zlevel: ZINDEX_LAYER_RIVER
						});
						_this.addOverlay(polyline);   //增加折线
					}
				}
			})
		}
	}
	var RESET_TYPE_ZOOM = 1,
		RESET_TYPE_DRAG = 2,
		RESET_TYPE_RESET = 3;
	var _reset = function(reset_type){
		var _this = this,
			canvas = _this.canvas,
			data = _this._data,
			_width = data.width,
			_height = data.height;
		var $mirror = $(_this.mirror);
		var overlays = data.overlays;
		if(RESET_TYPE_RESET == reset_type){
			var data_old = _this._data_o;
			data = $.extend(true, {}, data_old);
			data.overlays = overlays;
			_this._data = data;
		}else{
			var zoom = data.zoom,
				zoom_add = zoom - 1;

			var pos = $mirror.position();
			var pos_o_drag = $mirror.data('pos_o_drag') || {left: 0, top: 0};

			var origin_o = $mirror.data('origin_o');
			var origin = origin_o && RESET_TYPE_DRAG == reset_type?origin_o : $mirror.css('transform-origin'),
				origin_arr = origin.split(/\s+/),
				origin_x = parseFloat(origin_arr[0]),
				origin_y = parseFloat(origin_arr[1]);
			var translat_x = translat_y = 0;
			if(RESET_TYPE_DRAG == reset_type){ // 排除transform:scale()对position的影响
				var pos_x = pos.left + pos_o_drag.left,
					pos_y = pos.top + pos_o_drag.top;
				translat_x = pos_x - origin_x*zoom_add;
				translat_y = pos_y - origin_y*zoom_add;
				$mirror.data('pos_o_drag', {left: pos_x, top: pos_y});
			}else{
				translat_x = pos.left;
				translat_y = pos.top;
				$mirror.data('origin_o', origin);
			}
			
			data.translat = [data.width/2*zoom + translat_x, data.height/2*zoom + translat_y];
		}
		var $container = $(_this.conf.container);
		var points_mask = [],
			shapes_weather = [];

		canvas.dispose();
		canvas = _this.canvas = Zrender.init($container.get(0));
		$.each(overlays, function(i, v){
			var shape = v.draw(_this);
			if(shape.zlevel == ZINDEX_MAP){
				points_mask.push(shape.style.pointList);
				canvas.addShape(shape);
			}else{
				shapes_weather.push(shape);
			}	
		});
		// Timer.start('reset addMask');
		_this.addMask(points_mask);
		// Timer.end('reset addMask');
		$.each(shapes_weather, function(i, v){
			canvas.addShape(v);
		});
		canvas.render();
		// $mirror.fadeOut(function(){
			_init_mirror.call(_this);
		// });
	}
	function addGeoPolygon(coordinates,options){
		if(options){
			options.zlevel = ZINDEX_MAP;
		}
		var shapes = [];
		var gm = this;
		var scale = options.scale || 1;
		$.each(coordinates, function(i,v){
			var points = [];
			$.each(v,function(v_i,v_v){
				points.push(new GeoMap.Point(v_v[0]/scale,v_v[1]/scale));
			});
			var polygon = new GeoMap.Polygon(points, options);
		
			polygon.points = points;
			shapes.push(polygon);
			gm.addOverlay(polygon, 200*Math.random());
		});
		return shapes;
	}
	function callback_loaedGeo(loadedData,options,callback_after_render_geo){
		Timer.start('render geo');
		var gm = this;
		var data = loadedData.shift();
		$.each(loadedData,function(i,v){
			data.features = data.features.concat(v.features);
			var srcSize = data.srcSize,
				newSrcSize = v.srcSize;
			
			var left1 = srcSize.left,
				top1 = srcSize.top,
				width1 = srcSize.width,
				height1 = srcSize.height;
			var left2 = newSrcSize.left,
				top2 = newSrcSize.top,
				width2 = newSrcSize.width,
				height2 = newSrcSize.height;
			
			var newss = {
				left: Math.min(left1,left2),
				top: Math.max(top1,top2)
			};
			var r = Math.max(left1+width1,left2+width2),
				b = Math.min(top1+height1,top2+height2);
			newss.width = r - newss.left;
			newss.height = newss.top - b;
			data.srcSize = newss;
		});
		var shapes = [];

		$.each(data.features,function(i,v){
			var type = v.type;
			if('Feature' == type){
				var geometry = v.geometry;
				var type_geometry = geometry.type;

				var prop = v.properties;
				var options = {
					enname: v.id,
					properties: prop,
					// style: {
					// 	// text: v.properties.name,
					// 	// color: '#F5F3F0'
					// },
					zlevel: ZINDEX_MAP,
					style: {
						// strokeColor: '#ff0000',
						lineWidth: 0.5,
						// shadowBlur: 10,
						// shadowColor: '#000',
						// shadowOffsetY: 2,
						// shadowOffsetX: 2
					}
				}


				var cname = prop.cname,
					cp = prop.cp;
				if(cname && cp){
					gm.addOverlay(new GeoMap.Text(cname, 'font-size:14px;', null, {
						pos: {
							x: cp[0],
							y: cp[1]
						},
						zlevel: ZINDEX_MAP_TEXT,
						textAlign: 'center'
					}));
				}
				if('Polygon' == type_geometry ){
					shapes.push(addGeoPolygon.call(gm,geometry.coordinates,options));
				}else if('MultiPolygon' == type_geometry){
					$.each(geometry.coordinates,function(v_i,v_v){
						// if(v_i > 0){
						// 	delete options.style.text;
						// }
						shapes.push(addGeoPolygon.call(gm,v_v,options));
					});
				}else{
					Logger.log(v,type_geometry);
				}
			}
		});
		Timer.end('render geo');
		var points = [];
		$.each(shapes,function(i,v){
			$.each(v,function(v_i,v_v){
				points.push(v_v.shape.style.pointList);
			});
		});
		gm.addMask(points, options);
		$.isFunction(callback_after_render_geo) && callback_after_render_geo(points);
	}
	GeoMapProp.loadGeo = function(src,options,callback_after_render_geo){
		var _this = this;
		if(!$.isArray(src)){
			src = [src];
		}
		var loadedData = [],
			len = src.length;
		Timer.start('loadGeo');
		$.each(src,function(i, v){
			_this.jsonLoader(v, function(data){
				loadedData.push(data);
				if(loadedData.length == len){
					Timer.end('loadGeo');
					Timer.start('add weather layers');
					callback_loaedGeo.call(_this,loadedData,options,callback_after_render_geo);
					Timer.end('add weather layers');
					Timer.start('init mirror');
					_init_mirror.call(_this);
					Timer.end('init mirror');
					var onInitedLayers = _this.conf.onInitedLayers;
					onInitedLayers && onInitedLayers(); // 所有初始化完成时触发
				}
			});
		});
	};
	GeoMapProp.addOverlay = function(overlay){
		var _this = this;
		clearTimeout(_this._ttaddoverlay);
		var shape = overlay.draw(this);
		_this._data.overlays.push(overlay);
		_this.canvas.addShape(shape);
		_this._ttaddoverlay = setTimeout(function(){
			_this.canvas.render();
			// _this.refresh();
			_this.emit('afteraddoverlays');
		}, 10);
		return shape;
	}
	/*清除所有天气图层*/
	GeoMapProp.clearLayers = function(zindex){
		var _this = this;
		var canvas = _this.canvas;
		var overlays = _this._data.overlays;
		var new_overlays = [];
		var temp_layer;
		while(temp_layer = overlays.shift()){
			var shape = temp_layer.shape;
			var zlevel = shape.zlevel;
			var is_dele = false;
			if(zindex){
				if(zindex == zlevel){
					is_dele = true;
				}
			}else{
				if(zlevel == ZINDEX_LAYER || zlevel == ZINDEX_NO_CLIP){
					is_dele = true;
				}
			}
			if(is_dele){
				canvas.delShape(shape.id);
			}else{
				new_overlays.push(temp_layer);
			}			
		}

		canvas.refresh();
		_this._data.overlays = new_overlays;
		this.refresh();
	}
	/*对外提供刷新接口*/
	GeoMapProp.refresh = function(){
		_init_mirror.call(this);
	}
	var pointToOverlayPixel = GeoMapProp.pointToOverlayPixel = function(point){
		var _this = this;
		var p = point;
		var point = _this.projector.project({x: point.lng,y: point.lat});
		var data = _this._data;
		var center = data.center;
		var scale = data.scale;
		var width = data.width,
			height = data.height,
			zoom = data.zoom,
			translat = data.translat;
		return {
			x: (point.x - center.x)*scale*zoom + translat[0],
			y: (center.y - point.y)*scale*zoom + translat[1]//这里出来的数据暂时有一个整体偏移,(-20保证多个图例时不遮挡地图)
		}
	}
    function _doclip(ctx){
		var polygons = this.polygons;
		if($.isArray(polygons)){
			ctx.save();
			ctx.beginPath();
			$.each(polygons, function(i_polygon, pointList){
				if (pointList.length < 2) {
	                // 少于2个点就不画了~
	                return;
	            }
	            ctx.moveTo(pointList[0][0], pointList[0][1]);
	            for (var i = 1, l = pointList.length; i < l; i++) {
	                ctx.lineTo(pointList[i][0], pointList[i][1]);
	            }
	            ctx.lineTo(pointList[0][0], pointList[0][1]);
			});
			ctx.closePath();
			ctx.clip();
		}
    }
	GeoMapProp.addMask = function(polygons){
		// Timer.start('addMask');
		if(!polygons || polygons.length == 0){
			polygons = this.polygons;
		}else{
			this.polygons = polygons;
		}
		if(!polygons){
			return;
		}
		var ctx = this.canvas.painter.getLayer(ZINDEX_LAYER).ctx;
		_doclip.call(this,ctx);

		// Timer.end('addMask');
	}
	
	function _createDom(id, type, painter) {
        var newDom = document.createElement(type);
        var width = painter._width;
        var height = painter._height;

        // 没append呢，请原谅我这样写，清晰~
        newDom.style.position = 'absolute';
        newDom.style.left = 0;
        newDom.style.top = 0;
        newDom.style.width = width + 'px';
        newDom.style.height = height + 'px';
        newDom.setAttribute('width', width * devicePixelRatio);
        newDom.setAttribute('height', height * devicePixelRatio);

        return newDom;
    }
    function _drawShape(ctx, shape){
    	if (!shape.invisible) {
            if (!shape.onbrush // 没有onbrush
                // 有onbrush并且调用执行返回false或undefined则继续粉刷
                || (shape.onbrush && !shape.onbrush(ctx, false))
            ) {
                shape.brush(ctx, false, self.updatePainter);
            }
        }
    }
    var core_color = Core.Color,
    	toRGB = core_color.toRGB,
    	toHTML = core_color.toHTML;
    /*得到绘制好的图片*/
	GeoMapProp.toDataURL = function(conf){
		var _this = this;
		var painter = _this.canvas.painter;
		var width = painter._width;
        var height = painter._height;
		var maskImageDom = _createDom('mask-image', 'canvas', painter);
		var ctx = maskImageDom.getContext('2d');
	    devicePixelRatio != 1 && ctx.scale(devicePixelRatio, devicePixelRatio);

	    _doclip.call(_this,ctx);
	    var shapeList = _this.canvas.storage.getShapeList();
	    var noclipShapes = [];
	    $.each(shapeList, function(i, shape){
	    	if(shape.zlevel == ZINDEX_LAYER){
	    		_drawShape(ctx, shape);
	    	}else{
	    		noclipShapes.push(shape);
	    	}
	    });
	    var layer_data = maskImageDom.toDataURL();


	    var canvas_new = _createDom('c_new', 'canvas', painter);
		var ctx_new = canvas_new.getContext('2d');
	    devicePixelRatio != 1 && ctx_new.scale(devicePixelRatio, devicePixelRatio);
	    
	    if(conf){
	    	var bgimg = conf.bgimg;
	    	if(bgimg){
	    		ctx_new.drawImage(bgimg, 0, 0);
	    	}else{
	    		/*对透明做默认填色处理*/
		        var backgroundColor = conf.bgcolor || '#ffffff';
		        ctx_new.fillStyle = backgroundColor;
		        ctx_new.fillRect(0, 0, width, height);
	    	}
	    }
	    ctx_new.drawImage(maskImageDom, 0, 0);

	    $.each(noclipShapes, function(i, shape){
	    	_drawShape(ctx_new, shape);
	    });
        var img_data = canvas_new.toDataURL(null, backgroundColor);
        maskImageDom = null;
        ctx_new = null;
        return img_data;
	}
	var GeoMapText = function(options){
		TextShape.call(this, options);
	}
	// 格式化文字，主要用在多行显示文本
	function _formatText(text, width, font){
		var getWidth = util_area.getTextWidth;
		if(width > 0 && getWidth(text, font) > width){
			var text_new = '';
			var str_tmp = '';
			for(var i = 0, j = text.length; i<j; i++){
				var tmp = str_tmp + text[i];
				if(getWidth(tmp, font) < width){
					str_tmp = tmp;
				}else{
					text_new += str_tmp + '\n';
					str_tmp = text[i];
				}
			}
			text_new += str_tmp;
			return text_new;
		}
		return text;
	}
	GeoMapText.prototype = {
		type: 'gmtext',
		brush: function(ctx, isHighlight){
			var style = this.style;
			var bgcolor = style.backgroundColor;
			style.text = _formatText(style.text, style.width, style.textFont);
			var rect = this.getRect(style);
			var x = rect.x,
				y = rect.y,
				width = rect.width,
				height = rect.height;
			var lineHeight = util_area.getTextHeight('国', style.textFont);

			ctx.save();	
			if(bgcolor){
				ctx.fillStyle = bgcolor;
				
				
				var w = width, 
					h = Math.max(height, lineHeight);
				var padding = style.padding;
				if(padding){
					// y -= padding[0];
					w += padding[1] + padding[3];
					h += padding[0] + padding[2];
					// x -= padding[3]
				}
				h += 3;
				ctx.fillRect(x, y, w, h);
			}
			var textDecoration = style.textDecoration;
			if(textDecoration){
				var _scale = lineHeight/30;
				ctx.lineWidth = 0.5 * _scale;
				ctx.strokeStyle = style.color;
				if(textDecoration.indexOf('underline') > -1){
					var h = y + height + 2 * _scale;
					ctx.moveTo(x, h);
                    ctx.lineTo(x + width, h);
				}
				ctx.stroke();
				if(textDecoration.indexOf('line-through') > -1){
					var h = y + height/2 + 3 * _scale;
					ctx.moveTo(x, h);
                    ctx.lineTo(x + width, h);
				}
				ctx.stroke();
			}
			ctx.restore();

			var flag = TextShape.prototype.brush.call(this, ctx, isHighlight);
			this.drawCityFlag(ctx);
			return flag;
		},
		drawCityFlag: function (ctx) { //画城市标记
            var style = this.style;
            if(this.zlevel == ZINDEX_MAP_TEXT && style.color != COLOR_TRANSPARENT){
            	ctx.save();
            	ctx.fillStyle = '#B4312E';
            	ctx.beginPath();
				ctx.arc(style.x, style.y, 2, 0, Math.PI*2, true);
				ctx.closePath();
				ctx.fill();
				ctx.restore();
            }
        }
	}
	util.inherits(GeoMapText, TextShape);

	GeoMap.Marker = function(lng, lat, options){
		this.point = new GeoMap.Point(lng, lat);
		this.shape = new Circle($.extend({
			style: {
				color: 'rgba(0, 0, 255, 1)'
			}
		}, options));
	}
	GeoMap.Marker.prototype.draw = function(map){
		var pixel = map.pointToOverlayPixel(this.point);
		var style = this.shape.style;
		style.x = pixel.x;
		style.y = pixel.y;
		style.r = 4;
		return this.shape;
	}
	var GeoMapPolyline = function(options, special_options){
		BrokenLine.call(this, options);
		this.special_options = special_options;
	}
	GeoMapPolyline.prototype = {
		type: 'gmpolyline',
		brush: function(ctx, isHighlight){
			var _this = this;
			BrokenLine.prototype.brush.call(_this, ctx, isHighlight);
			var special_options = _this.special_options;
			var code = special_options.code;
			if(code && code == 2 || code == 3 || code == 38){
				var _width = special_options.width, 
					_space_point = special_options.space_point;
				var _width2 = Math.pow(_width, 2); //减少距离开方运算
				var style = _this.style;
				var pointList = style.pointList;
				var color = style.color || style.strokeColor;
				ctx.save();
				ctx.fillStyle = color;
				ctx.strokeStyle = color;
				var start_point, mid_points = [], end_point;
				if(code == 38){	//霜冻线
					for(var i = _space_point, j = pointList.length; i < j; i+=_space_point){
						var start = pointList[i],
							end = pointList[i+1];
						if(start && end){
							var x1 = start[0], y1 = start[1],
								x2 = end[0], y2 = end[1];
							if(x1 != x2){
								var radiu = Math.atan((y2 - y1)/(x2 - x1));
								if(x1 < x2){
									radiu += Math.PI;
								}
								// radiu -=  Math.PI/2;
								var x_mid = x1 + (x2 - x1)/2,
									y_mid = y1 + (y2 - y1)/2;
								var y = y_mid + _width * Math.cos(radiu),
									x = x_mid - _width * Math.sin(radiu);
								// if(i == _space_point){
								// 	ctx.beginPath();
								// 	// ctx.arc(x, y, 3, 0, Math.PI*2, true);
								// 	ctx.arc(x1, y1, 3, 0, Math.PI*2, true);
								// 	// ctx.arc(x2, y2, 3, 0, Math.PI*2, true);
								// 	ctx.closePath();
								// 	ctx.fill();
								// }

								ctx.moveTo(x_mid, y_mid);
								ctx.lineTo(x, y);
								ctx.stroke();
							}
						}
						
					}
				}else{
					for(var i = _space_point, j = pointList.length; i < j; i++){
						var p = pointList[i];
						if(!start_point){
							start_point = p;
						}else{
							var dis = Math.pow(p[0] - start_point[0], 2) + Math.pow(p[1] - start_point[1], 2);
							if(dis >= _width2){
								if(dis == _width2){
									end_point = p;
								}else{
									if(mid_points.length > 0){
										var p_prev = mid_points[mid_points.length-1];
										var x1 = p_prev[0], y1 = p_prev[1],
											x2 = p[0], y2 = p[1],
											x0 = start_point[0], y0 = start_point[1];

										if(x1 == x2){
											var x = x1;
											var y = Math.sqrt(_width2 - Math.pow(x0 - x, 2));
											var min_y = Math.min(y1, y2),
												max_y = Math.max(y1, y2);
											if(y >= min_y && y <= max_y){
												end_point = [x, y];
											}else{
												end_point = [x, -y];
											}
										}else{
											var k = (y1 - y2)/(x1 - x2),
												b = (x1*y2 - x2*y1)/(x1 - x2);
											var A = 1 + k*k,
												B = 2*k*b - 2*x0 - 2*k*y0,
												C = x0*x0 + y0*y0 + b*b - 2*b*y0 - _width2;
											var a1 = -B/(2*A),
												a2 = Math.sqrt(B*B - 4*A*C)/(2*A);
											// console.log('x1 = '+x1, 'y1 = '+y1, 'x2 = '+x2, 'y2 = '+y2, 'x0 = '+x0, 'y0 = '+y0, 'k = '+k, 'b = '+b, 'x00 = '+((-B+Math.sqrt(B*B-4*A*C))/2*A), 'x01 = '+((-B-Math.sqrt(B*B-4*A*C))/2*A));
											if(a2){
												var min_x = Math.min(x1, x2),
													max_x = Math.max(x1, x2);
												var x = a1 + a2;
												if(x < min_x || x > max_x){
													x = a1 - a2;
												}
												end_point = [x, k*x+b];
											}else{
												mid_points.push(p);
											}
										}
									}else{
										var x1 = start_point[0], y1 = start_point[1],
											x2 = p[0], y2 = p[1];
										if(x1 == x2){
											end_point = [x1, y1 + _width];
										}else{
											var radiu = Math.atan((y2 - y1)/(x2 - x1));
											end_point = [x1 - _width*Math.sin(radiu), y1 - Math.cos(radiu)];
										}
									}
								}
							}else{
								mid_points.push(p);
							}
							if(start_point && end_point){
								// 画标识
								ctx.beginPath();
								ctx.moveTo(start_point[0], start_point[1]);
								for(var i_p = 0, j_p = mid_points.length; i_p<j_p; i_p++){
									var p = mid_points[i_p];
									ctx.lineTo(p[0], p[1]);
								}
								var x1 = start_point[0], y1 = start_point[1],
									x2 = end_point[0], y2 = end_point[1];

								if(code == 2){	//冷锋
									if(x1 == x2){
										var to_point = [x1 - _width, y1 + (y2 - y1)/2];
									}else{
										var radiu = -Math.atan((y2 - y1)/(x2 - x1));
										var w = _width * Math.sin(Math.PI/4);
										radiu = Math.PI/4 - radiu;
										var x = x1 + (w * Math.cos(radiu)),
											y = y1 + (w * Math.sin(radiu));
										var to_point = [x, y];
									}

									ctx.lineTo(to_point[0], to_point[1]);
								}else if(code == 3){ //暖锋
									var radiu = x2 == x1? 0 : Math.atan((y2 - y1)/(x2 - x1));
									ctx.arc(x1 + (x2 - x1)/2, y1 + (y2 - y1)/2, _width/2, radiu, radiu + Math.PI, true);
								}
								ctx.closePath();
								ctx.fill();
								start_point = end_point = null;
								mid_points = [];
								i += _space_point;
							}
						}
					}
				}
				ctx.restore();
			}
		}
	}
	util.inherits(GeoMapPolyline, BrokenLine);

	GeoMap.Point = function(lng,lat){
		this.lng = lng;
		this.lat = lat;
	}
	GeoMap.Polygon = function(Points,options){
		this.points = Points;
		this.shape = new Polygon($.extend(true,{
			style: {
				brushType : 'both',
		        lineWidth : 1,
		        strokeColor : '#3D534E',
		        color: COLOR_TRANSPARENT,
		        textColor: 'black',
		        textFont: '12px "Microsoft Yahei"',
		        textPosition : 'inside'// default top
			},
			zlevel: ZINDEX_LAYER,
			needTransform: true,
			needLocalTransform: true,
			// hoverable: false
		},options));
	}
	function _drawPointList(map){
		var points = this.points;
		var pointList = [];
		$.each(points,function(i, v){
			var val = pointToOverlayPixel.call(map, v);
			pointList.push([val.x,val.y]);
		});
		this.shape.style.pointList = pointList;
	}
	GeoMap.Polygon.prototype.draw = function(map){
		_drawPointList.call(this,map);
		return this.shape;
	}
	GeoMap.Polyline = function(Points,	options, special_options){
		this.points = Points;
		this.shape = new GeoMapPolyline($.extend(true,{
			style: {
				brushType : 'both',
		        lineWidth : 1,
		        strokeColor : 'red',
			},
			zlevel: ZINDEX_LAYER,
			needTransform: true,
			needLocalTransform: true,
			hoverable: false
		},options), $.extend({width: 20, space_point: 10}, special_options));
	}
	GeoMap.Polyline.prototype.draw = function(map){
		_drawPointList.call(this, map);
		return this.shape;
	}
	GeoMap.Text = function(text, attr_style, padding, option){
		padding || (padding = [0, 0, 0, 0]);
		//设置字体及其它属性请参考： http://blog.csdn.net/u012545279/article/details/14521567
		var style_obj = {};
		if(attr_style){
			$.each(attr_style.split(';'),function(i,v){
				var arr = v.split(':');
				if(arr.length == 2){
					style_obj[arr[0].trim()] = arr[1].trim();
				}
			});
		}
		var style = {
			text: text,
			brushType : 'fill',
	        textAlign : style_obj['text-align'] || 'left',
	        textBaseline : 'top'
		};
		var width = style_obj.width;
		if(width){
			style.width = parseFloat(width);
		}
		var height = style_obj.height;
		if(height){
			style.height = parseFloat(height);
		}
		var left = style_obj.left;
		var top = style_obj.top;
		if(left){
			style.x = parseFloat(left);
		}
		if(style.textAlign == 'center'){
			style.x += (style.width || 0)/2;
		}
		if(top){
			style.y = parseFloat(top);
		}
		var color = style_obj.color;
		if(color){
			style.color = color;
			style.strokeColor = color;
		}
		var font = '';
		var font_style = style_obj['font-style'];
		if(font_style){
			font += ' '+font_style;
		}
		var font_weight = style_obj['font-weight'];
		if(font_weight){
			font += ' ' + font_weight;
		}
		var font_size = style_obj['font-size'];
		var line_height = style_obj['line-height'];
		if(line_height){
			style.lineHeight = parseFloat(line_height);
		}
		if(font_size){
			font += ' ' + font_size;
		}
		font += ' "Microsoft Yahei"';
		
		if(font){
			style.textFont = font;
		}
		var bgcolor = style_obj['background-color'];
		if(bgcolor && 'transparent' != bgcolor){
			style.backgroundColor = bgcolor;
		}
		style.padding = padding;
		var text_decoration = style_obj['text-decoration'];
		if(text_decoration){
			style.textDecoration = text_decoration;
		}

		var conf = {
			style: style,
			zlevel: ZINDEX_LAYER
		};
		if(width && height){
			var angle = option && option.angle;
			if(angle){
				conf.rotation = [angle/180*Math.PI, style.x + style.width/2, style.y + style.height/2];
			}
		}
		this.shape = new GeoMapText(conf);
		this.shape._option = option;
	}
	GeoMap.Text.prototype.draw = function(map){
		var shape = this.shape;
		var option = shape._option;
		if(option){
			if(!isNaN(option.zlevel)){
				shape.zlevel = option.zlevel;
			}
			if(option.pos){
				try{
					var pixel = map.pointToOverlayPixel(new GeoMap.Point(option.pos.x, option.pos.y));
					shape.style.x = pixel.x;
					shape.style.y = pixel.y;
				}catch(e){}
			}
			if(option.offset){
				shape.style.x += option.offset.x;
				shape.style.y += option.offset.y;
			}
			if(option.textAlign){
				shape.style.textAlign = option.textAlign;
			}
		}
		shape.map = map;
		return shape;
	}
	GeoMap.Image = function(src, x, y, width, height, rotate){
		var style = {
			image: src,
			x: x || 0,
			y: y || 0
		}
		if(width){
			style.width = width;
		}
		if(height){
			style.height = height;
		}
		var option = {
			style: style,
			zlevel: ZINDEX_LAYER
		}
		if(rotate && !isNaN(rotate)){
			var angle = rotate/180*Math.PI;
			option.rotation = [angle, x + width/2, y + height/2];
		}
		this.shape = new ImageShape(option);
	}
	GeoMap.Image.prototype.draw = function(map){
		return this.shape;
	}
	GeoMap.Rectangle = function(options){
		this.shape = new Rectangle($.extend(options,{
			zlevel: ZINDEX_LAYER,
		}));
	}
	GeoMap.Rectangle.prototype.draw = function(map){
		return this.shape;
	}

	// 定义画笔的特殊样式
	GeoMap.Pattern = {};
	// 斜条纹
	GeoMap.Pattern.Streak = function(options){
		options = $.extend({
			fillColor: 'white',
			lineCap: 'butt',
			strokeStyle: "green",
			repeat: 'repeat',
			space: 2,
		},options);

		var size = options.space * 3;
		if(size % 2 > 0){
			size += 1;
		}
		var m_size = size/2;
		var canvas_pattern = document.createElement('canvas');
		canvas_pattern.setAttribute('width',size);
		canvas_pattern.setAttribute('height',size);
		var ctx_pattern = canvas_pattern.getContext('2d');
		ctx_pattern.fillStyle = options.fillColor;
		ctx_pattern.fillRect(0,0,size,size);
		ctx_pattern.beginPath(); // 开始路径绘制
		ctx_pattern.moveTo(0, m_size); // 设置路径起点，坐标为(20,20)
		ctx_pattern.lineTo(m_size, 0); // 绘制一条到(200,20)的直线
		ctx_pattern.moveTo(m_size, size); // 设置路径起点，坐标为(20,20)
		ctx_pattern.lineTo(size, m_size); // 绘制一条到(200,20)的直线
		ctx_pattern.lineWidth = 1; // 设置线宽
		ctx_pattern.lineCap = options.lineCap;
		ctx_pattern.strokeStyle = options.strokeStyle; // 设置线的颜色
		ctx_pattern.stroke(); // 进行线的着色，这时整条线才变得可见
		ctx_pattern.closePath();

		var pat = ctx_pattern.createPattern(canvas_pattern,options.repeat);
		return pat;
	}
	GeoMap.Pattern.listence = function(options){
		var w = 100, h = 100,
			font = '16px "Microsoft Yahei"',
			text = '蓝π蚂蚁',
			color = '#000000';

		if(options){
			w = options.width || w;
			h = options.width || h;
			font = options.font || font;
			text = options.text || text;
			color = options.color || color;
		}
		var h2 = h/2, w2 = w/2;

		
		var canvas_pattern = document.createElement('canvas');
		document.body.appendChild(canvas_pattern);
		canvas_pattern.setAttribute('width', w);
		canvas_pattern.setAttribute('height', h);

		var ctx_pattern = canvas_pattern.getContext('2d');
		ctx_pattern.translate(w2, h2);
		ctx_pattern.rotate(-Math.PI/4);
		ctx_pattern.translate(-w2, -h2);
		ctx_pattern.font = font;
		ctx_pattern.textBaseline = 'middle';
		ctx_pattern.textAlign = 'center';
		ctx_pattern.fillStyle = color;
		ctx_pattern.fillText(text, w2, h2);

		var pat = ctx_pattern.createPattern(canvas_pattern, 'repeat');
		return pat;
	}
	return GeoMap
});