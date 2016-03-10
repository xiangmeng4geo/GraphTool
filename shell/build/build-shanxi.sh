SHELLPATH=$(cd `dirname $0`; pwd)
$SHELLPATH/build.sh 3

node $SHELLPATH/change-shanxi.js
