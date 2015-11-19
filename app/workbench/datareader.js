!function(){
    var util = require('./util');
    var _model;
    var Reader = {};
    Reader.read = function(opt, cb){
        var s_start = new Date();
        var type = opt.type;
        var _reader;
        try{
            _reader = require('./datareader/'+type);
        } catch(e) {
            cb(new Error('no support method of reader!'));
        }
        if (_reader) {
            _reader(opt, function() {
                var msg = 'Reader.read takes '+(new Date()-s_start)+' ms!';
                util.Model.log(msg);
                cb && cb.apply(null, arguments);
            })
        }
    }
    Reader.save = function(opt){
    }
    module.exports = Reader;
}()
