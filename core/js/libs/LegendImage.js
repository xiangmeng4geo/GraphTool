define('LegendImage',['zrender',
	'zrender/shape/Text',
	'zrender/shape/Rectangle'],function(Zrender, TextShape, RectangleShape){

	var $legend_tmp = $('<div class="legend_tmp"></div>').appendTo('#geomap_container');
	function genlegendImage(img_path, conf_legend){
		var unit = conf_legend.util,
			is_show_unit = conf_legend.is_show_unit,
			is_show_legend = conf_legend.is_show_legend,
			is_reverse = conf_legend.is_reverse,
			is_updown = conf_legend.is_updown,
			blendent = conf_legend.blendent;
		var $legend = $('<div></div>');
		
		$legend.addClass(is_updown? 'legend_portrait': 'legend_landscape');

		var html_color = '';
		var len = blendent.length;
		var html_title = '';
		$.each(blendent, function(i, v){
			var is_stripe = v.is_stripe || false;
			var title = v.val.n;
			html_title += '<span>'+title+'</span>';
			html_color += '<ul>';
			var colors = v.colors;
			colors = colors.filter(function(v, i){
				if(v.is_checked && !v.is_add){
					v._i = i;
					return v;
				}
			});
			colors.sort(function(a, b){
				return a.order - b.order || a._i - b._i;
			});
			if(is_reverse){
				colors.reverse();
			}
			var c_colors = colors.length;
			$.each(colors, function(color_i, color_v){
				var style_width = is_updown? '': 'width: '+(1/c_colors*100)+'%;';
				var style_color_text = is_updown? '': 'style="color: '+color_v.color_text+'"';
				html_color += '<li style="'+style_width+'"><div style="background-color: '+color_v.color+';" data-stripe='+is_stripe+'></div><span '+style_color_text+'>'+color_v.text+'</span></li>';
			});
			html_color += '</ul>';
		});
		var html = '';
		if(len > 1 && is_updown){
			html += '<div>'+html_title+'</div>';
		}
		html += html_color;
		$legend.html(html);
		$legend.appendTo($legend_tmp);

		// 上下显示时处理图例文字
		if(is_updown){
			var $ul = $legend.find('ul');
			$legend.find('>div span').each(function(i){
				$(this).width($ul.eq(i).width());
			});
		}
		
		var div = $('<div style="width: '+$legend.width()+'px;height: '+$legend.height()+'px"></div>').appendTo($legend_tmp).get(0);
		var _canvas = Zrender.init(div);
		
		$legend.find('li div').each(function(){
			var $this = $(this);
			var _is_stripe = $this.data('stripe');
			var color = $this.css('background-color');
			if(_is_stripe){
				color = new GeoMap.Pattern.Streak({
					strokeStyle: color,
					space: 1
				});
			}
			var pos = $(this).position();
			var style = {
		        x : pos.left+1,
		        y : pos.top+1,
		        width : $this.width()-2,
		        height: $this.height()-2,
		        brushType: 'both',
		        color: color
		    }
			_canvas.addShape(new RectangleShape({
			    style: style
			}));
			_canvas.render();
		});
		$legend.find('span').each(function(i, v){
			var $this = $(this);
			var style = {
				text: $this.text(),
				brushType : 'fill',
		        textAlign : 'left',
		        textBaseline : 'top',
		        lineWidth : 3,
		        color: $(this).css('color'),
		        textFont : $this.css('font'),
			};
			var pos = $this.position();
			style.x = pos.left;
			style.y = pos.top;
			if(!is_updown){ // 对横向图例进行处理
				if($this.parent().is('li')){
					style.x += parseFloat($this.width())/2;
					style.y += (parseFloat($this.css('margin-top'))||0)/2;
					
					style.textAlign = 'center';
					style.textBaseline = 'middle';
				}
			}
			_canvas.addShape(new TextShape({
				style: style
			}));
			_canvas.render();
		});
		var img_data = _canvas.toDataURL(null, 'rgba(0,0,0,0)'); // 保证图例为透明图片
		Core.Lib.util.file.tmp.legend.save(img_path, img_data);
		$legend_tmp.empty();
	}
	return genlegendImage;
});