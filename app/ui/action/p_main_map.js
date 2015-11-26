/* global Geo */
/**
 * 管理主页上的地图模块
 */
Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var _require = C.require;
    var util_common = _require('util');
    var util_path = util_common.path;
    var GeoMap = _require('map');
    var Shape = _require('shape');
    var Pattern = _require('pattern');
    var d3 = _require('d3');
    var util = _require('util');
    var util_file = util.file;
    var CONST = _require('const');
    var Geo = _require('geo');
    var CONST_BOUND = CONST.BOUND;
    var place_arr = util_file.readJson(CONST.GEO.FILE);

    var $geomap_container = $('#geomap_container');
    var $geomap = $('#geomap');
    var width_map, height_map;
    function initSize() {
        width_map = $geomap_container.width(),
        height_map = $geomap_container.height();
    }
    initSize();

    // 得到一个投影并设置相关参数，让地图居中
    var _last_key_project;
    function _getKeyOfProjection(leftup, rightdown) {
        return JSON.stringify(leftup) + '_' + JSON.stringify(rightdown);
    }
    function _getProjection(leftup, rightdown) {
        _last_key_project = _getKeyOfProjection(leftup, rightdown);
        var center = [leftup[0] + (rightdown[0] - leftup[0])/2, leftup[1] + (rightdown[1] - leftup[1])/2];
        var p = d3.geo.mercator().center(center).translate([width_map/2, height_map/2]);
        var p_a = p(leftup),
            p_b = p(rightdown);
        var scale_old = p.scale();
        var scale = Math.min(width_map/(p_b[0] - p_a[0]) * scale_old, height_map/(p_b[1] - p_a[1]) * scale_old);
        return p.scale(scale);
    }
    var geomap;
    var projection = _getProjection(CONST_BOUND.WN, CONST_BOUND.ES);
    var zoom = d3.behavior.zoom()
            .translate(projection.translate())
            .scale(projection.scale())
            // .scaleExtent([projection.scale() /4 , projection.scale()*8])
            .on('zoom', function() {
                var e = d3.event;
                projection.scale(e.scale);
                projection.translate(e.translate);
                model.emit('refresh');
            });
    var drag = d3.behavior.drag().on('dragstart', function() {
        $geomap.addClass('dragging');
    }).on('dragend', function() {
        $geomap.removeClass('dragging');
    });
    d3.select('#geomap').call(zoom).call(drag);
    model.on('product.change', function(productName){
        geomap && geomap.clear();
    });
    model.on('projection.changeview', function(a, b) {
        var key = _getKeyOfProjection(a, b);
        if (key !== _last_key_project) {
            projection = _getProjection(a, b);
            GeoMap.setProjection(projection);
            zoom.translate(projection.translate()).scale(projection.scale());
            // model.emit('refresh');
        }
    });
    model.on('refresh', function() {
        geomap.refresh();
    });
    model.on('render', function(shapes) {
        var t_start = new Date();
        shapes.forEach(function(shape) {
            geomap.addOverlay(shape);
        });
        model.emit('log', 'render data takes '+(new Date() - t_start)+' ms!');
    });
    model.on('export', function() {
        util_file.Image.save(util_path.join(CONST.PATH.CACHE, '1.png'), geomap.export());
    });
    model.on('legend', function(blendent) {
        var canvas_legend = _require('legend')({
            blendent: blendent
        }, {
            height: height_map/2
        });
        geomap.addOverlay(new Shape.Image(canvas_legend, {
            x: width_map - canvas_legend.width,
            y: height_map/4
        }));
    });
    model.on('geo', function(options, cb_afterGeo) {
        var textStyle = options.textStyle;
        geomap.setGeo(options, function() {
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

            cb_afterGeo && cb_afterGeo(names);
        });
    });

    model.on('ready', function() {
        GeoMap.setGeo(Geo);
        GeoMap.setProjection(projection);
        initSize();

        geomap = new GeoMap(model).init({
            container: $geomap
        });

        var _options = {
            GeoMap: GeoMap,
            $geomap: $geomap,
            model: model,
            Shape: Shape,
            Pattern: Pattern
        }
        require(util_path.join(Core.CONST.PATH.BASE, '../test/ui/async-show'))(_options);
        // require(util_path.join(Core.CONST.PATH.BASE, '../test/ui/map-china-conf'))(_options);
        // require(util_path.join(Core.CONST.PATH.BASE, '../test/ui/map-shanxi'))(_options);
        require(util_path.join(Core.CONST.PATH.BASE, '../test/ui/map-shanxi-conf'))(_options);

        // model.emit('map.changeconfig', 'H:/docs/2015/蓝PI相关/各方需求/陕西/data.json');
    });
});
