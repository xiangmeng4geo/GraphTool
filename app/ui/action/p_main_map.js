/**
 * 管理主页上的地图模块
 */
Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var util_remote = C.remote;
    var util_loadLib = C.loadLib;
    var util_path = util_remote('util').path;

    //统一处理其它库里的错误信息
    model.on('error', function(err) {
        console.log(err.message);
    });
    var $geomap_container = $('#geomap_container');
    var width_map, height_map;
    function initSize() {
        width_map = $geomap_container.width(),
        height_map = $geomap_container.height();
    }
    initSize();


    var CONST_PATH_ZR = './action/lib/zr';
    var GeoMap = util_loadLib('map');
    var Shape = util_loadLib('shape');
    var Pattern = util_loadLib('pattern');
    var d3 = util_loadLib('d3');


    // var projection = d3.geo.conicEqualArea()
    //   .parallels([29.5, 45.5])
    //   .rotate([-80, 0])
    //   .center([107, 31])
    //   .scale(300);
    //
    //   var projection = d3.geo.albers()
    //   .scale(300)
    //   .translate([800 / 2, 800 / 2])
    //   .rotate([-60, 30])
    //   .center([107, 31])
    //   .parallels([27, 45]);
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
        GeoMap.setGeo(Geo);
        GeoMap.setProjection(projection);

        var $div = $('<div>').css({
            position: 'absolute',
            left: 1,
            top: 1
        }).appendTo('body');
        function run() {
            $div.html(new Date().getTime());
            setTimeout(run, 50);
        }

        setTimeout(run, 50);
        setTimeout(function() {
        var t_start = new Date();
        var $geomap = $('#geomap');
        var zoom = d3.behavior.zoom()
                            .translate(projection.translate())
                            .scale(projection.scale())
                            // .scaleExtent([projection.scale() /4 , projection.scale()*8])
                            .on('zoom', function() {
                                var e = d3.event;
                                projection.scale(e.scale);
                                projection.translate(e.translate);
                                // geomap.refresh('geo');
                                geomap.refresh();
                            })
                            // .on('zoomend', function() {
                            //     console.log('end');
                            //     geomap.refresh('weather');
                            // });
        d3.select('#geomap').call(zoom);
        var geo_files = [];
        geo_files.push({
            file: 'E:/source/tonny-zhang.github.com/d3/data/world-110m.json',
            style: {
                strokeStyle: 'rgba(200, 200, 200, 0.7)',
                // lineWidth: 0.5,
                fillStyle: 'rgba(255, 255, 255, 1)'
            }
        });
        geo_files.push({
            file: 'E:/source/tonny-zhang.github.com/d3/data/border-china.json',
            style: {
                strokeStyle: 'rgba(0, 0, 0, 0.8)',
                lineWidth: 1.5,
                fillStyle: 'rgba(255, 255, 255, 1)',
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
                shadowOffsetX: 10,
                shadowOffsetY: 10
            },
            // clip:{}
        });
        geo_files.push({
            file: 'E:/source/nodejs_project/GraphTool/shell/geo/data-source/china_province.json',
            clip: {
                strokeStyle: 'rgba(255, 255, 255, 1)',
                lineWidth: 0.8,
                fillStyle: 'rgba(255, 255, 255, 1)',
            },
            style: {
                strokeStyle: 'rgba(200, 200, 200, 0.9)',
                lineWidth: 0.8,
                // fillStyle: 'rgba(0, 200, 0, 0.5)'
            }
        });
        // geo_files.push({
        //     file: 'E:/source/tonny-zhang.github.com/d3/data/china.topojson.json',
        //     clip: {
        //
        //     },
        //     style: {
        //         strokeStyle: 'rgba(200, 200, 200, 0.9)',
        //         lineWidth: 0.1,
        //         // fillStyle: 'rgba(0, 200, 0, 0.5)'
        //     }
        // });
        // geo_files.push({
        //     file: 'E:/source/nodejs_project/GraphTool/core/data/china.json',
        //     clip: {
        //
        //     },
        //     style: {
        //         strokeStyle: 'red',
        //         lineWidth: 1,
        //         fillStyle: 'rgba(200, 200, 0, 0.5)'
        //     }
        // });
        // geo_files.push({
        //     file: 'C:/Users/Administrator/Desktop/天津数据/天津政区.SHP',
        //     style: {
        //         strokeStyle: 'red',
        //         lineWidth: 1,
        //         fillStyle: 'rgba(200, 200, 0, 0.5)'
        //     }
        // });
        geo_files.push({
            file: 'H:/docs/2015/蓝PI相关/地理信息/陕西/市界+县界/新建文件夹/市界+所有县界/地市县界/地市界.shp',
            // clip: {
            //
            // },
            style: {
                strokeStyle: 'rgab(0, 255, 0, 1)',
                lineWidth: 2,
                // fillStyle: 'rgba(0, 0 , 200, 0.5)'
            }
        });
        // geo_files.push({
        //     file: 'E:/docs/2014工作/SK替代/地图底图及数据/河流/chian_river_Merge.json',
        //     style: {
        //         strokeStyle: 'green',
        //         lineWidth: 1
        //     }
        // });
        var geomap = new GeoMap(model).init({
            container: $geomap
        }).setGeo(geo_files, function() {
            model.emit('map.aftersetgeo');
            console.log('after setgeo', 'takes', new Date() - t_start);

            geomap.addOverlay(new Shape.Polygon([
                [107, 31],
                [115, 31],
                [100, 50]
            ], {
                // fillStyle: 'rgba(0, 0, 255, 0.5)'
                fillStyle: new Pattern.Streak(),
                strokeStyle: 'rgba(0, 0, 0, 0.6)'
            }));

            geomap.addOverlay(new Shape.Polyline([
                [107, 31],
                [102, 20],
                [110, 50]
            ], {
                strokeStyle: 'orange',
                lineWidth: 3
            }));

            geomap.addOverlay(new Shape.Text('我们是中国人\n你们好', {
                x: 107,
                y: 31,
                fontSize: 30,
                color: 'red',
                fontStyle: 'italic',
                fontWeight: 'bold'
            }));
        });
    }, 200);
    });

});
