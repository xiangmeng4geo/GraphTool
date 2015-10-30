### 异步接口在electron中的应用
`nodejs` 是单线程，只可以用`child_process`添加多进程，但有些应用场景没有必要使用进程实现。

本应用里采用多线程去实现异步,相关区别比较及如何选择，[请参考](http://blog.csdn.net/pingd/article/details/17895933)

经多个支持线程的实例比较，最后选择[webworker-threads](https://github.com/audreyt/node-webworker-threads)

```javascript
// main.js
var Threads = require('webworker-threads');
var t = Threads.create();

t.on('data', function(msg){
  console.log('main.js got msg: ', msg);
});

t.load(require('path').join(__dirname, 'sub.js'));
t.emit('begin');
```

```javascript
// sub.js
function work(a, b){
  var time_start = new Date();
  while(1){
    if(new Date() - time_start >= 3*1000){
    	break;
    }
  }
  thread.emit('data', 'after 3s');
}
thread.on('begin', function(){
  thread.emit('data', 'begin work');
  work();
});
```
