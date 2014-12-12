Core.safe(function(){
	$('.file_dir').click(function(){
		$(this).parent().prev().click();
	});
	$('.file_dir_nw').on('change',function(){
		var $this = $(this);
		$this.next().find('.text_file_dir').val($this.val());
	});
	$('#fieldset_title input[type=button]').click(function(){
		Core.Page.textStyle();
	});
	var $c_bottom_fieldset = $('#c_bottom > fieldset');
	var $c_top_li = $('#c_top li').click(function(){
		var $this = $(this);
		$c_top_li.removeClass('on');
		$this.addClass('on');
		$c_bottom_fieldset.removeClass('on');
		$c_bottom_fieldset.eq($this.index()).addClass('on');
	});
	!function(){
		var $radio_file_rule_common = $('#radio_file_rule_common'),
			$radio_file_rule_custom = $('#radio_file_rule_custom'),
			$text_file_rule_custom = $('#text_file_rule_custom'),
			$text_file_rule_common_prefix = $('#text_file_rule_common_prefix'),
			$select_file_rule_common_date = $('#select_file_rule_common_date'),
			$text_file_rule_common_postfix = $('#text_file_rule_common_postfix'),
			$select_file_rule_common_postfix = $('#select_file_rule_common_postfix');
			$file_rule_example_span = $('#file_rule_example span');

		var const_file_rule = Core.Const.fileRule,
			file_rule_time = const_file_rule.time_rule,
			file_rule_file_postfix = const_file_rule.file_postfix;

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


		var $text_file_dir = $('#text_file_dir');
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
			rule = rule && new Date().format(rule);

			var dir = $text_file_dir.val();
			if(dir){
				dir += '\\';
			}
			$file_rule_example_span.text(dir + rule);
		}
		setInterval(file_rule_example,100)
	}();
});