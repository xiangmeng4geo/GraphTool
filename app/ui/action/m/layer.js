Core.init(function() {
	var path = require('path');
	var C = Core,
		$ = C.$,
		_require = C.require;

    var dialog = _require('dialog');
    var util = _require('util');
    var util_file = util.file;	

    var electron = require('electron');
    var nativeImage = electron.nativeImage;
    var component = _require('component');
    var UI = component.UI;
    var style2obj = component.util.style2obj;
    var _isImage = component.util.isImg;

	// 引入jquery-ui模块
    _require('j.ui');
    C.addLink('m.layer');

	// 创建图层
    function _createLayer(option) {
        _reset();
        option = $.extend(true, {
            edit: false
        }, option);
        var isLock = option.lock;
        var css = option.css;
        var $html = $('<div class="map_layer"></div>');
        if (!option.edit) {
            $html.addClass('off');
        }
        if (css) {
            if ($.isPlainObject(css)) {
                $html.css(css);
            } else {
                $html.attr('style', css);
            }
        }

        var rotate_option = option.rotate;
        if (!isLock && rotate_option) {
            $html.rotatable(rotate_option).find('.ui-rotatable-handle').on('dblclick', function() {
                $html.data('angele', 0).css('transform', 'rotate(0deg)');
            });
        }

        var resizable_option = option.resize,
            draggable_option = option.drag;
        $html.css('position', 'absolute');
        if (!isLock) {
            $html.resizable($.extend({
                handles: 'all'
            }, resizable_option))
            .draggable(draggable_option)
        }
            
        $html.on('mousedown', function(e) {
            e.stopPropagation();
            _reset(); //清除其它的编辑样式
            var $this = $(this).removeClass('off');
            // if (!isLock) {
                $this.trigger('edit', true);
            // }
        }).on('contextmenu', function(e) {
            e.stopPropagation();
        });
        return $html;
    }

    // 文字图层
    function TextLayer(option) {
        function _change() {
            var css = {};
            var pos = $html.position();
            var left = pos.left,
                top = pos.top;
            var $p = $html.parent();
            var w = $p.width();
            var h = $p.height();
            var _w = edit._w,
                _h = edit._h;
            var height_layer = $html.height();
            if (w > 0 && h > 0) {
                var css = {};
                if (left + _w > w && _w > $html.width() || left < 0) {
                    css.left = 'auto';
                    css.right = 0;
                } else {
                    css.left = 0;
                    css.right = 'auto'
                }

                if (top + height_layer + _h > h) {
                    css.top = 'auto';
                    css.bottom = '100%';
                } else {
                    css.top = '100%';
                    css.bottom = 'auto';
                }
                edit.setPos(css);
            }
            edit.setStyle($html.attr('style'));
        }
        option = $.extend(true, {
            pos: {
                left: 0,
                top: 0
            },
            resize: {
                resize: _change
            },
            drag: {
                // handle: 'span.btn_handle',
                drag: _change
            },
            canEdit: true
        }, option);
        var isLock = option.lock;
        var $html = _createLayer(option);

        var text = option.text || '';
        $html.on('edit', function(e, flag) {
            if (flag && option.canEdit) {
                edit.show();
            } else {
                edit.hide();
            }
        }).css(option.pos)
            .addClass('layer_text')
            .append('<span class="btn_handle">' + text + '</span>');

        if (isLock) {
            $html.addClass('lock');
        } 
        var $span = $html.find('.btn_handle');
        var edit = UI.edit($html, {
            style: option.style || '',
            onchange: function() {
                if (edit) {
                    var text = edit.getText();
                    $span.text(text);
                    var style = style2obj(edit.getStyle());
                    $span.css(style);
                    $html.css(edit.getSize());

                    option.onlockchange && option.onlockchange(text);
                }
            }
        });
        edit.setText(text);
        _change();
        if (option.edit) {
            edit.show();
        }
        return $html;
    }

    function _isSvg(ext) {
        return ext == '.svg';
    }
    //图片图层
    function ImageLayer(option) {
        option = $.extend(true, {
            pos: {
                left: 0,
                top: 0,
                center: 1
            }
        }, option);
        var isLock = !!option.lock;
        var isLockChange = !!option.lockchange;
        var pos = option.pos;
        var src = option.src;
        var ext = path.extname(src);
        var flag_is_svg = false;
        if (!_isImage(ext) && !(flag_is_svg = _isSvg(ext))) {
            return;
        }

        var css = {
            left: pos.left,
            top: pos.top
        };
        var style = option.style;
        if (style) {
            css = $.extend(true, style, css);
        }
        // console.log(style, css, option);
        if (util_file.exists(src)) {
            var width_opt = option.width,
                height_opt = option.height;
            var src_img;
            var width_to, height_to;
            if (flag_is_svg) {
                src_img = src
                width_to = 160;
                height_to = 160;
            } else {
                var image = nativeImage.createFromPath(src);
                src_img = image.toDataURL();
                if (width_opt && height_opt) {
                    width_to = width_opt;
                    height_to = height_opt;
                } else {
                    var size = image.getSize();
                    var width_img = size.width,
                        height_img = size.height;

                    var w = 400;
                    var h = 400;

                    if (w / h > width_img / height_img) {
                        if (height_img > h) {
                            height_to = h;
                            width_to = w * width_img / height_img;
                        } else {
                            width_to = width_img;
                            height_to = height_img;
                        }
                    } else {
                        if (width_img > w) {
                            width_to = w;
                            height_to = width_to * height_img / width_img;
                        } else {
                            width_to = width_img;
                            height_to = height_img;
                        }
                    }        
                }
            }

            css.width = width_to;
            css.height = height_to;
            if (pos.center) {
                var left = pos.left,
                    top = pos.top;

                if (!isNaN(left)) {
                    css.left -= width_to / 2;
                }
                if (!isNaN(top)) {
                    css.top -= height_to / 2;
                }
            }

            var $html = _createLayer($.extend(true, option, {
                css: css,
                rotate: {}
            }));
            $html.addClass('layer_img')
                .append('<img src="' + src_img + '" data-src="'+src+'" class="_img"/>')
                .data('size', {
                    w: width_to,
                    h: height_to
                }).on('dblclick', function() {
                    var $this = $(this);
                    if (isLock) {
                        if (isLockChange) {
                            option.onlockchange && option.onlockchange();
                        } else {
                            dialog.imageOpen(function(file_path) {
                                $html.find('._img').attr('src', file_path);
                                option.onlockchange && option.onlockchange(file_path);
                            });
                        }
                    }
                    var size = $this.data('size');
                    if (size) {
                        var w = size.w,
                            h = size.h;

                        var w_now = $this.width(),
                            h_now = $this.height();

                        var w_to, h_to;
                        if (w_now > h_now) {
                            w_to = w_now;
                            h_to = w_to * h / w;
                        } else {
                            h_to = h_now;
                            w_to = h_to * w / h;
                        }
                        $this.css({
                            width: w_to,
                            height: h_to
                        });
                    }
                });

            return $html;
        }
    }

    function _reset() {
		$('.map_layer').addClass('off').trigger('edit', false);
	}

    // 添加删除功能
    $(document).on('keydown', function(e) {
        var keyCode = e.keyCode;
        if (keyCode == 46 || keyCode == 8) {
            $('.map_layer:not(.off)').remove();
        }
    });
    module.exports = {
    	util: {
    		reset: _reset
    	},
    	base: _createLayer,
    	text: TextLayer,
    	img: ImageLayer
    }
})