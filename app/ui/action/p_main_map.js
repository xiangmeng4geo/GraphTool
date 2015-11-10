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
        GeoMap.setImportor(Geo.importFile);
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
        new GeoMap().init({
            container: $('#geomap')
        }).setGeo([ {
            file: 'E:/source/tonny-zhang.github.com/d3/data/border-china.json',
            style: {
                strokeStyle: 'red',
                lineWidth: 3
            }
        }, {
            file: 'E:/source/tonny-zhang.github.com/d3/data/china.topojson.json',
            style: {
                strokeStyle: 'blue'
            }
        }, {
            file: 'H:/docs/2015/蓝PI相关/地理信息/陕西/市界+县界/新建文件夹/市界+所有县界/地市县界/地市界.shp',
            style: {
                strokeStyle: 'yellow'
            }
        }, {
            file: 'E:/source/tonny-zhang.github.com/d3/data/world-50m.json',
            style: {
                strokeStyle: 'orange'
            }
        }], function() {
            console.log('after setgeo', 'takes', new Date() - t_start);
        });
    }, 51);
    });
});
