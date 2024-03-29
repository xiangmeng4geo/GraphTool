!function() {
    var C = Core;
    var _require = C.require;
    var Reader = _require('datareader');
    var Render = _require('render');
    var util = _require('util');
    var util_file = util.file;
    var util_path = util.path;
    var CONST = _require('const');
    var CONST_PATH_CACHE = CONST.PATH.CACHE;
    var CONF_GEO = _require('product_conf').getSys.getGeo('陕西地图');
    var CONF_LEGEND = _require('product_conf').getSys.getLegend('降水配色');

    var geo_files = CONF_GEO.maps;
    var textStyle = CONF_GEO.textStyle;
    var bound = CONF_GEO.bound;
    module.exports = function init(options) {
        var GeoMap = options.GeoMap,
            Shape = options.Shape,
            $geomap = options.$geomap,
            model = options.model,
            geomap = options.geomap,
            Pattern = options.Pattern;

        Reader.setModel(model);
        Render.setModel(model);

        model.emit('projection.changeview', bound.wn, bound.es);
        model.on('refresh', function() {
            geomap.refresh();
        });
        model.on('render', function(shapes) {
            var t_start = new Date();
            shapes.forEach(function(shape) {
                geomap.addOverlay(shape);
            });
            model.emit('log', 'render data takes '+(new Date() - t_start)+' ms!');


            util_file.Image.save(util_path.join(CONST_PATH_CACHE, '1.png'), geomap.export());
        });
        
        var blendent = CONF_LEGEND.blendent;


        var t_start = new Date();
        // var geomap = new GeoMap(model).init({
        //     container: $geomap
        // });
        var canvas_legend = _require('legend')({
            blendent: blendent
        }, {
            height: $geomap.height()/2
        });

        geomap.addOverlay(new Shape.Image(canvas_legend, {
            x: $geomap.width() - canvas_legend.width,
            y: $geomap.height()/4
        }));
        geomap.setGeo(geo_files, function() {
            model.emit('map.aftersetgeo');

            var place_arr = util_file.read(CONST.GEO.FILE, true);
            // var place_arr = require('H:/docs/2015/蓝PI相关/各方需求/陕西/地名+经纬度.json');

            var cb_prov = textStyle.prov,
                cb_city = textStyle.city,
                cb_county = textStyle.county;

            var FLAGS = CONST.GEO.FLAGS;
            var flag = null;
            for (var i = 0, j = FLAGS.length; i<j; i++) {
                var f = FLAGS[i];
                if (f.val === textStyle.flag) {
                    if (f.type == 'img') {
                        flag = {
                            src: f.val,
                            width: 5,
                            height: 5,
                            center: true
                        }
                    }
                    break;
                }
            }
            var names = {};
            if (cb_prov || cb_city || cb_county) {
                for (var i = 0, j = place_arr.length; i<j; i++) {
                    var item = place_arr[i];
                    var name = item.name,
                        pname = item.pname;
                    if ((cb_prov && !pname) ||
                        (cb_city && name == pname) ||
                        (cb_county && pname && pname !== name)) {
                        names[item.name] = item;
                        geomap.addOverlay(new Shape.Text(item.name, {
                            lng: item.lng,
                            lat: item.lat,
                            fontSize: textStyle.fontSize || 14,
                            color: textStyle.color || 'rgba(0, 0, 0, 0.8)',
                            flag: flag
                        }));
                    }
                }
            }
            geomap.addOverlay(new Shape.Text('陕西省2015年09月10日08时-自动站雨量分布图', {
                x: 10,
                y: 10,
                fontSize: 20,
                color: 'rgba(0, 0, 0, 0.8)'
            }));

            geomap.addOverlay(new Shape.Text('最大：泾河 4.5mm', {
                x: 10,
                y: 40,
                fontSize: 18,
                color: 'rgba(255, 0, 0, 0.8)'
            }));

            Reader.read({
                type: 'shanxi',
                file: 'H:/docs/2015/蓝PI相关/各方需求/陕西/数据/降水.txt'
            }, function(err, data) {
                if (err) {
                    return model.emit('error', err);
                }
                // console.log(err, data);
                var data_origin = data.data;
                for (var i = 0, j = data_origin.length; i<j; i++) {
                    var item = data_origin[i];
                    var item_show = names[item.name];
                    // if (item_show) {
                        geomap.addOverlay(new Shape.Text(item.v, {
                            // lng: item_show.lng,
                            // lat: item_show.lat,
                            lng: item.x,
                            lat: item.y,
                            fontSize: 12,
                            color: item_show?'rgba(255, 0, 0, 0.8)': 'rgba(0, 0, 0, 0.8)',
                            offsetY: -10,
                            offsetX: 6
                        }));
                    // }
                }
                _require('conrec').setModel(model)(data.interpolate, blendent, true, function(err, data_conrec) {
                    if (err) {
                        return model.emit('error', err);
                    }
                    // console.log('after conrec');
                    // console.log(data_conrec);
                    Render.render(data_conrec);
                });
            });
        });
    }
}()
