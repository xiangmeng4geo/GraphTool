var _isInsidePolygon = (function(){
    // https://github.com/substack/point-in-polygon/blob/master/index.js
    return function (vs, x, y) {
        // ray-casting algorithm based on
        // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
        
        /* 
            false 不在面内
            true 在面内，但不是多边形的端点
            1 在面内，又是多边形的端点
        */
        var inside = 0;
        var len = vs.length;
        for (var i = 0, j = len - 1; i < len; j = i++) {
            var xi = vs[i][0], yi = vs[i][1];
            var xj = vs[j][0], yj = vs[j][1];
            if(x == xi && y == yi || x == xj && y == yj){
                return 1;
            }
            var intersect = ((yi > y) != (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        
        return inside;
    };
})();
//面积为正可以判断多边型正面，面积为负表示多边形背面
function _getArea(points){
    var S = 0;
    for(var i = 0, j = points.length - 1; i<j; i++){
        var p_a = points[i],
            p_b = points[i + 1];
        S += p_a[0] * p_b[1] - p_b[0]*p_a[1];
    }
    var p_a = points[j],
        p_b = points[0];
    S += p_a[0] * p_b[1] - p_b[0]*p_a[1];
    return S/2;
}
function _number_fixed(num,len){
    len || (len = 2);
    return Number(num.toFixed(len));
}

var projection = (function(){
    var radians = Math.PI / 180,
        degrees = 180 / Math.PI,
        px = 3800000;//转成px
        // px = 1;
    var Mercator = (function(){
        var MERCATOR_RATIO = 20037508.34/180;
        /*Web墨卡托坐标与WGS84坐标互转*/
        var Mercator_cache_lnglat = {};// 进行缓存，减小重复计算量
        return {
            name: 'mercator',
            project: function(lnglat){
                var lng = parseFloat(lnglat.x);
                var lat = parseFloat(lnglat.y);
                var cache_name = lng+'_'+lat;
                var cache_val = Mercator_cache_lnglat[cache_name];
                // if(cache_val){
                //  return cache_val;
                // }
                var x = lng * MERCATOR_RATIO;
                var y = Math.log(Math.tan((90+lat)*Math.PI/360))/(Math.PI/180);
                y = y * MERCATOR_RATIO;
                var val = {x: x/px,y: y/px};
                // Mercator_cache_lnglat[cache_name] = val;

                return val;
            },
            invert: function(mercator){
                var x = mercator.x/MERCATOR_RATIO;
                var y = mercator.y/MERCATOR_RATIO;
                y = 180/Math.PI*(2*Math.atan(Math.exp(y*Math.PI/180))-Math.PI/2);
                return {x: x*px,y: y*px};
            }
        }
    })();
    var Albers = (function(){
        var pv = {};
        pv.radians = function(degrees) { return radians * degrees; };
        pv.degrees = function(radians) { return degrees * radians; };
        function albers(lat0, lng0, phi1, phi2) {
            if (lat0 == undefined) lat0 = 23.0;  // Latitude_Of_Origin
            if (lng0 == undefined) lng0 = -96.0; // Central_Meridian
            if (phi1 == undefined) phi1 = 29.5;  // Standard_Parallel_1
            if (phi2 == undefined) phi2 = 45.5;  // Standard_Parallel_2
         
            lat0 = pv.radians(lat0);
            lng0 = pv.radians(lng0);
            phi1 = pv.radians(phi1);
            phi2 = pv.radians(phi2);
         
            var n = 0.5 * (Math.sin(phi1) + Math.sin(phi2)),
                c = Math.cos(phi1),
                C = c*c + 2*n*Math.sin(phi1),
                p0 = Math.sqrt(C - 2*n*Math.sin(lat0)) / n;
         
            return {
                name: 'albers',
                project: function(lnglat) {
                    var lng = parseFloat(lnglat.x);
                    var lat = parseFloat(lnglat.y);
                    
                    var theta = n * (pv.radians(lng) - lng0),
                        p = Math.sqrt(C - 2*n*Math.sin(pv.radians(lat))) / n;
                    var result = {
                        x: p * Math.sin(theta)/px,
                        y: p0 - p * Math.cos(theta)/px
                    };
                    return result;
                },
                invert: function(xy) {
                    var theta = Math.atan(xy.x / (p0 - xy.y)),
                        p = Math.sqrt(xy.x*xy.y + Math.pow(p0 - xy.y, 2));
                    return {
                        lng: pv.degrees(lon0 + theta/n),
                        lat: pv.degrees(Math.asin( (C - p*p*n*n) / (2*n)))
                    };
                }
            };
        }
        return albers(35, 105, 27, 45);
    })();
    return {
        Mercator: Mercator,
        Albers: Albers
    }   
})();
exports.isInsidePolygon = _isInsidePolygon;
exports.getArea = _getArea;
exports.number_fixed = _number_fixed;
exports.Projection = projection;