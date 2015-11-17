!function() {
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
        // clip: {
        //
        // },
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


    module.exports = function init(options) {
        var GeoMap = options.GeoMap,
            Shape = options.Shape,
            $geomap = options.$geomap,
            model = options.model,
            Pattern = options.Pattern;
        model.on('refresh', function() {
            geomap.refresh();
        });
        var t_start = new Date();
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

            geomap.addOverlay(new Shape.Text('像素位置\n你们好', {
                x: 100,
                y: 200,
                fontSize: 20,
                color: 'blue',
                flag: {
                    src: 'H:/docs/2015/广告部/未标题-15.jpg',
                    width: 10,
                    height: 10,
                    center: true
                }
            }));
            geomap.addOverlay(new Shape.Text('我们是中国人\n你们好', {
                lng: 107,
                lat: 31,
                fontSize: 30,
                color: 'red',
                fontStyle: 'italic',
                fontWeight: 'bold',
                textAlign: 'center',
                offsetX: 100,
                offsetY: -30,
                flag: {
                    src: 'H:/docs/2015/广告部/未标题-15.jpg',
                    width: 10,
                    height: 10,
                    center: true
                }
            }));

            geomap.addOverlay(new Shape.Image('H:/docs/2015/广告部/未标题-15.jpg', {
                x: 100,
                y: 100,
                width: 100,
                height: 40,
                center: true
            }));

            geomap.addOverlay(new Shape.Image('H:/docs/2015/广告部/未标题-15.jpg', {
                lng: 100,
                lat: 50,
                width: 100,
                height: 40,
                center: true
            }));
        });
    }
}()
