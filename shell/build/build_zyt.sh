VERSION=$1
PROJECT_NAME=GraphTool

SHELLPATH=$(cd `dirname $0`; pwd)

$SHELLPATH/build.sh $VERSION

target_path=$SHELLPATH/target/${PROJECT_NAME}_${VERSION}
mv $target_path/蓝π蚂蚁制图.exe $target_path/国家气象中心公众产品支持系统.exe