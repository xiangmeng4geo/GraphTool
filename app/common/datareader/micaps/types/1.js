!function(){
    exports.parse = function(lines, options, cb){
    	options || (options = {});
    	options.num_of_cols = 24;
    	// options.val_col = 7;
    	// options.default_val = 9999;// 数据验证时统一使用正则表达式验证/9{4,}/
    	return require('./discrete').parse(lines, options, cb);
    }
}()
