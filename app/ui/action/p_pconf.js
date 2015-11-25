!function() {
	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var _alert = _require('dialog').alert;
	var product_conf = _require('product_conf');
	var CONST = _require('const');
	var UI = _require('component').UI;
	
	var conf_product = product_conf.read(_PARAM_) || {};
	var conf_data = conf_product.data || {};
	
	var $tabContentItems = $('tab-content item');
	var $tabItems = $('tab item').click(function() {
		$(this).addClass('on').siblings().removeClass('on');
		$tabContentItems.removeClass('on').eq($(this).index()).addClass('on');
	});
	
	var $shanxi_s_data_type = $('#shanxi_s_data_type');
	var $shanxi_txt_command = $('#shanxi_txt_command');
	
	var _type = conf_data.type;
	var shanxi_s_data_type = UI.select($shanxi_s_data_type, {
		data: CONST.DATA_TYPE,
		val: _type
	});
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
			
			command = command.replace(/_PRODUCT_/g, _PARAM_);
			_conf_data.val = {
				command: command
			}
		}
		conf.data = _conf_data;
		
		product_conf.save(_PARAM_, conf);
		
		_alert('保存成功!');
		window.close();
	});
}()