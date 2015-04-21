!function(){
	var win = Core.Window.get();
	function _move($move_container){
		$move_container.on('mousedown', function(e_down){
			var x_old = e_down.screenX,
				y_old = e_down.screenY;
			$move_container.on('mousemove', function(e_move){
				var x_new = e_move.screenX,
					y_new = e_move.screenY;
				win.moveBy(x_new-x_old, y_new-y_old);
				x_old = x_new;
				y_old = y_new;
			});
		});
		function _off(){
			$move_container.off('mousemove');
		}
		$move_container.on('mouseup', _off);
		$move_container.on('mouseleave', _off);
		$move_container.on('dblclick', _max);
	}
	var is_max = false;
	var _max = function(){
		if(is_max){
			is_max = false;
			win.unmaximize();
		}else{
			is_max = true;
			win.maximize();
		}
	}
	Core.frame = {
		close: function(){
			win.close();
		},
		minimize: function(){
			is_max = false;
			win.minimize();
		},
		maximize: _max,
		move: _move
	}	
}();