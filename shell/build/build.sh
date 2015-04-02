VERSION=$1
PROJECT_NAME=GraphTool
target_dir=./target/${PROJECT_NAME}_${VERSION}

mkdir -p $target_dir

#1. compress files
node ../../../../compresser/ ../../core/ $target_dir/

#2. change
node ./change.js $target_dir

#3. copy node-webkit exe
cp -R /d/soft/node-webkit-v0.11.2-win-x64/* $target_dir/
