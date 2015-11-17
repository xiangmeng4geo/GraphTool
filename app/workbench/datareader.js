!function(){
    var Reader = {};
    Reader.read = function(opt, cb){
        var type = opt.type;
        var _reader;
        try{
            _reader = require('./datareader/'+type);
        } catch(e) {
            cb(new Error('no support method of reader!'));
        }
        if (_reader) {
            _reader(opt, cb)
        }
    }
    Reader.save = function(opt){
    }
    module.exports = Reader;
}()
