!function() {
    var fs = require('fs');

    var TEXT_TEST = '国';
    var $ = Core.$;

    function _getPixelRatio() {
        var deviceRatio = window.devicePixelRatio || window.webkitDevicePixelRatio || 1;
        return deviceRatio > 1 ? 2 : 1;
    }
    var MIN_LEN = _getPixelRatio() > 1 ? 1 : 0.6;

    function _drawPath(ctx, points, projection, needClose) {
        var first = points[0];
        var pixel_first = projection(first);
        var x = xp = pixel_first[0],
            y = yp = pixel_first[1];

        ctx.moveTo(x, y);

        for (var i = 1, j = points.length; i<j; i++) {
            var p = points[i];
            var pixel = projection(p);
            x = pixel[0];
            y = pixel[1];
            if (Math.abs(x - xp) > MIN_LEN || Math.abs(y - yp) > MIN_LEN) {
                ctx.lineTo(x, y);
                xp = x;
                yp = y;
            }
        }

        if (x != xp || y != yp) {
            ctx.lineTo(x, y);
        }

        if (needClose) {
            ctx.lineTo(pixel_first[0], pixel_first[1]);
        }
    }

    function Polygon(points, style) {
        var _this = this;

        _this.style = style;
        _this.draw = function(ctx, projection) {
            _drawPath(ctx, points, projection, true);
        }
    }
    function Polyline(points, style) {
        var _this = this;

        _this.style = style;
        _this.draw = function(ctx, projection) {
            _drawPath(ctx, points, projection);
        }
    }
    var _ctx_empty = $('<canvas width="100" height="100">').get(0).getContext('2d');
    /**
     * 测试多行文字高度
     */
    function _getTextHeight(text, font) {
        _ctx_empty.save();
        if (font) {
            _ctx_empty.font = font;
        }

        text = (text + '').split('\n');
        var height = (_ctx_empty.measureText(TEXT_TEST).width + 2) * text.length;

        _ctx_empty.restore();

        return height;
    }
    function _getTextWidth() {

    }
    /**
     * font-size | fontSize
     * font-weight | fontWeight
     * font-weight | fontWeight
     * font-size | fontSize
     * font-family | fontFamily
     * text-align | textAlign
     * text-baseline | textBaseline
     * color
     * offset-x | offsetX
     * offset-y | offsetY
     * x
     * y
     * lng
     * lat
     * flag: {
     * 	src
     * 	center
     * 	width
     * 	height
     * }
     */
    function Text(text, style) {
        var _this = this;

        var _style = $.extend({}, style);
        var font = [];
        var font_style = _style['font-style'] || _style['fontStyle'];
        if (font_style) {
            font.push(font_style);
        }
        var font_weight = _style['font-weight'] || _style['fontWeight'];
        if (font_weight) {
            font.push(font_weight);
        }
        var font_size = _style['font-size'] || _style['fontSize'];
        if (font_size) {
            font.push(parseInt(font_size)+'px');
        }
        var font_family = _style['font-family'] || _style['fontFamily'];
        font.push(font_family || '"Microsoft Yahei"');

        font = font.join(' ');

        // [start|end|center|left|right]
        var text_align = _style['text-align'] || _style['textAlign'] || 'start';
        // [top|bottom|middle|alphabetic|hanging]
        var text_baseline = _style['text-baseline'] || _style['textBaseline'] || 'top';

        var text_color = _style['color'];

        _this.style = {
            textAlign: text_align,
            textBaseline: text_baseline
        };


        var lineheight = _getTextHeight(TEXT_TEST, font);

        text = text.split('\n');
        var x = _style.x,
            y = _style.y,
            lng = _style.lng,
            lat = _style.lat,
            x_offset = _style['offset-x'] || _style['offsetX'] || 0,
            y_offset = _style['offset-y'] || _style['offsetY'] || 0;

        var img_style;
        var flag = style.flag;
        if (flag) {
            var src = flag.src;
            var img = _getImg(src);

            var w = flag.width || img.width,
                h = flag.height || img.height;
            img_style = {
                img: img,
                width: w,
                height: h,
                is_center: flag.center
            };
            y_offset += h/2;
        }
        _this.draw = function(ctx, projection) {
            var pixel = isNaN(lng) && isNaN(lat)? [x, y]: projection([lng, lat]);
            ctx.font = font;

            if (text_color) {
                ctx.fillStyle = text_color;
            }
            var x_pixel = pixel[0],
                y_pixel = pixel[1];

            if (img_style) {
                var is_center = img_style.is_center;
                var w = img_style.width,
                    h = img_style.height;
                var x_img = is_center? x_pixel - w/2: x_pixel,
                    y_img = is_center? y_pixel - h/2: y_pixel;
                ctx.drawImage(img_style.img, x_img, y_img, w, h);
            }
            for (var i = 0, j = text.length; i<j; i++) {
                ctx.fillText(text[i], x_pixel + x_offset, y_pixel + y_offset + lineheight*i);
            }
        }
    }
    var _cache_img = {};
    function _getImg(src) {
        if (typeof src === 'string' || src.indexOf('data:image') !== 0) {
            if (_cache_img[src]) {
                return _cache_img[src];
            } else {
                // 同步处理image
                var img_buf = fs.readFileSync(src);
                var prefix = "data:" + 'image/png' + ";base64,";
                var base64 = new Buffer(img_buf, 'binary').toString('base64');
                var data = prefix + base64;
                img = new Image();
                img.src = data;
                return img;
                // img = data;
                // img = new Image();
                // loading = true;
                // img.onload = function() {
                //     _cache_img[src] = img;
                //     width = width || img.width;
                //     height = height || img.height;
                //     loading = false;
                //     _this.draw(_this.ctx, _this.projection);
                // }
                // img.src = src;
            }
        } else {
            return src;
        }
    }
    function ImageShape(src, style) {
        var _this = this;
        var width = style.width,
            height = style.height;
        var x = style.x,
            y = style.y;
        var lng = style.lng,
            lat = style.lat;

        var is_center = !!style.center;

        var img = _getImg(src);
        width = width || img.width;
        height = height || img.height;

        this.draw = function(ctx, projection) {
            var pixel = isNaN(lng) && isNaN(lat)? [x, y]: projection([lng, lat]);

            // 图片居中显示在点上
            if (is_center) {
                pixel[0] -= width/2;
                pixel[1] -= height/2;
            }
            ctx.drawImage(img, pixel[0], pixel[1], width, height);
        }
    }
    exports.Polygon = Polygon;
    exports.Polyline = Polyline;
    exports.Text = Text;
    exports.Image = ImageShape;
}()
