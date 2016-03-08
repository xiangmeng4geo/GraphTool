/* global Core */
/* global product_name */
Core.init(function(model) {
	var C = Core;
	var $ = C.$;
	var WIN = C.Win.Win;
	var _require = C.require;
	var util_extend = _require('util').extend;
	var dialog = _require('dialog');
	var _alert = dialog.alert;
	var product_conf = _require('product_conf');
	var CONST = _require('const');
	var CONST_LEGEND_STYLE = CONST.LEGEND_STYLE.slice(0);
	var UI = _require('component').UI;
	var electron = require('electron');
    var nativeImage = electron.nativeImage;
	var UI_select = UI.select;
	var UI_edit = UI.edit;
	var UI_file = UI.file;
	var getSys = product_conf.getSys;

	var TYPE_PLACEHOLDER = 1,
		TYPE_NORMAL = 2;

	var geo = getSys.getGeo() || [];
	var legend = getSys.getLegend() || [];
	var size = getSys.getSize() || [];
	var assets_sys = getSys.getAssets() || [];
	var template = getSys.getTemplate() || [];

	var is_no_geo = geo.length == 0;
	var is_no_legend = legend.length == 0;
	if (is_no_geo || is_no_legend) {
		_alert('请先在系统配置里添加“'+([is_no_geo?'地图方案':'', is_no_legend? '配色方案': ''].join())+'”！');
		return window.close();
	}
	function _getChecked($obj) {
		return $obj.prop('checked');
	}
	function _setChecked($obj, checked) {
		$obj.prop('checked', !!checked);
	}

	var s_data_geo = [],
		s_data_legend = [],
		s_data_size = [],
		s_data_template = [];
	geo.forEach(function(v) {
		s_data_geo.push({
			text: v.name,
			val: v.name
		});
	});
	legend.forEach(function(v) {
		var name = v.name;
		s_data_legend.push({
			text: name,
			val: v.blendent? name: ''
		});
	});
	size.forEach(function(v, i) {
		s_data_size.push({
			text: v.name+'('+v.width+'X'+v.height+')',
			val: i
		});
	});
	template.forEach(function(v, i) {
		s_data_template.push({
			text: v.name+'('+v.width+'X'+v.height+')',
			val: v.name
		});
	});

	var product_name = _PARAM_;
	$('.title_wrap span').text('【'+product_name+'】配置');
	var conf_product = product_conf.read(product_name) || {};
	var conf_data = conf_product.data || {};
	var conf_other = conf_product.other || {};
	var conf_assets = conf_product.assets || [];
	var conf_save = conf_product.save || {};

	var $cb_is_show_range_legend = $('#cb_is_show_range_legend');
	_setChecked($cb_is_show_range_legend, conf_other.is_legend_range);

	s_data_geo.unshift({
		text: '默认地图',
		val: ''
	});
	s_data_template.unshift({
		text: '默认模板',
		val: ''
	});
	var s_map = UI.select($('#s_map'), {
		data: s_data_geo,
		val: conf_other.map
	});
	var s_template = UI.select($('#s_template'), {
		data: s_data_template,
		val: conf_other.template,
		onchange: function() {
			_updateAssets();
		}
	});
	var s_legend = UI.select($('#s_legend'), {
		data: s_data_legend,
		val: conf_other.legend
	});
	var s_size = UI.select($('#s_size'), {
		data: s_data_size,
		val: conf_other.size
	});
	var s_legend_style = UI.select($('#s_legend_style'), {
		data: CONST_LEGEND_STYLE,
		val: conf_other.legend_style
	});

	var file_dir_out = UI_file($('#file_dir_out'), {
		type: '*',
		val: conf_save.dir || '',
		dialogOpt: {
			properties: ['openDirectory']
		}
	});

	var $text_filename_out = $('#text_filename_out').val(conf_save.file || '');
	var $tabContentItems = $('tab-content item');
	var $tabItems = $('tab item').click(function() {
		$(this).addClass('on').siblings().removeClass('on');
		$tabContentItems.removeClass('on').eq($(this).index()).addClass('on');
	});
	var $cb_is_use_sys_assets = $('#cb_is_use_sys_assets');
	_setChecked($cb_is_use_sys_assets, conf_product.flag_sys_assets);

	$cb_is_use_sys_assets.click(_updateAssets);
	var $s_data_type = $('#s_data_type');

	var $data_detail_list = $('.data_detail_list .data_detail');

	// 每个子类都要实现init和getVal方法
	var method_list = {};
	method_list['shanxi'] = (function() {
		var $shanxi_txt_command = $('#shanxi_txt_command');
		return {
			init: function(val) {
				var command = val.command;
				$shanxi_txt_command.val(command);
			},
			getVal: function() {
				var command = $shanxi_txt_command.val();
				if (!command){
					_alert('请输入命令！');
				} else {
					command = command.replace(/_PRODUCT_/g, product_name);
					return {
						command: command
					}
				}
			}
		}
	})();
	method_list['micaps'] = (function() {
		var CONST_FILERULE = CONST.MICAPS_FILERULE;

		var $file_dir_in = $('#file_dir_in');
		var $num_value_arithmetic = $('#num_value_arithmetic');
		var $file_rule_example = $('#file_rule_example span');
		var $radio_file_rule_common = $('#radio_file_rule_common');
		var $radio_file_rule_custom = $('#radio_file_rule_custom');
		var $text_file_rule_common_prefix = $('#text_file_rule_common_prefix');
		var $text_file_rule_common_postfix = $('#text_file_rule_common_postfix');
		var $text_file_rule_custom = $('#text_file_rule_custom');
		var $is_newest_yes = $('#is_newest_yes');
		var $is_newest_no = $('#is_newest_no');
		var $date_start = $('#date_start');
		var $date_end = $('#date_end');
		var $number_newest_days = $('#number_newest_days');
		// var $cb_is_interpolation_all = $('#cb_is_interpolation_all');
		var $cb_is_show_data = $('#cb_is_show_data');
		function _show_example() {
			var str = file_dir_in.val() || '';
			if (str) {
				str += '\\';
			}
			if (_getChecked($radio_file_rule_common)) {
				str += $text_file_rule_common_prefix.val()||'';
				str += select_file_rule_common_date.val()||'';
				str += $text_file_rule_common_postfix.val()||'';
				str += '.';
				str += select_file_rule_common_postfix.val()||'';
			} else {
				str += $text_file_rule_custom.val() || '';
			}
			$file_rule_example.text(str? new Date().format(str): '');
		}

		function _initNewest(is_newest) {
			_setChecked($cb_is_newest, is_newest);
			if (is_newest) {
				$is_newest_yes.show();
				$is_newest_no.hide();
			} else {
				$is_newest_no.show();
				$is_newest_yes.hide();
			}
		}

		var file_dir_in = UI_file($file_dir_in, {
			type: '*',
			dialogOpt: {
				properties: ['openDirectory']
			},
			onchange: _show_example
		});
		$('[name=file_rule]').click(_show_example);
		$('.file_rule input').on('keyup', _show_example);
		var $cb_is_newest = $('#cb_is_newest').click(function() {
			var is_newest = _getChecked($(this));
			_initNewest(is_newest);
		});

		_initNewest(_getChecked($cb_is_newest));
		var now = new Date();
		$date_end.val(now.format('yyyy-MM-dd'));
		now.setDate(now.getDate() - 2);
		$date_start.val(now.format('yyyy-MM-dd'));

		var select_file_type = UI_select($('#select_file_type'), {
			data: CONST_FILERULE.FILE_TYPE
		});
		var select_value_arithmetic = UI_select($('#select_value_arithmetic'), {
			data: [{
				text: '不运算',
				val: ''
			}, {
				text: '*',
				val: '*'
			}]
		});
		var select_file_rule_common_date = UI_select($('#select_file_rule_common_date'), {
			data: CONST_FILERULE.TIME,
			onchange: _show_example
		});
		var select_file_rule_common_postfix = UI_select($('#select_file_rule_common_postfix'), {
			data: CONST_FILERULE.FILE_POSTFIX,
			onchange: _show_example
		});
		var select_value_col = UI_select($('#select_value_col'), {
			data: CONST_FILERULE.COLUMN
		});
		var select_file_hour = UI_select($('#select_file_hour'), {
			data: CONST_FILERULE.FILE_HOUR
		});
		_show_example();
		return {
			init: function(val) {
				var file = val.file;
				if (file) {
					var is_newest = file.is_newest;
					var val_newest = file.val;
					_initNewest(is_newest);
					if (is_newest) {
						$number_newest_days.val(val_newest.newest_days);
					} else {
						$date_start.val(val_newest.start);
						$date_end.val(val_newest.end);
					}
				}
				_setChecked($cb_is_show_data, val.data && val.data.flag);
				file_dir_in.setVal(val.dir_in || '');
				var val_save = val.save || {};

				var file_rule = val.file_rule;
				if (file_rule) {
					var is_common = file_rule.is_common;
					var val_file_rule_common = file_rule.val_common || {};
					var val_file_rule_custom = file_rule.val_custom || '';

					$text_file_rule_common_prefix.val(val_file_rule_common.prefix);
					select_file_rule_common_date.selected(val_file_rule_common.date_format);
					$text_file_rule_common_postfix.val(val_file_rule_common.postfix);
					select_file_rule_common_postfix.selected(val_file_rule_common.file_suffix);

					_setChecked($radio_file_rule_common, is_common);
					_setChecked($radio_file_rule_custom, !is_common);
					$text_file_rule_custom.val(val_file_rule_custom);
				}

				select_file_type.selected(val.file_type);
				select_file_hour.selected(val.file_hour);
				select_value_col.selected(val.col);
				var arithmetic = val.arithmetic;
				if (arithmetic) {
					select_value_arithmetic.selected(arithmetic.type);
					$num_value_arithmetic.val(arithmetic.val);
				}
				// _setChecked($cb_is_interpolation_all, val.interpolation_all);
				_show_example();
			},
			getVal: function() {
				var dir_in = file_dir_in.val();

				if (!dir_in) {
					_alert('请选择数据目录!');
					return;
				}
				var is_newest = _getChecked($cb_is_newest);
				var newest_val;
				if (is_newest) {
					var newest_days = $number_newest_days.val();
					if (isNaN(newest_days)) {
						_alert('请确保之前天数是数字！');
						return;
					}
					newest_val = {
						newest_days: parseInt(newest_days)
					}
				} else {
					var date_start = $date_start.val();
					var date_end = $date_end.val();
					if (date_end < date_start) {
						_alert('请确保开始时间小于结束时间!');
						return ;
					}
					newest_val = {
						start: date_start,
						end: date_end
					}
				}
				var is_common = _getChecked($radio_file_rule_common);
				if (!is_common) {
					var file_rule_data_custom = $text_file_rule_custom.val();
					if (!file_rule_data_custom) {
						_alert('请输入自定义规则！');
						return;
					}
				}
				var file_rule_data_common = {
					prefix: $text_file_rule_common_prefix.val() || '',
					date_format: select_file_rule_common_date.val(),
					postfix: $text_file_rule_common_postfix.val() || '',
					file_suffix: select_file_rule_common_postfix.val()||''
				}
				
				var val_arithmetic = $num_value_arithmetic.val();
				if (isNaN(val_arithmetic)) {
					_alert('请确保数学运算值为数字！');
					return;
				}

				return {
					file: {
						is_newest: is_newest,
						val: newest_val
					},
					dir_in: dir_in,
					file_rule: {
						is_common: is_common,
						val_common: file_rule_data_common,
						val_custom: file_rule_data_custom
					},
					file_type: select_file_type.val(),
					file_hour: select_file_hour.val(),
					col: select_value_col.val(),
					arithmetic: {
						type: select_value_arithmetic.val(),
						val: parseFloat(val_arithmetic)
					},
					// interpolation_all: _getChecked($cb_is_interpolation_all),
					data: {
						flag: _getChecked($cb_is_show_data)
					}
				}
			}
		}
	})();

	var _type = conf_data.type;
	function _showDataDetail(type) {
		$data_detail_list.hide().filter('.'+type).show();
	}
	var s_data_type = UI.select($s_data_type, {
		data: CONST.DATA_TYPE,
		val: _type,
		onchange: function(e, val) {
			_showDataDetail(val);
		}
	});

	_type = _type || s_data_type.val()
	_showDataDetail(_type);
	var fn = method_list[_type];
	fn && fn.init(conf_data.val || {});

	$('#btn_save').click(function() {
		var conf = conf_product;
		var data_type = s_data_type.val();
		var _conf_data = {
			type: data_type
		};
		var method = method_list[data_type];
		if (method) {
			var val = method.getVal();
			if (val == undefined) {
				return;
			}
			_conf_data.val = val;
		}
		var assets = [];
		$asset_list.find('li').each(function() {
			var $this = $(this);
			var key = $this.data('key');
			var d = {flag: _getChecked($this.find('[type=checkbox]'))};
			
			var $span = $this.find('textarea');
			if ($span.length > 0) {
				d.text = $span.val();
			} else {
				d.src = $this.find('img').attr('src');
			}

			if (key) {
				var d_cache = cacheSysAssets[key];
				if (d_cache) {
					d.key = key;
				}
			} else {
				d.style = $this.data('style');
			}
			
			assets.push(d);
		});
		conf.assets = assets;
		conf.data = _conf_data;

		conf.other = {
			map: s_map.val(),
			legend: s_legend.val(),
			legend_style: s_legend_style.val(),
			is_legend_range: _getChecked($cb_is_show_range_legend),
			size: s_size.val(),
			template: s_template.val()
		};
		conf.save = {
			dir: file_dir_out.val(),
			file: $text_filename_out.val() || ''
		}
		conf.flag_sys_assets = _getChecked($cb_is_use_sys_assets);
		product_conf.save(product_name, conf);

		model.emit('log', 'change "'+product_name+'"');
		C.emit('conf.change');
		_alert('保存成功!');
		window.close();
	});
	$('.btn_close').on('click', function() {
		window.close();
	});
	$('.desc').click(function() {
		$(this).toggleClass('show');
	});
	
	var $asset_list = $('.asset_list');
	
	$asset_list.delegate('.btn_dele_asset', 'click', function() {
		var $layer = $(this).closest('li');
		if ($layer.is('.sys_asset')) {
			return;
		}
		dialog.confirm('确定要删除吗？', function() {
    		$layer.remove();
    		var index = $layer.data('index');
    		conf_assets.splice(index, 1);
    	});
	}).delegate('.asset_imgs img', 'click', function() {
		var $this = $(this);
		var key = $this.parent().data('key');
		if (key) {
			var val_cache = cacheSysAssets[key];
			if (val_cache) {
				if (val_cache.type == TYPE_NORMAL) {
					_alert('不可修改！');
					return;
				}
			}
		}
		dialog.imageOpen(function(file_path) {
            $this.attr('src', file_path);
        });
	});
	var _getId = (function() {
		var id = 0;
		return function() {
			return 'cb_' + (id++);
		}
	})();

	var cacheSysAssets = {};
	function _updateAssets() {
		cacheSysAssets = {};
		var assets = product_conf.util.assets(product_name, {
			other: {
				template: s_template.val()
			}
		}, {
			merge: true,
			useFlag: false
		});
		var is_use_sys = _getChecked($cb_is_use_sys_assets);
		var html = '';
		var html_img = '',
			html_text = '';
		var index_normal_asset = -1;
		$.each(assets, function(i, v) {
			if (!v) {
				return;
			}
			var key = v.id || '';
			var isSysAssets = !!key && !!v.type;
			if (!isSysAssets) {
				index_normal_asset++;
			} else {
				cacheSysAssets[key] = v;
			}
			if (!is_use_sys && isSysAssets) {
				return;
			}
			var text = v.text;
			var style = v.style;
			if (!text) {
				html_img += '<li data-index="'+index_normal_asset+'" data-style="'+style+'" data-key="'+key+'" '+(isSysAssets?'class="sys_asset"':'')+'>'+
								'<img src="'+v.src+'"/>'+
								'<div class="checkbox"><input type="checkbox" '+(isSysAssets || v.flag?'checked':'')+'/><label></label></div>'+
								'<span class="btn_dele_asset"></span>'+
							'</li>';
			} else {
				html_text += '<li data-index="'+index_normal_asset+'" data-style="'+style+'" data-key="'+key+'" '+(isSysAssets?'class="sys_asset"':'')+'>'+
								'<div class="fl">'+
									'<div class="checkbox"><input type="checkbox" '+(isSysAssets || v.flag?'checked':'')+'/><label></label></div><br/>'+
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
	_updateAssets();
})
