/**
 * 管理主界面的树弄菜单
 */
Core.init(function(model) {
    var C = Core;
    var $ = C.$;
    var _require = C.require;
    var dialog = _require('dialog');
    var _confirm = dialog.confirm;
    var _alert = dialog.alert;
    var Config = _require('product_conf');

    _require('j.tree');
    var $doc = $(document);
    var treeData = Config.getTree() || [{
        name: '常用图形',
        childNodes: []
    }];
    var _temp_data = {};
    if (treeData) {
        var data = [];

        function getNodes(arr, level) {
            if (!arr) {
                return null;
            }
            var d = [];
            arr.forEach(function(v) {
                var name = v.name;
                var child = getNodes(v.childNodes, level+1);
                d.push({
                    icon: child ? 'folder' : 'file',
                    text: name,
                    state: {
                        opened: level < 1
                    },
                    children: child,
                    type: child ? 'default' : 'file'
                });
                if (!child) {
                    _temp_data[name] = 1;
                }
            });
            return d;
        }
        treeData = getNodes(treeData, 0);
    }
    function refreshData() {
        _temp_data = {};
        var data = this.get_json();
        function getNodes(arr) {
            if (!arr) {
                return null;
            }
            var d = [];
            arr.forEach(function(v) {
                var obj = {
                    name: v.text
                }
                if (v.type == 'default') {
                    obj.childNodes = getNodes(v.children)
                } else {
                    _temp_data[v.text] = 1;
                }
                d.push(obj);
            });
            return d;
        }
        var data_new = getNodes(data);
        Config.setTree(data_new);
    }
    function _getAction(type, _instance) {
        return function(data) {
            var inst = $.jstree.reference(data.reference),
                obj = inst.get_node(data.reference);
            inst.create_node(obj, {
                type: type
            }, "last", function(new_node) {
                setTimeout(function() {
                    inst.edit(new_node, null, function() {
                        refreshData.call(_instance);
                    });
                }, 0);
            });
        }
    }
    var _productNameCurrent;
    function _log(msg) {
        model.emit('log.user', msg);
    }
    C.on('sys.change', function() {
        _productNameCurrent = null;
    });
    C.on('conf.change', function(name) {
        _productNameCurrent = null;
    });

    // 相关的事件说明请参考：https://www.jstree.com/api/#/?q=.jstree%20Event
    // 自定义了'dblclick_node.jstree'事件
    var $tree = $('#tree').jstree({
        'core': {
            "themes": {
                // "stripes": true,
                dots: false
            },
            "strings": {
                'New node': '请输入名称'
            },
            data: treeData,
            "check_callback": true
        },
        "contextmenu": {
            items: function(node) {
                var _instance = this;
                window.test = _instance;
                var tmp = $.jstree.defaults.contextmenu.items();
                delete tmp.create.action;
                delete tmp.ccp;
                tmp.create.label = "添加";
                tmp.rename.label = "修改";
                tmp.remove.label = "删除";
                var _action_remove = tmp.remove.action;
                tmp.remove.action = function(data) {
                    var _this = this;
                    _confirm('确定要删除吗？', function() {
                        _action_remove.call(_this, data);
                        refreshData.call(_instance);
                    });
                }

                tmp.create.submenu = {
                    'create_folder': {
                        separator_after: true,
                        label: '分类',
                        action: _getAction('default', _instance)
                    },
                    'create_file': {
                        separator_after: true,
                        label: '产品',
                        action: _getAction('file', _instance)
                    }
                }
                if (this.get_type(node) === "file") {
                    delete tmp.create;
                    var editConf = {
                        "separator_before": true,
                        "label": "配置",
                        "action": function(data) {
                            var node = _instance.get_node(_instance.get_selected());
                            C.Win.openSub('pconf', {
                                param: node.text
                            });
                        }
                    }
                    tmp.edit = editConf;
                }

                return tmp;
            }
        },
        'types': {
            'default': {
                'icon': 'jstree-themeicon-hidden test'
            },
            'file': {
                'valid_children': [],
                'icon': 'jstree-themeicon-hidden test'
            }
        },
        "plugins": ["contextmenu", "types", "unique"]
    }).on('dblclick_node.jstree', function(e, data) {
        if (data) {
            var node = data.node;
            var children = node.children;
            var text = node.text;
            if ((!children || children.length == 0) && (_productNameCurrent !== text)) {
                if (!_productNameCurrent) {
                    $('#geomap_container').removeClass('no_inited');
                }
                _productNameCurrent = text;
                _log('['+_productNameCurrent+'] click');
                model.emit('product.change', text);
            }
        }
    }).on('rename_node_error.jstree', function(e, data) {
        _alert('请确保名字不重复！');
        setTimeout(function() {
            var _instance = data.instance;
            _instance.edit(data.obj, null, function() {
                refreshData.call(_instance);
            });
        }, 0)
    }).on('ready.jstree', function() {
        model.emit('tree.ready');
    }).on('rename_node.jstree', function(e, data) {
        var text = data.text.trim();
        var flag = true;
        if (/[\.\/\\\s]/.test(text)) { //防止对.sys文件夹及文件夹里的文件进行操作
            _alert('名称中不能含有“. / \\”等特殊字符!');
            flag = false;
        } else {
            var nameOld = data.old;
            var nameNew = data.text;
            if (_temp_data[nameNew] && nameOld != nameNew) {
                _alert('请确保名字不重复！');
                flag = false;
            } else {
                Config.rename(nameOld, nameNew);//对配置文件进行重命名
                refreshData.call(data.instance);//刷新列表数据

                if ('请输入名称' == nameOld) {
                    _log('new ['+nameNew+']');
                } else {
                    _log('rename ['+nameOld+'] to ['+nameNew+']');
                }
            }
        }
        if (!flag) {
            setTimeout(function() {
                var _instance = data.instance;
                _instance.edit(data.node, data.old);
            }, 0)
        }
    }).on('delete_node.jstree', function(e, data) {
        var name = data.node.text;
        Config.rm(name);

        _log('delete ['+name+']');
    });
});