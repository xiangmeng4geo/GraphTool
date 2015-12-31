### SDK调用说明
制图系统以命令行调用的方式对第三方提供服务，主要依赖命令行工具执行文件`command.exe`（可任意修改其名称），如我这里的全路径为`C:/Users/技术/BPA/GT/bin/command.exe`,以下称之为`BIN_FILE`

#### *请根据输出做好前端提示！*

-------------------

##### 调用示例
`BIN_FILE -name 0910降水`

`BIN_FILE -sync -name 0910降水`

`BIN_FILE -file "C:/Users/技术/BPA/GT/test/0910降水.json"`

`BIN_FILE -sync -file "C:/Users/技术/BPA/GT/test/0910降水.json"`

-------------------

##### 命令行参数说明

| 参数名 | 说明 |
|----|---| -----|
| -name | 在制图系统里配置好的产品名 |
| -file | 第三方生成的配置文件路径（配置文件要是json格式）,请参考[配置文件格式说明](./conf.md) |
| -sync | 是否同步处理（若没有此参数即为异步处理，程序马上返回“{"msg":"dealing..."}”） |

-------------------

#### 返回参数说明
命令行调用输出JSON字符串即返回结果，分几种情况：
1. 制图服务没有启动或服务异常
	* `{"err": "请联系管理员启动服务"}`

	* `{"err": "没有得到服务响应"}`

	* `{"err": "响应没有EOF"}`

1. 命令行参数错误

	* `{"err":"command error, use -name or -file"}`

1. 数据解析错误

	* `{"err":"\"file [I:/docs/2015/蓝PI相关/各方需求/陕西/数据/0910降水.jso1n] not exists or empty or data error!\""}`

	* `{"err":"\"请正确配置legend字段!\""}`

	* `{"err":"\"请正确配置legend字段!\""}`

	* `{"err":"\"其它错误提示\""}`

1. 数据解析正确并正确生成图片
	* `{"msg":"{\"path\":\"C:\\\\Users\\\\技术\\\\BPA\\\\GT\\\\output\\\\test.png\",\"time\":53}"}`

1. 没有使用参数`-sync`
	* `{"msg":"dealing..."}`
