/* global Core */
/* global product_name */
Core.init(function(model) {
	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var _alert = _require('dialog').alert;
	var product_conf = _require('product_conf');
	var CONST = _require('const');
	var UI = _require('component').UI;
	var UI_select = UI.select;
	var getSys = product_conf.getSys;

	var geo = getSys.getGeo() || [];
	var legend = getSys.getLegend() || [];
	var is_no_geo = geo.length == 0;
	var is_no_legend = legend.length == 0;
	if (is_no_geo || is_no_legend) {
		_alert('请先在系统配置里添加“'+([is_no_geo?'地图方案':'', is_no_legend? '配色方案': ''].join())+'”！');
		return window.close();
	}

	var s_data_geo = [],
		s_data_legend = [];
	geo.forEach(function(v) {
		s_data_geo.push({
			text: v.name,
			val: v.name
		});
	});
	legend.forEach(function(v) {
		s_data_legend.push({
			text: v.name,
			val: v.name
		});
	});
	var product_name = _PARAM_;
	$('.title_wrap span').text('【'+product_name+'】配置');
	var conf_product = product_conf.read(product_name) || {};
	var conf_data = conf_product.data || {};
	var conf_other = conf_product.other || {};

	s_data_geo.unshift({
		text: '默认地图',
		val: ''
	});
	var s_map = UI.select($('#s_map'), {
		data: s_data_geo,
		val: conf_other.map
	});
	var s_legend = UI.select($('#s_legend'), {
		data: s_data_legend,
		val: conf_other.legend
	});

	var $tabContentItems = $('tab-content item');
	var $tabItems = $('tab item').click(function() {
		$(this).addClass('on').siblings().removeClass('on');
		$tabContentItems.removeClass('on').eq($(this).index()).addClass('on');
	});

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

		var file_dir_in = UI.file($file_dir_in, {
			type: '*',
			dialogOpt: {
				properties: ['openDirectory']
			},
			onchange: _show_example
		});
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
		function _show_example() {
			var str = file_dir_in.val() || '';
			if (str) {
				str += '\\';
			}
			if ($radio_file_rule_common.prop('checked')) {
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
			$cb_is_newest.prop('checked', is_newest);
			if (is_newest) {
				$is_newest_yes.show();
				$is_newest_no.hide();
			} else {
				$is_newest_no.show();
				$is_newest_yes.hide();
			}
		}
		$('[name=file_rule]').click(_show_example);
		$('.file_rule input').on('keyup', _show_example);
		var $cb_is_newest = $('#cb_is_newest').click(function() {
			var is_newest = $(this).prop('checked');
			_initNewest(is_newest);
		});

		_initNewest($cb_is_newest.prop('checked'));
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
				file_dir_in.setVal(val.dir_in || '');
				var file_rule = val.file_rule;
				if (file_rule) {
					var is_common = file_rule.is_common;
					var val_file_rule = file_rule.val;
					if (is_common) {
						$text_file_rule_common_prefix.val(val_file_rule.prefix);
						select_file_rule_common_date.selected(val_file_rule.date_format);
						$text_file_rule_common_postfix.val(val_file_rule.postfix);
						select_file_rule_common_postfix.selected(val_file_rule.file_suffix);
					} else {
						$radio_file_rule_custom.prop('checked', true);
						$text_file_rule_custom.val(val_file_rule);
					}
				}

				select_file_type.selected(val.file_type);
				select_file_hour.selected(val.file_hour);
				select_value_col.selected(val.col);
				var arithmetic = val.arithmetic;
				if (arithmetic) {
					select_value_arithmetic.selected(arithmetic.type);
					$num_value_arithmetic.val(arithmetic.val);
				}
				_show_example();
			},
			getVal: function() {
				var dir_in = file_dir_in.val();

				if (!dir_in) {
					_alert('请选择数据目录!');
					return;
				}
				var is_newest = $cb_is_newest.prop('checked');
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
				var file_rule_data;
				var is_common = $radio_file_rule_common.prop('checked');
				if (is_common) {
					file_rule_data = {
						prefix: $text_file_rule_common_prefix.val() || '',
						date_format: select_file_rule_common_date.val(),
						postfix: $text_file_rule_common_postfix.val() || '',
						file_suffix: select_file_rule_common_postfix.val()||''
					}
				} else {
					file_rule_data = $text_file_rule_custom.val();
					if (!file_rule_data) {
						_alert('请输入自定义规则！');
						return;
					}
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
						val: file_rule_data
					},
					file_type: select_file_type.val(),
					file_hour: select_file_hour.val(),
					col: select_value_col.val(),
					arithmetic: {
						type: select_value_arithmetic.val(),
						val: parseFloat(val_arithmetic)
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
		var conf = {};
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
		conf.data = _conf_data;

		conf.other = {
			map: s_map.val(),
			legend: s_legend.val()
		};
		product_conf.save(product_name, conf);

		model.emit('log', 'change "'+product_name+'"');
		C.emit('conf.change');
		_alert('保存成功!');
		window.close();
	});
	$('.btn_close').on('click', function() {
		window.close();
	});
})
