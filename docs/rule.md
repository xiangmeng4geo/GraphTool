# 整个架构说明
> 主要采用`main process`和`render process` 分离，在`main process`里默认加
> 载脚本(启动整个页面逻辑), 脚本里自动加载样式

1. 能线程分离
2. 不能堵塞UI线程
3. 前端后端全采用模块化进行管理 （所有资源都为模块, eg: js、css、html、image）

---

### 目录说明
```
|- core (核心代码)
    |- conf （配置文件）
    |- ui （UI页面）
    |- workbench (主进程)
    |- worker (多线程时用到资源)
|- docs （文档）
|- tests （测试）

```

### 页面
所有`body`元素都要用`<tmpl hidden></tmpl>`包裹，`core.js`会自动在时机成熟时让其显示，如：
``` html
<html>
  <head>
    <title>demo</title>
  </head>
  <body>
    <tmpl hidden>
      <div>this is context</div>
    </tmpl>
  </body>
</html>
```
* 防止页面在初始化还没有加载完样式前的闪动
  1. *在新建窗口时强制设置透明`conf.transparent = true`*
    > *官方说明里对这个属性的使用有很多限制，[请参考](https://github.com/atom/electron/blob/master/docs/api/frameless-window.md#limitations)*
  2. 设置`body`的样式`background-color: white;`
  3. 在`core.js`里添加样式和脚本完成后，让窗口显示`win.show()`

### 脚本
* 在`main process`里的`browser-window`对象的`webContents`的`did-finish-load`事件
里用`executeJavascript`执行`ui/action/core.js`，在`core.js`里根据页面地址加载默
认脚本（启动脚本），规则如下：
> `***/login.html` => `p_login.js`
>
> `***/user/center.html` => `p_user/login.js`

* 关于不同页面这间通信问题
  > `Core.on('eventName', callback)` //可以订阅事件

  > `Core.emit('eventName', data)`   //触发已经订阅的事件（通过main process 触发所有子窗口已订阅事件）

### 样式
在`core.js`会自动加载在body上定义了`css`的列表，如： `<body css="reset p_main">`会
按顺序自动加载`reset.css`和`p_main.css`

### 扩展及插件相关说明
* [extension](./extension.md)
