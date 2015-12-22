!function() {
	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var Dialog = _require('./dialog');
	var _extend = $.extend;
	var CONST = _require('const');
	// http://www.zreading.cn/ican/2014/10/css-font-family/
	var CONST_FONT_FAMILY = CONST.FONT_FAMILY;
	var CONST_FONT_SIZE = CONST.FONT_SIZE;
	for (var i = 10; i <= 60; i++) {
		CONST_FONT_SIZE.push({
			text: i,
			val: i
		});
	}

	var FILETER_GEO = [{
		name: 'GeoJSON',
		extensions: ['json']
	}, {
		name: 'topoJSON',
		extensions: ['json']
	},{
		name: 'shp',
		extensions: ['shp']
	}];
	var FILETER_DEFAULT =
	function openGeo() {
		Dialog.open({
			filters: FILETER_GEO
		});
	}

	var $doc = $(document);
	var UI = {};
	var types = {
		'geo': FILETER_GEO
	};
	$doc.delegate('.btn_file_browse', 'click', function() {
		var $this = $(this);
		var type = $this.data('type');
		var opt = $.extend(true, {
			filters: types[type] || []
		}, $this.data('dialog'));
		Dialog.open(opt, function(file_path) {
			if (file_path) {
				$this.prev('.txt_file').val(file_path);
				$this.parent().trigger('change', file_path);
			}
		});
	});
	/**
	 * 初始化一个file
	 */
	function file($container, options){
		options = _extend(true, {
			width_btn: 40,
			width_minus: 0,
			type: 'geo',
			val: '',
			placeholder: '',
			onchange: null,
			dialogOpt: {}
		}, options);

		var width_btn = options.width_btn;
		var width_minus = options.width_minus;

		if (!$container.data('inited')) {
			var onchange = options.onchange;
			var tmpl_file = '<input type="text" value="'+options.val+'" placeholder="'+options.placeholder+'" class="txt_file" style="width: calc(100% - '+(width_btn + width_minus)+'px);"/>'+
						'<span data-type="'+options.type+'" data-dialog=\''+JSON.stringify(options.dialogOpt)+'\' class="btn_file_browse" value="浏览" style="width:'+width_btn+'px;"/>';
			$container.html(tmpl_file);
			if (onchange) {
				$container.on('change', onchange);
			}
			$container.data('inited', true);
		}
		var $txt_file = $container.find('.txt_file');

		return {
			val: function() {
				return $txt_file.val();
			},
			setVal: function(val) {
				$txt_file.val(val);
			}
		}
	}
	$doc.delegate('.ui-select', 'mouseenter', function() {
		var $this = $(this);
		$this.data('enter', true);
		clearTimeout($this.data('tt'));
	})
	$doc.delegate('.ui-select', 'mouseleave', function() {
		var $this = $(this);
		clearTimeout($this.data('tt'));
		var tt = setTimeout(function() {
			$this.find('ul').hide();
		}, 10);
		$this.data('tt', tt);
	})
	$doc.delegate('.ui-select', 'click', function() {
		var $this = $(this);
		if (!$this.hasClass('disable')) {
			$this.find('ul').show();
		}
	});
	$doc.delegate('.ui-select ul li', 'click', function(e) {
		e.stopPropagation();
		var $this = $(this).addClass('selected');
		$this.siblings().removeClass('selected');
		var $select_show_text = $this.parent().prev('span');

		var val_new = $this.data('val');
		var $container = $this.parent().hide().parent();
		var getShowVal = $container.data('getShowVal') || function($item) {
			return $item.html();
		};
		$select_show_text.data('val', val_new).html(getShowVal($this));
		$container.trigger('change', val_new);
	});
	function _getComputedStyle($obj, prop) {
		return getComputedStyle($obj.get(0), false)[prop];
	}
	function select($container, options) {
		options = _extend({
			val: null,
			data: null,
			onchange: null,
			getShowVal: function($item) {
				return $item.html();
			}
		}, options);

		var data = options.data || [];
		var val_selected = options.val;
		if (!$container.data('inited') || data.length > 0) {
			var onchange = options.onchange || function(){};
			$container.data('getShowVal', options.getShowVal);
			console.log($container.css('width'), $container.css('min-width'));

			var $html_test = $container.clone();
			var html_test = '';
			var html = '<ul>';
			for (var i = 0, j = data.length; i<j; i++) {
				var item = data[i];
				var text, val, type;
				if ($.isPlainObject(item)) {
					text = item.text;
					val = item.val;
					type = item.type;
				} else {
					text = val = item;
				}
				var classStr = '';
				if (val_selected === val) {
					classStr = ' class="selected"';
				}
				html += '<li data-val="'+val+'"'+classStr+'>'+(type == 'img'?'<img src="'+text+'"/>': text)+'</li>';
				html_test += '<span class="ui-select-val">'+text+'</span><br/>';
			}
			html += '</ul>';
			var $html = $(html);
			var $val = $html.find('.selected');
			if ($val.length == 0) {
				$val = $html.find('li:first');
			}

			var min_width = _getComputedStyle($container, 'min-width');
			var width = _getComputedStyle($container, 'width');
			if (!width || width == 'auto' || width == min_width) {
				// 对内容检测得到内容的最大宽度
				$html_test.html(html_test).css('opacity', 0);
				$html_test.appendTo($('body'));
				var w_test = $html_test.width() + 10;
				$html_test.remove();
				
				$container.css('width', w_test);
			}
			var tmpl = '<span class="ui-select-val" title="'+$val.text()+'">'+$val.html()+'</span>';
			$container.html(tmpl+html).on('change', onchange);
			$container.data('inited', true);
		}

		return {
			val: function() {
				var $val = $container.find('.selected');
				if ($val.length == 0) {
					$val = $container.find('li:first');
				}
				return $val.data('val');
			},
			text: function() {
				var $val = $container.find('.selected');
				if ($val.length == 0) {
					$val = $container.find('li:first');
				}
				return $val.text();
			},
			rm: function(val) {
				var $item = $container.find('[data-val="'+val+'"]');
				var val_return = {
					val: val,
					text: $item.text()
				};

				var _this = this;
				if ($item.length > 0) {
					$item.remove();
					_this.selected(_this.val());
					return val_return;
				}
			},
			setDisable: function(is_disable) {
				$container[is_disable? 'addClass': 'removeClass']('disable');
			},
			selected: function(val) {
				var $item = $container.find('li')
						.removeClass('selected')
						.filter('[data-val="'+val+'"]')
						.addClass('selected');
				if ($item.length == 0) {
					$item = $container.find('li:first');
				}
				$container.find('>span').html($item.html() || '');
			},
			getLen: function() {
				return $container.find('li').length;
			}
		}
	}
	// 把style字符串转成对象
    function _styleToObj(style) {
        var result = {};
        var arr = style.split(';');
        arr.forEach(function(v) {
            var items = v.trim().split(':');
            if (items.length == 2) {
                var val = items[1].trim();
                if (/^[-\d.]+px$/.test(val)) {
                    val = parseFloat(val);
                }
                result[items[0].trim()] = val;
            }
        });
        return result;
    }
	function editText($container, options) {
		options = _extend({
			text: '',
			style: null,
			onchange: null
		}, options);

		var text = options.text;

		var $textarea;
		var $editText;
		var onchange = options.onchange || function(){};

		var html = '<div class="editText">';
			html += '<textarea placeholder="请输入文字"></textarea>';
			html += '<div class="row">'+
						'<div class="ui-select s_fontfamily"></div>'+
						'<div class="ui-select s_fontsize"></div>'+
						'<div class="ui-edit-btn fontsize_zoomin"></div>'+
						'<div class="ui-edit-btn fontsize_zoomout"></div>'+
						'<label>字体颜色:</label><input type="color" class="c_edit_front"/>'+
					'</div>';
			html += '<div class="row row2">'+
						'<div class="ui-edit-btn fontweight"></div>'+
						'<div class="ui-edit-btn fontstyle"></div>'+
						'<div class="ui-edit-btn btn_align align_left" data-align="left"></div>'+
						'<div class="ui-edit-btn btn_align align_center" data-align="center"></div>'+
						'<div class="ui-edit-btn btn_align align_right" data-align="right"></div>'+
						// '<label>背景颜色:</label><input type="color" class="c_edit_bg" value=""/>'+
					'</div>';
			html += '<div class="row ui-edit-size">'+
						'<div class="col4">X:<input type="number" class="n_x" value="0"/></div>'+
						'<div class="col4">Y:<input type="number" class="n_y" value="0"/></div>'+
						'<div class="col4">W:<input type="number" class="n_w" value="100"/></div>'+
						'<div class="col4"><span class="ui-edit-btn wh_lock fl"></span>H:<input type="number" class="n_h" value="30"/></div>'+
					'</div>';
		html += '</div>';

		$container.append(html);

		$textarea = $container.find('textarea');
		$editText = $container.find('.editText');

		var $n_x = $container.find('.n_x');
		var $n_y = $container.find('.n_y');
		var $n_w = $container.find('.n_w');
		var $n_h = $container.find('.n_h');
		function _change() {
			var css = {
				'font-family': s_font_family.val(),
				'font-size': s_font_size.val(),
				'color': $c_edit_front.val(),
				// 'background-color': $c_edit_bg.val(),
				'font-weight': $fontweight.is('.on')? 'bold': 'normal',
				'font-style': $fontstyle.is('.on')? 'italic': 'normal'
			}
			var $align_item = $btn_align.filter('.on');
			if ($align_item.length > 0) {
				css['text-align'] = $align_item.data('align');
			}
			$textarea.css(css);

			onchange();
		}
		var s_font_family = select($container.find('.s_fontfamily'), {
			data: CONST_FONT_FAMILY,
			onchange: function() {
				_change();
			}
		});
		var $font_size = $container.find('.s_fontsize');
		var s_font_size = select($font_size, {
			val: 14,
			data: CONST_FONT_SIZE,
			onchange: function() {
				_change();
			}
		});
		$container.find('.fontsize_zoomin').click(function() {
			var val = s_font_size.val();
			s_font_size.selected(val+1);
			_change();
		});
		$container.find('.fontsize_zoomout').click(function() {
			var val = s_font_size.val();
			s_font_size.selected(val-1);
			_change();
		});
		var $c_edit_front = $container.find('.c_edit_front').on('change', _change);
		var $c_edit_bg = $container.find('.c_edit_bg').on('change', _change);
		var $fontweight = $container.find('.fontweight').on('click', function() {
			var $this = $(this);
			if ($this.is('.on')) {
				$this.removeClass('on');
			} else {
				$this.addClass('on');
			}
			_change();
		});
		var $fontstyle = $container.find('.fontstyle').on('click', function() {
			var $this = $(this);
			if ($this.is('.on')) {
				$this.removeClass('on');
			} else {
				$this.addClass('on');
			}
			_change();
		});

		$textarea.on('input', onchange);
		if (text) {
			$textarea.val(text);
		}
		var $btn_align = $container.find('.btn_align').on('click', function() {
			$(this).addClass('on').siblings('.btn_align').removeClass('on');
			_change();
		});
		$container.find('.ui-edit-size [type=number]').on('input', onchange);

		$container.delegate('input,textarea', 'keydown', function(e) {
			e.stopPropagation();
		});
		function _style(style) {
			if (!style) {
				return;
			}
			if (!$.isPlainObject(style)) {
				style = _styleToObj(style);
			}
			s_font_family.selected(style['font-family']);
			var fontSize = style['font-size'];
			fontSize > 0 && s_font_size.selected(fontSize);
			if (style['font-weight'] == 'bold') {
				$fontweight.addClass('on');
			}
			if (style['font-style'] == 'italic') {
				$fontstyle.addClass('on');
			}
			var align = style['text-align'];
			if (align) {
				$btn_align.filter('[data-align='+align+']').addClass('on');
			}
			var color = style['color'];

			// conver rgb to hex
			color && $c_edit_front.val(Util.Color.toHTML(color));

			$n_x.val(style.left);
			$n_y.val(style.top);
			$n_w.val(style.width);
			$n_h.val(style.height);

			_change();
		}
		_style(options.style);
		return {
			_w: $editText.outerWidth(),
			_h: $editText.outerHeight(),
			show: function() {
				$editText.show();
			},
			hide: function() {
				$editText.hide();
			},
			getText: function() {
				return $textarea.val();
			},
			setText: function(text) {
				$textarea.val(text);
			},
			getStyle: function() {
				return $textarea.attr('style');
			},
			setPos: function(pos) {
				$editText.css(pos);
			},
			setStyle: _style,
			getSize: function() {
				return {
					left: parseFloat($n_x.val()),
					top: parseFloat($n_y.val()),
					width: parseFloat($n_w.val()),
					height: parseFloat($n_h.val())
				}
			}
		}
	}
	UI.file = file;
	UI.select = select;
	UI.edit = editText;

	var Util = {
		UI: UI,
		util: {
			style2obj: _styleToObj,
			isImg: function _isImage(file_path) {
		        return /\.(png|jpg)$/i.test(file_path);
		    }
		}
	};
	/*颜色转换*/
	!function(){
		var REG_RGB = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/;
		function to16(num){
			var str16 = Number(num).toString(16);
			return (str16.length == 1? '0':'')+str16;
		}
		function color_rgb2normal(color_rgb){
			if(color_rgb){
				var m = REG_RGB.exec(color_rgb);
				if(m){
					return '#'+to16(m[1])+to16(m[2])+to16(m[3]);
				}else if(REG_HTML.test(color_rgb)){
					return color_rgb;
				}
			}
		}
		var REG_HTML = /#([\da-f]{2})([\da-f]{2})([\da-f]{2})/
		function color_normal2rgb(color_html,isReturnArray){
			if(color_html){
				var m = REG_HTML.exec(color_html);
				if(m){
					var arr = [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)];

					if(isReturnArray){
						return arr;
					}
					return 'rgb('+(arr.join(','))+')';
				}else{
					var m = REG_RGB.exec(color_html);
					if(m){
						if(isReturnArray){
							m.shift();
							return m;
						}else{
							return color_html;
						}
					}
				}
			}
		}
		Util.Color = {
			toRGB: color_normal2rgb,
			toHTML: color_rgb2normal
		}
	}();
	module.exports = Util;
}();
