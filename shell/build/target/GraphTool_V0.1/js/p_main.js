!function(){function e(){clearTimeout(s),s=setTimeout(function(){u.css({width:h.width()-300+10,height:h.height()-u.offset().top})},10)}var n=!0,t=Core.require("core"),i=(t.conf,Core.Page),o=Core.Lib.conf.User,c=Core.Window,d=Core.Const,r=d.msgType,a=d.Event,l=$(document);$("#btn_quite").click(function(){i.logout()}),$("#btn_setting").click(i.setting);var s,h=(function(){function e(n,t){void 0!=t?t+="_":t="",void 0!=t||(t="r");var i=[];return $.each(n,function(n,o){var c=t+n,d=o.childNodes&&o.childNodes.length>0,r={id:c,text:o.name,showcheck:!1,complete:!0,isexpand:!1,checkstate:0,hasChildren:d};d&&(r.ChildNodes=e(o.childNodes,c)),i.push(r)}),i}function t(){var t;if(v)var i=e(v);n?(t={id:"root",text:"根目录",showcheck:!1,complete:!0,isexpand:!0,checkstate:0,hasChildren:!!i},i&&(t.ChildNodes=i),t=[t]):t=i,g.treeview({data:t,showcheck:!1,cbiconpath:"img/jquery.tree/",onnodecontextmenu:function(e,t){p=t,n&&(x.enabled=!p.ChildNodes||0==p.ChildNodes.length),N.items.length>0&&N.popup(e.clientX,e.clientY)},onnodedblclick:function(e,n){l.trigger(a.PRODUCT_CHANGE,n.text)}})}function d(){o.setTree(JSON.stringify(v))}function s(){if(v){var e,n=p.id.split("_");return $.each(n,function(n,t){e=0==n?v[t]:e.childNodes[t]}),e}}function h(){if(confirm('确定要删除"'+p.text+'"吗？')){for(var e=p.id.split("_"),n=e.length,i="",o=0;n>o;o++)0!=o&&(i+='["childNodes"]'),i+=o==n-1?".splice("+e[o]+",1)":"["+e[o]+"]";new Function("this"+i).call(v),t(),d()}}function u(e,n){if(n){if(n.name==e)return!0;var t=n.childNodes;if(t)for(var i=0,o=t.length;o>i;i++){var c=t[i];return u(e,c)}}}function u(e,n){if(n)for(var t=0,i=n.length;i>t;t++){var o=n[t];if(e==o.name)return!0;var c=o.childNodes;if(c&&u(e,c))return!0}}function f(e){return u(e,v)?!0:void 0}var p,v=o.getTree(),g=$("#tree");t(),c.onMessage(function(n){var i=n.data,c=i.type;if(r.ADD_PRODUCT==c){i=i.data;var a=(i.type,i.name),l=s(),h={name:a};l?f(a)?alert("名称为“"+a+"”的产品已经存在，添加会把以前配置文件覆盖,系统将放弃本次操作！"):i.is_modify?(l.childNodes||o.rename(l.name,a),l.name=a):(l.childNodes||(l.childNodes=[]),l.childNodes.push(h)):(v||(v=[]),v.push(h)),data_tree=e(v),t(),d()}});var m=c.getGui(),w=m.Menu,C=m.MenuItem;$("title").text(m.App.manifest.description);var N=new w;if(n){var b=new w,k=new C({label:"修改"}),_=new C({label:"添加"}),x=new C({label:"删除"});k.on("click",function(){var e=i.addProduct(function(){c.sendMsg(r.ADD_PRODUCT,{name:p.text},e.window)})}),_.on("click",i.addProduct),x.on("click",h),b.append(_),b.append(k),b.append(x),N.append(new C({label:"管理",submenu:b})),N.append(new C({type:"separator"}))}var T=$("#geomap"),D=new C({label:"产品配置"});D.on("click",function(){var e=i.confProduct(function(){c.sendMsg(r.CONF_PRODUCT,{name:p.text,width:T.width(),height:T.height()},e.window)})}),N.append(D)}(),$(window)),u=$("#c_right");e(),h.on("resize",e),i.inited()}();