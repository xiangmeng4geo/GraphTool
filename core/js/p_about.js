Core.safe(function(){
	Core.Window.get().showDevTools();

	var info = Core.appInfo;
	$('#version').text(info.name + ' ('+info.version+')');
});