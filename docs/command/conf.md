## 命令行传入配置文件说明

| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :----: | :-----: |
| [data](#data) | Object | Y |  | 主要描述数据文件位置 |
| map | String<br/>Object | Y |  | 系统配置里地图模板名<br/>[地图相关配置](#mapObject) |
| legend | String<br/>Object | Y |  | 系统配置里图例模板名<br/>[图例相关配置](#legendObject) |
| showLegendRange | Boolean | N | true | 是否只显示源数据所在图例区间 |
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
|----| :----: | :-----: | :-----: |
| file | String | Y | 数据文件位置 |

#### <span id="Text">Text(assets)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :----: | :-----: |
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
|----| :----: | :-----: | :-----: |
| src | String | Y |图片全路径 |
| width | Number | N | 图片显示宽度 |
| height | Number | N | 图片显示高度 |
| x | Number | N | 图片显示x坐标 |
| y | Number | N | 图片显示y坐标 |
| lng | Number | N | 图片显示的经度 |
| lat | Number | N | 图片显示的纬度 |

#### <span id="mapObject">mapObject</span> [示例](#mapObjectExample)
| 字段名 | 类型 | 是否必须 | 描述 |
|----| :----: | :-----: | :-----: |
| [maps](#mapItem) | Array | Y | 地理信息文件及相关配置 |
| [bound](#bound) | Object | Y | 地图可视区的边界 |
| [textStyle](#mapTextStyle) | Object | N | 市/县名显示的文字样式 |
| [bg](#mapBg) | Object | N | 背景颜色 |

#### <span id="mapItem">mapItem(maps子项)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :-----: |
| is_use | Boolean | N | | 是否使用这项配置 |
| file | String | Y | | 地理信息文件路径 |
| [style](#shpStyle) | Object | Y | | 地理信息文件的描边及填色 |
| clip | Boolean | N | false | 是否是显示这个区域的数据 |
| [borderStyle](#borderStyle) | Object | N | | 边界区域的描边及阴影 |

#### <span id="shpStyle">shpStyle(地理信息文件的描边及填色)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :-----: |
| strokeStyle | String | N | #d2d2d2 | 描边颜色 |
| lineWidth | Number | N | 1 | 描边宽度 |
| fillStyle | String | N |  | 填充颜色 __(flag_fill并且fillStyle为颜色值时生效)__ |
| flag_fill | Boolean | N | false | 是否使用描边颜色 |

#### <span id="borderStyle">borderStyle(边界区域的描边及阴影)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :-----: |
| flag | Boolean | N | false | 是否对边界样式 |
| strokeStyle | Number | N | #d2d2d2 | 边界描边颜色 |
| lineWidth | Number | N | 1 | 边界描边宽度 |
| shadowBlur | Number | N |  | 阴影的模糊度 |
| shadowColor | String | N |  | 阴影颜色 |
| shadowOffsetX | Number | N |  | 阴影X轴方向偏移 |
| shadowOffsetY | Number | N |  | 阴影Y轴方向偏移 |
| flag_shadow | Boolean | N |  | 是否使用阴影 |

#### <span id="bound">bound</span>
| 字段名 | 类型 | 是否必须 | 描述 |
|----| :----: | :-----: | :-----: |
| wn | Array | Y | 西北坐标,如：[104.72, 40.29] |
| es | Array | Y | 东南坐标,如：[113.21, 31.08] |

#### <span id="mapTextStyle">textStyle(市县样式)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :-----: |
| city | Boolean | N | false | 是否显示市名 |
| county | Boolean | N | false | 是否显示县名 |
| fontSize | Number | N | 14 | 文字大小 |
| color | String | N | #000000 | 文字颜色 |

#### <span id="mapBg">bg(地图背景)</span>
| 字段名 | 类型 | 是否必须 | 描述 |
|----| :----: | :-----: | :-----: |
| flag | Boolean | N | 是否使用背景 |
| color | String | N | 地图背景颜色 |

#### <span id="mapObjectExample">mapObject示例</span>
```
{
    "maps": [{
        "is_use": true,
        "file": "C:\\Users\\技术\\BPA\\GT\\geo\\china_province.json",
        "style": {
            "strokeStyle": "#d2d2d2",
            "lineWidth": "0.2",
            "fillStyle": "#000000",
            "flag_fill": false
        },
        "clip": false,
        "borderStyle": {
            "flag": false,
            "strokeStyle": "#000000",
            "lineWidth": "3",
            "shadowBlur": "5",
            "shadowColor": "#000000",
            "shadowOffsetX": "0",
            "shadowOffsetY": "0",
            "flag_shadow": false
        }
    }, {
        "is_use": true,
        "file": "C:\\Users\\技术\\BPA\\GT\\geo\\地市界.shp",
        "style": {
            "strokeStyle": "#c8c8c8",
            "lineWidth": "0.3",
            "fillStyle": "#000000",
            "flag_fill": false
        },
        "clip": true,
        "borderStyle": {
            "flag": true,
            "strokeStyle": "#646464",
            "lineWidth": "3",
            "shadowBlur": "7",
            "shadowColor": "#969696",
            "shadowOffsetX": "3",
            "shadowOffsetY": "3",
            "flag_shadow": false
        }
    }],
    "bound": {
        "wn": [104.72582600905484, 40.29761417442774],
        "es": [113.21011197110165, 31.080076687873927]
    },
    "textStyle": {
        "city": true,
        "county": false,
        "fontSize": 14,
        "color": "#0a0a0a",
        "flag": ""
    },
    "bg": {
        "flag": false,
        "color": "#000000"
    }
}
```
-----------------
#### <span id="legendObject">legendObject(图例相关配置)</span> [示例](#legendExample)
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :----: | :-----: |
| is_stripe | Boolean | N | false | 是否使用条纹填充 |
| [colors](#colorItem) | Array | Y |  | 图例的颜色配置 |

#### <span id="colorItem">colorItem(颜色配置)</span>
| 字段名 | 类型 | 是否必须 | 默认值 | 描述 |
|----| :----: | :-----: | :----: | :-----: |
| is_checked | Boolean | N | false | 是否使用此颜色 |
| color | String | Y |  | 颜色值 |
| color_text | String | Y |  | 值域文字显示颜色 |
| val | Array | Y |  | 值域区间<br/> __必须是小值在前，如：[0, 10]__ |
| text | String | N |  | 值域对应显示文字 |


#### <span id="legendExample">legendObject示例</span>
```
{
    "is_stripe": false,
    "colors": [{
        "is_checked": true,
        "color": "#9df085",
        "color_text": "#ffffff",
        "val": [1, 1.5],
        "text": "1~1.5",
        "order": 0
    }, {
        "is_checked": true,
        "color": "#33b333",
        "color_text": "#000000",
        "val": [1.5, 7],
        "text": "1.5~7",
        "order": 0
    }, {
        "is_checked": true,
        "color": "#56b1ff",
        "color_text": "#000000",
        "val": [7, 15],
        "text": "7~15",
        "order": 0
    }, {
        "is_checked": true,
        "color": "#ffffff",
        "color_text": "#ffffff",
        "val": [0, 1],
        "text": "0~1",
        "order": 0
    }, {
        "is_checked": true,
        "color": "#0000de",
        "color_text": "#000000",
        "val": [15, 40],
        "text": "15~40",
        "order": 0
    }, {
        "is_checked": true,
        "color": "#f900f9",
        "color_text": "#000000",
        "val": [40, 50],
        "text": "40~50",
        "order": 0
    }, {
        "is_checked": true,
        "color": "#750036",
        "color_text": "#000000",
        "val": [50, 9999],
        "text": "50以上",
        "order": 0
    }]
}
```
