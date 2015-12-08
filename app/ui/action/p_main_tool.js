Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var _require = C.require;
    var util = _require('util');
    var util_file = util.file;
    var electron = require('electron');
    var nativeImage = electron.nativeImage;
    var shell = electron.shell;
    var dialog = _require('dialog');
    var path = require('path');
    var Shape = _require('shape');

    // 引入jquery-ui模块
    _require('j.ui');

    // 初始化工具栏
    {
        var CONST_TOOLBAR = C.CONST.TOOLBAR;
        var html = '';
        for (var i = 0, j = CONST_TOOLBAR.length; i < j; i++) {
            var items = CONST_TOOLBAR[i];
            for (var i_items = 0, j_items = items.length; i_items <
                j_items; i_items++) {
                var val = items[i_items];
                html += '<div data-type="' + val.id + '" class="toolbar_btn" title="' + val.title +
                    '">' +
                    '<img src="' + val.icon +
                    '"/></div>';
            }
            if (i != j - 1) {
                html += '<div class="toolbar_split"></div>';
            }
        }
        $('.toolbar').append(html);
    }

    // 保存成功后的提示
    model.on('afterExport', function(save_path, time_used) {
        // dialog.alert('保存成功，用时'+time_used+'ms!');
        dialog.confirm1({
            msg: '保存成功，用时'+time_used+'ms!',
            detail: '保存在"'+save_path+'"',
            buttons: [{
                name: '打开目录',
                cb: function() {
                    shell.showItemInFolder(save_path);
                }
            }, {
                name: '打开图片',
                cb: function() {
                    shell.openItem(save_path);
                }
            }, {
                name: 'yes'
            }]
        });
    });
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

    // 清除所有选项的编辑状态
    function _unedit() {
        $('.map_layer').addClass('off').trigger('edit', false);
    }

    var $geomap_container = $('#geomap_container').on('mousedown', _unedit);

    // 添加删除功能
    $(document).on('keydown', function(e) {
        var keyCode = e.keyCode;
        if (keyCode == 46 || keyCode == 8) {
            $('.map_layer:not(.off)').remove();
        }
    });

    // 创建图层
    function _createLayer(option) {
        _unedit();
        option = $.extend(true, {
            edit: false
        }, option);
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
        if (rotate_option) {
            $html.rotatable(rotate_option).find('.ui-rotatable-handle').on('dblclick', function() {
                $html.data('angele', 0).css('transform', 'rotate(0deg)');
            });
        }

        var resizable_option = option.resize,
            draggable_option = option.drag;
        $html.css('position', 'absolute')
            .resizable($.extend({
                handles: 'all'
            }, resizable_option))
            .draggable(draggable_option)
            .on('mousedown', function(e) {
                e.stopPropagation();
                _unedit(); //清除其它的编辑样式
                $(this).removeClass('off').trigger('edit', true);
            }).on('contextmenu', function(e) {
                e.stopPropagation();

            });
        $html.appendTo($geomap_container);
        return $html;
    }

    // 文字图层
    function TextLayer(option) {
        option = $.extend(true, {
            pos: {
                left: $geomap_container.width() / 2,
                top: $geomap_container.height() / 2
            }
        }, option);
        var $html = _createLayer({
            edit: option.edit,
            css: option.style
        });

        $html.css(option.pos)
            .addClass('layer_text')
            .append('<span>' + (option.text || '') + '</span>');

        return $html;
    }

    //图片图层
    function ImageLayer(option) {
        option = $.extend(true, {
            pos: {
                left: $geomap_container.width()/2,
                top: $geomap_container.height()/2,
                center: 1
            }
        }, option);
        var pos = option.pos;
        var src = option.src;
        if (!/\.(png|jpg)/i.test(path.extname(src))) {
            return;
        }

        var css = {
            left: pos.left,
            top: pos.top
        };
        if (util_file.exists(src)) {
            var image = nativeImage.createFromPath(src);
            var size = image.getSize();
            var width_img = size.width,
                height_img = size.height;
            var width_opt = option.width,
                height_opt = option.height;

            var w = $geomap_container.width() * 0.6;
            var h = $geomap_container.height() * 0.6;

            var width_to, height_to;
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
            if (width_opt && height_opt) {
                width_to = width_opt;
                height_to = height_opt;
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

            var $html = _createLayer({
                css: css,
                rotate: {}
            });
            $html.addClass('layer_img')
                .append('<img src="' + image.toDataURL() + '" class="_img"/>')
                .data('size', {
                    w: width_to,
                    h: height_to
                }).on('dblclick', function() {
                    var $this = $(this);
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

    // function LableRectLayer() {
    //
    // }
    //
    // function EllipseLayer() {
    //
    // }

    $('.toolbar_btn').click(function() {
        var type = $(this).data('type');
        var fn = fn_list[type];
        if (fn) {
            fn();
        }
    });
    var fn_list = {};
    // 添加文字
    fn_list.text = function() {
        TextLayer({
            edit: true,
            style: {
                width: 100,
                height: 30
            },
            text: '请输入文字'
        })
    }

    // 添加图片
    var filters = [{
        name: '图片',
        extensions: ['png', 'jpg']
    }];
    fn_list.img = function() {
        dialog.open({
            filters: filters
    	}, function(file_paths) {
            if (file_paths && file_paths.length > 0) {
                file_paths.forEach(function(file_path) {
                    ImageLayer({
                        src: file_path
                    });
                });
            }
        })
    }

    // 保存
    fn_list.save = function() {
        dialog.save({
            title: '选择保存路径',
            defaultPath: new Date().getTime()+'.png',
            filters: filters
        }, function(file_paths) {
            var shapes = [];
            $('.map_layer').each(function() {
                var $this = $(this);
                var pos = $this.position();
                if ($this.is('.layer_text')) {
                    shapes.push(new Shape.Text($this.text(), $.extend(_styleToObj($this.attr('style')), {
                        x: pos.left,
                        y: pos.top
                    })));
                } else if($this.is('.layer_img')) {
                    shapes.push(new Shape.Image($this.find('._img').attr('src'), {
                        width: $this.width(),
                        height: $this.height(),
                        x: pos.left,
                        y: pos.top
                    }));
                }
            });
            model.emit('export', file_paths, shapes);
        });
    }

    // 添加拖拽
    {
        $geomap_container.on('dragover',function(e){
    		e.preventDefault();
    	}).on('dragenter',function(e){
    		e.preventDefault();
    	}).on('drop', function(e){
    		e.preventDefault();
    		e.stopPropagation();
    		e = e.originalEvent;
            var dataTransfer = e.dataTransfer;
    		// var drag_img = dataTransfer.getData('Text');
    		var x = e.offsetX,y = e.offsetY;
            var files = dataTransfer.files;
    		if(files && files.length > 0){
    			$.each(files, function(i, file){
                    ImageLayer({
                        src: file.path,
                        pos: {
        					center: true,
        					left: x+i*10,
        					top: y+i*10
        				}
                    });
    			})
    		}
            return false;
        });
    }
});
