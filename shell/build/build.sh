VERSION=$1
PROJECT_NAME=GraphTool
target_dir=./target/${PROJECT_NAME}_${VERSION}

rm -rf $target_dir

mkdir -p $target_dir

#1. compress files
node ../../../../compresser/ ../../core/ $target_dir/

#2. change
node ./change.js $target_dir

#3. copy node-webkit exe
mkdir -p $target_dir/bin
cp -R /d/soft/node-webkit-v0.11.2-win-x64/* $target_dir/bin

#4. remove files
rm -rf $target_dir/config
rm -rf $target_dir/image

#5. create 32
target_dir_32=${target_dir}_32
rm -rf $target_dir_32
mkdir -p $target_dir_32
cp -R $target_dir/* $target_dir_32
rm -rf $target_dir_32/bin/*
cp -R /d/soft/node-webkit-v0.12.0-win-x32/* $target_dir_32/bin

#6. create udpate resource
# Rar.exe a -r -s -m1 test.rar C:\Users\Administrator\AppData\Local\*
