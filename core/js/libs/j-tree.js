/**
  * @description {Class} wdTree
  * This is the main class of wdTree.
  */
(function($) {
    $.fn.swapClass = function(c1, c2) {
        return this.removeClass(c1).addClass(c2);
    };
    $.fn.switchClass = function(c1, c2) {
        if (this.hasClass(c1)) {
            return this.swapClass(c1, c2);
        }
        else {
            return this.swapClass(c2, c1);
        }
    };
    $.fn.treeview = function(settings) {
        var dfop =
            {
                method: "POST",
                datatype: "json",
                /**
                 * @description {Config} url  
                 * {String} Url for child nodes retrieving. 
                 */
                url: false,
                /**
                 * @description {Config} cbiconpath  
                 * {String} Checkbox image path.
                 */
                cbiconpath: "img/",
                icons: ["checkbox_0.gif", "checkbox_1.gif", "checkbox_2.gif"],
                /**
                 * @description {Config} showcheck  
                 * {Boolean} Whether to show check box or not. 
                 */
                showcheck: false,            
                /**
	 	             * @description {Event} oncheckboxclick:function(tree, item, status)
	 	             * Fired when check box is clicked on.
	 	             * @param {Object} tree This tree object. 
	 	             * @param {Object} item Node item clicked on.
	 	             * @param {Number} status 1 for checked, 0 for unchecked.	 	             
	               */
                oncheckboxclick: false, 
                /**
	 	             * @description {Event} onnodeclick:function(tree, item)
	 	             * Fired when a node is clicked on.
	 	             * @param {Object} tree This tree object. 
	 	             * @param {Object} item Ndde item clicked on.
	               */
                onnodeclick: false,
                /*右键事件*/
                onnodecontextmenu: false,
                /**
                 * @description {Config} cascadecheck  
                 * {Boolean} Whether node being seleted leads to parent/sub node being selected.  
                 */
                cascadecheck: true,
                /**
                 * @description {Config} data  
                 * {Object} Tree theme. Three themes provided. 'bbit-tree-lines' ,'bbit-tree-no-lines' and 'bbit-tree-arrows'.
                 * @sample 
                 * data:[{
                 * id:"node1", //node id
                 * text:"node 1", //node text for display.
                 * value:"1", //node value
                 * showcheck:false, //whether to show checkbox
                 * checkstate:0, //Checkbox checking state. 0 for unchecked, 1 for partial checked, 2 for checked.
                 * hasChildren:true, //If hasChildren and complete set to true, and ChildNodes is empty, tree will request server to get sub node.
                 * isexpand:false, //Expand or collapse.
                 * complete:false, //See hasChildren.
                 * ChildNodes:[] // child nodes
                 * }]                  
                 *  */
                data: null,
                /**
                 * @description {Config} clicktoggle  
                 * {String} Whether to toggle node when node clicked. 
                 */
                clicktoggle: true, 
                /**
                 * @description {Config} theme  
                 * {String} Tree theme. Three themes provided. 'bbit-tree-lines' ,'bbit-tree-no-lines' and 'bbit-tree-arrows'. 
                 */
                theme: "bbit-tree-lines" //bbit-tree-lines ,bbit-tree-no-lines,bbit-tree-arrows
            };

        $.extend(dfop, settings);
        var treenodes = dfop.data;
        var me = $(this);
        var id = me.attr("id");
        if (id == null || id == "") {
            id = "bbtree" + new Date().getTime();
            me.attr("id", id);
        }

        var html = [];
        buildtree(dfop.data, html);
        me.addClass("bbit-tree").html(html.join(""));
        InitEvent(me);
        html = null;
        //pre load the icons
        if (dfop.showcheck) {
            for (var i = 0; i < 3; i++) {
                var im = new Image();
                im.src = dfop.cbiconpath + dfop.icons[i];
            }
        }

        //region 
        function buildtree(data, ht) {
            ht.push("<div class='bbit-tree-bwrap'>"); // Wrap ;
            ht.push("<div class='bbit-tree-body'>"); // body ;
            ht.push("<ul class='bbit-tree-root ", dfop.theme, "'>"); //root
            if (data && data.length > 0) {
                var l = data.length;
                for (var i = 0; i < l; i++) {
                    buildnode(data[i], ht, 0, i, i == l - 1);
                }
            }
            else {
                asnyloadc(null, false, function(data) {
                    if (data && data.length > 0) {
                        treenodes = data;
                        dfop.data = data;
                        var l = data.length;
                        for (var i = 0; i < l; i++) {
                            buildnode(data[i], ht, 0, i, i == l - 1);
                        }
                    }
                });
            }
            ht.push("</ul>"); // root and;
            ht.push("</div>"); // body end;
            ht.push("</div>"); // Wrap end;
        }
        //endregion
        function buildnode(nd, ht, deep, path, isend,ispend) {
            var nid = nd.id.replace(/[^\w]/gi, "_");
            ht.push("<li class='bbit-tree-node'>");
            ht.push("<div id='", id, "_", nid, "' tpath='", path, "' unselectable='on' title='", nd.text, "'");
            var cs = [];
            cs.push("bbit-tree-node-el");
            if (nd.hasChildren) {
                cs.push(nd.isexpand ? "bbit-tree-node-expanded" : "bbit-tree-node-collapsed");
            }
            else {
                cs.push("bbit-tree-node-leaf");
            }
            if (nd.classes) { cs.push(nd.classes); }

            ht.push(" class='", cs.join(" "), "'>");
            //span indent
            ht.push("<span class='bbit-tree-node-indent'>");
            if (deep == 1) {
                ht.push("<img class='bbit-tree-icon' src='" + dfop.cbiconpath + "s.gif'/>");
            }
            else if (deep > 1) {
                ht.push("<img class='bbit-tree-icon' src='" + dfop.cbiconpath + "s.gif'/>");

                for (var j = 1; j < deep; j++) {
                    ht.push("<img class='bbit-tree-elbow-line "+(isend && ispend?'bbit-tree-elbow-line-end':'')+"' src='" + dfop.cbiconpath + "/s.gif'/>");
                }
            }
            ht.push("</span>");
            //img
            cs.length = 0;
            if (nd.hasChildren) {
                if (nd.isexpand) {
                    cs.push(isend ? "bbit-tree-elbow-end-minus" : "bbit-tree-elbow-minus");
                }
                else {
                    cs.push(isend ? "bbit-tree-elbow-end-plus" : "bbit-tree-elbow-plus");
                }
            }
            else {
                cs.push(isend ? "bbit-tree-elbow-end" : "bbit-tree-elbow");
            }
            ht.push("<img class='bbit-tree-ec-icon ", cs.join(" "), "' src='" + dfop.cbiconpath + "s.gif'/>");
            ht.push("<img class='bbit-tree-node-icon' src='" + dfop.cbiconpath + "s.gif'/>");
            //checkbox
            if (dfop.showcheck && nd.showcheck) {
                if (nd.checkstate == null || nd.checkstate == undefined) {
                    nd.checkstate = 0;
                }
                ht.push("<img  id='", id, "_", nid, "_cb' class='bbit-tree-node-cb' src='", dfop.cbiconpath, dfop.icons[nd.checkstate], "'/>");
            }
            //a
            ht.push("<a hideFocus class='bbit-tree-node-anchor' tabIndex=1 href='javascript:void(0);'>");
            ht.push("<span unselectable='on'>", nd.text, "</span>");
            ht.push("</a>");
            ht.push("</div>");
            //Child
            if (nd.hasChildren) {
                if (nd.isexpand) {
                    ht.push("<ul  class='bbit-tree-node-ct'  style='z-index: 0; position: static; visibility: visible; top: auto; left: auto;'>");
                    if (nd.ChildNodes) {
                        var l = nd.ChildNodes.length;
                        for (var k = 0; k < l; k++) {
                            nd.ChildNodes[k].parent = nd;
                            buildnode(nd.ChildNodes[k], ht, deep + 1, path + "." + k, k == l - 1);
                        }
                    }
                    ht.push("</ul>");
                }
                else {
                    ht.push("<ul style='display:none;'></ul>");
                }
            }
            ht.push("</li>");
            nd.render = true;
        }
        function getItem(path) {
            var ap = path.split(".");
            var t = treenodes;
            for (var i = 0; i < ap.length; i++) {
                if (i == 0) {
                    t = t[ap[i]];
                }
                else {
                    t = t.ChildNodes[ap[i]];
                }
            }
            return t;
        }
        function check(item, state, type) {
            var pstate = item.checkstate;
            if (type == 1) {
                item.checkstate = state;
            }
            else {// go to childnodes
                var cs = item.ChildNodes;
                var l = cs.length;
                var ch = true;
                for (var i = 0; i < l; i++) {
                    if ((state == 1 && cs[i].checkstate != 1) || state == 0 && cs[i].checkstate != 0) {
                        ch = false;
                        break;
                    }
                }
                if (ch) {
                    item.checkstate = state;
                }
                else {
                    item.checkstate = 2;
                }
            }
            //change show
            if (item.render && pstate != item.checkstate) {
                var nid = item.id.replace(/[^\w]/gi, "_");
                var et = $("#" + id + "_" + nid + "_cb");
                if (et.length == 1) {
                    et.attr("src", dfop.cbiconpath + dfop.icons[item.checkstate]);
                }
            }
        }
        //iterate all children nodes
        function cascade(fn, item, args) {
            if (fn(item, args, 1) != false) {
                if (item.ChildNodes != null && item.ChildNodes.length > 0) {
                    var cs = item.ChildNodes;
                    for (var i = 0, len = cs.length; i < len; i++) {
                        cascade(fn, cs[i], args);
                    }
                }
            }
        }
        //bubble to parent
        function bubble(fn, item, args) {
            var p = item.parent;
            while (p) {
                if (fn(p, args, 0) === false) {
                    break;
                }
                p = p.parent;
            }
        }
        function _click(e,item,onclick){
            if (dfop.citem) {
                var nid = dfop.citem.id.replace(/[^\w]/gi, "_");
                $("#" + id + "_" + nid).removeClass("bbit-tree-selected");
            }
            dfop.citem = item;
            $(this).addClass("bbit-tree-selected");
            if (onclick) {
                if (!item.expand) {
                    item.expand = function() { expandnode.call(item); };
                }
                onclick.call(this, item,e);
            }
        }
        function nodeclick(e) {
            var path = $(this).attr("tpath");
            var et = e.target || e.srcElement;
            var item = getItem(path);
            if (et.tagName == "IMG") {
                //+ if collapsed, expend it 
                if ($(et).hasClass("bbit-tree-elbow-plus") || $(et).hasClass("bbit-tree-elbow-end-plus")) {
                    var ul = $(this).next(); //"bbit-tree-node-ct"
                    if (ul.hasClass("bbit-tree-node-ct")) {
                        ul.show();
                    }
                    else {
                        var deep = path.split(".").length;
                        if (item.complete) {
                            item.ChildNodes != null && asnybuild(item.ChildNodes, deep, path, ul, item);
                        }
                        else {
                            $(this).addClass("bbit-tree-node-loading");
                            asnyloadc(item, true, function(data) {
                                item.complete = true;
                                item.ChildNodes = data;
                                asnybuild(data, deep, path, ul, item);
                            });
                        }
                    }
                    if ($(et).hasClass("bbit-tree-elbow-plus")) {
                        $(et).swapClass("bbit-tree-elbow-plus", "bbit-tree-elbow-minus");
                    }
                    else {
                        $(et).swapClass("bbit-tree-elbow-end-plus", "bbit-tree-elbow-end-minus");
                    }
                    $(this).swapClass("bbit-tree-node-collapsed", "bbit-tree-node-expanded");
                }
                //if expended, collapse it
                else if ($(et).hasClass("bbit-tree-elbow-minus") || $(et).hasClass("bbit-tree-elbow-end-minus")) {                      
                    $(this).next().hide();
                    if ($(et).hasClass("bbit-tree-elbow-minus")) {
                        $(et).swapClass("bbit-tree-elbow-minus", "bbit-tree-elbow-plus");
                    }
                    else {
                        $(et).swapClass("bbit-tree-elbow-end-minus", "bbit-tree-elbow-end-plus");
                    }
                    $(this).swapClass("bbit-tree-node-expanded", "bbit-tree-node-collapsed");
                }
                else if ($(et).hasClass("bbit-tree-node-cb")) // click on checkbox
                {
                    var s = item.checkstate != 1 ? 1 : 0;
                    var r = true;
                    if (dfop.oncheckboxclick) {
                        r = dfop.oncheckboxclick.call(et, item, s);
                    }
                    if (r != false) {
                        if (dfop.cascadecheck) {
                            cascade(check, item, s);
                            bubble(check, item, s);
                        }
                        else {
                            check(item, s, 1);
                        }
                    }
                }
            }
            else {
                _click.call(this,e,item,dfop.onnodeclick);
            }
        }
        function expandnode() {
            var item = this;
            var nid = item.id.replace(/[^\w]/gi, "_");
            var img = $("#" + id + "_" + nid + " img.bbit-tree-ec-icon");
            if (img.length > 0) {
                img.click();
            }
        }
        function asnybuild(nodes, deep, path, ul, pnode) {
            var l = nodes.length;
            if (l > 0) {
                var ht = [];
                for (var i = 0; i < l; i++) {
                    nodes[i].parent = pnode;
                    buildnode(nodes[i], ht, deep, path + "." + i, i == l - 1);
                }
                ul.html(ht.join(""));
                ht = null;
                InitEvent(ul);
            }
            ul.addClass("bbit-tree-node-ct").css({ "z-index": 0, position: "static", visibility: "visible", top: "auto", left: "auto", display: "" });
            ul.prev().removeClass("bbit-tree-node-loading");
        }
        function asnyloadc(pnode, isAsync, callback) {
            if (dfop.url) {
                if (pnode && pnode != null)
                    var param = builparam(pnode);
                $.ajax({
                    type: dfop.method,
                    url: dfop.url,
                    data: param,
                    async: isAsync,
                    dataType: dfop.datatype,
                    success: callback,
                    error: function(e) { alert("error occur!"); }
                });
            }
        }
        function builparam(node) {
            var p = [{ name: "id", value: encodeURIComponent(node.id) }
                    , { name: "text", value: encodeURIComponent(node.text) }
                    , { name: "value", value: encodeURIComponent(node.value) }
                    , { name: "checkstate", value: node.checkstate}];
            return p;
        }
        var item_contextmenu;
        function bindevent() {
            $(this).hover(function() {
                $(this).addClass("bbit-tree-node-over");
            }, function() {
                $(this).removeClass("bbit-tree-node-over");
            }).click(nodeclick)
            .on('dblclick',function(e){
                e.preventDefault();
                var path = $(this).attr("tpath");
                var item = getItem(path);
                if(dfop.onnodedblclick){
                    dfop.onnodedblclick.call(this,e,item)
                }
                return false;
            })
            .on('contextmenu',function(e){
                e.preventDefault();
                
                item_contextmenu = e.target;
                var path = $(this).attr("tpath");
                var item = getItem(path);
                if(dfop.onnodecontextmenu){
                    dfop.onnodecontextmenu.call(this,e,item);
                }
                _click.call(this,e,item);
                return false;
            })
            .find("img.bbit-tree-ec-icon").each(function(e) {
                 if (!$(this).hasClass("bbit-tree-elbow")) {
                     $(this).hover(function() {
                         $(this).parent().addClass("bbit-tree-ec-over");
                     }, function() {
                         $(this).parent().removeClass("bbit-tree-ec-over");
                     });
                 }
            });
        }
        function InitEvent(parent) {
            var nodes = $("li.bbit-tree-node>div", parent);
            nodes.each(bindevent);
        }
        function reflash(itemId) {
            var nid = itemId.replace(/[^\w-]/gi, "_");
            var node = $("#" + id + "_" + nid);
            if (node.length > 0) {
                node.addClass("bbit-tree-node-loading");
                var isend = node.hasClass("bbit-tree-elbow-end") || node.hasClass("bbit-tree-elbow-end-plus") || node.hasClass("bbit-tree-elbow-end-minus");
                var path = node.attr("tpath");
                var deep = path.split(".").length;
                var item = getItem(path);
                if (item) {
                    asnyloadc(item, true, function(data) {
                        item.complete = true;
                        item.ChildNodes = data;
                        item.isexpand = true;
                        if (data && data.length > 0) {
                            item.hasChildren = true;
                        }
                        else {
                            item.hasChildren = false;
                        }
                        var ht = [];
                        buildnode(item, ht, deep - 1, path, isend);
                        ht.shift();
                        ht.pop();
                        var li = node.parent();
                        li.html(ht.join(""));
                        ht = null;
                        InitEvent(li);
                        bindevent.call(li.find(">div"));
                    });
                }
            }
            else {
                //node not created yet
            }
        }
        function getck(items, c, fn) {
            for (var i = 0, l = items.length; i < l; i++) {
                (items[i].showcheck == true && items[i].checkstate == 1) && c.push(fn(items[i]));
                if (items[i].ChildNodes != null && items[i].ChildNodes.length > 0) {
                    getck(items[i].ChildNodes, c, fn);
                }
            }
        }
        function getCkAndHalfCk(items, c, fn) {
            for (var i = 0, l = items.length; i < l; i++) {
                (items[i].showcheck == true && (items[i].checkstate == 1 || items[i].checkstate == 2)) && c.push(fn(items[i]));
                if (items[i].ChildNodes != null && items[i].ChildNodes.length > 0) {
                    getCkAndHalfCk(items[i].ChildNodes, c, fn);
                }
            }
        }
        /*修复由于添加和删除节点时的样式问题*/
        function fixedStyle(){

        }
        me[0].t = {
            getSelectedNodes: function(gethalfchecknode) {
                var s = [];
                if (gethalfchecknode) {
                    getCkAndHalfCk(treenodes, s, function(item) { return item; });
                }
                else {
                    getck(treenodes, s, function(item) { return item; });
                }
                return s;
            },
            getSelectedValues: function() {
                var s = [];
                getck(treenodes, s, function(item) { return item.value; });
                return s;
            },
            getCurrentItem: function() {
                return dfop.citem;
            },
            reflash: function(itemOrItemId) {
                var id;
                if (typeof (itemOrItemId) == "string") {
                    id = itemOrItemId;
                }
                else {
                    id = itemOrItemId.id;
                }
                reflash(id);
            },
            getTreeNodes: function(){
                return treenodes;
            },
            addNode: function(opt){debugger;
                var currentItem = this.getCurrentItem() || getItem('0');
                var isHaveChildren = currentItem.hasChildren;
                
                var nid = currentItem.id.replace(/[^\w]/gi, "_");
                var $item = $("#" + id + "_" + nid);
                var tpath = $item.attr('tpath');
                if(isHaveChildren){
                    tpath += '.'+(currentItem.ChildNodes.length + 1);
                }else{
                    currentItem.ChildNodes = [];
                    tpath += '.0';
                }
                opt.id = tpath.replace(/\./g,'_');
                currentItem.hasChildren = true;

                opt.parent = currentItem;
                currentItem.ChildNodes.push(opt);
                
                var $item = $item.parent();
                var isEnd = $item.next('.bbit-tree-node').length == 0;
                var html = [];

                buildnode(opt,html,tpath.split('.').length - 1,tpath,true,isEnd);
                html = html.join('');

                // 处理父级样式
                $item.find('.bbit-tree-ec-icon')
                    .removeClass('bbit-tree-elbow-end bbit-tree-elbow')
                    .addClass('bbit-tree-elbow-end-minus');
                if(!isHaveChildren){
                    html = "<ul class='bbit-tree-node-ct'  style='z-index: 0; position: static; visibility: visible; top: auto; left: auto;'>"+
                        html+'</ul>';
                    $item.append(html);
                }else{
                    $item.find('>ul')
                        // .find('.bbit-tree-elbow-end').last()
                        // .removeClass('bbit-tree-elbow-end')
                        // .addClass('bbit-tree-elbow')
                        // .end()
                    .append(html);
                }
                fixedStyle();
                InitEvent($item);
            },
            rmNode: function(remove_id){
                var nid = remove_id.replace(id+'_','').replace(/[^\w]/gi, "_");
                var $item = $("#" + id + "_" + nid);
                $item.parent().remove();
                var tpath = nid.replace(/_/g,'.');
                var item = getItem(tpath);
                var item_p = item.parent;
                if(item_p.ChildNodes.length <= 1){
                    item_p.isHaveChildren = false;
                    item_p.ChildNodes = [];
                }else{
                    for(var i = 0,c = item_p.ChildNodes,j=c.length;i<j;i++){
                        var _nid = c[i].id.replace(/[^\w]/gi, "_");
                        if(_nid == nid){
                            c.splice(i,1);
                            break;
                        }
                    }
                }
                fixedStyle();
            }
        };
        return me;
    };
    //get all checked nodes, and put them into array. no hierarchy
    $.fn.getCheckedNodes = function() {
        if (this[0].t) {
            return this[0].t.getSelectedValues();
        }
        return null;
    };
    $.fn.getTSNs = function(gethalfchecknode) {
        if (this[0].t) {
            return this[0].t.getSelectedNodes(gethalfchecknode);
        }
        return null;
    };
    $.fn.getCurrentNode = function() {
        if (this[0].t) {
            return this[0].t.getCurrentItem();
        }
        return null;
    };
    $.fn.reflash = function(ItemOrItemId) {
        if (this[0].t) {
            return this[0].t.reflash(ItemOrItemId);
        }
    };
    $.fn.getTreeNodes = function(){
        if (this[0].t) {
            return this[0].t.getTreeNodes();
        }
    }
    $.fn.addNode = function(opt){
        if(this[0].t){
            return this[0].t.addNode(opt);
        }
    }
    $.fn.rmNode = function(tpath){
        if(this[0].t){
            return this[0].t.rmNode(tpath);
        }
    }
    $.fn.getFirstSubItem = function(){
        return $(this).find('.bbit-tree-node-leaf:first');
    }
    var src = $('script').last().attr('src');
    Core.Html.addLink(Core.Path.resolve('../../css/jquery.tree/tree.css',src));
})(jQuery);