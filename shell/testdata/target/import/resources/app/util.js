!function(){function e(e){return c.existsSync(e)}function n(r,t){try{if(e(r)){var i=c.statSync(r);if(i.isDirectory()){var a=c.readdirSync(r);a.forEach(function(e){var t=o.join(r,e);c.statSync(t).isDirectory()?n(t):c.unlinkSync(t)}),!t&&c.rmdirSync(r)}else c.unlinkSync(r)}return!0}catch(s){}}function r(n){try{var t=o.dirname(n);return e(t)||r(t),e(n)||c.mkdirSync(n),!0}catch(i){}}function t(e,n){n||(n={});var r=n.is_not_recursive;if(c.existsSync(e)){var i=c.statSync(e);if(i.isDirectory()){var a=[],s=c.readdirSync(e),u=n.mtime;return s.sort().forEach(function(n){var i=o.join(e,n),s=c.statSync(i),f=s.isDirectory(),y={name:i,isDir:f};u&&(y.mtime=s.mtime),f&&(y.sub=r?[]:t(i)),a.push(y)}),a}}}function i(e,n,r){var t=require("remote"),i=t.require("dialog");i[e](t.getCurrentWindow(),n,r)}var o=require("path"),c=require("fs"),a=require("util"),s=o.join(require("os").homedir(),"BPA","GT"),u=o.join(s,"config"),f=o.join(__dirname,"data"),y=o.join(f,"config"),d=o.join(f,"data"),l=o.join(f,"geo");Date.prototype.format=Date.prototype.format||function(e,n){e||(e="yyyy-MM-dd hh:mm:ss");var r={"M{2}":this.getMonth()+1,"d{2}":this.getDate(),"h{2}":this.getHours(),"m{2}":this.getMinutes(),"q{2}":Math.floor((this.getMonth()+3)/3)};n||(r["s{2}"]=this.getSeconds(),r["S{2}"]=this.getMilliseconds()),/(y{4}|y{2})/.test(e)&&(e=e.replace(RegExp.$1,(this.getFullYear()+"").substr(4-RegExp.$1.length)));for(var t in r)new RegExp("("+t+")").test(e)&&(e=e.replace(RegExp.$1,1==RegExp.$1.length?r[t]:("00"+r[t]).substr((""+r[t]).length)));return e};var h={},g=function(e){var n=e.name,r=require("path"),t=require("app"),i=(require("electron"),require("browser-window")),o=t.makeSingleInstance(function(){var e=i.getAllWindows();if(e&&e.length>0){var n=e[0];n.setAlwaysOnTop(!0),n.restore(),n.focus(),n.setAlwaysOnTop(!1)}return!0});return o?void t.quit():(t.on("window-all-closed",function(){t.quit()}),void t.on("ready",function(){var t=new i({width:e.width||1e3,height:e.height||1e3,show:!0,autoHideMenuBar:!0});t.loadURL(r.join("file://",__dirname,n+".html")),t.show();var o=t.webContents;o.on("dom-ready",function(){var e='require("./'+n+'")';o.executeJavaScript(e)})}))},p=function(e,n){c.existsSync(n)?c.unlinkSync(n):r(o.dirname(n));for(var t=65536,i=new Buffer(t),a=c.openSync(e,"r"),s=c.openSync(n,"w"),u=1,f=0;u>0;)u=c.readSync(a,i,0,t,f),c.writeSync(s,i,0,u),f+=u;c.closeSync(a),c.closeSync(s)},m=function(e,n){function r(e){e&&0!=e.length&&e.forEach(function(e){e.isDir?r(e.sub):i[e.name]=1})}var i={};r(t(e));for(var o in i){var c=o,a=c.replace(e,n);p(c,a)}return!0};h.init=function(e,n){"renderer"==process.type?n&&n():g(e)},h.ui={},h.ui.checked=function(e,n){return a.isBoolean(n)?void e.prop("checked",n):e.prop("checked")},h.ui.dialog={alert:function(e,n){i("showMessageBox",{type:"info",buttons:["yes"],title:"\u7cfb\u7edf\u63d0\u793a",message:e,icon:null},n)}},h.getProductTree=function(){try{return require(o.join(u,".sys/sys_product_tree"))}catch(e){}},h.getSys=function(){try{return require(o.join(u,".sys/sys"))}catch(e){}},h.file={},h.file.write=function(e,n){r(o.dirname(e)),c.writeFileSync(e,n)},h.file.exists=e,h.file.copy=p,h.file.rm=n,h.file.copyDir=m;var f=o.join(__dirname,"data"),y=o.join(f,"config"),d=o.join(f,"data"),l=o.join(f,"geo");h.CONST={PATH_CONFIG_USER:u,PATH_DATA:f,PATH_DATA_CONFIG:y,PATH_DATA_DATA:d,PATH_DATA_GEOFILE:l},module.exports=h}();