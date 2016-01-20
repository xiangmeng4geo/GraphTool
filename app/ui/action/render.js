!function() {
    var _require = Core.require;
    var util = _require('util');
    var Shape = _require('shape');
    var Pattern = _require('pattern');
    var _model;
    function _rnd() {
        var n = Math.floor(255 * Math.random());
        // n = n.toString(16);
        // if (n.length == 1) {
        //     n = '0'+n;
        // }
        return n;
    }
    function _rndColor() {
        var c = 'rgba('+_rnd()+', '+_rnd()+', '+_rnd()+', .5)';
        // var c = '#'+_rnd()+_rnd()+_rnd();
        return c;
    }
    // 处理conrec后的数据
    function _conrec(data) {
        console.log(data);
        var t_start = new Date();
        var shapes = [];
        if (data) {
            var data_list = data.list;
            // 处理插值完后的数据
            if (data_list && data_list.length > 0) {
                // data_list = data_list.slice(24, 25);
                data_list.forEach(function(polygon, i) {
                    var items = polygon.items;
                    items.isObj = true;
                    var sub = polygon.sub;
                    if (sub) {
                        sub.forEach(function(v) {
                            v.isObj = true;
                        });
                    }

                    shapes.push(new Shape.Polygon(items, {
                        fillStyle: polygon.color,
                        // strokeStyle: '#ff0000',
                        // lineWidth: 2
                    }, sub));

                    // items.forEach(function(p, i) {
                    //     shapes.push(new Shape.Text(i, 'lng:'+p.x+';lat:'+p.y+';color:blue'));
                    // });
                });
            }

            // var lines = data.lines;
            // if (lines) {
            //     for (var i = 0, j = lines.length; i<j; i++) {
            //         var v = lines[i];
            //         var first = v[0],
            //             end = v[v.length - 1];
            //         var is_close = first.x == end.x && first.y == end.y;
            //         // if (is_close && v.k != -2) {
            //         //     continue;
            //         // }
            //         // if (v.length < 3) {
            //         //     continue;
            //         // }
            //         // if (v.level != 5) {
            //         //     continue
            //         // }
            //         // if (i != 52) {
            //         //     continue;
            //         // }
            //         v.isObj = true;
            //         shapes.push(new Shape.Polyline(v, {
            //             strokeStyle: _rndColor(),
            //             lineWidth: 5
            //         }));

            //         // shapes.push(new Shape.Text(i, 'lng:'+first.x+';lat:'+first.y+';color:blue'));
            //         // if (i == 12)
            //         // v.forEach(function(p, i) {
            //         //     shapes.push(new Shape.Text(i, 'lng:'+p.x+';lat:'+p.y+';color:blue'));
            //         // });
            //     }
            // }
            // var lines = data.lines_group;
            // // var lines = data.lines;
            // if (lines) {
            //     for (var i = 0, j = lines.length; i<j; i++) {
            //         var v = lines[i];
            //         var first = v[0],
            //             end = v[v.length - 1];
            //         var is_close = first.x == end.x && first.y == end.y;
            //         // if (is_close && v.k != -2) {
            //         //     continue;
            //         // }
            //         // if (v.length < 3) {
            //         //     continue;
            //         // }
            //         // if (v.level != 5) {
            //         //     continue
            //         // }
            //         // if (i != 52) {
            //         //     continue;
            //         // }
            //         v.isObj = true;
            //         shapes.push(new Shape.Polyline(v, {
            //             strokeStyle: _rndColor(),
            //             lineWidth: 2
            //         }));

            //         shapes.push(new Shape.Text(i, 'lng:'+first.x+';lat:'+first.y+';color:blue'));
            //         if (i == 26)
            //         v.forEach(function(p, i) {
            //             shapes.push(new Shape.Text(i, 'lng:'+p.x+';lat:'+p.y+';color:red'));
            //         });
            //     }
            // }
        }
        _model.emit('log', 'render deal data takes '+(new Date() - t_start)+' ms!');
        if (shapes && shapes.length > 0) {
            // for (var i = 0, j = shapes.length; i<j; i++) {
            //     (function(arr, time) {
            //         setTimeout(function() {
            //             _model.emit('render', arr);
            //         }, time);
            //     })([shapes[i]], i*400)
            // }
            _model.emit('render', shapes);
        }
    }
    function _setModel(model) {
        _model = model;
    }
    // 处理文字
    // [{
    //  txt: 'test',
    //  x: 10,
    //  y: 10
    // }]
    function _text(texts) {
        if (texts) {
            var shapes = [];
            for (var i = 0, j = texts.length; i<j; i++) {
                var item = texts[i];
                shapes.push(new Shape.Text(item.txt, item));
            }
            if (shapes && shapes.length > 0) {
                _model.emit('render', shapes);
            }
        }
    }
    function _img(imgs) {
        if (imgs) {
            var shapes = [];
            for (var i = 0, j = imgs.length; i<j; i++) {
                var item = imgs[i];
                shapes.push(new Shape.Image(item.src, item));
            }
            if (shapes && shapes.length > 0) {
                _model.emit('render', shapes);
            }
        }
    }
    // 渲染micaps数据
    function _micaps(data, blendentJson) {
        var _getColor = util.color(blendentJson, true);
        var shapes = [];
        // 14类中的面
		var areas = data.areas;
        if (areas) {
            var len = areas.length;
			if (len > 0) {
                /*判断是不是大风降温数据 {*/
				var is_bigwind = false;
				for (var i = 0; i<len; i++) {
					var text = areas[i].symbols.text;
					if (/^040$/.test(text.trim())){
						is_bigwind = true;
						break;
					}
				}
				/*判断是不是大风降温数据 }*/
                for (var i = 0; i<len; i++){
                    var v = areas[i];
                    var symbols = v.symbols;
					var val_area = symbols? symbols.text : '';
                    var code = v.code;
                    var color = _getColor(val_area, code);
                    if(code == 24){
						// strokeColor = 'red';
						color = Pattern.Streak({
							strokeStyle: color,
							space: 1
						});
					}
                    // 处理雨夹雪颜色
                    v.items.isObj = true;
                    shapes.push(new Shape.Polygon(v.items, {
                        fillStyle: color
                    }));
                }
            }
        }
        // 14类中的特殊线，如冷锋、暖锋
		var line_symbols = data.line_symbols;
		if (line_symbols) {
            var color_symbols = {
				2: 'blue',
				3: 'red',
				38: 'red'
			};
            for (var i = 0, j = line_symbols.length; i<j; i++){
                var v = line_symbols[i];
				if(v.code == 0){
					continue;
				}
                // 霜冻线在地图内，其它都可在地图区域外
				if(v.code == 38){
					// delete option.zlevel;
					// option_special.width = 8;
				}
                v.items.isObj = true;
                shapes.push(new Shape.Polyline(v.items, {
                    type: v.code,
                    strokeStyle: color_symbols[v.code],
                    lineWidth: 2
                }));
			}
        }
        // 14类中的普通线
		var lines = data.lines;
		if(lines){
            for (var i = 0,j = lines.length; i<j; i++) {
                var line = lines[i];
				var point_arr = [];
				var points = line.point;
				if (points.length >= 2) {
                    points.isObj = true;
                    shapes.push(new Shape.Polyline(points, {
                        strokeStyle: '#1010FF',
                        lineWidth: 2
                    }));
				}
				var flags = line.flags;
				if(flags && flags.items && flags.items.length > 0){
					var text = flags.text;
                    for (i_flag = 0, item_flag = flags.items, j_flag = item_flag.length; i_flag < j_flag; i_flag++) {
                        var v = item_flag[i_flag];
                        shapes.push(new Shape.Text(text, 'lng:'+v.x+'px;lat:'+v.y+'px;font-size: 12px'));
                    }
				}
			}
		}
        var symbols = data.symbols;
        if(symbols){
            for (var i = 0, j = symbols.length; i<j; i++) {
                var v = symbols[i];
                var type = v.type;

                var text = '',
                    color = '',
                    fontSize = 30,
                    styleExtra = null,
                    offset = null,
                    fontWeight = '';
                if('60' == type){
                    text = 'H';
                    color = '#ff0000';
                }else if('61' == type){
                    text = 'L';
                    color = '#0000ff';
                }else if('37' == type){
                    text = '台';
                    color = '#00ff00';
                }else if('48' == type){
                    fontWeight = 'font-weight: bold;';
                    text = v.text;
                    fontSize = 14;
                    styleExtra = {
                        shadowBlur: '4px',
                        shadowColor: '#ffffff'
                    };
                    offset = {
                        x: 0,
                        y: -24
                    };
                    // color = '#1010FF';

                    shapes.push(new Shape.Text('╳', 'text-baseline:middle; text-align: center; lng:'+v.x+'px;lat:'+v.y+'px;font-size: 12px'));
                }
                if(text){
                    var _style = 'lng:'+(v.x)+'px;lat:'+v.y+'px;font-size: '+fontSize+'px;'+fontWeight;
                    if (color) {
                        _style += 'color:'+color+';';
                    }
                    if (offset) {
                        _style += 'offsetX: '+offset.x+'px; offsetY: '+offset.y+'px;';
                    }
                    if (styleExtra) {
                        for (var prop in styleExtra) {
                            _style += prop+': '+styleExtra[prop]+';';
                        }
                    }
                    shapes.push(new Shape.Text(text, _style));
                }
            }
        }
        if (shapes && shapes.length > 0) {
            _model.emit('render', shapes);
        }
    }
    module.exports = {
        setModel: _setModel,
        conrec: _conrec,
        text: _text,
        img: _img,
        micaps: _micaps
    };
}()
