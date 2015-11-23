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
	UI.file = file;
	
	module.exports = {
		UI: UI
	}
}();