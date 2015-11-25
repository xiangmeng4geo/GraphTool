!function(){
	'use strict'

	var fs = require('fs'),
		path = require('path'),
		crypto = require('crypto');

	var file_verification = 'verification';
	var CONST = require('./const');
	var CONST_PATH_CONF = CONST.PATH.CONF;

	var Util = {};

	/**
	 * 文件工具类
	 */
	function rmfileSync(p, is_not_rmmyself_if_directory) {
	    //如果文件路径不存在或文件路径不是文件夹则直接返回
	    try{
	    	if(exists(p)){
		    	var stat = fs.statSync(p);
		    	if(stat.isDirectory()){
		    		var files = fs.readdirSync(p);
		    		files.forEach(function(file) {
			            var fullName = path.join(p, file);
			            if (fs.statSync(fullName).isDirectory()) {
			                rmfileSync(fullName);
			            } else {
			                fs.unlinkSync(fullName);
			            }
			        });
				    !is_not_rmmyself_if_directory && fs.rmdirSync(p);
		    	}else{
		    		fs.unlinkSync(p);
		    	}
		    }
	    	return true;
	    }catch(e){}
	}
	function read(_p, is_return_json){
		if(exists(_p)){
			var content = fs.readFileSync(_p, 'utf-8');
			if(is_return_json){
				try{
					return JSON.parse(content.trim());
				}catch(e){}
			}else{
				return content;
			}
		}
		return null;
	}
	function readJson(_p) {
		return read(_p, true);
	}
	function write(_p, content){
		if (typeof content === 'object' && !(content instanceof Buffer)) {
			content = JSON.stringify(content);
		}
		fs.writeFileSync(_p, content);
	}
	function exists(_p){
		return fs.existsSync(_p);
	}
	// 同步新建目录
	function mkdirSync(mkPath) {
		try{
			var parentPath = path.dirname(mkPath);
			if(!exists(parentPath)){
				mkdirSync(parentPath);
			}
			if(!exists(mkPath)){
				fs.mkdirSync(mkPath);
			}
			return true;
		}catch(e){}
	}
	function saveBase64(save_file_name, img_data){
		img_data = img_data.substring(img_data.indexOf('base64,') + 7);
		img_data = new Buffer(img_data, 'base64');
		write(save_file_name, img_data);
	}
	var file = {
		read: read,
		readJson: readJson,
		write: write,
		exists: exists,
		rm: rmfileSync,
		mkdir: mkdirSync,
		Image: {
			save: saveBase64
		}
	}

	/**
	 * path 工具类
	 */
	var path_util = {
		join: function(){
			var result = path.join.apply(path, arguments);
			return result.replace(/\\/g, '/');
		}
	}
	/**
	 * 加密与解密
	 */
	var DEFAULT_PRIVATE_KEY = '20150529';
	var METHOD_ALGORITHM = 'aes-256-cbc';
	/**
	 * 对字符串进行不可逆加密
	 */
	var encrypt = function(str, key){
		if(str && str.toString){
			return crypto.createHash('sha1').update(str.toString() + (key||DEFAULT_PRIVATE_KEY)).digest('hex');
		}
		return '';
	}

	var DEFAULT_KEY = 'GraphTool'+DEFAULT_PRIVATE_KEY;
	/**
	 * 对字符串进行可逆加密
	 */
	encrypt.encode = function(str){
		var cip = crypto.createCipher(METHOD_ALGORITHM, DEFAULT_KEY);
		return cip.update(str, 'binary', 'hex') + cip.final('hex');
	}
	/**
	 * 解密字符串
	 */
	encrypt.decode = function(str){
		var decipher = crypto.createDecipher(METHOD_ALGORITHM, DEFAULT_KEY);
		try{
			return decipher.update(str, 'hex', 'binary') + decipher.final('binary');
		}catch(e){}
	}

	/**
	 * 用于验证
	 */
	var path_file_verification = path.join(CONST_PATH_CONF, file_verification+'.json');
	var verification = {
		set: function(l){
			var conf = verification.get();
			conf.l = l;
			file.write(path_file_verification, encrypt.encode(JSON.stringify(conf)));
		}, get: function(){
			var content = file.read(path_file_verification);
			content = encrypt.decode(content);
			return content? JSON.parse(content): null;
		}
	}

	/**
	 * 得到经纬度格点网络
	 */
	function grid(lng0, lat0, lng1, lat1, GRID_SPACE){
		GRID_SPACE || (GRID_SPACE = 0.5);
		lng0 = parseFloat(lng0);
		lat0 = parseFloat(lat0);
		lng1 = parseFloat(lng1);
		lat1 = parseFloat(lat1);
		var arr = [];
		var x_num = Math.ceil((lng1 - lng0)/GRID_SPACE),
			y_num = Math.ceil((lat1 - lat0)/GRID_SPACE);
	
		for(var i = 0; i < x_num; i++){
			var x = lng0 + GRID_SPACE * i;
			var val = [];
			for(var j = 0; j < y_num; j++){
				var y = lat0 + GRID_SPACE*j;
				val.push({
					x: x,
					y: y
				});
			}
			arr.push(val);
		}

		return arr;
	}

	/**
	 * 封闭异步
	 *
	 * 基于webworker-thread, 每个异步的模块里只可以是相应的多计算不可以使用外部API(包插require等)
	 * @param path_js 可以是路径（必须是绝对路径）或函数本身（但不能引用函数外的任务变量）
	 * eg:
	 * init('/a/b/worker.js')(param, cb)
	 *
	 * init(function(){
	 * 		// do something
	 * })(param, cb)
	 */
	var Async = {};
	var Thread = process.type? require('./libs/threads.node'): require('webworker-threads');

	Async.init = function init(path_js, cb_info){
		var t = Thread.create();
		t.on('end', function(){
			t.destroy();
		});
		t.on('info', cb_info); // 对thread原生函数注册调试
		t.on('model.log', function(msg) {
			model_emit_log(msg);
		});
		if(typeof path_js === 'function'){
			var js = '!'+path_js+'()';
			t.eval(js);
		}else{
			t.load(path_js);
		}
		return function(param, cb){
			if(cb === undefined){
				cb = param;
				param = null;
			}
			t.emit('init', JSON.stringify(param));
			t.on('data', function(){
				var args = [].slice.apply(arguments);
				args = args.map(function(v){
					try{
						v = JSON.parse(v);
					}catch(e){}
					return v;
				});
				cb.apply(null, args);
			});
		}
	}

	/**
	 * 数学格式化
	 */
	var Digit = {
		toFixed: function(num, places){
			if(!isNaN(num)){
                num = num.toFixed(places||4)
            }
            return num;
		}
	}


	/**
	 * 点是否在多边形内
	 * 参考：https://github.com/substack/point-in-polygon/blob/master/index.js
	 */
	function _isPointInPolygon(vs, x, y, key_x, key_y){
		key_x || (key_x = 'x');
        key_y || (key_y = 'y');
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

        /*
         *    false 不在面内
         *    true 在面内，但不是多边形的端点
         * 	  1 在面内，又是多边形的端点
         */
        var inside = 0;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][key_x], yi = vs[i][key_y];
            var xj = vs[j][key_x], yj = vs[j][key_y];
            if(x == xi && y == yi || x == xj && y == yj){
                return 1;
            }
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

            if (intersect) inside = !inside;
        }

        return inside;
	}
	/**
	 * 多边形是否在另一个多边形内
	 */
	function _isPolygonInPolygon(polygon_items, sub_polygon_items, is_return_num, key_x, key_y){
		key_x || (key_x = 'x');
        key_y || (key_y = 'y');
        var inside_num = 0;
        sub_polygon_items.forEach(function(v){
            var flag = _isPointInPolygon(polygon_items, v[key_x], v[key_y], key_x, key_y);
            if(flag){
                inside_num++;
            }
        });
        if(is_return_num){
            return inside_num;
        }
        /*线切割面时由于计算得到的两交点可能稍有误差,所以判断是否在多边形中时去除两交点的检测*/
        // if(inside_num >= sub_polygon_items.length-2){
		if(inside_num >= sub_polygon_items.length){
            return true;
        }
        return false;
	}
	/**
	 * 线是否在另一个多边形内
	 */
	function _isLineIn(polygon_items,line_items,is_through){
        var inside_num = 0;
        var len = line_items.length;
        line_items.forEach(function(v_line_item){
            var flag = _isInsidePolygon(polygon_items,v_line_item.x,v_line_item.y);

            if(flag){
                inside_num++;
            }
        });
        if(is_through){
            return inside_num > 2;
        }
        if(inside_num/len > 0.5){
            return true;
        }
        return false;
    }
	/**
	 * 多边形相关操作
	 */
	var Polygon = {
		isPointIn: _isPointInPolygon,
		isPolygonIn: _isPolygonInPolygon,
		isLineIn: _isLineIn
	};

	/**
	 * 对象序列化，得到一个字符串
	 *
	 * (把键和值都放入数据，最后数据合并得到一个字符串)
	 */
	var _fn_serialize = function(obj){
		if(null == obj){
			return '_';
		}

		function _sort(a, b) {
			return a.localeCompare(b);
		}
		switch (obj.constructor) {
			case String:
				return obj;
			case Number:
				return ''+obj;
			case Array:
				var arr = [];
				for(var i = 0, j = obj.length; i<j; i++){
					arr.push(_fn_serialize(obj[i]));
				}
				arr.sort(_sort);
				return arr.join('_');
			case Object:
				var arr = [];
				for(var i in obj){
					arr.push(i);
					arr.push(_fn_serialize(obj[i]));
				}
				arr.sort(_sort);
				return arr.join('_');
			default:
				return ''+obj;
		}
	}

	/**
	 * 对象序列化并得到一个md5字符串
	 */
	_fn_serialize.md5 = function(obj) {
		return encrypt(_fn_serialize(obj));
	}
	var class2type = {};
	"Boolean Number String Function Array Date RegExp Object Error".split(" ").forEach(function(v) {
		class2type['[object '+v+']'] = v.toLowerCase();
	});
	var _type = function(obj) {
		if (obj == null) {
			return obj + '';
		}

		var _typeof = typeof obj;
		return _typeof === 'object' || _typeof === 'function' ? class2type[({}).toString.call(obj)] || 'object': _typeof;
	}

	function _isFunction(obj) {
		return _type(obj) === 'function';
	}
	function _isPlainObject(obj) {
		if (_type(obj) != 'object') {
			return false;
		}
		if (obj.constructor && !obj.constructor.prototype.hasOwnProperty('isPrototypeOf')) {
			return false;
		}
		return true;
	}
	var _isArray = Array.isArray;

	function _extend() {
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[0] || {},
			i = 1,
			length = arguments.length,
			deep = false;
			// Handle a deep copy situation
		if ( typeof target === "boolean" ) {
			deep = target;

			// skip the boolean and the target
			target = arguments[ i ] || {};
			i++;
		}
		// Handle case when target is a string or something (possible in deep copy)
		if ( typeof target !== "object" && _isFunction(target) ) {
			target = {};
		}

		// extend jQuery itself if only one argument is passed
		if ( i === length ) {
			target = this;
			i--;
		}

		for ( ; i < length; i++ ) {
			// Only deal with non-null/undefined values
			if ( (options = arguments[ i ]) != null ) {
				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if ( deep && copy && ( _isPlainObject(copy) || (copyIsArray = _isArray(copy)) ) ) {
						if ( copyIsArray ) {
							copyIsArray = false;
							clone = src && _isArray(src) ? src : [];

						} else {
							clone = src && _isPlainObject(src) ? src : {};
						}

						// Never move original objects, clone them
						target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
					} else if ( copy !== undefined ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	}
	var COLOR_TRANSPANT = CONST.COLOR.TRANSPANT;
	function color(blendent, use_check) {
		var len_blendent = 0;
		if (!blendent || (len_blendent = blendent.length) == 0) {
			return false;
		}
		// 对图例进行验证
		for (var i = 0; i<len_blendent; i++) {
			var v = blendent[i];
			if(!v || !v.colors){
				return false;
			}
		}
		var isHaveMany = len_blendent > 1;
		function _get(val, range, is_return_index) {
			for (var i = 0, j = range.length; i<j; i++) {
				var case_range = range[i];
				var val_range = case_range.val;
				if(val > val_range[0] && val <= val_range[1]){
					var c = !use_check || case_range.is_checked? case_range.color: COLOR_TRANSPANT;
					return is_return_index? [c, i]: c;
				}
			}
			return is_return_index? [COLOR_TRANSPANT, j]: COLOR_TRANSPANT;
		}
		return function (val, code, is_return_index) {
			if (isHaveMany) {
				for (var i = 0; i<len_blendent; i++){
					var v = blendent[i];
					if(code == v.val.v){
						return _get(val, v.colors, is_return_index);
					}
				}
			} else {
				return _get(val, blendent[0].colors, is_return_index);
			}
		}
	}

	/*对外提供API*/
	Util.verification = verification;
	Util.file = file;
	Util.path = path_util;
	Util.encrypt = encrypt;
	Util.grid = grid;
	Util.Async = Async;
	Util.Digit = Digit;
	Util.Polygon = Polygon;
	Util.serialize = _fn_serialize;

	Util.isArray = _isArray;
	Util.isPlainObject = _isPlainObject;
	Util.isFunction = _isFunction;
	Util.extend = _extend;

	Util.color = color;

	module.exports = Util;
}();
