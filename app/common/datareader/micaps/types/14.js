!function(){
    var path = require('path');
    var util = require(path.join(__dirname, '../../../util'));
    var PolygonUtil = util.Polygon;
    var isInsidePolygon = PolygonUtil.isPointIn;
    var polygonIsInsidePolygon = PolygonUtil.isPolygonIn;
    var lineIsInsidePolygon = PolygonUtil.isLineIn;

    var PI = Math.PI;
    var CODE_SNOW = 23,     //雪
        CODE_RAIN = 26,     //雨
        CODE_RAIN_SNOW = 24,//雨夹雪
        CODE_MORE = 48;     //更高一个等级

    var NUM_MIN = 0.00001;
    var global_relation = {};
    function _parse_file(line_arr, options, cb) {
    	var illegal_index_area = [];
    	var REG_TOW_NUM = /^(-?[\d.]+)\s+([\d.]+)$/,
            REG_THREE_NUM = /^([\d.]+)\s+([\d.]+)\s+([\d.]+)$/,
            REG_LINES = /^LINES:\s*(\d+)/,
            REG_LINES_SYMBOL = /^LINES_SYMBOL:\s*(\d+)/,
            REG_SYMBOLS = /^SYMBOLS:\s*(\d+)/,
            REG_CLOSED_CONTOURS = /^CLOSED_CONTOURS:\s*(\d+)/,
            REG_NOLABEL = /NoLabel/,
            REG_BLANK = /\s+/;

        var lines = {
            len: 0,
            items: []
        }
        var line_symbols = {
            len: 0,
            items: []
        };
        var symbols = {
            len: 0,
            items: []
        };
        var areas = {
            len: 0,
            items: []
        };
        var content_info = {
            lines: lines,
            line_symbols: line_symbols,
            symbols: symbols,
            areas: areas
        };

        var FLAG_READLINE = 1,
            FLAG_READLINE_WEIGHT = 2,
            FLAG_READLINE_POINTS = 3,
            FLAG_READLINE_FLAG = 4,
            FLAG_READLINE_FLAG_POINTS = 5;
            FLAG_LINES_SYMBOLE = 6,
            FLAG_LINES_SYMBOLE_POINTS = 7,
            FLAG_SYMBOLE = 8,
            FLAG_SYMBOLE_ITEM = 9,
            FLAG_OVER = 10,
            FLAG_AREA_POINTS_INFO = 11,
            FLAG_AREA_POINTS = 12,
            FLAG_AREA_LABEL_INFO = 13,
            FLAG_AREA_LABEL = 14;

        var flag,reg_m;
        line_arr.forEach(function(v,i){
            v = v.trim();
            if(reg_m = REG_LINES.exec(v)){// step 1
                lines.len = reg_m[1];
                reg_m = null;
                flag = FLAG_READLINE_WEIGHT;
                // console.log('1. LINES -> ',lines.len);
                return;
            }else if(reg_m = REG_LINES_SYMBOL.exec(v)){
                line_symbols.len = reg_m[1];
                reg_m = null;
                flag = FLAG_LINES_SYMBOLE;
                return;
            }else if(reg_m = REG_SYMBOLS.exec(v)){
                symbols.len = reg_m[1];
                // console.log('8. SYMBOLE(len:'+reg_m[1]+')');
                reg_m = null;
                flag = FLAG_SYMBOLE_ITEM;
                return;
            }else if(reg_m = REG_CLOSED_CONTOURS.exec(v)){
                areas.len = reg_m[1];
                // console.log('9. CLOSED_CONTOURS(len:'+reg_m[1]+')');
                reg_m = null;
                flag = FLAG_AREA_POINTS_INFO;
                return;
            }
            if(flag == FLAG_OVER){
                return;
            }
            // console.log(flag,v);
            if(flag == FLAG_READLINE_WEIGHT){/*step 2*/
                var m = REG_TOW_NUM.exec(v);
                if(m){
                    lines.items.push({
                        weight: m[1],
                        point: {
                            len: m[2],
                            items: []
                        },
                        flags: {
                            len: 0,
                            text: '',
                            items: []
                        }
                    });
                    // console.log('2. LINES(weight:'+m[1]+',pointLen:'+m[2]+')');
                }
                flag = FLAG_READLINE_POINTS;
            }else if(flag == FLAG_READLINE_POINTS /*step 3*/ ||
                    flag == FLAG_READLINE_FLAG_POINTS/*step 5*/ ||
                    flag == FLAG_LINES_SYMBOLE_POINTS/*step 7*/ ||
                    flag == FLAG_AREA_POINTS ||
                    flag == FLAG_AREA_LABEL){
                var items = [];
                var points_arr = v.split(REG_BLANK);
                if(points_arr.length%3 != 0){
                    // console.log('===',points_arr.length);
                    return;
                }
                var flag_illegal = false;
                for(var i = 0,j = points_arr.length;i<j;i+=3){
                    var x = points_arr[i],
                        y = points_arr[i+1],
                        z = points_arr[i+2];
                    if(isNaN(x) || isNaN(y) || isNaN(z)){
                        flag_illegal = true; //对不合法数据进行标识
                    }
                    var point = {
                        x: Number(x),
                        y: Number(y),
                        z: Number(z)
                    };
                    items.push(point);
                }
                if(flag == FLAG_READLINE_POINTS){
                    // console.log('3. LINES_POINT()');
                    var index = lines.items.length-1;
                    var line = lines.items[index];
                    // console.log(lines.items);
                    line.point.items = line.point.items.concat(items);
                    // console.log('3. ->',items.length,line.point.items.length);
                    if(line.point.len == line.point.items.length){
                        flag = FLAG_READLINE_FLAG;
                    }
                }else if(flag == FLAG_READLINE_FLAG_POINTS){
                    // console.log('5. LINES_POINT()');
                    var line = lines.items[lines.items.length-1];
                    line.flags.items = line.flags.items.concat(items);
                    // console.log('5. ->',items.length,line.flags.items.length,v);
                    if(line.flags.len == line.flags.items.length){/* to step 2*/
                        flag = FLAG_READLINE_WEIGHT;
                    }
                }else if(flag == FLAG_LINES_SYMBOLE_POINTS){
                    // console.log('7. LINES_POINT()');
                    var line_symbol = line_symbols.items[line_symbols.items.length-1];
                    line_symbol.items = line_symbol.items.concat(items);
                    if(line_symbol.items.length == line_symbol.len){
                        flag = FLAG_LINES_SYMBOLE;
                    }
                }else if(flag == FLAG_AREA_POINTS){
                    // console.log('11. AREA_POINT()');
                    var _index_area = areas.items.length-1;
                    var area = areas.items[_index_area];
                    if(flag_illegal){
                        illegal_index_area.push(_index_area); // 对不合法的面数据进行过滤
                    }
                    area.items = area.items.concat(items);
                    if(area.items.length == area.len){
                        flag = FLAG_AREA_LABEL_INFO;
                    }
                }else if(flag == FLAG_AREA_LABEL){
                    var area = areas.items[areas.items.length-1];
                    var area_symbols = area.symbols;
                    area_symbols.items = area_symbols.items.concat(items);
                    if(area_symbols.items.length == area_symbols.len){
                        flag = FLAG_AREA_POINTS_INFO;
                    }

                    if(areas.items.length == areas.len){
                        flag = FLAG_OVER;
                    }
                }
            }else if(flag == FLAG_READLINE_FLAG/*step 4*/){
                var m = REG_TOW_NUM.exec(v);
                if(m){
                    var _flags = lines.items[lines.items.length-1].flags;
                    _flags.text = m[1];
                    _flags.len = m[2];
                    flag = FLAG_READLINE_FLAG_POINTS;
                    // console.log('4. LINES_FLAG(text:'+m[1]+',len:'+m[2]+')');
                }
            }else if(flag == FLAG_LINES_SYMBOLE){/*step 6*/
                var m = REG_THREE_NUM.exec(v);
                if(m){
                    line_symbols.items.push({
                        code: Number(m[1]),
                        weight: Number(m[2]),
                        len: Number(m[3]),
                        items: []
                    });
                    flag = FLAG_LINES_SYMBOLE_POINTS;
                    // console.log('6. LINES_SYMBOLE(code:'+m[1]+',weight:'+m[2]+',len:'+m[3]+')');
                }

            }else if(flag == FLAG_SYMBOLE_ITEM){
                var arr = v.split(REG_BLANK);
                symbols.items.push({
                    type: Number(arr[0]),
                    x: Number(arr[1]),
                    y: Number(arr[2]),
                    z: Number(arr[3]),
                    text: arr[4]
                });
                // console.log('9. symbols');
                if(symbols.items.length == symbols.len){
                    flag = FLAG_OVER;
                }
            }else if(flag == FLAG_AREA_POINTS_INFO){
                var m = REG_TOW_NUM.exec(v);
                if(m){
                    areas.items.push({
                        weight: Number(m[1]),
                        len: Number(m[2]),
                        items: []
                    });
                    flag = FLAG_AREA_POINTS;
                    // console.log('10. area_FLAG(weight:'+m[1]+',len:'+m[2]+')');
                }
            }else if(flag == FLAG_AREA_LABEL_INFO){
                flag = FLAG_AREA_POINTS_INFO;
                var m = REG_TOW_NUM.exec(v);
                if(m){
                    var area = areas.items[areas.items.length-1];
                    area.symbols = {
                        text: m[1],
                        len: Number(m[2]),
                        items: []
                    }
                    flag = FLAG_AREA_LABEL;
                }
            }
        });
        //先初始化面积，方便排序
        var items_area = content_info.areas.items;
        var new_items = [];
        items_area.forEach(function(v, i){
            if(v.symbols && illegal_index_area.indexOf(i) == -1){ //对没有标识的面进行过滤
                var items = v.items;
                var area = getArea(items);
                v.flag = area > 0;
                v.area = Math.abs(area);
                new_items.push(v);
            }
        });
        content_info.areas.len = new_items.length;
        content_info.areas.items = new_items;
        _sort_areas(content_info.areas);

        global_relation = {};
        if(content_info.areas.len > 0 && content_info.line_symbols.len > 0){
            _parseArea(content_info);
        }
        
        _addCode(content_info);
        // 格式化数据
        _format(content_info);
        /*这里基于数据层的clip操作会影响整个数据的读取时间，暂时去掉*/
        // _doclip(content_info, _options);
        // return content_info;
        cb(null, content_info);
    }
    function getArea(points){
        var len = points.length;
        if(len > 0){
            var S = 0;
            for(var i = 0, j = len - 1; i<j; i++){
                var p_a = points[i],
                    p_b = points[i + 1];
                S += p_a.x * p_b.y - p_b.x*p_a.y;
            }
            var p_a = points[j],
                p_b = points[0];
            S += p_a.x * p_b.y - p_b.x*p_a.y;
            return S/2;
        }
        return 0;
    }
    /*对面数据进行排序(从大到小)*/
    function _sort_areas(areas){
        areas.items.sort(function(a,b){
            return b.area - a.area;
        });
    }
    /*对数据进行格式化(数据精简)*/
    function _format(content_info){
        var items = content_info.line_symbols.items;
        // .filter(function(v){
        //  return v.code != 0;
        // });
        var len = items.length;
        if(len > 0){
            content_info.line_symbols.items = items;
            content_info.line_symbols.len = len;
        }else{
            delete content_info.line_symbols;
        }
        var areas = content_info.areas;
        // _deal_code_list_after_parsearea(content_info);
        var areas_items = areas.items;
        areas_items.forEach(function(v, i){
            delete v.len;
            var _symbols = v.symbols;
            if(_symbols){
                delete _symbols.len;
            }
            delete v.kind;
            if(v.flag){
                v.items.reverse();
            }
            delete v.flag;
            // console.log(i, v.flag, v.area);
            // delete v.public_line;
            delete v.code_list;
            delete v.area;
            delete v.public_line;
            delete v.type;
            delete v.line;
            delete v.line_ids;
        });
        content_info.areas = areas_items;
        if(content_info.line_symbols){
            var line_symbols_items = content_info.line_symbols.items;
            line_symbols_items.forEach(function(v){
                var items = v.items;
                var p_start = items[0],
                    p_end = items[items.length - 1];
                // 根据起始点的位置关系判断线的画向（保证从左向右画）
                // if(p_start.x > p_end.x && p_start.y > p_end.y){
                //  v.items.reverse();
                // }
                delete v.len;
            });
            content_info.line_symbols = line_symbols_items;
        }
        var line_items = content_info.lines.items;
        line_items.forEach(function(v){
            delete v.flags.len;
            v.point = v.point.items;
        });
        content_info.lines = line_items;
        content_info.symbols = content_info.symbols.items;
    }
    /*线分割面成多个面*/
    function _split_area(area, line_items, content_info){
        var line_ids = area.line_ids;
        var area_items = area.items.slice();
        var return_areas = [];
        var len = line_items.length;
        var start_line_index = 0;
        while( start_line_index < len){
            var len_return = return_areas.length;
            if(len_return > 0){
                for(var i = 0; i < len_return; i++){
                    var _area = return_areas[i];
                    var _items = _area.items;
                    // console.log('_area.line_ids', _area.line_ids);
                    var info = _split_area2two(_items, line_items, content_info, start_line_index, line_ids);
                    // console.log('info2', info);
                    if(info){
                        var areas = info.areas;
                        if(areas && areas.length > 0){
                            return_areas.splice(i, 1);

                            return_areas = return_areas.concat(areas);
                        }
                        start_line_index = info.start_line_index;
                        // console.log('init2', start_line_index, areas.length, return_areas.length);
                        break;
                    }
                }
                if(i == len_return){
                    break;
                }
            }else{
                var info = _split_area2two(area_items, line_items, content_info, start_line_index, line_ids);
                // console.log('info1', info);
                if(info){
                    var areas = info.areas;
                    if(areas && areas.length > 0){
                        return_areas = return_areas.concat(areas);
                        // console.log('init1', start_line_index, areas.length, return_areas.length);
                    }
                    start_line_index = info.start_line_index;
                }else{
                    break;
                }
            }
        }
        return return_areas;
    }

    var _getUId = (function() {
        var _line_id = 1;
        return function() {
            return _line_id++;
        }
    })();
    var _cache_public_line = {};
    /*线段把面分割成两部分*/
    function _split_area2two(area_items, line_items, content_info, start_line_index, line_ids){
        start_line_index || (start_line_index = 0); //检测线上点的开始索引
        var areas = []; //存储分割后的面
        var new_line_items = [];
        // 开头点的准确率很高，结尾点的准确率很低
        var _items_len = line_items.length;

        // 重写得到四个端点逻辑，！！！暂时不考虑开头点不在面外面情况
        // 得到四个端点
        // console.log('start_line_index', start_line_index , _items_len);
        var start_x1,start_y1,
            start_x2,start_y2,
            start_item_1,start_item_2;
        var end_x1,end_y1,
            end_x2,end_y2,
            end_item_1,end_item_2;

        /*这里暂时不考虑线在面外没有两头问题*/
        for(var i = start_line_index; i < _items_len; i++){
            var v_line_item = line_items[i];
            var flag = isInsidePolygon(area_items,v_line_item.x,v_line_item.y);
            if(flag){
                if(!start_item_2){
                    start_item_2 = v_line_item;
                }else{
                    end_item_1 = v_line_item;
                }
                new_line_items.push(v_line_item);
            }else{
                if(start_item_1 && start_item_2){
                    end_item_2 = v_line_item
                }else{
                    start_item_1 = v_line_item;
                }
            }
            if(start_item_1 && start_item_2 && end_item_1 && end_item_2){
                start_line_index = i;
                break;
            }
        }

        if(start_line_index == _items_len || !start_item_1 || !start_item_2 || !end_item_1 || !end_item_2){
            return;
        }

        start_x1 = start_item_1.x;
        start_y1 = start_item_1.y;
        start_x2 = start_item_2.x,
        start_y2 = start_item_2.y;

        end_x1 = end_item_1.x;
        end_y1 = end_item_1.y;
        end_x2 = end_item_2.x,
        end_y2 = end_item_2.y;

        var start_k,start_b,end_k,end_b;

        if(start_x1 != start_x2){
            start_k = (start_y1-start_y2)/(start_x1-start_x2);
            start_b = (start_x1*start_y2 - start_x2*start_y1)/(start_x1-start_x2);
        }
        if(end_x1 != end_x2){
            end_k = (end_y1-end_y2)/(end_x1-end_x2);
            end_b = (end_x1*end_y2 - end_x2*end_y1)/(end_x1-end_x2);
        }

        var _jiaodian_start = _jiaodian_end = null;
        var i = 0,j=area_items.length-1,k=j+1;
        for(var i = 0,len=area_items.length-1,j=len-1;i<len;j=i++){
            var x1 = area_items[i].x,
                x2 = area_items[j].x,
                y1 = area_items[i].y,
                y2 = area_items[j].y;

            var k = b = undefined;
            if(x1 != x2){
                k = (y1-y2)/(x1-x2);
                b = (x1*y2 - x2*y1)/(x1-x2);
            }

            // 暂时不考虑两条直接垂直平行和水平平行
            if(k != start_k){
                // console.log('x1',x1,'x2',x2,'y1',y1,'y2',y2,'start_k',start_k,'start_b',start_b);
                if(k == 0){
                    if(start_k != undefined){
                        var _x = (b - start_b)/start_k;
                        var _y = y1;
                    }else{
                        var _x = start_x1,
                            _y = b;
                    }
                }else if(start_k == 0){
                    if(k != undefined){
                        var _x = (start_b - b)/k;
                        var _y = start_y1;
                    }else{
                        var _x = x1,
                            _y = start_b;
                    }
                }else{
                    if(k == undefined){
                        var _x = x1,
                            _y = start_k * x1 + start_b;
                    }else if(start_k == undefined){
                        var _x = start_x1,
                            _y = k * start_x1 + b;
                    }else{
                        var _x = (start_b - b)/(k - start_k),
                            _y = (k*start_b - b*start_k)/(k - start_k);
                    }
                }
                // console.log(_x,x1,x2,start_x1,start_x2,_x >= Math.min(x1,x2) && _x <= Math.max(x1,x2));
                // console.log(_y,y1,y2,start_y1,start_y2,_y >= Math.min(y1,y2) && _x <= Math.max(y1,y2));
                if(_x >= Math.min(x1,x2) && _x <= Math.max(x1,x2) &&
                   _x >= Math.min(start_x1,start_x2) && _x <= Math.max(start_x1,start_x2) &&
                   _y >= Math.min(y1,y2) && _y <= Math.max(y1,y2) &&
                   _y >= Math.min(start_y1,start_y2) && _y <= Math.max(start_y1,start_y2)){
                    _jiaodian_start = [_x,_y,i,j];
                    // console.log('start_v_x,start_v_y',i,j,k,start_k,_x,_y);
                    // 添加开头的分割点
                    // content_info.symbols.items.push({
                    //  x: _x,
                    //  y: _y,
                    //  z: 0,
                    //  type: 4
                    // });
                }
            }
            if(k != end_k){
                var _x,_y;
                // console.log('->x1 = ',x1,', x2= ',x2,', y1=',y1,',y2=',y2,',start_k=',start_k,',start_b=',start_b,'end_k=',end_k,'end_b=',end_b,'k=',k);
                if(k == 0){
                    if(end_k != undefined){
                        var _x = (b - end_b)/end_k;
                        var _y = y1;
                    }else{
                        var _x = end_x1,
                            _y = b;
                    }
                }else if(end_k == 0){
                    if(k != undefined){
                        var _x = (end_b - b)/k;
                        var _y = end_y1;
                    }else{
                        var _x = x1,
                            _y = end_b;
                    }
                }else{
                    if(k == undefined){
                        var _x = x1,
                            _y = end_k * x1 + end_b;
                    }else if(end_k == undefined){
                        var _x = end_x1,
                            _y = k * end_x1 + b;
                    }else{
                        var _x = (end_b - b)/(k - end_k),
                            _y = (k*end_b - b*end_k)/(k - end_k);
                    }
                }
                // if(i == 36 || i == 37)
                // console.log(i,j,_x,x1,x2,_x >= Math.min(x1,x2) && _x <= Math.max(x1,x2));
                if(_x >= Math.min(x1,x2) && _x <= Math.max(x1,x2) &&
                   _x >= Math.min(end_x1,end_x2) && _x <= Math.max(end_x1,end_x2) &&
                   _y >= Math.min(y1,y2) && _y <= Math.max(y1,y2) &&
                   _y >= Math.min(end_y1,end_y2) && _y <= Math.max(end_y1,end_y2)){
                    // console.log('end_v_x,end_v_y',i,j,k,end_k,_x,_y);
                    _jiaodian_end = [_x,_y,i,j];
                    // 添加结尾的分割点
                    // content_info.symbols.items.push({
                    //  x: _x,
                    //  y: _y,
                    //  z: 0,
                    //  type: 4
                    // });
                }
            }
        }
        // console.log('jiaodian_info',_jiaodian_start,_jiaodian_end);
        // 根据开始和结尾的交点从面数据里截取点片段和和特殊线组合成新的面
        if(_jiaodian_start && _jiaodian_end){
            var start_index = _jiaodian_start[2],
                end_index = _jiaodian_end[2];

            // 从面数据里截取点片段
            var add_items = [],
                add_items_other = [];
            // console.log('start_index,end_index',start_index,end_index);
            if(start_index > end_index){
                // add_items = area_items.slice(0,start_index+1).reverse();//.concat(area_items.slice(end_index).reverse());
                // add_items = area_items.slice(end_index).concat(area_items.slice(0,start_index+1));
                add_items = area_items.slice(end_index,start_index + 1).reverse();
                add_items_other = area_items.slice(start_index).concat(area_items.slice(0,end_index));
                // add_items = area_items;
            }else{
                // add_items = area_items.splice(start_index,end_index - start_index + 1);
                // add_items = area_items.slice(0,2).reverse();
                add_items = area_items.slice(start_index,end_index + 1);
                add_items_other = area_items.slice(end_index).concat(area_items.slice(0,start_index)).reverse();
            }
            // console.log('len -- '+area_items.length,add_items.length,new_line_items.length);

            add_items[0].x = _jiaodian_start[0];
            add_items[0].y = _jiaodian_start[1];
            add_items[0].t = 1;
            add_items[add_items.length-1].x = _jiaodian_end[0];
            add_items[add_items.length-1].y = _jiaodian_end[1];
            add_items[add_items.length-1].t = 1;

            var first_new_line_point = new_line_items[0],
                last_new_line_point = new_line_items[new_line_items.length-1];
            // 根据四个点的距离进行追加判断
            if(Math.pow(_jiaodian_start[0]-first_new_line_point.x,2)+Math.pow(_jiaodian_start[1]-first_new_line_point.y,2) >
               Math.pow(_jiaodian_end[0]-first_new_line_point.x,2)+Math.pow(_jiaodian_end[1]-first_new_line_point.y,2)){
                // new_line_items = new_line_items.concat(add_items);
            }else{
                // new_line_items = new_line_items.concat(add_items.reverse());
                add_items.reverse();
                add_items_other.reverse();
            }
            if(_jiaodian_start[0] != first_new_line_point.x && _jiaodian_start[1] != first_new_line_point.y){
                add_items.splice(-1,1,{
                    x: _jiaodian_start[0],
                    y: _jiaodian_start[1],
                    z: 0,
                    t: 1
                });
                add_items.splice(0,1,{
                    x: _jiaodian_end[0],
                    y: _jiaodian_end[1],
                    z: 0,
                    t: 1
                });
                add_items_other.splice(-1,1,{
                    x: _jiaodian_start[0],
                    y: _jiaodian_start[1],
                    z: 0,
                    t: 1
                });
                add_items_other.splice(0,1,{
                    x: _jiaodian_end[0],
                    y: _jiaodian_end[1],
                    z: 0,
                    t: 1
                });
            }
            areas = [new_line_items.concat(add_items), new_line_items.concat(add_items_other)];
        }
        var id = _getUId();
        // (area_items.line_ids || (area_items.line_ids = [])).push(id);
        var ids = (line_ids || []).slice(0);
        ids.push(id);
        _cache_public_line[id] = new_line_items;
        areas.forEach(function(v, i){
        	areas[i] = {
        		items: v,
                type: 'add',
                area: Math.abs(getArea(v)),
                // line: new_line_items,
                line_ids: ids
        	}
        });
        return {
            public_line: new_line_items,
            areas: areas,
            start_line_index: start_line_index
        };
    }

    function _parseArea(content_info) {
    	// 得到所含特殊线的面
        var include_relation = {};
        var line_symbols = content_info.line_symbols.items.filter(function(v){
            return v.code == 0;
        });
        var items_area = content_info.areas.items;
        items_area.forEach(function(v, i){
            var id = _getUId();
            v.id = id;
            var is_have_line_in = false;
            var items = v.items;
            line_symbols.forEach(function(v_line,i_line){
                if(lineIsInsidePolygon(items, v_line.items, true)){
                    if(!include_relation[i]){
                        include_relation[i] = [];
                    }
                    include_relation[i].push(i_line);
                    is_have_line_in = true;
                }
            });
            if (is_have_line_in) {
                global_relation[id] = include_relation[i];
            }
        });
        // console.log(JSON.stringify(include_relation));
        // include_relation = {"0":[1,2,3]}
        var _cache_area = {};
        for(var i in include_relation){
            var line_indexs = include_relation[i];
            var _area = items_area[i];

            var new_areas = [];
            while(line_indexs.length > 0){
                var c_line_index = line_indexs.shift();
                var line_items = line_symbols[c_line_index].items.slice();
                var len_new_areas = new_areas.length;
                if(len_new_areas > 0){
                    for(var i_new_area = 0; i_new_area < len_new_areas; i_new_area++){
                        var _item_new_areas = new_areas[i_new_area];
                        var _items = _item_new_areas.items;
                        if(lineIsInsidePolygon(_items, line_items, true)){
                            new_areas.splice(i_new_area, 1);
                            var _areas_splited = _split_area(_item_new_areas, line_items, content_info);
                            new_areas = new_areas.concat(_areas_splited);
                            break;
                        }
                    }
                }else{
                    var _areas_splited = _split_area(_area, line_items, content_info);
                    new_areas = new_areas.concat(_areas_splited);
                }
            }
            var weight = _area.weight;
            var symbols = _area.symbols;
            if(weight || symbols){
                new_areas.forEach(function(val){
                    if(weight){
                        val.weight = weight;
                    }
                    if(symbols){
                        val.symbols = symbols;
                    }
                });
            }
            _cache_area[i] = new_areas;
        }
        var items_arr = [];
        content_info.areas.items.forEach(function(v,items_index){
            var _cache = _cache_area[items_index];
            if(_cache){
                items_arr = items_arr.concat(_cache);
                delete _cache_area[items_index];
            }else{
                items_arr.push(v);
            }
        });
        content_info.areas.items = items_arr;
        content_info.areas.len = items_arr.length;

        _sort_areas(content_info.areas);
        // _dealVal(content_info);
    }
    /*给各个面添加编码(直接用编码是否在所在区域确定)*/
    function _addCode(content_info) {
    	var areas = content_info.areas.items;
        var symbols = content_info.symbols.items;
        var symbols_list = [];
        symbols.filter(function (v) {
        	var type = v.type;
        	var code_type;
        	if (CODE_SNOW == type || 21 == type || 22 == type || 66 == type) {
        		code_type = CODE_SNOW;
        	} else if (CODE_RAIN_SNOW == type) {
        		code_type = CODE_RAIN_SNOW;
        	} else if (CODE_RAIN == type || 47 == type || 55 == type) {
        		code_type = CODE_RAIN;
        	}
        	if (code_type) {
        		v.code = code_type;
        		symbols_list.push(v);
        	}
        });
        areas.forEach(function(area, area_index){
            var area_items = area.items;
            var code_list = [];
            var code_cache = {};
            symbols_list.forEach(function(symbol_item) {
            	var flag = isInsidePolygon(area_items, symbol_item.x, symbol_item.y);
            	if (flag) {
            		var code = symbol_item.code;
            		if (code_cache[code]) {
            			code_cache[code]++;
            		} else {
            			code_cache[code] = 1;
            		}
            	}
            });
            for (var i in code_cache) {
            	code_list.push({
            		code: i,
            		n: code_cache[i]
            	});
            }
            code_list.sort(function(a, b) {
            	return b.n - a.n;
            });
            var len = code_list.length;
            var to_code;// = CODE_RAIN;
            if (len == 0) {
            	for (var i = area_index-1; i>=0; i--) {
            		var area_p = areas[i];
            		var n = polygonIsInsidePolygon(area_p.items, area_items);
            		// console.log(area_index, i, '--', area_items.length , n, area.num_split);
            		if (n) {
            			var code_p = area_p.code;
            			// console.log('in');
            			if (code_p) {
            				to_code = code_p;
            				break;
            			}
            		}
            	}
            } else if (len == 1) {
                to_code = code_list[0].code;
            } else {
                // 有雨雪分界线
                var id = area.id;
                if (id !== undefined && !!!global_relation[id]) {
                    // rr042008.024只没有雨雪分界线，但里面有雪及雨夹雪标识
                    // 默认处理为没有雨雪分界线，但有多个标识时默认为“雨”
                    to_code = CODE_RAIN;
                }
            }
            if (!to_code && area.type == 'add') {
                to_code = _guessCode(area, area_index, areas);
                // console.log('guess', to_code);
            }
            area.code = to_code || CODE_RAIN;
        });
    }
    function _getBound(items) {
        var first = items[0];
        var x_min = first.x,
            y_min = first.y;
        var x_max = x_min,
            y_max = y_min;

        for (var i = 1, j = items.length; i<j; i++) {
            var val = items[i];
            var x = val.x,
                y = val.y;
            if (x > x_max) {
                x_max = x;
            }
            if (x < x_min) {
                x_min = x;
            }
            if (y > y_max) {
                y_max = y;
            }
            if (y < y_min) {
                y_min = y;
            }
        }
        return {
            x_min: x_min, 
            y_min: y_min,
            x_max: x_max,
            y_max: y_max
        }
    }
    /*得到一个面和其它面的公共边*/
    function _getLines(area) {
        var lines = [];
        var ids = area.line_ids;
        var items = area.items,
            len = items.length;
        for (var i = 0, j = ids.length; i<j; i++) {
            var id = ids[i];
            var line = _cache_public_line[id];
            if (line) {
                var n_is = 0;
                for (var i_line = 0, j_line = line.length; i_line<j_line; i_line++) {
                    var item_line = line[i_line],
                        x_line = item_line.x,
                        y_line = item_line.y;
                    for (var i_items = 0; i_items<len; i_items++) {
                        var item = items[i_items];
                        if (item.x == x_line && item.y == y_line) {
                            n_is++;
                            break;
                        }
                    }
                }
                if (n_is == j_line) {
                    lines.push(line);
                }
            }
        }
        return lines;
    }
    /*根据公共边与面上其它点的位置关系确认编码*/
    function _guessCodeByLine(area, line) {
        var items = area.items;
        var len_items = items.length;
        var first = line[0],
            end = line[line.length - 1];
        var x_first = first.x,
            y_first = first.y,
            x_end = end.x,
            y_end = end.y;
        if (x_first == x_end) {
            var _isSnow = function(point) {
                return point.x <= x_first;
            }
        } else {
            /*这里暂时这样处理，后续*/
            // console.log(line.length/items.length, line.length, items.length);
            if (len_items > 50 && line.length/len_items < 0.5) {
                var bound_line = _getBound(line);
                var x_min = bound_line.x_min,
                    x_max = bound_line.x_max,
                    y_min = bound_line.y_min,
                    y_max = bound_line.y_max;

                var _isSnow = function(point) {
                    var x = point.x,
                        y = point.y;
                    return y >= y_max;
                    
                }    
            } else {
                var k = (y_end - y_first)/(x_end - x_first);
                    b = (x_first*y_end - x_end*y_first)/(x_first - x_end);
                var _isSnow = function(point) {
                    var v = k * point.x + b;
                    var y = point.y;
                    return k >= 0? (y >= v? true: false): (y <= v? true: false);
                }
            }
        }
        function _isInLine(point) {
            var x = point.x,
                y = point.y;
            for (var i = 0, j = line.length; i<j; i++) {
                var v = line[i];
                if (v.x == x && v.y == y) {
                    return true;
                }
            }
        }
        function _guessIsSnow() {
            var n_t = 0,
                n_snow = 0;
            for (var i = 0, j = items.length; i<j; i++) {
                var v = items[i],
                    x = v.x,
                    y = v.y;
                if (!_isInLine(v)) {
                    n_t++;
                    if (_isSnow(v)) {
                        n_snow++;
                    }
                }
            }
            // console.log(n_snow, n_t, n_snow/n_t);
            return n_snow/n_t > 0.5;
        }


        return _guessIsSnow()? CODE_SNOW: CODE_RAIN;
    }
    /*猜测不确定面的编码*/
    function _guessCode(area, area_index, areas) {
        var lines = _getLines(area);
        var code_list = [];
        var _cache = {};
        var len = lines.length;
        if (len > 0) {
            for (var i = 0; i<len; i++) {
                var code = _guessCodeByLine(area, lines[i]);
                if (code) {
                    if (_cache[code]) {
                        _cache[code].n++;
                    } else {
                        _cache[code] = {
                            n: 1
                        };
                    }
                    _cache[code].line_index = i;
                }
            }
            for (var i in _cache) {
                code_list.push({
                    code: i,
                    n: _cache[i].n,
                    index: _cache[i].line_index
                });
            }
            code_list.sort(function(a, b) {
                return b.n - a.n;
            });
            var len = code_list.length;
            function _getCode(index) {
                var next_index = index + 1;
                if (next_index < len) {
                    var one = code_list[index],
                        two = code_list[next_index];
                    if (lines[one.index].length > lines[two.index].length) {
                        return code_list[index];
                    } else {
                        return _getCode(next_index);
                    }
                } else {
                    return code_list[index];
                }
            }
            // console.log('code_list', area_index, len,code_list);
            var item;
            if (len == 1) {
                item = code_list[0];
            } else {
                item = _getCode(0);
            }
            return item.code;
        }
    }
    exports.parse = _parse_file;
}()