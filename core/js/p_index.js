!function(){
	var utilConf = require('conf');
	/*初始化Tab导航*/
	function initTab(){
		var sys_conf = utilConf.getSysConf();

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
	}
	initTab();
	function testTree(){
		function createNode(){
		  var root = {
		    "id" : "0",
		    "text" : "root",
		    "value" : "86",
		    "showcheck" : true,
		    complete : true,
		    "isexpand" : true,
		    "checkstate" : 0,
		    "hasChildren" : true
		  };
		  var arr = [];
		  for(var i= 1;i<100; i++){
		    var subarr = [];
		    for(var j=1;j<100;j++){
		      var value = "node-" + i + "-" + j; 
		      subarr.push( {
		         "id" : value,
		         "text" : value,
		         "value" : value,
		         "showcheck" : true,
		         complete : true,
		         "isexpand" : false,
		         "checkstate" : 0,
		         "hasChildren" : false
		      });
		    }
		    arr.push( {
		      "id" : "node-" + i,
		      "text" : "node-" + i,
		      "value" : "node-" + i,
		      "showcheck" : true,
		      complete : true,
		      "isexpand" : false,
		      "checkstate" : 0,
		      "hasChildren" : true,
		      "ChildNodes" : subarr
		    });
		  }
		  root["ChildNodes"] = arr;
		  return root; 
		}

		treedata = [createNode()];

		$('#tree').treeview({
			data: treedata,
			showcheck: true,
			cbiconpath: 'img/jquery.tree/',
	        onnodeclick:function(item){
	        	alert(item.text+' '+item.value);
	        }      
	    })
	}
	testTree();
	
	$('#result').text(utilConf.getChinese().name);

	
}();