Core.safe(function(){
	// Core.Window.get().showDevTools();

	var info = Core.appInfo;
	$('#version').text(info.name + ' ('+info.version+')');
	try{
		$('#listence').text('有效期至'+Core.safe.listence.e.format('yyyy年MM月dd日'));
	}catch(e){}
});