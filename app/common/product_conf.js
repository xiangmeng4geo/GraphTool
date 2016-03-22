/**
 * 主要操作/app/config下文件（用户配置文件）
 */
!function() {
    var util = require('./util');
    var util_path = util.path;
    var util_file = util.file;
    var util_extend = util.extend;
    var CONST = require('./const');
    var CONST_PATH_CONFIG = CONST.PATH.CONFIG;
    var CONST_SIZE = CONST.SIZE;
    var CONST_EXT = '.json';
    var TYPE_PLACEHOLDER = 1,
        TYPE_NORMAL = 2;

    function _getPathByName(name) {
        return util_path.join(CONST_PATH_CONFIG, name) + CONST_EXT;
    }
    function _readConfig(name) {
        return util_file.read(_getPathByName(name), true);
    }
    function _saveConfig(name, json) {
        return util_file.write(_getPathByName(name), json);
    }
    function _rmConfig(name) {
        return util_file.rm(_getPathByName(name));
    }
    function _renameConfig(name_old, name_new) {
        return util_file.rename(_getPathByName(name_old), _getPathByName(name_new));
    }

    var CONST_SYSCONF_NAME = '.sys/sys';
    var CONST_SYS_PRODUCT_TREE_NAME = '.sys/sys_product_tree';
    function _getSys() {
        return _readConfig(CONST_SYSCONF_NAME);
    }
    _getSys.getGeo = function(name) {
        // 命令行传入配置
        if (util.isPlainObject(name)) {
            return name;
        }
        var conf = _getSys() || {};
        var geo = conf.geo || [];
        if (!name) {
            // name 等于空字符串时加载默认地图
            if (name === '') {
                for (var i = 0, j = geo.length; i < j; i++) {
                    if (geo[i].is_default) {
                        return geo[i];
                    }
                }
            } else {
                return geo;
            }
        } else {
            name = name.trim();
            for (var i = 0, j = geo.length; i < j; i++) {
                if (name == geo[i].name) {
                    return geo[i];
                }
            }
        }
    }
    _getSys.getLegend = function(name) {
        // 命令行传入配置
        if (util.isPlainObject(name)) {
            // 对颜色进行排序，保证值从小到大
            var colors = name.colors;
            if (colors) {
                colors.sort(function(a, b) {
                    return a.val[0] - b.val[0];
                });
            }
            return {
                "blendent": [util_extend(name, {
                    val: {
                        v: '',
                        code: ''
                    }
                })]
            }
        }
        var conf = _getSys() || {};
        var legend = conf.legend || [];
        legend.unshift({
            name: '无'
        });
        if (!name) {
            return legend;
        } else {
            name = name.trim();
            for (var i = 0, j = legend.length; i < j; i++) {
                if (name === legend[i].name) {
                    return legend[i];
                }
            }
        }
    }
    _getSys.getTemplate = function(name) {
        var conf = _getSys() || {};
        var template = conf.template || [];
        if (!name) {
            // name 等于空字符串时加载默认系统模板
            if (name === '') {
                for (var i = 0, j = template.length; i < j; i++) {
                    if (template[i].is_default) {
                        return template[i];
                    }
                }
            } else {
                return template;
            }
        } else {
            name = name.trim();
            for (var i = 0, j = template.length; i < j; i++) {
                if (name == template[i].name) {
                    return template[i];
                }
            }
        }
    }
    var SIZE_DEFAULT = {
        name: CONST_SIZE.NAME,
        width: CONST_SIZE.WIDTH,
        height: CONST_SIZE.HEIGHT
    };
    _getSys.getSize = function(index) {
        var conf = _getSys() || {};
        var size = conf.size || [];
        size.unshift(SIZE_DEFAULT);
        if (index !== undefined) {
            var val = size[index];
            if (!val) {
                for (var i = 0, j = size.length; i < j; i++) {
                    var v = size[i];
                    if (v.is_default) {
                        val = v;
                        break;
                    }
                }
            }
            return val;
        } else {
            return size;
        }
    }
    _getSys.getAssets = function(key) {
        var conf = _getSys() || {};
        var assets = conf.assets || [];
        if (key) {
            for (var i = 0, j = assets.length; i < j; i++) {
                var item = assets[i];
                if (item.id == key) {
                    return item;
                }
            }
        } else {
            return assets;
        }
    }
    function _assets(assets, conf, option) {
        option = util_extend({
            merge: false, //是否使用全部系统资源
            useFlag: true,
            useOtherTpl: false //是否得到产品资源中属于其它模板的资源
        }, option);
        // 传入产品名
        if (typeof assets == 'string') {
            conf = util_extend(true, _readConfig(assets), conf);
            if (conf) {
                assets = conf.assets;
            } else {
                assets = [];
            }
        }
        assets = assets || [];
        var assets_new = [];
        var isMerge = option.merge;
        var isUseFlag = option.useFlag;
        var isUseOtherTpl = option.useOtherTpl;
        var template = _getSys.getTemplate(conf && conf.other && conf.other.template || '');
        // 找到产品使用的模板
        if (template) {
            var assets_template = template.assets;
            var cache_used_template_asset = {};
            if (assets_template && assets_template.length > 0) {
                var len = assets_template.length;
                var len_assets = assets.length;
                var _cache = {};
                assets_template.forEach(function(v) {
                    _cache[v.id] = v;
                });
                assets.forEach(function(v) {
                    if ((isUseFlag && v.flag) || !isUseFlag) {
                        var key = v.key;
                        if (key) {
                            var _cache_asset = _cache[key];
                            if (_cache_asset) {
                                v.src_t = _cache_asset.src;
                                v.text_t = _cache_asset.text;
                                // 防止产品修改指定资源内容
                                if (_cache_asset.type == TYPE_NORMAL) {
                                    delete v.text;
                                    delete v.src;
                                }
                                assets_new.push(util_extend(true, _cache_asset, v));
                                cache_used_template_asset[key] = true;
                            } else if (isUseOtherTpl){
                                v.id = key;
                                v.is_other_tpl = true;
                                assets_new.push(v);
                            }
                        } else {
                            assets_new.push(v);
                        }
                    }
                });
                
                if (isMerge) {
                    for (var i in _cache) {
                        if (!cache_used_template_asset[i]) {
                            var asset = _cache[i];
                            asset.flag = true;
                            assets_new.unshift(asset);
                        }
                    }
                }
            }
        } else {
            for (var i = 0, j = assets.length; i < j; i++) {
                var asset = assets[i];
                if ((isUseFlag && asset.flag) || !isUseFlag) {
                    if (!asset.key) {
                        assets_new.push(asset);
                    }
                }
            }
        }

        return assets_new;
    }
    function _modifyAsset(name, key, asset_new) {
        var conf = _readConfig(name);
        if (conf) {
            var assets = conf.assets;
            if (assets && assets.length > 0) {
                for (var i = 0, j = assets.length; i < j; i++) {
                    var asset = assets[i];
                    if (asset.key == key) {
                        asset = util_extend(true, asset, asset_new);
                        if (asset.type == TYPE_NORMAL) {
                            delete asset.text;
                            delete asset.src;
                        }
                        assets[i] = asset;
                        _saveConfig(name, conf);
                        return true;
                    }
                }
            }
        }
        return false;
    }
    function _addAsset(name, asset_new) {
        var conf = _readConfig(name);
        if (conf) {
            var assets = conf.assets;
            assets.push(asset_new);
            _saveConfig(name, conf);
            return true;
        }
        return false;
    }
    function _formatAsset(assets) {
        if (!util.isArray(assets)) {
            assets = [assets];
        }
        
        var assets_new = [];
        var _cache = {};
        _getSys.getTemplate().forEach(function(template) {
            var assets_tpl = template.assets;
            assets_tpl.forEach(function(v) {
                _cache[v.id] = true;
            });
        });
        assets.forEach(function(v) {
            if (_cache[v.key]) {
                delete v.id;
                delete v.is_other_tpl;
                assets_new.push(v);
            }
        });
        return assets_new;
    }
    function _saveSys(json) {
        return _saveConfig(CONST_SYSCONF_NAME, json);
    }
    function _getTree() {
        return _readConfig(CONST_SYS_PRODUCT_TREE_NAME);
    }
    function _saveTree(json) {
        return _saveConfig(CONST_SYS_PRODUCT_TREE_NAME, json);
    }
    function _getSize(conf) {
        var _width = conf.width,
            _height = conf.height;
        var toSize = {
            width: CONST_SIZE.WIDTH,
            height: CONST_SIZE.HEIGHT
        };
        if (_width && _height) {
            toSize = {
                width: _width,
                height: _height
            };
        } else {
            if (conf) {
                var template_conf = conf.other && conf.other.template;
                var template = _getSys.getTemplate(template_conf || '');
                if (template) {
                    var _width = template.width,
                        _height = template.height;
                    if (_width && _height) {
                        toSize = {
                            width: _width,
                            height: _height
                        };
                    }
                }
            }
        }
        return toSize;
    }
    var config = {
        read: _readConfig,
        save: _saveConfig,
        rename: _renameConfig,
        rm: _rmConfig,
        getSys: _getSys,
        setSys: _saveSys,
        getTree: _getTree,
        setTree: _saveTree,
        util: {
            assets: _assets,
            asset: {
                add: _addAsset,
                modify: _modifyAsset,
                format: _formatAsset
            },
            getSize: _getSize
        }
    };

    module.exports = config;
} ()
