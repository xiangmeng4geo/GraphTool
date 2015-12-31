## 命令行传入配置文件说明

| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: |
| [data](#data) | Object | Y |  | 主要描述数据文件位置 |
| map | String | Y |  | 系统配置里地图模板名 |
| legend | String | Y |  | 系统配置里图例模板名 |
| showLegendRange | Boolean | Y | true | 是否只显示源数据所在图例区间 |
| width | Number | N | 800 | 处理图片的宽度 |
| height | Number | N | 800 | 处理图片的高度 |
| [texts](#Text) | Array | N |  | 附加文字资源 |
| [imgs](#Image) | Array | N |  | 附加图片资源 |
| savepath | String | N |  | 保存的图片路径 |

[代码示例](#code_example)
```
{
    "data": {
    	"file": "I:/docs/2015/蓝PI相关/各方需求/陕西/数据/降水.txt"
    },
    "texts": [{
    	"txt": "陕西省2015年09月10日08时-自动站雨量分布图",
    	"x": 10,
    	"y": 10,
    	"fontSize": 20,
    	"color": "rgba(0, 0, 0, 0.8)"
    }, {
    	"txt": "最大：泾河 4.5mm",
    	"x": 10,
    	"y": 40,
    	"fontSize": 18,
    	"color": "rgba(255, 0, 0, 0.8)"
    }],
    "imgs": [{
        "src": "C:/Users/技术/BPA/GT/image/bg/icon/hello test/Chrysanthemum.jpg",
        "x": 10,
        "y": 10,
        "width": 30,
        "height": 30
    }],
    "map": "陕西地图",
    "legend": "降水配色",
    "showLegendRange": true,
    "width": 400,
    "height": 400,
	"savepath": "C:/Users/技术/BPA/GT/output/test.png"
}
```

------------------
### 数据说明
* Number类型如无特殊说明单位都是像素值（px）
* color 可以是hex_number、rgb_number、rgba_number
	> hex_number规定颜色值为十六进制值的颜色（比如 #ff0000）

	> rgb_number规定颜色值为 rgb 代码的颜色（比如 rgb(255,0,0)）

	> rgba_number规定颜色值为 rgba 代码的颜色（比如 rgba(255,0,0, 0.5)）

* [texts](#Text)、[imgs](#Image)里提到的x、y不用经过投影；lng、lat会经过投影转换成x、y

******************
#### <span id="data">data数据说明</span>
| 字段名 | 类型 | 是否必须 | 描述 |
|----| :----: | :-----: |
| file | String | Y | 数据文件位置 |

#### <span id="Text">Text(assets)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: |
| text | String | Y |  |要显示的文字 |
| x | Number | Y |  | 显示文字区块的X坐标 |
| y | Number | Y |  | 显示文字区块的Y坐标 |
| lng | Number | Y |  | 显示文字区块的经度 |
| lat | Number | Y |  | 显示文字区块的纬度 |
| width | Number | N |  | 要显示的区域宽度 |
| height | Number | N |  | 要显示的区域高度 |
| color | String | N | #000000 | 文字颜色 |
| fontFamily | String | N | "Microsoft Yahei" | 字体 |
| fontSize | Number | N | 14 | 文字大小 |
| fontWeight | String | N |  | 是否加粗，暂时只支持“bold” |
| textAlign | String | N | left | 文字水平位置(left、center、right) |
| textBaseline | String | N | top | 文字垂直方向位置(top、bottom、middle) |
| offsetX | Number | N | 0 | 文字垂直方向位置 |
| offsetY | Number | N | 0 | 文字垂直方向位置 |

#### <span id="Image">Image(assets)</span>
| 字段名 | 类型 | 是否必须 | 描述 |
|----| :----: | :-----: |
| src | String | Y |图片全路径 |
| width | Number | N | 图片显示宽度 |
| height | Number | N | 图片显示高度 |
| x | Number | N | 图片显示x坐标 |
| y | Number | N | 图片显示y坐标 |
| lng | Number | N | 图片显示的经度 |
| lat | Number | N | 图片显示的纬度 |
