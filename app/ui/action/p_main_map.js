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

    });
    var CONST_PATH_ZR = './action/lib/zr';
    var GeoMap = util_loadLib('map');
    var d3 = util_loadLib('d3');
    var projection = d3.geo.mercator()
                            .center([107, 31])
                            .scale(600)
                            .translate([800/2, 800/2]);

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
    C.script('geo', function() {
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
                            .scaleExtent([projection.scale() /4 , projection.scale()*8])
                            .on('zoom', function() {
                                var e = d3.event;
                                projection.scale(e.scale);
                                projection.translate(e.translate);
                                // console.log(e.scale, e.translate, projection.scale(), projection.translate());
                                geomap.refresh();
                            })
        d3.select('#geomap').call(zoom);
        var geo_files = [];
        geo_files.push({
            file: 'E:/source/tonny-zhang.github.com/d3/data/world-50m.json',
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
            }
        });
        geo_files.push({
            file: 'E:/source/tonny-zhang.github.com/d3/data/china.topojson.json',
            style: {
                strokeStyle: 'rgba(200, 200, 200, 0.9)',
                lineWidth: 0.1,
                // fillStyle: 'rgba(0, 200, 0, 0.5)'
            }
        });
        // geo_files.push({
        //     file: 'E:/source/nodejs_project/GraphTool/core/data/china.json',
        //     style: {
        //         strokeStyle: 'red',
        //         lineWidth: 1,
        //         fillStyle: 'rgba(200, 200, 0, 0.5)'
        //     }
        // });
        geo_files.push({
            file: 'H:/docs/2015/蓝PI相关/地理信息/陕西/市界+县界/新建文件夹/市界+所有县界/地市县界/地市界.shp',
            style: {
                strokeStyle: 'rgab(0, 255, 0, 1)',
                lineWidth: 1.5,
                fillStyle: 'rgba(0, 0 , 200, 0.5)'
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
            console.log('after setgeo', 'takes', new Date() - t_start);
        });
    }, 200);
    });

});
