!function() {
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
        _this.drawPath = function(ctx, projection) {
            _drawPath(ctx, points, projection, true);
        }
    }
    function Polyline(points, style) {
        var _this = this;

        _this.style = style;
        _this.drawPath = function(ctx, projection) {
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
    function Text(text,style) {
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
        var pos = [style.x, style.y];
        _this.drawPath = function(ctx, projection) {
            var pixel = projection(pos);

            ctx.font = font;

            if (text_color) {
                ctx.fillStyle = text_color;
            }
            var x = pixel[0],
                y = pixel[1];
            for (var i = 0, j = text.length; i<j; i++) {
                ctx.fillText(text[i], x, y + lineheight*i);
            }
        }
    }

    exports.Polygon = Polygon;
    exports.Polyline = Polyline;
    exports.Text = Text;
}()
