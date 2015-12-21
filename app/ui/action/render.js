!function() {
    var _require = Core.require;
    var util = _require('util');
    var Shape = _require('shape');
    var Pattern = _require('pattern');
    var _model;
    // 处理conrec后的数据
    function _conrec(data) {
        var t_start = new Date();
        var shapes = [];
        if (data) {
            var relation = data.r,
                data_list = data.list;
            // 处理插值完后的数据
            if (relation && relation.length > 0 && data_list && data_list.length > 0) {
                relation.forEach(function(v, i) {
                    var index = v[0],
                        color = v[1],
                        indexs_clip = v[2];

                    shapes.push(new Shape.Polygon(data_list[index], {
                        fillStyle: color
                    }));
                });
            }
        }
        _model.emit('log', 'render deal data takes '+(new Date() - t_start)+' ms!');
        if (shapes && shapes.length > 0) {
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
                var v = lines[i];
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
                    shapes.push(new Shape.Text(text, 'left:'+v.x+'px;top:'+v.y+'px;font-size: 12px'));
				}
			}
		}
        if (shapes && shapes.length > 0) {
            _model.emit('render', shapes);
        }
        // var symbols = data.symbols;
    }
    module.exports = {
        setModel: _setModel,
        conrec: _conrec,
        text: _text,
        img: _img,
        micaps: _micaps
    };
}()
