!function(global){
	var nwrequire = global.require;
	var Core = {};
	Core.require = nwrequire;
	Core.Lib = nwrequire('core');
	var conf = Core.Lib.conf;

	var gui = nwDispatcher.requireNwGui(),// replace require('nw.gui')
		Window = gui.Window,
		win = Window.get();
	win.focus();

	!function(){
		var DIRNAME_RE = /[^?#]*\//
		function dirname(path) {
		  return path.match(DIRNAME_RE)[0]
		}
		
		var DOT_RE = /\/\.\//g;
		var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//;
		function realpath(path) {
		  // /a/b/./c/./d ==> /a/b/c/d
		  path = path.replace(DOT_RE, "/")

		  // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
		  while (path.match(DOUBLE_DOT_RE)) {
		    path = path.replace(DOUBLE_DOT_RE, "/")
		  }

		  return path
		}

		var ABSOLUTE_RE = /^\/\/.|:\//;
		var ROOT_DIR_RE = /^.*?\/\/.*?\//;
		// 得到相对路径
		function resolve(id,refUri){
			var ret
			var first = id.charAt(0)

			// Absolute
			if (ABSOLUTE_RE.test(id)) {
				ret = id
			}
			// Relative
			else if (first === ".") {
				ret = realpath((refUri ? dirname(refUri) : data.cwd) + id)
			}
			// Root
			else if (first === "/") {
				var m = data.cwd.match(ROOT_DIR_RE)
				ret = m ? m[0] + id.substring(1) : id
			}
			// Top-level
			else {
				ret = data.base + id
			}

			return ret
		}
		Core.Path = {
			dirname: dirname,
			realpath: realpath,
			resolve: resolve
		}
	}();

	/*时间格式化*/
	Date.prototype.format = function(format,is_not_second){
		format || (format = 'yyyy-MM-dd hh:mm:ss');
		var o = {
			"M+" : this.getMonth()+1, //month
			"d+" : this.getDate(),    //day
			"h+" : this.getHours(),   //hour
			"m+" : this.getMinutes(), //minute
			"q+" : Math.floor((this.getMonth()+3)/3),  //quarter
		}
		if(!is_not_second){
			o["s+"] = this.getSeconds(); //second
			o["S"] = this.getMilliseconds() //millisecond
		}
		if(/(y+)/.test(format)){
			format = format.replace(RegExp.$1,(this.getFullYear()+"").substr(4 - RegExp.$1.length));
		} 
		for(var k in o){
			if(new RegExp("("+ k +")").test(format)){
				format = format.replace(RegExp.$1,RegExp.$1.length==1 ? o[k] :("00"+ o[k]).substr((""+ o[k]).length));
			}
		}
		
		return format;
	}
	var $header = $('head');
	// 可以解决模块依赖css问题
	Core.Html = {
		addLink: function(link_src){
			$('<link rel="stylesheet" type="text/css" href="'+link_src+'">').appendTo($header);
		},
		addScript: function(script_src,is_sync,callback){
			if(is_sync){
				document.write('<script src="'+script_src+'"></'+'script>');
				callback && callback();
			}else{
				$('<script>').on('load',callback).appendTo('body').attr('src',script_src);
			}
		}
	}

	var Store = (function(){
		var store = localStorage;
		var prefix = 'w_';
		var formateName = function(name){
			return prefix+name;
		}
		var _localstorage = {
			set: function(name,val){
				if(val === undefined || val === null){
					return _localstorage.rm(name);
				}
				try {
	                var json = JSON.stringify(val);
	                store.setItem(formateName(name),json);
	                return true;
	            } catch (e) {console.log(e);}
			},
			get: function(name,default_val){
				var val = localStorage[formateName(name)];
				if(val != undefined && val != null){
					try{val = JSON.parse(val);}catch(e){
						console.log(e);
					}
					return val;
				}else{
					return default_val;
				}
			},
			rm: function(name){
				name = formateName(name);
				if(name){
					store.removeItem(name);
				}else{
					store.clear();
				}
			},
			rmAll: function(){
				for(var i in store){
					if(i.indexOf(prefix) == 0){
						store.removeItem(i);
					}
				}
			}
		}
		return _localstorage;
	})();
	Core.Store = Store;
	/*自定义系统级错误*/
	!function(){
		var fn_error = function(e){
			console.log('sysErr',e.stack);
			return false;
		}
		process.on('uncaughtException',fn_error);
		window.onerror = fn_error;
	}();
	
	Core.safe = function(auto_fn){
		try{
			auto_fn();
		}catch(e){
			console.log(e,e.stack);
		};
	}
	
	var conf_gui_window = gui.App.manifest.window;
	/*按指定文件加载页面*/
	function _open(page_name){
		var win = Window.open('./'+page_name+'.html',$.extend({},conf_gui_window,conf.get('view_'+page_name)));
		win.on('close',function(){
			win.emit('beforeclose');
			win.removeAllListeners();
			this.close(true);
		})
		return win;
	}
	/*保证只打开一个相同名的窗体*/
	var _open_only_win = (function (){
		var _win_cache = {};
		return function(name,callback){
			var _win = _win_cache[name];
			if(_win){
				_win.focus_flag = true;
				_win.focus();
			}else{
				_win = _open(name);
				if(callback){
					_win.on('loaded',function(e){
						callback.call(_win,e);
					});
					_win.on('focus',function(){
						if(_win.focus_flag){
							_win.focus_flag = false;
							callback.call(_win,e);
						}
					});
				}
				
				_win.on('beforeclose',function(){
					delete _win_cache[name];
					_win.removeAllListeners();
					_win = null;
				});
				
				_win_cache[name] = _win;
			}
			return _win;
		}
	})();
	/*窗体页面相关操作*/
	Core.Page = {
		inited: function(data){
			win.emit('inited',data);
		},logout: function(callback){
			Store.rm('user_pwd');
			var win_login = _open('login',callback);
			win.close();
			return win_login;
		},
		main: function(callback){
			return _open_only_win('main',callback);
		},
		addProduct: function(callback){
			return _open_only_win('m_addproduct',callback);
		},
		confProduct: function(callback){
			return _open_only_win('m_confproduct',callback);
		},
		setting: function(callback){
			return _open_only_win('m_setting',callback);
		},
		textStyle: function(callback){
			return _open_only_win('m_text_style',callback);
		}
	}
	/*常量*/
	Core.Const = conf.get('const');
	Core.Const.Event = {
		'GEOMAP_INITED': '0',
		'PRODUCT_CHANGE': '1'
	};
	var $doc = $(document);
	var message_listeners = [];
	
	/*window相关操作*/
	var CoreWindow = {
		get: function(){
			return win;
		},
		getGui: function(){
			return gui;
		},
		close: function(){
			win.close();
		},
		/*给当前window添加message事件，用于和其它窗体通信*/
		onMessage: function(onmessage,isClearAllEvent){
			if(isClearAllEvent){
				CoreWindow.offMessage();
			}
			if(message_listeners.indexOf(onmessage) == -1){
				message_listeners.push(onmessage);
				win.window.addEventListener('message', onmessage);
			}
		},
		/*移除当前window的message事件*/
		offMessage: function(listener){
			var arr = [];
			if(listener){
				arr = listener;
				var index = message_listeners.indexOf(onMessage);
				if(index > -1){
					message_listeners.splice(index,1);
				}
			}else{
				arr = message_listeners.splice();
			}
			$.each(arr,function(i,v){
				win.window.removeEventListener('message', v);
			});
		},
		/*向指定window发送消息,
			用法： Core.Window.sendMsg.call(window,'msg')
		*/
		sendMsg: function(type,data,_win){
			_win || (_win = this);
			_win.postMessage({
				type: type,
				data: data
			},location.origin);
		},
		onKeyEnter: function(onKeyEnter){
			$doc.off('keypress').on('keypress',function(e){
				if(e.which == 13){
					onKeyEnter && onKeyEnter();
				}
			});
		}
	}
	/*窗体关闭的时候清空相关数据及事件*/
	win.on('close',function(){
		this.hide(); // Pretend to be closed already
		CoreWindow.offMessage();
		this.close(true);
	});
	Core.Window = CoreWindow;

	/*颜色转换*/
	!function(){
		var REG_RGB = /rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/;
		function to16(num){
			var str16 = Number(num).toString(16);
			return (str16.length == 1? '0':'')+str16;
		}
		function color_rgb2normal(color_rgb){
			if(color_rgb){
				var m = REG_RGB.exec(color_rgb);
				if(m){
					return '#'+to16(m[1])+to16(m[2])+to16(m[3]);
				}else if(REG_HTML.test(color_rgb)){
					return color_rgb;
				}
			}
		}
		var REG_HTML = /#([\da-f]{2})([\da-f]{2})([\da-f]{2})/
		function color_normal2rgb(color_html,isReturnArray){
			if(color_html){
				var m = REG_HTML.exec(color_html);
				if(m){
					var arr = [parseInt(m[1],16),parseInt(m[2],16),parseInt(m[3],16)];

					if(isReturnArray){
						return arr;
					}
					return 'rgb('+(arr.join(','))+')';
				}else{
					var m = REG_RGB.exec(color_html);
					if(m){
						if(isReturnArray){
							m.shift();
							return m;
						}else{
							return color_html;
						}
					}
				}
			}
		}
		Core.Color = {
			toRGB: color_normal2rgb,
			toHTML: color_rgb2normal
		}
	}();
	Core.util = {
		isImg: function is_img(file_path){
			return /\.(jpg|bmp|gif|png)$/i.test(file_path)
		}
	}
	!function(){
		var cache_log_time = {};

		var Logger = {
			log: function(){
				console.log.apply(console, arguments);
			}
		};
		var PREFIX_LEVEL = ['', '# ', '## '];
		Logger.Timer = {
			start: function(name){
				cache_log_time[name] = new Date();
			}, 
			end: function(name, level){
				level = parseInt(level) || 0;
				if(!(level >=0 && level < PREFIX_LEVEL.length)){
					level = 0;
				}
				var start_time = cache_log_time[name];
				if(start_time){
					var end_time = new Date();
					var used_time = end_time - start_time;
					Logger.log(PREFIX_LEVEL[level]+''+name, 'takes', used_time, 'ms!');
					delete cache_log_time[name];
					return used_time;
				}
			}
		};
		Core.util.Logger = Logger;
	}();
	global.Core = Core;
}(this);