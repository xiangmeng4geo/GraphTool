Core.init(function(model) {
	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var dialog =_require('dialog');
	var _alert = dialog.alert;
	var product_conf = _require('product_conf'); //直接把模块加载到UI进程
	var CONST = _require('const');
	var CONST_SIZE = CONST.SIZE;
	var CONST_SIZE_WIDTH = CONST_SIZE.WIDTH;
	var CONST_SIZE_HEIGHT = CONST_SIZE.HEIGHT;
	var CONST_SIZE_MINWIDTH = CONST_SIZE.MINWIDTH;
	var CONST_SIZE_MINHEIGHT = CONST_SIZE.MINHEIGHT;

	var conf_data_sys = product_conf.getSys() || {};
	var conf_data_size = conf_data_sys.size || (conf_data_sys.size = []);

	var HTML_SIZE = '<tr class="sys_size_row">'+
						'<td><input type="radio" name="sys_size" class="r_sys_size_default"/></td>'+
						'<td><input type="text" class="txt_sys_size txt_sys_size_name" placeholder="请输入名称"/></td>'+
						'<td><input type="text" class="txt_sys_size txt_sys_size_width" />X<input type="text" class="txt_sys_size txt_sys_size_height"/></td>'+
						'<td><span class="btn_dele_sys_size"/></td>'+
					'</tr>';

	var $table_sys_size = $('.table_sys_size');
	$table_sys_size.delegate('.btn_dele_sys_size', 'click', function() {
		var $this = $(this);
		dialog.confirm('确定要删除吗？', function() {
			$this.closest('tr').remove();
		});
	});
	function _getItemHtml(item) {
		item || (item = {});
		var $html = $(HTML_SIZE);
		if (item.is_default) {
			$html.find('.r_sys_size_default').prop('checked', true);
		}
		$html.find('.txt_sys_size_name').val(item.name || '');
		$html.find('.txt_sys_size_width').val(item.width || CONST_SIZE_WIDTH);
		$html.find('.txt_sys_size_height').val(item.height || CONST_SIZE_HEIGHT);

		return $html;
	}
	for (var i = 0, j = conf_data_size.length; i<j; i++) {
		$table_sys_size.append(_getItemHtml(conf_data_size[i]));
	}

	function _check() {
		var size_arr = [];
		var $rows = $table_sys_size.find('.sys_size_row');
		for (var i = 0, j = $rows.length; i<j; i++) {
			var $this = $rows.eq(i);
			var is_default = $this.find('.r_sys_size_default').prop('checked');
			var name = $this.find('.txt_sys_size_name').val() || '';
			name = name.trim();
			if (!name) {
				return _alert('请先输入名称!');
			}
			var $txt_sys_size_width = $this.find('.txt_sys_size_width');
			var width = $txt_sys_size_width.val() || '';
			width = width.trim();
			if (!width || isNaN(width)) {
				return _alert('请确保输入的宽度值为数字！');
			} else if (width < CONST_SIZE_MINWIDTH) {
				$txt_sys_size_width.val(CONST_SIZE_MINWIDTH);
				return _alert('宽度最小值为'+CONST_SIZE_MINWIDTH+'px!');
			}
			var $txt_sys_size_height = $this.find('.txt_sys_size_height');
			var height = $txt_sys_size_height.val() || '';
			height = height.trim();
			if (!height || isNaN(height)) {
				return _alert('请确保输入的高度值为数字！');
			} else if (width < CONST_SIZE_MINHEIGHT) {
				$txt_sys_size_height.val(CONST_SIZE_MINHEIGHT);
				return _alert('高度最小值为'+CONST_SIZE_MINHEIGHT+'px!');
			}

			size_arr.push({
				name: name,
				width: width,
				height: height,
				is_default: is_default
			});
		}
		return size_arr;
	}
	$('#btn_add_sys_size').click(function() {
		if ($.isArray(_check())) {
			$table_sys_size.append(_getItemHtml());
		}
	});	
	$('#btn_save_sys_size').click(function() {
		var size_arr = _check();

		if ($.isArray(size_arr)) {
			if (size_arr.length > 0) {
				conf_data_sys.size = size_arr;
				product_conf.setSys(conf_data_sys);
				model.emit('save');
				_alert('保存成功！');
			} else {
				_alert('暂时没有要保存的尺寸模板!');
			}
		}
	});
});