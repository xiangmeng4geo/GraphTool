!function() {
    var Shape = Core.require('shape');
    var _model;
    // 处理conrec后的数据
    function _conrec(data) {
        var t_start = new Date();
        var shapes = [];
        if (data) {
            var relation = data.r,
                data_list = data.list;
            // 处理插值完后的数据
            if (relation && relation.length > 0 && data_list && data_list.length > 0) {
                relation.forEach(function(v, i) {
                    var index = v[0],
                        color = v[1],
                        indexs_clip = v[2];

                    shapes.push(new Shape.Polygon(data_list[index], {
                        fillStyle: color
                    }));
                });
            }
        }
        _model.emit('log', 'render deal data takes '+(new Date() - t_start)+' ms!');
        if (shapes && shapes.length > 0) {
            _model.emit('render', shapes);
        }
    }
    function _setModel(model) {
        _model = model;
    }
    // 处理文字
    // [{
    //  txt: 'test',
    //  x: 10,
    //  y: 10
    // }]
    function _text(texts) {
        if (texts) {
            var shapes = [];
            for (var i = 0, j = texts.length; i<j; i++) {
                var item = texts[i];
                shapes.push(new Shape.Text(item.txt, item));
            }
            if (shapes && shapes.length > 0) {
                _model.emit('render', shapes);
            }
        }
    }
    module.exports = {
        setModel: _setModel,
        conrec: _conrec,
        text: _text
    };
}()
