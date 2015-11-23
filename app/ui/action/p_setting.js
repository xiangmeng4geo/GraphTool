!function() {
	var C = Core;
	var $ = C.$;
	var dialog = C.load('dialog');
	var _alert = dialog.alert;
	var _confirm = dialog.confirm;
	var product_conf = C.loadRemote('product_conf'); //直接把模块加载到UI进程
	var util_ui = C.load('util').UI;
	
	var conf_data_sys = product_conf.getSys() || {};
	var conf_data_geo = conf_data_sys.geo || (conf_data_sys.geo = []);
	
	var $doc = $(document);
	$doc.delegate('[type=range]', 'input', function() {
		var $this = $(this);
		$this.next('span').text($this.val());
	});
	
	// 对resize-horizontal组件初始化
	{
		$doc.on('mouseup.resize', function(){
			$doc.off('mousemove.resize');
		});
		$('resize-horizontal').each(function() {
			var $this = $(this);
			var $left = $this.prev();
			var $right = $this.next();
			$this.on('mousedown.resize', function(e_down) {
				var x_old = e_down.pageX;
				$doc.off('mousemove.resize').on('mousemove.resize', function(e_move){
					var w_old = $left.width();
					var x_new = e_move.pageX;
					var x = x_new - x_old;
					var w_new = w_old + x;
					if(w_new >= 100 && w_new <= 300){
						$left.width(w_new);
						$this.css({
							left: '+='+x
						});
						$right.css({
							left: '+='+x
						});
						x_old = x_new;
					}
				});
			});
		});
	}
	
	// tab切换效果
	{
		var $tabContentItems = $('tab-content item');
		$('tab item').click(function() {
			$tabContentItems.removeClass('on').eq($(this).index()).addClass('on');
		});
	}
	
	$doc.delegate('.map_item .btn_up', 'click', function() {
		var $this = $(this);
		var $p = $this.closest('.map_item');
		$p.insertBefore($p.prev());
	});
	$doc.delegate('.map_item .btn_down', 'click', function() {
		var $this = $(this);
		var $p = $this.closest('.map_item');
		$p.insertAfter($p.next());
	});
	$doc.delegate('.map_item .btn_dele', 'click', function() {
		$(this).closest('.map_item').slideUp(function() {
			$(this).remove();
		});
	});
	
	function _getChecked($checkbox){
		return $checkbox.prop('checked');
	}
	function _setChecked($checkbox, checked) {
		$checkbox.prop('checked', checked);
	}
	function _setSelect($select, val, data) {
		if (data) {
			var html = '';
			for (var i = 0, j = data.length; i<j; i++) {
				var d = data[i];
				html += '<option value="'+d.v+'">'+d.n+'</option>'
			}
			$select.html(html);
		}
		if (undefined === val || null === val) {
			$select.find('option').removeAttr('selected');
		} else {
			$select.find('[value='+val+']').attr('selected', 'selected');
		}
	}
	
	var $txt_map_name = $('#txt_map_name');
	var $map_conf_list = $('#map_conf_list');	
	var $map_conf = $('#map_conf');
	var $cb_prov = $('#cb_prov');
	var $cb_city = $('#cb_city');
	var $cb_county = $('#cb_county');
	var $c_map_text = $('#c_map_text');
	var $n_map_text = $('#n_map_text');
	var $s_map_text = $('#s_map_text');
	
	var tmpl_map_item = $('#tmpl_map_item').text();
	
	var is_can_add_map_file = true;
	var editting = false;
	function _clearMapConf() {
		$map_conf.find('.map_item').remove();
		$txt_map_name.val('');
		_setChecked($cb_prov, false);
		_setChecked($cb_city, false);
		_setChecked($cb_county, false);
		$n_map_text.val(12);
		_setSelect($s_map_text);
		
		is_can_add_map_file = true;
	}
	function _saveConfData() {
		// console.log(JSON.stringify(conf_data_geo))
		conf_data_sys.geo = conf_data_geo;
		console.log(JSON.stringify(conf_data_sys))
		product_conf.setSys(conf_data_sys);
	}
	
	function _saveMapConf(cb) {
		var map_name = $txt_map_name.val();
		if (!map_name) {
			return _alert('请先输入自定义地图模块名');
		} else {
			map_name = map_name.trim();
			var $list_check = $map_conf_list.find('li:not(.on)');
			for (var i = 0, j = $list_check.length; i<j; i++) {
				if ($list_check.eq(i).text() == map_name) {
					return _alert('请确保名称不重复');	
				}
			}
		}
		
		var data = {
			name: map_name
		};
		var list = [];
		$map_conf.find('.map_item').each(function() {
			var $this = $(this);
			
			// var file = $this.find('.f_map_item').val();
			var file = util_ui.file($this.find('.file'))();
			var lineWidth = $this.find('.n_map_item').val();
			var strokeStyle = $this.find('.c_map_item').val();
			var clip = _getChecked($this.find('.cb_map_item'));
			var is_use_border = _getChecked($this.find('.cb_map_item_border'));
			var b_lineWidth = $this.find('.n_map_item_line').val();
			var b_strokeStyle = $this.find('.c_map_item_line').val();
			// var b_fillStyle = $this.find('.c_map_item_fill').val(); //暂时不考虑填充色
			var shadow_color = $this.find('.c_map_item_shadow').val();
			var shadow_size = $this.find('.c_map_item_shadow_size').val();
			var shadow_x = $this.find('.c_map_item_shadow_x').val();
			var shadow_y = $this.find('.c_map_item_shadow_y').val();
			
			list.push({
				file: file,
				style: {
					strokeStyle: strokeStyle,
					lineWidth: lineWidth
				},
				clip: clip,
				borderStyle: {
					flag: is_use_border,
					strokeStyle: b_strokeStyle,
					lineWidth: b_lineWidth,
					shadowBlur: shadow_size,
					shadowColor: shadow_color,
					shadowOffsetX: shadow_x,
					shadowOffsetY: shadow_y
				}
			});
		});
		
		if (list.length > 0) {
			data.maps = list;
		} else {
			return _alert('您还没有添加地图数据文件!');
		}
		
		data.textStyle = {
			prov: _getChecked($cb_prov),
			city: _getChecked($cb_city),
			county: _getChecked($cb_county),
			fontSize: parseInt($n_map_text.val()) || 12,
			color: $c_map_text.val(),
			flag: $s_map_text.val()
		}
		
		var index = $map_conf_list.find('.on').index();
	
		if (index == -1) {
			conf_data_geo.push(data);
		} else {
			conf_data_geo.splice(index, 1, data);
		}
		
		conf_data_geo.sort(function(a, b) {
			return (a.name+'').localeCompare(b.name);
		});
		_saveConfData();
		
		_initMapConfList();
		
		editting = false;
		cb && cb();
	}
	function _initMapConfList() {
		var html = '';
		for (var i = 0, j = conf_data_geo.length; i<j; i++) {
			html += '<li>'+conf_data_geo[i].name+'</li>';
		}
		
		$map_conf_list.html(html);
	}
	_initMapConfList();
	$('#btn_save_map').click(function() {
		_saveMapConf(function() {
			_alert('保存成功！');	
		});
	});
	$('#btn_add_map').click(function() {
		if (!is_can_add_map_file) {
			return _alert('请先配置好当前项目再进行下一个!');
		}
		var $html = $(tmpl_map_item);
		util_ui.file($html.find('.file'), {
			width_minus: 8
		});
		$map_conf.append($html);
		
		// is_can_add_map_file = false;
	});
	
	// 切换地图配置
	function _initMapConf(index) {
		_clearMapConf();
		
		var geo = conf_data_geo[index];
		if (geo) {
			var name = geo.name;
			$txt_map_name.val(name);
			
			var maps = geo.maps;
			if (!maps) {
				return;
			}
			for (var i = 0, j = maps.length; i<j; i++) {
				var _map_conf = maps[i];
				var file = _map_conf.file;
				var style = _map_conf.style || {};
				var clip = _map_conf.clip;
				var borderStyle = _map_conf.borderStyle || {};
				
				var $html = $(tmpl_map_item);
				util_ui.file($html.find('.file'), {
					width_minus: 8,
					val: file
				});
				// $html.find('.f_map_item').val(file);
				$html.find('.n_map_item').val(style.lineWidth).next('span').text(style.lineWidth);
				$html.find('.c_map_item').val(style.strokeStyle);
				_setChecked($html.find('.cb_map_item'), clip);
				_setChecked($html.find('.cb_map_item_border'), borderStyle.flag);
				$html.find('.n_map_item_line').val(borderStyle.lineWidth).next('span').text(borderStyle.lineWidth);;
				$html.find('.c_map_item_line').val(borderStyle.strokeStyle);
				$html.find('.c_map_item_shadow').val(borderStyle.shadowColor);
				$html.find('.c_map_item_shadow_size').val(borderStyle.shadowBlur).next('span').text(borderStyle.shadowBlur);
				$html.find('.c_map_item_shadow_x').val(borderStyle.shadowOffsetX).next('span').text(borderStyle.shadowOffsetX);
				$html.find('.c_map_item_shadow_y').val(borderStyle.shadowOffsetY).next('span').text(borderStyle.shadowOffsetY);
				// $html.find('.c_map_item_fill').val(file);
				$map_conf.append($html);
			}
			
			var textStyle = geo.textStyle;
			var cb_prov = textStyle.prov;
			var cb_city = textStyle.city;
			var cb_county = textStyle.county;
			var fontSize = textStyle.fontSize;
			var color = textStyle.color;
			var flag = textStyle.flag;
			
			_setChecked($cb_prov, cb_prov);
			_setChecked($cb_city, cb_city);
			_setChecked($cb_county, cb_county);
			$c_map_text.val(color);
			$n_map_text.val(fontSize);
			_setSelect($s_map_text, flag);
		}
	}
	function _changeMapConf(index) {
		// if (editting) {
		// 	_confirm('是否保存当前修改，点击“否”放弃保存', function() {
		// 		_saveMapConf();
		// 		_initMapConf(index);
		// 	}, function() {
		// 		_initMapConf(index);
		// 	});
		// } else {
			_initMapConf(index);
		// }
	}
	$map_conf_list.delegate('li', 'click', function() {
		$(this).addClass('on').siblings().removeClass('on');
		_changeMapConf($(this).index());
	});
	
	$('#btn_add_map_conf').click(function() {
		$map_conf_list.find('.on').removeClass('on');
		_changeMapConf();
	});
	
	$('#btn_dele_map_conf').click(function() {
		var $item = $map_conf_list.find('.on');
		var index = $item.index();
		if (index == -1) {
			return _alert('请选中要删除的项!');
		}	
		_confirm('确定要删除选中项吗？', function() {
			conf_data_geo.splice(index, 1);
			_saveConfData();
			
			$item.remove();
			_clearMapConf();
		});		
	});
}()