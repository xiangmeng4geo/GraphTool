Core.init(function() {
	var C = Core;
	var $ = C.$;
	var _require = C.require;
	var verification = _require('util').verification;
	var _alert = _require('dialog').alert;
	var $btn_close = $('.btn_close,#btn_cancel').click(function() {
		C.Win.close();
	});

	var $text_listence = $('#text_listence');
	$('#btn_save').click(function() {
		var val = $text_listence.val().trim();
		if (val) {
			var listence = verification.parseL(val);
			if (listence) {
				var time = listence.e;
				if (time && time.format) {
					verification.set(val);
					_alert('您可以正常使用，有效期到 "'+time.format('yyyy年MM月dd日')+'"!');
					$btn_close.click();
					return;
				}
			}
			_alert('序列号无效！');
		} else {
			$text_listence.val('');
			_alert('序列号不能为空！');
		}
	});
});