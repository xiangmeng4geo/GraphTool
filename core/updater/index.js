Core.safe(function(){
	var C = Core;
	var util = C.Lib.util;
	var util_file = util.file;
	var util_path = util.path;
	var path_project = util_file.path.project;
	var gui = require('nw.gui');

	var Updater = require(util_path.join(path_project, 'updater/libs/updater.js'));
	Updater.init(gui);

	var $result = $('#result').html('正在检测更新');
	Updater.restart(function(){
		$result.html('正在处理更新...');
	}, function(){
		var _updater = new Updater();
		_updater.check({
			version: Core.appInfo.version,
			url: 'http://10.14.85.116/nodejs_project/updater/test/info.json',
			basepath: path_project
		}, function(err, result){
			if(err){
				return $result.html('请求出现错误，请确保您的网络畅通！');
			}
			console.log(result);
			$result.html(result.flag_new? '当前版本:'+result.v_old+',最新版本:'+result.v_new+', 是否进行安装?':'当前版本已经是最新版本');
			if(!result.flag_new){
				$('#btn_install').hide();
			}else{
				var $progress_download = $('#progress_download >span');
				var $result_file_list = $('#result_file_list');
				$('#btn_install').click(function(){
					$result.html('正在下载更新文件。。。');
					_updater.download(function(data){
						var per = Math.min(data.position/data.total, 1);
						$progress_download.width((per === 1?0:per)*100+'%');
						if(per == 1){
							$result.html('正在安装更新,可能需要几分钟，请耐心等待...');
						}
						// $progress_download.html(per == 1? '正在准备文件。。。': (per*100).toFixed(2)+'%');
					}, function(_file, t, s){
						$result_file_list.html(_file+'<br/>'+$result_file_list.html());
					}, function(dir){
						console.log('finish', arguments);
						var filename_verification = 'conf/verification.json';
						util_file.copy(util_path.join(path_project, filename_verification), util_path.join(dir, filename_verification));
						_updater.install();
					});
				});
			}
		});
	});
});