/*格式化大区地理数据*/
var fs = require('fs'),
	path = require('path');

var dir_current = __dirname;
var dir_zone_source = path.join(dir_current, 'data-source', 'zone');
var dir_zone_min = path.join(dir_current, 'data');

var MIN_DISTANCE_SQUARE = Math.pow(0.01, 2);
function _reduceCoordinates(coordinate){
	var len = coordinate.length;
	coordinate = coordinate.slice();
	var coordinate_new = [];
	var last_point = coordinate.shift();
	coordinate_new.push(last_point);
	var tmp;
	while((tmp = coordinate.shift())){
		var dis_square = Math.pow(tmp[0] - last_point[0], 2) + Math.pow(tmp[1] - last_point[1], 2);
		if(dis_square >= MIN_DISTANCE_SQUARE){
			last_point = tmp;
			coordinate_new.push(tmp);
		}
	}

	console.log(len, '->', coordinate_new.length);
	if(coordinate_new.length > 50){
		return coordinate_new;
	}
}
function _format(zone_name){
	var data_zone = require(path.join(dir_zone_source, zone_name+'.json'));
	var features_new = [];
	data_zone.features.forEach(function(v){
		var geometry = v.geometry;
		if(geometry.type == "MultiPolygon"){
			var coordinates_new = [];
			geometry.coordinates.forEach(function(coordinate){
				coordinate = _reduceCoordinates(coordinate[0]);
				if(coordinate && coordinate.length > 0){
					coordinates_new.push([coordinate]);
				}
			});
			features_new.push({
				type: "Feature",
				geometry: {
					type: "MultiPolygon",
					coordinates: coordinates_new
				}
			});
		}else{
			var coordinate = _reduceCoordinates(geometry.coordinates[0]);
			if(coordinate && coordinate.length > 0){
				features_new.push({
					type: "Feature",
					geometry: {
						type: "Polygon",
						coordinates: [coordinate]
					}
				});
			}
		}
	});
	var data_new = {
		type: "FeatureCollection",
		features: features_new
	}

	var save_path = path.join(dir_zone_min, zone_name+'.json');
	fs.writeFileSync(save_path, JSON.stringify(data_new));
	console.log(save_path);
}

['dongbei', 
'huabei',
'huadong',
'huanan',
'huazhong',
'xibei',
'xinan',
'xinjiang'].forEach(function(v){
	_format(v);
});