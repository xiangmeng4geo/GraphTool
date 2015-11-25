!function() {
    var C = Core;
    var _require = C.require;
    var CONST = _require('const');
    var Reader = _require('datareader');
    var Render = _require('render');
    var util = _require('util');
    var util_file = util.file;
    var util_path = util.path;
    var getSys = _require('product_conf').getSys;

    function init(options) {
        var GeoMap = options.GeoMap,
            Shape = options.Shape,
            $geomap = options.$geomap,
            model = options.model,
            Pattern = options.Pattern;

        var conf_geo = getSys.getGeo('中国地图');
        var geo_files = conf_geo.maps;
        var textStyle = conf_geo.textStyle;
        var bound = conf_geo.bound;
        model.emit('projection.changeview', bound.wn, bound.es);
        model.emit('geo', geo_files, textStyle, function(names_show) {});
    }

    module.exports = init;
}()
