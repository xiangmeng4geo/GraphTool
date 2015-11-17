!function() {
    var LAYER_NAME_GEO = 'geo';
    var LAYER_NAME_WEATHER = 'weather';

    var CACHE_NAME_GEO = 'geo';
    var CACHE_NAME_CLIP = 'clip';
    var CACHE_NAME_SHAPES = 'shapes';

    var _fileImportor;
    var _ShapeIter;
    var _projection;
    var C = Core;
    var $ = C.$;

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
    function _drawPath(ctx, iter) {
        if (!iter.hasNext()){
            return;
        }
        var pixel = _projection([iter.x, iter.y]);
        var x = xp = pixel[0],
            y = yp = pixel[1];
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
    }
    // 画arcs.layer.shape数据
    function _drawShape(ctx, shp, arcs) {
        if (!shp) {
            return;
        }
        var iter = new _ShapeIter(arcs);

        for (var i = 0, j = shp.length; i<j; i++) {
            iter.init(shp[i]);
            _drawPath(ctx, iter);
        }
    }
    // 画arcs.layers数据
    //
    // 暂时考虑到实际的应用场景，只提供stroke即只画线
    function _drawLayer(ctx, layer, arcs, style) {
        var start = _getPathStart(ctx, style);
        var end = _getPathEnd(ctx, style);
        var type = layer.geometry_type;
        if ('polygon' === type) {
            var shapes = layer.shapes;
            for (var i = 0, j = shapes.length; i<j; i++) {
                start()
                _drawShape(ctx, shapes[i], arcs);
                end();
            }
        } else if ('polyline' === type || 'polygon' === type) {
            for (var i = 0, j = arcs.size(); i<j; i++){
                start();
                _drawPath(ctx, arcs.getArcIter(i));
                end();
            }
        }
    }

    function _getPathStart(ctx, style) {
        var stroked = style.strokeStyle && style.lineWidth !== 0,
            lineWidth, strokeStyle
            fillStyle = style.fillStyle,
            filled = !!fillStyle;

        if (stroked) {
            lineWidth = style.lineWidth || 1;
            strokeStyle = style.strokeStyle;
        }
        return function() {
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
    }
    function _getPathEnd(ctx, style) {
        var stroked = style.strokeStyle && style.lineWidth !== 0,
            filled = !!style.fillStyle;
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
        _fileImportor = Geo.importFile;
        _ShapeIter = Geo.ShapeIter;
    }
    GeoMap.setProjection = function(projection) {
        _projection = projection;
    }
    var prop = GeoMap.prototype;
    /**
     * 设置地理信息
     */
    prop.setGeo = function(geo_files, cb) {
        var _this = this;
        if (!_isArray(geo_files)) {
            geo_files = [geo_files];
        }
        geo_files = geo_files.slice(0);

        // 先保存数据，再同步画数据
        function _importNext() {
            var geo_file = geo_files.shift();
            if (!geo_file) {
                _this.getBondBorder();
                _this.refresh();
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
            if (item.clip) {
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

            var data = {
                shapes: shapes_new,
                arcs: arcs,
                style: _item_deal.clip
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
        if (!data) {
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
    /**
     * 添加覆盖物
     */
    prop.addOverlay = function(shape) {
        var _this = this;

        var shapes = _get(_this, CACHE_NAME_SHAPES);

        var ctx = _getCtxByPrefix(_this, LAYER_NAME_WEATHER);

        var style = shape.style || {};

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
        if (!layer_name) {
            layer_name = [LAYER_NAME_GEO, LAYER_NAME_WEATHER];
        }else if (!_isArray(layer_name)) {
            layer_name = [layer_name];
        }
        if (layer_name.indexOf(LAYER_NAME_GEO) > -1) {
            var ctx = _getCtxByPrefix(_this, LAYER_NAME_GEO);
            var _canvas = ctx.canvas;
            ctx.clearRect(0, 0, _canvas.width, _canvas.height);
            var data_list = _get(_this, LAYER_NAME_GEO);
            _isArray(data_list) && data_list.forEach(function(data) {
                var dataset = data.dataset;
                var style = data.style;

                if (dataset) {
                    var arcs = dataset.arcs;
                    for (var i = 0, layers = dataset.layers, j = layers.length; i<j; i++) {
                        _drawLayer(ctx, layers[i], arcs, style);
                    }
                }
            });
        }

        var ctx = _getCtxByPrefix(_this, LAYER_NAME_WEATHER);
        var _canvas = ctx.canvas;
        ctx.clearRect(0, 0, _canvas.width, _canvas.height);
        if (layer_name.indexOf(LAYER_NAME_WEATHER) > -1) {
            _this.setClip();
            var shapes = _get(_this, CACHE_NAME_SHAPES);
            for (var i = 0, j = shapes.length; i<j; i++) {
                var shp = shapes[i];
                _getPathStart(ctx, shp.style)();
                shp.draw(ctx, _projection);
                _getPathEnd(ctx, shp.style)();
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
            'background-color': '#BFEAFB'
        }).appendTo($container);
        // 添加显示geo和weather信息的两个canvas
        var $canvas_geo = _getCanvas(width, height, _getCanvasId(_this, LAYER_NAME_GEO)).appendTo($div);
        var $canvas_weather = _getCanvas(width, height, _getCanvasId(_this, LAYER_NAME_WEATHER)).appendTo($div);

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
    module.exports = GeoMap;
}()
