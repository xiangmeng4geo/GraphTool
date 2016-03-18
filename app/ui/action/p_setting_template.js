Core.init(function(model) {
    var path = require('path');
    var C = Core;
    var $ = C.$;
    var WIN = C.Win.Win;
    var _require = C.require;
    var dialog = _require('dialog');
    var _alert = dialog.alert;
    var _confirm = dialog.confirm;
    var util_extend = _require('util').extend;
    var component = _require('component');
    var UI = component.UI;
    var style2obj = component.util.style2obj;
    var GeoMap = _require('map');
    var Geo = _require('geo');
    var map_util = _require('m/map_util');
    var electron = require('electron');
    var remote = electron.remote;
    var Menu = remote.Menu;
    var MenuItem = remote.MenuItem;
    var product_conf = _require('product_conf'); //直接把模块加载到UI进程
    var CONST = _require('const');
    var CONST_SIZE = CONST.SIZE;
    var CONST_SIZE_WIDTH = CONST_SIZE.WIDTH;
    var CONST_SIZE_HEIGHT = CONST_SIZE.HEIGHT;
    var CONST_SIZE_MINWIDTH = CONST_SIZE.MINWIDTH;
    var CONST_SIZE_MINHEIGHT = CONST_SIZE.MINHEIGHT;
    var CONST_STEP = 10;

    var TYPE_PLACEHOLDER = 1,
        TYPE_NORMAL = 2;

    var Layer = _require('m/layer');

    var conf_data_sys = product_conf.getSys() || {};
    var conf_data_template = conf_data_sys.template || (conf_data_sys.template = []);

    var pos_contextmenu;
    function _text(type) {
        TextLayer({
            edit: true,
            text: '占位文字',
            pos: pos_contextmenu
        }, {
                type: type
            });
    }
    function _img(type) {
        dialog.imagesOpen(function(file_paths) {
            if (file_paths && file_paths.length > 0) {
                var pos = pos_contextmenu || { left: 0, top: 0 };
                var left = pos.left,
                    top = pos.top;
                file_paths.forEach(function(file_path, i) {
                    ImageLayer({
                        src: file_path,
                        pos: {
                            left: left + CONST_STEP * i,
                            top: top + CONST_STEP * i
                        },
                        useEdit: true
                    }, {
                            type: type
                        });
                });
            }
        });
    }
    var tmplMenu = [{
        label: '添加占位文字',
        click: function() {
            _text(TYPE_PLACEHOLDER);
        }
    }, {
            label: '添加指定文字',
            click: function() {
                _text(TYPE_NORMAL);
            }
        }, {
            type: 'separator'
        }, {
            label: '添加占位图片',
            click: function() {
                ImageLayer({
                    src: path.join(CONST.PATH.UI, 'img/placeholder.svg'),
                    pos: pos_contextmenu,
                    useEdit: true
                }, {
                        type: TYPE_PLACEHOLDER
                    });
            }
        }, {
            label: '添加指定图片',
            click: function() {
                _img(TYPE_NORMAL);
            }
        }];
    var menu = Menu.buildFromTemplate(tmplMenu);
    Menu.setApplicationMenu(menu);

    var COPY_INDEX = -1;
    var menu_copy = Menu.buildFromTemplate([{
        label: '复制',
        click: function() {
            $template_list.find('li').removeClass('on');
            _changeTemplate(COPY_INDEX);
            COPY_INDEX = -1;
        }
    }]);
    Menu.setApplicationMenu(menu_copy);

    var $template_list = $('#template_list');
    var $txt_template_name = $('#txt_template_name');
    var $n_template_width = $('#n_template_width');
    var $n_template_height = $('#n_template_height');


    var $template_assets = $('.template_assets').on('contextmenu', function(e) {
        e.stopPropagation();

        pos_contextmenu = {
            left: e.offsetX,
            top: e.offsetY
        };
        menu.popup(WIN);
    });
    $template_assets.on('mousedown', Layer.util.reset);

    // 初始化地图
    var geomap;
    var width_map, height_map;
    function _initMap(map_name) {
        width_map = $template_assets.width();
        height_map = $template_assets.height();

        map_name = map_name || '';
        var conf_geo = product_conf.getSys.getGeo(map_name);
        var bound = conf_geo.bound;
        var projection = map_util.getProjection(bound.wn, bound.es, width_map, height_map);

        GeoMap.setProjection(projection);
        if (geomap) {
            geomap.resize({
                width: width_map,
                height: height_map
            });
            geomap.refresh();
            return;
        }
        GeoMap.setGeo(Geo);
        geomap = new GeoMap(model).init({
            container: $template_assets
        });
        geomap.setGeo(conf_geo, function() { });
    }
    function _changeSize() {
        var width = parseFloat($n_template_width.val()) || CONST_SIZE_WIDTH,
            height = parseFloat($n_template_height.val()) || CONST_SIZE_HEIGHT;
        $template_assets.animate({
            width: width,
            height: height
        }, function() {
            if (width != width_map || height != height_map) {
                _initMap();
            }
        });
    }
    $n_template_width.add($n_template_height).on('change', _changeSize);
    var TextLayer = function(option, data) {
        var $html = Layer.text(option);
        $html.data('_data', data);
        $template_assets.append($html);
    }
    var ImageLayer = function(option, data) {
        var $html = Layer.img(option);
        $html.data('_data', data);
        $template_assets.append($html);
    }
    $template_list.delegate('span', 'click', function(e) {
        e.stopPropagation();
        var $p = $(this).parent();
        _confirm('确定要删除选中项吗？', function() {
            var index = $p.index();
            conf_data_template.splice(index, 1);
            _saveData();

            if ($p.is('.default')) {
                $p.siblings().first().addClass('default');
            }

            $p.remove();
            _changeTemplate();
        });
    }).delegate('li', 'click', function() {
        $(this).addClass('on').siblings().removeClass('on');
        _changeTemplate($(this).index());
    }).delegate('li', 'contextmenu', function() {
        COPY_INDEX = $(this).index();
        menu_copy.popup(WIN);
    }).delegate('[type=radio]', 'click', function() {
        var $item = $(this).parent();
        var index = $item.index();
        _confirm('此操作会影响所有设置成默认系统模板的产品，确定要把选中项设置成默认吗？', function() {
            for (var i = 0, j = conf_data_template.length; i < j; i++) {
                if (i === index) {
                    conf_data_template[i].is_default = true;
                } else {
                    delete conf_data_template[i].is_default;
                }
            }
            _saveData();

            $item.addClass('default').siblings().removeClass('default');
        }, function() {
            $item.parent().find('.default [type=radio]').prop('checked', true);
        });
    });
    function _initList() {
        var html = '';
        for (var i = 0, j = conf_data_template.length; i < j; i++) {
            var item = conf_data_template[i];
            var name = item.name;
            var id = 'r_id_' + i;
            html += '<li ' + (item.is_default ? 'class="default"' : '') + '>' +
                '<input type="radio" id="' + id + '" name="template_list" ' + (item.is_default ? 'checked' : '') + '/>' +
                '<label>' + name + '</label>' +
                '<span></span>'
            '</li>';
        }

        $template_list.html(html);
    }

    function _changeTemplate(index) {
        index = isNaN(index) ? -1 : index;
        var data = conf_data_template[index] || {};
        var is_copy = COPY_INDEX != -1;
        $txt_template_name.val((data.name || '') + (is_copy ? ' (复制)' : ''));
        $n_template_height.val(data.height || CONST_SIZE_HEIGHT);
        $n_template_width.val(data.width || CONST_SIZE_WIDTH);

        $('.map_layer').remove();
        var assets = data.assets || [];
        $.each(assets, function(i, v) {
            if (is_copy) {
                v = util_extend(true, {}, v);
                delete v.id;
            }
            var text = v.text;
            var style = v.style;
            var styleObj = style2obj(style);
            var pos = {
                left: styleObj.left || 0,
                top: styleObj.top || 0,
                center: false
            }
            var width = styleObj.width,
                height = styleObj.height;
            if (text) {
                TextLayer({
                    text: text,
                    pos: pos,
                    css: {
                        width: width,
                        height: height
                    },
                    style: styleObj
                }, v);
            } else {
                ImageLayer({
                    src: v.src,
                    pos: pos,
                    width: width,
                    height: height,
                    style: styleObj,
                    useEdit: true
                }, v);
            }
        });
        _changeSize();
    }

    function _saveData() {
        var is_have_default = false;
        for (var i = 0, j = conf_data_template.length; i < j; i++) {
            if (conf_data_template[i].is_default) {
                is_have_default = true;
                break;
            }
        }
        // 没有设置默认地图的话使用第一个
        if (!is_have_default && conf_data_template.length > 0) {
            conf_data_template[0].is_default = true;
        }
        product_conf.setSys(conf_data_sys);
        model.emit('save');
    }
    var _getId = (function() {
        var n = 0;
        return function() {
            return new Date().getTime() + '' + (n++);
        }
    })();
    function _save(cb) {
        var index = $template_list.find('.on').index();
        var isEdit = index > -1;
        var name = $txt_template_name.val();
        if (!name) {
            return _alert('请先输入模板名称！');
        }
        if (!isEdit) {
            for (var i = 0, j = conf_data_template.length; i < j; i++) {
                if (conf_data_template[i].name == name) {
                    return _alert('不能输入重复的模板名称！');
                }
            }
        }
        var width = $n_template_width.val();
        if (!width || isNaN(width)) {
            $n_template_width.val(CONST_SIZE_WIDTH);
            return _alert('模板宽度不能为空，且只能为数字！');
        } else if (width < CONST_SIZE_MINWIDTH) {
            $n_template_width.val(CONST_SIZE_MINWIDTH);
            return _alert('模板宽度最小为' + CONST_SIZE_MINWIDTH + 'px！');
        }
        var height = $n_template_height.val();
        if (!height || isNaN(height)) {
            $n_template_height.val(CONST_SIZE_HEIGHT);
            return _alert('模板高度不能为空，且只能为数字！');
        } else if (height < CONST_SIZE_MINHEIGHT) {
            $n_template_height.val(CONST_SIZE_MINHEIGHT);
            return _alert('模板高度最小为' + n_template_height + 'px！');
        }

        var assets = [];
        $('.map_layer').each(function() {
            var $layer = $(this);
            var _data = $layer.data('_data');
            var type = _data && _data.type;
            var id = _data && _data.id || _getId();
            if ($layer.is('.layer_text')) {
                var $item = $layer.find('textarea');
                var text = $item.val();
                if (text) {
                    var pos = $layer.position();
                    assets.push({
                        id: id,
                        type: type,
                        text: text,
                        style: ($item.attr('style') || '') + 'width: ' + $layer.width() + 'px; height: ' + $layer.height() + 'px; left: ' + pos.left + 'px; top: ' + pos.top + 'px;'
                    });
                }
            } else if ($layer.is('.layer_img')) {
                var $img = $layer.find('._img');
                var src = $img.data('src') || $img.attr('src');
                assets.push({
                    id: id,
                    type: type,
                    src: src,
                    style: $layer.attr('style') || ''
                });
            }
        });
        var data = {
            name: name.trim(),
            width: width,
            height: height,
            assets: assets
        };


        if (!isEdit) {
            conf_data_template.push(data);
        } else {
            data.is_default = conf_data_template[index].is_default;
            conf_data_template.splice(index, 1, data);
        }

        conf_data_template.sort(function(a, b) {
            return (a.name + '').localeCompare(b.name);
        });

        _saveData();
        cb && cb();
    }
    // 保存按钮
    $('#btn_save_template').click(function() {
        _save(function() {
            _initList();
            _changeTemplate();
            _alert('保存成功！');
        });
    });
    $('#btn_add_template').click(function() {
        $template_list.find('li.on').removeClass('on');
        _changeTemplate();
    }).click();
    _initList();
    _initMap();
});