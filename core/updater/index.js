Core.safe(function(){
	var C = Core;
	var util = C.Lib.util;
	var util_file = util.file;
	var util_path = util.path;
	var path_project = util_file.path.project;
	var gui = require('nw.gui');

	var Updater = require(util_path.join(path_project, 'updater/libs/updater.js'));
	Updater.init(gui);

	Updater.restart(function(){
		var _updater = new Updater();
		_updater.check({
			version: Core.appInfo.version,
			url: 'http://10.14.85.116/nodejs_project/updater/test/info.json',
			basepath: path_project
		}, function(result){
			$('#result').html(JSON.stringify(result));
			if(!result.flag_new){
				$('#btn_install').hide();
			}else{
				var $progress_download = $('#progress_download');
				$('#btn_install').click(function(){
					_updater.download(function(data){
						var per = Math.min(data.position/data.total, 1);
						$progress_download.html(per == 1? '正在准备文件。。。': (per*100).toFixed(2)+'%');
					},function(){},/* function(_file, t, s){
						// var id = encodeURIComponent(_file).replace(/%/g, '_').replace(/\./g, '_').replace(/[()]/g, '_');
						// console.log(_file, t, s, id);
						// try{var $file = $('#'+id);}catch(e){console.log(e)}
						// if($file.length == 0){
						// 	$file = $('<div id="'+id+'">'+_file+'<span></span></div>').prependTo($progress_download);
						// }
						// $file.find('span').html((s/t*100).toFixed(2)+'%');
						// $progress_download.html(_file+$progress_download.html()+'<br/>');
					},*/ function(err, data){
						if(err){
							alert('error');
						}else{
							var filename_verification = 'conf/verification.json';
							util_file.copy(util_path.join(path_project, filename_verification), util_path.join(data.path, filename_verification));

							_updater.install();
						}
					});
				});
			}
		});
	});
});