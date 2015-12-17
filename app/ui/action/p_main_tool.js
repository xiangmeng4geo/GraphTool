Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var WIN = C.Win.Win;
    var _require = C.require;
    var util = _require('util');
    var util_file = util.file;
    var util_variate = util.variate;
    var electron = require('electron');
    var nativeImage = electron.nativeImage;
    var remote = electron.remote;
    var Menu = remote.Menu;
    var MenuItem = remote.MenuItem;
    var shell = electron.shell;
    var dialog = _require('dialog');
    var path = require('path');
    var Shape = _require('shape');
    var component = _require('component');
    var UI = component.UI;
    var style2obj = component.util.style2obj;
    var CONST = _require('const');
    var CONST_PATH = CONST.PATH;
    var CONST_PATH_GALLERY = CONST_PATH.GALLERY;
    var CONST_PATH_OUTPUT = CONST_PATH.OUTPUT;
    var product_conf = _require('product_conf');
    var _alert = dialog.alert;

    // 定义图片过滤器
    var CONST_FILTER_IMAGE = CONST.FILTER_IMAGE;
    var _isImage = component.util.isImg;
    // function _isImage(file_path) {
    //     return /\.(png|jpg)$/i.test(file_path);
    // }
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

    var _current_product_name;
    model.on('product.change', function(name) {
        _current_product_name = name;
        $('.map_layer').remove();
    });
    // 保存成功后的提示
    model.on('afterExport', function(save_path, time_used) {
        // dialog.alert('保存成功，用时'+time_used+'ms!');
        dialog.confirm1({
            msg: '保存成功，用时'+time_used+'ms!',
            detail: '保存在"'+save_path+'"',
            buttons: [{
                name: '打开所在目录',
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

    // 清除所有选项的编辑状态
    function _unedit() {
        $('.map_layer').addClass('off').trigger('edit', false);
    }

    var $geomap_container = $('#geomap_container').on('_mousedown', _unedit);

    // 添加删除功能
    $(document).on('keydown', function(e) {
        var keyCode = e.keyCode;
        if (keyCode == 46 || keyCode == 8) {
            $('.map_layer:not(.off)').remove();
        }
    });
    model.on('asset.add', function(assets) {
        if (!assets) {
            return;
        }
        for (var i = 0, j = assets.length; i<j; i++) {
            var item = assets[i];
            if (!item.flag) {
                continue;
            }
            var text = item.text;
            var style = item.style || '';
            var styleObj = style2obj(style);
            var pos = {
                left: styleObj.left || 0,
                top: styleObj.top || 0,
                center: false
            }
            var $html = '';
            if (!!text) {
                // styleObj.text = text;
                $html = TextLayer({
                    text: text,
                    pos: pos,
                    css: {
                        width: styleObj.width,
                        height: styleObj.height
                    }, 
                    style: styleObj
                });
            } else {
                $html = ImageLayer({
                    src: item.src,
                    pos: pos,
                    width: styleObj.width,
                    height: styleObj.height,
                    style: styleObj
                });
            }
            if ($html) {
                $html.data('assets', true);
            }
        }
    });
    var _showMenuAssets = (function() {
        var $layer;
        var menu = new Menu();
        var menu_add_asset = new MenuItem({label: '添加到附属资源', 'click': function() {
            if ($layer && _current_product_name) {
                var data;
                if ($layer.is('.layer_text')) {
                    var $item = $layer.find('textarea');
                    var text = $item.val();
                    if (!text) {
                        _alert('请先输入文字!');
                    } else {
                        var pos = $layer.position();
                        data = {
                            text: text,
                            style: ($item.attr('style') || '')+'width: '+$layer.width()+'px; height: '+$layer.height()+'px; left: '+pos.left+'px; top: '+pos.top+'px;'
                        };   
                    }
                } else if ($layer.is('.layer_img')) {
                    var $img = $layer.find('._img');
                    var src = $img.data('src') || $img.attr('src');
                    data = {
                        src: src,
                        style: $layer.attr('style') || ''
                    };
                }
                if (data) {
                    data.flag = true;
                    var conf = product_conf.read(_current_product_name);
                    $layer.data('asset', true);
                    (conf.assets || (conf.assets = [])).push(data);
                    product_conf.save(_current_product_name, conf);

                    _alert('已经保存到“'+_current_product_name+'”的附属资源中！');
                }
            }
            $layer = null;
        }});
        menu.append(menu_add_asset);
        return function($html) {
            $layer = $html;
            menu.popup(WIN);
        }
    })();
    // 添加编辑模块
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
                if (_current_product_name) {
                    if ($html.data('asset')) {
                        _alert('已添加，不用重复添加！');
                    } else {
                        _showMenuAssets($html);
                    }
                }
            });
        $html.appendTo($geomap_container);
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
                if (left + _w > w) {
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
                left: $geomap_container.width() / 2,
                top: $geomap_container.height() / 2
            },
            resize: {
                resize: _change
            },
            drag: {
                // handle: 'span.btn_handle',
                drag: _change
            }
        }, option);
        var $html = _createLayer(option);

        var text = option.text || '';
        $html.on('edit', function(e, flag) {
            if (flag) {
                edit.show();
            } else {
                edit.hide();
            }
        }).css(option.pos)
            .addClass('layer_text')
            .append('<span class="btn_handle">' + text + '</span>');

        var $span = $html.find('.btn_handle');
        var edit = UI.edit($html, {
            style: option.style || '',
    		onchange: function() {
                if (edit) {
                    $span.text(edit.getText());
                    var style = style2obj(edit.getStyle());
                    $span.css(style);
                    $html.css(edit.getSize());
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
        if (!_isImage(path.extname(src))) {
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
                .append('<img src="' + image.toDataURL() + '" data-src="'+src+'" class="_img"/>')
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

    $('.toolbar_btn').click(function(e) {
        var $this = $(this);
        if ($this.is('[data-type=zoomin],[data-type=zoomout],[data-type=move]')) {
            var flag = $this.hasClass('on');
            $('[data-type=zoomin],[data-type=zoomout],[data-type=move]').removeClass('on');

            _changeMapTool();
            if (!flag) {
                $this.addClass('on');
            } else {
                return;
            }
        }
        var type = $this.data('type');
        var fn = fn_list[type];
        if (fn) {
            fn.apply(this, e);
        }
    });
    var fn_list = {};

    // 添加文字
    fn_list.text = function() {
        TextLayer({
            edit: true,
            css: {
                width: 100,
                height: 30
            },
            text: ''
        })
    }

    // 添加图片
    fn_list.img = function() {
        dialog.imageOpen(function(file_paths) {
            if (file_paths && file_paths.length > 0) {
                file_paths.forEach(function(file_path) {
                    ImageLayer({
                        src: file_path
                    });
                });
            }
        });
     //    dialog.open({
     //        filters: CONST_FILTER_IMAGE
    	// }, function(file_paths) {
     //        if (file_paths && file_paths.length > 0) {
     //            file_paths.forEach(function(file_path) {
     //                ImageLayer({
     //                    src: file_path
     //                });
     //            });
     //        }
     //    })
    }

    var $c_right = $('#c_right');
    // 打开图片库
    fn_list.gallery = function() {
        var $this = $(this);
        var $gallery = $c_right.find('.gallery');
        if ($gallery.length == 0) {
            var list = util_file.readdir(CONST_PATH_GALLERY);

            if (!list || list.length == 0) {
                util_file.mkdir(CONST_PATH_GALLERY);
                dialog.confirm1({
                    msg: '图片库目录里还没有添加图片!',
                    buttons: [{
                        name: '打开目录',
                        cb: function() {
                            shell.openItem(CONST_PATH_GALLERY);
                        }
                    }, {
                        name: 'yes'
                    }]
                });
                return;
            }
            var data_select = [];
            function _each(list, deep) {
                deep || (deep = 0);
                for (var i = 0, j = list.length; i<j; i++) {
                    var item = list[i];
                    if (item.sub) {
                        var path_name = item.name;
                        var name = path.basename(path_name);

                        var _str = '';
                        for (var _i = 0; _i<deep; _i++) {
                            _str += '<span class="placeholder"></span>';
                        }
                        data_select.push({
                            text: _str+name,
                            val: path_name
                        });
                        _each(item.sub, deep+1);
                    }
                }
            }
            _each(list);
            var html = '<div class="gallery">'+
                            '<div class="title">图片库<span class="btn_retract"/></div>'+
                            '<div class="ui-select s_gallery"></div>'+
                            '<ul class="gallery_items">'+
                            '</ul>'+
                        '</div>';
            var $html = $(html);
            $c_right.append($html);

            function _getList(arr, val) {
                var result_arr = [];
                for (var i = 0, j = arr.length; i<j; i++) {
                    var item = arr[i],
                        sub = item.sub;

                    if (val === undefined || item.name == val) {
                        if (sub) {
                            for (var _i = 0, _j = sub.length; _i<_j; _i++) {
                                var _item = sub[_i];
                                var _sub = _item.sub;

                                if (_sub) { //添加子目录里文件
                                    if (val == undefined) {
                                        result_arr = result_arr.concat(_getList(_item.sub));
                                    }
                                } else {
                                    if (_isImage(_item.name)) {
                                        result_arr.push(_item.name);
                                    }
                                }
                            }
                        } else {
                            if (_isImage(item.name)) {
                                result_arr.push(item.name);
                            }
                        }
                    } else{
                        if (sub) {
                            // 寻找下级
                            result_arr = result_arr.concat(_getList(sub, val));
                        }
                    }
                }
                return result_arr;
            }
            function _showList(val) {
                var imgs = _getList(list, val);
                var html = '';
                for (var i = 0, j = imgs.length; i<j; i++) {
                    html += '<li><img src="'+imgs[i]+'" draggable="true"/></li>';
                }
                $html.find('.gallery_items').html(html || '<center>暂无图片</center>');
            }
            // 初次进入显示全部
            _showList();
            var s_gallery = UI.select($html.find('.s_gallery'), {
                data: data_select,
                getShowVal: function($item) {
                    var $wrap = $('<div>').append($item.html());
                    $wrap.find('.placeholder').remove();
                    return $wrap.html();
                },
                onchange: function(e, val) {
                    _showList(val);
                }
            });
            $gallery = $c_right.find('.gallery');
            $html.find('.btn_retract').click(function() {
                $gallery.toggleClass('show');
                $this.toggleClass('on');
            });
            setTimeout(function() {
                $gallery.addClass('show');
            }, 10);
        } else {
            $gallery.toggleClass('show');
        }
        $this.toggleClass('on');
    }
    // 保存
    fn_list.save = function() {
        var _format = util_variate({
            p: _current_product_name,
            t: new Date(),
            w: $geomap_container.width(),
            h: $geomap_container.height()
        });
        var out_dir;
        var filename;
        if (_current_product_name) {
            var conf = product_conf.read(_current_product_name);
            if (conf) {
                var conf_save = conf.save;
                if (conf_save) {
                    out_dir = conf_save.dir;
                    filename = conf.file;
                    if (!_isImage(filename)) {
                        filename += '.png';
                    }
                }
            }
        }
        if (!out_dir) {
            out_dir = CONST_PATH_OUTPUT;
        }
        if (!filename) {
            filename = '{{P}}_{{W}}x{{H}}_{{yyyyMMddhhmmss}}.png';
        }
        filename = _format(filename);
        dialog.save({
            title: '选择保存路径',
            defaultPath: path.join(out_dir, filename),
            filters: CONST_FILTER_IMAGE
        }, function(file_paths) {
            var shapes = [];
            $('.map_layer').each(function() {
                var $this = $(this);
                var pos = $this.position();
                if ($this.is('.layer_text')) {
                    var $item = $this.find('.btn_handle');
                    shapes.push(new Shape.Text($item.text(), $.extend(style2obj($item.attr('style')), {
                        x: pos.left,
                        y: pos.top,
                        width: $this.width(),
                        height: $this.height()
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

    // 还原地图状态
    fn_list.reset = function() {
        model.emit('map.reset');
    }
    function _changeMapTool(type) {
        model.emit('map.tool', type);
    }
    fn_list.zoomin = function(e) {
        _changeMapTool('zoomin');
    }
    fn_list.zoomout = function(e) {
        _changeMapTool('zoomout');
    }
    fn_list.move = function(e) {
        _changeMapTool('move');
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
    		var x = e.offsetX,y = e.offsetY;
            var files = dataTransfer.files;
    		var drag_img = dataTransfer.getData('Text');
    		if(files && files.length > 0 || drag_img) {
                if (drag_img) {
                    files = [{
                        path: decodeURIComponent(drag_img).replace('file:///', '')
                    }];
                }
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
