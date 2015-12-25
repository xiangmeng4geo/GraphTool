Core.init(function(){
	var C = Core;
	var $ = C.$;
	var app = require('remote').app;
	$('#version').text(app.getName() + ' ('+app.getVersion()+')');
	$('.btn_close').click(function() {
		C.Win.close();
	});
	// try{
	// 	$('#listence').text('有效期至');
	// }catch(e){}
});
