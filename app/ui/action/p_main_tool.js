Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var WIN = C.Win.Win;
    var _require = C.require;
    var util = _require('util');
    var util_file = util.file;
    var util_variate = util.variate;
    var electron = require('electron');
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
    var Layer = _require('m/layer');

    var ASSET_TYPE_PRODUCT = 1,
        ASSET_TYPE_SYS = 2;

    // 定义图片过滤器
    var CONST_FILTER_IMAGE = CONST.FILTER_IMAGE;
    var _isImage = component.util.isImg;

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

    var TextLayer = function(option) {
        var $html = Layer.text(option);
        $geomap_container.append($html);
    }
    var ImageLayer = function(option) {
        var $html = Layer.img(option);
        $geomap_container.append($html);
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

    var $geomap_container = $('#geomap_container').on('_mousedown', Layer.util.reset);

    model.on('asset.add', function(assets) {
        if (!assets) {
            return;
        }
        for (var i = 0, j = assets.length; i<j; i++) {
            var item = assets[i];
            if (!item || !item.flag) {
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
            var isLock = !!item.id && !!item.type;
            var $html = '';
            if (!!text) {
                // styleObj.text = text;
                $html = TextLayer({
                    lock: isLock,
                    text: text,
                    pos: pos,
                    css: {
                        width: styleObj.width,
                        height: styleObj.height
                    },
                    style: styleObj,
                    onlockchange: (function(item) {
                        return function(text) {
                            product_conf.util.asset.modify(_current_product_name, item.key, {
                                text: text
                            });
                        }
                    })(item)
                });
            } else {
                $html = ImageLayer({
                    lock: isLock,
                    src: item.src,
                    pos: pos,
                    width: styleObj.width,
                    height: styleObj.height,
                    style: styleObj,
                    onlockchange: (function(item) {
                        return function(src) {
                            product_conf.util.asset.modify(_current_product_name, item.key, {
                                src: src
                            });
                        }
                    })(item)
                });
            }
            if ($html) {
                $html.data('asset'+(item.id? ASSET_TYPE_SYS: ASSET_TYPE_PRODUCT), true);
            }
        }
    });
    var _showMenuAssets = (function() {
        function _add(type) {
            if ($layer && _current_product_name) {
                if ($layer.data('asset'+type)) {
                    return _alert('已经添加，不用重复添加！');
                }
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
                    $layer.data('asset'+type, true);
                    var conf = product_conf.read(_current_product_name);
                    if (ASSET_TYPE_PRODUCT == type) {
                        (conf.assets || (conf.assets = [])).push(data);
                        product_conf.save(_current_product_name, conf);

                        _alert('已经保存到“'+_current_product_name+'”的附属资源中！');
                    } else if (ASSET_TYPE_SYS == type) {
                        var conf_sys = product_conf.getSys();
                        var key = new Date().getTime();
                        data.id = key;
                        (conf_sys.assets || (conf_sys.assets = [])).push(data);
                        product_conf.setSys(conf_sys);

                        (conf.assets || (conf.assets = [])).unshift({
                            flag: true, 
                            key: key
                        });
                        product_conf.save(_current_product_name, conf);
                        _alert('已经保存到系统资源！');
                    }
                }
            }
            $layer = null;
        }
        var $layer;
        var menu = new Menu();
        var menu_add_asset_product = new MenuItem({label: '添加到附属资源', 'click': function() {
            _add(ASSET_TYPE_PRODUCT);
        }});
        var menu_add_asset_sys = new MenuItem({label: '添加到系统资源', 'click': function() {
            _add(ASSET_TYPE_SYS);
        }});
        menu.append(menu_add_asset_product);
        menu.append(menu_add_asset_sys);
        return function($html) {
            $layer = $html;
            menu.popup(WIN);
        }
    })();

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
        dialog.imagesOpen(function(file_paths) {
            if (file_paths && file_paths.length > 0) {
                file_paths.forEach(function(file_path) {
                    ImageLayer({
                        src: file_path
                    });
                });
            }
        });
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
                    filename = conf_save.file;
                    if (filename && !_isImage(filename)) {
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
