SHELLPATH=$(cd `dirname $0`; pwd)
$SHELLPATH/build.sh

node $SHELLPATH/change-shanxi.js
