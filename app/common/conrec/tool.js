!function() {
	//面积为正可以判断多边型正面，面积为负表示多边形背面
	function _getArea(points) {
		var S = 0;
		for (var i = 0, j = points.length - 1; i < j; i++) {
			var p_a = points[i],
				p_b = points[i + 1];
			S += p_a.x * p_b.y - p_b.x * p_a.y;
		}
		var p_a = points[j],
			p_b = points[0];
		S += p_a.x * p_b.y - p_b.x * p_a.y;
		return S / 2;
	}

	module.exports = {
		getArea: _getArea
	}
}()