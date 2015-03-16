VERSION=V0.1
PROJECT_NAME=GraphTool
target_dir=./target/${PROJECT_NAME}_${VERSION}

mkdir -p $target_dir

#1. compress files
node ../../../../compresser/ ../../core/ $target_dir/

#2. change suffix
node ./change_suffix.js $target_dir

#3. change login
sed -i 's:login.html:login.gt:' $target_dir/package.json