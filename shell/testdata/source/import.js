!function() {
	var util = require('./util');
	util.init({
		name: 'import'
	}, function() {
		console.log('render');
	});
}()