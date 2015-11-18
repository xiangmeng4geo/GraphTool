!function(){
	var Async = require('../util').Async;
	module.exports = function(data, lnglat_arr, option, cb){
		// console.log(data, lnglat_arr, option, cb);
		Async.init(function(){
			var T = thread;
			var emit = T.emit;
			function info(msg){
				emit('info', JSON.stringify(msg));
			}
			var DIS_POINTS = 0.5;
			function Interpolation_IDW_Neighbor(SCoords, lnglat_arr, NumberOfNearestNeighbors, unDefData, bCalAllGrids){
				var time_start = new Date();
				var num4,num5;
				var length = lnglat_arr.length,	//获取X数组大小
					num = lnglat_arr[0].length,	//获取Y数组大小
					num3 = SCoords.length,		//获取SCoords二维数组第二维长度
					numArray = [],
					num13 = NumberOfNearestNeighbors,
					numArray2 = new Array(num3),
					objArray = [[],[]];
				info('Interpolation_IDW_Neighbor', 'dataLen = '+num3+', lnglatLen = '+ length*num);
				for(num4 = 0; num4 < num; num4++){
					num5 = 0;
					while( num5 < length ){
						var num9;
						if(!numArray[num4]){
							numArray[num4] = [];
						}
						numArray[num4][num5] = unDefData;
						var num10 = num11 = 0;
						var num14 = index = 0;
						while(index < num3){
							var d = SCoords[index];
							var val = d.v;
							if(val == unDefData){
								numArray2[index] = -1;
							}else{
								var lnglat = lnglat_arr[num5][num4];
								var dis = Math.pow(lnglat.x-d.x, 2)+Math.pow(lnglat.y-d.y, 2);
								if(dis == 0){
									numArray[num4][num5] = val;
									break;
								}
								num9 = 1/dis;
								numArray2[index] = num9;
								if(num14 < num13){
									objArray[0][num14] = num9;
									objArray[1][num14] = index;
								}
								num14++;
							}
							index++;
						}
						if(numArray[num4][num5] == unDefData){
							index = 0;
							while(index < num3){
								num9 = numArray2[index];
								if(num9 != -1){
									var num12 = objArray[0][0];
									var num8 = 0;
									for(var i = 1; i<num13; i++){
										if(objArray[0][i] < num12){
											num12 = objArray[0][i];
											num8 = i;
										}
									}
									if(num9 > num12){
										objArray[0][num8] = num9;
										objArray[1][num8] = index;
									}
								}
								index++;
							}
							var flag = true;
							for(index = 0;index < num13;index++){
								var v = objArray[0][index];
								if(v < DIS_POINTS){
									flag = false;
								}
								num10 += v * (SCoords[objArray[1][index]]).v;
								num11 += v;
							}
							numArray[num4][num5] = bCalAllGrids || flag? num10 / num11: unDefData;
						}
						num5++;
					}
				}
				if(bCalAllGrids){
					var num15 = 0.5;
					for(num4 = 1; num4 < num - 1; num4++){
						for(num5 = 1; num5 < length - 1; num5++){
							numArray[num4][num5] += (num15 / 4.0) *
							(((
								(numArray[num4 + 1][num5] + numArray[num4 - 1][num5])+
								numArray[num4][num5 + 1]
							)+numArray[num4][num5 - 1]) - (4.0 * numArray[num4][num5]));
						}
					}
				}
				var returnArr = [];
				numArray.forEach(function(v, num4){
					v.forEach(function(item, num5){
						var lnglat = lnglat_arr[num5][num4];
						lnglat.v = item;
					});
				});
				info('Interpolation_IDW_Neighbor takes '+(new Date() - time_start)+' ms!');
				return lnglat_arr;
			}

			T.on('init', function(d, arr, option){
				// var result = Interpolation_IDW_Neighbor(data,
				// 										lnglat_arr,
				// 										option.numOfNearest,
				// 										option.default_val,
				// 										option.interpolation_all);

				var result = {name: 'tonny'};
				emit('info', 'tonny say hello');
				emit('data', null, result);
				emit('end');
			});
		})({}, cb);
	};
}()

