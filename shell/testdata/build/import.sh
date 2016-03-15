SHELLPATH=$(cd `dirname $0`; pwd)
SOURCE_PATH=$SHELLPATH/../source/
TARGET_PATH=$SHELLPATH/../target/import/
TARGET_SOURCE_PATH=$TARGET_PATH/resources/app/

rm -rf $TARGET_PATH
mkdir -p $TARGET_PATH
cp -R h:/soft/electron/0.35.1-32/* $TARGET_PATH/
node /f/source/node_projects/compresser/ $SOURCE_PATH $TARGET_SOURCE_PATH

rm -rf $TARGET_SOURCE_PATH/data
rm -rf $TARGET_SOURCE_PATH/export*

rm -rf $TARGET_SOURCE_PATH/../default_app
rm -rf $TARGET_SOURCE_PATH/index.js
echo '{"main": "import.js"}' > $TARGET_SOURCE_PATH/package.json
