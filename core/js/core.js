!function(global){
	var Core = {};

	var DIRNAME_RE = /[^?#]*\//
	function dirname(path) {
	  return path.match(DIRNAME_RE)[0]
	}
	
	var DOT_RE = /\/\.\//g;
	var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
	function realpath(path) {
	  // /a/b/./c/./d ==> /a/b/c/d
	  path = path.replace(DOT_RE, "/")

	  // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
	  while (path.match(DOUBLE_DOT_RE)) {
	    path = path.replace(DOUBLE_DOT_RE, "/")
	  }

	  return path
	}

	var ABSOLUTE_RE = /^\/\/.|:\//;
	var ROOT_DIR_RE = /^.*?\/\/.*?\//;
	// 得到相对路径
	function resolve(id,refUri){
		var ret
		var first = id.charAt(0)

		// Absolute
		if (ABSOLUTE_RE.test(id)) {
			ret = id
		}
		// Relative
		else if (first === ".") {
			ret = realpath((refUri ? dirname(refUri) : data.cwd) + id)
		}
		// Root
		else if (first === "/") {
			var m = data.cwd.match(ROOT_DIR_RE)
			ret = m ? m[0] + id.substring(1) : id
		}
		// Top-level
		else {
			ret = data.base + id
		}

		return ret
	}
	Core.Path = {
		dirname: dirname,
		realpath: realpath,
		resolve: resolve
	}
	var $header = $('head');
	// 可以解决模块依赖css问题
	Core.Style = {
		addLink: function(link_src){
			$('<link rel="stylesheet" type="text/css" href="'+link_src+'">').appendTo($header);
		}
	}
	global.Core = Core;
}(this);