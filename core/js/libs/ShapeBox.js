define('ShapeBox',
    function (require) {
        var Base = require('zrender/shape/Base');
        var area = require('zrender/tool/area');
        // var eventTool = require('zrender/tool/event');
        var PI = Math.PI;
        var R = 4;
        var $doc = $(document);
        var event_index = 0;
        /**
         * @alias module:zrender/shape/Rectangle
         * @constructor
         * @extends module:zrender/shape/Base
         * @param {Object} options
         */
        var MyShape = function (options) {
            var onmovehandle = options.onmovehandle;
            try{
                var arrows = options.style.arrows;
                if(arrows){
                    arrows = [arrows];
                    this.arrows = arrows;
                    var handle = [];
                    for(var i = 0, j = arrows.length; i<j; i++){
                        var arrow = arrows[i];
                        var last_offset = {
                            left: arrow.x,
                            top: arrow.y
                        };
                        var $handle = $('<div class="drag_handle"></div>').appendTo(options.handle_container).css(last_offset);

                        $handle.on('mousedown touchstart', function(){
                            $handle.hide();
                            var e_index = event_index++;
                            var e_move = 'mousemove.'+e_index+' touchmove.'+e_index,
                                e_end = 'mouseup.'+e_index+' touchend.'+e_index;
                            $doc.on(e_move, function(e){
                                var toX = e.offsetX,
                                    toY = e.offsetY;
                                last_offset = {x: toX, y: toY};
                                onmovehandle && onmovehandle.call(this, last_offset);
                                
                            }).on(e_end, function(){
                                $doc.off(e_move);
                                $doc.off(e_end);
                                $handle.css({
                                    left: last_offset.x, 
                                    top: last_offset.y
                                }).show();
                            });
                        });
                        handle.push($handle);
                    }
                    this.handle = handle;
                }
                
            }catch(e){}
            options.hoverable = false;
            options.highlightStyle = options.style;
            Base.call(this, options);
            
            /**
             * 矩形绘制样式
             * @name module:zrender/shape/Rectangle#style
             * @type {module:zrender/shape/Rectangle~IRectangleStyle}
             */
            /**
             * 矩形高亮绘制样式
             * @name module:zrender/shape/Rectangle#highlightStyle
             * @type {module:zrender/shape/Rectangle~IRectangleStyle}
             */
        };
        MyShape.prototype =  {
            type: 'MyShape',

            _buildRadiusPath: function (ctx, style) {
                // 左上、右上、右下、左下角的半径依次为r1、r2、r3、r4
                // r缩写为1         相当于 [1, 1, 1, 1]
                // r缩写为[1]       相当于 [1, 1, 1, 1]
                // r缩写为[1, 2]    相当于 [1, 2, 1, 2]
                // r缩写为[1, 2, 3] 相当于 [1, 2, 3, 2]
                var x = style.x;
                var y = style.y;
                var width = style.width;
                var height = style.height;
                var r = style.radius;
                var r1; 
                var r2; 
                var r3; 
                var r4;
                  
                if (typeof r === 'number') {
                    r1 = r2 = r3 = r4 = r;
                }
                else if (r instanceof Array) {
                    if (r.length === 1) {
                        r1 = r2 = r3 = r4 = r[0];
                    }
                    else if (r.length === 2) {
                        r1 = r3 = r[0];
                        r2 = r4 = r[1];
                    }
                    else if (r.length === 3) {
                        r1 = r[0];
                        r2 = r4 = r[1];
                        r3 = r[2];
                    }
                    else {
                        r1 = r[0];
                        r2 = r[1];
                        r3 = r[2];
                        r4 = r[3];
                    }
                }
                else {
                    r1 = r2 = r3 = r4 = 0;
                }
                
                var total;
                if (r1 + r2 > width) {
                    total = r1 + r2;
                    r1 *= width / total;
                    r2 *= width / total;
                }
                if (r3 + r4 > width) {
                    total = r3 + r4;
                    r3 *= width / total;
                    r4 *= width / total;
                }
                if (r2 + r3 > height) {
                    total = r2 + r3;
                    r2 *= height / total;
                    r3 *= height / total;
                }
                if (r1 + r4 > height) {
                    total = r1 + r4;
                    r1 *= height / total;
                    r4 *= height / total;
                }

                var points = [
                    [x + r1, y, 0],
                    [x + width - r2, y, r2, [x + width, y, x + width, y + r2]],
                    [x + width, y + height - r3, r3, [x + width, y + height, x + width - r3, y + height]],
                    [x + r4, y + height, r4, [x, y + height, x, y + height - r4]],
                    [x, y + r1, r1, [x, y, x + r1, y]]
                ];
                var arrows = this.arrows;
                if(arrows && arrows.length > 0){
                    var new_points = [
                        [x + r1, y],
                        [x + width - r2, y],
                        [x + width, y + r2],
                        [x + width, y + height - r3],
                        [x + width - r3, y + height],
                        [x + r4, y + height],
                        [x, y + height - r4],
                        [x, y + r1]
                    ];
                    var p_conf = [
                        [0, 1, 1],
                        [2, 3, 2],
                        [4, 5, 3],
                        [6, 7, 4]
                    ];
                    var conf = {
                        0: p_conf[1],
                        1: p_conf[0],
                        2: p_conf[0],
                        3: p_conf[3],
                        4: p_conf[3],
                        5: p_conf[2],
                        6: p_conf[2],
                        7: p_conf[1]
                    }
                    var origin = [style.x + style.width/2, style.y + style.height/2];
                    var angle_origin = Math.atan((origin[1] - points[1][1])/(points[1][0] - origin[0]));
                    var handle = this.handle;
                    for(var i = 0, j = arrows.length; i<j; i++){
                        var p_arrow = arrows[i];
                        var y_cha = p_arrow.y - origin[1],
                            x_cha = p_arrow.x - origin[0];
                        if(x_cha == 0){
                            var angle = (y_cha > 0?-1: 1)*PI/2 + PI*2;
                        }else{
                            var angle = -Math.atan(y_cha/x_cha);
                            angle = Math.abs(angle);
                            if(y_cha < 0){
                                if(x_cha < 0){
                                    angle = PI - angle;
                                }
                            }else{
                                if(x_cha > 0){
                                    angle = PI*2 - angle;
                                }else{
                                    angle = PI + angle;
                                }
                            }
                        }
                        var xiangxian = 0;
                        if(angle >= 0 && angle < angle_origin){
                            xiangxian = 0;
                        }else if(angle >= angle_origin && angle < PI/2){
                            xiangxian = 1;
                        }else if(angle >= PI/2 && angle < PI - angle_origin){
                            xiangxian = 2;
                        }else if(angle >= PI - angle_origin && angle < PI){
                            xiangxian = 3;
                        }else if(angle >= PI && angle < PI + angle_origin){
                            xiangxian = 4;
                        }else if(angle >= PI + angle_origin && angle < PI/2*3){
                            xiangxian = 5;
                        }else if(angle >= PI/2*3 && angle < PI*2 - angle_origin){
                            xiangxian = 6;
                        }else {
                            xiangxian = 7;
                        }
                        var c = conf[xiangxian];
                        var first_p_idnex = c[0],
                            next_p_index = c[1],
                            pos = c[2];

                        var first_p = new_points[first_p_idnex],
                            next_p = new_points[next_p_index];

                        var dis_x = next_p[0] - first_p[0],
                            dis_y = next_p[1] - first_p[1];
                        var per_start = 1/8,
                            per_end = 3/8;
                        if(xiangxian%2 == 1){
                            per_start += 0.5;
                            per_end += 0.5;
                        }
                        var p_add = [[first_p[0] + dis_x * per_start, first_p[1] + dis_y*per_start, 0]];
                        p_add.push([p_arrow.x, p_arrow.y, 0]);
                        p_add.push([first_p[0] + dis_x * per_end, first_p[1] + dis_y*per_end, 0]);
                        p_add.unshift(0);
                        p_add.unshift(pos);
                        [].splice.apply(points, p_add);
                        handle[i].css({
                            left: p_arrow.x, 
                            top: p_arrow.y
                        });
                    }
                }
                ctx.moveTo(points[0][0], points[0][1]);
                for(var i = 1, j = points.length; i<j; i++){
                    var p = points[i];
                    ctx.lineTo(p[0], p[1]);
                    p[2] !== 0 && ctx.quadraticCurveTo.apply(ctx, p[3]);
                }
            },
            
            /**
             * 创建矩形路径
             * @param {CanvasRenderingContext2D} ctx
             * @param {Object} style
             */
            buildPath : function (ctx, style) {
                this._buildRadiusPath(ctx, style);
                ctx.closePath();
                return;
            },
            /**
             * 计算返回矩形包围盒矩阵
             * @param {module:zrender/shape/Rectangle~IRectangleStyle} style
             * @return {module:zrender/shape/Base~IBoundingRect}
             */
            getRect : function(style) {
                style || (style = this.style);
                if (style.__rect) {
                    return style.__rect;
                }
                
                var lineWidth;
                if (style.brushType == 'stroke' || style.brushType == 'fill') {
                    lineWidth = style.lineWidth || 1;
                }
                else {
                    lineWidth = 0;
                }
                style.__rect = {
                    x : Math.round(style.x - lineWidth / 2),
                    y : Math.round(style.y - lineWidth / 2),
                    width : style.width + lineWidth,
                    height : style.height + lineWidth,
                    lineWidth: lineWidth
                };
                
                return style.__rect;
            },
            getRectAll: function(){
                var rect = this.getRect();
                var line_width = rect.lineWidth,
                    x_rect = rect.x,
                    y_rect = rect.y,
                    width_rect = rect.width,
                    height_rect = rect.height,
                    x_rect_right = x_rect + width_rect,
                    y_rect_right = y_rect + height_rect;
                var arrows = this.arrows;
                if(arrows){
                    for(var i = 0, j = arrows.length; i<j; i++){
                        var arrow = arrows[i];
                        var x = arrow.x,
                            y = arrow.y;
                        if(x < x_rect || x > x_rect_right || y < y_rect || y > y_rect_right){
                            x_rect = Math.min(x, x_rect),
                            x_rect_right = Math.max(x, x_rect_right),
                            y_rect = Math.min(y, y_rect),
                            y_rect_right = Math.max(y, y_rect_right);
                        }
                    }

                }
                return {
                    x: x_rect - line_width/2,
                    y: y_rect - line_width/2,
                    width: x_rect_right - x_rect + line_width,
                    height: y_rect_right - y_rect + line_width
                }
            }
        };

        require('zrender/tool/util').inherits(MyShape, Base);
        return MyShape;
    }
);
