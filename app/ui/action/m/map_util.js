Core.init(function() {
	var C = Core;
	var d3 = C.require('d3');
	function _getProjection(leftup, rightdown, width_map, height_map) {
        var center = [leftup[0] + (rightdown[0] - leftup[0])/2, leftup[1] + (rightdown[1] - leftup[1])/2];
        var p = d3.geo.mercator().center(center).translate([width_map/2, height_map/2]);
        var p_a = p(leftup),
            p_b = p(rightdown);
        var scale_old = p.scale();
        var scale = Math.min(width_map/(p_b[0] - p_a[0]) * scale_old, height_map/(p_b[1] - p_a[1]) * scale_old);
        return p.scale(scale);
    }

    module.exports = {
    	getProjection: _getProjection
    }
});