define('GeoMap',['zrender',
	'zrender/shape/Base',
	'zrender/shape/Polygon',
	'zrender/shape/BrokenLine',
	'zrender/Group',
	'zrender/tool/util',
	'zrender/shape/Text',
	'zrender/shape/Image'],function(Zrender,Base,Polygon,BrokenLine,Group,util,TextShape,ImageShape){
	var ZINDEX_MAP = 2,
		ZINDEX_LAYER = 1;

	// retina 屏幕优化
    var devicePixelRatio = window.devicePixelRatio || 1;
    devicePixelRatio = Math.max(devicePixelRatio, 1);

	var MERACTOR_RATIO = 20037508.34/180;
	var px = 3800000;//转成px
	/*Web墨卡托坐标与WGS84坐标互转*/
	var Meractor_cache_lnglat = {};// 进行缓存，减小重复计算量
	var Meractor = {
		lngLatToPoint: function(lnglat){
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
		pointToLngLat: function(mercator){
			var x = mercator.x/MERACTOR_RATIO;
			var y = mercator.y/MERACTOR_RATIO;
			y = 180/Math.PI*(2*Math.atan(Math.exp(y*Math.PI/180))-Math.PI/2);
			return {x: x*px,y: y*px};
		}
	};

	var china_src_size = {
		height: 35.4638,
		left: 73.4766,
		top: 53.5693,
		width: 61.6113
	};
	var px_size_china_left_top = Meractor.lngLatToPoint({x: china_src_size.left, y: china_src_size.top}),
		px_size_china_right_bottom = Meractor.lngLatToPoint({x: china_src_size.left+china_src_size.width, y: china_src_size.top-china_src_size.height});

	var px_size_china = {width: px_size_china_right_bottom.x - px_size_china_left_top.x,height: px_size_china_left_top.y - px_size_china_right_bottom.y};
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
		var scale_x = width_container/px_size_china.width,
			scale_y = height_container/(px_size_china.height);

		// console.log(scale_x,scale_y);
		
		var center = conf.center||{x: china_src_size.left+china_src_size.width/2,y: china_src_size.top - china_src_size.height/2};
		var center_xy = Meractor.lngLatToPoint(center);
		var group_map = new Group(),
			group_shape = new Group(),
			group_legend = new Group();
		var _canvas = _this.canvas;
		_canvas.addGroup(group_map);
		_canvas.addGroup(group_shape);
		_canvas.addGroup(group_legend);

		_this.groups = {
			map: group_map,
			shape: group_shape,
			legend: group_legend
		};
		_this._data = {
			scale: Math.min(scale_x,scale_y),
			center: {
				lng: center.x,
				lat: center.y,
				x: center_xy.x,
				y: center_xy.y
			},
			width: width_container,
			height: height_container,
			layers: []
		}
	}
	
	var GeoMap = function(conf){
		var _this = this;
		_this.conf = conf = $.extend({},default_conf,conf);
		_this.canvas = Zrender.init($(conf.container).get(0));

		_init_geomap.call(_this);
	};
	var GeoMapProp = GeoMap.prototype;
	function addGeoPolygon(coordinates,options){
		if(options){
			options.zlevel = ZINDEX_MAP;
		}
		var shapes = [];
		var gm = this;
		var is_not_lnglat = !options.is_lnglat;
		$.each(coordinates,function(i,v){
			var points = [];
			$.each(v,function(v_i,v_v){
				points.push(new GeoMap.Point(v_v[0],v_v[1],is_not_lnglat));
			});
			var polygon = new GeoMap.Polygon(points,options);
			// polygon.draw(gm);
			polygon.points = points;
			shapes.push(polygon);
			gm.addOverlay(polygon);
		});
		return shapes;
	}
	function callback_loaedGeo(loadedData,options,callback_after_render_geo){
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
					is_lnglat: is_lnglat
				}

				if('Polygon' == type_geometry ){
					shapes.push(addGeoPolygon.call(gm,geometry.coordinates,options));
				}else if('MultiPolygon' == type_geometry){
					$.each(geometry.coordinates,function(v_i,v_v){
						shapes.push(addGeoPolygon.call(gm,v_v,options));
					});
				}else{
					console.log(v,type_geometry);
				}
			}
		});
		var points = [];
		$.each(shapes,function(i,v){
			$.each(v,function(v_i,v_v){
				points.push(v_v.shape.style.pointList);
			});
		});

		gm.addMask(points,$.extend(true,{
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
		$.each(src,function(i,v){
			$.getJSON(v,function(data){
				loadedData.push(data);
				if(loadedData.length == len){
					callback_loaedGeo.call(_this,loadedData,options,callback_after_render_geo);
				}
			});
		});
	};
	GeoMapProp.addOverlay = function(overlay,group_name){
		var _this = this;
		var shape = overlay.draw(this);
		var group = _this.groups[group_name];
		this.canvas.addShape(shape);
		
		this.canvas.render();

		if(shape.zlevel == ZINDEX_LAYER){
			_this._data.layers.push(shape);
		}
		return shape;
	}
	GeoMapProp.clearLayers = function(){
		var canvas = this.canvas;
		var layers = this._data.layers;
		var temp_layer;
		while(temp_layer = layers.shift()){
			canvas.delShape(temp_layer.id);
		}
		canvas.refresh();
		this._data.layers
	}
	var pointToOverlayPixel = GeoMapProp.pointToOverlayPixel = function(point){
		var is_lnglat = point.is_lnglat;
		point = {x: point.lng,y: point.lat};
		if(is_lnglat){
			point = Meractor.lngLatToPoint(point);
		}
		
		var _this = this;
		var data = _this._data;
		var center = data.center;
		var scale = data.scale;
		var width = data.width,
			height = data.height;

		return {
			x: (point.x - center.x)*scale + width/2,
			y: (center.y - point.y)*scale + height/1.8//这里出来的数据暂时有一个整体偏移
		}
	}
    function _doclip(ctx){
		var polygons = this.polygons;
		if($.isArray(polygons)){
			ctx.beginPath();
			$.each(polygons,function(i_polygon,pointList){
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
    var core_color = Core.Color,
    	toRGB = core_color.toRGB,
    	toHTML = core_color.toHTML;
    /*得到绘制好的图片*/
	GeoMapProp.toDataURL = function(type, backgroundColor, args){
		var painter = this.canvas.painter;
		var width = painter._width;
        var height = painter._height;
		var maskImageDom = _createDom('mask-image', 'canvas', painter);
		var ctx = maskImageDom.getContext('2d');
	    devicePixelRatio != 1 && ctx.scale(devicePixelRatio, devicePixelRatio);

	    ctx.save();
	    _doclip.call(this,ctx);
	    this.canvas.storage.iterShape(
            function (shape) {
                if (!shape.invisible) {
                    if (!shape.onbrush // 没有onbrush
                        // 有onbrush并且调用执行返回false或undefined则继续粉刷
                        || (shape.onbrush && !shape.onbrush(ctx, false))
                    ) {
                            shape.brush(ctx, false, self.updatePainter);
                    }
                }
            },
            { normal: 'up', update: true }
        );
        /*对透明做默认填色处理*/
        backgroundColor = backgroundColor || '#ffffff';
        var default_rgb_bgcolor = toRGB(backgroundColor,true);
        var img = ctx.getImageData(0,0,width,height);
        var pixel = img.data;
        for(var i = 0,j = pixel.length;i<j;i+=4){
        	if(pixel[i] == 0 && pixel[i+1] == 0 && pixel[i+2] == 0 && pixel[i+3] == 0){
        		pixel[i] = default_rgb_bgcolor[0];
        		pixel[i+1] = default_rgb_bgcolor[1];
        		pixel[i+2] = default_rgb_bgcolor[2];
        		pixel[i+3] = 255;
        	}
        }
        ctx.putImageData(img,0,0);

        var img_data = maskImageDom.toDataURL(type, args);
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
		options = $.extend(true,{},options,{
			style: {
				pointList: Points
			}
		});
		
		this.shape = new Polygon($.extend(true,{
			style: {
				brushType : 'both',
		        lineWidth : 1,
		        strokeColor : '#3D534E',
		        color: 'rgba(0,0,0,0)',
		        textColor: 'black',
		        textPosition : 'inside'// default top
			},
			zlevel: ZINDEX_LAYER,
			needTransform: true,
			needLocalTransform: true,
			hoverable: false
		},options));
	}
	function _drawPointList(map){
		var pointList = this.shape.style.pointList;
		$.each(pointList,function(i,v){
			var val = pointToOverlayPixel.call(map,v);
			pointList[i] = [val.x,val.y];
		});
	}
	GeoMap.Polygon.prototype.draw = function(map){
		_drawPointList.call(this,map);
		return this.shape;
	}
	GeoMap.Polygon.prototype.isCover = function(){
		return true;
	}

	GeoMap.Polyline = function(Points,	options){
		options = $.extend(true,{},options,{
			style: {
				pointList: Points
			}
		});
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
		_drawPointList.call(this,map);
		return this.shape;
	}
	GeoMap.Polyline.prototype.isCover = function(){
		return true;
	}
	GeoMap.Text = function(text,attr_style){
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