!function(){
	var util = require('../util');
	var Async = util.Async;
	var cb_info;
	var interpolate = function(data, lnglat_arr, option, cb){
		if (util.isFunction(option)) {
			cb = option;
			option = null;
		}
		Async.init(function(){
			var T = thread;
			var emit = T.emit;
			function info(msg){
				emit('info', JSON.stringify(msg));
			}
			var DIS_POINTS = 0.5;
			function Interpolation_IDW_Neighbor(SCoords, lnglat_arr, NumberOfNearestNeighbors, unDefData, bCalAllGrids){
				var time_start = new Date();
				var num4,num5;
				var length = lnglat_arr.length,	//获取X数组大小
					num = lnglat_arr[0].length,	//获取Y数组大小
					num3 = SCoords.length,		//获取SCoords二维数组第二维长度
					numArray = [],
					num13 = NumberOfNearestNeighbors,
					numArray2 = new Array(num3),
					objArray = [[],[]];
				info('Interpolation_IDW_Neighbor: '+ 'dataLen = '+num3+', lnglatLen = '+ length*num);
				for(num4 = 0; num4 < num; num4++){
					num5 = 0;
					while( num5 < length ){
						var num9;
						if(!numArray[num4]){
							numArray[num4] = [];
						}
						numArray[num4][num5] = unDefData;
						var num10 = num11 = 0;
						var num14 = index = 0;
						while(index < num3){
							var d = SCoords[index];
							var val = d.v;
							if(val == unDefData){
								numArray2[index] = -1;
							}else{
								var lnglat = lnglat_arr[num5][num4];
								var dis = Math.pow(lnglat.x-d.x, 2)+Math.pow(lnglat.y-d.y, 2);
								if(dis == 0){
									numArray[num4][num5] = val;
									break;
								}
								num9 = 1/dis;
								numArray2[index] = num9;
								if(num14 < num13){
									objArray[0][num14] = num9;
									objArray[1][num14] = index;
								}
								num14++;
							}
							index++;
						}
						if(numArray[num4][num5] == unDefData){
							index = 0;
							while(index < num3){
								num9 = numArray2[index];
								if(num9 != -1){
									var num12 = objArray[0][0];
									var num8 = 0;
									for(var i = 1; i<num13; i++){
										if(objArray[0][i] < num12){
											num12 = objArray[0][i];
											num8 = i;
										}
									}
									if(num9 > num12){
										objArray[0][num8] = num9;
										objArray[1][num8] = index;
									}
								}
								index++;
							}
							var flag = true;
							for(index = 0;index < num13;index++){
								var v = objArray[0][index];
								if(v < DIS_POINTS){
									flag = false;
								}
								num10 += v * (SCoords[objArray[1][index]]).v;
								num11 += v;
							}
							numArray[num4][num5] = bCalAllGrids || flag? num10 / num11: unDefData;
						}
						num5++;
					}
				}
				if(bCalAllGrids){
					var num15 = 0.5;
					for(num4 = 1; num4 < num - 1; num4++){
						for(num5 = 1; num5 < length - 1; num5++){
							numArray[num4][num5] += (num15 / 4.0) *
							(((
								(numArray[num4 + 1][num5] + numArray[num4 - 1][num5])+
								numArray[num4][num5 + 1]
							)+numArray[num4][num5 - 1]) - (4.0 * numArray[num4][num5]));
						}
					}
				}
				var returnArr = [];
				numArray.forEach(function(v, num4){
					v.forEach(function(item, num5){
						var lnglat = lnglat_arr[num5][num4];
						lnglat.v = item;
					});
				});
				info('Interpolation_IDW_Neighbor takes '+(new Date() - time_start)+' ms!');
				return lnglat_arr;
			}

			T.on('init', function(param){
				info('init idw');
				try{
					param = JSON.parse(param);
					var data = param.data,
						lnglat_arr = param.arr,
						option = param.option;

					var result = Interpolation_IDW_Neighbor(data,
															lnglat_arr,
															option.numOfNearest,
															option.default_val,
															option.interpolation_all);
					emit('data', null, JSON.stringify(result));
				}catch(e){
					emit('info', e.stack);
				}
			});

		}, cb_info)({
			data: data,
			arr: lnglat_arr,
			option: util.extend({
				numOfNearest: 3,
				default_val: 999999,
				interpolation_all: true
			}, option)
		}, cb);
	}

	interpolate.info = function(cb){
		cb_info = cb;
	}
	module.exports = interpolate;
}()
