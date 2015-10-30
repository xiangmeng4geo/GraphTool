SHELLPATH=$(cd `dirname $0`; pwd)
PROJECT_PATH=$(cd $SHELLPATH; cd ../..; pwd)

$PROJECT_PATH/node_modules/.bin/mocha $PROJECT_PATH/test/*.js
