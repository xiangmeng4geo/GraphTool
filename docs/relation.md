### 关于gis数据处理
* [org tools](http://www.bostongis.com/PrinterFriendly.aspx?content_name=ogr_cheatsheet)
    * [download](http://fwtools.loskot.net/)
* [topojson](https://github.com/mbostock/topojson/wiki/API-Reference)

### 地图模块
暂时用d3去处理
1. 加载地理信息（全国各省）topojson
2. 用topojson得到国界和各省界
3. 用`path()`直接画各界线
