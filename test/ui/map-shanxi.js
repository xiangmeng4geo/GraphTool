!function() {
    var fs = require('fs');
    var datareader = require('../../app/workbench/datareader');

    var geo_files = [];
    geo_files.push({
        file: 'H:/docs/2015/蓝PI相关/地理信息/陕西/市界+县界/新建文件夹/市界+所有县界/地市县界/地市界.shp',
        style: {
            strokeStyle: 'rgba(200, 200, 200, 1)',
            lineWidth: 2,
            fillStyle: 'rgba(255, 255, 255, 1)'
        },
        clip: true,
        borderStyle: {
            strokeStyle: 'rgba(0, 0, 0, 0.8)',
            lineWidth: 6,
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
            shadowOffsetX: 5,
            shadowOffsetY: 5
        }
    });



    module.exports = function init(options) {
        var GeoMap = options.GeoMap,
            Shape = options.Shape,
            $geomap = options.$geomap,
            model = options.model,
            Pattern = options.Pattern;
        model.emit('projection.changeview', [104.72582600905484, 40.29761417442774], [113.21011197110165, 31.080076687873927]);
        model.on('refresh', function() {
            geomap.refresh();
        });
        var t_start = new Date();
        var geomap = new GeoMap(model).init({
            container: $geomap
        }).setGeo(geo_files, function() {
            model.emit('map.aftersetgeo');

            var place_arr = require('H:/docs/2015/蓝PI相关/各方需求/陕西/地名+经纬度.json');

            var names = {};
            for (var i = 0, j = place_arr.length; i<j; i++) {
                var item = place_arr[i];
                if (item.name == item.pname) {
                    names[item.name] = item;
                    geomap.addOverlay(new Shape.Text(item.name, {
                        lng: item.lng,
                        lat: item.lat,
                        fontSize: 14,
                        color: 'rgba(0, 0, 0, 0.8)',
                        flag: {
                            src: 'H:/docs/2015/蓝PI相关/各方需求/陕西/ball.png',
                            width: 5,
                            height: 5,
                            center: true
                        }
                    }));
                }
            }
            geomap.addOverlay(new Shape.Text('陕西省2015年09月10日08时-自动站雨量分布图', {
                x: 10,
                y: 10,
                fontSize: 20,
                color: 'rgba(0, 0, 0, 0.8)',
                normal: true
            }));

            geomap.addOverlay(new Shape.Text('最大：泾河 4.5mm', {
                x: 10,
                y: 40,
                fontSize: 18,
                color: 'rgba(255, 0, 0, 0.8)',
                normal: true
            }));

            datareader.read({
                type: 'shanxi',
                file: 'H:/docs/2015/蓝PI相关/各方需求/陕西/数据/降水.txt'
            }, function(err, data) {
                console.log(err, data);
                var data_origin = data.data;
                for (var i = 0, j = data_origin.length; i<j; i++) {
                    var item = data_origin[i];
                    var item_show = names[item.name];
                    if (item_show) {
                        geomap.addOverlay(new Shape.Text(item.v, {
                            lng: item_show.lng,
                            lat: item_show.lat,
                            fontSize: 12,
                            color: 'rgba(0, 0, 0, 0.8)',
                            offsetY: -10,
                            offsetX: 6
                        }));
                    }
                }
            });
            // getData('H:/docs/2015/蓝PI相关/各方需求/陕西/数据/降水.txt', function(err, data) {
            //     for (var i = 0, j = data.length; i<j; i++) {
            //         var item = data[i];
            //         var item_show = names[item.name];
            //         if (item_show) {
            //             geomap.addOverlay(new Shape.Text(item.v, {
            //                 lng: item_show.lng,
            //                 lat: item_show.lat,
            //                 fontSize: 12,
            //                 color: 'rgba(0, 0, 0, 0.8)',
            //                 offsetY: -10,
            //                 offsetX: 6
            //             }));
            //         }
            //     }
            // });
        });
    }
}()
