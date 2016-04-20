var util = require('../util');
var equal = util.equal;
var Util = util.load('common/util'),
    Util_file = Util.file,
    Util_path = Util.path;

describe('micaps 14', function(){
    function _getDataPath(name){
        return Util_path.join(__dirname, '../data/micaps/14', name);
    }

    var datareader = util.load('common/datareader');
    function _test(conf) {
        var file = conf.file;
        var desc = file + (' '+conf.desc || '');
        it(desc, function(done) {
            datareader.read({
                type: 'micaps',
                file: _getDataPath(file)
            }, function(err, data) {
                var areas = data.areas;
                if ('n_area' in conf) {
                    areas.should.have.length(conf['n_area']);
                }
                var _cache = {};
                areas.forEach(function(v) {
                    var code = v.code;
                    if (_cache[code]) {
                        _cache[code]++;
                    } else {
                        _cache[code] = 1;
                    }
                });
                if ('n_26' in conf) {
                    _cache['26'].should.equal(conf['n_26']);
                }
                if ('n_24' in conf) {
                    _cache['24'].should.equal(conf['n_24']);
                }
                if ('n_23' in conf) {
                    _cache['23'].should.equal(conf['n_23']);
                }
                done();
            });
        })
    }
    _test({
        desc: '',
        file: 'rr011208.024',
        n_area: 12,
        n_26: 3,
        n_23: 5,
        n_24: 4
    });
    _test({
        desc: '分割出一的一个很小的面为雪',
        file: 'rr031008.024',
        n_area: 16,
        n_26: 8,
        n_23: 6,
        n_24: 2
    });
    _test({
        desc: '分割线得到不同等级雨夹雪面',
        file: 'rr021908.072',
        n_area: 24,
        n_26: 14,
        n_23: 4,
        n_24: 6
    });
    _test({
        desc: '',
        file: 'rr021908.048',
        n_area: 15,
        n_26: 6,
        n_23: 8,
        n_24: 1
    });
    _test({
        desc: '',
        file: 'rr012608.024',
        n_area: 10,
        n_23: 7,
        n_24: 2,
        n_26: 1,
    });
    _test({
        desc: '两条分割线分割不同等级的多个面',
        file: 'rr012608.048',
        n_area: 21,
        n_23: 11,
        n_24: 5,
        n_26: 5,
    });
    _test({
        desc: '',
        file: 'rr012608.072',
        n_area: 21,
        n_23: 7,
        n_24: 5,
        n_26: 9,
    });
    _test({
        desc: '左上角的雪区里有雨夹雪区',
        file: 'rr033114.024',
        n_area: 24,
        n_23: 7,
        n_24: 4,
        n_26: 13,
    });
    _test({
        desc: '分割线两侧的面都没有编码值',
        file: 'rr041508.024',
        n_area: 9,
        n_23: 1,
        n_24: 1,
        n_26: 7,
    });
    _test({
        desc: '三条分割线得到的一个左下角的一雪区没有编码',
        file: 'rr041608.024',
        n_area: 18,
        n_23: 4,
        n_24: 4,
        n_26: 10,
    });
    _test({
        desc: '全部是雨区',
        file: 'rr052208.024',
        n_area: 22,
        n_26: 22,
    });
    _test({
        desc: '',
        file: 'rr111308.024',
        n_area: 16,
        n_23: 9,
        n_24: 1,
        n_26: 6,
    });
    _test({
        desc: '',
        file: 'rr111314.024',
        n_area: 19,
        n_23: 9,
        n_24: 2,
        n_26: 8,
    });
    _test({
        desc: '',
        file: 'rr112108.048',
        n_area: 16,
        n_23: 6,
        n_24: 1,
        n_26: 9,
    });
    _test({
        desc: '全部是雨区',
        file: 'tv042814.024',
        n_area: 19,
        n_26: 19,
    });
    _test({
        desc: '没有雨雪分界线，但有多个标识',
        file: 'rr042008.024',
        n_area: 14,
        n_26: 14,
    });
})