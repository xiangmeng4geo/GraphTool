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

        Reader.setModel(model);
        Render.setModel(model);
        var conrec = _require('conrec').setModel(model);

        model.on('map.changeconfig', function(file_path) {
            var conf = util_file.readJson(file_path);

            _changeConf(conf);
        });
        function _changeConf(conf) {
            var geo = conf.geo;
            if (!geo) {

            }
            var legend = conf.legend;
            var data = conf.data;
            var texts = conf.text || [];

            var conf_geo = getSys.getGeo(geo);
            var geo_files = conf_geo.maps;
            var textStyle = conf_geo.textStyle;
            var bound = conf_geo.bound;
            var conf_legend = getSys.getLegend(legend);

            var blendentJson = conf_legend.blendent;
            model.emit('projection.changeview', bound.wn, bound.es);
            model.emit('legend', blendentJson);
            model.emit('geo', conf_geo, function(names_show) {
                Reader.read(data, function(err, dataJson) {
                    if (err) {
                        return model.emit('error', err);
                    }
                    var texts_data = [];
                    var data_origin = dataJson.data;
                    for (var i = 0, j = data_origin.length; i<j; i++) {
                        var item = data_origin[i];
                        var item_show = names_show[item.name];
                        // if (item_show) {
                            texts_data.push({
                                txt: item.v,
                                lng: item.x,
                                lat: item.y,
                                fontSize: 12,
                                color: 'rgba(0, 0, 0, 0.8)',
                                offsetY: -10,
                                offsetX: 6
                            });
                        // }
                    }
                    // 处理源数据
                    Render.text(texts_data);
                    Render.text(texts);

                    conrec(dataJson.interpolate, blendentJson, true, function(err, data_conrec) {
                        if (err) {
                            return model.emit('error', err);
                        }
                        Render.conrec(data_conrec);
                    });
                });
            });
        }
    }

    module.exports = init;
}()
