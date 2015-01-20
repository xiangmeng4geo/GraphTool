define('GeoMap',['zrender',
	'zrender/shape/Base',
	'zrender/shape/Polygon',
	'zrender/shape/BrokenLine',
	'zrender/tool/util',
	'zrender/shape/Text',
	'zrender/shape/Image'],function(Zrender,Base,Polygon,BrokenLine,util,TextShape,ImageShape){

	var Logger = Core.util.Logger,
		Timer = Logger.Timer;

	var ZINDEX_MAP = 2,
		ZINDEX_LAYER = 1;

	// retina 屏幕优化
    var devicePixelRatio = window.devicePixelRatio || 1;
    devicePixelRatio = Math.max(devicePixelRatio, 1);

    var radians = Math.PI / 180,
		degrees = 180 / Math.PI,
		px = 3800000;//转成px
	// px = 1;
	var Meractor = (function(){
		var MERACTOR_RATIO = 20037508.34/180;
		/*Web墨卡托坐标与WGS84坐标互转*/
		var Meractor_cache_lnglat = {};// 进行缓存，减小重复计算量
		return {
			name: 'meractor',
			project: function(lnglat){
				var lng = lnglat.x;
				var lat = lnglat.y;
				var cache_name = lng+'_'+lat;
				var cache_val = Meractor_cache_lnglat[cache_name];
				if(cache_val){
					return cache_val;
				}
				var x = lng * MERACTOR_RATIO;
				var y = Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180);
				y = y * MERACTOR_RATIO;
				var val = {x: x/px,y: y/px};
				Meractor_cache_lnglat[cache_name] = val;
				return val;
			},
			invert: function(mercator){
				var x = mercator.x/MERACTOR_RATIO;
				var y = mercator.y/MERACTOR_RATIO;
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

		if(conf.mirror){
			_this.mirror = $('<img class="geomap_mirror">').appendTo(container.parent());
		}
	}
	
	function _init_mirror(){
		Timer.start('init mirror');
		var _this = this;
		var img_data = _this.toDataURL({
			bgcolor: 'rgba(0,0,0,0)'
		});
		var data = _this._data;
		_this.mirror.attr('src', img_data).css({
			left: 0,
			top: 0,
			'transform-origin': (data.width/2)+'px '+(data.height/2)+'px',
			'transform': 'scale(1)'
		}).show();
		$(_this.conf.container).addClass('mirror');
		Timer.end('init mirror');
	}
	var GeoMap = function(conf){
		var _this = this;
		_this.projector = conf.projector == 'mercator'? Meractor: Albers;
		_this.conf = conf = $.extend({},default_conf,conf);
		_this.canvas = Zrender.init($(conf.container).get(0));
		_this.jsonLoader = conf.jsonLoader || $.getJSON;
		_init_geomap.call(_this);
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
			containment: [-w+300, -h, w+300, h],
			stop: function(){
				_this.reset();
			}
		}, option);

		$drag_obj.draggable(draggable_option);
	}
	/*地图缩放*/
	GeoMapProp.zoom = function(scale, origin){
		if(scale != 1 && scale > 0){
			var _this = this,
				$mirror = $(_this.mirror);
			// scale *= _getCurrentScale($mirror);
			_this._data.zoom *= scale;
			var pos = $mirror.position();
			$mirror.css({
				'transform-origin': origin.x+'px '+origin.y+'px',
				'transform': 'scale('+scale+')'
			});
			setTimeout(function(){
				_this.reset();
			}, 10);
		}
	}
	GeoMapProp.reset = function(reset_old){
		var _this = this,
			canvas = _this.canvas,
			data = _this._data,
			_width = data.width,
			_height = data.height;
		var $mirror = $(_this.mirror);
		var overlays = data.overlays;
		if(reset_old){
			var data_old = _this._data_o;
			data = $.extend(true, {}, data_old);
			data.overlays = overlays;
			_this._data = data;
		}else{
			var pos = $mirror.position();

			var origin = $mirror.css('transform-origin').split(/\s+/),
				origin_x = parseFloat(origin[0]),
				origin_y = parseFloat(origin[1]);
			var zoom = data.zoom,
				zoom_add = zoom - 1;
			data.translat = [data.width/2*zoom - origin_x*zoom_add + pos.left, data.height/2*zoom - origin_y*zoom_add + pos.top];
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
		Timer.start('reset addMask');
		gm.addMask(points_mask, {
			'is_lnglat': false
		});
		Timer.end('reset addMask');

		$.each(shapes_weather, function(i, v){
			canvas.addShape(v);
		});
		canvas.render();
		canvas.refresh(function(){
			$container.removeClass();
			$mirror.fadeOut(function(){
				_init_mirror.call(_this);
			});
		});
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
		Timer.start('addMask');
		gm.addMask(points, $.extend(true,{
			'is_lnglat': false
		},options));
		Timer.end('addMask');

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
					_init_mirror.call(_this);
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

		// if(shape.zlevel == ZINDEX_LAYER){
		// 	_this._data.layers.push(shape);
		// }
		return shape;
	}
	// GeoMapProp.clearLayers = function(){
	// 	var canvas = this.canvas;
	// 	var layers = this._data.layers;
	// 	var temp_layer;
	// 	while(temp_layer = layers.shift()){
	// 		canvas.delShape(temp_layer.id);
	// 	}
	// 	canvas.refresh();
	// 	this._data.layers
	// }
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
	    var geoShapes = [];
	    $.each(shapeList, function(i, shape){
	    	if(shape.zlevel == ZINDEX_LAYER){
	    		_drawShape(ctx, shape);
	    	}else{
	    		geoShapes.push(shape);
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

	    $.each(geoShapes, function(i, shape){
	    	_drawShape(ctx, shape);
	    });

        var img_data = maskImageDom.toDataURL(null, backgroundColor);
        maskImageDom = null;
        ctx = null;
        return img_data;
	}

	var Mask = function(map,polygons,options){
		Base.call(this, options);
		this.map = map;
		if(options.is_lnglat){
			var polygons_new = [];
			$.each(polygons,function(i,v){
				var arr = [];
				$.each(v,function(v_i,v_v){
					var val = pointToOverlayPixel.call(map,v_v);
					arr.push([val.x,val.y]);
				});
				polygons_new.push(arr);
			});
			polygons = polygons_new;
		}
		this.polygons = polygons;
	}
	Mask.prototype = {
		type: 'mask',
		buildPath: function(ctx,style){
			ctx.beginPath();
			var map = this.map;
			$.each(this.polygons,function(i_polygon,pointList){
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
		}
	}
	util.inherits(Mask, Base);

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
	GeoMap.Polygon.prototype.isCover = function(){
		return true;
	}

	GeoMap.Polyline = function(Points,	options){
		this.points = Points;
		this.shape = new BrokenLine($.extend(true,{
			style: {
				brushType : 'both',
		        lineWidth : 1,
		        strokeColor : 'red',
			},
			zlevel: ZINDEX_LAYER,
			needTransform: true,
			needLocalTransform: true,
			hoverable: false
		},options));
	}
	GeoMap.Polyline.prototype.draw = function(map){
		_drawPointList.call(this, map);
		return this.shape;
	}
	GeoMap.Polyline.prototype.isCover = function(){
		return true;
	}
	GeoMap.Text = function(text, attr_style){
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
		this.shape = new TextShape({
			style: style,
			zlevel: ZINDEX_LAYER
		});
	}
	GeoMap.Text.prototype.draw = function(map){
		return this.shape;
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