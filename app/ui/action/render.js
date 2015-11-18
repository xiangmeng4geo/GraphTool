!function() {
    var Shape = Core.loadLib('shape');
    var _model;
    function _render(data) {
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
                    var items = data_list[index];
                    var points = [];
                    items.forEach(function(item) {
                        points.push([item.x, item.y]);
                    });
                    shapes.push(new Shape.Polygon(points, {
                        fillStyle: color
                    }));
                });
            }
        }
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
