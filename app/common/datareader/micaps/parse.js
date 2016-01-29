!function() {
	var fs = require('fs');
	var path = require('path');
	var util = require('../../util');
	var util_file = util.file;

	function _getNewest(dir, rule){
		var time_start,time_end;
		var args = arguments;
		var file;
		if(args.length == 3){
			var days = args[2];
			time_end = new Date();
			time_start = new Date();
			time_start.setDate(time_start.getDate() - days);
		}else{
			time_start = new Date(args[2]),
			time_end = new Date(args[3]);
		}

		for(; time_start <= time_end; ){
			var file_name = time_end.format(rule);
			var file_path = path.join(dir, file_name);
			if(util_file.exists(file_path)){
				var mtime = fs.statSync(file_path).mtime;
				if(mtime >= time_start){
					return file_path;
				}
			}
			time_end.setDate(time_end.getDate() - 1);
		}
	}
	function _parse(conf, model) {
		var data = conf.data;
		var file_path;
		var showData = false;
		var err;
		if (data) {
			var data_conf = data.val;
			var dir_in = data_conf.dir_in;
			var param = [dir_in];

			var file_rule = data_conf.file_rule;
			var is_common = file_rule.is_common;
			var val_file_rule = file_rule.val;
			if (is_common) {
				param.push(val_file_rule.prefix + val_file_rule.date_format + val_file_rule.postfix + '.' + val_file_rule.file_suffix);
			} else {
				param.push(val_file_rule);
			}
			var file = data_conf.file;
			var is_newest = file.is_newest;
			var val_is_newest = file.val;
			if (is_newest) {
				param.push(val_is_newest.newest_days);
			} else {
				param.push(val_is_newest.start);
				param.push(val_is_newest.end);
			}

			file_path = _getNewest.apply(null, param);

			showData = data_conf.data && data_conf.data.flag;
			if (file_path) {
				model.emit('log.user', 'read micaps: ['+file_path+']');
			}
		}
		model.emit('map.changeconfig', util.extend(true, {
			map: conf.other.map,
			legend: conf.other.legend,
			legendStyle: conf.other.legend_style,
			showLegendRange: !!conf.other.is_legend_range,
			size: conf.other.size,
			showData: showData,
			data: {
				type: 'micaps',
				file: file_path
			}
		}, conf));
	}
	module.exports = _parse;
}();