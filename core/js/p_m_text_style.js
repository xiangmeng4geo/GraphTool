Core.safe(function(){
	var const_msgtype = Core.Const.msgType;
	var $btn_font_color = $('#btn_font_color'),
		$btn_bg_color = $('#btn_bg_color'),
		$input_bg_color = $('#input_bg_color').on('change',function(){
			$btn_bg_color.css('background-color',$(this).val());
		}),
		$input_font_color = $('#input_font_color').on('change',function(){
			$btn_font_color.css('color',$(this).val());
		});

	var $textarea_content = $('#textarea_content'),
		$cb_is_bg_color = $('#cb_is_bg_color'),
		$cb_font_weight = $('#cb_font_weight'),
		$cb_font_italic = $('#cb_font_italic'),
		$cb_text_through = $('#cb_text_through'),
		$cb_text_underline = $('#cb_text_underline'),
		$input_font_size = $('#input_font_size');
	
	function strIsNullAndDefault(str,compare_str){
		return str && str != compare_str;
	}
	var color_rgb2normal = Core.Color.toHTML;
	// Core.Window.get().showDevTools();		
	Core.Window.onMessage(function(e){
		var data = e.data;
		var type = data.type;
		if(const_msgtype.CONF_STYLE == type){
			data = data.data;
			
			var style = data.style;
			var text = data.text;
			text && $textarea_content.val(text);
			if(style){
				$textarea_content.attr('style',style);
				var styleObj = {};
				var styleArr = style.split(/;\s*/);
				$.each(styleArr,function(i,v){
					var arr = v.split(/:\s+/);
					if(arr[0]){
						styleObj[arr[0]] = arr[1];
					}
				});

				var fontSize = parseFloat(styleObj['font-size']);
				fontSize && $input_font_size.val(fontSize);
				var color = styleObj['color'];
				if(color){
					color = color_rgb2normal(color);
					$input_font_color.val(color);
					// $input_font_color.get(0).value = color;
					$btn_font_color.css('color',color);
				}

				var bgColor = styleObj['background-color'];
				if(strIsNullAndDefault(bgColor, 'transparent')){
					bgColor = color_rgb2normal(bgColor);
					$cb_is_bg_color.prop('checked',true);
					$input_bg_color.val(bgColor);
					$btn_bg_color.css('background-color',bgColor)
				}
				if(strIsNullAndDefault(styleObj['font-weight'],'normal')){
					$cb_font_weight.prop('checked',true)
				}
				if(styleObj['font-style'] == 'italic'){
					$cb_font_italic.prop('checked',true)
				}
				var textDecoration = styleObj['text-decoration'];
				if(strIsNullAndDefault(textDecoration,'none')){
					var arr = textDecoration.split(/\s+/);
					if(arr.indexOf('underline') > -1){
						$cb_text_underline.prop('checked',true)
					}
					if(arr.indexOf('line-through') > -1){
						$cb_text_through.prop('checked',true)
					}
				}
			}
		}
		init();
	});
	
	/*字体颜色*/
	$btn_font_color.click(function(){
		$input_font_color.click();
	});
	/*背景颜色*/
	$btn_bg_color.click(function(){
		$input_bg_color.click();
	});
	/*取消按钮*/
	var $btn_cancel = $('#btn_cancel').click(Core.Window.close);
	$('#btn_yes').click(function(){
		Core.Window.sendMsg(Core.Const.msgType.CONF_STYLE,{
			text: $textarea_content.val(),
			style: $textarea_content.attr('style')
		},opener);
		$btn_cancel.click();
	});
	/*对各值进行监测*/
	function init(){
		var cssObj = {};
		cssObj['font-size'] = $input_font_size.val()+'px';
		cssObj['color'] = $input_font_color.val();
		cssObj['background-color'] = $cb_is_bg_color.prop('checked')? $input_bg_color.val(): 'transparent';
		cssObj['font-weight'] = $cb_font_weight.prop('checked')? 'bold': 'normal';
		cssObj['font-style'] = $cb_font_italic.prop('checked')? 'italic': 'normal';
		
		var text_decoration = '';
		if($cb_text_through.prop('checked')){
			text_decoration += 'line-through';
		}
		if($cb_text_underline.prop('checked')){
			text_decoration += ' underline';
		}
		cssObj['text-decoration'] = text_decoration || 'none';
		$textarea_content.removeAttr('style').css(cssObj);

		setTimeout(init, 200);
	}
});