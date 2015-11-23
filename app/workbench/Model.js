!function() {
    var ipc = require('electron').ipcMain;
    
    // 触发UI线程里model绑定的事件
	function model_emit(name, data) {
		// 测试框架中没有ipc模块
		ipc && ipc.emit('ui', {
			name: 'ui',
			type: name,
			msg: data
		});
	}
	function model_emit_log(msg) {
		model_emit('log', msg);
	}
	var Model = {
		emit: model_emit,
		log: model_emit_log
	}

    module.exports = Model;
}()
