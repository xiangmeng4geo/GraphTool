function init($){
	var sys_conf = require('../../conf/sys.json');
	var tab_html = '<ul class="tab">';
	var subtab_html = '<div class="sub_tabs">';
	var quick_tool_html = '';
	sys_conf.tool.forEach(function(v,i){
		tab_html += '<li'+(i == 0?' class="on"':'')+' data-id="'+v.id+'">'+v.name+'</li>';
		var sub = v.sub;
		if(sub){
			subtab_html += '<ul class="sub_tab">';
			sub.forEach(function(sub_v){
				subtab_html += '<li><div>';
				var sub_sub = sub_v.sub;
				if(sub_sub){
					sub_sub.forEach(function(sub_sub_v){
						subtab_html += '<a data-id="'+sub_sub_v.id+'">'+sub_sub_v.name+'</a>';
						if(sub_sub_v.isQuick){
							quick_tool_html += '<li data-id="'+sub_sub_v.id+'">'+sub_sub_v.name+'</li>';
						}
					});
				}
				subtab_html += '</div><div class="sub_name">'+sub_v.name+'</div></li>';
			});
			subtab_html += '</ul>';
		}
	});
	subtab_html += '</div>';
	tab_html += '</ul>';
	$('.quick_tool').html(quick_tool_html);
	var $tool = $('.tool').html(tab_html+subtab_html);
	var $sub_tab = $tool.find('.sub_tab');
	$tool.find('.tab').click(function(e){
		var $target = $(e.target);
		if($target.is('li')){
			$target.addClass('on').siblings().removeClass('on');
			$sub_tab.eq($target.index()).show().siblings().hide();
		}
	});
	var $result = $('#result');
	$('[data-id]').click(function(){
		var $this = $(this);
		$result.html($this.data('id')+' ' +$this.text());
	});
	console.log($('.tool').html());
}
exports.init = init;