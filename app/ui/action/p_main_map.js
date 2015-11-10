/**
 * 管理主页上的地图模块
 */
Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var util_remote = C.remote;
    var util_loadLib = C.loadLib;
    var util_path = util_remote('util').path;

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
    // var ctx = $canvas.get(0).getContext('2d');
    function ready() {
        requireweb.config({
            paths:{
                'zrender': CONST_PATH_ZR,
                'zrender/shape/Base': CONST_PATH_ZR,
                'zrender/shape/Polyline': CONST_PATH_ZR,
                'zrender/shape/Polygon': CONST_PATH_ZR,
            }
        });

        GeoMap.init(function() {
            // var geomap = new GeoMap();
            // geomap.init({
            //     container: $('#geomap').get(0)
            // });

            map_ready();
        })
    }
    var ctx;
    function map_ready() {
        model.emit('map.ready');

        var $canvas = $('<canvas>').appendTo($('#geomap')).css({
            width: 800,
            height: 800
        }).attr('width', 800).attr('height', 800);
        // var $canvas = $('canvas');
        ctx = $canvas.get(0).getContext('2d');
        var file_test = 'E:/source/tonny-zhang.github.com/d3/data/border-china.json';
        var file_test1 = 'E:/source/tonny-zhang.github.com/d3/data/china.topojson.json';
        Geo.importFile(file_test1, function(err, dataset) {
            ctx.strokeStyle = 'red';
            var t_start = new Date();
            for(var i = 0, j = dataset.arcs.size(); i<j; i++) {
                drawArc(dataset.arcs.getArcIter(i));
            }
            console.log('end', new Date() - t_start);
        })
        Geo.importFile(file_test, function(err, dataset) {
            ctx.strokeStyle = 'blue';
            var t_start = new Date();
            for(var i = 0, j = dataset.arcs.size(); i<j; i++) {
                drawArc(dataset.arcs.getArcIter(i));
            }
            console.log('end', new Date() - t_start);
        })
    }
    function drawArc(iter) {
        if (!iter.hasNext()){
            return;
        }
        var _n = 1;
        ctx.beginPath();
        var val = projection([iter.x, iter.y]);
        ctx.moveTo(val[0], val[1]);
        while (iter.hasNext()) {
            var val = projection([iter.x, iter.y]);
            ctx.lineTo(val[0], val[1]);
            _n++;
        }
        ctx.stroke();
        return _n;
    }
    C.script('geo', function() {
        C.script('esl', function() {
            ready();
        });
    });
});
