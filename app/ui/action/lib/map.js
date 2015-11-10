!function() {
    var _zrender,
        _Polyline;

    var _fileImportor;
    var _projection;
    var C = Core;
    var $ = C.$;

    var uid = 0;
    var cache = {};
    function _set(geomap, name, value) {
        var id = geomap._id;
        (cache[id] || (cache[id] = {}))[name] = value;
    }
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
    // 画一个arc对象
    function _drawPath(ctx, iter) {
        if (!iter.hasNext()){
            return;
        }
        ctx.beginPath();
        var pixel = _projection([iter.x, iter.y]);
        ctx.moveTo(pixel[0], pixel[1]);

        while (iter.hasNext()) {
            var pixel = _projection([iter.x, iter.y]);
            ctx.lineTo(pixel[0], pixel[1]);
        }
        ctx.stroke();
    }
    // 导入geo文件数据
    function _import(geo_file, ctx, cb) {
        var file_path = geo_file.file;
        var style = geo_file.style || {};
        _fileImportor(file_path, function(err, dataset) {
            if (err) {
                return model.emit('error', err);
            }
            ctx.save();

            for (var i in style) {
                ctx[i] = style[i];
            }
            // var fillStyle = style.fill;
            var arcs = dataset.arcs;
            if (arcs) {
                for (var _i = 0, _j = arcs.size(); _i<_j; _i++){
                    _drawPath(ctx, arcs.getArcIter(_i));
                }
            }

            ctx.restore();

            cb();
        });
    }

    function GeoMap() {
        this._id = uid++;
    }

    // TODO: change to asynchronous
    GeoMap.setImportor = function(importor) {
        _fileImportor = importor;
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
        var len = geo_files.length;
        var n_done = 0;
        var ctx_geo = _getCtxByPrefix(_this, 'geo');console.log(ctx_geo);
        for (var i = 0; i<len; i++) {
            _import(geo_files[i], ctx_geo, function() {
                if (++n_done >= len) {
                    cb();
                }
            })
        }
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
    prop.refresh = function() {

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
            top: 0
        }).appendTo($container);
        // 添加显示geo和weather信息的两个canvas
        // var $canvas_weather = _getCanvas(width, height, _getCanvasId(_this, 'weather')).appendTo($div);
        var $canvas_geo = _getCanvas(width, height, _getCanvasId(_this, 'geo')).appendTo($div);

        _set(_this, 'options', options);

        _this.config();
        _this.resize();
        _this.refresh();
        return _this;
    }
    /**
     * 配置
     */
    prop.config = function(options) {

    }
    module.exports = GeoMap;
}()
