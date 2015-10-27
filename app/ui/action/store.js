!function(){
	'use strict'
	
	var store = localStorage;
	
	const prefix = 'gt.';
	function _getName(name){
		return prefix+name;
	}
	function _set(name, val){
		if(val === undefined || val === null){
			return _rm(name);
		}
		try{
			val = JSON.stringify(val);
			store.setItem(_getName(name), val);
		}catch(e){}
	}
	function _get(name, val_default){
		let val = store.getItem(_getName(name));
		if(val !== undefined && val !== null){
			try{
				return JSON.parse(val);
			}catch(e){}
		}
		return val_default;
	}
	function _rm(name){
		name = _getName(name);
		if(name){
			store.removeItem(name);
		}else{
			_rmAll();
		}
	}
	function _rmAll(){
		for(var i in store){
			if(i.indexOf(prefix) === 0){
				store.removeItem(i);
			}
		}
	}
	var Store = {
		get: _get,
		set: _set,
		rm: _rm,
		rmAll: _rmAll
	}
	
	module.exports = Store;
}()