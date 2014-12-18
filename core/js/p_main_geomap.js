Core.safe(function(){
	var fileLocation= '../../../git_project/GeoMap_projection/src/zrender'
	var developmod = true;
	if(developmod){
		require.config({
	        packages: [
	            {
	                name: 'zrender',
	                location: '../../../git_project/zrender-2.0.5/src/',
	                main: 'zrender'
	            }
	        ],
	        paths: {
	        	'GeoMap': 'js/libs/GeoMap'
	        }
	    });
	}else{
		require.config({
	        paths:{
	            'zrender': fileLocation,
	            'zrender/shape/Base': fileLocation,
	            'zrender/shape/BrokenLine': fileLocation,
	            'zrender/shape/Polygon': fileLocation,
	            'zrender/Group': fileLocation,
	            'zrender/tool/util': fileLocation,
	            'GeoMap': 'js/libs/GeoMap'
	        }
	    });
	}
	var gm;
	var initing = false;
	function init(is_show_mask){
		initing = true;
		require(['GeoMap'],function(GeoMap){
			window.GeoMap = GeoMap;
			gm = new GeoMap({
				container: '#geomap'
			});
			var Color = ['red','blue','#000','#123','#f26','#ccc','#333'];
			
			var china_json = '../../../git_project/GeoMap/json/china_mask.geo.json';
			china_json1 = '../shell/data/china_mask.geo.meractor.json';
			china_json = '../shell/data/china_province.meractor.json';
			gm.loadGeo([china_json1,china_json],{
				style: {
					color: '#F5F3F0',
					maskColor: 'white'
				},
				is_show_mask: is_show_mask
			},function(){
				var data_url = 'http://10.14.85.116/nodejs_project/micaps/data/micaps/14/rr111314.024.json';
				$.getJSON(data_url,function(data){
					$.each(data.areas,function(i,v){
						var point_arr = [];
						$.each(v.items,function(v_i,v_v){
							var point = new GeoMap.Point(v_v.x,v_v.y);
							point_arr.push(point);
						});
						var radom_color = Color[Math.floor(Math.random()*Color.length)];
						var strokeColor = 'rgba(0,0,0,0)';
						if(v.code == 24){
							strokeColor = 'red';
							radom_color = new GeoMap.Pattern.Streak({
								strokeStyle: strokeColor,
								space: 2
							});

						}
						var polygon = new GeoMap.Polygon(point_arr, {
							style: {
								strokeColor: strokeColor, 
								color: radom_color,
								fillOpacity: 0.9, 
								strokeWeight: 1, 
								strokeOpacity:1
							}
						});
						gm.addOverlay(polygon);   //增加面
					});

					var line_symbols = data.line_symbols;
					if(line_symbols){
						$.each(line_symbols,function(i,v){
							if(v.code == 0){
								return;
							}
							var point_arr = [];
							$.each(v.items,function(v_i,v_v){
								var point = new GeoMap.Point(v_v.x, v_v.y);
								point_arr.push(point);
							});
							var polyline = new GeoMap.Polyline(point_arr,{
								style: {
									strokeColor : 'blue',
									lineWidth : 2,
								}
							});
							gm.addOverlay(polyline);   //增加折线
						});
					}
					initing = false;
				});
			});
		});
	}
	init();
	$('#geomap').on('contextmenu',function(e){
		var $this = $(this);
		var menu_map = $this.data('menu');
		if(!menu_map){
			var gui = Core.Window.getGui(),
				Menu = gui.Menu,
				MenuItem = gui.MenuItem;

			menu_map = new Menu();
			var menu_save_img = new MenuItem({ label: '导出图片' });
			menu_save_img.on('click',function(){
				if(gm){
					$('<input type="file" nwsaveas="a.png"  />').on('change',function(){
						var img_data = gm.toDataURL('image/png','white');
						img_data = img_data.substring(img_data.indexOf('base64,')+7);
						img_data = new Buffer(img_data, 'base64');
						Core.Lib.util.writeFile($(this).val(),img_data);
						$(this).remove();
					}).click();
				}
			});
			menu_map.append(menu_save_img);
			$this.data('menu',menu_map);
		}
		menu_map.popup(e.clientX, e.clientY);
	});
});