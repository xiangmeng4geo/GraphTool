!function(){
	'use strict'

	var fs = require('fs'),
		path = require('path'),
		crypto = require('crypto');

	require('./prop');
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
		mkdirSync(path.dirname(_p));
		fs.writeFileSync(_p, content);
	}
	function exists(_p){
		return fs.existsSync(_p);
	}
	function rename(oldPath, newPath) {
		if (exists(oldPath)) {
			try {
				return fs.renameSync(oldPath, newPath);
			}catch(e) {
				return false;
			}
		}
		return false;
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
	// 遍历目录
	function readdir(dir, attr) {
		attr || (attr = {});
		var is_not_recursive = attr.is_not_recursive;
		if(fs.existsSync(dir)) {
			var stat = fs.statSync(dir);
			if(stat.isDirectory()) {
				var return_val = [];
				var files = fs.readdirSync(dir);
				var is_mtime = attr.mtime;
				files.sort().forEach(function(file) {
					var fullName = path.join(dir, file);
					var stat_file = fs.statSync(fullName);
					var isDir = stat_file.isDirectory();
					var obj = {name: fullName};
					if(is_mtime){
						obj.mtime = stat_file.mtime;
					}
					if (isDir) {
						obj.sub = is_not_recursive? []: readdir(fullName);
					}
					return_val.push(obj);
				});
				return return_val;
			}
		}
	}
	var file = {
		read: read,
		readJson: readJson,
		write: write,
		exists: exists,
		rename: rename,
		rm: rmfileSync,
		mkdir: mkdirSync,
		Image: {
			save: saveBase64
		},
		readdir: readdir
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
		// GRID_SPACE = 10;
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
            // if(x == xi && y == yi || x == xj && y == yj){
            //     return 1;
            // }
            // 在线段上或顶点上
            if (x == xi && x == xj && (y - yi) * (y - yj) <= 0 || (y == yj && y==yi && (x-xi)*(x-xj) <= 0)) {
            	return true;
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
            var flag = _isPointInPolygon(polygon_items,v_line_item.x,v_line_item.y);

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
						target[ name ] = _extend( deep, clone, copy );

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
				
				// 防止出现最小值为边界值问题
				if(val >= val_range[0] && val <= val_range[1]){
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
			}
			return _get(val, blendent[0].colors, is_return_index);
		}
	}

	/**
	替换字符串中的变量
	var data = {
		t: new Date(),
		t1: new Date('2014/12/15 12:00'),
		t2: new Date('2015/10/11 03:00'),
		w: 100,
		h: 200
	}
	{{T}} {{T0}} {{}} data.t 当前时间
	{{T1}} data.t1	时间一
	{{T2}} data.t2	时间二
	{{T3}} data.t2	时间三(发布时间)
	{{W}} data.w 	宽度
	{{H}} data.h	高度
	{{P}} data.p 	产品名
	_variate(data)('{{}}');
	*/
	var _variate = function(data) {
		var reg = /{{(T3|T2|T1|T0|T|P|W|H)?([^{}]*)}}/gi;
		data = data || {};
		var data_new = {};
		if (data) {
			for (var i in data) {
				var key = i.toLowerCase();
				data_new[key] = data[i];
			}
		}
		return function(str) {
			return str.replace(reg, function(m0, m1, m2, m3) {
				// console.log(m0, m1, m2);
				if (m1) {
					m1 = m1.toLowerCase();
				}
				var val = data_new[m1];
				if (val == undefined) {
					 val = data_new['t'] || new Date();
				}
				if (val) {
					if (val instanceof Date) {
						return (val).format(m2)
					} else {
						return val+m2;
					}
				} else {
					return m0;
				}
			});
		}
	};
	/*对外提供API*/
	Util.verification = verification;
	Util.file = file;
	Util.path = path_util;
	Util.encrypt = encrypt;
	Util.grid = grid;
	Util.Digit = Digit;
	Util.Polygon = Polygon;
	Util.serialize = _fn_serialize;

	Util.isArray = _isArray;
	Util.isPlainObject = _isPlainObject;
	Util.isFunction = _isFunction;
	Util.extend = _extend;

	Util.color = color;
	Util.variate = _variate;

	module.exports = Util;
}();
