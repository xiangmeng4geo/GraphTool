/**
 * 管理主界面的树弄菜单
 */
 Core.init(function(model){
 	var C = Core;
 	var $ = C.$;
 	C.load('lib/j.tree');
 	var Config = C.remote('product_conf');

 	var $doc = $(document);
 	var TREE_NAME = 'sys_product_tree';
 	var treeData = Config.read(TREE_NAME);
 	if(treeData){
 		var data = [];
 		function getNodes(arr){
 			if(!arr || arr.length == 0){
 				return false;
 			}
 			var d = [];
 			arr.forEach(function(v){
 				var name = v.name;
 				d.push({
 					icon: false,
 					text: name,
 					children: getNodes(v.childNodes)
 				});
 			});
 			return d;
 		}
 		treeData = getNodes(treeData);
 	}
 	// 相关的事件说明请参考：https://www.jstree.com/api/#/?q=.jstree%20Event
 	// 自定义了'dblclick_node.jstree'事件
 	$('#tree').jstree({
 		'core': {
 			"themes" : { "stripes" : true, dots: false},
 			data: treeData
 		}
 	}).on('dblclick_node.jstree', function(e, data){
 		if(data){
 			var node = data.node;
 			var children = node.children;
 			if(!children || children.length == 0){
 				model.emit('product.change', node.text);
 			}
 		}
 	});
 });
