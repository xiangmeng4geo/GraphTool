!function() {
	var $ = Core.$;
	var Dialog = require('./dialog');
	
	var FILETER_GEO = [{
		name: 'GeoJSON',
		extensions: ['json']
	}, {
		name: 'topoJSON',
		extensions: ['json']
	},{
		name: 'shp',
		extensions: ['shp']
	}];
	var FILETER_DEFAULT = 
	function openGeo() {
		Dialog.open({
			filters: FILETER_GEO
		});
	}
	
	var $doc = $(document);
	var UI = {};
	var types = {
		'geo': FILETER_GEO
	};
	$doc.delegate('.btn_file_browse', 'click', function() {
		var $this = $(this);
		var type = $this.data('type');
		Dialog.open({
			filters: types[type] || []
		}, function(file_path) {
			$this.prev('.txt_file').val(file_path);
		});
	});
	/**
	 * 初始化一个file
	 */
	function file($container, options){
		options = $.extend({
			width_btn: 40,
			width_minus: 0,
			type: 'geo',
			val: '',
			placeholder: ''
		}, options);
		
		var width_btn = options.width_btn;
		var width_minus = options.width_minus;
		
		if (!$container.data('inited')) {
			var tmpl_file = '<input type="text" value="'+options.val+'" placeholder="'+options.placeholder+'" class="txt_file" style="width: calc(100% - '+(width_btn + width_minus)+'px);"/>'+
						'<input type="button" data-type="'+options.type+'" class="btn_file_browse" value="浏览" style="width:'+width_btn+'px;"/>';
			$container.html(tmpl_file);
			$container.data('inited', true);
		}
		var $txt_file = $container.find('.txt_file');
		
		return function() {
			return $txt_file.val();
		}
	}
	
	$doc.delegate('.select', 'mouseleave', function() {
		$(this).find('ul').hide();
	})
	$doc.delegate('.select>span', 'click', function() {
		$(this).next().show();
	});
	$doc.delegate('.select ul li', 'click', function(e) {
		e.stopPropagation();
		var $this = $(this).addClass('selected');
		$this.siblings().removeClass('selected');
		var $select_show_text = $this.parent().prev('span');
		
		$select_show_text.data('val', $this.data('val')).html($this.html());
		$this.parent().hide();
	})
	function select($container, options) {
		options = $.extend({
			val: null,
			data: null,
		}, options);
		
		var val_selected = options.val;
		if (!$container.data('inited')) {
			var html = '<ul>';
			var data = options.data || [];
			for (var i = 0, j = data.length; i<j; i++) {
				var item = data[i];
				var text = item.text;
				var val = item.val;
				var type = item.type;
				var classStr = '';
				if (val_selected === val) {
					classStr = ' class="selected"';
				}
				html += '<li data-val="'+val+'"'+classStr+'>'+(type == 'img'?'<img src="'+text+'"/>': text)+'</li>';
			}
			html += '</ul>';
			var $html = $(html);
			var $val = $html.find('.selected');
			if ($val.length == 0) {
				$val = $html.find('li:first');
			}
			var tmpl = '<span>'+$val.html()+'</span>';
			$container.html(tmpl+html);
			$container.data('inited', true);
		}
		
		return {
			val: function() {
				var $val = $container.find('.selected');
				if ($val.length == 0) {
					$val = $container.find('li:first');
				}
				return $val.data('val');
			},
			selected: function(val) {
				var $item = $container.find('li')
						.removeClass('selected')
						.filter('[data-val="'+val+'"]')
						.addClass('selected');
				if ($item.length == 0) {
					$item = $container.find('li:first');
				}
				$container.find('>span').html($item.html());
			}
		}
	}
	UI.file = file;
	UI.select = select;
	
	module.exports = {
		UI: UI
	}
}();