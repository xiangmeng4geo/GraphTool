var ClipperLib = require('f:/source/node_projects/GraphTool/app/common/conrec/clipper');

var TYPE_CLIP = ClipperLib.ClipType.ctXor,
	TYPE_FILL = ClipperLib.PolyFillType.pftNonZero,
	TYPE_POLY_CLIP = ClipperLib.PolyType.ptClip,
	TYPE_POLY_SUBJECT = ClipperLib.PolyType.ptSubject;

var endtype = ClipperLib.EndType.etOpenSquare;
var endtype = ClipperLib.EndType.etOpenRound;
var endtype = ClipperLib.EndType.etOpenButt;
// var endtype = ClipperLib.EndType.etClosedLine;
// var endtype = ClipperLib.EndType.etClosedPolygon;

var cpr = new ClipperLib.Clipper();

var items = [{
	X: 10,
	Y: 10
}, {
	X: 100,
	Y: 10
}, {
	X: 100,
	Y: 100
}, {
	X: 10,
	Y: 100
}];
var line = [{
	X: 10,
	Y: 40
}, {
	X: 100,
	Y: 30
}]
cpr.AddPath(items, TYPE_POLY_SUBJECT, true);
cpr.AddPath(line, TYPE_POLY_SUBJECT, endtype);
cpr.AddPath([{
	X: 0,
	Y: 20
}, {
	X: 100,
	Y: 10
}], TYPE_POLY_SUBJECT, endtype);
var solution_paths = new ClipperLib.Paths();
cpr.Execute(TYPE_CLIP, solution_paths, TYPE_FILL, TYPE_FILL);

console.log(solution_paths);