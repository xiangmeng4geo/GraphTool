把geo模块用本地方式加载后发现`timeline`里的`Buffer useage`一段时间后就达到了100%，造成数据处理异常慢。
暂时的解决办法是把引用方式改成了`$.getScript`
