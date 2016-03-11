SHELLPATH=$(cd `dirname $0`; pwd)
$SHELLPATH/build.sh 24

node $SHELLPATH/change-shanxi.js
