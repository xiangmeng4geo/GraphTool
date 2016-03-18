var fs = require('fs');
var path = require('path');

var package = require(path.join(__dirname, '../../../app/package'));
package.main = 'export.js';
package.name = 'GraphTool-export';

console.log(JSON.stringify(package));