SHELLPATH=$(cd `dirname $0`; pwd)
APP_PATH=$SHELLPATH/../../app/
TARGET_DIR=$SHELLPATH/target
TARGET_64_DIR=$SHELLPATH/x64
TARGET_32_DIR=$SHELLPATH/ia32

rm -rf $TARGET_DIR
mkdir $TARGET_DIR

node /f/source/node_projects/compresser/ $APP_PATH $TARGET_DIR
node $SHELLPATH/change.js

rm -rf $TARGET_DIR/cache
rm -rf $TARGET_DIR/logs
rm -rf $TARGET_DIR/output
rm -rf $TARGET_DIR/config

rm -rf $TARGET_64_DIR
mkdir $TARGET_64_DIR

cp -R h:/soft/electron/BPA-0.35.0-x64/* $TARGET_64_DIR/
rm -rf $TARGET_64_DIR/resources/default_app
rm -rf $TARGET_64_DIR/resources/app
mkdir $TARGET_64_DIR/resources/app
cp -R $TARGET_DIR/* $TARGET_64_DIR/resources/app


rm -rf $TARGET_32_DIR
mkdir $TARGET_32_DIR

cp -R h:/soft/electron/0.35.1-32/* $TARGET_32_DIR/
rm -rf $TARGET_32_DIR/resources/default_app
rm -rf $TARGET_32_DIR/resources/app
mkdir $TARGET_32_DIR/resources/app
cp -R $TARGET_DIR/* $TARGET_32_DIR/resources/app
