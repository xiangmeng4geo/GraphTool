/*增加保留micaps配置时自定义规则和普通规则数据后对旧配置文件进行处理*/
var path = require('path');
var fs = require('fs');

var path_user = path.join(require('os').homedir(), 'BPA', 'GT');
var path_config = path.join(path_user, 'config');

fs.readdir(path_config, function(err, files) {
	files.forEach(function(file) {
		var config_path = path.join(path_config, file);
		if (!fs.statSync(config_path).isDirectory()) {
			try {
				var data = require(config_path);
			} catch(e){}

			if (data) {
				var file_rule = data.data.val.file_rule;
				if (file_rule) {
					var val = file_rule.val;
					if (val && (!file_rule.val_common || !file_rule.val_custom)) {
						if (file_rule.is_common) {
							file_rule.val_common = val;
						} else {
							file_rule.val_custom = val;
						}
						delete file_rule.val;
						fs.writeFileSync(config_path, JSON.stringify(data));
						console.log(file);
					}
				}
			}
		}
	});
});
