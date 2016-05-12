Core.init(function() {
    var C = Core;
    var _require = C.require;
    var CONST = _require('const');
    var CONST_SIZE = CONST.SIZE;
    var Reader = _require('datareader');
    var Render = _require('render');
    var util = _require('util');
    var util_variate = util.variate;
    var util_file = util.file;
    var util_path = util.path;
    var product_conf = _require('product_conf');
    var product_conf_util = product_conf.util;
    var getSys = product_conf.getSys;
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
            model.emit('loading.show');
        });
        // 主要监听命令行调用时配置文件更新
        model.on('map.changeconfig', function(file_path) {
            // if (err) {
            //   return  model.emit('log.user.error', err);
            // } 
            var conf = util.isPlainObject(file_path) ? file_path: util_file.readJson(file_path);
            _changeConf(conf);
        });
        function _afterChangeConf(err, t_start) {
            var t_used = new Date() - t_start;
            model.emit('map.afterRender', err, t_used);
            model.emit('loading.hide');
        }
        function _error(err_msg) {
            model.emit('log.user.error', new Error(err_msg));
        }
        // 更改配置文件
        function _changeConf(conf) {
            if (!conf) {
                return _error('没有相关配置！');
            }
            var s_time = new Date();
            var map_name = conf.map;
            var legend_name = conf.legend;
            var assets = conf.assets;
            var data = conf.data;
            var texts = conf.texts || [];
            var imgs = conf.imgs || [];

            var conf_geo = getSys.getGeo(map_name);
            if (!conf_geo) {
                return _error('请先配置地图!');
            }
            var geo_files = conf_geo.maps;
            if (!geo_files || geo_files.length == 0) {
                return _error('地理信息文件不可为空！');
            }
            var textStyle = conf_geo.textStyle;
            var bound = conf_geo.bound;
            if (!bound || !bound.wn || !bound.es) {
                return _error('请先配置地图边界！');
            }
            
            var conf_legend = getSys.getLegend(legend_name);

            var blendentJson = conf_legend.blendent;
            if (blendentJson) {
                var len_blendent = blendentJson.length;
                if (len_blendent == 0) {
                    return _error('图例配置错误!');
                } else {
                    for (var i = 0; i<len_blendent; i++) {
                        var item = blendentJson[i];
                        var colors = item.colors;
                        if (!colors || colors.length == 0) {
                            return _error('请先配置图例里的值域!');
                        }
                    }
                }
            }
            var showLegendRange = conf.showLegendRange;
            var toSize = product_conf_util.getSize(conf);
            model.emit('map.changesize', toSize);
            model.emit('projection.changeview', bound.wn, bound.es);
            
            function _renderAssets() {
                model.emit('asset.add', assets);
            }
            model.emit('geo', conf_geo, function(names_show) {
                if (util.isPlainObject(data)) {
                    data.bound = bound;
                }
                Reader.read(data, function(err, dataJson) {
                    // console.log(dataJson);
                    if (err) {
                        _afterChangeConf(err, s_time);
                        _renderAssets();
                        return model.emit('log.user.error', err);
                    }
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
                            // var key_assets = item.key;
                            // if (key_assets) {
                            //     item = getSys.getAssets(key_assets);
                            // }
                            if (item) {
                                var text = item.text;
                                if (!!text) {
                                    item.text = _format(text);
                                }
                            }
                            assets[i] = item;
                        }
                        _renderAssets();
                    }
                    if (showLegendRange) {
                        var data_filter_legend = [];
                        // 添加14类数据里的值
                        var areas = dataJson.areas;
                        if (areas) {
                            var len = areas.length;
                            if (len > 0) {
                                for (var i = 0; i<len; i++) {
                                    var item = areas[i];
                                    var symbols = item.symbols;
                                    var val_area = symbols? symbols.text : '';
                                    data_filter_legend.push({
                                        v: val_area,
                                        code: item.code
                                    });
                                }
                            }
                        }
                    }
                    var texts_data = [];
                    var data_origin = dataJson.data;
                    if (data_origin && data_filter_legend) {
                        for (var i = 0, j = data_origin.length; i<j; i++) {
                            data_filter_legend.push(data_origin[i]);
                        }
                    }
                    if (data_origin && conf.showData) {
                        for (var i = 0, j = data_origin.length; i<j; i++) {
                            var item = data_origin[i];
                            if (data_filter_legend) {
                                data_filter_legend.push(item);
                            }
                            var item_show = names_show[item.name];
                            // if (item_show) {
                                texts_data.push({
                                    txt: item.v,
                                    lng: item.x,
                                    lat: item.y,
                                    fontSize: 14,
                                    color: '#000000',
                                    offsetY: -10,
                                    offsetX: 6
                                });
                            // }
                        }
                    }

                    var data_interpolate = dataJson.interpolate;
                    if (data_interpolate && data_filter_legend && data_filter_legend.length == 0) {
                        for (var i = 0, j = data_interpolate.length; i<j; i++) {
                            var items = data_interpolate[i];
                            for (var i_items = 0, j_items = items.length; i_items<j_items; i_items++) {
                                data_filter_legend.push(items[i_items]);
                            }
                        }
                    }

                    
                    model.emit('legend', blendentJson, conf.legendStyle, data_filter_legend, product_conf_util.getLegendConf(conf));

                    // 处理源数据
                    Render.text(texts_data);
                    Render.text(texts);
                    Render.img(imgs);

                    if (data_interpolate) {
                        var flag_interpolate = dataJson.flag_interpolate;
                        var _method = flag_interpolate === undefined? '不用插值': flag_interpolate? '全局插值': '局部插值'
                        model.emit('log.user', '系统判定 ['+_method+']!');
                        conrec(data_interpolate, blendentJson, true, function(err, data_conrec) {
                            if (err) {
                                model.emit('error', err);
                            } else {
                                Render.conrec(data_conrec);
                            }
                            
                            _afterChangeConf(err, s_time);
                        });
                        // var texts_data = [];
                        // for (var i = 0, j = data_interpolate.length; i<j; i++) {
                        //     for (var i_items = 0, items = data_interpolate[i], j_items = items.length; i_items<j_items; i_items++) {
                        //         var item = items[i_items];
                        //         if (item.v == 999999) {
                        //             item.v = '_'
                        //         }
                        //         texts_data.push({
                        //             txt: item.v+'_'+item.level,
                        //             lng: item.x,
                        //             lat: item.y,
                        //             fontSize: 14,
                        //             color: '#00ff00',
                        //             offsetY: -10,
                        //             offsetX: 6
                        //         });
                        //     }
                        // }
                        // Render.text(texts_data);
                    } else {
                        Render.micaps(dataJson, blendentJson);
                        _afterChangeConf(err, s_time);
                    }
                });
            });
        }
    }

    module.exports = init;
})