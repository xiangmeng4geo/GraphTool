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

	var $shanxi_s_data_type = $('#shanxi_s_data_type');
	var $shanxi_txt_command = $('#shanxi_txt_command');
	var $data_detail_list = $('.data_detail_list>div');

	var _type = conf_data.type;
	function _showDataDetail(val) {
		$data_detail_list.hide().filter('.'+val).show();
	}
	var shanxi_s_data_type = UI.select($shanxi_s_data_type, {
		data: CONST.DATA_TYPE,
		val: _type,
		onchange: _showDataDetail
	});
	_showDataDetail(_type || shanxi_s_data_type.val());
	if ('shanxi' == _type) {
		$shanxi_txt_command.val(conf_data.val.command);
	}


	$('#btn_save').click(function() {
		var conf = {};
		var data_type = shanxi_s_data_type.val();
		var _conf_data = {
			type: data_type
		};
		if ('shanxi' === data_type) {
			var command = $shanxi_txt_command.val();
			if (!command){
				return _alert('请输入命令！');
			}

			command = command.replace(/_PRODUCT_/g, product_name);
			_conf_data.val = {
				command: command
			}
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
