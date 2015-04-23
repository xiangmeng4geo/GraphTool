var fs = require('fs'),
	util = require('./util');

var source_path = './data-source/chian_river_Merge.json';

var DIS_MIN = 0.2;

function merge_river(data, index){
	// var flag = index == 24;
	var num = 0;
	data.forEach(function(v){
		num += v.geometry.coordinates.length;
	});
	// console.log('====', num);
	var lines = [];
	var tmp;
	var items = [];
	var num_add = 0;
	while((tmp = data.shift())){
		items = items.concat(tmp.geometry.coordinates);
		var first = items[0].join(),
			last = items[items.length - 1].join();
		for(var i = 0; i<data.length; i++){
			// console.log('len = '+data.length);
			var coor = data[i].geometry.coordinates.slice();
			var p_s = coor[0].join(),
				p_l = coor[coor.length - 1].join();
			var is_have_add = false;
			if(first == p_s){
				coor.reverse();
				items = coor.concat(items);
				is_have_add = true;
			}else if(first == p_l){
				items = coor.concat(items);
				is_have_add = true;
			}else if(last == p_s){
				items = items.concat(coor);
				is_have_add = true;
			}else if(last == p_l){
				coor.reverse();
				items = items.concat(coor);
				is_have_add = true;
			}
			if(is_have_add){
				data.splice(i, 1);
				i--;
			}
		}
				num_add += items.length
		// console.log('items.length = '+items.length);
		lines.push(items.slice());
		items = [];
	}
	console.log('lines.length = '+lines.length, 'num = '+num+', num_add = '+num_add);
	// fs.writeFileSync(source_path+'test1.json', JSON.stringify(lines));
	return lines;
}
// function merge_river(data, index){
// 	var lines = [];
// 	data.forEach(function(v){
// 		lines.push(v.geometry.coordinates);
// 	});
// 	return lines;
// }
function merge_river_end(lines_river){
	lines_river = lines_river.slice();
	var lines = [];
	var tmp;
	var items = [];
	var num_add = 0;
	while((tmp = lines_river.shift())){
		items = items.concat(tmp);
		var first = items[0].join(),
			last = items[items.length - 1].join();
		for(var i = 0; i<lines_river.length; i++){
			// console.log('len = '+data.length);
			var coor = lines_river[i].slice();
			var p_s = coor[0].join(),
				p_l = coor[coor.length - 1].join();
			var is_have_add = false;
			if(first == p_s){
				coor.reverse();
				items = coor.concat(items);
				is_have_add = true;
			}else if(first == p_l){
				items = coor.concat(items);
				is_have_add = true;
			}else if(last == p_s){
				items = items.concat(coor);
				is_have_add = true;
			}else if(last == p_l){
				coor.reverse();
				items = items.concat(coor);
				is_have_add = true;
			}
			if(is_have_add){
				lines_river.splice(i, 1);
				i--;
			}
		}
		// console.log('items.length = '+items.length);
		lines.push(items.slice());
		items = [];
	}
	// console.log('lines.length = '+lines.length, 'num = '+num+', num_add = '+num_add);
	// fs.writeFileSync(source_path+'test1.json', JSON.stringify(lines));
	return lines;
}
function run(){
	var _cache_file_path = source_path+'test.json';
	
	if(!fs.existsSync(_cache_file_path)){
		var data = require(source_path);
		// var DIS_MIN = 0;
		var _cache_rivers = {};
		data.features.forEach(function(v){
			// var items = v.geometry.coordinates;
			// var items_new = util.predigestData(items, DIS_MIN);
			// console.log(items.length, '->', items_new.length);
			var name = v.properties.NAME;
			(_cache_rivers[name] || (_cache_rivers[name] = [])).push(v);
		});
		var lines_river = [];
		var index = 0;
		for(var i in _cache_rivers){
			// if(index == 0){
				lines_river = lines_river.concat(merge_river(_cache_rivers[i], index));
			// }
			index++;
		}
		console.log('lines_river = ', lines_river.length);
		lines_river = merge_river_end(lines_river);
		console.log('new len = '+lines_river.length);
		fs.writeFileSync(_cache_file_path, JSON.stringify(lines_river));
	}else{
		var lines_river = require(_cache_file_path);
	}
	
	var lines_river_new = [];
	lines_river.forEach(function(river, i){
		var _len = river.length;
		var items = util.predigestData(river, DIS_MIN, true);
		if(items.length > 0){
			lines_river_new.push(items);
		}
	});
	fs.writeFileSync(source_path+'test1.json', JSON.stringify(lines_river_new));

	console.log(lines_river_new.length);
}

run();

