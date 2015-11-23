!function(){
    exports.parse = function(lines, options, cb){
    	options || (options = {});
    	options.num_of_cols = 12;
    	// options.val_col = 7;

    	options.arithmetic = null;
    	return require('./discrete').parse(lines, options, cb);
    }
}()
