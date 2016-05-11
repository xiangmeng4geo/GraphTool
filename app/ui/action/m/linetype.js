Core.init(function() {
    var C = Core,
        $ = C.$,
        _require = C.require;
    var shape = _require('shape');
    
    function _getImg(conf, option) {
        option = $.extend(true, {
            showText: true,
            textPos: 'right', // left|right
            padding: 10,
            fontSize: 14,
            fontColor: '#000'
        }, option);
        
        var outline = conf.outline,
			inline = conf.inline;
        
        var width = conf.legend_width || 50,
            height = conf.legend_height || 10;
        if (outline || inline) {
            var height_middle = height/2;
			var canvas = $('<canvas>').attr({
				height: height,
				width: width
			}).get(0);
			var ctx = canvas.getContext('2d');
			if (outline) {
				ctx.lineWidth = outline.lineWidth;
				ctx.strokeStyle = outline.strokeStyle;
				
				ctx.moveTo(0, height_middle);
				ctx.lineTo(width, height_middle);
				ctx.stroke();
			}
			if (inline) {
				ctx.lineWidth = inline.lineWidth;
				ctx.strokeStyle = inline.strokeStyle;
				
				var lineDash = inline.lineDash;
				if (lineDash) {
					ctx.setLineDash(lineDash);
				}
				
				ctx.moveTo(0, height_middle);
				ctx.lineTo(width, height_middle);
				ctx.stroke();
			}
        }
        
        var textPos = option.textPos;
        var padding = option.padding;
        var width_text = 60;
        var width_wrap = width + width_text + padding + (textPos == 'left'? width_text/2:0),
            height_wrap = Math.max(height + 0, 20);
        
        // var left_text = width + padding,
        //     top_text = heigh_wrap/2;
        var canvas_wrap = $('<canvas>').attr({
            height: height_wrap,
            width: width_wrap
        }).get(0);
        var ctx_wrap = canvas_wrap.getContext('2d');
        
        var name = conf.desc;
        var font = shape.util.getFont({
            fontSize: option.fontSize
        });
        
        ctx_wrap.fillStyle = option.fontColor;
        ctx_wrap.textBaseline = 'middle';
        ctx_wrap.textAlign = textPos == 'left'? 'center': 'left';
        
        
        ctx_wrap.font = font;
        ctx_wrap.fillText(name, textPos == 'left'? width_text: width + padding, height_wrap/2);
        
        new shape.Image(canvas.toDataURL(), {
            x: textPos == 'left'? width_text*1.5 + padding: 0,
            y: height_wrap/2 - height/2
        }).draw(ctx_wrap);
        
        return {
            src: canvas_wrap.toDataURL(),
            width: width_wrap,
            height: height_wrap
        }
    }    
    module.exports = _getImg;
})