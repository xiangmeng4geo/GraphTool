!function() {
    var Shape = Core.require('shape');
    var _model;
    function _render(data) {
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

    module.exports = {
        setModel: _setModel,
        render: _render
    };
}()
