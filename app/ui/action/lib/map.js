!function() {
    var LAYER_NAME_GEO = 'geo';
    var LAYER_NAME_GEO_STROKE = 'geo_stroke';
    var LAYER_NAME_GEO_FILL = 'geo_fill';
    var LAYER_NAME_WEATHER = 'weather';
    var LAYER_NAME_NORMAL = 'normal';

    var CACHE_NAME_GEO = 'geo';
    var CACHE_NAME_CLIP = 'clip';
    var CACHE_NAME_SHAPES = 'shapes';
    var CACHE_NAME_GEOCONF = 'geoconf';

    var _fileImportor;
    var _ShapeIter;
    var _projection;
    var C = Core;
    var $ = C.$;
    var util = C.require('util');

    var uid = 0;
    var cache = {};
    // 设置缓存
    function _set(geomap, name, value) {
        var id = geomap._id;
        (cache[id] || (cache[id] = {}))[name] = value;
    }
    // 取缓存值
    function _get(geomap, name) {
        var id = geomap._id;
        return cache[id] && cache[id][name];
    }
    // 得到一个canvas
    function _getCanvas(width, height, id) {
        var $canvas = $('<canvas>').attr({
            width: width,
            height: height,
            id: id
        }).css({
            position: 'absolute',
            left: 0,
            top: 0
        });

        return $canvas;
    }
    // 得到一个canvas的唯一ID
    function _getCanvasId(geomap, prefix) {
        return prefix+geomap._id;
    }
    // 根据前缀得到一个canvas content对象
    function _getCtxByPrefix(geomap, prefix) {
        var id = _getCanvasId(geomap, prefix);
        var canvas = $('#'+id).get(0);
        return canvas && canvas.getContext('2d');
    }
    // 是否是一个数组
    function _isArray(obj) {
        if (obj) {
            var c = obj.constructor;
            return c && c === Array;
        }
        return false;
    }
    function _getPixelRatio() {
        var deviceRatio = window.devicePixelRatio || window.webkitDevicePixelRatio || 1;
        return deviceRatio > 1 ? 2 : 1;
    }
    var MIN_LEN = _getPixelRatio() > 1 ? 1 : 0.6
    // 画路径
    function _drawPath(ctx, iter, needClose) {
        if (!iter.hasNext()){
            return;
        }
        var pixel_first = _projection([iter.x, iter.y]);
        var x, xp, y, yp;
        x = xp = pixel_first[0];
        y = yp = pixel_first[1];
        ctx.moveTo(x, y);

        while (iter.hasNext()) {
            var pixel = _projection([iter.x, iter.y]);
            x = pixel[0];
            y = pixel[1];
            if (Math.abs(x - xp) > MIN_LEN || Math.abs(y - yp) > MIN_LEN) {
                ctx.lineTo(x, y);
                xp = x;
                yp = y;
            }
        }
        if (x != xp || y != yp) {
            ctx.lineTo(x, y);
        }
        if (needClose) {
            ctx.lineTo(pixel_first[0], pixel_first[1]);
        }
    }
    // 画arcs.layer.shape数据
    function _drawShape(ctx, shp, arcs) {
        if (!shp) {
            return;
        }
        var iter = new _ShapeIter(arcs);

        for (var i = 0, j = shp.length; i<j; i++) {
            iter.init(shp[i]);
            _drawPath(ctx, iter, true);
        }
    }
    // 画arcs.layers数据
    //
    // 暂时考虑到实际的应用场景，只提供stroke即只画线
    function _drawLayer(_this, layer, arcs, style, is_clip) {
        var ctx_stroke = _getCtxByPrefix(_this, LAYER_NAME_GEO_STROKE);
        var ctx_fill = _getCtxByPrefix(_this, LAYER_NAME_GEO_FILL);

        var type = layer.geometry_type;
        if ('polygon' === type) {
            var is_stroked = style.strokeStyle && style.lineWidth !== 0,
                is_filled = !!style.fillStyle && style.flag_fill;
            // 对world topojson进行处理
            var name_layer = layer.name;
            if ("land" == name_layer) {
                is_stroked = false;
            } else if ('countries' == name_layer) {
                is_filled = false;
            }
            if (is_filled && is_clip) {
                is_filled = false;
            }
            var style_stroke = $.extend({}, style);
            var style_fill = $.extend({}, style);
            if (is_filled) {
                delete style_stroke['fillStyle'];
            }
            if (is_stroked) {
                delete style_fill['lineWidth'];
                delete style_fill['strokeStyle'];
            }
            var start_stroke = _getPathStart(ctx_stroke, style_stroke);
            var start_fill = _getPathStart(ctx_fill, style_fill);

            var shapes = layer.shapes;
            for (var i = 0, j = shapes.length; i<j; i++) {
                if (is_stroked) {
                    start_stroke();
                    _drawShape(ctx_stroke, shapes[i], arcs);

                    ctx_stroke.stroke();
                    ctx_stroke.restore();
                }
                if (is_filled) {
                    start_fill();
                    _drawShape(ctx_fill, shapes[i], arcs);

                    ctx_fill.fill();
                    ctx_fill.restore();
                }
            }
        } else if ('polyline' === type) {
            var style_stroke = $.extend({}, style);
            delete style_stroke['fillStyle'];
            var start = _getPathStart(ctx_stroke, style_stroke);
            var end = _getPathEnd(ctx_stroke, style_stroke);
            for (var i = 0, j = arcs.size(); i<j; i++){
                start();
                _drawPath(ctx_stroke, arcs.getArcIter(i));
                end();
            }
        }
    }

    function _getPathStart(ctx, style) {
        var lineWidth = parseFloat(style.lineWidth) || 0,
            strokeStyle = style.strokeStyle,
            fillStyle = style.fillStyle,
            flag_fill = style.flag_fill,
            stroked = strokeStyle && lineWidth !== 0,
            filled = !!fillStyle && (undefined !== flag_fill || null !== flag_fill || flag_fill);

        if (stroked) {
            lineWidth = lineWidth || 1;
            strokeStyle = strokeStyle;
        }
        function fn() {
            ctx.save();
            ctx.beginPath();
            if (stroked) {
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.lineWidth = lineWidth;
                ctx.strokeStyle = strokeStyle;
            }
            //只添加指定属性
            ['shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY',
                'font', 'textAlign', 'textBaseline'].forEach(function(key) {
                var val = style[key];
                if(val !== undefined) {
                    ctx[key] = val;
                }
            });
            if (filled) {
                ctx.fillStyle = fillStyle;
            }
        }
        return fn;
    }
    function _getPathEnd(ctx, style) {
        var stroked = style.strokeStyle && style.lineWidth !== 0,
            flag_fill = style.flag_fill,
            filled = !!style.fillStyle && (undefined !== flag_fill || null !== flag_fill || flag_fill);
        return function() {
            // ctx.closePath();
            if (stroked) {
                ctx.stroke();
            }
            if (filled) {
                ctx.fill();
            }
            ctx.restore();
        }
    }
    var _model;
    function GeoMap(model) {
        _model = model;
        var _this = this;
        _this._id = uid++;

        _set(_this, CACHE_NAME_GEO, []);
        _set(_this, CACHE_NAME_SHAPES, []);
    }

    // TODO: change to asynchronous
    GeoMap.setGeo = function(Geo) {
        var cache_key_obj = {_id: 100};
        var fn_import = Geo.importFile;
        _fileImportor = function(file_path, cb) {
            // 对加载并解析完成的数据进行缓存
            var cache_val = _get(cache_key_obj, file_path);
            if (cache_val) {
                cb(null, cache_val);
            } else {
                fn_import(file_path, function(err, d) {
                    if (!err) {
                        _set(cache_key_obj, file_path, d); //对数据文件进行缓存
                    }
                    cb(err, d);
                });
            }
        }
        _ShapeIter = Geo.ShapeIter;
    }
    GeoMap.setProjection = function(projection) {
        _projection = projection;
    }
    var prop = GeoMap.prototype;
    /**
     * 设置地理信息
     */
    prop.setGeo = function(conf, cb) {
        var t_start = new Date();
        var _this = this;
        var geo_files = conf.maps;
        _set(_this, CACHE_NAME_GEOCONF, conf);
        _set(_this, CACHE_NAME_GEO, []);
        if (!_isArray(geo_files)) {
            geo_files = [geo_files];
        }
        geo_files = geo_files.slice(0).filter(function(v) {
            if (v.is_use) {
                return v;
            }
        });


        // 先保存数据，再同步画数据
        function _importNext() {
            var geo_file = geo_files.shift();
            if (!geo_file) {
                _this.getBondBorder();
                _this.refresh();
                _model.emit('log', 'import and render geo files takes '+(new Date() - t_start)+' ms!');
                return cb();
            }
            var file_path = geo_file.file;
            _fileImportor(file_path, function(err, dataset) {
                if (err) {
                    _model.emit('error', err);
                } else {
                    // dataset.layers[0].shapes.splice(1);
                    geo_file.dataset = dataset;
                    // console.log(geo_file);
                    // if(dataset.layers[0].data){
                    //     console.log(dataset.layers[0].data.getRecords());
                    // }
                    _get(_this, CACHE_NAME_GEO).push(geo_file);
                }

                _importNext();
            })
        }
        _importNext();

        return _this;
    }
    /**
     * 得到地理信息的最外层边界
     */
    prop.getBondBorder = function() {
        var _this = this;
        var _data = _get(_this, CACHE_NAME_GEO);
        var _item_deal;
        for (var i = 0, j = _data.length; i<j; i++) {
            var item = _data[i];
            if (item.clip || (item.borderStyle && item.borderStyle.flag)) {
                _item_deal = item;
                break;
            }
        }
        if (!_item_deal) {
            return;
        }
        // window._test = _item_deal;
        var dataset = _item_deal.dataset;
        var arcs = dataset.arcs;
        var layers = dataset.layers;
        if (layers.length > 0) {
            var shapes = layers[0].shapes;

            var flags_counter = new Uint8Array(arcs.size());
            shapes.forEach(function(shape, shp_index) {
                shape.forEach(function(shp) {
                    shp.forEach(function(arc_index) {
                        if (arc_index < 0) {
                            arc_index = ~arc_index;
                        }
                        flags_counter[arc_index]++;
                    });
                });
            });
            var flags = [];
            flags_counter.map(function(c, i) {
                if (c == 1) {
                    var p_start = arcs.getVertex(i, 0),
                        p_end = arcs.getVertex(i, -1);
                    flags.push({
                        start: [p_start.x, p_start.y].join(','),
                        end: [p_end.x, p_end.y].join(','),
                        i: i
                    })
                }
            });

            // 重组
            function findNext(flag) {
                var start = flag.start,
                    end = flag.end;
                for (var i = 0, j = flags.length; i<j; i++) {
                    var item = flags[i],
                        start_test = item.start,
                        end_test = item.end,
                        i_test = item.i;
                    var i_new = null;
                    if (end == start_test) {
                        i_new = i_test;
                    } else if (end == end_test) {
                        i_new = ~i_test;
                    }

                    if (i_new !== null) {
                        item.i = i_new;
                        flags.splice(i, 1);
                        return item;
                    }
                }
            }

            function findNextShape() {
                var tmp = flags.shift();

                if (!tmp) {
                    return;
                }
                var _arr = [tmp.i];

                var _arc;
                while ((_arc = findNext(tmp))) {
                    _arr.push(_arc.i);
                    tmp = _arc;
                }

                return _arr;
            }
            var shapes_new = [];
            while (flags.length > 0) {
                shapes_new.push(findNextShape());
            }

            var _styleBorder = $.extend({}, _item_deal.borderStyle);
            var _style = _item_deal.style;
            var _fillStyle = _style.fillStyle;
            if (_style.flag_fill && _fillStyle) {
                _styleBorder.fillStyle = _fillStyle;
            }
            if (!_styleBorder.flag_shadow) {
                delete _styleBorder['shadowBlur'];
                delete _styleBorder['shadowColor'];
                delete _styleBorder['shadowOffsetX'];
                delete _styleBorder['shadowOffsetY'];
            }
            var data = {
                shapes: shapes_new,
                arcs: arcs,
                clip: _item_deal.clip,
                style: _styleBorder
            }
            _set(_this, CACHE_NAME_CLIP, data);
            return data;
        }
    }
    /**
     * 对要显示天气要素的图层进行clip处理
     */
    prop.setClip = function() {
        var _this = this;
        var data = _get(_this, CACHE_NAME_CLIP);
        if (!data || !data.clip) {
            return;
        }
        var shapes = data.shapes,
            arcs = data.arcs;

        if (!shapes || shapes.length == 0) {
            return;
        }
        var ctx = _getCtxByPrefix(_this, LAYER_NAME_WEATHER);

        ctx.restore();
        ctx.save();

        // TIP: this is important
        ctx.beginPath();
        for (var i = 0, j = 1; i<j; i++) {
            _drawShape(ctx, [shapes[i]], arcs);
        }
        ctx.closePath();

        // ctx.strokeStyle = 'red';
        // ctx.stroke();
        // ctx.fill();
        ctx.clip();
    }
    prop.border = function() {
        var _this = this;
        var data = _get(_this, CACHE_NAME_CLIP);
        if (!data) {
            return;
        }
        var shapes = data.shapes,
            arcs = data.arcs;

        if (!shapes || shapes.length == 0) {
            return;
        }
        var style = data.style;
        if (style) {
            var isStroked = false;
            var arr_test = ['strokeStyle', 'lineWidth'];
            for (var i = 0, j = arr_test.length; i<j; i++) {
                if (style[arr_test[i]]) {
                    isStroked = true;
                    break;
                }
            }
            if (style.fillStyle) {
                var style_fill = $.extend({flag_fill: true}, style);
                delete style_fill['lineWidth'];
                delete style_fill['strokeStyle'];

                var ctx = _getCtxByPrefix(_this, LAYER_NAME_GEO_FILL);
                var start = _getPathStart(ctx, style_fill);
                var end = _getPathEnd(ctx, style_fill);
                for (var i = 0, j = shapes.length; i<j; i++) {
                    start();
                    _drawShape(ctx, [shapes[i]], arcs);
                    end();
                }
            }
            if (isStroked) {
                var style_stroke = $.extend({}, style);
                delete style_stroke['fillStyle'];
                delete style_stroke['shadowBlur'];
                delete style_stroke['shadowColor'];
                delete style_stroke['shadowOffsetX'];
                delete style_stroke['shadowOffsetY'];

                var ctx = _getCtxByPrefix(_this, LAYER_NAME_GEO_STROKE);
                var start = _getPathStart(ctx, style_stroke);
                var end = _getPathEnd(ctx, style_stroke);
                for (var i = 0, j = shapes.length; i<j; i++) {
                    start();
                    _drawShape(ctx, [shapes[i]], arcs);
                    end();
                }
            }
        }
    }
    /**
     * 添加覆盖物
     */
    prop.addOverlay = function(shape) {
        var _this = this;

        var shapes = _get(_this, CACHE_NAME_SHAPES);

        var style = shape.style || {};

        var ctx = _getCtxByPrefix(_this, style.normal?LAYER_NAME_NORMAL: LAYER_NAME_WEATHER);

        _getPathStart(ctx, style)();
        shape.draw(ctx, _projection);
        _getPathEnd(ctx, style)();

        shape.style = style;
        shapes.push(shape);
    }

    /**
     * 刷新图层
     */
    prop.refresh = function(layer_name) {
        var _this = this;
        var conf_geo = _get(_this, CACHE_NAME_GEOCONF);
        if (!conf_geo) {
            return;
        }
        if (!layer_name) {
            layer_name = [LAYER_NAME_GEO, LAYER_NAME_WEATHER, LAYER_NAME_NORMAL];
        }else if (!_isArray(layer_name)) {
            layer_name = [layer_name];
        }
        if (layer_name.indexOf(LAYER_NAME_GEO) > -1) {
            var ctx_stroke = _getCtxByPrefix(_this, LAYER_NAME_GEO_STROKE);
            var ctx_fill = _getCtxByPrefix(_this, LAYER_NAME_GEO_FILL);
            var _canvas = ctx_stroke.canvas;
            ctx_stroke.clearRect(0, 0, _canvas.width, _canvas.height);
            ctx_fill.clearRect(0, 0, _canvas.width, _canvas.height);
            var conf_bg = conf_geo.bg;
            if (conf_bg && conf_bg.flag) {
                var bg_color = conf_bg.color;
                if (bg_color) {
                    ctx_fill.fillStyle = '#71B7fd';
                    ctx_fill.fillRect(0, 0, _canvas.width, _canvas.height);
                }
            }

            var data_list = _get(_this, CACHE_NAME_GEO);

            _isArray(data_list) && data_list.forEach(function(data) {
                var dataset = data.dataset;
                var style = data.style;
                var is_clip = data.clip;
                if (dataset) {
                    var arcs = dataset.arcs;
                    for (var i = 0, layers = dataset.layers, j = layers.length; i<j; i++) {
                        _drawLayer(_this, layers[i], arcs, style, is_clip);
                    }
                }
            });

            _this.border();
        }

        var ctx = _getCtxByPrefix(_this, LAYER_NAME_WEATHER);
        var ctx_normal = _getCtxByPrefix(_this, LAYER_NAME_NORMAL);
        var _canvas = ctx.canvas;
        ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        ctx_normal.clearRect(0, 0, _canvas.width, _canvas.height);

        var is_refresh_weather = layer_name.indexOf(LAYER_NAME_WEATHER) > -1,
            is_refresh_normal = layer_name.indexOf(LAYER_NAME_NORMAL) > -1;

        if (is_refresh_weather) {
            _this.setClip();
        }

        if (is_refresh_normal || is_refresh_weather) {
            var shapes = _get(_this, CACHE_NAME_SHAPES);

            for (var i = 0, j = shapes.length; i<j; i++) {
                var shp = shapes[i];
                var _style = shp.style;
                var _ctx = is_refresh_normal && _style.normal ? ctx_normal: is_refresh_weather && !_style.normal? ctx: null;

                if (_ctx) {
                    _getPathStart(_ctx, _style)();
                    shp.draw(_ctx, _projection);
                    _getPathEnd(_ctx, _style)();
                }
            }
        }
    }
    /**
     * 重置尺寸
     */
    prop.resize = function() {

    }
    /**
     * 清除图层
     */
    prop.clear = function() {
        var _this = this;
        _set(this, CACHE_NAME_SHAPES, []);
        _this.refresh([LAYER_NAME_WEATHER, LAYER_NAME_NORMAL]);
    }
    /**
     * 销毁对象
     */
    prop.dispose = function() {

    }
    var DEFAULT_OPTION = {
    };
    /**
     * 初始化参数
     * @param  {[type]} options [description]
     * @return {[type]}         [description]
     */
    prop.init = function(options) {
        var _this = this;
        var $container = $(options.container);
        var width = $container.width(),
            height = $container.height();

        var $div = $('<div>').css({
            position: 'relative',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            // 'background-color': '#BFEAFB'
        }).appendTo($container);
        // 添加显示geo和weather信息的两个canvas
        var $canvas_geo_fill = _getCanvas(width, height, _getCanvasId(_this, LAYER_NAME_GEO_FILL)).appendTo($div);
        var $canvas_weather = _getCanvas(width, height, _getCanvasId(_this, LAYER_NAME_WEATHER)).appendTo($div);
        var $canvas_geo = _getCanvas(width, height, _getCanvasId(_this, LAYER_NAME_GEO_STROKE)).appendTo($div);
        var $canvas_normal = _getCanvas(width, height, _getCanvasId(_this, LAYER_NAME_NORMAL)).appendTo($div);

        $canvas_weather.get(0).getContext('2d').save();
        _set(_this, 'options', options);

        // _this.config();
        // _this.resize();
        // _this.refresh();
        return _this;
    }
    /**
     * 配置
     */
    prop.config = function(options) {

    }
    prop.export = function(conf) {
        var _this = this;

        var canvas_geo_fill = _getCtxByPrefix(_this, LAYER_NAME_GEO_FILL).canvas;
        var canvas_geo_stroke = _getCtxByPrefix(_this, LAYER_NAME_GEO_STROKE).canvas;
        var canvas_weather = _getCtxByPrefix(_this, LAYER_NAME_WEATHER).canvas;
        var ctx_normal = _getCtxByPrefix(_this, LAYER_NAME_NORMAL);
        var canvas_normal = ctx_normal.canvas;

        var width = canvas_geo_fill.width,
            height = canvas_geo_fill.height;

        var canvas_tmp = _getCanvas(width, height).get(0);
        var ctx = canvas_tmp.getContext('2d');

        var bgcolor = 'rgba(255, 255, 255, 1)';
        if (conf) {
            var _bgColor = conf.bgcolor;
            if (_bgColor) {
                bgcolor = _bgColor;
            }
        }
        if (bgcolor) {
            ctx.fillStyle = bgcolor;
            ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(canvas_geo_fill, 0, 0, width, height);
        ctx.drawImage(canvas_weather, 0, 0, width, height);
        ctx.drawImage(canvas_geo_stroke, 0, 0, width, height);
        ctx.drawImage(canvas_normal, 0, 0, width, height);

        var shapes = conf.shapes;
        if (shapes && shapes.length > 0) {
            for (var i = 0, j = shapes.length; i<j; i++) {
                var shape = shapes[i];
                var style = shape.style || {};

                _getPathStart(ctx, style)();
                shape.draw(ctx, _projection);
                _getPathEnd(ctx, style)();
            }
        }

        var result = canvas_tmp.toDataURL(null, bgcolor);
        return result;
    }
    module.exports = GeoMap;
}()
