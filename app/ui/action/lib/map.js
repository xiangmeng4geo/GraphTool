!function() {
    var _zrender,
        _Polyline;

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
        return canvas.getContext('2d');
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
        var stroked = style.strokeStyle && style.strokeWidth !== 0,
            lineWidth, strokeStyle
            fillStyle = style.fillStyle,
            filled = !!fillStyle;

        if (stroked) {
            lineWidth = style.strokeWidth || 1;
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
            ['shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'].forEach(function(key) {
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
        var stroked = style.strokeStyle && style.strokeWidth !== 0,
            filled = !!style.fillStyle;
        return function() {
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

        _set(_this, 'geo', []);
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
                _this.refresh('geo');
                return cb();
            }
            var file_path = geo_file.file;
            _fileImportor(file_path, function(err, dataset) {
                if (err) {
                    model.emit('error');
                } else {
                    // dataset.layers[0].shapes.splice(1);
                    geo_file.dataset = dataset;
                }
                // console.log(geo_file);
                // if(dataset.layers[0].data){
                //     console.log(dataset.layers[0].data.getRecords());
                // }
                _get(_this, 'geo').push(geo_file);
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

    }
    /**
     * 对要显示天气要素的图层进行clip处理
     */
    prop.setClip = function() {

    }
    /**
     * 添加覆盖物
     */
    prop.addOverlay = function() {

    }
    /**
     * 刷新图层
     */
    prop.refresh = function(layer_name) {
        var _this = this;
        if (!layer_name) {
            layer_name = ['geo', 'weather'];
        }else if (!_isArray(layer_name)) {
            layer_name = [layer_name];
        }
        layer_name.forEach(function(v) {
            var ctx = _getCtxByPrefix(_this, v);
            var _canvas = ctx.canvas;
            ctx.clearRect(0, 0, _canvas.width, _canvas.height);
            var data_list = _get(_this, v);
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
        });
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
        var $canvas_weather = _getCanvas(width, height, _getCanvasId(_this, 'weather')).appendTo($div);
        var $canvas_geo = _getCanvas(width, height, _getCanvasId(_this, 'geo')).appendTo($div);

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
