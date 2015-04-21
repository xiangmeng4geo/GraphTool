Core.safe(function(){
	var close = Core.Window.close;
	Core.Window.get().showDevTools();
	$('#btn_cancel').click(close);
	var $text_listence = $('#text_listence').focus();
	$('#btn_save').click(function(){
		var listence = $text_listence.val();
		if(listence){
			listence = Core.safe.update(listence);
			if(listence){
				var time = listence.e.format('yyyy年MM月dd日');
				alert('您可以正常使用，有效期到 "'+time+'"!');
				close();
			}else{
				alert('序列号无效！');
			}
		}else{
			alert('请输入序列号!');
		}
		
	});
});