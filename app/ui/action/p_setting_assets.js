Core.init(function() {
	var C = Core,
		_require = C.require,
		$ = C.$,
		dialog = _require('dialog'),
		product_conf = _require('product_conf'),
		getSys = product_conf.getSys;

	var $asset_list = $('.asset_list');
	
	$asset_list.delegate('.btn_dele_asset', 'click', function() {
		var $layer = $(this).closest('li');
		dialog.confirm('确定要删除吗？', function() {
    		$layer.remove();
    		save();
    	});
	});
	$asset_list.delegate('.checkbox', 'click', save);

	function save() {
		var assets = [];
		$asset_list.find('li').each(function() {
			var $this = $(this);
			var d = {flag: $this.find('[type=checkbox]').prop('checked'), id: $this.data('id')};
			d.style = $this.data('style');
			var $span = $this.find('textarea');
			if ($span.length > 0) {
				d.text = $span.val();
			} else {
				d.src = $this.find('img').attr('src');
			}
			assets.push(d);
		});
		var conf = getSys();
		conf.assets = assets;
		product_conf.setSys(conf);
	}
	

	var _getId = (function() {
		var id = 0;
		return function() {
			return 'cb_' + (id++);
		}
	})();
	var conf_assets = getSys.getAssets();
	if (conf_assets) {
		var html = '';
		var html_img = '',
			html_text = '';
		$.each(conf_assets, function(i, v) {
			var text = v.text;
			var style = v.style;
			var id = v.id;
			if (!text) {
				html_img += '<li data-style="'+style+'" data-id="'+id+'">'+
								'<img src="'+v.src+'"/>'+
								'<div class="checkbox"><input type="checkbox" '+(v.flag?'checked':'')+'/><label></label></div>'+
								'<span class="btn_dele_asset"></span>'+
							'</li>';
			} else {
				html_text += '<li data-style="'+style+'" data-id="'+id+'">'+
								'<div class="fl">'+
									'<div class="checkbox"><input type="checkbox" '+(v.flag?'checked':'')+'/><label></label></div><br/>'+
									'<span class="btn_dele_asset"></span>'+
								'</div>'+
								'<textarea>'+text+'</textarea>'+
							'</li>';
			}
		});

		if (html_img) {
			html += '<div class="asset_imgs">'+
						'<div class="asset_title">图片资源</div>'+
						'<ul>';
			html += 		html_img;
			html += 	'</ul>'+
					'</div>';
		}
		if (html_text) {
			html += '<div class="asset_texts">'+
						'<div class="asset_title">文字资源</div>'+
						'<ul>';
			html += 		html_text;
			html += 	'</ul>'+
					'</div>';
		}
		if (!html) {
			html += '暂时还没有添加资源，请在地图上对添加完成的组件右键添加！';
		}
		$asset_list.html(html);
		$('.checkbox').each(function() {
			var $this = $(this);
			var id = _getId();
			$this.find('[type=checkbox]').attr('id', id);
			$this.find('label').attr('for', id);
		});
	}
});