!function() {
    var _zrender,
        _Polyline;

    function GeoMap() {}
    /**
     * 加载相关依赖
     * @param  {Function} cb [加载完依赖后的回调]
     */
    GeoMap.init = function(cb) {
        requireweb([
            'zrender',
            'zrender/shape/Polyline'
        ], function(zrender, Polyline) {
            _zrender = zrender;
            _Polyline = Polyline;
            cb();
        })
    }

    var prop = GeoMap.prototype;
    prop.init = function(options) {
        var container = options.container;
        var canvas = _zrender.init(container);

        this._canvas = canvas;
        this.proj = options.proj;
    }
    prop.addOverlay = function() {

    }
    prop.refresh = function() {

        this._canvas.render();
    }
    module.exports = GeoMap;
}()
