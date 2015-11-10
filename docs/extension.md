# 扩展及插件相关说明

## 事件机制
在`ui/action/core.js`里实例化一个事件对象，并在每次`Core.init`里传入，以达到不同的模块间事件通讯目的。
示例如下：
```javascript
Core.init(function(model) {
    model.on('product.change', function() {
        // do something
    });

    model.emit('map.inited', map);
})
```
