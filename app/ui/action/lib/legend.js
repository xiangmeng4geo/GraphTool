!function() {
	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var shape = _require('shape');
	var pattern = _require('pattern');
	var util_shape = shape.util;

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

	// 常规上下显示 
	function LegendB(legend, options) {
		options = $.extend({
			width: 100,
			height: 20,
			lineWidth: 1,
			strokeStyle: '#000',
			fontSize: 14
		}, options);

		var font_color = '#000';
		var font = 'bold '+options.fontSize+'px sans-serif';

		var width = Math.max(options.width, 100*legend.length);
		var height = options.height;
		var lineWidth = options.lineWidth || 0;
		var strokeStyle = options.strokeStyle;

		var canvas = _getCanvas(width, height);
		var ctx = canvas.getContext('2d');

		var height_block = 16;
		var x_add = 0;
		var width_block = 30;
		var width_test = 0;
		var width_text_arr = [];
		var len_arr = [];
		var height_test = 0;
		var len_legend = legend.length;
		for (var i = 0; i<len_legend; i++) {
			var colors = legend[i].colors.slice(0);
			width_test += width_block;
			var w_arr = [];
			colors.forEach(function(c, ci) {
				w_arr.push(util_shape.getTextWidth(c.text, font));
			});
			var w_text = Math.max.apply(Math, w_arr);
			width_text_arr.push(w_text);

			width_test += w_text + 4;
			len_arr.push(colors.length);
		}
		var _len_test = Math.max.apply(Math, len_arr);
		height_test = height_block * _len_test + 4*(_len_test - 1);

		canvas = _getCanvas(width_test, height_test);
		ctx = canvas.getContext('2d');
		ctx.font = font;
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'left';
		ctx.lineWidth = 0.6;

		for (var i = 0; i<len_legend; i++) {
			var item = legend[i];
			var is_stripe = item.is_stripe;
			var colors = item.colors.slice(0);
			var len = colors.length;
			//从小到大
			colors.sort(function(a, b){
				return a.val[0] - b.val[0];
			});

			var w_text = width_text_arr[i];

			var x_text = x_add + width_block + 2;
			colors.forEach(function(c, ci) {
				ctx.save();
				var color = c.color;
				ctx.fillStyle = is_stripe? pattern.Streak({
					strokeStyle: color
				}): color;
				
				ctx.strokeStyle = color;
				ctx.beginPath();
				var y = ci*(height_block + 4);
				ctx.moveTo(x_add, y);
				ctx.lineTo(x_add+width_block, y);
				ctx.lineTo(x_add+width_block, y+height_block );
				ctx.lineTo(x_add, y+height_block);
				ctx.lineTo(x_add, y);
				ctx.fill();
				// ctx.fillRect(x_add, y, width_block, height_block);
				ctx.stroke();
				ctx.fillStyle = font_color;
				ctx.fillText(c.text, x_text, y + height_block/2);
				ctx.restore();
			});
			
			x_add = x_text + 2 + w_text;
		}

		return canvas;
	}
	fn_method['b'] = function(conf_legend, options) {
		return LegendB(conf_legend.blendent, options);
	}
	// 常规左右显示
	function _parse(conf_legend, options) {
		options = $.extend({
			type: TYPE_DEFAULT
		}, options);
		
		var method = fn_method[options.type];
		return method? method(conf_legend, options): null;
	}
	
	module.exports = _parse;
}()