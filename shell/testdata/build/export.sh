SHELLPATH=$(cd `dirname $0`; pwd)
SOURCE_PATH=$SHELLPATH/../source/
TARGET_PATH=$SHELLPATH/../target/export/
TARGET_SOURCE_PATH=$TARGET_PATH/resources/app/

rm -rf $TARGET_PATH
mkdir -p $TARGET_PATH
cp -R h:/soft/electron/0.35.1-32/* $TARGET_PATH/
node /f/source/node_projects/compresser/ $SOURCE_PATH $TARGET_SOURCE_PATH

rm -rf $TARGET_SOURCE_PATH/data

rm -rf $TARGET_SOURCE_PATH/../default_app
rm -rf $TARGET_SOURCE_PATH/index.js

mkdir -p $TARGET_SOURCE_PATH/node_modules/
cp -R $SOURCE_PATH/../../../node_modules/archiver $TARGET_SOURCE_PATH/node_modules/
node $SHELLPATH/change.js > $TARGET_SOURCE_PATH/package.json

cd $TARGET_PATH;
$SHELLPATH/zip I:/docs/2015/蓝PI相关/制图/安装包/测试数据工具/蓝PI蚂蚁制图测试数据导出工具 -r -p .