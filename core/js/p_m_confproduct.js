Core.safe(function(){
	var MAX_VAL = 99999,
		MIN_VAL = -9999;
	var gui = Core.Window.getGui(),
		Menu = gui.Menu,
		MenuItem = gui.MenuItem;
			
	var product_name = '',
		map_width,
		map_height;
	var core_libs = Core.Lib;
	var file_util = core_libs.util.file;
	var Conf_User = core_libs.conf.User;
	var CoreWindow = Core.Window;
	var _const = Core.Const;
	var const_msgtype = _const.msgType,
		_template = _const.template;
	
	$('.file_dir').click(function(){
		$(this).parent().prev().click();
	});
	$('.file_dir_nw').on('change',function(){
		var $this = $(this);
		$this.next().find('.text_file_dir').val($this.val());
	});
	var $text_file_dir_in = $('#text_file_dir_in'),
		$text_file_dir_out = $('#text_file_dir_out');
	var current_textarea_title;
	/*设置样式按钮*/
	$('#fieldset_title input[type=button]').click(function(){
		current_textarea_title = $(this).prev('textarea');
		var win_textstyle = Core.Page.textStyle(function(e){
			CoreWindow.sendMsg(const_msgtype.CONF_STYLE,{
				text: current_textarea_title.val(),
				style: current_textarea_title.attr('style')
			},win_textstyle.window);
		});
	});
	var $input_export_colors = $('<input type="file"/>').on('change',function(){
		var blendent = _getBlendent();
		if(blendent.length > 0){
			file_util.write($(this).val(), JSON.stringify(blendent));
			alert('配色方案导出成功！');
		}else{
			alert('暂时没有可导出的配色方案！');
		}
	});
	var $input_import_colors = $('<input type="file"/>').on('change',function(){
		var file_path = $(this).val();
		var blendent = file_util.readFile(file_path, true);

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

			$html.append(getTable(v.colors));
		});

	})
	$('#bt_export_colors').click(function(){
		$input_export_colors.click();
	});
	$('#bt_import_colors').click(function(){
		$input_import_colors.click();
	});

	var $number_newest_days = $('#number_newest_days'),
		$date_start = $('#date_start'),
		$date_end = $('#date_end');
	function click_cb_is_newst(){
		var $this = $cb_is_newest;
		if($this.prop('checked')){
			$date_start.attr('disabled','disabled');
			$date_end.attr('disabled','disabled');
			$number_newest_days.removeAttr('disabled');
		}else{
			$date_start.removeAttr('disabled');
			$date_end.removeAttr('disabled');
			$number_newest_days.attr('disabled','disabled');
		}
	}
	var $cb_is_newest = $('#cb_is_newest').click(click_cb_is_newst);
	CoreWindow.onMessage(function(e){
		var data = e.data;
		var type = data.type;
		if(const_msgtype.CONF_STYLE == type){
			data = data.data;
			if(current_textarea_title){
				var style = data.style,
					text = data.text;
				current_textarea_title.val(text).attr('style',style);
				current_textarea_title.css('line-height',current_textarea_title.css('font-size'));
			}
			current_textarea_title = null;
		}else if(const_msgtype.CONF_PRODUCT == type){
			data = data.data;
			if(data){
				product_name = data.name;
				map_width = data.width;
				map_height = data.height;

				$('title').text(product_name);
				$input_export_colors.attr('nwsaveas', product_name+'(配色方案).db');
				var conf_product = Conf_User.get(product_name);
				init(conf_product);
			}
		}
	},true);
	var $c_bottom_fieldset = $('#c_bottom > fieldset');
	var $c_top_li = $('#c_top li').click(function(){
		var $this = $(this);
		$c_top_li.removeClass('on');
		$this.addClass('on');
		$c_bottom_fieldset.removeClass('on');
		$c_bottom_fieldset.eq($this.index()).addClass('on');
	});

	var $radio_file_rule_common = $('#radio_file_rule_common'),
		$radio_file_rule_custom = $('#radio_file_rule_custom'),
		$text_file_rule_custom = $('#text_file_rule_custom'),
		$text_file_rule_common_prefix = $('#text_file_rule_common_prefix'),
		$select_file_rule_common_date = $('#select_file_rule_common_date'),
		$text_file_rule_common_postfix = $('#text_file_rule_common_postfix'),
		$select_file_rule_common_postfix = $('#select_file_rule_common_postfix');
		$file_rule_example_span = $('#file_rule_example span'),
		$select_file_type = $('#select_file_type'),
		$select_file_hour = $('#select_file_hour'),
		$select_value_col = $('#select_value_col'),
		$cb_use_bgcolor = $('#cb_use_bgcolor'),
		$cb_use_bgimg = $('#cb_use_bgimg'),
		$cb_interpolation_all = $('#cb_interpolation_all'),
		$select_template = $('#select_template');
	/*初始化文件选定*/
	!function(){
		var const_file_rule = Core.Const.fileRule,
			col_index = const_file_rule.col_index,
			file_rule_time = const_file_rule.time_rule,
			file_rule_file_postfix = const_file_rule.file_postfix,
			file_type = const_file_rule.file_type,
			file_hour = const_file_rule.file_hour;

		var html_file_rule_time = '';
		$.each(file_rule_time,function(i,v){
			html_file_rule_time += '<option value="'+v+'">'+v+'</option>';
		});
		$select_file_rule_common_date.html(html_file_rule_time);

		var html_file_rule_file_postfix = '';
		$.each(file_rule_file_postfix,function(i,v){
			html_file_rule_file_postfix += '<option value="'+v+'">'+v+'</option>';
		});
		$select_file_rule_common_postfix.html(html_file_rule_file_postfix);

		var html_file_type = '';
		for(var i in file_type){
			var v = file_type[i];
			html_file_type += '<option value="'+v.v+'">'+v.n+'</option>';
		}

		$select_file_type.html(html_file_type);

		var html_file_hour = '';
		$.each(file_hour, function(i,v){
			html_file_hour += '<option value="'+v+'">'+v+'</option>';
		});
		$select_file_hour.html(html_file_hour);

		var html_value_col = '';
		for(var i = col_index[0], j = col_index[1]; i<=j; i++){
			html_value_col += '<option value="'+i+'">'+i+'</option>';
		}
		$select_value_col.html(html_value_col);

		var html_template = '';
		$.each(Conf_User.getSys().templates, function(i, v){
			if(v.flag){
				var val = v.t.join('x');
				html_template += '<option value="'+(val)+'">'+(v.n+'('+val+')')+'</option>';
			}
		});
		$select_template.html(html_template);


		var $text_file_dir_in = $('#text_file_dir_in');
		/*显示选定的文件规则*/
		function file_rule_example(){
			var rule = '';
			if($radio_file_rule_common.prop('checked')){
				rule = $text_file_rule_common_prefix.val() + 
					   $select_file_rule_common_date.val() + 
					   $text_file_rule_common_postfix.val() + '.' +
					   $select_file_rule_common_postfix.val()
			}else{
				rule = $text_file_rule_custom.val();
			}
			rule = rule && new Date().format(rule,true);

			var dir = $text_file_dir_in.val();
			if(dir){
				dir += '\\';
			}
			$file_rule_example_span.text(dir + rule);
			setTimeout(file_rule_example,100)
		}
		file_rule_example();
	}();

	var html_legend_unit = '';
	$.each(Core.Const.legend.unit,function(i,v){
		html_legend_unit += '<option value="'+v+'">'+v+'</option>';
	});
	var $select_legend_unit = $('#select_legend_unit').html(html_legend_unit);

	// 添加按钮事件
	var $btn_add_new_legend = $('#btn_add_new_legend').click(function(){
		var val = init_legend_product.add();
		$(html_fieldset_color.replace('_N_',val.n)).data('val_c',val).appendTo($legend_left);
	});

	// 初始化图例设置
	var init_legend_product = (function(){
		var const_legend_product = Core.Const.legend.product;
		var show_product = const_legend_product.slice(0);
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
			var html_legend_product = '';
			$.each(const_legend_product,function(i,v){
				if(isInShowProduct(v)){
					html_legend_product += '<option value="'+v.v+'">'+v.n+'</option>';
				}
			});
			
			$select_legent_product.html(html_legend_product);
		}
		initHtml();
		return {
			add: function(add_val){
				if(add_val){
					var selected_option = $select_legent_product.find('option[value='+add_val['v']+']');
				}else{
					var selected_option = $($select_legent_product.get(0).selectedOptions);
				}
				selected_option.remove();
				if($select_legent_product.find('option').length == 0){
					$select_legent_product.html('<option>暂无可添加的产品配色</option>');
					$select_legent_product.attr('disabled','disabled');
					$btn_add_new_legend.attr('disabled','disabled');
				}
				var name = selected_option.text(),
					val = selected_option.val();
				for(var i = 0,j=show_product.length;i<j;i++){
					var v = show_product[i];
					if(v.n == name && v.v == val){
						return show_product.splice(i,1)[0];
					}
				}
			},rm: function(delete_val){
				$select_legent_product.removeAttr('disabled');
				$btn_add_new_legend.removeAttr('disabled');
				show_product.push(delete_val);
				initHtml();
			}
		}
	})();

	var html_fieldset_color = '<fieldset class="fieldset_color">'+
								'<legend>_N_ <input type="button" class="admin btn_dele_lengend" value="删除"/></legend>'+
								'<div class="legend_value">'+
									'<form id="form_legend">'+
										'<div class="mt10">'+
											'<label>起始颜色</label><input type="color" value="#0000ff" class="color_start"/>'+
											'<label>终止颜色</label><input type="color" value="#ff0000" class="color_end"/>'+
											'<label title="雨夹雪时可使用">条纹显示</label><input type="checkbox" class="cb_is_stripe"/>'+
										'</div>'+
										'<div class="mt10">'+
											'<label>最小值</label><input type="number" value="0" class="number_min"/>'+
											'<label>最大值</label><input type="number" value="40" class="number_max"/>'+
											'<label>等级数</label><input type="number" value="10" class="number_level"/>'+
											'<input value="生成等阶颜色值" type="button" class="btn_gen_colors"/>'+
										'</div>'+
									'</form>'+
								'</div>'+
								'</fieldset>';
	var $legend_left = $('.legend_left');
	// 删除某一个配色
	$legend_left.delegate('.btn_dele_lengend','click',function(){
		var $this = $(this);
		var $remote_fieldset = $this.closest('fieldset');
		// console.log($remote_fieldset,$remote_fieldset.data('val_c'));
		init_legend_product.rm($remote_fieldset.data('val_c'));
		$remote_fieldset.remove()
	});
	var color_toRGB = Core.Color.toRGB,
		color_toHTML = Core.Color.toHTML;
	$legend_left.delegate('form','submit',function(e){
		e.preventDefault();
		return false;
	});
	var format_number = function(num){
		return num.toFixed(num%1>0?1:0);
	}
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
	function getTable(color_arr){
		var html_table = '<table cellspacing=1>'+
								'<tr>'+
									'<th width="10%">状态</th>'+
									'<th width="12%">颜色值</th>'+
									'<th width="12%">文字颜色</th>'+
									'<th width="30%">值域</th>'+
									'<th width="30%">显示文字</th>'+
									'<th width="6%" title="图例排列顺序\n从小到大排（图例倒序显示时从大到小）" class="cursor_help">顺序</th>'+
								'</tr>';
		$.each(color_arr,function(i,v){
			var text_color = v.color_text || '#000';
			html_table += '<tr>'+
								'<td class="fn_contextmenu"><input type="checkbox" '+(v.is_checked?'checked':'')+'/></td>'+
								'<td><input type="color" value="'+v.color+'"/></td>'+
								'<td><input type="color" value="'+text_color+'"/></td>'+
								'<td><input type="number" value="'+v.val[0]+'"/>~<input type="number" value="'+v.val[1]+'"/></td>'+
								'<td contentEditable="true" class="no_outline">'+v.text+'</td>'+
								'<td><input type="number" value="'+(v.order||0)+'"/></td>'
							'</tr>'
		});
		html_table += '</table>';
		return html_table;
	}

	var $cb_title_1 = $('#cb_title_1'),
		$cb_title_2 = $('#cb_title_2'),
		$cb_title_3 = $('#cb_title_3'),
		$textarea_title_1 = $('#textarea_title_1'),
		$textarea_title_2 = $('#textarea_title_2'),
		$textarea_title_3 = $('#textarea_title_3'),
		$cb_is_show_legend = $('#cb_is_show_legend'),
		$cb_is_show_unit = $('#cb_is_show_unit'),
		$cb_is_reverse = $('#cb_is_reverse'),
		$cb_is_updown = $('#cb_is_updown'),
		$text_file_logo = $('#text_file_logo'),
		$color_bg = $('#color_bg'),
		$fieldset_legend = $('#fieldset_legend'),
		$text_file_bgimg = $('#text_file_bgimg'),
		$text_out_filename = $('#text_out_filename');

	$('#btn_cancel').click(CoreWindow.close);
	$('#btn_save').click(function(){
		var save_data = {
			'file': {
				'time_start': $date_start.val(),
				'time_end': $date_end.val(),
				'is_newest': $cb_is_newest.prop('checked'),
				'newest_days': parseInt($number_newest_days.val())|| 0
			},
			'in_out': {
				'dir_in': $text_file_dir_in.val(),
				'dir_out': $text_file_dir_out.val(),
				'file_rule': {
					'common': {
						'prefix': $text_file_rule_common_prefix.val(),
						'date_format': $select_file_rule_common_date.val(),
						'postfix': $text_file_rule_common_postfix.val(),
						'file_suffix': $select_file_rule_common_postfix.val() 
					},
					'custom': $text_file_rule_custom.val(),
					'type': $('[name=file_rule]:checked').val(),
					'file_type': $select_file_type.val(),
					'file_hour': parseInt($select_file_hour.val()) || 0,
					'col': parseInt($select_value_col.val())
				},
				'out_filename': $text_out_filename.val()
			},
			'title': {
				'title_1': {
					'is_show': $cb_title_1.prop('checked'),
					'text': $textarea_title_1.val(),
					'style': $textarea_title_1.attr('style')||''
				},
				'title_2': {
					'is_show': $cb_title_2.prop('checked'),
					'text': $textarea_title_2.val(),
					'style': $textarea_title_2.attr('style')||''
				},
				'title_3': {
					'is_show': $cb_title_3.prop('checked'),
					'text': $textarea_title_3.val(),
					'style': $textarea_title_3.attr('style')||''
				}
			},
			'legend': {
				'unit': $select_legend_unit.val(),
				'is_show_legend': $cb_is_show_legend.prop('checked'),
				'is_show_unit': $cb_is_show_unit.prop('checked'),
				'is_reverse': $cb_is_reverse.prop('checked'),
				'is_updown': $cb_is_updown.prop('checked')
			},
			'other': {
				'logo': $text_file_logo.val(),
				'bg_img': {
					'val': $text_file_bgimg.val(),
					'flag': $cb_use_bgimg.prop('checked')
				},
				'bg_color': {
					'val': $color_bg.val(),
					'flag': $cb_use_bgcolor.prop('checked')
				},
				'interpolation': {
					'flag': $cb_interpolation_all.prop('checked')
				},
				'template': $select_template.val().split('x')
			}
		};
		
		save_data.legend.blendent = _getBlendent();

		Conf_User.write(product_name,save_data,true);
		CoreWindow.close();
	});	
	
	function _getBlendent(){
		var blendent = [];
		$fieldset_legend.find('.fieldset_color').each(function(i,v){
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
					var val_arr = $td.eq(3).text().split('~');
					val_arr.forEach(function(v, i){
						val_arr[i] = isNaN(v)? (i == 0?MIN_VAL:MAX_VAL) :parseFloat(v);
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
	function init(conf_product){
		function selected_option($select,val){
			$select.find('option').each(function(i,v){
				var $this = $(this);
				if($this.val() == val){
					$this.attr('selected','selected');
				}
			});
		}
		if(conf_product){
			var conf_file = conf_product.file;
			if(conf_file){
				$date_start.val(conf_file.time_start);
				$date_end.val(conf_file.time_end);
				$cb_is_newest.prop('checked',conf_file.is_newest);
				$number_newest_days.val(conf_file.newest_days);
				click_cb_is_newst();
			}
			var conf_in_out = conf_product.in_out;
			if(conf_in_out){
				$text_file_dir_in.val(conf_in_out.dir_in);
				$text_file_dir_out.val(conf_in_out.dir_out);
				var file_rule = conf_in_out.file_rule;
				var file_rule_common = file_rule.common;
				if(file_rule_common){
					$text_file_rule_common_prefix.val(file_rule_common.prefix);
					selected_option($select_file_rule_common_date,file_rule_common.date_format);
					$text_file_rule_common_postfix.val(file_rule_common.postfix);
					selected_option($select_file_rule_common_postfix,file_rule_common.file_suffix);
				}
				$text_file_rule_custom.val(file_rule.custom);
				$('[name=file_rule]').filter('[value='+file_rule.type+']').prop('checked',true);

				selected_option($select_file_type, file_rule.file_type);
				selected_option($select_file_hour, file_rule.file_hour);
				selected_option($select_value_col, file_rule.col);

				var filename = conf_in_out.out_filename || product_name+'_'+map_width+'x'+map_height+'.png';
				$text_out_filename.val(filename);
			}
			var conf_title = conf_product.title;
			if(conf_title){
				var conf_title_1 = conf_title.title_1;
				$textarea_title_1.text(conf_title_1.text).attr('style',conf_title_1.style);
				$cb_title_1.prop('checked',conf_title_1.is_show);

				var conf_title_2 = conf_title.title_2;
				$textarea_title_2.text(conf_title_2.text).attr('style',conf_title_2.style);
				$cb_title_2.prop('checked',conf_title_2.is_show);

				var conf_title_3 = conf_title.title_3;
				$textarea_title_3.text(conf_title_3.text).attr('style',conf_title_3.style);
				$cb_title_3.prop('checked',conf_title_3.is_show);
			}
			var conf_legend = conf_product.legend;
			if(conf_legend){
				selected_option($select_legend_unit,conf_legend.unit);
				$cb_is_show_legend.prop('checked',conf_legend.is_show_legend);
				$cb_is_show_unit.prop('checked',conf_legend.is_show_unit);
				$cb_is_reverse.prop('checked',conf_legend.is_reverse);
				$cb_is_updown.prop('checked',conf_legend.is_updown);

				var blendent = conf_legend.blendent;
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

			var conf_other = conf_product.other;
			if(conf_other){
				var conf_bg_color = conf_other.bg_color;
				if(conf_bg_color){
					$color_bg.val(conf_bg_color.val);
					$cb_use_bgcolor.prop('checked', conf_bg_color.flag);
				}
				

				var conf_logo = conf_other.logo;
				if(conf_logo){
					$text_file_logo.val(conf_logo);
				}

				var conf_bgimg = conf_other.bg_img;
				if(conf_bgimg){
					$text_file_bgimg.val(conf_bgimg.val);
					$cb_use_bgimg.prop('checked', conf_bgimg.flag);
				}
				var conf_interpolation = conf_other.interpolation;
				if(conf_interpolation){
					$cb_interpolation_all.prop('checked', conf_interpolation.flag);
				}

				var template = conf_other.template || _template.t;
				if(template){
					selected_option($select_template, template.join('x'));
				}
			}
		}

		var _contextmenu = (function(){
			var $_target;
			var menu = new Menu();
			var menu_add_above = new MenuItem({label: '在上方添加'});
			var menu_add_below = new MenuItem({label: '在下方添加'});
			var menu_delete = new MenuItem({label: '删除'});
			menu_add_above.on('click', function(){
				var $p = $_target.parent();
				$p.clone().insertBefore($p);
			});
			menu_add_below.on('click', function(){
				var $p = $_target.parent();
				$p.clone().insertAfter($p);
			});
			menu_delete.on('click', function(){
				if(confirm('确定要删除这一项吗？')){
					$_target.parent().slideUp();
				}
			});
			menu.append(menu_add_above);
			menu.append(menu_add_below);
			menu.append(menu_delete);
			return function(e){
				$_target = $(e.target);
				menu.popup(e.clientX, e.clientY);
			}
		})();
		$('.legend_left').delegate('.fn_contextmenu', 'contextmenu', _contextmenu);
	}
});