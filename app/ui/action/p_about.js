Core.init(function(){
	var $ = Core.$;
	var app = require('remote').app;
	$('#version').text(app.getName() + ' ('+app.getVersion()+')');
	$('.btn_close').click(function() {
		window.close();
	});
	// try{
	// 	$('#listence').text('有效期至');
	// }catch(e){}
});
