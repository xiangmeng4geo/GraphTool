define('GeoMap',['zrender',
	'zrender/shape/Base',
	'zrender/shape/Polygon',
	'zrender/shape/BrokenLine',
	'zrender/tool/util',
	'zrender/shape/Text',
	'zrender/shape/Image',
	'zrender/shape/Rectangle',
	'zrender/tool/area'],function(Zrender,Base,Polygon,BrokenLine,util,TextShape,ImageShape,Rectangle,util_area){

	var Logger = Core.util.Logger,
		Timer = Logger.Timer;

	var ZINDEX_MAP = 2,
		ZINDEX_LAYER = 1,
		ZINDEX_NO_CLIP = 0;

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
				var lng = lnglat.x;
				var lat = lnglat.y;
				var cache_name = lng+'_'+lat;
				var cache_val = Mercator_cache_lnglat[cache_name];
				if(cache_val){
					return cache_val;
				}
				var x = lng * MERCATOR_RATIO;
				var y = Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180);
				y = y * MERCATOR_RATIO;
				var val = {x: x/px,y: y/px};
				Mercator_cache_lnglat[cache_name] = val;
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
		        project: function(latlng) {
		            var theta = n * (pv.radians(latlng.x) - lng0),
		                p = Math.sqrt(C - 2*n*Math.sin(pv.radians(latlng.y))) / n;
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

		if(conf.mirror){
			_this.mirror = $('<img class="geomap_mirror" draggable=false>').appendTo(container.parent());
		}
	}
	
	function _init_mirror(){
		var _this = this;
		var img_data = _this.toDataURL({
			bgcolor: 'rgba(0,0,0,0)'
		});
		var data = _this._data;
		var mirror = _this.mirror;
		mirror.attr('src', img_data).css({
			left: 0,
			top: 0,
			'transform-origin': (data.width/2)+'px '+(data.height/2)+'px',
			'transform': 'scale(1)'
		}).show();
		$(_this.conf.container).addClass('mirror');
	}
	var GeoMap = function(conf){
		var _this = this;
		_this.projector = conf.projector == 'mercator'? Mercator: Albers;
		_this.conf = conf = $.extend({},default_conf,conf);
		_this.canvas = Zrender.init($(conf.container).get(0));
		_this.jsonLoader = conf.jsonLoader || $.getJSON;
		_init_geomap.call(_this);
	};
	GeoMap.PROJECT_MERCATOR = 'mercator';
	GeoMap.PROJECT_ALBERS = 'albers';
	GeoMap.ZLEVEL = {
		MAP: ZINDEX_MAP,
		LAYER: ZINDEX_LAYER,
		NOCLIP: ZINDEX_NO_CLIP
	};
	var GeoMapProp = GeoMap.prototype;
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
		gm.addMask(points_mask, {
			'is_lnglat': false
		});
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
		var is_not_lnglat = !options.is_lnglat;
		var scale = options.scale || 1;
		$.each(coordinates, function(i,v){
			var points = [];
			$.each(v,function(v_i,v_v){
				points.push(new GeoMap.Point(v_v[0]/scale,v_v[1]/scale, is_not_lnglat));
			});
			var polygon = new GeoMap.Polygon(points, options);
			// polygon.draw(gm);
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
		var is_lnglat = !data.projector;
		var scale = data.scale;

		$.each(data.features,function(i,v){
			var type = v.type;
			if('Feature' == type){
				var geometry = v.geometry;
				var type_geometry = geometry.type;
				var options = {
					enname: v.id,
					properties: v.properties,
					style: {
						text: v.properties.name,
						// color: '#F5F3F0'
					},
					zlevel: ZINDEX_MAP,
					is_lnglat: is_lnglat,
					scale: scale
				}

				if('Polygon' == type_geometry ){
					shapes.push(addGeoPolygon.call(gm,geometry.coordinates,options));
				}else if('MultiPolygon' == type_geometry){
					$.each(geometry.coordinates,function(v_i,v_v){
						if(v_i > 0){
							delete options.style.text;
						}
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
		gm.addMask(points, $.extend(true,{
			'is_lnglat': false
		},options));

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
	GeoMapProp.addOverlay = function(overlay, delay){
		var _this = this;
		var shape = overlay.draw(this);
		_this._data.overlays.push(overlay);
		delay || (delay = 0);
		// setTimeout(function(){
			_this.canvas.addShape(shape);
		
			_this.canvas.render();
		// }, delay);

		return shape;
	}
	/*清除所有天气图层*/
	GeoMapProp.clearLayers = function(){
		var _this = this;
		var canvas = _this.canvas;
		var overlays = _this._data.overlays;
		var new_overlays = [];
		var temp_layer;
		while(temp_layer = overlays.shift()){
			var shape = temp_layer.shape;
			if(shape.zlevel != ZINDEX_MAP){
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
		var is_lnglat = point.is_lnglat;
		point = {x: point.lng,y: point.lat};
		if(is_lnglat){
			point = this.projector.project(point);
		}

		var _this = this;
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
		Timer.start('addMask');
		if(!polygons){
			polygons = this.polygons;
		}else{
			this.polygons = polygons;
		}
		if(!polygons){
			return;
		}
		var ctx = this.canvas.painter.getLayer(ZINDEX_LAYER).ctx;
		_doclip.call(this,ctx);

		Timer.end('addMask');
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


	    maskImageDom = _createDom('mask-image', 'canvas', painter);
		ctx = maskImageDom.getContext('2d');
	    devicePixelRatio != 1 && ctx.scale(devicePixelRatio, devicePixelRatio);
	    
	    if(conf){
	    	var bgimg = conf.bgimg;
	    	if(bgimg){
	    		ctx.drawImage(bgimg, 0, 0);
	    	}else{
	    		/*对透明做默认填色处理*/
		        var backgroundColor = conf.bgcolor || '#ffffff';
		        ctx.fillStyle = backgroundColor;
		        ctx.fillRect(0, 0, width, height);
	    	}
	    }
	    var img = new Image();
	    img.src = layer_data;
	    ctx.drawImage(img, 0, 0);

	    $.each(noclipShapes, function(i, shape){
	    	_drawShape(ctx, shape);
	    });

        var img_data = maskImageDom.toDataURL(null, backgroundColor);
        maskImageDom = null;
        ctx = null;
        return img_data;
	}

	var GeoMapText = function(options){
		TextShape.call(this, options);
	}
	GeoMapText.prototype = {
		type: 'gmtext',
		brush: function(ctx, isHighlight){
			var style = this.style;
			var bgcolor = style.backgroundColor;
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
			TextShape.prototype.brush.call(this, ctx, isHighlight);
		}
	}
	util.inherits(GeoMapText, TextShape);

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
				if(pointList[0][0] > pointList[pointList.length-1][0]){
					pointList.reverse();
				}
				if(code == 38){	//霜冻线
					for(var i = _space_point, j = pointList.length; i < j; i+=_space_point){
						var start = pointList[i],
							end = pointList[i+1];
						if(start && end){
							var x1 = start[0], y1 = start[1],
								x2 = end[0], y2 = end[1];
							if(x1 != x2){
								var radiu = Math.atan((y2 - y1)/(x2 - x1)) + Math.PI;
								if(x1 < x2){
									radiu += Math.PI;
								}
								var x_mid = x1 + (x2 - x1)/2,
									y_mid = y1 + (y2 - y1)/2;
								var y = y_mid - _width * Math.cos(radiu),
									x = x_mid + _width * Math.sin(radiu);
								// ctx.beginPath();
								// ctx.arc(x, y, 3, 0, Math.PI*2, true);
								// ctx.arc(x1, y1, 3, 0, Math.PI*2, true);
								// ctx.arc(x2, y2, 3, 0, Math.PI*2, true);
								// ctx.closePath();
								// ctx.fill();
								ctx.moveTo(x_mid, y_mid);
								ctx.lineTo(x, y);
								ctx.stroke();
							}
						}
						
					}
					return;
				}
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
				ctx.restore();
			}
		}
	}
	util.inherits(GeoMapPolyline, BrokenLine);

	GeoMap.Point = function(lng,lat,is_not_lnglat){
		this.lng = lng;
		this.lat = lat;
		this.is_lnglat = !is_not_lnglat;
	}
	GeoMap.Polygon = function(Points,options){
		this.points = Points;
		this.shape = new Polygon($.extend(true,{
			style: {
				brushType : 'both',
		        lineWidth : 1,
		        strokeColor : '#3D534E',
		        color: 'rgba(0,0,0,0)',
		        textColor: 'black',
		        textFont: '12px "Microsoft Yahei"',
		        textPosition : 'inside'// default top
			},
			zlevel: ZINDEX_LAYER,
			needTransform: true,
			needLocalTransform: true,
			hoverable: false
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
	        textAlign : 'left',
	        textBaseline : 'top'
		};
		var left = style_obj.left;
		var top = style_obj.top;
		if(left){
			style.x = parseFloat(left);
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
		this.shape = new GeoMapText({
			style: style,
			zlevel: ZINDEX_LAYER
		});
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
		}
		return shape;
	}
	GeoMap.Image = function(src,x,y,width,height){
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
		this.shape = new ImageShape({
			style: style,
			zlevel: ZINDEX_LAYER
		});
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
	// 渲染插值后的结果
	/*格点数组
	[
		{x: pixel_x, y: pixel_y, rgba: pixel_rgba}
	]
	*/
	var GeoMapInterpolation = function(){
		Base.call(this, {
			zlevel: ZINDEX_LAYER
		});
	}
	//双线性插值
	function _get_pixel_color(x, y, pixel00, pixel10, pixel01, pixel11){
        var x1 = pixel00.x,
            x2 = pixel10.x,
            y1 = pixel00.y,
            y2 = pixel01.y;

        // http://zh.wikipedia.org/wiki/%E5%8F%8C%E7%BA%BF%E6%80%A7%E6%8F%92%E5%80%BC
        var denominator = (x2 - x1)*(y2 - y1)
        var p1 = (x2 - x)*(y2 - y)/denominator,
            p2 = (x - x1)*(y2 - y)/ denominator,
            p3 = (x2 - x)*(y - y1)/denominator,
            p4 = (x - x1)*(y - y1)/denominator;


        var arr = [];
        for(var i = 0; i < 4; i++){
            var v00 = pixel00.color[i],
                v01 = pixel01.color[i],
                v10 = pixel10.color[i],
                v11 = pixel11.color[i];
            var v = v00 * p1 + v10 * p2 + v01 * p3 + v11 * p4;
            arr.push(v);
        }
        return arr;
    }
    // 用idw插值
    var idw_e = 2;
    function _get_pixel_color1(x, y, pixel00, pixel10, pixel01, pixel11){
    	var arr = [].slice.call(arguments, 2);
    	var dis_arr = [],
    		dis_sum = 0;
    	for(var i = 0, j = arr.length; i < j; i++){
    		var point = arr[i];
    		var dis = Math.pow(point.x - x, 2) + Math.pow(point.y - x, 2);
    		if(dis == 0){
    			return point.color;
    		}
    		var v = 1/dis; //当距离幂为二时直接得到距离的平方
    		dis_arr.push(v);
    		dis_sum += v;
    	}
    	var result_color = [0, 0, 0, 0];
    	for(var i = 0, j = arr.length; i < j; i++){
    		var persent = dis_arr[i]/dis_sum;
    		var color = arr[i].color;
    		for(var c_i = 0; c_i < 4;c_i++){
    			result_color[c_i] += color[c_i] * persent;
    		}
    	}
    	return result_color;
    }
	GeoMapInterpolation.prototype = {
		type: 'mask',
		setData: function(interpolationArr, c_width, c_height){
			var _this = this;
			_this.interpolationArr = interpolationArr;
			_this.c_width = c_width;
			_this.c_height = c_height;
		},
		brush: function(ctx, isHighlight){
			var _this = this;
			var pixel_arr = _this.interpolationArr;
			var width, height;

			try{
				width = pixel_arr.length;
				height = pixel_arr[0].length;
			}catch(e){}
			if(width > 0 && height > 0){
				var pixel_x_start = pixel_arr[0][0].x,//左下点
	                pixel_y_start = pixel_arr[0][0].y,
	                last_pixel = pixel_arr[width - 1][height - 1],
	                pixel_x_end = last_pixel.x,
	                pixel_y_end = last_pixel.y,
	                space_pixel_x = pixel_arr[0][1].x - pixel_x_start,
	                space_pixel_y = pixel_arr[1][0].y - pixel_y_start;

	            var c_width = _this.c_width,
	            	c_height = _this.c_height;

	            var interpolationCanvas = _createDom('interpolation-image', 'canvas', {
	            	_width: c_width, 
	            	_height: c_height
	            });
				var ctx_interpolat = interpolationCanvas.getContext('2d');
			    devicePixelRatio != 1 && ctx_interpolat.scale(devicePixelRatio, devicePixelRatio);

				var imagedata = ctx_interpolat.createImageData(c_width, c_height),
	                _data = imagedata.data;

	            function _get_pixel(x, y){
	                try{
	                    var pixel = pixel_arr[x][y];
	                    if(pixel){
	                        return pixel;
	                    }
	                }catch(e){}

	                return {
	                    x: pixel_x_start + x*space_pixel_x, 
	                    y: pixel_y_start + y*space_pixel_y, 
	                    // color: [0, 0, 0, 0]
	                    color: [255, 0, 255, 255]
	                }
	            }

			    var _set_rgba = function(x, y, color){
			    	if(x >= 0 && y>=0){
				        var index = (y * c_width + x)*4;
				        _data[index] = color[0];
				        _data[index + 1] = color[1];
				        _data[index + 2] = color[2];
				        _data[index + 3] = color[3];
			        }
			    }
	            for(var i = 0; i < width; i++){
	                for(var j = 0; j< height; j++){
	                    var pixel00 = _get_pixel(i, j);
	                    var pixel10 = _get_pixel(i+1, j);
	                    var pixel01 = _get_pixel(i, j+1);
	                    var pixel11 = _get_pixel(i+1, j+1);
	                    var x_arr = [pixel00.x, pixel10.x, pixel01.x, pixel11.x],
	                    	y_arr = [pixel00.y, pixel10.y, pixel01.y, pixel11.y];

	                    var x_min = Math.floor(Math.min.apply(Math, x_arr)),
	                    	x_max = Math.ceil(Math.max.apply(Math, x_arr)),
	                    	y_min = Math.floor(Math.min.apply(Math, y_arr)),
	                    	y_max = Math.ceil(Math.max.apply(Math, y_arr));
	                    // console.log(x_min, x_max, y_min, y_max);
	                    for(var p_x = Math.floor(pixel00.x)+1, p_e_x = Math.ceil(pixel10.x); p_x < p_e_x && p_x <= pixel_x_end; p_x++){
	                        for(var p_y = Math.ceil(pixel00.y)+1, p_e_y = Math.floor(pixel01.y); p_y > p_e_y && p_y >= pixel_y_end; p_y--){
	                            var color = _get_pixel_color(p_x, p_y, pixel01, pixel11, pixel00, pixel10);
	                            // var color = _get_pixel_color(p_x, p_y, pixel01, pixel11, pixel00, pixel10);
	                            _set_rgba(p_x, p_y, color);
	                        }
	                    }
	                   	// for(var p_x = x_min, p_e_x = x_max; p_x < p_e_x && p_x <= pixel_x_end; p_x++){
	                    //     for(var p_y = y_min, p_e_y = y_max; p_y > p_e_y && p_y >= pixel_y_end; p_y--){
	                    //         var color = _get_pixel_color(p_x, p_y, pixel01, pixel11, pixel00, pixel10, _get_pixel(i-1, j), _get_pixel(i-1, j-1), _get_pixel(i, j-1));
	                    //         _set_rgba(p_x, p_y, color);
	                    //     }
	                    // }
	                }
	            }
	            ctx_interpolat.putImageData(imagedata, 0, 0);

	            _doclip.call(_this.gm, ctx);
	            ctx.drawImage(interpolationCanvas, 0, 0);
	            ctx.restore();
            }
		}
	}
	util.inherits(GeoMapInterpolation, Base);

	GeoMap.Interpolation = function(data){
		var _this = this;
		var _width, _height;
		try{
			_width = data.length;
			_height = data[0].length;
			var first = data[0][0],
				end = data[_width - 1][_height - 1];
			_this.data = {
				x0: first.x,
				y0: first.y,
				x1: end.x,
				y1: end.y,
				width: _width,
				height: _height,
				items: data
			};
		}catch(e){
			_this.data = {};
		}
		this.shape = new GeoMapInterpolation();
	}
	GeoMap.Interpolation.prototype.draw = function(map){
		var _this = this,
			data_conf = map._data,
			c_width = data_conf.width,
			c_height = data_conf.height,
			data = _this.data,
			_width = data.width,
			_height = data.height,
			_items = data.items,
			shape = _this.shape;
		var start_point = map.pointToOverlayPixel(new GeoMap.Point(data.x0, data.y0)),
			end_point = map.pointToOverlayPixel(new GeoMap.Point(data.x1, data.y1));
		var space_pixel_x = (end_point.x - start_point.x)/(_width - 1),
			space_pixel_y = (start_point.y - end_point.y)/(_height - 1);

		var new_data = [];
		for(var i = 0; i< _width; i++){
			var items = _items[i];
			var arr = [];
			for(var y = 0; y < _height; y++){
				var item = items[y];
				var pixel = map.pointToOverlayPixel(new GeoMap.Point(item.x, item.y));
				var x_pixel = pixel.x,
					y_pixel = pixel.y;
				// if(x_pixel > -space_pixel_x && x_pixel <= c_width && y_pixel > -space_pixel_y && y_pixel <= c_height){
					arr.push({
						lng: item.x,
						lat: item.y,
						x: x_pixel, 
						y: y_pixel,
						color: item.c
					});
				// }
			}
			new_data.push(arr);
		}
		shape.setData(new_data, c_width, c_height);
		shape.gm = map;
		return shape;
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
	return GeoMap
});