!function() {
	var $ = Core.$;
	
	var TYPE_DEFAULT = 'a';
	var fn_method = {};

	function _getCanvas(width, height) {
		var $canvas = $('<canvas>').attr('width', width).attr('height', height);
		var canvas = $canvas.get(0);
		return canvas;
	}
	function Legend(colors, options) {
		options = $.extend({
			width: 20,
			height: 100,
			lineWidth: 1,
			strokeStyle: '#000',
			fontSize: 12
		}, options);

		var width = options.width;
		var height = options.height;
		var lineWidth = options.lineWidth || 0;
		var strokeStyle = options.strokeStyle;

		var WIDTH_SIZE = Math.min(16, width - 2 * lineWidth);//图例宽度
		var TEXT_LEFT = WIDTH_SIZE + 3;
		var HEIGHT_ARROW = WIDTH_SIZE * 1.3;

		var canvas = _getCanvas(width, height);
		var ctx = canvas.getContext('2d');
		
		var font = options.fontSize+'px sans-serif';
		ctx.font = font;
		var textWidths = [];
		colors.map(function(v) {
			var val = v.val;
			textWidths.push(ctx.measureText(val[0]).width);
			textWidths.push(ctx.measureText(val[1]).width);
		});
		var width_max = Math.max.apply(Math, textWidths);

		$(canvas).attr('width', TEXT_LEFT + WIDTH_SIZE + width_max).attr('height', height);
		ctx = canvas.getContext('2d');
		
		// window.ctx = ctx;
		colors = colors.slice(0);
		var len = colors.length;
		//从小到大
		colors.sort(function(a, b){
			return a.val[0] - b.val[0];
		});

		var num_normal = len;
		var isHaveMore = colors[len-1].val[1] >= 999;
		var isHaveLess = colors[0].val[0] <= -999;

		ctx.lineWidth = lineWidth;
		ctx.strokeStyle = strokeStyle;
		ctx.textAlign = 'left';
		ctx.textBaseline = 'middle';
		ctx.font = font;
		
		var x_start = lineWidth,
			y_start = 10;
		var height_tmp = height - y_start*2;
		if (isHaveMore) {
			num_normal--;
			height_tmp -= HEIGHT_ARROW;

			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x_start, HEIGHT_ARROW + y_start);
			ctx.lineTo(WIDTH_SIZE/2, y_start);
			ctx.lineTo(WIDTH_SIZE, HEIGHT_ARROW + y_start);

			ctx.stroke();
			ctx.fillStyle = colors[len-1].color;
			ctx.fill();
			ctx.restore();
		}

		if (isHaveLess) {
			num_normal--;
			height_tmp -= HEIGHT_ARROW;
		}
		var HEIGHT_SIZE = height_tmp / num_normal;

		if (!isHaveMore) {
			HEIGHT_ARROW = 0;
		}

		ctx.fillText(colors[len-1].val[isHaveMore? 0: 1], TEXT_LEFT, HEIGHT_ARROW + y_start);
		for ( var i = 0; i<num_normal; i++) {
			ctx.save();

			var y0 = HEIGHT_SIZE * i + HEIGHT_ARROW + y_start,
				y1 = y0 + HEIGHT_SIZE;

			ctx.beginPath();
			ctx.moveTo(x_start, y0);
			ctx.lineTo(WIDTH_SIZE, y0);
			ctx.lineTo(WIDTH_SIZE, y1);
			ctx.lineTo(x_start, y1);
			ctx.lineTo(x_start, y0);

			var item = colors[len - (isHaveMore? 2: 1) - i];
			ctx.fillStyle = item.color;
			ctx.fill();
			ctx.stroke();
			ctx.restore();
			
			ctx.fillText(item.val[0], TEXT_LEFT, y1);
		}

		if (isHaveLess) {
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(x_start, y1);
			ctx.lineTo(WIDTH_SIZE/2, y1 + HEIGHT_ARROW);
			ctx.lineTo(WIDTH_SIZE, y1);

			ctx.fillStyle = colors[0].color;
			ctx.fill();
			ctx.stroke();
			ctx.restore();
		}
		return canvas;
	}
	fn_method[TYPE_DEFAULT] = function(conf_legend, options) {
		return Legend(conf_legend.blendent[0].colors, options);
	}

	function LegendB(colors, options) {
		options = $.extend({
			width: 100,
			height: 20,
			lineWidth: 1,
			strokeStyle: '#000',
			fontSize: 12
		}, options);

		var width = options.width;
		var height = options.height;
		var lineWidth = options.lineWidth || 0;
		var strokeStyle = options.strokeStyle;

		colors = colors.slice(0);
		var len = colors.length;
		//从小到大
		colors.sort(function(a, b){
			return a.val[0] - b.val[0];
		});


	}
	function _parse(conf_legend, options) {
		options = $.extend({
			type: TYPE_DEFAULT
		}, options);
		
		var method = fn_method[options.type];
		return method? method(conf_legend, options): null;
	}
	
	module.exports = _parse;
}()