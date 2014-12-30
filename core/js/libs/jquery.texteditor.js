(function($) {
	var gui = Core.Window.getGui(),
		Menu = gui.Menu,
		MenuItem = gui.MenuItem;

	var menu_text = new Menu();
	var menu_text_delete = new MenuItem({label: '删除'});
	menu_text_delete.on('click',function(){
		if($current_text){
			$current_text.remove();
		}
	});
	menu_text.append(menu_text_delete);

	var $current_text;
	$.fn.texteditor = function(){
		
		var $this = $(this);
		$this.on('dblclick',function(e){
			$this.attr('contenteditable',true);
		}).on('contextmenu',function(e){
			$current_text = $(this);
			e.stopPropagation();
		});
		return $this;
	}

})(jQuery);