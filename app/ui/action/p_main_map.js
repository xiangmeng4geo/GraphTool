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

    //统一处理其它库里的错误信息
    model.on('error', function(err) {
        console.log(err.msg||err.message||err);
    });
    
    var $geomap_container = $('#geomap_container');
    var $geomap = $('#geomap');
    var width_map, height_map;
    function initSize() {
        width_map = $geomap_container.width(),
        height_map = $geomap_container.height();
    }
    initSize();

    var geomap;
    // 得到一个投影并设置相关参数，让地图居中
    function _getProjection(leftup, rightdown) {
        var center = [leftup[0] + (rightdown[0] - leftup[0])/2, leftup[1] + (rightdown[1] - leftup[1])/2];
        var p = d3.geo.mercator().center(center).translate([width_map/2, height_map/2]);
        var p_a = p(leftup),
            p_b = p(rightdown);
        var scale_old = p.scale();
        var scale = Math.min(width_map/(p_b[0] - p_a[0]) * scale_old, height_map/(p_b[1] - p_a[1]) * scale_old);
        return p.scale(scale);
    }

    C.script('geo', function() {
        initSize();
        var leftup = [72.57, 58],
           rightdown = [136.60, 14.33];
        var projection = _getProjection(leftup, rightdown);
        // $geomap_container.on('click', function(e) {
        //     var x = e.offsetX,
        //         y = e.offsetY;
        //     console.log(x, y, projection.invert([x, y]));
        // });
        var zoom = d3.behavior.zoom()
            .translate(projection.translate())
            .scale(projection.scale())
            // .scaleExtent([projection.scale() /4 , projection.scale()*8])
            .on('zoom', function() {
                var e = d3.event;
                projection.scale(e.scale);
                projection.translate(e.translate);
                // geomap.refresh('geo');
                // geomap.refresh();
                model.emit('refresh');
            })
            // .on('zoomend', function() {
            //     console.log('end');
            //     geomap.refresh('weather');
            // });
        var drag = d3.behavior.drag().on('dragstart', function() {
            $geomap.addClass('dragging');
        }).on('dragend', function() {
            $geomap.removeClass('dragging');
        });
        model.on('projection.changeview', function(a, b) {
            projection = _getProjection(a, b);
            GeoMap.setProjection(projection);
            zoom.translate(projection.translate()).scale(projection.scale());
            // model.emit('refresh');
        });
        GeoMap.setGeo(Geo);
        GeoMap.setProjection(projection);

        setTimeout(function() {
            d3.select('#geomap').call(zoom).call(drag);

            var _options = {
                GeoMap: GeoMap,
                $geomap: $geomap,
                model: model,
                Shape: Shape,
                Pattern: Pattern
            }
            require(util_path.join(Core.CONST.PATH.BASE, '../test/ui/async-show'))(_options);
            // require(Core.remote('util').path.join(Core.CONST.PATH.BASE, '../test/ui/map-china'))(_options);
            require(util_path.join(Core.CONST.PATH.BASE, '../test/ui/map-shanxi'))(_options);
        }, 200);
    });
});
