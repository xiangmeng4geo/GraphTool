!function() {
	var CONST = require('./const');
	var util = require('./util'),
		util_file = util.file,
		util_file_rm = util_file.rm,
		util_file_readdir = util_file.readdir;

	var CONST_LOG = CONST.LOG,
		CONST_LOG_PATH = CONST_LOG.PATH,
		CONST_LOG_DAYS = CONST_LOG.DAYS;
	var CONST_CACHE = CONST.CACHE,
		CONST_CACHE_PATH = CONST.PATH.CACHE,
		CONST_CACHE_NUM = CONST_CACHE.NUM;

	var CONST_TIME_LOG = CONST_LOG_DAYS * 24 * 60 * 60 * 1000;	
	var DELAY = 1000*60*30;//30分钟
	function _dealLog() {
		var now = new Date().getTime();
		var files = util_file_readdir(CONST_LOG_PATH, {
			mtime: true
		});
		files.forEach(function(file) {
			if (now - file.mtime > CONST_TIME_LOG) {
				util_file_rm(file.name);
			}
		});

		setTimeout(_dealLog, DELAY);
	}

	function _dealCache() {
		var now = new Date().getTime();
		var files = util_file_readdir(CONST_CACHE_PATH, {
			mtime: true
		});
		files.sort(function(a, b) {
			return b.mtime - a.mtime;
		});

		files.splice(0, CONST_CACHE_NUM);
		files.forEach(function(file) {
			util_file_rm(file.name);
		});

		setTimeout(_dealCache, DELAY);
	}

	_dealLog();
	_dealCache();
}()