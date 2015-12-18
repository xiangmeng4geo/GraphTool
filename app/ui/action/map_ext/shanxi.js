!function() {
    var C = Core;
    var _require = C.require;
    var CONST = _require('const');
    var Reader = _require('datareader');
    var Render = _require('render');
    var util = _require('util');
    var util_variate = util.variate;
    var util_file = util.file;
    var util_path = util.path;
    var getSys = _require('product_conf').getSys;
    var style2obj = _require('component').util.style2obj;

    function init(options) {
        var GeoMap = options.GeoMap,
            Shape = options.Shape,
            $geomap = options.$geomap,
            model = options.model,
            Pattern = options.Pattern;

        Reader.setModel(model);
        Render.setModel(model);
        var conrec = _require('conrec').setModel(model);

        var _current_product_name;
        model.on('product.change', function(productName) {
            _current_product_name = productName;
        });
        // 主要监听命令行调用时配置文件更新
        model.on('map.changeconfig', function(file_path) {
            var conf = util.isPlainObject(file_path) ? file_path: util_file.readJson(file_path);
            _changeConf(conf);
        });
        function _afterChangeConf(err, t_start) {
            var t_used = new Date() - t_start;
            model.emit('map.afterRender', err, t_used);
        }
        function _changeConf(conf) {
            var s_time = new Date();
            var map_name = conf.map;
            if (!map_name) {

            }
            var legend_name = conf.legend;
            var assets = conf.assets;
            var data = conf.data;
            var texts = conf.text || [];
            var imgs = conf.imgs || [];

            var conf_geo = getSys.getGeo(map_name);
            var geo_files = conf_geo.maps;
            var textStyle = conf_geo.textStyle;
            var bound = conf_geo.bound;
            var conf_legend = getSys.getLegend(legend_name);

            var blendentJson = conf_legend.blendent;

            model.emit('projection.changeview', bound.wn, bound.es);
            model.emit('legend', blendentJson);
            model.emit('geo', conf_geo, function(names_show) {
                if (util.isPlainObject(data)) {
                    data.bound = bound;
                }
                Reader.read(data, function(err, dataJson) {
                    if (assets) {
                        var _opt_var = {
                            p: _current_product_name,
                            t: new Date(),
                            w: $geomap.width(),
                            h: $geomap.height()
                        }
                        var t1 = dataJson.t1;
                        var t2 = dataJson.t2;
                        var t3 = dataJson.t3 || dataJson.mtime;
                        if (t1) {
                            _opt_var.t1 = new Date(t1);
                        }
                        if (t2) {
                            _opt_var.t2 = new Date(t2);
                        }
                        if (t3) {
                            _opt_var.t3 = new Date(t3);
                        }
                        var _format = util_variate(_opt_var);
                        for (var i = 0, j = assets.length; i<j; i++) {
                            var item = assets[i];
                            var text = item.text;
                            if (!!text) {
                                item.text = _format(text);
                            }
                        }
                        model.emit('asset.add', assets);
                    }
                    if (err) {
                        _afterChangeConf(err, s_time);
                        return model.emit('error', err);
                    }
                    var texts_data = [];
                    var data_origin = dataJson.data;
                    if (data_origin) {
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
                    }
                    // 处理源数据
                    Render.text(texts_data);
                    Render.text(texts);
                    Render.img(imgs);

                    var data_interpolate = dataJson.interpolate;
                    if (data_interpolate) {
                        conrec(data_interpolate, blendentJson, true, function(err, data_conrec) {
                            console.log(data_conrec);
                            if (err) {
                                model.emit('error', err);
                            } else {
                                Render.conrec(data_conrec);
                            }
                            _afterChangeConf(err, s_time);
                        });
                    } else {
                        Render.micaps(dataJson, blendentJson);
                        _afterChangeConf(err, s_time);
                    }
                });
            });
        }
    }

    module.exports = init;
}()
