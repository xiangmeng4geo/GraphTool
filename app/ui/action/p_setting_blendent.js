Core.init(function(model) {
	var MAX_VAL = 99999,
		MIN_VAL = -9999;

	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var dialog = _require('dialog');
	var util_file = _require('util').file;
	var _alert = dialog.alert;
	var _confirm = dialog.confirm;
	var product_conf = _require('product_conf'); //直接把模块加载到UI进程
	var component = _require('component');
	var util_ui = component.UI;
	var util_color = component.Color;
	var CONST = _require('const');

	var conf_data_sys = product_conf.getSys() || {};
	var conf_data_legend = conf_data_sys.legend || (conf_data_sys.legend = []);

	var color_toRGB = util_color.toRGB,
		color_toHTML = util_color.toHTML;
	var format_number = function(num){
		return num.toFixed(num%1>0?1:0);
	}
	var ui_select;
	var html_fieldset_color = '<fieldset class="fieldset_color">'+
								'<legend>_N_ <input type="button" class="admin btn_dele_lengend" value="删除"/></legend>'+
								'<div class="legend_value">'+
									'<form id="form_legend">'+
										'<div class="mt10 clear">'+
											'<div class="fl col"><label>起始颜色</label><input type="color" value="#0000ff" class="color_start"/></div>'+
											'<div class="fl col"><label>终止颜色</label><input type="color" value="#ff0000" class="color_end"/></div>'+
											'<div class="fl col"><div class="checkbox labelbefore"><input type="checkbox" class="cb_is_stripe"/><label title="雨夹雪时可使用">条纹显示</label></div></div>'+
										'</div>'+
										'<div class="mt10 clear">'+
											'<div class="fl col"><label>最小值</label><input type="number" value="0" class="number_min"/></div>'+
											'<div class="fl col"><label>最大值</label><input type="number" value="40" class="number_max"/></div>'+
											'<div class="fl col"><label>等级数</label><input type="number" value="10" class="number_level"/></div>'+
											'<div class="fl col"><input value="生成等阶颜色值" type="button" class="btn_gen_colors"/></div>'+
										'</div>'+
									'</form>'+
								'</div>'+
								'</fieldset>';
	function getTable(color_arr) {
		var html_table = '<table cellspacing=1>'+
								'<tr>'+
									'<th width="10%">状态</th>'+
									'<th width="12%">颜色值</th>'+
									'<th width="12%">文字颜色</th>'+
									'<th width="30%">值域</th>'+
									'<th width="30%">显示文字</th>'+
									'<th width="6%" title="图例排列顺序\n从小到大排（图例倒序显示时从大到小）" class="cursor_help">顺序</th>'+
								'</tr>';
		$.each(color_arr, function(i,v){
			var text_color = v.color_text || '#000';
			html_table += '<tr>'+
								'<td class="fn_contextmenu"><div class="checkbox"><input type="checkbox" '+(v.is_checked?'checked':'')+'/><label></label></div></td>'+
								'<td><input type="color" value="'+v.color+'"/></td>'+
								'<td><input type="color" value="'+text_color+'"/></td>'+
								'<td><input type="number" value="'+v.val[0]+'"/>~<input type="number" value="'+v.val[1]+'"/></td>'+
								'<td contentEditable="true" class="no_outline">'+v.text+'</td>'+
								'<td><input type="number" value="'+(v.order||0)+'"/></td>'
							'</tr>'
		});
		html_table += '</table>';

		setTimeout(function(){
			model.emit('init_component');
		}, 0);
		return html_table;
	}

	var $legend_left = $('#blendent_conf');
	var _contextmenu = (function(){
		var remote = require('electron').remote;
		var Menu = remote.Menu;
		var MenuItem = remote.MenuItem;
		var $_target;
		var menu = new Menu();
		var menu_add_above = new MenuItem({label: '在上方添加', 'click': function() {
			$_target.clone().insertBefore($_target);
		}});
		var menu_add_below = new MenuItem({label: '在下方添加', 'click': function() {
			$_target.clone().insertBefore($_target);
		}});
		var menu_delete = new MenuItem({label: '删除', click: function() {
			_confirm('确定要删除这一项吗？', function() {
				$_target.remove();
			})
		}});
		menu.append(menu_add_above);
		menu.append(menu_add_below);
		menu.append(menu_delete);
		return function(e){
			$_target = $(e.target).closest('tr');
			menu.popup(remote.getCurrentWindow());
		}
	})();
	$legend_left.delegate('.fn_contextmenu', 'contextmenu', _contextmenu);
	$legend_left.on('dragover',function(e){
		e.preventDefault();
	}).on('dragenter',function(e){
		e.preventDefault();
	}).on('drop', function(e){
		e.preventDefault();
		e.stopPropagation();
		e = e.originalEvent;
		var dataTransfer = e.dataTransfer;
		var file_path = dataTransfer.files[0].path;
		var blendent = util_file.read(file_path, true);

		$('.btn_dele_lengend').click();// 把原来数据还原

		$.each(blendent, function(i, v){
			var val = init_legend_product.add(v.val);
			var $html = $(html_fieldset_color.replace('_N_',val.n)).data('val_c',val).appendTo($legend_left);
			$html.find('.color_start').val(v.color_start);
			$html.find('.color_end').val(v.color_end);
			$html.find('.cb_is_stripe').prop('checked', v.is_stripe);
			$html.find('.number_min').val(v.number_min);
			$html.find('.number_max').val(v.number_max);
			$html.find('.number_level').val(v.number_level);

			$html.find('.legend_value').append(getTable(v.colors));
		});
		return false;
	});
	// 添加按钮事件
	var $btn_add_new_legend = $('#btn_add_new_legend').click(function(){
		var val = init_legend_product.add();
		$(html_fieldset_color.replace('_N_',val.n)).data('val_c',val).appendTo($legend_left);
	});
	// 初始化图例设置
	var init_legend_product = (function(){
		var const_legend_product = CONST.LEGEND.PRODUCT;
		var show_product = [];
		for (var i = 0, j = const_legend_product.length; i<j; i++) {
			var item = const_legend_product[i];
			show_product.push({
				n: item.text,
				v: item.val
			});
		}
		const_legend_product = show_product.slice(0);
		var $select_legent_product = $('#select_legent_product');
		function isInShowProduct(v){
			for(var i = 0,j=show_product.length;i<j;i++){
				var val = show_product[i];
				if(val.n == v.n && val.v == v.v){
					return true;
				}
			}
		}
		function initHtml(){
			var data_new = [];
			const_legend_product.filter(function(v) {
				if (isInShowProduct(v)) {
					data_new.push({
						text: v.n,
						val: v.v
					});
				}
			});
			ui_select = util_ui.select($select_legent_product, {
				data: data_new
			});
		}
		initHtml();
		return {
			add: function(add_val){
				var name = ui_select.text(),
					val = ui_select.val();
				if (add_val) {
					val = add_val.v;
				}
				var result = ui_select.rm(val);
				if (result) {
					name = result.text;
					val = result.val;
				}
				if (ui_select.getLen() == 0) {
					ui_select = util_ui.select($select_legent_product, {
						data: [{
							text: '暂无可添加的产品配色',
							val: 0
						}]
					});
					ui_select.setDisable(true);
					$btn_add_new_legend.attr('disabled','disabled');
				}

				for(var i = 0,j=show_product.length;i<j;i++){
					var v = show_product[i];
					if(v.n == name && v.v == val){
						return show_product.splice(i,1)[0];
					}
				}
			}, rm: function(delete_val){
				ui_select.setDisable(false);
				$btn_add_new_legend.removeAttr('disabled');
				show_product.push(delete_val);
				initHtml();
			}
		}
	})();
	var $blendent_conf_list = $('#blendent_conf_list');
	$blendent_conf_list.delegate('li', 'click', function() {
		$(this).addClass('on').siblings().removeClass('on');
		_clearConf();
		_changeBlendentConf($(this).index());
	});
	// 删除某一个配色
	$legend_left.delegate('.btn_dele_lengend','click',function(){
		var $this = $(this);
		var $remote_fieldset = $this.closest('fieldset');
		init_legend_product.rm($remote_fieldset.data('val_c'));
		$remote_fieldset.remove()
	});
	// 产生新的颜色
	$legend_left.delegate('.btn_gen_colors','click',function(){
		var $legend_value = $(this).closest('.legend_value');
		var $number_min = $legend_value.find('.number_min'),
			$number_max = $legend_value.find('.number_max'),
			$number_level = $legend_value.find('.number_level'),
			$color_start = $legend_value.find('.color_start'),
			$color_end = $legend_value.find('.color_end');
		var color_start = color_toRGB($color_start.val(),true),
			color_end = color_toRGB($color_end.val(),true);

		var level = parseInt($number_level.val());
		var start_r = color_start[0],
			start_g = color_start[1],
			start_b = color_start[2],
			start_val = Number($number_min.val());

		var level_color = level + 2;
		var cha_r = Math.floor((color_end[0] - start_r)/level_color),
			cha_g = Math.floor((color_end[1] - start_g)/level_color),
			cha_b = Math.floor((color_end[2] - start_b)/level_color),
			cha_val = (Number($number_max.val()) - start_val)/level;

		var color_arr = [];
		for(var i = 0;i<level_color;i++){
			var color = color_toHTML('rgb('+[start_r+cha_r*i,start_g+cha_g*i,start_b+cha_b*i]+')');
			if(i == 0){
				var val = [MIN_VAL, format_number(start_val)],
					text = '<'+val[1];
			}else if(i == level_color - 1){
				var val = [format_number(start_val+cha_val*(i-1)), MAX_VAL],
					text = val[0]+'≤';
			}else{
				var val = [format_number(start_val+cha_val*(i-1)), format_number(start_val+cha_val*i)],
					text = val[0]+'-'+val[1];
					// text = '≤'+val[0]+'<'+val[1];
			}
			color_arr.push({
				is_checked: true,
				color: color,
				val: val,
				text: text
			});
		}
		$legend_value.find('table').remove();
		$legend_value.append(getTable(color_arr));
	});
	function _getBlendent(){
		var blendent = [];
		$legend_left.find('.fieldset_color').each(function(i,v){
			var $this = $(this);
			var data = {
				'val': $this.data('val_c'),
				'color_start': $this.find('.color_start').val(),
				'color_end': $this.find('.color_end').val(),
				'is_stripe': $this.find('.cb_is_stripe').prop('checked'),
				'number_min': $this.find('.number_min').val(),
				'number_max': $this.find('.number_max').val(),
				'number_level': $this.find('.number_level').val()
			}
			var colors = [];
			$this.find('tr').each(function(tr_i,tr_v){
				var $td = $(tr_v).find('td');
				if($td.length > 0){
					var val_arr = [];
					$td.eq(3).find('input').each(function(i){
						var v = $(this).val();
						val_arr.push(isNaN(v)? (i == 0?MIN_VAL:MAX_VAL) :parseFloat(v));
					});

					colors.push({
						'is_checked': $td.eq(0).find('input').prop('checked'),
						'color': $td.eq(1).find('input').val(),
						'color_text': $td.eq(2).find('input').val(),
						'val': val_arr,
						'text': $td.eq(4).text(),
						'order': parseInt($td.eq(5).find('input').val())
					});
				}
			});
			data.colors = colors;
			blendent.push(data);
		});
		return blendent;
	}

	function _initBledentConfList() {
		var html = '';
		for (var i = 0, j = conf_data_legend.length; i<j; i++) {
			html += '<li><label>'+conf_data_legend[i].name+'</label><span></span></li>';
		}

		$blendent_conf_list.html(html);
	}
	_initBledentConfList();
	function _changeBlendentConf(index) {
		var conf = conf_data_legend[index];
		if (conf) {
			var name = conf.name;
			$txt_blendent_name.val(name);
			var blendent = conf.blendent;
			$.each(blendent,function(i,v){
				var val = v.val;
				init_legend_product.add(val);
				var $html_fieldset_color = $(html_fieldset_color.replace('_N_',val.n)).data('val_c',val);
				$html_fieldset_color.find('.color_start').val(v.color_start);
				$html_fieldset_color.find('.color_end').val(v.color_end);
				$html_fieldset_color.find('.cb_is_stripe').prop('checked',v.is_stripe);
				$html_fieldset_color.find('.number_min').val(v.number_min);
				$html_fieldset_color.find('.number_max').val(v.number_max);
				$html_fieldset_color.find('.number_level').val(v.number_level);
				var colors = v.colors;
				if(colors && colors.length > 0){
					colors.sort(function(a, b){
						return a.val[0] > b.val[0]? 1: -1;
					});
					$html_fieldset_color.find('.legend_value').append(getTable(colors));
				}
				$legend_left.append($html_fieldset_color);
			});
		}
	}
	function _saveConfData() {
		product_conf.setSys(conf_data_sys);
		model.emit('save');
	}
	function _clearConf() {
		$('.btn_dele_lengend').click();
		$txt_blendent_name.val('');
	}
	var $txt_blendent_name = $('#txt_blendent_name');
	$('#btn_save_blendent').click(function() {
		var blendent_name = $txt_blendent_name.val();
		if (!blendent_name) {
			return _alert('请先输入自定义配色方案名！');
		} else {
			blendent_name = blendent_name.trim();
			var $list_check = $blendent_conf_list.find('li:not(.on)');
			for (var i = 0, j = $list_check.length; i<j; i++) {
				if ($list_check.eq(i).text() == blendent_name) {
					return _alert('请确保名称不重复');
				}
			}
		}
		var blendent = _getBlendent();
		var data = {
			name: blendent_name,
			blendent: blendent
		};
		var index = $blendent_conf_list.find('.on').index();
		if (index == -1) {
			conf_data_legend.push(data);
		} else {
			conf_data_legend.splice(index, 1, data);
		}
		conf_data_legend.sort(function(a, b) {
			return (a.name+'').localeCompare(b.name);
		});

		_saveConfData();
		_initBledentConfList();
		_alert('保存成功！');
	});
	$blendent_conf_list.delegate('span', 'click', function() {
		var $p = $(this).parent();
		_confirm('确定要删除选中项吗？', function() {
			var index = $p.index();
			conf_data_legend.splice(index, 1);
			_saveConfData();

			$p.remove();
			_clearConf();
		});
	});
	$('#btn_add_blendent_conf').click(function() {
		_clearConf();
		$blendent_conf_list.find('.on').removeClass('on');
	});
})
