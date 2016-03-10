Core.init(function(){
	var C = Core;
	var $ = C.$;
	var app = require('remote').app;
	$('#version').text(app.getName() + ' ('+app.getVersion()+')');
	$('.btn_close').click(function() {
		C.Win.close();
	});
	try{
		$('#listence').text('有效期至'+C.require('util').verification.get(true).listence.e.format('yyyy年MM月dd日'));
	}catch(e){}
});
