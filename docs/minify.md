### minify的现状
虽然现在`ES6`已经发布，`electron`里也已经支持了部分特性，但现在还没有一款压缩工具实现`unglify`
类似的压缩功能，虽然现在也有很好多库可实现`ES6`代码转成`ES5`，如：[`Babel`](http://babeljs.io/)
但这样的代码的体积还是会增加不少，而且开发环境代码与生产环境代码不一致，出现未知问题的可能性也会大
大增加，因此现在开发的时候暂时把所有代码都按`ES5`的特性编写，后续如果有支持`ES6`的压缩工具时再对
代码进行重构。
