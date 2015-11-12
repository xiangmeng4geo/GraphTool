!function() {
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

        // if (x != xp || y != yp) {
        //     ctx.lineTo(x, y);
        // }
        //
        // if (needClose) {
        //     ctx.lineTo(pixel_first[0], pixel_first[1]);
        // }
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
    function Text(text, style) {

    }

    exports.Polygon = Polygon;
    exports.Polyline = Polyline;
    exports.Text = Text;
}()
