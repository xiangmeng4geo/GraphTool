var fs = require('fs'),
	util = require('./util');

var data = require('./data-source/chian_river_Merge.json');

var DIS_MIN = 0.05;
data.features.forEach(function(v){
	var items = v.geometry.coordinates;
	var items_new = util.predigestData(items, DIS_MIN);
	console.log(items.length, '->', items_new.length);
});