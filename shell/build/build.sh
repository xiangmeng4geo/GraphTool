VERSION=$1
PROJECT_NAME=GraphTool
target_dir=./target/${PROJECT_NAME}_${VERSION}

mkdir -p $target_dir

#1. compress files
node ../../../../compresser/ ../../core/ $target_dir/

#2. change
node ./change.js $target_dir

