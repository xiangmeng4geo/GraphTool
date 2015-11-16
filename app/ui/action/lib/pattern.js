!function() {
    var $ = Core.$;
    // 条纹
    function Streak(options) {
        options = $.extend({
			fillColor: 'rgba(0, 0, 0, 0)',
			lineCap: 'butt',
			strokeStyle: "green",
			repeat: 'repeat',
			space: 2,
		}, options);

		var size = options.space * 3;
		if(size % 2 > 0){
			size += 1;
		}
		var m_size = size/2;
        var canvas_pattern = $('<canvas width="'+size+'" height="'+size+'">').get(0);
		var ctx_pattern = canvas_pattern.getContext('2d');
		ctx_pattern.fillStyle = options.fillColor;
		ctx_pattern.fillRect(0, 0, size, size);
		ctx_pattern.beginPath(); // 开始路径绘制
		ctx_pattern.moveTo(0, m_size); // 设置路径起点，坐标为(20,20)
		ctx_pattern.lineTo(m_size, 0); // 绘制一条到(200,20)的直线
		ctx_pattern.moveTo(m_size, size); // 设置路径起点，坐标为(20,20)
		ctx_pattern.lineTo(size, m_size); // 绘制一条到(200,20)的直线
		ctx_pattern.lineWidth = 1; // 设置线宽
		ctx_pattern.lineCap = options.lineCap;
		ctx_pattern.strokeStyle = options.strokeStyle; // 设置线的颜色
		ctx_pattern.stroke(); // 进行线的着色，这时整条线才变得可见
		ctx_pattern.closePath();

		var pat = ctx_pattern.createPattern(canvas_pattern,options.repeat);
		return pat;
    }
    exports.Streak = Streak;
}()
