!function() {
    var C = Core;
    var $ = C.$;
    var electron = require('electron');
    var nativeImage = electron.nativeImage;

    var TEXT_TEST = '国';

    function _getPixelRatio() {
        var deviceRatio = window.devicePixelRatio || window.webkitDevicePixelRatio || 1;
        return deviceRatio > 1 ? 2 : 1;
    }
    var MIN_LEN = _getPixelRatio() > 1 ? 1 : 0.6;

    function _drawPath(ctx, points, projection, needClose) {
        var isObj = points.isObj;
        var first = points[0];
        var pixel_first = projection(isObj? [first.x, first.y]: first);
        var x, xp, y, yp;
        x = xp = pixel_first[0];
        y = yp = pixel_first[1];

        ctx.moveTo(x, y);

        for (var i = 1, j = points.length; i<j; i++) {
            var p = points[i];
            var pixel = projection(isObj?[p.x, p.y]: p);
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
            ctx.fill();
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
        var font_style = _style['font-style'] || _style['fontStyle'] || 'normal';
        font.push(font_style);

        var font_weight = _style['font-weight'] || _style['fontWeight'] || 'normal';
        font.push(font_weight);

        var font_size = _style['font-size'] || _style['fontSize'] || 14;
        font.push(parseInt(font_size)+'px');

        var font_family = _style['font-family'] || _style['fontFamily'] || '"Microsoft Yahei"';
        font.push(font_family);

        font = font.join(' ');

        // [center|left|right]
        var text_align = _style['text-align'] || _style['textAlign'] || 'left';
        // [top|bottom|middle]
        var text_baseline = _style['text-baseline'] || _style['textBaseline'] || 'top';

        var text_color = _style['color'] || '#000000';

        var _normal = _style.normal;
        _this.style = {
            textAlign: text_align,
            textBaseline: text_baseline,
            normal: undefined === _normal? true: !!_normal
        };

        var lineheight = _getTextHeight(TEXT_TEST, font);

        text = (''+text).split('\n');
        var x = _style.x,
            y = _style.y,
            lng = _style.lng,
            lat = _style.lat,
            x_offset = _style['offset-x'] || _style['offsetX'] || 0,
            y_offset = _style['offset-y'] || _style['offsetY'] || 0;

        var width = _style.width,
            height = _style.height;
        if (width > 0) {
            if (text_align == 'center') {
                x += width/2;
            } else if (text_align == 'right') {
                x += width;
            }
        }
        if (height > 0) {
            if (text_baseline == 'middle') {
                y += height/2;
            } else if (text_baseline == 'bottom') {
                y += height;
            }
        }
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
        if (typeof src === 'string') {
            if (_cache_img[src]) {
                return _cache_img[src];
            } else {
                var data = src;
                if (src.indexOf('data:image') !== 0) {
                    // 同步处理image
                    var image = nativeImage.createFromPath(src);
                    data = image.toDataURL();
                }
                img = new Image();
                img.src = data;
                return img;
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
        if (width && !height) {
            height = img.height * width/img.width;
        }
        if (height && !width) {
            width = img.width * height/img.height;
        }
        width = width || img.width;
        height = height || img.height;

        var _normal = style.normal;
        _this.style = {
            normal: undefined === _normal? true: !!_normal
        }
        _this.draw = function(ctx, projection) {
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
