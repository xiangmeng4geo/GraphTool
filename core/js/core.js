!function(global){
	var nwrequire = require;
	var conf = nwrequire('core').conf;
	var Core = {};

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
	var $header = $('head');
	// 可以解决模块依赖css问题
	Core.Style = {
		addLink: function(link_src){
			$('<link rel="stylesheet" type="text/css" href="'+link_src+'">').appendTo($header);
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

	var gui = nwrequire('nw.gui'),
		Window = gui.Window,
		win = Window.get();
	/*按指定文件加载页面*/
	function _open(page_name){
		var win = Window.open('./'+page_name+'.html',conf.get('view_'+page_name));
		win.on('close',function(){
			win.emit('beforeclose');
			win.removeAllListeners();
			this.close(true);
		})
		return win;
	}
	var _open_only_win = (function (){
		var _win_cache = {};
		return function(name){
			var _win = _win_cache[name];
			if(_win){
				_win.focus();
			}else{
				_win = _open(name);
				_win.on('beforeclose',function(){
					_win = null;
					delete _win_cache[name];
				});
				_win_cache[name] = _win;
			}
			return _win;
		}
	})();
	Core.Page = {
		inited: function(data){
			win.emit('inited',data);
		},logout: function(){
			Store.rm('user_pwd');
			var win_login = _open('login');
			win.close();
			return win_login;
		},
		addProduct: function(){
			return _open_only_win('m_addproduct');
		},
		confProduct: function(){
			return _open_only_win('m_confproduct');
		},
		setting: function(){
			return _open_only_win('m_setting');
		}
	}
	Core.Const = {
		msgType: {
			ADD_PRODUCT: 'addProduct'
		},
		productType: {
			TYPE: {
				n: '分类',
				v: 1
			},
			PRODUCT: {
				n: '产品',
				v: 2
			}
		}
	}
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
		sendMsg: function(data){
			this.postMessage(data,location.origin);
		},
		onKeyEnter: function(onKeyEnter){
			$doc.off('keypress').on('keypress',function(e){
				if(e.which == 13){
					onKeyEnter && onKeyEnter();
				}
			});
		}
	}
	win.on('close',function(){
		this.hide(); // Pretend to be closed already
		CoreWindow.offMessage();
		this.close(true);
	});
	Core.Window = CoreWindow;
	global.Core = Core;
}(this);