!function(e){e.fn.swapClass=function(e,t){return this.removeClass(e).addClass(t)},e.fn.switchClass=function(e,t){return this.hasClass(e)?this.swapClass(e,t):this.swapClass(t,e)},e.fn.treeview=function(t){function i(e,t){if(t.push("<div class='bbit-tree-bwrap'>"),t.push("<div class='bbit-tree-body'>"),t.push("<ul class='bbit-tree-root ",w.theme,"'>"),e&&e.length>0)for(var i=e.length,n=0;i>n;n++)s(e[n],t,0,n,n==i-1);else b(null,!1,function(e){if(e&&e.length>0){k=e,w.data=e;for(var i=e.length,n=0;i>n;n++)s(e[n],t,0,n,n==i-1)}});t.push("</ul>"),t.push("</div>"),t.push("</div>")}function s(e,t,i,n,l,a){var r=e.id.replace(/[^\w]/gi,"_");t.push("<li class='bbit-tree-node'>"),t.push("<div id='",x,"_",r,"' tpath='",n,"' unselectable='on' title='",e.text,"'");var o=[];if(o.push("bbit-tree-node-el"),o.push(e.hasChildren?e.isexpand?"bbit-tree-node-expanded":"bbit-tree-node-collapsed":"bbit-tree-node-leaf"),e.classes&&o.push(e.classes),t.push(" class='",o.join(" "),"'>"),t.push("<span class='bbit-tree-node-indent'>"),1==i)t.push("<img class='bbit-tree-icon' src='"+w.cbiconpath+"s.gif'/>");else if(i>1){t.push("<img class='bbit-tree-icon' src='"+w.cbiconpath+"s.gif'/>");for(var c=1;i>c;c++)t.push("<img class='bbit-tree-elbow-line "+(l&&a?"bbit-tree-elbow-line-end":"")+"' src='"+w.cbiconpath+"/s.gif'/>")}if(t.push("</span>"),o.length=0,o.push(e.hasChildren?e.isexpand?l?"bbit-tree-elbow-end-minus":"bbit-tree-elbow-minus":l?"bbit-tree-elbow-end-plus":"bbit-tree-elbow-plus":l?"bbit-tree-elbow-end":"bbit-tree-elbow"),t.push("<img class='bbit-tree-ec-icon ",o.join(" "),"' src='"+w.cbiconpath+"s.gif'/>"),t.push("<img class='bbit-tree-node-icon' src='"+w.cbiconpath+"s.gif'/>"),w.showcheck&&e.showcheck&&((null==e.checkstate||void 0==e.checkstate)&&(e.checkstate=0),t.push("<img  id='",x,"_",r,"_cb' class='bbit-tree-node-cb' src='",w.cbiconpath,w.icons[e.checkstate],"'/>")),t.push("<a hideFocus class='bbit-tree-node-anchor' tabIndex=1 href='javascript:void(0);'>"),t.push("<span unselectable='on'>",e.text,"</span>"),t.push("</a>"),t.push("</div>"),e.hasChildren)if(e.isexpand){if(t.push("<ul  class='bbit-tree-node-ct'  style='z-index: 0; position: static; visibility: visible; top: auto; left: auto;'>"),e.ChildNodes)for(var d=e.ChildNodes.length,h=0;d>h;h++)e.ChildNodes[h].parent=e,s(e.ChildNodes[h],t,i+1,n+"."+h,h==d-1);t.push("</ul>")}else t.push("<ul style='display:none;'></ul>");t.push("</li>"),e.render=!0}function n(e){for(var t=e.split("."),i=k,s=0;s<t.length;s++)i=0==s?i[t[s]]:i.ChildNodes[t[s]];return i}function l(t,i,s){var n=t.checkstate;if(1==s)t.checkstate=i;else{for(var l=t.ChildNodes,a=l.length,r=!0,o=0;a>o;o++)if(1==i&&1!=l[o].checkstate||0==i&&0!=l[o].checkstate){r=!1;break}t.checkstate=r?i:2}if(t.render&&n!=t.checkstate){var c=t.id.replace(/[^\w]/gi,"_"),d=e("#"+x+"_"+c+"_cb");1==d.length&&d.attr("src",w.cbiconpath+w.icons[t.checkstate])}}function a(e,t,i){if(0!=e(t,i,1)&&null!=t.ChildNodes&&t.ChildNodes.length>0)for(var s=t.ChildNodes,n=0,l=s.length;l>n;n++)a(e,s[n],i)}function r(e,t,i){for(var s=t.parent;s&&e(s,i,0)!==!1;)s=s.parent}function o(t,i,s){if(w.citem){var n=w.citem.id.replace(/[^\w]/gi,"_");e("#"+x+"_"+n).removeClass("bbit-tree-selected")}w.citem=i,e(this).addClass("bbit-tree-selected"),s&&(i.expand||(i.expand=function(){d.call(i)}),s.call(this,i,t))}function c(t){var i=e(this).attr("tpath"),s=t.target||t.srcElement,c=n(i);if("IMG"==s.tagName){if(e(s).hasClass("bbit-tree-elbow-plus")||e(s).hasClass("bbit-tree-elbow-end-plus")){var d=e(this).next();if(d.hasClass("bbit-tree-node-ct"))d.show();else{var u=i.split(".").length;c.complete?null!=c.ChildNodes&&h(c.ChildNodes,u,i,d,c):(e(this).addClass("bbit-tree-node-loading"),b(c,!0,function(e){c.complete=!0,c.ChildNodes=e,h(e,u,i,d,c)}))}e(s).hasClass("bbit-tree-elbow-plus")?e(s).swapClass("bbit-tree-elbow-plus","bbit-tree-elbow-minus"):e(s).swapClass("bbit-tree-elbow-end-plus","bbit-tree-elbow-end-minus"),e(this).swapClass("bbit-tree-node-collapsed","bbit-tree-node-expanded")}else if(e(s).hasClass("bbit-tree-elbow-minus")||e(s).hasClass("bbit-tree-elbow-end-minus"))e(this).next().hide(),e(s).hasClass("bbit-tree-elbow-minus")?e(s).swapClass("bbit-tree-elbow-minus","bbit-tree-elbow-plus"):e(s).swapClass("bbit-tree-elbow-end-minus","bbit-tree-elbow-end-plus"),e(this).swapClass("bbit-tree-node-expanded","bbit-tree-node-collapsed");else if(e(s).hasClass("bbit-tree-node-cb")){var p=1!=c.checkstate?1:0,f=!0;w.oncheckboxclick&&(f=w.oncheckboxclick.call(s,c,p)),0!=f&&(w.cascadecheck?(a(l,c,p),r(l,c,p)):l(c,p,1))}}else o.call(this,t,c,w.onnodeclick)}function d(){var t=this,i=t.id.replace(/[^\w]/gi,"_"),s=e("#"+x+"_"+i+" img.bbit-tree-ec-icon");s.length>0&&s.click()}function h(e,t,i,n,l){var a=e.length;if(a>0){for(var r=[],o=0;a>o;o++)e[o].parent=l,s(e[o],r,t,i+"."+o,o==a-1);n.html(r.join("")),r=null,f(n)}n.addClass("bbit-tree-node-ct").css({"z-index":0,position:"static",visibility:"visible",top:"auto",left:"auto",display:""}),n.prev().removeClass("bbit-tree-node-loading")}function b(t,i,s){if(w.url){if(t&&null!=t)var n=u(t);e.ajax({type:w.method,url:w.url,data:n,async:i,dataType:w.datatype,success:s,error:function(){alert("error occur!")}})}}function u(e){var t=[{name:"id",value:encodeURIComponent(e.id)},{name:"text",value:encodeURIComponent(e.text)},{name:"value",value:encodeURIComponent(e.value)},{name:"checkstate",value:e.checkstate}];return t}function p(){e(this).hover(function(){e(this).addClass("bbit-tree-node-over")},function(){e(this).removeClass("bbit-tree-node-over")}).click(c).on("dblclick",function(t){t.preventDefault();var i=e(this).attr("tpath"),s=n(i);return w.onnodedblclick&&w.onnodedblclick.call(this,t,s),!1}).on("contextmenu",function(t){t.preventDefault(),I=t.target;var i=e(this).attr("tpath"),s=n(i);return w.onnodecontextmenu&&w.onnodecontextmenu.call(this,t,s),o.call(this,t,s),!1}).find("img.bbit-tree-ec-icon").each(function(){e(this).hasClass("bbit-tree-elbow")||e(this).hover(function(){e(this).parent().addClass("bbit-tree-ec-over")},function(){e(this).parent().removeClass("bbit-tree-ec-over")})})}function f(t){var i=e("li.bbit-tree-node>div",t);i.each(p)}function v(t){var i=t.replace(/[^\w-]/gi,"_"),l=e("#"+x+"_"+i);if(l.length>0){l.addClass("bbit-tree-node-loading");var a=l.hasClass("bbit-tree-elbow-end")||l.hasClass("bbit-tree-elbow-end-plus")||l.hasClass("bbit-tree-elbow-end-minus"),r=l.attr("tpath"),o=r.split(".").length,c=n(r);c&&b(c,!0,function(e){c.complete=!0,c.ChildNodes=e,c.isexpand=!0,c.hasChildren=e&&e.length>0?!0:!1;var t=[];s(c,t,o-1,r,a),t.shift(),t.pop();var i=l.parent();i.html(t.join("")),t=null,f(i),p.call(i.find(">div"))})}}function C(e,t,i){for(var s=0,n=e.length;n>s;s++)1==e[s].showcheck&&1==e[s].checkstate&&t.push(i(e[s])),null!=e[s].ChildNodes&&e[s].ChildNodes.length>0&&C(e[s].ChildNodes,t,i)}function g(e,t,i){for(var s=0,n=e.length;n>s;s++)1==e[s].showcheck&&(1==e[s].checkstate||2==e[s].checkstate)&&t.push(i(e[s])),null!=e[s].ChildNodes&&e[s].ChildNodes.length>0&&g(e[s].ChildNodes,t,i)}function m(){}var w={method:"POST",datatype:"json",url:!1,cbiconpath:"img/",icons:["checkbox_0.gif","checkbox_1.gif","checkbox_2.gif"],showcheck:!1,oncheckboxclick:!1,onnodeclick:!1,onnodecontextmenu:!1,cascadecheck:!0,data:null,clicktoggle:!0,theme:"bbit-tree-arrows"};e.extend(w,t);var k=w.data,N=e(this),x=N.attr("id");(null==x||""==x)&&(x="bbtree"+(new Date).getTime(),N.attr("id",x));var _=[];if(i(w.data,_),N.addClass("bbit-tree").html(_.join("")),f(N),_=null,w.showcheck)for(var y=0;3>y;y++){var j=new Image;j.src=w.cbiconpath+w.icons[y]}var I;return N[0].t={getSelectedNodes:function(e){var t=[];return e?g(k,t,function(e){return e}):C(k,t,function(e){return e}),t},getSelectedValues:function(){var e=[];return C(k,e,function(e){return e.value}),e},getCurrentItem:function(){return w.citem},reflash:function(e){var t;t="string"==typeof e?e:e.id,v(t)},getTreeNodes:function(){return k},addNode:function(t){var i=this.getCurrentItem()||n("0"),l=i.hasChildren,a=i.id.replace(/[^\w]/gi,"_"),r=e("#"+x+"_"+a),o=r.attr("tpath");l?o+="."+(i.ChildNodes.length+1):(i.ChildNodes=[],o+=".0"),t.id=o.replace(/\./g,"_"),i.hasChildren=!0,t.parent=i,i.ChildNodes.push(t);var r=r.parent(),c=0==r.next(".bbit-tree-node").length,d=[];s(t,d,o.split(".").length-1,o,!0,c),d=d.join(""),r.find(".bbit-tree-ec-icon").removeClass("bbit-tree-elbow-end bbit-tree-elbow").addClass("bbit-tree-elbow-end-minus"),l?r.find(">ul").append(d):(d="<ul class='bbit-tree-node-ct'  style='z-index: 0; position: static; visibility: visible; top: auto; left: auto;'>"+d+"</ul>",r.append(d)),m(),f(r)},rmNode:function(t){var i=t.replace(x+"_","").replace(/[^\w]/gi,"_"),s=e("#"+x+"_"+i);s.parent().remove();var l=i.replace(/_/g,"."),a=n(l),r=a.parent;if(r.ChildNodes.length<=1)r.isHaveChildren=!1,r.ChildNodes=[];else for(var o=0,c=r.ChildNodes,d=c.length;d>o;o++){var h=c[o].id.replace(/[^\w]/gi,"_");if(h==i){c.splice(o,1);break}}m()}},N},e.fn.getCheckedNodes=function(){return this[0].t?this[0].t.getSelectedValues():null},e.fn.getTSNs=function(e){return this[0].t?this[0].t.getSelectedNodes(e):null},e.fn.getCurrentNode=function(){return this[0].t?this[0].t.getCurrentItem():null},e.fn.reflash=function(e){return this[0].t?this[0].t.reflash(e):void 0},e.fn.getTreeNodes=function(){return this[0].t?this[0].t.getTreeNodes():void 0},e.fn.addNode=function(e){return this[0].t?this[0].t.addNode(e):void 0},e.fn.rmNode=function(e){return this[0].t?this[0].t.rmNode(e):void 0},e.fn.getFirstSubItem=function(){return e(this).find(".bbit-tree-node-leaf:first")};var t=e("script").last().attr("src");Core.Html.addLink(Core.Path.resolve("../../c/j.tree/tree.gtc",t))}(jQuery);