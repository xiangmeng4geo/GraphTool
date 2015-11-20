!function() {
    var C = Core;
    var fs = require('fs');
    var Reader = C.remote('datareader');
    var Render = C.load('render');

    var geo_files = [];
    geo_files.push({
        file: 'H:/docs/2015/蓝PI相关/地理信息/陕西/市界+县界/新建文件夹/市界+所有县界/地市县界/地市界.shp',
        style: {
            strokeStyle: 'rgba(200, 200, 200, 1)',
            lineWidth: 0.5,
            // fillStyle: 'rgba(255, 255, 255, 1)'
        },
        clip: true,
        borderStyle: {
            strokeStyle: 'rgba(0, 0, 0, 0.8)',
            lineWidth: 3,
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

        Render.setModel(model);
        model.emit('projection.changeview', [104.72582600905484, 40.29761417442774], [113.21011197110165, 31.080076687873927]);
        model.on('refresh', function() {
            geomap.refresh();
        });
        model.on('render', function(shapes) {
            var t_start = new Date();
            shapes.forEach(function(shape) {
                geomap.addOverlay(shape);
            });
            model.emit('log', 'render data takes '+(new Date() - t_start)+' ms!');

            var util = C.remote('util');
            util.file.Image.save(util.path.join(C.remote('const').PATH.CACHE, '1.png'), geomap.export());
        });
        var blendent = [{
			"val": {
				"n": "温度",
				"v": "102"
			},
			"color_start": "#0000ff",
			"color_end": "#ff0000",
			"is_stripe": false,
			"number_min": "-30",
			"number_max": "40",
			"number_level": "8",
			"colors": [{
				"is_checked": true,
				"color": "#1f1885",
				"color_text": "#ffffff",
				"val": [0, 0.2],
				"text": "1, 10",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#1149d8",
				"color_text": "#ffffff",
				"val": [0.2, 0.6],
				"text": "10, 15",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#4db4f5",
				"color_text": "#000000",
				"val": [0.6, 1],
				"text": "15,20",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#f9de46",
				"color_text": "#000000",
				"val": [1, 1.5],
				"text": "20, 25",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#f9f2bb",
				"color_text": "#000000",
				"val": [1.5, 2],
				"text": "25, 30",
				"order": 0
			}, {
				"is_checked": true,
				"color": "#f9de46",
				"color_text": "#000000",
				"val": [2, 99999],
				"text": "30以上",
				"order": 0
			}]
		}];
        
        
         
        var t_start = new Date();
        var geomap = new GeoMap(model).init({
            container: $geomap
        });
        var canvas_legend = C.loadLib('legend')({
            blendent: blendent
        }, {
            height: $geomap.height()/2
        });
        // $canvas_legend.css({
        //     position: 'absolute',
        //     right: 0,
        //     top: $geomap.height()/4
        // }).appendTo($geomap);
        
        geomap.addOverlay(new Shape.Image(canvas_legend, {
            x: $geomap.width() - canvas_legend.width,
            y: $geomap.height()/4
        }));
        geomap.setGeo(geo_files, function() {
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
                var conrec = C.remote('conrec');
                // var conrec = require('../../app/workbench/conrec');
                conrec(data.interpolate, blendent, true, function(err, data_conrec) {
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
