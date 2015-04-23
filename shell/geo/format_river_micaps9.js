var fs = require('fs'),
	util = require('./util');
var source_path = 'E:/docs/2014工作/SK替代/地图底图及数据/河流及公路/湖泊和四级以上河流';
var source_path = 'E:/docs/2014工作/SK替代/地图底图及数据/河流及公路/长江黄河';
var source_path = 'E:/docs/2014工作/SK替代/地图底图及数据/river/RIVER22';
var source_path = 'E:/docs/2014工作/SK替代/地图底图及数据/river/湖泊和主要河流';
var source_path = 'E:/docs/2014工作/SK替代/地图底图及数据/river/东北';

var REG_RULE = /(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/;
// var REG_RULE = /(\d+)\s+map\s+(\d+)\s+(\d+)\s+(\d+)/; //长江黄河
var REG_DATA = /^(([\d.]+)\s*)+$/;

fs.readFile(source_path, {
	encoding: 'utf8'
}, function(err, data){
	var lines = data.split(/[\n\r]+/);
	var len_line_items = 0;
	var lines_item = [];
	var current_items = [];
	lines.forEach(function(line){
		line = line.trim();
		if(line){
			var m = REG_RULE.exec(line);
			if(m){
				if(current_items && current_items.length > 0){
					lines_item.push(current_items.slice());
					current_items = [];
				}
				len_line_items = parseInt(m[1]);
			}else{
				// console.log(line, REG_DATA.test(line));
				if(REG_DATA.test(line)){
					var arr = line.split(/\s+/);

					if(arr.join('').replace(/0/g, '')){
						for(var i = 0, j = arr.length; i<j; i++){
							current_items.push([arr[i], arr[++i]]);
						}
					}
				}
			} 
		}
	});
	fs.writeFile(source_path+'.result.json', JSON.stringify(lines_item));
});