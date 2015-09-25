// https://github.com/wcchoi/libunrar-js

var Module;
if (!Module) Module = (typeof Module !== "undefined" ? Module : null) || {};
var moduleOverrides = {};
for (var key in Module) {
	if (Module.hasOwnProperty(key)) {
		moduleOverrides[key] = Module[key]
	}
}
var ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function";
var ENVIRONMENT_IS_WEB = typeof window === "object";
var ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
if (ENVIRONMENT_IS_NODE) {
	if (!Module["print"]) Module["print"] = function print(x) {
		process["stdout"].write(x + "\n")
	};
	if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
		process["stderr"].write(x + "\n")
	};
	var nodeFS = require("fs");
	var nodePath = require("path");
	// Module["read"] = function read(filename, binary) {
	// 	filename = nodePath["normalize"](filename);
	// 	var ret = nodeFS["readFileSync"](filename);
	// 	if (!ret && filename != nodePath["resolve"](filename)) {
	// 		filename = path.join(__dirname, "..", "src", filename);
	// 		ret = nodeFS["readFileSync"](filename)
	// 	}
	// 	if (ret && !binary) ret = ret.toString();
	// 	return ret
	// };
	Module["read"] = function read(filename, binary) {
		var ret = nodeFS["readFileSync"](nodePath["join"](__dirname, filename));
		if (ret && !binary) ret = ret.toString();
		return ret
	};
	Module["readBinary"] = function readBinary(filename) {
		return Module["read"](filename, true)
	};
	Module["load"] = function load(f) {
		globalEval(read(f))
	};
	if (!Module["thisProgram"]) {
		if (process["argv"].length > 1) {
			Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
		} else {
			Module["thisProgram"] = "unknown-program"
		}
	}
	Module["arguments"] = process["argv"].slice(2);
	if (typeof module !== "undefined") {
		module["exports"] = Module
	}
	process["on"]("uncaughtException", (function(ex) {
		if (!(ex instanceof ExitStatus)) {
			console.log(ex);
			throw ex
		}
	}))
} else if (ENVIRONMENT_IS_SHELL) {
	if (!Module["print"]) Module["print"] = print;
	if (typeof printErr != "undefined") Module["printErr"] = printErr;
	if (typeof read != "undefined") {
		Module["read"] = read
	} else {
		Module["read"] = function read() {
			throw "no read() available (jsc?)"
		}
	}
	Module["readBinary"] = function readBinary(f) {
		if (typeof readbuffer === "function") {
			return new Uint8Array(readbuffer(f))
		}
		var data = read(f, "binary");
		assert(typeof data === "object");
		return data
	};
	if (typeof scriptArgs != "undefined") {
		Module["arguments"] = scriptArgs
	} else if (typeof arguments != "undefined") {
		Module["arguments"] = arguments
	}
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
	Module["read"] = function read(url) {
		var xhr = new XMLHttpRequest;
		xhr.open("GET", url, false);
		xhr.send(null);
		return xhr.responseText
	};
	if (typeof arguments != "undefined") {
		Module["arguments"] = arguments
	}
	if (typeof console !== "undefined") {
		if (!Module["print"]) Module["print"] = function print(x) {
			console.log(x)
		};
		if (!Module["printErr"]) Module["printErr"] = function printErr(x) {
			console.log(x)
		}
	} else {
		var TRY_USE_DUMP = false;
		if (!Module["print"]) Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? (function(x) {
			dump(x)
		}) : (function(x) {})
	}
	if (ENVIRONMENT_IS_WORKER) {
		Module["load"] = importScripts
	}
	if (typeof Module["setWindowTitle"] === "undefined") {
		Module["setWindowTitle"] = (function(title) {
			document.title = title
		})
	}
} else {
	throw "Unknown runtime environment. Where are we?"
}

function globalEval(x) {
	eval.call(null, x)
}
if (!Module["load"] && Module["read"]) {
	Module["load"] = function load(f) {
		globalEval(Module["read"](f))
	}
}
if (!Module["print"]) {
	Module["print"] = (function() {})
}
if (!Module["printErr"]) {
	Module["printErr"] = Module["print"]
}
if (!Module["arguments"]) {
	Module["arguments"] = []
}
if (!Module["thisProgram"]) {
	Module["thisProgram"] = "./this.program"
}
Module.print = Module["print"];
Module.printErr = Module["printErr"];
Module["preRun"] = [];
Module["postRun"] = [];
for (var key in moduleOverrides) {
	if (moduleOverrides.hasOwnProperty(key)) {
		Module[key] = moduleOverrides[key]
	}
}
var Runtime = {
	setTempRet0: (function(value) {
		tempRet0 = value
	}),
	getTempRet0: (function() {
		return tempRet0
	}),
	stackSave: (function() {
		return STACKTOP
	}),
	stackRestore: (function(stackTop) {
		STACKTOP = stackTop
	}),
	getNativeTypeSize: (function(type) {
		switch (type) {
			case "i1":
			case "i8":
				return 1;
			case "i16":
				return 2;
			case "i32":
				return 4;
			case "i64":
				return 8;
			case "float":
				return 4;
			case "double":
				return 8;
			default:
				{
					if (type[type.length - 1] === "*") {
						return Runtime.QUANTUM_SIZE
					} else if (type[0] === "i") {
						var bits = parseInt(type.substr(1));
						assert(bits % 8 === 0);
						return bits / 8
					} else {
						return 0
					}
				}
		}
	}),
	getNativeFieldSize: (function(type) {
		return Math.max(Runtime.getNativeTypeSize(type), Runtime.QUANTUM_SIZE)
	}),
	STACK_ALIGN: 16,
	getAlignSize: (function(type, size, vararg) {
		if (!vararg && (type == "i64" || type == "double")) return 8;
		if (!type) return Math.min(size, 8);
		return Math.min(size || (type ? Runtime.getNativeFieldSize(type) : 0), Runtime.QUANTUM_SIZE)
	}),
	dynCall: (function(sig, ptr, args) {
		if (args && args.length) {
			if (!args.splice) args = Array.prototype.slice.call(args);
			args.splice(0, 0, ptr);
			return Module["dynCall_" + sig].apply(null, args)
		} else {
			return Module["dynCall_" + sig].call(null, ptr)
		}
	}),
	functionPointers: [null, null, null, null, null],
	addFunction: (function(func) {
		for (var i = 0; i < Runtime.functionPointers.length; i++) {
			if (!Runtime.functionPointers[i]) {
				Runtime.functionPointers[i] = func;
				return 2 * (1 + i)
			}
		}
		throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."
	}),
	removeFunction: (function(index) {
		Runtime.functionPointers[(index - 2) / 2] = null
	}),
	getAsmConst: (function(code, numArgs) {
		if (!Runtime.asmConstCache) Runtime.asmConstCache = {};
		var func = Runtime.asmConstCache[code];
		if (func) return func;
		var args = [];
		for (var i = 0; i < numArgs; i++) {
			args.push(String.fromCharCode(36) + i)
		}
		var source = Pointer_stringify(code);
		if (source[0] === '"') {
			if (source.indexOf('"', 1) === source.length - 1) {
				source = source.substr(1, source.length - 2)
			} else {
				abort("invalid EM_ASM input |" + source + "|. Please use EM_ASM(..code..) (no quotes) or EM_ASM({ ..code($0).. }, input) (to input values)")
			}
		}
		try {
			var evalled = eval("(function(Module, FS) { return function(" + args.join(",") + "){ " + source + " } })")(Module, typeof FS !== "undefined" ? FS : null)
		} catch (e) {
			Module.printErr("error in executing inline EM_ASM code: " + e + " on: \n\n" + source + "\n\nwith args |" + args + "| (make sure to use the right one out of EM_ASM, EM_ASM_ARGS, etc.)");
			throw e
		}
		return Runtime.asmConstCache[code] = evalled
	}),
	warnOnce: (function(text) {
		if (!Runtime.warnOnce.shown) Runtime.warnOnce.shown = {};
		if (!Runtime.warnOnce.shown[text]) {
			Runtime.warnOnce.shown[text] = 1;
			Module.printErr(text)
		}
	}),
	funcWrappers: {},
	getFuncWrapper: (function(func, sig) {
		assert(sig);
		if (!Runtime.funcWrappers[sig]) {
			Runtime.funcWrappers[sig] = {}
		}
		var sigCache = Runtime.funcWrappers[sig];
		if (!sigCache[func]) {
			sigCache[func] = function dynCall_wrapper() {
				return Runtime.dynCall(sig, func, arguments)
			}
		}
		return sigCache[func]
	}),
	getCompilerSetting: (function(name) {
		throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"
	}),
	stackAlloc: (function(size) {
		var ret = STACKTOP;
		STACKTOP = STACKTOP + size | 0;
		STACKTOP = STACKTOP + 15 & -16;
		return ret
	}),
	staticAlloc: (function(size) {
		var ret = STATICTOP;
		STATICTOP = STATICTOP + size | 0;
		STATICTOP = STATICTOP + 15 & -16;
		return ret
	}),
	dynamicAlloc: (function(size) {
		var ret = DYNAMICTOP;
		DYNAMICTOP = DYNAMICTOP + size | 0;
		DYNAMICTOP = DYNAMICTOP + 15 & -16;
		if (DYNAMICTOP >= TOTAL_MEMORY) {
			var success = enlargeMemory();
			if (!success) return 0
		}
		return ret
	}),
	alignMemory: (function(size, quantum) {
		var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
		return ret
	}),
	makeBigInt: (function(low, high, unsigned) {
		var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * +4294967296 : +(low >>> 0) + +(high | 0) * +4294967296;
		return ret
	}),
	GLOBAL_BASE: 8,
	QUANTUM_SIZE: 4,
	__dummy__: 0
};
Module["Runtime"] = Runtime;

function jsCall() {
	var args = Array.prototype.slice.call(arguments);
	return Runtime.functionPointers[args[0]].apply(null, args.slice(1))
}
var __THREW__ = 0;
var ABORT = false;
var EXITSTATUS = 0;
var undef = 0;
var tempValue, tempInt, tempBigInt, tempInt2, tempBigInt2, tempPair, tempBigIntI, tempBigIntR, tempBigIntS, tempBigIntP, tempBigIntD, tempDouble, tempFloat;
var tempI64, tempI64b;
var tempRet0, tempRet1, tempRet2, tempRet3, tempRet4, tempRet5, tempRet6, tempRet7, tempRet8, tempRet9;

function assert(condition, text) {
	if (!condition) {
		abort("Assertion failed: " + text)
	}
}
var globalScope = this;

function getCFunc(ident) {
	var func = Module["_" + ident];
	if (!func) {
		try {
			func = eval("_" + ident)
		} catch (e) {}
	}
	assert(func, "Cannot call unknown function " + ident + " (perhaps LLVM optimizations or closure removed it?)");
	return func
}
var cwrap, ccall;
((function() {
	var JSfuncs = {
		"stackSave": (function() {
			Runtime.stackSave()
		}),
		"stackRestore": (function() {
			Runtime.stackRestore()
		}),
		"arrayToC": (function(arr) {
			var ret = Runtime.stackAlloc(arr.length);
			writeArrayToMemory(arr, ret);
			return ret
		}),
		"stringToC": (function(str) {
			var ret = 0;
			if (str !== null && str !== undefined && str !== 0) {
				ret = Runtime.stackAlloc((str.length << 2) + 1);
				writeStringToMemory(str, ret)
			}
			return ret
		})
	};
	var toC = {
		"string": JSfuncs["stringToC"],
		"array": JSfuncs["arrayToC"]
	};
	ccall = function ccallFunc(ident, returnType, argTypes, args) {
		var func = getCFunc(ident);
		var cArgs = [];
		var stack = 0;
		if (args) {
			for (var i = 0; i < args.length; i++) {
				var converter = toC[argTypes[i]];
				if (converter) {
					if (stack === 0) stack = Runtime.stackSave();
					cArgs[i] = converter(args[i])
				} else {
					cArgs[i] = args[i]
				}
			}
		}
		var ret = func.apply(null, cArgs);
		if (returnType === "string") ret = Pointer_stringify(ret);
		if (stack !== 0) Runtime.stackRestore(stack);
		return ret
	};
	var sourceRegex = /^function\s*\(([^)]*)\)\s*{\s*([^*]*?)[\s;]*(?:return\s*(.*?)[;\s]*)?}$/;

	function parseJSFunc(jsfunc) {
		var parsed = jsfunc.toString().match(sourceRegex).slice(1);
		return {
			arguments: parsed[0],
			body: parsed[1],
			returnValue: parsed[2]
		}
	}
	var JSsource = {};
	for (var fun in JSfuncs) {
		if (JSfuncs.hasOwnProperty(fun)) {
			JSsource[fun] = parseJSFunc(JSfuncs[fun])
		}
	}
	cwrap = function cwrap(ident, returnType, argTypes) {
		argTypes = argTypes || [];
		var cfunc = getCFunc(ident);
		var numericArgs = argTypes.every((function(type) {
			return type === "number"
		}));
		var numericRet = returnType !== "string";
		if (numericRet && numericArgs) {
			return cfunc
		}
		var argNames = argTypes.map((function(x, i) {
			return "$" + i
		}));
		var funcstr = "(function(" + argNames.join(",") + ") {";
		var nargs = argTypes.length;
		if (!numericArgs) {
			funcstr += "var stack = " + JSsource["stackSave"].body + ";";
			for (var i = 0; i < nargs; i++) {
				var arg = argNames[i],
					type = argTypes[i];
				if (type === "number") continue;
				var convertCode = JSsource[type + "ToC"];
				funcstr += "var " + convertCode.arguments + " = " + arg + ";";
				funcstr += convertCode.body + ";";
				funcstr += arg + "=" + convertCode.returnValue + ";"
			}
		}
		var cfuncname = parseJSFunc((function() {
			return cfunc
		})).returnValue;
		funcstr += "var ret = " + cfuncname + "(" + argNames.join(",") + ");";
		if (!numericRet) {
			var strgfy = parseJSFunc((function() {
				return Pointer_stringify
			})).returnValue;
			funcstr += "ret = " + strgfy + "(ret);"
		}
		if (!numericArgs) {
			funcstr += JSsource["stackRestore"].body.replace("()", "(stack)") + ";"
		}
		funcstr += "return ret})";
		return eval(funcstr)
	}
}))();
Module["cwrap"] = cwrap;
Module["ccall"] = ccall;

function setValue(ptr, value, type, noSafe) {
	type = type || "i8";
	if (type.charAt(type.length - 1) === "*") type = "i32";
	switch (type) {
		case "i1":
			HEAP8[ptr >> 0] = value;
			break;
		case "i8":
			HEAP8[ptr >> 0] = value;
			break;
		case "i16":
			HEAP16[ptr >> 1] = value;
			break;
		case "i32":
			HEAP32[ptr >> 2] = value;
			break;
		case "i64":
			tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
			break;
		case "float":
			HEAPF32[ptr >> 2] = value;
			break;
		case "double":
			HEAPF64[ptr >> 3] = value;
			break;
		default:
			abort("invalid type for setValue: " + type)
	}
}
Module["setValue"] = setValue;

function getValue(ptr, type, noSafe) {
	type = type || "i8";
	if (type.charAt(type.length - 1) === "*") type = "i32";
	switch (type) {
		case "i1":
			return HEAP8[ptr >> 0];
		case "i8":
			return HEAP8[ptr >> 0];
		case "i16":
			return HEAP16[ptr >> 1];
		case "i32":
			return HEAP32[ptr >> 2];
		case "i64":
			return HEAP32[ptr >> 2];
		case "float":
			return HEAPF32[ptr >> 2];
		case "double":
			return HEAPF64[ptr >> 3];
		default:
			abort("invalid type for setValue: " + type)
	}
	return null
}
Module["getValue"] = getValue;
var ALLOC_NORMAL = 0;
var ALLOC_STACK = 1;
var ALLOC_STATIC = 2;
var ALLOC_DYNAMIC = 3;
var ALLOC_NONE = 4;
Module["ALLOC_NORMAL"] = ALLOC_NORMAL;
Module["ALLOC_STACK"] = ALLOC_STACK;
Module["ALLOC_STATIC"] = ALLOC_STATIC;
Module["ALLOC_DYNAMIC"] = ALLOC_DYNAMIC;
Module["ALLOC_NONE"] = ALLOC_NONE;

function allocate(slab, types, allocator, ptr) {
	var zeroinit, size;
	if (typeof slab === "number") {
		zeroinit = true;
		size = slab
	} else {
		zeroinit = false;
		size = slab.length
	}
	var singleType = typeof types === "string" ? types : null;
	var ret;
	if (allocator == ALLOC_NONE) {
		ret = ptr
	} else {
		ret = [_malloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === undefined ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length))
	}
	if (zeroinit) {
		var ptr = ret,
			stop;
		assert((ret & 3) == 0);
		stop = ret + (size & ~3);
		for (; ptr < stop; ptr += 4) {
			HEAP32[ptr >> 2] = 0
		}
		stop = ret + size;
		while (ptr < stop) {
			HEAP8[ptr++ >> 0] = 0
		}
		return ret
	}
	if (singleType === "i8") {
		if (slab.subarray || slab.slice) {
			HEAPU8.set(slab, ret)
		} else {
			HEAPU8.set(new Uint8Array(slab), ret)
		}
		return ret
	}
	var i = 0,
		type, typeSize, previousType;
	while (i < size) {
		var curr = slab[i];
		if (typeof curr === "function") {
			curr = Runtime.getFunctionIndex(curr)
		}
		type = singleType || types[i];
		if (type === 0) {
			i++;
			continue
		}
		if (type == "i64") type = "i32";
		setValue(ret + i, curr, type);
		if (previousType !== type) {
			typeSize = Runtime.getNativeTypeSize(type);
			previousType = type
		}
		i += typeSize
	}
	return ret
}
Module["allocate"] = allocate;

function Pointer_stringify(ptr, length) {
	if (length === 0 || !ptr) return "";
	var hasUtf = 0;
	var t;
	var i = 0;
	while (1) {
		t = HEAPU8[ptr + i >> 0];
		hasUtf |= t;
		if (t == 0 && !length) break;
		i++;
		if (length && i == length) break
	}
	if (!length) length = i;
	var ret = "";
	if (hasUtf < 128) {
		var MAX_CHUNK = 1024;
		var curr;
		while (length > 0) {
			curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
			ret = ret ? ret + curr : curr;
			ptr += MAX_CHUNK;
			length -= MAX_CHUNK
		}
		return ret
	}
	return Module["UTF8ToString"](ptr)
}
Module["Pointer_stringify"] = Pointer_stringify;

function AsciiToString(ptr) {
	var str = "";
	while (1) {
		var ch = HEAP8[ptr++ >> 0];
		if (!ch) return str;
		str += String.fromCharCode(ch)
	}
}
Module["AsciiToString"] = AsciiToString;

function stringToAscii(str, outPtr) {
	return writeAsciiToMemory(str, outPtr, false)
}
Module["stringToAscii"] = stringToAscii;

function UTF8ArrayToString(u8Array, idx) {
	var u0, u1, u2, u3, u4, u5;
	var str = "";
	while (1) {
		u0 = u8Array[idx++];
		if (!u0) return str;
		if (!(u0 & 128)) {
			str += String.fromCharCode(u0);
			continue
		}
		u1 = u8Array[idx++] & 63;
		if ((u0 & 224) == 192) {
			str += String.fromCharCode((u0 & 31) << 6 | u1);
			continue
		}
		u2 = u8Array[idx++] & 63;
		if ((u0 & 240) == 224) {
			u0 = (u0 & 15) << 12 | u1 << 6 | u2
		} else {
			u3 = u8Array[idx++] & 63;
			if ((u0 & 248) == 240) {
				u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
			} else {
				u4 = u8Array[idx++] & 63;
				if ((u0 & 252) == 248) {
					u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
				} else {
					u5 = u8Array[idx++] & 63;
					u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
				}
			}
		}
		if (u0 < 65536) {
			str += String.fromCharCode(u0)
		} else {
			var ch = u0 - 65536;
			str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
		}
	}
}
Module["UTF8ArrayToString"] = UTF8ArrayToString;

function UTF8ToString(ptr) {
	return UTF8ArrayToString(HEAPU8, ptr)
}
Module["UTF8ToString"] = UTF8ToString;

function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
	if (!(maxBytesToWrite > 0)) return 0;
	var startIdx = outIdx;
	var endIdx = outIdx + maxBytesToWrite - 1;
	for (var i = 0; i < str.length; ++i) {
		var u = str.charCodeAt(i);
		if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
		if (u <= 127) {
			if (outIdx >= endIdx) break;
			outU8Array[outIdx++] = u
		} else if (u <= 2047) {
			if (outIdx + 1 >= endIdx) break;
			outU8Array[outIdx++] = 192 | u >> 6;
			outU8Array[outIdx++] = 128 | u & 63
		} else if (u <= 65535) {
			if (outIdx + 2 >= endIdx) break;
			outU8Array[outIdx++] = 224 | u >> 12;
			outU8Array[outIdx++] = 128 | u >> 6 & 63;
			outU8Array[outIdx++] = 128 | u & 63
		} else if (u <= 2097151) {
			if (outIdx + 3 >= endIdx) break;
			outU8Array[outIdx++] = 240 | u >> 18;
			outU8Array[outIdx++] = 128 | u >> 12 & 63;
			outU8Array[outIdx++] = 128 | u >> 6 & 63;
			outU8Array[outIdx++] = 128 | u & 63
		} else if (u <= 67108863) {
			if (outIdx + 4 >= endIdx) break;
			outU8Array[outIdx++] = 248 | u >> 24;
			outU8Array[outIdx++] = 128 | u >> 18 & 63;
			outU8Array[outIdx++] = 128 | u >> 12 & 63;
			outU8Array[outIdx++] = 128 | u >> 6 & 63;
			outU8Array[outIdx++] = 128 | u & 63
		} else {
			if (outIdx + 5 >= endIdx) break;
			outU8Array[outIdx++] = 252 | u >> 30;
			outU8Array[outIdx++] = 128 | u >> 24 & 63;
			outU8Array[outIdx++] = 128 | u >> 18 & 63;
			outU8Array[outIdx++] = 128 | u >> 12 & 63;
			outU8Array[outIdx++] = 128 | u >> 6 & 63;
			outU8Array[outIdx++] = 128 | u & 63
		}
	}
	outU8Array[outIdx] = 0;
	return outIdx - startIdx
}
Module["stringToUTF8Array"] = stringToUTF8Array;

function stringToUTF8(str, outPtr, maxBytesToWrite) {
	return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
}
Module["stringToUTF8"] = stringToUTF8;

function lengthBytesUTF8(str) {
	var len = 0;
	for (var i = 0; i < str.length; ++i) {
		var u = str.charCodeAt(i);
		if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
		if (u <= 127) {
			++len
		} else if (u <= 2047) {
			len += 2
		} else if (u <= 65535) {
			len += 3
		} else if (u <= 2097151) {
			len += 4
		} else if (u <= 67108863) {
			len += 5
		} else {
			len += 6
		}
	}
	return len
}
Module["lengthBytesUTF8"] = lengthBytesUTF8;

function UTF16ToString(ptr) {
	var i = 0;
	var str = "";
	while (1) {
		var codeUnit = HEAP16[ptr + i * 2 >> 1];
		if (codeUnit == 0) return str;
		++i;
		str += String.fromCharCode(codeUnit)
	}
}
Module["UTF16ToString"] = UTF16ToString;

function stringToUTF16(str, outPtr, maxBytesToWrite) {
	if (maxBytesToWrite === undefined) {
		maxBytesToWrite = 2147483647
	}
	if (maxBytesToWrite < 2) return 0;
	maxBytesToWrite -= 2;
	var startPtr = outPtr;
	var numCharsToWrite = maxBytesToWrite < str.length * 2 ? maxBytesToWrite / 2 : str.length;
	for (var i = 0; i < numCharsToWrite; ++i) {
		var codeUnit = str.charCodeAt(i);
		HEAP16[outPtr >> 1] = codeUnit;
		outPtr += 2
	}
	HEAP16[outPtr >> 1] = 0;
	return outPtr - startPtr
}
Module["stringToUTF16"] = stringToUTF16;

function lengthBytesUTF16(str) {
	return str.length * 2
}
Module["lengthBytesUTF16"] = lengthBytesUTF16;

function UTF32ToString(ptr) {
	var i = 0;
	var str = "";
	while (1) {
		var utf32 = HEAP32[ptr + i * 4 >> 2];
		if (utf32 == 0) return str;
		++i;
		if (utf32 >= 65536) {
			var ch = utf32 - 65536;
			str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
		} else {
			str += String.fromCharCode(utf32)
		}
	}
}
Module["UTF32ToString"] = UTF32ToString;

function stringToUTF32(str, outPtr, maxBytesToWrite) {
	if (maxBytesToWrite === undefined) {
		maxBytesToWrite = 2147483647
	}
	if (maxBytesToWrite < 4) return 0;
	var startPtr = outPtr;
	var endPtr = startPtr + maxBytesToWrite - 4;
	for (var i = 0; i < str.length; ++i) {
		var codeUnit = str.charCodeAt(i);
		if (codeUnit >= 55296 && codeUnit <= 57343) {
			var trailSurrogate = str.charCodeAt(++i);
			codeUnit = 65536 + ((codeUnit & 1023) << 10) | trailSurrogate & 1023
		}
		HEAP32[outPtr >> 2] = codeUnit;
		outPtr += 4;
		if (outPtr + 4 > endPtr) break
	}
	HEAP32[outPtr >> 2] = 0;
	return outPtr - startPtr
}
Module["stringToUTF32"] = stringToUTF32;

function lengthBytesUTF32(str) {
	var len = 0;
	for (var i = 0; i < str.length; ++i) {
		var codeUnit = str.charCodeAt(i);
		if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
		len += 4
	}
	return len
}
Module["lengthBytesUTF32"] = lengthBytesUTF32;

function demangle(func) {
	var hasLibcxxabi = !!Module["___cxa_demangle"];
	if (hasLibcxxabi) {
		try {
			var buf = _malloc(func.length);
			writeStringToMemory(func.substr(1), buf);
			var status = _malloc(4);
			var ret = Module["___cxa_demangle"](buf, 0, 0, status);
			if (getValue(status, "i32") === 0 && ret) {
				return Pointer_stringify(ret)
			}
		} catch (e) {} finally {
			if (buf) _free(buf);
			if (status) _free(status);
			if (ret) _free(ret)
		}
	}
	var i = 3;
	var basicTypes = {
		"v": "void",
		"b": "bool",
		"c": "char",
		"s": "short",
		"i": "int",
		"l": "long",
		"f": "float",
		"d": "double",
		"w": "wchar_t",
		"a": "signed char",
		"h": "unsigned char",
		"t": "unsigned short",
		"j": "unsigned int",
		"m": "unsigned long",
		"x": "long long",
		"y": "unsigned long long",
		"z": "..."
	};
	var subs = [];
	var first = true;

	function dump(x) {
		if (x) Module.print(x);
		Module.print(func);
		var pre = "";
		for (var a = 0; a < i; a++) pre += " ";
		Module.print(pre + "^")
	}

	function parseNested() {
		i++;
		if (func[i] === "K") i++;
		var parts = [];
		while (func[i] !== "E") {
			if (func[i] === "S") {
				i++;
				var next = func.indexOf("_", i);
				var num = func.substring(i, next) || 0;
				parts.push(subs[num] || "?");
				i = next + 1;
				continue
			}
			if (func[i] === "C") {
				parts.push(parts[parts.length - 1]);
				i += 2;
				continue
			}
			var size = parseInt(func.substr(i));
			var pre = size.toString().length;
			if (!size || !pre) {
				i--;
				break
			}
			var curr = func.substr(i + pre, size);
			parts.push(curr);
			subs.push(curr);
			i += pre + size
		}
		i++;
		return parts
	}

	function parse(rawList, limit, allowVoid) {
		limit = limit || Infinity;
		var ret = "",
			list = [];

		function flushList() {
			return "(" + list.join(", ") + ")"
		}
		var name;
		if (func[i] === "N") {
			name = parseNested().join("::");
			limit--;
			if (limit === 0) return rawList ? [name] : name
		} else {
			if (func[i] === "K" || first && func[i] === "L") i++;
			var size = parseInt(func.substr(i));
			if (size) {
				var pre = size.toString().length;
				name = func.substr(i + pre, size);
				i += pre + size
			}
		}
		first = false;
		if (func[i] === "I") {
			i++;
			var iList = parse(true);
			var iRet = parse(true, 1, true);
			ret += iRet[0] + " " + name + "<" + iList.join(", ") + ">"
		} else {
			ret = name
		}
		paramLoop: while (i < func.length && limit-- > 0) {
			var c = func[i++];
			if (c in basicTypes) {
				list.push(basicTypes[c])
			} else {
				switch (c) {
					case "P":
						list.push(parse(true, 1, true)[0] + "*");
						break;
					case "R":
						list.push(parse(true, 1, true)[0] + "&");
						break;
					case "L":
						{
							i++;
							var end = func.indexOf("E", i);
							var size = end - i;
							list.push(func.substr(i, size));
							i += size + 2;
							break
						};
					case "A":
						{
							var size = parseInt(func.substr(i));
							i += size.toString().length;
							if (func[i] !== "_") throw "?";
							i++;
							list.push(parse(true, 1, true)[0] + " [" + size + "]");
							break
						};
					case "E":
						break paramLoop;
					default:
						ret += "?" + c;
						break paramLoop
				}
			}
		}
		if (!allowVoid && list.length === 1 && list[0] === "void") list = [];
		if (rawList) {
			if (ret) {
				list.push(ret + "?")
			}
			return list
		} else {
			return ret + flushList()
		}
	}
	var parsed = func;
	try {
		if (func == "Object._main" || func == "_main") {
			return "main()"
		}
		if (typeof func === "number") func = Pointer_stringify(func);
		if (func[0] !== "_") return func;
		if (func[1] !== "_") return func;
		if (func[2] !== "Z") return func;
		switch (func[3]) {
			case "n":
				return "operator new()";
			case "d":
				return "operator delete()"
		}
		parsed = parse()
	} catch (e) {
		parsed += "?"
	}
	if (parsed.indexOf("?") >= 0 && !hasLibcxxabi) {
		Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling")
	}
	return parsed
}

function demangleAll(text) {
	return text.replace(/__Z[\w\d_]+/g, (function(x) {
		var y = demangle(x);
		return x === y ? x : x + " [" + y + "]"
	}))
}

function jsStackTrace() {
	var err = new Error;
	if (!err.stack) {
		try {
			throw new Error(0)
		} catch (e) {
			err = e
		}
		if (!err.stack) {
			return "(no stack trace available)"
		}
	}
	return err.stack.toString()
}

function stackTrace() {
	return demangleAll(jsStackTrace())
}
Module["stackTrace"] = stackTrace;
var PAGE_SIZE = 4096;

function alignMemoryPage(x) {
	if (x % 4096 > 0) {
		x += 4096 - x % 4096
	}
	return x
}
var HEAP;
var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
var STATIC_BASE = 0,
	STATICTOP = 0,
	staticSealed = false;
var STACK_BASE = 0,
	STACKTOP = 0,
	STACK_MAX = 0;
var DYNAMIC_BASE = 0,
	DYNAMICTOP = 0;

function enlargeMemory() {
	var OLD_TOTAL_MEMORY = TOTAL_MEMORY;
	var LIMIT = Math.pow(2, 31);
	if (DYNAMICTOP >= LIMIT) return false;
	while (TOTAL_MEMORY <= DYNAMICTOP) {
		if (TOTAL_MEMORY < LIMIT / 2) {
			TOTAL_MEMORY = alignMemoryPage(2 * TOTAL_MEMORY)
		} else {
			var last = TOTAL_MEMORY;
			TOTAL_MEMORY = alignMemoryPage((3 * TOTAL_MEMORY + LIMIT) / 4);
			if (TOTAL_MEMORY <= last) return false
		}
	}
	TOTAL_MEMORY = Math.max(TOTAL_MEMORY, 16 * 1024 * 1024);
	if (TOTAL_MEMORY >= LIMIT) return false;
	try {
		if (ArrayBuffer.transfer) {
			buffer = ArrayBuffer.transfer(buffer, TOTAL_MEMORY)
		} else {
			var oldHEAP8 = HEAP8;
			buffer = new ArrayBuffer(TOTAL_MEMORY)
		}
	} catch (e) {
		return false
	}
	var success = _emscripten_replace_memory(buffer);
	if (!success) return false;
	Module["buffer"] = buffer;
	Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
	Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
	Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
	Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
	Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
	Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
	Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
	Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
	if (!ArrayBuffer.transfer) {
		HEAP8.set(oldHEAP8)
	}
	return true
}
var byteLength;
try {
	byteLength = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, "byteLength").get);
	byteLength(new ArrayBuffer(4))
} catch (e) {
	byteLength = (function(buffer) {
		return buffer.byteLength
	})
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
var totalMemory = 64 * 1024;
while (totalMemory < TOTAL_MEMORY || totalMemory < 2 * TOTAL_STACK) {
	if (totalMemory < 16 * 1024 * 1024) {
		totalMemory *= 2
	} else {
		totalMemory += 16 * 1024 * 1024
	}
}
totalMemory = Math.max(totalMemory, 16 * 1024 * 1024);
if (totalMemory !== TOTAL_MEMORY) {
	Module.printErr("increasing TOTAL_MEMORY to " + totalMemory + " to be compliant with the asm.js spec (and given that TOTAL_STACK=" + TOTAL_STACK + ")");
	TOTAL_MEMORY = totalMemory
}
assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && !!(new Int32Array(1))["subarray"] && !!(new Int32Array(1))["set"], "JS engine does not provide full typed array support");
var buffer = new ArrayBuffer(TOTAL_MEMORY);
HEAP8 = new Int8Array(buffer);
HEAP16 = new Int16Array(buffer);
HEAP32 = new Int32Array(buffer);
HEAPU8 = new Uint8Array(buffer);
HEAPU16 = new Uint16Array(buffer);
HEAPU32 = new Uint32Array(buffer);
HEAPF32 = new Float32Array(buffer);
HEAPF64 = new Float64Array(buffer);
HEAP32[0] = 255;
assert(HEAPU8[0] === 255 && HEAPU8[3] === 0, "Typed arrays 2 must be run on a little-endian system");
Module["HEAP"] = HEAP;
Module["buffer"] = buffer;
Module["HEAP8"] = HEAP8;
Module["HEAP16"] = HEAP16;
Module["HEAP32"] = HEAP32;
Module["HEAPU8"] = HEAPU8;
Module["HEAPU16"] = HEAPU16;
Module["HEAPU32"] = HEAPU32;
Module["HEAPF32"] = HEAPF32;
Module["HEAPF64"] = HEAPF64;

function callRuntimeCallbacks(callbacks) {
	while (callbacks.length > 0) {
		var callback = callbacks.shift();
		if (typeof callback == "function") {
			callback();
			continue
		}
		var func = callback.func;
		if (typeof func === "number") {
			if (callback.arg === undefined) {
				Runtime.dynCall("v", func)
			} else {
				Runtime.dynCall("vi", func, [callback.arg])
			}
		} else {
			func(callback.arg === undefined ? null : callback.arg)
		}
	}
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;

function preRun() {
	if (Module["preRun"]) {
		if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
		while (Module["preRun"].length) {
			addOnPreRun(Module["preRun"].shift())
		}
	}
	callRuntimeCallbacks(__ATPRERUN__)
}

function ensureInitRuntime() {
	if (runtimeInitialized) return;
	runtimeInitialized = true;
	callRuntimeCallbacks(__ATINIT__)
}

function preMain() {
	callRuntimeCallbacks(__ATMAIN__)
}

function exitRuntime() {
	callRuntimeCallbacks(__ATEXIT__);
	runtimeExited = true
}

function postRun() {
	if (Module["postRun"]) {
		if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
		while (Module["postRun"].length) {
			addOnPostRun(Module["postRun"].shift())
		}
	}
	callRuntimeCallbacks(__ATPOSTRUN__)
}

function addOnPreRun(cb) {
	__ATPRERUN__.unshift(cb)
}
Module["addOnPreRun"] = Module.addOnPreRun = addOnPreRun;

function addOnInit(cb) {
	__ATINIT__.unshift(cb)
}
Module["addOnInit"] = Module.addOnInit = addOnInit;

function addOnPreMain(cb) {
	__ATMAIN__.unshift(cb)
}
Module["addOnPreMain"] = Module.addOnPreMain = addOnPreMain;

function addOnExit(cb) {
	__ATEXIT__.unshift(cb)
}
Module["addOnExit"] = Module.addOnExit = addOnExit;

function addOnPostRun(cb) {
	__ATPOSTRUN__.unshift(cb)
}
Module["addOnPostRun"] = Module.addOnPostRun = addOnPostRun;

function intArrayFromString(stringy, dontAddNull, length) {
	var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
	var u8array = new Array(len);
	var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
	if (dontAddNull) u8array.length = numBytesWritten;
	return u8array
}
Module["intArrayFromString"] = intArrayFromString;

function intArrayToString(array) {
	var ret = [];
	for (var i = 0; i < array.length; i++) {
		var chr = array[i];
		if (chr > 255) {
			chr &= 255
		}
		ret.push(String.fromCharCode(chr))
	}
	return ret.join("")
}
Module["intArrayToString"] = intArrayToString;

function writeStringToMemory(string, buffer, dontAddNull) {
	var array = intArrayFromString(string, dontAddNull);
	var i = 0;
	while (i < array.length) {
		var chr = array[i];
		HEAP8[buffer + i >> 0] = chr;
		i = i + 1
	}
}
Module["writeStringToMemory"] = writeStringToMemory;

function writeArrayToMemory(array, buffer) {
	for (var i = 0; i < array.length; i++) {
		HEAP8[buffer++ >> 0] = array[i]
	}
}
Module["writeArrayToMemory"] = writeArrayToMemory;

function writeAsciiToMemory(str, buffer, dontAddNull) {
	for (var i = 0; i < str.length; ++i) {
		HEAP8[buffer++ >> 0] = str.charCodeAt(i)
	}
	if (!dontAddNull) HEAP8[buffer >> 0] = 0
}
Module["writeAsciiToMemory"] = writeAsciiToMemory;

function unSign(value, bits, ignore) {
	if (value >= 0) {
		return value
	}
	return bits <= 32 ? 2 * Math.abs(1 << bits - 1) + value : Math.pow(2, bits) + value
}

function reSign(value, bits, ignore) {
	if (value <= 0) {
		return value
	}
	var half = bits <= 32 ? Math.abs(1 << bits - 1) : Math.pow(2, bits - 1);
	if (value >= half && (bits <= 32 || value > half)) {
		value = -2 * half + value
	}
	return value
}
if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5) Math["imul"] = function imul(a, b) {
	var ah = a >>> 16;
	var al = a & 65535;
	var bh = b >>> 16;
	var bl = b & 65535;
	return al * bl + (ah * bl + al * bh << 16) | 0
};
Math.imul = Math["imul"];
if (!Math["clz32"]) Math["clz32"] = (function(x) {
	x = x >>> 0;
	for (var i = 0; i < 32; i++) {
		if (x & 1 << 31 - i) return i
	}
	return 32
});
Math.clz32 = Math["clz32"];
var Math_abs = Math.abs;
var Math_cos = Math.cos;
var Math_sin = Math.sin;
var Math_tan = Math.tan;
var Math_acos = Math.acos;
var Math_asin = Math.asin;
var Math_atan = Math.atan;
var Math_atan2 = Math.atan2;
var Math_exp = Math.exp;
var Math_log = Math.log;
var Math_sqrt = Math.sqrt;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_pow = Math.pow;
var Math_imul = Math.imul;
var Math_fround = Math.fround;
var Math_min = Math.min;
var Math_clz32 = Math.clz32;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;

function addRunDependency(id) {
	runDependencies++;
	if (Module["monitorRunDependencies"]) {
		Module["monitorRunDependencies"](runDependencies)
	}
}
Module["addRunDependency"] = addRunDependency;

function removeRunDependency(id) {
	runDependencies--;
	if (Module["monitorRunDependencies"]) {
		Module["monitorRunDependencies"](runDependencies)
	}
	if (runDependencies == 0) {
		if (runDependencyWatcher !== null) {
			clearInterval(runDependencyWatcher);
			runDependencyWatcher = null
		}
		if (dependenciesFulfilled) {
			var callback = dependenciesFulfilled;
			dependenciesFulfilled = null;
			callback()
		}
	}
}
Module["removeRunDependency"] = removeRunDependency;
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
STATIC_BASE = 8;
STATICTOP = STATIC_BASE + 63088;
__ATINIT__.push({
	func: (function() {
		__GLOBAL__sub_I_global_cpp()
	})
}, {
	func: (function() {
		__GLOBAL__sub_I_crc_cpp()
	})
}, {
	func: (function() {
		__GLOBAL__sub_I_threadpool_cpp()
	})
});
var memoryInitializer = "./libunrar.js.mem";
var tempDoublePtr = Runtime.alignMemory(allocate(12, "i8", ALLOC_STATIC), 8);
assert(tempDoublePtr % 8 == 0);

function copyTempFloat(ptr) {
	HEAP8[tempDoublePtr] = HEAP8[ptr];
	HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
	HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
	HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3]
}

function copyTempDouble(ptr) {
	HEAP8[tempDoublePtr] = HEAP8[ptr];
	HEAP8[tempDoublePtr + 1] = HEAP8[ptr + 1];
	HEAP8[tempDoublePtr + 2] = HEAP8[ptr + 2];
	HEAP8[tempDoublePtr + 3] = HEAP8[ptr + 3];
	HEAP8[tempDoublePtr + 4] = HEAP8[ptr + 4];
	HEAP8[tempDoublePtr + 5] = HEAP8[ptr + 5];
	HEAP8[tempDoublePtr + 6] = HEAP8[ptr + 6];
	HEAP8[tempDoublePtr + 7] = HEAP8[ptr + 7]
}

function _atexit(func, arg) {
	__ATEXIT__.unshift({
		func: func,
		arg: arg
	})
}

function ___cxa_atexit() {
	return _atexit.apply(null, arguments)
}
Module["_i64Subtract"] = _i64Subtract;
Module["_i64Add"] = _i64Add;
var ERRNO_CODES = {
	EPERM: 1,
	ENOENT: 2,
	ESRCH: 3,
	EINTR: 4,
	EIO: 5,
	ENXIO: 6,
	E2BIG: 7,
	ENOEXEC: 8,
	EBADF: 9,
	ECHILD: 10,
	EAGAIN: 11,
	EWOULDBLOCK: 11,
	ENOMEM: 12,
	EACCES: 13,
	EFAULT: 14,
	ENOTBLK: 15,
	EBUSY: 16,
	EEXIST: 17,
	EXDEV: 18,
	ENODEV: 19,
	ENOTDIR: 20,
	EISDIR: 21,
	EINVAL: 22,
	ENFILE: 23,
	EMFILE: 24,
	ENOTTY: 25,
	ETXTBSY: 26,
	EFBIG: 27,
	ENOSPC: 28,
	ESPIPE: 29,
	EROFS: 30,
	EMLINK: 31,
	EPIPE: 32,
	EDOM: 33,
	ERANGE: 34,
	ENOMSG: 42,
	EIDRM: 43,
	ECHRNG: 44,
	EL2NSYNC: 45,
	EL3HLT: 46,
	EL3RST: 47,
	ELNRNG: 48,
	EUNATCH: 49,
	ENOCSI: 50,
	EL2HLT: 51,
	EDEADLK: 35,
	ENOLCK: 37,
	EBADE: 52,
	EBADR: 53,
	EXFULL: 54,
	ENOANO: 55,
	EBADRQC: 56,
	EBADSLT: 57,
	EDEADLOCK: 35,
	EBFONT: 59,
	ENOSTR: 60,
	ENODATA: 61,
	ETIME: 62,
	ENOSR: 63,
	ENONET: 64,
	ENOPKG: 65,
	EREMOTE: 66,
	ENOLINK: 67,
	EADV: 68,
	ESRMNT: 69,
	ECOMM: 70,
	EPROTO: 71,
	EMULTIHOP: 72,
	EDOTDOT: 73,
	EBADMSG: 74,
	ENOTUNIQ: 76,
	EBADFD: 77,
	EREMCHG: 78,
	ELIBACC: 79,
	ELIBBAD: 80,
	ELIBSCN: 81,
	ELIBMAX: 82,
	ELIBEXEC: 83,
	ENOSYS: 38,
	ENOTEMPTY: 39,
	ENAMETOOLONG: 36,
	ELOOP: 40,
	EOPNOTSUPP: 95,
	EPFNOSUPPORT: 96,
	ECONNRESET: 104,
	ENOBUFS: 105,
	EAFNOSUPPORT: 97,
	EPROTOTYPE: 91,
	ENOTSOCK: 88,
	ENOPROTOOPT: 92,
	ESHUTDOWN: 108,
	ECONNREFUSED: 111,
	EADDRINUSE: 98,
	ECONNABORTED: 103,
	ENETUNREACH: 101,
	ENETDOWN: 100,
	ETIMEDOUT: 110,
	EHOSTDOWN: 112,
	EHOSTUNREACH: 113,
	EINPROGRESS: 115,
	EALREADY: 114,
	EDESTADDRREQ: 89,
	EMSGSIZE: 90,
	EPROTONOSUPPORT: 93,
	ESOCKTNOSUPPORT: 94,
	EADDRNOTAVAIL: 99,
	ENETRESET: 102,
	EISCONN: 106,
	ENOTCONN: 107,
	ETOOMANYREFS: 109,
	EUSERS: 87,
	EDQUOT: 122,
	ESTALE: 116,
	ENOTSUP: 95,
	ENOMEDIUM: 123,
	EILSEQ: 84,
	EOVERFLOW: 75,
	ECANCELED: 125,
	ENOTRECOVERABLE: 131,
	EOWNERDEAD: 130,
	ESTRPIPE: 86
};
var ERRNO_MESSAGES = {
	0: "Success",
	1: "Not super-user",
	2: "No such file or directory",
	3: "No such process",
	4: "Interrupted system call",
	5: "I/O error",
	6: "No such device or address",
	7: "Arg list too long",
	8: "Exec format error",
	9: "Bad file number",
	10: "No children",
	11: "No more processes",
	12: "Not enough core",
	13: "Permission denied",
	14: "Bad address",
	15: "Block device required",
	16: "Mount device busy",
	17: "File exists",
	18: "Cross-device link",
	19: "No such device",
	20: "Not a directory",
	21: "Is a directory",
	22: "Invalid argument",
	23: "Too many open files in system",
	24: "Too many open files",
	25: "Not a typewriter",
	26: "Text file busy",
	27: "File too large",
	28: "No space left on device",
	29: "Illegal seek",
	30: "Read only file system",
	31: "Too many links",
	32: "Broken pipe",
	33: "Math arg out of domain of func",
	34: "Math result not representable",
	35: "File locking deadlock error",
	36: "File or path name too long",
	37: "No record locks available",
	38: "Function not implemented",
	39: "Directory not empty",
	40: "Too many symbolic links",
	42: "No message of desired type",
	43: "Identifier removed",
	44: "Channel number out of range",
	45: "Level 2 not synchronized",
	46: "Level 3 halted",
	47: "Level 3 reset",
	48: "Link number out of range",
	49: "Protocol driver not attached",
	50: "No CSI structure available",
	51: "Level 2 halted",
	52: "Invalid exchange",
	53: "Invalid request descriptor",
	54: "Exchange full",
	55: "No anode",
	56: "Invalid request code",
	57: "Invalid slot",
	59: "Bad font file fmt",
	60: "Device not a stream",
	61: "No data (for no delay io)",
	62: "Timer expired",
	63: "Out of streams resources",
	64: "Machine is not on the network",
	65: "Package not installed",
	66: "The object is remote",
	67: "The link has been severed",
	68: "Advertise error",
	69: "Srmount error",
	70: "Communication error on send",
	71: "Protocol error",
	72: "Multihop attempted",
	73: "Cross mount point (not really error)",
	74: "Trying to read unreadable message",
	75: "Value too large for defined data type",
	76: "Given log. name not unique",
	77: "f.d. invalid for this operation",
	78: "Remote address changed",
	79: "Can   access a needed shared lib",
	80: "Accessing a corrupted shared lib",
	81: ".lib section in a.out corrupted",
	82: "Attempting to link in too many libs",
	83: "Attempting to exec a shared library",
	84: "Illegal byte sequence",
	86: "Streams pipe error",
	87: "Too many users",
	88: "Socket operation on non-socket",
	89: "Destination address required",
	90: "Message too long",
	91: "Protocol wrong type for socket",
	92: "Protocol not available",
	93: "Unknown protocol",
	94: "Socket type not supported",
	95: "Not supported",
	96: "Protocol family not supported",
	97: "Address family not supported by protocol family",
	98: "Address already in use",
	99: "Address not available",
	100: "Network interface is not configured",
	101: "Network is unreachable",
	102: "Connection reset by network",
	103: "Connection aborted",
	104: "Connection reset by peer",
	105: "No buffer space available",
	106: "Socket is already connected",
	107: "Socket is not connected",
	108: "Can't send after socket shutdown",
	109: "Too many references",
	110: "Connection timed out",
	111: "Connection refused",
	112: "Host is down",
	113: "Host is unreachable",
	114: "Socket already connected",
	115: "Connection already in progress",
	116: "Stale file handle",
	122: "Quota exceeded",
	123: "No medium (in tape drive)",
	125: "Operation canceled",
	130: "Previous owner died",
	131: "State not recoverable"
};
var ___errno_state = 0;

function ___setErrNo(value) {
	HEAP32[___errno_state >> 2] = value;
	return value
}
var PATH = {
	splitPath: (function(filename) {
		var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
		return splitPathRe.exec(filename).slice(1)
	}),
	normalizeArray: (function(parts, allowAboveRoot) {
		var up = 0;
		for (var i = parts.length - 1; i >= 0; i--) {
			var last = parts[i];
			if (last === ".") {
				parts.splice(i, 1)
			} else if (last === "..") {
				parts.splice(i, 1);
				up++
			} else if (up) {
				parts.splice(i, 1);
				up--
			}
		}
		if (allowAboveRoot) {
			for (; up--; up) {
				parts.unshift("..")
			}
		}
		return parts
	}),
	normalize: (function(path) {
		var isAbsolute = path.charAt(0) === "/",
			trailingSlash = path.substr(-1) === "/";
		path = PATH.normalizeArray(path.split("/").filter((function(p) {
			return !!p
		})), !isAbsolute).join("/");
		if (!path && !isAbsolute) {
			path = "."
		}
		if (path && trailingSlash) {
			path += "/"
		}
		return (isAbsolute ? "/" : "") + path
	}),
	dirname: (function(path) {
		var result = PATH.splitPath(path),
			root = result[0],
			dir = result[1];
		if (!root && !dir) {
			return "."
		}
		if (dir) {
			dir = dir.substr(0, dir.length - 1)
		}
		return root + dir
	}),
	basename: (function(path) {
		if (path === "/") return "/";
		var lastSlash = path.lastIndexOf("/");
		if (lastSlash === -1) return path;
		return path.substr(lastSlash + 1)
	}),
	extname: (function(path) {
		return PATH.splitPath(path)[3]
	}),
	join: (function() {
		var paths = Array.prototype.slice.call(arguments, 0);
		return PATH.normalize(paths.join("/"))
	}),
	join2: (function(l, r) {
		return PATH.normalize(l + "/" + r)
	}),
	resolve: (function() {
		var resolvedPath = "",
			resolvedAbsolute = false;
		for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
			var path = i >= 0 ? arguments[i] : FS.cwd();
			if (typeof path !== "string") {
				throw new TypeError("Arguments to path.resolve must be strings")
			} else if (!path) {
				return ""
			}
			resolvedPath = path + "/" + resolvedPath;
			resolvedAbsolute = path.charAt(0) === "/"
		}
		resolvedPath = PATH.normalizeArray(resolvedPath.split("/").filter((function(p) {
			return !!p
		})), !resolvedAbsolute).join("/");
		return (resolvedAbsolute ? "/" : "") + resolvedPath || "."
	}),
	relative: (function(from, to) {
		from = PATH.resolve(from).substr(1);
		to = PATH.resolve(to).substr(1);

		function trim(arr) {
			var start = 0;
			for (; start < arr.length; start++) {
				if (arr[start] !== "") break
			}
			var end = arr.length - 1;
			for (; end >= 0; end--) {
				if (arr[end] !== "") break
			}
			if (start > end) return [];
			return arr.slice(start, end - start + 1)
		}
		var fromParts = trim(from.split("/"));
		var toParts = trim(to.split("/"));
		var length = Math.min(fromParts.length, toParts.length);
		var samePartsLength = length;
		for (var i = 0; i < length; i++) {
			if (fromParts[i] !== toParts[i]) {
				samePartsLength = i;
				break
			}
		}
		var outputParts = [];
		for (var i = samePartsLength; i < fromParts.length; i++) {
			outputParts.push("..")
		}
		outputParts = outputParts.concat(toParts.slice(samePartsLength));
		return outputParts.join("/")
	})
};
var TTY = {
	ttys: [],
	init: (function() {}),
	shutdown: (function() {}),
	register: (function(dev, ops) {
		TTY.ttys[dev] = {
			input: [],
			output: [],
			ops: ops
		};
		FS.registerDevice(dev, TTY.stream_ops)
	}),
	stream_ops: {
		open: (function(stream) {
			var tty = TTY.ttys[stream.node.rdev];
			if (!tty) {
				throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
			}
			stream.tty = tty;
			stream.seekable = false
		}),
		close: (function(stream) {
			stream.tty.ops.flush(stream.tty)
		}),
		flush: (function(stream) {
			stream.tty.ops.flush(stream.tty)
		}),
		read: (function(stream, buffer, offset, length, pos) {
			if (!stream.tty || !stream.tty.ops.get_char) {
				throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
			}
			var bytesRead = 0;
			for (var i = 0; i < length; i++) {
				var result;
				try {
					result = stream.tty.ops.get_char(stream.tty)
				} catch (e) {
					throw new FS.ErrnoError(ERRNO_CODES.EIO)
				}
				if (result === undefined && bytesRead === 0) {
					throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
				}
				if (result === null || result === undefined) break;
				bytesRead++;
				buffer[offset + i] = result
			}
			if (bytesRead) {
				stream.node.timestamp = Date.now()
			}
			return bytesRead
		}),
		write: (function(stream, buffer, offset, length, pos) {
			if (!stream.tty || !stream.tty.ops.put_char) {
				throw new FS.ErrnoError(ERRNO_CODES.ENXIO)
			}
			for (var i = 0; i < length; i++) {
				try {
					stream.tty.ops.put_char(stream.tty, buffer[offset + i])
				} catch (e) {
					throw new FS.ErrnoError(ERRNO_CODES.EIO)
				}
			}
			if (length) {
				stream.node.timestamp = Date.now()
			}
			return i
		})
	},
	default_tty_ops: {
		get_char: (function(tty) {
			if (!tty.input.length) {
				var result = null;
				if (ENVIRONMENT_IS_NODE) {
					var BUFSIZE = 256;
					var buf = new Buffer(BUFSIZE);
					var bytesRead = 0;
					var fd = process.stdin.fd;
					var usingDevice = false;
					try {
						fd = fs.openSync("/dev/stdin", "r");
						usingDevice = true
					} catch (e) {}
					bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);
					if (usingDevice) {
						fs.closeSync(fd)
					}
					if (bytesRead > 0) {
						result = buf.slice(0, bytesRead).toString("utf-8")
					} else {
						result = null
					}
				} else if (typeof window != "undefined" && typeof window.prompt == "function") {
					result = window.prompt("Input: ");
					if (result !== null) {
						result += "\n"
					}
				} else if (typeof readline == "function") {
					result = readline();
					if (result !== null) {
						result += "\n"
					}
				}
				if (!result) {
					return null
				}
				tty.input = intArrayFromString(result, true)
			}
			return tty.input.shift()
		}),
		put_char: (function(tty, val) {
			if (val === null || val === 10) {
				Module["print"](UTF8ArrayToString(tty.output, 0));
				tty.output = []
			} else {
				if (val != 0) tty.output.push(val)
			}
		}),
		flush: (function(tty) {
			if (tty.output && tty.output.length > 0) {
				Module["print"](UTF8ArrayToString(tty.output, 0));
				tty.output = []
			}
		})
	},
	default_tty1_ops: {
		put_char: (function(tty, val) {
			if (val === null || val === 10) {
				Module["printErr"](UTF8ArrayToString(tty.output, 0));
				tty.output = []
			} else {
				if (val != 0) tty.output.push(val)
			}
		}),
		flush: (function(tty) {
			if (tty.output && tty.output.length > 0) {
				Module["printErr"](UTF8ArrayToString(tty.output, 0));
				tty.output = []
			}
		})
	}
};
var MEMFS = {
	ops_table: null,
	mount: (function(mount) {
		return MEMFS.createNode(null, "/", 16384 | 511, 0)
	}),
	createNode: (function(parent, name, mode, dev) {
		if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		if (!MEMFS.ops_table) {
			MEMFS.ops_table = {
				dir: {
					node: {
						getattr: MEMFS.node_ops.getattr,
						setattr: MEMFS.node_ops.setattr,
						lookup: MEMFS.node_ops.lookup,
						mknod: MEMFS.node_ops.mknod,
						rename: MEMFS.node_ops.rename,
						unlink: MEMFS.node_ops.unlink,
						rmdir: MEMFS.node_ops.rmdir,
						readdir: MEMFS.node_ops.readdir,
						symlink: MEMFS.node_ops.symlink
					},
					stream: {
						llseek: MEMFS.stream_ops.llseek
					}
				},
				file: {
					node: {
						getattr: MEMFS.node_ops.getattr,
						setattr: MEMFS.node_ops.setattr
					},
					stream: {
						llseek: MEMFS.stream_ops.llseek,
						read: MEMFS.stream_ops.read,
						write: MEMFS.stream_ops.write,
						allocate: MEMFS.stream_ops.allocate,
						mmap: MEMFS.stream_ops.mmap
					}
				},
				link: {
					node: {
						getattr: MEMFS.node_ops.getattr,
						setattr: MEMFS.node_ops.setattr,
						readlink: MEMFS.node_ops.readlink
					},
					stream: {}
				},
				chrdev: {
					node: {
						getattr: MEMFS.node_ops.getattr,
						setattr: MEMFS.node_ops.setattr
					},
					stream: FS.chrdev_stream_ops
				}
			}
		}
		var node = FS.createNode(parent, name, mode, dev);
		if (FS.isDir(node.mode)) {
			node.node_ops = MEMFS.ops_table.dir.node;
			node.stream_ops = MEMFS.ops_table.dir.stream;
			node.contents = {}
		} else if (FS.isFile(node.mode)) {
			node.node_ops = MEMFS.ops_table.file.node;
			node.stream_ops = MEMFS.ops_table.file.stream;
			node.usedBytes = 0;
			node.contents = null
		} else if (FS.isLink(node.mode)) {
			node.node_ops = MEMFS.ops_table.link.node;
			node.stream_ops = MEMFS.ops_table.link.stream
		} else if (FS.isChrdev(node.mode)) {
			node.node_ops = MEMFS.ops_table.chrdev.node;
			node.stream_ops = MEMFS.ops_table.chrdev.stream
		}
		node.timestamp = Date.now();
		if (parent) {
			parent.contents[name] = node
		}
		return node
	}),
	getFileDataAsRegularArray: (function(node) {
		if (node.contents && node.contents.subarray) {
			var arr = [];
			for (var i = 0; i < node.usedBytes; ++i) arr.push(node.contents[i]);
			return arr
		}
		return node.contents
	}),
	getFileDataAsTypedArray: (function(node) {
		if (!node.contents) return new Uint8Array;
		if (node.contents.subarray) return node.contents.subarray(0, node.usedBytes);
		return new Uint8Array(node.contents)
	}),
	expandFileStorage: (function(node, newCapacity) {
		if (node.contents && node.contents.subarray && newCapacity > node.contents.length) {
			node.contents = MEMFS.getFileDataAsRegularArray(node);
			node.usedBytes = node.contents.length
		}
		if (!node.contents || node.contents.subarray) {
			var prevCapacity = node.contents ? node.contents.buffer.byteLength : 0;
			if (prevCapacity >= newCapacity) return;
			var CAPACITY_DOUBLING_MAX = 1024 * 1024;
			newCapacity = Math.max(newCapacity, prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2 : 1.125) | 0);
			if (prevCapacity != 0) newCapacity = Math.max(newCapacity, 256);
			var oldContents = node.contents;
			node.contents = new Uint8Array(newCapacity);
			if (node.usedBytes > 0) node.contents.set(oldContents.subarray(0, node.usedBytes), 0);
			return
		}
		if (!node.contents && newCapacity > 0) node.contents = [];
		while (node.contents.length < newCapacity) node.contents.push(0)
	}),
	resizeFileStorage: (function(node, newSize) {
		if (node.usedBytes == newSize) return;
		if (newSize == 0) {
			node.contents = null;
			node.usedBytes = 0;
			return
		}
		if (!node.contents || node.contents.subarray) {
			var oldContents = node.contents;
			node.contents = new Uint8Array(new ArrayBuffer(newSize));
			if (oldContents) {
				node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes)))
			}
			node.usedBytes = newSize;
			return
		}
		if (!node.contents) node.contents = [];
		if (node.contents.length > newSize) node.contents.length = newSize;
		else
			while (node.contents.length < newSize) node.contents.push(0);
		node.usedBytes = newSize
	}),
	node_ops: {
		getattr: (function(node) {
			var attr = {};
			attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
			attr.ino = node.id;
			attr.mode = node.mode;
			attr.nlink = 1;
			attr.uid = 0;
			attr.gid = 0;
			attr.rdev = node.rdev;
			if (FS.isDir(node.mode)) {
				attr.size = 4096
			} else if (FS.isFile(node.mode)) {
				attr.size = node.usedBytes
			} else if (FS.isLink(node.mode)) {
				attr.size = node.link.length
			} else {
				attr.size = 0
			}
			attr.atime = new Date(node.timestamp);
			attr.mtime = new Date(node.timestamp);
			attr.ctime = new Date(node.timestamp);
			attr.blksize = 4096;
			attr.blocks = Math.ceil(attr.size / attr.blksize);
			return attr
		}),
		setattr: (function(node, attr) {
			if (attr.mode !== undefined) {
				node.mode = attr.mode
			}
			if (attr.timestamp !== undefined) {
				node.timestamp = attr.timestamp
			}
			if (attr.size !== undefined) {
				MEMFS.resizeFileStorage(node, attr.size)
			}
		}),
		lookup: (function(parent, name) {
			throw FS.genericErrors[ERRNO_CODES.ENOENT]
		}),
		mknod: (function(parent, name, mode, dev) {
			return MEMFS.createNode(parent, name, mode, dev)
		}),
		rename: (function(old_node, new_dir, new_name) {
			if (FS.isDir(old_node.mode)) {
				var new_node;
				try {
					new_node = FS.lookupNode(new_dir, new_name)
				} catch (e) {}
				if (new_node) {
					for (var i in new_node.contents) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
					}
				}
			}
			delete old_node.parent.contents[old_node.name];
			old_node.name = new_name;
			new_dir.contents[new_name] = old_node;
			old_node.parent = new_dir
		}),
		unlink: (function(parent, name) {
			delete parent.contents[name]
		}),
		rmdir: (function(parent, name) {
			var node = FS.lookupNode(parent, name);
			for (var i in node.contents) {
				throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
			}
			delete parent.contents[name]
		}),
		readdir: (function(node) {
			var entries = [".", ".."];
			for (var key in node.contents) {
				if (!node.contents.hasOwnProperty(key)) {
					continue
				}
				entries.push(key)
			}
			return entries
		}),
		symlink: (function(parent, newname, oldpath) {
			var node = MEMFS.createNode(parent, newname, 511 | 40960, 0);
			node.link = oldpath;
			return node
		}),
		readlink: (function(node) {
			if (!FS.isLink(node.mode)) {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
			return node.link
		})
	},
	stream_ops: {
		read: (function(stream, buffer, offset, length, position) {
			var contents = stream.node.contents;
			if (position >= stream.node.usedBytes) return 0;
			var size = Math.min(stream.node.usedBytes - position, length);
			assert(size >= 0);
			if (size > 8 && contents.subarray) {
				buffer.set(contents.subarray(position, position + size), offset)
			} else {
				for (var i = 0; i < size; i++) buffer[offset + i] = contents[position + i]
			}
			return size
		}),
		write: (function(stream, buffer, offset, length, position, canOwn) {
			if (!length) return 0;
			var node = stream.node;
			node.timestamp = Date.now();
			if (buffer.subarray && (!node.contents || node.contents.subarray)) {
				if (canOwn) {
					node.contents = buffer.subarray(offset, offset + length);
					node.usedBytes = length;
					return length
				} else if (node.usedBytes === 0 && position === 0) {
					node.contents = new Uint8Array(buffer.subarray(offset, offset + length));
					node.usedBytes = length;
					return length
				} else if (position + length <= node.usedBytes) {
					node.contents.set(buffer.subarray(offset, offset + length), position);
					return length
				}
			}
			MEMFS.expandFileStorage(node, position + length);
			if (node.contents.subarray && buffer.subarray) node.contents.set(buffer.subarray(offset, offset + length), position);
			else
				for (var i = 0; i < length; i++) {
					node.contents[position + i] = buffer[offset + i]
				}
			node.usedBytes = Math.max(node.usedBytes, position + length);
			return length
		}),
		llseek: (function(stream, offset, whence) {
			var position = offset;
			if (whence === 1) {
				position += stream.position
			} else if (whence === 2) {
				if (FS.isFile(stream.node.mode)) {
					position += stream.node.usedBytes
				}
			}
			if (position < 0) {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
			return position
		}),
		allocate: (function(stream, offset, length) {
			MEMFS.expandFileStorage(stream.node, offset + length);
			stream.node.usedBytes = Math.max(stream.node.usedBytes, offset + length)
		}),
		mmap: (function(stream, buffer, offset, length, position, prot, flags) {
			if (!FS.isFile(stream.node.mode)) {
				throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
			}
			var ptr;
			var allocated;
			var contents = stream.node.contents;
			if (!(flags & 2) && (contents.buffer === buffer || contents.buffer === buffer.buffer)) {
				allocated = false;
				ptr = contents.byteOffset
			} else {
				if (position > 0 || position + length < stream.node.usedBytes) {
					if (contents.subarray) {
						contents = contents.subarray(position, position + length)
					} else {
						contents = Array.prototype.slice.call(contents, position, position + length)
					}
				}
				allocated = true;
				ptr = _malloc(length);
				if (!ptr) {
					throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)
				}
				buffer.set(contents, ptr)
			}
			return {
				ptr: ptr,
				allocated: allocated
			}
		})
	}
};
var IDBFS = {
	dbs: {},
	indexedDB: (function() {
		if (typeof indexedDB !== "undefined") return indexedDB;
		var ret = null;
		if (typeof window === "object") ret = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
		assert(ret, "IDBFS used, but indexedDB not supported");
		return ret
	}),
	DB_VERSION: 21,
	DB_STORE_NAME: "FILE_DATA",
	mount: (function(mount) {
		return MEMFS.mount.apply(null, arguments)
	}),
	syncfs: (function(mount, populate, callback) {
		IDBFS.getLocalSet(mount, (function(err, local) {
			if (err) return callback(err);
			IDBFS.getRemoteSet(mount, (function(err, remote) {
				if (err) return callback(err);
				var src = populate ? remote : local;
				var dst = populate ? local : remote;
				IDBFS.reconcile(src, dst, callback)
			}))
		}))
	}),
	getDB: (function(name, callback) {
		var db = IDBFS.dbs[name];
		if (db) {
			return callback(null, db)
		}
		var req;
		try {
			req = IDBFS.indexedDB().open(name, IDBFS.DB_VERSION)
		} catch (e) {
			return callback(e)
		}
		req.onupgradeneeded = (function(e) {
			var db = e.target.result;
			var transaction = e.target.transaction;
			var fileStore;
			if (db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)) {
				fileStore = transaction.objectStore(IDBFS.DB_STORE_NAME)
			} else {
				fileStore = db.createObjectStore(IDBFS.DB_STORE_NAME)
			}
			if (!fileStore.indexNames.contains("timestamp")) {
				fileStore.createIndex("timestamp", "timestamp", {
					unique: false
				})
			}
		});
		req.onsuccess = (function() {
			db = req.result;
			IDBFS.dbs[name] = db;
			callback(null, db)
		});
		req.onerror = (function(e) {
			callback(this.error);
			e.preventDefault()
		})
	}),
	getLocalSet: (function(mount, callback) {
		var entries = {};

		function isRealDir(p) {
			return p !== "." && p !== ".."
		}

		function toAbsolute(root) {
			return (function(p) {
				return PATH.join2(root, p)
			})
		}
		var check = FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));
		while (check.length) {
			var path = check.pop();
			var stat;
			try {
				stat = FS.stat(path)
			} catch (e) {
				return callback(e)
			}
			if (FS.isDir(stat.mode)) {
				check.push.apply(check, FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))
			}
			entries[path] = {
				timestamp: stat.mtime
			}
		}
		return callback(null, {
			type: "local",
			entries: entries
		})
	}),
	getRemoteSet: (function(mount, callback) {
		var entries = {};
		IDBFS.getDB(mount.mountpoint, (function(err, db) {
			if (err) return callback(err);
			var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readonly");
			transaction.onerror = (function(e) {
				callback(this.error);
				e.preventDefault()
			});
			var store = transaction.objectStore(IDBFS.DB_STORE_NAME);
			var index = store.index("timestamp");
			index.openKeyCursor().onsuccess = (function(event) {
				var cursor = event.target.result;
				if (!cursor) {
					return callback(null, {
						type: "remote",
						db: db,
						entries: entries
					})
				}
				entries[cursor.primaryKey] = {
					timestamp: cursor.key
				};
				cursor.continue()
			})
		}))
	}),
	loadLocalEntry: (function(path, callback) {
		var stat, node;
		try {
			var lookup = FS.lookupPath(path);
			node = lookup.node;
			stat = FS.stat(path)
		} catch (e) {
			return callback(e)
		}
		if (FS.isDir(stat.mode)) {
			return callback(null, {
				timestamp: stat.mtime,
				mode: stat.mode
			})
		} else if (FS.isFile(stat.mode)) {
			node.contents = MEMFS.getFileDataAsTypedArray(node);
			return callback(null, {
				timestamp: stat.mtime,
				mode: stat.mode,
				contents: node.contents
			})
		} else {
			return callback(new Error("node type not supported"))
		}
	}),
	storeLocalEntry: (function(path, entry, callback) {
		try {
			if (FS.isDir(entry.mode)) {
				FS.mkdir(path, entry.mode)
			} else if (FS.isFile(entry.mode)) {
				FS.writeFile(path, entry.contents, {
					encoding: "binary",
					canOwn: true
				})
			} else {
				return callback(new Error("node type not supported"))
			}
			FS.chmod(path, entry.mode);
			FS.utime(path, entry.timestamp, entry.timestamp)
		} catch (e) {
			return callback(e)
		}
		callback(null)
	}),
	removeLocalEntry: (function(path, callback) {
		try {
			var lookup = FS.lookupPath(path);
			var stat = FS.stat(path);
			if (FS.isDir(stat.mode)) {
				FS.rmdir(path)
			} else if (FS.isFile(stat.mode)) {
				FS.unlink(path)
			}
		} catch (e) {
			return callback(e)
		}
		callback(null)
	}),
	loadRemoteEntry: (function(store, path, callback) {
		var req = store.get(path);
		req.onsuccess = (function(event) {
			callback(null, event.target.result)
		});
		req.onerror = (function(e) {
			callback(this.error);
			e.preventDefault()
		})
	}),
	storeRemoteEntry: (function(store, path, entry, callback) {
		var req = store.put(entry, path);
		req.onsuccess = (function() {
			callback(null)
		});
		req.onerror = (function(e) {
			callback(this.error);
			e.preventDefault()
		})
	}),
	removeRemoteEntry: (function(store, path, callback) {
		var req = store.delete(path);
		req.onsuccess = (function() {
			callback(null)
		});
		req.onerror = (function(e) {
			callback(this.error);
			e.preventDefault()
		})
	}),
	reconcile: (function(src, dst, callback) {
		var total = 0;
		var create = [];
		Object.keys(src.entries).forEach((function(key) {
			var e = src.entries[key];
			var e2 = dst.entries[key];
			if (!e2 || e.timestamp > e2.timestamp) {
				create.push(key);
				total++
			}
		}));
		var remove = [];
		Object.keys(dst.entries).forEach((function(key) {
			var e = dst.entries[key];
			var e2 = src.entries[key];
			if (!e2) {
				remove.push(key);
				total++
			}
		}));
		if (!total) {
			return callback(null)
		}
		var errored = false;
		var completed = 0;
		var db = src.type === "remote" ? src.db : dst.db;
		var transaction = db.transaction([IDBFS.DB_STORE_NAME], "readwrite");
		var store = transaction.objectStore(IDBFS.DB_STORE_NAME);

		function done(err) {
			if (err) {
				if (!done.errored) {
					done.errored = true;
					return callback(err)
				}
				return
			}
			if (++completed >= total) {
				return callback(null)
			}
		}
		transaction.onerror = (function(e) {
			done(this.error);
			e.preventDefault()
		});
		create.sort().forEach((function(path) {
			if (dst.type === "local") {
				IDBFS.loadRemoteEntry(store, path, (function(err, entry) {
					if (err) return done(err);
					IDBFS.storeLocalEntry(path, entry, done)
				}))
			} else {
				IDBFS.loadLocalEntry(path, (function(err, entry) {
					if (err) return done(err);
					IDBFS.storeRemoteEntry(store, path, entry, done)
				}))
			}
		}));
		remove.sort().reverse().forEach((function(path) {
			if (dst.type === "local") {
				IDBFS.removeLocalEntry(path, done)
			} else {
				IDBFS.removeRemoteEntry(store, path, done)
			}
		}))
	})
};
var NODEFS = {
	isWindows: false,
	staticInit: (function() {
		NODEFS.isWindows = !!process.platform.match(/^win/)
	}),
	mount: (function(mount) {
		assert(ENVIRONMENT_IS_NODE);
		return NODEFS.createNode(null, "/", NODEFS.getMode(mount.opts.root), 0)
	}),
	createNode: (function(parent, name, mode, dev) {
		if (!FS.isDir(mode) && !FS.isFile(mode) && !FS.isLink(mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		var node = FS.createNode(parent, name, mode);
		node.node_ops = NODEFS.node_ops;
		node.stream_ops = NODEFS.stream_ops;
		return node
	}),
	getMode: (function(path) {
		var stat;
		try {
			stat = fs.lstatSync(path);
			if (NODEFS.isWindows) {
				stat.mode = stat.mode | (stat.mode & 146) >> 1
			}
		} catch (e) {
			if (!e.code) throw e;
			throw new FS.ErrnoError(ERRNO_CODES[e.code])
		}
		return stat.mode
	}),
	realPath: (function(node) {
		var parts = [];
		while (node.parent !== node) {
			parts.push(node.name);
			node = node.parent
		}
		parts.push(node.mount.opts.root);
		parts.reverse();
		return PATH.join.apply(null, parts)
	}),
	flagsToPermissionStringMap: {
		0: "r",
		1: "r+",
		2: "r+",
		64: "r",
		65: "r+",
		66: "r+",
		129: "rx+",
		193: "rx+",
		514: "w+",
		577: "w",
		578: "w+",
		705: "wx",
		706: "wx+",
		1024: "a",
		1025: "a",
		1026: "a+",
		1089: "a",
		1090: "a+",
		1153: "ax",
		1154: "ax+",
		1217: "ax",
		1218: "ax+",
		4096: "rs",
		4098: "rs+"
	},
	flagsToPermissionString: (function(flags) {
		if (flags in NODEFS.flagsToPermissionStringMap) {
			return NODEFS.flagsToPermissionStringMap[flags]
		} else {
			return flags
		}
	}),
	node_ops: {
		getattr: (function(node) {
			var path = NODEFS.realPath(node);
			var stat;
			try {
				stat = fs.lstatSync(path)
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
			if (NODEFS.isWindows && !stat.blksize) {
				stat.blksize = 4096
			}
			if (NODEFS.isWindows && !stat.blocks) {
				stat.blocks = (stat.size + stat.blksize - 1) / stat.blksize | 0
			}
			return {
				dev: stat.dev,
				ino: stat.ino,
				mode: stat.mode,
				nlink: stat.nlink,
				uid: stat.uid,
				gid: stat.gid,
				rdev: stat.rdev,
				size: stat.size,
				atime: stat.atime,
				mtime: stat.mtime,
				ctime: stat.ctime,
				blksize: stat.blksize,
				blocks: stat.blocks
			}
		}),
		setattr: (function(node, attr) {
			var path = NODEFS.realPath(node);
			try {
				if (attr.mode !== undefined) {
					fs.chmodSync(path, attr.mode);
					node.mode = attr.mode
				}
				if (attr.timestamp !== undefined) {
					var date = new Date(attr.timestamp);
					fs.utimesSync(path, date, date)
				}
				if (attr.size !== undefined) {
					fs.truncateSync(path, attr.size)
				}
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		lookup: (function(parent, name) {
			var path = PATH.join2(NODEFS.realPath(parent), name);
			var mode = NODEFS.getMode(path);
			return NODEFS.createNode(parent, name, mode)
		}),
		mknod: (function(parent, name, mode, dev) {
			var node = NODEFS.createNode(parent, name, mode, dev);
			var path = NODEFS.realPath(node);
			try {
				if (FS.isDir(node.mode)) {
					fs.mkdirSync(path, node.mode)
				} else {
					fs.writeFileSync(path, "", {
						mode: node.mode
					})
				}
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
			return node
		}),
		rename: (function(oldNode, newDir, newName) {
			var oldPath = NODEFS.realPath(oldNode);
			var newPath = PATH.join2(NODEFS.realPath(newDir), newName);
			try {
				fs.renameSync(oldPath, newPath)
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		unlink: (function(parent, name) {
			var path = PATH.join2(NODEFS.realPath(parent), name);
			try {
				fs.unlinkSync(path)
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		rmdir: (function(parent, name) {
			var path = PATH.join2(NODEFS.realPath(parent), name);
			try {
				fs.rmdirSync(path)
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		readdir: (function(node) {
			var path = NODEFS.realPath(node);
			try {
				return fs.readdirSync(path)
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		symlink: (function(parent, newName, oldPath) {
			var newPath = PATH.join2(NODEFS.realPath(parent), newName);
			try {
				fs.symlinkSync(oldPath, newPath)
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		readlink: (function(node) {
			var path = NODEFS.realPath(node);
			try {
				path = fs.readlinkSync(path);
				path = NODEJS_PATH.relative(NODEJS_PATH.resolve(node.mount.opts.root), path);
				return path
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		})
	},
	stream_ops: {
		open: (function(stream) {
			var path = NODEFS.realPath(stream.node);
			try {
				if (FS.isFile(stream.node.mode)) {
					stream.nfd = fs.openSync(path, NODEFS.flagsToPermissionString(stream.flags))
				}
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		close: (function(stream) {
			try {
				if (FS.isFile(stream.node.mode) && stream.nfd) {
					fs.closeSync(stream.nfd)
				}
			} catch (e) {
				if (!e.code) throw e;
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
		}),
		read: (function(stream, buffer, offset, length, position) {
			if (length === 0) return 0;
			var nbuffer = new Buffer(length);
			var res;
			try {
				res = fs.readSync(stream.nfd, nbuffer, 0, length, position)
			} catch (e) {
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
			if (res > 0) {
				for (var i = 0; i < res; i++) {
					buffer[offset + i] = nbuffer[i]
				}
			}
			return res
		}),
		write: (function(stream, buffer, offset, length, position) {
			var nbuffer = new Buffer(buffer.subarray(offset, offset + length));
			var res;
			try {
				res = fs.writeSync(stream.nfd, nbuffer, 0, length, position)
			} catch (e) {
				throw new FS.ErrnoError(ERRNO_CODES[e.code])
			}
			return res
		}),
		llseek: (function(stream, offset, whence) {
			var position = offset;
			if (whence === 1) {
				position += stream.position
			} else if (whence === 2) {
				if (FS.isFile(stream.node.mode)) {
					try {
						var stat = fs.fstatSync(stream.nfd);
						position += stat.size
					} catch (e) {
						throw new FS.ErrnoError(ERRNO_CODES[e.code])
					}
				}
			}
			if (position < 0) {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
			return position
		})
	}
};
var _stdin = allocate(1, "i32*", ALLOC_STATIC);
var _stdout = allocate(1, "i32*", ALLOC_STATIC);
var _stderr = allocate(1, "i32*", ALLOC_STATIC);

function _fflush(stream) {}
var FS = {
	root: null,
	mounts: [],
	devices: [null],
	streams: [],
	nextInode: 1,
	nameTable: null,
	currentPath: "/",
	initialized: false,
	ignorePermissions: true,
	trackingDelegate: {},
	tracking: {
		openFlags: {
			READ: 1,
			WRITE: 2
		}
	},
	ErrnoError: null,
	genericErrors: {},
	handleFSError: (function(e) {
		if (!(e instanceof FS.ErrnoError)) throw e + " : " + stackTrace();
		return ___setErrNo(e.errno)
	}),
	lookupPath: (function(path, opts) {
		path = PATH.resolve(FS.cwd(), path);
		opts = opts || {};
		if (!path) return {
			path: "",
			node: null
		};
		var defaults = {
			follow_mount: true,
			recurse_count: 0
		};
		for (var key in defaults) {
			if (opts[key] === undefined) {
				opts[key] = defaults[key]
			}
		}
		if (opts.recurse_count > 8) {
			throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
		}
		var parts = PATH.normalizeArray(path.split("/").filter((function(p) {
			return !!p
		})), false);
		var current = FS.root;
		var current_path = "/";
		for (var i = 0; i < parts.length; i++) {
			var islast = i === parts.length - 1;
			if (islast && opts.parent) {
				break
			}
			current = FS.lookupNode(current, parts[i]);
			current_path = PATH.join2(current_path, parts[i]);
			if (FS.isMountpoint(current)) {
				if (!islast || islast && opts.follow_mount) {
					current = current.mounted.root
				}
			}
			if (!islast || opts.follow) {
				var count = 0;
				while (FS.isLink(current.mode)) {
					var link = FS.readlink(current_path);
					current_path = PATH.resolve(PATH.dirname(current_path), link);
					var lookup = FS.lookupPath(current_path, {
						recurse_count: opts.recurse_count
					});
					current = lookup.node;
					if (count++ > 40) {
						throw new FS.ErrnoError(ERRNO_CODES.ELOOP)
					}
				}
			}
		}
		return {
			path: current_path,
			node: current
		}
	}),
	getPath: (function(node) {
		var path;
		while (true) {
			if (FS.isRoot(node)) {
				var mount = node.mount.mountpoint;
				if (!path) return mount;
				return mount[mount.length - 1] !== "/" ? mount + "/" + path : mount + path
			}
			path = path ? node.name + "/" + path : node.name;
			node = node.parent
		}
	}),
	hashName: (function(parentid, name) {
		var hash = 0;
		for (var i = 0; i < name.length; i++) {
			hash = (hash << 5) - hash + name.charCodeAt(i) | 0
		}
		return (parentid + hash >>> 0) % FS.nameTable.length
	}),
	hashAddNode: (function(node) {
		var hash = FS.hashName(node.parent.id, node.name);
		node.name_next = FS.nameTable[hash];
		FS.nameTable[hash] = node
	}),
	hashRemoveNode: (function(node) {
		var hash = FS.hashName(node.parent.id, node.name);
		if (FS.nameTable[hash] === node) {
			FS.nameTable[hash] = node.name_next
		} else {
			var current = FS.nameTable[hash];
			while (current) {
				if (current.name_next === node) {
					current.name_next = node.name_next;
					break
				}
				current = current.name_next
			}
		}
	}),
	lookupNode: (function(parent, name) {
		var err = FS.mayLookup(parent);
		if (err) {
			throw new FS.ErrnoError(err, parent)
		}
		var hash = FS.hashName(parent.id, name);
		for (var node = FS.nameTable[hash]; node; node = node.name_next) {
			var nodeName = node.name;
			if (node.parent.id === parent.id && nodeName === name) {
				return node
			}
		}
		return FS.lookup(parent, name)
	}),
	createNode: (function(parent, name, mode, rdev) {
		if (!FS.FSNode) {
			FS.FSNode = (function(parent, name, mode, rdev) {
				if (!parent) {
					parent = this
				}
				this.parent = parent;
				this.mount = parent.mount;
				this.mounted = null;
				this.id = FS.nextInode++;
				this.name = name;
				this.mode = mode;
				this.node_ops = {};
				this.stream_ops = {};
				this.rdev = rdev
			});
			FS.FSNode.prototype = {};
			var readMode = 292 | 73;
			var writeMode = 146;
			Object.defineProperties(FS.FSNode.prototype, {
				read: {
					get: (function() {
						return (this.mode & readMode) === readMode
					}),
					set: (function(val) {
						val ? this.mode |= readMode : this.mode &= ~readMode
					})
				},
				write: {
					get: (function() {
						return (this.mode & writeMode) === writeMode
					}),
					set: (function(val) {
						val ? this.mode |= writeMode : this.mode &= ~writeMode
					})
				},
				isFolder: {
					get: (function() {
						return FS.isDir(this.mode)
					})
				},
				isDevice: {
					get: (function() {
						return FS.isChrdev(this.mode)
					})
				}
			})
		}
		var node = new FS.FSNode(parent, name, mode, rdev);
		FS.hashAddNode(node);
		return node
	}),
	destroyNode: (function(node) {
		FS.hashRemoveNode(node)
	}),
	isRoot: (function(node) {
		return node === node.parent
	}),
	isMountpoint: (function(node) {
		return !!node.mounted
	}),
	isFile: (function(mode) {
		return (mode & 61440) === 32768
	}),
	isDir: (function(mode) {
		return (mode & 61440) === 16384
	}),
	isLink: (function(mode) {
		return (mode & 61440) === 40960
	}),
	isChrdev: (function(mode) {
		return (mode & 61440) === 8192
	}),
	isBlkdev: (function(mode) {
		return (mode & 61440) === 24576
	}),
	isFIFO: (function(mode) {
		return (mode & 61440) === 4096
	}),
	isSocket: (function(mode) {
		return (mode & 49152) === 49152
	}),
	flagModes: {
		"r": 0,
		"rs": 1052672,
		"r+": 2,
		"w": 577,
		"wx": 705,
		"xw": 705,
		"w+": 578,
		"wx+": 706,
		"xw+": 706,
		"a": 1089,
		"ax": 1217,
		"xa": 1217,
		"a+": 1090,
		"ax+": 1218,
		"xa+": 1218
	},
	modeStringToFlags: (function(str) {
		var flags = FS.flagModes[str];
		if (typeof flags === "undefined") {
			throw new Error("Unknown file open mode: " + str)
		}
		return flags
	}),
	flagsToPermissionString: (function(flag) {
		var accmode = flag & 2097155;
		var perms = ["r", "w", "rw"][accmode];
		if (flag & 512) {
			perms += "w"
		}
		return perms
	}),
	nodePermissions: (function(node, perms) {
		if (FS.ignorePermissions) {
			return 0
		}
		if (perms.indexOf("r") !== -1 && !(node.mode & 292)) {
			return ERRNO_CODES.EACCES
		} else if (perms.indexOf("w") !== -1 && !(node.mode & 146)) {
			return ERRNO_CODES.EACCES
		} else if (perms.indexOf("x") !== -1 && !(node.mode & 73)) {
			return ERRNO_CODES.EACCES
		}
		return 0
	}),
	mayLookup: (function(dir) {
		var err = FS.nodePermissions(dir, "x");
		if (err) return err;
		if (!dir.node_ops.lookup) return ERRNO_CODES.EACCES;
		return 0
	}),
	mayCreate: (function(dir, name) {
		try {
			var node = FS.lookupNode(dir, name);
			return ERRNO_CODES.EEXIST
		} catch (e) {}
		return FS.nodePermissions(dir, "wx")
	}),
	mayDelete: (function(dir, name, isdir) {
		var node;
		try {
			node = FS.lookupNode(dir, name)
		} catch (e) {
			return e.errno
		}
		var err = FS.nodePermissions(dir, "wx");
		if (err) {
			return err
		}
		if (isdir) {
			if (!FS.isDir(node.mode)) {
				return ERRNO_CODES.ENOTDIR
			}
			if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
				return ERRNO_CODES.EBUSY
			}
		} else {
			if (FS.isDir(node.mode)) {
				return ERRNO_CODES.EISDIR
			}
		}
		return 0
	}),
	mayOpen: (function(node, flags) {
		if (!node) {
			return ERRNO_CODES.ENOENT
		}
		if (FS.isLink(node.mode)) {
			return ERRNO_CODES.ELOOP
		} else if (FS.isDir(node.mode)) {
			if ((flags & 2097155) !== 0 || flags & 512) {
				return ERRNO_CODES.EISDIR
			}
		}
		return FS.nodePermissions(node, FS.flagsToPermissionString(flags))
	}),
	MAX_OPEN_FDS: 4096,
	nextfd: (function(fd_start, fd_end) {
		fd_start = fd_start || 0;
		fd_end = fd_end || FS.MAX_OPEN_FDS;
		for (var fd = fd_start; fd <= fd_end; fd++) {
			if (!FS.streams[fd]) {
				return fd
			}
		}
		throw new FS.ErrnoError(ERRNO_CODES.EMFILE)
	}),
	getStream: (function(fd) {
		return FS.streams[fd]
	}),
	createStream: (function(stream, fd_start, fd_end) {
		if (!FS.FSStream) {
			FS.FSStream = (function() {});
			FS.FSStream.prototype = {};
			Object.defineProperties(FS.FSStream.prototype, {
				object: {
					get: (function() {
						return this.node
					}),
					set: (function(val) {
						this.node = val
					})
				},
				isRead: {
					get: (function() {
						return (this.flags & 2097155) !== 1
					})
				},
				isWrite: {
					get: (function() {
						return (this.flags & 2097155) !== 0
					})
				},
				isAppend: {
					get: (function() {
						return this.flags & 1024
					})
				}
			})
		}
		var newStream = new FS.FSStream;
		for (var p in stream) {
			newStream[p] = stream[p]
		}
		stream = newStream;
		var fd = FS.nextfd(fd_start, fd_end);
		stream.fd = fd;
		FS.streams[fd] = stream;
		return stream
	}),
	closeStream: (function(fd) {
		FS.streams[fd] = null
	}),
	getStreamFromPtr: (function(ptr) {
		return FS.streams[ptr - 1]
	}),
	getPtrForStream: (function(stream) {
		return stream ? stream.fd + 1 : 0
	}),
	chrdev_stream_ops: {
		open: (function(stream) {
			var device = FS.getDevice(stream.node.rdev);
			stream.stream_ops = device.stream_ops;
			if (stream.stream_ops.open) {
				stream.stream_ops.open(stream)
			}
		}),
		llseek: (function() {
			throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
		})
	},
	major: (function(dev) {
		return dev >> 8
	}),
	minor: (function(dev) {
		return dev & 255
	}),
	makedev: (function(ma, mi) {
		return ma << 8 | mi
	}),
	registerDevice: (function(dev, ops) {
		FS.devices[dev] = {
			stream_ops: ops
		}
	}),
	getDevice: (function(dev) {
		return FS.devices[dev]
	}),
	getMounts: (function(mount) {
		var mounts = [];
		var check = [mount];
		while (check.length) {
			var m = check.pop();
			mounts.push(m);
			check.push.apply(check, m.mounts)
		}
		return mounts
	}),
	syncfs: (function(populate, callback) {
		if (typeof populate === "function") {
			callback = populate;
			populate = false
		}
		var mounts = FS.getMounts(FS.root.mount);
		var completed = 0;

		function done(err) {
			if (err) {
				if (!done.errored) {
					done.errored = true;
					return callback(err)
				}
				return
			}
			if (++completed >= mounts.length) {
				callback(null)
			}
		}
		mounts.forEach((function(mount) {
			if (!mount.type.syncfs) {
				return done(null)
			}
			mount.type.syncfs(mount, populate, done)
		}))
	}),
	mount: (function(type, opts, mountpoint) {
		var root = mountpoint === "/";
		var pseudo = !mountpoint;
		var node;
		if (root && FS.root) {
			throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
		} else if (!root && !pseudo) {
			var lookup = FS.lookupPath(mountpoint, {
				follow_mount: false
			});
			mountpoint = lookup.path;
			node = lookup.node;
			if (FS.isMountpoint(node)) {
				throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
			}
			if (!FS.isDir(node.mode)) {
				throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
			}
		}
		var mount = {
			type: type,
			opts: opts,
			mountpoint: mountpoint,
			mounts: []
		};
		var mountRoot = type.mount(mount);
		mountRoot.mount = mount;
		mount.root = mountRoot;
		if (root) {
			FS.root = mountRoot
		} else if (node) {
			node.mounted = mount;
			if (node.mount) {
				node.mount.mounts.push(mount)
			}
		}
		return mountRoot
	}),
	unmount: (function(mountpoint) {
		var lookup = FS.lookupPath(mountpoint, {
			follow_mount: false
		});
		if (!FS.isMountpoint(lookup.node)) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		var node = lookup.node;
		var mount = node.mounted;
		var mounts = FS.getMounts(mount);
		Object.keys(FS.nameTable).forEach((function(hash) {
			var current = FS.nameTable[hash];
			while (current) {
				var next = current.name_next;
				if (mounts.indexOf(current.mount) !== -1) {
					FS.destroyNode(current)
				}
				current = next
			}
		}));
		node.mounted = null;
		var idx = node.mount.mounts.indexOf(mount);
		assert(idx !== -1);
		node.mount.mounts.splice(idx, 1)
	}),
	lookup: (function(parent, name) {
		return parent.node_ops.lookup(parent, name)
	}),
	mknod: (function(path, mode, dev) {
		var lookup = FS.lookupPath(path, {
			parent: true
		});
		var parent = lookup.node;
		var name = PATH.basename(path);
		if (!name || name === "." || name === "..") {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		var err = FS.mayCreate(parent, name);
		if (err) {
			throw new FS.ErrnoError(err)
		}
		if (!parent.node_ops.mknod) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		return parent.node_ops.mknod(parent, name, mode, dev)
	}),
	create: (function(path, mode) {
		mode = mode !== undefined ? mode : 438;
		mode &= 4095;
		mode |= 32768;
		return FS.mknod(path, mode, 0)
	}),
	mkdir: (function(path, mode) {
		mode = mode !== undefined ? mode : 511;
		mode &= 511 | 512;
		mode |= 16384;
		return FS.mknod(path, mode, 0)
	}),
	mkdev: (function(path, mode, dev) {
		if (typeof dev === "undefined") {
			dev = mode;
			mode = 438
		}
		mode |= 8192;
		return FS.mknod(path, mode, dev)
	}),
	symlink: (function(oldpath, newpath) {
		if (!PATH.resolve(oldpath)) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
		}
		var lookup = FS.lookupPath(newpath, {
			parent: true
		});
		var parent = lookup.node;
		if (!parent) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
		}
		var newname = PATH.basename(newpath);
		var err = FS.mayCreate(parent, newname);
		if (err) {
			throw new FS.ErrnoError(err)
		}
		if (!parent.node_ops.symlink) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		return parent.node_ops.symlink(parent, newname, oldpath)
	}),
	rename: (function(old_path, new_path) {
		var old_dirname = PATH.dirname(old_path);
		var new_dirname = PATH.dirname(new_path);
		var old_name = PATH.basename(old_path);
		var new_name = PATH.basename(new_path);
		var lookup, old_dir, new_dir;
		try {
			lookup = FS.lookupPath(old_path, {
				parent: true
			});
			old_dir = lookup.node;
			lookup = FS.lookupPath(new_path, {
				parent: true
			});
			new_dir = lookup.node
		} catch (e) {
			throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
		}
		if (!old_dir || !new_dir) throw new FS.ErrnoError(ERRNO_CODES.ENOENT);
		if (old_dir.mount !== new_dir.mount) {
			throw new FS.ErrnoError(ERRNO_CODES.EXDEV)
		}
		var old_node = FS.lookupNode(old_dir, old_name);
		var relative = PATH.relative(old_path, new_dirname);
		if (relative.charAt(0) !== ".") {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		relative = PATH.relative(new_path, old_dirname);
		if (relative.charAt(0) !== ".") {
			throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)
		}
		var new_node;
		try {
			new_node = FS.lookupNode(new_dir, new_name)
		} catch (e) {}
		if (old_node === new_node) {
			return
		}
		var isdir = FS.isDir(old_node.mode);
		var err = FS.mayDelete(old_dir, old_name, isdir);
		if (err) {
			throw new FS.ErrnoError(err)
		}
		err = new_node ? FS.mayDelete(new_dir, new_name, isdir) : FS.mayCreate(new_dir, new_name);
		if (err) {
			throw new FS.ErrnoError(err)
		}
		if (!old_dir.node_ops.rename) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		if (FS.isMountpoint(old_node) || new_node && FS.isMountpoint(new_node)) {
			throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
		}
		if (new_dir !== old_dir) {
			err = FS.nodePermissions(old_dir, "w");
			if (err) {
				throw new FS.ErrnoError(err)
			}
		}
		try {
			if (FS.trackingDelegate["willMovePath"]) {
				FS.trackingDelegate["willMovePath"](old_path, new_path)
			}
		} catch (e) {
			console.log("FS.trackingDelegate['willMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
		}
		FS.hashRemoveNode(old_node);
		try {
			old_dir.node_ops.rename(old_node, new_dir, new_name)
		} catch (e) {
			throw e
		} finally {
			FS.hashAddNode(old_node)
		}
		try {
			if (FS.trackingDelegate["onMovePath"]) FS.trackingDelegate["onMovePath"](old_path, new_path)
		} catch (e) {
			console.log("FS.trackingDelegate['onMovePath']('" + old_path + "', '" + new_path + "') threw an exception: " + e.message)
		}
	}),
	rmdir: (function(path) {
		var lookup = FS.lookupPath(path, {
			parent: true
		});
		var parent = lookup.node;
		var name = PATH.basename(path);
		var node = FS.lookupNode(parent, name);
		var err = FS.mayDelete(parent, name, true);
		if (err) {
			throw new FS.ErrnoError(err)
		}
		if (!parent.node_ops.rmdir) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		if (FS.isMountpoint(node)) {
			throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
		}
		try {
			if (FS.trackingDelegate["willDeletePath"]) {
				FS.trackingDelegate["willDeletePath"](path)
			}
		} catch (e) {
			console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
		}
		parent.node_ops.rmdir(parent, name);
		FS.destroyNode(node);
		try {
			if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
		} catch (e) {
			console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
		}
	}),
	readdir: (function(path) {
		var lookup = FS.lookupPath(path, {
			follow: true
		});
		var node = lookup.node;
		if (!node.node_ops.readdir) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
		}
		return node.node_ops.readdir(node)
	}),
	unlink: (function(path) {
		var lookup = FS.lookupPath(path, {
			parent: true
		});
		var parent = lookup.node;
		var name = PATH.basename(path);
		var node = FS.lookupNode(parent, name);
		var err = FS.mayDelete(parent, name, false);
		if (err) {
			if (err === ERRNO_CODES.EISDIR) err = ERRNO_CODES.EPERM;
			throw new FS.ErrnoError(err)
		}
		if (!parent.node_ops.unlink) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		if (FS.isMountpoint(node)) {
			throw new FS.ErrnoError(ERRNO_CODES.EBUSY)
		}
		try {
			if (FS.trackingDelegate["willDeletePath"]) {
				FS.trackingDelegate["willDeletePath"](path)
			}
		} catch (e) {
			console.log("FS.trackingDelegate['willDeletePath']('" + path + "') threw an exception: " + e.message)
		}
		parent.node_ops.unlink(parent, name);
		FS.destroyNode(node);
		try {
			if (FS.trackingDelegate["onDeletePath"]) FS.trackingDelegate["onDeletePath"](path)
		} catch (e) {
			console.log("FS.trackingDelegate['onDeletePath']('" + path + "') threw an exception: " + e.message)
		}
	}),
	readlink: (function(path) {
		var lookup = FS.lookupPath(path);
		var link = lookup.node;
		if (!link) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
		}
		if (!link.node_ops.readlink) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		return PATH.resolve(FS.getPath(lookup.node.parent), link.node_ops.readlink(link))
	}),
	stat: (function(path, dontFollow) {
		var lookup = FS.lookupPath(path, {
			follow: !dontFollow
		});
		var node = lookup.node;
		if (!node) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
		}
		if (!node.node_ops.getattr) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		return node.node_ops.getattr(node)
	}),
	lstat: (function(path) {
		return FS.stat(path, true)
	}),
	chmod: (function(path, mode, dontFollow) {
		var node;
		if (typeof path === "string") {
			var lookup = FS.lookupPath(path, {
				follow: !dontFollow
			});
			node = lookup.node
		} else {
			node = path
		}
		if (!node.node_ops.setattr) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		node.node_ops.setattr(node, {
			mode: mode & 4095 | node.mode & ~4095,
			timestamp: Date.now()
		})
	}),
	lchmod: (function(path, mode) {
		FS.chmod(path, mode, true)
	}),
	fchmod: (function(fd, mode) {
		var stream = FS.getStream(fd);
		if (!stream) {
			throw new FS.ErrnoError(ERRNO_CODES.EBADF)
		}
		FS.chmod(stream.node, mode)
	}),
	chown: (function(path, uid, gid, dontFollow) {
		var node;
		if (typeof path === "string") {
			var lookup = FS.lookupPath(path, {
				follow: !dontFollow
			});
			node = lookup.node
		} else {
			node = path
		}
		if (!node.node_ops.setattr) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		node.node_ops.setattr(node, {
			timestamp: Date.now()
		})
	}),
	lchown: (function(path, uid, gid) {
		FS.chown(path, uid, gid, true)
	}),
	fchown: (function(fd, uid, gid) {
		var stream = FS.getStream(fd);
		if (!stream) {
			throw new FS.ErrnoError(ERRNO_CODES.EBADF)
		}
		FS.chown(stream.node, uid, gid)
	}),
	truncate: (function(path, len) {
		if (len < 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		var node;
		if (typeof path === "string") {
			var lookup = FS.lookupPath(path, {
				follow: true
			});
			node = lookup.node
		} else {
			node = path
		}
		if (!node.node_ops.setattr) {
			throw new FS.ErrnoError(ERRNO_CODES.EPERM)
		}
		if (FS.isDir(node.mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
		}
		if (!FS.isFile(node.mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		var err = FS.nodePermissions(node, "w");
		if (err) {
			throw new FS.ErrnoError(err)
		}
		node.node_ops.setattr(node, {
			size: len,
			timestamp: Date.now()
		})
	}),
	ftruncate: (function(fd, len) {
		var stream = FS.getStream(fd);
		if (!stream) {
			throw new FS.ErrnoError(ERRNO_CODES.EBADF)
		}
		if ((stream.flags & 2097155) === 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		FS.truncate(stream.node, len)
	}),
	utime: (function(path, atime, mtime) {
		var lookup = FS.lookupPath(path, {
			follow: true
		});
		var node = lookup.node;
		node.node_ops.setattr(node, {
			timestamp: Math.max(atime, mtime)
		})
	}),
	open: (function(path, flags, mode, fd_start, fd_end) {
		if (path === "") {
			throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
		}
		flags = typeof flags === "string" ? FS.modeStringToFlags(flags) : flags;
		mode = typeof mode === "undefined" ? 438 : mode;
		if (flags & 64) {
			mode = mode & 4095 | 32768
		} else {
			mode = 0
		}
		var node;
		if (typeof path === "object") {
			node = path
		} else {
			path = PATH.normalize(path);
			try {
				var lookup = FS.lookupPath(path, {
					follow: !(flags & 131072)
				});
				node = lookup.node
			} catch (e) {}
		}
		var created = false;
		if (flags & 64) {
			if (node) {
				if (flags & 128) {
					throw new FS.ErrnoError(ERRNO_CODES.EEXIST)
				}
			} else {
				node = FS.mknod(path, mode, 0);
				created = true
			}
		}
		if (!node) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOENT)
		}
		if (FS.isChrdev(node.mode)) {
			flags &= ~512
		}
		if (!created) {
			var err = FS.mayOpen(node, flags);
			if (err) {
				throw new FS.ErrnoError(err)
			}
		}
		if (flags & 512) {
			FS.truncate(node, 0)
		}
		flags &= ~(128 | 512);
		var stream = FS.createStream({
			node: node,
			path: FS.getPath(node),
			flags: flags,
			seekable: true,
			position: 0,
			stream_ops: node.stream_ops,
			ungotten: [],
			error: false
		}, fd_start, fd_end);
		if (stream.stream_ops.open) {
			stream.stream_ops.open(stream)
		}
		if (Module["logReadFiles"] && !(flags & 1)) {
			if (!FS.readFiles) FS.readFiles = {};
			if (!(path in FS.readFiles)) {
				FS.readFiles[path] = 1;
				Module["printErr"]("read file: " + path)
			}
		}
		try {
			if (FS.trackingDelegate["onOpenFile"]) {
				var trackingFlags = 0;
				if ((flags & 2097155) !== 1) {
					trackingFlags |= FS.tracking.openFlags.READ
				}
				if ((flags & 2097155) !== 0) {
					trackingFlags |= FS.tracking.openFlags.WRITE
				}
				FS.trackingDelegate["onOpenFile"](path, trackingFlags)
			}
		} catch (e) {
			console.log("FS.trackingDelegate['onOpenFile']('" + path + "', flags) threw an exception: " + e.message)
		}
		return stream
	}),
	close: (function(stream) {
		try {
			if (stream.stream_ops.close) {
				stream.stream_ops.close(stream)
			}
		} catch (e) {
			throw e
		} finally {
			FS.closeStream(stream.fd)
		}
	}),
	llseek: (function(stream, offset, whence) {
		if (!stream.seekable || !stream.stream_ops.llseek) {
			throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
		}
		stream.position = stream.stream_ops.llseek(stream, offset, whence);
		stream.ungotten = [];
		return stream.position
	}),
	read: (function(stream, buffer, offset, length, position) {
		if (length < 0 || position < 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		if ((stream.flags & 2097155) === 1) {
			throw new FS.ErrnoError(ERRNO_CODES.EBADF)
		}
		if (FS.isDir(stream.node.mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
		}
		if (!stream.stream_ops.read) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		var seeking = true;
		if (typeof position === "undefined") {
			position = stream.position;
			seeking = false
		} else if (!stream.seekable) {
			throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
		}
		var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
		if (!seeking) stream.position += bytesRead;
		return bytesRead
	}),
	write: (function(stream, buffer, offset, length, position, canOwn) {
		if (length < 0 || position < 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		if ((stream.flags & 2097155) === 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EBADF)
		}
		if (FS.isDir(stream.node.mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.EISDIR)
		}
		if (!stream.stream_ops.write) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		if (stream.flags & 1024) {
			FS.llseek(stream, 0, 2)
		}
		var seeking = true;
		if (typeof position === "undefined") {
			position = stream.position;
			seeking = false
		} else if (!stream.seekable) {
			throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)
		}
		var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
		if (!seeking) stream.position += bytesWritten;
		try {
			if (stream.path && FS.trackingDelegate["onWriteToFile"]) FS.trackingDelegate["onWriteToFile"](stream.path)
		} catch (e) {
			console.log("FS.trackingDelegate['onWriteToFile']('" + path + "') threw an exception: " + e.message)
		}
		return bytesWritten
	}),
	allocate: (function(stream, offset, length) {
		if (offset < 0 || length <= 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
		}
		if ((stream.flags & 2097155) === 0) {
			throw new FS.ErrnoError(ERRNO_CODES.EBADF)
		}
		if (!FS.isFile(stream.node.mode) && !FS.isDir(node.mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
		}
		if (!stream.stream_ops.allocate) {
			throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
		}
		stream.stream_ops.allocate(stream, offset, length)
	}),
	mmap: (function(stream, buffer, offset, length, position, prot, flags) {
		if ((stream.flags & 2097155) === 1) {
			throw new FS.ErrnoError(ERRNO_CODES.EACCES)
		}
		if (!stream.stream_ops.mmap) {
			throw new FS.ErrnoError(ERRNO_CODES.ENODEV)
		}
		return stream.stream_ops.mmap(stream, buffer, offset, length, position, prot, flags)
	}),
	ioctl: (function(stream, cmd, arg) {
		if (!stream.stream_ops.ioctl) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)
		}
		return stream.stream_ops.ioctl(stream, cmd, arg)
	}),
	readFile: (function(path, opts) {
		opts = opts || {};
		opts.flags = opts.flags || "r";
		opts.encoding = opts.encoding || "binary";
		if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
			throw new Error('Invalid encoding type "' + opts.encoding + '"')
		}
		var ret;
		var stream = FS.open(path, opts.flags);
		var stat = FS.stat(path);
		var length = stat.size;
		var buf = new Uint8Array(length);
		FS.read(stream, buf, 0, length, 0);
		if (opts.encoding === "utf8") {
			ret = UTF8ArrayToString(buf, 0)
		} else if (opts.encoding === "binary") {
			ret = buf
		}
		FS.close(stream);
		return ret
	}),
	writeFile: (function(path, data, opts) {
		opts = opts || {};
		opts.flags = opts.flags || "w";
		opts.encoding = opts.encoding || "utf8";
		if (opts.encoding !== "utf8" && opts.encoding !== "binary") {
			throw new Error('Invalid encoding type "' + opts.encoding + '"')
		}
		var stream = FS.open(path, opts.flags, opts.mode);
		if (opts.encoding === "utf8") {
			var buf = new Uint8Array(lengthBytesUTF8(data) + 1);
			var actualNumBytes = stringToUTF8Array(data, buf, 0, buf.length);
			FS.write(stream, buf, 0, actualNumBytes, 0, opts.canOwn)
		} else if (opts.encoding === "binary") {
			FS.write(stream, data, 0, data.length, 0, opts.canOwn)
		}
		FS.close(stream)
	}),
	cwd: (function() {
		return FS.currentPath
	}),
	chdir: (function(path) {
		var lookup = FS.lookupPath(path, {
			follow: true
		});
		if (!FS.isDir(lookup.node.mode)) {
			throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)
		}
		var err = FS.nodePermissions(lookup.node, "x");
		if (err) {
			throw new FS.ErrnoError(err)
		}
		FS.currentPath = lookup.path
	}),
	createDefaultDirectories: (function() {
		FS.mkdir("/tmp");
		FS.mkdir("/home");
		FS.mkdir("/home/web_user")
	}),
	createDefaultDevices: (function() {
		FS.mkdir("/dev");
		FS.registerDevice(FS.makedev(1, 3), {
			read: (function() {
				return 0
			}),
			write: (function() {
				return 0
			})
		});
		FS.mkdev("/dev/null", FS.makedev(1, 3));
		TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
		TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
		FS.mkdev("/dev/tty", FS.makedev(5, 0));
		FS.mkdev("/dev/tty1", FS.makedev(6, 0));
		var random_device;
		if (typeof crypto !== "undefined") {
			var randomBuffer = new Uint8Array(1);
			random_device = (function() {
				crypto.getRandomValues(randomBuffer);
				return randomBuffer[0]
			})
		} else if (ENVIRONMENT_IS_NODE) {
			random_device = (function() {
				return require("crypto").randomBytes(1)[0]
			})
		} else {
			random_device = (function() {
				return Math.random() * 256 | 0
			})
		}
		FS.createDevice("/dev", "random", random_device);
		FS.createDevice("/dev", "urandom", random_device);
		FS.mkdir("/dev/shm");
		FS.mkdir("/dev/shm/tmp")
	}),
	createStandardStreams: (function() {
		if (Module["stdin"]) {
			FS.createDevice("/dev", "stdin", Module["stdin"])
		} else {
			FS.symlink("/dev/tty", "/dev/stdin")
		}
		if (Module["stdout"]) {
			FS.createDevice("/dev", "stdout", null, Module["stdout"])
		} else {
			FS.symlink("/dev/tty", "/dev/stdout")
		}
		if (Module["stderr"]) {
			FS.createDevice("/dev", "stderr", null, Module["stderr"])
		} else {
			FS.symlink("/dev/tty1", "/dev/stderr")
		}
		var stdin = FS.open("/dev/stdin", "r");
		HEAP32[_stdin >> 2] = FS.getPtrForStream(stdin);
		assert(stdin.fd === 0, "invalid handle for stdin (" + stdin.fd + ")");
		var stdout = FS.open("/dev/stdout", "w");
		HEAP32[_stdout >> 2] = FS.getPtrForStream(stdout);
		assert(stdout.fd === 1, "invalid handle for stdout (" + stdout.fd + ")");
		var stderr = FS.open("/dev/stderr", "w");
		HEAP32[_stderr >> 2] = FS.getPtrForStream(stderr);
		assert(stderr.fd === 2, "invalid handle for stderr (" + stderr.fd + ")")
	}),
	ensureErrnoError: (function() {
		if (FS.ErrnoError) return;
		FS.ErrnoError = function ErrnoError(errno, node) {
			this.node = node;
			this.setErrno = (function(errno) {
				this.errno = errno;
				for (var key in ERRNO_CODES) {
					if (ERRNO_CODES[key] === errno) {
						this.code = key;
						break
					}
				}
			});
			this.setErrno(errno);
			this.message = ERRNO_MESSAGES[errno]
		};
		FS.ErrnoError.prototype = new Error;
		FS.ErrnoError.prototype.constructor = FS.ErrnoError;
		[ERRNO_CODES.ENOENT].forEach((function(code) {
			FS.genericErrors[code] = new FS.ErrnoError(code);
			FS.genericErrors[code].stack = "<generic error, no stack>"
		}))
	}),
	staticInit: (function() {
		FS.ensureErrnoError();
		FS.nameTable = new Array(4096);
		FS.mount(MEMFS, {}, "/");
		FS.createDefaultDirectories();
		FS.createDefaultDevices()
	}),
	init: (function(input, output, error) {
		assert(!FS.init.initialized, "FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");
		FS.init.initialized = true;
		FS.ensureErrnoError();
		Module["stdin"] = input || Module["stdin"];
		Module["stdout"] = output || Module["stdout"];
		Module["stderr"] = error || Module["stderr"];
		FS.createStandardStreams()
	}),
	quit: (function() {
		FS.init.initialized = false;
		for (var i = 0; i < FS.streams.length; i++) {
			var stream = FS.streams[i];
			if (!stream) {
				continue
			}
			FS.close(stream)
		}
	}),
	getMode: (function(canRead, canWrite) {
		var mode = 0;
		if (canRead) mode |= 292 | 73;
		if (canWrite) mode |= 146;
		return mode
	}),
	joinPath: (function(parts, forceRelative) {
		var path = PATH.join.apply(null, parts);
		if (forceRelative && path[0] == "/") path = path.substr(1);
		return path
	}),
	absolutePath: (function(relative, base) {
		return PATH.resolve(base, relative)
	}),
	standardizePath: (function(path) {
		return PATH.normalize(path)
	}),
	findObject: (function(path, dontResolveLastLink) {
		var ret = FS.analyzePath(path, dontResolveLastLink);
		if (ret.exists) {
			return ret.object
		} else {
			___setErrNo(ret.error);
			return null
		}
	}),
	analyzePath: (function(path, dontResolveLastLink) {
		try {
			var lookup = FS.lookupPath(path, {
				follow: !dontResolveLastLink
			});
			path = lookup.path
		} catch (e) {}
		var ret = {
			isRoot: false,
			exists: false,
			error: 0,
			name: null,
			path: null,
			object: null,
			parentExists: false,
			parentPath: null,
			parentObject: null
		};
		try {
			var lookup = FS.lookupPath(path, {
				parent: true
			});
			ret.parentExists = true;
			ret.parentPath = lookup.path;
			ret.parentObject = lookup.node;
			ret.name = PATH.basename(path);
			lookup = FS.lookupPath(path, {
				follow: !dontResolveLastLink
			});
			ret.exists = true;
			ret.path = lookup.path;
			ret.object = lookup.node;
			ret.name = lookup.node.name;
			ret.isRoot = lookup.path === "/"
		} catch (e) {
			ret.error = e.errno
		}
		return ret
	}),
	createFolder: (function(parent, name, canRead, canWrite) {
		var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
		var mode = FS.getMode(canRead, canWrite);
		return FS.mkdir(path, mode)
	}),
	createPath: (function(parent, path, canRead, canWrite) {
		parent = typeof parent === "string" ? parent : FS.getPath(parent);
		var parts = path.split("/").reverse();
		while (parts.length) {
			var part = parts.pop();
			if (!part) continue;
			var current = PATH.join2(parent, part);
			try {
				FS.mkdir(current)
			} catch (e) {}
			parent = current
		}
		return current
	}),
	createFile: (function(parent, name, properties, canRead, canWrite) {
		var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
		var mode = FS.getMode(canRead, canWrite);
		return FS.create(path, mode)
	}),
	createDataFile: (function(parent, name, data, canRead, canWrite, canOwn) {
		var path = name ? PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name) : parent;
		var mode = FS.getMode(canRead, canWrite);
		var node = FS.create(path, mode);
		if (data) {
			if (typeof data === "string") {
				var arr = new Array(data.length);
				for (var i = 0, len = data.length; i < len; ++i) arr[i] = data.charCodeAt(i);
				data = arr
			}
			FS.chmod(node, mode | 146);
			var stream = FS.open(node, "w");
			FS.write(stream, data, 0, data.length, 0, canOwn);
			FS.close(stream);
			FS.chmod(node, mode)
		}
		return node
	}),
	createDevice: (function(parent, name, input, output) {
		var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
		var mode = FS.getMode(!!input, !!output);
		if (!FS.createDevice.major) FS.createDevice.major = 64;
		var dev = FS.makedev(FS.createDevice.major++, 0);
		FS.registerDevice(dev, {
			open: (function(stream) {
				stream.seekable = false
			}),
			close: (function(stream) {
				if (output && output.buffer && output.buffer.length) {
					output(10)
				}
			}),
			read: (function(stream, buffer, offset, length, pos) {
				var bytesRead = 0;
				for (var i = 0; i < length; i++) {
					var result;
					try {
						result = input()
					} catch (e) {
						throw new FS.ErrnoError(ERRNO_CODES.EIO)
					}
					if (result === undefined && bytesRead === 0) {
						throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
					}
					if (result === null || result === undefined) break;
					bytesRead++;
					buffer[offset + i] = result
				}
				if (bytesRead) {
					stream.node.timestamp = Date.now()
				}
				return bytesRead
			}),
			write: (function(stream, buffer, offset, length, pos) {
				for (var i = 0; i < length; i++) {
					try {
						output(buffer[offset + i])
					} catch (e) {
						throw new FS.ErrnoError(ERRNO_CODES.EIO)
					}
				}
				if (length) {
					stream.node.timestamp = Date.now()
				}
				return i
			})
		});
		return FS.mkdev(path, mode, dev)
	}),
	createLink: (function(parent, name, target, canRead, canWrite) {
		var path = PATH.join2(typeof parent === "string" ? parent : FS.getPath(parent), name);
		return FS.symlink(target, path)
	}),
	forceLoadFile: (function(obj) {
		if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
		var success = true;
		if (typeof XMLHttpRequest !== "undefined") {
			throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")
		} else if (Module["read"]) {
			try {
				obj.contents = intArrayFromString(Module["read"](obj.url), true);
				obj.usedBytes = obj.contents.length
			} catch (e) {
				success = false
			}
		} else {
			throw new Error("Cannot load without read() or XMLHttpRequest.")
		}
		if (!success) ___setErrNo(ERRNO_CODES.EIO);
		return success
	}),
	createLazyFile: (function(parent, name, url, canRead, canWrite) {
		function LazyUint8Array() {
			this.lengthKnown = false;
			this.chunks = []
		}
		LazyUint8Array.prototype.get = function LazyUint8Array_get(idx) {
			if (idx > this.length - 1 || idx < 0) {
				return undefined
			}
			var chunkOffset = idx % this.chunkSize;
			var chunkNum = idx / this.chunkSize | 0;
			return this.getter(chunkNum)[chunkOffset]
		};
		LazyUint8Array.prototype.setDataGetter = function LazyUint8Array_setDataGetter(getter) {
			this.getter = getter
		};
		LazyUint8Array.prototype.cacheLength = function LazyUint8Array_cacheLength() {
			var xhr = new XMLHttpRequest;
			xhr.open("HEAD", url, false);
			xhr.send(null);
			if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
			var datalength = Number(xhr.getResponseHeader("Content-length"));
			var header;
			var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
			var chunkSize = 1024 * 1024;
			if (!hasByteServing) chunkSize = datalength;
			var doXHR = (function(from, to) {
				if (from > to) throw new Error("invalid range (" + from + ", " + to + ") or no bytes requested!");
				if (to > datalength - 1) throw new Error("only " + datalength + " bytes available! programmer error!");
				var xhr = new XMLHttpRequest;
				xhr.open("GET", url, false);
				if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
				if (typeof Uint8Array != "undefined") xhr.responseType = "arraybuffer";
				if (xhr.overrideMimeType) {
					xhr.overrideMimeType("text/plain; charset=x-user-defined")
				}
				xhr.send(null);
				if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) throw new Error("Couldn't load " + url + ". Status: " + xhr.status);
				if (xhr.response !== undefined) {
					return new Uint8Array(xhr.response || [])
				} else {
					return intArrayFromString(xhr.responseText || "", true)
				}
			});
			var lazyArray = this;
			lazyArray.setDataGetter((function(chunkNum) {
				var start = chunkNum * chunkSize;
				var end = (chunkNum + 1) * chunkSize - 1;
				end = Math.min(end, datalength - 1);
				if (typeof lazyArray.chunks[chunkNum] === "undefined") {
					lazyArray.chunks[chunkNum] = doXHR(start, end)
				}
				if (typeof lazyArray.chunks[chunkNum] === "undefined") throw new Error("doXHR failed!");
				return lazyArray.chunks[chunkNum]
			}));
			this._length = datalength;
			this._chunkSize = chunkSize;
			this.lengthKnown = true
		};
		if (typeof XMLHttpRequest !== "undefined") {
			if (!ENVIRONMENT_IS_WORKER) throw "Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";
			var lazyArray = new LazyUint8Array;
			Object.defineProperty(lazyArray, "length", {
				get: (function() {
					if (!this.lengthKnown) {
						this.cacheLength()
					}
					return this._length
				})
			});
			Object.defineProperty(lazyArray, "chunkSize", {
				get: (function() {
					if (!this.lengthKnown) {
						this.cacheLength()
					}
					return this._chunkSize
				})
			});
			var properties = {
				isDevice: false,
				contents: lazyArray
			}
		} else {
			var properties = {
				isDevice: false,
				url: url
			}
		}
		var node = FS.createFile(parent, name, properties, canRead, canWrite);
		if (properties.contents) {
			node.contents = properties.contents
		} else if (properties.url) {
			node.contents = null;
			node.url = properties.url
		}
		Object.defineProperty(node, "usedBytes", {
			get: (function() {
				return this.contents.length
			})
		});
		var stream_ops = {};
		var keys = Object.keys(node.stream_ops);
		keys.forEach((function(key) {
			var fn = node.stream_ops[key];
			stream_ops[key] = function forceLoadLazyFile() {
				if (!FS.forceLoadFile(node)) {
					throw new FS.ErrnoError(ERRNO_CODES.EIO)
				}
				return fn.apply(null, arguments)
			}
		}));
		stream_ops.read = function stream_ops_read(stream, buffer, offset, length, position) {
			if (!FS.forceLoadFile(node)) {
				throw new FS.ErrnoError(ERRNO_CODES.EIO)
			}
			var contents = stream.node.contents;
			if (position >= contents.length) return 0;
			var size = Math.min(contents.length - position, length);
			assert(size >= 0);
			if (contents.slice) {
				for (var i = 0; i < size; i++) {
					buffer[offset + i] = contents[position + i]
				}
			} else {
				for (var i = 0; i < size; i++) {
					buffer[offset + i] = contents.get(position + i)
				}
			}
			return size
		};
		node.stream_ops = stream_ops;
		return node
	}),
	createPreloadedFile: (function(parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn) {
		Browser.init();
		var fullname = name ? PATH.resolve(PATH.join2(parent, name)) : parent;

		function processData(byteArray) {
			function finish(byteArray) {
				if (!dontCreateFile) {
					FS.createDataFile(parent, name, byteArray, canRead, canWrite, canOwn)
				}
				if (onload) onload();
				removeRunDependency("cp " + fullname)
			}
			var handled = false;
			Module["preloadPlugins"].forEach((function(plugin) {
				if (handled) return;
				if (plugin["canHandle"](fullname)) {
					plugin["handle"](byteArray, fullname, finish, (function() {
						if (onerror) onerror();
						removeRunDependency("cp " + fullname)
					}));
					handled = true
				}
			}));
			if (!handled) finish(byteArray)
		}
		addRunDependency("cp " + fullname);
		if (typeof url == "string") {
			Browser.asyncLoad(url, (function(byteArray) {
				processData(byteArray)
			}), onerror)
		} else {
			processData(url)
		}
	}),
	indexedDB: (function() {
		return window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB
	}),
	DB_NAME: (function() {
		return "EM_FS_" + window.location.pathname
	}),
	DB_VERSION: 20,
	DB_STORE_NAME: "FILE_DATA",
	saveFilesToDB: (function(paths, onload, onerror) {
		onload = onload || (function() {});
		onerror = onerror || (function() {});
		var indexedDB = FS.indexedDB();
		try {
			var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
		} catch (e) {
			return onerror(e)
		}
		openRequest.onupgradeneeded = function openRequest_onupgradeneeded() {
			console.log("creating db");
			var db = openRequest.result;
			db.createObjectStore(FS.DB_STORE_NAME)
		};
		openRequest.onsuccess = function openRequest_onsuccess() {
			var db = openRequest.result;
			var transaction = db.transaction([FS.DB_STORE_NAME], "readwrite");
			var files = transaction.objectStore(FS.DB_STORE_NAME);
			var ok = 0,
				fail = 0,
				total = paths.length;

			function finish() {
				if (fail == 0) onload();
				else onerror()
			}
			paths.forEach((function(path) {
				var putRequest = files.put(FS.analyzePath(path).object.contents, path);
				putRequest.onsuccess = function putRequest_onsuccess() {
					ok++;
					if (ok + fail == total) finish()
				};
				putRequest.onerror = function putRequest_onerror() {
					fail++;
					if (ok + fail == total) finish()
				}
			}));
			transaction.onerror = onerror
		};
		openRequest.onerror = onerror
	}),
	loadFilesFromDB: (function(paths, onload, onerror) {
		onload = onload || (function() {});
		onerror = onerror || (function() {});
		var indexedDB = FS.indexedDB();
		try {
			var openRequest = indexedDB.open(FS.DB_NAME(), FS.DB_VERSION)
		} catch (e) {
			return onerror(e)
		}
		openRequest.onupgradeneeded = onerror;
		openRequest.onsuccess = function openRequest_onsuccess() {
			var db = openRequest.result;
			try {
				var transaction = db.transaction([FS.DB_STORE_NAME], "readonly")
			} catch (e) {
				onerror(e);
				return
			}
			var files = transaction.objectStore(FS.DB_STORE_NAME);
			var ok = 0,
				fail = 0,
				total = paths.length;

			function finish() {
				if (fail == 0) onload();
				else onerror()
			}
			paths.forEach((function(path) {
				var getRequest = files.get(path);
				getRequest.onsuccess = function getRequest_onsuccess() {
					if (FS.analyzePath(path).exists) {
						FS.unlink(path)
					}
					FS.createDataFile(PATH.dirname(path), PATH.basename(path), getRequest.result, true, true, true);
					ok++;
					if (ok + fail == total) finish()
				};
				getRequest.onerror = function getRequest_onerror() {
					fail++;
					if (ok + fail == total) finish()
				}
			}));
			transaction.onerror = onerror
		};
		openRequest.onerror = onerror
	})
};

function _mknod(path, mode, dev) {
	path = Pointer_stringify(path);
	switch (mode & 61440) {
		case 32768:
		case 8192:
		case 24576:
		case 4096:
		case 49152:
			break;
		default:
			___setErrNo(ERRNO_CODES.EINVAL);
			return -1
	}
	try {
		FS.mknod(path, mode, dev);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _mkdir(path, mode) {
	path = Pointer_stringify(path);
	path = PATH.normalize(path);
	if (path[path.length - 1] === "/") path = path.substr(0, path.length - 1);
	try {
		FS.mkdir(path, mode, 0);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function __ZSt18uncaught_exceptionv() {
	return !!__ZSt18uncaught_exceptionv.uncaught_exception
}
var EXCEPTIONS = {
	last: 0,
	caught: [],
	infos: {},
	deAdjust: (function(adjusted) {
		if (!adjusted || EXCEPTIONS.infos[adjusted]) return adjusted;
		for (var ptr in EXCEPTIONS.infos) {
			var info = EXCEPTIONS.infos[ptr];
			if (info.adjusted === adjusted) {
				return ptr
			}
		}
		return adjusted
	}),
	addRef: (function(ptr) {
		if (!ptr) return;
		var info = EXCEPTIONS.infos[ptr];
		info.refcount++
	}),
	decRef: (function(ptr) {
		if (!ptr) return;
		var info = EXCEPTIONS.infos[ptr];
		assert(info.refcount > 0);
		info.refcount--;
		if (info.refcount === 0) {
			if (info.destructor) {
				Runtime.dynCall("vi", info.destructor, [ptr])
			}
			delete EXCEPTIONS.infos[ptr];
			___cxa_free_exception(ptr)
		}
	}),
	clearRef: (function(ptr) {
		if (!ptr) return;
		var info = EXCEPTIONS.infos[ptr];
		info.refcount = 0
	})
};

function ___resumeException(ptr) {
	if (!EXCEPTIONS.last) {
		EXCEPTIONS.last = ptr
	}
	EXCEPTIONS.clearRef(EXCEPTIONS.deAdjust(ptr));
	throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch."
}

function ___cxa_find_matching_catch() {
	var thrown = EXCEPTIONS.last;
	if (!thrown) {
		return (asm["setTempRet0"](0), 0) | 0
	}
	var info = EXCEPTIONS.infos[thrown];
	var throwntype = info.type;
	if (!throwntype) {
		return (asm["setTempRet0"](0), thrown) | 0
	}
	var typeArray = Array.prototype.slice.call(arguments);
	var pointer = Module["___cxa_is_pointer_type"](throwntype);
	if (!___cxa_find_matching_catch.buffer) ___cxa_find_matching_catch.buffer = _malloc(4);
	HEAP32[___cxa_find_matching_catch.buffer >> 2] = thrown;
	thrown = ___cxa_find_matching_catch.buffer;
	for (var i = 0; i < typeArray.length; i++) {
		if (typeArray[i] && Module["___cxa_can_catch"](typeArray[i], throwntype, thrown)) {
			thrown = HEAP32[thrown >> 2];
			info.adjusted = thrown;
			return (asm["setTempRet0"](typeArray[i]), thrown) | 0
		}
	}
	thrown = HEAP32[thrown >> 2];
	return (asm["setTempRet0"](throwntype), thrown) | 0
}

function ___cxa_throw(ptr, type, destructor) {
	EXCEPTIONS.infos[ptr] = {
		ptr: ptr,
		adjusted: ptr,
		type: type,
		destructor: destructor,
		refcount: 0
	};
	EXCEPTIONS.last = ptr;
	if (!("uncaught_exception" in __ZSt18uncaught_exceptionv)) {
		__ZSt18uncaught_exceptionv.uncaught_exception = 1
	} else {
		__ZSt18uncaught_exceptionv.uncaught_exception++
	}
	throw ptr + " - Exception catching is disabled, this exception cannot be caught. Compile with -s DISABLE_EXCEPTION_CATCHING=0 or DISABLE_EXCEPTION_CATCHING=2 to catch."
}

function ___cxa_begin_catch(ptr) {
	__ZSt18uncaught_exceptionv.uncaught_exception--;
	EXCEPTIONS.caught.push(ptr);
	EXCEPTIONS.addRef(EXCEPTIONS.deAdjust(ptr));
	return ptr
}

function _close(fildes) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	try {
		FS.close(stream);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _fsync(fildes) {
	var stream = FS.getStream(fildes);
	if (stream) {
		return 0
	} else {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
}

function _fileno(stream) {
	stream = FS.getStreamFromPtr(stream);
	if (!stream) return -1;
	return stream.fd
}

function _fclose(stream) {
	var fd = _fileno(stream);
	_fsync(fd);
	return _close(fd)
}

function _chmod(path, mode, dontResolveLastLink) {
	path = typeof path !== "string" ? Pointer_stringify(path) : path;
	try {
		FS.chmod(path, mode);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _pthread_mutex_lock() {}

function _pthread_create() {
	Module["printErr"]("missing function: pthread_create");
	abort(-1)
}

function _open(path, oflag, varargs) {
	var mode = HEAP32[varargs >> 2];
	path = Pointer_stringify(path);
	try {
		var stream = FS.open(path, oflag, mode);
		return stream.fd
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _fopen(filename, mode) {
	var flags;
	mode = Pointer_stringify(mode);
	if (mode[0] == "r") {
		if (mode.indexOf("+") != -1) {
			flags = 2
		} else {
			flags = 0
		}
	} else if (mode[0] == "w") {
		if (mode.indexOf("+") != -1) {
			flags = 2
		} else {
			flags = 1
		}
		flags |= 64;
		flags |= 512
	} else if (mode[0] == "a") {
		if (mode.indexOf("+") != -1) {
			flags = 2
		} else {
			flags = 1
		}
		flags |= 64;
		flags |= 1024
	} else {
		___setErrNo(ERRNO_CODES.EINVAL);
		return 0
	}
	var fd = _open(filename, flags, allocate([511, 0, 0, 0], "i32", ALLOC_STACK));
	return fd === -1 ? 0 : FS.getPtrForStream(FS.getStream(fd))
}
Module["_strncpy"] = _strncpy;

function _mkport() {
	throw "TODO"
}
var SOCKFS = {
	mount: (function(mount) {
		Module["websocket"] = Module["websocket"] && "object" === typeof Module["websocket"] ? Module["websocket"] : {};
		Module["websocket"]._callbacks = {};
		Module["websocket"]["on"] = (function(event, callback) {
			if ("function" === typeof callback) {
				this._callbacks[event] = callback
			}
			return this
		});
		Module["websocket"].emit = (function(event, param) {
			if ("function" === typeof this._callbacks[event]) {
				this._callbacks[event].call(this, param)
			}
		});
		return FS.createNode(null, "/", 16384 | 511, 0)
	}),
	createSocket: (function(family, type, protocol) {
		var streaming = type == 1;
		if (protocol) {
			assert(streaming == (protocol == 6))
		}
		var sock = {
			family: family,
			type: type,
			protocol: protocol,
			server: null,
			error: null,
			peers: {},
			pending: [],
			recv_queue: [],
			sock_ops: SOCKFS.websocket_sock_ops
		};
		var name = SOCKFS.nextname();
		var node = FS.createNode(SOCKFS.root, name, 49152, 0);
		node.sock = sock;
		var stream = FS.createStream({
			path: name,
			node: node,
			flags: FS.modeStringToFlags("r+"),
			seekable: false,
			stream_ops: SOCKFS.stream_ops
		});
		sock.stream = stream;
		return sock
	}),
	getSocket: (function(fd) {
		var stream = FS.getStream(fd);
		if (!stream || !FS.isSocket(stream.node.mode)) {
			return null
		}
		return stream.node.sock
	}),
	stream_ops: {
		poll: (function(stream) {
			var sock = stream.node.sock;
			return sock.sock_ops.poll(sock)
		}),
		ioctl: (function(stream, request, varargs) {
			var sock = stream.node.sock;
			return sock.sock_ops.ioctl(sock, request, varargs)
		}),
		read: (function(stream, buffer, offset, length, position) {
			var sock = stream.node.sock;
			var msg = sock.sock_ops.recvmsg(sock, length);
			if (!msg) {
				return 0
			}
			buffer.set(msg.buffer, offset);
			return msg.buffer.length
		}),
		write: (function(stream, buffer, offset, length, position) {
			var sock = stream.node.sock;
			return sock.sock_ops.sendmsg(sock, buffer, offset, length)
		}),
		close: (function(stream) {
			var sock = stream.node.sock;
			sock.sock_ops.close(sock)
		})
	},
	nextname: (function() {
		if (!SOCKFS.nextname.current) {
			SOCKFS.nextname.current = 0
		}
		return "socket[" + SOCKFS.nextname.current++ + "]"
	}),
	websocket_sock_ops: {
		createPeer: (function(sock, addr, port) {
			var ws;
			if (typeof addr === "object") {
				ws = addr;
				addr = null;
				port = null
			}
			if (ws) {
				if (ws._socket) {
					addr = ws._socket.remoteAddress;
					port = ws._socket.remotePort
				} else {
					var result = /ws[s]?:\/\/([^:]+):(\d+)/.exec(ws.url);
					if (!result) {
						throw new Error("WebSocket URL must be in the format ws(s)://address:port")
					}
					addr = result[1];
					port = parseInt(result[2], 10)
				}
			} else {
				try {
					var runtimeConfig = Module["websocket"] && "object" === typeof Module["websocket"];
					var url = "ws:#".replace("#", "//");
					if (runtimeConfig) {
						if ("string" === typeof Module["websocket"]["url"]) {
							url = Module["websocket"]["url"]
						}
					}
					if (url === "ws://" || url === "wss://") {
						var parts = addr.split("/");
						url = url + parts[0] + ":" + port + "/" + parts.slice(1).join("/")
					}
					var subProtocols = "binary";
					if (runtimeConfig) {
						if ("string" === typeof Module["websocket"]["subprotocol"]) {
							subProtocols = Module["websocket"]["subprotocol"]
						}
					}
					subProtocols = subProtocols.replace(/^ +| +$/g, "").split(/ *, */);
					var opts = ENVIRONMENT_IS_NODE ? {
						"protocol": subProtocols.toString()
					} : subProtocols;
					var WebSocket = ENVIRONMENT_IS_NODE ? require("ws") : window["WebSocket"];
					ws = new WebSocket(url, opts);
					ws.binaryType = "arraybuffer"
				} catch (e) {
					throw new FS.ErrnoError(ERRNO_CODES.EHOSTUNREACH)
				}
			}
			var peer = {
				addr: addr,
				port: port,
				socket: ws,
				dgram_send_queue: []
			};
			SOCKFS.websocket_sock_ops.addPeer(sock, peer);
			SOCKFS.websocket_sock_ops.handlePeerEvents(sock, peer);
			if (sock.type === 2 && typeof sock.sport !== "undefined") {
				peer.dgram_send_queue.push(new Uint8Array([255, 255, 255, 255, "p".charCodeAt(0), "o".charCodeAt(0), "r".charCodeAt(0), "t".charCodeAt(0), (sock.sport & 65280) >> 8, sock.sport & 255]))
			}
			return peer
		}),
		getPeer: (function(sock, addr, port) {
			return sock.peers[addr + ":" + port]
		}),
		addPeer: (function(sock, peer) {
			sock.peers[peer.addr + ":" + peer.port] = peer
		}),
		removePeer: (function(sock, peer) {
			delete sock.peers[peer.addr + ":" + peer.port]
		}),
		handlePeerEvents: (function(sock, peer) {
			var first = true;
			var handleOpen = (function() {
				Module["websocket"].emit("open", sock.stream.fd);
				try {
					var queued = peer.dgram_send_queue.shift();
					while (queued) {
						peer.socket.send(queued);
						queued = peer.dgram_send_queue.shift()
					}
				} catch (e) {
					peer.socket.close()
				}
			});

			function handleMessage(data) {
				assert(typeof data !== "string" && data.byteLength !== undefined);
				data = new Uint8Array(data);
				var wasfirst = first;
				first = false;
				if (wasfirst && data.length === 10 && data[0] === 255 && data[1] === 255 && data[2] === 255 && data[3] === 255 && data[4] === "p".charCodeAt(0) && data[5] === "o".charCodeAt(0) && data[6] === "r".charCodeAt(0) && data[7] === "t".charCodeAt(0)) {
					var newport = data[8] << 8 | data[9];
					SOCKFS.websocket_sock_ops.removePeer(sock, peer);
					peer.port = newport;
					SOCKFS.websocket_sock_ops.addPeer(sock, peer);
					return
				}
				sock.recv_queue.push({
					addr: peer.addr,
					port: peer.port,
					data: data
				});
				Module["websocket"].emit("message", sock.stream.fd)
			}
			if (ENVIRONMENT_IS_NODE) {
				peer.socket.on("open", handleOpen);
				peer.socket.on("message", (function(data, flags) {
					if (!flags.binary) {
						return
					}
					handleMessage((new Uint8Array(data)).buffer)
				}));
				peer.socket.on("close", (function() {
					Module["websocket"].emit("close", sock.stream.fd)
				}));
				peer.socket.on("error", (function(error) {
					sock.error = ERRNO_CODES.ECONNREFUSED;
					Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
				}))
			} else {
				peer.socket.onopen = handleOpen;
				peer.socket.onclose = (function() {
					Module["websocket"].emit("close", sock.stream.fd)
				});
				peer.socket.onmessage = function peer_socket_onmessage(event) {
					handleMessage(event.data)
				};
				peer.socket.onerror = (function(error) {
					sock.error = ERRNO_CODES.ECONNREFUSED;
					Module["websocket"].emit("error", [sock.stream.fd, sock.error, "ECONNREFUSED: Connection refused"])
				})
			}
		}),
		poll: (function(sock) {
			if (sock.type === 1 && sock.server) {
				return sock.pending.length ? 64 | 1 : 0
			}
			var mask = 0;
			var dest = sock.type === 1 ? SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport) : null;
			if (sock.recv_queue.length || !dest || dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
				mask |= 64 | 1
			}
			if (!dest || dest && dest.socket.readyState === dest.socket.OPEN) {
				mask |= 4
			}
			if (dest && dest.socket.readyState === dest.socket.CLOSING || dest && dest.socket.readyState === dest.socket.CLOSED) {
				mask |= 16
			}
			return mask
		}),
		ioctl: (function(sock, request, arg) {
			switch (request) {
				case 21531:
					var bytes = 0;
					if (sock.recv_queue.length) {
						bytes = sock.recv_queue[0].data.length
					}
					HEAP32[arg >> 2] = bytes;
					return 0;
				default:
					return ERRNO_CODES.EINVAL
			}
		}),
		close: (function(sock) {
			if (sock.server) {
				try {
					sock.server.close()
				} catch (e) {}
				sock.server = null
			}
			var peers = Object.keys(sock.peers);
			for (var i = 0; i < peers.length; i++) {
				var peer = sock.peers[peers[i]];
				try {
					peer.socket.close()
				} catch (e) {}
				SOCKFS.websocket_sock_ops.removePeer(sock, peer)
			}
			return 0
		}),
		bind: (function(sock, addr, port) {
			if (typeof sock.saddr !== "undefined" || typeof sock.sport !== "undefined") {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
			sock.saddr = addr;
			sock.sport = port || _mkport();
			if (sock.type === 2) {
				if (sock.server) {
					sock.server.close();
					sock.server = null
				}
				try {
					sock.sock_ops.listen(sock, 0)
				} catch (e) {
					if (!(e instanceof FS.ErrnoError)) throw e;
					if (e.errno !== ERRNO_CODES.EOPNOTSUPP) throw e
				}
			}
		}),
		connect: (function(sock, addr, port) {
			if (sock.server) {
				throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
			}
			if (typeof sock.daddr !== "undefined" && typeof sock.dport !== "undefined") {
				var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
				if (dest) {
					if (dest.socket.readyState === dest.socket.CONNECTING) {
						throw new FS.ErrnoError(ERRNO_CODES.EALREADY)
					} else {
						throw new FS.ErrnoError(ERRNO_CODES.EISCONN)
					}
				}
			}
			var peer = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port);
			sock.daddr = peer.addr;
			sock.dport = peer.port;
			throw new FS.ErrnoError(ERRNO_CODES.EINPROGRESS)
		}),
		listen: (function(sock, backlog) {
			if (!ENVIRONMENT_IS_NODE) {
				throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)
			}
			if (sock.server) {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
			var WebSocketServer = require("ws").Server;
			var host = sock.saddr;
			sock.server = new WebSocketServer({
				host: host,
				port: sock.sport
			});
			Module["websocket"].emit("listen", sock.stream.fd);
			sock.server.on("connection", (function(ws) {
				if (sock.type === 1) {
					var newsock = SOCKFS.createSocket(sock.family, sock.type, sock.protocol);
					var peer = SOCKFS.websocket_sock_ops.createPeer(newsock, ws);
					newsock.daddr = peer.addr;
					newsock.dport = peer.port;
					sock.pending.push(newsock);
					Module["websocket"].emit("connection", newsock.stream.fd)
				} else {
					SOCKFS.websocket_sock_ops.createPeer(sock, ws);
					Module["websocket"].emit("connection", sock.stream.fd)
				}
			}));
			sock.server.on("closed", (function() {
				Module["websocket"].emit("close", sock.stream.fd);
				sock.server = null
			}));
			sock.server.on("error", (function(error) {
				sock.error = ERRNO_CODES.EHOSTUNREACH;
				Module["websocket"].emit("error", [sock.stream.fd, sock.error, "EHOSTUNREACH: Host is unreachable"])
			}))
		}),
		accept: (function(listensock) {
			if (!listensock.server) {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
			var newsock = listensock.pending.shift();
			newsock.stream.flags = listensock.stream.flags;
			return newsock
		}),
		getname: (function(sock, peer) {
			var addr, port;
			if (peer) {
				if (sock.daddr === undefined || sock.dport === undefined) {
					throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
				}
				addr = sock.daddr;
				port = sock.dport
			} else {
				addr = sock.saddr || 0;
				port = sock.sport || 0
			}
			return {
				addr: addr,
				port: port
			}
		}),
		sendmsg: (function(sock, buffer, offset, length, addr, port) {
			if (sock.type === 2) {
				if (addr === undefined || port === undefined) {
					addr = sock.daddr;
					port = sock.dport
				}
				if (addr === undefined || port === undefined) {
					throw new FS.ErrnoError(ERRNO_CODES.EDESTADDRREQ)
				}
			} else {
				addr = sock.daddr;
				port = sock.dport
			}
			var dest = SOCKFS.websocket_sock_ops.getPeer(sock, addr, port);
			if (sock.type === 1) {
				if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
					throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
				} else if (dest.socket.readyState === dest.socket.CONNECTING) {
					throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
				}
			}
			var data;
			if (buffer instanceof Array || buffer instanceof ArrayBuffer) {
				data = buffer.slice(offset, offset + length)
			} else {
				data = buffer.buffer.slice(buffer.byteOffset + offset, buffer.byteOffset + offset + length)
			}
			if (sock.type === 2) {
				if (!dest || dest.socket.readyState !== dest.socket.OPEN) {
					if (!dest || dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
						dest = SOCKFS.websocket_sock_ops.createPeer(sock, addr, port)
					}
					dest.dgram_send_queue.push(data);
					return length
				}
			}
			try {
				dest.socket.send(data);
				return length
			} catch (e) {
				throw new FS.ErrnoError(ERRNO_CODES.EINVAL)
			}
		}),
		recvmsg: (function(sock, length) {
			if (sock.type === 1 && sock.server) {
				throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
			}
			var queued = sock.recv_queue.shift();
			if (!queued) {
				if (sock.type === 1) {
					var dest = SOCKFS.websocket_sock_ops.getPeer(sock, sock.daddr, sock.dport);
					if (!dest) {
						throw new FS.ErrnoError(ERRNO_CODES.ENOTCONN)
					} else if (dest.socket.readyState === dest.socket.CLOSING || dest.socket.readyState === dest.socket.CLOSED) {
						return null
					} else {
						throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
					}
				} else {
					throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)
				}
			}
			var queuedLength = queued.data.byteLength || queued.data.length;
			var queuedOffset = queued.data.byteOffset || 0;
			var queuedBuffer = queued.data.buffer || queued.data;
			var bytesRead = Math.min(length, queuedLength);
			var res = {
				buffer: new Uint8Array(queuedBuffer, queuedOffset, bytesRead),
				addr: queued.addr,
				port: queued.port
			};
			if (sock.type === 1 && bytesRead < queuedLength) {
				var bytesRemaining = queuedLength - bytesRead;
				queued.data = new Uint8Array(queuedBuffer, queuedOffset + bytesRead, bytesRemaining);
				sock.recv_queue.unshift(queued)
			}
			return res
		})
	}
};

function _send(fd, buf, len, flags) {
	var sock = SOCKFS.getSocket(fd);
	if (!sock) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	return _write(fd, buf, len)
}

function _pwrite(fildes, buf, nbyte, offset) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	try {
		var slab = HEAP8;
		return FS.write(stream, slab, buf, nbyte, offset)
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _write(fildes, buf, nbyte) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	try {
		var slab = HEAP8;
		return FS.write(stream, slab, buf, nbyte)
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _fputc(c, stream) {
	var chr = unSign(c & 255);
	HEAP8[_fputc.ret >> 0] = chr;
	var fd = _fileno(stream);
	var ret = _write(fd, _fputc.ret, 1);
	if (ret == -1) {
		var streamObj = FS.getStreamFromPtr(stream);
		if (streamObj) streamObj.error = true;
		return -1
	} else {
		return chr
	}
}

function ___assert_fail(condition, filename, line, func) {
	ABORT = true;
	throw "Assertion failed: " + Pointer_stringify(condition) + ", at: " + [filename ? Pointer_stringify(filename) : "unknown filename", line, func ? Pointer_stringify(func) : "unknown function"] + " at " + stackTrace()
}

function _fdopen(fildes, mode) {
	mode = Pointer_stringify(mode);
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return 0
	}
	if (mode.indexOf("w") != -1 && !stream.isWrite || mode.indexOf("r") != -1 && !stream.isRead || mode.indexOf("a") != -1 && !stream.isAppend || mode.indexOf("+") != -1 && (!stream.isRead || !stream.isWrite)) {
		___setErrNo(ERRNO_CODES.EINVAL);
		return 0
	} else {
		stream.error = false;
		stream.eof = false;
		return FS.getPtrForStream(stream)
	}
}

function _fwrite(ptr, size, nitems, stream) {
	var bytesToWrite = nitems * size;
	if (bytesToWrite == 0) return 0;
	var fd = _fileno(stream);
	var bytesWritten = _write(fd, ptr, bytesToWrite);
	if (bytesWritten == -1) {
		var streamObj = FS.getStreamFromPtr(stream);
		if (streamObj) streamObj.error = true;
		return 0
	} else {
		return bytesWritten / size | 0
	}
}

function _umask(newMask) {
	if (_umask.cmask === undefined) _umask.cmask = 511;
	var oldMask = _umask.cmask;
	_umask.cmask = newMask;
	return oldMask
}

function _pthread_mutex_init() {}
var _tzname = allocate(8, "i32*", ALLOC_STATIC);
var _daylight = allocate(1, "i32*", ALLOC_STATIC);
var _timezone = allocate(1, "i32*", ALLOC_STATIC);

function _tzset() {
	if (_tzset.called) return;
	_tzset.called = true;
	HEAP32[_timezone >> 2] = -(new Date).getTimezoneOffset() * 60;
	var winter = new Date(2e3, 0, 1);
	var summer = new Date(2e3, 6, 1);
	HEAP32[_daylight >> 2] = Number(winter.getTimezoneOffset() != summer.getTimezoneOffset());

	function extractZone(date) {
		var match = date.toTimeString().match(/\(([A-Za-z ]+)\)$/);
		return match ? match[1] : "GMT"
	}
	var winterName = extractZone(winter);
	var summerName = extractZone(summer);
	var winterNamePtr = allocate(intArrayFromString(winterName), "i8", ALLOC_NORMAL);
	var summerNamePtr = allocate(intArrayFromString(summerName), "i8", ALLOC_NORMAL);
	if (summer.getTimezoneOffset() < winter.getTimezoneOffset()) {
		HEAP32[_tzname >> 2] = winterNamePtr;
		HEAP32[_tzname + 4 >> 2] = summerNamePtr
	} else {
		HEAP32[_tzname >> 2] = summerNamePtr;
		HEAP32[_tzname + 4 >> 2] = winterNamePtr
	}
}

function _mktime(tmPtr) {
	_tzset();
	var date = new Date(HEAP32[tmPtr + 20 >> 2] + 1900, HEAP32[tmPtr + 16 >> 2], HEAP32[tmPtr + 12 >> 2], HEAP32[tmPtr + 8 >> 2], HEAP32[tmPtr + 4 >> 2], HEAP32[tmPtr >> 2], 0);
	var dst = HEAP32[tmPtr + 32 >> 2];
	var guessedOffset = date.getTimezoneOffset();
	var start = new Date(date.getFullYear(), 0, 1);
	var summerOffset = (new Date(2e3, 6, 1)).getTimezoneOffset();
	var winterOffset = start.getTimezoneOffset();
	var dstOffset = Math.min(winterOffset, summerOffset);
	if (dst < 0) {
		HEAP32[tmPtr + 32 >> 2] = Number(winterOffset != guessedOffset)
	} else if (dst > 0 != (winterOffset != guessedOffset)) {
		var summerOffset = (new Date(date.getFullYear(), 6, 1)).getTimezoneOffset();
		var trueOffset = dst > 0 ? summerOffset : winterOffset;
		date.setTime(date.getTime() + (trueOffset - guessedOffset) * 6e4)
	}
	HEAP32[tmPtr + 24 >> 2] = date.getDay();
	var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
	HEAP32[tmPtr + 28 >> 2] = yday;
	return date.getTime() / 1e3 | 0
}
var PROCINFO = {
	ppid: 1,
	pid: 42,
	sid: 42,
	pgid: 42
};

function _getpid() {
	return PROCINFO.pid
}

function _fcntl(fildes, cmd, varargs, dup2) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	switch (cmd) {
		case 0:
			var arg = HEAP32[varargs >> 2];
			if (arg < 0) {
				___setErrNo(ERRNO_CODES.EINVAL);
				return -1
			}
			var newStream;
			try {
				newStream = FS.open(stream.path, stream.flags, 0, arg)
			} catch (e) {
				FS.handleFSError(e);
				return -1
			}
			return newStream.fd;
		case 1:
		case 2:
			return 0;
		case 3:
			return stream.flags;
		case 4:
			var arg = HEAP32[varargs >> 2];
			stream.flags |= arg;
			return 0;
		case 12:
		case 12:
			var arg = HEAP32[varargs >> 2];
			var offset = 0;
			HEAP16[arg + offset >> 1] = 2;
			return 0;
		case 13:
		case 14:
		case 13:
		case 14:
			return 0;
		case 8:
		case 9:
			___setErrNo(ERRNO_CODES.EINVAL);
			return -1;
		default:
			___setErrNo(ERRNO_CODES.EINVAL);
			return -1
	}
	return -1
}

function _dup(fildes) {
	return _fcntl(fildes, 0, allocate([0, 0, 0, 0], "i32", ALLOC_STACK))
}
var ___tm_current = allocate(44, "i8", ALLOC_STATIC);
var ___tm_timezone = allocate(intArrayFromString("GMT"), "i8", ALLOC_STATIC);

function _localtime_r(time, tmPtr) {
	_tzset();
	var date = new Date(HEAP32[time >> 2] * 1e3);
	HEAP32[tmPtr >> 2] = date.getSeconds();
	HEAP32[tmPtr + 4 >> 2] = date.getMinutes();
	HEAP32[tmPtr + 8 >> 2] = date.getHours();
	HEAP32[tmPtr + 12 >> 2] = date.getDate();
	HEAP32[tmPtr + 16 >> 2] = date.getMonth();
	HEAP32[tmPtr + 20 >> 2] = date.getFullYear() - 1900;
	HEAP32[tmPtr + 24 >> 2] = date.getDay();
	var start = new Date(date.getFullYear(), 0, 1);
	var yday = (date.getTime() - start.getTime()) / (1e3 * 60 * 60 * 24) | 0;
	HEAP32[tmPtr + 28 >> 2] = yday;
	HEAP32[tmPtr + 36 >> 2] = -(date.getTimezoneOffset() * 60);
	var summerOffset = (new Date(2e3, 6, 1)).getTimezoneOffset();
	var winterOffset = start.getTimezoneOffset();
	var dst = date.getTimezoneOffset() == Math.min(winterOffset, summerOffset) | 0;
	HEAP32[tmPtr + 32 >> 2] = dst;
	var zonePtr = HEAP32[_tzname + (dst ? Runtime.QUANTUM_SIZE : 0) >> 2];
	HEAP32[tmPtr + 40 >> 2] = zonePtr;
	return tmPtr
}

function _localtime(time) {
	return _localtime_r(time, ___tm_current)
}
Module["_bitshift64Lshr"] = _bitshift64Lshr;
Module["_memset"] = _memset;

function _isatty(fildes) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return 0
	}
	if (!stream.tty) {
		___setErrNo(ERRNO_CODES.ENOTTY);
		return 0
	}
	return 1
}
var _BDtoILow = true;
var _BDtoIHigh = true;

function _pthread_cond_broadcast() {
	return 0
}

function _link(path1, path2) {
	___setErrNo(ERRNO_CODES.EMLINK);
	return -1
}
Module["_strlen"] = _strlen;

function __reallyNegative(x) {
	return x < 0 || x === 0 && 1 / x === -Infinity
}

function __formatString(format, varargs) {
	var textIndex = format;
	var argIndex = 0;

	function getNextArg(type) {
		var ret;
		if (type === "double") {
			ret = (HEAP32[tempDoublePtr >> 2] = HEAP32[varargs + argIndex >> 2], HEAP32[tempDoublePtr + 4 >> 2] = HEAP32[varargs + (argIndex + 4) >> 2], +HEAPF64[tempDoublePtr >> 3])
		} else if (type == "i64") {
			ret = [HEAP32[varargs + argIndex >> 2], HEAP32[varargs + (argIndex + 4) >> 2]]
		} else {
			type = "i32";
			ret = HEAP32[varargs + argIndex >> 2]
		}
		argIndex += Runtime.getNativeFieldSize(type);
		return ret
	}
	var ret = [];
	var curr, next, currArg;
	while (1) {
		var startTextIndex = textIndex;
		curr = HEAP8[textIndex >> 0];
		if (curr === 0) break;
		next = HEAP8[textIndex + 1 >> 0];
		if (curr == 37) {
			var flagAlwaysSigned = false;
			var flagLeftAlign = false;
			var flagAlternative = false;
			var flagZeroPad = false;
			var flagPadSign = false;
			flagsLoop: while (1) {
				switch (next) {
					case 43:
						flagAlwaysSigned = true;
						break;
					case 45:
						flagLeftAlign = true;
						break;
					case 35:
						flagAlternative = true;
						break;
					case 48:
						if (flagZeroPad) {
							break flagsLoop
						} else {
							flagZeroPad = true;
							break
						};
					case 32:
						flagPadSign = true;
						break;
					default:
						break flagsLoop
				}
				textIndex++;
				next = HEAP8[textIndex + 1 >> 0]
			}
			var width = 0;
			if (next == 42) {
				width = getNextArg("i32");
				textIndex++;
				next = HEAP8[textIndex + 1 >> 0]
			} else {
				while (next >= 48 && next <= 57) {
					width = width * 10 + (next - 48);
					textIndex++;
					next = HEAP8[textIndex + 1 >> 0]
				}
			}
			var precisionSet = false,
				precision = -1;
			if (next == 46) {
				precision = 0;
				precisionSet = true;
				textIndex++;
				next = HEAP8[textIndex + 1 >> 0];
				if (next == 42) {
					precision = getNextArg("i32");
					textIndex++
				} else {
					while (1) {
						var precisionChr = HEAP8[textIndex + 1 >> 0];
						if (precisionChr < 48 || precisionChr > 57) break;
						precision = precision * 10 + (precisionChr - 48);
						textIndex++
					}
				}
				next = HEAP8[textIndex + 1 >> 0]
			}
			if (precision < 0) {
				precision = 6;
				precisionSet = false
			}
			var argSize;
			switch (String.fromCharCode(next)) {
				case "h":
					var nextNext = HEAP8[textIndex + 2 >> 0];
					if (nextNext == 104) {
						textIndex++;
						argSize = 1
					} else {
						argSize = 2
					}
					break;
				case "l":
					var nextNext = HEAP8[textIndex + 2 >> 0];
					if (nextNext == 108) {
						textIndex++;
						argSize = 8
					} else {
						argSize = 4
					}
					break;
				case "L":
				case "q":
				case "j":
					argSize = 8;
					break;
				case "z":
				case "t":
				case "I":
					argSize = 4;
					break;
				default:
					argSize = null
			}
			if (argSize) textIndex++;
			next = HEAP8[textIndex + 1 >> 0];
			switch (String.fromCharCode(next)) {
				case "d":
				case "i":
				case "u":
				case "o":
				case "x":
				case "X":
				case "p":
					{
						var signed = next == 100 || next == 105;
						argSize = argSize || 4;
						var currArg = getNextArg("i" + argSize * 8);
						var origArg = currArg;
						var argText;
						if (argSize == 8) {
							currArg = Runtime.makeBigInt(currArg[0], currArg[1], next == 117)
						}
						if (argSize <= 4) {
							var limit = Math.pow(256, argSize) - 1;
							currArg = (signed ? reSign : unSign)(currArg & limit, argSize * 8)
						}
						var currAbsArg = Math.abs(currArg);
						var prefix = "";
						if (next == 100 || next == 105) {
							if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], null);
							else argText = reSign(currArg, 8 * argSize, 1).toString(10)
						} else if (next == 117) {
							if (argSize == 8 && i64Math) argText = i64Math.stringify(origArg[0], origArg[1], true);
							else argText = unSign(currArg, 8 * argSize, 1).toString(10);
							currArg = Math.abs(currArg)
						} else if (next == 111) {
							argText = (flagAlternative ? "0" : "") + currAbsArg.toString(8)
						} else if (next == 120 || next == 88) {
							prefix = flagAlternative && currArg != 0 ? "0x" : "";
							if (argSize == 8 && i64Math) {
								if (origArg[1]) {
									argText = (origArg[1] >>> 0).toString(16);
									var lower = (origArg[0] >>> 0).toString(16);
									while (lower.length < 8) lower = "0" + lower;
									argText += lower
								} else {
									argText = (origArg[0] >>> 0).toString(16)
								}
							} else if (currArg < 0) {
								currArg = -currArg;
								argText = (currAbsArg - 1).toString(16);
								var buffer = [];
								for (var i = 0; i < argText.length; i++) {
									buffer.push((15 - parseInt(argText[i], 16)).toString(16))
								}
								argText = buffer.join("");
								while (argText.length < argSize * 2) argText = "f" + argText
							} else {
								argText = currAbsArg.toString(16)
							}
							if (next == 88) {
								prefix = prefix.toUpperCase();
								argText = argText.toUpperCase()
							}
						} else if (next == 112) {
							if (currAbsArg === 0) {
								argText = "(nil)"
							} else {
								prefix = "0x";
								argText = currAbsArg.toString(16)
							}
						}
						if (precisionSet) {
							while (argText.length < precision) {
								argText = "0" + argText
							}
						}
						if (currArg >= 0) {
							if (flagAlwaysSigned) {
								prefix = "+" + prefix
							} else if (flagPadSign) {
								prefix = " " + prefix
							}
						}
						if (argText.charAt(0) == "-") {
							prefix = "-" + prefix;
							argText = argText.substr(1)
						}
						while (prefix.length + argText.length < width) {
							if (flagLeftAlign) {
								argText += " "
							} else {
								if (flagZeroPad) {
									argText = "0" + argText
								} else {
									prefix = " " + prefix
								}
							}
						}
						argText = prefix + argText;
						argText.split("").forEach((function(chr) {
							ret.push(chr.charCodeAt(0))
						}));
						break
					};
				case "f":
				case "F":
				case "e":
				case "E":
				case "g":
				case "G":
					{
						var currArg = getNextArg("double");
						var argText;
						if (isNaN(currArg)) {
							argText = "nan";
							flagZeroPad = false
						} else if (!isFinite(currArg)) {
							argText = (currArg < 0 ? "-" : "") + "inf";
							flagZeroPad = false
						} else {
							var isGeneral = false;
							var effectivePrecision = Math.min(precision, 20);
							if (next == 103 || next == 71) {
								isGeneral = true;
								precision = precision || 1;
								var exponent = parseInt(currArg.toExponential(effectivePrecision).split("e")[1], 10);
								if (precision > exponent && exponent >= -4) {
									next = (next == 103 ? "f" : "F").charCodeAt(0);
									precision -= exponent + 1
								} else {
									next = (next == 103 ? "e" : "E").charCodeAt(0);
									precision--
								}
								effectivePrecision = Math.min(precision, 20)
							}
							if (next == 101 || next == 69) {
								argText = currArg.toExponential(effectivePrecision);
								if (/[eE][-+]\d$/.test(argText)) {
									argText = argText.slice(0, -1) + "0" + argText.slice(-1)
								}
							} else if (next == 102 || next == 70) {
								argText = currArg.toFixed(effectivePrecision);
								if (currArg === 0 && __reallyNegative(currArg)) {
									argText = "-" + argText
								}
							}
							var parts = argText.split("e");
							if (isGeneral && !flagAlternative) {
								while (parts[0].length > 1 && parts[0].indexOf(".") != -1 && (parts[0].slice(-1) == "0" || parts[0].slice(-1) == ".")) {
									parts[0] = parts[0].slice(0, -1)
								}
							} else {
								if (flagAlternative && argText.indexOf(".") == -1) parts[0] += ".";
								while (precision > effectivePrecision++) parts[0] += "0"
							}
							argText = parts[0] + (parts.length > 1 ? "e" + parts[1] : "");
							if (next == 69) argText = argText.toUpperCase();
							if (currArg >= 0) {
								if (flagAlwaysSigned) {
									argText = "+" + argText
								} else if (flagPadSign) {
									argText = " " + argText
								}
							}
						}
						while (argText.length < width) {
							if (flagLeftAlign) {
								argText += " "
							} else {
								if (flagZeroPad && (argText[0] == "-" || argText[0] == "+")) {
									argText = argText[0] + "0" + argText.slice(1)
								} else {
									argText = (flagZeroPad ? "0" : " ") + argText
								}
							}
						}
						if (next < 97) argText = argText.toUpperCase();
						argText.split("").forEach((function(chr) {
							ret.push(chr.charCodeAt(0))
						}));
						break
					};
				case "s":
					{
						var arg = getNextArg("i8*");
						var argLength = arg ? _strlen(arg) : "(null)".length;
						if (precisionSet) argLength = Math.min(argLength, precision);
						if (!flagLeftAlign) {
							while (argLength < width--) {
								ret.push(32)
							}
						}
						if (arg) {
							for (var i = 0; i < argLength; i++) {
								ret.push(HEAPU8[arg++ >> 0])
							}
						} else {
							ret = ret.concat(intArrayFromString("(null)".substr(0, argLength), true))
						}
						if (flagLeftAlign) {
							while (argLength < width--) {
								ret.push(32)
							}
						}
						break
					};
				case "c":
					{
						if (flagLeftAlign) ret.push(getNextArg("i8"));
						while (--width > 0) {
							ret.push(32)
						}
						if (!flagLeftAlign) ret.push(getNextArg("i8"));
						break
					};
				case "n":
					{
						var ptr = getNextArg("i32*");
						HEAP32[ptr >> 2] = ret.length;
						break
					};
				case "%":
					{
						ret.push(curr);
						break
					};
				default:
					{
						for (var i = startTextIndex; i < textIndex + 2; i++) {
							ret.push(HEAP8[i >> 0])
						}
					}
			}
			textIndex += 2
		} else {
			ret.push(curr);
			textIndex += 1
		}
	}
	return ret
}

function _fprintf(stream, format, varargs) {
	var result = __formatString(format, varargs);
	var stack = Runtime.stackSave();
	var ret = _fwrite(allocate(result, "i8", ALLOC_STACK), 1, result.length, stream);
	Runtime.stackRestore(stack);
	return ret
}

function _vfprintf(s, f, va_arg) {
	return _fprintf(s, f, HEAP32[va_arg >> 2])
}

function _pthread_mutex_unlock() {}

function _getpwnam() {
	throw "getpwnam: TODO"
}

function _emscripten_memcpy_big(dest, src, num) {
	HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
	return dest
}
Module["_memcpy"] = _memcpy;

function _utime(path, times) {
	var time;
	if (times) {
		var offset = 4;
		time = HEAP32[times + offset >> 2];
		time *= 1e3
	} else {
		time = Date.now()
	}
	path = Pointer_stringify(path);
	try {
		FS.utime(path, time, time);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _sbrk(bytes) {
	var self = _sbrk;
	if (!self.called) {
		DYNAMICTOP = alignMemoryPage(DYNAMICTOP);
		self.called = true;
		assert(Runtime.dynamicAlloc);
		self.alloc = Runtime.dynamicAlloc;
		Runtime.dynamicAlloc = (function() {
			abort("cannot dynamically allocate, sbrk now has control")
		})
	}
	var ret = DYNAMICTOP;
	if (bytes != 0) {
		var success = self.alloc(bytes);
		if (!success) return -1 >>> 0
	}
	return ret
}
Module["_bitshift64Shl"] = _bitshift64Shl;
Module["_memmove"] = _memmove;

function ___errno_location() {
	return ___errno_state
}

function _strerror_r(errnum, strerrbuf, buflen) {
	if (errnum in ERRNO_MESSAGES) {
		if (ERRNO_MESSAGES[errnum].length > buflen - 1) {
			return ___setErrNo(ERRNO_CODES.ERANGE)
		} else {
			var msg = ERRNO_MESSAGES[errnum];
			writeAsciiToMemory(msg, strerrbuf);
			return 0
		}
	} else {
		return ___setErrNo(ERRNO_CODES.EINVAL)
	}
}

function _strerror(errnum) {
	if (!_strerror.buffer) _strerror.buffer = _malloc(256);
	_strerror_r(errnum, _strerror.buffer, 256);
	return _strerror.buffer
}

function _pthread_mutex_destroy() {}

function _pthread_cond_wait() {
	return 0
}
Module["_llvm_bswap_i32"] = _llvm_bswap_i32;

function _sysconf(name) {
	switch (name) {
		case 30:
			return PAGE_SIZE;
		case 132:
		case 133:
		case 12:
		case 137:
		case 138:
		case 15:
		case 235:
		case 16:
		case 17:
		case 18:
		case 19:
		case 20:
		case 149:
		case 13:
		case 10:
		case 236:
		case 153:
		case 9:
		case 21:
		case 22:
		case 159:
		case 154:
		case 14:
		case 77:
		case 78:
		case 139:
		case 80:
		case 81:
		case 79:
		case 82:
		case 68:
		case 67:
		case 164:
		case 11:
		case 29:
		case 47:
		case 48:
		case 95:
		case 52:
		case 51:
		case 46:
			return 200809;
		case 27:
		case 246:
		case 127:
		case 128:
		case 23:
		case 24:
		case 160:
		case 161:
		case 181:
		case 182:
		case 242:
		case 183:
		case 184:
		case 243:
		case 244:
		case 245:
		case 165:
		case 178:
		case 179:
		case 49:
		case 50:
		case 168:
		case 169:
		case 175:
		case 170:
		case 171:
		case 172:
		case 97:
		case 76:
		case 32:
		case 173:
		case 35:
			return -1;
		case 176:
		case 177:
		case 7:
		case 155:
		case 8:
		case 157:
		case 125:
		case 126:
		case 92:
		case 93:
		case 129:
		case 130:
		case 131:
		case 94:
		case 91:
			return 1;
		case 74:
		case 60:
		case 69:
		case 70:
		case 4:
			return 1024;
		case 31:
		case 42:
		case 72:
			return 32;
		case 87:
		case 26:
		case 33:
			return 2147483647;
		case 34:
		case 1:
			return 47839;
		case 38:
		case 36:
			return 99;
		case 43:
		case 37:
			return 2048;
		case 0:
			return 2097152;
		case 3:
			return 65536;
		case 28:
			return 32768;
		case 44:
			return 32767;
		case 75:
			return 16384;
		case 39:
			return 1e3;
		case 89:
			return 700;
		case 71:
			return 256;
		case 40:
			return 255;
		case 2:
			return 100;
		case 180:
			return 64;
		case 25:
			return 20;
		case 5:
			return 16;
		case 6:
			return 6;
		case 73:
			return 4;
		case 84:
			{
				if (typeof navigator === "object") return navigator["hardwareConcurrency"] || 1;
				return 1
			}
	}
	___setErrNo(ERRNO_CODES.EINVAL);
	return -1
}

function _recv(fd, buf, len, flags) {
	var sock = SOCKFS.getSocket(fd);
	if (!sock) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	return _read(fd, buf, len)
}

function _pread(fildes, buf, nbyte, offset) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	try {
		var slab = HEAP8;
		return FS.read(stream, slab, buf, nbyte, offset)
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _read(fildes, buf, nbyte) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	try {
		var slab = HEAP8;
		return FS.read(stream, slab, buf, nbyte)
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _fread(ptr, size, nitems, stream) {
	var bytesToRead = nitems * size;
	if (bytesToRead == 0) {
		return 0
	}
	var bytesRead = 0;
	var streamObj = FS.getStreamFromPtr(stream);
	if (!streamObj) {
		___setErrNo(ERRNO_CODES.EBADF);
		return 0
	}
	while (streamObj.ungotten.length && bytesToRead > 0) {
		HEAP8[ptr++ >> 0] = streamObj.ungotten.pop();
		bytesToRead--;
		bytesRead++
	}
	var err = _read(streamObj.fd, ptr, bytesToRead);
	if (err == -1) {
		if (streamObj) streamObj.error = true;
		return 0
	}
	bytesRead += err;
	if (bytesRead < bytesToRead) streamObj.eof = true;
	return bytesRead / size | 0
}

function _ftell(stream) {
	stream = FS.getStreamFromPtr(stream);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	if (FS.isChrdev(stream.node.mode)) {
		___setErrNo(ERRNO_CODES.ESPIPE);
		return -1
	} else {
		return stream.position
	}
}

function _ftello() {
	return _ftell.apply(null, arguments)
}
var _BItoD = true;

function _pthread_cond_signal() {
	throw "TODO: " + aborter
}

function _abort() {
	Module["abort"]()
}

function _pthread_cond_destroy() {}

function _unlink(path) {
	path = Pointer_stringify(path);
	try {
		FS.unlink(path);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _rmdir(path) {
	path = Pointer_stringify(path);
	try {
		FS.rmdir(path);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _remove(path) {
	var ret = _unlink(path);
	if (ret == -1) ret = _rmdir(path);
	return ret
}

function _pthread_once(ptr, func) {
	if (!_pthread_once.seen) _pthread_once.seen = {};
	if (ptr in _pthread_once.seen) return;
	Runtime.dynCall("v", func);
	_pthread_once.seen[ptr] = 1
}

function _flock(fd, operation) {
	return 0
}
var PTHREAD_SPECIFIC = {};

function _pthread_getspecific(key) {
	return PTHREAD_SPECIFIC[key] || 0
}

function _clearerr(stream) {
	stream = FS.getStreamFromPtr(stream);
	if (!stream) {
		return
	}
	stream.eof = false;
	stream.error = false
}

function _access(path, amode) {
	path = Pointer_stringify(path);
	if (amode & ~7) {
		___setErrNo(ERRNO_CODES.EINVAL);
		return -1
	}
	var node;
	try {
		var lookup = FS.lookupPath(path, {
			follow: true
		});
		node = lookup.node
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
	var perms = "";
	if (amode & 4) perms += "r";
	if (amode & 2) perms += "w";
	if (amode & 1) perms += "x";
	if (perms && FS.nodePermissions(node, perms)) {
		___setErrNo(ERRNO_CODES.EACCES);
		return -1
	}
	return 0
}

function _emscripten_set_main_loop_timing(mode, value) {
	Browser.mainLoop.timingMode = mode;
	Browser.mainLoop.timingValue = value;
	if (!Browser.mainLoop.func) {
		return 1
	}
	if (mode == 0) {
		Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
			setTimeout(Browser.mainLoop.runner, value)
		};
		Browser.mainLoop.method = "timeout"
	} else if (mode == 1) {
		Browser.mainLoop.scheduler = function Browser_mainLoop_scheduler() {
			Browser.requestAnimationFrame(Browser.mainLoop.runner)
		};
		Browser.mainLoop.method = "rAF"
	}
	return 0
}

function _emscripten_set_main_loop(func, fps, simulateInfiniteLoop, arg, noSetTiming) {
	Module["noExitRuntime"] = true;
	assert(!Browser.mainLoop.func, "emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");
	Browser.mainLoop.func = func;
	Browser.mainLoop.arg = arg;
	var thisMainLoopId = Browser.mainLoop.currentlyRunningMainloop;
	Browser.mainLoop.runner = function Browser_mainLoop_runner() {
		if (ABORT) return;
		if (Browser.mainLoop.queue.length > 0) {
			var start = Date.now();
			var blocker = Browser.mainLoop.queue.shift();
			blocker.func(blocker.arg);
			if (Browser.mainLoop.remainingBlockers) {
				var remaining = Browser.mainLoop.remainingBlockers;
				var next = remaining % 1 == 0 ? remaining - 1 : Math.floor(remaining);
				if (blocker.counted) {
					Browser.mainLoop.remainingBlockers = next
				} else {
					next = next + .5;
					Browser.mainLoop.remainingBlockers = (8 * remaining + next) / 9
				}
			}
			console.log('main loop blocker "' + blocker.name + '" took ' + (Date.now() - start) + " ms");
			Browser.mainLoop.updateStatus();
			setTimeout(Browser.mainLoop.runner, 0);
			return
		}
		if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
		Browser.mainLoop.currentFrameNumber = Browser.mainLoop.currentFrameNumber + 1 | 0;
		if (Browser.mainLoop.timingMode == 1 && Browser.mainLoop.timingValue > 1 && Browser.mainLoop.currentFrameNumber % Browser.mainLoop.timingValue != 0) {
			Browser.mainLoop.scheduler();
			return
		}
		if (Browser.mainLoop.method === "timeout" && Module.ctx) {
			Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");
			Browser.mainLoop.method = ""
		}
		Browser.mainLoop.runIter((function() {
			if (typeof arg !== "undefined") {
				Runtime.dynCall("vi", func, [arg])
			} else {
				Runtime.dynCall("v", func)
			}
		}));
		if (thisMainLoopId < Browser.mainLoop.currentlyRunningMainloop) return;
		if (typeof SDL === "object" && SDL.audio && SDL.audio.queueNewAudioData) SDL.audio.queueNewAudioData();
		Browser.mainLoop.scheduler()
	};
	if (!noSetTiming) {
		if (fps && fps > 0) _emscripten_set_main_loop_timing(0, 1e3 / fps);
		else _emscripten_set_main_loop_timing(1, 1);
		Browser.mainLoop.scheduler()
	}
	if (simulateInfiniteLoop) {
		throw "SimulateInfiniteLoop"
	}
}
var Browser = {
	mainLoop: {
		scheduler: null,
		method: "",
		currentlyRunningMainloop: 0,
		func: null,
		arg: 0,
		timingMode: 0,
		timingValue: 0,
		currentFrameNumber: 0,
		queue: [],
		pause: (function() {
			Browser.mainLoop.scheduler = null;
			Browser.mainLoop.currentlyRunningMainloop++
		}),
		resume: (function() {
			Browser.mainLoop.currentlyRunningMainloop++;
			var timingMode = Browser.mainLoop.timingMode;
			var timingValue = Browser.mainLoop.timingValue;
			var func = Browser.mainLoop.func;
			Browser.mainLoop.func = null;
			_emscripten_set_main_loop(func, 0, false, Browser.mainLoop.arg, true);
			_emscripten_set_main_loop_timing(timingMode, timingValue);
			Browser.mainLoop.scheduler()
		}),
		updateStatus: (function() {
			if (Module["setStatus"]) {
				var message = Module["statusMessage"] || "Please wait...";
				var remaining = Browser.mainLoop.remainingBlockers;
				var expected = Browser.mainLoop.expectedBlockers;
				if (remaining) {
					if (remaining < expected) {
						Module["setStatus"](message + " (" + (expected - remaining) + "/" + expected + ")")
					} else {
						Module["setStatus"](message)
					}
				} else {
					Module["setStatus"]("")
				}
			}
		}),
		runIter: (function(func) {
			if (ABORT) return;
			if (Module["preMainLoop"]) {
				var preRet = Module["preMainLoop"]();
				if (preRet === false) {
					return
				}
			}
			try {
				func()
			} catch (e) {
				if (e instanceof ExitStatus) {
					return
				} else {
					if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [e, e.stack]);
					throw e
				}
			}
			if (Module["postMainLoop"]) Module["postMainLoop"]()
		})
	},
	isFullScreen: false,
	pointerLock: false,
	moduleContextCreatedCallbacks: [],
	workers: [],
	init: (function() {
		if (!Module["preloadPlugins"]) Module["preloadPlugins"] = [];
		if (Browser.initted) return;
		Browser.initted = true;
		try {
			new Blob;
			Browser.hasBlobConstructor = true
		} catch (e) {
			Browser.hasBlobConstructor = false;
			console.log("warning: no blob constructor, cannot create blobs with mimetypes")
		}
		Browser.BlobBuilder = typeof MozBlobBuilder != "undefined" ? MozBlobBuilder : typeof WebKitBlobBuilder != "undefined" ? WebKitBlobBuilder : !Browser.hasBlobConstructor ? console.log("warning: no BlobBuilder") : null;
		Browser.URLObject = typeof window != "undefined" ? window.URL ? window.URL : window.webkitURL : undefined;
		if (!Module.noImageDecoding && typeof Browser.URLObject === "undefined") {
			console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");
			Module.noImageDecoding = true
		}
		var imagePlugin = {};
		imagePlugin["canHandle"] = function imagePlugin_canHandle(name) {
			return !Module.noImageDecoding && /\.(jpg|jpeg|png|bmp)$/i.test(name)
		};
		imagePlugin["handle"] = function imagePlugin_handle(byteArray, name, onload, onerror) {
			var b = null;
			if (Browser.hasBlobConstructor) {
				try {
					b = new Blob([byteArray], {
						type: Browser.getMimetype(name)
					});
					if (b.size !== byteArray.length) {
						b = new Blob([(new Uint8Array(byteArray)).buffer], {
							type: Browser.getMimetype(name)
						})
					}
				} catch (e) {
					Runtime.warnOnce("Blob constructor present but fails: " + e + "; falling back to blob builder")
				}
			}
			if (!b) {
				var bb = new Browser.BlobBuilder;
				bb.append((new Uint8Array(byteArray)).buffer);
				b = bb.getBlob()
			}
			var url = Browser.URLObject.createObjectURL(b);
			var img = new Image;
			img.onload = function img_onload() {
				assert(img.complete, "Image " + name + " could not be decoded");
				var canvas = document.createElement("canvas");
				canvas.width = img.width;
				canvas.height = img.height;
				var ctx = canvas.getContext("2d");
				ctx.drawImage(img, 0, 0);
				Module["preloadedImages"][name] = canvas;
				Browser.URLObject.revokeObjectURL(url);
				if (onload) onload(byteArray)
			};
			img.onerror = function img_onerror(event) {
				console.log("Image " + url + " could not be decoded");
				if (onerror) onerror()
			};
			img.src = url
		};
		Module["preloadPlugins"].push(imagePlugin);
		var audioPlugin = {};
		audioPlugin["canHandle"] = function audioPlugin_canHandle(name) {
			return !Module.noAudioDecoding && name.substr(-4) in {
				".ogg": 1,
				".wav": 1,
				".mp3": 1
			}
		};
		audioPlugin["handle"] = function audioPlugin_handle(byteArray, name, onload, onerror) {
			var done = false;

			function finish(audio) {
				if (done) return;
				done = true;
				Module["preloadedAudios"][name] = audio;
				if (onload) onload(byteArray)
			}

			function fail() {
				if (done) return;
				done = true;
				Module["preloadedAudios"][name] = new Audio;
				if (onerror) onerror()
			}
			if (Browser.hasBlobConstructor) {
				try {
					var b = new Blob([byteArray], {
						type: Browser.getMimetype(name)
					})
				} catch (e) {
					return fail()
				}
				var url = Browser.URLObject.createObjectURL(b);
				var audio = new Audio;
				audio.addEventListener("canplaythrough", (function() {
					finish(audio)
				}), false);
				audio.onerror = function audio_onerror(event) {
					if (done) return;
					console.log("warning: browser could not fully decode audio " + name + ", trying slower base64 approach");

					function encode64(data) {
						var BASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
						var PAD = "=";
						var ret = "";
						var leftchar = 0;
						var leftbits = 0;
						for (var i = 0; i < data.length; i++) {
							leftchar = leftchar << 8 | data[i];
							leftbits += 8;
							while (leftbits >= 6) {
								var curr = leftchar >> leftbits - 6 & 63;
								leftbits -= 6;
								ret += BASE[curr]
							}
						}
						if (leftbits == 2) {
							ret += BASE[(leftchar & 3) << 4];
							ret += PAD + PAD
						} else if (leftbits == 4) {
							ret += BASE[(leftchar & 15) << 2];
							ret += PAD
						}
						return ret
					}
					audio.src = "data:audio/x-" + name.substr(-3) + ";base64," + encode64(byteArray);
					finish(audio)
				};
				audio.src = url;
				Browser.safeSetTimeout((function() {
					finish(audio)
				}), 1e4)
			} else {
				return fail()
			}
		};
		Module["preloadPlugins"].push(audioPlugin);
		var canvas = Module["canvas"];

		function pointerLockChange() {
			Browser.pointerLock = document["pointerLockElement"] === canvas || document["mozPointerLockElement"] === canvas || document["webkitPointerLockElement"] === canvas || document["msPointerLockElement"] === canvas
		}
		if (canvas) {
			canvas.requestPointerLock = canvas["requestPointerLock"] || canvas["mozRequestPointerLock"] || canvas["webkitRequestPointerLock"] || canvas["msRequestPointerLock"] || (function() {});
			canvas.exitPointerLock = document["exitPointerLock"] || document["mozExitPointerLock"] || document["webkitExitPointerLock"] || document["msExitPointerLock"] || (function() {});
			canvas.exitPointerLock = canvas.exitPointerLock.bind(document);
			document.addEventListener("pointerlockchange", pointerLockChange, false);
			document.addEventListener("mozpointerlockchange", pointerLockChange, false);
			document.addEventListener("webkitpointerlockchange", pointerLockChange, false);
			document.addEventListener("mspointerlockchange", pointerLockChange, false);
			if (Module["elementPointerLock"]) {
				canvas.addEventListener("click", (function(ev) {
					if (!Browser.pointerLock && canvas.requestPointerLock) {
						canvas.requestPointerLock();
						ev.preventDefault()
					}
				}), false)
			}
		}
	}),
	createContext: (function(canvas, useWebGL, setInModule, webGLContextAttributes) {
		if (useWebGL && Module.ctx && canvas == Module.canvas) return Module.ctx;
		var ctx;
		var contextHandle;
		if (useWebGL) {
			var contextAttributes = {
				antialias: false,
				alpha: false
			};
			if (webGLContextAttributes) {
				for (var attribute in webGLContextAttributes) {
					contextAttributes[attribute] = webGLContextAttributes[attribute]
				}
			}
			contextHandle = GL.createContext(canvas, contextAttributes);
			if (contextHandle) {
				ctx = GL.getContext(contextHandle).GLctx
			}
			canvas.style.backgroundColor = "black"
		} else {
			ctx = canvas.getContext("2d")
		}
		if (!ctx) return null;
		if (setInModule) {
			if (!useWebGL) assert(typeof GLctx === "undefined", "cannot set in module if GLctx is used, but we are a non-GL context that would replace it");
			Module.ctx = ctx;
			if (useWebGL) GL.makeContextCurrent(contextHandle);
			Module.useWebGL = useWebGL;
			Browser.moduleContextCreatedCallbacks.forEach((function(callback) {
				callback()
			}));
			Browser.init()
		}
		return ctx
	}),
	destroyContext: (function(canvas, useWebGL, setInModule) {}),
	fullScreenHandlersInstalled: false,
	lockPointer: undefined,
	resizeCanvas: undefined,
	requestFullScreen: (function(lockPointer, resizeCanvas, vrDevice) {
		Browser.lockPointer = lockPointer;
		Browser.resizeCanvas = resizeCanvas;
		Browser.vrDevice = vrDevice;
		if (typeof Browser.lockPointer === "undefined") Browser.lockPointer = true;
		if (typeof Browser.resizeCanvas === "undefined") Browser.resizeCanvas = false;
		if (typeof Browser.vrDevice === "undefined") Browser.vrDevice = null;
		var canvas = Module["canvas"];

		function fullScreenChange() {
			Browser.isFullScreen = false;
			var canvasContainer = canvas.parentNode;
			if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvasContainer) {
				canvas.cancelFullScreen = document["cancelFullScreen"] || document["mozCancelFullScreen"] || document["webkitCancelFullScreen"] || document["msExitFullscreen"] || document["exitFullscreen"] || (function() {});
				canvas.cancelFullScreen = canvas.cancelFullScreen.bind(document);
				if (Browser.lockPointer) canvas.requestPointerLock();
				Browser.isFullScreen = true;
				if (Browser.resizeCanvas) Browser.setFullScreenCanvasSize()
			} else {
				canvasContainer.parentNode.insertBefore(canvas, canvasContainer);
				canvasContainer.parentNode.removeChild(canvasContainer);
				if (Browser.resizeCanvas) Browser.setWindowedCanvasSize()
			}
			if (Module["onFullScreen"]) Module["onFullScreen"](Browser.isFullScreen);
			Browser.updateCanvasDimensions(canvas)
		}
		if (!Browser.fullScreenHandlersInstalled) {
			Browser.fullScreenHandlersInstalled = true;
			document.addEventListener("fullscreenchange", fullScreenChange, false);
			document.addEventListener("mozfullscreenchange", fullScreenChange, false);
			document.addEventListener("webkitfullscreenchange", fullScreenChange, false);
			document.addEventListener("MSFullscreenChange", fullScreenChange, false)
		}
		var canvasContainer = document.createElement("div");
		canvas.parentNode.insertBefore(canvasContainer, canvas);
		canvasContainer.appendChild(canvas);
		canvasContainer.requestFullScreen = canvasContainer["requestFullScreen"] || canvasContainer["mozRequestFullScreen"] || canvasContainer["msRequestFullscreen"] || (canvasContainer["webkitRequestFullScreen"] ? (function() {
			canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"])
		}) : null);
		if (vrDevice) {
			canvasContainer.requestFullScreen({
				vrDisplay: vrDevice
			})
		} else {
			canvasContainer.requestFullScreen()
		}
	}),
	nextRAF: 0,
	fakeRequestAnimationFrame: (function(func) {
		var now = Date.now();
		if (Browser.nextRAF === 0) {
			Browser.nextRAF = now + 1e3 / 60
		} else {
			while (now + 2 >= Browser.nextRAF) {
				Browser.nextRAF += 1e3 / 60
			}
		}
		var delay = Math.max(Browser.nextRAF - now, 0);
		setTimeout(func, delay)
	}),
	requestAnimationFrame: function requestAnimationFrame(func) {
		if (typeof window === "undefined") {
			Browser.fakeRequestAnimationFrame(func)
		} else {
			if (!window.requestAnimationFrame) {
				window.requestAnimationFrame = window["requestAnimationFrame"] || window["mozRequestAnimationFrame"] || window["webkitRequestAnimationFrame"] || window["msRequestAnimationFrame"] || window["oRequestAnimationFrame"] || Browser.fakeRequestAnimationFrame
			}
			window.requestAnimationFrame(func)
		}
	},
	safeCallback: (function(func) {
		return (function() {
			if (!ABORT) return func.apply(null, arguments)
		})
	}),
	allowAsyncCallbacks: true,
	queuedAsyncCallbacks: [],
	pauseAsyncCallbacks: (function() {
		Browser.allowAsyncCallbacks = false
	}),
	resumeAsyncCallbacks: (function() {
		Browser.allowAsyncCallbacks = true;
		if (Browser.queuedAsyncCallbacks.length > 0) {
			var callbacks = Browser.queuedAsyncCallbacks;
			Browser.queuedAsyncCallbacks = [];
			callbacks.forEach((function(func) {
				func()
			}))
		}
	}),
	safeRequestAnimationFrame: (function(func) {
		return Browser.requestAnimationFrame((function() {
			if (ABORT) return;
			if (Browser.allowAsyncCallbacks) {
				func()
			} else {
				Browser.queuedAsyncCallbacks.push(func)
			}
		}))
	}),
	safeSetTimeout: (function(func, timeout) {
		Module["noExitRuntime"] = true;
		return setTimeout((function() {
			if (ABORT) return;
			if (Browser.allowAsyncCallbacks) {
				func()
			} else {
				Browser.queuedAsyncCallbacks.push(func)
			}
		}), timeout)
	}),
	safeSetInterval: (function(func, timeout) {
		Module["noExitRuntime"] = true;
		return setInterval((function() {
			if (ABORT) return;
			if (Browser.allowAsyncCallbacks) {
				func()
			}
		}), timeout)
	}),
	getMimetype: (function(name) {
		return {
			"jpg": "image/jpeg",
			"jpeg": "image/jpeg",
			"png": "image/png",
			"bmp": "image/bmp",
			"ogg": "audio/ogg",
			"wav": "audio/wav",
			"mp3": "audio/mpeg"
		}[name.substr(name.lastIndexOf(".") + 1)]
	}),
	getUserMedia: (function(func) {
		if (!window.getUserMedia) {
			window.getUserMedia = navigator["getUserMedia"] || navigator["mozGetUserMedia"]
		}
		window.getUserMedia(func)
	}),
	getMovementX: (function(event) {
		return event["movementX"] || event["mozMovementX"] || event["webkitMovementX"] || 0
	}),
	getMovementY: (function(event) {
		return event["movementY"] || event["mozMovementY"] || event["webkitMovementY"] || 0
	}),
	getMouseWheelDelta: (function(event) {
		var delta = 0;
		switch (event.type) {
			case "DOMMouseScroll":
				delta = event.detail;
				break;
			case "mousewheel":
				delta = event.wheelDelta;
				break;
			case "wheel":
				delta = event["deltaY"];
				break;
			default:
				throw "unrecognized mouse wheel event: " + event.type
		}
		return delta
	}),
	mouseX: 0,
	mouseY: 0,
	mouseMovementX: 0,
	mouseMovementY: 0,
	touches: {},
	lastTouches: {},
	calculateMouseEvent: (function(event) {
		if (Browser.pointerLock) {
			if (event.type != "mousemove" && "mozMovementX" in event) {
				Browser.mouseMovementX = Browser.mouseMovementY = 0
			} else {
				Browser.mouseMovementX = Browser.getMovementX(event);
				Browser.mouseMovementY = Browser.getMovementY(event)
			}
			if (typeof SDL != "undefined") {
				Browser.mouseX = SDL.mouseX + Browser.mouseMovementX;
				Browser.mouseY = SDL.mouseY + Browser.mouseMovementY
			} else {
				Browser.mouseX += Browser.mouseMovementX;
				Browser.mouseY += Browser.mouseMovementY
			}
		} else {
			var rect = Module["canvas"].getBoundingClientRect();
			var cw = Module["canvas"].width;
			var ch = Module["canvas"].height;
			var scrollX = typeof window.scrollX !== "undefined" ? window.scrollX : window.pageXOffset;
			var scrollY = typeof window.scrollY !== "undefined" ? window.scrollY : window.pageYOffset;
			if (event.type === "touchstart" || event.type === "touchend" || event.type === "touchmove") {
				var touch = event.touch;
				if (touch === undefined) {
					return
				}
				var adjustedX = touch.pageX - (scrollX + rect.left);
				var adjustedY = touch.pageY - (scrollY + rect.top);
				adjustedX = adjustedX * (cw / rect.width);
				adjustedY = adjustedY * (ch / rect.height);
				var coords = {
					x: adjustedX,
					y: adjustedY
				};
				if (event.type === "touchstart") {
					Browser.lastTouches[touch.identifier] = coords;
					Browser.touches[touch.identifier] = coords
				} else if (event.type === "touchend" || event.type === "touchmove") {
					Browser.lastTouches[touch.identifier] = Browser.touches[touch.identifier];
					Browser.touches[touch.identifier] = {
						x: adjustedX,
						y: adjustedY
					}
				}
				return
			}
			var x = event.pageX - (scrollX + rect.left);
			var y = event.pageY - (scrollY + rect.top);
			x = x * (cw / rect.width);
			y = y * (ch / rect.height);
			Browser.mouseMovementX = x - Browser.mouseX;
			Browser.mouseMovementY = y - Browser.mouseY;
			Browser.mouseX = x;
			Browser.mouseY = y
		}
	}),
	xhrLoad: (function(url, onload, onerror) {
		var xhr = new XMLHttpRequest;
		xhr.open("GET", url, true);
		xhr.responseType = "arraybuffer";
		xhr.onload = function xhr_onload() {
			if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
				onload(xhr.response)
			} else {
				onerror()
			}
		};
		xhr.onerror = onerror;
		xhr.send(null)
	}),
	asyncLoad: (function(url, onload, onerror, noRunDep) {
		Browser.xhrLoad(url, (function(arrayBuffer) {
			assert(arrayBuffer, 'Loading data file "' + url + '" failed (no arrayBuffer).');
			onload(new Uint8Array(arrayBuffer));
			if (!noRunDep) removeRunDependency("al " + url)
		}), (function(event) {
			if (onerror) {
				onerror()
			} else {
				throw 'Loading data file "' + url + '" failed.'
			}
		}));
		if (!noRunDep) addRunDependency("al " + url)
	}),
	resizeListeners: [],
	updateResizeListeners: (function() {
		var canvas = Module["canvas"];
		Browser.resizeListeners.forEach((function(listener) {
			listener(canvas.width, canvas.height)
		}))
	}),
	setCanvasSize: (function(width, height, noUpdates) {
		var canvas = Module["canvas"];
		Browser.updateCanvasDimensions(canvas, width, height);
		if (!noUpdates) Browser.updateResizeListeners()
	}),
	windowedWidth: 0,
	windowedHeight: 0,
	setFullScreenCanvasSize: (function() {
		if (typeof SDL != "undefined") {
			var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
			flags = flags | 8388608;
			HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags
		}
		Browser.updateResizeListeners()
	}),
	setWindowedCanvasSize: (function() {
		if (typeof SDL != "undefined") {
			var flags = HEAPU32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2];
			flags = flags & ~8388608;
			HEAP32[SDL.screen + Runtime.QUANTUM_SIZE * 0 >> 2] = flags
		}
		Browser.updateResizeListeners()
	}),
	updateCanvasDimensions: (function(canvas, wNative, hNative) {
		if (wNative && hNative) {
			canvas.widthNative = wNative;
			canvas.heightNative = hNative
		} else {
			wNative = canvas.widthNative;
			hNative = canvas.heightNative
		}
		var w = wNative;
		var h = hNative;
		if (Module["forcedAspectRatio"] && Module["forcedAspectRatio"] > 0) {
			if (w / h < Module["forcedAspectRatio"]) {
				w = Math.round(h * Module["forcedAspectRatio"])
			} else {
				h = Math.round(w / Module["forcedAspectRatio"])
			}
		}
		if ((document["webkitFullScreenElement"] || document["webkitFullscreenElement"] || document["mozFullScreenElement"] || document["mozFullscreenElement"] || document["fullScreenElement"] || document["fullscreenElement"] || document["msFullScreenElement"] || document["msFullscreenElement"] || document["webkitCurrentFullScreenElement"]) === canvas.parentNode && typeof screen != "undefined") {
			var factor = Math.min(screen.width / w, screen.height / h);
			w = Math.round(w * factor);
			h = Math.round(h * factor)
		}
		if (Browser.resizeCanvas) {
			if (canvas.width != w) canvas.width = w;
			if (canvas.height != h) canvas.height = h;
			if (typeof canvas.style != "undefined") {
				canvas.style.removeProperty("width");
				canvas.style.removeProperty("height")
			}
		} else {
			if (canvas.width != wNative) canvas.width = wNative;
			if (canvas.height != hNative) canvas.height = hNative;
			if (typeof canvas.style != "undefined") {
				if (w != wNative || h != hNative) {
					canvas.style.setProperty("width", w + "px", "important");
					canvas.style.setProperty("height", h + "px", "important")
				} else {
					canvas.style.removeProperty("width");
					canvas.style.removeProperty("height")
				}
			}
		}
	}),
	wgetRequests: {},
	nextWgetRequestHandle: 0,
	getNextWgetRequestHandle: (function() {
		var handle = Browser.nextWgetRequestHandle;
		Browser.nextWgetRequestHandle++;
		return handle
	})
};

function _pthread_setspecific(key, value) {
	if (!(key in PTHREAD_SPECIFIC)) {
		return ERRNO_CODES.EINVAL
	}
	PTHREAD_SPECIFIC[key] = value;
	return 0
}

function _lseek(fildes, offset, whence) {
	var stream = FS.getStream(fildes);
	if (!stream) {
		___setErrNo(ERRNO_CODES.EBADF);
		return -1
	}
	try {
		return FS.llseek(stream, offset, whence)
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _fseek(stream, offset, whence) {
	var fd = _fileno(stream);
	var ret = _lseek(fd, offset, whence);
	if (ret == -1) {
		return -1
	}
	stream = FS.getStreamFromPtr(stream);
	stream.eof = false;
	return 0
}

function _rewind(stream) {
	_fseek(stream, 0, 0);
	var streamObj = FS.getStreamFromPtr(stream);
	if (streamObj) streamObj.error = false
}

function _malloc(bytes) {
	var ptr = Runtime.dynamicAlloc(bytes + 8);
	return ptr + 8 & 4294967288
}
Module["_malloc"] = _malloc;

function ___cxa_allocate_exception(size) {
	return _malloc(size)
}

function _stat(path, buf, dontResolveLastLink) {
	path = typeof path !== "string" ? Pointer_stringify(path) : path;
	try {
		var stat = dontResolveLastLink ? FS.lstat(path) : FS.stat(path);
		HEAP32[buf >> 2] = stat.dev;
		HEAP32[buf + 4 >> 2] = 0;
		HEAP32[buf + 8 >> 2] = stat.ino;
		HEAP32[buf + 12 >> 2] = stat.mode;
		HEAP32[buf + 16 >> 2] = stat.nlink;
		HEAP32[buf + 20 >> 2] = stat.uid;
		HEAP32[buf + 24 >> 2] = stat.gid;
		HEAP32[buf + 28 >> 2] = stat.rdev;
		HEAP32[buf + 32 >> 2] = 0;
		HEAP32[buf + 36 >> 2] = stat.size;
		HEAP32[buf + 40 >> 2] = 4096;
		HEAP32[buf + 44 >> 2] = stat.blocks;
		HEAP32[buf + 48 >> 2] = stat.atime.getTime() / 1e3 | 0;
		HEAP32[buf + 52 >> 2] = 0;
		HEAP32[buf + 56 >> 2] = stat.mtime.getTime() / 1e3 | 0;
		HEAP32[buf + 60 >> 2] = 0;
		HEAP32[buf + 64 >> 2] = stat.ctime.getTime() / 1e3 | 0;
		HEAP32[buf + 68 >> 2] = 0;
		HEAP32[buf + 72 >> 2] = stat.ino;
		return 0
	} catch (e) {
		if (e.node && PATH.normalize(path) !== PATH.normalize(FS.getPath(e.node))) {
			e.setErrno(ERRNO_CODES.ENOTDIR)
		}
		FS.handleFSError(e);
		return -1
	}
}

function _lstat(path, buf) {
	return _stat(path, buf, true)
}

function _ferror(stream) {
	stream = FS.getStreamFromPtr(stream);
	return Number(stream && stream.error)
}

function _time(ptr) {
	var ret = Date.now() / 1e3 | 0;
	if (ptr) {
		HEAP32[ptr >> 2] = ret
	}
	return ret
}

function _getcwd(buf, size) {
	if (size == 0) {
		___setErrNo(ERRNO_CODES.EINVAL);
		return 0
	}
	var cwd = FS.cwd();
	if (size < cwd.length + 1) {
		___setErrNo(ERRNO_CODES.ERANGE);
		return 0
	} else {
		writeAsciiToMemory(cwd, buf);
		return buf
	}
}

function _symlink(path1, path2) {
	path1 = Pointer_stringify(path1);
	path2 = Pointer_stringify(path2);
	try {
		FS.symlink(path1, path2);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _pthread_join() {
	throw "TODO: " + aborter
}

function _pthread_cond_init() {}

function _fseeko() {
	return _fseek.apply(null, arguments)
}

function _getgrnam() {
	Module["printErr"]("missing function: getgrnam");
	abort(-1)
}

function _chown(path, owner, group, dontResolveLastLink) {
	if (typeof path !== "string") path = Pointer_stringify(path);
	try {
		FS.chown(path, owner, group);
		return 0
	} catch (e) {
		FS.handleFSError(e);
		return -1
	}
}

function _lchown(path, owner, group) {
	return _chown(path, owner, group, true)
}
Module["_strcpy"] = _strcpy;
var PTHREAD_SPECIFIC_NEXT_KEY = 1;

function _pthread_key_create(key, destructor) {
	if (key == 0) {
		return ERRNO_CODES.EINVAL
	}
	HEAP32[key >> 2] = PTHREAD_SPECIFIC_NEXT_KEY;
	PTHREAD_SPECIFIC[PTHREAD_SPECIFIC_NEXT_KEY] = 0;
	PTHREAD_SPECIFIC_NEXT_KEY++;
	return 0
}
var ___dso_handle = allocate(1, "i32*", ALLOC_STATIC);
FS.staticInit();
__ATINIT__.unshift({
	func: (function() {
		if (!Module["noFSInit"] && !FS.init.initialized) FS.init()
	})
});
__ATMAIN__.push({
	func: (function() {
		FS.ignorePermissions = false
	})
});
__ATEXIT__.push({
	func: (function() {
		FS.quit()
	})
});
Module["FS_createFolder"] = FS.createFolder;
Module["FS_createPath"] = FS.createPath;
Module["FS_createDataFile"] = FS.createDataFile;
Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
Module["FS_createLazyFile"] = FS.createLazyFile;
Module["FS_createLink"] = FS.createLink;
Module["FS_createDevice"] = FS.createDevice;
___errno_state = Runtime.staticAlloc(4);
HEAP32[___errno_state >> 2] = 0;
__ATINIT__.unshift({
	func: (function() {
		TTY.init()
	})
});
__ATEXIT__.push({
	func: (function() {
		TTY.shutdown()
	})
});
if (ENVIRONMENT_IS_NODE) {
	var fs = require("fs");
	var NODEJS_PATH = require("path");
	NODEFS.staticInit()
}
_fputc.ret = allocate([0], "i8", ALLOC_STATIC);
__ATINIT__.push({
	func: (function() {
		SOCKFS.root = FS.mount(SOCKFS, {}, null)
	})
});
Module["requestFullScreen"] = function Module_requestFullScreen(lockPointer, resizeCanvas, vrDevice) {
	Browser.requestFullScreen(lockPointer, resizeCanvas, vrDevice)
};
Module["requestAnimationFrame"] = function Module_requestAnimationFrame(func) {
	Browser.requestAnimationFrame(func)
};
Module["setCanvasSize"] = function Module_setCanvasSize(width, height, noUpdates) {
	Browser.setCanvasSize(width, height, noUpdates)
};
Module["pauseMainLoop"] = function Module_pauseMainLoop() {
	Browser.mainLoop.pause()
};
Module["resumeMainLoop"] = function Module_resumeMainLoop() {
	Browser.mainLoop.resume()
};
Module["getUserMedia"] = function Module_getUserMedia() {
	Browser.getUserMedia()
};
STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
staticSealed = true;
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = DYNAMICTOP = Runtime.alignMemory(STACK_MAX);
assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
var cttz_i8 = allocate([8, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 7, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 6, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 5, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0, 4, 0, 1, 0, 2, 0, 1, 0, 3, 0, 1, 0, 2, 0, 1, 0], "i8", ALLOC_DYNAMIC);

function invoke_iiii(index, a1, a2, a3) {
	try {
		return Module["dynCall_iiii"](index, a1, a2, a3)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_viiiii(index, a1, a2, a3, a4, a5) {
	try {
		Module["dynCall_viiiii"](index, a1, a2, a3, a4, a5)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_vi(index, a1) {
	try {
		Module["dynCall_vi"](index, a1)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_ii(index, a1) {
	try {
		return Module["dynCall_ii"](index, a1)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_v(index) {
	try {
		Module["dynCall_v"](index)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_iiiii(index, a1, a2, a3, a4) {
	try {
		return Module["dynCall_iiiii"](index, a1, a2, a3, a4)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_viiiiii(index, a1, a2, a3, a4, a5, a6) {
	try {
		Module["dynCall_viiiiii"](index, a1, a2, a3, a4, a5, a6)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_iii(index, a1, a2) {
	try {
		return Module["dynCall_iii"](index, a1, a2)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}

function invoke_viiii(index, a1, a2, a3, a4) {
	try {
		Module["dynCall_viiii"](index, a1, a2, a3, a4)
	} catch (e) {
		if (typeof e !== "number" && e !== "longjmp") throw e;
		asm["setThrew"](1, 0)
	}
}
Module.asmGlobalArg = {
	"Math": Math,
	"Int8Array": Int8Array,
	"Int16Array": Int16Array,
	"Int32Array": Int32Array,
	"Uint8Array": Uint8Array,
	"Uint16Array": Uint16Array,
	"Uint32Array": Uint32Array,
	"Float32Array": Float32Array,
	"Float64Array": Float64Array,
	"NaN": NaN,
	"Infinity": Infinity,
	"byteLength": byteLength
};
Module.asmLibraryArg = {
	"abort": abort,
	"assert": assert,
	"jsCall": jsCall,
	"invoke_iiii": invoke_iiii,
	"invoke_viiiii": invoke_viiiii,
	"invoke_vi": invoke_vi,
	"invoke_ii": invoke_ii,
	"invoke_v": invoke_v,
	"invoke_iiiii": invoke_iiiii,
	"invoke_viiiiii": invoke_viiiiii,
	"invoke_iii": invoke_iii,
	"invoke_viiii": invoke_viiii,
	"_flock": _flock,
	"_fread": _fread,
	"_lchown": _lchown,
	"___assert_fail": ___assert_fail,
	"__ZSt18uncaught_exceptionv": __ZSt18uncaught_exceptionv,
	"_ftell": _ftell,
	"_emscripten_set_main_loop_timing": _emscripten_set_main_loop_timing,
	"_sbrk": _sbrk,
	"___cxa_begin_catch": ___cxa_begin_catch,
	"_emscripten_memcpy_big": _emscripten_memcpy_big,
	"_sysconf": _sysconf,
	"_utime": _utime,
	"_close": _close,
	"_ferror": _ferror,
	"_rewind": _rewind,
	"_isatty": _isatty,
	"_umask": _umask,
	"___resumeException": ___resumeException,
	"_write": _write,
	"_fsync": _fsync,
	"___cxa_atexit": ___cxa_atexit,
	"_pthread_cond_destroy": _pthread_cond_destroy,
	"_mknod": _mknod,
	"_mkdir": _mkdir,
	"_send": _send,
	"_chmod": _chmod,
	"_chown": _chown,
	"_fcntl": _fcntl,
	"___cxa_find_matching_catch": ___cxa_find_matching_catch,
	"_pthread_cond_init": _pthread_cond_init,
	"_lstat": _lstat,
	"_strerror_r": _strerror_r,
	"___setErrNo": ___setErrNo,
	"_getpid": _getpid,
	"_unlink": _unlink,
	"_mktime": _mktime,
	"_pthread_once": _pthread_once,
	"_fopen": _fopen,
	"_stat": _stat,
	"_getpwnam": _getpwnam,
	"_read": _read,
	"_fwrite": _fwrite,
	"_time": _time,
	"_fprintf": _fprintf,
	"_pthread_join": _pthread_join,
	"_getgrnam": _getgrnam,
	"_getcwd": _getcwd,
	"_lseek": _lseek,
	"_link": _link,
	"_access": _access,
	"_vfprintf": _vfprintf,
	"_rmdir": _rmdir,
	"___cxa_allocate_exception": ___cxa_allocate_exception,
	"_pwrite": _pwrite,
	"_localtime_r": _localtime_r,
	"_tzset": _tzset,
	"_dup": _dup,
	"_remove": _remove,
	"_pthread_getspecific": _pthread_getspecific,
	"_fdopen": _fdopen,
	"_pthread_cond_signal": _pthread_cond_signal,
	"_fseek": _fseek,
	"_pthread_mutex_destroy": _pthread_mutex_destroy,
	"_fclose": _fclose,
	"_pthread_key_create": _pthread_key_create,
	"_pthread_cond_broadcast": _pthread_cond_broadcast,
	"_recv": _recv,
	"_ftello": _ftello,
	"_symlink": _symlink,
	"_abort": _abort,
	"_localtime": _localtime,
	"_pthread_cond_wait": _pthread_cond_wait,
	"_open": _open,
	"_fflush": _fflush,
	"_pthread_mutex_lock": _pthread_mutex_lock,
	"__reallyNegative": __reallyNegative,
	"_fileno": _fileno,
	"_fseeko": _fseeko,
	"_pthread_mutex_unlock": _pthread_mutex_unlock,
	"_pread": _pread,
	"_mkport": _mkport,
	"_pthread_create": _pthread_create,
	"_emscripten_set_main_loop": _emscripten_set_main_loop,
	"___errno_location": ___errno_location,
	"_pthread_setspecific": _pthread_setspecific,
	"_clearerr": _clearerr,
	"_fputc": _fputc,
	"___cxa_throw": ___cxa_throw,
	"_strerror": _strerror,
	"__formatString": __formatString,
	"_atexit": _atexit,
	"_pthread_mutex_init": _pthread_mutex_init,
	"STACKTOP": STACKTOP,
	"STACK_MAX": STACK_MAX,
	"tempDoublePtr": tempDoublePtr,
	"ABORT": ABORT,
	"cttz_i8": cttz_i8,
	"___dso_handle": ___dso_handle,
	"_stderr": _stderr,
	"_stdin": _stdin
}; // EMSCRIPTEN_START_ASM
var asm=(function(global,env,buffer) {
"use asm";var a=global.Int8Array;var b=global.Int16Array;var c=global.Int32Array;var d=global.Uint8Array;var e=global.Uint16Array;var f=global.Uint32Array;var g=global.Float32Array;var h=global.Float64Array;var i=new a(buffer);var j=new b(buffer);var k=new c(buffer);var l=new d(buffer);var m=new e(buffer);var n=new f(buffer);var o=new g(buffer);var p=new h(buffer);var q=global.byteLength;var r=env.STACKTOP|0;var s=env.STACK_MAX|0;var t=env.tempDoublePtr|0;var u=env.ABORT|0;var v=env.cttz_i8|0;var w=env.___dso_handle|0;var x=env._stderr|0;var y=env._stdin|0;var z=0;var A=0;var B=0;var C=0;var D=global.NaN,E=global.Infinity;var F=0,G=0,H=0,I=0,J=0.0,K=0,L=0,M=0,N=0.0;var O=0;var P=0;var Q=0;var R=0;var S=0;var T=0;var U=0;var V=0;var W=0;var X=0;var Y=global.Math.floor;var Z=global.Math.abs;var _=global.Math.sqrt;var $=global.Math.pow;var aa=global.Math.cos;var ba=global.Math.sin;var ca=global.Math.tan;var da=global.Math.acos;var ea=global.Math.asin;var fa=global.Math.atan;var ga=global.Math.atan2;var ha=global.Math.exp;var ia=global.Math.log;var ja=global.Math.ceil;var ka=global.Math.imul;var la=global.Math.min;var ma=global.Math.clz32;var na=env.abort;var oa=env.assert;var pa=env.jsCall;var qa=env.invoke_iiii;var ra=env.invoke_viiiii;var sa=env.invoke_vi;var ta=env.invoke_ii;var ua=env.invoke_v;var va=env.invoke_iiiii;var wa=env.invoke_viiiiii;var xa=env.invoke_iii;var ya=env.invoke_viiii;var za=env._flock;var Aa=env._fread;var Ba=env._lchown;var Ca=env.___assert_fail;var Da=env.__ZSt18uncaught_exceptionv;var Ea=env._ftell;var Fa=env._emscripten_set_main_loop_timing;var Ga=env._sbrk;var Ha=env.___cxa_begin_catch;var Ia=env._emscripten_memcpy_big;var Ja=env._sysconf;var Ka=env._utime;var La=env._close;var Ma=env._ferror;var Na=env._rewind;var Oa=env._isatty;var Pa=env._umask;var Qa=env.___resumeException;var Ra=env._write;var Sa=env._fsync;var Ta=env.___cxa_atexit;var Ua=env._pthread_cond_destroy;var Va=env._mknod;var Wa=env._mkdir;var Xa=env._send;var Ya=env._chmod;var Za=env._chown;var _a=env._fcntl;var $a=env.___cxa_find_matching_catch;var ab=env._pthread_cond_init;var bb=env._lstat;var cb=env._strerror_r;var db=env.___setErrNo;var eb=env._getpid;var fb=env._unlink;var gb=env._mktime;var hb=env._pthread_once;var ib=env._fopen;var jb=env._stat;var kb=env._getpwnam;var lb=env._read;var mb=env._fwrite;var nb=env._time;var ob=env._fprintf;var pb=env._pthread_join;var qb=env._getgrnam;var rb=env._getcwd;var sb=env._lseek;var tb=env._link;var ub=env._access;var vb=env._vfprintf;var wb=env._rmdir;var xb=env.___cxa_allocate_exception;var yb=env._pwrite;var zb=env._localtime_r;var Ab=env._tzset;var Bb=env._dup;var Cb=env._remove;var Db=env._pthread_getspecific;var Eb=env._fdopen;var Fb=env._pthread_cond_signal;var Gb=env._fseek;var Hb=env._pthread_mutex_destroy;var Ib=env._fclose;var Jb=env._pthread_key_create;var Kb=env._pthread_cond_broadcast;var Lb=env._recv;var Mb=env._ftello;var Nb=env._symlink;var Ob=env._abort;var Pb=env._localtime;var Qb=env._pthread_cond_wait;var Rb=env._open;var Sb=env._fflush;var Tb=env._pthread_mutex_lock;var Ub=env.__reallyNegative;var Vb=env._fileno;var Wb=env._fseeko;var Xb=env._pthread_mutex_unlock;var Yb=env._pread;var Zb=env._mkport;var _b=env._pthread_create;var $b=env._emscripten_set_main_loop;var ac=env.___errno_location;var bc=env._pthread_setspecific;var cc=env._clearerr;var dc=env._fputc;var ec=env.___cxa_throw;var fc=env._strerror;var gc=env.__formatString;var hc=env._atexit;var ic=env._pthread_mutex_init;var jc=0.0;function _emscripten_replace_memory(newBuffer){if(q(newBuffer)&16777215||q(newBuffer)<=16777215||q(newBuffer)>2147483648)return false;i=new a(newBuffer);j=new b(newBuffer);k=new c(newBuffer);l=new d(newBuffer);m=new e(newBuffer);n=new f(newBuffer);o=new g(newBuffer);p=new h(newBuffer);buffer=newBuffer;return true}
// EMSCRIPTEN_START_FUNCS
function tc(a){a=a|0;var b=0;b=r;r=r+a|0;r=r+15&-16;return b|0}function uc(){return r|0}function vc(a){a=a|0;r=a}function wc(a,b){a=a|0;b=b|0;if(!z){z=a;A=b}}function xc(a){a=a|0;i[t>>0]=i[a>>0];i[t+1>>0]=i[a+1>>0];i[t+2>>0]=i[a+2>>0];i[t+3>>0]=i[a+3>>0]}function yc(a){a=a|0;i[t>>0]=i[a>>0];i[t+1>>0]=i[a+1>>0];i[t+2>>0]=i[a+2>>0];i[t+3>>0]=i[a+3>>0];i[t+4>>0]=i[a+4>>0];i[t+5>>0]=i[a+5>>0];i[t+6>>0]=i[a+6>>0];i[t+7>>0]=i[a+7>>0]}function zc(a){a=a|0;O=a}function Ac(){return O|0}function Bc(a){a=a|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[a+12>>2]=0;k[a+16>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[a+20>>2]=0;k[a+88>>2]=0;return}function Cc(a){a=a|0;var b=0;k[a+16>>2]=0;b=k[a>>2]|0;if(b){ym(b);k[a>>2]=0}k[a+4>>2]=0;k[a+8>>2]=0;k[a+20>>2]=0;k[a+88>>2]=0;return}function Dc(a){a=a|0;k[a+16>>2]=0;return}function Ec(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=r;r=r+16|0;f=j;g=(b|0)==0?8:b;e=a+4|0;h=k[e>>2]|0;b=(kk(g)|0)+1|0;b=b+(k[e>>2]|0)|0;k[e>>2]=b;i=a+8|0;c=k[i>>2]|0;if(b>>>0<=c>>>0){f=k[a>>2]|0;h=f+(h<<2)|0;ik(h,g)|0;h=a+20|0;f=k[h>>2]|0;f=f+1|0;k[h>>2]=f;r=j;return}d=k[a+12>>2]|0;if((d|0)!=0&b>>>0>d>>>0){k[f>>2]=d;Jf(32944,53104,f);Af(32944);c=k[i>>2]|0;b=k[e>>2]|0}c=c+32+(c>>>2)|0;b=b>>>0>c>>>0?b:c;c=zm(k[a>>2]|0,b<<2)|0;if(!c)Af(32944);k[a>>2]=c;k[i>>2]=b;f=c;h=f+(h<<2)|0;ik(h,g)|0;h=a+20|0;f=k[h>>2]|0;f=f+1|0;k[h>>2]=f;r=j;return}function Fc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=a+16|0;e=k[d>>2]|0;if(e>>>0>=(k[a+4>>2]|0)>>>0){a=0;return a|0}a=(k[a>>2]|0)+(e<<2)|0;e=(kk(a)|0)+1|0;k[d>>2]=e+(k[d>>2]|0);Lc(b,a,c)|0;a=1;return a|0}function Gc(a){a=a|0;var b=0,c=0;b=a+16|0;c=k[b>>2]|0;if(c>>>0>=(k[a+4>>2]|0)>>>0){a=0;return a|0}a=(k[a>>2]|0)+(c<<2)|0;c=(kk(a)|0)+1|0;k[b>>2]=c+(k[b>>2]|0);return a|0}function Hc(a,b,c){a=a|0;b=b|0;c=c|0;if((b|0)==(a|0)|(c|0)==0)return;c=c+-1|0;Wm(b|0,a|0,c|0)|0;i[b+c>>0]=0;return}function Ic(a,b,c){a=a|0;b=b|0;c=c|0;if(!c)return a|0;c=c+-1|0;Wm(a|0,b|0,c|0)|0;i[a+c>>0]=0;return a|0}function Jc(a){a=a|0;return (a+-48|0)>>>0<10|0}function Kc(a,b){a=a|0;b=b|0;return hk(a,b)|0}function Lc(a,b,c){a=a|0;b=b|0;c=c|0;if(!c)return a|0;c=c+-1|0;nk(a,b,c)|0;k[a+(c<<2)>>2]=0;return a|0}function Mc(a,b,c){a=a|0;b=b|0;c=c|0;c=c-(kk(a)|0)+-1|0;if((c|0)<=0)return a|0;lk(a,b,c)|0;return a|0}function Nc(a){a=a|0;var b=0,c=0;c=(k[8196]|0)+1|0;c=c>>>0>3?0:c;k[8196]=c;b=16+(c<<13)|0;ne(a,b,2048)|0;k[8204+(c<<13)>>2]=0;return b|0}function Oc(a){a=a|0;var b=0,c=0,d=0;b=kk(a)|0;while(1){c=b+-1|0;if((b|0)<=0){d=5;break}if((k[a+(c<<2)>>2]|0)==47)break;else b=c}if((d|0)==5)return a|0;c=a+(b<<2)|0;return c|0}function Pc(a){a=a|0;return (a|0)==47|0}function Qc(a){a=a|0;return 0}function Rc(a){a=a|0;var b=0;b=kk(a)|0;if(!b)return a|0;a=a+(b+-1<<2)|0;return a|0}function Sc(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0;i=r;r=r+8192|0;g=i;c=a;a:while(1){d=a;while(1){a=k[d>>2]|0;if(!a)break a;else if((a|0)!=47){d=d+4|0;continue}a=d+4|0;if((k[a>>2]|0)!=46){d=a;continue}if((k[d+8>>2]|0)==46)break;else d=a}c=(k[d+12>>2]|0)==47?d+16|0:c}while(1){a=k[c>>2]|0;if((a|0)==92)if((k[c+4>>2]|0)==92?(f=gk(c+8|0,92)|0,(f|0)!=0):0){a=gk(f+4|0,92)|0;a=(a|0)==0?c:a+4|0}else a=c;else if(!a)break;else a=c;b:while(1){e=a;while(1){d=k[e>>2]|0;if((d|0)==47){a=e;break}else if((d|0)!=46)break b;e=e+4|0}a=a+4|0}if((a|0)==(c|0)){h=17;break}else c=a}if((h|0)==17)if((k[c>>2]|0)==46?(k[c+4>>2]|0)==46:0){f=c+8|0;c=(k[f>>2]|0)==0?f:c}if(!b){r=i;return c|0}Lc(g,c,2048)|0;ik(b,g)|0;r=i;return c|0}function Tc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;if(!a)return;if(!(k[a>>2]|0))return;d=kk(a)|0;while(1){e=d+-1|0;if((d|0)<=0){d=a;break}if((k[a+(e<<2)>>2]|0)==47){f=6;break}else d=e}if((f|0)==6)d=a+(d<<2)|0;d=pk(d,46)|0;if(d)k[d>>2]=0;if(!b)return;Mc(a,32792,c)|0;Mc(a,b,c)|0;return}function Uc(a){a=a|0;if(!a){a=0;return a|0}a=(ok(a,41640)|0)!=0;return a|0}function Vc(a,b){a=a|0;b=b|0;var c=0;c=kk(a)|0;if(!c)return;if(!((c+1|0)>>>0<b>>>0?(k[a+(c+-1<<2)>>2]|0)!=47:0))return;fk(a,32816)|0;return}function Wc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;if(!c)return;c=c+-1|0;d=kk(a)|0;while(1){e=d+-1|0;if((d|0)<=0){d=a;break}if((k[a+(e<<2)>>2]|0)==47){f=5;break}else d=e}if((f|0)==5)d=a+(d<<2)|0;e=a;if(c>>>0>=d-e>>2>>>0){c=kk(a)|0;while(1){d=c+-1|0;if((c|0)<=0){c=a;break}if((k[a+(d<<2)>>2]|0)==47){f=10;break}else c=d}if((f|0)==10)c=a+(c<<2)|0;c=c-e>>2}nk(b,a,c)|0;k[b+(c<<2)>>2]=0;return}function Xc(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;if((b|0)!=0?(k[b>>2]|0)!=0:0){if((c|0)!=(b|0))nk(c,b,d)|0}else e=5;do if((e|0)==5)if(!a){k[c>>2]=0;break}else{ne(a,c,d)|0;break}while(0);if(!d)return c|0;k[c+(d+-1<<2)>>2]=0;return c|0}function Yc(a){a=a|0;var b=0,c=0,d=0,e=0,f=0;b=a+((kk(a)|0)+-1<<2)|0;while(1)if(b>>>0>a>>>0&((Jc(k[b>>2]|0)|0)^1))b=b+-4|0;else break;d=b;while(1){c=d>>>0>a>>>0;if((Jc(k[d>>2]|0)|0)&c)d=d+-4|0;else break}if(!c)return b|0;while(1){c=k[d>>2]|0;if((c|0)==46){f=14;break}if(Jc(c)|0){f=9;break}d=d+-4|0;if(d>>>0<=a>>>0){f=14;break}}if((f|0)==9){c=kk(a)|0;while(1){e=c+-1|0;if((c|0)<=0)break;if((k[a+(e<<2)>>2]|0)==47){f=12;break}else c=e}if((f|0)==12)a=a+(c<<2)|0;f=gk(a,46)|0;return ((f|0)!=0&f>>>0<d>>>0?d:b)|0}else if((f|0)==14)return b|0;return 0}function Zc(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0;do if(a){g=kk(a)|0;while(1){f=g+-1|0;if((g|0)<=0){d=a;break}if((k[a+(f<<2)>>2]|0)==47){h=g;o=6;break}else g=f}if((o|0)==6)d=a+(h<<2)|0;f=pk(d,46)|0;if(!f){Mc(a,32824,b)|0;f=kk(a)|0;while(1){d=f+-1|0;if((f|0)<=0){i=a;break}if((k[a+(d<<2)>>2]|0)==47){j=f;o=11;break}else f=d}if((o|0)==11)i=a+(j<<2)|0;f=pk(i,46)|0;break}else{d=f+4|0;if(!((k[d>>2]|0)==0?(kk(a)|0)>>>0<(b+-3|0)>>>0:0))o=15;if(((o|0)==15?(se(d,32848)|0)!=0:0)?(se(d,32800)|0)!=0:0)break;ik(d,32864)|0;break}}else{Mc(0,32824,b)|0;f=0}while(0);if(!c){e=Yc(a)|0;while(1){n=(k[e>>2]|0)+1|0;k[e>>2]=n;if((n|0)!=58){o=33;break}k[e>>2]=48;d=e+-4|0;if(d>>>0<a>>>0){l=d;m=e;break}if(Jc(k[d>>2]|0)|0)e=d;else{l=d;m=e;break}}if((o|0)==33)return;d=a+((kk(a)|0)<<2)|0;if((d|0)!=(l|0))while(1){k[d+4>>2]=k[d>>2];if((d|0)==(m|0))break;else d=d+-4|0}k[m>>2]=49;return}d=f+8|0;if(Jc(k[d>>2]|0)|0?(e=f+12|0,Jc(k[e>>2]|0)|0):0){m=(k[e>>2]|0)+1|0;k[e>>2]=m;if((m|0)!=58)return;while(1){f=e;e=e+-4|0;d=k[e>>2]|0;if((d|0)==46){n=f;break}k[f>>2]=48;m=d+1|0;k[e>>2]=m;if((m|0)!=58){o=33;break}}if((o|0)==33)return;k[n>>2]=65;return}ik(d,32880)|0;return}function _c(a){a=a|0;if(!(k[a>>2]|0)){a=0;return a|0}a=(ok(a,32896)|0)==0;return a|0}function $c(a,b){a=a|0;b=b|0;var c=0,d=0;c=k[a>>2]|0;if(!c)return;d=b?32896:32928;if(!b){do{if(gk(d,c)|0)k[a>>2]=95;a=a+4|0;c=k[a>>2]|0}while((c|0)!=0);return}do{if(!((gk(d,c)|0)==0?(k[a>>2]|0)>>>0>=32:0))k[a>>2]=95;a=a+4|0;c=k[a>>2]|0}while((c|0)!=0);return}function ad(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=c+-1|0;a:do if(!e)c=0;else{c=0;do{d=i[a+c>>0]|0;if(!(d<<24>>24))break a;i[b+c>>0]=d<<24>>24==92?47:d;c=c+1|0}while(c>>>0<e>>>0)}while(0);i[b+c>>0]=0;return}function bd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=c+-1|0;a:do if(!e)c=0;else{c=0;do{d=k[a+(c<<2)>>2]|0;if(!d)break a;k[b+(c<<2)>>2]=(d|0)==92?47:d;c=c+1|0}while(c>>>0<e>>>0)}while(0);k[b+(c<<2)>>2]=0;return}function cd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;f=r;r=r+2048|0;e=f;do if(a){d=k[a>>2]|0;if(!d)break;else if((d|0)!=47){if(!(rb(e|0,2048)|0))i[e>>0]=0;ne(e,b,c)|0;e=kk(b)|0;if((e|0)!=0?((e+1|0)>>>0<c>>>0?(k[b+(e+-1<<2)>>2]|0)!=47:0):0)fk(b,32816)|0}else k[b>>2]=0;Mc(b,a,c)|0;r=f;return}while(0);if(!c){r=f;return}k[b>>2]=0;r=f;return}function dd(a){a=a|0;return (k[a>>2]|0)==47|0}function ed(a){a=a|0;return (k[a>>2]|0)==47|0}function fd(a,b){a=a|0;b=b|0;var c=0;c=pk(a,59)|0;if(c){a=we(c+4|0)|0;if(b)k[c>>2]=0}else a=0;return a|0}function gd(a){a=a|0;Ha(a|0)|0;Hk()}function hd(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;if((d|0)<(b|0)|(d|0)==(b|0)&c>>>0<a>>>0){c=100;return c|0}if((c|0)==0&(d|0)==0){c=0;return c|0}b=jn(a|0,b|0,100,0)|0;c=gn(b|0,O|0,c|0,d|0)|0;return c|0}function id(){zf(32944);return}function jd(a){a=a|0;var b=0;k[a>>2]=32968;k[a+4>>2]=0;k[a+24>>2]=0;i[a+8>>0]=0;b=a+12|0;k[a+8216>>2]=0;i[a+21>>0]=0;k[b+0>>2]=0;j[b+4>>1]=0;i[b+6>>0]=0;i[a+19>>0]=1;i[a+20>>0]=1;return}function kd(a){a=a|0;var b=0,c=0,d=0;k[a>>2]=32968;b=a+4|0;c=k[b>>2]|0;if(!c)return;if(i[a+16>>0]|0)return;if(!(i[a+18>>0]|0)){d=(Ib(c|0)|0)==-1;k[b>>2]=0;k[a+12>>2]=0;if(!d)return;if(!(i[a+20>>0]|0))return;Cf(32944,a+24|0);return}d=a+12|0;if(k[d>>2]|0)return;c=(Ib(c|0)|0)==-1;k[b>>2]=0;k[d>>2]=0;if(c?(i[a+20>>0]|0)!=0:0)Cf(32944,a+24|0);if(!(i[a+19>>0]|0))return;Md(a+24|0)|0;return}function ld(a){a=a|0;var b=0,c=0;b=a+4|0;c=k[b>>2]|0;do if(c){if(i[a+16>>0]|0){k[b>>2]=0;k[a+12>>2]=0;b=1;break}c=(Ib(c|0)|0)==-1;k[b>>2]=0;k[a+12>>2]=0;if(c)if(!(i[a+20>>0]|0))b=0;else{Cf(32944,a+24|0);b=0}else b=1}else{k[a+12>>2]=0;b=1}while(0);return b|0}function md(a){a=a|0;kd(a);Ak(a);return}function nd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0;j=r;r=r+2064|0;e=j+8|0;f=a+8216|0;k[f>>2]=0;if(!(i[a+21>>0]|0))g=(c&4|0)==0;else g=0;h=(c&1|0)!=0;if(h)c=2;else c=c>>>1&1;me(b,e,2048)|0;c=Rb(e|0,c|0,j|0)|0;if(g&(h&(c|0)>-1)?(za(c|0,6)|0)==-1:0){La(c|0)|0;b=0;r=j;return b|0}if(!((c|0)!=-1?(d=Eb(c|0,(h?32992:33e3)|0)|0,(d|0)!=0):0)){g=ac()|0;if((k[g>>2]|0)==2){k[f>>2]=1;d=0}else d=0}i[a+18>>0]=0;k[a+12>>2]=0;i[a+16>>0]=0;if(!d){b=0;r=j;return b|0}k[a+4>>2]=d;Lc(a+24|0,b,2048)|0;b=1;r=j;return b|0}function od(a,b){a=a|0;b=b|0;if(kc[k[(k[a>>2]|0)+8>>2]&31](a,b,0)|0){a=1;return a|0}Lf(32944,b);a=0;return a|0}function pd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=r;r=r+2048|0;e=d;me(b,e,2048)|0;e=ib(e|0,((c&2|0)!=0?33008:57816)|0)|0;c=a+4|0;k[c>>2]=e;i[a+18>>0]=1;k[a+12>>2]=0;i[a+16>>0]=0;Lc(a+24|0,b,2048)|0;r=d;return (k[c>>2]|0)!=0|0}function qd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;if(!c){c=1;return c|0}d=a+12|0;g=a+4|0;if((k[d>>2]|0)==1?(k[g>>2]|0)==0:0){h=Eb(Bb(1)|0,33008)|0;k[g>>2]=h}h=a+20|0;e=a+24|0;while(1){f=mb(b|0,1,c|0,k[g>>2]|0)|0;if((f|0)==(c|0)?(Ma(k[g>>2]|0)|0)==0:0){d=1;break}if(!(i[h>>0]|0)){d=0;break}if(k[d>>2]|0){d=0;break}if(!(Hf(32944,e,0)|0)){j=13;break}cc(k[g>>2]|0);if(!(f>>>0<c>>>0&(f|0)>0))continue;m=k[a>>2]|0;l=k[m+16>>2]|0;m=nc[k[m+20>>2]&15](a)|0;f=Um(m|0,O|0,f|0,((f|0)<0)<<31>>31|0)|0;sc[l&15](a,f,O,0)}if((j|0)==13){Gf(32944,0,e);d=0}i[a+8>>0]=1;m=d;return m|0}function rd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0;e=a+17|0;if(!(i[e>>0]|0)){m=0;n=0}else{m=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;n=O}o=a+12|0;p=k[y>>2]|0;j=a+4|0;l=a+8|0;f=a+8216|0;g=a+20|0;h=a+24|0;while(1){if((k[o>>2]|0)==1)k[j>>2]=p;if(i[l>>0]|0){Sb(k[j>>2]|0)|0;i[l>>0]=0}cc(k[j>>2]|0);d=Aa(b|0,1,c|0,k[j>>2]|0)|0;if(!((d|0)==-1|(Ma(k[j>>2]|0)|0)!=0)){e=21;break}k[f>>2]=2;if(!(i[g>>0]|0)){d=-1;e=21;break}if(i[e>>0]|0){e=11;break}if(k[o>>2]|0){e=20;break}if(!(Ff(32944,h)|0)){e=20;break}}if((e|0)==11){if(!c){a=0;return a|0}f=0;d=0;do{h=k[(k[a>>2]|0)+16>>2]|0;e=Vm(f|0,0,m|0,n|0)|0;sc[h&15](a,e,O,0);e=c-f|0;if((k[o>>2]|0)==1)k[j>>2]=p;if(i[l>>0]|0){Sb(k[j>>2]|0)|0;i[l>>0]=0}cc(k[j>>2]|0);h=Aa(b|0,1,(e>>>0<512?e:512)|0,k[j>>2]|0)|0;e=(Ma(k[j>>2]|0)|0)==0;h=e?h:-1;d=((h|0)==-1?512:h)+d|0;f=f+512|0}while(f>>>0<c>>>0);return d|0}else if((e|0)==20){Ef(32944,h);a=-1;return a|0}else if((e|0)==21)return d|0;return 0}function sd(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;if(td(a,b,c,d)|0)return;if(!(i[a+20>>0]|0))return;If(32944,a+24|0);return}function td(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;g=a+4|0;e=k[g>>2]|0;if(!e){a=1;return a|0}if((c|0)<0&(d|0)!=0){f=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;e=O;if((d|0)!=1){sc[k[(k[a>>2]|0)+16>>2]&15](a,0,0,2);h=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;d=O;sc[k[(k[a>>2]|0)+16>>2]&15](a,f,e,0);f=h;e=d}b=Vm(f|0,e|0,b|0,c|0)|0;d=0;e=k[g>>2]|0}i[a+8>>0]=0;a=(Wb(e|0,b|0,d|0)|0)==0;return a|0}function ud(a){a=a|0;var b=0,c=0,d=0,e=0;e=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;d=O;sc[k[(k[a>>2]|0)+16>>2]&15](a,0,0,2);b=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;c=O;sc[k[(k[a>>2]|0)+16>>2]&15](a,e,d,0);O=c;return b|0}function vd(a){a=a|0;var b=0,c=0;c=a+4|0;b=k[c>>2]|0;do if(!b)if(!(i[a+20>>0]|0)){c=-1;a=-1;O=c;return a|0}else{If(32944,a+24|0);b=k[c>>2]|0;break}while(0);a=Mb(b|0)|0;c=((a|0)<0)<<31>>31;O=c;return a|0}function wd(a,b,c){a=a|0;b=b|0;c=c|0;return}function xd(a){a=a|0;var b=0,c=0;c=r;r=r+16|0;b=c;i[b>>0]=0;kc[k[(k[a>>2]|0)+12>>2]&31](a,b,1)|0;r=c;return i[b>>0]|0}function yd(a){a=a|0;return 0}function zd(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return}function Ad(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;h=r;r=r+2064|0;g=h;f=h+8|0;if(!b)d=0;else{d=b;d=(k[d>>2]|0)!=0|(k[d+4>>2]|0)!=0}if(!c)e=0;else{e=c;e=(k[e>>2]|0)!=0|(k[e+4>>2]|0)!=0}if(!(d|e)){r=h;return}if(d)d=ff(b)|0;else d=ff(c)|0;k[g+4>>2]=d;if(e)d=ff(c)|0;k[g>>2]=d;me(a+24|0,f,2048)|0;Ka(f|0,g|0)|0;r=h;return}function Bd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;h=r;r=r+2064|0;g=h;f=h+8|0;if(!b)d=0;else{d=b;d=(k[d>>2]|0)!=0|(k[d+4>>2]|0)!=0}if(!c)e=0;else{e=c;e=(k[e>>2]|0)!=0|(k[e+4>>2]|0)!=0}if(!(d|e)){r=h;return}if(d)d=ff(b)|0;else d=ff(c)|0;k[g+4>>2]=d;if(e)d=ff(c)|0;k[g>>2]=d;me(a,f,2048)|0;Ka(f|0,g|0)|0;r=h;return}function Cd(a){a=a|0;a=k[a+4>>2]|0;if(!a){a=0;return a|0}a=(Oa(Vb(a|0)|0)|0)!=0;return a|0}function Dd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=r;r=r+2048|0;e=d;me(a,e,2048)|0;if((Wa(e|0,(b?c:511)|0)|0)!=-1){e=0;r=d;return e|0}e=ac()|0;e=(k[e>>2]|0)==2?2:1;r=d;return e|0}function Ed(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=r;r=r+10240|0;i=j+8192|0;h=j;if(!a){i=0;r=j;return i|0}c=k[a>>2]|0;if(!c){i=0;r=j;return i|0}g=a;e=c;c=1;f=a;do{d=f-g>>2;if(d>>>0>2047)break;if((Pc(e)|0)&f>>>0>a>>>0){nk(h,a,d)|0;k[h+(d<<2)>>2]=0;me(h,i,2048)|0;if((Wa(i|0,511)|0)==-1)c=0;else c=1}f=f+4|0;e=k[f>>2]|0}while((e|0)!=0);if(b){i=c;r=j;return i|0}g=Rc(a)|0;if(Pc(k[g>>2]|0)|0){i=c;r=j;return i|0}me(a,i,2048)|0;i=(Wa(i|0,511)|0)!=-1;r=j;return i|0}function Fd(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;Bd(a,b,d);return}function Gd(a){a=a|0;var b=0,c=0;b=r;r=r+2048|0;c=b;me(a,c,2048)|0;a=(ub(c|0,0)|0)==0;r=b;return a|0}function Hd(a){a=a|0;return (a&61440|0)==16384|0}function Id(a){a=a|0;return (a&61440|0)==40960|0}function Jd(a){a=a|0;var b=0,c=0;c=r;r=r+2048|0;b=c;if(!a){r=c;return}me(a,b,2048)|0;Ya(b|0,448)|0;r=c;return}function Kd(a){a=a|0;var b=0,c=0,d=0;c=r;r=r+2128|0;d=c+80|0;b=c;me(a,d,2048)|0;if(jb(d|0,b|0)|0){d=0;r=c;return d|0}d=k[b+12>>2]|0;r=c;return d|0}function Ld(a,b){a=a|0;b=b|0;var c=0,d=0;c=r;r=r+2048|0;d=c;me(a,d,2048)|0;a=(Ya(d|0,b|0)|0)==0;r=c;return a|0}function Md(a){a=a|0;var b=0,c=0;b=r;r=r+2048|0;c=b;me(a,c,2048)|0;a=(Cb(c|0)|0)==0;r=b;return a|0}function Nd(a,b,c,d,e,f,g,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0;k=(e|0)!=0;if(k)i[e>>0]=0;a:do if(Gd(c)|0){l=(b|0)==0&1;while(1){m=xi(a,c,d,f,g,h,l)|0;if(!m)break a;else if((m|0)==6)Bf(32944,255);else if((m|0)==1)break;if(!(Gd(c)|0))break a}if(!k){b=0;return b|0}i[e>>0]=1;b=0;return b|0}while(0);f=j?18:17;if(!b){Ed(c,1)|0;b=Md(c)|0;return b|0}if(pd(b,c,f)|0){b=1;return b|0}Ed(c,1)|0;b=pd(b,c,f)|0;return b|0}function Od(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0;u=r;r=r+80864|0;q=u+80704|0;d=u+80788|0;p=u+59112|0;n=u;h=u+80780|0;g=u+80784|0;if(!(i[a+78270>>0]|0)){a=0;r=u;return a|0}s=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;t=O;e=a+78264|0;do if((k[e>>2]|0)!=1){c=k[(k[a>>2]|0)+16>>2]|0;if(!(i[a+42740>>0]|0)){q=ke(a)|0;sc[c&15](a,q,O,0);if(!(fe(a,33112)|0)){c=0;break}c=Pd(a,b)|0;break}sc[c&15](a,(k[a+78280>>2]|0)+20|0,0,0);ae(a)|0;if(!(i[a+78284>>0]|0)){c=(k[a+77212>>2]|0)+65523|0;f=10;break}else{k[p+68>>2]=0;k[p+72>>2]=57;k[p+64>>2]=1;k[p>>2]=a+24;c=0;break}}else{sc[k[(k[a>>2]|0)+16>>2]&15](a,(k[a+78280>>2]|0)+7|0,0,0);c=xd(a)|0;c=((xd(a)|0)&255)<<8|c&255;f=10}while(0);do if((f|0)==10){if((k[e>>2]|0)==1)if(!(i[a+42741>>0]|0))f=35;else f=15;else if((i[a+77223>>0]|0)!=48){if(((i[a+77222>>0]|0)+-15&255)>14){c=0;break}if((l[a+77223>>0]|0)>53){c=0;break}else f=15}else f=35;if((f|0)==15){nf(p);i[p+41>>0]=1;if((k[e>>2]|0)==1){f=xd(a)|0;o=xd(a)|0;uf(p);i[a+77222>>0]=15;c=c+-2|0;f=(o&255)<<8|f&255}else f=m[a+77220>>1]|0;rf(p,a,0);i[p+40>>0]=0;o=p+32|0;k[o>>2]=c&65535;k[o+4>>2]=0;c=p+18672|0;Eg(c,2,1);Sh(n,p);Uh(n,65536,0);o=n+19520|0;k[o>>2]=f;k[o+4>>2]=0;i[n+19544>>0]=0;Vh(n,l[a+77222>>0]|0,0);if((k[e>>2]|0)!=1?(e=Hg(c)|0,(j[a+77224>>1]|0)!=(e&65535)<<16>>16):0){k[d+68>>2]=0;k[d+72>>2]=57;k[d+64>>2]=1;k[d>>2]=a+24;c=1}else{sf(p,h,g);c=(k[g>>2]|0)+1|0;o=b+8|0;f=k[o>>2]|0;e=b+4|0;k[e>>2]=c;if(f>>>0<c>>>0){d=k[b+12>>2]|0;if((d|0)!=0&d>>>0<c>>>0){k[q>>2]=d;Jf(32944,53104,q);Af(32944);f=k[o>>2]|0;c=k[e>>2]|0}f=f+32+(f>>>2)|0;c=c>>>0>f>>>0?c:f;f=zm(k[b>>2]|0,c<<2)|0;if(!f)Af(32944);k[b>>2]=f;k[o>>2]=c;c=k[e>>2]|0}else f=k[b>>2]|0;Ym(f|0,0,c<<2|0)|0;ne(k[h>>2]|0,k[b>>2]|0,k[g>>2]|0)|0;c=kk(k[b>>2]|0)|0;d=k[o>>2]|0;k[e>>2]=c;if(d>>>0<c>>>0){f=k[b+12>>2]|0;if((f|0)!=0&f>>>0<c>>>0){k[q>>2]=f;Jf(32944,53104,q);Af(32944);d=k[o>>2]|0;c=k[e>>2]|0}d=d+32+(d>>>2)|0;c=c>>>0>d>>>0?c:d;d=zm(k[b>>2]|0,c<<2)|0;if(!d)Af(32944);k[b>>2]=d;k[o>>2]=c;c=0}else c=0}Th(n);$d(p);if(c){c=0;break}}else if((f|0)==35){h=c&65535;if(h){d=h>>>0>32?h:32;c=zm(0,d)|0;if(!c){Af(32944);c=0}}else{c=0;d=0}kc[k[(k[a>>2]|0)+12>>2]&31](a,c,h)|0;if((k[e>>2]|0)!=1?(n=j[a+77224>>1]|0,(n&65535|0)!=((Me(-1,c,h)|0)&65535^65535|0)):0){k[q+68>>2]=0;k[q+72>>2]=57;k[q+64>>2]=1;k[q>>2]=a+24;d=1}else{g=h+1|0;o=b+8|0;f=k[o>>2]|0;n=b+4|0;k[n>>2]=g;if(f>>>0<g>>>0){e=k[b+12>>2]|0;if((e|0)!=0&e>>>0<g>>>0){k[q>>2]=e;Jf(32944,53104,q);Af(32944);f=k[o>>2]|0;e=k[n>>2]|0}else e=g;f=f+32+(f>>>2)|0;f=e>>>0>f>>>0?e:f;e=zm(k[b>>2]|0,f<<2)|0;if(!e)Af(32944);k[b>>2]=e;k[o>>2]=f}if(g>>>0>d>>>0){p=d+32+(d>>>2)|0;c=zm(c,g>>>0>p>>>0?g:p)|0;if(!c){Af(32944);c=0}}i[c+h>>0]=0;ne(c,k[b>>2]|0,h)|0;d=kk(k[b>>2]|0)|0;e=k[o>>2]|0;k[n>>2]=d;if(e>>>0<d>>>0){f=k[b+12>>2]|0;if((f|0)!=0&f>>>0<d>>>0){k[q>>2]=f;Jf(32944,53104,q);Af(32944);e=k[o>>2]|0;d=k[n>>2]|0}e=e+32+(e>>>2)|0;d=d>>>0>e>>>0?d:e;e=zm(k[b>>2]|0,d<<2)|0;if(!e)Af(32944);k[b>>2]=e;k[o>>2]=d;d=0}else d=0}if(c)ym(c);if(d){c=0;break}}c=(k[b+4>>2]|0)!=0}while(0);sc[k[(k[a>>2]|0)+16>>2]&15](a,s,t,0);a=c;r=u;return a|0}function Pd(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0;n=r;r=r+32|0;l=n;m=n+8|0;k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;k[m+12>>2]=0;if(le(a,m,0)|0){e=m+4|0;j=k[e>>2]|0;g=j+1|0;k[e>>2]=g;f=m+8|0;c=k[f>>2]|0;if(g>>>0>c>>>0){d=k[m+12>>2]|0;if((d|0)!=0&g>>>0>d>>>0){k[l>>2]=d;Jf(32944,53104,l);Af(32944);c=k[f>>2]|0;d=k[e>>2]|0}else d=g;c=c+32+(c>>>2)|0;d=d>>>0>c>>>0?d:c;c=zm(k[m>>2]|0,d)|0;if(!c)Af(32944);k[m>>2]=c;k[f>>2]=d;d=k[e>>2]|0}else{d=g;c=k[m>>2]|0}i[c+(d+-1)>>0]=0;h=b+8|0;c=k[h>>2]|0;f=b+4|0;k[f>>2]=g;if(c>>>0<g>>>0){d=k[b+12>>2]|0;if((d|0)!=0&d>>>0<g>>>0){k[l>>2]=d;Jf(32944,53104,l);Af(32944);d=k[h>>2]|0;c=k[f>>2]|0}else{d=c;c=g}d=d+32+(d>>>2)|0;c=c>>>0>d>>>0?c:d;d=zm(k[b>>2]|0,c<<2)|0;if(!d)Af(32944);k[b>>2]=d;k[h>>2]=c}do if((k[a+78264>>2]|0)!=3){c=k[m>>2]|0;d=k[b>>2]|0;if(!(k[a+60076>>2]&1)){ne(c,d,k[f>>2]|0)|0;break}else{j=j>>>1;pe(c,d,j)|0;k[(k[b>>2]|0)+(j<<2)>>2]=0;break}}else re(k[m>>2]|0,k[b>>2]|0,k[f>>2]|0)|0;while(0);c=kk(k[b>>2]|0)|0;d=k[h>>2]|0;k[f>>2]=c;if(d>>>0<c>>>0){e=k[b+12>>2]|0;if((e|0)!=0&e>>>0<c>>>0){k[l>>2]=e;Jf(32944,53104,l);Af(32944);d=k[h>>2]|0;c=k[f>>2]|0}d=d+32+(d>>>2)|0;c=c>>>0>d>>>0?c:d;d=zm(k[b>>2]|0,c<<2)|0;if(!d)Af(32944);k[b>>2]=d;k[h>>2]=c;d=1}else d=1}else d=0;c=k[m>>2]|0;if(!c){r=n;return d|0}ym(c);r=n;return d|0}function Qd(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;jd(a);k[a>>2]=33040;He(a+8220|0);nf(a+14576|0);d=a+36192|0;c=d;k[c>>2]=0;k[c+4>>2]=0;Li(a+36216|0);c=a+51056|0;e=c+40|0;do{k[c>>2]=0;c=c+4|0}while((c|0)<(e|0));c=a+68272|0;e=c+40|0;do{k[c>>2]=0;c=c+4|0}while((c|0)<(e|0));c=a+36172|0;k[c>>2]=0;e=(b|0)==0;i[a+36168>>0]=e&1;if(e){b=yk(75200)|0;wf(b)}k[c>>2]=b;i[a+21>>0]=i[b+49821>>0]|0;k[a+78264>>2]=2;k[a+78280>>2]=0;c=d;k[c>>2]=0;k[c+4>>2]=0;i[a+78285>>0]=0;i[a+78284>>0]=0;k[a+36200>>2]=0;c=a+78248|0;b=a+36176|0;k[c+0>>2]=0;k[c+4>>2]=0;k[c+8>>2]=0;k[c+12>>2]=0;c=a+78268|0;e=c+9|0;do{i[c>>0]=0;c=c+1|0}while((c|0)<(e|0));k[b>>2]=-1;k[b+4>>2]=-1;k[a+36184>>2]=-1;b=a+59984|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[b+12>>2]=0;k[b+16>>2]=0;k[b+20>>2]=0;k[b+24>>2]=0;k[b+28>>2]=0;k[a+78304>>2]=0;b=a+78312|0;k[a+78340>>2]=0;i[a+78302>>0]=0;i[a+36208>>0]=0;c=a+42712|0;e=c+116|0;do{k[c>>2]=0;c=c+4|0}while((c|0)<(e|0));k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[b+12>>2]=0;k[b+16>>2]=0;k[b+20>>2]=0;i[b+24>>0]=0;return}function Rd(a){a=a|0;var b=0;k[a>>2]=33040;if((i[a+36168>>0]|0)!=0?(b=k[a+36172>>2]|0,(b|0)!=0):0){yf(b);Ak(b)}b=k[a+68272>>2]|0;if(b)ym(b);b=k[a+51056>>2]|0;if(b)ym(b);Ni(a+36216|0);$d(a+14576|0);Ie(a+8220|0);kd(a);return}function Sd(a){a=a|0;Rd(a);Ak(a);return}function Td(a,b){a=a|0;b=b|0;var c=0,d=0;d=r;r=r+80|0;c=d;if(Ud(a,b)|0){r=d;return}if(!(i[a+78285>>0]|0)){k[c+68>>2]=0;k[c+72>>2]=56;k[c+64>>2]=1;k[c>>2]=a+24}Bf(32944,2);r=d;return}function Ud(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=r;r=r+80|0;w=y;u=a+78276|0;i[u>>0]=0;v=a+78284|0;i[v>>0]=0;if(Cd(a)|0){a=a+24|0;k[w+68>>2]=0;k[w+72>>2]=58;k[w>>2]=a;k[w+64>>2]=2;k[w+4>>2]=a;a=0;r=y;return a|0}s=a+42700|0;if((kc[k[(k[a>>2]|0)+12>>2]&31](a,s,7)|0)!=7){a=0;r=y;return a|0}t=a+78280|0;k[t>>2]=0;do if((i[s>>0]|0)==82){c=i[a+42701>>0]|0;if(c<<24>>24==69){if((i[a+42702>>0]|0)!=126){x=17;break}if((i[a+42703>>0]|0)!=94){x=17;break}c=a+78264|0;k[c>>2]=1;t=k[a>>2]|0;s=k[t+16>>2]|0;t=nc[k[t+20>>2]&15](a)|0;t=Vm(t|0,O|0,-7,-1)|0;sc[s&15](a,t,O,0);break}else if(c<<24>>24!=97){x=17;break}if((((i[a+42702>>0]|0)==114?(i[a+42703>>0]|0)==33:0)?(i[a+42704>>0]|0)==26:0)?(i[a+42705>>0]|0)==7:0){c=i[a+42706>>0]|0;if(c<<24>>24==1)c=3;else if(c<<24>>24)if(c<<24>>24==2)c=4;else{x=17;break}else c=2;t=a+78264|0;k[t>>2]=c;c=t}else x=17}else x=17;while(0);do if((x|0)==17){p=zm(0,1048576)|0;q=(p|0)==0;if(q)Af(32944);n=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;j=kc[k[(k[a>>2]|0)+12>>2]&31](a,p,1048560)|0;a:do if((j|0)>0){o=a+78264|0;f=(j|0)>31;h=28-n|0;d=p+h|0;e=p+(h+1)|0;m=p+(h+2)|0;h=p+(h+3)|0;b:do if((n|0)<28){c=0;c:while(1){do if((i[p+c>>0]|0)==82?(g=j-c|0,g>>>0>=4):0){l=i[p+(c+1)>>0]|0;if(l<<24>>24==69){if((i[p+(c+2)>>0]|0)!=126)break;if((i[p+(c+3)>>0]|0)==94){k[o>>2]=1;if(!((c|0)>0&f))break b;if((i[d>>0]|0)!=82)break;if((i[e>>0]|0)!=83)break;if((i[m>>0]|0)!=70)break;if((i[h>>0]|0)==88)break b;else break}}if((((g>>>0>6&l<<24>>24==97?(i[p+(c+2)>>0]|0)==114:0)?(i[p+(c+3)>>0]|0)==33:0)?(i[p+(c+4)>>0]|0)==26:0)?(i[p+(c+5)>>0]|0)==7:0){l=i[p+(c+6)>>0]|0;if(!(l<<24>>24)){d=2;x=33;break c}else if(l<<24>>24==1){d=3;break c}if(l<<24>>24==2){d=4;x=33;break c}}}while(0);c=c+1|0;if((j|0)<=(c|0))break a}k[o>>2]=d}else{c=0;d:while(1){do if((i[p+c>>0]|0)==82?(l=j-c|0,l>>>0>=4):0){d=i[p+(c+1)>>0]|0;if(d<<24>>24==69){if((i[p+(c+2)>>0]|0)!=126)break;if((i[p+(c+3)>>0]|0)==94){d=1;x=53;break d}}if((((l>>>0>6&d<<24>>24==97?(i[p+(c+2)>>0]|0)==114:0)?(i[p+(c+3)>>0]|0)==33:0)?(i[p+(c+4)>>0]|0)==26:0)?(i[p+(c+5)>>0]|0)==7:0){d=i[p+(c+6)>>0]|0;if(!(d<<24>>24)){d=2;x=53;break d}else if(d<<24>>24==1){d=3;break d}if(d<<24>>24==2){d=4;x=53;break d}}}while(0);c=c+1|0;if((j|0)<=(c|0))break a}k[o>>2]=d}while(0);n=c+n|0;k[t>>2]=n;sc[k[(k[a>>2]|0)+16>>2]&15](a,n,0,0);if((k[o>>2]&-2|0)==2)kc[k[(k[a>>2]|0)+12>>2]&31](a,s,7)|0}while(0);c=(k[t>>2]|0)==0;if(!q)ym(p);if(c){a=0;r=y;return a|0}else{c=a+78264|0;break}}while(0);c=k[c>>2]|0;do if((c|0)==4){k[w+68>>2]=0;k[w+72>>2]=59;k[w+64>>2]=1;k[w>>2]=a+24;a=0;r=y;return a|0}else if((c|0)==3){t=a+42707|0;kc[k[(k[a>>2]|0)+12>>2]&31](a,t,1)|0;if(!(i[t>>0]|0)){k[a+42708>>2]=8;break}else{a=0;r=y;return a|0}}else k[a+42708>>2]=7;while(0);if(!(k[(k[a+36172>>2]|0)+75184>>2]|0))i[a+36208>>0]=1;s=a+36204|0;e:do if(ae(a)|0){c=a+36208|0;d=a+78256|0;do{e=k[s>>2]|0;if((e|0)==1)break e;if((i[c>>0]|0)!=0&(e|0)==4)break e;t=d;sc[k[(k[a>>2]|0)+16>>2]&15](a,k[t>>2]|0,k[t+4>>2]|0,0)}while((ae(a)|0)!=0)}while(0);if(!((i[a+78285>>0]|0)==0|b)){a=0;r=y;return a|0}q=a+78256|0;t=q;sc[k[(k[a>>2]|0)+16>>2]&15](a,k[t>>2]|0,k[t+4>>2]|0,0);if((i[v>>0]|0)!=0?(k[w+68>>2]=0,k[w+72>>2]=25,k[w+64>>2]=1,k[w>>2]=a+24,!b):0){a=0;r=y;return a|0}i[a+78270>>0]=i[a+42740>>0]|0;if((i[a+36208>>0]|0)!=0?(i[u>>0]|0)!=0:0)c=a+78269|0;else{f=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;g=O;h=a+78248|0;l=h;j=k[l>>2]|0;l=k[l+4>>2]|0;n=q;m=k[n>>2]|0;n=k[n+4>>2]|0;o=k[s>>2]|0;c=a+78269|0;p=a+78273|0;e=a+68376|0;while(1){if(!(ae(a)|0))break;d=k[s>>2]|0;if((d|0)==3){if(!(i[c>>0]|0))d=0;else d=i[e>>0]^1;i[p>>0]=d}else if((d|0)==2){x=86;break}w=q;sc[k[(k[a>>2]|0)+16>>2]&15](a,k[w>>2]|0,k[w+4>>2]|0,0)}if((x|0)==86){if(!(i[c>>0]|0))d=0;else d=i[a+51160>>0]^1;i[p>>0]=d}x=h;k[x>>2]=j;k[x+4>>2]=l;x=q;k[x>>2]=m;k[x+4>>2]=n;k[s>>2]=o;sc[k[(k[a>>2]|0)+16>>2]&15](a,f,g,0)}if((i[c>>0]|0)!=0?(i[a+78273>>0]|0)==0:0){a=1;r=y;return a|0}ik(a+78340|0,a+24|0)|0;a=1;r=y;return a|0}function Vd(a){a=a|0;var b=0;b=a+78256|0;sc[k[(k[a>>2]|0)+16>>2]&15](a,k[b>>2]|0,k[b+4>>2]|0,0);return}function Wd(a,b){a=a|0;b=b|0;if(!(i[a+78276>>0]|0)){a=b;return a|0}b=(0-b&15)+b|0;if((k[a+78264>>2]|0)==3){a=b+16|0;return a|0}else{a=b+8|0;return a|0}return 0}function Xd(a,b,c){a=a|0;b=b|0;c=c|0;i[a+42592>>0]=0;return nd(a,b,c)|0}function Yd(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=r;r=r+16|0;d=e;if(Qi(a+36216|0,b,c,d)|0){c=k[d>>2]|0;r=e;return c|0}else{c=rd(a,b,c)|0;r=e;return c|0}return 0}function Zd(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;if(Si(a+36216|0,b,c,d)|0)return;sd(a,b,c,d);return}function _d(a){a=a|0;var b=0,c=0;c=r;r=r+16|0;b=c;if(Ti(a+36216|0,b)|0){a=b;b=k[a+4>>2]|0;a=k[a>>2]|0;O=b;r=c;return a|0}else{a=vd(a)|0;b=O;O=b;r=c;return a|0}return 0}function $d(a){a=a|0;Dg(a+18672|0);Dg(a+15756|0);Dg(a+12840|0);Ie(a+6416|0);Ie(a+64|0);return}function ae(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0;h=r;r=r+80|0;f=h;if(i[a+78285>>0]|0){g=0;r=h;return g|0}c=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;d=O;e=a+78248|0;b=e;k[b>>2]=c;k[b+4>>2]=d;b=k[a+78264>>2]|0;if((b|0)==1){b=be(a)|0;g=6}else if((b|0)==2){b=ce(a)|0;g=6}else if((b|0)==3){b=de(a)|0;g=6}else b=0;do if((g|0)==6)if(!b){g=0;r=h;return g|0}else{c=e;d=k[c+4>>2]|0;c=k[c>>2]|0;break}while(0);g=a+78256|0;e=k[g+4>>2]|0;if((e|0)>(d|0)|((e|0)==(d|0)?(k[g>>2]|0)>>>0>c>>>0:0)){g=b;r=h;return g|0}k[f+68>>2]=0;k[f+72>>2]=24;k[f+64>>2]=1;k[f>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);g=0;r=h;return g|0}function be(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;j=r;r=r+2096|0;h=j;b=j+2080|0;e=j+32|0;Qe(h,a);g=a+78248|0;f=g;d=k[f+4>>2]|0;if((d|0)>0|((d|0)==0?(k[f>>2]|0)>>>0>(k[a+78280>>2]|0)>>>0:0)){Re(h,21)|0;di(a+42832|0,0);k[a+42836>>2]=2;d=Ve(h)|0;m=a+42852|0;k[m>>2]=d;d=Ve(h)|0;b=a+51104|0;k[b>>2]=d;k[b+4>>2]=0;k[a+51120>>2]=1;b=(Ue(h)|0)&65535;k[a+51124>>2]=b;b=(Ue(h)|0)&65535;d=a+42844|0;k[d>>2]=b;b=Ve(h)|0;c=(Te(h)|0)&255;k[a+42860>>2]=c;c=(Te(h)|0)&255|32768;f=a+42840|0;k[f>>2]=c;c=(Te(h)|0)<<24>>24==2;i[a+42857>>0]=c?13:10;c=(Te(h)|0)&255;l=Te(h)|0;i[a+42858>>0]=l;f=k[f>>2]|0;i[a+51160>>0]=f&1;i[a+51161>>0]=f>>>1&1;f=f>>>2&1;i[a+51163>>0]=f;k[a+51164>>2]=f;f=a+51096|0;l=f;k[l>>2]=k[m>>2];k[l+4>>2]=0;k[a+51252>>2]=65536;lf(a+51072|0,b);Re(h,c)|0;Ze(h,e,c)|0;i[e+c>>0]=0;Hc(e,e,2048);c=a+42864|0;ne(e,c,2048)|0;e=a+36172|0;b=k[(k[e>>2]|0)+49804>>2]|0;if((b|0)==1){ue(c)|0;b=k[(k[e>>2]|0)+49804>>2]|0}if((b|0)==2)te(c)|0;if(!(k[h+20>>2]|0)){d=a+78256|0;e=g;b=k[e>>2]|0;e=k[e+4>>2]|0;c=k[d>>2]|0;d=k[d+4>>2]|0}else{e=g;b=k[e>>2]|0;e=k[e+4>>2]|0;d=Vm(k[d>>2]|0,0,b|0,e|0)|0;c=f;c=Vm(d|0,O|0,k[c>>2]|0,k[c+4>>2]|0)|0;d=O;m=a+78256|0;k[m>>2]=c;k[m+4>>2]=d}k[a+36204>>2]=2}else{Re(h,7)|0;ei(a+42712|0);Ze(h,b,4)|0;c=Ue(h)|0;m=Te(h)|0;e=g;b=k[e>>2]|0;e=k[e+4>>2]|0;c=Vm(b|0,e|0,c&65535|0,0)|0;d=O;l=a+78256|0;k[l>>2]=c;k[l+4>>2]=d;k[a+36204>>2]=1;m=m&255;i[a+78269>>0]=m&1;i[a+78268>>0]=m>>>3&1;i[a+78271>>0]=m>>>2&1;i[a+42740>>0]=m>>>1&1;i[a+42741>>0]=m>>>4&1}if((d|0)>(e|0)|(d|0)==(e|0)&c>>>0>b>>>0)c=k[h+20>>2]|0;else c=0;b=k[h>>2]|0;if(!b){r=j;return c|0}ym(b);r=j;return c|0}function ce(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,P=0,Q=0,R=0,S=0;S=r;r=r+10512|0;Q=S;G=S+184|0;R=S+152|0;b=S+10504|0;y=S+2312|0;w=S+76|0;x=S+264|0;I=S+96|0;H=S+112|0;Qe(R,a);d=a+78276|0;do if((i[d>>0]|0)!=0?(e=a+78248|0,K=e,M=k[K>>2]|0,K=k[K+4>>2]|0,N=Vm(k[a+78280>>2]|0,0,7,0)|0,L=O,(K|0)>(L|0)|(K|0)==(L|0)&M>>>0>N>>>0):0){if(!(ge(a)|0)){i[a+78285>>0]=1;c=0;break}if((kc[k[(k[a>>2]|0)+12>>2]&31](a,b,8)|0)==8){P=a+8220|0;Ke(P,0,4,(k[a+36172>>2]|0)+40996|0,b,0,0,0,0)|0;k[R+28>>2]=P;P=1;D=10;break}b=ud(a)|0;c=O;N=e;if(((k[N>>2]|0)==(b|0)?(k[N+4>>2]|0)==(c|0):0)?(N=a+78256|0,(k[N>>2]|0)==(b|0)?(k[N+4>>2]|0)==(c|0):0):0){c=0;break}k[Q+68>>2]=0;k[Q+72>>2]=55;k[Q+64>>2]=1;k[Q>>2]=a+24;Kf(32944,1);c=0}else{P=0;D=10}while(0);a:do if((D|0)==10){Re(R,7)|0;N=R+20|0;if(!(k[N>>2]|0)){b=ud(a)|0;c=O;N=a+78248|0;if(((k[N>>2]|0)==(b|0)?(k[N+4>>2]|0)==(c|0):0)?(N=a+78256|0,(k[N>>2]|0)==(b|0)?(k[N+4>>2]|0)==(c|0):0):0){c=0;break}k[Q+68>>2]=0;k[Q+72>>2]=55;k[Q+64>>2]=1;k[Q>>2]=a+24;Kf(32944,1);c=0;break}M=(Ue(R)|0)&65535;J=a+42680|0;k[J>>2]=M;M=a+42696|0;i[M>>0]=0;b=(Te(R)|0)&255;e=(Ue(R)|0)&65535;c=a+42688|0;k[c>>2]=e;i[M>>0]=e>>>14&1;M=Ue(R)|0;e=M&65535;n=a+42692|0;k[n>>2]=e;K=a+42684|0;k[K>>2]=b;if((M&65535)<7){k[Q+68>>2]=0;k[Q+72>>2]=24;k[Q+64>>2]=1;k[Q>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);c=0;break}do if((b|0)==122){k[K>>2]=3;b=3;D=21}else if((b|0)==123){k[K>>2]=5;b=5;D=21}else if((b|0)==116){k[K>>2]=2;b=2;D=21}else if((b|0)==115){k[K>>2]=1;k[a+36204>>2]=1;D=24}else{k[a+36204>>2]=b;if((b|0)==1){D=24;break}else if((b|0)!=117){D=26;break}Re(R,6)|0}while(0);if((D|0)==21){k[a+36204>>2]=b;D=26}else if((D|0)==24)if(!(k[c>>2]&2))D=26;else Re(R,6)|0;if((D|0)==26)Re(R,e+-7|0)|0;M=a+78248|0;F=M;L=k[F>>2]|0;F=k[F+4>>2]|0;F=Vm(Wd(a,k[n>>2]|0)|0,0,L|0,F|0)|0;L=a+78256|0;b=L;k[b>>2]=F;k[b+4>>2]=O;b=k[K>>2]|0;b:do switch(b|0){case 1:{H=a+42712|0;ei(H);k[H+0>>2]=k[J+0>>2];k[H+4>>2]=k[J+4>>2];k[H+8>>2]=k[J+8>>2];k[H+12>>2]=k[J+12>>2];k[H+16>>2]=k[J+16>>2];H=Ue(R)|0;b=a+42732|0;j[b>>1]=H;H=Ve(R)|0;k[a+42736>>2]=H;c=k[a+42720>>2]|0;i[a+78269>>0]=c&1;i[a+78268>>0]=c>>>3&1;i[a+78271>>0]=c>>>2&1;i[a+78275>>0]=c>>>6&1;i[d>>0]=c>>>7&1;if(!H)b=(j[b>>1]|0)!=0&1;else b=1;i[a+78272>>0]=b;i[a+42740>>0]=c>>>1&1;i[a+78273>>0]=c>>>8&1;i[a+78274>>0]=c>>>4&1;break}case 3:case 2:{s=(b|0)==2;F=s?a+42832|0:a+60048|0;di(F,0);k[F+0>>2]=k[J+0>>2];k[F+4>>2]=k[J+4>>2];k[F+8>>2]=k[J+8>>2];k[F+12>>2]=k[J+12>>2];k[F+16>>2]=k[J+16>>2];C=F+8|0;n=k[C>>2]|0;i[F+8328>>0]=n&1;i[F+8329>>0]=n>>>1&1;c=F+8331|0;i[c>>0]=n>>>2&1;i[F+8336>>0]=n>>>10&1;if(s){i[F+8416>>0]=n>>>4&1;b=0}else{i[F+8416>>0]=0;b=n>>>4&1}i[F+8426>>0]=b;E=(n&224|0)==224;v=F+8417|0;i[v>>0]=E&1;if(E)b=0;else b=65536<<(n>>>5&7);k[F+8420>>2]=b;E=F+8418|0;i[E>>0]=n>>>3&1;i[F+8419>>0]=n>>>11&1;f=Ve(R)|0;g=F+20|0;k[g>>2]=f;f=Ve(R)|0;z=Te(R)|0;e=F+24|0;i[e>>0]=z;k[F+8288>>2]=2;z=Ve(R)|0;k[F+8292>>2]=z;z=Ve(R)|0;h=Te(R)|0;t=F+25|0;i[t>>0]=h;h=((Te(R)|0)&255)+208&255;i[F+26>>0]=h;h=(Ue(R)|0)&65535;d=Ve(R)|0;u=F+28|0;k[u>>2]=d;n=F+8332|0;k[n>>2]=0;do if(i[c>>0]|0){b=l[t>>0]|0;if((b|0)==26|(b|0)==20){k[n>>2]=3;break}else if((b|0)==13){k[n>>2]=1;break}else if((b|0)==15){k[n>>2]=2;break}else{k[n>>2]=4;break}}while(0);o=F+8428|0;k[o>>2]=2;b=i[e>>0]|0;if(!(b<<24>>24==5|b<<24>>24==3))if((b&255)<6){q=0;D=45}else k[F+8432>>2]=0;else{q=1;D=45}if((D|0)==45?(k[o>>2]=q,p=F+8432|0,k[p>>2]=0,b<<24>>24==3&(d&61440|0)==40960):0){k[p>>2]=1;k[F+8436>>2]=0}if(s)b=0;else b=d>>>31&255;i[F+8424>>0]=b;q=(k[C>>2]|0)>>>8&1;i[F+8425>>0]=q;if(!q){n=(f|0)==-1&1;i[F+8330>>0]=n;d=0;b=0;c=0;e=0}else{b=Ve(R)|0;e=Ve(R)|0;if((f|0)==-1)n=(e|0)==-1&1;else n=0;i[F+8330>>0]=n;d=0;c=0}p=F+8264|0;q=p;k[q>>2]=k[g>>2]|d;k[q+4>>2]=b;g=n<<24>>24==0;q=F+8272|0;k[q>>2]=g?c|f:2147483647;k[q+4>>2]=g?e:2147483647;q=h>>>0<8191?h:8191;Ze(R,y,q)|0;i[y+q>>0]=0;c:do if(!s){f=F+32|0;ne(y,f,2048)|0;c=(k[F+12>>2]|0)-h+-40+((k[C>>2]|0)>>>7&8^8)|0;if((c|0)>0){d=F+8224|0;g=F+8232|0;b=k[g>>2]|0;e=F+8228|0;k[e>>2]=c;if(b>>>0<c>>>0){n=k[F+8236>>2]|0;if((n|0)!=0&c>>>0>n>>>0){k[Q>>2]=n;Jf(32944,53104,Q);Af(32944);n=k[g>>2]|0;b=k[e>>2]|0}else{n=b;b=c}e=n+32+(n>>>2)|0;b=b>>>0>e>>>0?b:e;e=zm(k[d>>2]|0,b)|0;if(!e)Af(32944);k[d>>2]=e;k[g>>2]=b}Ze(R,k[d>>2]|0,c)|0;if((hk(f,33096)|0)==0?(D=k[d>>2]|0,y=a+36176|0,D=$m(l[D+9>>0]<<8|l[D+8>>0]|l[D+10>>0]<<16|l[D+11>>0]<<24|0,0,9)|0,B=y,k[B>>2]=D,k[B+4>>2]=O,B=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0,D=O,x=y,x=hd(k[x>>2]|0,k[x+4>>2]|0,B,D)|0,A=a+36184|0,k[A>>2]=x,y,x=k[y>>2]|0,y=k[y+4>>2]|0,w=gn(B|0,D|0,200,0)|0,y=Vm(w|0,O|0,x|0,y|0)|0,D=hd(y,O,B,D)|0,B=k[A>>2]|0,(D|0)>(B|0)):0)k[A>>2]=B+1}if(!(hk(f,33112)|0))i[a+78270>>0]=1}else{if(!(k[C>>2]&512))k[F+32>>2]=0;else{af(w);B=(Zm(y|0)|0)+1|0;bf(w,y,y+B|0,h-B|0,F+32|0,2048)}Hc(y,x,2048);d=F+32|0;Xc(x,d,d,2048)|0;e=a+36172|0;b=k[(k[e>>2]|0)+49804>>2]|0;if((b|0)==1){ue(d)|0;b=k[(k[e>>2]|0)+49804>>2]|0}if((b|0)==2)te(d)|0;b=k[a+78264>>2]|0;if(((b|0)==2?(l[t>>0]|0)<20:0)?(k[u>>2]&16|0)!=0:0)i[v>>0]=1;c=k[o>>2]|0;do if((c|0)==2)if(!(i[v>>0]|0)){k[u>>2]=32;c=2;break}else{k[u>>2]=16;c=2;break}while(0);while(1){e=k[d>>2]|0;do if((e|0)==92){if((b|0)!=3){D=74;break}if(c){e=c;b=3;break}k[d>>2]=95;e=0;b=3}else if(!e)break c;else if((e|0)==47)D=74;else e=c;while(0);if((D|0)==74){D=0;k[d>>2]=47;e=c}c=e;d=d+4|0}}while(0);if(k[C>>2]&1024)Ze(R,F+8337|0,8)|0;lf(F+8240|0,z);d:do if(k[C>>2]&4096){f=Ue(R)|0;n=a+51072|0;k[I>>2]=n;k[I+4>>2]=a+51080;k[I+8>>2]=a+51088;k[I+12>>2]=0;f=f&65535;g=H+24|0;h=H+20|0;b=0;while(1){e=f>>>(3-b<<2);if(!((e&8|0)==0|(n|0)==0)){if(b)lf(n,Ve(R)|0);gf(n,H);if(e&4)k[h>>2]=(k[h>>2]|0)+1;k[g>>2]=0;e=e&3;if(e){c=e^3;d=0;do{D=((Te(R)|0)&255)<<(c+d<<3);k[g>>2]=k[g>>2]|D;d=d+1|0}while((d|0)<(e|0))}hf(n,H)}b=b+1|0;if((b|0)>=4)break d;n=k[I+(b<<2)>>2]|0}}while(0);D=p;H=L;D=Vm(k[H>>2]|0,k[H+4>>2]|0,k[D>>2]|0,k[D+4>>2]|0)|0;H=L;k[H>>2]=D;k[H+4>>2]=O;H=_e(R,(i[E>>0]|0)!=0)|0;if((k[F>>2]|0)!=(H&65535|0)?(i[a+78284>>0]=1,Kf(32944,1),!P):0){k[G+68>>2]=0;k[G+72>>2]=26;k[G>>2]=a+24;k[G+64>>2]=2;k[G+4>>2]=F+32}break}case 121:{H=a+77296|0;k[H+0>>2]=k[J+0>>2];k[H+4>>2]=k[J+4>>2];k[H+8>>2]=k[J+8>>2];k[H+12>>2]=k[J+12>>2];k[H+16>>2]=k[J+16>>2];H=Ve(R)|0;k[a+77316>>2]=H;H=Ue(R)|0;j[a+77320>>1]=H;H=Ue(R)|0;j[a+77322>>1]=H;break}case 119:{b=a+60016|0;k[b+0>>2]=k[J+0>>2];k[b+4>>2]=k[J+4>>2];k[b+8>>2]=k[J+8>>2];k[b+12>>2]=k[J+12>>2];k[b+16>>2]=k[J+16>>2];H=Ve(R)|0;k[a+60036>>2]=H;G=L;H=Vm(k[G>>2]|0,k[G+4>>2]|0,H|0,0)|0;G=L;k[G>>2]=H;k[G+4>>2]=O;G=Ue(R)|0;H=a+60040|0;j[H>>1]=G;G=Te(R)|0;i[a+60042>>0]=G;switch(m[H>>1]|0){case 257:{c=a+77324|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[c+12>>2]=k[b+12>>2];k[c+16>>2]=k[b+16>>2];k[c+20>>2]=k[b+20>>2];j[c+24>>1]=j[b+24>>1]|0;i[c+26>>0]=i[b+26>>0]|0;c=Ue(R)|0;e=a+77352|0;j[e>>1]=c;c=Ue(R)|0;d=a+77354|0;j[d>>1]=c;b=j[e>>1]|0;if((b&65535)>255){j[e>>1]=255;b=255}if((c&65535)>255)j[d>>1]=255;Ze(R,a+77356|0,b&65535)|0;Ze(R,a+77612|0,m[d>>1]|0)|0;i[a+(m[e>>1]|0)+77356>>0]=0;i[a+(m[d>>1]|0)+77612>>0]=0;break b}case 258:{H=a+77868|0;k[H+0>>2]=k[b+0>>2];k[H+4>>2]=k[b+4>>2];k[H+8>>2]=k[b+8>>2];k[H+12>>2]=k[b+12>>2];k[H+16>>2]=k[b+16>>2];k[H+20>>2]=k[b+20>>2];j[H+24>>1]=j[b+24>>1]|0;i[H+26>>0]=i[b+26>>0]|0;H=Ve(R)|0;k[a+77896>>2]=H;H=Ve(R)|0;k[a+77900>>2]=H;break b}case 260:case 259:case 256:{H=a+77904|0;k[H+0>>2]=k[b+0>>2];k[H+4>>2]=k[b+4>>2];k[H+8>>2]=k[b+8>>2];k[H+12>>2]=k[b+12>>2];k[H+16>>2]=k[b+16>>2];k[H+20>>2]=k[b+20>>2];j[H+24>>1]=j[b+24>>1]|0;i[H+26>>0]=i[b+26>>0]|0;H=Ve(R)|0;k[a+77932>>2]=H;H=Te(R)|0;i[a+77936>>0]=H;H=Te(R)|0;i[a+77937>>0]=H;H=Ve(R)|0;k[a+77940>>2]=H;break b}case 261:{G=a+77944|0;k[G+0>>2]=k[b+0>>2];k[G+4>>2]=k[b+4>>2];k[G+8>>2]=k[b+8>>2];k[G+12>>2]=k[b+12>>2];k[G+16>>2]=k[b+16>>2];k[G+20>>2]=k[b+20>>2];j[G+24>>1]=j[b+24>>1]|0;i[G+26>>0]=i[b+26>>0]|0;G=Ve(R)|0;k[a+77972>>2]=G;G=Te(R)|0;i[a+77976>>0]=G;G=Te(R)|0;i[a+77977>>0]=G;G=Ve(R)|0;k[a+77980>>2]=G;G=Ue(R)|0;H=a+77984|0;G=(G&65535)>259?259:G;j[H>>1]=G;Ze(R,a+77986|0,G&65535)|0;i[a+(m[H>>1]|0)+77986>>0]=0;break b}default:break b}}case 118:{H=a+77268|0;k[H+0>>2]=k[J+0>>2];k[H+4>>2]=k[J+4>>2];k[H+8>>2]=k[J+8>>2];k[H+12>>2]=k[J+12>>2];k[H+16>>2]=k[J+16>>2];H=Te(R)|0;i[a+77288>>0]=H;H=Te(R)|0;i[a+77289>>0]=H;H=Te(R)|0;i[a+77290>>0]=H;H=Ve(R)|0;k[a+77292>>2]=H;break}case 117:{H=a+77200|0;k[H+0>>2]=k[J+0>>2];k[H+4>>2]=k[J+4>>2];k[H+8>>2]=k[J+8>>2];k[H+12>>2]=k[J+12>>2];k[H+16>>2]=k[J+16>>2];H=Ue(R)|0;j[a+77220>>1]=H;H=Te(R)|0;i[a+77222>>0]=H;H=Te(R)|0;i[a+77223>>0]=H;H=Ue(R)|0;j[a+77224>>1]=H;break}case 5:{b=a+59984|0;k[b+0>>2]=k[J+0>>2];k[b+4>>2]=k[J+4>>2];k[b+8>>2]=k[J+8>>2];k[b+12>>2]=k[J+12>>2];k[b+16>>2]=k[J+16>>2];b=k[a+59992>>2]|0;i[a+60012>>0]=b&1;H=b>>>1&1;i[a+60013>>0]=H;i[a+60014>>0]=b>>>2&1;c=a+60015|0;b=b>>>3&1;i[c>>0]=b;if(H<<24>>24){b=Ve(R)|0;k[a+60004>>2]=b;b=i[c>>0]|0}if(b<<24>>24){H=(Ue(R)|0)&65535;k[a+60008>>2]=H;k[a+78304>>2]=H}break}case 120:{H=a+77228|0;k[H+0>>2]=k[J+0>>2];k[H+4>>2]=k[J+4>>2];k[H+8>>2]=k[J+8>>2];k[H+12>>2]=k[J+12>>2];k[H+16>>2]=k[J+16>>2];H=Ve(R)|0;F=a+77248|0;k[F>>2]=H;H=Te(R)|0;i[a+77252>>0]=H;H=Ue(R)|0;G=a+77254|0;j[G>>1]=H;H=Ve(R)|0;k[a+77256>>2]=H;Ze(R,a+77260|0,8)|0;H=L;F=Vm(k[H>>2]|0,k[H+4>>2]|0,k[F>>2]|0,0)|0;H=L;k[H>>2]=F;k[H+4>>2]=O;H=a+36176|0;k[H>>2]=m[G>>1]<<9;k[H+4>>2]=0;break}default:if(k[c>>2]&32768){G=Ve(R)|0;H=L;G=Vm(k[H>>2]|0,k[H+4>>2]|0,G|0,0)|0;H=L;k[H>>2]=G;k[H+4>>2]=O}}while(0);H=_e(R,0)|0;do if((k[J>>2]|0)!=(H&65535|0)){b=k[K>>2]|0;if((b|0)==118|(b|0)==121)break;else if((b|0)==5?(i[a+60014>>0]|0)!=0:0){d=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;e=O;c=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;b=k[(k[a>>2]|0)+16>>2]|0;c=Vm(c|0,O|0,-7,-1)|0;sc[b&15](a,c,O,0);c=0;b=1;do{K=(xd(a)|0)<<24>>24==0;b=K?b:0;c=c+1|0}while((c|0)<7);sc[k[(k[a>>2]|0)+16>>2]&15](a,d,e,0);if(b&1)break}i[a+78284>>0]=1;Kf(32944,3);if(P){c=a+24|0;k[Q+68>>2]=0;k[Q+72>>2]=4;k[Q>>2]=c;k[Q+64>>2]=2;k[Q+4>>2]=c;i[a+78285>>0]=1;c=0;break a}}while(0);J=k[L+4>>2]|0;K=k[M+4>>2]|0;if((J|0)>(K|0)|((J|0)==(K|0)?(k[L>>2]|0)>>>0>(k[M>>2]|0)>>>0:0)){c=k[N>>2]|0;break}else{k[Q+68>>2]=0;k[Q+72>>2]=24;k[Q+64>>2]=1;k[Q>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);c=0;break}}while(0);b=k[R>>2]|0;if(!b){r=S;return c|0}ym(b);r=S;return c|0}function de(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;D=r;r=r+8480|0;B=D;z=D+144|0;C=D+112|0;c=D+8464|0;d=D+224|0;o=D+232|0;n=D+240|0;u=D+272|0;Qe(C,a);h=a+78276|0;do if((i[h>>0]|0)!=0?(e=a+78248|0,v=e,x=k[v>>2]|0,v=k[v+4>>2]|0,y=Vm(k[a+78280>>2]|0,0,8,0)|0,w=O,(v|0)>(w|0)|(v|0)==(w|0)&x>>>0>y>>>0):0){if(!(ge(a)|0)){i[a+78285>>0]=1;c=0;break}if((kc[k[(k[a>>2]|0)+12>>2]&31](a,c,16)|0)!=16){b=ud(a)|0;c=O;z=e;if(((k[z>>2]|0)==(b|0)?(k[z+4>>2]|0)==(c|0):0)?(z=a+78256|0,(k[z>>2]|0)==(b|0)?(k[z+4>>2]|0)==(c|0):0):0){c=0;break}k[B+68>>2]=0;k[B+72>>2]=55;k[B+64>>2]=1;k[B>>2]=a+24;Kf(32944,1);c=0;break}b=a+8220|0;Ke(b,0,5,(k[a+36172>>2]|0)+40996|0,a+42804|0,c,k[a+42800>>2]|0,0,d)|0;if((i[a+42796>>0]|0)!=0?(Mm(d,a+42820|0,8)|0)!=0:0){k[B+68>>2]=0;k[B+72>>2]=6;k[B+64>>2]=1;k[B>>2]=a+24;i[a+78285>>0]=1;Kf(32944,11);c=0;break}k[C+28>>2]=b;f=1;A=13}else{f=0;A=13}while(0);a:do if((A|0)==13){if((Re(C,7)|0)>>>0<7){b=ud(a)|0;c=O;A=a+78248|0;if(((k[A>>2]|0)==(b|0)?(k[A+4>>2]|0)==(c|0):0)?(A=a+78256|0,(k[A>>2]|0)==(b|0)?(k[A+4>>2]|0)==(c|0):0):0){c=0;break}k[B+68>>2]=0;k[B+72>>2]=55;k[B+64>>2]=1;k[B>>2]=a+24;Kf(32944,1);c=0;break}m=a+42680|0;d=a+42696|0;i[d>>0]=0;b=Ve(C)|0;k[m>>2]=b;b=Ye(C,4)|0;e=Xe(C)|0;if((e|0)==0&(O|0)==0|(b|0)==0){k[B+68>>2]=0;k[B+72>>2]=24;k[B+64>>2]=1;k[B>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);c=0;break}c=b+-3+e|0;e=b+4+e|0;if((c|0)<0|e>>>0<7){k[B+68>>2]=0;k[B+72>>2]=24;k[B+64>>2]=1;k[B>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);c=0;break}Re(C,c)|0;y=C+20|0;if((k[y>>2]|0)>>>0<e>>>0){b=ud(a)|0;c=O;A=a+78248|0;if(((k[A>>2]|0)==(b|0)?(k[A+4>>2]|0)==(c|0):0)?(A=a+78256|0,(k[A>>2]|0)==(b|0)?(k[A+4>>2]|0)==(c|0):0):0){c=0;break}k[B+68>>2]=0;k[B+72>>2]=55;k[B+64>>2]=1;k[B>>2]=a+24;Kf(32944,1);c=0;break}w=$e(C)|0;b=Xe(C)|0;g=a+42684|0;k[g>>2]=b;b=Xe(C)|0;q=a+42688|0;k[q>>2]=b;i[d>>0]=b>>>2&1;d=a+42692|0;k[d>>2]=e;j=a+36204|0;k[j>>2]=k[g>>2];w=(k[m>>2]|0)!=(w|0);do if(w){b=a+24|0;k[B+68>>2]=0;k[B+72>>2]=24;k[B+64>>2]=1;k[B>>2]=b;x=a+78284|0;i[x>>0]=1;Kf(32944,3);i[x>>0]=1;Kf(32944,3);if(f){k[B+68>>2]=0;k[B+72>>2]=4;k[B>>2]=b;k[B+64>>2]=2;k[B+4>>2]=b;i[a+78285>>0]=1;c=0;break a}else{b=k[q>>2]|0;break}}while(0);do if(b&1){e=Xe(C)|0;c=O;if(c>>>0<0|((c|0)==0?e>>>0<(k[d>>2]|0)>>>0:0)){b=k[q>>2]|0;t=e;s=c;break}else{k[B+68>>2]=0;k[B+72>>2]=24;k[B+64>>2]=1;k[B>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);c=0;break a}}else{t=0;s=0}while(0);if(!(b&2)){e=0;c=0}else{e=Xe(C)|0;c=O}x=a+78248|0;v=x;b=k[v>>2]|0;v=k[v+4>>2]|0;f=Wd(a,k[d>>2]|0)|0;v=Vm(b|0,v|0,e|0,c|0)|0;f=Vm(v|0,O|0,f|0,0)|0;v=a+78256|0;b=v;k[b>>2]=f;k[b+4>>2]=O;b=k[g>>2]|0;switch(b|0){case 4:{A=a+42776|0;k[A+0>>2]=k[m+0>>2];k[A+4>>2]=k[m+4>>2];k[A+8>>2]=k[m+8>>2];k[A+12>>2]=k[m+12>>2];k[A+16>>2]=k[m+16>>2];if(Xe(C)|0){c=a+24|0;k[B+68>>2]=0;k[B+72>>2]=32;k[B>>2]=c;k[B+64>>2]=2;k[B+4>>2]=c;Kf(32944,1);c=0;break a}A=Xe(C)|0;b=a+42796|0;i[b>>0]=A&1;A=Te(C)|0;k[a+42800>>2]=A&255;if((A&255)>24){c=a+24|0;k[B+68>>2]=0;k[B+72>>2]=32;k[B>>2]=c;k[B+64>>2]=2;k[B+4>>2]=c;Kf(32944,1);c=0;break a}Ze(C,a+42804|0,16)|0;if(i[b>>0]|0){A=a+42820|0;Ze(C,A,8)|0;Ze(C,o,4)|0;rg(B);sg(B,A,8);tg(B,n);A=(Mm(o,n,4)|0)==0&1;i[b>>0]=A}i[h>>0]=1;break}case 3:case 2:{n=(b|0)==2?a+42832|0:a+60048|0;di(n,0);k[n+0>>2]=k[m+0>>2];k[n+4>>2]=k[m+4>>2];k[n+8>>2]=k[m+8>>2];k[n+12>>2]=k[m+12>>2];k[n+16>>2]=k[m+16>>2];m=(k[g>>2]|0)==2;i[n+8425>>0]=1;d=n+8264|0;b=d;k[b>>2]=e;k[b+4>>2]=c;b=Xe(C)|0;f=n+8324|0;k[f>>2]=b;b=Xe(C)|0;e=O;c=n+8272|0;p=c;k[p>>2]=b;k[p+4>>2]=e;p=(k[f>>2]|0)>>>3&1;i[n+8330>>0]=p;if(p){e=c;k[e>>2]=2147483647;k[e+4>>2]=2147483647;e=2147483647;b=2147483647}p=d;h=k[p>>2]|0;p=k[p+4>>2]|0;o=(p|0)>(e|0)|(p|0)==(e|0)&h>>>0>b>>>0;j=n+8280|0;k[j>>2]=o?h:b;k[j+4>>2]=o?p:e;b=Xe(C)|0;j=n+28|0;k[j>>2]=b;b=k[f>>2]|0;if(b&2){ef(n+8240|0,Ve(C)|0)|0;b=k[f>>2]|0}e=n+8288|0;k[e>>2]=0;if(b&4){k[e>>2]=2;p=Ve(C)|0;k[n+8292>>2]=p}k[n+8432>>2]=0;e=Xe(C)|0;i[n+26>>0]=e>>>7&7;g=n+25|0;i[g>>0]=e&63;c=Xe(C)|0;b=n+24|0;i[b>>0]=c;c=Xe(C)|0;i[n+8424>>0]=(k[q>>2]|0)>>>6&1;d=n+8428|0;k[d>>2]=2;b=i[b>>0]|0;if(b<<24>>24==1)k[d>>2]=1;else if(!(b<<24>>24))k[d>>2]=0;q=k[n+8>>2]|0;i[n+8328>>0]=q>>>3&1;i[n+8329>>0]=q>>>4&1;i[n+8426>>0]=q>>>5&1;if(m)b=e>>>6&1;else b=0;i[n+8416>>0]=b;q=k[f>>2]&1;f=n+8417|0;i[f>>0]=q;if(!q)b=131072<<(e>>>10&15);else b=0;k[n+8420>>2]=b;k[n+8332>>2]=(i[n+8331>>0]|0)!=0?5:0;h=c>>>0<8191?c:8191;Ze(C,u,h)|0;i[u+h>>0]=0;h=n+32|0;re(u,h,2048)|0;if(!((t|0)==0&(s|0)==0))he(a,C,t,n);b:do if(!m){if(!(hk(h,33112)|0))i[a+78270>>0]=1}else{e=a+36172|0;b=k[(k[e>>2]|0)+49804>>2]|0;if((b|0)==1){ue(h)|0;b=k[(k[e>>2]|0)+49804>>2]|0}if((b|0)==2)te(h)|0;b=k[a+78264>>2]|0;do if((b|0)==2){if((l[g>>0]|0)>=20)break;if(!(k[j>>2]&16))break;i[f>>0]=1}while(0);d=k[d>>2]|0;do if((d|0)==2)if(!(i[f>>0]|0)){k[j>>2]=32;d=2;e=h;break}else{k[j>>2]=16;d=2;e=h;break}else e=h;while(0);while(1){c=k[e>>2]|0;do if((c|0)==92){if((b|0)!=3){A=86;break}if(d){b=3;break}k[e>>2]=95;d=0;b=3}else if((c|0)==47)A=86;else if(!c)break b;while(0);if((A|0)==86){A=0;k[e>>2]=47}e=e+4|0}}while(0);if(w){k[z+68>>2]=0;k[z+72>>2]=26;k[z>>2]=a+24;k[z+64>>2]=2;k[z+4>>2]=h}break}case 1:{e=a+42712|0;ei(e);k[e+0>>2]=k[m+0>>2];k[e+4>>2]=k[m+4>>2];k[e+8>>2]=k[m+8>>2];k[e+12>>2]=k[m+12>>2];k[e+16>>2]=k[m+16>>2];A=Xe(C)|0;b=a+78269|0;c=A&1;i[b>>0]=c;i[a+78268>>0]=A>>>2&1;i[a+78271>>0]=A>>>4&1;i[a+78275>>0]=A>>>3&1;i[a+78272>>0]=0;i[a+78274>>0]=1;if(!(A&2)){k[a+78304>>2]=0;b=0}else{A=Xe(C)|0;k[a+78304>>2]=A;c=i[b>>0]|0;b=A}if(!(c<<24>>24))b=0;else b=(b|0)==0&1;i[a+78273>>0]=b;if(!((t|0)==0&(s|0)==0))he(a,C,t,e);if(((i[a+42742>>0]|0)!=0?(p=a+42744|0,A=p,!((k[A>>2]|0)==0&(k[A+4>>2]|0)==0)):0)?(k[(k[a+36172>>2]|0)+16400>>2]|0)!=0:0){t=x;s=k[t>>2]|0;t=k[t+4>>2]|0;w=v;u=k[w>>2]|0;w=k[w+4>>2]|0;A=k[j>>2]|0;q=a+36216|0;Mi(q,a,0);z=p;Oi(q,k[z>>2]|0,k[z+4>>2]|0);z=x;k[z>>2]=s;k[z+4>>2]=t;z=v;k[z>>2]=u;k[z+4>>2]=w;k[j>>2]=A}break}case 5:{A=a+59984|0;k[A+0>>2]=k[m+0>>2];k[A+4>>2]=k[m+4>>2];k[A+8>>2]=k[m+8>>2];k[A+12>>2]=k[m+12>>2];k[A+16>>2]=k[m+16>>2];A=Xe(C)|0;i[a+60012>>0]=A&1;i[a+60015>>0]=0;i[a+60013>>0]=0;i[a+60014>>0]=0;break}default:{}}z=v;w=k[z+4>>2]|0;A=x;x=k[A+4>>2]|0;if((w|0)>(x|0)|((w|0)==(x|0)?(k[z>>2]|0)>>>0>(k[A>>2]|0)>>>0:0)){c=k[y>>2]|0;break}else{k[B+68>>2]=0;k[B+72>>2]=24;k[B+64>>2]=1;k[B>>2]=a+24;i[a+78284>>0]=1;Kf(32944,3);c=0;break}}while(0);b=k[C>>2]|0;if(!b){r=D;return c|0}ym(b);r=D;return c|0}function ee(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;e=a+36204|0;c=ae(a)|0;if(!c){a=0;return a|0}if((b|0)==5){d=1;while(1){if(!(d&127))xe();if((k[e>>2]|0)==5){d=12;break}Vd(a);c=ae(a)|0;if(!c){c=0;d=12;break}else d=d+1|0}if((d|0)==12)return c|0}else{f=c;g=1}while(1){if((k[e>>2]|0)==5){c=0;d=12;break}if(!(g&127))xe();if((k[e>>2]|0)==(b|0)){c=f;d=12;break}Vd(a);f=ae(a)|0;if(!f){c=0;d=12;break}else g=g+1|0}if((d|0)==12)return c|0;return 0}function fe(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;e=a+60080|0;c=ae(a)|0;if(!c){a=0;return a|0}f=a+36204|0;while(1){d=k[f>>2]|0;if((d|0)==3){if(!(hk(e,b)|0)){d=6;break}}else if((d|0)==5){c=0;d=6;break}Vd(a);c=ae(a)|0;if(!c){c=0;d=6;break}}if((d|0)==6)return c|0;return 0}function ge(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0;g=r;r=r+640|0;e=g;d=g+512|0;b=a+36172|0;a=k[b>>2]|0;if(i[a+41508>>0]|0){f=1;r=g;return f|0}c=k[a+75184>>2]|0;if(c){k[e>>2]=0;if((pc[c&15](4,k[a+75180>>2]|0,e,128)|0)!=-1){if(!(k[e>>2]|0))f=6}else{k[e>>2]=0;f=6}if((f|0)==6){i[d>>0]=0;f=k[b>>2]|0;if((pc[k[f+75184>>2]&15](2,k[f+75180>>2]|0,d,128)|0)==-1)i[d>>0]=0;Xc(d,0,e,128)|0;_f(d,128)}Yf((k[b>>2]|0)+40996|0,e);_f(e,512);a=k[b>>2]|0;if(i[a+41508>>0]|0){i[a+41513>>0]=1;f=1;r=g;return f|0}}k[a+75176>>2]=22;f=0;r=g;return f|0}function he(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0;ma=r;r=r+8320|0;la=ma;ka=ma+8304|0;ia=ma+8272|0;ja=ma+8192|0;ca=b+20|0;e=(k[ca>>2]|0)-c|0;fa=b+24|0;if(e>>>0<(k[fa>>2]|0)>>>0){r=ma;return}k[fa>>2]=e;if(c>>>0<=1){r=ma;return}$=d+4|0;aa=d+30|0;ba=a+78248|0;A=d+48|0;B=d+32|0;C=d+8369|0;D=d+8378|0;E=d+8412|0;F=a+24|0;G=la+64|0;H=la+68|0;I=la+72|0;J=la+4|0;K=d+8337|0;L=d+8353|0;M=d+8336|0;N=d+8332|0;P=d+8331|0;Q=d+8370|0;R=la+64|0;S=la+68|0;T=la+72|0;U=la+4|0;V=d+8288|0;W=V+4|0;X=d+8256|0;Y=d+8248|0;Z=d+8240|0;_=d+8419|0;o=a+42864|0;p=d+8432|0;q=d+16628|0;s=d+8436|0;t=d+16630|0;u=d+16631|0;v=d+16888|0;w=d+16632|0;x=d+16629|0;y=d+17148|0;z=d+17144|0;j=d+8224|0;l=j+8|0;m=j+4|0;n=j+12|0;while(1){e=Xe(b)|0;d=O;if((e|0)==0&(d|0)==0){e=67;break}h=k[ca>>2]|0;c=k[fa>>2]|0;if((h|0)==(c|0)|((d|0)>0|(d|0)==0&e>>>0>(h-c|0)>>>0)){e=67;break}h=Vm(c|0,0,e|0,d|0)|0;e=Xe(b)|0;d=O;c=k[ca>>2]|0;a=k[fa>>2]|0;g=c-a|0;if((k[$>>2]|0)==1&((e|0)==1&(d|0)==0)){i[aa>>0]=1;f=Xe(b)|0;if((f&1|0)!=0?(ga=Xe(b)|0,ha=O,!((ga|0)==0&(ha|0)==0)):0){oa=ba;oa=Vm(k[oa>>2]|0,k[oa+4>>2]|0,ga|0,ha|0)|0;na=B;k[na>>2]=oa;k[na+4>>2]=O}if((f&2|0)!=0?(da=Xe(b)|0,ea=O,!((da|0)==0&(ea|0)==0)):0){oa=ba;oa=Vm(k[oa>>2]|0,k[oa+4>>2]|0,da|0,ea|0)|0;na=A;k[na>>2]=oa;k[na+4>>2]=O}}a:do if((k[$>>2]&-2|0)==2)switch(e|0){case 3:{if(d)break a;if(g>>>0<=8)break a;e=Xe(b)|0;do if(e&2)if((e&1|0)==0&0==0){na=We(b)|0;jf(Z,na,O);break}else{ef(Z,Ve(b)|0)|0;break}while(0);do if(e&4)if((e&1|0)==0&0==0){na=We(b)|0;jf(Y,na,O);break}else{ef(Y,Ve(b)|0)|0;break}while(0);if(!(e&8))break a;if((e&1|0)==0&0==0){na=We(b)|0;jf(X,na,O);break a}else{ef(X,Ve(b)|0)|0;break a}}case 6:{if(d)break a;e=Xe(b)|0;i[t>>0]=e>>>2&1;i[u>>0]=e>>>3&1;i[v>>0]=0;i[w>>0]=0;if(e&1){na=Xe(b)|0;na=na>>>0<255?na:255;Ze(b,w,na)|0;i[w+na>>0]=0}if(e&2){na=Xe(b)|0;na=na>>>0<255?na:255;Ze(b,v,na)|0;i[v+na>>0]=0}if(i[t>>0]|0){na=Xe(b)|0;k[z>>2]=na}if(i[u>>0]|0){na=Xe(b)|0;k[y>>2]=na}i[x>>0]=1;break a}case 7:{if(d)break a;e=k[l>>2]|0;k[m>>2]=g;if(e>>>0<g>>>0){d=k[n>>2]|0;if((d|0)!=0&g>>>0>d>>>0){k[la>>2]=d;Jf(32944,53104,la);Af(32944);e=k[l>>2]|0;d=k[m>>2]|0}else d=g;e=e+32+(e>>>2)|0;e=d>>>0>e>>>0?d:e;d=zm(k[j>>2]|0,e)|0;if(!d)Af(32944);k[j>>2]=d;k[l>>2]=e}Ze(b,k[j>>2]|0,g)|0;break a}case 4:{if(d)break a;if((c|0)==(a|0))break a;Xe(b)|0;e=Xe(b)|0;if(!e)break a;i[_>>0]=1;k[la>>2]=e;bk(ja,20,33128,la)|0;Mc(o,ja,2048)|0;break a}case 2:{if(d)break a;if(Xe(b)|0)break a;k[V>>2]=3;Ze(b,W,32)|0;break a}case 5:{if(d)break a;e=Xe(b)|0;k[p>>2]=e;e=Xe(b)|0;i[q>>0]=e&1;e=Xe(b)|0;i[la>>0]=0;if(e>>>0<8191){Ze(b,la,e)|0;i[la+e>>0]=0}re(la,s,2048)|0;break a}case 1:{if(d)break a;if(Xe(b)|0){k[S>>2]=0;k[T>>2]=32;k[la>>2]=F;k[R>>2]=2;k[U>>2]=B;Kf(32944,1);break a}na=Xe(b)|0;i[C>>0]=na&1;i[D>>0]=na>>>1&1;na=Te(b)|0;k[E>>2]=na&255;if((na&255)>24){k[H>>2]=0;k[I>>2]=32;k[la>>2]=F;k[G>>2]=2;k[J>>2]=B;Kf(32944,1)}Ze(b,K,16)|0;Ze(b,L,16)|0;if(i[C>>0]|0){Ze(b,Q,8)|0;Ze(b,ka,4)|0;rg(la);sg(la,Q,8);tg(la,ia);na=(Mm(ka,ia,4)|0)==0&1;i[C>>0]=na}i[M>>0]=1;k[N>>2]=5;i[P>>0]=1;break a}default:break a}while(0);k[fa>>2]=h;if(((k[ca>>2]|0)-h|0)>>>0<=1){e=67;break}}if((e|0)==67){r=ma;return}}function ie(a){a=a|0;return (i[a+51249>>0]|0)!=0|0}function je(a){a=a|0;var b=0,c=0;if((k[8286]|0)==-1){c=Pa(18)|0;k[8286]=c;Pa(c|0)|0}b=k[a+51260>>2]|0;if((b|0)==1)return;else if(!b){a=a+42860|0;c=k[a>>2]|0;if(c&16){k[a>>2]=k[8286]&511^511;return}b=~k[8286];if(!(c&1)){k[a>>2]=b&438;return}else{k[a>>2]=b&292;return}}else{b=~k[8286];if(!(i[a+51249>>0]|0)){k[a+42860>>2]=b&33206;return}else{k[a+42860>>2]=b&16895;return}}}function ke(a){a=a|0;var b=0,c=0,d=0;c=(k[a+42708>>2]|0)+(k[a+78280>>2]|0)|0;b=k[a+42724>>2]|0;if((k[a+78264>>2]|0)!=2){d=k[a+42788>>2]|0;b=(Wd(a,b)|0)+d|0}c=Vm(b|0,0,c|0,0)|0;return c|0}function le(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0;u=r;r=r+59200|0;s=u+59112|0;t=u;if(i[a+78284>>0]|0){k[s+68>>2]=0;k[s+72>>2]=27;k[s+64>>2]=1;k[s>>2]=a+24;Kf(32944,3);t=0;r=u;return t|0}n=a+60048|0;q=a+60074|0;if((l[q>>0]|0)<=5?(o=a+60073|0,(l[o>>0]|0)>>>0<=((k[a+78264>>2]|0)==3?0:29)>>>0):0){m=a+68312|0;p=m;if((k[p>>2]|0)==0&(k[p+4>>2]|0)==0?(i[a+68377>>0]|0)==0:0){t=1;r=u;return t|0}p=a+14576|0;of(p);Sh(t,p);Uh(t,k[a+68468>>2]|0,0);do if(!c){j=a+68320|0;h=j;d=k[h>>2]|0;h=k[h+4>>2]|0;if((h|0)>0|(h|0)==0&d>>>0>16777216){k[s+68>>2]=0;k[s+72>>2]=28;k[s+64>>2]=1;k[s>>2]=a+24;d=0;break}h=b+8|0;g=k[h>>2]|0;f=b+4|0;k[f>>2]=d;if(g>>>0<d>>>0){e=k[b+12>>2]|0;if((e|0)!=0&d>>>0>e>>>0){k[s>>2]=e;Jf(32944,53104,s);Af(32944);g=k[h>>2]|0;d=k[f>>2]|0}g=g+32+(g>>>2)|0;d=d>>>0>g>>>0?d:g;g=zm(k[b>>2]|0,d)|0;if(!g)Af(32944);k[b>>2]=g;k[h>>2]=d;d=k[j>>2]|0}vf(p,k[b>>2]|0,d);g=18}else g=18;while(0);do if((g|0)==18){if(i[a+68379>>0]|0){d=k[a+36172>>2]|0;if(!(i[d+41508>>0]|0)){d=0;break}tf(p,0,k[a+68380>>2]|0,d+40996|0,(i[a+68384>>0]|0)==0?0:a+68385|0,a+68401|0,k[a+68460>>2]|0,a+68418|0,a+68427|0)}f=a+33248|0;g=a+68336|0;Eg(f,k[g>>2]|0,1);d=k[m+4>>2]|0;e=a+14608|0;k[e>>2]=k[m>>2];k[e+4>>2]=d;i[a+14616>>0]=0;rf(p,a,c);i[a+27353>>0]=i[a+68377>>0]|0;k[a+14632>>2]=n;k[a+14636>>2]=0;e=a+68320|0;d=k[e>>2]|0;e=k[e+4>>2]|0;m=t+19520|0;k[m>>2]=d;k[m+4>>2]=e;i[t+19544>>0]=0;if(!(i[q>>0]|0))bh(p,d,e);else Vh(t,l[o>>0]|0,0);if(!(Ig(f,g,(i[a+68426>>0]|0)==0?0:a+68427|0)|0)){k[s+68>>2]=0;k[s+72>>2]=29;k[s>>2]=a+24;k[s+64>>2]=2;k[s+4>>2]=a+60080;Kf(32944,3);if(!b)d=0;else{d=k[b>>2]|0;if(d){ym(d);k[b>>2]=0}k[b+4>>2]=0;k[b+8>>2]=0;d=0}}else d=1}while(0);Th(t);t=d;r=u;return t|0}k[s+68>>2]=0;k[s+72>>2]=28;k[s+64>>2]=1;k[s>>2]=a+24;t=0;r=u;return t|0}function me(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0;l=r;r=r+32|0;j=l+8|0;e=l;d=l+16|0;i[b>>0]=0;a:do if(!(gk(a,65534)|0)){h=e;k[h>>2]=0;k[h+4>>2]=0;k[d>>2]=a;d=ak(b,d,c,e)|0;if(!d){d=(k[a>>2]|0)==0&1;break}else if((d|0)==-1){d=0;break}else{d=1;break}}else{h=c+-4|0;if(!h)d=1;else{d=1;e=0;f=0;b:while(1){while(1){g=k[a+(f<<2)>>2]|0;if(!g)break b;else if((g|0)!=65534)break;f=f+1|0}if((g&-128|0)==57472){i[b+e>>0]=g;e=e+1|0}else{n=j;k[n>>2]=0;k[n+4>>2]=0;n=b+e|0;m=(Fm(n,g,j)|0)==-1;g=j;k[g>>2]=0;k[g+4>>2]=0;g=Xj(n,4,j)|0;d=m?0:d;e=((g|0)>1?g:1)+e|0}if(e>>>0<h>>>0)f=f+1|0;else break a}i[b+e>>0]=0}}while(0);if(!c){n=d<<24>>24!=0;r=l;return n|0}i[b+(c+-1)>>0]=0;n=d<<24>>24!=0;r=l;return n|0}function ne(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;m=r;r=r+32|0;l=m+8|0;d=m;h=m+16|0;k[b>>2]=0;j=d;k[j>>2]=0;k[j+4>>2]=0;k[h>>2]=a;d=Zj(b,h,c,d)|0;if((d|0)==-1)e=3;else if((d|0)==0?(i[a>>0]|0)!=0:0)e=3;else d=1;a:do if((e|0)==3)if(c>>>0>1){g=0;j=0;e=0;b:while(1){d=g;h=e;while(1){f=a+h|0;if(!(i[f>>0]|0))break b;e=l;k[e>>2]=0;k[e+4>>2]=0;e=b+(d<<2)|0;if((Yj(e,f,4,l)|0)==-1){g=f;break}e=l;k[e>>2]=0;k[e+4>>2]=0;e=Xj(f,4,l)|0;d=d+1|0;if(d>>>0>=c>>>0){d=0;break a}else h=((e|0)>1?e:1)+h|0}f=i[g>>0]|0;if(f<<24>>24>=0){d=0;break a}if(!j){d=d+1|0;k[e>>2]=65534;if(d>>>0>=c>>>0){d=0;break a}f=i[g>>0]|0}g=d+1|0;k[b+(d<<2)>>2]=f&255|57344;if(g>>>0>=c>>>0){d=0;break a}else{j=1;e=h+1|0}}k[b+(d<<2)>>2]=0;d=1}else d=0;while(0);if(!c){c=d<<24>>24!=0;r=m;return c|0}k[b+(c+-1<<2)>>2]=0;c=d<<24>>24!=0;r=m;return c|0}function oe(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;if(!c)return b|0;else d=0;while(1){e=d<<1;i[b+e>>0]=k[a>>2];i[b+(e|1)>>0]=(k[a>>2]|0)>>>8;if(!(k[a>>2]|0)){a=4;break}d=d+1|0;if(d>>>0>=c>>>0){a=4;break}else a=a+4|0}if((a|0)==4)return b|0;return 0}function pe(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;if(!c)return b|0;else d=0;do{e=d<<1;e=(l[a+(e|1)>>0]|0)<<8|(l[a+e>>0]|0);k[b+(d<<2)>>2]=e;d=d+1|0}while((e|0)!=0&d>>>0<c>>>0);return b|0}function qe(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;d=k[a>>2]|0;if(!d){g=b;i[g>>0]=0;return}c=c+-1|0;a:while(1){while(1){e=c+-1|0;if((c|0)<=0){f=21;break a}f=a+4|0;if(d>>>0<128){a=f;c=e;f=6;break}if(d>>>0<2048){c=c+-2|0;if((c|0)>-1){a=f;f=10;break}}else c=e;if((d&-1024|0)==55296?(g=k[f>>2]|0,(g&-1024|0)==56320):0){a=a+8|0;d=(d<<10)+-56613888+g|0}else a=f;if(d>>>0<65536){c=c+-2|0;if((c|0)>-1){f=16;break}}if(d>>>0<2097152){c=c+-3|0;if((c|0)>-1){f=20;break}}d=k[a>>2]|0;if(!d){f=21;break a}}if((f|0)==6){i[b>>0]=d;b=b+1|0}else if((f|0)==10){i[b>>0]=d>>>6|192;i[b+1>>0]=d&63|128;b=b+2|0}else if((f|0)==16){i[b>>0]=d>>>12|224;i[b+1>>0]=d>>>6&63|128;i[b+2>>0]=d&63|128;b=b+3|0}else if((f|0)==20){i[b>>0]=d>>>18|240;i[b+1>>0]=d>>>12&63|128;i[b+2>>0]=d>>>6&63|128;i[b+3>>0]=d&63|128;b=b+4|0}d=k[a>>2]|0;if(!d){f=21;break}}if((f|0)==21){i[b>>0]=0;return}}function re(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;d=a;a=1;j=c+-1|0;a:while(1){m=(b|0)!=0;b:do if(m){h=j;while(1){c=i[d>>0]|0;if(!(c<<24>>24)){l=41;break a}e=d+1|0;g=c&255;do if(c<<24>>24>-1){d=e;c=g}else{if((g&224|0)==192){c=i[e>>0]|0;if((c&192|0)!=128){a=0;l=41;break a}d=d+2|0;c=c&63|g<<6&1984;break}if((g&240|0)==224){c=i[e>>0]|0;if((c&192|0)!=128){a=0;l=41;break a}f=i[d+2>>0]|0;if((f&192|0)!=128){a=0;l=41;break a}d=d+3|0;c=c<<6&4032|g<<12&61440|f&63;break}if((g&248|0)!=240){a=0;l=41;break a}c=i[e>>0]|0;if((c&192|0)!=128){a=0;l=41;break a}f=i[d+2>>0]|0;if((f&192|0)!=128){a=0;l=41;break a}e=i[d+3>>0]|0;if((e&192|0)!=128){a=0;l=41;break a}d=d+4|0;c=c<<12&258048|g<<18&1835008|f<<6&4032|e&63}while(0);if((h|0)<1)break a;if(c>>>0<=65535){e=h+-1|0;l=39;break b}e=h+-2|0;if((h|0)<2)break a;if(c>>>0>1114111){a=0;h=e}else{l=37;break}}}else{g=d;while(1){c=i[g>>0]|0;if(!(c<<24>>24)){l=43;break a}d=g+1|0;h=c&255;if(c<<24>>24>-1){c=h;e=j;l=39;break b}do if((h&224|0)==192){c=i[d>>0]|0;if((c&192|0)!=128){a=0;l=43;break a}d=g+2|0;c=c&63|h<<6&1984}else{if((h&240|0)==224){c=i[d>>0]|0;if((c&192|0)!=128){a=0;l=43;break a}e=i[g+2>>0]|0;if((e&192|0)!=128){a=0;l=43;break a}d=g+3|0;c=c<<6&4032|h<<12&61440|e&63;break}if((h&248|0)!=240){a=0;l=43;break a}c=i[d>>0]|0;if((c&192|0)!=128){a=0;l=43;break a}e=i[g+2>>0]|0;if((e&192|0)!=128){a=0;l=43;break a}f=i[g+3>>0]|0;if((f&192|0)!=128){a=0;l=43;break a}d=g+4|0;c=c<<12&258048|h<<18&1835008|e<<6&4032|f&63}while(0);if(c>>>0<=65535){e=j;l=39;break b}if(c>>>0>1114111){g=d;a=0}else{e=j;l=37;break}}}while(0);if((l|0)==37){l=0;if(!m){b=0;j=e;continue}k[b>>2]=c;b=b+4|0;j=e;continue}else if((l|0)==39){l=0;if(!m){b=0;j=e;continue}k[b>>2]=c;b=b+4|0;j=e;continue}}if((l|0)==41){if(!b){m=a;return m|0}}else if((l|0)==43)return a|0;k[b>>2]=0;m=a;return m|0}function se(a,b){a=a|0;b=b|0;var c=0,d=0;d=Uj(k[a>>2]|0)|0;c=Uj(k[b>>2]|0)|0;a:do if((d|0)==(c|0)){while(1){if(!(k[a>>2]|0)){c=0;break}a=a+4|0;b=b+4|0;d=Uj(k[a>>2]|0)|0;c=Uj(k[b>>2]|0)|0;if((d|0)!=(c|0)){b=d;break a}}return c|0}else b=d;while(0);d=(b|0)<(c|0)?-1:1;return d|0}function te(a){a=a|0;var b=0,c=0,d=0;b=k[a>>2]|0;if(!b)return a|0;else c=a;do{d=Vj(b)|0;k[c>>2]=d;c=c+4|0;b=k[c>>2]|0}while((b|0)!=0);return a|0}function ue(a){a=a|0;var b=0,c=0,d=0;b=k[a>>2]|0;if(!b)return a|0;else c=a;do{d=Uj(b)|0;k[c>>2]=d;c=c+4|0;b=k[c>>2]|0}while((b|0)!=0);return a|0}function ve(a){a=a|0;return Uj(a)|0}function we(a){a=a|0;var b=0,c=0,d=0,e=0,f=0;f=(k[a>>2]|0)==45;a=f?a+4|0:a;e=f?-1:1;f=f?-1:0;b=k[a>>2]|0;if((b+-48|0)>>>0<10){d=b;b=0;c=0}else{d=0;c=0;f=jn(d|0,c|0,e|0,f|0)|0;return f|0}do{b=jn(b|0,c|0,10,0)|0;c=d+-48|0;b=Vm(c|0,((c|0)<0)<<31>>31|0,b|0,O|0)|0;c=O;a=a+4|0;d=k[a>>2]|0}while((d+-48|0)>>>0<10);a=c;f=jn(b|0,a|0,e|0,f|0)|0;return f|0}function xe(){if(!(i[32955]|0))return;Bf(32944,255);return}function ye(a){a=a|0;k[a+4776>>2]=1;i[a+6340>>0]=0;i[a+6341>>0]=7;i[a+6342>>0]=77;return}function ze(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0;p=r;r=r+128|0;o=p;Le(a+5044|0);Ic(o,b,128)|0;n=Zm(o|0)|0;k[a+6324>>2]=-744245127;k[a+6328>>2]=1064112887;k[a+6332>>2]=1964352053;k[a+6336>>2]=-1528303325;_m(a+6068|0,33152,256)|0;m=(n|0)==0;if(m){c=0;do c=c+1|0;while((c|0)!=256)}else{g=0;do{f=0;do{c=k[a+(((l[b+f>>0]|0)-g&255)<<2)+5044>>2]|0;e=k[a+(((l[b+(f|1)>>0]|0)+g&255)<<2)+5044>>2]&255;d=c&255;if((d|0)!=(e|0)){h=1;while(1){t=a+d+6068|0;q=a+(c+f+h&255)+6068|0;s=i[t>>0]|0;i[t>>0]=i[q>>0]|0;i[q>>0]=s;c=d+1|0;d=c&255;if((d|0)==(e|0))break;else h=h+1|0}}f=f+2|0}while(f>>>0<n>>>0);g=g+1|0}while((g|0)!=256)}if((n&15|0)!=0?(j=n|15,n>>>0<=j>>>0):0){c=n;do{i[o+c>>0]=0;c=c+1|0}while(c>>>0<=j>>>0)}if(m){r=p;return}else c=0;do{Ae(a,o+c|0);c=c+16|0}while(c>>>0<n>>>0);r=p;return}function Ae(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;n=b+1|0;A=b+2|0;h=b+3|0;j=a+6324|0;m=k[j>>2]|0;o=b+4|0;p=b+5|0;q=b+6|0;r=b+7|0;s=a+6328|0;t=b+8|0;u=b+9|0;v=b+10|0;w=b+11|0;x=a+6332|0;y=b+12|0;z=b+13|0;B=b+14|0;C=b+15|0;D=a+6336|0;d=((l[n>>0]|0)<<8|(l[b>>0]|0)|(l[A>>0]|0)<<16|(l[h>>0]|0)<<24)^m;e=((l[p>>0]|0)<<8|(l[o>>0]|0)|(l[q>>0]|0)<<16|(l[r>>0]|0)<<24)^k[s>>2];g=((l[u>>0]|0)<<8|(l[t>>0]|0)|(l[v>>0]|0)<<16|(l[w>>0]|0)<<24)^k[x>>2];c=((l[z>>0]|0)<<8|(l[y>>0]|0)|(l[B>>0]|0)<<16|(l[C>>0]|0)<<24)^k[D>>2];f=0;while(1){E=k[a+((f&3)<<2)+6324>>2]|0;F=E^(c<<11|c>>>21)+g;d=((l[a+(F>>>8&255)+6068>>0]|0)<<8|(l[a+(F&255)+6068>>0]|0)|(l[a+(F>>>16&255)+6068>>0]|0)<<16|(l[a+(F>>>24)+6068>>0]|0)<<24)^d;E=E+((g<<17|g>>>15)^c)|0;e=((l[a+(E>>>8&255)+6068>>0]|0)<<8|(l[a+(E&255)+6068>>0]|0)|(l[a+(E>>>16&255)+6068>>0]|0)<<16|(l[a+(E>>>24)+6068>>0]|0)<<24)^e;f=f+1|0;if((f|0)==32){f=d;d=g;break}else{E=c;F=g;g=d;c=e;e=E;d=F}}E=m^f;i[b>>0]=E;i[n>>0]=E>>>8;i[A>>0]=E>>>16;i[h>>0]=E>>>24;g=k[s>>2]^e;i[o>>0]=g;i[p>>0]=g>>>8;i[q>>0]=g>>>16;i[r>>0]=g>>>24;g=k[x>>2]^d;i[t>>0]=g;i[u>>0]=g>>>8;i[v>>0]=g>>>16;i[w>>0]=g>>>24;g=k[D>>2]^c;i[y>>0]=g;i[z>>0]=g>>>8;i[B>>0]=g>>>16;i[C>>0]=g>>>24;g=k[s>>2]|0;b=k[x>>2]|0;F=k[D>>2]|0;e=k[a+((E&255)<<2)+5044>>2]^k[j>>2];k[j>>2]=e;g=k[a+((l[n>>0]|0)<<2)+5044>>2]^g;k[s>>2]=g;b=k[a+((l[A>>0]|0)<<2)+5044>>2]^b;k[x>>2]=b;F=k[a+((l[h>>0]|0)<<2)+5044>>2]^F;k[D>>2]=F;o=k[a+((l[o>>0]|0)<<2)+5044>>2]^e;k[j>>2]=o;A=k[a+((l[p>>0]|0)<<2)+5044>>2]^g;k[s>>2]=A;b=k[a+((l[q>>0]|0)<<2)+5044>>2]^b;k[x>>2]=b;F=k[a+((l[r>>0]|0)<<2)+5044>>2]^F;k[D>>2]=F;t=k[a+((l[t>>0]|0)<<2)+5044>>2]^o;k[j>>2]=t;A=k[a+((l[u>>0]|0)<<2)+5044>>2]^A;k[s>>2]=A;b=k[a+((l[v>>0]|0)<<2)+5044>>2]^b;k[x>>2]=b;F=k[a+((l[w>>0]|0)<<2)+5044>>2]^F;k[D>>2]=F;k[j>>2]=k[a+((l[y>>0]|0)<<2)+5044>>2]^t;k[s>>2]=k[a+((l[z>>0]|0)<<2)+5044>>2]^A;k[x>>2]=k[a+((l[B>>0]|0)<<2)+5044>>2]^b;k[D>>2]=k[a+((l[C>>0]|0)<<2)+5044>>2]^F;return}function Be(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0;I=r;r=r+16|0;H=I;p=b+1|0;D=b+2|0;m=b+3|0;n=a+6324|0;o=k[n>>2]|0;f=((l[p>>0]|0)<<8|(l[b>>0]|0)|(l[D>>0]|0)<<16|(l[m>>0]|0)<<24)^o;q=b+4|0;s=b+5|0;t=b+6|0;u=b+7|0;v=a+6328|0;j=((l[s>>0]|0)<<8|(l[q>>0]|0)|(l[t>>0]|0)<<16|(l[u>>0]|0)<<24)^k[v>>2];w=b+8|0;x=b+9|0;y=b+10|0;z=b+11|0;A=a+6332|0;d=((l[x>>0]|0)<<8|(l[w>>0]|0)|(l[y>>0]|0)<<16|(l[z>>0]|0)<<24)^k[A>>2];B=b+12|0;C=b+13|0;E=b+14|0;F=b+15|0;G=a+6336|0;c=((l[C>>0]|0)<<8|(l[B>>0]|0)|(l[E>>0]|0)<<16|(l[F>>0]|0)<<24)^k[G>>2];e=H+0|0;g=b+0|0;h=e+16|0;do{i[e>>0]=i[g>>0]|0;e=e+1|0;g=g+1|0}while((e|0)<(h|0));g=31;while(1){e=k[a+((g&3)<<2)+6324>>2]|0;h=e^(c<<11|c>>>21)+d;f=((l[a+(h>>>8&255)+6068>>0]|0)<<8|(l[a+(h&255)+6068>>0]|0)|(l[a+(h>>>16&255)+6068>>0]|0)<<16|(l[a+(h>>>24)+6068>>0]|0)<<24)^f;e=e+((d<<17|d>>>15)^c)|0;e=((l[a+(e>>>8&255)+6068>>0]|0)<<8|(l[a+(e&255)+6068>>0]|0)|(l[a+(e>>>16&255)+6068>>0]|0)<<16|(l[a+(e>>>24)+6068>>0]|0)<<24)^j;if((g|0)>0){j=c;h=d;d=f;c=e;g=g+-1|0;f=h}else break}o=o^f;i[b>>0]=o;i[p>>0]=o>>>8;i[D>>0]=o>>>16;i[m>>0]=o>>>24;D=k[v>>2]^e;i[q>>0]=D;i[s>>0]=D>>>8;i[t>>0]=D>>>16;i[u>>0]=D>>>24;D=k[A>>2]^d;i[w>>0]=D;i[x>>0]=D>>>8;i[y>>0]=D>>>16;i[z>>0]=D>>>24;D=k[G>>2]^c;i[B>>0]=D;i[C>>0]=D>>>8;i[E>>0]=D>>>16;i[F>>0]=D>>>24;D=k[v>>2]|0;E=k[A>>2]|0;F=k[G>>2]|0;C=k[a+((l[H>>0]|0)<<2)+5044>>2]^k[n>>2];k[n>>2]=C;D=k[a+((l[H+1>>0]|0)<<2)+5044>>2]^D;k[v>>2]=D;E=k[a+((l[H+2>>0]|0)<<2)+5044>>2]^E;k[A>>2]=E;F=k[a+((l[H+3>>0]|0)<<2)+5044>>2]^F;k[G>>2]=F;C=k[a+((l[H+4>>0]|0)<<2)+5044>>2]^C;k[n>>2]=C;D=k[a+((l[H+5>>0]|0)<<2)+5044>>2]^D;k[v>>2]=D;E=k[a+((l[H+6>>0]|0)<<2)+5044>>2]^E;k[A>>2]=E;F=k[a+((l[H+7>>0]|0)<<2)+5044>>2]^F;k[G>>2]=F;C=k[a+((l[H+8>>0]|0)<<2)+5044>>2]^C;k[n>>2]=C;D=k[a+((l[H+9>>0]|0)<<2)+5044>>2]^D;k[v>>2]=D;E=k[a+((l[H+10>>0]|0)<<2)+5044>>2]^E;k[A>>2]=E;F=k[a+((l[H+11>>0]|0)<<2)+5044>>2]^F;k[G>>2]=F;k[n>>2]=k[a+((l[H+12>>0]|0)<<2)+5044>>2]^C;k[v>>2]=k[a+((l[H+13>>0]|0)<<2)+5044>>2]^D;k[A>>2]=k[a+((l[H+14>>0]|0)<<2)+5044>>2]^E;k[G>>2]=k[a+((l[H+15>>0]|0)<<2)+5044>>2]^F;r=I;return}function Ce(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0;w=r;r=r+656|0;v=w+640|0;u=w+624|0;t=w+360|0;o=w+176|0;n=w+352|0;s=w+20|0;p=w;q=w+332|0;a:do if(!e){f=0;do{if(bg(a+(f*560|0)|0,c)|0?(i[a+(f*560|0)+556>>0]|0)==0:0){g=8;break a}f=f+1|0}while(f>>>0<4)}else{f=0;do{if((bg(a+(f*560|0)|0,c)|0?(i[a+(f*560|0)+556>>0]|0)!=0:0)?(Mm(a+(f*560|0)+516|0,e,8)|0)==0:0){g=8;break a}f=f+1|0}while(f>>>0<4)}while(0);if((g|0)==8){g=v+0|0;h=a+(f*560|0)+524|0;d=g+16|0;do{i[g>>0]=i[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(d|0));g=u+0|0;h=a+(f*560|0)+540|0;d=g+16|0;do{i[g>>0]=i[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(d|0));a=a+4780|0;eg(a,b,v,128,u);_f(v,16);_f(u,16);r=w;return}oe(d,t,264)|0;f=(kk(d)|0)<<1;m=(e|0)!=0;if(m){h=e;d=h;d=l[d>>0]|l[d+1>>0]<<8|l[d+2>>0]<<16|l[d+3>>0]<<24;h=h+4|0;h=l[h>>0]|l[h+1>>0]<<8|l[h+2>>0]<<16|l[h+3>>0]<<24;j=t+f|0;g=j;i[g>>0]=d;i[g+1>>0]=d>>8;i[g+2>>0]=d>>16;i[g+3>>0]=d>>24;j=j+4|0;i[j>>0]=h;i[j+1>>0]=h>>8;i[j+2>>0]=h>>16;i[j+3>>0]=h>>24;f=f+8|0}og(o);d=n+1|0;g=n+2|0;h=p+16|0;j=0;do{pg(o,t,f,0);i[n>>0]=j;i[d>>0]=j>>>8;i[g>>0]=j>>>16;pg(o,n,3,0);if(!(j&16383)){_m(s|0,o|0,156)|0;qg(s,p,0);i[u+((j|0)/16384|0)>>0]=k[h>>2]}j=j+1|0}while((j|0)!=262144);qg(o,q,0);j=k[q>>2]|0;i[v>>0]=j;i[v+1>>0]=j>>>8;i[v+2>>0]=j>>>16;i[v+3>>0]=j>>>24;j=k[q+4>>2]|0;i[v+4>>0]=j;i[v+5>>0]=j>>>8;i[v+6>>0]=j>>>16;i[v+7>>0]=j>>>24;j=k[q+8>>2]|0;i[v+8>>0]=j;i[v+9>>0]=j>>>8;i[v+10>>0]=j>>>16;i[v+11>>0]=j>>>24;j=k[q+12>>2]|0;i[v+12>>0]=j;i[v+13>>0]=j>>>8;i[v+14>>0]=j>>>16;i[v+15>>0]=j>>>24;j=a+2240|0;_m(a+((k[j>>2]|0)*560|0)|0,c|0,514)|0;f=k[j>>2]|0;i[a+(f*560|0)+556>>0]=m&1;if(m){c=e;q=c;q=l[q>>0]|l[q+1>>0]<<8|l[q+2>>0]<<16|l[q+3>>0]<<24;c=c+4|0;c=l[c>>0]|l[c+1>>0]<<8|l[c+2>>0]<<16|l[c+3>>0]<<24;e=a+(f*560|0)+516|0;s=e;i[s>>0]=q;i[s+1>>0]=q>>8;i[s+2>>0]=q>>16;i[s+3>>0]=q>>24;e=e+4|0;i[e>>0]=c;i[e+1>>0]=c>>8;i[e+2>>0]=c>>16;i[e+3>>0]=c>>24}g=a+(f*560|0)+524|0;h=v+0|0;d=g+16|0;do{i[g>>0]=i[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(d|0));g=a+((k[j>>2]|0)*560|0)+540|0;h=u+0|0;d=g+16|0;do{i[g>>0]=i[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(d|0));k[j>>2]=(k[j>>2]|0)+1&3;_f(t,264);a=a+4780|0;eg(a,b,v,128,u);_f(v,16);_f(u,16);r=w;return}function De(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,m=0,n=0,o=0,p=0,q=0;q=r;r=r+400|0;f=q+368|0;o=q;m=q+112|0;n=q+336|0;p=q+224|0;if(b>>>0<=64)if(!b){b=0;f=a;a=o;h=1;k=6}else{f=a;g=o;k=4}else{rg(o);sg(o,a,b);tg(o,f);b=32;g=o;k=4}if((k|0)==4){a=0;do{i[o+a>>0]=(l[f+a>>0]|0)^54;a=a+1|0}while((a|0)!=(b|0));if(b>>>0<64){a=g;h=0;k=6}else{j=b;a=g;g=0;b=0}}if((k|0)==6){Ym(o+b|0,54,64-b|0)|0;j=b;g=1;b=h}rg(m);sg(m,a,64);sg(m,c,d);tg(m,n);rg(p);if(!b){b=0;do{i[o+b>>0]=(l[f+b>>0]|0)^92;b=b+1|0}while((b|0)!=(j|0))}if(!g){sg(p,a,64);sg(p,n,32);tg(p,e);r=q;return}Ym(o+j|0,92,64-j|0)|0;sg(p,a,64);sg(p,n,32);tg(p,e);r=q;return}function Ee(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;p=r;r=r+176|0;m=p+96|0;n=p;l=p+32|0;o=p+64|0;_m(m|0,c|0,(d>>>0<64?d:64)|0)|0;i[m+d>>0]=0;i[m+(d+1)>>0]=0;i[m+(d+2)>>0]=0;i[m+(d+3)>>0]=1;De(a,b,m,d+4|0,n);c=l+0|0;j=n+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));d=h+-1|0;if(d){h=0;do{De(a,b,n,32,o);c=n+0|0;j=o+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));c=0;do{k=l+c|0;i[k>>0]=i[k>>0]^i[n+c>>0];c=c+1|0}while((c|0)!=32);h=h+1|0}while(h>>>0<d>>>0)}c=e+0|0;j=l+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));d=0;do{De(a,b,n,32,o);c=n+0|0;j=o+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));c=0;do{k=l+c|0;i[k>>0]=i[k>>0]^i[n+c>>0];c=c+1|0}while((c|0)!=32);d=d+1|0}while(d>>>0<16);c=f+0|0;j=l+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));d=0;do{De(a,b,n,32,o);c=n+0|0;j=o+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));c=0;do{f=l+c|0;i[f>>0]=i[f>>0]^i[n+c>>0];c=c+1|0}while((c|0)!=32);d=d+1|0}while(d>>>0<16);c=g+0|0;j=l+0|0;k=c+32|0;do{i[c>>0]=i[j>>0]|0;c=c+1|0;j=j+1|0}while((c|0)<(k|0));_f(m,68);_f(l,32);_f(n,32);_f(o,32);r=p;return}function Fe(a,b,c,d,e,f,g,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var l=0,m=0,n=0,o=0,p=0,q=0;q=r;r=r+608|0;l=q+576|0;p=q;o=q+32|0;n=q+64|0;if(g>>>0>24){r=q;return}else m=0;while(1){if(((k[a+(m*632|0)+2808>>2]|0)==(g|0)?bg(a+(m*632|0)+2244|0,c)|0:0)?(Mm(a+(m*632|0)+2760|0,e,16)|0)==0:0){n=m;m=5;break}m=m+1|0;if(m>>>0>=4){m=7;break}}if((m|0)==5){m=a+(n*632|0)+2776|0;$f(m,32,0,0);c=l+0|0;d=m+0|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0));$f(m,32,1,0);c=p+0|0;d=a+(n*632|0)+2812|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0));c=o+0|0;d=a+(n*632|0)+2844|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0))}else if((m|0)==7){qe(d,n,512);Ee(n,Zm(n|0)|0,e,16,l,o,p,1<<g);_f(n,512);d=a+4772|0;n=k[d>>2]|0;k[d>>2]=n+1;n=n&3;k[a+(n*632|0)+2808>>2]=g;_m(a+(n*632|0)+2244|0,c|0,514)|0;c=a+(n*632|0)+2760|0;d=e+0|0;g=c+16|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0));m=a+(n*632|0)+2776|0;c=m+0|0;d=l+0|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0));c=a+(n*632|0)+2812|0;d=p+0|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0));c=a+(n*632|0)+2844|0;d=o+0|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0));$f(m,32,1,0)}if(h){c=h+0|0;d=o+0|0;g=c+32|0;do{i[c>>0]=i[d>>0]|0;c=c+1|0;d=d+1|0}while((c|0)<(g|0))}if(j){m=j;e=m;i[e>>0]=0;i[e+1>>0]=0;i[e+2>>0]=0;i[e+3>>0]=0;m=m+4|0;i[m>>0]=0;i[m+1>>0]=0;i[m+2>>0]=0;i[m+3>>0]=0;m=0;do{e=j+(m&7)|0;i[e>>0]=i[e>>0]^i[p+m>>0];m=m+1|0}while((m|0)!=32);_f(p,32)}if(f)eg(a+4780|0,b,l,256,f);_f(l,32);r=q;return}function Ge(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;h=r;r=r+80|0;d=h+64|0;f=h;g=h+32|0;c=k[a>>2]|0;if((c|0)==2){e=a+4|0;c=k[e>>2]|0;i[d>>0]=c;i[d+1>>0]=c>>>8;i[d+2>>0]=c>>>16;i[d+3>>0]=c>>>24;De(b,32,d,4,f);k[e>>2]=0;c=0;d=0;do{c=(l[f+d>>0]|0)<<(d<<3&24)^c;d=d+1|0}while((d|0)!=32);k[e>>2]=c;c=k[a>>2]|0}if((c|0)!=3){r=h;return}e=a+4|0;De(b,32,e,32,g);e=e+0|0;c=g+0|0;d=e+32|0;do{i[e>>0]=i[c>>0]|0;e=e+1|0;c=c+1|0}while((e|0)<(d|0));r=h;return}function He(a){a=a|0;var b=0,c=0;b=a+2240|0;c=a;do{Xf(c);c=c+560|0}while((c|0)!=(b|0));b=a+4772|0;c=a+2244|0;do{Xf(c);c=c+632|0}while((c|0)!=(b|0));cg(a+4780|0);Ym(a+5044|0,0,1024)|0;Ym(a|0,0,4780)|0;return}function Ie(a){a=a|0;var b=0,c=0;_f(a,2240);b=a+2244|0;_f(b,2528);c=a+4772|0;do{c=c+-632|0;Zf(c)}while((c|0)!=(b|0));b=a+2240|0;do{b=b+-560|0;Zf(b)}while((b|0)!=(a|0));return}function Je(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0;switch(k[a+4776>>2]|0){case 1:{if(!c)return;f=a+6342|0;g=a+6341|0;e=a+6340|0;d=c;while(1){d=d+-1|0;a=(l[g>>0]|0)+(l[f>>0]|0)|0;i[g>>0]=a;a=(l[e>>0]|0)+a|0;i[e>>0]=a;i[b>>0]=(l[b>>0]|0)-a;if(!d)break;else b=b+1|0}return}case 2:{if(!c)return;f=a+6344|0;e=a+6346|0;g=a+6348|0;h=a+6350|0;d=c;while(1){d=d+-1|0;c=(m[f>>1]|0)+4660|0;j[f>>1]=c;n=a+((c>>>1&255)<<2)+5044|0;o=(m[e>>1]|0)^k[n>>2];j[e>>1]=o;n=(m[g>>1]|0)-((k[n>>2]|0)>>>16)|0;j[g>>1]=n;p=m[h>>1]|0;o=(p<<15&32768|p>>>1)^o&65535;o=o>>>1|o<<15;j[h>>1]=o;c=o^(n^c)&65535;j[f>>1]=c;i[b>>0]=c>>>8^(l[b>>0]|0);if(!d)break;else b=b+1|0}return}case 3:{if(!c)return;else d=0;do{Be(a,b+d|0);d=d+16|0}while(d>>>0<c>>>0);return}case 5:case 4:{hg(a+4780|0,b,c,b);return}default:return}}function Ke(a,b,c,d,e,f,g,h,l){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;l=l|0;var m=0,n=0,o=0;o=r;r=r+640|0;n=o;m=o+512|0;if((c|0)==0|(i[d+512>>0]|0)==0){n=0;r=o;return n|0}k[a+4776>>2]=c;ag(d,n,128);me(n,m,128)|0;switch(c|0){case 2:{Le(a+5044|0);d=Me(-1,m,Zm(m|0)|0)|0;j[a+6344>>1]=d;j[a+6346>>1]=d>>>16;d=a+6350|0;j[d>>1]=0;c=a+6348|0;j[c>>1]=0;b=i[m>>0]|0;if(b<<24>>24){f=0;g=0;h=0;do{e=b&255;l=a+(e<<2)+5044|0;f=e^f&65535^k[l>>2];j[c>>1]=f;g=e+(g&65535)+((k[l>>2]|0)>>>16)|0;j[d>>1]=g;h=h+1|0;b=i[m+h>>0]|0}while(b<<24>>24!=0)}break}case 1:{d=a+6342|0;i[d>>0]=0;l=a+6341|0;i[l>>0]=0;c=a+6340|0;i[c>>0]=0;b=i[m>>0]|0;if(b<<24>>24){h=0;f=0;e=0;g=0;do{a=b&255;h=a+(h&255)|0;f=b^f;e=a+e&255;e=e<<1|e>>>7;g=g+1|0;b=i[m+g>>0]|0}while(b<<24>>24!=0);b=e;i[c>>0]=h;i[l>>0]=f;i[d>>0]=b}break}case 3:{ze(a,m);break}case 5:{Fe(a,b,d,n,e,f,g,h,l);break}case 4:{Ce(a,b,d,n,e);break}default:{}}_f(m,128);_f(n,512);n=1;r=o;return n|0}function Le(a){a=a|0;var b=0,c=0,d=0;if(!(k[a+4>>2]|0))b=0;else return;do{d=b>>>1;d=(b&1|0)!=0?d^-306674912:d;c=d>>>1;c=(d&1|0)!=0?c^-306674912:c;d=c>>>1;d=(c&1|0)!=0?d^-306674912:d;c=d>>>1;c=(d&1|0)!=0?c^-306674912:c;d=c>>>1;d=(c&1|0)!=0?d^-306674912:d;c=d>>>1;c=(d&1|0)!=0?c^-306674912:c;d=c>>>1;d=(c&1|0)!=0?d^-306674912:d;c=d>>>1;k[a+(b<<2)>>2]=(d&1|0)!=0?c^-306674912:c;b=b+1|0}while((b|0)!=256);return}function Me(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;if(!c){f=a;return f|0}else d=b;while(1){if(!(d&7)){b=c;break}a=k[33416+(((l[d>>0]|0)^a&255)<<2)>>2]^a>>>8;c=c+-1|0;if(!c){f=10;break}else d=d+1|0}if((f|0)==10)return a|0;if(b>>>0>7){e=b+-8|0;f=e&-8;c=d+(f+8)|0;while(1){g=k[d>>2]^a;a=k[d+4>>2]|0;a=k[39560+((g>>>8&255)<<2)>>2]^k[40584+((g&255)<<2)>>2]^k[38536+((g>>>16&255)<<2)>>2]^k[37512+(g>>>24<<2)>>2]^k[36488+((a&255)<<2)>>2]^k[35464+((a>>>8&255)<<2)>>2]^k[34440+((a>>>16&255)<<2)>>2]^k[33416+(a>>>24<<2)>>2];b=b+-8|0;if(b>>>0<=7)break;else d=d+8|0}b=e-f|0}else c=d;if(!b){g=a;return g|0}while(1){a=k[33416+(((l[c>>0]|0)^a&255)<<2)>>2]^a>>>8;b=b+-1|0;if(!b)break;else c=c+1|0}return a|0}function Ne(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if(!c){b=a;return b|0}else d=0;do{a=(l[b+d>>0]|0)+(a&65535)&65535;a=(a<<1|a>>>15)&65535;d=d+1|0}while((d|0)!=(c|0));return a|0}function Oe(){Pe(33408);return}function Pe(a){a=a|0;var b=0,c=0;if(!(k[8355]|0)){a=0;do{c=a>>>1;c=(a&1|0)!=0?c^-306674912:c;b=c>>>1;b=(c&1|0)!=0?b^-306674912:b;c=b>>>1;c=(b&1|0)!=0?c^-306674912:c;b=c>>>1;b=(c&1|0)!=0?b^-306674912:b;c=b>>>1;c=(b&1|0)!=0?c^-306674912:c;b=c>>>1;b=(c&1|0)!=0?b^-306674912:b;c=b>>>1;c=(b&1|0)!=0?c^-306674912:c;b=c>>>1;k[33416+(a<<2)>>2]=(c&1|0)!=0?b^-306674912:b;a=a+1|0}while((a|0)!=256);a=0}else a=0;do{c=k[33416+(a<<2)>>2]|0;c=k[33416+((c&255)<<2)>>2]^c>>>8;k[34440+(a<<2)>>2]=c;c=c>>>8^k[33416+((c&255)<<2)>>2];k[35464+(a<<2)>>2]=c;c=c>>>8^k[33416+((c&255)<<2)>>2];k[36488+(a<<2)>>2]=c;c=c>>>8^k[33416+((c&255)<<2)>>2];k[37512+(a<<2)>>2]=c;c=c>>>8^k[33416+((c&255)<<2)>>2];k[38536+(a<<2)>>2]=c;c=c>>>8^k[33416+((c&255)<<2)>>2];k[39560+(a<<2)>>2]=c;k[40584+(a<<2)>>2]=c>>>8^k[33416+((c&255)<<2)>>2];a=a+1|0}while((a|0)!=256);return}function Qe(a,b){a=a|0;b=b|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[a+12>>2]=0;k[a+16>>2]=b;k[a+4>>2]=0;k[a+24>>2]=0;k[a+20>>2]=0;k[a+28>>2]=0;return}function Re(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0;n=r;r=r+16|0;m=n;i=a+28|0;if(!(k[i>>2]|0)){if(!b){a=0;r=n;return a|0}f=a+4|0;c=(k[f>>2]|0)+b|0;k[f>>2]=c;g=a+8|0;d=k[g>>2]|0;if(c>>>0>d>>>0){e=k[a+12>>2]|0;if((e|0)!=0&c>>>0>e>>>0){k[m>>2]=e;Jf(32944,53104,m);Af(32944);d=k[g>>2]|0;c=k[f>>2]|0}d=d+32+(d>>>2)|0;d=c>>>0>d>>>0?c:d;c=zm(k[a>>2]|0,d)|0;if(!c)Af(32944);k[a>>2]=c;k[g>>2]=d}else c=k[a>>2]|0;i=k[a+16>>2]|0;m=a+20|0;a=kc[k[(k[i>>2]|0)+12>>2]&31](i,c+(k[m>>2]|0)|0,b)|0;k[m>>2]=(k[m>>2]|0)+a;r=n;return a|0}e=a+4|0;j=k[e>>2]|0;l=a+20|0;c=k[l>>2]|0;f=j-c|0;if(f>>>0>=b>>>0){k[l>>2]=c+b;a=b;r=n;return a|0}h=b-f|0;h=(0-h&15)+h|0;c=h+j|0;k[e>>2]=c;g=a+8|0;f=k[g>>2]|0;if(c>>>0>f>>>0){d=k[a+12>>2]|0;if((d|0)!=0&c>>>0>d>>>0){k[m>>2]=d;Jf(32944,53104,m);Af(32944);f=k[g>>2]|0;c=k[e>>2]|0}d=f+32+(f>>>2)|0;d=c>>>0>d>>>0?c:d;c=zm(k[a>>2]|0,d)|0;if(!c)Af(32944);k[a>>2]=c;k[g>>2]=d}else c=k[a>>2]|0;m=k[a+16>>2]|0;m=kc[k[(k[m>>2]|0)+12>>2]&31](m,c+j|0,h)|0;Je(k[i>>2]|0,(k[a>>2]|0)+j|0,h);k[l>>2]=(k[l>>2]|0)+((m|0)==0?0:b);a=m;r=n;return a|0}function Se(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=r;r=r+16|0;g=j;if(!c){r=j;return}h=a+4|0;d=(k[h>>2]|0)+c|0;k[h>>2]=d;i=a+8|0;e=k[i>>2]|0;if(d>>>0>e>>>0){f=k[a+12>>2]|0;if((f|0)!=0&d>>>0>f>>>0){k[g>>2]=f;Jf(32944,53104,g);Af(32944);e=k[i>>2]|0;d=k[h>>2]|0}e=e+32+(e>>>2)|0;e=d>>>0>e>>>0?d:e;d=zm(k[a>>2]|0,e)|0;if(!d)Af(32944);k[a>>2]=d;k[i>>2]=e}else d=k[a>>2]|0;h=a+20|0;_m(d+(k[h>>2]|0)|0,b|0,c|0)|0;k[h>>2]=(k[h>>2]|0)+c;r=j;return}function Te(a){a=a|0;var b=0,c=0;b=a+24|0;c=k[b>>2]|0;if(c>>>0>=(k[a+20>>2]|0)>>>0){a=0;return a|0}k[b>>2]=c+1;a=i[(k[a>>2]|0)+c>>0]|0;return a|0}function Ue(a){a=a|0;var b=0,c=0,d=0;b=a+24|0;c=k[b>>2]|0;d=c+1|0;if(d>>>0>=(k[a+20>>2]|0)>>>0){d=0;return d|0}a=k[a>>2]|0;d=((l[a+d>>0]|0)<<8|(l[a+c>>0]|0))&65535;k[b>>2]=c+2;return d|0}function Ve(a){a=a|0;var b=0,c=0,d=0;b=a+24|0;c=k[b>>2]|0;d=c+3|0;if(d>>>0>=(k[a+20>>2]|0)>>>0){d=0;return d|0}a=k[a>>2]|0;d=(l[a+(c+1)>>0]|0)<<8|(l[a+c>>0]|0)|(l[a+(c+2)>>0]|0)<<16|(l[a+d>>0]|0)<<24;k[b>>2]=c+4;return d|0}function We(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0;f=a+24|0;b=k[f>>2]|0;c=b+3|0;g=k[a+20>>2]|0;if(c>>>0<g>>>0){d=k[a>>2]|0;d=(l[d+(b+1)>>0]|0)<<8|(l[d+b>>0]|0)|(l[d+(b+2)>>0]|0)<<16|(l[d+c>>0]|0)<<24;b=b+4|0;k[f>>2]=b;e=0}else{d=0;e=0}c=b+3|0;if(c>>>0>=g>>>0){a=0;g=0;a=a|d;g=g|e;O=g;return a|0}g=k[a>>2]|0;g=(l[g+(b+1)>>0]|0)<<8|(l[g+b>>0]|0)|(l[g+(b+2)>>0]|0)<<16|(l[g+c>>0]|0)<<24;k[f>>2]=b+4;a=0;a=a|d;g=g|e;O=g;return a|0}function Xe(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,i=0;f=a+24|0;b=k[f>>2]|0;g=k[a+20>>2]|0;if(b>>>0>=g>>>0){f=0;g=0;O=f;return g|0}e=k[a>>2]|0;a=0;c=0;d=0;while(1){h=b;b=b+1|0;k[f>>2]=b;h=l[e+h>>0]|0;i=$m(h&127|0,0,d|0)|0;a=Vm(i|0,O|0,a|0,c|0)|0;c=O;if(!(h&128)){b=5;break}if(b>>>0>=g>>>0){c=0;a=0;b=5;break}else d=d+7|0}if((b|0)==5){O=c;return a|0}return 0}function Ye(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;d=k[a+20>>2]|0;if(d>>>0<=b>>>0){e=0;return e|0}c=k[a>>2]|0;a=b;while(1){if((i[c+a>>0]|0)>-1)break;a=a+1|0;if(a>>>0>=d>>>0){a=0;e=6;break}}if((e|0)==6)return a|0;e=1-b+a|0;return e|0}function Ze(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;e=a+24|0;f=k[e>>2]|0;d=(k[a+20>>2]|0)-f|0;g=d>>>0<c>>>0;d=g?d:c;if(d)_m(b|0,(k[a>>2]|0)+f|0,d|0)|0;if(!g){a=k[e>>2]|0;a=a+d|0;k[e>>2]=a;return d|0}Ym(b+d|0,0,c-d|0)|0;a=k[e>>2]|0;a=a+d|0;k[e>>2]=a;return d|0}function _e(a,b){a=a|0;b=b|0;var c=0;c=a+20|0;if((k[c>>2]|0)>>>0<3){a=0;return a|0}a=(Me(-1,(k[a>>2]|0)+2|0,(k[(b?a+24|0:c)>>2]|0)+-2|0)|0)&65535^65535;return a|0}function $e(a){a=a|0;var b=0;b=k[a+20>>2]|0;if(b>>>0<5){a=-1;return a|0}a=~(Me(-1,(k[a>>2]|0)+4|0,b+-4|0)|0);return a|0}function af(a){a=a|0;i[a+4>>0]=0;k[a+8>>2]=0;k[a+12>>2]=0;k[a+16>>2]=0;return}function bf(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;g=(f|0)!=0;if(!(d>>>0>1&g)){d=g;b=0;f=f+-1|0;f=d?b:f;e=e+(f<<2)|0;k[e>>2]=0;return}s=a+8|0;q=a+4|0;r=l[c>>0]<<8;j=k[s>>2]|0;a=0;g=1;while(1){if(!j){h=i[c+g>>0]|0;i[q>>0]=h;k[s>>2]=8;j=8;m=g+1|0}else{h=i[q>>0]|0;m=g}p=h&255;g=p>>>6;do if((g|0)==1){k[e+(a<<2)>>2]=l[c+m>>0]|r;g=a+1|0;h=m+1|0}else if((g|0)==3){o=m+1|0;n=i[c+m>>0]|0;g=n&255;if(!(g&128)){if(a>>>0>=f>>>0){g=a;h=o;break}m=-2-g|0;m=((m|0)>-1?-3-m|0:-2)-g|0;g=a-f|0;g=a-(m>>>0>g>>>0?m:g)|0;do{k[e+(a<<2)>>2]=i[b+a>>0];a=a+1|0}while((a|0)!=(g|0));h=o}else{h=m+2|0;if(a>>>0>=f>>>0){g=a;break}m=l[c+o>>0]|0;o=n&127;g=-2-o|0;o=((g|0)>-1?-3-g|0:-2)-o|0;g=a-f|0;g=a-(o>>>0>g>>>0?o:g)|0;do{k[e+(a<<2)>>2]=(l[b+a>>0]|0)+m&255|r;a=a+1|0}while((a|0)!=(g|0))}}else if(!g){k[e+(a<<2)>>2]=l[c+m>>0];g=a+1|0;h=m+1|0}else if((g|0)==2){k[e+(a<<2)>>2]=l[c+(m+1)>>0]<<8|l[c+m>>0];g=a+1|0;h=m+2|0}else{g=a;h=m}while(0);i[q>>0]=p<<2;j=j+-2|0;k[s>>2]=j;a=g>>>0<f>>>0;if(!(h>>>0<d>>>0&a))break;else{a=g;g=h}}f=f+-1|0;f=a?g:f;e=e+(f<<2)|0;k[e>>2]=0;return}function cf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=r;r=r+16384|0;f=j+8192|0;g=j;h=c>>>31;i=c&65535;do if(i){d=kk(a)|0;e=c&65534;c=(e|0)==2;if((!c?(mk(a,b,d)|0)==0:0)?(d=k[b+(d<<2)>>2]|0,(d|0)==0|(d|0)==47|(d|0)==92):0){b=1;r=j;return b|0}if((i|0)==1){b=0;r=j;return b|0}Wc(a,f,2048);Wc(b,g,2048);if(c){if(!h)c=Kc(f,g)|0;else c=hk(f,g)|0;if(c){b=0;r=j;return b|0}}c=(i|0)==4;if((e|0)==4){if(Uc(f)|0){b=df(a,b,(h|0)!=0)|0;r=j;return b|0}if(!c?!(Uc(a)|0):0){if(!h)c=Kc(f,g)|0;else c=hk(f,g)|0;if(!c)break;else c=0;r=j;return c|0}if((k[f>>2]|0)!=0?(mk(f,g,kk(f)|0)|0)!=0:0){b=0;r=j;return b|0}}}while(0);e=Oc(a)|0;d=Oc(b)|0;if(!(mk(41608,d,6)|0)){b=0;r=j;return b|0}c=(h|0)!=0;if((i|0)!=2){b=df(e,d,c)|0;r=j;return b|0}if(c)c=hk(e,d)|0;else c=Kc(e,d)|0;b=(c|0)==0;r=j;return b|0}function df(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;d=a;a:while(1){a=k[b>>2]|0;b:do if(!a){e=d;while(1){d=e+4|0;f=k[e>>2]|0;if((f|0)==46)e=d;else if((f|0)==63){g=8;break}else if((f|0)==42){g=9;break a}else if(!f){a=0;g=7;break a}else{a=0;break a}}}else if((a|0)==46){a=d+4|0;e=k[d>>2]|0;if((e|0)==42){e=d;d=a;g=9;break a}else if(!((e|0)==46|(e|0)==63))if(!e){a=46;g=7;break a}else{a=0;break a}}else if((a|0)==92){e=d;while(1){d=e+4|0;switch(k[e>>2]|0){case 63:{g=8;break b}case 46:{e=d;break}case 42:{g=9;break a}case 92:{a=d;break b}case 0:{a=92;g=7;break a}default:{a=0;break a}}}}else while(1){e=d;d=d+4|0;f=k[e>>2]|0;if((f|0)==63){g=8;break b}else if((f|0)==42){g=9;break a}else if(!f){g=7;break a}if((f|0)==(a|0)){a=d;break b}if((f|0)!=46){a=0;break a}if(!((a|0)==0|(a|0)==46|(a|0)==92)){a=0;break a}}while(0);if((g|0)==8){g=0;if(!a){a=0;break}else a=d}d=a;b=b+4|0}c:do if((g|0)==7)a=(a|0)==0;else if((g|0)==9){a=k[d>>2]|0;if((a|0)==46){f=e+8|0;if((k[f>>2]|0)==42?(k[e+12>>2]|0)==0:0){a=1;break}a=gk(b,46)|0;e=(a|0)==0;if(!(k[f>>2]|0)){if(e){a=1;break}a=(k[a+4>>2]|0)==0;break}if(!e){if((ok(d,41640)|0)==0?(h=a+4|0,(gk(h,46)|0)==0):0){if(c)a=hk(f,h)|0;else a=Kc(f,h)|0;a=(a|0)==0;break}}else a=b}else if(!a){a=1;break}else a=b;while(1){if(!(k[a>>2]|0)){a=0;break c}if(df(d,a,c)|0){a=1;break}else a=a+4|0}}while(0);return a|0}function ef(a,b){a=a|0;b=b|0;var c=0;c=jn(b|0,((b|0)<0)<<31>>31|0,1e7,0)|0;c=Vm(c|0,O|0,-717324288,27111902)|0;b=a;k[b>>2]=c;k[b+4>>2]=O;return a|0}function ff(a){a=a|0;a=Vm(k[a>>2]|0,k[a+4>>2]|0,717324288,-27111903)|0;a=kn(a|0,O|0,1e7,0)|0;return a|0}function gf(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;c=r;r=r+16|0;d=c;e=a;e=Vm(k[e>>2]|0,k[e+4>>2]|0,717324288,-27111903)|0;e=kn(e|0,O|0,1e7,0)|0;k[d>>2]=e;d=Pb(d|0)|0;k[b>>2]=(k[d+20>>2]|0)+1900;k[b+4>>2]=(k[d+16>>2]|0)+1;k[b+8>>2]=k[d+12>>2];k[b+12>>2]=k[d+8>>2];k[b+16>>2]=k[d+4>>2];k[b+20>>2]=k[d>>2];a=ln(k[a>>2]|0,k[a+4>>2]|0,1e7,0)|0;k[b+24>>2]=a;k[b+28>>2]=k[d+24>>2];k[b+32>>2]=k[d+28>>2];r=c;return}function hf(a,b){a=a|0;b=b|0;var c=0,d=0;c=r;r=r+48|0;d=c;k[d>>2]=k[b+20>>2];k[d+4>>2]=k[b+16>>2];k[d+8>>2]=k[b+12>>2];k[d+12>>2]=k[b+8>>2];k[d+16>>2]=(k[b+4>>2]|0)+-1;k[d+20>>2]=(k[b>>2]|0)+-1900;k[d+32>>2]=-1;d=gb(d|0)|0;d=jn(d|0,((d|0)<0)<<31>>31|0,1e7,0)|0;d=Vm(d|0,O|0,-717324288,27111902)|0;b=Vm(d|0,O|0,k[b+24>>2]|0,0)|0;k[a>>2]=b;k[a+4>>2]=O;r=c;return}function jf(a,b,c){a=a|0;b=b|0;c=c|0;k[a>>2]=b;k[a+4>>2]=c;return}function kf(a){a=a|0;var b=0,c=0;b=r;r=r+16|0;c=b;a=Vm(k[a>>2]|0,k[a+4>>2]|0,717324288,-27111903)|0;a=kn(a|0,O|0,1e7,0)|0;k[c>>2]=a;a=Pb(c|0)|0;r=b;return k[a+12>>2]<<16|(k[a+20>>2]<<25)+1610612736|(k[a+16>>2]<<21)+2097152|k[a+8>>2]<<11|k[a+4>>2]<<5|(k[a>>2]|0)>>>1|0}function lf(a,b){a=a|0;b=b|0;var c=0,d=0;c=r;r=r+48|0;d=c;k[d>>2]=b<<1&62;k[d+4>>2]=b>>>5&63;k[d+8>>2]=b>>>11&31;k[d+12>>2]=b>>>16&31;k[d+16>>2]=(b>>>21&15)+-1;k[d+20>>2]=(b>>>25)+80;k[d+32>>2]=-1;b=gb(d|0)|0;b=jn(b|0,((b|0)<0)<<31>>31|0,1e7,0)|0;b=Vm(b|0,O|0,-717324288,27111902)|0;k[a>>2]=b;k[a+4>>2]=O;r=c;return}function mf(a){a=a|0;var b=0,c=0;b=r;r=r+16|0;c=b;nb(c|0)|0;c=k[c>>2]|0;c=jn(c|0,((c|0)<0)<<31>>31|0,1e7,0)|0;c=Vm(c|0,O|0,-717324288,27111902)|0;k[a>>2]=c;k[a+4>>2]=O;r=b;return}function nf(a){a=a|0;var b=0;He(a+64|0);He(a+6416|0);Cg(a+12840|0);Cg(a+15756|0);Cg(a+18672|0);i[a>>0]=0;i[a+12>>0]=0;b=a+32|0;k[b>>2]=0;k[b+4>>2]=0;i[a+40>>0]=1;i[a+41>>0]=0;i[a+42>>0]=0;i[a+12776>>0]=0;i[a+12777>>0]=0;i[a+12778>>0]=0;k[a+44>>2]=0;k[a+48>>2]=0;k[a+24>>2]=0;k[a+52>>2]=0;i[a+21588>>0]=0;i[a+21589>>0]=0;b=a+12792|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[b+12>>2]=0;k[b+16>>2]=0;k[b+20>>2]=0;k[b+24>>2]=0;k[b+28>>2]=0;k[a+12768>>2]=-1;k[a+56>>2]=0;k[a+60>>2]=0;k[a+12772>>2]=0;a=a+12824|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[a+12>>2]=0;return}function of(a){a=a|0;var b=0;i[a>>0]=0;i[a+12>>0]=0;b=a+32|0;k[b>>2]=0;k[b+4>>2]=0;i[a+40>>0]=1;i[a+41>>0]=0;i[a+42>>0]=0;i[a+12776>>0]=0;i[a+12777>>0]=0;i[a+12778>>0]=0;k[a+44>>2]=0;k[a+48>>2]=0;k[a+24>>2]=0;k[a+52>>2]=0;i[a+21588>>0]=0;i[a+21589>>0]=0;b=a+12792|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[b+12>>2]=0;k[b+16>>2]=0;k[b+20>>2]=0;k[b+24>>2]=0;k[b+28>>2]=0;k[a+12768>>2]=-1;k[a+56>>2]=0;k[a+60>>2]=0;k[a+12772>>2]=0;a=a+12824|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[a+12>>2]=0;return}function pf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;w=a+21589|0;u=a+44|0;q=a+32|0;r=a+12777|0;s=a+56|0;t=a+12840|0;v=a+12808|0;n=a+12772|0;o=a+8|0;p=a+4|0;g=(i[w>>0]|0)==0?c:c&-16;m=b;d=0;c=0;while(1){if(!g){l=d;d=19;break}j=k[u>>2]|0;if(!(i[a>>0]|0)){l=q;e=k[l>>2]|0;l=k[l+4>>2]|0;l=0>(l|0)|0==(l|0)&g>>>0>e>>>0;e=l?e:g;if(e){if((i[r>>0]|0)!=0?!((i[w>>0]|0)==0|l^1):0){d=e-(e+c&15)|0;d=(d|0)>0?d:e}else d=e;if(!(k[j+4>>2]|0)){c=-1;d=30;break}d=kc[k[(k[j>>2]|0)+12>>2]&31](j,m,d)|0;e=k[s>>2]|0;if(!e)e=j+42832|0;if(i[e+8329>>0]|0)Fg(t,m,d)}}else{_m(b|0,k[o>>2]|0,k[p>>2]|0)|0;d=k[p>>2]|0;k[p>>2]=0}e=((d|0)<0)<<31>>31;y=v;y=Vm(k[y>>2]|0,k[y+4>>2]|0,d|0,e|0)|0;l=v;k[l>>2]=y;k[l+4>>2]=O;c=d+c|0;m=m+d|0;g=g-d|0;l=q;y=k[l>>2]|0;l=k[l+4>>2]|0;A=Um(y|0,l|0,d|0,e|0)|0;z=q;k[z>>2]=A;k[z+4>>2]=O;if(!((i[r>>0]|0)!=0&((y|0)==(d|0)&(l|0)==(e|0)))){l=d;d=19;break}if((d|0)!=0?(i[w>>0]|0)==0|(c&15|0)==0:0){l=d;d=19;break}if(!(ch(j,a,1,k[n>>2]|0)|0)){d=18;break}}if((d|0)==18){i[a+12778>>0]=1;A=-1;return A|0}else if((d|0)==19){j=k[u>>2]|0;if((j|0)!=0?(h=j+78248|0,f=v,h=Vm(k[f>>2]|0,k[f+4>>2]|0,k[h>>2]|0,k[h+4>>2]|0)|0,f=O,(i[a+40>>0]|0)!=0):0){g=a+12784|0;d=a+12832|0;e=k[d>>2]|0;d=k[d+4>>2]|0;if((e|0)==0&(d|0)==0){e=k[g>>2]|0;d=k[g+4>>2]|0}else{A=a+12824|0;h=Vm(k[A>>2]|0,k[A+4>>2]|0,h|0,f|0)|0;f=O}A=k[j+36172>>2]|0;d=hd(h,f,e,d)|0;if((i[A+49736>>0]|0)==0?(x=a+12768|0,(d|0)!=(k[x>>2]|0)):0)k[x>>2]=d}if((l|0)!=-1){if(i[w>>0]|0)Je(a+6416|0,b,c)}else c=-1;xe();A=c;return A|0}else if((d|0)==30)return c|0;return 0}function qf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=k[(k[a+44>>2]|0)+36172>>2]|0;if(k[d+75172>>2]|0){e=k[d+75184>>2]|0;if((e|0)!=0?(pc[e&15](1,k[d+75180>>2]|0,b,c)|0)==-1:0)Bf(32944,255);d=k[d+75192>>2]|0;if((d|0)!=0?(rc[d&15](b,c)|0)==0:0)Bf(32944,255)}k[a+28>>2]=b;k[a+24>>2]=c;if(!(i[a+12>>0]|0)){if(!(i[a+41>>0]|0))qd(k[a+48>>2]|0,b,c)|0}else{d=a+16|0;if((k[d>>2]|0)>>>0>=c>>>0){e=a+20|0;_m(k[e>>2]|0,b|0,c|0)|0;k[e>>2]=(k[e>>2]|0)+c;k[d>>2]=(k[d>>2]|0)-c}}e=a+12816|0;d=e;d=Vm(k[d>>2]|0,k[d+4>>2]|0,c|0,0)|0;k[e>>2]=d;k[e+4>>2]=O;if(i[a+42>>0]|0){xe();return}Fg(a+18672|0,b,c);xe();return}function rf(a,b,c){a=a|0;b=b|0;c=c|0;if(b)k[a+44>>2]=b;if(c)k[a+48>>2]=c;k[a+12768>>2]=-1;return}function sf(a,b,c){a=a|0;b=b|0;c=c|0;k[b>>2]=k[a+28>>2];k[c>>2]=k[a+24>>2];return}function tf(a,b,c,d,e,f,g,h,j){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;if(b){h=(Ke(a+64|0,1,c,d,e,f,g,j,h)|0)&1;i[a+21588>>0]=h;return}else{h=(Ke(a+6416|0,0,c,d,e,f,g,j,h)|0)&1;i[a+21589>>0]=h;return}}function uf(a){a=a|0;i[a+21589>>0]=1;ye(a+6416|0);return}function vf(a,b,c){a=a|0;b=b|0;c=c|0;i[a+12>>0]=1;k[a+20>>2]=b;k[a+16>>2]=c;return}function wf(a){a=a|0;var b=0;Xf(a+40996|0);Ym(a|0,0,75200)|0;k[a+12>>2]=33554432;k[a+49716>>2]=0;k[a+49720>>2]=3;k[a+49708>>2]=0;k[a+49804>>2]=0;k[a+58772>>2]=4;b=a+50360|0;k[b>>2]=2147483647;k[b+4>>2]=2147483647;b=a+50368|0;k[b>>2]=2147483647;k[b+4>>2]=2147483647;k[a+49724>>2]=2;b=hi()|0;k[a+66976>>2]=b;k[a+16400>>2]=1;return}function xf(a){a=a|0;var b=0;Ym(a|0,0,75200)|0;k[a+12>>2]=33554432;k[a+49716>>2]=0;k[a+49720>>2]=3;k[a+49708>>2]=0;k[a+49804>>2]=0;k[a+58772>>2]=4;b=a+50360|0;k[b>>2]=2147483647;k[b+4>>2]=2147483647;b=a+50368|0;k[b>>2]=2147483647;k[b+4>>2]=2147483647;k[a+49724>>2]=2;b=hi()|0;k[a+66976>>2]=b;k[a+16400>>2]=1;return}function yf(a){a=a|0;Ym(a|0,0,75200)|0;Zf(a+40996|0);return}function zf(a){a=a|0;k[a>>2]=0;k[a+4>>2]=0;i[a+8>>0]=1;a=a+9|0;i[a>>0]=0;i[a+1>>0]=0;i[a+2>>0]=0;i[a+3>>0]=0;return}function Af(a){a=a|0;var b=0;b=r;r=r+80|0;k[b+64>>2]=0;k[b+68>>2]=0;k[b+72>>2]=7;k[a>>2]=8;b=a+4|0;k[b>>2]=(k[b>>2]|0)+1;k[a>>2]=8;k[b>>2]=(k[b>>2]|0)+1;a=xb(4)|0;k[a>>2]=8;ec(a|0,41672,0)}function Bf(a,b){a=a|0;b=b|0;var c=0;if((b|0)==255)if(!(i[a+8>>0]|0))return;else c=3;else if((b|0)==1)c=3;else if((b|0)==2){if((k[a>>2]|0)>>>0<2)k[a>>2]=2}else if((b|0)==3){if((k[a>>2]|0)!=11)k[a>>2]=3}else k[a>>2]=b;if((c|0)==3?(k[a>>2]|0)==0:0)k[a>>2]=b;c=a+4|0;k[c>>2]=(k[c>>2]|0)+1;c=xb(4)|0;k[c>>2]=b;ec(c|0,41672,0)}function Cf(a,b){a=a|0;b=b|0;var c=0;c=r;r=r+80|0;if(!(i[a+11>>0]|0)){k[c+68>>2]=0;k[c+72>>2]=10;k[c+64>>2]=1;k[c>>2]=b}if((k[a>>2]|0)>>>0<2)k[a>>2]=2;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;a=xb(4)|0;k[a>>2]=2;ec(a|0,41672,0)}function Df(a){a=a|0;return}function Ef(a,b){a=a|0;b=b|0;if((k[a>>2]|0)>>>0<2)k[a>>2]=2;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;a=xb(4)|0;k[a>>2]=2;ec(a|0,41672,0)}function Ff(a,b){a=a|0;b=b|0;return 0}function Gf(a,b,c){a=a|0;b=b|0;c=c|0;k[a>>2]=5;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;a=xb(4)|0;k[a>>2]=5;ec(a|0,41672,0)}function Hf(a,b,c){a=a|0;b=b|0;c=c|0;return 0}function If(a,b){a=a|0;b=b|0;var c=0;c=r;r=r+80|0;if(!(i[a+11>>0]|0)){k[c+68>>2]=0;k[c+72>>2]=11;k[c+64>>2]=1;k[c>>2]=b}if((k[a>>2]|0)>>>0<2)k[a>>2]=2;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;a=xb(4)|0;k[a>>2]=2;ec(a|0,41672,0)}function Jf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;a=r;r=r+4192|0;d=a+4112|0;f=a;e=a+16|0;k[f>>2]=c;dk(e,1024,b,f)|0;k[d+68>>2]=0;k[d+72>>2]=1;k[d+64>>2]=1;k[d>>2]=e;r=a;return}function Kf(a,b){a=a|0;b=b|0;if((b|0)==2){if((k[a>>2]|0)>>>0<2)k[a>>2]=2}else if((b|0)==3){if((k[a>>2]|0)!=11)k[a>>2]=3}else if(!((b|0)==255|(b|0)==1?(k[a>>2]|0)!=0:0))k[a>>2]=b;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;return}function Lf(a,b){a=a|0;b=b|0;var c=0,d=0;c=r;r=r+80|0;d=c;k[d+68>>2]=0;k[d+72>>2]=8;k[d>>2]=0;k[d+64>>2]=2;k[d+4>>2]=b;k[a>>2]=6;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;r=c;return}function Mf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=r;r=r+80|0;e=d;k[e+68>>2]=0;k[e+72>>2]=9;k[e>>2]=b;k[e+64>>2]=2;k[e+4>>2]=c;k[a>>2]=9;a=a+4|0;k[a>>2]=(k[a>>2]|0)+1;r=d;return}function Nf(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;a=r;r=r+80|0;d=a;k[d+68>>2]=0;k[d+72>>2]=31;k[d>>2]=b;k[d+64>>2]=2;k[d+4>>2]=c;if((k[8236]|0)>>>0<2)k[8236]=2;k[8237]=(k[8237]|0)+1;r=a;return}function Of(a){a=a|0;ig(a,1);k[a+16>>2]=0;return}function Pf(a){a=a|0;var b=0;b=k[a+16>>2]|0;if(b)Bk(b);jg(a);return}function Qf(a){a=a|0;var b=0;a=a+16|0;if(k[a>>2]|0)return;b=zk(262148)|0;k[a>>2]=b;return}function Rf(a,b,c){a=a|0;b=b|0;c=c|0;i[b>>0]=c;i[b+1>>0]=c>>>8;i[b+2>>0]=c>>>16;i[b+3>>0]=c>>>24;return}function Sf(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,m=0,n=0;n=r;r=r+16|0;h=n;m=a+20|0;i=b+56|0;k[m+0>>2]=k[i+0>>2];k[m+4>>2]=k[i+4>>2];k[m+8>>2]=k[i+8>>2];k[m+12>>2]=k[i+12>>2];k[m+16>>2]=k[i+16>>2];k[m+20>>2]=k[i+20>>2];k[m+24>>2]=k[i+24>>2];m=b+24|0;i=b+28|0;c=k[i>>2]|0;if(c>>>0<8192)if(!c)c=0;else j=3;else{c=8192;j=3}if((j|0)==3)_m((k[a+16>>2]|0)+245760|0,k[m>>2]|0,c|0)|0;g=k[b+44>>2]|0;d=8192-c|0;d=g>>>0<d>>>0?g:d;if(d)_m((k[a+16>>2]|0)+(c+245760)|0,k[b+40>>2]|0,d|0)|0;k[a+48>>2]=262144;k[a+52>>2]=0;c=k[b+16>>2]|0;if(!c)c=k[b>>2]|0;g=a+16|0;a:do if((k[b+20>>2]|0)>0){while(1){e=k[c>>2]|0;if((e|0)==40)break;else if((e|0)==22)break a;c=c+40|0}Tf(a,k[c+12>>2]|0)}while(0);a=k[g>>2]|0;d=(l[a+245793>>0]|0)<<8|(l[a+245792>>0]|0)|(l[a+245794>>0]|0)<<16&196608;c=(l[a+245789>>0]|0)<<8|(l[a+245788>>0]|0)|(l[a+245790>>0]|0)<<16&196608;f=(c+d|0)>>>0>262143;k[b+84>>2]=a+(f?0:d);k[b+88>>2]=f?0:c;c=k[m>>2]|0;if(c){ym(c);k[m>>2]=0;a=k[g>>2]|0}k[i>>2]=0;f=b+32|0;k[f>>2]=0;c=(l[a+245809>>0]|0)<<8|(l[a+245808>>0]|0)|(l[a+245810>>0]|0)<<16|(l[a+245811>>0]|0)<<24;do if(c>>>0<8128)if(c){c=c+64|0;k[i>>2]=c;if(!c){d=0;c=0;break}else{j=18;break}}else{r=n;return}else{k[i>>2]=8192;c=8192;j=18}while(0);if((j|0)==18){d=k[b+36>>2]|0;if((d|0)!=0&c>>>0>d>>>0){k[h>>2]=d;Jf(32944,53104,h);Af(32944);a=k[f>>2]|0;d=k[i>>2]|0;e=k[m>>2]|0}else{a=0;d=c;e=0}a=a+32+(a>>>2)|0;a=d>>>0>a>>>0?d:a;d=zm(e,a)|0;if(!d)Af(32944);k[m>>2]=d;k[f>>2]=a;a=k[g>>2]|0}_m(d|0,a+245760|0,c|0)|0;r=n;return}function Tf(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;switch(b|0){case 2:case 1:{c=k[a+36>>2]|0;m=k[a+44>>2]|0;if(c>>>0>245759|(c|0)<4)return;g=a+16|0;f=c+-4|0;if((f|0)<=0)return;a=(b|0)==2?233:232;j=0;c=k[g>>2]|0;while(1){h=c+1|0;z=i[c>>0]|0;b=j+1|0;if(z<<24>>24==-24|(z&255|0)==(a|0)){d=b+m|0;e=k[g>>2]|0;e=h>>>0>=e>>>0&h>>>0<(e+262144|0)>>>0;if(e)b=(l[c+2>>0]|0)<<8|(l[h>>0]|0)|(l[c+3>>0]|0)<<16|(l[c+4>>0]|0)<<24;else b=k[h>>2]|0;do if((b|0)<0){if((b+d|0)>-1){b=b+16777216|0;if(e){i[h>>0]=b;i[c+2>>0]=b>>>8;i[c+3>>0]=b>>>16;i[c+4>>0]=b>>>24;break}else{k[h>>2]=b;break}}}else if((b|0)<16777216){b=b-d|0;if(e){i[h>>0]=b;i[c+2>>0]=b>>>8;i[c+3>>0]=b>>>16;i[c+4>>0]=b>>>24;break}else{k[h>>2]=b;break}}while(0);b=j+5|0;c=c+5|0}else c=h;if((b|0)<(f|0))j=b;else break}return}case 4:{s=k[a+36>>2]|0;m=(k[a+20>>2]|0)+-3|0;c=k[a+24>>2]|0;n=k[a+16>>2]|0;i[n+245792>>0]=s;i[n+245793>>0]=s>>>8;i[n+245794>>0]=s>>>16;i[n+245795>>0]=s>>>24;if(s>>>0>122879|(m|0)<0|(c|0)<0)return;else{f=0;b=n;g=s}do{g=g+-1|0;e=(g>>>0)/3|0;if((f|0)<(s|0)){j=f;h=0;a=b;while(1){d=j-m|0;if((d|0)>2?(p=d+s|0,o=l[n+p>>0]|0,p=l[n+(p+-3)>>0]|0,r=o+h-p|0,z=r-h|0,z=(z|0)>-1?z:0-z|0,q=r-o|0,q=(q|0)>-1?q:0-q|0,r=r-p|0,r=(r|0)>-1?r:0-r|0,(z|0)>(q|0)|(z|0)>(r|0)):0)h=(q|0)>(r|0)?p:o;h=h-(l[a>>0]|0)|0;i[n+(j+s)>>0]=h;j=j+3|0;if((j|0)>=(s|0))break;else{h=h&255;a=a+1|0}}b=b+(e+1)|0}f=f+1|0}while((f|0)!=3);d=s+-2|0;if((c|0)>=(d|0))return;e=s+1|0;b=s+2|0;do{y=l[n+(e+c)>>0]|0;z=n+(c+s)|0;i[z>>0]=(l[z>>0]|0)+y;z=n+(b+c)|0;i[z>>0]=(l[z>>0]|0)+y;c=c+3|0}while((c|0)<(d|0));return}case 5:{y=k[a+36>>2]|0;z=k[a+20>>2]|0;w=k[a+16>>2]|0;i[w+245792>>0]=y;i[w+245793>>0]=y>>>8;i[w+245794>>0]=y>>>16;i[w+245795>>0]=y>>>24;if(y>>>0<122880&(z|0)>0){x=0;c=w}else return;do{if((x|0)<(y|0)){o=0;j=0;f=0;a=0;e=0;p=0;h=0;r=0;b=0;s=0;t=x;g=0;m=0;n=0;u=0;v=0;d=c;while(1){A=s;s=v-b|0;B=((ka(g,v)|0)+(u<<3)+(ka(m,s)|0)+(ka(n,A)|0)|0)>>>3&255;c=d+1|0;d=i[d>>0]|0;q=u;u=B-(d&255)|0;i[w+(t+y)>>0]=u;q=u-q<<24>>24;B=d<<24>>24<<3;d=(d<<24>>24>-1?B:0-B|0)+o|0;b=B-v|0;j=((b|0)>-1?b:0-b|0)+j|0;b=B+v|0;f=((b|0)>-1?b:0-b|0)+f|0;b=B-s|0;a=((b|0)>-1?b:0-b|0)+a|0;b=B+s|0;e=e+((b|0)>-1?b:0-b|0)|0;b=B-A|0;b=p+((b|0)>-1?b:0-b|0)|0;p=B+A|0;h=h+((p|0)>-1?p:0-p|0)|0;a:do if(!(r&31)){B=j>>>0<d>>>0;o=B?j:d;A=f>>>0<o>>>0;o=A?f:o;p=a>>>0<o>>>0;a=p?a:o;o=e>>>0<a>>>0;a=o?e:a;f=b>>>0<a>>>0;switch((h>>>0<(f?b:a)>>>0?6:f?5:o?4:p?3:A?2:B&1)|0){case 2:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;g=((g|0)<16&1)+g|0;break a}case 1:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;g=(((g|0)>-17)<<31>>31)+g|0;break a}case 4:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;m=((m|0)<16&1)+m|0;break a}case 5:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;n=(((n|0)>-17)<<31>>31)+n|0;break a}case 3:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;m=(((m|0)>-17)<<31>>31)+m|0;break a}case 6:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;n=((n|0)<16&1)+n|0;break a}default:{h=0;b=0;e=0;a=0;f=0;j=0;d=0;break a}}}while(0);t=t+z|0;if((t|0)>=(y|0))break;else{B=v;o=d;p=b;r=r+1|0;v=q;d=c;b=B}}}x=x+1|0}while((x|0)!=(z|0));return}case 6:{g=k[a+36>>2]|0;h=k[a+20>>2]|0;j=g<<1;f=a+16|0;B=k[f>>2]|0;i[B+245792>>0]=g;i[B+245793>>0]=g>>>8;i[B+245794>>0]=g>>>16;i[B+245795>>0]=g>>>24;if(g>>>0<122880&(h|0)>0){a=0;c=0}else return;do{d=a+g|0;if((d|0)<(j|0)){e=0;b=c;while(1){c=b+1|0;B=k[f>>2]|0;e=(e&255)-(l[B+b>>0]|0)|0;i[B+d>>0]=e;d=d+h|0;if((d|0)>=(j|0))break;else b=c}}a=a+1|0}while((a|0)!=(h|0));return}case 3:{c=k[a+36>>2]|0;if(c>>>0>245759|(c|0)<21)return;d=c+-21|0;if((d|0)<=0)return;e=0;f=k[a+16>>2]|0;b=(k[a+44>>2]|0)>>>4;while(1){c=((l[f>>0]|0)&31)+-16|0;if((c|0)>-1?(h=l[41752+c>>0]|0,(13263>>>c&1|0)!=0):0){c=0;do{if((1<<c&h|0)!=0?(j=c*41|0,B=j+42|0,A=(B|0)/8|0,(((l[f+(A+1)>>0]|0)<<8|(l[f+A>>0]|0)|(l[f+(A+2)>>0]|0)<<16|(l[f+(A+3)>>0]|0)<<24)>>>(B&7)&15|0)==5):0){y=j+18|0;B=(y|0)/8|0;y=y&7;t=f+B|0;s=l[t>>0]|0;v=f+(B+1)|0;u=l[v>>0]|0;x=f+(B+2)|0;w=l[x>>0]|0;B=f+(B+3)|0;z=l[B>>0]|0;A=~(1048575<<y);y=(((u<<8|s|w<<16|z<<24)>>>y)-b&1048575)<<y;i[t>>0]=y|s&A;i[v>>0]=y>>>8|u&A>>>8;i[x>>0]=y>>>16|w&A>>>16;i[B>>0]=y>>>24|z&A>>>24}c=c+1|0}while((c|0)!=3)}e=e+16|0;if((e|0)>=(d|0))break;else{f=f+16|0;b=b+1|0}}return}default:return}}function Uf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0;l=r;r=r+16|0;h=l;k[a+4>>2]=0;k[a>>2]=0;_m(k[a+12>>2]|0,b|0,(c>>>0<32768?c:32768)|0)|0;if(c>>>0>1){f=1;e=0;do{e=i[b+f>>0]^e;f=f+1|0}while((f|0)!=(c|0))}else e=0;kg(a,8);j=d+20|0;k[j>>2]=0;a:do if(e<<24>>24==(i[b>>0]|0)){a=~(Me(-1,b,c)|0);e=0;while(1){if((k[41684+(e*12|0)>>2]|0)==(a|0)?(k[41680+(e*12|0)>>2]|0)==(c|0):0)break;e=e+1|0;if(e>>>0>=6)break a}g=k[41688+(e*12|0)>>2]|0;b=d+4|0;e=(k[b>>2]|0)+1|0;k[b>>2]=e;c=d+8|0;f=k[c>>2]|0;if(e>>>0>f>>>0){a=k[d+12>>2]|0;if((a|0)!=0&e>>>0>a>>>0){k[h>>2]=a;Jf(32944,53104,h);Af(32944);f=k[c>>2]|0;e=k[b>>2]|0}a=f+32+(f>>>2)|0;a=e>>>0>a>>>0?e:a;e=zm(k[d>>2]|0,a*40|0)|0;if(!e)Af(32944);k[d>>2]=e;k[c>>2]=a}else e=k[d>>2]|0;h=k[j>>2]|0;k[j>>2]=h+1;k[e+(h*40|0)>>2]=40;c=e+(h*40|0)+12|0;k[c>>2]=g;k[e+(h*40|0)+20>>2]=c;k[e+(h*40|0)+36>>2]=e+(h*40|0)+28;k[e+(h*40|0)+24>>2]=3;k[e+(h*40|0)+8>>2]=3;r=l;return}while(0);b=d+4|0;e=(k[b>>2]|0)+1|0;k[b>>2]=e;c=d+8|0;f=k[c>>2]|0;if(e>>>0>f>>>0){a=k[d+12>>2]|0;if((a|0)!=0&e>>>0>a>>>0){k[h>>2]=a;Jf(32944,53104,h);Af(32944);f=k[c>>2]|0;e=k[b>>2]|0}a=f+32+(f>>>2)|0;e=e>>>0>a>>>0?e:a;a=zm(k[d>>2]|0,e*40|0)|0;if(!a)Af(32944);k[d>>2]=a;k[c>>2]=e}else a=k[d>>2]|0;h=k[j>>2]|0;f=h+1|0;k[j>>2]=f;k[a+(h*40|0)>>2]=22;k[a+(h*40|0)+20>>2]=a+(h*40|0)+12;k[a+(h*40|0)+36>>2]=a+(h*40|0)+28;k[a+(h*40|0)+24>>2]=3;k[a+(h*40|0)+8>>2]=3;if((h|0)>-1)b=0;else{r=l;return}do{e=a+(b*40|0)+20|0;if(!(k[e>>2]|0))k[e>>2]=a+(b*40|0)+12;e=a+(b*40|0)+36|0;if(!(k[e>>2]|0))k[e>>2]=a+(b*40|0)+28;b=b+1|0}while((b|0)<(f|0));r=l;return}function Vf(a){a=a|0;var b=0,c=0;b=lg(a)|0;c=b&49152;if((c|0)==32768){kg(a,2);c=lg(a)|0;kg(a,16);a=c;return a|0}else if(!c){kg(a,6);a=b>>>10&15;return a|0}else if((c|0)==16384)if(!(b&15360)){kg(a,14);a=b>>>2|-256;return a|0}else{kg(a,10);a=b>>>6&255;return a|0}else{kg(a,2);c=(lg(a)|0)<<16;kg(a,16);c=lg(a)|0|c;kg(a,16);a=c;return a|0}return 0}function Wf(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;if(b>>>0>=262144)return;a=(k[a+16>>2]|0)+b|0;if((a|0)==(c|0))return;b=262144-b|0;an(a|0,c|0,(b>>>0>d>>>0?d:b)|0)|0;return}function Xf(a){a=a|0;Ym(a|0,0,514)|0;return}function Yf(a,b){a=a|0;b=b|0;var c=0,d=0;if(!(k[b>>2]|0)){Ym(a|0,0,513)|0;return}i[a+512>>0]=1;c=(kk(b)|0)+1|0;_m(a|0,b|0,(c>>>0<128?c<<2:512)|0)|0;b=(eb()|0)+75|0;c=0;do{d=a+c|0;i[d>>0]=(l[d>>0]|0)^b+c;c=c+1|0}while((c|0)!=512);return}function Zf(a){a=a|0;var b=0;i[a+512>>0]=0;b=0;do{i[a+b>>0]=0;b=b+1|0}while((b|0)!=512);return}function _f(a,b){a=a|0;b=b|0;var c=0;if(!b)return;else c=0;do{i[a+c>>0]=0;c=c+1|0}while((c|0)!=(b|0));return}function $f(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;d=eb()|0;if(!b)return;d=d+75|0;c=0;do{e=a+c|0;i[e>>0]=(l[e>>0]|0)^d+c;c=c+1|0}while((c|0)!=(b|0));return}function ag(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;if(!(i[a+512>>0]|0)){k[b>>2]=0;return}e=c<<2;_m(b|0,a|0,(c>>>0>128?512:e)|0)|0;a=eb()|0;if(e){a=a+75|0;d=0;do{f=b+d|0;i[f>>0]=l[f>>0]^a+d;d=d+1|0}while((d|0)!=(e|0))}k[b+(c+-1<<2)>>2]=0;return}function bg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;f=r;r=r+1024|0;d=f+512|0;e=f;if(!(i[a+512>>0]|0))k[d>>2]=0;else{_m(d|0,a|0,512)|0;a=(eb()|0)+75|0;c=0;do{g=d+c|0;i[g>>0]=l[g>>0]^a+c;c=c+1|0}while((c|0)!=512);k[d+508>>2]=0}if(!(i[b+512>>0]|0))k[e>>2]=0;else{_m(e|0,b|0,512)|0;a=(eb()|0)+75|0;c=0;do{g=e+c|0;i[g>>0]=l[g>>0]^a+c;c=c+1|0}while((c|0)!=512);k[e+508>>2]=0}a=hk(d,e)|0;c=0;do{i[d+c>>0]=0;c=c+1|0}while((c|0)!=128);a=(a|0)==0;c=0;do{i[e+c>>0]=0;c=c+1|0}while((c|0)!=128);r=f;return a|0}function cg(a){a=a|0;if(!(i[41768]|0))dg(0);i[a>>0]=1;return}function dg(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0;h=r;r=r+768|0;g=h+256|0;f=h;a=0;b=1;while(1){e=b&255;i[g+a>>0]=e;i[g+(a+255)>>0]=e;i[f+b>>0]=a;b=b<<1^b^((b&128|0)!=0?283:0);if((b|0)==1){a=0;b=1;break}else a=a+1|0}while(1){i[46376+a>>0]=b;a=a+1|0;if((a|0)==30){e=0;break}else b=((b&128|0)!=0?283:0)^b<<1}do{if(!((e&255)<<24>>24))a=0;else a=l[g+((l[f+e>>0]|0)^255)>>0]|0;c=a<<1^a<<2^a<<3^a<<4;i[41768+e>>0]=a^99^c^c>>>8;a=e<<1^e<<3^e<<6;a=a^5^a>>>8;if((a&255)<<24>>24){a=i[g+((l[f+(a&255)>>0]|0)^255)>>0]|0;i[46120+e>>0]=a;if(!(a<<24>>24)){d=0;b=0;a=0}else{d=1;b=i[g+((l[f+(a&255)>>0]|0)+104)>>0]|0}}else{i[46120+e>>0]=0;d=0;b=0;a=0}i[45098+(e<<2)>>0]=b;i[44073+(e<<2)>>0]=b;i[43048+(e<<2)>>0]=b;i[42027+(e<<2)>>0]=b;c=a&255;i[49482+(c<<2)>>0]=b;i[48457+(c<<2)>>0]=b;i[47432+(c<<2)>>0]=b;i[46411+(c<<2)>>0]=b;if(d)a=i[g+((l[f+c>>0]|0)+199)>>0]|0;else a=0;i[45096+(e<<2)>>0]=a;i[44075+(e<<2)>>0]=a;i[43050+(e<<2)>>0]=a;i[42025+(e<<2)>>0]=a;i[49480+(c<<2)>>0]=a;i[48459+(c<<2)>>0]=a;i[47434+(c<<2)>>0]=a;i[46409+(c<<2)>>0]=a;if(d)a=i[g+((l[f+c>>0]|0)+238)>>0]|0;else a=0;i[45097+(e<<2)>>0]=a;i[44072+(e<<2)>>0]=a;i[43051+(e<<2)>>0]=a;i[42026+(e<<2)>>0]=a;i[49481+(c<<2)>>0]=a;i[48456+(c<<2)>>0]=a;i[47435+(c<<2)>>0]=a;i[46410+(c<<2)>>0]=a;if(d)a=i[g+((l[f+c>>0]|0)+223)>>0]|0;else a=0;i[45099+(e<<2)>>0]=a;i[44074+(e<<2)>>0]=a;i[43049+(e<<2)>>0]=a;i[42024+(e<<2)>>0]=a;i[49483+(c<<2)>>0]=a;i[48458+(c<<2)>>0]=a;i[47433+(c<<2)>>0]=a;i[46408+(c<<2)>>0]=a;e=e+1|0}while((e|0)!=256);r=h;return}function eg(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;j=r;r=r+32|0;h=j;if((d|0)==192){k[a+4>>2]=12;f=24;g=5}else if((d|0)==128){k[a+4>>2]=10;f=16;g=5}else if((d|0)==256){k[a+4>>2]=14;f=32;g=5}if((g|0)==5){d=0;do{i[(d&3)+(h+(d>>>2<<2))>>0]=i[c+d>>0]|0;d=d+1|0}while((d|0)!=(f|0))}if(!e){d=a+8|0;f=d+16|0;do{i[d>>0]=0;d=d+1|0}while((d|0)<(f|0))}else{i[a+8>>0]=i[e>>0]|0;i[a+9>>0]=i[e+1>>0]|0;i[a+10>>0]=i[e+2>>0]|0;i[a+11>>0]=i[e+3>>0]|0;i[a+12>>0]=i[e+4>>0]|0;i[a+13>>0]=i[e+5>>0]|0;i[a+14>>0]=i[e+6>>0]|0;i[a+15>>0]=i[e+7>>0]|0;i[a+16>>0]=i[e+8>>0]|0;i[a+17>>0]=i[e+9>>0]|0;i[a+18>>0]=i[e+10>>0]|0;i[a+19>>0]=i[e+11>>0]|0;i[a+20>>0]=i[e+12>>0]|0;i[a+21>>0]=i[e+13>>0]|0;i[a+22>>0]=i[e+14>>0]|0;i[a+23>>0]=i[e+15>>0]|0}fg(a,h);if(b){r=j;return}gg(a);r=j;return}function fg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;D=r;r=r+32|0;C=D;A=a+4|0;m=k[A>>2]|0;B=m+-6|0;d=C+0|0;b=b+0|0;c=d+32|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(c|0));z=(B|0)>0;a:do if(z){j=6-m|0;b=m;f=0;h=0;g=0;while(1){if((h|0)>(b|0)){e=h;c=g;break a}if((f|0)<(B|0)&(g|0)<4){b=j+f|0;e=g+-4|0;e=b>>>0>e>>>0?b:e;b=g-e|0;c=0-e|0;d=0;do{y=a+(h<<4)+(g+d<<2)+24|0;x=C+(f+d<<2)|0;x=l[x>>0]|l[x+1>>0]<<8|l[x+2>>0]<<16|l[x+3>>0]<<24;i[y>>0]=x;i[y+1>>0]=x>>8;i[y+2>>0]=x>>16;i[y+3>>0]=x>>24;d=d+1|0}while((d|0)!=(c|0));d=f-e|0}else{d=f;b=g}c=(b|0)==4;e=(c&1)+h|0;c=c?0:b;b=k[A>>2]|0;if((d|0)<(B|0)){f=d;h=e;g=c}else break}}else{b=m;e=0;c=0}while(0);if((e|0)>(b|0)){r=D;return}u=m+-7|0;o=C+(u<<2)+1|0;p=C+(u<<2)+2|0;q=C+1|0;s=C+(u<<2)+3|0;t=C+2|0;u=C+(u<<2)|0;v=C+3|0;w=(B|0)==8;x=(B|0)/2|0;y=(B|0)>1;n=6-m|0;m=0;do{j=i[C>>0]^i[41768+(l[o>>0]|0)>>0];i[C>>0]=j;g=i[q>>0]^i[41768+(l[p>>0]|0)>>0];i[q>>0]=g;f=i[t>>0]^i[41768+(l[s>>0]|0)>>0];i[t>>0]=f;d=i[v>>0]^i[41768+(l[u>>0]|0)>>0];i[v>>0]=d;j=j^i[46376+m>>0];m=m+1|0;i[C>>0]=j;if(w){h=g;g=1;do{E=C+(g<<2)|0;j=i[E>>0]^j;i[E>>0]=j;E=C+(g<<2)+1|0;h=i[E>>0]^h;i[E>>0]=h;E=C+(g<<2)+2|0;f=i[E>>0]^f;i[E>>0]=f;E=C+(g<<2)+3|0;d=i[E>>0]^d;i[E>>0]=d;g=g+1|0}while((g|0)<(x|0));f=x+-1|0;d=C+(x<<2)|0;j=i[d>>0]^i[41768+(l[C+(f<<2)>>0]|0)>>0];i[d>>0]=j;d=C+(x<<2)+1|0;g=i[d>>0]^i[41768+(l[C+(f<<2)+1>>0]|0)>>0];i[d>>0]=g;d=C+(x<<2)+2|0;h=i[d>>0]^i[41768+(l[C+(f<<2)+2>>0]|0)>>0];i[d>>0]=h;d=C+(x<<2)+3|0;f=i[d>>0]^i[41768+(l[C+(f<<2)+3>>0]|0)>>0];i[d>>0]=f;d=x+1|0;if((d|0)<8)do{E=C+(d<<2)|0;j=i[E>>0]^j;i[E>>0]=j;E=C+(d<<2)+1|0;g=i[E>>0]^g;i[E>>0]=g;E=C+(d<<2)+2|0;h=i[E>>0]^h;i[E>>0]=h;E=C+(d<<2)+3|0;f=i[E>>0]^f;i[E>>0]=f;d=d+1|0}while((d|0)!=8)}else if(y){h=g;g=1;do{E=C+(g<<2)|0;j=i[E>>0]^j;i[E>>0]=j;E=C+(g<<2)+1|0;h=i[E>>0]^h;i[E>>0]=h;E=C+(g<<2)+2|0;f=i[E>>0]^f;i[E>>0]=f;E=C+(g<<2)+3|0;d=i[E>>0]^d;i[E>>0]=d;g=g+1|0}while((g|0)!=(B|0))}b:do if(z){f=0;while(1){if((e|0)>(b|0))break b;if((f|0)<(B|0)&(c|0)<4){g=n+f|0;d=c+-4|0;d=g>>>0>d>>>0?g:d;g=c-d|0;b=0-d|0;j=0;do{E=a+(e<<4)+(c+j<<2)+24|0;h=C+(f+j<<2)|0;h=l[h>>0]|l[h+1>>0]<<8|l[h+2>>0]<<16|l[h+3>>0]<<24;i[E>>0]=h;i[E+1>>0]=h>>8;i[E+2>>0]=h>>16;i[E+3>>0]=h>>24;j=j+1|0}while((j|0)!=(b|0));j=f-d|0;c=g}else j=f;b=(c|0)==4;e=(b&1)+e|0;c=b?0:c;b=k[A>>2]|0;if((j|0)<(B|0))f=j;else break}}while(0)}while((e|0)<=(b|0));r=D;return}function gg(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;z=r;r=r+16|0;x=z;w=a+4|0;if((k[w>>2]|0)<=1){r=z;return}y=1;do{u=a+(y<<4)+24|0;b=i[a+(y<<4)+25>>0]|0;s=i[a+(y<<4)+26>>0]|0;t=i[a+(y<<4)+27>>0]|0;c=i[a+(y<<4)+28>>0]|0;d=i[a+(y<<4)+29>>0]|0;e=i[a+(y<<4)+30>>0]|0;f=i[a+(y<<4)+31>>0]|0;g=i[a+(y<<4)+32>>0]|0;h=i[a+(y<<4)+33>>0]|0;j=i[a+(y<<4)+34>>0]|0;l=i[a+(y<<4)+35>>0]|0;m=i[a+(y<<4)+36>>0]|0;n=i[a+(y<<4)+37>>0]|0;o=i[a+(y<<4)+38>>0]|0;p=i[a+(y<<4)+39>>0]|0;q=i[u>>0]|0;v=0;do{i[x+v>>0]=i[47432+((b&255)<<2)+v>>0]^i[46408+((q&255)<<2)+v>>0]^i[48456+((s&255)<<2)+v>>0]^i[49480+((t&255)<<2)+v>>0];i[x+v+4>>0]=i[47432+((d&255)<<2)+v>>0]^i[46408+((c&255)<<2)+v>>0]^i[48456+((e&255)<<2)+v>>0]^i[49480+((f&255)<<2)+v>>0];i[x+v+8>>0]=i[47432+((h&255)<<2)+v>>0]^i[46408+((g&255)<<2)+v>>0]^i[48456+((j&255)<<2)+v>>0]^i[49480+((l&255)<<2)+v>>0];i[x+v+12>>0]=i[47432+((n&255)<<2)+v>>0]^i[46408+((m&255)<<2)+v>>0]^i[48456+((o&255)<<2)+v>>0]^i[49480+((p&255)<<2)+v>>0];v=v+1|0}while((v|0)!=4);b=u+0|0;c=x+0|0;d=b+16|0;do{i[b>>0]=i[c>>0]|0;b=b+1|0;c=c+1|0}while((b|0)<(d|0));y=y+1|0}while((y|0)<(k[w>>2]|0));r=z;return}function hg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0;ua=r;r=r+48|0;ra=ua+32|0;sa=ua;ta=ua+16|0;if(!c){r=ua;return}g=c>>>4;qa=a+8|0;c=sa+0|0;e=qa+0|0;f=c+16|0;do{i[c>>0]=i[e>>0]|0;c=c+1|0;e=e+1|0}while((c|0)<(f|0));if(g){aa=a+4|0;la=ta+13|0;ma=ta+10|0;na=ta+7|0;oa=ra+1|0;pa=ra+2|0;y=ra+3|0;z=ra+4|0;A=ta+4|0;B=ta+1|0;C=ta+14|0;D=ta+11|0;E=ra+5|0;F=ra+6|0;G=ra+7|0;H=ra+8|0;I=ta+8|0;J=ta+5|0;K=ta+2|0;L=ta+15|0;M=ra+9|0;N=ra+10|0;O=ra+11|0;P=ra+12|0;Q=ta+12|0;R=ta+9|0;S=ta+6|0;T=ta+3|0;U=ra+13|0;V=ra+14|0;W=ra+15|0;X=sa+1|0;Y=sa+2|0;Z=sa+3|0;_=sa+4|0;$=sa+5|0;ba=sa+6|0;ca=sa+7|0;da=sa+8|0;ea=sa+9|0;fa=sa+10|0;ga=sa+11|0;ha=sa+12|0;ia=sa+13|0;ja=sa+14|0;ka=sa+15|0;while(1){c=k[aa>>2]|0;e=0;do{i[ta+e>>0]=i[a+(c<<4)+e+24>>0]^i[b+e>>0];e=e+1|0}while((e|0)!=16);c=l[ta>>0]|0;x=l[la>>0]|0;w=l[ma>>0]|0;v=l[na>>0]|0;i[ra>>0]=i[43048+(x<<2)>>0]^i[42024+(c<<2)>>0]^i[44072+(w<<2)>>0]^i[45096+(v<<2)>>0];i[oa>>0]=i[43049+(x<<2)>>0]^i[42025+(c<<2)>>0]^i[44073+(w<<2)>>0]^i[45097+(v<<2)>>0];i[pa>>0]=i[43050+(x<<2)>>0]^i[42026+(c<<2)>>0]^i[44074+(w<<2)>>0]^i[45098+(v<<2)>>0];i[y>>0]=i[43051+(x<<2)>>0]^i[42027+(c<<2)>>0]^i[44075+(w<<2)>>0]^i[45099+(v<<2)>>0];v=l[A>>0]|0;w=l[B>>0]|0;c=l[C>>0]|0;x=l[D>>0]|0;i[z>>0]=i[43048+(w<<2)>>0]^i[42024+(v<<2)>>0]^i[44072+(c<<2)>>0]^i[45096+(x<<2)>>0];i[E>>0]=i[43049+(w<<2)>>0]^i[42025+(v<<2)>>0]^i[44073+(c<<2)>>0]^i[45097+(x<<2)>>0];i[F>>0]=i[43050+(w<<2)>>0]^i[42026+(v<<2)>>0]^i[44074+(c<<2)>>0]^i[45098+(x<<2)>>0];i[G>>0]=i[43051+(w<<2)>>0]^i[42027+(v<<2)>>0]^i[44075+(c<<2)>>0]^i[45099+(x<<2)>>0];x=l[I>>0]|0;c=l[J>>0]|0;v=l[K>>0]|0;w=l[L>>0]|0;i[H>>0]=i[43048+(c<<2)>>0]^i[42024+(x<<2)>>0]^i[44072+(v<<2)>>0]^i[45096+(w<<2)>>0];i[M>>0]=i[43049+(c<<2)>>0]^i[42025+(x<<2)>>0]^i[44073+(v<<2)>>0]^i[45097+(w<<2)>>0];i[N>>0]=i[43050+(c<<2)>>0]^i[42026+(x<<2)>>0]^i[44074+(v<<2)>>0]^i[45098+(w<<2)>>0];i[O>>0]=i[43051+(c<<2)>>0]^i[42027+(x<<2)>>0]^i[44075+(v<<2)>>0]^i[45099+(w<<2)>>0];w=l[Q>>0]|0;v=l[R>>0]|0;x=l[S>>0]|0;c=l[T>>0]|0;i[P>>0]=i[43048+(v<<2)>>0]^i[42024+(w<<2)>>0]^i[44072+(x<<2)>>0]^i[45096+(c<<2)>>0];i[U>>0]=i[43049+(v<<2)>>0]^i[42025+(w<<2)>>0]^i[44073+(x<<2)>>0]^i[45097+(c<<2)>>0];i[V>>0]=i[43050+(v<<2)>>0]^i[42026+(w<<2)>>0]^i[44074+(x<<2)>>0]^i[45098+(c<<2)>>0];i[W>>0]=i[43051+(v<<2)>>0]^i[42027+(w<<2)>>0]^i[44075+(x<<2)>>0]^i[45099+(c<<2)>>0];c=(k[aa>>2]|0)+-1|0;if((c|0)>1){do{e=0;do{i[ta+e>>0]=i[a+(c<<4)+e+24>>0]^i[ra+e>>0];e=e+1|0}while((e|0)!=16);x=l[ta>>0]|0;w=l[la>>0]|0;v=l[ma>>0]|0;u=l[na>>0]|0;i[ra>>0]=i[43048+(w<<2)>>0]^i[42024+(x<<2)>>0]^i[44072+(v<<2)>>0]^i[45096+(u<<2)>>0];i[oa>>0]=i[43049+(w<<2)>>0]^i[42025+(x<<2)>>0]^i[44073+(v<<2)>>0]^i[45097+(u<<2)>>0];i[pa>>0]=i[43050+(w<<2)>>0]^i[42026+(x<<2)>>0]^i[44074+(v<<2)>>0]^i[45098+(u<<2)>>0];i[y>>0]=i[43051+(w<<2)>>0]^i[42027+(x<<2)>>0]^i[44075+(v<<2)>>0]^i[45099+(u<<2)>>0];u=l[A>>0]|0;v=l[B>>0]|0;x=l[C>>0]|0;w=l[D>>0]|0;i[z>>0]=i[43048+(v<<2)>>0]^i[42024+(u<<2)>>0]^i[44072+(x<<2)>>0]^i[45096+(w<<2)>>0];i[E>>0]=i[43049+(v<<2)>>0]^i[42025+(u<<2)>>0]^i[44073+(x<<2)>>0]^i[45097+(w<<2)>>0];i[F>>0]=i[43050+(v<<2)>>0]^i[42026+(u<<2)>>0]^i[44074+(x<<2)>>0]^i[45098+(w<<2)>>0];i[G>>0]=i[43051+(v<<2)>>0]^i[42027+(u<<2)>>0]^i[44075+(x<<2)>>0]^i[45099+(w<<2)>>0];w=l[I>>0]|0;x=l[J>>0]|0;u=l[K>>0]|0;v=l[L>>0]|0;i[H>>0]=i[43048+(x<<2)>>0]^i[42024+(w<<2)>>0]^i[44072+(u<<2)>>0]^i[45096+(v<<2)>>0];i[M>>0]=i[43049+(x<<2)>>0]^i[42025+(w<<2)>>0]^i[44073+(u<<2)>>0]^i[45097+(v<<2)>>0];i[N>>0]=i[43050+(x<<2)>>0]^i[42026+(w<<2)>>0]^i[44074+(u<<2)>>0]^i[45098+(v<<2)>>0];i[O>>0]=i[43051+(x<<2)>>0]^i[42027+(w<<2)>>0]^i[44075+(u<<2)>>0]^i[45099+(v<<2)>>0];v=l[Q>>0]|0;u=l[R>>0]|0;w=l[S>>0]|0;x=l[T>>0]|0;i[P>>0]=i[43048+(u<<2)>>0]^i[42024+(v<<2)>>0]^i[44072+(w<<2)>>0]^i[45096+(x<<2)>>0];i[U>>0]=i[43049+(u<<2)>>0]^i[42025+(v<<2)>>0]^i[44073+(w<<2)>>0]^i[45097+(x<<2)>>0];i[V>>0]=i[43050+(u<<2)>>0]^i[42026+(v<<2)>>0]^i[44074+(w<<2)>>0]^i[45098+(x<<2)>>0];i[W>>0]=i[43051+(u<<2)>>0]^i[42027+(v<<2)>>0]^i[44075+(w<<2)>>0]^i[45099+(x<<2)>>0];c=c+-1|0}while((c|0)>1);c=0}else c=0;do{i[ta+c>>0]=i[a+c+40>>0]^i[ra+c>>0];c=c+1|0}while((c|0)!=16);e=i[46120+(l[la>>0]|0)>>0]|0;f=i[46120+(l[ma>>0]|0)>>0]|0;h=i[46120+(l[na>>0]|0)>>0]|0;j=i[46120+(l[A>>0]|0)>>0]|0;m=i[46120+(l[B>>0]|0)>>0]|0;n=i[46120+(l[C>>0]|0)>>0]|0;o=i[46120+(l[D>>0]|0)>>0]|0;p=i[46120+(l[I>>0]|0)>>0]|0;q=i[46120+(l[J>>0]|0)>>0]|0;s=i[46120+(l[K>>0]|0)>>0]|0;t=i[46120+(l[L>>0]|0)>>0]|0;u=i[46120+(l[Q>>0]|0)>>0]|0;v=i[46120+(l[R>>0]|0)>>0]|0;w=i[46120+(l[S>>0]|0)>>0]|0;x=i[46120+(l[T>>0]|0)>>0]|0;c=i[a+24>>0]^i[46120+(l[ta>>0]|0)>>0];i[ra>>0]=c;e=i[a+25>>0]^e;i[oa>>0]=e;f=i[a+26>>0]^f;i[pa>>0]=f;h=i[a+27>>0]^h;i[y>>0]=h;j=i[a+28>>0]^j;i[z>>0]=j;m=i[a+29>>0]^m;i[E>>0]=m;n=i[a+30>>0]^n;i[F>>0]=n;o=i[a+31>>0]^o;i[G>>0]=o;p=i[a+32>>0]^p;i[H>>0]=p;q=i[a+33>>0]^q;i[M>>0]=q;s=i[a+34>>0]^s;i[N>>0]=s;t=i[a+35>>0]^t;i[O>>0]=t;u=i[a+36>>0]^u;i[P>>0]=u;v=i[a+37>>0]^v;i[U>>0]=v;w=i[a+38>>0]^w;i[V>>0]=w;x=i[a+39>>0]^x;i[W>>0]=x;if(i[a>>0]|0){c=i[sa>>0]^c;i[ra>>0]=c;i[oa>>0]=i[X>>0]^e;i[pa>>0]=i[Y>>0]^f;i[y>>0]=i[Z>>0]^h;i[z>>0]=i[_>>0]^j;i[E>>0]=i[$>>0]^m;i[F>>0]=i[ba>>0]^n;i[G>>0]=i[ca>>0]^o;i[H>>0]=i[da>>0]^p;i[M>>0]=i[ea>>0]^q;i[N>>0]=i[fa>>0]^s;i[O>>0]=i[ga>>0]^t;i[P>>0]=i[ha>>0]^u;i[U>>0]=i[ia>>0]^v;i[V>>0]=i[ja>>0]^w;i[W>>0]=i[ka>>0]^x}i[sa>>0]=i[b>>0]|0;i[X>>0]=i[b+1>>0]|0;i[Y>>0]=i[b+2>>0]|0;i[Z>>0]=i[b+3>>0]|0;i[_>>0]=i[b+4>>0]|0;i[$>>0]=i[b+5>>0]|0;i[ba>>0]=i[b+6>>0]|0;i[ca>>0]=i[b+7>>0]|0;i[da>>0]=i[b+8>>0]|0;i[ea>>0]=i[b+9>>0]|0;i[fa>>0]=i[b+10>>0]|0;i[ga>>0]=i[b+11>>0]|0;i[ha>>0]=i[b+12>>0]|0;i[ia>>0]=i[b+13>>0]|0;i[ja>>0]=i[b+14>>0]|0;i[ka>>0]=i[b+15>>0]|0;i[d>>0]=c;i[d+1>>0]=i[oa>>0]|0;i[d+2>>0]=i[pa>>0]|0;i[d+3>>0]=i[y>>0]|0;i[d+4>>0]=i[z>>0]|0;i[d+5>>0]=i[E>>0]|0;i[d+6>>0]=i[F>>0]|0;i[d+7>>0]=i[G>>0]|0;i[d+8>>0]=i[H>>0]|0;i[d+9>>0]=i[M>>0]|0;i[d+10>>0]=i[N>>0]|0;i[d+11>>0]=i[O>>0]|0;i[d+12>>0]=i[P>>0]|0;i[d+13>>0]=i[U>>0]|0;i[d+14>>0]=i[V>>0]|0;i[d+15>>0]=i[W>>0]|0;g=g+-1|0;if(!g)break;else{d=d+16|0;b=b+16|0}}}c=qa+0|0;e=sa+0|0;f=c+16|0;do{i[c>>0]=i[e>>0]|0;c=c+1|0;e=e+1|0}while((c|0)<(f|0));r=ua;return}function ig(a,b){a=a|0;b=b|0;i[a+8>>0]=0;if(b){b=zk(32771)|0;k[a+12>>2]=b;Ym(b|0,0,32771)|0;return}else{k[a+12>>2]=0;return}}function jg(a){a=a|0;if(i[a+8>>0]|0)return;a=k[a+12>>2]|0;if(!a)return;Bk(a);return}function kg(a,b){a=a|0;b=b|0;var c=0;c=a+4|0;b=(k[c>>2]|0)+b|0;k[a>>2]=(b>>>3)+(k[a>>2]|0);k[c>>2]=b&7;return}function lg(a){a=a|0;var b=0,c=0;b=k[a>>2]|0;c=k[a+12>>2]|0;return ((l[c+(b+1)>>0]|0)<<8|(l[c+b>>0]|0)<<16|(l[c+(b+2)>>0]|0))>>>(8-(k[a+4>>2]|0)|0)&65535|0}function mg(a,b){a=a|0;b=b|0;var c=0,d=0;c=a+12|0;d=k[c>>2]|0;a=a+8|0;if((d|0)!=0?(i[a>>0]|0)==0:0)Bk(d);k[c>>2]=b;i[a>>0]=1;return}
function Dh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;D=r;r=r+1056|0;m=D+1028|0;C=D;A=a+4|0;c=k[A>>2]|0;B=a+120|0;d=k[B>>2]|0;if((c|0)>(d+-25|0)){b=d-c|0;if((b|0)<0){a=0;r=D;return a|0}h=a+136|0;g=a+128|0;k[g>>2]=(k[h>>2]|0)-c+(k[g>>2]|0);if((c|0)>16384){if((b|0)>0){z=k[a+16>>2]|0;an(z|0,z+c|0,b|0)|0}k[A>>2]=0;k[B>>2]=b}else b=d;if((b|0)!=32768){c=pf(k[a>>2]|0,(k[a+16>>2]|0)+b|0,32768-b|0)|0;b=k[B>>2]|0;if((c|0)>0){b=b+c|0;k[B>>2]=b;f=c}else f=c}else{b=32768;f=0}d=b+-30|0;e=a+124|0;k[e>>2]=d;c=k[A>>2]|0;k[h>>2]=c;b=k[g>>2]|0;if((b|0)!=-1){z=c+-1+b|0;k[e>>2]=(d|0)<(z|0)?d:z}if((f|0)==-1){a=0;r=D;return a|0}}x=a+16|0;g=k[x>>2]|0;y=a+8|0;f=k[y>>2]|0;e=((l[g+(c+1)>>0]|0)<<8|(l[g+c>>0]|0)<<16|(l[g+(c+2)>>0]|0))>>>(8-f|0);d=e&32768;z=a+38728|0;k[z>>2]=d;if(!(e&16384))Ym(a+37700|0,0,1028)|0;w=f+2|0;b=(w>>>3)+c|0;k[A>>2]=b;c=w&7;k[y>>2]=c;if(!d)w=374;else{d=(e>>>12&3)+1|0;k[a+38732>>2]=d;e=a+38736|0;if((k[e>>2]|0)>=(d|0))k[e>>2]=0;b=((c+2|0)>>>3)+b|0;k[A>>2]=b;c=f+4&7;k[y>>2]=c;w=d*257|0}e=0;do{i[m+e>>0]=((l[g+(b+1)>>0]|0)<<8|(l[g+b>>0]|0)<<16|(l[g+(b+2)>>0]|0))>>>(8-c|0)>>>12&15;v=c+4|0;b=(v>>>3)+b|0;k[A>>2]=b;c=v&7;k[y>>2]=c;e=e+1|0}while((e|0)!=19);v=a+15428|0;Gh(0,m,v,19);q=a+136|0;s=a+128|0;t=a+124|0;u=a+15560|0;b=k[A>>2]|0;d=k[B>>2]|0;e=0;a:while(1){o=(e|0)<(w|0);p=(e|0)>0;f=d;c=d;while(1){if(!o){m=51;break a}if((b|0)>(c+-5|0)){g=c-b|0;if((g|0)<0){b=0;m=57;break a}k[s>>2]=(k[q>>2]|0)-b+(k[s>>2]|0);if((b|0)>16384){if((g|0)>0){h=k[x>>2]|0;an(h|0,h+b|0,g|0)|0}k[A>>2]=0;k[B>>2]=g;d=g;c=g}else d=f;if((c|0)!=32768){g=pf(k[a>>2]|0,(k[x>>2]|0)+c|0,32768-c|0)|0;b=k[B>>2]|0;if((g|0)>0){c=b+g|0;k[B>>2]=c;d=c}else{d=b;c=b}}else{c=32768;g=0}f=c+-30|0;k[t>>2]=f;b=k[A>>2]|0;k[q>>2]=b;h=k[s>>2]|0;if((h|0)!=-1){h=b+-1+h|0;k[t>>2]=(f|0)<(h|0)?f:h}if((g|0)==-1){b=0;m=57;break a}}else d=f;n=k[x>>2]|0;f=k[y>>2]|0;h=((l[n+(b+1)>>0]|0)<<8|(l[n+b>>0]|0)<<16|(l[n+(b+2)>>0]|0))>>>(8-f|0)&65534;g=k[u>>2]|0;if(h>>>0<(k[a+(g<<2)+15432>>2]|0)>>>0){g=h>>>(16-g|0);h=(l[a+g+15564>>0]|0)+f|0;b=(h>>>3)+b|0;k[A>>2]=b;h=h&7;k[y>>2]=h;g=a+(g<<1)+16588|0}else{do{g=g+1|0;if(g>>>0>=15){g=15;break}}while(h>>>0>=(k[a+(g<<2)+15432>>2]|0)>>>0);f=g+f|0;b=(f>>>3)+b|0;k[A>>2]=b;f=f&7;k[y>>2]=f;g=((h-(k[a+(g+-1<<2)+15432>>2]|0)|0)>>>(16-g|0))+(k[a+(g<<2)+15496>>2]|0)|0;g=a+((g>>>0>=(k[v>>2]|0)>>>0?0:g)<<1)+18636|0;h=f}m=j[g>>1]|0;if((m&65535)<16){c=m;m=43;break}if(m<<16>>16!=16){g=h;c=n;f=d;d=m;m=48;break}f=i[n+b>>0]|0;g=i[n+(b+1)>>0]|0;m=i[n+(b+2)>>0]|0;n=h+2|0;b=(n>>>3)+b|0;k[A>>2]=b;k[y>>2]=n&7;if(p){c=m;m=46;break}else f=d}if((m|0)==43){i[C+e>>0]=(l[a+e+37700>>0]|0)+(c&65535)&15;e=e+1|0;continue}else if((m|0)==46){p=((g&255)<<8|(f&255)<<16|c&255)>>>(8-h|0)>>>14&3;c=-3-p|0;p=((c|0)>-1?-4-c|0:-3)-p|0;c=e-w|0;c=e-(p>>>0>c>>>0?p:c)|0;while(1){i[C+e>>0]=i[C+(e+-1)>>0]|0;e=e+1|0;if((e|0)==(c|0)){e=c;continue a}}}else if((m|0)==48){c=((l[c+(b+1)>>0]|0)<<8|(l[c+b>>0]|0)<<16|(l[c+(b+2)>>0]|0))>>>(8-g|0)&65535;if(d<<16>>16==17){d=g+3|0;c=(c>>>13)+3|0}else{d=g+7|0;c=(c>>>9)+11|0}b=(d>>>3)+b|0;k[A>>2]=b;k[y>>2]=d&7;d=e-w|0;p=0-c|0;p=~(c+((p|0)>-1?p:-1));p=d>>>0>p>>>0?d:p;Ym(C+e|0,0,0-p|0)|0;d=f;e=e-p|0;continue}}if((m|0)==51){if((c|0)<(b|0)){a=1;r=D;return a|0}if(k[z>>2]|0){b=a+38732|0;if((k[b>>2]|0)>0){c=0;do{Gh(0,C+(c*257|0)|0,a+(c*3820|0)+22420|0,257);c=c+1|0}while((c|0)<(k[b>>2]|0))}}else{Gh(0,C,a+148|0,298);Gh(0,C+298|0,a+3968|0,48);Gh(0,C+346|0,a+11608|0,28)}_m(a+37700|0,C|0,1028)|0;a=1;r=D;return a|0}else if((m|0)==57){r=D;return b|0}return 0}function Eh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=k[a+38736>>2]|0;t=a+(y*92|0)+38828|0;k[t>>2]=(k[t>>2]|0)+1;w=a+(y*92|0)+38772|0;j=k[w>>2]|0;l=a+(y*92|0)+38776|0;k[l>>2]=j;n=a+(y*92|0)+38768|0;i=k[n>>2]|0;k[w>>2]=i;w=a+(y*92|0)+38780|0;e=k[w>>2]|0;u=a+(y*92|0)+38764|0;g=e-(k[u>>2]|0)|0;k[n>>2]=g;k[u>>2]=e;u=a+(y*92|0)+38832|0;n=a+(y*92|0)+38744|0;s=(ka(k[n>>2]|0,e)|0)+(k[u>>2]<<3)|0;o=a+(y*92|0)+38748|0;s=s+(ka(g,k[o>>2]|0)|0)|0;p=a+(y*92|0)+38752|0;s=s+(ka(i,k[p>>2]|0)|0)|0;q=a+(y*92|0)+38756|0;s=s+(ka(j,k[q>>2]|0)|0)|0;r=a+(y*92|0)+38760|0;v=a+38740|0;s=((s+(ka(k[v>>2]|0,k[r>>2]|0)|0)|0)>>>3&255)-b|0;b=b<<24;x=b>>21;c=a+(y*92|0)+38784|0;k[c>>2]=(k[c>>2]|0)+((b|0)>-2097152?x:0-x|0);b=x-e|0;d=a+(y*92|0)+38788|0;k[d>>2]=((b|0)>-1?b:0-b|0)+(k[d>>2]|0);b=e+x|0;e=a+(y*92|0)+38792|0;k[e>>2]=((b|0)>-1?b:0-b|0)+(k[e>>2]|0);b=x-g|0;f=a+(y*92|0)+38796|0;k[f>>2]=((b|0)>-1?b:0-b|0)+(k[f>>2]|0);b=g+x|0;g=a+(y*92|0)+38800|0;k[g>>2]=((b|0)>-1?b:0-b|0)+(k[g>>2]|0);b=x-i|0;h=a+(y*92|0)+38804|0;k[h>>2]=((b|0)>-1?b:0-b|0)+(k[h>>2]|0);b=i+x|0;i=a+(y*92|0)+38808|0;k[i>>2]=((b|0)>-1?b:0-b|0)+(k[i>>2]|0);b=x-j|0;j=a+(y*92|0)+38812|0;k[j>>2]=((b|0)>-1?b:0-b|0)+(k[j>>2]|0);b=(k[l>>2]|0)+x|0;l=a+(y*92|0)+38816|0;k[l>>2]=((b|0)>-1?b:0-b|0)+(k[l>>2]|0);b=x-(k[v>>2]|0)|0;m=a+(y*92|0)+38820|0;k[m>>2]=((b|0)>-1?b:0-b|0)+(k[m>>2]|0);x=(k[v>>2]|0)+x|0;b=a+(y*92|0)+38824|0;k[b>>2]=((x|0)>-1?x:0-x|0)+(k[b>>2]|0);a=s-(k[u>>2]|0)<<24>>24;k[w>>2]=a;k[v>>2]=a;k[u>>2]=s;if(k[t>>2]&31){y=s&255;return y|0}u=k[c>>2]|0;k[c>>2]=0;v=k[d>>2]|0;y=v>>>0<u>>>0;u=y?v:u;k[d>>2]=0;v=k[e>>2]|0;x=v>>>0<u>>>0;u=x?v:u;k[e>>2]=0;v=k[f>>2]|0;w=v>>>0<u>>>0;u=w?v:u;k[f>>2]=0;f=k[g>>2]|0;v=f>>>0<u>>>0;f=v?f:u;k[g>>2]=0;g=k[h>>2]|0;u=g>>>0<f>>>0;f=u?g:f;k[h>>2]=0;g=k[i>>2]|0;t=g>>>0<f>>>0;f=t?g:f;k[i>>2]=0;g=k[j>>2]|0;a=g>>>0<f>>>0;f=a?g:f;k[j>>2]=0;g=k[l>>2]|0;h=g>>>0<f>>>0;f=h?g:f;k[l>>2]=0;g=k[m>>2]|0;l=g>>>0<f>>>0;k[m>>2]=0;y=(k[b>>2]|0)>>>0<(l?g:f)>>>0?10:l?9:h?8:a?7:t?6:u?5:v?4:w?3:x?2:y&1;k[b>>2]=0;do switch(y|0){case 6:{b=k[p>>2]|0;if((b|0)>=16){y=s&255;return y|0}k[p>>2]=b+1;y=s&255;return y|0}case 10:{b=k[r>>2]|0;if((b|0)>=16){y=s&255;return y|0}k[r>>2]=b+1;y=s&255;return y|0}case 4:{b=k[o>>2]|0;if((b|0)>=16){y=s&255;return y|0}k[o>>2]=b+1;y=s&255;return y|0}case 7:{b=k[q>>2]|0;if((b|0)<=-17){y=s&255;return y|0}k[q>>2]=b+-1;y=s&255;return y|0}case 2:{b=k[n>>2]|0;if((b|0)>=16){y=s&255;return y|0}k[n>>2]=b+1;y=s&255;return y|0}case 8:{b=k[q>>2]|0;if((b|0)>=16){y=s&255;return y|0}k[q>>2]=b+1;y=s&255;return y|0}case 9:{b=k[r>>2]|0;if((b|0)<=-17){y=s&255;return y|0}k[r>>2]=b+-1;y=s&255;return y|0}case 1:{b=k[n>>2]|0;if((b|0)<=-17){y=s&255;return y|0}k[n>>2]=b+-1;y=s&255;return y|0}case 5:{b=k[p>>2]|0;if((b|0)<=-17){y=s&255;return y|0}k[p>>2]=b+-1;y=s&255;return y|0}case 3:{b=k[o>>2]|0;if((b|0)<=-17){y=s&255;return y|0}k[o>>2]=b+-1;y=s&255;return y|0}default:{y=s&255;return y|0}}while(0);return 0}function Fh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0;g=a+4|0;h=k[g>>2]|0;if((k[a+120>>2]|0)<(h+5|0))return;if(!(k[a+38728>>2]|0)){e=k[a+16>>2]|0;c=a+8|0;d=k[c>>2]|0;e=(l[e+(h+1)>>0]<<8|l[e+h>>0]<<16|l[e+(h+2)>>0])>>>(8-d|0)&65534;b=k[a+280>>2]|0;if(e>>>0<(k[a+(b<<2)+152>>2]|0)>>>0){b=e>>>(16-b|0);f=(l[a+b+284>>0]|0)+d|0;k[g>>2]=(f>>>3)+h;k[c>>2]=f&7;b=a+(b<<1)+1308|0}else{do{b=b+1|0;if(b>>>0>=15){b=15;break}}while(e>>>0>=(k[a+(b<<2)+152>>2]|0)>>>0);f=b+d|0;k[g>>2]=(f>>>3)+h;k[c>>2]=f&7;b=((e-(k[a+(b+-1<<2)+152>>2]|0)|0)>>>(16-b|0))+(k[a+(b<<2)+216>>2]|0)|0;b=a+((b>>>0>=(k[a+148>>2]|0)>>>0?0:b)<<1)+3356|0}if((j[b>>1]|0)!=269)return;Dh(a)|0;return}else{e=k[a+38736>>2]|0;f=k[a+16>>2]|0;c=a+8|0;d=k[c>>2]|0;f=(l[f+(h+1)>>0]<<8|l[f+h>>0]<<16|l[f+(h+2)>>0])>>>(8-d|0)&65534;b=k[a+(e*3820|0)+22552>>2]|0;if(f>>>0<(k[a+(e*3820|0)+(b<<2)+22424>>2]|0)>>>0){b=f>>>(16-b|0);f=(l[a+(e*3820|0)+b+22556>>0]|0)+d|0;k[g>>2]=(f>>>3)+h;k[c>>2]=f&7;b=a+(e*3820|0)+(b<<1)+23580|0}else{do{b=b+1|0;if(b>>>0>=15){b=15;break}}while(f>>>0>=(k[a+(e*3820|0)+(b<<2)+22424>>2]|0)>>>0);d=b+d|0;k[g>>2]=(d>>>3)+h;k[c>>2]=d&7;b=((f-(k[a+(e*3820|0)+(b+-1<<2)+22424>>2]|0)|0)>>>(16-b|0))+(k[a+(e*3820|0)+(b<<2)+22488>>2]|0)|0;b=a+(e*3820|0)+((b>>>0>=(k[a+(e*3820|0)+22420>>2]|0)>>>0?0:b)<<1)+25628|0}if((j[b>>1]|0)!=256)return;Dh(a)|0;return}}function Gh(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,m=0,n=0,o=0,p=0,q=0,s=0;q=r;r=r+128|0;m=q+64|0;o=q;k[c>>2]=d;e=m+0|0;g=e+64|0;do{k[e>>2]=0;e=e+4|0}while((e|0)<(g|0));n=(d|0)==0;if(!n){a=0;do{h=m+(((l[b+a>>0]|0)&15)<<2)|0;k[h>>2]=(k[h>>2]|0)+1;a=a+1|0}while((a|0)!=(d|0))}k[m>>2]=0;Ym(c+3208|0,0,d<<1|0)|0;h=c+68|0;k[h>>2]=0;k[c+4>>2]=0;g=0;e=0;f=1;a=0;while(1){s=g;g=k[m+(f<<2)>>2]|0;a=g+a|0;k[c+(f<<2)+4>>2]=a<<16-f;e=s+e|0;k[c+(f<<2)+68>>2]=e;f=f+1|0;if((f|0)==16)break;else a=a<<1}e=o+0|0;a=h+0|0;g=e+64|0;do{k[e>>2]=k[a>>2];e=e+4|0;a=a+4|0}while((e|0)<(g|0));if(!n){e=0;do{a=(l[b+e>>0]|0)&15;if(a){s=o+(a<<2)|0;n=k[s>>2]|0;j[c+(n<<1)+3208>>1]=e;k[s>>2]=n+1}e=e+1|0}while((e|0)!=(d|0));if((d|0)==299|(d|0)==298|(d|0)==306){k[c+132>>2]=10;a=10}else p=11}else p=11;if((p|0)==11){k[c+132>>2]=7;a=7}h=c+132|0;m=1<<a;e=0;f=1;while(1){g=e<<16-a;a=f;while(1)if(a>>>0<16?g>>>0>=(k[c+(a<<2)+4>>2]|0)>>>0:0)a=a+1|0;else{f=a;break}i[c+e+136>>0]=f;a=((g-(k[c+(f+-1<<2)+4>>2]|0)|0)>>>(16-f|0))+(k[c+(f<<2)+68>>2]|0)|0;if(a>>>0<d>>>0)a=j[c+(a<<1)+3208>>1]|0;else a=0;j[c+(e<<1)+1160>>1]=a;e=e+1|0;if(e>>>0>=m>>>0)break;a=k[h>>2]|0}r=q;return}function Hh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0;if(!(k[13051]|0)){c=0;o=0;p=0;while(1){while(1){if((c|0)!=17)break;c=c+1|0}d=1<<c;e=k[52520+(c<<2)>>2]|0;n=(e|0)>1?e:1;Ym(52456+p|0,c&255|0,n|0)|0;f=o;o=o+(n<<c)|0;g=0;h=p;while(1){k[52200+(h<<2)>>2]=f;g=g+1|0;if((g|0)>=(e|0))break;else{f=f+d|0;h=h+1|0}}c=c+1|0;if((c|0)==19)break;else p=p+n|0}}U=a+19544|0;i[U>>0]=1;V=a+19528|0;do if(!(i[V>>0]|0)){if(b)c=1;else{Ym(a+148|0,0,19100)|0;c=a+59100|0;d=a+84|0;e=d+36|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));c=k[c>>2]|0;k[a+19248>>2]=(c>>>0<4194304?c:4194304)&k[a+59104>>2];c=a+68|0;d=k[c>>2]|0;if(d){ym(d);k[c>>2]=0}k[a+72>>2]=0;k[a+76>>2]=0;c=0}p=a+8|0;k[p>>2]=0;g=a+4|0;k[g>>2]=0;h=a+19536|0;o=h;k[o>>2]=0;k[o+4>>2]=0;o=a+120|0;k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;k[o+12>>2]=0;k[o+16>>2]=0;k[o+20>>2]=0;k[o+24>>2]=0;k[a+128>>2]=-1;if(c){d=0;e=0}else{k[a+38736>>2]=0;k[a+38740>>2]=0;k[a+38728>>2]=0;k[a+38732>>2]=1;Ym(a+38744|0,0,368)|0;Ym(a+22420|0,0,16308)|0;i[a+58972>>0]=0;Ym(a+58564|0,0,404)|0;k[a+58560>>2]=2;k[a+58968>>2]=0;Nh(a);d=k[o>>2]|0;e=k[g>>2]|0}c=d-e|0;if((c|0)<0)return;if((e|0)>16384){if((c|0)>0){Q=k[a+16>>2]|0;an(Q|0,Q+e|0,c|0)|0}k[g>>2]=0;k[o>>2]=c}else c=d;f=a+16|0;c=pf(k[a>>2]|0,(k[f>>2]|0)+c|0,32768-c|0)|0;d=k[o>>2]|0;if((c|0)<=0){k[a+124>>2]=d+-30;if((c|0)==-1)return}else{Q=d+c|0;k[o>>2]=Q;k[a+124>>2]=Q+-30}if(b?(i[a+58972>>0]|0)!=0:0){S=a;break}if(Ih(a)|0)S=a;else return}else{o=a+120|0;f=a+16|0;S=a;p=a+8|0;h=a+19536|0;g=a+4|0}while(0);A=a+59104|0;B=a+112|0;C=a+124|0;D=a+116|0;E=a+58968|0;F=a+39120|0;G=a+58560|0;H=a+19252|0;I=a+280|0;J=a+4100|0;K=a+92|0;L=a+96|0;M=a+88|0;N=a+84|0;O=a+104|0;P=a+39116|0;Q=a+39112|0;R=a+7920|0;u=a+7788|0;v=a+3968|0;w=a+11740|0;x=a+11608|0;T=a+58972|0;y=a+148|0;z=a+19520|0;t=0;a:while(1){k[B>>2]=k[B>>2]&k[A>>2];d=k[g>>2]|0;do if((d|0)>(k[C>>2]|0)){e=k[o>>2]|0;c=e-d|0;if((c|0)<0)break a;if((d|0)>16384){if((c|0)>0){s=k[f>>2]|0;an(s|0,s+d|0,c|0)|0}k[g>>2]=0;k[o>>2]=c}else c=e;c=pf(k[S>>2]|0,(k[f>>2]|0)+c|0,32768-c|0)|0;d=k[o>>2]|0;if((c|0)<=0){k[C>>2]=d+-30;if((c|0)==-1)break a;else break}else{s=d+c|0;k[o>>2]=s;k[C>>2]=s+-30;break}}while(0);r=k[D>>2]|0;s=k[B>>2]|0;if(!((r|0)==(s|0)?1:(r-s&k[A>>2])>>>0>259)){Jh(a);r=h;b=k[r+4>>2]|0;s=z;q=k[s+4>>2]|0;if((b|0)>(q|0)|((b|0)==(q|0)?(k[r>>2]|0)>>>0>(k[s>>2]|0)>>>0:0)){W=113;break}if(i[V>>0]|0){W=40;break}}if((k[E>>2]|0)==1){c=kh(F)|0;if((c|0)==-1){W=43;break}b:do if((c|0)==(k[G>>2]|0))switch(kh(F)|0){case -1:{W=46;break a}case 0:if(Ih(a)|0){s=t;t=s;continue a}else break a;case 4:{c=0;e=0;while(1){d=kh(F)|0;if((d|0)==-1){W=50;break a}if((e|0)==3){W=53;break}c=d&255|c<<8;if((e|0)>2){d=t;break}else e=e+1|0}if((W|0)==53){W=0;d=d&255}ai(a,d+32|0,c+2|0);t=d;continue a}case 5:{c=kh(F)|0;if((c|0)==-1){W=56;break a}ai(a,c+4|0,1);s=t;t=s;continue a}case 3:if(Kh(a)|0){s=t;t=s;continue a}else break a;case 2:break a;default:break b}while(0);s=k[B>>2]|0;k[B>>2]=s+1;i[(k[H>>2]|0)+s>>0]=c;s=t;t=s;continue}d=k[g>>2]|0;s=k[f>>2]|0;e=k[p>>2]|0;n=(l[s+(d+1)>>0]<<8|l[s+d>>0]<<16|l[s+(d+2)>>0])>>>(8-e|0)&65534;c=k[I>>2]|0;if(n>>>0<(k[a+(c<<2)+152>>2]|0)>>>0){c=n>>>(16-c|0);e=(l[a+c+284>>0]|0)+e|0;d=(e>>>3)+d|0;k[g>>2]=d;e=e&7;k[p>>2]=e;c=a+(c<<1)+1308|0}else{do{c=c+1|0;if(c>>>0>=15){c=15;break}}while(n>>>0>=(k[a+(c<<2)+152>>2]|0)>>>0);e=c+e|0;d=(e>>>3)+d|0;k[g>>2]=d;e=e&7;k[p>>2]=e;c=((n-(k[a+(c+-1<<2)+152>>2]|0)|0)>>>(16-c|0))+(k[a+(c<<2)+216>>2]|0)|0;c=a+((c>>>0>=(k[y>>2]|0)>>>0?0:c)<<1)+3356|0}c=j[c>>1]|0;b=c&65535;if((c&65535)<256){s=k[B>>2]|0;k[B>>2]=s+1;i[(k[H>>2]|0)+s>>0]=c;s=t;t=s;continue}if((c&65535)<=270)if((b|0)==256){c=(l[s+(d+1)>>0]<<8|l[s+d>>0]<<16|l[s+(d+2)>>0])>>>(8-e|0);if(!(c&32768)){W=94;break}s=e+1|0;k[g>>2]=(s>>>3)+d;k[p>>2]=s&7;i[T>>0]=0;if(Ih(a)|0){s=t;t=s;continue}else break}else if((b|0)==257)if(Lh(a)|0){s=t;t=s;continue}else break;else if((b|0)==258){c=k[O>>2]|0;if(!c){s=t;t=s;continue}ai(a,c,k[N>>2]|0);s=t;t=s;continue}else{if((c&65535)>=263){q=b+-263|0;r=l[52608+q>>0]|0;s=(l[52600+q>>0]|0)+1+(((l[s+(d+1)>>0]<<8|l[s+d>>0]<<16|l[s+(d+2)>>0])>>>(8-e|0)&65535)>>>(16-r|0))|0;r=e+r|0;k[g>>2]=(r>>>3)+d;k[p>>2]=r&7;k[L>>2]=k[K>>2];k[K>>2]=k[M>>2];k[M>>2]=k[N>>2];k[N>>2]=s;k[O>>2]=2;ai(a,2,s);s=t;t=s;continue}c=b+-259|0;q=k[a+(c<<2)+84>>2]|0;if((c|0)>0){do{s=c;c=c+-1|0;k[a+(s<<2)+84>>2]=k[a+(c<<2)+84>>2]}while((c|0)>0);b=k[f>>2]|0;d=k[g>>2]|0;e=k[p>>2]|0}else b=s;k[N>>2]=q;n=(l[b+(d+1)>>0]<<8|l[b+d>>0]<<16|l[b+(d+2)>>0])>>>(8-e|0)&65534;c=k[w>>2]|0;if(n>>>0<(k[a+(c<<2)+11612>>2]|0)>>>0){c=n>>>(16-c|0);n=(l[a+c+11744>>0]|0)+e|0;e=(n>>>3)+d|0;k[g>>2]=e;n=n&7;k[p>>2]=n;c=a+(c<<1)+12768|0}else{do{c=c+1|0;if(c>>>0>=15){c=15;break}}while(n>>>0>=(k[a+(c<<2)+11612>>2]|0)>>>0);s=c+e|0;e=(s>>>3)+d|0;k[g>>2]=e;s=s&7;k[p>>2]=s;c=((n-(k[a+(c+-1<<2)+11612>>2]|0)|0)>>>(16-c|0))+(k[a+(c<<2)+11676>>2]|0)|0;c=a+((c>>>0>=(k[x>>2]|0)>>>0?0:c)<<1)+14816|0;n=s}s=m[c>>1]|0;c=(l[52136+s>>0]|0)+2|0;d=l[52168+s>>0]|0;if((s+-8|0)>>>0<20){c=(((l[b+(e+1)>>0]<<8|l[b+e>>0]<<16|l[b+(e+2)>>0])>>>(8-n|0)&65535)>>>(16-d|0))+c|0;s=n+d|0;k[g>>2]=(s>>>3)+e;k[p>>2]=s&7}k[O>>2]=c;ai(a,c,q);s=t;t=s;continue}n=b+-271|0;c=(l[52136+n>>0]|0)+3|0;n=l[52168+n>>0]|0;if((b+-279|0)>>>0<20){c=(((l[s+(d+1)>>0]<<8|l[s+d>>0]<<16|l[s+(d+2)>>0])>>>(8-e|0)&65535)>>>(16-n|0))+c|0;e=e+n|0;d=(e>>>3)+d|0;k[g>>2]=d;e=e&7;k[p>>2]=e}b=(l[s+(d+1)>>0]<<8|l[s+d>>0]<<16|l[s+(d+2)>>0])>>>(8-e|0)&65534;n=k[J>>2]|0;if(b>>>0<(k[a+(n<<2)+3972>>2]|0)>>>0){b=b>>>(16-n|0);r=(l[a+b+4104>>0]|0)+e|0;q=(r>>>3)+d|0;k[g>>2]=q;r=r&7;k[p>>2]=r;d=a+(b<<1)+5128|0}else{do{n=n+1|0;if(n>>>0>=15){n=15;break}}while(b>>>0>=(k[a+(n<<2)+3972>>2]|0)>>>0);r=n+e|0;q=(r>>>3)+d|0;k[g>>2]=q;r=r&7;k[p>>2]=r;d=((b-(k[a+(n+-1<<2)+3972>>2]|0)|0)>>>(16-n|0))+(k[a+(n<<2)+4036>>2]|0)|0;d=a+((d>>>0>=(k[v>>2]|0)>>>0?0:d)<<1)+7176|0}e=j[d>>1]|0;n=e&65535;d=(k[52200+(n<<2)>>2]|0)+1|0;n=i[52456+n>>0]|0;b=n&255;do if(n<<24>>24){if((e&65535)<=9){d=(((l[s+(q+1)>>0]<<8|l[s+q>>0]<<16|l[s+(q+2)>>0])>>>(8-r|0)&65535)>>>(16-b|0))+d|0;s=r+b|0;k[g>>2]=(s>>>3)+q;k[p>>2]=s&7;break}if((n&255)>4){n=(((l[s+(q+1)>>0]<<8|l[s+q>>0]<<16|l[s+(q+2)>>0])>>>(8-r|0)&65535)>>>(20-b|0)<<4)+d|0;r=b+-4+r|0;q=(r>>>3)+q|0;k[g>>2]=q;r=r&7;k[p>>2]=r}else n=d;d=k[P>>2]|0;if((d|0)>0){k[P>>2]=d+-1;d=(k[Q>>2]|0)+n|0;break}e=(l[s+(q+1)>>0]<<8|l[s+q>>0]<<16|l[s+(q+2)>>0])>>>(8-r|0)&65534;d=k[R>>2]|0;if(e>>>0<(k[a+(d<<2)+7792>>2]|0)>>>0){d=e>>>(16-d|0);s=(l[a+d+7924>>0]|0)+r|0;k[g>>2]=(s>>>3)+q;k[p>>2]=s&7;d=a+(d<<1)+8948|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(e>>>0>=(k[a+(d<<2)+7792>>2]|0)>>>0);s=d+r|0;k[g>>2]=(s>>>3)+q;k[p>>2]=s&7;d=((e-(k[a+(d+-1<<2)+7792>>2]|0)|0)>>>(16-d|0))+(k[a+(d<<2)+7856>>2]|0)|0;d=a+((d>>>0>=(k[u>>2]|0)>>>0?0:d)<<1)+10996|0}s=j[d>>1]|0;d=s&65535;if(s<<16>>16==16){k[P>>2]=15;d=(k[Q>>2]|0)+n|0;break}else{k[Q>>2]=d;d=d+n|0;break}}while(0);if(d>>>0>8191)c=(d>>>0>262143?2:1)+c|0;k[L>>2]=k[K>>2];k[K>>2]=k[M>>2];k[M>>2]=k[N>>2];k[N>>2]=d;k[O>>2]=c;ai(a,c,d);s=t;t=s}if((W|0)==40){i[U>>0]=0;return}else if((W|0)==43){ih(F);k[E>>2]=0}else if((W|0)==46){ih(F);k[E>>2]=0}else if((W|0)==50){ih(F);k[E>>2]=0}else if((W|0)==56){ih(F);k[E>>2]=0}else if((W|0)==94){W=e+2|0;k[g>>2]=(W>>>3)+d;k[p>>2]=W&7;i[T>>0]=c>>>14&1^1}else if((W|0)==113)return;Jh(a);return}function Ih(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0;w=r;r=r+432|0;f=w+404|0;v=w;t=a+4|0;c=k[t>>2]|0;u=a+120|0;d=k[u>>2]|0;do if((c|0)>(d+-25|0)){e=a+4|0;b=d-c|0;if((b|0)<0){a=0;r=w;return a|0}if((c|0)>16384){if((b|0)>0){s=k[a+16>>2]|0;an(s|0,s+c|0,b|0)|0}k[e>>2]=0;k[u>>2]=b}else b=d;b=pf(k[a>>2]|0,(k[a+16>>2]|0)+b|0,32768-b|0)|0;c=k[u>>2]|0;if((b|0)>0){s=c+b|0;k[u>>2]=s;k[a+124>>2]=s+-30;break}k[a+124>>2]=c+-30;if((b|0)==-1){a=0;r=w;return a|0}}while(0);s=a+8|0;kg(t,0-(k[s>>2]|0)&7);b=lg(t)|0;c=a+58968|0;if(b&32768){k[c>>2]=1;a=jh(a+39120|0,a,a+58560|0)|0;r=w;return a|0}k[c>>2]=0;k[a+39112>>2]=0;k[a+39116>>2]=0;if(!(b&16384))Ym(a+58564|0,0,404)|0;kg(t,2);b=0;do{c=(lg(t)|0)>>>12;kg(t,4);do if((c&255|0)==15){c=(lg(t)|0)>>>12;kg(t,4);if(!(c&255)){i[f+b>>0]=15;break}if(b>>>0<20){p=c&255;q=-2-p|0;p=((q|0)>-1?-3-q|0:-2)-p|0;q=b+-20|0;q=p>>>0>q>>>0?p:q;Ym(f+b|0,0,0-q|0)|0;b=b-q|0}b=b+-1|0}else i[f+b>>0]=c;while(0);b=b+1|0}while(b>>>0<20);q=a+15428|0;Gh(0,f,q,20);m=a+4|0;n=a+16|0;o=a+124|0;p=a+15560|0;b=0;a:while(1){g=(b|0)<404;h=(b|0)>0;while(1){if(!g){c=53;break a}c=k[t>>2]|0;d=k[u>>2]|0;do if((c|0)>(d+-5|0)){e=d-c|0;if((e|0)<0){b=0;c=55;break a}if((c|0)>16384){if((e|0)>0){f=k[n>>2]|0;an(f|0,f+c|0,e|0)|0}k[m>>2]=0;k[u>>2]=e}else e=d;e=pf(k[a>>2]|0,(k[n>>2]|0)+e|0,32768-e|0)|0;c=k[u>>2]|0;if((e|0)<=0){k[o>>2]=c+-30;if((e|0)==-1){b=0;c=55;break a}else break}else{f=c+e|0;k[u>>2]=f;k[o>>2]=f+-30;break}}while(0);c=k[t>>2]|0;f=k[n>>2]|0;d=k[s>>2]|0;f=((l[f+(c+1)>>0]|0)<<8|(l[f+c>>0]|0)<<16|(l[f+(c+2)>>0]|0))>>>(8-d|0)&65534;e=k[p>>2]|0;if(f>>>0<(k[a+(e<<2)+15432>>2]|0)>>>0){e=f>>>(16-e|0);f=(l[a+e+15564>>0]|0)+d|0;k[t>>2]=(f>>>3)+c;k[s>>2]=f&7;e=a+(e<<1)+16588|0}else{do{e=e+1|0;if(e>>>0>=15){e=15;break}}while(f>>>0>=(k[a+(e<<2)+15432>>2]|0)>>>0);d=e+d|0;k[t>>2]=(d>>>3)+c;k[s>>2]=d&7;e=((f-(k[a+(e+-1<<2)+15432>>2]|0)|0)>>>(16-e|0))+(k[a+(e<<2)+15496>>2]|0)|0;e=a+((e>>>0>=(k[q>>2]|0)>>>0?0:e)<<1)+18636|0}e=j[e>>1]|0;if((e&65535)<16){c=42;break}if((e&65535)>=18){c=50;break}c=lg(t)|0;if(e<<16>>16==16){kg(t,3);e=(c>>>13)+3|0}else{kg(t,7);e=(c>>>9)+11|0}if(h){c=48;break}}if((c|0)==42){i[v+b>>0]=(l[a+b+58564>>0]|0)+(e&65535)&15;b=b+1|0;continue}else if((c|0)==48){h=0-e|0;h=~(e+((h|0)>-1?h:-1));e=b+-404|0;e=b-(e>>>0<h>>>0?h:e)|0;while(1){i[v+b>>0]=i[v+(b+-1)>>0]|0;b=b+1|0;if((b|0)==(e|0)){b=e;continue a}}}else if((c|0)==50){c=lg(t)|0;if(e<<16>>16==18){kg(t,3);e=(c>>>13)+3|0}else{kg(t,7);e=(c>>>9)+11|0}f=0-e|0;f=~(e+((f|0)>-1?f:-1));h=b+-404|0;h=h>>>0<f>>>0?f:h;Ym(v+b|0,0,0-h|0)|0;b=b-h|0;continue}}if((c|0)==53){i[a+58972>>0]=1;if((k[t>>2]|0)>(k[u>>2]|0)){a=0;r=w;return a|0}Gh(0,v,a+148|0,299);Gh(0,v+299|0,a+3968|0,60);Gh(0,v+359|0,a+7788|0,17);Gh(0,v+376|0,a+11608|0,28);_m(a+58564|0,v|0,404)|0;a=1;r=w;return a|0}else if((c|0)==55){r=w;return b|0}return 0}function Jh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;J=r;r=r+16|0;C=J;I=a+116|0;b=k[I>>2]|0;E=a+112|0;B=a+59104|0;F=a+59068|0;e=k[F>>2]|0;f=k[E>>2]|0;a:do if(!e)c=f;else{g=k[B>>2]|0;G=a+59064|0;u=a+59100|0;w=a+58976|0;x=a+19252|0;y=a+59048|0;z=a+19530|0;A=a+19536|0;h=g;c=f;d=0;g=f-b&g;b:while(1){p=k[(k[G>>2]|0)+(d<<2)>>2]|0;do if(p){f=p+12|0;if(i[f>>0]|0){i[f>>0]=0;f=h;break}q=k[p>>2]|0;f=k[p+4>>2]|0;if((h&q-b)>>>0<g>>>0){if((q|0)==(b|0)){c=h;e=g}else{Oh(a,b,q);e=k[B>>2]|0;c=e;e=(k[E>>2]|0)-q&e;b=q}if(f>>>0>e>>>0)break b;b=c&f+q;if((b+-1|0)>>>0<q>>>0){o=(k[u>>2]|0)-q|0;Wf(w,0,(k[x>>2]|0)+q|0,o);Wf(w,o,k[x>>2]|0,b)}else Wf(w,0,(k[x>>2]|0)+q|0,f);m=k[(k[y>>2]|0)+(k[p+16>>2]<<2)>>2]|0;l=p+20|0;o=m+44|0;n=m+48|0;e=k[n>>2]|0;if(e>>>0>64){j=p+44|0;h=p+52|0;c=k[h>>2]|0;g=p+48|0;k[g>>2]=e;if(c>>>0<e>>>0){f=k[p+56>>2]|0;if((f|0)!=0&f>>>0<e>>>0){k[C>>2]=f;Jf(32944,53104,C);Af(32944);c=k[h>>2]|0;e=k[g>>2]|0}c=c+32+(c>>>2)|0;c=e>>>0>c>>>0?e:c;e=zm(k[j>>2]|0,c)|0;if(!e)Af(32944);k[j>>2]=e;k[h>>2]=c}else e=k[j>>2]|0;_m(e+64|0,(k[o>>2]|0)+64|0,(k[n>>2]|0)+-64|0)|0}else g=p+48|0;if((k[g>>2]|0)!=0?(h=k[A>>2]|0,k[p+100>>2]=h,s=p+44|0,Rf(w,(k[s>>2]|0)+36|0,h),Rf(w,(k[s>>2]|0)+40|0,k[A+4>>2]|0),Sf(w,l),s=k[g>>2]|0,s>>>0>64):0){if((k[n>>2]|0)>>>0<s>>>0?(t=m+52|0,v=k[t>>2]|0,k[n>>2]=s,v>>>0<s>>>0):0){e=k[m+56>>2]|0;if((e|0)!=0&e>>>0<s>>>0){k[C>>2]=e;Jf(32944,53104,C);Af(32944);c=k[t>>2]|0;e=k[n>>2]|0}else{c=v;e=s}c=c+32+(c>>>2)|0;e=e>>>0>c>>>0?e:c;c=zm(k[o>>2]|0,e)|0;if(!c)Af(32944);k[o>>2]=c;k[t>>2]=e}_m((k[o>>2]|0)+64|0,(k[p+44>>2]|0)+64|0,(k[g>>2]|0)+-64|0)|0}else{e=k[o>>2]|0;if(e){ym(e);k[o>>2]=0}k[n>>2]=0;k[m+52>>2]=0}g=k[p+104>>2]|0;c=k[p+108>>2]|0;e=k[G>>2]|0;f=k[e+(d<<2)>>2]|0;if(f){e=k[f+60>>2]|0;if(e)ym(e);e=k[f+44>>2]|0;if(e)ym(e);e=k[f+20>>2]|0;if(e)ym(e);Ak(f);e=k[G>>2]|0}k[e+(d<<2)>>2]=0;e=d+1|0;c:do if(e>>>0<(k[F>>2]|0)>>>0){f=g;while(1){p=k[(k[G>>2]|0)+(e<<2)>>2]|0;if(!p)break c;if((k[p>>2]|0)!=(q|0))break c;if((k[p+4>>2]|0)!=(c|0))break c;if(i[p+12>>0]|0)break c;Wf(w,0,f,c);m=k[(k[y>>2]|0)+(k[p+16>>2]<<2)>>2]|0;l=p+20|0;o=m+44|0;n=m+48|0;c=k[n>>2]|0;if(c>>>0>64){f=p+44|0;j=p+52|0;d=k[j>>2]|0;h=p+48|0;k[h>>2]=c;if(d>>>0<c>>>0){g=k[p+56>>2]|0;if((g|0)!=0&g>>>0<c>>>0){k[C>>2]=g;Jf(32944,53104,C);Af(32944);d=k[j>>2]|0;c=k[h>>2]|0}d=d+32+(d>>>2)|0;d=c>>>0>d>>>0?c:d;c=zm(k[f>>2]|0,d)|0;if(!c)Af(32944);k[f>>2]=c;k[j>>2]=d}else c=k[f>>2]|0;_m(c+64|0,(k[o>>2]|0)+64|0,(k[n>>2]|0)+-64|0)|0}else h=p+48|0;do if(!(k[h>>2]|0))D=71;else{f=k[A>>2]|0;k[p+100>>2]=f;c=p+44|0;Rf(w,(k[c>>2]|0)+36|0,f);Rf(w,(k[c>>2]|0)+40|0,k[A+4>>2]|0);Sf(w,l);c=k[h>>2]|0;if(c>>>0<=64){D=71;break}do if((k[n>>2]|0)>>>0<c>>>0){g=m+52|0;f=k[g>>2]|0;k[n>>2]=c;if(f>>>0>=c>>>0)break;d=k[m+56>>2]|0;if((d|0)!=0&d>>>0<c>>>0){k[C>>2]=d;Jf(32944,53104,C);Af(32944);d=k[g>>2]|0;c=k[n>>2]|0}else d=f;d=d+32+(d>>>2)|0;c=c>>>0>d>>>0?c:d;d=zm(k[o>>2]|0,c)|0;if(!d)Af(32944);k[o>>2]=d;k[g>>2]=c}while(0);_m((k[o>>2]|0)+64|0,(k[p+44>>2]|0)+64|0,(k[h>>2]|0)+-64|0)|0}while(0);if((D|0)==71){D=0;c=k[o>>2]|0;if(c){ym(c);k[o>>2]=0}k[n>>2]=0;k[m+52>>2]=0}f=k[p+104>>2]|0;g=k[p+108>>2]|0;c=k[G>>2]|0;d=k[c+(e<<2)>>2]|0;if(d){c=k[d+60>>2]|0;if(c)ym(c);c=k[d+44>>2]|0;if(c)ym(c);c=k[d+20>>2]|0;if(c)ym(c);Ak(d);c=k[G>>2]|0}k[c+(e<<2)>>2]=0;c=e+1|0;if(c>>>0<(k[F>>2]|0)>>>0){d=e;e=c;c=g}else{c=g;d=e;break}}}else f=g;while(0);qf(k[a>>2]|0,f,c);i[z>>0]=1;g=A;g=Vm(k[g>>2]|0,k[g+4>>2]|0,c|0,0)|0;q=A;k[q>>2]=g;k[q+4>>2]=O;q=k[E>>2]|0;g=k[B>>2]|0;e=k[F>>2]|0;f=g;c=q;g=q-b&g}else f=h}else f=h;while(0);d=d+1|0;if(d>>>0>=e>>>0)break a;else h=f}f=k[F>>2]|0;if(d>>>0>=f>>>0){H=b;k[I>>2]=H;r=J;return}e=k[G>>2]|0;do{c=k[e+(d<<2)>>2]|0;if((c|0)!=0?(H=c+12|0,(i[H>>0]|0)!=0):0)i[H>>0]=0;d=d+1|0}while(d>>>0<f>>>0);k[I>>2]=b;r=J;return}while(0);Oh(a,b,c);H=k[E>>2]|0;k[I>>2]=H;r=J;return}function Kh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0;g=a+39120|0;h=kh(g)|0;if((h|0)==-1){ih(g);k[a+58968>>2]=0;h=0;return h|0}b=h&7;c=b+1|0;do if((b|0)==6){b=kh(g)|0;if((b|0)!=-1){c=b+7|0;f=12;break}ih(g);k[a+58968>>2]=0;h=0;return h|0}else if((b|0)==7){b=kh(g)|0;if((b|0)==-1){ih(g);k[a+58968>>2]=0;h=0;return h|0}c=kh(g)|0;if((c|0)!=-1){c=c+(b<<8)|0;f=12;break}ih(g);k[a+58968>>2]=0;h=0;return h|0}else f=13;while(0);if((f|0)==12)if(!c){b=0;c=0;f=19}else f=13;a:do if((f|0)==13){b=zm(0,c>>>0>32?c:32)|0;if(!b){Af(32944);b=0}if((c|0)>0){e=0;while(1){d=kh(g)|0;if((d|0)==-1)break;i[b+e>>0]=d;e=e+1|0;if((e|0)>=(c|0)){f=19;break a}}ih(g);k[a+58968>>2]=0;c=0}else f=19}while(0);if((f|0)==19)c=Mh(a,h,b,c)|0;if(!b){h=c;return h|0}ym(b);h=c;return h|0}function Lh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;o=a+4|0;b=k[o>>2]|0;q=a+16|0;e=k[q>>2]|0;p=a+8|0;f=k[p>>2]|0;d=((l[e+(b+1)>>0]|0)<<8|(l[e+b>>0]|0)<<16|(l[e+(b+2)>>0]|0))>>>(8-f|0)>>>8;r=d&255;f=f+8|0;b=(f>>>3)+b|0;k[o>>2]=b;f=f&7;k[p>>2]=f;d=d&7;c=d+1|0;if((d|0)==6){n=b+1|0;c=(((l[e+n>>0]|0)<<8|(l[e+b>>0]|0)<<16|(l[e+(b+2)>>0]|0))>>>(8-f|0)>>>8&255)+7|0;k[o>>2]=n;k[p>>2]=f;n=4}else if((d|0)==7){n=b+2|0;c=((l[e+(b+1)>>0]|0)<<8|(l[e+b>>0]|0)<<16|(l[e+n>>0]|0))>>>(8-f|0)&65535;k[o>>2]=n;k[p>>2]=f;if(!c){b=0;c=0;n=20}else n=4}else n=4;a:do if((n|0)==4){b=zm(0,c>>>0>32?c:32)|0;if(!b){Af(32944);b=0}if((c|0)>0){g=a+120|0;h=c+-1|0;j=a+124|0;f=k[g>>2]|0;d=k[o>>2]|0;m=0;while(1){if((d|0)<(f+-1|0))e=f;else{e=f-d|0;if((e|0)<0){d=1;e=f}else{if((d|0)>16384){if((e|0)>0){f=k[q>>2]|0;an(f|0,f+d|0,e|0)|0}k[o>>2]=0;k[g>>2]=e}else e=f;d=pf(k[a>>2]|0,(k[q>>2]|0)+e|0,32768-e|0)|0;e=k[g>>2]|0;if((d|0)>0){e=e+d|0;k[g>>2]=e}k[j>>2]=e+-30;d=(d|0)==-1}if(d&(m|0)<(h|0)){c=0;break a}d=k[o>>2]|0}s=k[q>>2]|0;f=k[p>>2]|0;i[b+m>>0]=((l[s+(d+1)>>0]|0)<<8|(l[s+d>>0]|0)<<16|(l[s+(d+2)>>0]|0))>>>(8-f|0)>>>8;f=f+8|0;d=(f>>>3)+d|0;k[o>>2]=d;k[p>>2]=f&7;m=m+1|0;if((m|0)>=(c|0)){n=20;break}else f=e}}else n=20}while(0);if((n|0)==20)c=Mh(a,r,b,c)|0;if(!b)return c|0;ym(b);return c|0}function Mh(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;z=r;r=r+16|0;w=z;y=a+59032|0;k[a+59036>>2]=0;k[y>>2]=0;_m(k[a+59044>>2]|0,c|0,((d|0)>32768?32768:d)|0)|0;v=a+58976|0;Qf(v);do if(b&128){c=Vf(y)|0;if(!c){Nh(a);f=a+59052|0;c=a+59084|0;d=k[f>>2]|0;g=0;break}else{g=c+-1|0;o=6;break}}else{g=k[a+59096>>2]|0;o=6}while(0);if((o|0)==6){f=a+59052|0;d=k[f>>2]|0;if(g>>>0>d>>>0){y=0;r=z;return y|0}c=a+59084|0;if(g>>>0>(k[c>>2]|0)>>>0){y=0;r=z;return y|0}}m=a+59048|0;q=a+59080|0;k[a+59096>>2]=g;u=yk(112)|0;k[u+108>>2]=0;l=u+20|0;j=l+56|0;do{k[l>>2]=0;l=l+4|0}while((l|0)<(j|0));s=(g|0)==(d|0);if(s){if(g>>>0>1024){Ak(u);y=0;r=z;return y|0}d=g+1|0;k[f>>2]=d;l=a+59056|0;h=k[l>>2]|0;if(d>>>0>h>>>0){j=k[a+59060>>2]|0;if((j|0)!=0&d>>>0>j>>>0){k[w>>2]=j;Jf(32944,53104,w);Af(32944);h=k[l>>2]|0;d=k[f>>2]|0}h=h+32+(h>>>2)|0;d=d>>>0>h>>>0?d:h;h=zm(k[m>>2]|0,d<<2)|0;if(!h)Af(32944);k[m>>2]=h;k[l>>2]=d;d=k[f>>2]|0}else h=k[m>>2]|0;f=yk(112)|0;k[f+108>>2]=0;l=f+20|0;j=l+56|0;do{k[l>>2]=0;l=l+4|0}while((l|0)<(j|0));t=d+-1|0;k[h+(t<<2)>>2]=f;k[u+16>>2]=t;bi(q,0);k[f+8>>2]=0;t=f}else{t=k[(k[m>>2]|0)+(g<<2)>>2]|0;k[u+16>>2]=g;p=t+8|0;k[p>>2]=(k[p>>2]|0)+1}n=a+59064|0;m=a+59068|0;d=k[m>>2]|0;if(d){f=0;j=0;do{h=k[n>>2]|0;k[h+(j-f<<2)>>2]=k[h+(j<<2)>>2];h=(k[n>>2]|0)+(j<<2)|0;f=((k[h>>2]|0)==0&1)+f|0;if((f|0)>0)k[h>>2]=0;j=j+1|0}while(j>>>0<d>>>0);if(!f){d=d+1|0;o=26}}else{d=1;o=26}if((o|0)==26){k[m>>2]=d;l=a+59072|0;f=k[l>>2]|0;if(d>>>0>f>>>0){h=k[a+59076>>2]|0;if((h|0)!=0&d>>>0>h>>>0){k[w>>2]=h;Jf(32944,53104,w);Af(32944);f=k[l>>2]|0;d=k[m>>2]|0}f=f+32+(f>>>2)|0;f=d>>>0>f>>>0?d:f;d=zm(k[n>>2]|0,f<<2)|0;if(!d)Af(32944);k[n>>2]=d;k[l>>2]=f;d=k[m>>2]|0;f=1}else f=1}k[(k[n>>2]|0)+(d-f<<2)>>2]=u;p=u+8|0;k[p>>2]=k[t+8>>2];h=Vf(y)|0;h=(b&64|0)==0?h:h+258|0;d=a+112|0;f=k[d>>2]|0;j=a+59104|0;k[u>>2]=h+f&k[j>>2];if(!(b&32)){if(g>>>0<(k[c>>2]|0)>>>0)c=k[(k[q>>2]|0)+(g<<2)>>2]|0;else c=0;k[u+4>>2]=c}else{f=Vf(y)|0;k[u+4>>2]=f;k[(k[q>>2]|0)+(g<<2)>>2]=f;f=k[d>>2]|0}c=k[a+116>>2]|0;if((c|0)==(f|0))c=0;else c=(k[j>>2]&c-f)>>>0<=h>>>0&1;i[u+12>>0]=c;n=u+76|0;k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;k[n+12>>2]=0;k[n+16>>2]=0;k[n+20>>2]=0;k[n+24>>2]=0;k[u+88>>2]=245760;o=u+4|0;k[u+92>>2]=k[o>>2];k[u+96>>2]=k[p>>2];if(b&16){c=(lg(y)|0)>>>9;kg(y,7);if(c&1){a=Vf(y)|0;k[n>>2]=a}if(c&2){a=Vf(y)|0;k[u+80>>2]=a}if(c&4){a=Vf(y)|0;k[u+84>>2]=a}if(c&8){a=Vf(y)|0;k[u+88>>2]=a}if(c&16){a=Vf(y)|0;k[u+92>>2]=a}if(c&32){a=Vf(y)|0;k[u+96>>2]=a}if(c&64){a=Vf(y)|0;k[u+100>>2]=a}}if(s){d=Vf(y)|0;if((d+-1|0)>>>0>65534){y=0;r=z;return y|0}a:do if(!d)c=0;else{c=zm(0,d>>>0>32?d:32)|0;if(!c){Af(32944);c=0}f=0;while(1){if(((k[y>>2]|0)+3|0)>>>0>32767)break;a=(lg(y)|0)>>>8&255;i[c+f>>0]=a;kg(y,8);f=f+1|0;if(f>>>0>=d>>>0)break a}if(!c){y=0;r=z;return y|0}ym(c);y=0;r=z;return y|0}while(0);Uf(v,c,d,t+20|0);if(c)ym(c)}k[u+36>>2]=k[t+20>>2];k[u+40>>2]=k[t+40>>2];l=k[t+64>>2]|0;if((l|0)!=0&l>>>0<8192){g=u+60|0;h=u+64|0;c=(k[h>>2]|0)+l|0;k[h>>2]=c;j=u+68|0;f=k[j>>2]|0;if(c>>>0>f>>>0){d=k[u+72>>2]|0;if((d|0)!=0&c>>>0>d>>>0){k[w>>2]=d;Jf(32944,53104,w);Af(32944);f=k[j>>2]|0;c=k[h>>2]|0}f=f+32+(f>>>2)|0;f=c>>>0>f>>>0?c:f;c=zm(k[g>>2]|0,f)|0;if(!c)Af(32944);k[g>>2]=c;k[j>>2]=f}else c=k[g>>2]|0;_m(c|0,k[t+60>>2]|0,l|0)|0}m=u+44|0;g=u+48|0;c=k[m>>2]|0;if((k[g>>2]|0)>>>0<64){if(c){ym(c);k[m>>2]=0}h=u+52|0;k[h>>2]=0;k[g>>2]=64;c=k[u+56>>2]|0;if((c|0)!=0&c>>>0<64){k[w>>2]=c;Jf(32944,53104,w);Af(32944);c=k[h>>2]|0;f=k[g>>2]|0;d=k[m>>2]|0}else{c=0;f=64;d=0}c=c+32+(c>>>2)|0;f=f>>>0>c>>>0?f:c;c=zm(d,f)|0;if(!c)Af(32944);k[m>>2]=c;k[h>>2]=f}Rf(v,c,k[n>>2]|0);Rf(v,c+4|0,k[u+80>>2]|0);Rf(v,c+8|0,k[u+84>>2]|0);Rf(v,c+12|0,k[u+88>>2]|0);Rf(v,c+16|0,k[u+92>>2]|0);Rf(v,c+20|0,k[u+96>>2]|0);Rf(v,c+24|0,k[u+100>>2]|0);Rf(v,c+28|0,k[o>>2]|0);Rf(v,c+32|0,0);Rf(v,c+44|0,k[p>>2]|0);l=c+48|0;j=l+16|0;do{i[l>>0]=0;l=l+1|0}while((l|0)<(j|0));if(!(b&8)){y=1;r=z;return y|0}if(((k[y>>2]|0)+3|0)>>>0>32767){y=0;r=z;return y|0}f=Vf(y)|0;if(f>>>0>8128){y=0;r=z;return y|0}c=f+64|0;if(c>>>0>(k[g>>2]|0)>>>0?(k[g>>2]=c,x=u+52|0,e=k[x>>2]|0,c>>>0>e>>>0):0){d=k[u+56>>2]|0;if((d|0)!=0&c>>>0>d>>>0){k[w>>2]=d;Jf(32944,53104,w);Af(32944);e=k[x>>2]|0;c=k[g>>2]|0}e=e+32+(e>>>2)|0;c=c>>>0>e>>>0?c:e;e=zm(k[m>>2]|0,c)|0;if(!e)Af(32944);k[m>>2]=e;k[x>>2]=c}c=k[m>>2]|0;if(!f){y=1;r=z;return y|0}else e=0;while(1){if(((k[y>>2]|0)+3|0)>>>0>32767){c=0;o=85;break}x=(lg(y)|0)>>>8&255;i[c+(e+64)>>0]=x;kg(y,8);e=e+1|0;if(e>>>0>=f>>>0){c=1;o=85;break}}if((o|0)==85){r=z;return c|0}return 0}function Nh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0;b=a+59080|0;c=k[b>>2]|0;if(c){ym(c);k[b>>2]=0}k[a+59084>>2]=0;k[a+59088>>2]=0;k[a+59096>>2]=0;g=a+59052|0;c=k[g>>2]|0;f=a+59048|0;b=k[f>>2]|0;if(c){e=0;do{d=k[b+(e<<2)>>2]|0;if(d){b=k[d+60>>2]|0;if(b)ym(b);b=k[d+44>>2]|0;if(b)ym(b);b=k[d+20>>2]|0;if(b)ym(b);Ak(d);c=k[g>>2]|0;b=k[f>>2]|0}e=e+1|0}while(e>>>0<c>>>0)}if(b){ym(b);k[f>>2]=0}k[g>>2]=0;k[a+59056>>2]=0;f=a+59068|0;c=k[f>>2]|0;g=a+59064|0;b=k[g>>2]|0;if(c){e=0;do{d=k[b+(e<<2)>>2]|0;if(d){b=k[d+60>>2]|0;if(b)ym(b);b=k[d+44>>2]|0;if(b)ym(b);b=k[d+20>>2]|0;if(b)ym(b);Ak(d);c=k[f>>2]|0;b=k[g>>2]|0}e=e+1|0}while(e>>>0<c>>>0)}if(!b){k[f>>2]=0;a=a+59072|0;k[a>>2]=0;return}ym(b);k[g>>2]=0;k[f>>2]=0;a=a+59072|0;k[a>>2]=0;return}function Oh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;if((c|0)!=(b|0))i[a+19530>>0]=1;d=c>>>0<b>>>0;if(d)i[a+19529>>0]=1;if(!(i[a+19512>>0]|0)){l=a+19252|0;m=(k[l>>2]|0)+b|0;if(!d){d=c-b|0;b=a+19536|0;f=b;e=k[f>>2]|0;f=k[f+4>>2]|0;h=a+19520|0;g=k[h>>2]|0;h=k[h+4>>2]|0;if(!((h|0)>(f|0)|(h|0)==(f|0)&g>>>0>e>>>0))return;r=Um(g|0,h|0,e|0,f|0)|0;q=O;qf(k[a>>2]|0,m,0>(q|0)|0==(q|0)&d>>>0>r>>>0?r:d);r=b;r=Vm(k[r>>2]|0,k[r+4>>2]|0,d|0,0)|0;a=b;k[a>>2]=r;k[a+4>>2]=O;return}h=(k[a+59100>>2]|0)-b|0;j=a+19536|0;b=j;d=k[b>>2]|0;b=k[b+4>>2]|0;g=a+19520|0;e=g;f=k[e>>2]|0;e=k[e+4>>2]|0;if((e|0)>(b|0)|(e|0)==(b|0)&f>>>0>d>>>0){d=Um(f|0,e|0,d|0,b|0)|0;b=O;qf(k[a>>2]|0,m,0>(b|0)|0==(b|0)&h>>>0>d>>>0?d:h);d=j;d=Vm(k[d>>2]|0,k[d+4>>2]|0,h|0,0)|0;b=O;f=j;k[f>>2]=d;k[f+4>>2]=b;f=g;e=k[f+4>>2]|0;f=k[f>>2]|0}if(!((e|0)>(b|0)|(e|0)==(b|0)&f>>>0>d>>>0))return;p=k[l>>2]|0;r=Um(f|0,e|0,d|0,b|0)|0;q=O;qf(k[a>>2]|0,p,0>(q|0)|0==(q|0)&c>>>0>r>>>0?r:c);r=j;r=Vm(k[r>>2]|0,k[r+4>>2]|0,c|0,0)|0;a=j;k[a>>2]=r;k[a+4>>2]=O;return}q=a+59104|0;f=k[q>>2]|0;d=f&c-b;if(!d)return;c=a+19384|0;n=a+19256|0;o=a+19536|0;p=a+19520|0;j=b;m=d;while(1){b=0;while(1){d=k[a+(b<<2)+19384>>2]|0;b=b+1|0;if(d>>>0>j>>>0){r=11;break}if(b>>>0>=32){l=0;break}}if((r|0)==11){r=0;l=d-j|0;l=l>>>0<m>>>0?l:m}do if((k[c>>2]|0)>>>0<=j>>>0){d=1;while(1){if((k[a+(d<<2)+19384>>2]|0)>>>0>j>>>0){r=16;break}d=d+1|0;if(d>>>0>=32){r=17;break}}if((r|0)==16){r=0;d=(k[a+(d<<2)+19256>>2]|0)+(j-(k[a+(d+-1<<2)+19384>>2]|0))|0;break}else if((r|0)==17){r=0;d=k[n>>2]|0;break}}else d=(k[n>>2]|0)+j|0;while(0);e=o;b=k[e>>2]|0;e=k[e+4>>2]|0;g=p;h=k[g>>2]|0;g=k[g+4>>2]|0;if((g|0)>(e|0)|(g|0)==(e|0)&h>>>0>b>>>0){g=Um(h|0,g|0,b|0,e|0)|0;h=O;qf(k[a>>2]|0,d,0>(h|0)|0==(h|0)&l>>>0>g>>>0?g:l);g=o;g=Vm(k[g>>2]|0,k[g+4>>2]|0,l|0,0)|0;d=o;k[d>>2]=g;k[d+4>>2]=O;d=k[q>>2]|0}else d=f;if((m|0)==(l|0))break;else{j=d&l+j;f=d;m=m-l|0}}return}function Ph(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0;ca=r;r=r+16|0;ba=ca;$=a+19544|0;i[$>>0]=1;aa=a+19528|0;if(!(i[aa>>0]|0)){if(b)b=1;else{Ym(a+148|0,0,19100)|0;b=a+59100|0;c=a+84|0;d=c+36|0;do{k[c>>2]=0;c=c+4|0}while((c|0)<(d|0));b=k[b>>2]|0;k[a+19248>>2]=(b>>>0<4194304?b:4194304)&k[a+59104>>2];b=a+68|0;c=k[b>>2]|0;if(c){ym(c);k[b>>2]=0}k[a+72>>2]=0;k[a+76>>2]=0;b=0}g=a+8|0;k[g>>2]=0;p=a+4|0;k[p>>2]=0;h=a+19536|0;o=h;k[o>>2]=0;k[o+4>>2]=0;o=a+120|0;q=a+128|0;k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;k[o+12>>2]=0;k[o+16>>2]=0;k[o+20>>2]=0;k[o+24>>2]=0;k[q>>2]=-1;if(b){c=0;d=0}else{k[a+38736>>2]=0;k[a+38740>>2]=0;k[a+38728>>2]=0;k[a+38732>>2]=1;Ym(a+38744|0,0,368)|0;Ym(a+22420|0,0,16308)|0;i[a+58972>>0]=0;Ym(a+58564|0,0,404)|0;k[a+58560>>2]=2;k[a+58968>>2]=0;Nh(a);c=k[o>>2]|0;d=k[p>>2]|0}b=c-d|0;if((b|0)<0){r=ca;return}n=a+136|0;k[q>>2]=(k[n>>2]|0)-d+(k[q>>2]|0);if((d|0)>16384){if((b|0)>0){_=k[a+16>>2]|0;an(_|0,_+d|0,b|0)|0}k[p>>2]=0;k[o>>2]=b}else b=c;if((b|0)!=32768){c=pf(k[a>>2]|0,(k[a+16>>2]|0)+b|0,32768-b|0)|0;b=k[o>>2]|0;if((c|0)>0){b=b+c|0;k[o>>2]=b}}else{b=32768;c=0}b=b+-30|0;f=a+124|0;k[f>>2]=b;d=k[p>>2]|0;k[n>>2]=d;e=k[q>>2]|0;if((e|0)!=-1){_=d+-1+e|0;k[f>>2]=(b|0)<(_|0)?b:_}if((c|0)==-1){r=ca;return}c=a+4|0;b=a+128|0;if(!(ph(a,c,b)|0)){r=ca;return}e=a+148|0;if(!(th(a,c,b,e)|0)){r=ca;return}}else{f=a+124|0;g=a+8|0;h=a+19536|0;b=a+128|0;n=a+136|0;e=a+148|0;o=a+120|0;p=a+4|0;q=a+128|0;c=a+4|0}D=a+59104|0;E=a+112|0;F=a+4|0;G=a+19248|0;H=a+16|0;I=a+280|0;J=a+19512|0;K=a+19252|0;L=a+19384|0;M=a+19256|0;N=a+4100|0;O=a+92|0;P=a+96|0;Q=a+88|0;R=a+84|0;S=a+104|0;T=a+19256|0;U=a+7920|0;V=a+7788|0;W=a+3968|0;X=a+11740|0;Y=a+11608|0;Z=a+148|0;_=a+19520|0;A=a+128|0;B=a+144|0;C=a+132|0;a:while(1){t=k[D>>2]|0;d=k[E>>2]&t;k[E>>2]=d;s=k[F>>2]|0;if((s|0)>=(k[f>>2]|0)){while(1){u=k[n>>2]|0;t=k[A>>2]|0;d=u+-1+t|0;if((s|0)<=(d|0)){if((s|0)!=(d|0))break;if((k[g>>2]|0)<(k[C>>2]|0))break}if(i[B>>0]|0){y=155;break a}if(!(ph(a,c,b)|0)){y=156;break a}if(!(th(a,c,b,e)|0)){y=156;break a}s=k[F>>2]|0}v=k[o>>2]|0;d=v-s|0;if((d|0)<0){y=155;break}k[q>>2]=u-s+t;if((s|0)>16384){if((d|0)>0){z=k[H>>2]|0;an(z|0,z+s|0,d|0)|0}k[p>>2]=0;k[o>>2]=d}else d=v;if((d|0)!=32768){s=pf(k[a>>2]|0,(k[H>>2]|0)+d|0,32768-d|0)|0;d=k[o>>2]|0;if((s|0)>0){d=d+s|0;k[o>>2]=d}}else{d=32768;s=0}d=d+-30|0;k[f>>2]=d;u=k[p>>2]|0;k[n>>2]=u;t=k[q>>2]|0;if((t|0)!=-1){z=u+-1+t|0;k[f>>2]=(d|0)<(z|0)?d:z}if((s|0)==-1){y=155;break}d=k[E>>2]|0;t=k[D>>2]|0;s=u}z=k[G>>2]|0;if(!((z-d&t)>>>0>4099|(z|0)==(d|0))){sh(a);y=h;w=k[y+4>>2]|0;z=_;x=k[z+4>>2]|0;if((w|0)>(x|0)|((w|0)==(x|0)?(k[y>>2]|0)>>>0>(k[z>>2]|0)>>>0:0)){y=156;break}if(i[aa>>0]|0){y=47;break}s=k[F>>2]|0}z=k[H>>2]|0;t=k[g>>2]|0;u=(l[z+(s+1)>>0]<<8|l[z+s>>0]<<16|l[z+(s+2)>>0])>>>(8-t|0)&65534;d=k[I>>2]|0;if(u>>>0<(k[a+(d<<2)+152>>2]|0)>>>0){d=u>>>(16-d|0);v=(l[a+d+284>>0]|0)+t|0;u=(v>>>3)+s|0;k[F>>2]=u;v=v&7;k[g>>2]=v;d=a+(d<<1)+1308|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(u>>>0>=(k[a+(d<<2)+152>>2]|0)>>>0);v=d+t|0;y=(v>>>3)+s|0;k[F>>2]=y;v=v&7;k[g>>2]=v;d=((u-(k[a+(d+-1<<2)+152>>2]|0)|0)>>>(16-d|0))+(k[a+(d<<2)+216>>2]|0)|0;d=a+((d>>>0>=(k[Z>>2]|0)>>>0?0:d)<<1)+3356|0;u=y}d=j[d>>1]|0;s=d&65535;if((d&65535)<256){z=(i[J>>0]|0)==0;t=d&255;s=k[E>>2]|0;k[E>>2]=s+1;if(z){i[(k[K>>2]|0)+s>>0]=t;continue}do if((k[L>>2]|0)>>>0<=s>>>0){d=1;while(1){if((k[a+(d<<2)+19384>>2]|0)>>>0>s>>>0){y=59;break}d=d+1|0;if(d>>>0>=32){y=60;break}}if((y|0)==59){d=(k[a+(d<<2)+19256>>2]|0)+(s-(k[a+(d+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==60){d=k[M>>2]|0;break}}else d=(k[M>>2]|0)+s|0;while(0);i[d>>0]=t;continue}if((d&65535)>261){d=s+-262|0;if(d>>>0>=8){s=d>>>2;t=s+-1|0;d=((d&3|4)<<t)+2|0;if(!t){t=v;x=d}else{x=(((l[z+(u+1)>>0]<<8|l[z+u>>0]<<16|l[z+(u+2)>>0])>>>(8-v|0)&65535)>>>(17-s|0))+d|0;t=v+t|0;u=(t>>>3)+u|0;k[F>>2]=u;t=t&7;k[g>>2]=t}}else{t=v;x=s+-260|0}s=(l[z+(u+1)>>0]<<8|l[z+u>>0]<<16|l[z+(u+2)>>0])>>>(8-t|0)&65534;d=k[N>>2]|0;if(s>>>0<(k[a+(d<<2)+3972>>2]|0)>>>0){d=s>>>(16-d|0);w=(l[a+d+4104>>0]|0)+t|0;v=(w>>>3)+u|0;k[F>>2]=v;w=w&7;k[g>>2]=w;d=a+(d<<1)+5128|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(s>>>0>=(k[a+(d<<2)+3972>>2]|0)>>>0);w=d+t|0;v=(w>>>3)+u|0;k[F>>2]=v;w=w&7;k[g>>2]=w;d=((s-(k[a+(d+-1<<2)+3972>>2]|0)|0)>>>(16-d|0))+(k[a+(d<<2)+4036>>2]|0)|0;d=a+((d>>>0>=(k[W>>2]|0)>>>0?0:d)<<1)+7176|0}y=j[d>>1]|0;d=y&65535;do if((y&65535)>=4){s=d>>>1;u=s+-1|0;t=((d&1|2)<<u)+1|0;if(u){if(u>>>0<=3){t=(((l[z+(v+1)>>0]<<16|l[z+v>>0]<<24|l[z+(v+2)>>0]<<8|l[z+(v+3)>>0])<<w|(l[z+(v+4)>>0]|0)>>>(8-w|0))>>>(33-s|0))+t|0;z=w+u|0;k[F>>2]=(z>>>3)+v;k[g>>2]=z&7;break}if(u>>>0>4){t=(((l[z+(v+1)>>0]<<16|l[z+v>>0]<<24|l[z+(v+2)>>0]<<8|l[z+(v+3)>>0])<<w|(l[z+(v+4)>>0]|0)>>>(8-w|0))>>>(37-s|0)<<4)+t|0;w=s+-5+w|0;v=(w>>>3)+v|0;k[F>>2]=v;w=w&7;k[g>>2]=w}s=(l[z+(v+1)>>0]<<8|l[z+v>>0]<<16|l[z+(v+2)>>0])>>>(8-w|0)&65534;d=k[U>>2]|0;if(s>>>0<(k[a+(d<<2)+7792>>2]|0)>>>0){d=s>>>(16-d|0);z=(l[a+d+7924>>0]|0)+w|0;k[F>>2]=(z>>>3)+v;k[g>>2]=z&7;d=a+(d<<1)+8948|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(s>>>0>=(k[a+(d<<2)+7792>>2]|0)>>>0);z=d+w|0;k[F>>2]=(z>>>3)+v;k[g>>2]=z&7;d=((s-(k[a+(d+-1<<2)+7792>>2]|0)|0)>>>(16-d|0))+(k[a+(d<<2)+7856>>2]|0)|0;d=a+((d>>>0>=(k[V>>2]|0)>>>0?0:d)<<1)+10996|0}t=(m[d>>1]|0)+t|0}}else t=d+1|0;while(0);if(t>>>0>256)if(t>>>0>8192)d=(t>>>0>262144?3:2)+x|0;else d=x+1|0;else d=x;k[P>>2]=k[O>>2];k[O>>2]=k[Q>>2];k[Q>>2]=k[R>>2];k[R>>2]=t;k[S>>2]=d;if(!(i[J>>0]|0)){ai(a,d,t);continue}x=k[D>>2]|0;if(!d)continue;z=k[E>>2]|0;s=z;t=z-t|0;while(1){d=d+-1|0;w=t+1|0;u=t&x;v=k[L>>2]|0;do if(v>>>0<=u>>>0){t=1;while(1){if((k[a+(t<<2)+19384>>2]|0)>>>0>u>>>0){y=96;break}t=t+1|0;if(t>>>0>=32){y=97;break}}if((y|0)==96){t=(k[a+(t<<2)+19256>>2]|0)+(u-(k[a+(t+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==97){t=k[T>>2]|0;break}}else t=(k[T>>2]|0)+u|0;while(0);u=i[t>>0]|0;do if(v>>>0<=s>>>0){t=1;while(1){if((k[a+(t<<2)+19384>>2]|0)>>>0>s>>>0){y=102;break}t=t+1|0;if(t>>>0>=32){y=103;break}}if((y|0)==102){s=(k[a+(t<<2)+19256>>2]|0)+(s-(k[a+(t+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==103){s=k[T>>2]|0;break}}else s=(k[T>>2]|0)+s|0;while(0);i[s>>0]=u;s=(k[E>>2]|0)+1&x;k[E>>2]=s;if(!d)continue a;else t=w}}if((s|0)==257){d=k[S>>2]|0;if(!d)continue;s=k[R>>2]|0;if(!(i[J>>0]|0)){ai(a,d,s);continue}x=k[D>>2]|0;z=k[E>>2]|0;v=z;s=z-s|0;while(1){d=d+-1|0;w=s+1|0;t=s&x;u=k[L>>2]|0;do if(u>>>0<=t>>>0){s=1;while(1){if((k[a+(s<<2)+19384>>2]|0)>>>0>t>>>0){y=116;break}s=s+1|0;if(s>>>0>=32){y=117;break}}if((y|0)==116){s=(k[a+(s<<2)+19256>>2]|0)+(t-(k[a+(s+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==117){s=k[T>>2]|0;break}}else s=(k[T>>2]|0)+t|0;while(0);t=i[s>>0]|0;do if(u>>>0<=v>>>0){s=1;while(1){if((k[a+(s<<2)+19384>>2]|0)>>>0>v>>>0){y=122;break}s=s+1|0;if(s>>>0>=32){y=123;break}}if((y|0)==122){s=(k[a+(s<<2)+19256>>2]|0)+(v-(k[a+(s+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==123){s=k[T>>2]|0;break}}else s=(k[T>>2]|0)+v|0;while(0);i[s>>0]=t;s=(k[E>>2]|0)+1&x;k[E>>2]=s;if(!d)continue a;else{v=s;s=w}}}else if((s|0)==256){if(!(uh(a,c,ba)|0)){y=155;break}vh(a,ba)|0;continue}else{d=s+-258|0;y=k[a+(d<<2)+84>>2]|0;if(!d){w=z;s=v}else{do{z=d;d=d+-1|0;k[a+(z<<2)+84>>2]=k[a+(d<<2)+84>>2]}while((d|0)!=0);w=k[H>>2]|0;u=k[F>>2]|0;s=k[g>>2]|0}k[R>>2]=y;t=(l[w+(u+1)>>0]<<8|l[w+u>>0]<<16|l[w+(u+2)>>0])>>>(8-s|0)&65534;d=k[X>>2]|0;if(t>>>0<(k[a+(d<<2)+11612>>2]|0)>>>0){d=t>>>(16-d|0);v=(l[a+d+11744>>0]|0)+s|0;u=(v>>>3)+u|0;k[F>>2]=u;v=v&7;k[g>>2]=v;d=a+(d<<1)+12768|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(t>>>0>=(k[a+(d<<2)+11612>>2]|0)>>>0);v=d+s|0;u=(v>>>3)+u|0;k[F>>2]=u;v=v&7;k[g>>2]=v;d=((t-(k[a+(d+-1<<2)+11612>>2]|0)|0)>>>(16-d|0))+(k[a+(d<<2)+11676>>2]|0)|0;d=a+((d>>>0>=(k[Y>>2]|0)>>>0?0:d)<<1)+14816|0}z=j[d>>1]|0;d=z&65535;if((z&65535)>=8){s=d>>>2;t=s+-1|0;d=((d&3|4)<<t)+2|0;if(t){d=(((l[w+(u+1)>>0]<<8|l[w+u>>0]<<16|l[w+(u+2)>>0])>>>(8-v|0)&65535)>>>(17-s|0))+d|0;z=v+t|0;k[F>>2]=(z>>>3)+u;k[g>>2]=z&7}}else d=d+2|0;k[S>>2]=d;if(!(i[J>>0]|0)){ai(a,d,y);continue}x=k[D>>2]|0;if(!d)continue;t=k[E>>2]|0;s=t;t=t-y|0;while(1){d=d+-1|0;w=t+1|0;u=t&x;v=k[L>>2]|0;do if(v>>>0<=u>>>0){t=1;while(1){if((k[a+(t<<2)+19384>>2]|0)>>>0>u>>>0){y=145;break}t=t+1|0;if(t>>>0>=32){y=146;break}}if((y|0)==145){t=(k[a+(t<<2)+19256>>2]|0)+(u-(k[a+(t+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==146){t=k[T>>2]|0;break}}else t=(k[T>>2]|0)+u|0;while(0);u=i[t>>0]|0;do if(v>>>0<=s>>>0){t=1;while(1){if((k[a+(t<<2)+19384>>2]|0)>>>0>s>>>0){y=151;break}t=t+1|0;if(t>>>0>=32){y=152;break}}if((y|0)==151){s=(k[a+(t<<2)+19256>>2]|0)+(s-(k[a+(t+-1<<2)+19384>>2]|0))|0;break}else if((y|0)==152){s=k[T>>2]|0;break}}else s=(k[T>>2]|0)+s|0;while(0);i[s>>0]=u;s=(k[E>>2]|0)+1&x;k[E>>2]=s;if(!d)continue a;else t=w}}}if((y|0)==47){i[$>>0]=0;r=ca;return}else if((y|0)==155){sh(a);r=ca;return}else if((y|0)==156){r=ca;return}}function Qh(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0;p=r;r=r+16|0;g=p;f=i[d>>0]|0;e=f&255;if((e|0)==2|(e|0)==1){o=k[a+19536>>2]|0;c=c+-4|0;if((c|0)<=0){r=p;return b|0}n=f<<24>>24==2?233:232;d=b;e=0;do{a=d+1|0;m=i[d>>0]|0;f=e+1|0;if(m<<24>>24==-24|(m&255|0)==(n|0)){f=f+o&16777215;g=d+2|0;j=d+3|0;h=d+4|0;m=l[g>>0]<<8|l[a>>0]|l[j>>0]<<16|l[h>>0]<<24;if((m|0)<0){if((m+f|0)>-1){m=m+16777216|0;i[a>>0]=m;i[g>>0]=m>>>8;i[j>>0]=m>>>16;i[h>>0]=m>>>24}}else if((m+-16777216|0)<0){m=m-f|0;i[a>>0]=m;i[g>>0]=m>>>8;i[j>>0]=m>>>16;i[h>>0]=m>>>24}d=d+5|0;e=e+5|0}else{d=a;e=f}}while((e|0)<(c|0));e=b;r=p;return e|0}else if((e|0)==3){d=k[a+19536>>2]|0;e=c+-3|0;if((e|0)>0)g=0;else{r=p;return b|0}do{f=b+g|0;if((i[b+(g|3)>>0]|0)==-21){m=b+(g|1)|0;o=b+(g|2)|0;c=(l[m>>0]<<8|l[f>>0]|l[o>>0]<<16)-((g+d|0)>>>2)|0;i[f>>0]=c;i[m>>0]=c>>>8;i[o>>0]=c>>>16}g=g+4|0}while((g|0)<(e|0));e=b;r=p;return e|0}else if(!e){n=i[d+12>>0]|0;m=n&255;j=a+52|0;h=a+60|0;d=k[h>>2]|0;f=a+56|0;k[f>>2]=c;if(d>>>0<c>>>0){e=k[a+64>>2]|0;if((e|0)!=0&e>>>0<c>>>0){k[g>>2]=e;Jf(32944,53104,g);Af(32944);d=k[h>>2]|0;e=k[f>>2]|0}else e=c;d=d+32+(d>>>2)|0;d=e>>>0>d>>>0?e:d;e=zm(k[j>>2]|0,d)|0;if(!e)Af(32944);k[j>>2]=e;k[h>>2]=d}else e=k[j>>2]|0;if(!(n<<24>>24)){b=e;r=p;return b|0}else{j=0;d=0}do{if(j>>>0<c>>>0){g=j;h=0;f=d;while(1){d=f+1|0;h=(h&255)-(l[b+f>>0]|0)|0;i[e+g>>0]=h;g=g+m|0;if(g>>>0>=c>>>0)break;else f=d}}j=j+1|0}while((j|0)!=(m|0));r=p;return e|0}else{b=0;r=p;return b|0}return 0}function Rh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;e=0;do{c=a+(e<<2)|0;d=k[c>>2]|0;if(d){ym(d);k[c>>2]=0}e=e+1|0}while((e|0)!=32);if(!b)return;else{f=0;g=0}a:while(1){c=b-g|0;e=(c>>>0)/((32-f|0)>>>0)|0;e=e>>>0>4194304?e:4194304;if(c>>>0<e>>>0){c=9;break}while(1){d=xm(c)|0;if(d)break;c=c-(c>>>5)|0;if(c>>>0<e>>>0){c=9;break a}}Ym(d|0,0,c|0)|0;k[a+(f<<2)>>2]=d;g=c+g|0;k[a+(f<<2)+128>>2]=g;f=f+1|0;d=g>>>0<b>>>0;if(!(d&f>>>0<32)){c=11;break}}if((c|0)==9){a=xb(4)|0;Ck(a);ec(a|0,61344,16)}else if((c|0)==11)if(d){a=xb(4)|0;Ck(a);ec(a|0,61344,16)}else return}function Sh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;ig(a+4|0,1);Ym(a+19256|0,0,256)|0;k[a+58208>>2]=0;k[a+40728>>2]=0;k[a+40736>>2]=0;k[a+40732>>2]=0;c=a+58976|0;d=a+36|0;e=d+48|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));Of(c);ig(a+59032|0,1);d=a+59048|0;e=d+48|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));k[a>>2]=b;k[a+19252>>2]=0;i[a+19512>>0]=0;i[a+19528>>0]=0;i[a+19529>>0]=0;i[a+19530>>0]=0;k[a+28>>2]=1;c=fi()|0;k[a+20>>2]=c;k[a+32>>2]=0;k[a+24>>2]=0;k[a+59100>>2]=0;k[a+59104>>2]=0;c=a+148|0;d=a+84|0;e=d+36|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));b=a+68|0;Ym(c|0,0,19104)|0;c=k[b>>2]|0;if(c){ym(c);k[b>>2]=0}k[a+72>>2]=0;k[a+76>>2]=0;k[a+8>>2]=0;k[a+4>>2]=0;c=a+19536|0;k[c>>2]=0;k[c+4>>2]=0;c=a+120|0;k[c+0>>2]=0;k[c+4>>2]=0;k[c+8>>2]=0;k[c+12>>2]=0;k[c+16>>2]=0;k[c+20>>2]=0;k[c+24>>2]=0;k[a+128>>2]=-1;k[a+38736>>2]=0;k[a+38740>>2]=0;k[a+38728>>2]=0;k[a+38732>>2]=1;Ym(a+38744|0,0,368)|0;Ym(a+22420|0,0,16308)|0;i[a+58972>>0]=0;Ym(a+58564|0,0,404)|0;k[a+58560>>2]=2;k[a+58968>>2]=0;Nh(a);d=a+22372|0;k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;k[d+12>>2]=0;k[d+16>>2]=0;k[d+20>>2]=0;k[a+22368>>2]=13568;k[a+22416>>2]=8193;k[a+22412>>2]=128;k[a+22408>>2]=128;k[a+22404>>2]=0;k[a+22364>>2]=0;k[a+22396>>2]=0;k[a+22400>>2]=0;k[c>>2]=0;c=0;do{d=c<<8&65535;j[a+(c<<1)+20570>>1]=d;j[a+(c<<1)+19546>>1]=d;j[a+(c<<1)+20058>>1]=c;j[a+(c<<1)+21082>>1]=0-c<<8;c=c+1|0}while((c|0)!=256);Ym(a+21594|0,0,768)|0;Bh(0,a+20570|0,a+21850|0);return}function Th(a){a=a|0;var b=0,c=0,d=0,e=0;Nh(a);b=k[a+19252>>2]|0;if(b)ym(b);gi(k[a+20>>2]|0);b=k[a+32>>2]|0;if(b)Bk(b);e=k[a+24>>2]|0;if(e){d=e+-4|0;b=k[d>>2]|0;if(b){b=e+(b*19172|0)|0;do{c=k[b+-16>>2]|0;if(c)ym(c);jg(b+-19168|0);b=b+-19172|0}while((b|0)!=(e|0))}Bk(d)}b=k[a+59080>>2]|0;if(b)ym(b);b=k[a+59064>>2]|0;if(b)ym(b);b=k[a+59048>>2]|0;if(b)ym(b);jg(a+59032|0);Pf(a+58976|0);b=a+58208|0;if(!(k[b>>2]|0))d=0;else{k[b>>2]=0;ym(k[a+58380>>2]|0);d=0}do{b=a+(d<<2)+19256|0;c=k[b>>2]|0;if(c){ym(c);k[b>>2]=0}d=d+1|0}while((d|0)!=32);b=k[a+68>>2]|0;if(b)ym(b);b=k[a+52>>2]|0;if(b)ym(b);b=k[a+36>>2]|0;if(!b){a=a+4|0;jg(a);return}ym(b);a=a+4|0;jg(a);return}function Uh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;if(!b)Af(32944);j=b>>>0<262144?262144:b;l=a+59100|0;g=k[l>>2]|0;if(j>>>0<=g>>>0)return;b=(i[a+19512>>0]|0)==0;do if(c)if(b){b=(k[a+19252>>2]|0)!=0;c=a+19512|0;h=9;break}else{a=xb(4)|0;Ck(a);ec(a|0,61344,16)}else{c=a+19512|0;if(b){b=0;h=9}else{b=0;d=c;h=10}}while(0);if((h|0)==9){f=xm(j)|0;if(!f){d=c;h=10}else{Ym(f|0,0,j|0)|0;if(b&g>>>0>1){d=j+-1|0;b=k[a+112>>2]|0;c=k[a+19252>>2]|0;e=1;do{m=b-e|0;i[f+(m&d)>>0]=i[c+(m&g+-1)>>0]|0;e=e+1|0}while(e>>>0<g>>>0)}b=a+19252|0;c=k[b>>2]|0;if(c)ym(c);k[b>>2]=f}}if((h|0)==10){if(b|j>>>0<16777216){m=xb(4)|0;Ck(m);ec(m|0,61344,16)}b=a+19252|0;c=k[b>>2]|0;if(c){ym(c);k[b>>2]=0}Rh(a+19256|0,j);i[d>>0]=1}k[l>>2]=j;k[a+59104>>2]=j+-1;return}function Vh(a,b,c){a=a|0;b=b|0;c=c|0;switch(b|0){case 0:{if((k[a+28>>2]|0)>>>0>1?(i[a+19512>>0]|0)==0:0){oh(a,c);return}Ph(a,c);return}case 26:case 20:{Ch(a,c);return}case 15:{wh(a,c);return}case 29:{Hh(a,c);return}default:return}}function Wh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0;i=a+4|0;b=k[i>>2]|0;if((b|0)>32738?(f=a+120|0,c=(k[f>>2]|0)-b|0,(c|0)>=0):0){g=a+136|0;h=a+128|0;k[h>>2]=(k[g>>2]|0)-b+(k[h>>2]|0);if((c|0)>0){e=a+16|0;j=k[e>>2]|0;an(j|0,j+b|0,c|0)|0;k[i>>2]=0;k[f>>2]=c;if((c|0)==32768)b=32768;else{b=e;d=6}}else{k[i>>2]=0;k[f>>2]=c;b=a+16|0;d=6}if((d|0)==6){c=pf(k[a>>2]|0,(k[b>>2]|0)+c|0,32768-c|0)|0;b=k[f>>2]|0;if((c|0)>0){b=b+c|0;k[f>>2]=b}}d=b+-30|0;e=a+124|0;k[e>>2]=d;b=k[i>>2]|0;k[g>>2]=b;c=k[h>>2]|0;if((c|0)!=-1){j=b+-1+c|0;k[e>>2]=(d|0)<(j|0)?d:j}}k[i>>2]=b+1;return l[(k[a+16>>2]|0)+b>>0]|0|0}function Xh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0;p=r;r=r+16|0;o=p;b=k[a+176>>2]|0;if((b|0)!=(k[a+180>>2]|0))i[b>>0]=0;k[o+8>>2]=o;n=o+4|0;k[n>>2]=o;e=o;g=0;while(1){f=a+(g<<2)+184|0;b=k[f>>2]|0;if(!b)b=e;else{d=a+g+4|0;while(1){c=k[b>>2]|0;k[f>>2]=c;k[b+8>>2]=o;k[b+4>>2]=e;k[e+8>>2]=b;k[n>>2]=b;j[b>>1]=-1;j[b+2>>1]=l[d>>0]|0;if(!c)break;else{e=b;b=c}}}g=g+1|0;if((g|0)==38)break;else e=b}if((b|0)==(o|0)){r=p;return}do{g=b+2|0;f=j[g>>1]|0;e=f&65535;c=e<<4;a:do if((j[b+c>>1]|0)==-1)do{d=m[b+(c|2)>>1]|0;if((d+e|0)>=65536)break a;e=b+(c|4)|0;h=k[b+(c|8)>>2]|0;k[h+4>>2]=k[e>>2];k[(k[e>>2]|0)+8>>2]=h;e=(f&65535)+d|0;f=e&65535;j[g>>1]=f;e=e&65535;c=e<<4}while((j[b+c>>1]|0)==-1);while(0);b=k[b+4>>2]|0}while((b|0)!=(o|0));b=k[n>>2]|0;if((b|0)==(o|0)){r=p;return}h=a+332|0;do{f=b+4|0;e=k[b+8>>2]|0;k[e+4>>2]=k[f>>2];k[(k[f>>2]|0)+8>>2]=e;f=j[b+2>>1]|0;e=f&65535;if((f&65535)>128){g=127-e|0;g=(((g|0)>-129?g:-129)+e|0)>>>7;f=b+2048+(g<<9<<2)|0;g=g<<7;d=k[h>>2]|0;c=e;while(1){k[b>>2]=d;k[h>>2]=b;c=c+-128|0;if((c|0)<=128)break;else{d=b;b=b+2048|0}}b=f;e=e+-128-g|0}d=e+-1|0;c=l[a+d+42>>0]|0;if((l[a+c+4>>0]|0)!=(e|0)){c=c+-1|0;f=l[a+c+4>>0]|0;g=b+(f<<4)|0;f=a+(d-f<<2)+184|0;k[g>>2]=k[f>>2];k[f>>2]=g}f=a+(c<<2)+184|0;k[b>>2]=k[f>>2];k[f>>2]=b;b=k[n>>2]|0}while((b|0)!=(o|0));r=p;return}function Yh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;r=a+4|0;s=m[r>>1]|0;t=b+19072|0;q=b+19080|0;k[q>>2]=s;e=k[a+8>>2]|0;u=(k[b+19064>>2]|0)-(k[b+19060>>2]|0)|0;n=b+19068|0;o=((k[n>>2]|0)>>>0)/(s>>>0)|0;k[n>>2]=o;o=(u>>>0)/(o>>>0)|0;if((o|0)>=(s|0)){b=0;return b|0}c=e+1|0;d=l[c>>0]|0;if((o|0)<(d|0)){k[b+19076>>2]=d;u=d<<1>>>0>s>>>0;i[b+2673>>0]=u&1;v=b+1640|0;k[v>>2]=(u&1)+(k[v>>2]|0);v=d+4|0;k[b+1620>>2]=e;i[c>>0]=v;j[r>>1]=s+4;if(v>>>0>124)hh(a,b);k[t>>2]=0;b=1;return b|0}u=b+1620|0;p=k[u>>2]|0;if(!p){b=0;return b|0}i[b+2673>>0]=0;f=d;n=(m[a>>1]|0)+-1|0;while(1){c=e+8|0;h=e+9|0;g=l[h>>0]|0;d=g+f|0;if((d|0)>(o|0))break;n=n+-1|0;if(!n){v=10;break}else{f=d;e=c}}if((v|0)==10){i[b+2674>>0]=i[b+(l[p>>0]|0)+2416>>0]|0;k[t>>2]=d;e=b+2672|0;i[b+(l[c>>0]|0)+1648>>0]=i[e>>0]|0;d=m[a>>1]|0;k[b+1624>>2]=d;k[u>>2]=0;d=d+-1|0;do{c=c+-8|0;i[b+(l[c>>0]|0)+1648>>0]=i[e>>0]|0;d=d+-1|0}while((d|0)!=0);k[b+19076>>2]=k[q>>2];b=1;return b|0}k[b+19076>>2]=d;k[t>>2]=f;k[u>>2]=c;v=g+4&255;i[h>>0]=v;j[r>>1]=s+4;if((v&255)<=(l[e+1>>0]|0)){b=1;return b|0}v=c;t=k[v>>2]|0;v=k[v+4>>2]|0;q=e;r=k[q+4>>2]|0;s=c;k[s>>2]=k[q>>2];k[s+4>>2]=r;s=e;k[s>>2]=t;k[s+4>>2]=v;k[u>>2]=e;v=Xm(t|0,v|0,8)|0;if((v&255)<=124){b=1;return b|0}hh(a,b);b=1;return b|0}function Zh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,r=0;d=a+4|0;e=b+1620|0;r=i[b+(l[k[e>>2]>>0]|0)+2416>>0]|0;i[b+2674>>0]=r;p=b+2673|0;f=l[d>>0]|0;g=b+1640|0;h=d+1|0;n=i[h>>0]|0;o=n&255;a=b+(o+-1<<7)+((l[p>>0]|0)+(r&255)+(l[b+((m[k[a+12>>2]>>1]|0)+-1)+2160>>0]|0)+((l[b+f+2416>>0]|0)<<1)+((k[g>>2]|0)>>>26&32)<<1)+2676|0;r=(k[b+19064>>2]|0)-(k[b+19060>>2]|0)|0;c=b+19068|0;q=(k[c>>2]|0)>>>14;k[c>>2]=q;c=m[a>>1]|0;if(((r>>>0)/(q>>>0)|0)>>>0<c>>>0){k[e>>2]=d;i[h>>0]=((n&255)>>>7&255^1)+o;k[b+19072>>2]=0;k[b+19076>>2]=m[a>>1];r=m[a>>1]|0;j[a>>1]=r+128-((r+32|0)>>>7);i[p>>0]=1;k[g>>2]=(k[g>>2]|0)+1;return}else{k[b+19072>>2]=c;r=m[a>>1]|0;j[a>>1]=r-((r+32|0)>>>7);k[b+19076>>2]=16384;k[b+1628>>2]=l[52616+((m[a>>1]|0)>>>10)>>0];k[b+1624>>2]=1;i[b+f+1648>>0]=i[b+2672>>0]|0;i[p>>0]=0;k[e>>2]=0;return}}function _h(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0;v=r;r=r+1024|0;g=v;u=j[a>>1]|0;c=u&65535;q=b+1624|0;d=k[q>>2]|0;h=c-d|0;if(u<<16>>16==256){o=1;u=b+1602|0}else{n=l[b+(h+-1)+1904>>0]|0;o=(((m[k[a+12>>2]>>1]|0)-c|0)>(h|0)|((d|0)>(h|0)&1)<<2|((m[a+4>>1]|0)>>>0<(c*11|0)>>>0&1)<<1)+(l[b+2674>>0]|0)|0;u=b+(n<<6)+(o<<2)+2|0;t=m[u>>1]|0;o=t>>>(l[b+(n<<6)+(o<<2)+4>>0]|0);j[u>>1]=t-o;o=((o|0)==0&1)+o|0}p=b+19080|0;k[p>>2]=o;t=b+2672|0;e=i[t>>0]|0;f=0;c=(k[a+8>>2]|0)+-8|0;n=g;while(1){d=c;while(1){c=d+8|0;if((i[b+(l[c>>0]|0)+1648>>0]|0)==e<<24>>24)d=c;else break}f=(l[d+9>>0]|0)+f|0;k[n>>2]=c;h=h+-1|0;if(!h)break;else n=n+4|0}n=b+19072|0;c=o+f|0;k[p>>2]=c;h=(k[b+19064>>2]|0)-(k[b+19060>>2]|0)|0;d=b+19068|0;o=((k[d>>2]|0)>>>0)/(c>>>0)|0;k[d>>2]=o;o=(h>>>0)/(o>>>0)|0;if((o|0)>=(c|0)){a=0;r=v;return a|0}if((o|0)>=(f|0)){k[n>>2]=f;k[b+19076>>2]=c;c=(m[a>>1]|0)-(k[q>>2]|0)|0;d=g+-4|0;while(1){d=d+4|0;i[b+(l[k[d>>2]>>0]|0)+1648>>0]=e;c=c+-1|0;if(!c)break;e=i[t>>0]|0}j[u>>1]=(m[u>>1]|0)+(k[p>>2]|0);k[q>>2]=m[a>>1];a=1;r=v;return a|0}f=k[g>>2]|0;c=f+1|0;e=i[c>>0]|0;d=e&255;if((d|0)>(o|0)){h=c;c=e}else{do{g=g+4|0;f=k[g>>2]|0;e=f+1|0;c=i[e>>0]|0;d=(c&255)+d|0}while((d|0)<=(o|0));h=e}k[b+19076>>2]=d;e=c&255;k[n>>2]=d-e;c=u+2|0;d=i[c>>0]|0;if((d&255)<7?(s=u+3|0,q=(i[s>>0]|0)+-1<<24>>24,i[s>>0]=q,q<<24>>24==0):0){j[u>>1]=m[u>>1]<<1;i[c>>0]=d+1<<24>>24;i[s>>0]=3<<(d&255)}k[b+1620>>2]=f;u=e+4&255;i[h>>0]=u;s=a+4|0;j[s>>1]=(m[s>>1]|0)+4;if((u&255)>124)hh(a,b);i[t>>0]=(i[t>>0]|0)+1<<24>>24;k[b+1640>>2]=k[b+1644>>2];a=1;r=v;return a|0}function $h(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;f=a+1620|0;g=k[f>>2]|0;C=j[g>>1]|0;D=C&255;C=(C&65535)>>>8;g=k[g+4>>2]|0;n=C&65535;do if((C&255)<31?(b=k[(k[a+1608>>2]|0)+12>>2]|0,(b|0)!=0):0){e=b+4|0;if((j[b>>1]|0)==1){b=e+1|0;C=i[b>>0]|0;i[b>>0]=((C&255)<32&1)+(C&255);b=e;break}b=k[b+8>>2]|0;if((i[b>>0]|0)!=D<<24>>24){while(1){c=b+8|0;if((i[c>>0]|0)==D<<24>>24)break;else b=c}if((l[b+9>>0]|0)<(l[b+1>>0]|0))b=c;else{B=c;A=k[B>>2]|0;B=k[B+4>>2]|0;y=b;z=k[y+4>>2]|0;C=c;k[C>>2]=k[y>>2];k[C+4>>2]=z;C=b;k[C>>2]=A;k[C+4>>2]=B}}c=b+1|0;d=i[c>>0]|0;if((d&255)<115){i[c>>0]=(d&255)+2;j[e>>1]=(m[e>>1]|0)+2}}else b=0;while(0);c=a+1632|0;a:do if(!(k[c>>2]|0)){D=ci(a,1,b)|0;k[(k[f>>2]|0)+4>>2]=D;k[a+1616>>2]=D;k[a+1608>>2]=D;if(D)return}else{C=a+19088|0;d=a+19424|0;e=k[d>>2]|0;k[d>>2]=e+1;i[e>>0]=D;e=k[d>>2]|0;if(e>>>0<(k[a+19436>>2]|0)>>>0){do if(g){if(g>>>0<=e>>>0){b=ci(a,0,b)|0;if(!b)break a}else b=g;B=(k[c>>2]|0)+-1|0;k[c>>2]=B;if(!B){e=k[a+1608>>2]|0;k[d>>2]=(k[d>>2]|0)+(((k[a+1616>>2]|0)!=(e|0))<<31>>31);d=e;e=b;B=b;break}else{d=k[a+1608>>2]|0;B=b;break}}else{k[(k[f>>2]|0)+4>>2]=e;B=k[a+1608>>2]|0;d=B}while(0);u=a+1608|0;b=j[d>>1]|0;v=b&65535;w=a+1616|0;c=k[w>>2]|0;b:do if((c|0)!=(d|0)){x=a+19130|0;y=a+19264|0;z=a+19268|0;A=a+1628|0;s=(b&65535)>3&1;t=n<<1;r=1-n+(m[d+4>>1]|0)-v|0;c:while(1){p=j[c>>1]|0;q=p&65535;if(p<<16>>16==1){f=l[x>>0]|0;b=a+(f<<2)+19272|0;d=k[b>>2]|0;if(!d){d=k[y>>2]|0;b=a+f+19092|0;g=l[b>>0]<<4;p=d+g|0;k[y>>2]=p;if(p>>>0>(k[z>>2]|0)>>>0){k[y>>2]=d+(g-(l[b>>0]<<4));d=fh(C,f)|0}}else k[b>>2]=k[d>>2];if(!d)break a;g=c+4|0;b=g;p=k[b>>2]|0;b=k[b+4>>2]|0;h=d;k[h>>2]=p;k[h+4>>2]=b;k[c+8>>2]=d;b=Xm(p|0,b|0,8)|0;if((b&255)<30){b=$m(b|0,O|0,1)|0;b=b&255}else b=120;i[d+1>>0]=b;h=(k[A>>2]|0)+s+(b&255)|0;j[g>>1]=h;f=c+4|0}else{do if(!(q&1)){b=c+8|0;n=k[b>>2]|0;o=q>>>1;h=i[a+(o+-1)+19130>>0]|0;p=h&255;d=i[a+o+19130>>0]|0;if(h<<24>>24==d<<24>>24){k[b>>2]=n;if(!n)break a;else break}h=d&255;g=a+(h<<2)+19272|0;d=k[g>>2]|0;if(!d){d=k[y>>2]|0;g=a+h+19092|0;f=l[g>>0]<<4;E=d+f|0;k[y>>2]=E;if(E>>>0>(k[z>>2]|0)>>>0){k[y>>2]=d+(f-(l[g>>0]<<4));d=fh(C,h)|0}}else k[g>>2]=k[d>>2];if(!d)break c;_m(d|0,n|0,o<<4|0)|0;E=a+(p<<2)+19272|0;k[n>>2]=k[E>>2];k[E>>2]=n;k[b>>2]=d}while(0);f=c+4|0;h=m[f>>1]|0;h=((q<<2>>>0<=v>>>0&h>>>0<=q<<3>>>0&1)<<1|q<<1>>>0<v>>>0)+h|0;j[f>>1]=h}d=h&65535;b=ka(d+6|0,t)|0;d=r+d|0;if(b>>>0<(d*6|0)>>>0){g=3;b=(b>>>0>d>>>0?2:1)+(b>>>0>=d<<2>>>0&1)|0}else{b=(b>>>0>=(d*15|0)>>>0&1)+(b>>>0>=(d*12|0)>>>0&1)+(b>>>0>=(d*9|0)>>>0|4)|0;g=b}j[f>>1]=g+h;E=k[c+8>>2]|0;k[E+(q<<3)+4>>2]=e;i[E+(q<<3)>>0]=D;i[E+(q<<3)+1>>0]=b;j[c>>1]=q+1;c=k[c+12>>2]|0;if((c|0)==(k[u>>2]|0))break b}k[b>>2]=0;break a}while(0);k[u>>2]=B;k[w>>2]=B;return}}while(0);gh(a);i[a+2672>>0]=0;return}function ai(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0;g=a+112|0;d=k[g>>2]|0;h=d-c|0;f=(k[a+59100>>2]|0)+-4097|0;if(!(h>>>0<f>>>0&d>>>0<f>>>0)){if(!b)return;c=a+59104|0;f=a+19252|0;e=b;b=k[c>>2]|0;a=h;while(1){e=e+-1|0;j=k[f>>2]|0;i[j+d>>0]=i[j+(b&a)>>0]|0;b=k[c>>2]|0;d=(k[g>>2]|0)+1&b;k[g>>2]=d;if(!e)break;else a=a+1|0}return}j=k[a+19252>>2]|0;a=j+h|0;e=j+d|0;k[g>>2]=d+b;if(b>>>0>7){f=b+-8|0;g=f&-8;h=d+g+8|0;c=h-c|0;while(1){i[e>>0]=i[a>>0]|0;i[e+1>>0]=i[a+1>>0]|0;i[e+2>>0]=i[a+2>>0]|0;i[e+3>>0]=i[a+3>>0]|0;i[e+4>>0]=i[a+4>>0]|0;i[e+5>>0]=i[a+5>>0]|0;i[e+6>>0]=i[a+6>>0]|0;i[e+7>>0]=i[a+7>>0]|0;b=b+-8|0;if(b>>>0<=7)break;else{e=e+8|0;a=a+8|0}}b=f-g|0;f=c;d=h;e=j+h|0;a=j+c|0}else f=h;if(!b)return;i[e>>0]=i[a>>0]|0;if(b>>>0<=1)return;i[j+(d+1)>>0]=i[j+(f+1)>>0]|0;if(b>>>0<=2)return;i[j+(d+2)>>0]=i[j+(f+2)>>0]|0;if(b>>>0<=3)return;i[j+(d+3)>>0]=i[j+(f+3)>>0]|0;if(b>>>0<=4)return;i[j+(d+4)>>0]=i[j+(f+4)>>0]|0;if(b>>>0<=5)return;i[j+(d+5)>>0]=i[j+(f+5)>>0]|0;if(b>>>0<=6)return;i[j+(d+6)>>0]=i[j+(f+6)>>0]|0;return}function bi(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0;i=r;r=r+16|0;f=i;g=a+4|0;c=(k[g>>2]|0)+1|0;k[g>>2]=c;h=a+8|0;d=k[h>>2]|0;if(c>>>0<=d>>>0){g=c;h=k[a>>2]|0;g=g+-1|0;g=h+(g<<2)|0;k[g>>2]=b;r=i;return}e=k[a+12>>2]|0;if((e|0)!=0&c>>>0>e>>>0){k[f>>2]=e;Jf(32944,53104,f);Af(32944);d=k[h>>2]|0;c=k[g>>2]|0}d=d+32+(d>>>2)|0;c=c>>>0>d>>>0?c:d;d=zm(k[a>>2]|0,c<<2)|0;if(!d)Af(32944);k[a>>2]=d;k[h>>2]=c;g=k[g>>2]|0;h=d;g=g+-1|0;g=h+(g<<2)|0;k[g>>2]=b;r=i;return}function ci(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0;u=r;r=r+256|0;t=u;d=k[a+1608>>2]|0;h=a+1620|0;e=k[h>>2]|0;n=k[e+4>>2]|0;if(!b){b=t+4|0;k[t>>2]=e;if(k[d+12>>2]|0)s=3}else{b=t;s=3}if((s|0)==3){d=k[d+12>>2]|0;if(c)s=8;a:while(1){if((s|0)==8){s=0;e=k[c+4>>2]|0;if((e|0)!=(n|0)){c=e;break}e=b+4|0;k[b>>2]=c;b=k[d+12>>2]|0;if(!b){c=d;b=e;break}else{d=b;b=e}}if((j[d>>1]|0)==1){c=d+4|0;s=8;continue}c=k[d+8>>2]|0;e=i[k[h>>2]>>0]|0;if((i[c>>0]|0)==e<<24>>24){s=8;continue}while(1){c=c+8|0;if((i[c>>0]|0)==e<<24>>24){s=8;continue a}}}if((b|0)==(t|0)){t=c;r=u;return t|0}else d=c}g=i[n>>0]|0;h=n+1|0;c=j[d>>1]|0;if(c<<16>>16==1)e=i[d+5>>0]|0;else{if(d>>>0<=(k[a+19424>>2]|0)>>>0){t=0;r=u;return t|0}e=k[d+8>>2]|0;if((i[e>>0]|0)!=g<<24>>24)do e=e+8|0;while((i[e>>0]|0)!=g<<24>>24);e=l[e+1>>0]|0;f=e+-1|0;e=(m[d+4>>1]|0)-(c&65535)+(1-e)|0;c=f<<1;if(c>>>0>e>>>0)c=((c+-1+(e*3|0)|0)>>>0)/(e<<1>>>0)|0;else c=(f*5|0)>>>0>e>>>0&1;e=c+1&255}o=a+19088|0;p=a+19268|0;q=a+19264|0;n=a+19272|0;a=$m(e&255|0,0,8)|0;a=g&255|a;g=h|O;f=b;while(1){f=f+-4|0;c=k[f>>2]|0;b=k[p>>2]|0;if((b|0)==(k[q>>2]|0)){b=k[n>>2]|0;if(!b)b=fh(o,0)|0;else k[n>>2]=k[b>>2];if(b){e=b;s=27}}else{b=b+-16|0;k[p>>2]=b;e=b;s=27}if((s|0)==27){s=0;j[e>>1]=1;h=e+4|0;k[h>>2]=a;k[h+4>>2]=g;k[e+12>>2]=d;k[c+4>>2]=b}if(!b){b=0;s=30;break}if((f|0)==(t|0)){s=30;break}else d=b}if((s|0)==30){r=u;return b|0}return 0}function di(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;h=r;r=r+16|0;f=h;g=a+8232|0;c=k[g>>2]|0;d=a+8228|0;k[d>>2]=b;if(c>>>0<b>>>0){e=k[a+8236>>2]|0;if((e|0)!=0&e>>>0<b>>>0){k[f>>2]=e;Jf(32944,53104,f);Af(32944);b=k[d>>2]|0;c=k[g>>2]|0}c=c+32+(c>>>2)|0;c=b>>>0>c>>>0?b:c;b=a+8224|0;d=zm(k[b>>2]|0,c)|0;if(!d)Af(32944);k[b>>2]=d;k[g>>2]=c}i[a+16>>0]=0;Bg(a+8288|0,0);c=a+8240|0;k[a+28>>2]=0;i[a+8369>>0]=0;i[a+8378>>0]=0;d=a+8412|0;k[a+8432>>2]=0;i[a+16629>>0]=0;k[c+0>>2]=0;k[c+4>>2]=0;k[c+8>>2]=0;k[c+12>>2]=0;k[c+16>>2]=0;k[c+20>>2]=0;c=a+8328|0;b=c+9|0;do{i[c>>0]=0;c=c+1|0}while((c|0)<(b|0));k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;j[d+12>>1]=0;i[d+14>>0]=0;r=h;return}function ei(a){a=a|0;var b=0;j[a+20>>1]=0;b=a+24|0;a=a+32|0;k[b+0>>2]=0;j[b+4>>1]=0;i[b+6>>0]=0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[a+12>>2]=0;k[a+16>>2]=0;k[a+20>>2]=0;k[a+24>>2]=0;k[a+28>>2]=0;return}function fi(){var a=0,b=0;Tb(52632)|0;b=k[13164]|0;a=b+1|0;k[13164]=a;if(!b){a=yk(584)|0;ii(a,32);k[13166]=a;a=k[13164]|0}if(a>>>0>1){b=yk(584)|0;ii(b,32);Xb(52632)|0;return b|0}else{Xb(52632)|0;b=k[13166]|0;return b|0}return 0}function gi(a){a=a|0;var b=0,c=0;Tb(52632)|0;do if(a){b=k[13166]|0;c=k[13164]|0;if((b|0)==(a|0)&(c|0)!=0){c=c+-1|0;k[13164]=c;if(c)break;ji(a);Ak(a);b=k[13166]|0}if((b|0)!=(a|0)){ji(a);Ak(a)}}while(0);Xb(52632)|0;return}function hi(){var a=0;a=Ja(84)|0;a=(a|0)==0?1:a;return (a>>>0>32?32:a)|0}function ii(a,b){a=a|0;b=b|0;var c=0,d=0;d=r;r=r+16|0;c=d;b=b>>>0>32?32:b;k[a>>2]=(b|0)==0?1:b;k[a+132>>2]=0;i[a+404>>0]=0;b=(ic(a+560|0,0)|0)==0;i[a+484>>0]=0;k[a+408>>2]=0;if((((b?(ab(a+488|0,0)|0)==0:0)?(ic(a+536|0,0)|0)==0:0)?(ab(a+412|0,0)|0)==0:0)?(ic(a+460|0,0)|0)==0:0){c=a+396|0;k[c>>2]=0;c=a+400|0;k[c>>2]=0;c=a+136|0;k[c>>2]=0;r=d;return}Jf(32944,52672,c);Bf(32944,2);c=a+396|0;k[c>>2]=0;c=a+400|0;k[c>>2]=0;c=a+136|0;k[c>>2]=0;r=d;return}function ji(a){a=a|0;var b=0,c=0,d=0,e=0;ki(a);i[a+404>>0]=1;b=a+460|0;Tb(b|0)|0;c=a+408|0;k[c>>2]=(k[c>>2]|0)+32;Xb(b|0)|0;c=a+412|0;Kb(c|0)|0;d=a+132|0;if(k[d>>2]|0){e=0;do{pb(k[a+(e<<2)+4>>2]|0,0)|0;e=e+1|0}while(e>>>0<(k[d>>2]|0)>>>0)}Hb(a+560|0)|0;Ua(a+488|0)|0;Hb(a+536|0)|0;Ua(c|0)|0;Hb(b|0)|0;return}function ki(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0;f=r;r=r+16|0;e=f;c=(k[a+396>>2]|0)-(k[a+400>>2]|0)&31;b=a+136|0;k[b>>2]=c;if(!c){r=f;return}d=a+484|0;i[d>>0]=1;c=a+460|0;Tb(c|0)|0;g=a+408|0;k[g>>2]=(k[g>>2]|0)+(k[b>>2]|0);Xb(c|0)|0;Kb(a+412|0)|0;c=a+536|0;Tb(c|0)|0;if(i[d>>0]|0){b=a+488|0;do{a=Qb(b|0,c|0)|0;if(a){k[e>>2]=a;Jf(32944,52816,e);Bf(32944,2)}}while((i[d>>0]|0)!=0)}Xb(c|0)|0;r=f;return}function li(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0;h=r;r=r+416|0;g=h;f=h+408|0;e=h+8|0;if(!(k[a>>2]|0)){r=h;return}b=a+132|0;d=0;do{c=_b(f|0,0,15,a|0)|0;if(c){k[g>>2]=c;bk(e,100,52928,g)|0;Jf(32944,e,g);Bf(32944,2)}k[a+(d<<2)+4>>2]=k[f>>2];k[b>>2]=(k[b>>2]|0)+1;d=d+1|0}while(d>>>0<(k[a>>2]|0)>>>0);r=h;return}function mi(a){a=a|0;ni(a);return 0}function ni(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0;j=r;r=r+16|0;h=j;if(!(oi(a,h)|0)){r=j;return}b=h+4|0;c=a+560|0;d=a+136|0;e=a+536|0;f=a+484|0;g=a+488|0;do{mc[k[h>>2]&31](k[b>>2]|0);Tb(c|0)|0;l=(k[d>>2]|0)+-1|0;k[d>>2]=l;if(!l){Tb(e|0)|0;i[f>>0]=0;Fb(g|0)|0;Xb(e|0)|0}Xb(c|0)|0}while(oi(a,h)|0);r=j;return}function oi(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;h=r;r=r+16|0;e=h;f=a+460|0;Tb(f|0)|0;g=a+408|0;c=k[g>>2]|0;if(!c){d=a+412|0;do{c=Qb(d|0,f|0)|0;if(c){k[e>>2]=c;Jf(32944,52816,e);Bf(32944,2)}c=k[g>>2]|0}while((c|0)==0)}k[g>>2]=c+-1;Xb(f|0)|0;if(i[a+404>>0]|0){a=0;r=h;return a|0}g=a+560|0;Tb(g|0)|0;e=a+400|0;d=a+(k[e>>2]<<3)+140|0;f=k[d+4>>2]|0;a=b;k[a>>2]=k[d>>2];k[a+4>>2]=f;k[e>>2]=(k[e>>2]|0)+1&31;Xb(g|0)|0;a=1;r=h;return a|0}function pi(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;if(!(k[a+132>>2]|0))li(a);e=a+396|0;d=k[e>>2]|0;if((d+1&31|0)==(k[a+400>>2]|0)){ki(a);d=k[e>>2]|0}k[a+(d<<3)+140>>2]=b;b=k[e>>2]|0;k[a+(b<<3)+144>>2]=c;k[e>>2]=b+1&31;return}function qi(){ic(52632,0)|0;Ta(26,52632,w|0)|0;return}function ri(a){a=a|0;Hb(a|0)|0;return}function si(a){a=a|0;wf(a);Bc(a+91656|0);Bc(a+91748|0);Bc(a+91840|0);Bc(a+91932|0);Bc(a+92024|0);ti(a);return}function ti(a){a=a|0;var b=0,c=0;xf(a);k[a+75208>>2]=0;k[a+83464>>2]=0;i[a+75196>>0]=0;k[a+75200>>2]=0;i[a+75204>>0]=0;Cc(a+91656|0);Cc(a+91748|0);Cc(a+91840|0);Cc(a+92024|0);Cc(a+91932|0);b=a+49776|0;c=k[b>>2]|0;if(!c){c=a+49780|0;k[c>>2]=0;a=a+49784|0;k[a>>2]=0;return}ym(c);k[b>>2]=0;c=a+49780|0;k[c>>2]=0;a=a+49784|0;k[a>>2]=0;return}function ui(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0;p=r;r=r+24592|0;m=p+16400|0;l=p;n=p+8200|0;g=Sc(d,0)|0;k[m>>2]=0;Dc(b);if(!(Fc(b,l,2048)|0)){f=0;r=p;return f|0}h=l+4|0;i=n+4|0;j=n+8|0;if(!c){while(1){o=Rc(l)|0;if(Pc(k[o>>2]|0)|0)fk(l,53064)|0;if(e?dd(l)|0:0){if(!(k[m>>2]|0))cd(d,m,2048);if(cf(l,m,f)|0){a=1;o=28;break}}else{if((k[l>>2]|0)==42?Pc(k[h>>2]|0)|0:0){k[n>>2]=46;k[i>>2]=47;Lc(j,g,2048)|0;a=n}else a=g;if(cf(Sc(l,0)|0,a,f)|0){a=1;o=28;break}}if(!(Fc(b,l,2048)|0)){a=0;o=28;break}}if((o|0)==28){r=p;return a|0}}a:while(1){a=Rc(l)|0;if(!(Pc(k[a>>2]|0)|0)){if(!(Uc(Oc(l)|0)|0))o=6}else{k[a>>2]=0;o=6}do if((o|0)==6){o=0;if(e?dd(l)|0:0){if(!(k[m>>2]|0))cd(d,m,2048);if(cf(l,m,f)|0){a=1;o=28;break a}else break}if((k[l>>2]|0)==42?Pc(k[h>>2]|0)|0:0){k[n>>2]=46;k[i>>2]=47;Lc(j,g,2048)|0;a=n}else a=g;if(cf(Sc(l,0)|0,a,f)|0){a=1;o=28;break a}}while(0);if(!(Fc(b,l,2048)|0)){a=0;o=28;break}}if((o|0)==28){r=p;return a|0}return 0}function vi(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0;m=(e|0)!=0;if(m&(f|0)!=0)k[e>>2]=0;n=b+32|0;if((kk(n)|0)>>>0>2047){o=0;return o|0}l=(i[b+8417>>0]|0)!=0;if(ui(0,a+91748|0,l,n,0,5)|0){o=0;return o|0}if((k[a+91860>>2]|0)!=0?!(ui(0,a+91840|0,l,n,0,5)|0):0){o=0;return o|0}j=b+8240|0;h=a+50344|0;g=k[h>>2]|0;h=k[h+4>>2]|0;if(!((g|0)==0&(h|0)==0)?(p=j,q=k[p+4>>2]|0,!(q>>>0<h>>>0|((q|0)==(h|0)?(k[p>>2]|0)>>>0<g>>>0:0))):0){q=0;return q|0}h=a+50352|0;g=k[h>>2]|0;h=k[h+4>>2]|0;if(!((g|0)==0&(h|0)==0)?(q=j,p=k[q+4>>2]|0,!(p>>>0>h>>>0|((p|0)==(h|0)?(k[q>>2]|0)>>>0>g>>>0:0))):0){q=0;return q|0}g=k[b+28>>2]|0;if(k[a>>2]&g){q=0;return q|0}if((i[a+8>>0]|0)!=0?(k[a+4>>2]&g|0)==0:0){q=0;return q|0}if(!l){h=b+8272|0;g=k[h>>2]|0;h=k[h+4>>2]|0;p=a+50360|0;q=k[p>>2]|0;p=k[p+4>>2]|0;if(!((q|0)==2147483647&(p|0)==2147483647|((p|0)>(h|0)|(p|0)==(h|0)&q>>>0>g>>>0))){q=0;return q|0}q=a+50368|0;p=k[q>>2]|0;q=k[q+4>>2]|0;if(((q|0)>(h|0)|(q|0)==(h|0)&p>>>0>=g>>>0)&((p|0)!=2147483647|(q|0)!=2147483647)){q=0;return q|0}}j=a+91656|0;Dc(j);h=Gc(j)|0;if(!h){q=0;return q|0}else g=1;while(1){if(cf(h,n,d)|0)break;h=Gc(j)|0;if(!h){g=0;o=24;break}else g=g+1|0}if((o|0)==24)return g|0;if(c){q=(Kc(h,n)|0)==0&1;i[c>>0]=q}if(!m){q=g;return q|0}Lc(e,h,f)|0;q=g;return q|0}function wi(a,b){a=a|0;b=b|0;Ec(a+91932|0,b);return}function xi(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;e=r;r=r+8192|0;d=k[a+49716>>2]|0;if((d|0)==2){b=1;r=e;return b|0}if((i[a+49796>>0]|0)!=0|(d|0)==1){Jd(b);b=0;r=e;return b|0}else{Lc(e,b,2048)|0;Jd(b);b=0;r=e;return b|0}return 0}function yi(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return 1}function zi(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;return}function Ai(a){a=a|0;return}function Bi(a){a=a|0;return}function Ci(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0;n=r;r=r+10256|0;d=n+8208|0;e=n;j=n+8192|0;f=a+12|0;i[f>>0]=0;i[f+1>>0]=0;i[f+2>>0]=0;i[f+3>>0]=0;m=yk(216688)|0;si(m);g=m+92120|0;Qd(g,m);h=m+178656|0;Ug(h,m);b=m+75176|0;k[b>>2]=0;c=a+8|0;k[m+216680>>2]=l[c>>0]|l[c+1>>0]<<8|l[c+2>>0]<<16|l[c+3>>0]<<24;Ec(m+91656|0,53064);i[d>>0]=0;c=l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24;if(c)Ic(d,c,2048)|0;c=a+4|0;Xc(d,l[c>>0]|l[c+1>>0]<<8|l[c+2>>0]<<16|l[c+3>>0]<<24,e,2048)|0;wi(m,e);k[m+49716>>2]=1;k[m+58764>>2]=1;d=a+36|0;k[m+75184>>2]=l[d>>0]|l[d+1>>0]<<8|l[d+2>>0]<<16|l[d+3>>0]<<24;d=a+40|0;k[m+75180>>2]=l[d>>0]|l[d+1>>0]<<8|l[d+2>>0]<<16|l[d+3>>0]<<24;i[m+49821>>0]=1;if(!(Xd(g,e,4)|0)){i[f>>0]=15;i[f+1>>0]=0;i[f+2>>0]=0;i[f+3>>0]=0;Ki(m);Ak(m);m=0;r=n;return m|0}if(!(Ud(g,0)|0)){b=k[b>>2]|0;do if(!b){b=k[8236]|0;if(b>>>0<=1){i[f>>0]=13;i[f+1>>0]=0;i[f+2>>0]=0;i[f+3>>0]=0;break}switch(b|0){case 8:{b=11;break}case 11:{b=24;break}case 6:{b=15;break}case 3:{b=12;break}case 5:{b=19;break}case 2:{b=18;break}case 9:{b=16;break}default:b=21}i[f>>0]=b;i[f+1>>0]=b>>8;i[f+2>>0]=b>>16;i[f+3>>0]=b>>24}else{i[f>>0]=b;i[f+1>>0]=b>>8;i[f+2>>0]=b>>16;i[f+3>>0]=b>>24}while(0);Ki(m);Ak(m);m=0;r=n;return m|0}c=a+32|0;b=l[m+170389>>0]|0;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24;if(i[m+170391>>0]|0){b=b|4;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24}if(i[m+170388>>0]|0){b=b|8;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24}if(i[m+170394>>0]|0){b=b|16;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24}if(i[m+170392>>0]|0){b=b|32;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24}if(i[m+170395>>0]|0){b=b|64;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24}if(i[m+170396>>0]|0){b=b|128;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24}if(i[m+170393>>0]|0){f=b|256;i[c>>0]=f;i[c+1>>0]=f>>8;i[c+2>>0]=f>>16;i[c+3>>0]=f>>24};k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;k[j+12>>2]=0;e=a+20|0;if((l[e>>0]|l[e+1>>0]<<8|l[e+2>>0]<<16|l[e+3>>0]<<24|0)!=0?Od(g,j)|0:0){b=k[j+4>>2]<<2|1;d=zm(0,b>>>0>32?b:32)|0;f=(d|0)==0;if(f)Af(32944);Ym(d|0,0,b|0)|0;me(k[j>>2]|0,d,b+-1|0)|0;o=(Zm(d|0)|0)+1|0;p=l[c>>0]|l[c+1>>0]<<8|l[c+2>>0]<<16|l[c+3>>0]<<24|2;i[c>>0]=p;i[c+1>>0]=p>>8;i[c+2>>0]=p>>16;i[c+3>>0]=p>>24;p=l[e>>0]|l[e+1>>0]<<8|l[e+2>>0]<<16|l[e+3>>0]<<24;b=o>>>0>p>>>0?20:1;c=a+28|0;i[c>>0]=b;i[c+1>>0]=b>>8;i[c+2>>0]=b>>16;i[c+3>>0]=b>>24;p=o>>>0<p>>>0?o:p;c=a+24|0;i[c>>0]=p;i[c+1>>0]=p>>8;i[c+2>>0]=p>>16;i[c+3>>0]=p>>24;b=a+16|0;_m(l[b>>0]|l[b+1>>0]<<8|l[b+2>>0]<<16|l[b+3>>0]<<24|0,d|0,p+-1|0)|0;if(o>>>0<=(l[e>>0]|l[e+1>>0]<<8|l[e+2>>0]<<16|l[e+3>>0]<<24)>>>0)i[(l[b>>0]|l[b+1>>0]<<8|l[b+2>>0]<<16|l[b+3>>0]<<24)+((l[c>>0]|l[c+1>>0]<<8|l[c+2>>0]<<16|l[c+3>>0]<<24)+-1)>>0]=0;if(!f)ym(d)}else{p=a+24|0;i[p>>0]=0;i[p+1>>0]=0;i[p+2>>0]=0;i[p+3>>0]=0;p=a+28|0;i[p>>0]=0;i[p+1>>0]=0;i[p+2>>0]=0;i[p+3>>0]=0}Wg(h,g);b=k[j>>2]|0;if(!b){p=m;r=n;return p|0}ym(b);p=m;r=n;return p|0}function Di(a){a=a|0;var b=0;if(!a){a=17;return a|0}b=ld(a+92120|0)|0;Ki(a);Ak(a);a=b?0:17;return a|0}function Ei(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;c=a+92120|0;d=ee(c,2)|0;k[a+216684>>2]=d;if((d|0)<1){if(((i[a+170389>>0]|0)!=0?(k[a+128324>>2]|0)==5:0)?(i[a+152132>>0]|0)!=0:0){if(!(ch(c,0,0,76)|0)){a=15;return a|0}d=a+170368|0;Zd(c,k[d>>2]|0,k[d+4>>2]|0,0);a=Ei(a,b)|0;return a|0}if(i[a+170404>>0]|0){a=12;return a|0}a=(i[a+170405>>0]|0)==0?10:24;return a|0}if((k[a+216680>>2]|0)==0?(i[a+143280>>0]|0)!=0:0){c=Fi(a,0,0,0,0,0)|0;if(c){a=c;return a|0}a=Ei(a,b)|0;return a|0}d=b+1024|0;nk(d,a+92144|0,1024)|0;me(d,b,1024)|0;d=b+6144|0;nk(d,a+134984|0,1024)|0;me(d,b+5120|0,1024)|0;d=b+10240|0;c=l[a+143280>>0]|0;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24;if(i[a+143281>>0]|0){c=c|2;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24}if(i[a+143283>>0]|0){c=c|4;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24}if(i[a+143368>>0]|0){c=c|16;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24}if(i[a+143369>>0]|0){c=c|32;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24}e=a+143216|0;d=k[e>>2]|0;e=k[e+4>>2]|0;c=b+10244|0;i[c>>0]=d;i[c+1>>0]=d>>8;i[c+2>>0]=d>>16;i[c+3>>0]=d>>24;c=b+10248|0;i[c>>0]=e;i[c+1>>0]=e>>8;i[c+2>>0]=e>>16;i[c+3>>0]=e>>24;c=a+143224|0;e=k[c>>2]|0;c=k[c+4>>2]|0;d=b+10252|0;i[d>>0]=e;i[d+1>>0]=e>>8;i[d+2>>0]=e>>16;i[d+3>>0]=e>>24;d=b+10256|0;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24;d=(k[a+143380>>2]|0)==0?2:3;c=b+10260|0;i[c>>0]=d;i[c+1>>0]=d>>8;i[c+2>>0]=d>>16;i[c+3>>0]=d>>24;c=i[a+134977>>0]|0;if((k[a+170384>>2]|0)==3)c=c<<24>>24==0?50:200;else c=c&255;d=b+10272|0;i[d>>0]=c;i[d+1>>0]=c>>8;i[d+2>>0]=c>>16;i[d+3>>0]=c>>24;d=a+143244|0;e=k[d>>2]|0;c=b+10264|0;i[c>>0]=e;i[c+1>>0]=e>>8;i[c+2>>0]=e>>16;i[c+3>>0]=e>>24;c=kf(a+143192|0)|0;e=b+10268|0;i[e>>0]=c;i[e+1>>0]=c>>8;i[e+2>>0]=c>>16;i[e+3>>0]=c>>24;e=(l[a+134978>>0]|0)+48|0;c=b+10276|0;i[c>>0]=e;i[c+1>>0]=e>>8;i[c+2>>0]=e>>16;i[c+3>>0]=e>>24;c=k[a+134980>>2]|0;e=b+10280|0;i[e>>0]=c;i[e+1>>0]=c>>8;i[e+2>>0]=c>>16;i[e+3>>0]=c>>24;e=b+10292|0;i[e>>0]=0;i[e+1>>0]=0;i[e+2>>0]=0;i[e+3>>0]=0;e=b+10296|0;i[e>>0]=0;i[e+1>>0]=0;i[e+2>>0]=0;i[e+3>>0]=0;e=(k[a+143372>>2]|0)>>>10;c=b+10300|0;i[c>>0]=e;i[c+1>>0]=e>>8;i[c+2>>0]=e>>16;i[c+3>>0]=e>>24;c=k[a+143240>>2]|0;if((c|0)==2|(c|0)==1){e=b+10304|0;i[e>>0]=1;i[e+1>>0]=0;i[e+2>>0]=0;i[e+3>>0]=0;e=0;return e|0}else if((c|0)==3){a=b+10304|0;i[a>>0]=2;i[a+1>>0]=0;i[a+2>>0]=0;i[a+3>>0]=0;a=b+10308|0;c=d+0|0;d=a+32|0;do{i[a>>0]=i[c>>0]|0;a=a+1|0;c=c+1|0}while((a|0)<(d|0));e=0;return e|0}else{e=b+10304|0;i[e>>0]=0;i[e+1>>0]=0;i[e+2>>0]=0;i[e+3>>0]=0;e=0;return e|0}return 0}function Fi(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0;p=r;r=r+4112|0;l=p+2056|0;h=p;m=p+2048|0;o=a+75176|0;k[o>>2]=0;j=k[a+216680>>2]|0;do if((j|0)==2|(j|0)==0)n=4;else{if((b|0)==0?(i[a+170388>>0]|0)==0:0){n=4;break}k[a+75172>>2]=b;g=a+16408|0;k[g>>2]=0;j=a+66980|0;k[j>>2]=0;if(c){Ic(l,c,2046)|0;ne(l,g,2048)|0;Vc(g,2048)}if(d){Ic(h,d,2046)|0;ne(h,j,2048)|0}if(e){nk(g,e,2048)|0;Vc(g,2048)}if(f)Lc(j,f,2048)|0;ik(a+75208|0,(b|0)==2?53072:53080)|0;i[a+50377>>0]=(b|0)!=2&1;i[m>>0]=0;g=a+178656|0;d=a+92120|0;h=a+216684|0;Xg(g,d,k[h>>2]|0,m)|0;j=a+92124|0;f=a+128324|0;while(1){if(!(k[j>>2]|0))break;if(!(ae(d)|0))break;if((k[f>>2]|0)!=3)break;Xg(g,d,k[h>>2]|0,m)|0;Vd(d)}a=a+170368|0;Zd(d,k[a>>2]|0,k[a+4>>2]|0,0)}while(0);if((n|0)==4){g=a+92120|0;if(((i[a+170389>>0]|0)!=0?(k[a+128324>>2]|0)==2:0)?(i[a+143281>>0]|0)!=0:0){if(!(ch(g,0,0,76)|0)){a=15;r=p;return a|0}a=a+170368|0;Zd(g,k[a>>2]|0,k[a+4>>2]|0,0);a=0;r=p;return a|0}Vd(g)}a=k[o>>2]|0;r=p;return a|0}function Gi(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return Fi(a,b,0,0,c,d)|0}function Hi(a,b,c){a=a|0;b=b|0;c=c|0;k[a+75184>>2]=b;k[a+75180>>2]=c;return}function Ii(a,b){a=a|0;b=b|0;var c=0,d=0;c=r;r=r+512|0;d=c;Xc(b,0,d,128)|0;Yf(a+40996|0,d);_f(d,512);r=c;return}function Ji(){return 6}function Ki(a){a=a|0;var b=0;Vg(a+178656|0);Rd(a+92120|0);b=k[a+92024>>2]|0;if(b)ym(b);b=k[a+91932>>2]|0;if(b)ym(b);b=k[a+91840>>2]|0;if(b)ym(b);b=k[a+91748>>2]|0;if(b)ym(b);b=k[a+91656>>2]|0;if(!b){yf(a);return}ym(b);yf(a);return}function Li(a){a=a|0;var b=0,c=0;He(a+24|0);b=a+6424|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[b+12>>2]=0;b=a+16|0;k[b>>2]=0;k[a>>2]=0;i[a+4>>0]=0;k[a+8>>2]=0;k[a+12>>2]=0;c=zk(65536)|0;k[b>>2]=c;k[a+20>>2]=0;i[a+6376>>0]=0;return}function Mi(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;g=a+8|0;if((b|0)!=0?(d=k[g>>2]|0,(d|0)!=0):0)do{f=d;d=k[d+16>>2]|0;e=k[f>>2]|0;if(e)Bk(e);Ak(f)}while((d|0)!=0);k[a>>2]=b;i[a+4>>0]=c&1;k[g>>2]=0;k[a+12>>2]=0;d=a+16|0;if(k[d>>2]|0){c=a+20|0;k[c>>2]=0;a=a+6376|0;i[a>>0]=0;return}c=zk(65536)|0;k[d>>2]=c;c=a+20|0;k[c>>2]=0;a=a+6376|0;i[a>>0]=0;return}function Ni(a){a=a|0;var b=0,c=0,d=0;b=k[a+8>>2]|0;if(b)do{d=b;b=k[b+16>>2]|0;c=k[d>>2]|0;if(c)Bk(c);Ak(d)}while((b|0)!=0);b=k[a+16>>2]|0;if(b)Bk(b);b=k[a+6424>>2]|0;if(!b){d=a+24|0;Ie(d);return}ym(b);d=a+24|0;Ie(d);return}function Oi(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0;e=a+6376|0;do if(!(i[e>>0]|0)){f=k[a>>2]|0;f=nc[k[(k[f>>2]|0)+20>>2]&15](f)|0;d=a+6448|0;k[d>>2]=f;k[d+4>>2]=O;i[a+6456>>0]=0;d=k[a>>2]|0;f=nc[k[(k[d>>2]|0)+20>>2]&15](d)|0;g=O;j=k[a>>2]|0;sc[k[(k[j>>2]|0)+16>>2]&15](j,b,c,0);if(((ae(k[a>>2]|0)|0)!=0?(h=k[a>>2]|0,(k[h+36204>>2]|0)==3):0)?(hk(h+60080|0,53088)|0)==0:0){j=k[a>>2]|0;b=j+78248|0;h=k[b+4>>2]|0;c=a+6384|0;k[c>>2]=k[b>>2];k[c+4>>2]=h;j=nc[k[(k[j>>2]|0)+20>>2]&15](j)|0;c=a+6392|0;k[c>>2]=j;k[c+4>>2]=O;c=(k[a>>2]|0)+68320|0;j=k[c+4>>2]|0;h=a+6400|0;k[h>>2]=k[c>>2];k[h+4>>2]=j;i[e>>0]=1;sc[k[(k[d>>2]|0)+16>>2]&15](d,f,g,0);break}sc[k[(k[d>>2]|0)+16>>2]&15](d,f,g,0);return}while(0);b=k[a>>2]|0;do if(i[b+68379>>0]|0){c=k[b+36172>>2]|0;if(!(i[c+41508>>0]|0))return;else{Ke(a+24|0,0,5,c+40996|0,b+68385|0,b+68401|0,k[b+68460>>2]|0,b+68427|0,b+68418|0)|0;break}}while(0);c=a+6408|0;b=a+6424|0;k[c+0>>2]=0;k[c+4>>2]=0;k[c+8>>2]=0;k[c+12>>2]=0;c=k[b>>2]|0;if(c){ym(c);k[b>>2]=0}k[a+6428>>2]=0;k[a+6432>>2]=0;h=a+6440|0;k[h>>2]=0;k[h+4>>2]=0;Pi(a)|0;return}function Pi(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0;e=k[a>>2]|0;h=nc[k[(k[e>>2]|0)+20>>2]&15](e)|0;j=O;d=k[a>>2]|0;l=a+6392|0;f=a+6408|0;g=f;l=Vm(k[g>>2]|0,k[g+4>>2]|0,k[l>>2]|0,k[l+4>>2]|0)|0;sd(d,l,O,0);l=a+6400|0;d=f;d=Um(k[l>>2]|0,k[l+4>>2]|0,k[d>>2]|0,k[d+4>>2]|0)|0;l=O;g=a+6416|0;c=k[g>>2]|0;b=65536-c|0;b=l>>>0<0|(l|0)==0&d>>>0<b>>>0?d:b;d=k[a>>2]|0;b=(i[d+68379>>0]|0)==0?b:b&-16;if(!b){a=0;f=k[e>>2]|0;f=f+16|0;f=k[f>>2]|0;sc[f&15](e,h,j,0);return a|0}l=a+16|0;b=rd(d,(k[l>>2]|0)+c|0,b)|0;if((b|0)<1){a=0;f=k[e>>2]|0;f=f+16|0;f=k[f>>2]|0;sc[f&15](e,h,j,0);return a|0}if(i[(k[a>>2]|0)+68379>>0]|0)Je(a+24|0,(k[l>>2]|0)+(k[g>>2]|0)|0,b&-16);l=f;l=Vm(k[l>>2]|0,k[l+4>>2]|0,b|0,((b|0)<0)<<31>>31|0)|0;a=f;k[a>>2]=l;k[a+4>>2]=O;k[g>>2]=(k[g>>2]|0)+b;a=b;f=k[e>>2]|0;f=f+16|0;f=k[f>>2]|0;sc[f&15](e,h,j,0);return a|0}function Qi(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0;l=a+6376|0;if(!(i[l>>0]|0)){d=0;return d|0}e=a+6440|0;g=a+6428|0;m=a+6448|0;do{f=e;f=Vm(k[g>>2]|0,0,k[f>>2]|0,k[f+4>>2]|0)|0;n=O;j=m;h=k[j+4>>2]|0;if(n>>>0>h>>>0|((n|0)==(h|0)?f>>>0>(k[j>>2]|0)>>>0:0))break}while(Ri(a)|0);if(!(i[l>>0]|0)){if(!(i[a+6456>>0]|0)){n=0;return n|0}n=m;sd(k[a>>2]|0,k[n>>2]|0,k[n+4>>2]|0,0);n=0;return n|0}j=m;h=k[j>>2]|0;j=k[j+4>>2]|0;f=e;e=k[f>>2]|0;f=k[f+4>>2]|0;if(!(j>>>0<f>>>0|(j|0)==(f|0)&h>>>0<e>>>0)?(o=Vm(h|0,j|0,c|0,0)|0,p=O,n=Vm(k[g>>2]|0,0,e|0,f|0)|0,g=O,!(p>>>0>g>>>0|(p|0)==(g|0)&o>>>0>n>>>0)):0){o=Um(h|0,j|0,e|0,f|0)|0;_m(b|0,(k[a+6424>>2]|0)+o|0,c|0)|0;k[d>>2]=c;o=m;o=Vm(k[o>>2]|0,k[o+4>>2]|0,c|0,0)|0;p=m;k[p>>2]=o;k[p+4>>2]=O;i[a+6456>>0]=1;p=1;return p|0}e=a+6456|0;if(i[e>>0]|0){sd(k[a>>2]|0,h,j,0);i[e>>0]=0}e=rd(k[a>>2]|0,b,c)|0;if((e|0)<0){i[l>>0]=0;p=0;return p|0}else{k[d>>2]=e;o=m;o=Vm(k[o>>2]|0,k[o+4>>2]|0,e|0,((e|0)<0)<<31>>31|0)|0;p=m;k[p>>2]=o;k[p+4>>2]=O;p=1;return p|0}return 0}function Ri(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0;m=r;r=r+48|0;d=m;l=m+8|0;Qe(l,0);if(Ui(a,l)|0){Xe(l)|0;f=Xe(l)|0;g=O;h=Xe(l)|0;i=a+6424|0;j=a+6432|0;c=k[j>>2]|0;e=a+6428|0;k[e>>2]=h;if(c>>>0<h>>>0){b=k[a+6436>>2]|0;if((b|0)!=0&h>>>0>b>>>0){k[d>>2]=b;Jf(32944,53104,d);Af(32944);c=k[j>>2]|0;b=k[e>>2]|0}else b=h;c=c+32+(c>>>2)|0;b=b>>>0>c>>>0?b:c;c=zm(k[i>>2]|0,b)|0;if(!c)Af(32944);k[i>>2]=c;k[j>>2]=b}Ze(l,k[i>>2]|0,h)|0;h=a+6384|0;h=Um(k[h>>2]|0,k[h+4>>2]|0,f|0,g|0)|0;c=a+6440|0;k[c>>2]=h;k[c+4>>2]=O;c=1}else c=0;b=k[l>>2]|0;if(!b){r=m;return c|0}ym(b);r=m;return c|0}function Si(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;if(!(i[a+6376>>0]|0)){a=0;return a|0}if((d|0)==1)f=7;else if(!d){e=a+6448|0;g=e;h=k[g+4>>2]|0;if(h>>>0>c>>>0|((h|0)==(c|0)?(k[g>>2]|0)>>>0>b>>>0:0)?(g=a+6440|0,h=k[g+4>>2]|0,h>>>0>c>>>0|((h|0)==(c|0)?(k[g>>2]|0)>>>0>b>>>0:0)):0){g=a+6384|0;Oi(a,k[g>>2]|0,k[g+4>>2]|0)}g=e;k[g>>2]=b;k[g+4>>2]=c;if((d|0)==1)f=7}if((f|0)==7){g=a+6448|0;d=g;d=Vm(k[d>>2]|0,k[d+4>>2]|0,b|0,c|0)|0;k[g>>2]=d;k[g+4>>2]=O;i[a+6456>>0]=1;g=1;return g|0}e=a+6456|0;i[e>>0]=1;if((d|0)!=2){g=1;return g|0}sd(k[a>>2]|0,b,c,2);d=vd(k[a>>2]|0)|0;g=a+6448|0;k[g>>2]=d;k[g+4>>2]=O;i[e>>0]=0;g=1;return g|0}function Ti(a,b){a=a|0;b=b|0;var c=0,d=0;if(!(i[a+6376>>0]|0)){a=0;return a|0}d=a+6448|0;c=k[d+4>>2]|0;a=b;k[a>>2]=k[d>>2];k[a+4>>2]=c;a=1;return a|0}function Ui(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0;h=a+6420|0;c=k[h>>2]|0;j=a+6416|0;if((65536-c|0)>>>0<256){g=(k[j>>2]|0)-c|0;e=k[a+16>>2]|0;_m(e|0,e+c|0,g|0)|0;k[h>>2]=0;k[j>>2]=g;Pi(a)|0;c=k[h>>2]|0}if((c+7|0)>>>0>(k[j>>2]|0)>>>0){j=0;return j|0}g=a+16|0;Se(b,(k[g>>2]|0)+c|0,7);k[h>>2]=(k[h>>2]|0)+7;e=Ve(b)|0;c=Ye(b,4)|0;f=Xe(b)|0;d=c+-3+f|0;if((d|0)<0|(c|0)==0|(f|0)==0&(O|0)==0){i[a+6376>>0]=0;j=0;return j|0}c=k[h>>2]|0;f=(k[j>>2]|0)-c|0;a:do if((d|0)>0){while(1){l=f>>>0<d>>>0?f:d;Se(b,(k[g>>2]|0)+c|0,l);k[h>>2]=(k[h>>2]|0)+l;d=d-l|0;if((d|0)<=0)break a;k[h>>2]=0;k[j>>2]=0;if(!(Pi(a)|0)){c=0;break}c=k[h>>2]|0}return c|0}while(0);l=(e|0)==($e(b)|0);return l|0}function Vi(){var a=0;a=yk(156)|0;Ym(a|0,0,156)|0;return a|0}function Wi(a){a=a|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Xi(a,b){a=a|0;b=b|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function Yi(a){a=a|0;a=a+4|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Zi(a,b){a=a|0;b=b|0;a=a+4|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function _i(a){a=a|0;a=a+8|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function $i(a,b){a=a|0;b=b|0;a=a+8|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function aj(a){a=a|0;a=a+12|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function bj(a){a=a|0;a=a+16|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function cj(a,b){a=a|0;b=b|0;a=a+16|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function dj(a){a=a|0;a=a+20|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function ej(a,b){a=a|0;b=b|0;a=a+20|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function fj(a){a=a|0;a=a+24|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function gj(a){a=a|0;a=a+28|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function hj(a){a=a|0;a=a+32|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function ij(a){a=a|0;a=a+36|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function jj(a,b){a=a|0;b=b|0;a=a+36|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function kj(a){a=a|0;a=a+40|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function lj(a,b){a=a|0;b=b|0;a=a+40|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function mj(a,b){a=a|0;b=b|0;a=a+(b<<2)+44|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function nj(a,b,c){a=a|0;b=b|0;c=c|0;a=a+(b<<2)+44|0;i[a>>0]=c;i[a+1>>0]=c>>8;i[a+2>>0]=c>>16;i[a+3>>0]=c>>24;return}function oj(a){a=a|0;if(!a)return;Ak(a);return}function pj(){var a=0;a=yk(14396)|0;Ym(a|0,0,14396)|0;return a|0}function qj(a,b){a=a|0;b=b|0;return i[a+b>>0]|0}function rj(a,b){a=a|0;b=b|0;a=a+(b<<2)+1024|0;return (l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24)&65535|0}function sj(a,b){a=a|0;b=b|0;return i[a+b+5120>>0]|0}function tj(a,b){a=a|0;b=b|0;a=a+(b<<2)+6144|0;return (l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24)&65535|0}function uj(a){a=a|0;a=a+10240|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function vj(a){a=a|0;a=a+10244|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function wj(a){a=a|0;a=a+10248|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function xj(a){a=a|0;a=a+10252|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function yj(a){a=a|0;a=a+10256|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function zj(a){a=a|0;a=a+10260|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Aj(a){a=a|0;a=a+10264|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Bj(a){a=a|0;a=a+10268|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Cj(a){a=a|0;a=a+10272|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Dj(a){a=a|0;a=a+10276|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Ej(a){a=a|0;a=a+10280|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Fj(a){a=a|0;a=a+10284|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Gj(a,b){a=a|0;b=b|0;a=a+10284|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function Hj(a){a=a|0;a=a+10288|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Ij(a,b){a=a|0;b=b|0;a=a+10288|0;i[a>>0]=b;i[a+1>>0]=b>>8;i[a+2>>0]=b>>16;i[a+3>>0]=b>>24;return}function Jj(a){a=a|0;a=a+10292|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Kj(a){a=a|0;a=a+10296|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Lj(a){a=a|0;a=a+10300|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Mj(a){a=a|0;a=a+10304|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Nj(a,b){a=a|0;b=b|0;return i[a+b+10308>>0]|0}function Oj(a,b){a=a|0;b=b|0;a=a+(b<<2)+10340|0;return l[a>>0]|l[a+1>>0]<<8|l[a+2>>0]<<16|l[a+3>>0]<<24|0}function Pj(a,b,c){a=a|0;b=b|0;c=c|0;a=a+(b<<2)+10340|0;i[a>>0]=c;i[a+1>>0]=c>>8;i[a+2>>0]=c>>16;i[a+3>>0]=c>>24;return}function Qj(a){a=a|0;if(!a)return;Ak(a);return}function Rj(a){a=a|0;if(!a)return;Ak(a);return}function Sj(a){a=a|0;if(a>>>0<131072){a=(l[53280+((l[53280+(a>>>8)>>0]|0)<<5|a>>>3&31)>>0]|0)>>>(a&7)&1;return a|0}else{a=a>>>0<196606&1;return a|0}return 0}function Tj(a){a=a|0;return (a+-48|0)>>>0<10|0}function Uj(a){a=a|0;return tk(a,0)|0}function Vj(a){a=a|0;return tk(a,1)|0}function Wj(a){a=a|0;return (a>>>0<128?a:-1)|0}function Xj(a,b,c){a=a|0;b=b|0;c=c|0;return Yj(0,a,b,(c|0)!=0?c:57208)|0}function Yj(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;h=r;r=r+16|0;e=h;k[e>>2]=a;g=(d|0)==0?57216:d;d=k[g>>2]|0;a:do if(!b){if(!d){c=0;r=h;return c|0}}else{if(!a){k[e>>2]=e;a=e}if(!c){c=-2;r=h;return c|0}do if(!d){d=i[b>>0]|0;e=d&255;if(d<<24>>24>-1){k[a>>2]=e;c=d<<24>>24!=0&1;r=h;return c|0}else{d=e+-194|0;if(d>>>0>50)break a;e=c+-1|0;d=k[57e3+(d<<2)>>2]|0;b=b+1|0;break}}else e=c;while(0);b:do if(e){f=i[b>>0]|0;j=(f&255)>>>3;if((j+-16|j+(d>>26))>>>0>7)break a;while(1){b=b+1|0;d=(f&255)+-128|d<<6;e=e+-1|0;if((d|0)>=0)break;if(!e)break b;f=i[b>>0]|0;if((f&-64)<<24>>24!=-128)break a}k[g>>2]=0;k[a>>2]=d;c=c-e|0;r=h;return c|0}while(0);k[g>>2]=d;c=-2;r=h;return c|0}while(0);k[g>>2]=0;c=ac()|0;k[c>>2]=84;c=-1;r=h;return c|0}function Zj(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0;e=k[b>>2]|0;if((d|0)!=0?(f=k[d>>2]|0,(f|0)!=0):0)if(!a){d=c;g=e;j=16}else{k[d>>2]=0;d=c;g=f;h=e;j=36}else if(!a){d=c;j=7}else{d=c;j=6}a:while(1)if((j|0)==6){if(!d){j=26;break}while(1){f=i[e>>0]|0;b:do if(((f&255)+-1|0)>>>0<127?(e&3|0)==0&d>>>0>4:0){while(1){f=k[e>>2]|0;if((f+-16843009|f)&-2139062144){f=f&255;break b}k[a>>2]=f&255;k[a+4>>2]=l[e+1>>0];k[a+8>>2]=l[e+2>>0];f=e+4|0;g=a+16|0;k[a+12>>2]=l[e+3>>0];d=d+-4|0;if(d>>>0>4){a=g;e=f}else{e=f;a=g;break}}f=i[e>>0]|0}while(0);f=f&255;if((f+-1|0)>>>0>=127)break;e=e+1|0;k[a>>2]=f;d=d+-1|0;if(!d){j=26;break a}else a=a+4|0}f=f+-194|0;if(f>>>0>50){j=47;break}g=k[57e3+(f<<2)>>2]|0;h=e+1|0;j=36;continue}else if((j|0)==7){f=i[e>>0]|0;if(((f&255)+-1|0)>>>0<127?(e&3|0)==0:0){f=k[e>>2]|0;if(!((f+-16843009|f)&-2139062144))do{e=e+4|0;d=d+-4|0;f=k[e>>2]|0}while(((f+-16843009|f)&-2139062144|0)==0);f=f&255}f=f&255;if((f+-1|0)>>>0<127){d=d+-1|0;e=e+1|0;j=7;continue}f=f+-194|0;if(f>>>0>50){j=47;break}f=k[57e3+(f<<2)>>2]|0;g=e+1|0;j=16;continue}else if((j|0)==16){j=(l[g>>0]|0)>>>3;if((j+-16|j+(f>>26))>>>0>7){j=17;break}e=g+1|0;if(f&33554432){if((i[e>>0]&-64)<<24>>24!=-128){j=20;break}e=g+2|0;if(f&524288){if((i[e>>0]&-64)<<24>>24!=-128){j=23;break}e=g+3|0}}d=d+-1|0;j=7;continue}else if((j|0)==36){f=l[h>>0]|0;j=f>>>3;if((j+-16|j+(g>>26))>>>0>7){j=37;break}e=h+1|0;g=f+-128|g<<6;if((g|0)<0){f=l[e>>0]|0;if((f&192|0)!=128){j=40;break}e=h+2|0;f=f+-128|g<<6;if((f|0)<0){e=l[e>>0]|0;if((e&192|0)!=128){j=43;break}f=e+-128|f<<6;e=h+3|0}}else f=g;k[a>>2]=f;a=a+4|0;d=d+-1|0;j=6;continue}if((j|0)==17){e=g+-1|0;j=46}else if((j|0)==20){e=g+-1|0;j=46}else if((j|0)==23){e=g+-1|0;j=46}else if((j|0)==26){k[b>>2]=e;j=c;return j|0}else if((j|0)==37){f=g;e=h+-1|0;j=46}else if((j|0)==40){f=g;e=h+-1|0;j=46}else if((j|0)==43){e=h+-1|0;j=46}if((j|0)==46)if(!f)j=47;if((j|0)==47)if(!(i[e>>0]|0)){if(a){k[a>>2]=0;k[b>>2]=0}j=c-d|0;return j|0}j=ac()|0;k[j>>2]=84;if(!a){j=-1;return j|0}k[b>>2]=e;j=-1;return j|0}function _j(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=r;r=r+16|0;e=d;k[e>>2]=b;a=Zj(a,e,c,0)|0;r=d;return a|0}function $j(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;g=r;r=r+16|0;d=g;k[d>>2]=a;if(!b){b=0;r=g;return b|0}do if(c){if(!a){k[d>>2]=d;f=d}else f=a;d=i[b>>0]|0;a=d&255;if(d<<24>>24>-1){k[f>>2]=a;b=d<<24>>24!=0&1;r=g;return b|0}d=a+-194|0;if(d>>>0<=50){a=b+1|0;e=k[57e3+(d<<2)>>2]|0;if(c>>>0<4?(e&-2147483648>>>((c*6|0)+-6|0)|0)!=0:0)break;d=l[a>>0]|0;c=d>>>3;if((c+-16|c+(e>>26))>>>0<=7){d=d+-128|e<<6;if((d|0)>=0){k[f>>2]=d;b=2;r=g;return b|0}a=l[b+2>>0]|0;if((a&192|0)==128){a=a+-128|d<<6;if((a|0)>=0){k[f>>2]=a;b=3;r=g;return b|0}d=l[b+3>>0]|0;if((d&192|0)==128){k[f>>2]=d+-128|a<<6;b=4;r=g;return b|0}}}}}while(0);b=ac()|0;k[b>>2]=84;b=-1;r=g;return b|0}function ak(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0;n=r;r=r+16|0;m=n;if(!a){e=k[b>>2]|0;d=k[e>>2]|0;if(!d){b=0;r=n;return b|0}else f=0;while(1){if(d>>>0>127){d=Fm(m,d,0)|0;if((d|0)==-1){l=-1;g=26;break}}else d=1;f=d+f|0;e=e+4|0;d=k[e>>2]|0;if(!d){l=f;g=26;break}}if((g|0)==26){r=n;return l|0}}a:do if(c>>>0>3){d=c;f=k[b>>2]|0;while(1){e=k[f>>2]|0;if((e+-1|0)>>>0>126){if(!e){h=a;j=d;break}e=Fm(a,e,0)|0;if((e|0)==-1){l=-1;g=26;break}a=a+e|0;d=d-e|0}else{i[a>>0]=e;a=a+1|0;d=d+-1|0;f=k[b>>2]|0}f=f+4|0;k[b>>2]=f;if(d>>>0<=3)break a}if((g|0)==26){r=n;return l|0}i[h>>0]=0;k[b>>2]=0;b=c-j|0;r=n;return b|0}else d=c;while(0);if(!d){b=c;r=n;return b|0}e=k[b>>2]|0;while(1){f=k[e>>2]|0;if((f+-1|0)>>>0>126){if(!f){o=a;p=d;g=19;break}f=Fm(m,f,0)|0;if((f|0)==-1){l=-1;g=26;break}if(d>>>0<f>>>0){q=d;g=22;break}Fm(a,k[e>>2]|0,0)|0;a=a+f|0;d=d-f|0}else{i[a>>0]=f;a=a+1|0;d=d+-1|0;e=k[b>>2]|0}e=e+4|0;k[b>>2]=e;if(!d){l=c;g=26;break}}if((g|0)==19){i[o>>0]=0;k[b>>2]=0;b=c-p|0;r=n;return b|0}else if((g|0)==22){b=c-q|0;r=n;return b|0}else if((g|0)==26){r=n;return l|0}return 0}function bk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=r;r=r+16|0;f=e;k[f>>2]=d;a=dk(a,b,c,f)|0;r=e;return a|0}function ck(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0;h=r;r=r+128|0;d=h+112|0;f=h+72|0;e=h;g=f+0|0;i=g+36|0;do{k[g>>2]=0;g=g+4|0}while((g|0)<(i|0));k[d>>2]=k[c>>2];if((uk(0,b,d,e,f)|0)<0){g=-1;r=h;return g|0}else{g=uk(a,b,d,e,f)|0;r=h;return g|0}return 0}function dk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;f=r;e=k[14442]|0;if(!e){e=ib(57776,57816)|0;k[14442]=e}d=ck(e,c,d)|0;Na(k[14442]|0);c=r;r=r+((1*(d+1|0)|0)+15&-16)|0;Aa(c|0,1,d|0,k[14442]|0)|0;Na(k[14442]|0);i[c+d>>0]=0;a=_j(a,c,b)|0;r=f;return (a>>>0>=b>>>0?-1:a)|0}function ek(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;f=r;r=r+16|0;e=f;a:do if(a>>>0>=128){c=Em(e,a)|0;if((c|0)>=0){if((c|0)>0){d=0;do{if((dc(i[e+d>>0]|0,b|0)|0)==-1){a=-1;break a}d=d+1|0}while((d|0)<(c|0))}}else a=-1}else a=dc(a|0,b|0)|0;while(0);r=f;return a|0}function fk(a,b){a=a|0;b=b|0;ik(a+((kk(a)|0)<<2)|0,b)|0;return a|0}function gk(a,b){a=a|0;b=b|0;var c=0;if(!b){b=a+((kk(a)|0)<<2)|0;return b|0}else c=a;while(1){a=k[c>>2]|0;if((a|0)==0|(a|0)==(b|0))break;else c=c+4|0}b=(a|0)!=0?c:0;return b|0}function hk(a,b){a=a|0;b=b|0;var c=0,d=0;c=k[a>>2]|0;d=k[b>>2]|0;if((c|0)!=(d|0)|(c|0)==0|(d|0)==0){a=c;b=d;b=a-b|0;return b|0}do{a=a+4|0;b=b+4|0;d=k[a>>2]|0;c=k[b>>2]|0}while(!((d|0)!=(c|0)|(d|0)==0|(c|0)==0));b=d-c|0;return b|0}function ik(a,b){a=a|0;b=b|0;var c=0,d=0;c=a;while(1){d=k[b>>2]|0;k[c>>2]=d;if(!d)break;else{c=c+4|0;b=b+4|0}}return a|0}function jk(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;c=k[b>>2]|0;if(!c){a=kk(a)|0;return a|0}if(!(k[b+4>>2]|0)){c=gk(a,c)|0;if(!c){a=kk(a)|0;return a|0}else{a=c-a>>2;return a|0}}else{c=k[a>>2]|0;a:do if(!c)c=a;else{e=a;d=c;while(1){c=e+4|0;if(gk(b,d)|0){c=e;break a}d=k[c>>2]|0;if(!d)break;else e=c}}while(0);a=c-a>>2;return a|0}return 0}function kk(a){a=a|0;var b=0;b=a;while(1)if(!(k[b>>2]|0))break;else b=b+4|0;return b-a>>2|0}function lk(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;d=a+((kk(a)|0)<<2)|0;a:do if(c){e=d;while(1){f=k[b>>2]|0;if(!f){d=e;break a}c=c+-1|0;d=e+4|0;k[e>>2]=f;if(!c)break;else{b=b+4|0;e=d}}}while(0);k[d>>2]=0;return a|0}function mk(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;if(!c){f=0;return f|0}else{e=c;d=b}while(1){b=k[a>>2]|0;c=k[d>>2]|0;if((b|0)!=(c|0)|(b|0)==0|(c|0)==0)break;e=e+-1|0;if(!e){c=0;f=5;break}else{d=d+4|0;a=a+4|0}}if((f|0)==5)return c|0;f=b-c|0;return f|0}function nk(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;a:do if(!c){b=a;c=0}else{d=b;e=a;while(1){f=k[d>>2]|0;if(!f){b=e;break a}c=c+-1|0;b=e+4|0;k[e>>2]=f;if(!c){c=0;break}else{d=d+4|0;e=b}}}while(0);sk(b,0,c)|0;return a|0}function ok(a,b){a=a|0;b=b|0;a=a+((jk(a,b)|0)<<2)|0;return ((k[a>>2]|0)!=0?a:0)|0}function pk(a,b){a=a|0;b=b|0;var c=0;c=kk(a)|0;a:do if((c|0)>-1){c=a+(c<<2)|0;while(1){if((k[c>>2]|0)==(b|0))break a;c=c+-4|0;if(c>>>0<a>>>0){c=0;break}}}else c=0;while(0);return c|0}function qk(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;c=k[a>>2]|0;a:do if(!c)c=a;else{e=a;d=c;while(1){c=e+4|0;if(!(gk(b,d)|0)){c=e;break a}d=k[c>>2]|0;if(!d)break;else e=c}}while(0);return c-a>>2|0}function rk(a,b,c){a=a|0;b=b|0;c=c|0;a:do if(!c)a=0;else while(1){if((k[a>>2]|0)==(b|0))break a;c=c+-1|0;if(!c){a=0;break}else a=a+4|0}while(0);return a|0}function sk(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if(!c)return a|0;else d=a;while(1){c=c+-1|0;k[d>>2]=b;if(!c)break;else d=d+4|0}return a|0}function tk(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,k=0;h=(b<<1)+-1|0;g=b+-1|0;if((Sj(a)|0)==0|(a+-1536|0)>>>0<2560|(a+-11776|0)>>>0<30784|(a+-43008|0)>>>0<22272){k=a;return k|0}c=(b|0)!=0;if(c&(a+-4256|0)>>>0<46){if((a|0)>4293?!((a|0)==4295|(a|0)==4301):0){k=a;return k|0}k=a+7264|0;return k|0}if((a+-11520|0)>>>0<38&(c^1)){if((a|0)>11557?!((a|0)==11559|(a|0)==11565):0){k=a;return k|0}k=a+-7264|0;return k|0}else f=0;do{e=i[56258+(f<<2)>>0]|0;d=e<<24>>24;c=a-(m[56256+(f<<2)>>1]|0)|0;if((c-(d&g)|0)>>>0<(l[56259+(f<<2)>>0]|0)>>>0){k=13;break}f=f+1|0}while((f|0)!=61);if((k|0)==13)if(e<<24>>24==1){k=b+a-(c&1)|0;return k|0}else{k=(ka(d,h)|0)+a|0;return k|0}e=1-b|0;c=j[56504+(e<<1)>>1]|0;a:do if(c<<16>>16){d=c;c=0;while(1){if((d&65535|0)==(a|0))break;c=c+1|0;d=j[56504+(c<<2)+(e<<1)>>1]|0;if(!(d<<16>>16))break a}k=m[56504+(c<<2)+(b<<1)>>1]|0;return k|0}while(0);if((a+-66600+(b*40|0)|0)>>>0>=40){k=a;return k|0}k=a+-40+(b*80|0)|0;return k|0}function uk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,l=0,m=0,n=0,o=0,q=0,s=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0.0;Q=r;r=r+48|0;L=Q;I=Q+32|0;M=Q+28|0;A=(a|0)!=0;x=0;y=0;f=0;h=0;l=0;a:while(1){do if((f|0)>-1){if((h|0)<=(2147483647-f|0)){z=h+f|0;break}if(!(k[a>>2]&32)){z=ac()|0;k[z>>2]=75;z=-1}else z=-1}else z=f;while(0);f=k[b>>2]|0;if(!f){J=z;K=l;N=97;break}else h=b;while(1){if((f|0)==37|(f|0)==0)break;w=h+4|0;f=k[w>>2]|0;h=w}w=(qk(h,57224)|0)>>>1;m=w<<1;g=h+(m<<2)|0;w=h+(w<<2)-b>>2;if(A){if(w){f=w;while(1){f=f+-1|0;ek(k[b>>2]|0,a)|0;if(!f){N=13;break}else b=b+4|0}}}else N=13;if((N|0)==13?(N=0,(w|0)!=0):0){f=z;b=g;h=w;continue}b=h+((m|1)<<2)|0;if((Tj(k[b>>2]|0)|0)!=0?(k[h+(m+2<<2)>>2]|0)==36:0){u=(k[b>>2]|0)+-48|0;l=1;h=h+(m+3<<2)|0}else{u=-1;h=b}b=k[h>>2]|0;b:do if((b&-32|0)==32){g=0;while(1){f=1<<b+-32;if(!(f&75913)){f=g;break b}f=f|g;h=h+4|0;b=k[h>>2]|0;if((b&-32|0)==32)g=f;else break}}else f=0;while(0);do if((b|0)==42){b=h+4|0;if((Tj(k[b>>2]|0)|0)!=0?(k[h+8>>2]|0)==36:0){k[e+((k[b>>2]|0)+-48<<2)>>2]=10;g=1;h=h+12|0;b=k[d+((k[b>>2]|0)+-48<<3)>>2]|0}else{if(l){O=-1;N=115;break a}if(!A){s=f;h=b;v=0;q=0;break}g=k[c>>2]|0;v=k[g>>2]|0;k[c>>2]=g+4;g=0;h=b;b=v}if((b|0)<0){s=f|8192;v=g;q=0-b|0}else{s=f;v=g;q=b}}else if(Tj(b)|0){b=0;do{b=(b*10|0)+-48+(k[h>>2]|0)|0;h=h+4|0}while((Tj(k[h>>2]|0)|0)!=0);if((b|0)<0){O=-1;N=115;break a}else{s=f;v=l;q=b}}else{s=f;v=l;q=0}while(0);c:do if((k[h>>2]|0)==46){f=h+4|0;b=k[f>>2]|0;if((b|0)!=42){if(!(Tj(b)|0)){h=f;f=0;break}else{b=f;f=0}while(1){f=(f*10|0)+-48+(k[b>>2]|0)|0;h=h+8|0;if(!(Tj(k[h>>2]|0)|0))break c;else{n=b;b=h;h=n}}}f=h+8|0;b=(k[f>>2]|0)+-48|0;if(b>>>0<10?(k[h+12>>2]|0)==36:0){k[e+(b<<2)>>2]=10;h=h+16|0;f=k[d+((k[f>>2]|0)+-48<<3)>>2]|0;break}if(v){O=-1;N=115;break a}if(A){h=k[c>>2]|0;n=k[h>>2]|0;k[c>>2]=h+4;h=f;f=n}else{h=f;f=0}}else f=-1;while(0);l=0;while(1){m=k[h>>2]|0;g=m+-65|0;if(g>>>0>57){O=-1;N=115;break a}b=h+4|0;g=i[57232+(l*58|0)+g>>0]|0;n=g&255;if((n+-1|0)>>>0<8){h=b;l=n}else{o=g;break}}if(!(o<<24>>24)){O=-1;N=115;break}g=(u|0)>-1;d:do if(o<<24>>24==19)if(g){O=-1;N=115;break a}else{E=x;F=y;N=63}else{if(g){k[e+(u<<2)>>2]=n;F=d+(u<<3)|0;E=k[F>>2]|0;F=k[F+4>>2]|0;N=63;break}if(!A){O=0;N=115;break a}if((o&255)>20){B=m;C=x;D=y}else do switch(n|0){case 9:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=y;N=64;break d}case 10:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=((H|0)<0)<<31>>31;N=64;break d}case 12:{N=k[c>>2]|0;G=N;H=k[G>>2]|0;G=k[G+4>>2]|0;k[c>>2]=N+8;N=64;break d}case 14:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=0;H=H&65535;N=64;break d}case 13:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=(((H&65535)<<16>>16|0)<0)<<31>>31;H=H<<16>>16;N=64;break d}case 15:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=(((H&255)<<24>>24|0)<0)<<31>>31;H=H<<24>>24;N=64;break d}case 16:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=0;H=H&255;N=64;break d}case 17:{G=k[c>>2]|0;k[t>>2]=k[G>>2];k[t+4>>2]=k[G+4>>2];R=+p[t>>3];k[c>>2]=G+8;p[t>>3]=R;G=k[t+4>>2]|0;H=k[t>>2]|0;N=64;break d}case 11:{G=k[c>>2]|0;H=k[G>>2]|0;k[c>>2]=G+4;G=0;N=64;break d}case 18:{E=k[c>>2]|0;k[t>>2]=k[E>>2];k[t+4>>2]=k[E+4>>2];R=+p[t>>3];k[c>>2]=E+8;p[t>>3]=R;E=k[t>>2]|0;F=k[t+4>>2]|0;N=63;break d}default:{G=y;H=x;N=64;break d}}while(0)}while(0);if((N|0)==63){N=0;if(A){G=F;H=E;N=64}else{x=E;y=F;f=z;h=w;l=v;continue}}if((N|0)==64){N=0;B=k[h>>2]|0;C=H;D=G}h=(l|0)!=0&(B&15|0)==3?B&-33:B;switch(h|0){case 99:{ek(Wj(C)|0,a)|0;x=C;y=D;f=z;h=1;l=v;continue a}case 115:{n=C;g=(f|0)<0?2147483647:f;if((g|0)>0){l=n;h=0;while(1){f=$j(M,l,4)|0;if((f|0)<=0)break;h=h+1|0;if((h|0)<(g|0))l=l+f|0;else break}if((f|0)<0){O=-1;N=115;break a}else m=h}else m=0;h=(q|0)<(m|0)?m:q;l=(s&8192|0)!=0;if(!l){k[L>>2]=h-m;k[L+4>>2]=60248;ob(a|0,57696,L|0)|0}if(m){f=n;g=m;do{g=g+-1|0;f=f+($j(M,f,4)|0)|0;ek(k[M>>2]|0,a)|0}while((g|0)!=0)}if(!l){x=C;y=D;f=z;l=v;continue a}k[L>>2]=h-m;k[L+4>>2]=60248;ob(a|0,57696,L|0)|0;x=C;y=D;f=z;l=v;continue a}case 110:switch(l|0){case 1:{k[C>>2]=z;x=C;y=D;f=z;h=w;l=v;continue a}case 7:{x=C;k[x>>2]=z;k[x+4>>2]=((z|0)<0)<<31>>31;x=C;y=D;f=z;h=w;l=v;continue a}case 3:{j[C>>1]=z;x=C;y=D;f=z;h=w;l=v;continue a}case 4:{i[C>>0]=z;x=C;y=D;f=z;h=w;l=v;continue a}case 0:{k[C>>2]=z;x=C;y=D;f=z;h=w;l=v;continue a}case 2:{x=C;k[x>>2]=z;k[x+4>>2]=((z|0)<0)<<31>>31;x=C;y=D;f=z;h=w;l=v;continue a}case 6:{k[C>>2]=z;x=C;y=D;f=z;h=w;l=v;continue a}default:{x=C;y=D;f=z;h=w;l=v;continue a}}case 83:{g=C;h=rk(g,0,f)|0;if(h)f=h-C>>2;m=(q|0)<(f|0)?f:q;if(!(s&8192)){k[L>>2]=m-f;k[L+4>>2]=60248;ob(a|0,57696,L|0)|0;if(!f){x=C;y=D;f=z;h=m;l=v;continue a}while(1){f=f+-1|0;ek(k[g>>2]|0,a)|0;if(!f){x=C;y=D;f=z;h=m;l=v;continue a}else g=g+4|0}}if(f){h=f;while(1){h=h+-1|0;ek(k[g>>2]|0,a)|0;if(!h)break;else g=g+4|0}}k[L>>2]=m-f;k[L+4>>2]=60248;ob(a|0,57696,L|0)|0;x=C;y=D;f=z;h=m;l=v;continue a}case 67:{ek(C,a)|0;x=C;y=D;f=z;h=1;l=v;continue a}default:{y=h|32;x=i[57744+(y+-97)>>0]|0;k[L>>2]=57728+(s>>>3&1^1);k[L+4>>2]=58616+(s>>>11&1^1);k[L+8>>2]=58528+(s>>>13&1^1);k[L+12>>2]=58320+(s&1^1);k[L+16>>2]=57736+(s>>>16&1^1);k[L+20>>2]=x;k[L+24>>2]=h;Im(I,16,57704,L)|0;switch(y|0){case 103:case 102:case 101:case 97:{k[t>>2]=C;k[t+4>>2]=D;R=+p[t>>3];k[L>>2]=q;k[L+4>>2]=f;x=L+8|0;p[t>>3]=R;k[x>>2]=k[t>>2];k[x+4>>2]=k[t+4>>2];x=C;y=D;f=z;h=ob(a|0,I|0,L|0)|0;l=v;continue a}case 112:case 120:case 117:case 111:case 105:case 100:{k[L>>2]=q;k[L+4>>2]=f;x=L+8|0;k[x>>2]=C;k[x+4>>2]=D;x=C;y=D;f=z;h=ob(a|0,I|0,L|0)|0;l=v;continue a}default:{x=C;y=D;f=z;h=w;l=v;continue a}}}}}if((N|0)==97){if(a){e=J;r=Q;return e|0}if(!K){e=0;r=Q;return e|0}else g=1;while(1){b=k[e+(g<<2)>>2]|0;if(!b){P=g;break}f=d+(g<<3)|0;e:do if(b>>>0<=20)do switch(b|0){case 15:{M=k[c>>2]|0;L=k[M>>2]|0;k[c>>2]=M+4;L=(L&255)<<24>>24;M=f;k[M>>2]=L;k[M+4>>2]=((L|0)<0)<<31>>31;break e}case 16:{M=k[c>>2]|0;L=k[M>>2]|0;k[c>>2]=M+4;M=f;k[M>>2]=L&255;k[M+4>>2]=0;break e}case 11:{M=k[c>>2]|0;L=k[M>>2]|0;k[c>>2]=M+4;M=f;k[M>>2]=L;k[M+4>>2]=0;break e}case 10:{M=k[c>>2]|0;L=k[M>>2]|0;k[c>>2]=M+4;M=f;k[M>>2]=L;k[M+4>>2]=((L|0)<0)<<31>>31;break e}case 14:{M=k[c>>2]|0;L=k[M>>2]|0;k[c>>2]=M+4;M=f;k[M>>2]=L&65535;k[M+4>>2]=0;break e}case 17:{M=k[c>>2]|0;k[t>>2]=k[M>>2];k[t+4>>2]=k[M+4>>2];R=+p[t>>3];k[c>>2]=M+8;p[f>>3]=R;break e}case 12:{M=k[c>>2]|0;L=M;a=k[L>>2]|0;L=k[L+4>>2]|0;k[c>>2]=M+8;M=f;k[M>>2]=a;k[M+4>>2]=L;break e}case 13:{M=k[c>>2]|0;L=k[M>>2]|0;k[c>>2]=M+4;L=(L&65535)<<16>>16;M=f;k[M>>2]=L;k[M+4>>2]=((L|0)<0)<<31>>31;break e}case 9:{L=k[c>>2]|0;M=k[L>>2]|0;k[c>>2]=L+4;k[f>>2]=M;break e}case 18:{M=k[c>>2]|0;k[t>>2]=k[M>>2];k[t+4>>2]=k[M+4>>2];R=+p[t>>3];k[c>>2]=M+8;p[f>>3]=R;break e}default:break e}while(0);while(0);g=g+1|0;if((g|0)>=10){O=1;N=115;break}}if((N|0)==115){r=Q;return O|0}while(1){if(k[e+(P<<2)>>2]|0){O=-1;N=115;break}P=P+1|0;if((P|0)>=10){O=1;N=115;break}}if((N|0)==115){r=Q;return O|0}}else if((N|0)==115){r=Q;return O|0}return 0}function vk(a,b){a=a|0;b=b|0;var c=0;c=r;r=r+16|0;k[c>>2]=b;b=k[x>>2]|0;vb(b|0,a|0,c|0)|0;dc(10,b|0)|0;Ob()}function wk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0;w=r;r=r+4208|0;f=w+4180|0;h=w;u=w+4112|0;v=w+4176|0;if((a|0)!=0?(g=(b|0)!=0,q=(c|0)==0,!(g&q)):0){if(g)p=k[c>>2]|0;else p=0;k[h+4096>>2]=h;k[u>>2]=0;t=u+4|0;k[t>>2]=0;k[u+8>>2]=0;k[u+12>>2]=h;n=u+16|0;k[n>>2]=0;o=u+20|0;k[o>>2]=0;k[u+24>>2]=0;k[u+28>>2]=h;k[u+32>>2]=0;j=u+36|0;k[j>>2]=0;k[u+40>>2]=0;k[u+44>>2]=h;m=u+48|0;l=u+61|0;k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;i[m+12>>0]=0;i[l>>0]=1;m=u+32|0;dl(f,1,0,u+44|0);g=f+8|0;e=k[g>>2]|0;if(e){k[e>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=h}k[g>>2]=e+16;el(m,f);fl(f);f=u+62|0;i[f>>0]=0;i[u+63>>0]=1;k[v>>2]=0;h=a+(Zm(a|0)|0)|0;gl(a,h,u,v);e=k[v>>2]|0;do if(!((e|0)!=0|(i[f>>0]|0)==0)){e=k[m>>2]|0;if((e|0)!=(k[j>>2]|0)?(k[e>>2]|0)!=(k[e+4>>2]|0):0){i[f>>0]=0;i[l>>0]=0;e=k[u>>2]|0;g=k[t>>2]|0;if((g|0)!=(e|0))do{l=g+-24|0;k[t>>2]=l;hl(l);g=k[t>>2]|0}while((g|0)!=(e|0));e=k[n>>2]|0;g=k[o>>2]|0;if((g|0)!=(e|0))do{l=g+-16|0;k[o>>2]=l;il(l);g=k[o>>2]|0}while((g|0)!=(e|0));gl(a,h,u,v);if(!(i[f>>0]|0)){e=k[v>>2]|0;s=19;break}else{k[v>>2]=-2;b=0;break}}else s=20}else s=19;while(0);if((s|0)==19)if(!e)s=20;else b=0;do if((s|0)==20){e=k[t>>2]|0;g=i[e+-24>>0]|0;if(!(g&1))f=(g&255)>>>1;else f=k[e+-20>>2]|0;g=i[e+-12>>0]|0;if(!(g&1))g=(g&255)>>>1;else g=k[e+-8>>2]|0;m=g+f|0;g=m+1|0;if(g>>>0>p>>>0){b=zm(b,g)|0;if(!b){k[v>>2]=-1;b=0;break}if(!q){k[c>>2]=g;s=31}}else s=31;if((s|0)==31)if(!b){b=0;break}h=k[t>>2]|0;e=h+-12|0;g=i[e>>0]|0;if(!(g&1)){f=e+1|0;e=(g&255)>>>1}else{f=k[h+-4>>2]|0;e=k[h+-8>>2]|0}jl(h+-24|0,f,e)|0;e=k[t>>2]|0;f=e+-24|0;if(!(i[f>>0]&1))e=f+1|0;else e=k[e+-16>>2]|0;_m(b|0,e|0,m|0)|0;i[b+m>>0]=0}while(0);if(d)k[d>>2]=k[v>>2];kl(u)}else if(!d)b=0;else{k[d>>2]=-3;b=0}r=w;return b|0}function xk(){var a=0,b=0;a=r;r=r+16|0;if(!(hb(61112,13)|0)){b=Db(k[15276]|0)|0;r=a;return b|0}else vk(61120,a);return 0}function yk(a){a=a|0;var b=0;b=(a|0)==0?1:a;a=xm(b)|0;a:do if(!a){while(1){a=Ik()|0;if(!a)break;oc[a&15]();a=xm(b)|0;if(a)break a}b=xb(4)|0;k[b>>2]=61296;ec(b|0,61344,16)}while(0);return a|0}function zk(a){a=a|0;return yk(a)|0}function Ak(a){a=a|0;ym(a);return}function Bk(a){a=a|0;Ak(a);return}function Ck(a){a=a|0;k[a>>2]=61296;return}function Dk(a){a=a|0;return}function Ek(a){a=a|0;Ak(a);return}function Fk(a){a=a|0;return 61312}function Gk(a){a=a|0;var b=0;b=r;r=r+16|0;oc[a&15]();vk(61360,b)}function Hk(){var a=0,b=0;a=xk()|0;if(((a|0)!=0?(b=k[a>>2]|0,(b|0)!=0):0)?(a=b+48|0,(k[a>>2]&-256|0)==1126902528?(k[a+4>>2]|0)==1129074247:0):0)Gk(k[b+12>>2]|0);b=k[14456]|0;k[14456]=b+0;Gk(b)}function Ik(){var a=0;a=k[15350]|0;k[15350]=a+0;return a|0}function Jk(a){a=a|0;return}function Kk(a){a=a|0;return}function Lk(a){a=a|0;return}function Mk(a){a=a|0;return}function Nk(a){a=a|0;return}function Ok(a){a=a|0;Ak(a);return}function Pk(a){a=a|0;Ak(a);return}function Qk(a){a=a|0;Ak(a);return}function Rk(a,b,c){a=a|0;b=b|0;c=c|0;return (a|0)==(b|0)|0}function Sk(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;g=r;r=r+64|0;f=g;if((a|0)!=(b|0))if((b|0)!=0?(e=Wk(b,61496,61552,0)|0,(e|0)!=0):0){b=f+0|0;d=b+56|0;do{k[b>>2]=0;b=b+4|0}while((b|0)<(d|0));k[f>>2]=e;k[f+8>>2]=a;k[f+12>>2]=-1;k[f+48>>2]=1;sc[k[(k[e>>2]|0)+28>>2]&15](e,f,k[c>>2]|0,1);if((k[f+24>>2]|0)==1){k[c>>2]=k[f+16>>2];b=1}else b=0}else b=0;else b=1;r=g;return b|0}function Tk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;a=b+16|0;e=k[a>>2]|0;do if(e){if((e|0)!=(c|0)){d=b+36|0;k[d>>2]=(k[d>>2]|0)+1;k[b+24>>2]=2;i[b+54>>0]=1;break}a=b+24|0;if((k[a>>2]|0)==2)k[a>>2]=d}else{k[a>>2]=c;k[b+24>>2]=d;k[b+36>>2]=1}while(0);return}function Uk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;if((k[b+8>>2]|0)==(a|0))Tk(0,b,c,d);return}function Vk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;if((a|0)==(k[b+8>>2]|0))Tk(0,b,c,d);else{a=k[a+8>>2]|0;sc[k[(k[a>>2]|0)+28>>2]&15](a,b,c,d)}return}function Wk(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,l=0,m=0,n=0,o=0,p=0,q=0;q=r;r=r+64|0;p=q;o=k[a>>2]|0;n=a+(k[o+-8>>2]|0)|0;o=k[o+-4>>2]|0;k[p>>2]=c;k[p+4>>2]=a;k[p+8>>2]=b;k[p+12>>2]=d;e=p+16|0;f=p+20|0;g=p+24|0;h=p+28|0;l=p+32|0;m=p+40|0;d=(o|0)==(c|0);a=e+0|0;b=a+36|0;do{k[a>>2]=0;a=a+4|0}while((a|0)<(b|0));j[e+36>>1]=0;i[e+38>>0]=0;do if(d){k[p+48>>2]=1;qc[k[(k[o>>2]|0)+20>>2]&15](o,p,n,n,1,0);d=(k[g>>2]|0)==1?n:0}else{lc[k[(k[o>>2]|0)+24>>2]&15](o,p,n,1,0);d=k[p+36>>2]|0;if(!d){d=(k[m>>2]|0)==1&(k[h>>2]|0)==1&(k[l>>2]|0)==1?k[f>>2]|0:0;break}else if((d|0)!=1){d=0;break}if((k[g>>2]|0)!=1?!((k[m>>2]|0)==0&(k[h>>2]|0)==1&(k[l>>2]|0)==1):0){d=0;break}d=k[e>>2]|0}while(0);r=q;return d|0}function Xk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;i[b+53>>0]=1;do if((k[b+4>>2]|0)==(d|0)){i[b+52>>0]=1;d=b+16|0;a=k[d>>2]|0;if(!a){k[d>>2]=c;k[b+24>>2]=e;k[b+36>>2]=1;if(!((e|0)==1?(k[b+48>>2]|0)==1:0))break;i[b+54>>0]=1;break}if((a|0)!=(c|0)){c=b+36|0;k[c>>2]=(k[c>>2]|0)+1;i[b+54>>0]=1;break}a=b+24|0;d=k[a>>2]|0;if((d|0)==2){k[a>>2]=e;d=e}if((d|0)==1?(k[b+48>>2]|0)==1:0)i[b+54>>0]=1}while(0);return}function Yk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0;a:do if((a|0)==(k[b+8>>2]|0)){if((k[b+4>>2]|0)==(c|0)?(f=b+28|0,(k[f>>2]|0)!=1):0)k[f>>2]=d}else{if((a|0)!=(k[b>>2]|0)){g=k[a+8>>2]|0;lc[k[(k[g>>2]|0)+24>>2]&15](g,b,c,d,e);break}if((k[b+16>>2]|0)!=(c|0)?(g=b+20|0,(k[g>>2]|0)!=(c|0)):0){k[b+32>>2]=d;d=b+44|0;if((k[d>>2]|0)==4)break;f=b+52|0;i[f>>0]=0;j=b+53|0;i[j>>0]=0;a=k[a+8>>2]|0;qc[k[(k[a>>2]|0)+20>>2]&15](a,b,c,c,1,e);if(i[j>>0]|0){if(!(i[f>>0]|0)){f=1;h=13}}else{f=0;h=13}do if((h|0)==13){k[g>>2]=c;g=b+40|0;k[g>>2]=(k[g>>2]|0)+1;if((k[b+36>>2]|0)==1?(k[b+24>>2]|0)==2:0){i[b+54>>0]=1;if(f)break}else h=16;if((h|0)==16?f:0)break;k[d>>2]=4;break a}while(0);k[d>>2]=3;break}if((d|0)==1)k[b+32>>2]=1}while(0);return}function Zk(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0;do if((k[b+8>>2]|0)==(a|0)){if((k[b+4>>2]|0)==(c|0)?(g=b+28|0,(k[g>>2]|0)!=1):0)k[g>>2]=d}else if((k[b>>2]|0)==(a|0)){if((k[b+16>>2]|0)!=(c|0)?(f=b+20|0,(k[f>>2]|0)!=(c|0)):0){k[b+32>>2]=d;k[f>>2]=c;e=b+40|0;k[e>>2]=(k[e>>2]|0)+1;if((k[b+36>>2]|0)==1?(k[b+24>>2]|0)==2:0)i[b+54>>0]=1;k[b+44>>2]=4;break}if((d|0)==1)k[b+32>>2]=1}while(0);return}function _k(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;if((a|0)==(k[b+8>>2]|0))Xk(0,b,c,d,e);else{a=k[a+8>>2]|0;qc[k[(k[a>>2]|0)+20>>2]&15](a,b,c,d,e,f)}return}function $k(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;if((k[b+8>>2]|0)==(a|0))Xk(0,b,c,d,e);return}function al(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=r;r=r+16|0;d=e;k[d>>2]=k[c>>2];a=kc[k[(k[a>>2]|0)+16>>2]&31](a,b,d)|0;if(a)k[c>>2]=k[d>>2];r=e;return a&1|0}function bl(a){a=a|0;if(!a)a=0;else a=(Wk(a,61496,61664,0)|0)!=0;return a&1|0}function cl(){var a=0,b=0,c=0,d=0,e=0;d=r;r=r+16|0;e=d;d=d+12|0;a=xk()|0;if((a|0)!=0?(c=k[a>>2]|0,(c|0)!=0):0){a=c+48|0;b=k[a>>2]|0;a=k[a+4>>2]|0;if(!((b&-256|0)==1126902528&(a|0)==1129074247)){k[e>>2]=k[14458];vk(57952,e)}if((b|0)==1126902529&(a|0)==1129074247)a=k[c+44>>2]|0;else a=c+80|0;k[d>>2]=a;c=k[c>>2]|0;a=k[c+4>>2]|0;if(kc[k[(k[61424>>2]|0)+16>>2]&31](61424,c,d)|0){c=k[d>>2]|0;d=k[14458]|0;c=nc[k[(k[c>>2]|0)+8>>2]&15](c)|0;k[e>>2]=d;k[e+4>>2]=a;k[e+8>>2]=c;vk(57856,e)}else{k[e>>2]=k[14458];k[e+4>>2]=a;vk(57904,e)}}vk(57992,e)}function dl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+12|0;k[e>>2]=0;k[a+16>>2]=d;if(!b)d=0;else d=ml(k[d>>2]|0,b<<4)|0;k[a>>2]=d;c=d+(c<<4)|0;k[a+8>>2]=c;k[a+4>>2]=c;k[e>>2]=d+(b<<4);return}function el(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0;d=k[a>>2]|0;f=a+4|0;e=k[f>>2]|0;g=b+4|0;c=k[g>>2]|0;if((e|0)!=(d|0)){do{h=e;e=e+-16|0;l=c+-16|0;k[l>>2]=0;j=c+-12|0;k[j>>2]=0;m=k[h+-4>>2]|0;i=c+-8|0;k[i>>2]=0;k[c+-4>>2]=m;k[l>>2]=k[e>>2];c=h+-12|0;k[j>>2]=k[c>>2];h=h+-8|0;k[i>>2]=k[h>>2];k[h>>2]=0;k[c>>2]=0;k[e>>2]=0;c=(k[g>>2]|0)+-16|0;k[g>>2]=c}while((e|0)!=(d|0));d=k[a>>2]|0}k[a>>2]=c;k[g>>2]=d;j=b+8|0;m=k[f>>2]|0;k[f>>2]=k[j>>2];k[j>>2]=m;j=a+8|0;m=b+12|0;l=k[j>>2]|0;k[j>>2]=k[m>>2];k[m>>2]=l;k[b>>2]=k[g>>2];return}function fl(a){a=a|0;var b=0,c=0,d=0,e=0;c=k[a+4>>2]|0;d=a+8|0;b=k[d>>2]|0;if((b|0)!=(c|0))do{e=b+-16|0;k[d>>2]=e;nl(e);b=k[d>>2]|0}while((b|0)!=(c|0));b=k[a>>2]|0;if(b)ol(k[k[a+16>>2]>>2]|0,b,(k[a+12>>2]|0)-b|0);return}function gl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0;o=r;r=r+48|0;l=o+24|0;m=o;n=o+12|0;a:do if(a>>>0<b>>>0){do if((i[a>>0]|0)!=95){if((ul(a,b,c)|0)!=(b|0)){k[d>>2]=-2;break a}}else{h=b;if((h-a|0)<=3){k[d>>2]=-2;break a}e=i[a+1>>0]|0;if(e<<24>>24==95)f=22;else if(e<<24>>24==90){j=a+2|0;a=pl(j,b,c)|0;if((!((a|0)==(j|0)|(a|0)==(b|0))?(i[a>>0]|0)==46:0)?(g=k[c+4>>2]|0,(k[c>>2]|0)!=(g|0)):0){j=g+-24|0;f=h-a|0;if(f>>>0>4294967279)ql(n);if(f>>>0<11){i[n>>0]=f<<1;h=n+1|0}else{g=f+16&-16;h=xm(g)|0;k[n+8>>2]=h;k[n>>2]=g|1;k[n+4>>2]=f}i[h>>0]=46;e=a+1|0;if((e|0)!=(b|0)){g=a;a=h;while(1){a=a+1|0;i[a>>0]=i[e>>0]|0;g=g+2|0;if((g|0)==(b|0))break;else{p=e;e=g;g=p}}}i[h+f>>0]=0;e=rl(n,0,58232)|0;k[m+0>>2]=k[e+0>>2];k[m+4>>2]=k[e+4>>2];k[m+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;e=sl(m,58240)|0;k[l+0>>2]=k[e+0>>2];k[l+4>>2]=k[e+4>>2];k[l+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;e=i[l>>0]|0;if(!(e&1)){a=l+1|0;e=(e&255)>>>1}else{a=k[l+8>>2]|0;e=k[l+4>>2]|0}jl(j,a,e)|0;tl(l);tl(m);tl(n);break}if((a|0)==(b|0))break;k[d>>2]=-2;break a}if(((f|0)==22?(i[a+2>>0]|0)==95:0)?(i[a+3>>0]|0)==90:0){p=a+4|0;g=pl(p,b,c)|0;if((g|0)==(p|0)|(g|0)==(b|0)){k[d>>2]=-2;break a}b:do if((h-g|0)>12){a=0;f=g;while(1){if((i[f>>0]|0)!=(i[60800+a>>0]|0)){e=g;break b}a=a+1|0;e=f+1|0;if((a|0)>=13){a=f;break}else f=e}c:do if((e|0)!=(b|0)){if((i[e>>0]|0)==95){e=a+2|0;if((e|0)==(b|0)){e=g;break b}if(((i[e>>0]|0)+-48|0)>>>0>=10){e=g;break b}e=a+3|0}if((e|0)!=(b|0))while(1){if(((i[e>>0]|0)+-48|0)>>>0>=10)break c;e=e+1|0;if((e|0)==(b|0)){e=b;break}}else e=b}else e=b;while(0);a=k[c+4>>2]|0;if((k[c>>2]|0)!=(a|0))rl(a+-24|0,0,60816)|0;else e=g}else e=g;while(0);if((e|0)==(b|0))break;k[d>>2]=-2;break a}k[d>>2]=-2;break a}while(0);if((k[d>>2]|0)==0?(k[c>>2]|0)==(k[c+4>>2]|0):0)k[d>>2]=-2}else k[d>>2]=-2;while(0);r=o;return}function hl(a){a=a|0;tl(a+12|0);tl(a);return}function il(a){a=a|0;var b=0,c=0,d=0,e=0;b=k[a>>2]|0;if(b){d=a+4|0;c=k[d>>2]|0;if((c|0)!=(b|0)){do{e=c+-24|0;k[d>>2]=e;hl(e);c=k[d>>2]|0}while((c|0)!=(b|0));b=k[a>>2]|0}ol(k[a+12>>2]|0,b,(k[a+8>>2]|0)-b|0)}return}function jl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;d=i[a>>0]|0;if(!(d&1))e=10;else{d=k[a>>2]|0;e=(d&-2)+-1|0;d=d&255}if(!(d&1))f=(d&255)>>>1;else f=k[a+4>>2]|0;if((e-f|0)>>>0>=c>>>0){if(c){if(!(d&1))e=a+1|0;else e=k[a+8>>2]|0;_m(e+f|0,b|0,c|0)|0;d=f+c|0;if(!(i[a>>0]&1))i[a>>0]=d<<1;else k[a+4>>2]=d;i[e+d>>0]=0}}else vl(a,e,c-e+f|0,f,f,0,c,b);return a|0}function kl(a){a=a|0;wl(a+32|0);nl(a+16|0);il(a);return}function ll(){var a=0;a=r;r=r+16|0;if(!(Jb(61104,27)|0)){r=a;return}else vk(61176,a)}function ml(a,b){a=a|0;b=b|0;var c=0,d=0;c=b+15&-16;d=a+4096|0;b=k[d>>2]|0;if((a+4096-b|0)>>>0<c>>>0)b=xm(c)|0;else k[d>>2]=b+c;return b|0}function nl(a){a=a|0;var b=0,c=0,d=0,e=0;b=k[a>>2]|0;if(b){d=a+4|0;c=k[d>>2]|0;if((c|0)!=(b|0)){do{e=c+-16|0;k[d>>2]=e;il(e);c=k[d>>2]|0}while((c|0)!=(b|0));b=k[a>>2]|0}ol(k[a+12>>2]|0,b,(k[a+8>>2]|0)-b|0)}return}function ol(a,b,c){a=a|0;b=b|0;c=c|0;if(a>>>0<=b>>>0&(a+4096|0)>>>0>=b>>>0){a=a+4096|0;if((b+(c+15&-16)|0)==(k[a>>2]|0))k[a>>2]=b}else ym(b);return}
function sm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0;da=r;r=r+1136|0;ca=da+1104|0;q=da+1080|0;s=da+1056|0;y=da+1032|0;H=da+1008|0;Y=da+984|0;aa=da+960|0;ba=da+936|0;n=da+912|0;P=da+888|0;p=da+864|0;t=da+840|0;u=da+816|0;Q=da+792|0;R=da+768|0;S=da+744|0;T=da+720|0;U=da+696|0;v=da+672|0;w=da+648|0;x=da+624|0;h=da+600|0;z=da+576|0;A=da+552|0;B=da+240|0;C=da+216|0;D=da+192|0;E=da+168|0;j=da+144|0;F=da+120|0;G=da+72|0;I=da+48|0;l=da+24|0;V=da;W=da+96|0;X=da+264|0;m=da+288|0;J=da+312|0;K=da+336|0;L=da+360|0;M=da+384|0;N=da+408|0;O=da+432|0;Z=da+456|0;_=da+480|0;$=da+504|0;o=da+528|0;a:do if((b-a|0)>1)do switch(i[a>>0]|0){case 112:switch(i[a+1>>0]|0){case 109:{em(m,59432);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[m+0>>2];k[d+4>>2]=k[m+4>>2];k[d+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;$=d+12|0;d=m+12|0;k[$+0>>2]=k[d+0>>2];k[$+4>>2]=k[d+4>>2];k[$+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;g=(d-e|0)/24|0;f=g+1|0;if((f|0)<0)Fl(c);d=(b-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[m+0>>2];k[e+4>>2]=k[m+4>>2];k[e+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;_=e+12|0;$=m+12|0;k[_+0>>2]=k[$+0>>2];k[_+4>>2]=k[$+4>>2];k[_+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(m);d=a+2|0;break a}case 112:{i[L>>0]=20;d=L+1|0;b=59480;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[L+11>>0]=0;h=L+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[L+0>>2];k[d+4>>2]=k[L+4>>2];k[d+8>>2]=k[L+8>>2];k[L+0>>2]=0;k[L+4>>2]=0;k[L+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[L+0>>2];k[e+4>>2]=k[L+4>>2];k[e+8>>2]=k[L+8>>2];k[L+0>>2]=0;k[L+4>>2]=0;k[L+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(L);d=a+2|0;break a}case 116:{i[N>>0]=20;d=N+1|0;b=59496;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[N+11>>0]=0;h=N+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[N+0>>2];k[d+4>>2]=k[N+4>>2];k[d+8>>2]=k[N+8>>2];k[N+0>>2]=0;k[N+4>>2]=0;k[N+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[N+0>>2];k[e+4>>2]=k[N+4>>2];k[e+8>>2]=k[N+8>>2];k[N+0>>2]=0;k[N+4>>2]=0;k[N+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(N);d=a+2|0;break a}case 115:{i[M>>0]=18;d=M+1|0;b=59448;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[M+10>>0]=0;h=M+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[M+0>>2];k[d+4>>2]=k[M+4>>2];k[d+8>>2]=k[M+8>>2];k[M+0>>2]=0;k[M+4>>2]=0;k[M+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[M+0>>2];k[e+4>>2]=k[M+4>>2];k[e+8>>2]=k[M+8>>2];k[M+0>>2]=0;k[M+4>>2]=0;k[M+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(M);d=a+2|0;break a}case 76:{i[K>>0]=20;d=K+1|0;b=59464;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[K+11>>0]=0;h=K+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[K+0>>2];k[d+4>>2]=k[K+4>>2];k[d+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[K+0>>2];k[e+4>>2]=k[K+4>>2];k[e+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(K);d=a+2|0;break a}case 108:{i[J>>0]=18;d=J+1|0;b=59448;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[J+10>>0]=0;h=J+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[J+0>>2];k[d+4>>2]=k[J+4>>2];k[d+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[J+0>>2];k[e+4>>2]=k[J+4>>2];k[e+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(J);d=a+2|0;break a}default:{d=a;break a}}case 111:{d=i[a+1>>0]|0;if((d|0)==114){i[W>>0]=18;d=W+1|0;b=59400;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[W+10>>0]=0;h=W+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[W+0>>2];k[d+4>>2]=k[W+4>>2];k[d+8>>2]=k[W+8>>2];k[W+0>>2]=0;k[W+4>>2]=0;k[W+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[W+0>>2];k[e+4>>2]=k[W+4>>2];k[e+8>>2]=k[W+8>>2];k[W+0>>2]=0;k[W+4>>2]=0;k[W+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(W);d=a+2|0;break a}else if((d|0)==82){i[X>>0]=20;d=X+1|0;b=59416;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[X+11>>0]=0;h=X+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[X+0>>2];k[d+4>>2]=k[X+4>>2];k[d+8>>2]=k[X+8>>2];k[X+0>>2]=0;k[X+4>>2]=0;k[X+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[X+0>>2];k[e+4>>2]=k[X+4>>2];k[e+8>>2]=k[X+8>>2];k[X+0>>2]=0;k[X+4>>2]=0;k[X+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(X);d=a+2|0;break a}else if((d|0)==111){i[V>>0]=20;d=V+1|0;b=59384;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[V+11>>0]=0;h=V+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[V+0>>2];k[d+4>>2]=k[V+4>>2];k[d+8>>2]=k[V+8>>2];k[V+0>>2]=0;k[V+4>>2]=0;k[V+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[V+0>>2];k[e+4>>2]=k[V+4>>2];k[e+8>>2]=k[V+8>>2];k[V+0>>2]=0;k[V+4>>2]=0;k[V+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(V);d=a+2|0;break a}else{d=a;break a}}case 97:switch(i[a+1>>0]|0){case 97:{i[q>>0]=20;d=q+1|0;b=58864;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[q+11>>0]=0;h=q+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[q+0>>2];k[d+4>>2]=k[q+4>>2];k[d+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[q+0>>2];k[e+4>>2]=k[q+4>>2];k[e+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(q);d=a+2|0;break a}case 78:{i[y>>0]=20;d=y+1|0;b=58896;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[y+11>>0]=0;h=y+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[y+0>>2];k[d+4>>2]=k[y+4>>2];k[d+8>>2]=k[y+8>>2];k[y+0>>2]=0;k[y+4>>2]=0;k[y+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[y+0>>2];k[e+4>>2]=k[y+4>>2];k[e+8>>2]=k[y+8>>2];k[y+0>>2]=0;k[y+4>>2]=0;k[y+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(y);d=a+2|0;break a}case 110:case 100:{i[s>>0]=18;d=s+1|0;b=58880;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[s+10>>0]=0;h=s+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[s+0>>2];k[d+4>>2]=k[s+4>>2];k[d+8>>2]=k[s+8>>2];k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;f=(d-b|0)/24|0;e=f+1|0;if((e|0)<0)Fl(c);d=(g-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,f,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[s+0>>2];k[e+4>>2]=k[s+4>>2];k[e+8>>2]=k[s+8>>2];k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(s);d=a+2|0;break a}case 83:{i[H>>0]=18;d=H+1|0;b=58912;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[H+10>>0]=0;h=H+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[H+0>>2];k[d+4>>2]=k[H+4>>2];k[d+8>>2]=k[H+8>>2];k[H+0>>2]=0;k[H+4>>2]=0;k[H+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[H+0>>2];k[e+4>>2]=k[H+4>>2];k[e+8>>2]=k[H+8>>2];k[H+0>>2]=0;k[H+4>>2]=0;k[H+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(H);d=a+2|0;break a}default:{d=a;break a}}case 99:{d=i[a+1>>0]|0;if((d|0)==108){i[Y>>0]=20;d=Y+1|0;b=58928;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[Y+11>>0]=0;h=Y+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[Y+0>>2];k[d+4>>2]=k[Y+4>>2];k[d+8>>2]=k[Y+8>>2];k[Y+0>>2]=0;k[Y+4>>2]=0;k[Y+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[Y+0>>2];k[e+4>>2]=k[Y+4>>2];k[e+8>>2]=k[Y+8>>2];k[Y+0>>2]=0;k[Y+4>>2]=0;k[Y+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(Y);d=a+2|0;break a}else if((d|0)==111){i[ba>>0]=18;d=ba+1|0;b=58960;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[ba+10>>0]=0;h=ba+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[ba+0>>2];k[d+4>>2]=k[ba+4>>2];k[d+8>>2]=k[ba+8>>2];k[ba+0>>2]=0;k[ba+4>>2]=0;k[ba+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[ba+0>>2];k[e+4>>2]=k[ba+4>>2];k[e+8>>2]=k[ba+8>>2];k[ba+0>>2]=0;k[ba+4>>2]=0;k[ba+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(ba);d=a+2|0;break a}else if((d|0)==118){_=c+63|0;Y=i[_>>0]|0;i[_>>0]=0;$=a+2|0;d=ul($,b,c)|0;i[_>>0]=Y;if((d|0)==($|0)){d=a;break a}e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}rl(e+-24|0,0,58976)|0;i[c+60>>0]=1;break a}else if((d|0)==109){i[aa>>0]=18;d=aa+1|0;b=58944;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[aa+10>>0]=0;h=aa+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[aa+0>>2];k[d+4>>2]=k[aa+4>>2];k[d+8>>2]=k[aa+8>>2];k[aa+0>>2]=0;k[aa+4>>2]=0;k[aa+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[aa+0>>2];k[e+4>>2]=k[aa+4>>2];k[e+8>>2]=k[aa+8>>2];k[aa+0>>2]=0;k[aa+4>>2]=0;k[aa+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(aa);d=a+2|0;break a}else{d=a;break a}}case 100:switch(i[a+1>>0]|0){case 97:{im(n,58992);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[n+0>>2];k[d+4>>2]=k[n+4>>2];k[d+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;$=d+12|0;d=n+12|0;k[$+0>>2]=k[d+0>>2];k[$+4>>2]=k[d+4>>2];k[$+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;g=(d-e|0)/24|0;f=g+1|0;if((f|0)<0)Fl(c);d=(b-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[n+0>>2];k[e+4>>2]=k[n+4>>2];k[e+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;_=e+12|0;$=n+12|0;k[_+0>>2]=k[$+0>>2];k[_+4>>2]=k[$+4>>2];k[_+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(n);d=a+2|0;break a}case 101:{i[P>>0]=18;d=P+1|0;b=59016;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[P+10>>0]=0;h=P+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[P+0>>2];k[d+4>>2]=k[P+4>>2];k[d+8>>2]=k[P+8>>2];k[P+0>>2]=0;k[P+4>>2]=0;k[P+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[P+0>>2];k[e+4>>2]=k[P+4>>2];k[e+8>>2]=k[P+8>>2];k[P+0>>2]=0;k[P+4>>2]=0;k[P+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(P);d=a+2|0;break a}case 108:{Ol(p,59032,15);h=p+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[p+0>>2];k[d+4>>2]=k[p+4>>2];k[d+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[p+0>>2];k[e+4>>2]=k[p+4>>2];k[e+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(p);d=a+2|0;break a}case 118:{i[t>>0]=18;d=t+1|0;b=59048;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[t+10>>0]=0;h=t+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[t+0>>2];k[d+4>>2]=k[t+4>>2];k[d+8>>2]=k[t+8>>2];k[t+0>>2]=0;k[t+4>>2]=0;k[t+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[t+0>>2];k[e+4>>2]=k[t+4>>2];k[e+8>>2]=k[t+8>>2];k[t+0>>2]=0;k[t+4>>2]=0;k[t+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(t);d=a+2|0;break a}case 86:{i[u>>0]=20;d=u+1|0;b=59064;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[u+11>>0]=0;h=u+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[u+0>>2];k[d+4>>2]=k[u+4>>2];k[d+8>>2]=k[u+8>>2];k[u+0>>2]=0;k[u+4>>2]=0;k[u+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[u+0>>2];k[e+4>>2]=k[u+4>>2];k[e+8>>2]=k[u+8>>2];k[u+0>>2]=0;k[u+4>>2]=0;k[u+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(u);d=a+2|0;break a}default:{d=a;break a}}case 101:{d=i[a+1>>0]|0;if((d|0)==111){i[Q>>0]=18;d=Q+1|0;b=59080;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[Q+10>>0]=0;h=Q+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[Q+0>>2];k[d+4>>2]=k[Q+4>>2];k[d+8>>2]=k[Q+8>>2];k[Q+0>>2]=0;k[Q+4>>2]=0;k[Q+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[Q+0>>2];k[e+4>>2]=k[Q+4>>2];k[e+8>>2]=k[Q+8>>2];k[Q+0>>2]=0;k[Q+4>>2]=0;k[Q+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(Q);d=a+2|0;break a}else if((d|0)==79){i[R>>0]=20;d=R+1|0;b=59096;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[R+11>>0]=0;h=R+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[R+0>>2];k[d+4>>2]=k[R+4>>2];k[d+8>>2]=k[R+8>>2];k[R+0>>2]=0;k[R+4>>2]=0;k[R+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[R+0>>2];k[e+4>>2]=k[R+4>>2];k[e+8>>2]=k[R+8>>2];k[R+0>>2]=0;k[R+4>>2]=0;k[R+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(R);d=a+2|0;break a}else if((d|0)==113){i[S>>0]=20;d=S+1|0;b=59112;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[S+11>>0]=0;h=S+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[S+0>>2];k[d+4>>2]=k[S+4>>2];k[d+8>>2]=k[S+8>>2];k[S+0>>2]=0;k[S+4>>2]=0;k[S+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[S+0>>2];k[e+4>>2]=k[S+4>>2];k[e+8>>2]=k[S+8>>2];k[S+0>>2]=0;k[S+4>>2]=0;k[S+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(S);d=a+2|0;break a}else{d=a;break a}}case 105:{if((i[a+1>>0]|0)!=120){d=a;break a}i[v>>0]=20;d=v+1|0;b=59160;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[v+11>>0]=0;h=v+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[v+0>>2];k[d+4>>2]=k[v+4>>2];k[d+8>>2]=k[v+8>>2];k[v+0>>2]=0;k[v+4>>2]=0;k[v+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[v+0>>2];k[e+4>>2]=k[v+4>>2];k[e+8>>2]=k[v+8>>2];k[v+0>>2]=0;k[v+4>>2]=0;k[v+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(v);d=a+2|0;break a}case 103:{d=i[a+1>>0]|0;if((d|0)==116){i[U>>0]=18;d=U+1|0;b=59144;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[U+10>>0]=0;h=U+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[U+0>>2];k[d+4>>2]=k[U+4>>2];k[d+8>>2]=k[U+8>>2];k[U+0>>2]=0;k[U+4>>2]=0;k[U+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[U+0>>2];k[e+4>>2]=k[U+4>>2];k[e+8>>2]=k[U+8>>2];k[U+0>>2]=0;k[U+4>>2]=0;k[U+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(U);d=a+2|0;break a}else if((d|0)==101){i[T>>0]=20;d=T+1|0;b=59128;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[T+11>>0]=0;h=T+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[T+0>>2];k[d+4>>2]=k[T+4>>2];k[d+8>>2]=k[T+8>>2];k[T+0>>2]=0;k[T+4>>2]=0;k[T+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[T+0>>2];k[e+4>>2]=k[T+4>>2];k[e+8>>2]=k[T+8>>2];k[T+0>>2]=0;k[T+4>>2]=0;k[T+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(T);d=a+2|0;break a}else{d=a;break a}}case 108:switch(i[a+1>>0]|0){case 101:{i[w>>0]=20;d=w+1|0;b=59176;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[w+11>>0]=0;h=w+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[w+0>>2];k[d+4>>2]=k[w+4>>2];k[d+8>>2]=k[w+8>>2];k[w+0>>2]=0;k[w+4>>2]=0;k[w+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[w+0>>2];k[e+4>>2]=k[w+4>>2];k[e+8>>2]=k[w+8>>2];k[w+0>>2]=0;k[w+4>>2]=0;k[w+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(w);d=a+2|0;break a}case 115:{i[x>>0]=20;d=x+1|0;b=59208;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[x+11>>0]=0;h=x+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[x+0>>2];k[d+4>>2]=k[x+4>>2];k[d+8>>2]=k[x+8>>2];k[x+0>>2]=0;k[x+4>>2]=0;k[x+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[x+0>>2];k[e+4>>2]=k[x+4>>2];k[e+8>>2]=k[x+8>>2];k[x+0>>2]=0;k[x+4>>2]=0;k[x+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(x);d=a+2|0;break a}case 83:{em(h,59224);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;$=d+12|0;d=h+12|0;k[$+0>>2]=k[d+0>>2];k[$+4>>2]=k[d+4>>2];k[$+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;g=(d-e|0)/24|0;f=g+1|0;if((f|0)<0)Fl(c);d=(b-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[h+0>>2];k[e+4>>2]=k[h+4>>2];k[e+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;_=e+12|0;$=h+12|0;k[_+0>>2]=k[$+0>>2];k[_+4>>2]=k[$+4>>2];k[_+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(h);d=a+2|0;break a}case 105:{$=a+2|0;d=Ul($,b,c)|0;if((d|0)==($|0)){d=a;break a}e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}rl(e+-24|0,0,59192)|0;break a}case 116:{i[z>>0]=18;d=z+1|0;b=59240;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[z+10>>0]=0;h=z+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[z+0>>2];k[d+4>>2]=k[z+4>>2];k[d+8>>2]=k[z+8>>2];k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[z+0>>2];k[e+4>>2]=k[z+4>>2];k[e+8>>2]=k[z+8>>2];k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(z);d=a+2|0;break a}default:{d=a;break a}}case 109:switch(i[a+1>>0]|0){case 105:{i[A>>0]=18;d=A+1|0;b=59256;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[A+10>>0]=0;h=A+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[A+0>>2];k[d+4>>2]=k[A+4>>2];k[d+8>>2]=k[A+8>>2];k[A+0>>2]=0;k[A+4>>2]=0;k[A+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[A+0>>2];k[e+4>>2]=k[A+4>>2];k[e+8>>2]=k[A+8>>2];k[A+0>>2]=0;k[A+4>>2]=0;k[A+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(A);d=a+2|0;break a}case 73:{i[B>>0]=20;d=B+1|0;b=59272;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[B+11>>0]=0;h=B+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[B+0>>2];k[d+4>>2]=k[B+4>>2];k[d+8>>2]=k[B+8>>2];k[B+0>>2]=0;k[B+4>>2]=0;k[B+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[B+0>>2];k[e+4>>2]=k[B+4>>2];k[e+8>>2]=k[B+8>>2];k[B+0>>2]=0;k[B+4>>2]=0;k[B+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(B);d=a+2|0;break a}case 109:{i[E>>0]=20;d=E+1|0;b=59304;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[E+11>>0]=0;h=E+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[E+0>>2];k[d+4>>2]=k[E+4>>2];k[d+8>>2]=k[E+8>>2];k[E+0>>2]=0;k[E+4>>2]=0;k[E+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[E+0>>2];k[e+4>>2]=k[E+4>>2];k[e+8>>2]=k[E+8>>2];k[E+0>>2]=0;k[E+4>>2]=0;k[E+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(E);d=a+2|0;break a}case 76:{i[D>>0]=20;d=D+1|0;b=59288;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[D+11>>0]=0;h=D+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[D+0>>2];k[d+4>>2]=k[D+4>>2];k[d+8>>2]=k[D+8>>2];k[D+0>>2]=0;k[D+4>>2]=0;k[D+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[D+0>>2];k[e+4>>2]=k[D+4>>2];k[e+8>>2]=k[D+8>>2];k[D+0>>2]=0;k[D+4>>2]=0;k[D+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(D);d=a+2|0;break a}case 108:{i[C>>0]=18;d=C+1|0;b=59016;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[C+10>>0]=0;h=C+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[C+0>>2];k[d+4>>2]=k[C+4>>2];k[d+8>>2]=k[C+8>>2];k[C+0>>2]=0;k[C+4>>2]=0;k[C+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[C+0>>2];k[e+4>>2]=k[C+4>>2];k[e+8>>2]=k[C+8>>2];k[C+0>>2]=0;k[C+4>>2]=0;k[C+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(C);d=a+2|0;break a}default:{d=a;break a}}case 110:switch(i[a+1>>0]|0){case 103:{i[G>>0]=18;d=G+1|0;b=59256;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[G+10>>0]=0;h=G+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[G+0>>2];k[d+4>>2]=k[G+4>>2];k[d+8>>2]=k[G+8>>2];k[G+0>>2]=0;k[G+4>>2]=0;k[G+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[G+0>>2];k[e+4>>2]=k[G+4>>2];k[e+8>>2]=k[G+8>>2];k[G+0>>2]=0;k[G+4>>2]=0;k[G+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(G);d=a+2|0;break a}case 119:{hm(l,59368);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;$=d+12|0;d=l+12|0;k[$+0>>2]=k[d+0>>2];k[$+4>>2]=k[d+4>>2];k[$+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;g=(d-e|0)/24|0;f=g+1|0;if((f|0)<0)Fl(c);d=(b-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[l+0>>2];k[e+4>>2]=k[l+4>>2];k[e+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;_=e+12|0;$=l+12|0;k[_+0>>2]=k[$+0>>2];k[_+4>>2]=k[$+4>>2];k[_+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(l);d=a+2|0;break a}case 116:{i[I>>0]=18;d=I+1|0;b=59352;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[I+10>>0]=0;h=I+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[I+0>>2];k[d+4>>2]=k[I+4>>2];k[d+8>>2]=k[I+8>>2];k[I+0>>2]=0;k[I+4>>2]=0;k[I+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[I+0>>2];k[e+4>>2]=k[I+4>>2];k[e+8>>2]=k[I+8>>2];k[I+0>>2]=0;k[I+4>>2]=0;k[I+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(I);d=a+2|0;break a}case 97:{gm(j,59320);e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;$=d+12|0;d=j+12|0;k[$+0>>2]=k[d+0>>2];k[$+4>>2]=k[d+4>>2];k[$+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{f=k[c>>2]|0;b=(d-f|0)/24|0;e=b+1|0;if((e|0)<0)Fl(c);d=(g-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,b,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[j+0>>2];k[e+4>>2]=k[j+4>>2];k[e+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;_=e+12|0;$=j+12|0;k[_+0>>2]=k[$+0>>2];k[_+4>>2]=k[$+4>>2];k[_+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(j);d=a+2|0;break a}case 101:{i[F>>0]=20;d=F+1|0;b=59336;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[F+11>>0]=0;h=F+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[F+0>>2];k[d+4>>2]=k[F+4>>2];k[d+8>>2]=k[F+8>>2];k[F+0>>2]=0;k[F+4>>2]=0;k[F+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[F+0>>2];k[e+4>>2]=k[F+4>>2];k[e+8>>2]=k[F+8>>2];k[F+0>>2]=0;k[F+4>>2]=0;k[F+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(F);d=a+2|0;break a}default:{d=a;break a}}case 114:{d=i[a+1>>0]|0;if((d|0)==83){em(o,59576);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[o+0>>2];k[d+4>>2]=k[o+4>>2];k[d+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;$=d+12|0;d=o+12|0;k[$+0>>2]=k[d+0>>2];k[$+4>>2]=k[d+4>>2];k[$+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;g=(d-e|0)/24|0;f=g+1|0;if((f|0)<0)Fl(c);d=(b-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[o+0>>2];k[e+4>>2]=k[o+4>>2];k[e+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;_=e+12|0;$=o+12|0;k[_+0>>2]=k[$+0>>2];k[_+4>>2]=k[$+4>>2];k[_+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(o);d=a+2|0;break a}else if((d|0)==115){i[$>>0]=20;d=$+1|0;b=59560;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[$+11>>0]=0;h=$+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[$+0>>2];k[d+4>>2]=k[$+4>>2];k[d+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[$+0>>2];k[e+4>>2]=k[$+4>>2];k[e+8>>2]=k[$+8>>2];k[$+0>>2]=0;k[$+4>>2]=0;k[$+8>>2]=0;_=e+12|0;k[_+0>>2]=k[h+0>>2];k[_+4>>2]=k[h+4>>2];k[_+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl($);d=a+2|0;break a}else if((d|0)==77){i[_>>0]=20;d=_+1|0;b=59544;e=d+10|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[_+11>>0]=0;h=_+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[_+0>>2];k[d+4>>2]=k[_+4>>2];k[d+8>>2]=k[_+8>>2];k[_+0>>2]=0;k[_+4>>2]=0;k[_+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[_+0>>2];k[e+4>>2]=k[_+4>>2];k[e+8>>2]=k[_+8>>2];k[_+0>>2]=0;k[_+4>>2]=0;k[_+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(_);d=a+2|0;break a}else if((d|0)==109){i[Z>>0]=18;d=Z+1|0;b=59528;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[Z+10>>0]=0;h=Z+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[Z+0>>2];k[d+4>>2]=k[Z+4>>2];k[d+8>>2]=k[Z+8>>2];k[Z+0>>2]=0;k[Z+4>>2]=0;k[Z+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[Z+0>>2];k[e+4>>2]=k[Z+4>>2];k[e+8>>2]=k[Z+8>>2];k[Z+0>>2]=0;k[Z+4>>2]=0;k[Z+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(Z);d=a+2|0;break a}else{d=a;break a}}case 113:{if((i[a+1>>0]|0)!=117){d=a;break a}i[O>>0]=18;d=O+1|0;b=59512;e=d+9|0;do{i[d>>0]=i[b>>0]|0;d=d+1|0;b=b+1|0}while((d|0)<(e|0));i[O+10>>0]=0;h=O+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[O+0>>2];k[d+4>>2]=k[O+4>>2];k[d+8>>2]=k[O+8>>2];k[O+0>>2]=0;k[O+4>>2]=0;k[O+8>>2]=0;d=d+12|0;k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{b=k[c>>2]|0;g=(d-b|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(f-b|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(ca,d,g,c+12|0);d=ca+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[O+0>>2];k[e+4>>2]=k[O+4>>2];k[e+8>>2]=k[O+8>>2];k[O+0>>2]=0;k[O+4>>2]=0;k[O+8>>2]=0;$=e+12|0;k[$+0>>2]=k[h+0>>2];k[$+4>>2]=k[h+4>>2];k[$+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[d>>2]=e+24;Ml(c,ca);Ll(ca)}hl(O);d=a+2|0;break a}case 118:{if(((i[a+1>>0]|0)+-48|0)>>>0>=10){d=a;break a}$=a+2|0;d=Ul($,b,c)|0;if((d|0)==($|0)){d=a;break a}e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}rl(e+-24|0,0,58976)|0;break a}default:{d=a;break a}}while(0);else d=a;while(0);r=da;return d|0}function tm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0;p=r;r=r+80|0;n=p+48|0;j=p;l=p+24|0;m=p+36|0;o=zl(a,b)|0;if(!((o|0)==(a|0)|(o|0)==(b|0))?(i[o>>0]|0)==69:0){b=i[c>>0]|0;if(!(b&1))b=(b&255)>>>1;else b=k[c+4>>2]|0;do if(b>>>0>3){Zl(m,58248,c);g=sl(m,58240)|0;k[l+0>>2]=k[g+0>>2];k[l+4>>2]=k[g+4>>2];k[l+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[j+0>>2]=k[l+0>>2];k[j+4>>2]=k[l+4>>2];k[j+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;g=j+12|0;k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;f=d+4|0;b=k[f>>2]|0;e=k[d+8>>2]|0;if(b>>>0<e>>>0){if(!b)b=0;else{k[b+0>>2]=k[j+0>>2];k[b+4>>2]=k[j+4>>2];k[b+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;b=b+12|0;k[b+0>>2]=k[g+0>>2];k[b+4>>2]=k[g+4>>2];k[b+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;b=k[f>>2]|0}k[f>>2]=b+24}else{f=k[d>>2]|0;h=(b-f|0)/24|0;b=h+1|0;if((b|0)<0)Fl(d);f=(e-f|0)/24|0;if(f>>>0<1073741823){f=f<<1;f=f>>>0<b>>>0?b:f}else f=2147483647;Kl(n,f,h,d+12|0);f=n+8|0;b=k[f>>2]|0;if(b){k[b+0>>2]=k[j+0>>2];k[b+4>>2]=k[j+4>>2];k[b+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;h=b+12|0;k[h+0>>2]=k[g+0>>2];k[h+4>>2]=k[g+4>>2];k[h+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0}k[f>>2]=b+24;Ml(d,n);Ll(n)}hl(j);tl(l);tl(m)}else{e=d+4|0;b=k[e>>2]|0;g=k[d+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[b+12>>2]=0;k[b+16>>2]=0;k[b+20>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24;break}e=k[d>>2]|0;h=(b-e|0)/24|0;f=h+1|0;if((f|0)<0)Fl(d);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<f>>>0?f:b}else b=2147483647;Kl(n,b,h,d+12|0);b=n+8|0;e=k[b>>2]|0;if(e){k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=0;k[e+16>>2]=0;k[e+20>>2]=0}k[b>>2]=e+24;Ml(d,n);Ll(n)}while(0);f=d+4|0;if((i[a>>0]|0)==110){Cl((k[f>>2]|0)+-24|0,45);a=a+1|0}rm((k[f>>2]|0)+-24|0,a,o);e=i[c>>0]|0;a=(e&1)==0;if(a)b=(e&255)>>>1;else b=k[c+4>>2]|0;if(b>>>0<4){if(a){b=c+1|0;a=(e&255)>>>1}else{b=k[c+8>>2]|0;a=k[c+4>>2]|0}jl((k[f>>2]|0)+-24|0,b,a)|0}a=o+1|0}r=p;return a|0}function um(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0;l=r;r=r+32|0;h=l+12|0;j=l;do if((b-a|0)>1){d=i[a>>0]|0;if(d<<24>>24==100|d<<24>>24==111?(i[a+1>>0]|0)==110:0){f=a+2|0;if(d<<24>>24!=111){if((f|0)!=(b|0)){d=vm(f,b,c)|0;if((d|0)==(f|0))d=wm(f,b,c)|0;if((d|0)!=(f|0)?(g=k[c+4>>2]|0,(k[c>>2]|0)!=(g|0)):0)rl(g+-24|0,0,58408)|0;else d=f}else d=b;r=l;return ((d|0)==(f|0)?a:d)|0}e=sm(f,b,c)|0;if((e|0)==(f|0)){d=a;break}d=Tl(e,b,c)|0;if((d|0)==(e|0)){d=e;break}g=c+4|0;e=k[g>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2)break;Al(h,e+-24|0);b=k[g>>2]|0;e=b+-24|0;f=b;do{a=f+-24|0;k[g>>2]=a;hl(a);f=k[g>>2]|0}while((f|0)!=(e|0));e=i[h>>0]|0;if(!(e&1)){f=h+1|0;e=(e&255)>>>1}else{f=k[h+8>>2]|0;e=k[h+4>>2]|0}jl(b+-48|0,f,e)|0;tl(h);break}d=wm(a,b,c)|0;if((d|0)==(a|0)){e=sm(a,b,c)|0;if((e|0)!=(a|0)){d=Tl(e,b,c)|0;if((d|0)!=(e|0)){g=c+4|0;e=k[g>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0>=2){Al(j,e+-24|0);b=k[g>>2]|0;e=b+-24|0;f=b;do{h=f+-24|0;k[g>>2]=h;hl(h);f=k[g>>2]|0}while((f|0)!=(e|0));e=i[j>>0]|0;if(!(e&1)){f=j+1|0;e=(e&255)>>>1}else{f=k[j+8>>2]|0;e=k[j+4>>2]|0}jl(b+-48|0,f,e)|0;tl(j)}}else d=e}else d=a}}else d=a;while(0);r=l;return d|0}function vm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0;o=r;r=r+96|0;n=o+68|0;m=o;g=o+16|0;j=o+24|0;f=o+40|0;l=o+48|0;h=o+64|0;a:do if((a|0)!=(b|0)){d=i[a>>0]|0;if((d|0)==83){d=Xl(a,b,c)|0;if((d|0)!=(a|0))break;if((b-a|0)<=2){d=a;break}if((i[a+1>>0]|0)!=116){d=a;break}m=a+2|0;d=am(m,b,c)|0;if((d|0)==(m|0)){d=a;break}e=c+4|0;b=k[e>>2]|0;if((k[c>>2]|0)==(b|0)){d=a;break}rl(b+-24|0,0,58856)|0;a=c+16|0;e=(k[e>>2]|0)+-24|0;k[h>>2]=k[c+12>>2];Rl(l,e,h);e=c+20|0;b=k[e>>2]|0;g=k[c+24>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+12>>2]=k[l+12>>2];k[b>>2]=k[l>>2];n=l+4|0;k[b+4>>2]=k[n>>2];c=l+8|0;k[b+8>>2]=k[c>>2];k[c>>2]=0;k[n>>2]=0;k[l>>2]=0;b=k[e>>2]|0}k[e>>2]=b+16}else{f=k[a>>2]|0;h=b-f>>4;e=h+1|0;if((e|0)<0)Fl(a);b=g-f|0;if(b>>4>>>0<1073741823){b=b>>3;b=b>>>0<e>>>0?e:b}else b=2147483647;Gl(n,b,h,c+28|0);b=n+8|0;e=k[b>>2]|0;if(e){k[e+12>>2]=k[l+12>>2];k[e>>2]=k[l>>2];c=l+4|0;k[e+4>>2]=k[c>>2];m=l+8|0;k[e+8>>2]=k[m>>2];k[m>>2]=0;k[c>>2]=0;k[l>>2]=0}k[b>>2]=e+16;Hl(a,n);Il(n)}il(l);break}else if((d|0)==68){d=Yl(a,b,c)|0;if((d|0)==(a|0)){d=a;break}b=k[c+4>>2]|0;if((k[c>>2]|0)==(b|0)){d=a;break}a=c+16|0;k[f>>2]=k[c+12>>2];Rl(j,b+-24|0,f);e=c+20|0;b=k[e>>2]|0;h=k[c+24>>2]|0;if(b>>>0<h>>>0){if(!b)b=0;else{k[b+12>>2]=k[j+12>>2];k[b>>2]=k[j>>2];n=j+4|0;k[b+4>>2]=k[n>>2];c=j+8|0;k[b+8>>2]=k[c>>2];k[c>>2]=0;k[n>>2]=0;k[j>>2]=0;b=k[e>>2]|0}k[e>>2]=b+16}else{e=k[a>>2]|0;g=b-e>>4;f=g+1|0;if((f|0)<0)Fl(a);b=h-e|0;if(b>>4>>>0<1073741823){b=b>>3;b=b>>>0<f>>>0?f:b}else b=2147483647;Gl(n,b,g,c+28|0);b=n+8|0;e=k[b>>2]|0;if(e){k[e+12>>2]=k[j+12>>2];k[e>>2]=k[j>>2];c=j+4|0;k[e+4>>2]=k[c>>2];m=j+8|0;k[e+8>>2]=k[m>>2];k[m>>2]=0;k[c>>2]=0;k[j>>2]=0}k[b>>2]=e+16;Hl(a,n);Il(n)}il(j);break}else if((d|0)==84){h=c+4|0;f=((k[h>>2]|0)-(k[c>>2]|0)|0)/24|0;d=Sl(a,b,c)|0;e=k[h>>2]|0;b=(e-(k[c>>2]|0)|0)/24|0;if(!((d|0)!=(a|0)&(b|0)==(f+1|0))){if((b|0)==(f|0)){d=a;break}while(1){d=e;e=e+-24|0;do{n=d+-24|0;k[h>>2]=n;hl(n);d=k[h>>2]|0}while((d|0)!=(e|0));b=b+-1|0;if((b|0)==(f|0)){d=a;break a}}}a=c+16|0;k[g>>2]=k[c+12>>2];Rl(m,e+-24|0,g);e=c+20|0;b=k[e>>2]|0;h=k[c+24>>2]|0;if(b>>>0<h>>>0){if(!b)b=0;else{k[b+12>>2]=k[m+12>>2];k[b>>2]=k[m>>2];n=m+4|0;k[b+4>>2]=k[n>>2];c=m+8|0;k[b+8>>2]=k[c>>2];k[c>>2]=0;k[n>>2]=0;k[m>>2]=0;b=k[e>>2]|0}k[e>>2]=b+16}else{f=k[a>>2]|0;g=b-f>>4;e=g+1|0;if((e|0)<0)Fl(a);b=h-f|0;if(b>>4>>>0<1073741823){b=b>>3;b=b>>>0<e>>>0?e:b}else b=2147483647;Gl(n,b,g,c+28|0);b=n+8|0;e=k[b>>2]|0;if(e){k[e+12>>2]=k[m+12>>2];k[e>>2]=k[m>>2];c=m+4|0;k[e+4>>2]=k[c>>2];g=m+8|0;k[e+8>>2]=k[g>>2];k[g>>2]=0;k[c>>2]=0;k[m>>2]=0}k[b>>2]=e+16;Hl(a,n);Il(n)}il(m);break}else{d=a;break}}else d=a;while(0);r=o;return d|0}function wm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;g=r;r=r+16|0;f=g;if((a|0)!=(b|0)?(d=Ul(a,b,c)|0,(d|0)!=(a|0)):0){b=Tl(d,b,c)|0;if((b|0)!=(d|0)){e=c+4|0;d=k[e>>2]|0;if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2)b=a;else{Al(f,d+-24|0);a=k[e>>2]|0;d=a+-24|0;c=a;do{h=c+-24|0;k[e>>2]=h;hl(h);c=k[e>>2]|0}while((c|0)!=(d|0));d=i[f>>0]|0;if(!(d&1)){c=f+1|0;d=(d&255)>>>1}else{c=k[f+8>>2]|0;d=k[f+4>>2]|0}jl(a+-48|0,c,d)|0;tl(f)}}else b=d}else b=a;r=g;return b|0}function xm(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;do if(a>>>0<245){if(a>>>0<11)o=16;else o=a+11&-8;a=o>>>3;j=k[15476]|0;d=j>>>a;if(d&3){b=(d&1^1)+a|0;d=b<<1;c=61944+(d<<2)|0;d=61944+(d+2<<2)|0;e=k[d>>2]|0;f=e+8|0;g=k[f>>2]|0;do if((c|0)!=(g|0)){if(g>>>0<(k[15480]|0)>>>0)Ob();a=g+12|0;if((k[a>>2]|0)==(e|0)){k[a>>2]=c;k[d>>2]=g;break}else Ob()}else k[15476]=j&~(1<<b);while(0);L=b<<3;k[e+4>>2]=L|3;L=e+(L|4)|0;k[L>>2]=k[L>>2]|1;L=f;return L|0}g=k[15478]|0;if(o>>>0>g>>>0){if(d){c=2<<a;c=d<<a&(c|0-c);c=(c&0-c)+-1|0;i=c>>>12&16;c=c>>>i;f=c>>>5&8;c=c>>>f;e=c>>>2&4;c=c>>>e;b=c>>>1&2;c=c>>>b;d=c>>>1&1;d=(f|i|e|b|d)+(c>>>d)|0;c=d<<1;b=61944+(c<<2)|0;c=61944+(c+2<<2)|0;e=k[c>>2]|0;i=e+8|0;f=k[i>>2]|0;do if((b|0)!=(f|0)){if(f>>>0<(k[15480]|0)>>>0)Ob();a=f+12|0;if((k[a>>2]|0)==(e|0)){k[a>>2]=b;k[c>>2]=f;l=k[15478]|0;break}else Ob()}else{k[15476]=j&~(1<<d);l=g}while(0);L=d<<3;g=L-o|0;k[e+4>>2]=o|3;h=e+o|0;k[e+(o|4)>>2]=g|1;k[e+L>>2]=g;if(l){f=k[15481]|0;b=l>>>3;a=b<<1;c=61944+(a<<2)|0;d=k[15476]|0;b=1<<b;if(d&b){d=61944+(a+2<<2)|0;a=k[d>>2]|0;if(a>>>0<(k[15480]|0)>>>0)Ob();else{m=d;n=a}}else{k[15476]=d|b;m=61944+(a+2<<2)|0;n=c}k[m>>2]=f;k[n+12>>2]=f;k[f+8>>2]=n;k[f+12>>2]=c}k[15478]=g;k[15481]=h;L=i;return L|0}a=k[15477]|0;if(a){b=(a&0-a)+-1|0;K=b>>>12&16;b=b>>>K;H=b>>>5&8;b=b>>>H;L=b>>>2&4;b=b>>>L;d=b>>>1&2;b=b>>>d;c=b>>>1&1;c=k[62208+((H|K|L|d|c)+(b>>>c)<<2)>>2]|0;b=(k[c+4>>2]&-8)-o|0;d=c;while(1){a=k[d+16>>2]|0;if(!a){a=k[d+20>>2]|0;if(!a){j=b;break}}d=(k[a+4>>2]&-8)-o|0;L=d>>>0<b>>>0;b=L?d:b;d=a;c=L?a:c}h=k[15480]|0;if(c>>>0<h>>>0)Ob();g=c+o|0;if(c>>>0>=g>>>0)Ob();i=k[c+24>>2]|0;b=k[c+12>>2]|0;do if((b|0)==(c|0)){d=c+20|0;a=k[d>>2]|0;if(!a){d=c+16|0;a=k[d>>2]|0;if(!a){e=0;break}}while(1){b=a+20|0;f=k[b>>2]|0;if(f){a=f;d=b;continue}b=a+16|0;f=k[b>>2]|0;if(!f)break;else{a=f;d=b}}if(d>>>0<h>>>0)Ob();else{k[d>>2]=0;e=a;break}}else{f=k[c+8>>2]|0;if(f>>>0<h>>>0)Ob();a=f+12|0;if((k[a>>2]|0)!=(c|0))Ob();d=b+8|0;if((k[d>>2]|0)==(c|0)){k[a>>2]=b;k[d>>2]=f;e=b;break}else Ob()}while(0);do if(i){a=k[c+28>>2]|0;d=62208+(a<<2)|0;if((c|0)==(k[d>>2]|0)){k[d>>2]=e;if(!e){k[15477]=k[15477]&~(1<<a);break}}else{if(i>>>0<(k[15480]|0)>>>0)Ob();a=i+16|0;if((k[a>>2]|0)==(c|0))k[a>>2]=e;else k[i+20>>2]=e;if(!e)break}d=k[15480]|0;if(e>>>0<d>>>0)Ob();k[e+24>>2]=i;a=k[c+16>>2]|0;do if(a)if(a>>>0<d>>>0)Ob();else{k[e+16>>2]=a;k[a+24>>2]=e;break}while(0);a=k[c+20>>2]|0;if(a)if(a>>>0<(k[15480]|0)>>>0)Ob();else{k[e+20>>2]=a;k[a+24>>2]=e;break}}while(0);if(j>>>0<16){L=j+o|0;k[c+4>>2]=L|3;L=c+(L+4)|0;k[L>>2]=k[L>>2]|1}else{k[c+4>>2]=o|3;k[c+(o|4)>>2]=j|1;k[c+(j+o)>>2]=j;a=k[15478]|0;if(a){e=k[15481]|0;b=a>>>3;a=b<<1;f=61944+(a<<2)|0;d=k[15476]|0;b=1<<b;if(d&b){a=61944+(a+2<<2)|0;d=k[a>>2]|0;if(d>>>0<(k[15480]|0)>>>0)Ob();else{p=a;q=d}}else{k[15476]=d|b;p=61944+(a+2<<2)|0;q=f}k[p>>2]=e;k[q+12>>2]=e;k[e+8>>2]=q;k[e+12>>2]=f}k[15478]=j;k[15481]=g}L=c+8|0;return L|0}else q=o}else q=o}else if(a>>>0<=4294967231){a=a+11|0;m=a&-8;l=k[15477]|0;if(l){c=0-m|0;a=a>>>8;if(a)if(m>>>0>16777215)j=31;else{p=(a+1048320|0)>>>16&8;q=a<<p;n=(q+520192|0)>>>16&4;q=q<<n;j=(q+245760|0)>>>16&2;j=14-(n|p|j)+(q<<j>>>15)|0;j=m>>>(j+7|0)&1|j<<1}else j=0;i=k[62208+(j<<2)>>2]|0;a:do if(!i){a=0;d=0}else{if((j|0)==31)d=0;else d=25-(j>>>1)|0;e=c;a=0;g=m<<d;d=0;while(1){f=k[i+4>>2]&-8;c=f-m|0;if(c>>>0<e>>>0)if((f|0)==(m|0)){a=i;d=i;break a}else d=i;else c=e;q=k[i+20>>2]|0;i=k[i+(g>>>31<<2)+16>>2]|0;a=(q|0)==0|(q|0)==(i|0)?a:q;if(!i)break;else{e=c;g=g<<1}}}while(0);if((a|0)==0&(d|0)==0){a=2<<j;a=l&(a|0-a);if(!a){q=m;break}q=(a&0-a)+-1|0;l=q>>>12&16;q=q>>>l;j=q>>>5&8;q=q>>>j;n=q>>>2&4;q=q>>>n;p=q>>>1&2;q=q>>>p;a=q>>>1&1;a=k[62208+((j|l|n|p|a)+(q>>>a)<<2)>>2]|0}if(!a){e=c;g=d}else while(1){q=(k[a+4>>2]&-8)-m|0;i=q>>>0<c>>>0;c=i?q:c;d=i?a:d;i=k[a+16>>2]|0;if(i){a=i;continue}a=k[a+20>>2]|0;if(!a){e=c;g=d;break}}if((g|0)!=0?e>>>0<((k[15478]|0)-m|0)>>>0:0){h=k[15480]|0;if(g>>>0<h>>>0)Ob();f=g+m|0;if(g>>>0>=f>>>0)Ob();i=k[g+24>>2]|0;b=k[g+12>>2]|0;do if((b|0)==(g|0)){d=g+20|0;a=k[d>>2]|0;if(!a){d=g+16|0;a=k[d>>2]|0;if(!a){o=0;break}}while(1){b=a+20|0;c=k[b>>2]|0;if(c){a=c;d=b;continue}b=a+16|0;c=k[b>>2]|0;if(!c)break;else{a=c;d=b}}if(d>>>0<h>>>0)Ob();else{k[d>>2]=0;o=a;break}}else{c=k[g+8>>2]|0;if(c>>>0<h>>>0)Ob();a=c+12|0;if((k[a>>2]|0)!=(g|0))Ob();d=b+8|0;if((k[d>>2]|0)==(g|0)){k[a>>2]=b;k[d>>2]=c;o=b;break}else Ob()}while(0);do if(i){a=k[g+28>>2]|0;d=62208+(a<<2)|0;if((g|0)==(k[d>>2]|0)){k[d>>2]=o;if(!o){k[15477]=k[15477]&~(1<<a);break}}else{if(i>>>0<(k[15480]|0)>>>0)Ob();a=i+16|0;if((k[a>>2]|0)==(g|0))k[a>>2]=o;else k[i+20>>2]=o;if(!o)break}d=k[15480]|0;if(o>>>0<d>>>0)Ob();k[o+24>>2]=i;a=k[g+16>>2]|0;do if(a)if(a>>>0<d>>>0)Ob();else{k[o+16>>2]=a;k[a+24>>2]=o;break}while(0);a=k[g+20>>2]|0;if(a)if(a>>>0<(k[15480]|0)>>>0)Ob();else{k[o+20>>2]=a;k[a+24>>2]=o;break}}while(0);b:do if(e>>>0>=16){k[g+4>>2]=m|3;k[g+(m|4)>>2]=e|1;k[g+(e+m)>>2]=e;a=e>>>3;if(e>>>0<256){d=a<<1;c=61944+(d<<2)|0;b=k[15476]|0;a=1<<a;do if(!(b&a)){k[15476]=b|a;s=61944+(d+2<<2)|0;t=c}else{a=61944+(d+2<<2)|0;d=k[a>>2]|0;if(d>>>0>=(k[15480]|0)>>>0){s=a;t=d;break}Ob()}while(0);k[s>>2]=f;k[t+12>>2]=f;k[g+(m+8)>>2]=t;k[g+(m+12)>>2]=c;break}a=e>>>8;if(a)if(e>>>0>16777215)c=31;else{K=(a+1048320|0)>>>16&8;L=a<<K;H=(L+520192|0)>>>16&4;L=L<<H;c=(L+245760|0)>>>16&2;c=14-(H|K|c)+(L<<c>>>15)|0;c=e>>>(c+7|0)&1|c<<1}else c=0;a=62208+(c<<2)|0;k[g+(m+28)>>2]=c;k[g+(m+20)>>2]=0;k[g+(m+16)>>2]=0;d=k[15477]|0;b=1<<c;if(!(d&b)){k[15477]=d|b;k[a>>2]=f;k[g+(m+24)>>2]=a;k[g+(m+12)>>2]=f;k[g+(m+8)>>2]=f;break}a=k[a>>2]|0;if((c|0)==31)b=0;else b=25-(c>>>1)|0;c:do if((k[a+4>>2]&-8|0)!=(e|0)){c=e<<b;while(1){b=a+(c>>>31<<2)+16|0;d=k[b>>2]|0;if(!d)break;if((k[d+4>>2]&-8|0)==(e|0)){z=d;break c}else{c=c<<1;a=d}}if(b>>>0<(k[15480]|0)>>>0)Ob();else{k[b>>2]=f;k[g+(m+24)>>2]=a;k[g+(m+12)>>2]=f;k[g+(m+8)>>2]=f;break b}}else z=a;while(0);a=z+8|0;b=k[a>>2]|0;L=k[15480]|0;if(z>>>0>=L>>>0&b>>>0>=L>>>0){k[b+12>>2]=f;k[a>>2]=f;k[g+(m+8)>>2]=b;k[g+(m+12)>>2]=z;k[g+(m+24)>>2]=0;break}else Ob()}else{L=e+m|0;k[g+4>>2]=L|3;L=g+(L+4)|0;k[L>>2]=k[L>>2]|1}while(0);L=g+8|0;return L|0}else q=m}else q=m}else q=-1;while(0);d=k[15478]|0;if(d>>>0>=q>>>0){a=d-q|0;b=k[15481]|0;if(a>>>0>15){k[15481]=b+q;k[15478]=a;k[b+(q+4)>>2]=a|1;k[b+d>>2]=a;k[b+4>>2]=q|3}else{k[15478]=0;k[15481]=0;k[b+4>>2]=d|3;L=b+(d+4)|0;k[L>>2]=k[L>>2]|1}L=b+8|0;return L|0}a=k[15479]|0;if(a>>>0>q>>>0){K=a-q|0;k[15479]=K;L=k[15482]|0;k[15482]=L+q;k[L+(q+4)>>2]=K|1;k[L+4>>2]=q|3;L=L+8|0;return L|0}do if(!(k[15594]|0)){a=Ja(30)|0;if(!(a+-1&a)){k[15596]=a;k[15595]=a;k[15597]=-1;k[15598]=-1;k[15599]=0;k[15587]=0;z=(nb(0)|0)&-16^1431655768;k[15594]=z;break}else Ob()}while(0);j=q+48|0;g=k[15596]|0;l=q+47|0;e=g+l|0;g=0-g|0;m=e&g;if(m>>>0<=q>>>0){L=0;return L|0}a=k[15586]|0;if((a|0)!=0?(t=k[15584]|0,z=t+m|0,z>>>0<=t>>>0|z>>>0>a>>>0):0){L=0;return L|0}d:do if(!(k[15587]&4)){a=k[15482]|0;e:do if(a){i=62352|0;while(1){d=k[i>>2]|0;if(d>>>0<=a>>>0?(r=i+4|0,(d+(k[r>>2]|0)|0)>>>0>a>>>0):0){f=i;c=r;a=i;break}i=k[i+8>>2]|0;if(!i){E=181;break e}}if(a){a=e-(k[15479]|0)&g;if(a>>>0<2147483647){d=Ga(a|0)|0;if((d|0)==((k[f>>2]|0)+(k[c>>2]|0)|0))E=190;else E=191}else a=0}else E=181}else E=181;while(0);do if((E|0)==181){d=Ga(0)|0;if((d|0)!=(-1|0)){a=d;c=k[15595]|0;i=c+-1|0;if(!(i&a))a=m;else a=m-a+(i+a&0-c)|0;c=k[15584]|0;i=c+a|0;if(a>>>0>q>>>0&a>>>0<2147483647){z=k[15586]|0;if((z|0)!=0?i>>>0<=c>>>0|i>>>0>z>>>0:0){a=0;break}c=Ga(a|0)|0;if((c|0)==(d|0))E=190;else{d=c;E=191}}else a=0}else a=0}while(0);f:do if((E|0)==190){if((d|0)!=(-1|0)){v=d;p=a;E=201;break d}}else if((E|0)==191){c=0-a|0;do if((d|0)!=(-1|0)&a>>>0<2147483647&j>>>0>a>>>0?(u=k[15596]|0,u=l-a+u&0-u,u>>>0<2147483647):0)if((Ga(u|0)|0)==(-1|0)){Ga(c|0)|0;a=0;break f}else{a=u+a|0;break}while(0);if((d|0)==(-1|0))a=0;else{v=d;p=a;E=201;break d}}while(0);k[15587]=k[15587]|4;E=198}else{a=0;E=198}while(0);if((((E|0)==198?m>>>0<2147483647:0)?(v=Ga(m|0)|0,w=Ga(0)|0,(v|0)!=(-1|0)&(w|0)!=(-1|0)&v>>>0<w>>>0):0)?(x=w-v|0,y=x>>>0>(q+40|0)>>>0,y):0){p=y?x:a;E=201}if((E|0)==201){a=(k[15584]|0)+p|0;k[15584]=a;if(a>>>0>(k[15585]|0)>>>0)k[15585]=a;f=k[15482]|0;g:do if(f){i=62352|0;do{a=k[i>>2]|0;d=i+4|0;c=k[d>>2]|0;if((v|0)==(a+c|0)){A=a;B=d;C=c;D=i;E=213;break}i=k[i+8>>2]|0}while((i|0)!=0);if(((E|0)==213?(k[D+12>>2]&8|0)==0:0)?f>>>0>=A>>>0&f>>>0<v>>>0:0){k[B>>2]=C+p;b=(k[15479]|0)+p|0;a=f+8|0;if(!(a&7))a=0;else a=0-a&7;L=b-a|0;k[15482]=f+a;k[15479]=L;k[f+(a+4)>>2]=L|1;k[f+(b+4)>>2]=40;k[15483]=k[15598];break}a=k[15480]|0;if(v>>>0<a>>>0){k[15480]=v;l=v}else l=a;a=v+p|0;d=62352|0;do{if((k[d>>2]|0)==(a|0)){F=d;G=d;E=223;break}d=k[d+8>>2]|0}while((d|0)!=0);if((E|0)==223?(k[G+12>>2]&8|0)==0:0){k[F>>2]=v;a=G+4|0;k[a>>2]=(k[a>>2]|0)+p;a=v+8|0;if(!(a&7))o=0;else o=0-a&7;a=v+(p+8)|0;if(!(a&7))g=0;else g=0-a&7;a=v+(g+p)|0;m=o+q|0;n=v+m|0;j=a-(v+o)-q|0;k[v+(o+4)>>2]=q|3;h:do if((a|0)!=(f|0)){if((a|0)==(k[15481]|0)){L=(k[15478]|0)+j|0;k[15478]=L;k[15481]=n;k[v+(m+4)>>2]=L|1;k[v+(L+m)>>2]=L;break}f=p+4|0;h=k[v+(f+g)>>2]|0;if((h&3|0)==1){e=h&-8;c=h>>>3;i:do if(h>>>0>=256){i=k[v+((g|24)+p)>>2]|0;b=k[v+(p+12+g)>>2]|0;do if((b|0)==(a|0)){b=g|16;d=v+(f+b)|0;h=k[d>>2]|0;if(!h){d=v+(b+p)|0;h=k[d>>2]|0;if(!h){L=0;break}}while(1){b=h+20|0;c=k[b>>2]|0;if(c){h=c;d=b;continue}b=h+16|0;c=k[b>>2]|0;if(!c)break;else{h=c;d=b}}if(d>>>0<l>>>0)Ob();else{k[d>>2]=0;L=h;break}}else{c=k[v+((g|8)+p)>>2]|0;if(c>>>0<l>>>0)Ob();h=c+12|0;if((k[h>>2]|0)!=(a|0))Ob();d=b+8|0;if((k[d>>2]|0)==(a|0)){k[h>>2]=b;k[d>>2]=c;L=b;break}else Ob()}while(0);if(!i)break;h=k[v+(p+28+g)>>2]|0;d=62208+(h<<2)|0;do if((a|0)!=(k[d>>2]|0)){if(i>>>0<(k[15480]|0)>>>0)Ob();h=i+16|0;if((k[h>>2]|0)==(a|0))k[h>>2]=L;else k[i+20>>2]=L;if(!L)break i}else{k[d>>2]=L;if(L)break;k[15477]=k[15477]&~(1<<h);break i}while(0);d=k[15480]|0;if(L>>>0<d>>>0)Ob();k[L+24>>2]=i;a=g|16;h=k[v+(a+p)>>2]|0;do if(h)if(h>>>0<d>>>0)Ob();else{k[L+16>>2]=h;k[h+24>>2]=L;break}while(0);a=k[v+(f+a)>>2]|0;if(!a)break;if(a>>>0<(k[15480]|0)>>>0)Ob();else{k[L+20>>2]=a;k[a+24>>2]=L;break}}else{d=k[v+((g|8)+p)>>2]|0;b=k[v+(p+12+g)>>2]|0;h=61944+(c<<1<<2)|0;do if((d|0)!=(h|0)){if(d>>>0<l>>>0)Ob();if((k[d+12>>2]|0)==(a|0))break;Ob()}while(0);if((b|0)==(d|0)){k[15476]=k[15476]&~(1<<c);break}do if((b|0)==(h|0))H=b+8|0;else{if(b>>>0<l>>>0)Ob();h=b+8|0;if((k[h>>2]|0)==(a|0)){H=h;break}Ob()}while(0);k[d+12>>2]=b;k[H>>2]=d}while(0);a=v+((e|g)+p)|0;h=e+j|0}else h=j;a=a+4|0;k[a>>2]=k[a>>2]&-2;k[v+(m+4)>>2]=h|1;k[v+(h+m)>>2]=h;a=h>>>3;if(h>>>0<256){d=a<<1;c=61944+(d<<2)|0;b=k[15476]|0;a=1<<a;do if(!(b&a)){k[15476]=b|a;M=61944+(d+2<<2)|0;N=c}else{a=61944+(d+2<<2)|0;d=k[a>>2]|0;if(d>>>0>=(k[15480]|0)>>>0){M=a;N=d;break}Ob()}while(0);k[M>>2]=n;k[N+12>>2]=n;k[v+(m+8)>>2]=N;k[v+(m+12)>>2]=c;break}a=h>>>8;do if(!a)c=0;else{if(h>>>0>16777215){c=31;break}K=(a+1048320|0)>>>16&8;L=a<<K;H=(L+520192|0)>>>16&4;L=L<<H;c=(L+245760|0)>>>16&2;c=14-(H|K|c)+(L<<c>>>15)|0;c=h>>>(c+7|0)&1|c<<1}while(0);a=62208+(c<<2)|0;k[v+(m+28)>>2]=c;k[v+(m+20)>>2]=0;k[v+(m+16)>>2]=0;d=k[15477]|0;b=1<<c;if(!(d&b)){k[15477]=d|b;k[a>>2]=n;k[v+(m+24)>>2]=a;k[v+(m+12)>>2]=n;k[v+(m+8)>>2]=n;break}a=k[a>>2]|0;if((c|0)==31)d=0;else d=25-(c>>>1)|0;j:do if((k[a+4>>2]&-8|0)!=(h|0)){c=h<<d;while(1){b=a+(c>>>31<<2)+16|0;d=k[b>>2]|0;if(!d)break;if((k[d+4>>2]&-8|0)==(h|0)){O=d;break j}else{c=c<<1;a=d}}if(b>>>0<(k[15480]|0)>>>0)Ob();else{k[b>>2]=n;k[v+(m+24)>>2]=a;k[v+(m+12)>>2]=n;k[v+(m+8)>>2]=n;break h}}else O=a;while(0);a=O+8|0;b=k[a>>2]|0;L=k[15480]|0;if(O>>>0>=L>>>0&b>>>0>=L>>>0){k[b+12>>2]=n;k[a>>2]=n;k[v+(m+8)>>2]=b;k[v+(m+12)>>2]=O;k[v+(m+24)>>2]=0;break}else Ob()}else{L=(k[15479]|0)+j|0;k[15479]=L;k[15482]=n;k[v+(m+4)>>2]=L|1}while(0);L=v+(o|8)|0;return L|0}d=62352|0;while(1){a=k[d>>2]|0;if(a>>>0<=f>>>0?(b=k[d+4>>2]|0,h=a+b|0,h>>>0>f>>>0):0)break;d=k[d+8>>2]|0}d=a+(b+-39)|0;if(!(d&7))d=0;else d=0-d&7;b=a+(b+-47+d)|0;b=b>>>0<(f+16|0)>>>0?f:b;d=b+8|0;a=v+8|0;if(!(a&7))a=0;else a=0-a&7;L=p+-40-a|0;k[15482]=v+a;k[15479]=L;k[v+(a+4)>>2]=L|1;k[v+(p+-36)>>2]=40;k[15483]=k[15598];k[b+4>>2]=27;k[d+0>>2]=k[15588];k[d+4>>2]=k[15589];k[d+8>>2]=k[15590];k[d+12>>2]=k[15591];k[15588]=v;k[15589]=p;k[15591]=0;k[15590]=d;a=b+28|0;k[a>>2]=7;if((b+32|0)>>>0<h>>>0)do{L=a;a=a+4|0;k[a>>2]=7}while((L+8|0)>>>0<h>>>0);if((b|0)!=(f|0)){h=b-f|0;a=f+(h+4)|0;k[a>>2]=k[a>>2]&-2;k[f+4>>2]=h|1;k[f+h>>2]=h;a=h>>>3;if(h>>>0<256){d=a<<1;c=61944+(d<<2)|0;b=k[15476]|0;a=1<<a;do if(!(b&a)){k[15476]=b|a;I=61944+(d+2<<2)|0;J=c}else{a=61944+(d+2<<2)|0;b=k[a>>2]|0;if(b>>>0>=(k[15480]|0)>>>0){I=a;J=b;break}Ob()}while(0);k[I>>2]=f;k[J+12>>2]=f;k[f+8>>2]=J;k[f+12>>2]=c;break}a=h>>>8;if(a)if(h>>>0>16777215)d=31;else{H=(a+1048320|0)>>>16&8;L=a<<H;G=(L+520192|0)>>>16&4;L=L<<G;d=(L+245760|0)>>>16&2;d=14-(G|H|d)+(L<<d>>>15)|0;d=h>>>(d+7|0)&1|d<<1}else d=0;a=62208+(d<<2)|0;k[f+28>>2]=d;k[f+20>>2]=0;k[f+16>>2]=0;b=k[15477]|0;c=1<<d;if(!(b&c)){k[15477]=b|c;k[a>>2]=f;k[f+24>>2]=a;k[f+12>>2]=f;k[f+8>>2]=f;break}a=k[a>>2]|0;if((d|0)==31)b=0;else b=25-(d>>>1)|0;k:do if((k[a+4>>2]&-8|0)!=(h|0)){d=h<<b;while(1){b=a+(d>>>31<<2)+16|0;c=k[b>>2]|0;if(!c)break;if((k[c+4>>2]&-8|0)==(h|0)){K=c;break k}else{d=d<<1;a=c}}if(b>>>0<(k[15480]|0)>>>0)Ob();else{k[b>>2]=f;k[f+24>>2]=a;k[f+12>>2]=f;k[f+8>>2]=f;break g}}else K=a;while(0);a=K+8|0;b=k[a>>2]|0;L=k[15480]|0;if(K>>>0>=L>>>0&b>>>0>=L>>>0){k[b+12>>2]=f;k[a>>2]=f;k[f+8>>2]=b;k[f+12>>2]=K;k[f+24>>2]=0;break}else Ob()}}else{L=k[15480]|0;if((L|0)==0|v>>>0<L>>>0)k[15480]=v;k[15588]=v;k[15589]=p;k[15591]=0;k[15485]=k[15594];k[15484]=-1;a=0;do{L=a<<1;K=61944+(L<<2)|0;k[61944+(L+3<<2)>>2]=K;k[61944+(L+2<<2)>>2]=K;a=a+1|0}while((a|0)!=32);a=v+8|0;if(!(a&7))a=0;else a=0-a&7;L=p+-40-a|0;k[15482]=v+a;k[15479]=L;k[v+(a+4)>>2]=L|1;k[v+(p+-36)>>2]=40;k[15483]=k[15598]}while(0);a=k[15479]|0;if(a>>>0>q>>>0){K=a-q|0;k[15479]=K;L=k[15482]|0;k[15482]=L+q;k[L+(q+4)>>2]=K|1;k[L+4>>2]=q|3;L=L+8|0;return L|0}}L=ac()|0;k[L>>2]=12;L=0;return L|0}function ym(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0;if(!a)return;b=a+-8|0;h=k[15480]|0;if(b>>>0<h>>>0)Ob();e=k[a+-4>>2]|0;c=e&3;if((c|0)==1)Ob();o=e&-8;q=a+(o+-8)|0;do if(!(e&1)){b=k[b>>2]|0;if(!c)return;i=-8-b|0;l=a+i|0;m=b+o|0;if(l>>>0<h>>>0)Ob();if((l|0)==(k[15481]|0)){b=a+(o+-4)|0;e=k[b>>2]|0;if((e&3|0)!=3){u=l;f=m;break}k[15478]=m;k[b>>2]=e&-2;k[a+(i+4)>>2]=m|1;k[q>>2]=m;return}d=b>>>3;if(b>>>0<256){c=k[a+(i+8)>>2]|0;e=k[a+(i+12)>>2]|0;b=61944+(d<<1<<2)|0;if((c|0)!=(b|0)){if(c>>>0<h>>>0)Ob();if((k[c+12>>2]|0)!=(l|0))Ob()}if((e|0)==(c|0)){k[15476]=k[15476]&~(1<<d);u=l;f=m;break}if((e|0)!=(b|0)){if(e>>>0<h>>>0)Ob();b=e+8|0;if((k[b>>2]|0)==(l|0))g=b;else Ob()}else g=e+8|0;k[c+12>>2]=e;k[g>>2]=c;u=l;f=m;break}g=k[a+(i+24)>>2]|0;c=k[a+(i+12)>>2]|0;do if((c|0)==(l|0)){e=a+(i+20)|0;b=k[e>>2]|0;if(!b){e=a+(i+16)|0;b=k[e>>2]|0;if(!b){j=0;break}}while(1){c=b+20|0;d=k[c>>2]|0;if(d){b=d;e=c;continue}c=b+16|0;d=k[c>>2]|0;if(!d)break;else{b=d;e=c}}if(e>>>0<h>>>0)Ob();else{k[e>>2]=0;j=b;break}}else{d=k[a+(i+8)>>2]|0;if(d>>>0<h>>>0)Ob();b=d+12|0;if((k[b>>2]|0)!=(l|0))Ob();e=c+8|0;if((k[e>>2]|0)==(l|0)){k[b>>2]=c;k[e>>2]=d;j=c;break}else Ob()}while(0);if(g){b=k[a+(i+28)>>2]|0;e=62208+(b<<2)|0;if((l|0)==(k[e>>2]|0)){k[e>>2]=j;if(!j){k[15477]=k[15477]&~(1<<b);u=l;f=m;break}}else{if(g>>>0<(k[15480]|0)>>>0)Ob();b=g+16|0;if((k[b>>2]|0)==(l|0))k[b>>2]=j;else k[g+20>>2]=j;if(!j){u=l;f=m;break}}e=k[15480]|0;if(j>>>0<e>>>0)Ob();k[j+24>>2]=g;b=k[a+(i+16)>>2]|0;do if(b)if(b>>>0<e>>>0)Ob();else{k[j+16>>2]=b;k[b+24>>2]=j;break}while(0);b=k[a+(i+20)>>2]|0;if(b)if(b>>>0<(k[15480]|0)>>>0)Ob();else{k[j+20>>2]=b;k[b+24>>2]=j;u=l;f=m;break}else{u=l;f=m}}else{u=l;f=m}}else{u=b;f=o}while(0);if(u>>>0>=q>>>0)Ob();b=a+(o+-4)|0;e=k[b>>2]|0;if(!(e&1))Ob();if(!(e&2)){if((q|0)==(k[15482]|0)){t=(k[15479]|0)+f|0;k[15479]=t;k[15482]=u;k[u+4>>2]=t|1;if((u|0)!=(k[15481]|0))return;k[15481]=0;k[15478]=0;return}if((q|0)==(k[15481]|0)){t=(k[15478]|0)+f|0;k[15478]=t;k[15481]=u;k[u+4>>2]=t|1;k[u+t>>2]=t;return}f=(e&-8)+f|0;d=e>>>3;do if(e>>>0>=256){g=k[a+(o+16)>>2]|0;b=k[a+(o|4)>>2]|0;do if((b|0)==(q|0)){e=a+(o+12)|0;b=k[e>>2]|0;if(!b){e=a+(o+8)|0;b=k[e>>2]|0;if(!b){p=0;break}}while(1){c=b+20|0;d=k[c>>2]|0;if(d){b=d;e=c;continue}c=b+16|0;d=k[c>>2]|0;if(!d)break;else{b=d;e=c}}if(e>>>0<(k[15480]|0)>>>0)Ob();else{k[e>>2]=0;p=b;break}}else{e=k[a+o>>2]|0;if(e>>>0<(k[15480]|0)>>>0)Ob();c=e+12|0;if((k[c>>2]|0)!=(q|0))Ob();d=b+8|0;if((k[d>>2]|0)==(q|0)){k[c>>2]=b;k[d>>2]=e;p=b;break}else Ob()}while(0);if(g){b=k[a+(o+20)>>2]|0;e=62208+(b<<2)|0;if((q|0)==(k[e>>2]|0)){k[e>>2]=p;if(!p){k[15477]=k[15477]&~(1<<b);break}}else{if(g>>>0<(k[15480]|0)>>>0)Ob();b=g+16|0;if((k[b>>2]|0)==(q|0))k[b>>2]=p;else k[g+20>>2]=p;if(!p)break}e=k[15480]|0;if(p>>>0<e>>>0)Ob();k[p+24>>2]=g;b=k[a+(o+8)>>2]|0;do if(b)if(b>>>0<e>>>0)Ob();else{k[p+16>>2]=b;k[b+24>>2]=p;break}while(0);b=k[a+(o+12)>>2]|0;if(b)if(b>>>0<(k[15480]|0)>>>0)Ob();else{k[p+20>>2]=b;k[b+24>>2]=p;break}}}else{c=k[a+o>>2]|0;e=k[a+(o|4)>>2]|0;b=61944+(d<<1<<2)|0;if((c|0)!=(b|0)){if(c>>>0<(k[15480]|0)>>>0)Ob();if((k[c+12>>2]|0)!=(q|0))Ob()}if((e|0)==(c|0)){k[15476]=k[15476]&~(1<<d);break}if((e|0)!=(b|0)){if(e>>>0<(k[15480]|0)>>>0)Ob();b=e+8|0;if((k[b>>2]|0)==(q|0))n=b;else Ob()}else n=e+8|0;k[c+12>>2]=e;k[n>>2]=c}while(0);k[u+4>>2]=f|1;k[u+f>>2]=f;if((u|0)==(k[15481]|0)){k[15478]=f;return}}else{k[b>>2]=e&-2;k[u+4>>2]=f|1;k[u+f>>2]=f}b=f>>>3;if(f>>>0<256){c=b<<1;e=61944+(c<<2)|0;d=k[15476]|0;b=1<<b;if(d&b){b=61944+(c+2<<2)|0;c=k[b>>2]|0;if(c>>>0<(k[15480]|0)>>>0)Ob();else{r=b;s=c}}else{k[15476]=d|b;r=61944+(c+2<<2)|0;s=e}k[r>>2]=u;k[s+12>>2]=u;k[u+8>>2]=s;k[u+12>>2]=e;return}b=f>>>8;if(b)if(f>>>0>16777215)e=31;else{r=(b+1048320|0)>>>16&8;s=b<<r;q=(s+520192|0)>>>16&4;s=s<<q;e=(s+245760|0)>>>16&2;e=14-(q|r|e)+(s<<e>>>15)|0;e=f>>>(e+7|0)&1|e<<1}else e=0;b=62208+(e<<2)|0;k[u+28>>2]=e;k[u+20>>2]=0;k[u+16>>2]=0;c=k[15477]|0;d=1<<e;a:do if(c&d){b=k[b>>2]|0;if((e|0)==31)c=0;else c=25-(e>>>1)|0;b:do if((k[b+4>>2]&-8|0)!=(f|0)){e=f<<c;while(1){c=b+(e>>>31<<2)+16|0;d=k[c>>2]|0;if(!d)break;if((k[d+4>>2]&-8|0)==(f|0)){t=d;break b}else{e=e<<1;b=d}}if(c>>>0<(k[15480]|0)>>>0)Ob();else{k[c>>2]=u;k[u+24>>2]=b;k[u+12>>2]=u;k[u+8>>2]=u;break a}}else t=b;while(0);b=t+8|0;c=k[b>>2]|0;s=k[15480]|0;if(t>>>0>=s>>>0&c>>>0>=s>>>0){k[c+12>>2]=u;k[b>>2]=u;k[u+8>>2]=c;k[u+12>>2]=t;k[u+24>>2]=0;break}else Ob()}else{k[15477]=c|d;k[b>>2]=u;k[u+24>>2]=b;k[u+12>>2]=u;k[u+8>>2]=u}while(0);u=(k[15484]|0)+-1|0;k[15484]=u;if(!u)b=62360|0;else return;while(1){b=k[b>>2]|0;if(!b)break;else b=b+8|0}k[15484]=-1;return}function zm(a,b){a=a|0;b=b|0;var c=0,d=0;if(!a){a=xm(b)|0;return a|0}if(b>>>0>4294967231){a=ac()|0;k[a>>2]=12;a=0;return a|0}if(b>>>0<11)c=16;else c=b+11&-8;c=Pm(a+-8|0,c)|0;if(c){a=c+8|0;return a|0}c=xm(b)|0;if(!c){a=0;return a|0}d=k[a+-4>>2]|0;d=(d&-8)-((d&3|0)==0?8:4)|0;_m(c|0,a|0,(d>>>0<b>>>0?d:b)|0)|0;ym(a);a=c;return a|0}function Am(a){a=a|0;return (a+-65|0)>>>0<26|0}function Bm(a){a=a|0;if((a+-48|0)>>>0<10){a=1;a=a&1;return a|0}a=((a|32)+-97|0)>>>0<6;a=a&1;return a|0}function Cm(a,b){a=+a;b=b|0;var c=0,d=0,e=0;p[t>>3]=a;c=k[t>>2]|0;d=k[t+4>>2]|0;e=Xm(c|0,d|0,52)|0;e=e&2047;if(!e){if(a!=0.0){a=+Cm(a*18446744073709552.0e3,b);c=(k[b>>2]|0)+-64|0}else c=0;k[b>>2]=c;return +a}else if((e|0)==2047)return +a;else{k[b>>2]=e+-1022;k[t>>2]=c;k[t+4>>2]=d&-2146435073|1071644672;a=+p[t>>3];return +a}return 0.0}function Dm(a,b){a=+a;b=b|0;return +(+Cm(a,b))}function Em(a,b){a=a|0;b=b|0;if(!a)a=0;else a=Fm(a,b,0)|0;return a|0}function Fm(a,b,c){a=a|0;b=b|0;c=c|0;if(!a){b=1;return b|0}if(b>>>0<128){i[a>>0]=b;b=1;return b|0}if(b>>>0<2048){i[a>>0]=b>>>6|192;i[a+1>>0]=b&63|128;b=2;return b|0}if(b>>>0<55296|(b&-8192|0)==57344){i[a>>0]=b>>>12|224;i[a+1>>0]=b>>>6&63|128;i[a+2>>0]=b&63|128;b=3;return b|0}if((b+-65536|0)>>>0<1048576){i[a>>0]=b>>>18|240;i[a+1>>0]=b>>>12&63|128;i[a+2>>0]=b>>>6&63|128;i[a+3>>0]=b&63|128;b=4;return b|0}else{b=ac()|0;k[b>>2]=84;b=-1;return b|0}return 0}function Gm(a){a=a|0;var b=0,c=0;b=a+74|0;c=i[b>>0]|0;i[b>>0]=c+255|c;b=k[a>>2]|0;if(!(b&8)){k[a+8>>2]=0;k[a+4>>2]=0;c=k[a+44>>2]|0;k[a+28>>2]=c;k[a+20>>2]=c;k[a+16>>2]=c+(k[a+48>>2]|0);c=0;return c|0}else{k[a>>2]=b|32;c=-1;return c|0}return 0}function Hm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;d=c+16|0;e=k[d>>2]|0;do if(!e)if(!(Gm(c)|0)){e=k[d>>2]|0;break}else{g=0;return g|0}while(0);g=c+20|0;f=k[g>>2]|0;if((e-f|0)>>>0<b>>>0){g=kc[k[c+36>>2]&31](c,a,b)|0;return g|0}a:do if((i[c+75>>0]|0)>-1){d=b;while(1){if(!d){e=f;d=0;break a}e=d+-1|0;if((i[a+e>>0]|0)==10)break;else d=e}if((kc[k[c+36>>2]&31](c,a,d)|0)>>>0<d>>>0){g=d;return g|0}else{b=b-d|0;a=a+d|0;e=k[g>>2]|0;break}}else{e=f;d=0}while(0);_m(e|0,a|0,b|0)|0;k[g>>2]=(k[g>>2]|0)+b;g=d+b|0;return g|0}function Im(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=r;r=r+16|0;f=e;k[f>>2]=d;a=Km(a,b,c,f)|0;r=e;return a|0}function Jm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0;o=r;r=r+224|0;j=o+120|0;n=o+80|0;m=o;l=o+136|0;d=n+0|0;e=d+40|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));k[j>>2]=k[c>>2];if((Rm(0,b,j,m,n)|0)<0){a=-1;r=o;return a|0}e=a+48|0;if(!(k[e>>2]|0)){f=a+44|0;g=k[f>>2]|0;k[f>>2]=l;h=a+28|0;k[h>>2]=l;i=a+20|0;k[i>>2]=l;k[e>>2]=80;d=a+16|0;k[d>>2]=l+80;c=Rm(a,b,j,m,n)|0;if(g){kc[k[a+36>>2]&31](a,0,0)|0;c=(k[i>>2]|0)==0?-1:c;k[f>>2]=g;k[e>>2]=0;k[d>>2]=0;k[h>>2]=0;k[i>>2]=0}}else c=Rm(a,b,j,m,n)|0;a=c;r=o;return a|0}function Km(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0;l=r;r=r+128|0;e=l+112|0;j=l;f=j+0|0;g=62968|0;h=f+112|0;do{k[f>>2]=k[g>>2];f=f+4|0;g=g+4|0}while((f|0)<(h|0));if((b+-1|0)>>>0>2147483646)if(!b){a=e;b=1}else{d=ac()|0;k[d>>2]=75;d=-1;r=l;return d|0}g=-2-a|0;g=b>>>0>g>>>0?g:b;k[j+48>>2]=g;e=j+20|0;k[e>>2]=a;k[j+44>>2]=a;b=a+g|0;a=j+16|0;k[a>>2]=b;k[j+28>>2]=b;b=Jm(j,c,d)|0;if(!g){d=b;r=l;return d|0}d=k[e>>2]|0;i[d+(((d|0)==(k[a>>2]|0))<<31>>31)>>0]=0;d=b;r=l;return d|0}function Lm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;f=b&255;d=(c|0)!=0;a:do if((a&3|0)!=0&d){e=b&255;while(1){if((i[a>>0]|0)==e<<24>>24){e=6;break a}a=a+1|0;c=c+-1|0;d=(c|0)!=0;if(!((a&3|0)!=0&d)){e=5;break}}}else e=5;while(0);if((e|0)==5)if(d)e=6;else c=0;b:do if((e|0)==6){e=b&255;if((i[a>>0]|0)!=e<<24>>24){d=ka(f,16843009)|0;c:do if(c>>>0>3)do{f=k[a>>2]^d;if((f&-2139062144^-2139062144)&f+-16843009)break c;a=a+4|0;c=c+-4|0}while(c>>>0>3);while(0);if(!c)c=0;else while(1){if((i[a>>0]|0)==e<<24>>24)break b;a=a+1|0;c=c+-1|0;if(!c){c=0;break}}}}while(0);return ((c|0)!=0?a:0)|0}function Mm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;if(!c){f=0;return f|0}else{e=c;d=a}while(1){a=i[d>>0]|0;c=i[b>>0]|0;if(a<<24>>24!=c<<24>>24)break;e=e+-1|0;if(!e){c=0;f=5;break}else{d=d+1|0;b=b+1|0}}if((f|0)==5)return c|0;f=(a&255)-(c&255)|0;return f|0}function Nm(a,b){a=a|0;b=b|0;var c=0,d=0;d=i[a>>0]|0;c=i[b>>0]|0;if(d<<24>>24==0?1:d<<24>>24!=c<<24>>24)b=d;else{do{a=a+1|0;b=b+1|0;d=i[a>>0]|0;c=i[b>>0]|0}while(!(d<<24>>24==0?1:d<<24>>24!=c<<24>>24));b=d}return (b&255)-(c&255)|0}function Om(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;if(!c){d=0;return d|0}d=i[a>>0]|0;a:do if(!(d<<24>>24))d=0;else while(1){c=c+-1|0;e=i[b>>0]|0;if(!(e<<24>>24!=0&(c|0)!=0&d<<24>>24==e<<24>>24))break a;a=a+1|0;b=b+1|0;d=i[a>>0]|0;if(!(d<<24>>24)){d=0;break}}while(0);e=(d&255)-(l[b>>0]|0)|0;return e|0}function Pm(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0;o=a+4|0;p=k[o>>2]|0;i=p&-8;l=a+i|0;h=k[15480]|0;c=p&3;if(!((c|0)!=1&a>>>0>=h>>>0&a>>>0<l>>>0))Ob();d=a+(i|4)|0;f=k[d>>2]|0;if(!(f&1))Ob();if(!c){if(b>>>0<256){a=0;return a|0}if(i>>>0>=(b+4|0)>>>0?(i-b|0)>>>0<=k[15596]<<1>>>0:0)return a|0;a=0;return a|0}if(i>>>0>=b>>>0){c=i-b|0;if(c>>>0<=15)return a|0;k[o>>2]=p&1|b|2;k[a+(b+4)>>2]=c|3;k[d>>2]=k[d>>2]|1;Qm(a+b|0,c);return a|0}if((l|0)==(k[15482]|0)){c=(k[15479]|0)+i|0;if(c>>>0<=b>>>0){a=0;return a|0}n=c-b|0;k[o>>2]=p&1|b|2;k[a+(b+4)>>2]=n|1;k[15482]=a+b;k[15479]=n;return a|0}if((l|0)==(k[15481]|0)){d=(k[15478]|0)+i|0;if(d>>>0<b>>>0){a=0;return a|0}c=d-b|0;if(c>>>0>15){k[o>>2]=p&1|b|2;k[a+(b+4)>>2]=c|1;k[a+d>>2]=c;d=a+(d+4)|0;k[d>>2]=k[d>>2]&-2;d=a+b|0}else{k[o>>2]=p&1|d|2;d=a+(d+4)|0;k[d>>2]=k[d>>2]|1;d=0;c=0}k[15478]=c;k[15481]=d;return a|0}if(f&2){a=0;return a|0}m=(f&-8)+i|0;if(m>>>0<b>>>0){a=0;return a|0}n=m-b|0;e=f>>>3;do if(f>>>0>=256){g=k[a+(i+24)>>2]|0;f=k[a+(i+12)>>2]|0;do if((f|0)==(l|0)){d=a+(i+20)|0;c=k[d>>2]|0;if(!c){d=a+(i+16)|0;c=k[d>>2]|0;if(!c){j=0;break}}while(1){e=c+20|0;f=k[e>>2]|0;if(f){c=f;d=e;continue}f=c+16|0;e=k[f>>2]|0;if(!e)break;else{c=e;d=f}}if(d>>>0<h>>>0)Ob();else{k[d>>2]=0;j=c;break}}else{e=k[a+(i+8)>>2]|0;if(e>>>0<h>>>0)Ob();c=e+12|0;if((k[c>>2]|0)!=(l|0))Ob();d=f+8|0;if((k[d>>2]|0)==(l|0)){k[c>>2]=f;k[d>>2]=e;j=f;break}else Ob()}while(0);if(g){c=k[a+(i+28)>>2]|0;d=62208+(c<<2)|0;if((l|0)==(k[d>>2]|0)){k[d>>2]=j;if(!j){k[15477]=k[15477]&~(1<<c);break}}else{if(g>>>0<(k[15480]|0)>>>0)Ob();c=g+16|0;if((k[c>>2]|0)==(l|0))k[c>>2]=j;else k[g+20>>2]=j;if(!j)break}d=k[15480]|0;if(j>>>0<d>>>0)Ob();k[j+24>>2]=g;c=k[a+(i+16)>>2]|0;do if(c)if(c>>>0<d>>>0)Ob();else{k[j+16>>2]=c;k[c+24>>2]=j;break}while(0);c=k[a+(i+20)>>2]|0;if(c)if(c>>>0<(k[15480]|0)>>>0)Ob();else{k[j+20>>2]=c;k[c+24>>2]=j;break}}}else{f=k[a+(i+8)>>2]|0;d=k[a+(i+12)>>2]|0;c=61944+(e<<1<<2)|0;if((f|0)!=(c|0)){if(f>>>0<h>>>0)Ob();if((k[f+12>>2]|0)!=(l|0))Ob()}if((d|0)==(f|0)){k[15476]=k[15476]&~(1<<e);break}if((d|0)!=(c|0)){if(d>>>0<h>>>0)Ob();c=d+8|0;if((k[c>>2]|0)==(l|0))g=c;else Ob()}else g=d+8|0;k[f+12>>2]=d;k[g>>2]=f}while(0);if(n>>>0<16){k[o>>2]=m|p&1|2;b=a+(m|4)|0;k[b>>2]=k[b>>2]|1;return a|0}else{k[o>>2]=p&1|b|2;k[a+(b+4)>>2]=n|3;p=a+(m|4)|0;k[p>>2]=k[p>>2]|1;Qm(a+b|0,n);return a|0}return 0}function Qm(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;q=a+b|0;c=k[a+4>>2]|0;do if(!(c&1)){j=k[a>>2]|0;if(!(c&3))return;n=a+(0-j)|0;m=j+b|0;i=k[15480]|0;if(n>>>0<i>>>0)Ob();if((n|0)==(k[15481]|0)){f=a+(b+4)|0;c=k[f>>2]|0;if((c&3|0)!=3){t=n;g=m;break}k[15478]=m;k[f>>2]=c&-2;k[a+(4-j)>>2]=m|1;k[q>>2]=m;return}e=j>>>3;if(j>>>0<256){d=k[a+(8-j)>>2]|0;f=k[a+(12-j)>>2]|0;c=61944+(e<<1<<2)|0;if((d|0)!=(c|0)){if(d>>>0<i>>>0)Ob();if((k[d+12>>2]|0)!=(n|0))Ob()}if((f|0)==(d|0)){k[15476]=k[15476]&~(1<<e);t=n;g=m;break}if((f|0)!=(c|0)){if(f>>>0<i>>>0)Ob();c=f+8|0;if((k[c>>2]|0)==(n|0))h=c;else Ob()}else h=f+8|0;k[d+12>>2]=f;k[h>>2]=d;t=n;g=m;break}h=k[a+(24-j)>>2]|0;d=k[a+(12-j)>>2]|0;do if((d|0)==(n|0)){d=16-j|0;f=a+(d+4)|0;c=k[f>>2]|0;if(!c){f=a+d|0;c=k[f>>2]|0;if(!c){l=0;break}}while(1){d=c+20|0;e=k[d>>2]|0;if(e){c=e;f=d;continue}d=c+16|0;e=k[d>>2]|0;if(!e)break;else{c=e;f=d}}if(f>>>0<i>>>0)Ob();else{k[f>>2]=0;l=c;break}}else{e=k[a+(8-j)>>2]|0;if(e>>>0<i>>>0)Ob();c=e+12|0;if((k[c>>2]|0)!=(n|0))Ob();f=d+8|0;if((k[f>>2]|0)==(n|0)){k[c>>2]=d;k[f>>2]=e;l=d;break}else Ob()}while(0);if(h){c=k[a+(28-j)>>2]|0;f=62208+(c<<2)|0;if((n|0)==(k[f>>2]|0)){k[f>>2]=l;if(!l){k[15477]=k[15477]&~(1<<c);t=n;g=m;break}}else{if(h>>>0<(k[15480]|0)>>>0)Ob();c=h+16|0;if((k[c>>2]|0)==(n|0))k[c>>2]=l;else k[h+20>>2]=l;if(!l){t=n;g=m;break}}d=k[15480]|0;if(l>>>0<d>>>0)Ob();k[l+24>>2]=h;c=16-j|0;f=k[a+c>>2]|0;do if(f)if(f>>>0<d>>>0)Ob();else{k[l+16>>2]=f;k[f+24>>2]=l;break}while(0);c=k[a+(c+4)>>2]|0;if(c)if(c>>>0<(k[15480]|0)>>>0)Ob();else{k[l+20>>2]=c;k[c+24>>2]=l;t=n;g=m;break}else{t=n;g=m}}else{t=n;g=m}}else{t=a;g=b}while(0);i=k[15480]|0;if(q>>>0<i>>>0)Ob();c=a+(b+4)|0;f=k[c>>2]|0;if(!(f&2)){if((q|0)==(k[15482]|0)){s=(k[15479]|0)+g|0;k[15479]=s;k[15482]=t;k[t+4>>2]=s|1;if((t|0)!=(k[15481]|0))return;k[15481]=0;k[15478]=0;return}if((q|0)==(k[15481]|0)){s=(k[15478]|0)+g|0;k[15478]=s;k[15481]=t;k[t+4>>2]=s|1;k[t+s>>2]=s;return}g=(f&-8)+g|0;e=f>>>3;do if(f>>>0>=256){h=k[a+(b+24)>>2]|0;d=k[a+(b+12)>>2]|0;do if((d|0)==(q|0)){f=a+(b+20)|0;c=k[f>>2]|0;if(!c){f=a+(b+16)|0;c=k[f>>2]|0;if(!c){p=0;break}}while(1){d=c+20|0;e=k[d>>2]|0;if(e){c=e;f=d;continue}d=c+16|0;e=k[d>>2]|0;if(!e)break;else{c=e;f=d}}if(f>>>0<i>>>0)Ob();else{k[f>>2]=0;p=c;break}}else{e=k[a+(b+8)>>2]|0;if(e>>>0<i>>>0)Ob();c=e+12|0;if((k[c>>2]|0)!=(q|0))Ob();f=d+8|0;if((k[f>>2]|0)==(q|0)){k[c>>2]=d;k[f>>2]=e;p=d;break}else Ob()}while(0);if(h){c=k[a+(b+28)>>2]|0;f=62208+(c<<2)|0;if((q|0)==(k[f>>2]|0)){k[f>>2]=p;if(!p){k[15477]=k[15477]&~(1<<c);break}}else{if(h>>>0<(k[15480]|0)>>>0)Ob();c=h+16|0;if((k[c>>2]|0)==(q|0))k[c>>2]=p;else k[h+20>>2]=p;if(!p)break}f=k[15480]|0;if(p>>>0<f>>>0)Ob();k[p+24>>2]=h;c=k[a+(b+16)>>2]|0;do if(c)if(c>>>0<f>>>0)Ob();else{k[p+16>>2]=c;k[c+24>>2]=p;break}while(0);c=k[a+(b+20)>>2]|0;if(c)if(c>>>0<(k[15480]|0)>>>0)Ob();else{k[p+20>>2]=c;k[c+24>>2]=p;break}}}else{d=k[a+(b+8)>>2]|0;f=k[a+(b+12)>>2]|0;c=61944+(e<<1<<2)|0;if((d|0)!=(c|0)){if(d>>>0<i>>>0)Ob();if((k[d+12>>2]|0)!=(q|0))Ob()}if((f|0)==(d|0)){k[15476]=k[15476]&~(1<<e);break}if((f|0)!=(c|0)){if(f>>>0<i>>>0)Ob();c=f+8|0;if((k[c>>2]|0)==(q|0))o=c;else Ob()}else o=f+8|0;k[d+12>>2]=f;k[o>>2]=d}while(0);k[t+4>>2]=g|1;k[t+g>>2]=g;if((t|0)==(k[15481]|0)){k[15478]=g;return}}else{k[c>>2]=f&-2;k[t+4>>2]=g|1;k[t+g>>2]=g}c=g>>>3;if(g>>>0<256){f=c<<1;e=61944+(f<<2)|0;d=k[15476]|0;c=1<<c;if(d&c){c=61944+(f+2<<2)|0;d=k[c>>2]|0;if(d>>>0<(k[15480]|0)>>>0)Ob();else{r=c;s=d}}else{k[15476]=d|c;r=61944+(f+2<<2)|0;s=e}k[r>>2]=t;k[s+12>>2]=t;k[t+8>>2]=s;k[t+12>>2]=e;return}c=g>>>8;if(c)if(g>>>0>16777215)f=31;else{r=(c+1048320|0)>>>16&8;s=c<<r;q=(s+520192|0)>>>16&4;s=s<<q;f=(s+245760|0)>>>16&2;f=14-(q|r|f)+(s<<f>>>15)|0;f=g>>>(f+7|0)&1|f<<1}else f=0;c=62208+(f<<2)|0;k[t+28>>2]=f;k[t+20>>2]=0;k[t+16>>2]=0;d=k[15477]|0;e=1<<f;if(!(d&e)){k[15477]=d|e;k[c>>2]=t;k[t+24>>2]=c;k[t+12>>2]=t;k[t+8>>2]=t;return}c=k[c>>2]|0;if((f|0)==31)d=0;else d=25-(f>>>1)|0;a:do if((k[c+4>>2]&-8|0)!=(g|0)){f=g<<d;while(1){d=c+(f>>>31<<2)+16|0;e=k[d>>2]|0;if(!e)break;if((k[e+4>>2]&-8|0)==(g|0)){c=e;break a}else{f=f<<1;c=e}}if(d>>>0<(k[15480]|0)>>>0)Ob();k[d>>2]=t;k[t+24>>2]=c;k[t+12>>2]=t;k[t+8>>2]=t;return}while(0);d=c+8|0;e=k[d>>2]|0;s=k[15480]|0;if(!(c>>>0>=s>>>0&e>>>0>=s>>>0))Ob();k[e+12>>2]=t;k[d>>2]=t;k[t+8>>2]=e;k[t+12>>2]=c;k[t+24>>2]=0;return}function Rm(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,m=0,n=0,o=0.0,q=0,s=0,u=0,v=0,w=0,x=0.0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0;hb=r;r=r+864|0;Pa=hb+16|0;Sa=hb;Qa=hb+832|0;la=Qa;Ma=hb+816|0;Za=hb+520|0;Ia=hb+776|0;db=hb+8|0;Wa=hb+828|0;ma=(a|0)!=0;Da=Ia+40|0;Ha=Da;Ia=Ia+39|0;Ja=db+4|0;Ka=db;La=Ma+12|0;Ma=Ma+11|0;Na=La;na=Na-la|0;va=-2-la|0;wa=Na+2|0;xa=Pa+288|0;ya=Qa+9|0;za=ya;Aa=Qa+8|0;B=0;C=0;q=0;h=0;u=0;a:while(1){do if((q|0)>-1)if((h|0)>(2147483647-q|0)){$=ac()|0;k[$>>2]=75;$=-1;break}else{$=h+q|0;break}else $=q;while(0);h=i[b>>0]|0;if(!(h<<24>>24)){Ra=$;Va=u;N=351;break}else m=b;while(1){if(!(h<<24>>24)){ia=m;ea=m;break}else if(h<<24>>24==37){Ua=m;eb=m;N=9;break}L=m+1|0;h=i[L>>0]|0;m=L}b:do if((N|0)==9)while(1){N=0;if((i[Ua+1>>0]|0)!=37){ia=Ua;ea=eb;break b}m=eb+1|0;h=Ua+2|0;if((i[h>>0]|0)==37){Ua=h;eb=m}else{ia=h;ea=m;break}}while(0);h=ea-b|0;if(ma)Hm(b,h,a)|0;if((ea|0)!=(b|0)){q=$;b=ia;continue}q=ia+1|0;n=i[q>>0]|0;m=(n<<24>>24)+-48|0;if(m>>>0<10){L=(i[ia+2>>0]|0)==36;q=L?ia+3|0:q;n=i[q>>0]|0;A=L?m:-1;u=L?1:u}else A=-1;m=n<<24>>24;c:do if((m&-32|0)==32){s=0;do{if(!(1<<m+-32&75913))break c;s=1<<(n<<24>>24)+-32|s;q=q+1|0;n=i[q>>0]|0;m=n<<24>>24}while((m&-32|0)==32)}else s=0;while(0);do if(n<<24>>24==42){m=q+1|0;n=(i[m>>0]|0)+-48|0;if(n>>>0<10?(i[q+2>>0]|0)==36:0){k[e+(n<<2)>>2]=10;u=1;n=q+3|0;q=k[d+((i[m>>0]|0)+-48<<3)>>2]|0}else{if(u){fb=-1;N=369;break a}if(!ma){n=m;u=0;M=0;break}u=k[c>>2]|0;q=k[u>>2]|0;k[c>>2]=u+4;u=0;n=m}if((q|0)<0){s=s|8192;M=0-q|0}else M=q}else{m=(n<<24>>24)+-48|0;if(m>>>0<10){n=q;q=0;do{q=(q*10|0)+m|0;n=n+1|0;m=(i[n>>0]|0)+-48|0}while(m>>>0<10);if((q|0)<0){fb=-1;N=369;break a}else M=q}else{n=q;M=0}}while(0);d:do if((i[n>>0]|0)==46){m=n+1|0;q=i[m>>0]|0;if(q<<24>>24!=42){v=(q<<24>>24)+-48|0;if(v>>>0<10)q=0;else{n=m;D=0;break}while(1){q=(q*10|0)+v|0;n=n+2|0;v=(i[n>>0]|0)+-48|0;if(v>>>0>=10){D=q;break d}else{L=m;m=n;n=L}}}m=n+2|0;q=(i[m>>0]|0)+-48|0;if(q>>>0<10?(i[n+3>>0]|0)==36:0){k[e+(q<<2)>>2]=10;n=n+4|0;D=k[d+((i[m>>0]|0)+-48<<3)>>2]|0;break}if(u){fb=-1;N=369;break a}if(ma){n=k[c>>2]|0;D=k[n>>2]|0;k[c>>2]=n+4;n=m}else{n=m;D=0}}else D=-1;while(0);z=0;while(1){m=i[n>>0]|0;q=(m<<24>>24)+-65|0;if(q>>>0>57){fb=-1;N=369;break a}v=n+1|0;q=i[62400+(z*58|0)+q>>0]|0;w=q&255;if((w+-1|0)>>>0<8){n=v;z=w}else{L=v;y=q;v=w;w=z;break}}if(!(y<<24>>24)){fb=-1;N=369;break}q=(A|0)>-1;e:do if(y<<24>>24==19)if(q){fb=-1;N=369;break a}else{oa=B;pa=C;N=62}else{if(q){k[e+(A<<2)>>2]=v;pa=d+(A<<3)|0;oa=k[pa>>2]|0;pa=k[pa+4>>2]|0;N=62;break}if(!ma){fb=0;N=369;break a}if((y&255)>20){Ba=m;Ca=B;Ea=C}else do switch(v|0){case 18:{oa=k[c>>2]|0;k[t>>2]=k[oa>>2];k[t+4>>2]=k[oa+4>>2];x=+p[t>>3];k[c>>2]=oa+8;p[t>>3]=x;oa=k[t>>2]|0;pa=k[t+4>>2]|0;N=62;break e}case 17:{qa=k[c>>2]|0;k[t>>2]=k[qa>>2];k[t+4>>2]=k[qa+4>>2];x=+p[t>>3];k[c>>2]=qa+8;p[t>>3]=x;qa=k[t+4>>2]|0;ra=k[t>>2]|0;N=63;break e}case 9:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=C;N=63;break e}case 12:{N=k[c>>2]|0;qa=N;ra=k[qa>>2]|0;qa=k[qa+4>>2]|0;k[c>>2]=N+8;N=63;break e}case 13:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=(((ra&65535)<<16>>16|0)<0)<<31>>31;ra=ra<<16>>16;N=63;break e}case 15:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=(((ra&255)<<24>>24|0)<0)<<31>>31;ra=ra<<24>>24;N=63;break e}case 10:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=((ra|0)<0)<<31>>31;N=63;break e}case 11:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=0;N=63;break e}case 14:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=0;ra=ra&65535;N=63;break e}case 16:{qa=k[c>>2]|0;ra=k[qa>>2]|0;k[c>>2]=qa+4;qa=0;ra=ra&255;N=63;break e}default:{qa=C;ra=B;N=63;break e}}while(0)}while(0);if((N|0)==62){N=0;if(ma){qa=pa;ra=oa;N=63}else{B=oa;C=pa;q=$;b=L;continue}}if((N|0)==63){N=0;Ba=i[n>>0]|0;Ca=ra;Ea=qa}E=Ba<<24>>24;E=(w|0)!=0&(E&15|0)==3?E&-33:E;q=s&-65537;K=(s&8192|0)==0?s:q;f:do switch(E|0){case 105:case 100:{if((Ea|0)<0){Ga=Um(0,0,Ca|0,Ea|0)|0;Fa=O;_a=1;$a=62864;N=85;break f}if(!(K&2048)){$a=K&1;Fa=Ea;Ga=Ca;_a=$a;$a=($a|0)==0?62864:62866;N=85}else{Fa=Ea;Ga=Ca;_a=1;$a=62865;N=85}break}case 67:{k[db>>2]=Ca;k[Ja>>2]=0;sa=db;ta=Ka;Ya=-1;N=100;break}case 83:{b=Ca;if(!D){Z=Ca;_=b;Y=0;N=105}else{sa=b;ta=Ca;Ya=D;N=100}break}case 111:{m=(Ca|0)==0&(Ea|0)==0;if(m)f=Da;else{f=Da;b=Ca;h=Ea;do{f=f+-1|0;i[f>>0]=b&7|48;b=Xm(b|0,h|0,3)|0;h=O}while(!((b|0)==0&(h|0)==0))}S=(K&8|0)==0|m;T=Ca;U=Ea;P=K;Q=D;R=S&1^1;S=S?62864:62869;N=90;break}case 110:switch(w|0){case 4:{i[Ca>>0]=$;B=Ca;C=Ea;q=$;b=L;continue a}case 7:{B=Ca;k[B>>2]=$;k[B+4>>2]=(($|0)<0)<<31>>31;B=Ca;C=Ea;q=$;b=L;continue a}case 2:{B=Ca;k[B>>2]=$;k[B+4>>2]=(($|0)<0)<<31>>31;B=Ca;C=Ea;q=$;b=L;continue a}case 3:{j[Ca>>1]=$;B=Ca;C=Ea;q=$;b=L;continue a}case 6:{k[Ca>>2]=$;B=Ca;C=Ea;q=$;b=L;continue a}case 0:{k[Ca>>2]=$;B=Ca;C=Ea;q=$;b=L;continue a}case 1:{k[Ca>>2]=$;B=Ca;C=Ea;q=$;b=L;continue a}default:{B=Ca;C=Ea;q=$;b=L;continue a}}case 117:{Fa=Ea;Ga=Ca;_a=0;$a=62864;N=85;break}case 109:{Oa=ac()|0;Oa=fc(k[Oa>>2]|0)|0;N=95;break}case 88:case 120:{Ta=K;Xa=D;cb=E;N=74;break}case 99:{i[Ia>>0]=Ca;fa=Ca;ga=Ea;ha=Ia;g=q;ba=1;ca=0;da=62864;aa=Da;break}case 112:{Ta=K|8;Xa=D>>>0>8?D:8;cb=120;N=74;break}case 115:{Oa=(Ca|0)==0?62880:Ca;N=95;break}case 65:case 71:case 70:case 69:case 97:case 103:case 102:case 101:{k[t>>2]=Ca;k[t+4>>2]=Ea;o=+p[t>>3];k[Sa>>2]=0;if((Ea|0)>=0)if(!(K&2048)){I=K&1;s=I;I=(I|0)==0?62889:62894}else{s=1;I=62891}else{o=-o;s=1;I=62888}p[t>>3]=o;J=k[t+4>>2]&2146435072;if(!(J>>>0<2146435072|(J|0)==2146435072&0<0)){b=(E&32|0)!=0;if(o!=o|0.0!=0.0){s=0;q=b?62928:62936}else q=b?62912:62920;n=s+3|0;m=(M|0)>(n|0);if((K&8192|0)==0&m){b=M-n|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}Hm(I,s,a)|0;Hm(q,3,a)|0;if((K&73728|0)==8192&m){b=M-n|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}B=Ca;C=Ea;q=$;b=L;h=m?M:n;continue a}x=+Dm(o,Sa)*2.0;q=x!=0.0;if(q)k[Sa>>2]=(k[Sa>>2]|0)+-1;C=E|32;if((C|0)==97){n=E&32;A=(n|0)==0?I:I+9|0;z=s|2;b=D>>>0>11?0:12-D|0;do if(b){o=8.0;do{b=b+-1|0;o=o*16.0}while((b|0)!=0);if((i[A>>0]|0)==45){o=-(o+(-x-o));break}else{o=x+o-o;break}}else o=x;while(0);q=k[Sa>>2]|0;q=(q|0)<0?0-q|0:q;if((q|0)<0){b=La;s=q;h=((q|0)<0)<<31>>31;while(1){q=ln(s|0,h|0,10,0)|0;b=b+-1|0;i[b>>0]=q|48;q=kn(s|0,h|0,10,0)|0;if(h>>>0>9|(h|0)==9&s>>>0>4294967295){s=q;h=O}else break}}else b=La;if(q)while(1){b=b+-1|0;i[b>>0]=(q>>>0)%10|0|48;if(q>>>0<10)break;else q=(q>>>0)/10|0}if((b|0)==(La|0)){i[Ma>>0]=48;b=Ma}i[b+-1>>0]=(k[Sa>>2]>>31&2)+43;y=b+-2|0;i[y>>0]=E+15;if((D|0)<1)if(!(K&8)){b=Qa;do{J=~~o;q=b+1|0;i[b>>0]=l[62944+J>>0]|n;o=(o-+(J|0))*16.0;if((q-la|0)!=1|o==0.0)b=q;else{i[q>>0]=46;b=b+2|0}}while(o!=0.0)}else{b=Qa;do{J=~~o;q=b+1|0;i[b>>0]=l[62944+J>>0]|n;o=(o-+(J|0))*16.0;if((q-la|0)==1){i[q>>0]=46;b=b+2|0}else b=q}while(o!=0.0)}else{b=Qa;do{J=~~o;q=b+1|0;i[b>>0]=l[62944+J>>0]|n;o=(o-+(J|0))*16.0;if((q-la|0)==1){i[q>>0]=46;b=b+2|0}else b=q}while(o!=0.0)}h=y;if((D|0)!=0&(va+b|0)<(D|0))s=wa+D-h|0;else s=na-h+b|0;w=s+z|0;m=K&73728;v=(M|0)>(w|0);if((m|0)==0&v){q=M-w|0;Ym(Za|0,32,(q>>>0>256?256:q)|0)|0;if(q>>>0>255){h=q;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);q=q&255}Hm(Za,q,a)|0}Hm(A,z,a)|0;if((m|0)==65536&v){h=M-w|0;Ym(Za|0,48,(h>>>0>256?256:h)|0)|0;if(h>>>0>255){n=h;do{Hm(Za,256,a)|0;n=n+-256|0}while(n>>>0>255);h=h&255}Hm(Za,h,a)|0}b=b-la|0;Hm(Qa,b,a)|0;q=Na-y|0;b=s-q-b|0;if((b|0)>0){Ym(Za|0,48,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}Hm(y,q,a)|0;if((m|0)==8192&v){b=M-w|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}B=Ca;C=Ea;q=$;b=L;h=v?M:w;continue a}b=(D|0)<0?6:D;if(q){q=(k[Sa>>2]|0)+-28|0;k[Sa>>2]=q;o=x*268435456.0}else{o=x;q=k[Sa>>2]|0}J=(q|0)<0?Pa:xa;H=J;q=J;do{G=~~o>>>0;k[q>>2]=G;q=q+4|0;o=(o-+(G>>>0))*1.0e9}while(o!=0.0);n=q;q=k[Sa>>2]|0;if((q|0)>0){h=q;q=J;do{w=(h|0)>29?29:h;m=n+-4|0;do if(m>>>0>=q>>>0){v=n;h=0;while(1){G=$m(k[m>>2]|0,0,w|0)|0;G=Vm(G|0,O|0,h|0,0)|0;h=O;F=ln(G|0,h|0,1e9,0)|0;k[m>>2]=F;h=kn(G|0,h|0,1e9,0)|0;v=v+-8|0;if(v>>>0<q>>>0)break;else{G=m;m=v;v=G}}if(!h)break;q=q+-4|0;k[q>>2]=h}while(0);while(1){if(n>>>0<=q>>>0)break;h=n+-4|0;if(!(k[h>>2]|0))n=h;else break}h=(k[Sa>>2]|0)-w|0;k[Sa>>2]=h}while((h|0)>0)}else{h=q;q=J}g:do if((h|0)<0){A=((b+25|0)/9|0)+1|0;if((C|0)==102){z=J+(A<<2)|0;while(1){y=(h|0)<-9?9:0-h|0;do if(q>>>0<n>>>0){m=(1<<y)+-1|0;v=1e9>>>y;h=0;w=q;do{G=k[w>>2]|0;k[w>>2]=(G>>>y)+h;h=ka(G&m,v)|0;w=w+4|0}while(w>>>0<n>>>0);q=(k[q>>2]|0)==0?q+4|0:q;if(!h)break;k[n>>2]=h;n=n+4|0}else q=(k[q>>2]|0)==0?q+4|0:q;while(0);n=(n-H>>2|0)>(A|0)?z:n;h=(k[Sa>>2]|0)+y|0;k[Sa>>2]=h;if((h|0)>=0){A=n;break g}}}do{y=(h|0)<-9?9:0-h|0;do if(q>>>0<n>>>0){m=(1<<y)+-1|0;v=1e9>>>y;h=0;w=q;do{G=k[w>>2]|0;k[w>>2]=(G>>>y)+h;h=ka(G&m,v)|0;w=w+4|0}while(w>>>0<n>>>0);q=(k[q>>2]|0)==0?q+4|0:q;if(!h)break;k[n>>2]=h;n=n+4|0}else q=(k[q>>2]|0)==0?q+4|0:q;while(0);if((n-q>>2|0)>(A|0))n=q+(A<<2)|0;h=(k[Sa>>2]|0)+y|0;k[Sa>>2]=h}while((h|0)<0);A=n}else A=n;while(0);do if(q>>>0<A>>>0){h=(H-q>>2)*9|0;m=k[q>>2]|0;if(m>>>0<10){z=h;break}else n=10;do{n=n*10|0;h=h+1|0}while(m>>>0>=n>>>0);z=h}else z=0;while(0);B=(C|0)==103;h=b-((C|0)!=102?z:0)+((B&(b|0)!=0)<<31>>31)|0;if((h|0)<(((A-H>>2)*9|0)+-9|0)){m=h+9216|0;w=(m|0)/9|0;h=J+(w+-1023<<2)|0;m=((m|0)%9|0)+1|0;if((m|0)<9){n=10;do{n=n*10|0;m=m+1|0}while((m|0)!=9);y=n}else y=10;m=k[h>>2]|0;v=(m>>>0)%(y>>>0)|0;if((v|0)==0?(J+(w+-1022<<2)|0)==(A|0):0){X=q;W=h;V=z}else N=231;do if((N|0)==231){N=0;x=(((m>>>0)/(y>>>0)|0)&1|0)==0?9007199254740992.0:9007199254740994.0;n=(y|0)/2|0;do if(v>>>0<n>>>0)o=.5;else{if((v|0)==(n|0)?(J+(w+-1022<<2)|0)==(A|0):0){o=1.0;break}o=1.5}while(0);do if(s){if((i[I>>0]|0)!=45)break;x=-x;o=-o}while(0);n=m-v|0;k[h>>2]=n;if(!(x+o!=x)){X=q;W=h;V=z;break}W=n+y|0;k[h>>2]=W;if(W>>>0>999999999)while(1){n=h+-4|0;k[h>>2]=0;if(n>>>0<q>>>0){q=q+-4|0;k[q>>2]=0}W=(k[n>>2]|0)+1|0;k[n>>2]=W;if(W>>>0>999999999)h=n;else{h=n;break}}n=(H-q>>2)*9|0;v=k[q>>2]|0;if(v>>>0<10){X=q;W=h;V=n;break}else m=10;do{m=m*10|0;n=n+1|0}while(v>>>0>=m>>>0);X=q;W=h;V=n}while(0);h=W+4|0;q=X;z=V;h=A>>>0>h>>>0?h:A}else h=A;D=q;w=0-z|0;while(1){if(h>>>0<=q>>>0){C=0;G=h;break}n=h+-4|0;if(!(k[n>>2]|0))h=n;else{C=1;G=h;break}}do if(B){b=((b|0)==0&1)+b|0;if((b|0)>(z|0)&(z|0)>-5){v=E+-1|0;b=b+-1-z|0}else{v=E+-2|0;b=b+-1|0}if(K&8)break;do if(C){h=k[G+-4>>2]|0;if(!h){n=9;break}if(!((h>>>0)%10|0)){m=10;n=0}else{n=0;break}do{m=m*10|0;n=n+1|0}while(((h>>>0)%(m>>>0)|0|0)==0)}else n=9;while(0);h=((G-H>>2)*9|0)+-9|0;if((v|32|0)==102){F=h-n|0;F=(F|0)<0?0:F;b=(b|0)<(F|0)?b:F;break}else{F=h+z-n|0;F=(F|0)<0?0:F;b=(b|0)<(F|0)?b:F;break}}else v=E;while(0);B=(b|0)!=0;if(B)h=1;else h=(K&8|0)!=0;y=h&1;A=(v|32|0)==102;if(A){h=(z|0)>0?z:0;z=0}else{n=(z|0)<0?w:z;if((n|0)<0){h=La;w=n;m=((n|0)<0)<<31>>31;while(1){n=ln(w|0,m|0,10,0)|0;h=h+-1|0;i[h>>0]=n|48;n=kn(w|0,m|0,10,0)|0;if(m>>>0>9|(m|0)==9&w>>>0>4294967295){w=n;m=O}else break}}else h=La;if(n)while(1){h=h+-1|0;i[h>>0]=(n>>>0)%10|0|48;if(n>>>0<10)break;else n=(n>>>0)/10|0}if((Na-h|0)<2)do{h=h+-1|0;i[h>>0]=48}while((Na-h|0)<2);i[h+-1>>0]=(z>>31&2)+43;z=h+-2|0;i[z>>0]=v;h=Na-z|0}E=s+1+b+y+h|0;y=K&73728;F=(M|0)>(E|0);if((y|0)==0&F){h=M-E|0;Ym(Za|0,32,(h>>>0>256?256:h)|0)|0;if(h>>>0>255){n=h;do{Hm(Za,256,a)|0;n=n+-256|0}while(n>>>0>255);h=h&255}Hm(Za,h,a)|0}Hm(I,s,a)|0;if((y|0)==65536&F){h=M-E|0;Ym(Za|0,48,(h>>>0>256?256:h)|0)|0;if(h>>>0>255){s=h;do{Hm(Za,256,a)|0;s=s+-256|0}while(s>>>0>255);h=h&255}Hm(Za,h,a)|0}do if(A){m=q>>>0>J>>>0?J:q;q=~H;n=~D;n=q>>>0>n>>>0?q:n;q=3-n|0;v=J+1|0;v=(q>>>0>v>>>0?q:v)+n|0;n=~n;q=m;do{s=k[q>>2]|0;if(!s)h=ya;else{h=ya;while(1){h=h+-1|0;i[h>>0]=(s>>>0)%10|0|48;if(s>>>0<10)break;else s=(s>>>0)/10|0}}do if((q|0)==(m|0)){if((h|0)!=(ya|0))break;i[Aa>>0]=48;h=Aa}else{if(h>>>0<=Qa>>>0)break;do{h=h+-1|0;i[h>>0]=48}while(h>>>0>Qa>>>0)}while(0);Hm(h,za-h|0,a)|0;q=q+4|0}while(q>>>0<=J>>>0);if(!((K&8|0)==0&(B^1)))Hm(62960,1,a)|0;if(q>>>0<G>>>0&(b|0)>0){s=(v&-4)+n|0;n=q;while(1){q=k[n>>2]|0;if(q){h=ya;while(1){h=h+-1|0;i[h>>0]=(q>>>0)%10|0|48;if(q>>>0<10)break;else q=(q>>>0)/10|0}if(h>>>0>Qa>>>0){ab=h;N=300}else ja=h}else{ab=ya;N=300}if((N|0)==300)while(1){N=0;h=ab+-1|0;i[h>>0]=48;if(h>>>0>Qa>>>0)ab=h;else{ja=h;break}}Hm(ja,(b|0)>9?9:b,a)|0;q=s+8|0;b=b+-9|0;if(q>>>0<G>>>0&(b|0)>0){s=n;n=q}else break}}if((b|0)<=0)break;Ym(Za|0,48,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}else{w=C?G:q+4|0;do if((b|0)>-1){v=(K&8|0)==0;m=q;do{h=k[m>>2]|0;if(h){s=ya;n=h;while(1){h=s+-1|0;i[h>>0]=(n>>>0)%10|0|48;if(n>>>0<10)break;else{s=h;n=(n>>>0)/10|0}}if((h|0)!=(ya|0)){ua=s;bb=h}else N=312}else N=312;if((N|0)==312){N=0;i[Aa>>0]=48;ua=ya;bb=Aa}do if((m|0)==(q|0)){Hm(bb,1,a)|0;if((b|0)<1&v){h=ua;break}Hm(62960,1,a)|0;h=ua}else{if(bb>>>0>Qa>>>0)h=bb;else{h=bb;break}do{h=h+-1|0;i[h>>0]=48}while(h>>>0>Qa>>>0)}while(0);K=za-h|0;Hm(h,(b|0)>(K|0)?K:b,a)|0;b=b-K|0;m=m+4|0}while(m>>>0<w>>>0&(b|0)>-1);if((b|0)<=0)break;Ym(Za|0,48,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}while(0);Hm(z,Na-z|0,a)|0}while(0);if((y|0)==8192&F){b=M-E|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}B=Ca;C=Ea;q=$;b=L;h=F?M:E;continue a}default:{fa=Ca;ga=Ea;ha=b;g=K;ba=D;ca=0;da=62864;aa=Da}}while(0);do if((N|0)==74){f=cb&32;if(!((Ca|0)==0&(Ea|0)==0)){b=Da;h=Ca;m=Ea;do{b=b+-1|0;i[b>>0]=l[62944+(h&15)>>0]|f;h=Xm(h|0,m|0,4)|0;m=O}while(!((h|0)==0&(m|0)==0));if(!(Ta&8)){T=Ca;U=Ea;f=b;P=Ta;Q=Xa;R=0;S=62864;N=90}else{T=Ca;U=Ea;f=b;P=Ta;Q=Xa;R=2;S=62864+(cb>>4)|0;N=90}}else{T=Ca;U=Ea;f=Da;P=Ta;Q=Xa;R=0;S=62864;N=90}}else if((N|0)==85){if(Fa>>>0>0|(Fa|0)==0&Ga>>>0>4294967295){f=Da;h=Ga;m=Fa;while(1){b=ln(h|0,m|0,10,0)|0;f=f+-1|0;i[f>>0]=b|48;b=kn(h|0,m|0,10,0)|0;if(m>>>0>9|(m|0)==9&h>>>0>4294967295){h=b;m=O}else break}}else{f=Da;b=Ga}if(!b){T=Ga;U=Fa;P=K;Q=D;R=_a;S=$a;N=90}else while(1){f=f+-1|0;i[f>>0]=(b>>>0)%10|0|48;if(b>>>0<10){T=Ga;U=Fa;P=K;Q=D;R=_a;S=$a;N=90;break}else b=(b>>>0)/10|0}}else if((N|0)==95){N=0;b=Lm(Oa,0,D)|0;if(!b){fa=Ca;ga=Ea;ha=Oa;g=q;ba=D;ca=0;da=62864;aa=Oa+D|0;break}else{fa=Ca;ga=Ea;ha=Oa;g=q;ba=b-Oa|0;ca=0;da=62864;aa=b;break}}else if((N|0)==100){h=0;b=0;n=sa;while(1){m=k[n>>2]|0;if(!m)break;b=Em(Wa,m)|0;if((b|0)<0|b>>>0>(Ya-h|0)>>>0)break;h=b+h|0;if(Ya>>>0>h>>>0)n=n+4|0;else break}if((b|0)<0){fb=-1;N=369;break a}else{Z=ta;_=sa;Y=h;N=105}}while(0);if((N|0)==90){N=0;g=(Q|0)>-1?P&-65537:P;b=(T|0)!=0|(U|0)!=0;if(b|(Q|0)!=0){ba=(b&1^1)+(Ha-f)|0;fa=T;ga=U;ha=f;ba=(Q|0)>(ba|0)?Q:ba;ca=R;da=S;aa=Da}else{fa=T;ga=U;ha=Da;ba=0;ca=R;da=S;aa=Da}}else if((N|0)==105){N=0;q=K&73728;s=(M|0)>(Y|0);if((q|0)==0&s){b=M-Y|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}h:do if(Y){h=0;n=_;while(1){b=k[n>>2]|0;if(!b)break h;b=Em(Wa,b)|0;h=b+h|0;if((h|0)>(Y|0))break h;Hm(Wa,b,a)|0;if(h>>>0>=Y>>>0)break;else n=n+4|0}}while(0);if((q|0)==8192&s){b=M-Y|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}B=Z;C=Ea;q=$;b=L;h=s?M:Y;continue}m=aa-ha|0;q=(ba|0)<(m|0)?m:ba;v=ca+q|0;w=(M|0)<(v|0)?v:M;s=g&73728;n=(w|0)>(v|0);if((s|0)==0&n){b=w-v|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}Hm(da,ca,a)|0;if((s|0)==65536&n){b=w-v|0;Ym(Za|0,48,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}if((q|0)>(m|0)){b=q-m|0;Ym(Za|0,48,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0}Hm(ha,m,a)|0;if(!((s|0)==8192&n)){B=fa;C=ga;q=$;b=L;h=w;continue}b=w-v|0;Ym(Za|0,32,(b>>>0>256?256:b)|0)|0;if(b>>>0>255){h=b;do{Hm(Za,256,a)|0;h=h+-256|0}while(h>>>0>255);b=b&255}Hm(Za,b,a)|0;B=fa;C=ga;q=$;b=L;h=w}if((N|0)==351){if(a){e=Ra;r=hb;return e|0}if(!Va){e=0;r=hb;return e|0}else g=1;while(1){b=k[e+(g<<2)>>2]|0;if(!b){gb=g;break}f=d+(g<<3)|0;i:do if(b>>>0<=20)do switch(b|0){case 15:{eb=k[c>>2]|0;db=k[eb>>2]|0;k[c>>2]=eb+4;db=(db&255)<<24>>24;eb=f;k[eb>>2]=db;k[eb+4>>2]=((db|0)<0)<<31>>31;break i}case 10:{eb=k[c>>2]|0;db=k[eb>>2]|0;k[c>>2]=eb+4;eb=f;k[eb>>2]=db;k[eb+4>>2]=((db|0)<0)<<31>>31;break i}case 12:{eb=k[c>>2]|0;db=eb;bb=k[db>>2]|0;db=k[db+4>>2]|0;k[c>>2]=eb+8;eb=f;k[eb>>2]=bb;k[eb+4>>2]=db;break i}case 18:{eb=k[c>>2]|0;k[t>>2]=k[eb>>2];k[t+4>>2]=k[eb+4>>2];x=+p[t>>3];k[c>>2]=eb+8;p[f>>3]=x;break i}case 11:{eb=k[c>>2]|0;db=k[eb>>2]|0;k[c>>2]=eb+4;eb=f;k[eb>>2]=db;k[eb+4>>2]=0;break i}case 13:{eb=k[c>>2]|0;db=k[eb>>2]|0;k[c>>2]=eb+4;db=(db&65535)<<16>>16;eb=f;k[eb>>2]=db;k[eb+4>>2]=((db|0)<0)<<31>>31;break i}case 17:{eb=k[c>>2]|0;k[t>>2]=k[eb>>2];k[t+4>>2]=k[eb+4>>2];x=+p[t>>3];k[c>>2]=eb+8;p[f>>3]=x;break i}case 14:{eb=k[c>>2]|0;db=k[eb>>2]|0;k[c>>2]=eb+4;eb=f;k[eb>>2]=db&65535;k[eb+4>>2]=0;break i}case 9:{db=k[c>>2]|0;eb=k[db>>2]|0;k[c>>2]=db+4;k[f>>2]=eb;break i}case 16:{eb=k[c>>2]|0;db=k[eb>>2]|0;k[c>>2]=eb+4;eb=f;k[eb>>2]=db&255;k[eb+4>>2]=0;break i}default:break i}while(0);while(0);g=g+1|0;if((g|0)>=10){fb=1;N=369;break}}if((N|0)==369){r=hb;return fb|0}while(1){if(k[e+(gb<<2)>>2]|0){fb=-1;N=369;break}gb=gb+1|0;if((gb|0)>=10){fb=1;N=369;break}}if((N|0)==369){r=hb;return fb|0}}else if((N|0)==369){r=hb;return fb|0}return 0}function Sm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;d=a+20|0;e=k[d>>2]|0;a=(k[a+16>>2]|0)-e|0;a=a>>>0>c>>>0?c:a;_m(e|0,b|0,a|0)|0;k[d>>2]=(k[d>>2]|0)+a;return c|0}function Tm(){}function Um(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=b-d-(c>>>0>a>>>0|0)>>>0;return (O=d,a-c>>>0|0)|0}function Vm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;c=a+c>>>0;return (O=b+d+(c>>>0<a>>>0|0)>>>0,c|0)|0}function Wm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;while((d|0)<(c|0)){i[a+d>>0]=e?0:i[b+d>>0]|0;e=e?1:(i[b+d>>0]|0)==0;d=d+1|0}return a|0}function Xm(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){O=b>>>c;return a>>>c|(b&(1<<c)-1)<<32-c}O=0;return b>>>c-32|0}function Ym(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;d=a+c|0;if((c|0)>=20){b=b&255;f=a&3;g=b|b<<8|b<<16|b<<24;e=d&~3;if(f){f=a+4-f|0;while((a|0)<(f|0)){i[a>>0]=b;a=a+1|0}}while((a|0)<(e|0)){k[a>>2]=g;a=a+4|0}}while((a|0)<(d|0)){i[a>>0]=b;a=a+1|0}return a-c|0}function Zm(a){a=a|0;var b=0;b=a;while(i[b>>0]|0)b=b+1|0;return b-a|0}function _m(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if((c|0)>=4096)return Ia(a|0,b|0,c|0)|0;d=a|0;if((a&3)==(b&3)){while(a&3){if(!c)return d|0;i[a>>0]=i[b>>0]|0;a=a+1|0;b=b+1|0;c=c-1|0}while((c|0)>=4){k[a>>2]=k[b>>2];a=a+4|0;b=b+4|0;c=c-4|0}}while((c|0)>0){i[a>>0]=i[b>>0]|0;a=a+1|0;b=b+1|0;c=c-1|0}return d|0}function $m(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){O=b<<c|(a&(1<<c)-1<<32-c)>>>32-c;return a<<c}O=a<<c-32;return 0}function an(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;if((b|0)<(a|0)&(a|0)<(b+c|0)){d=a;b=b+c|0;a=a+c|0;while((c|0)>0){a=a-1|0;b=b-1|0;c=c-1|0;i[a>>0]=i[b>>0]|0}a=d}else _m(a,b,c)|0;return a|0}function bn(a){a=a|0;return (a&255)<<24|(a>>8&255)<<16|(a>>16&255)<<8|a>>>24|0}function cn(a,b){a=a|0;b=b|0;var c=0;do{i[a+c>>0]=i[b+c>>0];c=c+1|0}while(i[b+(c-1)>>0]|0);return a|0}function dn(a,b,c){a=a|0;b=b|0;c=c|0;if((c|0)<32){O=b>>c;return a>>>c|(b&(1<<c)-1)<<32-c}O=(b|0)<0?-1:0;return b>>c-32|0}function en(a){a=a|0;var b=0;b=i[v+(a&255)>>0]|0;if((b|0)<8)return b|0;b=i[v+(a>>8&255)>>0]|0;if((b|0)<8)return b+8|0;b=i[v+(a>>16&255)>>0]|0;if((b|0)<8)return b+16|0;return (i[v+(a>>>24)>>0]|0)+24|0}function fn(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;f=a&65535;e=b&65535;c=ka(e,f)|0;d=a>>>16;a=(c>>>16)+(ka(e,d)|0)|0;e=b>>>16;b=ka(e,f)|0;return (O=(a>>>16)+(ka(e,d)|0)+(((a&65535)+b|0)>>>16)|0,a+b<<16|c&65535|0)|0}function gn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0;j=b>>31|((b|0)<0?-1:0)<<1;i=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;f=d>>31|((d|0)<0?-1:0)<<1;e=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;h=Um(j^a,i^b,j,i)|0;g=O;a=f^j;b=e^i;c=Um((mn(h,g,Um(f^c,e^d,f,e)|0,O,0)|0)^a,O^b,a,b)|0;return c|0}function hn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0;e=r;r=r+8|0;h=e|0;g=b>>31|((b|0)<0?-1:0)<<1;f=((b|0)<0?-1:0)>>31|((b|0)<0?-1:0)<<1;j=d>>31|((d|0)<0?-1:0)<<1;i=((d|0)<0?-1:0)>>31|((d|0)<0?-1:0)<<1;a=Um(g^a,f^b,g,f)|0;b=O;mn(a,b,Um(j^c,i^d,j,i)|0,O,h)|0;c=Um(k[h>>2]^g,k[h+4>>2]^f,g,f)|0;d=O;r=e;return (O=d,c)|0}function jn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;e=a;f=c;c=fn(e,f)|0;a=O;return (O=(ka(b,f)|0)+(ka(d,e)|0)+a|a&0,c|0|0)|0}function kn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;c=mn(a,b,c,d,0)|0;return c|0}function ln(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0;f=r;r=r+8|0;e=f|0;mn(a,b,c,d,e)|0;r=f;return (O=k[e+4>>2]|0,k[e>>2]|0)|0}function mn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,l=0,m=0,n=0,o=0,p=0;n=a;m=b;l=m;h=c;o=d;g=o;if(!l){f=(e|0)!=0;if(!g){if(f){k[e>>2]=(n>>>0)%(h>>>0);k[e+4>>2]=0}o=0;e=(n>>>0)/(h>>>0)>>>0;return (O=o,e)|0}else{if(!f){o=0;e=0;return (O=o,e)|0}k[e>>2]=a|0;k[e+4>>2]=b&0;o=0;e=0;return (O=o,e)|0}}f=(g|0)==0;do if(h){if(!f){f=(ma(g|0)|0)-(ma(l|0)|0)|0;if(f>>>0<=31){b=f+1|0;g=31-f|0;j=f-31>>31;h=b;i=n>>>(b>>>0)&j|l<<g;j=l>>>(b>>>0)&j;f=0;g=n<<g;break}if(!e){o=0;e=0;return (O=o,e)|0}k[e>>2]=a|0;k[e+4>>2]=m|b&0;o=0;e=0;return (O=o,e)|0}f=h-1|0;if(f&h){g=(ma(h|0)|0)+33-(ma(l|0)|0)|0;p=64-g|0;b=32-g|0;a=b>>31;m=g-32|0;j=m>>31;h=g;i=b-1>>31&l>>>(m>>>0)|(l<<b|n>>>(g>>>0))&j;j=j&l>>>(g>>>0);f=n<<p&a;g=(l<<p|n>>>(m>>>0))&a|n<<b&g-33>>31;break}if(e){k[e>>2]=f&n;k[e+4>>2]=0}if((h|0)==1){e=m|b&0;p=a|0|0;return (O=e,p)|0}else{p=en(h|0)|0;e=l>>>(p>>>0)|0;p=l<<32-p|n>>>(p>>>0)|0;return (O=e,p)|0}}else{if(f){if(e){k[e>>2]=(l>>>0)%(h>>>0);k[e+4>>2]=0}e=0;p=(l>>>0)/(h>>>0)>>>0;return (O=e,p)|0}if(!n){if(e){k[e>>2]=0;k[e+4>>2]=(l>>>0)%(g>>>0)}e=0;p=(l>>>0)/(g>>>0)>>>0;return (O=e,p)|0}f=g-1|0;if(!(f&g)){if(e){k[e>>2]=a|0;k[e+4>>2]=f&l|b&0}e=0;p=l>>>((en(g|0)|0)>>>0);return (O=e,p)|0}f=(ma(g|0)|0)-(ma(l|0)|0)|0;if(f>>>0<=30){j=f+1|0;g=31-f|0;h=j;i=l<<g|n>>>(j>>>0);j=l>>>(j>>>0);f=0;g=n<<g;break}if(!e){e=0;p=0;return (O=e,p)|0}k[e>>2]=a|0;k[e+4>>2]=m|b&0;e=0;p=0;return (O=e,p)|0}while(0);if(!h){m=g;h=0;a=0}else{c=c|0|0;b=o|d&0;l=Vm(c,b,-1,-1)|0;m=O;a=0;do{n=g;g=f>>>31|g<<1;f=a|f<<1;n=i<<1|n>>>31|0;d=i>>>31|j<<1|0;Um(l,m,n,d)|0;p=O;o=p>>31|((p|0)<0?-1:0)<<1;a=o&1;i=Um(n,d,o&c,(((p|0)<0?-1:0)>>31|((p|0)<0?-1:0)<<1)&b)|0;j=O;h=h-1|0}while((h|0)!=0);m=g;h=0}g=0;if(e){k[e>>2]=i;k[e+4>>2]=j}e=(f|0)>>>31|(m|g)<<1|(g<<1|f>>>31)&0|h;p=(f<<1|0>>>31)&-2|a;return (O=e,p)|0}function nn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return kc[a&31](b|0,c|0,d|0)|0}function on(a,b,c){a=a|0;b=b|0;c=c|0;return pa(0,a|0,b|0,c|0)|0}function pn(a,b,c){a=a|0;b=b|0;c=c|0;return pa(1,a|0,b|0,c|0)|0}function qn(a,b,c){a=a|0;b=b|0;c=c|0;return pa(2,a|0,b|0,c|0)|0}function rn(a,b,c){a=a|0;b=b|0;c=c|0;return pa(3,a|0,b|0,c|0)|0}function sn(a,b,c){a=a|0;b=b|0;c=c|0;return pa(4,a|0,b|0,c|0)|0}function tn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;lc[a&15](b|0,c|0,d|0,e|0,f|0)}function un(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;pa(0,a|0,b|0,c|0,d|0,e|0)}function vn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;pa(1,a|0,b|0,c|0,d|0,e|0)}function wn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;pa(2,a|0,b|0,c|0,d|0,e|0)}function xn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;pa(3,a|0,b|0,c|0,d|0,e|0)}function yn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;pa(4,a|0,b|0,c|0,d|0,e|0)}function zn(a,b){a=a|0;b=b|0;mc[a&31](b|0)}function An(a){a=a|0;pa(0,a|0)}function Bn(a){a=a|0;pa(1,a|0)}function Cn(a){a=a|0;pa(2,a|0)}function Dn(a){a=a|0;pa(3,a|0)}function En(a){a=a|0;pa(4,a|0)}function Fn(a,b){a=a|0;b=b|0;return nc[a&15](b|0)|0}function Gn(a){a=a|0;return pa(0,a|0)|0}function Hn(a){a=a|0;return pa(1,a|0)|0}function In(a){a=a|0;return pa(2,a|0)|0}function Jn(a){a=a|0;return pa(3,a|0)|0}function Kn(a){a=a|0;return pa(4,a|0)|0}function Ln(a){a=a|0;oc[a&15]()}function Mn(){pa(0)}function Nn(){pa(1)}function On(){pa(2)}function Pn(){pa(3)}function Qn(){pa(4)}function Rn(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;return pc[a&15](b|0,c|0,d|0,e|0)|0}function Sn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return pa(0,a|0,b|0,c|0,d|0)|0}function Tn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return pa(1,a|0,b|0,c|0,d|0)|0}function Un(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return pa(2,a|0,b|0,c|0,d|0)|0}function Vn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return pa(3,a|0,b|0,c|0,d|0)|0}function Wn(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;return pa(4,a|0,b|0,c|0,d|0)|0}function Xn(a,b,c,d,e,f,g){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;qc[a&15](b|0,c|0,d|0,e|0,f|0,g|0)}function Yn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;pa(0,a|0,b|0,c|0,d|0,e|0,f|0)}function Zn(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;pa(1,a|0,b|0,c|0,d|0,e|0,f|0)}function _n(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;pa(2,a|0,b|0,c|0,d|0,e|0,f|0)}function $n(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;pa(3,a|0,b|0,c|0,d|0,e|0,f|0)}function ao(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;pa(4,a|0,b|0,c|0,d|0,e|0,f|0)}function bo(a,b,c){a=a|0;b=b|0;c=c|0;return rc[a&15](b|0,c|0)|0}function co(a,b){a=a|0;b=b|0;return pa(0,a|0,b|0)|0}function eo(a,b){a=a|0;b=b|0;return pa(1,a|0,b|0)|0}function fo(a,b){a=a|0;b=b|0;return pa(2,a|0,b|0)|0}function go(a,b){a=a|0;b=b|0;return pa(3,a|0,b|0)|0}function ho(a,b){a=a|0;b=b|0;return pa(4,a|0,b|0)|0}function io(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;sc[a&15](b|0,c|0,d|0,e|0)}function jo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;pa(0,a|0,b|0,c|0,d|0)}function ko(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;pa(1,a|0,b|0,c|0,d|0)}function lo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;pa(2,a|0,b|0,c|0,d|0)}function mo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;pa(3,a|0,b|0,c|0,d|0)}function no(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;pa(4,a|0,b|0,c|0,d|0)}function oo(a,b,c){a=a|0;b=b|0;c=c|0;na(0);return 0}function po(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;na(1)}function qo(a){a=a|0;na(2)}function ro(a){a=a|0;na(3);return 0}function so(){na(4)}function to(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;na(5);return 0}function uo(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;na(6)}function vo(a,b){a=a|0;b=b|0;na(7);return 0}function wo(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;na(8)}
function ng(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;if(d){e=b+0|0;d=c+0|0;c=e+64|0;do{i[e>>0]=i[d>>0]|0;e=e+1|0;d=d+1|0}while((e|0)<(c|0))}else b=c;z=k[a>>2]|0;h=a+4|0;B=k[h>>2]|0;f=a+8|0;D=k[f>>2]|0;d=a+12|0;F=k[d>>2]|0;c=a+16|0;o=k[c>>2]|0;v=bn(k[b>>2]|0)|0;k[b>>2]=v;v=(z<<5|z>>>27)+1518500249+o+v+((F^D)&B^F)|0;B=B<<30|B>>>2;o=b+4|0;q=bn(k[o>>2]|0)|0;k[o>>2]=q;q=F+1518500249+((B^D)&z^D)+q+(v<<5|v>>>27)|0;z=z<<30|z>>>2;F=b+8|0;u=bn(k[F>>2]|0)|0;k[F>>2]=u;u=D+1518500249+u+(v&(B^z)^B)+(q<<5|q>>>27)|0;v=v<<30|v>>>2;D=b+12|0;p=bn(k[D>>2]|0)|0;k[D>>2]=p;p=B+1518500249+p+(q&(v^z)^z)+(u<<5|u>>>27)|0;q=q<<30|q>>>2;B=b+16|0;g=bn(k[B>>2]|0)|0;k[B>>2]=g;g=z+1518500249+g+(u&(q^v)^v)+(p<<5|p>>>27)|0;u=u<<30|u>>>2;z=b+20|0;j=bn(k[z>>2]|0)|0;k[z>>2]=j;j=v+1518500249+j+(p&(u^q)^q)+(g<<5|g>>>27)|0;p=p<<30|p>>>2;v=b+24|0;r=bn(k[v>>2]|0)|0;k[v>>2]=r;r=q+1518500249+r+(g&(p^u)^u)+(j<<5|j>>>27)|0;g=g<<30|g>>>2;q=b+28|0;w=bn(k[q>>2]|0)|0;k[q>>2]=w;w=u+1518500249+w+(j&(g^p)^p)+(r<<5|r>>>27)|0;j=j<<30|j>>>2;u=b+32|0;s=bn(k[u>>2]|0)|0;k[u>>2]=s;s=p+1518500249+s+(r&(j^g)^g)+(w<<5|w>>>27)|0;r=r<<30|r>>>2;p=b+36|0;m=bn(k[p>>2]|0)|0;k[p>>2]=m;m=g+1518500249+m+(w&(r^j)^j)+(s<<5|s>>>27)|0;w=w<<30|w>>>2;g=b+40|0;e=bn(k[g>>2]|0)|0;k[g>>2]=e;e=j+1518500249+e+(s&(w^r)^r)+(m<<5|m>>>27)|0;s=s<<30|s>>>2;j=b+44|0;l=bn(k[j>>2]|0)|0;k[j>>2]=l;r=l+1518500249+r+(m&(s^w)^w)+(e<<5|e>>>27)|0;m=m<<30|m>>>2;l=b+48|0;x=bn(k[l>>2]|0)|0;k[l>>2]=x;w=x+1518500249+w+(e&(m^s)^s)+(r<<5|r>>>27)|0;e=e<<30|e>>>2;x=b+52|0;G=bn(k[x>>2]|0)|0;k[x>>2]=G;s=G+1518500249+s+(r&(e^m)^m)+(w<<5|w>>>27)|0;r=r<<30|r>>>2;t=b+56|0;E=bn(k[t>>2]|0)|0;k[t>>2]=E;m=E+1518500249+m+(w&(r^e)^e)+(s<<5|s>>>27)|0;w=w<<30|w>>>2;n=b+60|0;H=bn(k[n>>2]|0)|0;k[n>>2]=H;e=H+1518500249+e+(s&(w^r)^r)+(m<<5|m>>>27)|0;s=s<<30|s>>>2;C=k[F>>2]|0;G=k[u>>2]^G^C^k[b>>2];G=G<<1|G>>>31;k[b>>2]=G;r=G+1518500249+r+(m&(s^w)^w)+(e<<5|e>>>27)|0;m=m<<30|m>>>2;A=k[D>>2]|0;E=k[p>>2]^E^A^k[o>>2];E=E<<1|E>>>31;k[o>>2]=E;w=w+1518500249+E+(e&(m^s)^s)+(r<<5|r>>>27)|0;e=e<<30|e>>>2;y=k[B>>2]|0;C=k[g>>2]^H^y^C;C=C<<1|C>>>31;k[F>>2]=C;s=s+1518500249+C+(r&(e^m)^m)+(w<<5|w>>>27)|0;r=r<<30|r>>>2;H=k[z>>2]|0;A=k[j>>2]^G^H^A;A=A<<1|A>>>31;k[D>>2]=A;m=m+1518500249+A+(w&(r^e)^e)+(s<<5|s>>>27)|0;w=w<<30|w>>>2;G=k[v>>2]|0;y=k[l>>2]^E^G^y;y=y<<1|y>>>31;k[B>>2]=y;e=e+1859775393+y+(w^r^s)+(m<<5|m>>>27)|0;s=s<<30|s>>>2;E=k[q>>2]|0;H=k[x>>2]^C^E^H;H=H<<1|H>>>31;k[z>>2]=H;r=r+1859775393+H+(s^w^m)+(e<<5|e>>>27)|0;m=m<<30|m>>>2;C=k[u>>2]|0;G=k[t>>2]^A^C^G;G=G<<1|G>>>31;k[v>>2]=G;w=w+1859775393+G+(m^s^e)+(r<<5|r>>>27)|0;e=e<<30|e>>>2;A=k[p>>2]|0;E=k[n>>2]^y^A^E;E=E<<1|E>>>31;k[q>>2]=E;s=s+1859775393+E+(e^m^r)+(w<<5|w>>>27)|0;r=r<<30|r>>>2;y=k[g>>2]|0;C=k[b>>2]^H^y^C;C=C<<1|C>>>31;k[u>>2]=C;m=m+1859775393+C+(r^e^w)+(s<<5|s>>>27)|0;w=w<<30|w>>>2;H=k[j>>2]|0;A=k[o>>2]^G^H^A;A=A<<1|A>>>31;k[p>>2]=A;e=e+1859775393+(w^r^s)+A+(m<<5|m>>>27)|0;s=s<<30|s>>>2;G=k[l>>2]|0;y=k[F>>2]^E^G^y;y=y<<1|y>>>31;k[g>>2]=y;r=r+1859775393+(s^w^m)+y+(e<<5|e>>>27)|0;m=m<<30|m>>>2;E=k[x>>2]|0;H=k[D>>2]^C^E^H;H=H<<1|H>>>31;k[j>>2]=H;w=w+1859775393+(m^s^e)+H+(r<<5|r>>>27)|0;e=e<<30|e>>>2;C=k[t>>2]|0;G=k[B>>2]^A^C^G;G=G<<1|G>>>31;k[l>>2]=G;s=s+1859775393+(e^m^r)+G+(w<<5|w>>>27)|0;r=r<<30|r>>>2;A=k[n>>2]|0;E=k[z>>2]^y^A^E;E=E<<1|E>>>31;k[x>>2]=E;m=m+1859775393+(r^e^w)+E+(s<<5|s>>>27)|0;w=w<<30|w>>>2;y=k[b>>2]|0;C=k[v>>2]^H^y^C;C=C<<1|C>>>31;k[t>>2]=C;e=e+1859775393+(w^r^s)+C+(m<<5|m>>>27)|0;s=s<<30|s>>>2;H=k[o>>2]|0;A=k[q>>2]^G^H^A;A=A<<1|A>>>31;k[n>>2]=A;r=r+1859775393+(s^w^m)+A+(e<<5|e>>>27)|0;m=m<<30|m>>>2;G=k[F>>2]|0;y=k[u>>2]^E^G^y;y=y<<1|y>>>31;k[b>>2]=y;w=w+1859775393+(m^s^e)+y+(r<<5|r>>>27)|0;e=e<<30|e>>>2;E=k[D>>2]|0;H=k[p>>2]^C^E^H;H=H<<1|H>>>31;k[o>>2]=H;s=s+1859775393+(e^m^r)+H+(w<<5|w>>>27)|0;r=r<<30|r>>>2;C=k[B>>2]|0;G=k[g>>2]^A^C^G;G=G<<1|G>>>31;k[F>>2]=G;m=m+1859775393+(r^e^w)+G+(s<<5|s>>>27)|0;w=w<<30|w>>>2;A=k[z>>2]|0;E=k[j>>2]^y^A^E;E=E<<1|E>>>31;k[D>>2]=E;e=e+1859775393+(w^r^s)+E+(m<<5|m>>>27)|0;s=s<<30|s>>>2;y=k[v>>2]|0;C=k[l>>2]^H^y^C;C=C<<1|C>>>31;k[B>>2]=C;r=r+1859775393+(s^w^m)+C+(e<<5|e>>>27)|0;m=m<<30|m>>>2;H=k[q>>2]|0;A=k[x>>2]^G^H^A;A=A<<1|A>>>31;k[z>>2]=A;w=w+1859775393+(m^s^e)+A+(r<<5|r>>>27)|0;e=e<<30|e>>>2;G=k[u>>2]|0;y=k[t>>2]^E^G^y;y=y<<1|y>>>31;k[v>>2]=y;s=s+1859775393+(e^m^r)+y+(w<<5|w>>>27)|0;r=r<<30|r>>>2;E=k[p>>2]|0;H=k[n>>2]^C^E^H;H=H<<1|H>>>31;k[q>>2]=H;m=m+1859775393+(r^e^w)+H+(s<<5|s>>>27)|0;w=w<<30|w>>>2;C=k[g>>2]|0;G=k[b>>2]^A^C^G;G=G<<1|G>>>31;k[u>>2]=G;e=e+-1894007588+((s|w)&r|s&w)+G+(m<<5|m>>>27)|0;s=s<<30|s>>>2;A=k[j>>2]|0;E=k[o>>2]^y^A^E;E=E<<1|E>>>31;k[p>>2]=E;r=r+-1894007588+((m|s)&w|m&s)+E+(e<<5|e>>>27)|0;m=m<<30|m>>>2;y=k[l>>2]|0;C=k[F>>2]^H^y^C;C=C<<1|C>>>31;k[g>>2]=C;w=w+-1894007588+((e|m)&s|e&m)+C+(r<<5|r>>>27)|0;e=e<<30|e>>>2;H=k[x>>2]|0;A=k[D>>2]^G^H^A;A=A<<1|A>>>31;k[j>>2]=A;s=s+-1894007588+((r|e)&m|r&e)+A+(w<<5|w>>>27)|0;r=r<<30|r>>>2;G=k[t>>2]|0;y=k[B>>2]^E^G^y;y=y<<1|y>>>31;k[l>>2]=y;m=m+-1894007588+((w|r)&e|w&r)+y+(s<<5|s>>>27)|0;w=w<<30|w>>>2;E=k[n>>2]|0;H=k[z>>2]^C^E^H;H=H<<1|H>>>31;k[x>>2]=H;e=e+-1894007588+((s|w)&r|s&w)+H+(m<<5|m>>>27)|0;s=s<<30|s>>>2;C=k[b>>2]|0;G=k[v>>2]^A^C^G;G=G<<1|G>>>31;k[t>>2]=G;r=r+-1894007588+((m|s)&w|m&s)+G+(e<<5|e>>>27)|0;m=m<<30|m>>>2;A=k[o>>2]|0;E=k[q>>2]^y^A^E;E=E<<1|E>>>31;k[n>>2]=E;w=w+-1894007588+((e|m)&s|e&m)+E+(r<<5|r>>>27)|0;e=e<<30|e>>>2;y=k[F>>2]|0;C=k[u>>2]^H^y^C;C=C<<1|C>>>31;k[b>>2]=C;s=s+-1894007588+((r|e)&m|r&e)+C+(w<<5|w>>>27)|0;r=r<<30|r>>>2;H=k[D>>2]|0;A=k[p>>2]^G^H^A;A=A<<1|A>>>31;k[o>>2]=A;m=m+-1894007588+((w|r)&e|w&r)+A+(s<<5|s>>>27)|0;w=w<<30|w>>>2;G=k[B>>2]|0;y=k[g>>2]^E^G^y;y=y<<1|y>>>31;k[F>>2]=y;e=e+-1894007588+((s|w)&r|s&w)+y+(m<<5|m>>>27)|0;s=s<<30|s>>>2;E=k[z>>2]|0;H=k[j>>2]^C^E^H;H=H<<1|H>>>31;k[D>>2]=H;r=r+-1894007588+((m|s)&w|m&s)+H+(e<<5|e>>>27)|0;m=m<<30|m>>>2;C=k[v>>2]|0;G=k[l>>2]^A^C^G;G=G<<1|G>>>31;k[B>>2]=G;w=w+-1894007588+((e|m)&s|e&m)+G+(r<<5|r>>>27)|0;e=e<<30|e>>>2;A=k[q>>2]|0;E=k[x>>2]^y^A^E;E=E<<1|E>>>31;k[z>>2]=E;s=s+-1894007588+((r|e)&m|r&e)+E+(w<<5|w>>>27)|0;r=r<<30|r>>>2;y=k[u>>2]|0;C=k[t>>2]^H^y^C;C=C<<1|C>>>31;k[v>>2]=C;m=m+-1894007588+((w|r)&e|w&r)+C+(s<<5|s>>>27)|0;w=w<<30|w>>>2;H=k[p>>2]|0;A=k[n>>2]^G^H^A;A=A<<1|A>>>31;k[q>>2]=A;e=e+-1894007588+((s|w)&r|s&w)+A+(m<<5|m>>>27)|0;s=s<<30|s>>>2;G=k[g>>2]|0;y=k[b>>2]^E^G^y;y=y<<1|y>>>31;k[u>>2]=y;r=r+-1894007588+((m|s)&w|m&s)+y+(e<<5|e>>>27)|0;m=m<<30|m>>>2;E=k[j>>2]|0;H=k[o>>2]^C^E^H;H=H<<1|H>>>31;k[p>>2]=H;w=w+-1894007588+((e|m)&s|e&m)+H+(r<<5|r>>>27)|0;e=e<<30|e>>>2;C=k[l>>2]|0;G=k[F>>2]^A^C^G;G=G<<1|G>>>31;k[g>>2]=G;s=s+-1894007588+((r|e)&m|r&e)+G+(w<<5|w>>>27)|0;r=r<<30|r>>>2;A=k[x>>2]|0;E=k[D>>2]^y^A^E;E=E<<1|E>>>31;k[j>>2]=E;m=m+-1894007588+((w|r)&e|w&r)+E+(s<<5|s>>>27)|0;w=w<<30|w>>>2;y=k[t>>2]|0;C=k[B>>2]^H^y^C;C=C<<1|C>>>31;k[l>>2]=C;e=e+-899497514+(w^r^s)+C+(m<<5|m>>>27)|0;s=s<<30|s>>>2;H=k[n>>2]|0;A=k[z>>2]^G^H^A;A=A<<1|A>>>31;k[x>>2]=A;r=r+-899497514+(s^w^m)+A+(e<<5|e>>>27)|0;m=m<<30|m>>>2;G=k[b>>2]|0;y=k[v>>2]^E^G^y;y=y<<1|y>>>31;k[t>>2]=y;w=w+-899497514+(m^s^e)+y+(r<<5|r>>>27)|0;e=e<<30|e>>>2;E=k[o>>2]|0;H=k[q>>2]^C^E^H;H=H<<1|H>>>31;k[n>>2]=H;s=s+-899497514+(e^m^r)+H+(w<<5|w>>>27)|0;r=r<<30|r>>>2;C=k[F>>2]|0;G=k[u>>2]^A^C^G;G=G<<1|G>>>31;k[b>>2]=G;m=m+-899497514+(r^e^w)+G+(s<<5|s>>>27)|0;w=w<<30|w>>>2;A=k[D>>2]|0;E=k[p>>2]^y^A^E;E=E<<1|E>>>31;k[o>>2]=E;e=e+-899497514+(w^r^s)+E+(m<<5|m>>>27)|0;s=s<<30|s>>>2;y=k[B>>2]|0;C=k[g>>2]^H^y^C;C=C<<1|C>>>31;k[F>>2]=C;r=r+-899497514+(s^w^m)+C+(e<<5|e>>>27)|0;m=m<<30|m>>>2;H=k[z>>2]|0;A=k[j>>2]^G^H^A;A=A<<1|A>>>31;k[D>>2]=A;w=w+-899497514+(m^s^e)+A+(r<<5|r>>>27)|0;e=e<<30|e>>>2;G=k[v>>2]|0;y=k[l>>2]^E^G^y;y=y<<1|y>>>31;k[B>>2]=y;s=s+-899497514+(e^m^r)+y+(w<<5|w>>>27)|0;r=r<<30|r>>>2;E=k[q>>2]|0;H=k[x>>2]^C^E^H;H=H<<1|H>>>31;k[z>>2]=H;m=m+-899497514+(r^e^w)+H+(s<<5|s>>>27)|0;w=w<<30|w>>>2;C=k[u>>2]|0;G=k[t>>2]^A^C^G;G=G<<1|G>>>31;k[v>>2]=G;e=e+-899497514+(w^r^s)+G+(m<<5|m>>>27)|0;s=s<<30|s>>>2;A=k[p>>2]|0;E=k[n>>2]^y^A^E;E=E<<1|E>>>31;k[q>>2]=E;r=r+-899497514+(s^w^m)+E+(e<<5|e>>>27)|0;m=m<<30|m>>>2;y=k[g>>2]|0;C=k[b>>2]^H^y^C;C=C<<1|C>>>31;k[u>>2]=C;w=w+-899497514+(m^s^e)+C+(r<<5|r>>>27)|0;e=e<<30|e>>>2;u=k[j>>2]|0;A=k[o>>2]^G^u^A;A=A<<1|A>>>31;k[p>>2]=A;s=s+-899497514+(e^m^r)+A+(w<<5|w>>>27)|0;r=r<<30|r>>>2;p=k[l>>2]|0;y=k[F>>2]^E^p^y;y=y<<1|y>>>31;k[g>>2]=y;m=m+-899497514+(r^e^w)+y+(s<<5|s>>>27)|0;w=w<<30|w>>>2;g=k[x>>2]|0;u=k[D>>2]^C^g^u;u=u<<1|u>>>31;k[j>>2]=u;e=e+-899497514+(w^r^s)+u+(m<<5|m>>>27)|0;s=s<<30|s>>>2;j=k[t>>2]|0;p=k[B>>2]^A^j^p;p=p<<1|p>>>31;k[l>>2]=p;r=r+-899497514+(s^w^m)+p+(e<<5|e>>>27)|0;m=m<<30|m>>>2;l=k[n>>2]|0;g=k[z>>2]^y^l^g;g=g<<1|g>>>31;k[x>>2]=g;g=w+-899497514+(m^s^e)+g+(r<<5|r>>>27)|0;e=e<<30|e>>>2;j=k[v>>2]^u^k[b>>2]^j;j=j<<1|j>>>31;k[t>>2]=j;j=s+-899497514+(e^m^r)+j+(g<<5|g>>>27)|0;b=r<<30|r>>>2;l=k[q>>2]^p^k[o>>2]^l;l=l<<1|l>>>31;k[n>>2]=l;k[a>>2]=m+-899497514+(b^e^g)+(k[a>>2]|0)+l+(j<<5|j>>>27);k[h>>2]=(k[h>>2]|0)+j;k[f>>2]=(k[f>>2]|0)+(g<<30|g>>>2);k[d>>2]=(k[d>>2]|0)+b;k[c>>2]=(k[c>>2]|0)+e;return}function og(a){a=a|0;k[a>>2]=1732584193;k[a+4>>2]=-271733879;k[a+8>>2]=-1732584194;k[a+12>>2]=271733878;k[a+16>>2]=-1009589776;k[a+24>>2]=0;k[a+20>>2]=0;return}function pg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0;m=r;r=r+64|0;l=m;g=a+20|0;h=k[g>>2]|0;e=h>>>3&63;j=h+(c<<3)|0;k[g>>2]=j;g=a+24|0;f=k[g>>2]|0;if(j>>>0<h>>>0){f=f+1|0;k[g>>2]=f}k[a+24>>2]=f+(c>>>29);if((e+c|0)>>>0>63){f=64-e|0;_m(a+e+28|0,b|0,f|0)|0;j=a+92|0;ng(a,j,a+28|0,d);if((f+63|0)>>>0<c>>>0)if(d){e=f;while(1){f=l+0|0;g=b+e+0|0;h=f+64|0;do{i[f>>0]=i[g>>0]|0;f=f+1|0;g=g+1|0}while((f|0)<(h|0));ng(a,j,l,1);f=e+64|0;if((e+127|0)>>>0<c>>>0)e=f;else{e=0;break}}}else{d=f;while(1){e=b+d|0;f=l+0|0;g=e+0|0;h=f+64|0;do{i[f>>0]=i[g>>0]|0;f=f+1|0;g=g+1|0}while((f|0)<(h|0));ng(a,j,l,0);f=e+0|0;g=l+0|0;h=f+64|0;do{i[f>>0]=i[g>>0]|0;f=f+1|0;g=g+1|0}while((f|0)<(h|0));f=d+64|0;if((d+127|0)>>>0<c>>>0)d=f;else{e=0;break}}}else e=0}else f=0;if(f>>>0>=c>>>0){r=m;return}_m(a+e+28|0,b+f|0,c-f|0)|0;r=m;return}function qg(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0;j=r;r=r+32|0;g=j+4|0;h=j;f=j+16|0;e=j+8|0;d=k[a+24>>2]|0;i[f>>0]=d>>>24;i[f+1>>0]=d>>>16;i[f+2>>0]=d>>>8;i[f+3>>0]=d;d=a+20|0;l=k[d>>2]|0;i[f+4>>0]=l>>>24;i[f+5>>0]=l>>>16;i[f+6>>0]=l>>>8;i[f+7>>0]=l;k[g>>2]=8;i[e>>0]=-128;pg(a,e,1,c);if((k[d>>2]&504|0)!=448)do{i[e>>0]=0;pg(a,e,1,c)}while((k[d>>2]&504|0)!=448);pg(a,f,8,c);k[b>>2]=k[a>>2];k[b+4>>2]=k[a+4>>2];k[b+8>>2]=k[a+8>>2];k[b+12>>2]=k[a+12>>2];k[b+16>>2]=k[a+16>>2];k[g>>2]=5;_f(g,4);_f(h,4);_f(a+28|0,64);_f(a,20);_f(d,8);_f(f,8);if(!c){r=j;return}d=a+92|0;e=d+64|0;do{i[d>>0]=0;d=d+1|0}while((d|0)<(e|0));r=j;return}function rg(a){a=a|0;k[a>>2]=1779033703;k[a+4>>2]=-1150833019;k[a+8>>2]=1013904242;k[a+12>>2]=-1521486534;k[a+16>>2]=1359893119;k[a+20>>2]=-1694144372;k[a+24>>2]=528734635;k[a+28>>2]=1541459225;a=a+32|0;k[a>>2]=0;k[a+4>>2]=0;return}function sg(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,i=0,j=0;j=r;r=r+288|0;h=j+32|0;i=j;f=a+32|0;g=f;d=k[g>>2]|0;g=Vm(d|0,k[g+4>>2]|0,c|0,0)|0;k[f>>2]=g;k[f+4>>2]=O;if(!c){_f(i,32);_f(h,256);r=j;return}f=a+40|0;g=a+44|0;d=d&63;while(1){e=64-d|0;e=c>>>0>e>>>0?e:c;if((e|0)==64)k[f>>2]=b;else{k[f>>2]=g;_m(a+d+44|0,b|0,e|0)|0}d=e+d|0;if((d|0)==64){ug(a);d=0}if((c|0)==(e|0))break;else{c=c-e|0;b=b+e|0}}_f(i,32);_f(h,256);r=j;return}function tg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0;l=r;r=r+288|0;h=l+32|0;j=l;f=a+44|0;k[a+40>>2]=f;g=a+32|0;e=g;d=k[e>>2]|0;e=k[e+4>>2]|0;c=d&63;i[a+c+44>>0]=-128;c=c+1|0;if((c|0)!=56)while(1){c=c&63;if(c){i[a+c+44>>0]=0;c=c+1|0;if((c|0)==56)break;else continue}else{ug(a);i[a+c+44>>0]=0;c=c+1|0;continue}}c=Xm(d|0,e|0,53)|0;i[a+100>>0]=c;c=Xm(d|0,e|0,45)|0;i[a+101>>0]=c;c=Xm(d|0,e|0,37)|0;i[a+102>>0]=c;c=Xm(d|0,e|0,29)|0;i[a+103>>0]=c;c=Xm(d|0,e|0,21)|0;i[a+104>>0]=c;c=Xm(d|0,e|0,13)|0;i[a+105>>0]=c;c=Xm(d|0,e|0,5)|0;i[a+106>>0]=c;c=$m(d|0,e|0,3)|0;i[a+107>>0]=c;ug(a);c=0;do{i[b+c>>0]=(k[a+(c>>>2<<2)>>2]|0)>>>(c<<3&24^24);c=c+1|0}while((c|0)!=32);k[a>>2]=1779033703;k[a+4>>2]=-1150833019;k[a+8>>2]=1013904242;k[a+12>>2]=-1521486534;k[a+16>>2]=1359893119;k[a+20>>2]=-1694144372;k[a+24>>2]=528734635;k[a+28>>2]=1541459225;k[g>>2]=0;k[g+4>>2]=0;_f(j,32);_f(h,256);_f(f,64);r=l;return}function ug(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0;L=r;r=r+288|0;m=L+32|0;K=L;if(!a){_f(K,32);_f(m,256);r=L;return}b=a+40|0;c=k[b>>2]|0;k[m>>2]=(l[c+1>>0]|0)<<16|(l[c>>0]|0)<<24|(l[c+2>>0]|0)<<8|(l[c+3>>0]|0);k[m+4>>2]=(l[c+5>>0]|0)<<16|(l[c+4>>0]|0)<<24|(l[c+6>>0]|0)<<8|(l[c+7>>0]|0);k[m+8>>2]=(l[c+9>>0]|0)<<16|(l[c+8>>0]|0)<<24|(l[c+10>>0]|0)<<8|(l[c+11>>0]|0);k[m+12>>2]=(l[c+13>>0]|0)<<16|(l[c+12>>0]|0)<<24|(l[c+14>>0]|0)<<8|(l[c+15>>0]|0);k[m+16>>2]=(l[c+17>>0]|0)<<16|(l[c+16>>0]|0)<<24|(l[c+18>>0]|0)<<8|(l[c+19>>0]|0);c=k[b>>2]|0;k[m+20>>2]=(l[c+21>>0]|0)<<16|(l[c+20>>0]|0)<<24|(l[c+22>>0]|0)<<8|(l[c+23>>0]|0);k[m+24>>2]=(l[c+25>>0]|0)<<16|(l[c+24>>0]|0)<<24|(l[c+26>>0]|0)<<8|(l[c+27>>0]|0);k[m+28>>2]=(l[c+29>>0]|0)<<16|(l[c+28>>0]|0)<<24|(l[c+30>>0]|0)<<8|(l[c+31>>0]|0);k[m+32>>2]=(l[c+33>>0]|0)<<16|(l[c+32>>0]|0)<<24|(l[c+34>>0]|0)<<8|(l[c+35>>0]|0);k[m+36>>2]=(l[c+37>>0]|0)<<16|(l[c+36>>0]|0)<<24|(l[c+38>>0]|0)<<8|(l[c+39>>0]|0);c=k[b>>2]|0;k[m+40>>2]=(l[c+41>>0]|0)<<16|(l[c+40>>0]|0)<<24|(l[c+42>>0]|0)<<8|(l[c+43>>0]|0);k[m+44>>2]=(l[c+45>>0]|0)<<16|(l[c+44>>0]|0)<<24|(l[c+46>>0]|0)<<8|(l[c+47>>0]|0);k[m+48>>2]=(l[c+49>>0]|0)<<16|(l[c+48>>0]|0)<<24|(l[c+50>>0]|0)<<8|(l[c+51>>0]|0);k[m+52>>2]=(l[c+53>>0]|0)<<16|(l[c+52>>0]|0)<<24|(l[c+54>>0]|0)<<8|(l[c+55>>0]|0);k[m+56>>2]=(l[c+57>>0]|0)<<16|(l[c+56>>0]|0)<<24|(l[c+58>>0]|0)<<8|(l[c+59>>0]|0);b=k[b>>2]|0;k[m+60>>2]=(l[b+61>>0]|0)<<16|(l[b+60>>0]|0)<<24|(l[b+62>>0]|0)<<8|(l[b+63>>0]|0);b=k[m>>2]|0;c=16;do{J=k[m+(c+-2<<2)>>2]|0;I=b;b=k[m+(c+-15<<2)>>2]|0;k[m+(c<<2)>>2]=I+(k[m+(c+-7<<2)>>2]|0)+((J>>>19|J<<13)^J>>>10^(J>>>17|J<<15))+((b>>>18|b<<14)^b>>>3^(b>>>7|b<<25));c=c+1|0}while((c|0)!=64);n=k[a>>2]|0;k[K>>2]=n;o=a+4|0;p=k[o>>2]|0;q=K+4|0;k[q>>2]=p;s=a+8|0;t=k[s>>2]|0;u=K+8|0;k[u>>2]=t;v=a+12|0;w=k[v>>2]|0;x=K+12|0;k[x>>2]=w;y=a+16|0;z=k[y>>2]|0;A=K+16|0;k[A>>2]=z;B=a+20|0;C=k[B>>2]|0;D=K+20|0;k[D>>2]=C;E=a+24|0;F=k[E>>2]|0;G=K+24|0;k[G>>2]=F;H=a+28|0;I=k[H>>2]|0;J=K+28|0;k[J>>2]=I;d=z;e=C;f=F;b=I;c=w;j=n;g=t;i=p;h=0;while(1){b=(k[50504+(h<<2)>>2]|0)+b+((d>>>6|d<<26)^(d>>>11|d<<21)^(d>>>25|d<<7))+(f&~d^e&d)+(k[m+(h<<2)>>2]|0)|0;c=c+b|0;b=((j>>>2|j<<30)^(j>>>13|j<<19)^(j>>>22|j<<10))+b+((g^i)&j^g&i)|0;h=h+1|0;if((h|0)==64){h=j;break}else{P=j;O=i;N=g;M=d;d=c;j=b;i=P;g=O;c=N;b=f;f=e;e=M}}k[J>>2]=f;k[A>>2]=c;k[D>>2]=d;k[G>>2]=e;k[x>>2]=g;k[K>>2]=b;k[q>>2]=h;k[u>>2]=i;k[a>>2]=n+b;k[o>>2]=p+h;k[s>>2]=t+i;k[v>>2]=w+g;k[y>>2]=z+c;k[B>>2]=C+d;k[E>>2]=F+e;k[H>>2]=I+f;r=L;return}function vg(a){a=a|0;var b=0,c=0,d=0;Ym(a+2112|0,0,240)|0;k[a+2368>>2]=0;b=a+2372|0;i[b>>0]=0;Ym(a+2376|0,0,516)|0;c=k[a+2356>>2]|0;k[c+4>>2]=-1150833019;k[c+16>>2]=1359893119;k[c+20>>2]=-1694144372;k[c+24>>2]=528734635;k[c+28>>2]=1541459225;k[c>>2]=1744954951;k[c+8>>2]=1013904242;k[c+12>>2]=-2058422982;c=0;do{Ym(a+(c*264|0)|0,0,240)|0;k[a+(c*264|0)+256>>2]=0;i[a+(c*264|0)+260>>0]=0;d=k[a+(c*264|0)+244>>2]|0;k[d+4>>2]=-1150833019;k[d+16>>2]=1359893119;k[d+20>>2]=-1694144372;k[d+24>>2]=528734635;k[d+28>>2]=1541459225;k[d>>2]=1744954951;k[d+8>>2]=c^1013904242;k[d+12>>2]=-2058357446;c=c+1|0}while((c|0)!=8);i[b>>0]=1;i[a+2108>>0]=1;return}function wg(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0;b=k[a+8>>2]|0;if(b>>>0<=511)return;o=k[a+4>>2]|0;while(1){h=k[a>>2]|0;n=h+256|0;j=h+240|0;m=h+248|0;e=64;d=o;c=k[n>>2]|0;while(1){l=128-c|0;c=(k[j>>2]|0)+c|0;if(e>>>0<=l>>>0){p=5;break}_m(c|0,d|0,l|0)|0;k[n>>2]=(k[n>>2]|0)+l;f=k[m>>2]|0;c=k[f>>2]|0;k[f>>2]=c+64;f=f+4|0;k[f>>2]=(c>>>0>4294967231&1)+(k[f>>2]|0);zg(h,k[j>>2]|0);f=k[j>>2]|0;c=f+0|0;f=f+64|0;g=c+64|0;do{i[c>>0]=i[f>>0]|0;c=c+1|0;f=f+1|0}while((c|0)<(g|0));c=(k[n>>2]|0)+-64|0;k[n>>2]=c;if((e|0)==(l|0))break;else{e=e-l|0;d=d+l|0}}if((p|0)==5){p=0;_m(c|0,d|0,e|0)|0;k[n>>2]=(k[n>>2]|0)+e}b=b+-512|0;if(b>>>0<=511)break;else o=o+512|0}return}function xg(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;H=r;r=r+96|0;E=H;G=a+2888|0;d=k[G>>2]|0;o=512-d|0;if((d|0)==0|o>>>0>c>>>0)D=d;else{_m(a+d+2376|0,b|0,o|0)|0;n=0;do{j=a+(n*264|0)|0;m=a+(n*264|0)+256|0;g=a+(n*264|0)+240|0;l=a+(n*264|0)+248|0;f=64;e=a+(n<<6)+2376|0;d=k[m>>2]|0;while(1){h=128-d|0;d=(k[g>>2]|0)+d|0;if(f>>>0<=h>>>0){F=5;break}_m(d|0,e|0,h|0)|0;k[m>>2]=(k[m>>2]|0)+h;x=k[l>>2]|0;w=k[x>>2]|0;k[x>>2]=w+64;x=x+4|0;k[x>>2]=(w>>>0>4294967231&1)+(k[x>>2]|0);zg(j,k[g>>2]|0);x=k[g>>2]|0;w=x+0|0;x=x+64|0;y=w+64|0;do{i[w>>0]=i[x>>0]|0;w=w+1|0;x=x+1|0}while((w|0)<(y|0));d=(k[m>>2]|0)+-64|0;k[m>>2]=d;if((f|0)==(h|0))break;else{f=f-h|0;e=e+h|0}}if((F|0)==5){F=0;_m(d|0,e|0,f|0)|0;k[m>>2]=(k[m>>2]|0)+f}n=n+1|0}while((n|0)!=8);b=b+o|0;c=c-o|0;D=0}if(c>>>0<4096)d=1;else d=k[a+2896>>2]|0;C=(d&-2|0)==6?4:d;z=(C|0)!=0;A=C>>>0>1;B=a+2892|0;C=0-C|0;e=0;do{if(z&e>>>0<8){v=e+-8|0;v=v>>>0<C>>>0?C:v;u=0-v|0;if(A){d=0;f=e;while(1){y=E+(d*12|0)|0;k[E+(d*12|0)+8>>2]=c;k[E+(d*12|0)+4>>2]=b+(f<<6);k[y>>2]=a+(f*264|0);pi(k[B>>2]|0,24,y);d=d+1|0;if((d|0)==(u|0))break;else f=f+1|0}}else{s=0;t=e;while(1){k[E+(s*12|0)+8>>2]=c;g=b+(t<<6)|0;k[E+(s*12|0)+4>>2]=g;d=a+(t*264|0)|0;q=E+(s*12|0)|0;k[q>>2]=d;a:do if(c>>>0>511){f=c;while(1){p=d+256|0;h=d+240|0;o=d+248|0;n=64;m=g;j=k[p>>2]|0;while(1){l=128-j|0;j=(k[h>>2]|0)+j|0;if(n>>>0<=l>>>0){d=j;F=18;break}_m(j|0,m|0,l|0)|0;k[p>>2]=(k[p>>2]|0)+l;x=k[o>>2]|0;w=k[x>>2]|0;k[x>>2]=w+64;x=x+4|0;k[x>>2]=(w>>>0>4294967231&1)+(k[x>>2]|0);zg(d,k[h>>2]|0);x=k[h>>2]|0;w=x+0|0;x=x+64|0;y=w+64|0;do{i[w>>0]=i[x>>0]|0;w=w+1|0;x=x+1|0}while((w|0)<(y|0));j=(k[p>>2]|0)+-64|0;k[p>>2]=j;if((n|0)==(l|0))break;else{n=n-l|0;m=m+l|0}}if((F|0)==18){F=0;_m(d|0,m|0,n|0)|0;k[p>>2]=(k[p>>2]|0)+n}f=f+-512|0;if(f>>>0<=511)break a;d=k[q>>2]|0;g=g+512|0}}while(0);s=s+1|0;if((s|0)==(u|0))break;else t=t+1|0}}e=e-v|0}d=k[B>>2]|0;if(d)ki(d)}while(e>>>0<8);d=c&511;if(!d){a=d+D|0;k[G>>2]=a;r=H;return}_m(a+D+2376|0,b+(c-d)|0,d|0)|0;a=d+D|0;k[G>>2]=a;r=H;return}function yg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0;u=r;r=r+256|0;s=u;m=a+2888|0;q=0;do{c=k[m>>2]|0;e=q<<6;a:do if(c>>>0>e>>>0){d=c-e|0;d=d>>>0>64?64:d;c=a+(q*264|0)|0;if(d){l=a+(q*264|0)+256|0;h=a+(q*264|0)+240|0;j=a+(q*264|0)+248|0;f=d;e=a+e+2376|0;d=k[l>>2]|0;while(1){g=128-d|0;d=(k[h>>2]|0)+d|0;if(f>>>0<=g>>>0)break;_m(d|0,e|0,g|0)|0;k[l>>2]=(k[l>>2]|0)+g;o=k[j>>2]|0;n=k[o>>2]|0;k[o>>2]=n+64;o=o+4|0;k[o>>2]=(n>>>0>4294967231&1)+(k[o>>2]|0);zg(c,k[h>>2]|0);o=k[h>>2]|0;n=o+0|0;o=o+64|0;p=n+64|0;do{i[n>>0]=i[o>>0]|0;n=n+1|0;o=o+1|0}while((n|0)<(p|0));d=(k[l>>2]|0)+-64|0;k[l>>2]=d;if((f|0)==(g|0))break a;else{f=f-g|0;e=e+g|0}}_m(d|0,e|0,f|0)|0;k[l>>2]=(k[l>>2]|0)+f}}else c=a+(q*264|0)|0;while(0);Ag(c,s+(q<<5)|0);q=q+1|0}while((q|0)!=8);j=a+2112|0;l=a+2368|0;m=a+2352|0;h=a+2360|0;c=k[l>>2]|0;g=0;do{f=32;d=s+(g<<5)|0;while(1){e=128-c|0;c=(k[m>>2]|0)+c|0;if(f>>>0<=e>>>0){t=13;break}_m(c|0,d|0,e|0)|0;k[l>>2]=(k[l>>2]|0)+e;o=k[h>>2]|0;n=k[o>>2]|0;k[o>>2]=n+64;o=o+4|0;k[o>>2]=(n>>>0>4294967231&1)+(k[o>>2]|0);zg(j,k[m>>2]|0);o=k[m>>2]|0;n=o+0|0;o=o+64|0;p=n+64|0;do{i[n>>0]=i[o>>0]|0;n=n+1|0;o=o+1|0}while((n|0)<(p|0));c=(k[l>>2]|0)+-64|0;k[l>>2]=c;if((f|0)==(e|0))break;else{f=f-e|0;d=d+e|0}}if((t|0)==13){t=0;_m(c|0,d|0,f|0)|0;c=(k[l>>2]|0)+f|0;k[l>>2]=c}g=g+1|0}while((g|0)!=8);Ag(j,b);r=u;return}function zg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;M=r;r=r+128|0;u=M+64|0;L=M;c=0;do{J=c<<2;k[u+(c<<2)>>2]=(l[b+(J|1)>>0]|0)<<8|(l[b+J>>0]|0)|(l[b+(J|2)>>0]|0)<<16|(l[b+(J|3)>>0]|0)<<24;c=c+1|0}while((c|0)!=16);x=a+244|0;h=k[x>>2]|0;g=k[h>>2]|0;k[L>>2]=g;s=k[h+4>>2]|0;J=L+4|0;k[J>>2]=s;n=k[h+8>>2]|0;K=L+8|0;k[K>>2]=n;e=k[h+12>>2]|0;y=L+12|0;k[y>>2]=e;b=k[h+16>>2]|0;z=L+16|0;k[z>>2]=b;p=k[h+20>>2]|0;A=L+20|0;k[A>>2]=p;o=k[h+24>>2]|0;B=L+24|0;k[B>>2]=o;h=k[h+28>>2]|0;C=L+28|0;k[C>>2]=h;D=L+32|0;k[D>>2]=1779033703;E=L+36|0;k[E>>2]=-1150833019;F=L+40|0;k[F>>2]=1013904242;G=L+44|0;k[G>>2]=-1521486534;j=k[a+248>>2]|0;q=k[j>>2]^1359893119;H=L+48|0;k[H>>2]=q;j=k[j+4>>2]^-1694144372;I=L+52|0;k[I>>2]=j;f=k[a+252>>2]|0;a=k[f>>2]^528734635;v=L+56|0;k[v>>2]=a;f=k[f+4>>2]^1541459225;w=L+60|0;k[w>>2]=f;i=1779033703;c=-1150833019;m=1013904242;d=-1521486534;t=0;do{g=b+g+(k[u+((l[50760+(t<<4)>>0]|0)<<2)>>2]|0)|0;q=q^g;q=q<<16|q>>>16;i=q+i|0;b=i^b;b=b<<20|b>>>12;g=(k[u+((l[50761+(t<<4)>>0]|0)<<2)>>2]|0)+g+b|0;q=g^q;q=q<<24|q>>>8;i=q+i|0;b=i^b;b=b<<25|b>>>7;s=p+s+(k[u+((l[50762+(t<<4)>>0]|0)<<2)>>2]|0)|0;j=j^s;j=j<<16|j>>>16;c=j+c|0;p=c^p;p=p<<20|p>>>12;s=(k[u+((l[50763+(t<<4)>>0]|0)<<2)>>2]|0)+s+p|0;j=s^j;j=j<<24|j>>>8;c=j+c|0;p=c^p;p=p<<25|p>>>7;n=o+n+(k[u+((l[50764+(t<<4)>>0]|0)<<2)>>2]|0)|0;a=a^n;a=a<<16|a>>>16;m=a+m|0;o=m^o;o=o<<20|o>>>12;n=(k[u+((l[50765+(t<<4)>>0]|0)<<2)>>2]|0)+n+o|0;a=n^a;a=a<<24|a>>>8;m=a+m|0;o=m^o;o=o<<25|o>>>7;e=h+e+(k[u+((l[50766+(t<<4)>>0]|0)<<2)>>2]|0)|0;f=f^e;f=f<<16|f>>>16;d=f+d|0;h=d^h;h=h<<20|h>>>12;e=(k[u+((l[50767+(t<<4)>>0]|0)<<2)>>2]|0)+e+h|0;f=e^f;f=f<<24|f>>>8;d=f+d|0;h=d^h;h=h<<25|h>>>7;g=p+g+(k[u+((l[50768+(t<<4)>>0]|0)<<2)>>2]|0)|0;f=f^g;f=f<<16|f>>>16;m=f+m|0;p=m^p;p=p<<20|p>>>12;g=(k[u+((l[50769+(t<<4)>>0]|0)<<2)>>2]|0)+g+p|0;f=g^f;f=f<<24|f>>>8;m=f+m|0;p=m^p;p=p<<25|p>>>7;s=o+s+(k[u+((l[50770+(t<<4)>>0]|0)<<2)>>2]|0)|0;q=q^s;q=q<<16|q>>>16;d=q+d|0;o=d^o;o=o<<20|o>>>12;s=(k[u+((l[50771+(t<<4)>>0]|0)<<2)>>2]|0)+s+o|0;q=s^q;q=q<<24|q>>>8;d=q+d|0;o=d^o;o=o<<25|o>>>7;n=h+n+(k[u+((l[50772+(t<<4)>>0]|0)<<2)>>2]|0)|0;j=j^n;j=j<<16|j>>>16;i=j+i|0;h=i^h;h=h<<20|h>>>12;n=(k[u+((l[50773+(t<<4)>>0]|0)<<2)>>2]|0)+n+h|0;j=n^j;j=j<<24|j>>>8;i=j+i|0;h=i^h;h=h<<25|h>>>7;e=b+e+(k[u+((l[50774+(t<<4)>>0]|0)<<2)>>2]|0)|0;a=a^e;a=a<<16|a>>>16;c=a+c|0;b=c^b;b=b<<20|b>>>12;e=(k[u+((l[50775+(t<<4)>>0]|0)<<2)>>2]|0)+e+b|0;a=e^a;a=a<<24|a>>>8;c=a+c|0;b=c^b;b=b<<25|b>>>7;t=t+1|0}while((t|0)!=10);k[L>>2]=g;k[z>>2]=b;k[H>>2]=q;k[D>>2]=i;k[J>>2]=s;k[A>>2]=p;k[I>>2]=j;k[E>>2]=c;k[K>>2]=n;k[B>>2]=o;k[v>>2]=a;k[F>>2]=m;k[y>>2]=e;k[C>>2]=h;k[w>>2]=f;k[G>>2]=d;D=k[x>>2]|0;k[D>>2]=g^k[D>>2]^i;C=D+4|0;k[C>>2]=k[J>>2]^k[C>>2]^k[E>>2];J=D+8|0;k[J>>2]=k[K>>2]^k[J>>2]^k[F>>2];J=D+12|0;k[J>>2]=k[y>>2]^k[J>>2]^k[G>>2];J=D+16|0;k[J>>2]=k[z>>2]^k[J>>2]^k[H>>2];J=D+20|0;k[J>>2]=k[A>>2]^k[J>>2]^k[I>>2];J=D+24|0;k[J>>2]=o^k[J>>2]^a;J=D+28|0;k[J>>2]=h^k[J>>2]^f;r=M;return}function Ag(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;e=a+256|0;c=k[e>>2]|0;d=a+248|0;if(c>>>0>64){f=k[d>>2]|0;c=k[f>>2]|0;k[f>>2]=c+64;f=f+4|0;k[f>>2]=(c>>>0>4294967231&1)+(k[f>>2]|0);f=a+240|0;zg(a,k[f>>2]|0);c=(k[e>>2]|0)+-64|0;k[e>>2]=c;f=k[f>>2]|0;_m(f|0,f+64|0,c|0)|0;c=k[e>>2]|0}g=k[d>>2]|0;f=k[g>>2]|0;d=f+c|0;k[g>>2]=d;c=g+4|0;k[c>>2]=(d>>>0<f>>>0&1)+(k[c>>2]|0);c=k[a+252>>2]|0;if(i[a+260>>0]|0)k[c+4>>2]=-1;k[c>>2]=-1;c=a+240|0;d=k[e>>2]|0;Ym((k[c>>2]|0)+d|0,0,128-d|0)|0;zg(a,k[c>>2]|0);c=a+244|0;d=0;do{f=k[(k[c>>2]|0)+(d<<2)>>2]|0;g=d<<2;i[b+g>>0]=f;i[b+(g|1)>>0]=f>>>8;i[b+(g|2)>>0]=f>>>16;i[b+(g|3)>>0]=f>>>24;d=d+1|0}while((d|0)!=8);return}function Bg(a,b){a=a|0;b=b|0;var c=0;k[a>>2]=b;if((b+-1|0)>>>0<2){k[a+4>>2]=0;return}if((b|0)!=3)return;b=a+4|0;a=50920|0;c=b+32|0;do{i[b>>0]=i[a>>0]|0;b=b+1|0;a=a+1|0}while((b|0)<(c|0));return}function Cg(a){a=a|0;var b=0;b=a+8|0;b=(0-b&63)+b|0;k[a+248>>2]=b;k[a+252>>2]=b+128;k[a+256>>2]=b+160;k[a+260>>2]=b+168;b=a+272|0;b=(0-b&63)+b|0;k[a+512>>2]=b;k[a+516>>2]=b+128;k[a+520>>2]=b+160;k[a+524>>2]=b+168;b=a+536|0;b=(0-b&63)+b|0;k[a+776>>2]=b;k[a+780>>2]=b+128;k[a+784>>2]=b+160;k[a+788>>2]=b+168;b=a+800|0;b=(0-b&63)+b|0;k[a+1040>>2]=b;k[a+1044>>2]=b+128;k[a+1048>>2]=b+160;k[a+1052>>2]=b+168;b=a+1064|0;b=(0-b&63)+b|0;k[a+1304>>2]=b;k[a+1308>>2]=b+128;k[a+1312>>2]=b+160;k[a+1316>>2]=b+168;b=a+1328|0;b=(0-b&63)+b|0;k[a+1568>>2]=b;k[a+1572>>2]=b+128;k[a+1576>>2]=b+160;k[a+1580>>2]=b+168;b=a+1592|0;b=(0-b&63)+b|0;k[a+1832>>2]=b;k[a+1836>>2]=b+128;k[a+1840>>2]=b+160;k[a+1844>>2]=b+168;b=a+1856|0;b=(0-b&63)+b|0;k[a+2096>>2]=b;k[a+2100>>2]=b+128;k[a+2104>>2]=b+160;k[a+2108>>2]=b+168;b=a+2120|0;b=(0-b&63)+b|0;k[a+2360>>2]=b;k[a+2364>>2]=b+128;k[a+2368>>2]=b+160;k[a+2372>>2]=b+168;k[a>>2]=0;k[a+2908>>2]=0;k[a+2912>>2]=0;return}function Dg(a){a=a|0;gi(k[a+2908>>2]|0);_f(a+8|0,2900);_f(a+4|0,4);return}function Eg(a,b,c){a=a|0;b=b|0;c=c|0;k[a>>2]=b;if((b|0)==3)vg(a+8|0);else if((b|0)==2)k[a+4>>2]=-1;else if((b|0)==1)k[a+4>>2]=0;k[a+2912>>2]=c>>>0<8?c:8;return}function Fg(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;d=k[a>>2]|0;if((d|0)==1){d=a+4|0;f=(Ne(k[d>>2]&65535,b,c)|0)&65535;k[d>>2]=f;d=k[a>>2]|0}if((d|0)==2){d=a+4|0;f=Me(k[d>>2]|0,b,c)|0;k[d>>2]=f;d=k[a>>2]|0}if((d|0)!=3)return;g=a+2912|0;d=k[g>>2]|0;e=a+2908|0;f=k[e>>2]|0;if(d>>>0>1&(f|0)==0){f=fi()|0;k[e>>2]=f;d=k[g>>2]|0}k[a+2900>>2]=f;k[a+2904>>2]=d;xg(a+8|0,b,c);return}function Gg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;f=r;r=r+2912|0;e=f;c=k[a>>2]|0;k[b>>2]=c;if((c|0)==2){k[b+4>>2]=~k[a+4>>2];r=f;return}else if((c|0)==3){d=(e|0)==(a+8|0);if(d){c=e;c=(0-c&60)+c|0;k[e+240>>2]=c;k[e+244>>2]=c+128;k[e+248>>2]=c+160;k[e+252>>2]=c+168;c=e+264|0;c=(0-c&60)+c|0;k[e+504>>2]=c;k[e+508>>2]=c+128;k[e+512>>2]=c+160;k[e+516>>2]=c+168;c=e+528|0;c=(0-c&60)+c|0;k[e+768>>2]=c;k[e+772>>2]=c+128;k[e+776>>2]=c+160;k[e+780>>2]=c+168;c=e+792|0;c=(0-c&60)+c|0;k[e+1032>>2]=c;k[e+1036>>2]=c+128;k[e+1040>>2]=c+160;k[e+1044>>2]=c+168;c=e+1056|0;c=(0-c&60)+c|0;k[e+1296>>2]=c;k[e+1300>>2]=c+128;k[e+1304>>2]=c+160;k[e+1308>>2]=c+168;c=e+1320|0;c=(0-c&60)+c|0;k[e+1560>>2]=c;k[e+1564>>2]=c+128;k[e+1568>>2]=c+160;k[e+1572>>2]=c+168;c=e+1584|0;c=(0-c&60)+c|0;k[e+1824>>2]=c;k[e+1828>>2]=c+128;k[e+1832>>2]=c+160;k[e+1836>>2]=c+168;c=e+1848|0;c=(0-c&60)+c|0;k[e+2088>>2]=c;k[e+2092>>2]=c+128;k[e+2096>>2]=c+160;k[e+2100>>2]=c+168}else{c=0;do{g=e+(c*264|0)|0;g=(0-g&60)+g|0;k[e+(c*264|0)+240>>2]=g;k[e+(c*264|0)+244>>2]=g+128;k[e+(c*264|0)+248>>2]=g+160;k[e+(c*264|0)+252>>2]=g+168;_m(g|0,k[a+(c*264|0)+248>>2]|0,176)|0;k[e+(c*264|0)+256>>2]=k[a+(c*264|0)+264>>2];i[e+(c*264|0)+260>>0]=i[a+(c*264|0)+268>>0]|0;c=c+1|0}while((c|0)!=8)}c=e+2112|0;c=(0-c&60)+c|0;k[e+2352>>2]=c;k[e+2356>>2]=c+128;k[e+2360>>2]=c+160;k[e+2364>>2]=c+168;if(!d){_m(c|0,k[a+2360>>2]|0,176)|0;k[e+2368>>2]=k[a+2376>>2];i[e+2372>>0]=i[a+2380>>0]|0}_m(e+2376|0,a+2384|0,524)|0;yg(e,b+4|0);r=f;return}else if((c|0)==1){k[b+4>>2]=k[a+4>>2];r=f;return}else{r=f;return}}function Hg(a){a=a|0;if((k[a>>2]|0)!=2){a=0;return a|0}a=~k[a+4>>2];return a|0}function Ig(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;e=r;r=r+48|0;d=e;Gg(a,d);if(c)Ge(d,c);c=k[d>>2]|0;if(!c){b=1;r=e;return b|0}a=k[b>>2]|0;if(!a){b=1;r=e;return b|0}if(!((c|0)==1&(a|0)==1)?!((c|0)==2&(a|0)==2):0){if(!((c|0)==3&(a|0)==3)){b=0;r=e;return b|0}b=(Mm(d+4|0,b+4|0,32)|0)==0;r=e;return b|0}b=(k[d+4>>2]|0)==(k[b+4>>2]|0);r=e;return b|0}function Jg(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;g=r;r=r+4176|0;f=g;d=g+2128|0;e=g+80|0;bd(b,b,c);if(!(Gd(b)|0)){f=0;r=g;return f|0}Ed(a,1)|0;me(b,d,2048)|0;me(a,e,2048)|0;if(!(tb(d|0,e|0)|0)){f=1;r=g;return f|0}k[f+68>>2]=0;k[f+72>>2]=21;k[f+64>>2]=1;k[f>>2]=a;Kf(32944,9);f=0;r=g;return f|0}function Kg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0;j=r;r=r+2128|0;h=j;g=j+80|0;me(b,g,2048)|0;if(i[a+78284>>0]|0){k[h+68>>2]=0;k[h+72>>2]=86;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=b;Kf(32944,3);r=j;return}e=ac()|0;k[e>>2]=0;d=a+77356|0;c=kb(d|0)|0;if(!c){g=Nc(d)|0;k[h+68>>2]=0;k[h+72>>2]=87;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=g;Kf(32944,1);r=j;return}f=k[c+8>>2]|0;k[e>>2]=0;c=a+77612|0;d=qb(c|0)|0;if(!d){g=Nc(c)|0;k[h+68>>2]=0;k[h+72>>2]=88;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=g;Kf(32944,3);r=j;return}c=Kd(b)|0;if(Ba(g|0,f|0,k[d+8>>2]|0)|0){k[h+68>>2]=0;k[h+72>>2]=89;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=b;Kf(32944,9)}Ld(b,c)|0;r=j;return}function Lg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0;j=r;r=r+4176|0;h=j;g=j+2128|0;f=j+80|0;me(b,g,2048)|0;c=k[a+68272>>2]|0;e=(Zm(c|0)|0)+1|0;d=(k[a+68276>>2]|0)-e|0;Wm(f|0,c+e|0,d|0)|0;i[f+d>>0]=0;d=kb(c|0)|0;if(!d){g=Nc(c)|0;k[h+68>>2]=0;k[h+72>>2]=87;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=g;Kf(32944,1);r=j;return}d=k[d+8>>2]|0;e=qb(f|0)|0;if(!e){g=Nc(f)|0;k[h+68>>2]=0;k[h+72>>2]=88;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=g;Kf(32944,1);r=j;return}c=Kd(b)|0;if(Ba(g|0,d|0,k[e+8>>2]|0)|0){k[h+68>>2]=0;k[h+72>>2]=89;k[h>>2]=a+24;k[h+64>>2]=2;k[h+4>>2]=b;Kf(32944,9)}Ld(b,c)|0;r=j;return}function Mg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;g=r;r=r+2128|0;f=g;e=g+80|0;me(b,e,2048)|0;c=a+59464|0;do if(i[c>>0]|0){d=kb(c|0)|0;if(d){k[a+59976>>2]=k[d+8>>2];break}if(!(i[a+59462>>0]|0)){e=Nc(c)|0;k[f+68>>2]=0;k[f+72>>2]=87;k[f>>2]=a+24;k[f+64>>2]=2;k[f+4>>2]=e;Kf(32944,1);r=g;return}}while(0);c=a+59720|0;do if(i[c>>0]|0){d=qb(c|0)|0;if(d){k[a+59980>>2]=k[d+8>>2];break}if(!(i[a+59463>>0]|0)){e=Nc(c)|0;k[f+68>>2]=0;k[f+72>>2]=88;k[f>>2]=a+24;k[f+64>>2]=2;k[f+4>>2]=e;Kf(32944,1);r=g;return}}while(0);if(!(Ba(e|0,k[a+59976>>2]|0,k[a+59980>>2]|0)|0)){r=g;return}k[f+68>>2]=0;k[f+72>>2]=89;k[f>>2]=a+24;k[f+64>>2]=2;k[f+4>>2]=b;Kf(32944,9);r=g;return}function Ng(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;f=r;r=r+2048|0;e=f;if(!(Id(k[c+42860>>2]|0)|0)){e=0;r=f;return e|0}h=c+51096|0;g=k[h>>2]|0;h=k[h+4>>2]|0;g=(h|0)<0|(h|0)==0&g>>>0<2047?g:2047;pf(b,e,g)|0;i[e+g>>0]=0;g=b+18672|0;b=c+51120|0;Eg(g,k[b>>2]|0,1);Fg(g,e,Zm(e|0)|0);Gg(g,b);if(!(Ig(g,b,(i[c+51210>>0]|0)==0?0:c+51211|0)|0)){g=1;r=f;return g|0}if(!(i[a+49811>>0]|0)){if((i[e>>0]|0)==47){g=0;r=f;return g|0}if(!(Og(c+42864|0,c+51268|0)|0)){g=0;r=f;return g|0}}g=Tg(e,d)|0;r=f;return g|0}function Og(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;if(ed(a)|0){g=0;return g|0}c=k[a>>2]|0;if(!c)a=0;else{f=a;a=0;do{d=f;f=f+4|0;a:do if((Pc(c)|0?(g=k[f>>2]|0,(g|0)!=0):0)?!(Pc(g)|0):0){do if((k[f>>2]|0)==46){c=d+8|0;if(Pc(k[c>>2]|0)|0)e=1;else e=(k[c>>2]|0)==0;if((k[f>>2]|0)==46?(k[c>>2]|0)==46:0){c=d+12|0;if(!(Pc(k[c>>2]|0)|0))if(e)break a;else{c=(k[c>>2]|0)==0;break}else c=1}else c=0;if(e)break a}else c=0;while(0);a=(c&1^1)+a|0}while(0);c=k[f>>2]|0}while((c|0)!=0)}if(ed(b)|0){g=0;return g|0}else e=0;b:while(1){c=k[b>>2]|0;do if((c|0)==46){c=b+4|0;if((k[c>>2]|0)==46){d=b+8|0;if(!(Pc(k[d>>2]|0)|0)?(k[d>>2]|0)!=0:0){d=0;break}if(!e)d=1;else d=Pc(k[b+-4>>2]|0)|0}else d=0}else if(!c)break b;else{c=b+4|0;d=0}while(0);b=c;a=(d<<31>>31)+a|0;e=e+1|0}g=(a|0)>-1;return g|0}function Pg(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;f=r;r=r+2048|0;e=f;d=c+8436|0;me(d,e,2048)|0;do if((k[c+8432>>2]&-2|0)==2){if(!(Om(e,50952,4)|0)){c=0;r=f;return c|0}if(!(Om(e,50960,4)|0)){c=0;r=f;return c|0}else{ad(e,e,2048);break}}while(0);if(!(i[a+49811>>0]|0)){if((i[e>>0]|0)==47){c=0;r=f;return c|0}if(!(Og(c+32|0,d)|0)){c=0;r=f;return c|0}}c=Tg(e,b)|0;r=f;return c|0}function Qg(a,b,c){a=a|0;b=b|0;c=c|0;if((j[b+60040>>1]|0)!=257)return;if(!(i[a+49808>>0]|0))return;Kg(b,c);return}function Rg(a,b,c){a=a|0;b=b|0;c=c|0;if(!(i[a+49808>>0]|0))return;if((k[b+78264>>2]|0)!=2)return;if(hk(b+60080|0,50968)|0)return;Lg(b,c);return}function Sg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=k[c+78264>>2]|0;if((e|0)==3){d=Pg(a,d,c+42832|0)|0;return d|0}else if((e|0)==2){d=Ng(a,b,c,d)|0;return d|0}else{d=0;return d|0}return 0}function Tg(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;d=r;r=r+2128|0;c=d;e=d+80|0;Ed(b,1)|0;Md(b)|0;me(b,e,2048)|0;if((Nb(a|0,e|0)|0)!=-1){e=1;r=d;return e|0}e=ac()|0;if((k[e>>2]|0)==17){k[c+68>>2]=0;k[c+72>>2]=91;k[c+64>>2]=1;k[c>>2]=b;e=0;r=d;return e|0}else{k[c+68>>2]=0;k[c+72>>2]=20;k[c>>2]=0;k[c+64>>2]=2;k[c+4>>2]=b;Kf(32944,1);e=0;r=d;return e|0}return 0}function Ug(a,b){a=a|0;b=b|0;var c=0,d=0;d=a;k[d>>2]=0;k[d+4>>2]=0;d=a+16|0;nf(d);k[a+8>>2]=b;k[a+21628>>2]=0;k[a+29824>>2]=0;k[a+21612>>2]=0;c=yk(59112)|0;Sh(c,d);k[a+21608>>2]=c;a=k[b+66976>>2]|0;k[c+28>>2]=a>>>0<8?a:8;return}function Vg(a){a=a|0;var b=0;b=k[a+21608>>2]|0;if(b){Th(b);Ak(b)}$d(a+16|0);return}function Wg(a,b){a=a|0;b=b|0;var c=0;c=ud(b)|0;b=a+12800|0;k[b>>2]=c;k[b+4>>2]=O;k[a+21616>>2]=0;k[a+21620>>2]=0;i[a+21624>>0]=1;i[a+29820>>0]=i[(k[a+8>>2]|0)+41508>>0]|0;i[a+12793>>0]=0;i[a+29821>>0]=0;i[a+21625>>0]=1;i[a+21626>>0]=0;i[a+21627>>0]=0;mf(a);return}function Xg(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,P=0,Q=0,R=0;Q=r;r=r+41872|0;C=Q+41780|0;G=Q+41704|0;F=Q+41628|0;N=Q+41552|0;f=Q+41865|0;e=Q+25168|0;E=Q+16976|0;g=Q;P=Q+8240|0;l=Q+41864|0;M=Q+16460|0;j=Q+41856|0;B=Q+33360|0;K=a+8|0;H=k[(k[K>>2]|0)+75208>>2]|0;if(!c){if(!(i[a+12793>>0]|0)){a=0;r=Q;return a|0}if(!(ch(b,a+16|0,0,H)|0)){Kf(32944,1);a=0;r=Q;return a|0}}d=k[b+36204>>2]|0;if((d|0)==5){if(!(i[b+60012>>0]|0)){a=0;r=Q;return a|0}if(ch(b,a+16|0,0,H)|0){a=b+78248|0;sc[k[(k[b>>2]|0)+16>>2]&15](b,k[a>>2]|0,k[a+4>>2]|0,0);a=1;r=Q;return a|0}else{Kf(32944,1);a=0;r=Q;return a|0}}else if((d|0)==3){if(i[a+29821>>0]|0)Rg(k[K>>2]|0,b,a+29824|0)}else if((d|0)==2){J=a+29821|0;i[J>>0]=0;d=k[K>>2]|0;if(((k[d+49760>>2]|0)==0?(k[a+21620>>2]|0)>>>0>=(k[d+91676>>2]|0)>>>0:0)?(i[a+21625>>0]|0)!=0:0){a=0;r=Q;return a|0}i[f>>0]=0;c=(vi(d,b+42832|0,f,5,e,2048)|0)!=0;d=k[K>>2]|0;if((k[d+49756>>2]|0)==2?(Lc(d+32804|0,e,2048)|0,L=Oc((k[K>>2]|0)+32804|0)|0,k[L>>2]=0,Uc((k[K>>2]|0)+32804|0)|0):0)k[(k[K>>2]|0)+32804>>2]=0;if(c&(i[f>>0]|0)==0)i[a+21625>>0]=0;je(b);Sc(b+42864|0,E)|0;if(!(i[b+51251>>0]|0)){if(!(ie(b)|0))c=c&(k[(k[K>>2]|0)+58764>>2]|0)>>>0<2}else{d=k[(k[K>>2]|0)+58764>>2]|0;if((d|0)!=1&(i[f>>0]|0)==0){L=fd(E,0)|0;if(((k[(k[K>>2]|0)+58764>>2]|0)+-1|0)==(L|0)){fd(E,1)|0;c=c&(d|0)!=0}else c=0}}D=b+51161|0;y=a+16|0;i[a+12793>>0]=i[D>>0]|0;L=a+12794|0;i[L>>0]=0;I=k[(k[b>>2]|0)+16>>2]|0;A=b+78256|0;s=b+51096|0;d=s;d=Um(k[A>>2]|0,k[A+4>>2]|0,k[d>>2]|0,k[d+4>>2]|0)|0;sc[I&15](b,d,O,0);d=a+21624|0;a:do if(!(i[d>>0]|0)){i[d>>0]=0;if(c){I=1;d=0;h=39}else h=38}else{do if(c)if(!(i[b+51160>>0]|0)){i[d>>0]=0;I=1;d=0;h=39;break a}else{k[C+68>>2]=0;k[C+72>>2]=69;k[C>>2]=b+24;k[C+64>>2]=2;k[C+4>>2]=E;k[(k[K>>2]|0)+75176>>2]=12;Kf(32944,6);break}else if(i[b+78268>>0]|0){i[d>>0]=0;h=38;break a}while(0);i[d>>0]=0;h=38}while(0);if((h|0)==38){d=i[b+78268>>0]|0;if(!(d<<24>>24)){e=0;d=1}else{I=0;h=39}}if((h|0)==39){A=(i[(k[K>>2]|0)+50377>>0]|0)!=0;c=d<<24>>24!=0;if(!(yi(E,A^1,A&(H|0)!=73,c)|0)){a=0;r=Q;return a|0}t=a+29824|0;Yg(a,b,E,t,2048);if(!c?(k[t>>2]|0)!=0:0)e=i[b+51160>>0]^1;else e=0;A=k[K>>2]|0;if(!((i[A+49751>>0]|0)==0?(i[A+49752>>0]|0)==0:0))h=45;do if((h|0)==45)if((H|0)==69|(H|0)==88){c=g+8208|0;k[c+0>>2]=0;k[c+4>>2]=0;k[c+8>>2]=0;k[c+12>>2]=0;k[c+16>>2]=0;k[c+20>>2]=0;if(!(dh(t,g,0)|0)){e=(i[(k[K>>2]|0)+49751>>0]|0)==0?e:0;break}f=c;c=k[f>>2]|0;f=k[f+4>>2]|0;A=b+51072|0;z=k[A+4>>2]|0;if(!(f>>>0<z>>>0|((f|0)==(z|0)?c>>>0<(k[A>>2]|0)>>>0:0))){if((i[g+8204>>0]|0)!=0?(A=a,z=k[A+4>>2]|0,!(f>>>0<z>>>0|((f|0)==(z|0)?c>>>0<(k[A>>2]|0)>>>0:0))):0)break;e=0}}while(0);z=b+51163|0;do if(i[z>>0]|0){A=Zg(a)|0;c=k[K>>2]|0;if(A){if(i[c+41508>>0]|0)break;Kf(32944,1);c=k[K>>2]|0;k[c+75176>>2]=22;e=0;break}else{k[c+75176>>2]=22;a=0;r=Q;return a|0}}else c=k[K>>2]|0;while(0);c=c+66980|0;if(k[c>>2]|0)Lc(t,c,2048)|0;A=b+78264|0;o=b+42857|0;c=i[o>>0]|0;if((k[A>>2]|0)==3)c=c<<24>>24!=0;else c=(c+-13&255)>16;u=b+42858|0;if(c&(i[u>>0]|0)!=0){e=b+24|0;Nf(32944,e,E);k[C+68>>2]=0;k[C+72>>2]=34;k[C+64>>2]=1;k[C>>2]=e;Kf(32944,2);k[(k[K>>2]|0)+75176>>2]=14;e=0}jd(P);v=b+51264|0;x=k[v>>2]|0;w=(x|0)!=0;do if((x|0)==5|w^1){c=(e&1)!=0;if(!(ie(b)|0)){if(!c){h=78;break}e=($g(a,b,P)|0)&1;h=78;break}if(c?!((H|0)==69|(H|0)==73|(H|0)==80):0){if((k[(k[K>>2]|0)+49756>>2]|0)==1){f=1;c=0;break}f=a+21612|0;k[f>>2]=(k[f>>2]|0)+1;_g(a,b,E);f=1;c=0}else{f=1;c=0}}else if((e&1)!=0&(H|0)!=80?(i[(k[K>>2]|0)+50377>>0]|0)==0:0){i[l>>0]=0;x=Gd(t)|0;c=i[l>>0]|0;if(x&c<<24>>24==0){c=b+51104|0;Nd(k[K>>2]|0,0,t,2048,l,k[c>>2]|0,k[c+4>>2]|0,b+51072|0,0)|0;c=i[l>>0]|0}e=c<<24>>24==0?e:0;h=78}else h=78;while(0);do if((h|0)==78){if(!(e&1)){if(!(i[b+78268>>0]|0)){f=0;c=1;break}if(yi(E,0,0,1)|0){e=1;x=1}else{f=0;c=0;e=1;d=1;break}}else x=d;d=k[K>>2]|0;c=x&1;f=c|i[d+50377>>0];g=f<<24>>24!=0;q=c<<24>>24!=0;if(!q){do if((H|0)!=80&(g^1)){if(!(Cd(P)|0))break;p=b+24|0;k[C+68>>2]=0;k[C+72>>2]=58;k[C>>2]=p;k[C+64>>2]=2;k[C+4>>2]=t;Gf(32944,p,t)}while(0);d=a+21612|0;k[d>>2]=(k[d>>2]|0)+1;d=k[K>>2]|0}h=a+21616|0;k[h>>2]=(k[h>>2]|0)+1;_m(M|0,d+40996|0,516)|0;m=b+51211|0;tf(y,0,k[b+51164>>2]|0,M,(i[b+51168>>0]|0)==0?0:b+51169|0,b+51185|0,k[b+51244>>2]|0,j,m);do if(!(i[z>>0]|0))p=0;else{if(!(i[b+51201>>0]|0)){p=0;break}if(!(Mm(b+51202|0,j,8)|0)){p=0;break}if(i[b+78284>>0]|0){p=0;break}k[C+68>>2]=0;k[C+72>>2]=6;k[C+64>>2]=1;k[C>>2]=b+24;Kf(32944,11);p=1}while(0);R=a+12824|0;j=a+18688|0;l=b+51120|0;k[R+0>>2]=0;k[R+4>>2]=0;k[R+8>>2]=0;k[R+12>>2]=0;Eg(j,k[l>>2]|0,k[(k[K>>2]|0)+66976>>2]|0);Eg(a+12856|0,k[l>>2]|0,k[(k[K>>2]|0)+66976>>2]|0);R=s;d=k[R+4>>2]|0;n=a+48|0;k[n>>2]=k[R>>2];k[n+4>>2]=d;rf(y,b,P);i[a+57>>0]=f;i[a+58>>0]=c;n=g|p;do if(!n){if(i[b+78284>>0]|0)break;R=s;R=$m(k[R>>2]|0,k[R+4>>2]|0,11)|0;f=O;c=b+51104|0;d=k[c>>2]|0;c=k[c+4>>2]|0;if(!((f|0)>(c|0)|(f|0)==(c|0)&R>>>0>d>>>0))break;if(!((c|0)<0|(c|0)==0&d>>>0<1e8)?(f=ud(b)|0,c=O,R=s,s=k[R+4>>2]|0,!((c|0)>(s|0)|((c|0)==(s|0)?f>>>0>(k[R>>2]|0)>>>0:0))):0)break}while(0);f=k[K>>2]|0;i[P+19>>0]=i[f+49820>>0]^1;if(g)g=0;else g=(H|0)!=80&(q^1);do if(w){d=k[v>>2]|0;c=(d|0)==4;do if((d&-2|0)==4){Yg(a,b,b+51268|0,B,2048);if((k[B>>2]|0)==0|g^1){d=1;h=111;break}if(c){d=Jg(t,B,2048)|0;h=110;break}else{d=ah(a,P,b+24|0,t,B,2048)|0;h=110;break}}else{if((d+-1|0)>>>0>=3){k[C+68>>2]=0;k[C+72>>2]=70;k[C>>2]=b+24;k[C+64>>2]=2;k[C+4>>2]=t;d=0;h=112;break}if(!g){d=1;h=111;break}d=Sg(f,y,b,t)|0;h=110}while(0);if((h|0)==110)if(d){d=d&1;h=111}else{d=0;h=112}if((h|0)==111)if((k[A>>2]|0)!=2|g)c=1;else h=112;if((h|0)==112)c=0;i[J>>0]=g?d:0;f=d<<24>>24==0}else{if((i[b+51160>>0]|0)!=0|p){f=0;c=1;break}if(!(i[u>>0]|0)){f=b+51104|0;bh(y,k[f>>2]|0,k[f+4>>2]|0);f=0;c=1;break}f=a+21608|0;c=b+51248|0;Uh(k[f>>2]|0,k[b+51252>>2]|0,(i[c>>0]|0)!=0);f=k[f>>2]|0;B=b+51104|0;C=k[B+4>>2]|0;d=f+19520|0;k[d>>2]=k[B>>2];k[d+4>>2]=C;i[f+19544>>0]=0;d=i[o>>0]|0;if(!((k[A>>2]|0)!=3&(d&255)<16)){Vh(f,d&255,(i[c>>0]|0)!=0);f=0;c=1;break}if((k[h>>2]|0)>>>0>1)d=(i[b+78268>>0]|0)!=0;else d=0;Vh(f,15,d);f=0;c=1}while(0);Vd(b);if(!(i[D>>0]|0))d=Ig(j,l,(i[b+51210>>0]|0)==0?0:m)|0;else d=0;do if(!(i[b+51248>>0]|0))i[a+21627>>0]=0;else{if(!(i[u>>0]|0))break;D=b+51104|0;C=k[D+4>>2]|0;if((C|0)<0|(C|0)==0&(k[D>>2]|0)>>>0<1|d^1)break;i[a+21627>>0]=1}while(0);do if(c&(q^1)&(p|d^1)){b:do if(!p){do if(i[z>>0]|0){if((i[b+51201>>0]|0)!=0?(i[b+78284>>0]|0)==0:0)break;if(i[a+21627>>0]|0)break;k[G+68>>2]=0;k[G+72>>2]=4;k[G>>2]=b+24;k[G+64>>2]=2;k[G+4>>2]=E;break b}while(0);k[F+68>>2]=0;k[F+72>>2]=3;k[F>>2]=b+24;k[F+64>>2]=2;k[F+4>>2]=E}while(0);Kf(32944,3);d=(k[K>>2]|0)+75176|0;if((k[d>>2]|0)==15){d=1;break}k[d>>2]=p?24:12;d=1}else d=0;while(0);do if(!n){if(!((H|0)==69|(H|0)==88))break;if(w?(k[v>>2]|0)!=5|f:0)break;if(d?(i[(k[K>>2]|0)+49820>>0]|0)==0:0)break;c=b+51072|0;f=b+51088|0;ld(P)|0;d=k[K>>2]|0;do if((i[d+49808>>0]|0)!=0&(k[A>>2]|0)==3){if(!(i[b+59461>>0]|0))break;Mg(b,P+24|0);d=k[K>>2]|0}while(0);Ad(P,(k[d+58772>>2]|0)==0?0:c,(k[d+58780>>2]|0)==0?0:f);do if(!(i[(k[K>>2]|0)+50340>>0]|0)){d=P+24|0;if(Ld(d,k[b+42860>>2]|0)|0)break;k[N+68>>2]=0;k[N+72>>2]=16;k[N>>2]=b+24;k[N+64>>2]=2;k[N+4>>2]=d}while(0);i[J>>0]=1}while(0);Zf(M);f=0;c=1;d=x}while(0);kd(P);e=(e&1)!=0;if(!c){a=f;r=Q;return a|0}d=(d&1)==0;if(I){a=a+21620|0;k[a>>2]=(k[a>>2]|0)+1}}if(i[L>>0]|0){a=0;r=Q;return a|0}do if(!e){if(!(i[b+78268>>0]|0)){Vd(b);break}if(d){a=0;r=Q;return a|0}}while(0);a=1;r=Q;return a|0}else if((d|0)==119?(i[a+29821>>0]|0)!=0:0)Qg(k[K>>2]|0,b,a+29824|0);Vd(b);a=1;r=Q;return a|0}function Yg(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;var f=0;f=a+8|0;Lc(d,(k[f>>2]|0)+16408|0,e)|0;a=(k[f>>2]|0)+16408|0;if((k[a>>2]|0)!=0?(a=Rc(a)|0,!(Pc(k[a>>2]|0)|0)):0)Vc(d,e);a=k[f>>2]|0;if(i[a+58768>>0]|0){Mc(d,Oc(b+78340|0)|0,e)|0;Tc(d,0,e);Vc(d,e);a=k[f>>2]|0}a=kk(a+32804|0)|0;a:do if(a){b=kk(c)|0;c=c+((a>>>0<b>>>0?a:b)<<2)|0;while(1){a=k[c>>2]|0;if(!a)break;else if((a|0)!=47)break a;c=c+4|0}k[d>>2]=0;return}while(0);b=k[f>>2]|0;a=k[b+75208>>2]|0;if(((a|0)==88?(k[b+49756>>2]|0)==4:0)?Qc(58)|0:0){k[d>>2]=0;b=1}else b=0;if((a|0)!=69?(k[(k[f>>2]|0)+49756>>2]|0)!=1:0)Mc(d,c,e)|0;else Mc(d,Oc(c)|0,e)|0;a=ve(k[d>>2]|0)|0;if(!b)return;c=d+4|0;if((k[c>>2]|0)==95?(Pc(k[d+8>>2]|0)|0)&(a|0)>64&(a|0)<91:0){k[c>>2]=58;return}if((k[d>>2]|0)!=95)return;if((k[c>>2]|0)!=95)return;k[d>>2]=47;k[c>>2]=47;return}function Zg(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0;g=r;r=r+640|0;e=g;d=g+512|0;a=a+8|0;b=k[a>>2]|0;if(!(i[b+41508>>0]|0)){c=k[b+75184>>2]|0;if(!c){f=0;r=g;return f|0}k[e>>2]=0;if((pc[c&15](4,k[b+75180>>2]|0,e,128)|0)!=-1){if(!(k[e>>2]|0))f=6}else{k[e>>2]=0;f=6}if((f|0)==6){i[d>>0]=0;f=k[a>>2]|0;if((pc[k[f+75184>>2]&15](2,k[f+75180>>2]|0,d,128)|0)==-1)i[d>>0]=0;Xc(d,0,e,128)|0;_f(d,128)}Yf((k[a>>2]|0)+40996|0,e);_f(e,512);f=k[a>>2]|0;i[f+41513>>0]=1;if(!(i[f+41508>>0]|0)){f=0;r=g;return f|0}}f=1;r=g;return f|0}function _g(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;l=r;r=r+8272|0;j=l+8192|0;d=l+8268|0;h=l;e=a+8|0;c=k[e>>2]|0;if(i[c+50377>>0]|0){r=l;return}f=a+29824|0;g=b+42860|0;c=Dd(f,(i[c+50340>>0]|0)==0,k[g>>2]|0)|0;a:do if(c){do if(Gd(f)|0){if(!(Hd(Kd(f)|0)|0)){c=b+51104|0;Nd(k[e>>2]|0,0,f,2048,d,k[c>>2]|0,k[c+4>>2]|0,b+51072|0,0)|0;break}if(!c){m=10;break a}if(!(i[(k[e>>2]|0)+50340>>0]|0))Ld(f,k[g>>2]|0)|0;i[a+29821>>0]=1;break a}while(0);Ed(f,1)|0;if(Dd(f,(i[(k[e>>2]|0)+50340>>0]|0)==0,k[g>>2]|0)|0){Lc(h,f,2048)|0;$c(f,1);Ed(f,1)|0;c=b+24|0;if(!(Dd(f,(i[(k[e>>2]|0)+50340>>0]|0)==0,k[g>>2]|0)|0)){k[j+68>>2]=0;k[j+72>>2]=33;k[j>>2]=c;k[j+4>>2]=h;k[j+64>>2]=3;k[j+8>>2]=f;m=10;break}k[j+68>>2]=0;k[j+72>>2]=19;k[j>>2]=c;k[j+64>>2]=2;k[j+4>>2]=f;k[(k[e>>2]|0)+75176>>2]=16;Kf(32944,9);if(!(i[a+29821>>0]|0)){r=l;return}}else m=10}else m=10;while(0);if((m|0)==10)i[a+29821>>0]=1;m=k[e>>2]|0;Fd(f,(k[m+58772>>2]|0)==0?0:b+51072|0,(k[m+58776>>2]|0)==0?0:b+51080|0,(k[m+58780>>2]|0)==0?0:b+51088|0);r=l;return}function $g(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0;n=r;r=r+8272|0;l=n+8192|0;m=n+8268|0;j=n;h=a+8|0;g=k[h>>2]|0;d=k[g+75208>>2]|0;if((d|0)==69|(d|0)==88){if(i[g+50377>>0]|0){m=1;r=n;return m|0}e=a+29824|0;f=b+51104|0;d=f;a=b+51072|0;if(Nd(g,c,e,2048,m,k[d>>2]|0,k[d+4>>2]|0,a,1)|0){m=1;r=n;return m|0}if(i[m>>0]|0){m=0;r=n;return m|0}d=b+24|0;Mf(32944,d,e);k[(k[h>>2]|0)+75176>>2]=16;if(_c(e)|0){m=0;r=n;return m|0}k[l+68>>2]=0;k[l+72>>2]=106;k[l+64>>2]=1;k[l>>2]=d;Lc(j,e,2048)|0;$c(e,1);Ed(e,1)|0;g=f;if(Nd(k[h>>2]|0,c,e,2048,m,k[g>>2]|0,k[g+4>>2]|0,a,1)|0){k[l+68>>2]=0;k[l+72>>2]=33;k[l>>2]=d;k[l+4>>2]=j;k[l+64>>2]=3;k[l+8>>2]=e;m=1;r=n;return m|0}else{Mf(32944,d,e);m=0;r=n;return m|0}}else if((d|0)==80){k[c+12>>2]=1;m=1;r=n;return m|0}else{m=1;r=n;return m|0}return 0}function ah(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;i=r;r=r+8304|0;g=i+8220|0;h=i;bd(e,e,f);jd(h);if(!(od(h,e)|0)){k[g+68>>2]=0;k[g+72>>2]=17;k[g>>2]=c;k[g+4>>2]=e;k[g+64>>2]=3;k[g+8>>2]=d;k[g+68>>2]=0;k[g+72>>2]=18;k[g+64>>2]=1;k[g>>2]=c;k[(k[a+8>>2]|0)+75176>>2]=23;g=0;kd(h);r=i;return g|0}c=zm(0,1048576)|0;e=(c|0)==0;if(e)Af(32944);while(1){xe();f=rd(h,c,1048576)|0;if(!f)break;qd(b,c,f)|0}if(e){g=1;kd(h);r=i;return g|0}ym(c);g=1;kd(h);r=i;return g|0}function bh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;g=zm(0,262144)|0;h=(g|0)==0;if(h)Af(32944);while(1){if(!((c|0)>-1|(c|0)==-1&b>>>0>4294967295)){e=b;d=b;f=4;break}d=pf(a,g,262144)|0;if((d|0)==0|(d|0)==-1)break;d=0<(c|0)|0==(c|0)&d>>>0<b>>>0?d:b;qf(a,g,d);d=Um(b|0,c|0,d|0,0)|0;c=O;b=d}a:do if((f|0)==4)while(1){b=pf(a,g,262144)|0;if((b|0)==0|(b|0)==-1)break a;qf(a,g,0<(c|0)|0==(c|0)&b>>>0<d>>>0?b:e)}while(0);if(h)return;ym(g);return}function ch(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;F=r;r=r+30800|0;v=F+24576|0;t=F;u=F+28752|0;s=F+26704|0;A=F+24656|0;z=F+16384|0;q=F+8192|0;B=k[a+36172>>2]|0;C=a+36204|0;D=k[C>>2]|0;E=(D|0)==3?a+60048|0:a+42832|0;do if((D&-2|0)==2){d=(i[E+8329>>0]|0)!=0;f=(b|0)!=0;if(f&d){if((k[a+78264>>2]|0)!=3){if((l[E+25>>0]|0)<=19){y=1;x=1;break}if((k[E+8292>>2]|0)==-1){y=1;x=1;break}}if(Ig(b+12840|0,E+8288|0,(i[E+8378>>0]|0)==0?0:E+8379|0)|0){y=1;x=1}else{k[v+68>>2]=0;k[v+72>>2]=5;k[v>>2]=a+24;k[v+64>>2]=2;k[v+4>>2]=E+32;y=1;x=1}}else{y=d;x=f}}else{y=0;x=(b|0)!=0}while(0);e=nc[k[(k[a>>2]|0)+20>>2]&15](a)|0;g=O;if(x){o=ud(a)|0;p=b+12824|0;j=p;o=Vm(k[j>>2]|0,k[j+4>>2]|0,o|0,O|0)|0;k[p>>2]=o;k[p+4>>2]=O}ld(a)|0;h=a+24|0;ik(z,h)|0;Zc(z,2048,(i[a+78274>>0]|0)==0);j=(i[B+49821>>0]|0)!=0?4:0;a:do if(kc[k[(k[a>>2]|0)+8>>2]&31](a,z,j)|0){d=B+75184|0;f=A}else{c=b+12832|0;d=B+75184|0;m=B+75188|0;n=B+75180|0;o=z;p=A;b:do if(x){f=c;k[f>>2]=0;k[f+4>>2]=0;ik(q,h)|0;Zc(q,2048,1);if(kc[k[(k[a>>2]|0)+8>>2]&31](a,q,j)|0)w=28;else while(1){if(k[d>>2]|0){ik(t,z)|0;if((pc[k[d>>2]&15](3,k[n>>2]|0,o,0)|0)!=-1){if(!(hk(t,z)|0)){me(z,A,2048)|0;cn(u|0,A|0)|0;if((pc[k[d>>2]&15](0,k[n>>2]|0,p,0)|0)!=-1)if(!(Nm(u,A)|0)){f=0;w=22}else ne(A,z,2048)|0;else{f=1;w=22}}}else{f=1;w=22}}else{f=0;w=22}do if((w|0)==22){w=0;if(!(k[m>>2]|0))if(f)break b;else break;me(z,s,2048)|0;if(!(rc[k[m>>2]&15](s,0)|0))break b;ne(s,z,2048)|0;if(f)break b}while(0);if(kc[k[(k[a>>2]|0)+8>>2]&31](a,z,j)|0){f=A;break a}q=c;k[q>>2]=0;k[q+4>>2]=0}}else{ik(q,h)|0;Zc(q,2048,1);if(kc[k[(k[a>>2]|0)+8>>2]&31](a,q,j)|0)w=28;else while(1){if(k[d>>2]|0){ik(t,z)|0;if((pc[k[d>>2]&15](3,k[n>>2]|0,o,0)|0)!=-1){if(!(hk(t,z)|0)){me(z,A,2048)|0;cn(u|0,A|0)|0;if((pc[k[d>>2]&15](0,k[n>>2]|0,p,0)|0)!=-1)if(!(Nm(u,A)|0)){f=0;w=35}else ne(A,z,2048)|0;else{f=1;w=35}}}else{f=1;w=35}}else{f=0;w=35}do if((w|0)==35){w=0;if(!(k[m>>2]|0))if(f)break b;else break;me(z,s,2048)|0;if(!(rc[k[m>>2]&15](s,0)|0))break b;ne(s,z,2048)|0;if(f)break b}while(0);if(kc[k[(k[a>>2]|0)+8>>2]&31](a,z,j)|0){f=A;break a}}}while(0);if((w|0)==28){ik(z,q)|0;f=A;break}k[B+75176>>2]=15;k[v+68>>2]=0;k[v+72>>2]=68;k[v+64>>2]=1;k[v>>2]=z;kc[k[(k[a>>2]|0)+8>>2]&31](a,h,j)|0;sc[k[(k[a>>2]|0)+16>>2]&15](a,e,g,0);a=0;r=F;return a|0}while(0);Td(a,1);me(z,f,2048)|0;c=k[d>>2]|0;if(c){e=B+75180|0;if((pc[c&15](3,k[e>>2]|0,z,1)|0)==-1){a=0;r=F;return a|0}if((pc[k[d>>2]&15](0,k[e>>2]|0,A,1)|0)==-1){a=0;r=F;return a|0}}d=k[B+75188>>2]|0;if((d|0)!=0?(rc[d&15](f,1)|0)==0:0){a=0;r=F;return a|0}if(y)ee(a,D)|0;else ae(a)|0;if((k[C>>2]|0)==2){je(a);A=k[(k[a>>2]|0)+16>>2]|0;z=a+78256|0;C=a+51096|0;C=Um(k[z>>2]|0,k[z+4>>2]|0,k[C>>2]|0,k[C+4>>2]|0)|0;sc[A&15](a,C,O,0)}if(!x){a=1;r=F;return a|0}if((D|0)==5)i[b+12777>>0]=0;else{i[b+12777>>0]=i[E+8329>>0]|0;C=E+8264|0;D=k[C+4>>2]|0;a=b+32|0;k[a>>2]=k[C>>2];k[a+4>>2]=D}a=b+12808|0;k[a>>2]=0;k[a+4>>2]=0;Eg(b+12840|0,k[E+8288>>2]|0,k[B+66976>>2]|0);a=1;r=F;return a|0}function dh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0;g=r;r=r+2128|0;e=g+80|0;f=g;d=b+8236|0;i[d>>0]=0;me(a,e,2048)|0;if(c){if(bb(e|0,f|0)|0){f=ac()|0;i[d>>0]=(k[f>>2]|0)!=2&1;f=0;r=g;return f|0}}else if(jb(e|0,f|0)|0){f=ac()|0;i[d>>0]=(k[f>>2]|0)!=2&1;f=0;r=g;return f|0}e=b+8200|0;k[e>>2]=k[f+12>>2];d=k[f+36>>2]|0;c=b+8192|0;k[c>>2]=d;k[c+4>>2]=((d|0)<0)<<31>>31;ef(b+8208|0,k[f+56>>2]|0)|0;ef(b+8224|0,k[f+48>>2]|0)|0;ef(b+8216|0,k[f+64>>2]|0)|0;Lc(b,a,2048)|0;k[b+8232>>2]=0;f=(Hd(k[e>>2]|0)|0)&1;i[b+8204>>0]=f;f=(Id(k[e>>2]|0)|0)&1;i[b+8205>>0]=f;f=1;r=g;return f|0}function eh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0;Ym(a+184|0,0,152)|0;d=k[a+172>>2]|0;k[a+336>>2]=d;e=k[a>>2]|0;b=((((e|0)/8|0)>>>0)/12|0)*84|0;e=e-b|0;c=(((e>>>0)/12|0)<<4)+16|0;f=d+c|0;k[a+340>>2]=f;k[a+176>>2]=f;k[a+348>>2]=d+e;k[a+180>>2]=d+(c+(((b>>>0)/12|0)<<4));i[a+4>>0]=1;i[a+5>>0]=2;i[a+6>>0]=3;i[a+7>>0]=4;i[a+8>>0]=6;i[a+9>>0]=8;i[a+10>>0]=10;i[a+11>>0]=12;i[a+12>>0]=15;i[a+13>>0]=18;i[a+14>>0]=21;i[a+15>>0]=24;b=12;c=28;while(1){i[a+b+4>>0]=c;b=b+1|0;if((b|0)==38)break;else c=c+4|0}i[a+170>>0]=0;b=0;c=0;do{f=c;c=c+1|0;b=((l[a+b+4>>0]|0|0)<(c|0)&1)+b|0;i[a+f+42>>0]=b}while((c|0)!=128);return}function fh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0;e=a+170|0;if((i[e>>0]|0)==0?(i[e>>0]=-1,Xh(a),c=a+(b<<2)+184|0,f=k[c>>2]|0,(f|0)!=0):0){k[c>>2]=k[f>>2];a=f;return a|0}else c=b;while(1){c=c+1|0;if((c|0)==38){d=5;break}f=a+(c<<2)+184|0;d=k[f>>2]|0;if(d){g=d;d=8;break}}if((d|0)==5){i[e>>0]=(i[e>>0]|0)+-1<<24>>24;c=l[a+b+4>>0]|0;d=c*12|0;e=a+348|0;f=k[e>>2]|0;if((f-(k[a+336>>2]|0)|0)<=(d|0)){a=0;return a|0}k[e>>2]=f+(0-d);b=a+340|0;a=(k[b>>2]|0)+(0-(c<<4))|0;k[b>>2]=a;return a|0}else if((d|0)==8){k[f>>2]=k[g>>2];e=l[a+b+4>>0]|0;f=(l[a+c+4>>0]|0)-e|0;e=e<<4;c=g+e|0;d=l[a+(f+-1)+42>>0]|0;if((l[a+d+4>>0]|0)!=(f|0)){b=d+-1|0;d=a+(b<<2)+184|0;k[c>>2]=k[d>>2];k[d>>2]=c;c=l[a+b+4>>0]|0;f=f-c|0;c=g+((c<<4)+e)|0}a=a+(l[a+(f+-1)+42>>0]<<2)+184|0;k[c>>2]=k[a>>2];k[a>>2]=c;a=g;return a|0}return 0}function gh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0;Ym(a+1648|0,0,256)|0;g=a+19088|0;eh(g);e=a+1636|0;b=k[e>>2]|0;o=a+1644|0;k[o>>2]=(b|0)<12?~b:-13;h=a+19268|0;c=k[h>>2]|0;n=a+19264|0;do if((c|0)==(k[n>>2]|0)){c=a+19272|0;d=k[c>>2]|0;if(!d){d=fh(g,0)|0;b=k[e>>2]|0;break}else{k[c>>2]=k[d>>2];break}}else{d=c+-16|0;k[h>>2]=d}while(0);k[a+1616>>2]=d;f=a+1608|0;k[f>>2]=d;k[d+12>>2]=0;k[a+1632>>2]=b;j[d>>1]=256;j[d+4>>1]=257;e=l[a+19257>>0]|0;b=a+(e<<2)+19272|0;c=k[b>>2]|0;if(!c){c=k[n>>2]|0;b=a+e+19092|0;d=(l[b>>0]|0)<<4;p=c+d|0;k[n>>2]=p;if(p>>>0>(k[h>>2]|0)>>>0){k[n>>2]=c+(d-((l[b>>0]|0)<<4));c=fh(g,e)|0}}else k[b>>2]=k[c>>2];k[(k[f>>2]|0)+8>>2]=c;k[a+1620>>2]=c;k[a+1640>>2]=k[o>>2];i[a+2673>>0]=0;b=0;do{i[c+(b<<3)>>0]=b;i[c+(b<<3)+1>>0]=1;k[c+(b<<3)+4>>2]=0;b=b+1|0}while((b|0)!=256);c=0;do{b=c+2|0;d=0;do{p=16384-((m[50984+(d<<1)>>1]|0|0)/(b|0)|0)&65535;j[a+(c<<7)+(d<<1)+2676>>1]=p;j[a+(c<<7)+(d+8<<1)+2676>>1]=p;j[a+(c<<7)+(d+16<<1)+2676>>1]=p;j[a+(c<<7)+(d+24<<1)+2676>>1]=p;j[a+(c<<7)+(d+32<<1)+2676>>1]=p;j[a+(c<<7)+(d+40<<1)+2676>>1]=p;j[a+(c<<7)+(d+48<<1)+2676>>1]=p;j[a+(c<<7)+(d+56<<1)+2676>>1]=p;d=d+1|0}while((d|0)!=8);c=c+1|0}while((c|0)!=128);b=0;do{p=(b*40|0)+80&65535;i[a+(b<<6)+4>>0]=3;j[a+(b<<6)+2>>1]=p;i[a+(b<<6)+5>>0]=4;i[a+(b<<6)+8>>0]=3;j[a+(b<<6)+6>>1]=p;i[a+(b<<6)+9>>0]=4;i[a+(b<<6)+12>>0]=3;j[a+(b<<6)+10>>1]=p;i[a+(b<<6)+13>>0]=4;i[a+(b<<6)+16>>0]=3;j[a+(b<<6)+14>>1]=p;i[a+(b<<6)+17>>0]=4;i[a+(b<<6)+20>>0]=3;j[a+(b<<6)+18>>1]=p;i[a+(b<<6)+21>>0]=4;i[a+(b<<6)+24>>0]=3;j[a+(b<<6)+22>>1]=p;i[a+(b<<6)+25>>0]=4;i[a+(b<<6)+28>>0]=3;j[a+(b<<6)+26>>1]=p;i[a+(b<<6)+29>>0]=4;i[a+(b<<6)+32>>0]=3;j[a+(b<<6)+30>>1]=p;i[a+(b<<6)+33>>0]=4;i[a+(b<<6)+36>>0]=3;j[a+(b<<6)+34>>1]=p;i[a+(b<<6)+37>>0]=4;i[a+(b<<6)+40>>0]=3;j[a+(b<<6)+38>>1]=p;i[a+(b<<6)+41>>0]=4;i[a+(b<<6)+44>>0]=3;j[a+(b<<6)+42>>1]=p;i[a+(b<<6)+45>>0]=4;i[a+(b<<6)+48>>0]=3;j[a+(b<<6)+46>>1]=p;i[a+(b<<6)+49>>0]=4;i[a+(b<<6)+52>>0]=3;j[a+(b<<6)+50>>1]=p;i[a+(b<<6)+53>>0]=4;i[a+(b<<6)+56>>0]=3;j[a+(b<<6)+54>>1]=p;i[a+(b<<6)+57>>0]=4;i[a+(b<<6)+60>>0]=3;j[a+(b<<6)+58>>1]=p;i[a+(b<<6)+61>>0]=4;i[a+(b<<6)+64>>0]=3;j[a+(b<<6)+62>>1]=p;i[a+(b<<6)+65>>0]=4;b=b+1|0}while((b|0)!=25);return}function hh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;A=r;r=r+16|0;t=A+6|0;v=A;w=m[a>>1]|0;u=w+-1|0;z=b+1620|0;c=k[z>>2]|0;x=a+4|0;y=a+8|0;if((c|0)==(k[y>>2]|0))s=c;else{e=c;d=k[e>>2]|0;e=k[e+4>>2]|0;while(1){f=c+-8|0;n=f;q=k[n+4>>2]|0;s=c;k[s>>2]=k[n>>2];k[s+4>>2]=q;s=f;k[s>>2]=d;k[s+4>>2]=e;if((f|0)==(k[y>>2]|0)){s=f;break}else c=f}}q=s+1|0;i[q>>0]=(l[q>>0]|0)+4;q=s+1|0;d=l[q>>0]|0;c=((m[x>>1]|0)+4&65535)-d|0;n=(k[b+1632>>2]|0)!=0&1;d=(n+d|0)>>>1;e=d&255;i[q>>0]=e;d=d&255;j[x>>1]=d;q=s+(w<<3)|0;f=u;p=s;while(1){o=p+8|0;B=p+9|0;h=l[B>>0]|0;c=c-h|0;h=(h+n|0)>>>1;g=h&255;i[B>>0]=g;j[x>>1]=(h&255)+(d&65535);if((g&255)>(e&255)){h=i[o>>0]|0;e=o+2|0;j[t+0>>1]=j[e+0>>1]|0;j[t+2>>1]=j[e+2>>1]|0;j[t+4>>1]=j[e+4>>1]|0;e=o;while(1){d=e+-8|0;D=d;C=k[D+4>>2]|0;B=e;k[B>>2]=k[D>>2];k[B+4>>2]=C;if((d|0)==(k[y>>2]|0))break;if((g&255)>(l[e+-15>>0]|0))e=d;else break}i[d>>0]=h;i[e+-7>>0]=g;D=d+2|0;j[D+0>>1]=j[t+0>>1]|0;j[D+2>>1]=j[t+2>>1]|0;j[D+4>>1]=j[t+4>>1]|0}f=f+-1|0;if(!f)break;d=j[x>>1]|0;e=i[p+9>>0]|0;p=o}if(!(i[q+-7>>0]|0)){f=0;d=s+(u<<3)|0;while(1){f=f+1|0;if(!(i[d+-7>>0]|0))d=d+-8|0;else break}c=f+c|0;D=(m[a>>1]|0)-f|0;d=D&65535;j[a>>1]=d;if((D&65535|0)==1){d=k[y>>2]|0;f=j[d>>1]|0;e=f&255;D=d+2|0;j[v+0>>1]=j[D+0>>1]|0;j[v+2>>1]=j[D+2>>1]|0;j[v+4>>1]=j[D+4>>1]|0;f=(f&65535)>>>8&65535;do{f=f&255;f=f-(f>>>1)|0;c=c>>1}while((c|0)>1);c=f;D=b+(l[b+(((w+1|0)>>>1)+-1)+19130>>0]<<2)+19272|0;k[d>>2]=k[D>>2];k[D>>2]=d;k[z>>2]=x;i[x>>0]=e;i[x+1>>0]=c;D=a+6|0;j[D+0>>1]=j[v+0>>1]|0;j[D+2>>1]=j[v+2>>1]|0;j[D+4>>1]=j[v+4>>1]|0;r=A;return}}else d=j[a>>1]|0;j[x>>1]=c-(c>>>1)+(m[x>>1]|0);c=(w+1|0)>>>1;g=((d&65535)+1|0)>>>1;h=k[y>>2]|0;if((c|0)==(g|0))c=h;else{C=i[b+(c+-1)+19130>>0]|0;d=C&255;D=i[b+(g+-1)+19130>>0]|0;e=D&255;do if(C<<24>>24==D<<24>>24)c=h;else{f=b+(e<<2)+19272|0;c=k[f>>2]|0;if(c){k[f>>2]=k[c>>2];_m(c|0,h|0,g<<4|0)|0;D=b+(d<<2)+19272|0;k[h>>2]=k[D>>2];k[D>>2]=h;break}f=l[b+e+19092>>0]|0;d=(l[b+d+19092>>0]|0)-f|0;f=f<<4;c=h+f|0;e=l[b+(d+-1)+19130>>0]|0;if((l[b+e+19092>>0]|0)!=(d|0)){D=e+-1|0;C=b+(D<<2)+19272|0;k[c>>2]=k[C>>2];k[C>>2]=c;c=l[b+D+19092>>0]|0;d=d-c|0;c=h+((c<<4)+f)|0}D=b+(l[b+(d+-1)+19130>>0]<<2)+19272|0;k[c>>2]=k[D>>2];k[D>>2]=c;c=h}while(0);k[y>>2]=c}k[z>>2]=c;r=A;return}function ih(a){a=a|0;var b=0,c=0,d=0,e=0;e=a+19088|0;do if(!(k[e>>2]|0)){c=a+19260|0;d=5}else{k[e>>2]=0;c=a+19260|0;ym(k[c>>2]|0);b=k[e>>2]|0;if((b|0)==1048576)break;else if(!b){d=5;break}k[e>>2]=0;ym(k[c>>2]|0);d=5}while(0);do if((d|0)==5){b=xm(1398128)|0;k[c>>2]=b;if(!b){Af(32944);break}else{k[a+19432>>2]=b+1398112;k[e>>2]=1048576;break}}while(0);i[a+2672>>0]=1;k[a+1636>>2]=2;gh(a);i[a+2160>>0]=0;i[a+2161>>0]=2;b=a+2162|0;c=b+9|0;do{i[b>>0]=4;b=b+1|0}while((b|0)<(c|0));Ym(a+2171|0,6,245)|0;i[a+1904>>0]=0;i[a+1905>>0]=1;i[a+1906>>0]=2;e=1;d=3;b=1;c=3;do{i[a+d+1904>>0]=c;b=b+-1|0;if(!b){b=e+1|0;e=b;c=c+1|0}d=d+1|0}while((d|0)!=256);b=a+2416|0;c=b+64|0;do{i[b>>0]=0;b=b+1|0}while((b|0)<(c|0));Ym(a+2480|0,8,192)|0;i[a+1604>>0]=7;return}function jh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0;d=Wh(b)|0;e=(d&32|0)!=0;if(!e)if(!(k[a+19088>>2]|0)){a=0;return a|0}else g=0;else g=((Wh(b)|0)<<20)+1048576|0;if(d&64){f=Wh(b)|0;k[c>>2]=f}h=a+19084|0;k[h>>2]=b;f=a+19064|0;k[f>>2]=0;k[a+19060>>2]=0;k[a+19068>>2]=-1;c=Wh(b)|0;k[f>>2]=c;c=Wh(k[h>>2]|0)|0|c<<8;k[f>>2]=c;c=Wh(k[h>>2]|0)|0|c<<8;k[f>>2]=c;c=Wh(k[h>>2]|0)|0|c<<8;k[f>>2]=c;if(e){d=d&31;e=d+1|0;if(e>>>0>16)e=(d*3|0)+-29|0;f=a+19088|0;d=k[f>>2]|0;if((e|0)==1){if(!d){a=0;return a|0}k[f>>2]=0;ym(k[a+19260>>2]|0);a=0;return a|0}do if((d|0)!=(g|0)){if(!d)d=a+19260|0;else{k[f>>2]=0;d=a+19260|0;ym(k[d>>2]|0)}b=((g>>>0)/12|0)<<4;c=xm(b+32|0)|0;k[d>>2]=c;if(!c){Af(32944);break}else{k[a+19432>>2]=c+(b+16);k[f>>2]=g;break}}while(0);i[a+2672>>0]=1;k[a+1636>>2]=e;gh(a);i[a+2160>>0]=0;i[a+2161>>0]=2;d=a+2162|0;e=d+9|0;do{i[d>>0]=4;d=d+1|0}while((d|0)<(e|0));Ym(a+2171|0,6,245)|0;i[a+1904>>0]=0;i[a+1905>>0]=1;i[a+1906>>0]=2;b=1;c=3;d=1;e=3;do{i[a+c+1904>>0]=e;d=d+-1|0;if(!d){d=b+1|0;b=d;e=e+1|0}c=c+1|0}while((c|0)!=256);d=a+2416|0;e=d+64|0;do{i[d>>0]=0;d=d+1|0}while((d|0)<(e|0));Ym(a+2480|0,8,192)|0;i[a+1604>>0]=7}a=(k[a+1608>>2]|0)!=0;return a|0}function kh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;w=a+1608|0;b=k[w>>2]|0;r=a+19424|0;e=k[r>>2]|0;if(b>>>0<=e>>>0){x=-1;return x|0}q=a+19432|0;c=k[q>>2]|0;if(b>>>0>c>>>0){x=-1;return x|0}if((j[b>>1]|0)!=1){v=k[b+8>>2]|0;if(v>>>0<=e>>>0|v>>>0>c>>>0){x=-1;return x|0}if(!(Yh(b,a)|0)){x=-1;return x|0}}else Zh(b,a);u=a+19068|0;d=k[u>>2]|0;n=a+19072|0;p=k[n>>2]|0;b=ka(p,d)|0;v=a+19060|0;b=(k[v>>2]|0)+b|0;k[v>>2]=b;o=a+19076|0;d=ka((k[o>>2]|0)-p|0,d)|0;k[u>>2]=d;p=a+1620|0;c=k[p>>2]|0;a:do if(!c){f=a+19064|0;g=a+19084|0;e=a+1632|0;h=a+1624|0;b:while(1){do if((d+b^b)>>>0>=16777216){if(d>>>0<32768){k[u>>2]=0-b&32767;break}d=k[r>>2]|0;c=k[e>>2]|0;b=k[w>>2]|0;do{c=c+1|0;b=k[b+12>>2]|0;if(b>>>0<=d>>>0)break b;if(b>>>0>(k[q>>2]|0)>>>0)break b}while((m[b>>1]|0)==(k[h>>2]|0));k[e>>2]=c;k[w>>2]=b;if(!(_h(b,a)|0)){b=-1;x=31;break b}d=k[u>>2]|0;c=k[n>>2]|0;b=ka(c,d)|0;b=(k[v>>2]|0)+b|0;k[v>>2]=b;d=ka((k[o>>2]|0)-c|0,d)|0;k[u>>2]=d;c=k[p>>2]|0;if(!c)continue b;else break a}while(0);d=k[f>>2]<<8;d=Wh(k[g>>2]|0)|0|d;k[f>>2]=d;d=k[u>>2]<<8;k[u>>2]=d;b=k[v>>2]<<8;k[v>>2]=b}if((x|0)==31)return b|0;k[e>>2]=c;k[w>>2]=b;x=-1;return x|0}else e=a+1632|0;while(0);b=l[c>>0]|0;if((k[e>>2]|0)==0?(s=k[c+4>>2]|0,s>>>0>(k[r>>2]|0)>>>0):0){k[a+1616>>2]=s;k[w>>2]=s}else x=23;if((x|0)==23?($h(a),t=a+2672|0,(i[t>>0]|0)==0):0){i[t>>0]=1;Ym(a+1648|0,0,256)|0}f=a+19064|0;c=a+19084|0;d=k[u>>2]|0;e=k[v>>2]|0;while(1){if((d+e^e)>>>0>=16777216){if(d>>>0>=32768)break;k[u>>2]=0-e&32767}d=k[f>>2]<<8;d=Wh(k[c>>2]|0)|0|d;k[f>>2]=d;d=k[u>>2]<<8;k[u>>2]=d;e=k[v>>2]<<8;k[v>>2]=e}return b|0}function lh(a){a=a|0;var b=0,c=0,d=0;b=a+4|0;if(!(k[b>>2]|0))return;c=0;do{d=k[a>>2]|0;mh(k[d>>2]|0,d+(c*19172|0)|0);c=c+1|0}while(c>>>0<(k[b>>2]|0)>>>0);return}function mh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0;V=r;r=r+16|0;U=V;c=b+44|0;if(!(i[c>>0]|0)){i[c>>0]=1;c=b+4|0;if(!(th(a,c,b+24|0,b+48|0)|0)){i[b+19152>>0]=1;r=V;return}}else c=b+4|0;Q=b+4|0;e=k[Q>>2]|0;d=k[b+24>>2]|0;if((e|0)>(d+(k[b+36>>2]|0)|0)){i[b+19152>>0]=1;r=V;return}P=b+19160|0;k[P>>2]=0;u=(k[b+32>>2]|0)+-1+d|0;v=b+19148|0;w=(k[v>>2]|0)+-16|0;x=(u|0)<(w|0)?u:w;y=b+19164|0;z=b+19156|0;A=b+16|0;B=b+8|0;C=b+180|0;D=b+4e3|0;E=b+7820|0;F=b+7688|0;G=b+3868|0;H=b+11640|0;I=b+11508|0;J=U+4|0;K=U+12|0;L=U+8|0;M=b+48|0;N=b+28|0;O=b+19154|0;d=e;while(1){if((d|0)>=(x|0)){if((d|0)>(u|0)){c=69;break}if((d|0)==(u|0)?(k[B>>2]|0)>=(k[N>>2]|0):0){c=69;break}if(!(((i[O>>0]|0)!=0|(d|0)<(w|0))&(d|0)<(k[v>>2]|0))){c=13;break}}d=k[y>>2]|0;if((k[P>>2]|0)>>>0>(d+-8|0)>>>0?(k[y>>2]=d<<1,t=zm(k[z>>2]|0,d*24|0)|0,k[z>>2]=t,(t|0)==0):0)Af(32944);s=k[z>>2]|0;t=k[P>>2]|0;g=t+1|0;k[P>>2]=g;p=s+(t*12|0)|0;d=k[Q>>2]|0;q=k[A>>2]|0;e=k[B>>2]|0;h=(l[q+(d+1)>>0]<<8|l[q+d>>0]<<16|l[q+(d+2)>>0])>>>(8-e|0)&65534;f=k[C>>2]|0;if(h>>>0<(k[b+(f<<2)+52>>2]|0)>>>0){n=h>>>(16-f|0);h=(l[b+n+184>>0]|0)+e|0;o=(h>>>3)+d|0;k[Q>>2]=o;h=h&7;k[B>>2]=h;d=b+(n<<1)+1208|0}else{do{f=f+1|0;if(f>>>0>=15){f=15;break}}while(h>>>0>=(k[b+(f<<2)+52>>2]|0)>>>0);n=f+e|0;o=(n>>>3)+d|0;k[Q>>2]=o;n=n&7;k[B>>2]=n;d=((h-(k[b+(f+-1<<2)+52>>2]|0)|0)>>>(16-f|0))+(k[b+(f<<2)+116>>2]|0)|0;d=b+((d>>>0>=(k[M>>2]|0)>>>0?0:d)<<1)+3256|0;h=n}d=j[d>>1]|0;e=d&65535;do if((d&65535)<256){if((g>>>0>1?(R=t+-1|0,(k[s+(R*12|0)>>2]|0)==0):0)?(S=s+(R*12|0)+4|0,T=j[S>>1]|0,(T&65535)<3):0){t=T+1<<16>>16;j[S>>1]=t;i[s+(R*12|0)+8+(t&65535)>>0]=d;k[P>>2]=(k[P>>2]|0)+-1;break}k[p>>2]=0;i[s+(t*12|0)+8>>0]=d;j[s+(t*12|0)+4>>1]=0}else{if((d&65535)<=261)if((e|0)==256){uh(a,c,U)|0;k[p>>2]=4;j[s+(t*12|0)+4>>1]=l[U>>0]|0;k[s+(t*12|0)+8>>2]=k[J>>2];s=k[z>>2]|0;t=k[P>>2]|0;k[P>>2]=t+1;k[s+(t*12|0)>>2]=4;j[s+(t*12|0)+4>>1]=l[K>>0]|0;k[s+(t*12|0)+8>>2]=k[L>>2];break}else if((e|0)==257){k[p>>2]=2;break}else{k[p>>2]=3;k[s+(t*12|0)+8>>2]=e+-258;f=k[Q>>2]|0;e=k[B>>2]|0;g=(l[q+(f+1)>>0]<<8|l[q+f>>0]<<16|l[q+(f+2)>>0])>>>(8-e|0)&65534;d=k[H>>2]|0;if(g>>>0<(k[b+(d<<2)+11512>>2]|0)>>>0){d=g>>>(16-d|0);h=(l[b+d+11644>>0]|0)+e|0;g=(h>>>3)+f|0;k[Q>>2]=g;h=h&7;k[B>>2]=h;d=b+(d<<1)+12668|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(g>>>0>=(k[b+(d<<2)+11512>>2]|0)>>>0);h=d+e|0;n=(h>>>3)+f|0;k[Q>>2]=n;h=h&7;k[B>>2]=h;d=((g-(k[b+(d+-1<<2)+11512>>2]|0)|0)>>>(16-d|0))+(k[b+(d<<2)+11576>>2]|0)|0;d=b+((d>>>0>=(k[I>>2]|0)>>>0?0:d)<<1)+14716|0;g=n}n=j[d>>1]|0;d=n&65535;if((n&65535)>=8){e=d>>>2;f=e+-1|0;d=((d&3|4)<<f)+2|0;if(f){d=(((l[q+(g+1)>>0]<<8|l[q+g>>0]<<16|l[q+(g+2)>>0])>>>(8-h|0)&65535)>>>(17-e|0))+d|0;q=h+f|0;k[Q>>2]=(q>>>3)+g;k[B>>2]=q&7}}else d=d+2|0;j[s+(t*12|0)+4>>1]=d;break}f=e+-262|0;if(f>>>0>=8){e=f>>>2;g=e+-1|0;d=((f&3|4)<<g)+2|0;if(g){d=(((l[q+(o+1)>>0]<<8|l[q+o>>0]<<16|l[q+(o+2)>>0])>>>(8-h|0)&65535)>>>(17-e|0))+d|0;h=h+g|0;o=(h>>>3)+o|0;k[Q>>2]=o;h=h&7;k[B>>2]=h}}else d=e+-260|0;f=(l[q+(o+1)>>0]<<8|l[q+o>>0]<<16|l[q+(o+2)>>0])>>>(8-h|0)&65534;e=k[D>>2]|0;if(f>>>0<(k[b+(e<<2)+3872>>2]|0)>>>0){e=f>>>(16-e|0);g=(l[b+e+4004>>0]|0)+h|0;n=(g>>>3)+o|0;k[Q>>2]=n;o=g&7;k[B>>2]=o;e=b+(e<<1)+5028|0}else{do{e=e+1|0;if(e>>>0>=15){e=15;break}}while(f>>>0>=(k[b+(e<<2)+3872>>2]|0)>>>0);g=e+h|0;n=(g>>>3)+o|0;k[Q>>2]=n;o=g&7;k[B>>2]=o;e=((f-(k[b+(e+-1<<2)+3872>>2]|0)|0)>>>(16-e|0))+(k[b+(e<<2)+3936>>2]|0)|0;e=b+((e>>>0>=(k[G>>2]|0)>>>0?0:e)<<1)+7076|0}g=j[e>>1]|0;f=g&65535;do if((g&65535)>=4){h=f>>>1;g=h+-1|0;e=((f&1|2)<<g)+1|0;if(g){if(g>>>0<=3){e=(((l[q+(n+1)>>0]<<16|l[q+n>>0]<<24|l[q+(n+2)>>0]<<8|l[q+(n+3)>>0])<<o|(l[q+(n+4)>>0]|0)>>>(8-o|0))>>>(33-h|0))+e|0;q=o+g|0;k[Q>>2]=(q>>>3)+n;k[B>>2]=q&7;break}if(g>>>0>4){g=(((l[q+(n+1)>>0]<<16|l[q+n>>0]<<24|l[q+(n+2)>>0]<<8|l[q+(n+3)>>0])<<o|(l[q+(n+4)>>0]|0)>>>(8-o|0))>>>(37-h|0)<<4)+e|0;o=h+-5+o|0;n=(o>>>3)+n|0;k[Q>>2]=n;o=o&7;k[B>>2]=o;h=g}else h=e;f=(l[q+(n+1)>>0]<<8|l[q+n>>0]<<16|l[q+(n+2)>>0])>>>(8-o|0)&65534;e=k[E>>2]|0;if(f>>>0<(k[b+(e<<2)+7692>>2]|0)>>>0){e=f>>>(16-e|0);q=(l[b+e+7824>>0]|0)+o|0;k[Q>>2]=(q>>>3)+n;k[B>>2]=q&7;e=b+(e<<1)+8848|0}else{do{e=e+1|0;if(e>>>0>=15){e=15;break}}while(f>>>0>=(k[b+(e<<2)+7692>>2]|0)>>>0);q=e+o|0;k[Q>>2]=(q>>>3)+n;k[B>>2]=q&7;e=((f-(k[b+(e+-1<<2)+7692>>2]|0)|0)>>>(16-e|0))+(k[b+(e<<2)+7756>>2]|0)|0;e=b+((e>>>0>=(k[F>>2]|0)>>>0?0:e)<<1)+10896|0}e=(m[e>>1]|0)+h|0}}else e=f+1|0;while(0);if(e>>>0>256)if(e>>>0>8192)d=(e>>>0>262144?3:2)+d|0;else d=d+1|0;k[p>>2]=1;j[s+(t*12|0)+4>>1]=d;k[s+(t*12|0)+8>>2]=e}while(0);d=k[Q>>2]|0}if((c|0)==13){i[b+19155>>0]=1;r=V;return}else if((c|0)==69){r=V;return}}function nh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0;b=a+32|0;if(!(k[b>>2]|0)){f=zk(4195328)|0;k[b>>2]=f;Ym(f|0,0,4195328)|0}f=a+24|0;if(k[f>>2]|0)return;e=k[a+28>>2]|0;b=e<<1;c=b*19172|0;c=zk(b>>>0>224022|c>>>0>4294967291?-1:c+4|0)|0;k[c>>2]=b;c=c+4|0;d=(b|0)==0;if(d){k[f>>2]=c;Ym(c|0,0,e*38344|0)|0;return}b=c+(b*19172|0)|0;a=c;do{ig(a+4|0,0);k[a+19156>>2]=0;a=a+19172|0}while((a|0)!=(b|0));k[f>>2]=c;Ym(c|0,0,e*38344|0)|0;if(d)return;d=e<<1;b=0;while(1){a=c+(b*19172|0)+19156|0;if((k[a>>2]|0)==0?(k[c+(b*19172|0)+19164>>2]=16640,e=xm(199680)|0,k[a>>2]=e,(e|0)==0):0)Af(32944);b=b+1|0;if((b|0)==(d|0))break;c=k[f>>2]|0}return}function oh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;y=r;r=r+256|0;w=y;nh(a);if(b)b=1;else{Ym(a+148|0,0,19100)|0;b=a+59100|0;c=a+84|0;d=c+36|0;do{k[c>>2]=0;c=c+4|0}while((c|0)<(d|0));c=k[b>>2]|0;k[a+19248>>2]=(c>>>0<4194304?c:4194304)&k[a+59104>>2];c=a+68|0;b=k[c>>2]|0;if(b){ym(b);k[c>>2]=0}k[a+72>>2]=0;k[a+76>>2]=0;b=0}k[a+8>>2]=0;k[a+4>>2]=0;v=a+19536|0;k[v>>2]=0;k[v+4>>2]=0;v=a+120|0;k[v+0>>2]=0;k[v+4>>2]=0;k[v+8>>2]=0;k[v+12>>2]=0;k[v+16>>2]=0;k[v+20>>2]=0;k[v+24>>2]=0;k[a+128>>2]=-1;if(!b){k[a+38736>>2]=0;k[a+38740>>2]=0;k[a+38728>>2]=0;k[a+38732>>2]=1;Ym(a+38744|0,0,368)|0;Ym(a+22420|0,0,16308)|0;i[a+58972>>0]=0;Ym(a+58564|0,0,404)|0;k[a+58560>>2]=2;k[a+58968>>2]=0;Nh(a)}u=a+28|0;b=k[u>>2]|0;v=a+24|0;d=k[v>>2]|0;if(b&2147483647){b=b<<1;c=0;do{i[d+(c*19172|0)+19153>>0]=0;i[d+(c*19172|0)+19155>>0]=0;c=c+1|0}while(c>>>0<b>>>0)}t=d+24|0;s=a+128|0;k[t+0>>2]=k[s+0>>2];k[t+4>>2]=k[s+4>>2];k[t+8>>2]=k[s+8>>2];k[t+12>>2]=k[s+12>>2];k[t+16>>2]=k[s+16>>2];t=a+148|0;_m((k[v>>2]|0)+48|0,t|0,19100)|0;p=a+32|0;q=a+20|0;j=0;d=0;e=0;b=0;a:while(1){do{c=pf(k[a>>2]|0,(k[p>>2]|0)+d|0,4194304-d&-16)|0;if((c|0)<0)break a;d=c+d|0;if(!d)break a}while((c|0)>0&(d|0)<1024);n=(c|0)==0&1;c=j;b:while(1){if((c|0)<(d|0)){h=0;f=0}else{j=c;continue a}while(1){if(h>>>0>=k[u>>2]<<1>>>0){m=h;l=f;j=c;c=0;break}j=k[v>>2]|0;k[j+(h*19172|0)>>2]=a;b=j+(h*19172|0)+19155|0;if(i[b>>0]|0){k[j+(h*19172|0)+19148>>2]=d;o=(i[j+(h*19172|0)+20>>0]|0)==0;i[j+(h*19172|0)+19154>>0]=n;i[b>>0]=0;k[j+(h*19172|0)+19168>>2]=h;if(o)x=23}else{o=j+(h*19172|0)+4|0;mg(o,(k[p>>2]|0)+c|0);k[j+(h*19172|0)+8>>2]=0;k[o>>2]=0;k[j+(h*19172|0)+19148>>2]=d-c;if((d|0)==(c|0)){m=h;l=f;j=d;c=0;b=h;break}i[j+(h*19172|0)+19152>>0]=0;i[j+(h*19172|0)+20>>0]=0;i[j+(h*19172|0)+44>>0]=0;i[j+(h*19172|0)+19154>>0]=n;i[b>>0]=0;k[j+(h*19172|0)+19168>>2]=h;x=23}if((x|0)==23?(x=0,i[j+(h*19172|0)+20>>0]=1,!(ph(a,j+(h*19172|0)+4|0,j+(h*19172|0)+24|0)|0)):0){m=h;l=f;j=c;c=1;b=h;break}b=k[j+(h*19172|0)+24>>2]|0;if(e|(b|0)>131072){i[j+(h*19172|0)+19153>>0]=1;e=1}else{f=f+1|0;e=0}g=(k[j+(h*19172|0)+36>>2]|0)+c+b|0;b=h+1|0;c=d-g|0;if((c|0)<=-1){m=b;l=f;j=g;c=0;b=h;break}if((c|0)<1024?1:(i[j+(h*19172|0)+40>>0]|0)!=0){m=b;l=f;j=g;c=0;b=h;break}else{o=h;h=b;c=g;b=o}}h=k[u>>2]|0;h=(((l>>>0)%(h>>>0)|0|0)!=0&1)+((l>>>0)/(h>>>0)|0)|0;if(l)if((m|0)==1){f=0;g=0;while(1){o=(k[v>>2]|0)+(f*19172|0)|0;k[w+(g<<3)>>2]=o;z=l-f|0;k[w+(g<<3)+4>>2]=h>>>0<z>>>0?h:z;mh(a,o);f=f+h|0;if(l>>>0<=f>>>0)break;else g=g+1|0}}else{f=0;g=0;while(1){z=w+(g<<3)|0;k[z>>2]=(k[v>>2]|0)+(f*19172|0);o=l-f|0;k[w+(g<<3)+4>>2]=h>>>0<o>>>0?h:o;pi(k[q>>2]|0,25,z);f=f+h|0;if(l>>>0<=f>>>0)break;else g=g+1|0}}if(!m)break;ki(k[q>>2]|0);l=0;do{g=k[v>>2]|0;h=g+(l*19172|0)|0;f=g+(l*19172|0)+19153|0;if(!(i[f>>0]|0)){if(!(qh(a,h)|0))break a;if(i[f>>0]|0)x=39}else x=39;if((x|0)==39?(x=0,!(rh(a,h)|0)):0)break a;if(i[g+(l*19172|0)+19152>>0]|0)break a;f=g+(l*19172|0)+19155|0;if(i[f>>0]|0){o=l;x=42;break b}if(i[g+(l*19172|0)+40>>0]|0)break a;l=l+1|0}while(l>>>0<m>>>0);if(c)break a;c=d-j|0;if((c|0)<1024){d=c;c=j;x=48;break}else c=j}if((x|0)==42){x=0;j=g+(o*19172|0)+16|0;l=g+(o*19172|0)+4|0;m=k[p>>2]|0;n=(k[j>>2]|0)+(k[l>>2]|0)-m|0;if((d|0)<=(n|0))break;d=d-n|0;an(m|0,m+n|0,d|0)|0;z=g+(o*19172|0)+32|0;n=g+(o*19172|0)+24|0;k[n>>2]=(k[z>>2]|0)-(k[l>>2]|0)+(k[n>>2]|0);k[g+(o*19172|0)+36>>2]=0;k[z>>2]=0;k[j>>2]=k[p>>2];k[l>>2]=0;if(o){z=k[v>>2]|0;n=k[z+19156>>2]|0;o=k[z+19164>>2]|0;_m(z|0,h|0,19172)|0;z=k[v>>2]|0;k[z+19156>>2]=n;k[z+19164>>2]=o;i[f>>0]=0;if(c)break;else{j=0;continue}}else j=0}else if((x|0)==48){x=0;if((d|0)<0)break;if((d|0)<=0){j=0;d=0;continue}j=k[p>>2]|0;an(j|0,j+c|0,d|0)|0;j=0;continue}if(c)break}sh(a);z=k[v>>2]|0;a=z+(b*19172|0)+24|0;k[s+0>>2]=k[a+0>>2];k[s+4>>2]=k[a+4>>2];k[s+8>>2]=k[a+8>>2];k[s+12>>2]=k[a+12>>2];k[s+16>>2]=k[a+16>>2];_m(t|0,z+(b*19172|0)+48|0,19100)|0;r=y;return}function ph(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0;n=c+12|0;k[n>>2]=0;if((i[b+8>>0]|0)==0?(g=a+120|0,f=k[g>>2]|0,(k[b>>2]|0)>(f+-7|0)):0){m=a+4|0;e=k[m>>2]|0;d=f-e|0;if((d|0)<0){a=0;return a|0}j=a+136|0;l=a+128|0;k[l>>2]=(k[j>>2]|0)-e+(k[l>>2]|0);if((e|0)>16384){if((d|0)>0){h=k[a+16>>2]|0;an(h|0,h+e|0,d|0)|0}k[m>>2]=0;k[g>>2]=d}else d=f;if((d|0)!=32768){e=pf(k[a>>2]|0,(k[a+16>>2]|0)+d|0,32768-d|0)|0;d=k[g>>2]|0;if((e|0)>0){d=d+e|0;k[g>>2]=d}}else{d=32768;e=0}g=d+-30|0;h=a+124|0;k[h>>2]=g;f=k[m>>2]|0;k[j>>2]=f;d=k[l>>2]|0;if((d|0)!=-1){l=f+-1+d|0;k[h>>2]=(g|0)<(l|0)?g:l}if((e|0)==-1){a=0;return a|0}}h=b+4|0;kg(b,0-(k[h>>2]|0)&7);l=lg(b)|0;m=l>>>8;kg(b,8);e=l>>>11;d=e&3;if((d|0)==3){a=0;return a|0}k[n>>2]=d+3;k[c+4>>2]=(m&7)+1;j=lg(b)|0;kg(b,8);g=e&3;e=0;f=0;while(1){e=((lg(b)|0)>>>8<<(f<<3))+e|0;n=(k[h>>2]|0)+8|0;d=(n>>>3)+(k[b>>2]|0)|0;k[b>>2]=d;k[h>>2]=n&7;if((f|0)==(g|0))break;else f=f+1|0}k[c>>2]=e;if((m^90^j>>>8^e^e>>>8^e>>>16)&255){a=0;return a|0}k[c+8>>2]=d;a=a+124|0;h=k[a>>2]|0;b=d+-1+e|0;k[a>>2]=(h|0)<(b|0)?h:b;i[c+16>>0]=l>>>14&1;i[c+17>>0]=l>>>15&1;a=1;return a|0}function qh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,l=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;A=r;r=r+16|0;z=A;c=k[b+19156>>2]|0;y=k[b+19160>>2]|0;u=c+(y*12|0)|0;if((y|0)<=0){a=1;r=A;return a|0}v=a+59104|0;w=a+112|0;x=a+19248|0;y=a+92|0;f=a+96|0;g=a+88|0;h=a+84|0;l=a+104|0;n=z+4|0;o=z+12|0;p=z+8|0;q=a+19252|0;s=a+19536|0;t=a+19520|0;b=c;while(1){e=k[v>>2]|0;d=k[w>>2]&e;k[w>>2]=d;c=k[x>>2]|0;if(!((c-d&e)>>>0>4099|(c|0)==(d|0))?(sh(a),c=s,B=k[c+4>>2]|0,d=t,e=k[d+4>>2]|0,(B|0)>(e|0)|((B|0)==(e|0)?(k[c>>2]|0)>>>0>(k[d>>2]|0)>>>0:0)):0){b=0;c=16;break}switch(k[b>>2]|0){case 0:{c=b+4|0;d=b+8|0;e=0;do{C=i[d+e>>0]|0;B=k[w>>2]|0;k[w>>2]=B+1;i[(k[q>>2]|0)+(k[v>>2]&B)>>0]=C;e=e+1|0}while(e>>>0<=(m[c>>1]|0)>>>0);break}case 3:{c=k[b+8>>2]|0;d=k[a+(c<<2)+84>>2]|0;if(c)do{C=c;c=c+-1|0;k[a+(C<<2)+84>>2]=k[a+(c<<2)+84>>2]}while((c|0)!=0);k[h>>2]=d;C=m[b+4>>1]|0;k[l>>2]=C;ai(a,C,d);break}case 2:{c=k[l>>2]|0;if(c)ai(a,c,k[h>>2]|0);break}case 4:{i[z>>0]=j[b+4>>1];k[n>>2]=k[b+8>>2];i[o>>0]=j[b+16>>1];k[p>>2]=k[b+20>>2];vh(a,z)|0;b=b+12|0;break}case 1:{C=b+8|0;B=k[C>>2]|0;k[f>>2]=k[y>>2];k[y>>2]=k[g>>2];k[g>>2]=k[h>>2];k[h>>2]=B;B=m[b+4>>1]|0;k[l>>2]=B;ai(a,B,k[C>>2]|0);break}default:{}}b=b+12|0;if(b>>>0>=u>>>0){b=1;c=16;break}}if((c|0)==16){r=A;return b|0}return 0}function rh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;U=r;r=r+16|0;T=U;c=b+44|0;if(!(i[c>>0]|0)){i[c>>0]=1;c=b+4|0;if(!(th(a,c,b+24|0,b+48|0)|0)){i[b+19152>>0]=1;S=0;r=U;return S|0}}else c=b+4|0;S=b+4|0;e=k[S>>2]|0;d=k[b+24>>2]|0;if((e|0)>(d+(k[b+36>>2]|0)|0)){i[b+19152>>0]=1;S=0;r=U;return S|0}q=d+-1+(k[b+32>>2]|0)|0;s=b+19148|0;t=(k[s>>2]|0)+-16|0;u=(q|0)<(t|0)?q:t;v=a+59104|0;w=a+112|0;x=a+19248|0;y=b+16|0;z=b+8|0;A=b+180|0;B=a+19252|0;C=b+4e3|0;D=a+92|0;E=a+96|0;F=a+88|0;G=a+84|0;H=a+104|0;I=b+7820|0;J=b+7688|0;K=b+3868|0;L=b+11640|0;M=b+11508|0;N=b+48|0;O=a+19536|0;P=a+19520|0;Q=b+28|0;R=b+19154|0;a:while(1){d=k[v>>2]|0;f=k[w>>2]&d;k[w>>2]=f;if((e|0)>=(u|0)){if((e|0)>(q|0)){c=1;d=69;break}if((e|0)==(q|0)?(k[z>>2]|0)>=(k[Q>>2]|0):0){c=1;d=69;break}e=k[S>>2]|0;if(!(((i[R>>0]|0)!=0|(e|0)<(t|0))&(e|0)<(k[s>>2]|0))){d=13;break}}n=k[x>>2]|0;if(!((n-f&d)>>>0>4099|(n|0)==(f|0))){sh(a);g=O;p=k[g+4>>2]|0;n=P;h=k[n+4>>2]|0;if((p|0)>(h|0)|((p|0)==(h|0)?(k[g>>2]|0)>>>0>(k[n>>2]|0)>>>0:0)){c=0;d=69;break}e=k[S>>2]|0}p=k[y>>2]|0;f=k[z>>2]|0;g=(l[p+(e+1)>>0]<<8|l[p+e>>0]<<16|l[p+(e+2)>>0])>>>(8-f|0)&65534;d=k[A>>2]|0;if(g>>>0<(k[b+(d<<2)+52>>2]|0)>>>0){d=g>>>(16-d|0);o=(l[b+d+184>>0]|0)+f|0;h=(o>>>3)+e|0;k[S>>2]=h;o=o&7;k[z>>2]=o;d=b+(d<<1)+1208|0}else{do{d=d+1|0;if(d>>>0>=15){d=15;break}}while(g>>>0>=(k[b+(d<<2)+52>>2]|0)>>>0);o=d+f|0;h=(o>>>3)+e|0;k[S>>2]=h;o=o&7;k[z>>2]=o;d=((g-(k[b+(d+-1<<2)+52>>2]|0)|0)>>>(16-d|0))+(k[b+(d<<2)+116>>2]|0)|0;d=b+((d>>>0>=(k[N>>2]|0)>>>0?0:d)<<1)+3256|0}d=j[d>>1]|0;e=d&65535;do if((d&65535)<256){n=k[w>>2]|0;k[w>>2]=n+1;i[(k[B>>2]|0)+n>>0]=d}else{if((d&65535)<=261)if((e|0)==256){if(!(uh(a,c,T)|0)){c=1;d=69;break a}vh(a,T)|0;break}else if((e|0)==257){d=k[H>>2]|0;if(!d)break;ai(a,d,k[G>>2]|0);break}else{d=e+-258|0;o=k[a+(d<<2)+84>>2]|0;if(d)do{n=d;d=d+-1|0;k[a+(n<<2)+84>>2]=k[a+(d<<2)+84>>2]}while((d|0)!=0);k[G>>2]=o;d=k[S>>2]|0;e=k[z>>2]|0;h=(l[p+(d+1)>>0]<<8|l[p+d>>0]<<16|l[p+(d+2)>>0])>>>(8-e|0)&65534;f=k[L>>2]|0;if(h>>>0<(k[b+(f<<2)+11512>>2]|0)>>>0){h=h>>>(16-f|0);n=(l[b+h+11644>>0]|0)+e|0;g=(n>>>3)+d|0;k[S>>2]=g;n=n&7;k[z>>2]=n;d=b+(h<<1)+12668|0}else{do{f=f+1|0;if(f>>>0>=15){f=15;break}}while(h>>>0>=(k[b+(f<<2)+11512>>2]|0)>>>0);n=f+e|0;g=(n>>>3)+d|0;k[S>>2]=g;n=n&7;k[z>>2]=n;d=((h-(k[b+(f+-1<<2)+11512>>2]|0)|0)>>>(16-f|0))+(k[b+(f<<2)+11576>>2]|0)|0;d=b+((d>>>0>=(k[M>>2]|0)>>>0?0:d)<<1)+14716|0}h=j[d>>1]|0;f=h&65535;if((h&65535)>=8){e=f>>>2;h=e+-1|0;d=((f&3|4)<<h)+2|0;if(h){d=(((l[p+(g+1)>>0]<<8|l[p+g>>0]<<16|l[p+(g+2)>>0])>>>(8-n|0)&65535)>>>(17-e|0))+d|0;n=n+h|0;k[S>>2]=(n>>>3)+g;k[z>>2]=n&7}}else d=f+2|0;k[H>>2]=d;ai(a,d,o);break}f=e+-262|0;if(f>>>0>=8){e=f>>>2;g=e+-1|0;d=((f&3|4)<<g)+2|0;if(g){d=(((l[p+(h+1)>>0]<<8|l[p+h>>0]<<16|l[p+(h+2)>>0])>>>(8-o|0)&65535)>>>(17-e|0))+d|0;o=o+g|0;h=(o>>>3)+h|0;k[S>>2]=h;o=o&7;k[z>>2]=o}}else d=e+-260|0;e=(l[p+(h+1)>>0]<<8|l[p+h>>0]<<16|l[p+(h+2)>>0])>>>(8-o|0)&65534;f=k[C>>2]|0;if(e>>>0<(k[b+(f<<2)+3872>>2]|0)>>>0){e=e>>>(16-f|0);o=(l[b+e+4004>>0]|0)+o|0;n=(o>>>3)+h|0;k[S>>2]=n;o=o&7;k[z>>2]=o;e=b+(e<<1)+5028|0}else{do{f=f+1|0;if(f>>>0>=15){f=15;break}}while(e>>>0>=(k[b+(f<<2)+3872>>2]|0)>>>0);o=f+o|0;n=(o>>>3)+h|0;k[S>>2]=n;o=o&7;k[z>>2]=o;e=((e-(k[b+(f+-1<<2)+3872>>2]|0)|0)>>>(16-f|0))+(k[b+(f<<2)+3936>>2]|0)|0;e=b+((e>>>0>=(k[K>>2]|0)>>>0?0:e)<<1)+7076|0}g=j[e>>1]|0;f=g&65535;do if((g&65535)>=4){g=f>>>1;h=g+-1|0;e=((f&1|2)<<h)+1|0;if(h){if(h>>>0<=3){e=(((l[p+(n+1)>>0]<<16|l[p+n>>0]<<24|l[p+(n+2)>>0]<<8|l[p+(n+3)>>0])<<o|(l[p+(n+4)>>0]|0)>>>(8-o|0))>>>(33-g|0))+e|0;g=o+h|0;k[S>>2]=(g>>>3)+n;k[z>>2]=g&7;break}if(h>>>0>4){h=(((l[p+(n+1)>>0]<<16|l[p+n>>0]<<24|l[p+(n+2)>>0]<<8|l[p+(n+3)>>0])<<o|(l[p+(n+4)>>0]|0)>>>(8-o|0))>>>(37-g|0)<<4)+e|0;o=g+-5+o|0;n=(o>>>3)+n|0;k[S>>2]=n;o=o&7;k[z>>2]=o}else h=e;e=(l[p+(n+1)>>0]<<8|l[p+n>>0]<<16|l[p+(n+2)>>0])>>>(8-o|0)&65534;f=k[I>>2]|0;if(e>>>0<(k[b+(f<<2)+7692>>2]|0)>>>0){e=e>>>(16-f|0);g=(l[b+e+7824>>0]|0)+o|0;k[S>>2]=(g>>>3)+n;k[z>>2]=g&7;e=b+(e<<1)+8848|0}else{do{f=f+1|0;if(f>>>0>=15){f=15;break}}while(e>>>0>=(k[b+(f<<2)+7692>>2]|0)>>>0);g=f+o|0;k[S>>2]=(g>>>3)+n;k[z>>2]=g&7;e=((e-(k[b+(f+-1<<2)+7692>>2]|0)|0)>>>(16-f|0))+(k[b+(f<<2)+7756>>2]|0)|0;e=b+((e>>>0>=(k[J>>2]|0)>>>0?0:e)<<1)+10896|0}e=(m[e>>1]|0)+h|0}}else e=f+1|0;while(0);if(e>>>0>256)if(e>>>0>8192)d=(e>>>0>262144?3:2)+d|0;else d=d+1|0;k[E>>2]=k[D>>2];k[D>>2]=k[F>>2];k[F>>2]=k[G>>2];k[G>>2]=e;k[H>>2]=d;ai(a,d,e)}while(0);e=k[S>>2]|0}if((d|0)==13){i[b+19155>>0]=1;S=1;r=U;return S|0}else if((d|0)==69){r=U;return c|0}return 0}function sh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;L=r;r=r+16|0;D=L;K=a+116|0;b=k[K>>2]|0;I=a+112|0;J=a+59104|0;d=k[J>>2]|0;C=(k[I>>2]|0)-b&d;H=a+68|0;E=a+72|0;a:do if(!(k[E>>2]|0))F=71;else{p=a+44|0;q=a+40|0;s=a+48|0;t=a+36|0;u=a+59100|0;v=a+19512|0;w=a+19252|0;x=a+19384|0;y=a+19256|0;z=a+19530|0;A=a+19536|0;B=a+19256|0;f=d;d=0;h=C;b:while(1){j=k[H>>2]|0;o=j+(d<<4)|0;do if((i[o>>0]|0)!=8){g=j+(d<<4)+13|0;m=k[j+(d<<4)+4>>2]|0;if(i[g>>0]|0){if((m-(k[K>>2]|0)&f)>>>0>C>>>0){j=f;g=h;break}i[g>>0]=0;j=f;g=h;break}n=k[j+(d<<4)+8>>2]|0;if((f&m-b)>>>0<h>>>0){if((m|0)==(b|0)){j=f;g=h}else{Oh(a,b,m);g=k[J>>2]|0;j=g;g=(k[I>>2]|0)-m&g;b=m}if(n>>>0>g>>>0){F=50;break b}if(n){b=j&n+m;j=k[p>>2]|0;k[q>>2]=n;if(j>>>0<n>>>0){g=k[s>>2]|0;if((g|0)!=0&g>>>0<n>>>0){k[D>>2]=g;Jf(32944,53104,D);Af(32944);j=k[p>>2]|0;g=k[q>>2]|0}else g=n;j=j+32+(j>>>2)|0;j=g>>>0>j>>>0?g:j;g=zm(k[t>>2]|0,j)|0;if(!g)Af(32944);k[t>>2]=g;k[p>>2]=j}else g=k[t>>2]|0;do if((b+-1|0)>>>0<m>>>0){j=k[u>>2]|0;l=j-m|0;if(!(i[v>>0]|0)){_m(g|0,(k[w>>2]|0)+m|0,l|0)|0;_m(g+l|0,k[w>>2]|0,b|0)|0;break}if((j|0)!=(m|0)){h=0;do{f=h+m|0;do if((k[x>>2]|0)>>>0<=f>>>0){j=1;while(1){if((k[a+(j<<2)+19384>>2]|0)>>>0>f>>>0){F=35;break}j=j+1|0;if(j>>>0>=32){F=36;break}}if((F|0)==35){F=0;j=(k[a+(j<<2)+19256>>2]|0)+(f-(k[a+(j+-1<<2)+19384>>2]|0))|0;break}else if((F|0)==36){F=0;j=k[y>>2]|0;break}}else j=(k[y>>2]|0)+f|0;while(0);i[g+h>>0]=i[j>>0]|0;h=h+1|0}while((h|0)!=(l|0))}if(b){f=0;do{do if((k[x>>2]|0)>>>0<=f>>>0){j=1;while(1){if((k[a+(j<<2)+19384>>2]|0)>>>0>f>>>0){F=43;break}j=j+1|0;if(j>>>0>=32){F=44;break}}if((F|0)==43){F=0;j=(k[a+(j<<2)+19256>>2]|0)+(f-(k[a+(j+-1<<2)+19384>>2]|0))|0;break}else if((F|0)==44){F=0;j=k[y>>2]|0;break}}else j=(k[y>>2]|0)+f|0;while(0);i[g+(f+l)>>0]=i[j>>0]|0;f=f+1|0}while((f|0)!=(b|0))}}else{if(!(i[v>>0]|0)){_m(g|0,(k[w>>2]|0)+m|0,n|0)|0;break}else h=0;do{f=h+m|0;do if((k[x>>2]|0)>>>0<=f>>>0){j=1;while(1){if((k[a+(j<<2)+19384>>2]|0)>>>0>f>>>0){F=25;break}j=j+1|0;if(j>>>0>=32){F=26;break}}if((F|0)==25){F=0;j=(k[a+(j<<2)+19256>>2]|0)+(f-(k[a+(j+-1<<2)+19384>>2]|0))|0;break}else if((F|0)==26){F=0;j=k[B>>2]|0;break}}else j=(k[B>>2]|0)+f|0;while(0);i[g+h>>0]=i[j>>0]|0;h=h+1|0}while((h|0)!=(n|0))}while(0);j=Qh(a,g,n,o)|0;i[(k[H>>2]|0)+(d<<4)>>0]=8;if(j)qf(k[a>>2]|0,j,n);i[z>>0]=1;j=A;j=Vm(k[j>>2]|0,k[j+4>>2]|0,n|0,0)|0;g=A;k[g>>2]=j;k[g+4>>2]=O;g=k[J>>2]|0;j=g;g=(k[I>>2]|0)-b&g}}else{j=f;g=h}}else{j=f;g=h}while(0);d=d+1|0;f=k[E>>2]|0;if(d>>>0>=f>>>0){j=0;break}else{f=j;h=g}}if((F|0)==50){k[K>>2]=b;f=k[E>>2]|0;if(d>>>0<f>>>0){g=k[H>>2]|0;do{if((i[g+(d<<4)>>0]|0)!=8)i[g+(d<<4)+13>>0]=0;d=d+1|0}while(d>>>0<f>>>0);j=1}else j=1}do if(!f){if(!j){F=71;break a}}else{d=0;g=0;h=0;do{if(d){C=k[H>>2]|0;f=C+(h-g<<4)|0;C=C+(h<<4)|0;k[f+0>>2]=k[C+0>>2];k[f+4>>2]=k[C+4>>2];k[f+8>>2]=k[C+8>>2];k[f+12>>2]=k[C+12>>2];f=k[E>>2]|0}g=((i[(k[H>>2]|0)+(h<<4)>>0]|0)==8&1)+g|0;h=h+1|0;d=(g|0)!=0}while(h>>>0<f>>>0);if(d?(e=f-g|0,G=a+76|0,c=k[G>>2]|0,k[E>>2]=e,c>>>0<e>>>0):0){d=k[a+80>>2]|0;if((d|0)!=0&e>>>0>d>>>0){k[D>>2]=d;Jf(32944,53104,D);Af(32944);c=k[G>>2]|0;e=k[E>>2]|0}c=c+32+(c>>>2)|0;e=e>>>0>c>>>0?e:c;c=zm(k[H>>2]|0,e<<4)|0;if(!c)Af(32944);k[H>>2]=c;k[G>>2]=e;if(j)break;else{F=71;break a}}if(!j){F=71;break a}}while(0);f=k[I>>2]|0}while(0);if((F|0)==71){Oh(a,b,k[I>>2]|0);f=k[I>>2]|0;k[K>>2]=f}e=k[a+59100>>2]|0;d=k[J>>2]|0;e=(e>>>0<4194304?e:4194304)+f&d;c=a+19248|0;k[c>>2]=e;b=k[K>>2]|0;if((e|0)!=(f|0)){if((b|0)==(f|0)){r=L;return}if((d&b-f)>>>0>=(d&e-f)>>>0){r=L;return}}k[c>>2]=b;r=L;return}function th(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;C=r;r=r+464|0;p=C+432|0;B=C;if(!(i[c+17>>0]|0)){a=1;r=C;return a|0}z=b+8|0;if((i[z>>0]|0)==0?(f=a+120|0,g=k[f>>2]|0,(k[b>>2]|0)>(g+-25|0)):0){m=a+4|0;e=k[m>>2]|0;c=g-e|0;if((c|0)<0){a=0;r=C;return a|0}n=a+136|0;o=a+128|0;k[o>>2]=(k[n>>2]|0)-e+(k[o>>2]|0);if((e|0)>16384){if((c|0)>0){y=k[a+16>>2]|0;an(y|0,y+e|0,c|0)|0}k[m>>2]=0;k[f>>2]=c}else c=g;if((c|0)!=32768){e=pf(k[a>>2]|0,(k[a+16>>2]|0)+c|0,32768-c|0)|0;c=k[f>>2]|0;if((e|0)>0){c=c+e|0;k[f>>2]=c}}else{c=32768;e=0}g=c+-30|0;h=a+124|0;k[h>>2]=g;f=k[m>>2]|0;k[n>>2]=f;c=k[o>>2]|0;if((c|0)!=-1){y=f+-1+c|0;k[h>>2]=(g|0)<(y|0)?g:y}if((e|0)==-1){a=0;r=C;return a|0}else c=0}else c=0;do{e=(lg(b)|0)>>>12;kg(b,4);do if((e&255|0)==15){e=(lg(b)|0)>>>12;kg(b,4);if(!(e&255)){i[p+c>>0]=15;break}if(c>>>0<20){x=e&255;y=-2-x|0;x=((y|0)>-1?-3-y|0:-2)-x|0;y=c+-20|0;y=x>>>0>y>>>0?x:y;Ym(p+c|0,0,0-y|0)|0;c=c-y|0}c=c+-1|0}else i[p+c>>0]=e;while(0);c=c+1|0}while(c>>>0<20);y=d+15280|0;Gh(0,p,y,20);h=b+12|0;n=b+4|0;q=d+15412|0;s=a+120|0;t=a+4|0;u=a+136|0;v=a+128|0;w=a+16|0;x=a+124|0;c=0;a:while(1){p=(c|0)<430;m=(c|0)>0;while(1){g=(i[z>>0]|0)!=0;if(!p){o=57;break a}if(!g?(A=k[s>>2]|0,(k[b>>2]|0)>(A+-5|0)):0){e=k[t>>2]|0;g=A-e|0;if((g|0)<0){c=0;o=60;break a}k[v>>2]=(k[u>>2]|0)-e+(k[v>>2]|0);if((e|0)>16384){if((g|0)>0){f=k[w>>2]|0;an(f|0,f+e|0,g|0)|0}k[t>>2]=0;k[s>>2]=g}else g=A;if((g|0)!=32768){e=pf(k[a>>2]|0,(k[w>>2]|0)+g|0,32768-g|0)|0;g=k[s>>2]|0;if((e|0)>0){g=g+e|0;k[s>>2]=g}}else{g=32768;e=0}o=g+-30|0;k[x>>2]=o;g=k[t>>2]|0;k[u>>2]=g;f=k[v>>2]|0;if((f|0)!=-1){f=g+-1+f|0;k[x>>2]=(o|0)<(f|0)?o:f}if((e|0)==-1){c=0;o=60;break a}}g=k[b>>2]|0;f=k[h>>2]|0;e=k[n>>2]|0;f=(l[f+(g+1)>>0]<<8|l[f+g>>0]<<16|l[f+(g+2)>>0])>>>(8-e|0)&65534;o=k[q>>2]|0;if(f>>>0<(k[d+(o<<2)+15284>>2]|0)>>>0){f=f>>>(16-o|0);e=(l[d+f+15416>>0]|0)+e|0;k[b>>2]=(e>>>3)+g;k[n>>2]=e&7;g=d+(f<<1)+16440|0}else{do{o=o+1|0;if(o>>>0>=15){o=15;break}}while(f>>>0>=(k[d+(o<<2)+15284>>2]|0)>>>0);e=o+e|0;k[b>>2]=(e>>>3)+g;k[n>>2]=e&7;g=((f-(k[d+(o+-1<<2)+15284>>2]|0)|0)>>>(16-o|0))+(k[d+(o<<2)+15348>>2]|0)|0;g=d+((g>>>0>=(k[y>>2]|0)>>>0?0:g)<<1)+18488|0}g=j[g>>1]|0;if((g&65535)<16){o=46;break}if((g&65535)>=18){o=54;break}e=lg(b)|0;if(g<<16>>16==16){kg(b,3);g=(e>>>13)+3|0}else{kg(b,7);g=(e>>>9)+11|0}if(m){o=52;break}}if((o|0)==46){i[B+c>>0]=g;c=c+1|0;continue}else if((o|0)==52){m=0-g|0;m=~(g+((m|0)>-1?m:-1));g=c+-430|0;g=c-(g>>>0<m>>>0?m:g)|0;while(1){i[B+c>>0]=i[B+(c+-1)>>0]|0;c=c+1|0;if((c|0)==(g|0)){c=g;continue a}}}else if((o|0)==54){e=lg(b)|0;if(g<<16>>16==18){kg(b,3);g=(e>>>13)+3|0}else{kg(b,7);g=(e>>>9)+11|0}p=0-g|0;p=~(g+((p|0)>-1?p:-1));m=c+-430|0;m=m>>>0<p>>>0?p:m;Ym(B+c|0,0,0-m|0)|0;c=c-m|0;continue}}if((o|0)==57){if(!g?(k[b>>2]|0)>(k[s>>2]|0):0){a=0;r=C;return a|0}Gh(0,B,d,306);Gh(0,B+306|0,d+3820|0,64);Gh(0,B+370|0,d+7640|0,16);Gh(0,B+386|0,d+11460|0,44);a=1;r=C;return a|0}else if((o|0)==60){r=C;return c|0}return 0}function uh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;if((i[b+8>>0]|0)==0?(g=a+120|0,e=k[g>>2]|0,(k[b>>2]|0)>(e+-16|0)):0){j=a+4|0;f=k[j>>2]|0;d=e-f|0;if((d|0)<0){b=0;return b|0}l=a+136|0;m=a+128|0;k[m>>2]=(k[l>>2]|0)-f+(k[m>>2]|0);if((f|0)>16384){if((d|0)>0){h=k[a+16>>2]|0;an(h|0,h+f|0,d|0)|0}k[j>>2]=0;k[g>>2]=d}else d=e;if((d|0)!=32768){e=pf(k[a>>2]|0,(k[a+16>>2]|0)+d|0,32768-d|0)|0;d=k[g>>2]|0;if((e|0)>0){d=d+e|0;k[g>>2]=d;h=e}else h=e}else{d=32768;h=0}g=d+-30|0;f=a+124|0;k[f>>2]=g;e=k[j>>2]|0;k[l>>2]=e;d=k[m>>2]|0;if((d|0)!=-1){j=e+-1+d|0;k[f>>2]=(g|0)<(j|0)?g:j}if((h|0)==-1){b=0;return b|0}}e=lg(b)|0;g=b+4|0;d=(k[g>>2]|0)+2|0;k[b>>2]=(d>>>3)+(k[b>>2]|0);k[g>>2]=d&7;e=e>>>14;d=0;f=0;while(1){d=((lg(b)|0)>>>8<<(f<<3))+d|0;j=(k[g>>2]|0)+8|0;k[b>>2]=(j>>>3)+(k[b>>2]|0);k[g>>2]=j&7;if((f|0)==(e|0))break;else f=f+1|0}k[c+4>>2]=d;e=lg(b)|0;d=(k[g>>2]|0)+2|0;k[b>>2]=(d>>>3)+(k[b>>2]|0);k[g>>2]=d&7;e=e>>>14;d=0;f=0;while(1){d=((lg(b)|0)>>>8<<(f<<3))+d|0;j=(k[g>>2]|0)+8|0;k[b>>2]=(j>>>3)+(k[b>>2]|0);k[g>>2]=j&7;if((f|0)==(e|0))break;else f=f+1|0}k[c+8>>2]=d;j=(lg(b)|0)>>>13&255;i[c>>0]=j;kg(b,3);if(i[c>>0]|0){b=1;return b|0}j=((lg(b)|0)>>>11)+1&255;i[c+12>>0]=j;kg(b,5);b=1;return b|0}function vh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;m=r;r=r+32|0;g=m+16|0;h=m;j=a+68|0;l=a+72|0;if((k[l>>2]|0)>>>0>8190)sh(a);c=k[a+116>>2]|0;f=k[a+112>>2]|0;if((c|0)==(f|0)){c=0;d=k[b+4>>2]|0;e=k[a+59104>>2]|0}else{e=k[a+59104>>2]|0;d=k[b+4>>2]|0;c=(e&c-f)>>>0<=d>>>0&1}i[b+13>>0]=c;k[b+4>>2]=f+d&e;k[h+0>>2]=k[b+0>>2];k[h+4>>2]=k[b+4>>2];k[h+8>>2]=k[b+8>>2];k[h+12>>2]=k[b+12>>2];c=(k[l>>2]|0)+1|0;k[l>>2]=c;f=a+76|0;d=k[f>>2]|0;if(c>>>0<=d>>>0){l=c;g=k[j>>2]|0;l=l+-1|0;l=g+(l<<4)|0;k[l+0>>2]=k[h+0>>2];k[l+4>>2]=k[h+4>>2];k[l+8>>2]=k[h+8>>2];k[l+12>>2]=k[h+12>>2];r=m;return 1}e=k[a+80>>2]|0;if((e|0)!=0&c>>>0>e>>>0){k[g>>2]=e;Jf(32944,53104,g);Af(32944);d=k[f>>2]|0;c=k[l>>2]|0}d=d+32+(d>>>2)|0;c=c>>>0>d>>>0?c:d;d=zm(k[j>>2]|0,c<<4)|0;if(!d)Af(32944);k[j>>2]=d;k[f>>2]=c;l=k[l>>2]|0;g=d;l=l+-1|0;l=g+(l<<4)|0;k[l+0>>2]=k[h+0>>2];k[l+4>>2]=k[h+4>>2];k[l+8>>2]=k[h+8>>2];k[l+12>>2]=k[h+12>>2];r=m;return 1}function wh(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;if(b)c=1;else{Ym(a+148|0,0,19100)|0;c=a+59100|0;d=a+84|0;e=d+36|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));d=k[c>>2]|0;k[a+19248>>2]=(d>>>0<4194304?d:4194304)&k[a+59104>>2];d=a+68|0;c=k[d>>2]|0;if(c){ym(c);k[d>>2]=0}k[a+72>>2]=0;k[a+76>>2]=0;c=0}k[a+8>>2]=0;r=a+4|0;k[r>>2]=0;s=a+19536|0;k[s>>2]=0;k[s+4>>2]=0;s=a+120|0;t=a+128|0;k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;k[s+12>>2]=0;k[s+16>>2]=0;k[s+20>>2]=0;k[s+24>>2]=0;k[t>>2]=-1;if(!c){k[a+38736>>2]=0;k[a+38740>>2]=0;k[a+38728>>2]=0;k[a+38732>>2]=1;Ym(a+38744|0,0,368)|0;Ym(a+22420|0,0,16308)|0;i[a+58972>>0]=0;Ym(a+58564|0,0,404)|0;k[a+58560>>2]=2;k[a+58968>>2]=0;Nh(a)}if(!b){q=a+22372|0;k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;k[q+12>>2]=0;k[q+16>>2]=0;k[q+20>>2]=0;k[a+22368>>2]=13568;k[a+22416>>2]=8193;k[a+22412>>2]=128;k[a+22408>>2]=128}o=a+22404|0;k[o>>2]=0;p=a+22364|0;k[p>>2]=0;q=a+22396|0;k[q>>2]=0;k[a+22400>>2]=0;k[s>>2]=0;c=k[r>>2]|0;if((c|0)<=0){l=a+136|0;k[t>>2]=(k[l>>2]|0)-c+(k[t>>2]|0);f=pf(k[a>>2]|0,k[a+16>>2]|0,32768)|0;c=k[s>>2]|0;if((f|0)>0){c=c+f|0;k[s>>2]=c}f=c+-30|0;d=a+124|0;k[d>>2]=f;e=k[r>>2]|0;k[l>>2]=e;c=k[t>>2]|0;if((c|0)!=-1){h=e+-1+c|0;k[d>>2]=(f|0)<(h|0)?f:h}}if(b)k[a+112>>2]=k[a+116>>2];else{c=0;do{h=c<<8&65535;j[a+(c<<1)+20570>>1]=h;j[a+(c<<1)+19546>>1]=h;j[a+(c<<1)+20058>>1]=c;j[a+(c<<1)+21082>>1]=0-c<<8;c=c+1|0}while((c|0)!=256);Ym(a+21594|0,0,768)|0;Bh(0,a+20570|0,a+21850|0);k[a+112>>2]=0}m=a+19520|0;g=m;h=k[g>>2]|0;g=k[g+4>>2]|0;c=Vm(h|0,g|0,-1,-1)|0;f=O;b=m;k[b>>2]=c;k[b+4>>2]=f;if((g|0)>0|(g|0)==0&h>>>0>0){xh(a);k[o>>2]=8;n=20}while(1){if((n|0)==20){n=0;c=m;f=k[c+4>>2]|0;c=k[c>>2]|0}if(!((f|0)>-1|(f|0)==-1&c>>>0>4294967295)){n=22;break}g=a+59104|0;f=k[g>>2]|0;h=a+112|0;c=k[h>>2]&f;k[h>>2]=c;l=k[r>>2]|0;d=k[s>>2]|0;if((l|0)>(d+-30|0)){c=d-l|0;if((c|0)<0)break;b=a+136|0;k[t>>2]=(k[b>>2]|0)-l+(k[t>>2]|0);if((l|0)>16384){if((c|0)>0){e=k[a+16>>2]|0;an(e|0,e+l|0,c|0)|0}k[r>>2]=0;k[s>>2]=c}else c=d;if((c|0)!=32768){f=pf(k[a>>2]|0,(k[a+16>>2]|0)+c|0,32768-c|0)|0;c=k[s>>2]|0;if((f|0)>0){c=c+f|0;k[s>>2]=c}}else{c=32768;f=0}l=c+-30|0;d=a+124|0;k[d>>2]=l;e=k[r>>2]|0;k[b>>2]=e;c=k[t>>2]|0;if((c|0)!=-1){b=e+-1+c|0;k[d>>2]=(l|0)<(b|0)?l:b}if((f|0)==-1)break;c=k[h>>2]|0;f=k[g>>2]|0}d=a+116|0;e=k[d>>2]|0;if(!((e-c&f)>>>0>269|(e|0)==(c|0))){i[a+19530>>0]=1;b=k[a>>2]|0;g=a+19252|0;l=(k[g>>2]|0)+e|0;if(c>>>0<e>>>0){qf(b,l,f&0-e);qf(k[a>>2]|0,k[g>>2]|0,k[h>>2]|0);i[a+19529>>0]=1}else qf(b,l,c-e|0);k[d>>2]=k[h>>2]}if(k[q>>2]|0){yh(a);n=20;continue}n=k[o>>2]|0;c=n+-1|0;k[o>>2]=c;if((n|0)<1){xh(a);k[o>>2]=7;c=7}n=k[p>>2]|0;f=n<<1;k[p>>2]=f;if(n&128)if((k[a+22412>>2]|0)>>>0>(k[a+22408>>2]|0)>>>0){zh(a);n=20;continue}else{yh(a);n=20;continue}k[o>>2]=c+-1;if((c|0)<1){xh(a);k[o>>2]=7;c=k[p>>2]|0}else c=f;k[p>>2]=c<<1;if(!(c&128)){Ah(a);n=20;continue}if((k[a+22412>>2]|0)>>>0>(k[a+22408>>2]|0)>>>0){yh(a);n=20;continue}else{zh(a);n=20;continue}}if((n|0)==22)h=a+112|0;c=k[h>>2]|0;d=a+116|0;e=k[d>>2]|0;if((c|0)!=(e|0))i[a+19530>>0]=1;f=k[a>>2]|0;g=a+19252|0;b=(k[g>>2]|0)+e|0;if(c>>>0<e>>>0){qf(f,b,k[a+59104>>2]&0-e);qf(k[a>>2]|0,k[g>>2]|0,k[h>>2]|0);i[a+19529>>0]=1;a=k[h>>2]|0;k[d>>2]=a;return}else{qf(f,b,c-e|0);a=k[h>>2]|0;k[d>>2]=a;return}}function xh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0;d=a+4|0;g=(lg(d)|0)&65520;if((k[12864]|0)>>>0<=g>>>0){c=5;e=0;while(1){c=c+1|0;b=e+1|0;if((k[51456+(b<<2)>>2]|0)>>>0>g>>>0)break;else e=b}kg(d,c);if(!b)b=0;else b=k[51456+(e<<2)>>2]|0}else{kg(d,5);c=5;b=0}g=a+(((g-b|0)>>>(16-c|0))+(k[51488+(c<<2)>>2]|0)<<1)+21082|0;d=m[g>>1]|0;f=a+22364|0;k[f>>2]=d>>>8;b=d+1|0;d=a+(d&255)+22106|0;c=i[d>>0]|0;i[d>>0]=c+1<<24>>24;if(b&255){f=b;d=c;d=d&255;a=a+(d<<1)+21082|0;d=j[a>>1]|0;j[g>>1]=d;g=f&65535;j[a>>1]=g;return}d=a+21082|0;e=a+22106|0;do{Bh(0,d,e);h=m[g>>1]|0;k[f>>2]=h>>>8;c=h+1|0;h=a+(h&255)+22106|0;b=i[h>>0]|0;i[h>>0]=b+1<<24>>24}while((c&255|0)==0);f=b&255;a=a+(f<<1)+21082|0;f=j[a>>1]|0;j[g>>1]=f;g=c&65535;j[a>>1]=g;return}function yh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,l=0,n=0;n=a+4|0;g=lg(n)|0;f=a+22368|0;b=k[f>>2]|0;do if(b>>>0<=30207){if(b>>>0>24063){d=g&65520;if((k[12952]|0)>>>0<=d>>>0){e=6;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51808+(b<<2)>>2]|0)>>>0>d>>>0)break;else c=b}kg(n,e);if(!b)b=0;else b=k[51808+(c<<2)>>2]|0}else{kg(n,6);e=6;b=0}b=((d-b|0)>>>(16-e|0))+(k[51840+(e<<2)>>2]|0)|0;break}if(b>>>0>13823){d=g&65520;if((k[12864]|0)>>>0<=d>>>0){e=5;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51456+(b<<2)>>2]|0)>>>0>d>>>0)break;else c=b}kg(n,e);if(!b)b=0;else b=k[51456+(c<<2)>>2]|0}else{kg(n,5);e=5;b=0}b=((d-b|0)>>>(16-e|0))+(k[51488+(e<<2)>>2]|0)|0;break}l=g&65520;if(b>>>0>3583){if((k[12886]|0)>>>0<=l>>>0){e=5;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51544+(b<<2)>>2]|0)>>>0>l>>>0)break;else c=b}kg(n,e);if(!b)b=0;else b=k[51544+(c<<2)>>2]|0}else{kg(n,5);e=5;b=0}b=((l-b|0)>>>(16-e|0))+(k[51576+(e<<2)>>2]|0)|0;break}else{if((k[12908]|0)>>>0<=l>>>0){e=4;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51632+(b<<2)>>2]|0)>>>0>l>>>0)break;else c=b}kg(n,e);if(!b)b=0;else b=k[51632+(c<<2)>>2]|0}else{kg(n,4);e=4;b=0}b=((l-b|0)>>>(16-e|0))+(k[51672+(e<<2)>>2]|0)|0;break}}else{d=g&65520;if((k[12932]|0)>>>0<=d>>>0){e=8;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51728+(b<<2)>>2]|0)>>>0>d>>>0)break;else c=b}kg(n,e);if(!b)b=0;else b=k[51728+(c<<2)>>2]|0}else{kg(n,8);e=8;b=0}b=((d-b|0)>>>(16-e|0))+(k[51752+(e<<2)>>2]|0)|0}while(0);c=b&255;e=a+22396|0;if(!(k[e>>2]|0)){g=a+22392|0;h=k[g>>2]|0;k[g>>2]=h+1;if((h|0)>15?(k[a+22404>>2]|0)==0:0)k[e>>2]=1}else{h=(c|0)==0&g>>>0>4095?256:c;c=h+-1|0;if(!h){b=lg(n)|0;kg(n,1);if(b&32768){k[e>>2]=0;k[a+22392>>2]=0;return}l=(b>>>14&1)+3|0;kg(n,1);d=(lg(n)|0)&65520;if((k[12864]|0)>>>0<=d>>>0){e=5;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51456+(b<<2)>>2]|0)>>>0>d>>>0)break;else c=b}kg(n,e);if(!b)b=0;else b=k[51456+(c<<2)>>2]|0}else{kg(n,5);e=5;b=0}h=((d-b|0)>>>(16-e|0))+(k[51488+(e<<2)>>2]|0)<<5;h=h|(lg(n)|0)>>>11;kg(n,5);f=a+19520|0;g=f;g=Um(k[g>>2]|0,k[g+4>>2]|0,l|0,0)|0;k[f>>2]=g;k[f+4>>2]=O;f=a+112|0;g=a+59104|0;d=a+19252|0;b=l;e=k[f>>2]|0;c=k[g>>2]|0;do{b=b+-1|0;a=k[d>>2]|0;i[a+e>>0]=i[a+(e-h&c)>>0]|0;c=k[g>>2]|0;e=(k[f>>2]|0)+1&c;k[f>>2]=e}while((b|0)!=0);return}}b=(k[f>>2]|0)+c|0;k[f>>2]=b-(b>>>8);b=a+22408|0;h=(k[b>>2]|0)+16|0;k[b>>2]=h;if(h>>>0>255){k[b>>2]=144;h=a+22412|0;k[h>>2]=(k[h>>2]|0)>>>1}g=a+(c<<1)+19546|0;c=(m[g>>1]|0)>>>8&255;b=a+112|0;h=k[b>>2]|0;k[b>>2]=h+1;i[(k[a+19252>>2]|0)+h>>0]=c;h=a+19520|0;c=h;c=Vm(k[c>>2]|0,k[c+4>>2]|0,-1,-1)|0;k[h>>2]=c;k[h+4>>2]=O;h=m[g>>1]|0;c=h+1|0;h=a+(h&255)+21594|0;b=i[h>>0]|0;i[h>>0]=b+1<<24>>24;if((c&254)>>>0>161){d=a+19546|0;e=a+21594|0;do{Bh(0,d,e);h=m[g>>1]|0;c=h+1|0;h=a+(h&255)+21594|0;b=i[h>>0]|0;i[h>>0]=b+1<<24>>24}while((c&254)>>>0>161)}a=a+((b&255)<<1)+19546|0;j[g>>1]=j[a>>1]|0;j[a>>1]=c;return}function zh(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,l=0,n=0,o=0,p=0;k[a+22392>>2]=0;b=a+22412|0;o=(k[b>>2]|0)+16|0;k[b>>2]=o;if(o>>>0>255){k[b>>2]=144;o=a+22408|0;k[o>>2]=(k[o>>2]|0)>>>1}g=a+22380|0;o=k[g>>2]|0;l=a+4|0;e=lg(l)|0;b=k[g>>2]|0;do if(b>>>0>121){d=e&65520;if((k[12814]|0)>>>0<=d>>>0){e=3;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51256+(b<<2)>>2]|0)>>>0>d>>>0)break;else c=b}kg(l,e);if(!b)b=0;else b=k[51256+(c<<2)>>2]|0}else{kg(l,3);e=3;b=0}b=((d-b|0)>>>(16-e|0))+(k[51296+(e<<2)>>2]|0)|0}else{if(b>>>0<=63){if(e>>>0<256){kg(l,16);b=e;break}else b=0;while(1){c=b+1|0;if(!(32768>>>b&e))b=c;else break}kg(l,c);break}d=e&65520;if((k[12838]|0)>>>0<=d>>>0){e=2;c=0;while(1){e=e+1|0;b=c+1|0;if((k[51352+(b<<2)>>2]|0)>>>0>d>>>0)break;else c=b}kg(l,e);if(!b)b=0;else b=k[51352+(c<<2)>>2]|0}else{kg(l,2);e=2;b=0}b=((d-b|0)>>>(16-e|0))+(k[51400+(e<<2)>>2]|0)|0}while(0);e=(k[g>>2]|0)+b|0;k[g>>2]=e-(e>>>5);e=lg(l)|0;f=a+22372|0;c=k[f>>2]|0;do if(c>>>0<=10495){g=e&65520;if(c>>>0>1791){if((k[12886]|0)>>>0<=g>>>0){c=5;d=0;while(1){c=c+1|0;e=d+1|0;if((k[51544+(e<<2)>>2]|0)>>>0>g>>>0)break;else d=e}kg(l,c);if(!e)e=0;else e=k[51544+(d<<2)>>2]|0}else{kg(l,5);c=5;e=0}h=((g-e|0)>>>(16-c|0))+(k[51576+(c<<2)>>2]|0)|0;break}else{if((k[12908]|0)>>>0<=g>>>0){c=4;d=0;while(1){c=c+1|0;e=d+1|0;if((k[51632+(e<<2)>>2]|0)>>>0>g>>>0)break;else d=e}kg(l,c);if(!e)e=0;else e=k[51632+(d<<2)>>2]|0}else{kg(l,4);c=4;e=0}h=((g-e|0)>>>(16-c|0))+(k[51672+(c<<2)>>2]|0)|0;break}}else{g=e&65520;if((k[12864]|0)>>>0<=g>>>0){c=5;d=0;while(1){c=c+1|0;e=d+1|0;if((k[51456+(e<<2)>>2]|0)>>>0>g>>>0)break;else d=e}kg(l,c);if(!e)e=0;else e=k[51456+(d<<2)>>2]|0}else{kg(l,5);c=5;e=0}h=((g-e|0)>>>(16-c|0))+(k[51488+(c<<2)>>2]|0)|0}while(0);g=(k[f>>2]|0)+h|0;k[f>>2]=g-(g>>>8);f=a+((h&255)<<1)+20570|0;g=m[f>>1]|0;e=g+1|0;g=a+(g&255)+21850|0;c=i[g>>0]|0;i[g>>0]=c+1<<24>>24;if(!(e&255)){d=a+20570|0;g=a+21850|0;do{Bh(0,d,g);p=m[f>>1]|0;e=p+1|0;p=a+(p&255)+21850|0;c=i[p>>0]|0;i[p>>0]=c+1<<24>>24}while((e&255|0)==0)}d=a+((c&255)<<1)+20570|0;j[a+(h<<1)+20570>>1]=j[d>>1]|0;j[d>>1]=e;d=(lg(l)|0)>>>8|e&65280;h=d>>>1;kg(l,7);c=a+22384|0;g=k[c>>2]|0;if(!b)if(h>>>0>(k[a+22416>>2]|0)>>>0)n=47;else{p=g+1|0;k[c>>2]=p-(p>>>8)}else if(!((b|0)==1|(b|0)==4))n=47;if((n|0)==47?(g|0)!=0:0)k[c>>2]=g+-1;e=a+22416|0;c=(h>>>0<(k[e>>2]|0)>>>0?3:4)+b|0;c=d>>>0<514?c+8|0:c;if(g>>>0>176)b=32512;else b=(o>>>0<64?(k[a+22368>>2]|0)>>>0>10751:0)?32512:8193;k[e>>2]=b;p=a+100|0;o=k[p>>2]|0;k[p>>2]=o+1;k[a+(o<<2)+84>>2]=h;k[p>>2]=k[p>>2]&3;k[a+104>>2]=c;k[a+108>>2]=h;p=a+19520|0;o=p;o=Um(k[o>>2]|0,k[o+4>>2]|0,c|0,0)|0;k[p>>2]=o;k[p+4>>2]=O;if(!c)return;f=a+112|0;g=a+59104|0;e=a+19252|0;b=c;c=k[f>>2]|0;d=k[g>>2]|0;do{b=b+-1|0;p=k[e>>2]|0;i[p+c>>0]=i[p+(c-h&d)>>0]|0;d=k[g>>2]|0;c=(k[f>>2]|0)+1&d;k[f>>2]=c}while((b|0)!=0);return}function Ah(a){a=a|0;var b=0,c=0,d=0,e=0,f=0,g=0,h=0,l=0,m=0;k[a+22392>>2]=0;m=a+4|0;b=lg(m)|0;h=a+22400|0;do if((k[h>>2]|0)==2){kg(m,1);if(b>>>0<=32767){k[h>>2]=0;b=b<<1;break}h=k[a+108>>2]|0;b=k[a+104>>2]|0;f=a+19520|0;g=f;g=Um(k[g>>2]|0,k[g+4>>2]|0,b|0,0)|0;k[f>>2]=g;k[f+4>>2]=O;if(!b)return;g=a+112|0;f=a+59104|0;e=a+19252|0;c=k[g>>2]|0;d=k[f>>2]|0;do{b=b+-1|0;a=k[e>>2]|0;i[a+c>>0]=i[a+(c-h&d)>>0]|0;d=k[f>>2]|0;c=(k[g>>2]|0)+1&d;k[g>>2]=c}while((b|0)!=0);return}while(0);d=b>>>8;f=a+22376|0;g=a+22388|0;if((k[f>>2]|0)>>>0<37){c=0;while(1){b=(c|0)==1;if(b)e=(k[g>>2]|0)+3|0;else e=k[51e3+(c<<2)>>2]|0;if(!((k[51064+(c<<2)>>2]^d)&~(255>>>e)))break;else c=c+1|0}if(b)b=(k[g>>2]|0)+3|0;else b=k[51e3+(c<<2)>>2]|0;kg(m,b);l=c}else{c=0;while(1){b=(c|0)==3;if(b)e=(k[g>>2]|0)+3|0;else e=k[51128+(c<<2)>>2]|0;if(!((k[51192+(c<<2)>>2]^d)&~(255>>>e)))break;else c=c+1|0}if(b)b=(k[g>>2]|0)+3|0;else b=k[51128+(c<<2)>>2]|0;kg(m,b);l=c}if(l>>>0<=8){k[h>>2]=0;d=(k[f>>2]|0)+l|0;k[f>>2]=d-(d>>>4);d=(lg(m)|0)&65520;if((k[12864]|0)>>>0<=d>>>0){c=5;e=0;while(1){c=c+1|0;b=e+1|0;if((k[51456+(b<<2)>>2]|0)>>>0>d>>>0)break;else e=b}kg(m,c);if(!b)b=0;else b=k[51456+(e<<2)>>2]|0}else{kg(m,5);c=5;b=0}b=((d-b|0)>>>(16-c|0))+(k[51488+(c<<2)>>2]|0)&255;c=a+(b<<1)+20058|0;d=j[c>>1]|0;if(b){h=a+(b+-1<<1)+20058|0;j[c>>1]=j[h>>1]|0;j[h>>1]=d}b=l+2|0;g=(d&65535)+1|0;h=a+100|0;f=k[h>>2]|0;k[h>>2]=f+1;k[a+(f<<2)+84>>2]=g;k[h>>2]=k[h>>2]&3;k[a+104>>2]=b;k[a+108>>2]=g;h=a+19520|0;f=h;f=Um(k[f>>2]|0,k[f+4>>2]|0,b|0,0)|0;k[h>>2]=f;k[h+4>>2]=O;if(!b)return;f=a+112|0;h=a+59104|0;e=a+19252|0;c=k[f>>2]|0;d=k[h>>2]|0;do{b=b+-1|0;a=k[e>>2]|0;i[a+c>>0]=i[a+(c-g&d)>>0]|0;d=k[h>>2]|0;c=(k[f>>2]|0)+1&d;k[f>>2]=c}while((b|0)!=0);return}if((l|0)==9){k[h>>2]=(k[h>>2]|0)+1;h=k[a+108>>2]|0;b=k[a+104>>2]|0;f=a+19520|0;g=f;g=Um(k[g>>2]|0,k[g+4>>2]|0,b|0,0)|0;k[f>>2]=g;k[f+4>>2]=O;if(!b)return;f=a+112|0;g=a+59104|0;e=a+19252|0;c=k[f>>2]|0;d=k[g>>2]|0;do{b=b+-1|0;a=k[e>>2]|0;i[a+c>>0]=i[a+(c-h&d)>>0]|0;d=k[g>>2]|0;c=(k[f>>2]|0)+1&d;k[f>>2]=c}while((b|0)!=0);return}k[h>>2]=0;if((l|0)==14){e=(lg(m)|0)&65520;if((k[12814]|0)>>>0<=e>>>0){c=3;d=0;while(1){c=c+1|0;b=d+1|0;if((k[51256+(b<<2)>>2]|0)>>>0>e>>>0)break;else d=b}kg(m,c);if(!b)b=0;else b=k[51256+(d<<2)>>2]|0}else{kg(m,3);c=3;b=0}b=(k[51296+(c<<2)>>2]|0)+5+((e-b|0)>>>(16-c|0))|0;h=(lg(m)|0)>>>1|32768;kg(m,15);k[a+104>>2]=b;k[a+108>>2]=h;f=a+19520|0;g=f;g=Um(k[g>>2]|0,k[g+4>>2]|0,b|0,0)|0;k[f>>2]=g;k[f+4>>2]=O;if(!b)return;g=a+112|0;f=a+59104|0;e=a+19252|0;c=k[g>>2]|0;d=k[f>>2]|0;do{b=b+-1|0;a=k[e>>2]|0;i[a+c>>0]=i[a+(c-h&d)>>0]|0;d=k[f>>2]|0;c=(k[g>>2]|0)+1&d;k[g>>2]=c}while((b|0)!=0);return}g=a+100|0;h=k[a+((-3-l+(k[g>>2]|0)&3)<<2)+84>>2]|0;d=(lg(m)|0)&65520;if((k[12838]|0)>>>0<=d>>>0){c=2;e=0;while(1){c=c+1|0;b=e+1|0;if((k[51352+(b<<2)>>2]|0)>>>0>d>>>0)break;else e=b}kg(m,c);if(!b)b=0;else b=k[51352+(e<<2)>>2]|0}else{kg(m,2);c=2;b=0}b=((d-b|0)>>>(16-c|0))+(k[51400+(c<<2)>>2]|0)|0;c=b+2|0;if((c|0)==257&(l|0)==10){a=a+22388|0;k[a>>2]=k[a>>2]^1;return}b=(h>>>0>=(k[a+22416>>2]|0)>>>0&1)+(h>>>0>256?b+3|0:c)|0;f=k[g>>2]|0;k[g>>2]=f+1;k[a+(f<<2)+84>>2]=h;k[g>>2]=k[g>>2]&3;k[a+104>>2]=b;k[a+108>>2]=h;f=a+19520|0;g=f;g=Um(k[g>>2]|0,k[g+4>>2]|0,b|0,0)|0;k[f>>2]=g;k[f+4>>2]=O;if(!b)return;g=a+112|0;f=a+59104|0;e=a+19252|0;c=k[g>>2]|0;d=k[f>>2]|0;do{b=b+-1|0;a=k[e>>2]|0;i[a+c>>0]=i[a+(c-h&d)>>0]|0;d=k[f>>2]|0;c=(k[g>>2]|0)+1&d;k[g>>2]=c}while((b|0)!=0);return}function Bh(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;a=b;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|7;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+64|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|6;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+128|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|5;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+192|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|4;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+256|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|3;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+320|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|2;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+384|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280|1;d=d+1|0;if((d|0)==32)break;else a=a+2|0}a=b+448|0;d=0;while(1){j[a>>1]=(m[a>>1]|0)&65280;d=d+1|0;if((d|0)==32)break;else a=a+2|0}Ym(c|0,0,256)|0;i[c+6>>0]=32;i[c+5>>0]=64;i[c+4>>0]=96;i[c+3>>0]=-128;i[c+2>>0]=-96;i[c+1>>0]=-64;i[c>>0]=-32;return}function Ch(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,P=0,Q=0;Q=a+19528|0;if(!(i[Q>>0]|0)){if(b)c=1;else{Ym(a+148|0,0,19100)|0;c=a+59100|0;d=a+84|0;e=d+36|0;do{k[d>>2]=0;d=d+4|0}while((d|0)<(e|0));c=k[c>>2]|0;k[a+19248>>2]=(c>>>0<4194304?c:4194304)&k[a+59104>>2];c=a+68|0;d=k[c>>2]|0;if(d){ym(d);k[c>>2]=0}k[a+72>>2]=0;k[a+76>>2]=0;c=0}k[a+8>>2]=0;g=a+4|0;k[g>>2]=0;e=a+19536|0;k[e>>2]=0;k[e+4>>2]=0;e=a+120|0;o=a+128|0;k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=0;k[e+16>>2]=0;k[e+20>>2]=0;k[e+24>>2]=0;k[o>>2]=-1;if(c){f=0;d=0}else{k[a+38736>>2]=0;k[a+38740>>2]=0;k[a+38728>>2]=0;k[a+38732>>2]=1;Ym(a+38744|0,0,368)|0;Ym(a+22420|0,0,16308)|0;i[a+58972>>0]=0;Ym(a+58564|0,0,404)|0;k[a+58560>>2]=2;k[a+58968>>2]=0;Nh(a);f=k[e>>2]|0;d=k[g>>2]|0}c=f-d|0;if((c|0)<0)return;n=a+136|0;k[o>>2]=(k[n>>2]|0)-d+(k[o>>2]|0);if((d|0)>16384){if((c|0)>0){M=k[a+16>>2]|0;an(M|0,M+d|0,c|0)|0}k[g>>2]=0;k[e>>2]=c}else c=f;if((c|0)!=32768){f=pf(k[a>>2]|0,(k[a+16>>2]|0)+c|0,32768-c|0)|0;c=k[e>>2]|0;if((f|0)>0){c=c+f|0;k[e>>2]=c}}else{c=32768;f=0}e=c+-30|0;h=a+124|0;k[h>>2]=e;d=k[g>>2]|0;k[n>>2]=d;c=k[o>>2]|0;if((c|0)!=-1){M=d+-1+c|0;k[h>>2]=(e|0)<(M|0)?e:M}if((f|0)==-1)return;if(!b?!(Dh(a)|0):0)return;M=a+19520|0;d=M;d=Vm(k[d>>2]|0,k[d+4>>2]|0,-1,-1)|0;c=O;k[M>>2]=d;k[M+4>>2]=c}else{k[a+112>>2]=k[a+116>>2];d=a+19520|0;c=k[d+4>>2]|0;d=k[d>>2]|0}P=a+19520|0;a:do if((c|0)>-1|(c|0)==-1&d>>>0>4294967295){r=a+59104|0;c=a+112|0;s=a+4|0;t=a+120|0;u=a+136|0;v=a+128|0;w=a+16|0;x=a+124|0;n=a+116|0;y=a+38728|0;z=a+8|0;A=a+280|0;B=a+19252|0;C=a+4100|0;D=a+100|0;E=a+108|0;F=a+104|0;G=a+3968|0;H=a+11740|0;I=a+11608|0;J=a+148|0;K=a+38736|0;L=a+38732|0;M=a+19529|0;N=a+19530|0;while(1){f=k[r>>2]|0;o=k[c>>2]&f;k[c>>2]=o;d=k[s>>2]|0;e=k[t>>2]|0;if((d|0)>(e+-30|0)){o=e-d|0;if((o|0)<0)break a;k[v>>2]=(k[u>>2]|0)-d+(k[v>>2]|0);if((d|0)>16384){if((o|0)>0){p=k[w>>2]|0;an(p|0,p+d|0,o|0)|0}k[s>>2]=0;k[t>>2]=o}else o=e;if((o|0)!=32768){f=pf(k[a>>2]|0,(k[w>>2]|0)+o|0,32768-o|0)|0;o=k[t>>2]|0;if((f|0)>0){o=o+f|0;k[t>>2]=o}}else{o=32768;f=0}o=o+-30|0;k[x>>2]=o;d=k[s>>2]|0;k[u>>2]=d;e=k[v>>2]|0;if((e|0)!=-1){p=d+-1+e|0;k[x>>2]=(o|0)<(p|0)?o:p}if((f|0)==-1)break a;o=k[c>>2]|0;f=k[r>>2]|0}d=k[n>>2]|0;if(!((d-o&f)>>>0>269|(d|0)==(o|0))){i[N>>0]=1;e=k[a>>2]|0;b=(k[B>>2]|0)+d|0;if(o>>>0<d>>>0){qf(e,b,f&0-d);qf(k[a>>2]|0,k[B>>2]|0,k[c>>2]|0);i[M>>0]=1}else qf(e,b,o-d|0);o=k[c>>2]|0;k[n>>2]=o;if(i[Q>>0]|0)break}do if(!(k[y>>2]|0)){d=k[s>>2]|0;p=k[w>>2]|0;e=k[z>>2]|0;b=(l[p+(d+1)>>0]<<8|l[p+d>>0]<<16|l[p+(d+2)>>0])>>>(8-e|0)&65534;f=k[A>>2]|0;if(b>>>0<(k[a+(f<<2)+152>>2]|0)>>>0){f=b>>>(16-f|0);e=(l[a+f+284>>0]|0)+e|0;b=(e>>>3)+d|0;k[s>>2]=b;e=e&7;k[z>>2]=e;f=a+(f<<1)+1308|0}else{do{f=f+1|0;if(f>>>0>=15){f=15;break}}while(b>>>0>=(k[a+(f<<2)+152>>2]|0)>>>0);e=f+e|0;g=(e>>>3)+d|0;k[s>>2]=g;e=e&7;k[z>>2]=e;f=((b-(k[a+(f+-1<<2)+152>>2]|0)|0)>>>(16-f|0))+(k[a+(f<<2)+216>>2]|0)|0;f=a+((f>>>0>=(k[J>>2]|0)>>>0?0:f)<<1)+3356|0;b=g}f=j[f>>1]|0;d=f&65535;if((f&65535)<256){k[c>>2]=o+1;i[(k[B>>2]|0)+o>>0]=f;f=P;f=Vm(k[f>>2]|0,k[f+4>>2]|0,-1,-1)|0;o=O;p=P;k[p>>2]=f;k[p+4>>2]=o;break}if((f&65535)>269){f=d+-270|0;o=(l[52136+f>>0]|0)+3|0;f=l[52168+f>>0]|0;if((d+-278|0)>>>0<20){o=(((l[p+(b+1)>>0]<<8|l[p+b>>0]<<16|l[p+(b+2)>>0])>>>(8-e|0)&65535)>>>(16-f|0))+o|0;e=e+f|0;b=(e>>>3)+b|0;k[s>>2]=b;e=e&7;k[z>>2]=e}d=(l[p+(b+1)>>0]<<8|l[p+b>>0]<<16|l[p+(b+2)>>0])>>>(8-e|0)&65534;f=k[C>>2]|0;if(d>>>0<(k[a+(f<<2)+3972>>2]|0)>>>0){f=d>>>(16-f|0);q=(l[a+f+4104>>0]|0)+e|0;e=(q>>>3)+b|0;k[s>>2]=e;b=q&7;k[z>>2]=b;f=a+(f<<1)+5128|0}else{do{f=f+1|0;if(f>>>0>=15){f=15;break}}while(d>>>0>=(k[a+(f<<2)+3972>>2]|0)>>>0);q=f+e|0;e=(q>>>3)+b|0;k[s>>2]=e;b=q&7;k[z>>2]=b;f=((d-(k[a+(f+-1<<2)+3972>>2]|0)|0)>>>(16-f|0))+(k[a+(f<<2)+4036>>2]|0)|0;f=a+((f>>>0>=(k[G>>2]|0)>>>0?0:f)<<1)+7176|0}q=m[f>>1]|0;f=(k[51896+(q<<2)>>2]|0)+1|0;d=l[52088+q>>0]|0;if((q+-4|0)>>>0<44){f=(((l[p+(e+1)>>0]<<8|l[p+e>>0]<<16|l[p+(e+2)>>0])>>>(8-b|0)&65535)>>>(16-d|0))+f|0;q=b+d|0;k[s>>2]=(q>>>3)+e;k[z>>2]=q&7}if(f>>>0>8191)o=(f>>>0>262143?2:1)+o|0;p=k[D>>2]|0;k[D>>2]=p+1;k[a+((p&3)<<2)+84>>2]=f;k[E>>2]=f;k[F>>2]=o;p=P;p=Um(k[p>>2]|0,k[p+4>>2]|0,o|0,0)|0;q=P;k[q>>2]=p;k[q+4>>2]=O;ai(a,o,f);q=53;break}if((d|0)==256){p=k[F>>2]|0;q=k[E>>2]|0;h=k[D>>2]|0;k[D>>2]=h+1;k[a+((h&3)<<2)+84>>2]=q;k[E>>2]=q;k[F>>2]=p;h=P;h=Um(k[h>>2]|0,k[h+4>>2]|0,p|0,0)|0;g=P;k[g>>2]=h;k[g+4>>2]=O;ai(a,p,q);q=53;break}else if((d|0)==269)if(Dh(a)|0){q=53;break}else break a;else{if((f&65535)>=261){q=d+-261|0;g=l[52608+q>>0]|0;q=(l[52600+q>>0]|0)+1+(((l[p+(b+1)>>0]<<8|l[p+b>>0]<<16|l[p+(b+2)>>0])>>>(8-e|0)&65535)>>>(16-g|0))|0;g=e+g|0;k[s>>2]=(g>>>3)+b;k[z>>2]=g&7;g=k[D>>2]|0;k[D>>2]=g+1;k[a+((g&3)<<2)+84>>2]=q;k[E>>2]=q;k[F>>2]=2;g=P;g=Vm(k[g>>2]|0,k[g+4>>2]|0,-2,-1)|0;p=P;k[p>>2]=g;k[p+4>>2]=O;ai(a,2,q);q=53;break}g=k[D>>2]|0;h=k[a+((g-d&3)<<2)+84>>2]|0;f=(l[p+(b+1)>>0]<<8|l[p+b>>0]<<16|l[p+(b+2)>>0])>>>(8-e|0)&65534;o=k[H>>2]|0;if(f>>>0<(k[a+(o<<2)+11612>>2]|0)>>>0){o=f>>>(16-o|0);e=(l[a+o+11744>>0]|0)+e|0;d=(e>>>3)+b|0;k[s>>2]=d;e=e&7;k[z>>2]=e;o=a+(o<<1)+12768|0}else{do{o=o+1|0;if(o>>>0>=15){o=15;break}}while(f>>>0>=(k[a+(o<<2)+11612>>2]|0)>>>0);e=o+e|0;d=(e>>>3)+b|0;k[s>>2]=d;e=e&7;k[z>>2]=e;o=((f-(k[a+(o+-1<<2)+11612>>2]|0)|0)>>>(16-o|0))+(k[a+(o<<2)+11676>>2]|0)|0;o=a+((o>>>0>=(k[I>>2]|0)>>>0?0:o)<<1)+14816|0}q=m[o>>1]|0;o=(l[52136+q>>0]|0)+2|0;f=l[52168+q>>0]|0;if((q+-8|0)>>>0<20){o=(((l[p+(d+1)>>0]<<8|l[p+d>>0]<<16|l[p+(d+2)>>0])>>>(8-e|0)&65535)>>>(16-f|0))+o|0;q=e+f|0;k[s>>2]=(q>>>3)+d;k[z>>2]=q&7}if(h>>>0>256)if(h>>>0>8191)o=o+(h>>>0>262143?3:2)|0;else o=o+1|0;k[D>>2]=g+1;k[a+((g&3)<<2)+84>>2]=h;k[E>>2]=h;k[F>>2]=o;p=P;p=Um(k[p>>2]|0,k[p+4>>2]|0,o|0,0)|0;q=P;k[q>>2]=p;k[q+4>>2]=O;ai(a,o,h);q=53;break}}else{f=k[K>>2]|0;d=k[s>>2]|0;b=k[w>>2]|0;e=k[z>>2]|0;b=(l[b+(d+1)>>0]<<8|l[b+d>>0]<<16|l[b+(d+2)>>0])>>>(8-e|0)&65534;o=k[a+(f*3820|0)+22552>>2]|0;if(b>>>0<(k[a+(f*3820|0)+(o<<2)+22424>>2]|0)>>>0){o=b>>>(16-o|0);p=(l[a+(f*3820|0)+o+22556>>0]|0)+e|0;k[s>>2]=(p>>>3)+d;k[z>>2]=p&7;o=a+(f*3820|0)+(o<<1)+23580|0}else{do{o=o+1|0;if(o>>>0>=15){o=15;break}}while(b>>>0>=(k[a+(f*3820|0)+(o<<2)+22424>>2]|0)>>>0);p=o+e|0;k[s>>2]=(p>>>3)+d;k[z>>2]=p&7;o=((b-(k[a+(f*3820|0)+(o+-1<<2)+22424>>2]|0)|0)>>>(16-o|0))+(k[a+(f*3820|0)+(o<<2)+22488>>2]|0)|0;o=a+(f*3820|0)+((o>>>0>=(k[a+(f*3820|0)+22420>>2]|0)>>>0?0:o)<<1)+25628|0}o=j[o>>1]|0;if(o<<16>>16==256)if(Dh(a)|0){q=53;break}else break a;else{o=Eh(a,o&65535)|0;f=k[c>>2]|0;k[c>>2]=f+1;i[(k[B>>2]|0)+f>>0]=o;f=(k[K>>2]|0)+1|0;k[K>>2]=(f|0)==(k[L>>2]|0)?0:f;f=P;f=Vm(k[f>>2]|0,k[f+4>>2]|0,-1,-1)|0;o=O;p=P;k[p>>2]=f;k[p+4>>2]=o;break}}while(0);if((q|0)==53){q=0;f=P;o=k[f+4>>2]|0;f=k[f>>2]|0}if(!((o|0)>-1|(o|0)==-1&f>>>0>4294967295))break a}return}else{n=a+116|0;c=a+112|0}while(0);Fh(a);d=k[c>>2]|0;e=k[n>>2]|0;if((d|0)!=(e|0))i[a+19530>>0]=1;f=k[a>>2]|0;g=a+19252|0;h=(k[g>>2]|0)+e|0;if(d>>>0<e>>>0){qf(f,h,k[a+59104>>2]&0-e);qf(k[a>>2]|0,k[g>>2]|0,k[c>>2]|0);i[a+19529>>0]=1}else qf(f,h,d-e|0);k[n>>2]=k[c>>2];return}
function Ql(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0,Qa=0,Ra=0,Sa=0,Ta=0,Ua=0,Va=0,Wa=0,Xa=0,Ya=0,Za=0,_a=0,$a=0,ab=0,bb=0,cb=0,db=0,eb=0,fb=0,gb=0,hb=0,ib=0,jb=0,kb=0,lb=0,mb=0,nb=0,ob=0,pb=0,qb=0,rb=0,sb=0,tb=0,ub=0,vb=0,wb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0,Cb=0,Db=0,Eb=0,Fb=0,Gb=0,Hb=0,Ib=0,Jb=0,Kb=0,Lb=0,Mb=0,Nb=0,Ob=0,Pb=0,Qb=0,Rb=0,Sb=0,Tb=0,Ub=0,Vb=0,Wb=0,Xb=0,Yb=0,Zb=0,_b=0,$b=0,ac=0,bc=0,cc=0,dc=0,ec=0,fc=0,gc=0,hc=0,ic=0,jc=0,kc=0,lc=0,mc=0,nc=0,oc=0,pc=0;pc=r;r=r+2160|0;oc=pc+2128|0;Zb=pc+2116|0;_b=pc+2104|0;pb=pc+2092|0;qb=pc+2080|0;rb=pc+2068|0;ib=pc+2056|0;Ya=pc+2032|0;Za=pc+2020|0;_a=pc+2008|0;$a=pc+1996|0;Ea=pc+1984|0;Fa=pc+1972|0;Mb=pc+1960|0;dc=pc+1948|0;Yb=pc+1936|0;Sb=pc+1912|0;Tb=pc+1900|0;Ub=pc+1888|0;Vb=pc+1876|0;Wb=pc+1864|0;Xb=pc+1852|0;hb=pc+1840|0;Ga=pc+1816|0;Ha=pc+1800|0;Ia=pc+1788|0;Ja=pc+1776|0;Ka=pc+1764|0;La=pc+1752|0;Ba=pc+1740|0;za=pc+1728|0;Ca=pc+1716|0;Aa=pc+1704|0;mc=pc+1692|0;ob=pc+1680|0;nc=pc+1668|0;lc=pc+1656|0;Kb=pc+1644|0;kc=pc+1632|0;Pb=pc+1620|0;Qb=pc+1608|0;$b=pc+1596|0;ac=pc+1584|0;ic=pc+1560|0;jc=pc+1544|0;Da=pc+1532|0;gb=pc+1520|0;Ma=pc+1496|0;Na=pc+1484|0;Oa=pc+1472|0;Pa=pc+1460|0;Qa=pc+1448|0;Ra=pc+1436|0;fb=pc+1424|0;Sa=pc+1400|0;Ta=pc+1384|0;Ua=pc+1372|0;Va=pc+1360|0;Wa=pc+1348|0;Xa=pc+1336|0;X=pc+1312|0;Y=pc+1296|0;Z=pc+1284|0;_=pc+1272|0;$=pc+1248|0;aa=pc+1232|0;ba=pc+1220|0;ca=pc+1208|0;ua=pc+1184|0;va=pc+1168|0;wa=pc+1156|0;xa=pc+1144|0;la=pc+1120|0;ma=pc+1108|0;na=pc+1096|0;pa=pc+1072|0;qa=pc+1060|0;ra=pc+1048|0;sa=pc+1036|0;gc=pc+1024|0;nb=pc+472|0;Nb=pc+460|0;Ob=pc+448|0;ec=pc+424|0;fc=pc+408|0;x=pc+396|0;y=pc+384|0;z=pc+372|0;A=pc+360|0;B=pc+348|0;C=pc+336|0;D=pc+324|0;Cb=pc+312|0;Db=pc+300|0;Eb=pc+288|0;Fb=pc+276|0;E=pc+264|0;Gb=pc+252|0;Hb=pc+240|0;Ib=pc+228|0;Jb=pc+84|0;F=pc;G=pc+12|0;Q=pc+24|0;R=pc+36|0;S=pc+48|0;T=pc+60|0;U=pc+72|0;kb=pc+96|0;jb=pc+108|0;ab=pc+120|0;bb=pc+144|0;cb=pc+156|0;db=pc+168|0;eb=pc+180|0;V=pc+192|0;I=pc+204|0;J=pc+216|0;K=pc+484|0;d=pc+496|0;g=pc+508|0;e=pc+520|0;f=pc+532|0;L=pc+544|0;da=pc+560|0;ea=pc+584|0;fa=pc+596|0;ga=pc+608|0;n=pc+620|0;j=pc+632|0;h=pc+644|0;M=pc+656|0;N=pc+668|0;O=pc+680|0;l=pc+692|0;o=pc+704|0;p=pc+716|0;P=pc+728|0;ha=pc+744|0;ia=pc+768|0;ja=pc+780|0;ka=pc+792|0;q=pc+804|0;Bb=pc+816|0;Ab=pc+828|0;zb=pc+840|0;sb=pc+856|0;tb=pc+880|0;ub=pc+892|0;vb=pc+904|0;wb=pc+916|0;xb=pc+928|0;yb=pc+940|0;s=pc+952|0;t=pc+964|0;u=pc+976|0;v=pc+988|0;mb=pc+1e3|0;lb=b;W=lb-a|0;a:do if((W|0)>1){w=(W|0)>3;if(w?(i[a>>0]|0)==103:0){H=(i[a+1>>0]|0)==115;ya=H;H=H?a+2|0:a}else{ya=0;H=a}do switch(i[H>>0]|0){case 115:switch(i[H+1>>0]|0){case 99:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=115){d=a;break a}if((i[a+1>>0]|0)!=99){d=a;break a}nc=a+2|0;g=ul(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}j=c+4|0;g=k[j>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(fb,g+-24|0);g=k[j>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[j>>2]=a;hl(a);f=k[j>>2]|0}while((f|0)!=(e|0));e=g+-48|0;Al(Xa,e);g=rl(Xa,0,58760)|0;k[Wa+0>>2]=k[g+0>>2];k[Wa+4>>2]=k[g+4>>2];k[Wa+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(Wa,58776)|0;k[Va+0>>2]=k[g+0>>2];k[Va+4>>2]=k[g+4>>2];k[Va+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[fb>>0]|0;if(!(g&1)){f=fb+1|0;g=(g&255)>>>1}else{f=k[fb+8>>2]|0;g=k[fb+4>>2]|0}a=jl(Va,f,g)|0;k[Ua+0>>2]=k[a+0>>2];k[Ua+4>>2]=k[a+4>>2];k[Ua+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(Ua,58240)|0;k[Ta+0>>2]=k[a+0>>2];k[Ta+4>>2]=k[a+4>>2];k[Ta+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[Sa+0>>2]=k[Ta+0>>2];k[Sa+4>>2]=k[Ta+4>>2];k[Sa+8>>2]=k[Ta+8>>2];k[Ta+0>>2]=0;k[Ta+4>>2]=0;k[Ta+8>>2]=0;a=Sa+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,Sa);hl(Sa);tl(Ta);tl(Ua);tl(Va);tl(Wa);tl(Xa);tl(fb);break a}case 114:{d=nm(a,b,c)|0;break a}case 116:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=115){d=a;break a}if((i[a+1>>0]|0)!=116){d=a;break a}nc=a+2|0;d=ul(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(_,a);nc=rl(_,0,58744)|0;k[Z+0>>2]=k[nc+0>>2];k[Z+4>>2]=k[nc+4>>2];k[Z+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(Z,58240)|0;k[Y+0>>2]=k[nc+0>>2];k[Y+4>>2]=k[nc+4>>2];k[Y+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[X+0>>2]=k[Y+0>>2];k[X+4>>2]=k[Y+4>>2];k[X+8>>2]=k[Y+8>>2];k[Y+0>>2]=0;k[Y+4>>2]=0;k[Y+8>>2]=0;nc=X+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,X);hl(X);tl(Y);tl(Z);tl(_);break a}case 122:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=115){d=a;break a}if((i[a+1>>0]|0)!=122){d=a;break a}nc=a+2|0;d=Ql(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(ca,a);nc=rl(ca,0,58744)|0;k[ba+0>>2]=k[nc+0>>2];k[ba+4>>2]=k[nc+4>>2];k[ba+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(ba,58240)|0;k[aa+0>>2]=k[nc+0>>2];k[aa+4>>2]=k[nc+4>>2];k[aa+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[$+0>>2]=k[aa+0>>2];k[$+4>>2]=k[aa+4>>2];k[$+8>>2]=k[aa+8>>2];k[aa+0>>2]=0;k[aa+4>>2]=0;k[aa+8>>2]=0;nc=$+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,$);hl($);tl(aa);tl(ba);tl(ca);break a}case 112:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=115){d=a;break a}if((i[a+1>>0]|0)!=112){d=a;break a}nc=a+2|0;d=Ql(nc,b,c)|0;d=(d|0)==(nc|0)?a:d;break a}case 90:{if((lb-H|0)<=2){d=a;break a}d=i[H+2>>0]|0;if((d|0)==102){if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=115){d=a;break a}if((i[a+1>>0]|0)!=90){d=a;break a}g=a+2|0;if((i[g>>0]|0)!=102){d=a;break a}d=km(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(sa,a);nc=rl(sa,0,58720)|0;k[ra+0>>2]=k[nc+0>>2];k[ra+4>>2]=k[nc+4>>2];k[ra+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(ra,58240)|0;k[qa+0>>2]=k[nc+0>>2];k[qa+4>>2]=k[nc+4>>2];k[qa+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[pa+0>>2]=k[qa+0>>2];k[pa+4>>2]=k[qa+4>>2];k[pa+8>>2]=k[qa+8>>2];k[qa+0>>2]=0;k[qa+4>>2]=0;k[qa+8>>2]=0;nc=pa+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,pa);hl(pa);tl(qa);tl(ra);tl(sa);break a}else if((d|0)!=84){d=a;break a}if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=115){d=a;break a}if((i[a+1>>0]|0)!=90){d=a;break a}g=a+2|0;if((i[g>>0]|0)!=84){d=a;break a}p=c+4|0;o=((k[p>>2]|0)-(k[c>>2]|0)|0)/24|0;d=Sl(g,b,c)|0;n=k[c>>2]|0;f=((k[p>>2]|0)-n|0)/24|0;if((d|0)==(g|0)){d=a;break a}i[gc>>0]=20;m=gc+1|0;g=58720;e=m+10|0;do{i[m>>0]=i[g>>0]|0;m=m+1|0;g=g+1|0}while((m|0)<(e|0));i[gc+11>>0]=0;l=(o|0)==(f|0);if(!l){Al(nb,n+(o*24|0)|0);g=i[nb>>0]|0;if(!(g&1)){e=nb+1|0;g=(g&255)>>>1}else{e=k[nb+8>>2]|0;g=k[nb+4>>2]|0}jl(gc,e,g)|0;tl(nb);m=o+1|0;if((m|0)!=(f|0)){n=Nb+1|0;j=Nb+8|0;h=Nb+4|0;do{Al(Ob,(k[c>>2]|0)+(m*24|0)|0);g=rl(Ob,0,58736)|0;k[Nb+0>>2]=k[g+0>>2];k[Nb+4>>2]=k[g+4>>2];k[Nb+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[Nb>>0]|0;if(!(g&1)){e=n;g=(g&255)>>>1}else{e=k[j>>2]|0;g=k[h>>2]|0}jl(gc,e,g)|0;tl(Nb);tl(Ob);m=m+1|0}while((m|0)!=(f|0))}}sl(gc,58240)|0;g=k[p>>2]|0;if(!l){j=o-f|0;h=g;do{e=h;h=h+-24|0;do{a=e+-24|0;k[p>>2]=a;hl(a);e=k[p>>2]|0}while((e|0)!=(h|0));f=f+-1|0}while((f|0)!=(o|0));g=g+(j*24|0)|0};k[fc+0>>2]=k[gc+0>>2];k[fc+4>>2]=k[gc+4>>2];k[fc+8>>2]=k[gc+8>>2];k[gc+0>>2]=0;k[gc+4>>2]=0;k[gc+8>>2]=0;k[ec+0>>2]=k[fc+0>>2];k[ec+4>>2]=k[fc+4>>2];k[ec+8>>2]=k[fc+8>>2];k[fc+0>>2]=0;k[fc+4>>2]=0;k[fc+8>>2]=0;m=ec+12|0;k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;h=k[c+8>>2]|0;if(g>>>0<h>>>0){if(!g)g=0;else{k[g+0>>2]=k[ec+0>>2];k[g+4>>2]=k[ec+4>>2];k[g+8>>2]=k[ec+8>>2];k[ec+0>>2]=0;k[ec+4>>2]=0;k[ec+8>>2]=0;g=g+12|0;k[g+0>>2]=k[m+0>>2];k[g+4>>2]=k[m+4>>2];k[g+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;g=k[p>>2]|0}k[p>>2]=g+24}else{e=k[c>>2]|0;j=(g-e|0)/24|0;f=j+1|0;if((f|0)<0)Fl(c);g=(h-e|0)/24|0;if(g>>>0<1073741823){g=g<<1;g=g>>>0<f>>>0?f:g}else g=2147483647;Kl(oc,g,j,c+12|0);g=oc+8|0;e=k[g>>2]|0;if(e){k[e+0>>2]=k[ec+0>>2];k[e+4>>2]=k[ec+4>>2];k[e+8>>2]=k[ec+8>>2];k[ec+0>>2]=0;k[ec+4>>2]=0;k[ec+8>>2]=0;a=e+12|0;k[a+0>>2]=k[m+0>>2];k[a+4>>2]=k[m+4>>2];k[a+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0}k[g>>2]=e+24;Ml(c,oc);Ll(oc)}hl(ec);tl(fc);tl(gc);break a}default:{d=a;break a}}case 114:switch(i[H+1>>0]|0){case 83:{mc=a+2|0;Ol(v,58688,3);nc=lm(mc,b,v,c)|0;tl(v);r=pc;return ((nc|0)==(mc|0)?a:nc)|0}case 109:{nc=a+2|0;Ol(s,58664,1);d=lm(nc,b,s,c)|0;tl(s);d=(d|0)==(nc|0)?a:d;break a}case 115:{nc=a+2|0;Ol(u,58680,2);d=lm(nc,b,u,c)|0;tl(u);d=(d|0)==(nc|0)?a:d;break a}case 77:{nc=a+2|0;Ol(t,58672,2);d=lm(nc,b,t,c)|0;tl(t);d=(d|0)==(nc|0)?a:d;break a}case 99:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=114){d=a;break a}if((i[a+1>>0]|0)!=99){d=a;break a}nc=a+2|0;g=ul(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}j=c+4|0;g=k[j>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(gb,g+-24|0);g=k[j>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[j>>2]=a;hl(a);f=k[j>>2]|0}while((f|0)!=(e|0));e=g+-48|0;Al(Ra,e);g=rl(Ra,0,58784)|0;k[Qa+0>>2]=k[g+0>>2];k[Qa+4>>2]=k[g+4>>2];k[Qa+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(Qa,58776)|0;k[Pa+0>>2]=k[g+0>>2];k[Pa+4>>2]=k[g+4>>2];k[Pa+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[gb>>0]|0;if(!(g&1)){f=gb+1|0;g=(g&255)>>>1}else{f=k[gb+8>>2]|0;g=k[gb+4>>2]|0}a=jl(Pa,f,g)|0;k[Oa+0>>2]=k[a+0>>2];k[Oa+4>>2]=k[a+4>>2];k[Oa+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(Oa,58240)|0;k[Na+0>>2]=k[a+0>>2];k[Na+4>>2]=k[a+4>>2];k[Na+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[Ma+0>>2]=k[Na+0>>2];k[Ma+4>>2]=k[Na+4>>2];k[Ma+8>>2]=k[Na+8>>2];k[Na+0>>2]=0;k[Na+4>>2]=0;k[Na+8>>2]=0;a=Ma+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,Ma);hl(Ma);tl(Na);tl(Oa);tl(Pa);tl(Qa);tl(Ra);tl(gb);break a}default:{d=a;break a}}case 108:{d=i[H+1>>0]|0;if((d|0)==116){nc=a+2|0;Ol(K,58328,1);d=lm(nc,b,K,c)|0;tl(K);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==83){nc=a+2|0;Ol(J,58520,3);d=lm(nc,b,J,c)|0;tl(J);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==101){nc=a+2|0;Ol(V,58504,2);d=lm(nc,b,V,c)|0;tl(V);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==115){nc=a+2|0;Ol(I,58512,2);d=lm(nc,b,I,c)|0;tl(I);d=(d|0)==(nc|0)?a:d;break a}else{d=a;break a}}case 103:{d=i[H+1>>0]|0;if((d|0)==101){nc=a+2|0;Ol(T,58488,2);d=lm(nc,b,T,c)|0;tl(T);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==116){nc=a+2|0;Ol(U,58336,1);d=lm(nc,b,U,c)|0;tl(U);d=(d|0)==(nc|0)?a:d;break a}else{d=a;break a}}case 109:switch(i[H+1>>0]|0){case 105:{mc=a+2|0;Ol(d,58528,1);nc=lm(mc,b,d,c)|0;tl(d);d=(nc|0)==(mc|0)?a:nc;break a}case 108:{nc=a+2|0;Ol(e,58280,1);d=lm(nc,b,e,c)|0;tl(e);d=(d|0)==(nc|0)?a:d;break a}case 76:{nc=a+2|0;Ol(f,58544,2);d=lm(nc,b,f,c)|0;tl(f);d=(d|0)==(nc|0)?a:d;break a}case 109:{g=a+2|0;if((g|0)!=(b|0)?(i[g>>0]|0)==95:0){nc=a+3|0;Ol(L,58552,2);d=mm(nc,b,L,c)|0;tl(L);d=(d|0)==(nc|0)?a:d;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(ga,a);nc=rl(ga,0,58248)|0;k[fa+0>>2]=k[nc+0>>2];k[fa+4>>2]=k[nc+4>>2];k[fa+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(fa,58560)|0;k[ea+0>>2]=k[nc+0>>2];k[ea+4>>2]=k[nc+4>>2];k[ea+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[da+0>>2]=k[ea+0>>2];k[da+4>>2]=k[ea+4>>2];k[da+8>>2]=k[ea+8>>2];k[ea+0>>2]=0;k[ea+4>>2]=0;k[ea+8>>2]=0;nc=da+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,da);hl(da);tl(ea);tl(fa);tl(ga);break a}case 73:{nc=a+2|0;Ol(g,58536,2);d=lm(nc,b,g,c)|0;tl(g);d=(d|0)==(nc|0)?a:d;break a}default:{d=a;break a}}case 101:{d=i[H+1>>0]|0;if((d|0)==79){nc=a+2|0;Ol(R,58472,2);d=lm(nc,b,R,c)|0;tl(R);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==113){nc=a+2|0;Ol(S,58480,2);d=lm(nc,b,S,c)|0;tl(S);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==111){nc=a+2|0;Ol(Q,58464,1);d=lm(nc,b,Q,c)|0;tl(Q);d=(d|0)==(nc|0)?a:d;break a}else{d=a;break a}}case 105:{if((i[H+1>>0]|0)!=120){d=a;break a}nc=a+2|0;g=Ql(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=Ql(g,b,c)|0;m=c+4|0;f=k[m>>2]|0;if((d|0)==(g|0)){e=f+-24|0;d=f;while(1){nc=d+-24|0;k[m>>2]=nc;hl(nc);d=k[m>>2]|0;if((d|0)==(e|0)){d=a;break a}}}if(((f-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(kb,f+-24|0);g=k[m>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[m>>2]=a;hl(a);f=k[m>>2]|0}while((f|0)!=(e|0));Al(jb,g+-48|0);e=(k[m>>2]|0)+-24|0;Zl(eb,58248,jb);g=sl(eb,58496)|0;k[db+0>>2]=k[g+0>>2];k[db+4>>2]=k[g+4>>2];k[db+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[kb>>0]|0;if(!(g&1)){f=kb+1|0;g=(g&255)>>>1}else{f=k[kb+8>>2]|0;g=k[kb+4>>2]|0}a=jl(db,f,g)|0;k[cb+0>>2]=k[a+0>>2];k[cb+4>>2]=k[a+4>>2];k[cb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(cb,58360)|0;k[bb+0>>2]=k[a+0>>2];k[bb+4>>2]=k[a+4>>2];k[bb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[ab+0>>2]=k[bb+0>>2];k[ab+4>>2]=k[bb+4>>2];k[ab+8>>2]=k[bb+8>>2];k[bb+0>>2]=0;k[bb+4>>2]=0;k[bb+8>>2]=0;a=ab+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,ab);hl(ab);tl(bb);tl(cb);tl(db);tl(eb);tl(jb);tl(kb);break a}case 110:switch(i[H+1>>0]|0){case 119:case 97:{do if(w){d=i[a>>0]|0;if(d<<24>>24==103){j=(i[a+1>>0]|0)==115;g=j?a+2|0:a;d=i[g>>0]|0}else{j=0;g=a}if(d<<24>>24==110?(ta=i[g+1>>0]|0,ta<<24>>24==97|ta<<24>>24==119):0){n=ta<<24>>24==97;d=g+2|0;if((d|0)==(b|0)){d=a;break a}else g=0;while(1){if((i[d>>0]|0)==95){f=g;break}dc=d;d=Ql(d,b,c)|0;if((d|0)==(dc|0)|(d|0)==(b|0)){d=a;break a}else g=1}dc=d+1|0;d=ul(dc,b,c)|0;if((d|0)==(dc|0)|(d|0)==(b|0)){d=a;break a}g=i[d>>0]|0;if((lb-d|0)>2&g<<24>>24==112){if((i[d+1>>0]|0)!=105){d=a;break a}d=d+2|0;while(1){if((i[d>>0]|0)==69){e=d;break}dc=d;d=Ql(d,b,c)|0;if((d|0)==(dc|0)|(d|0)==(b|0)){d=a;break a}}k[mc+0>>2]=0;k[mc+4>>2]=0;k[mc+8>>2]=0;g=c+4|0;d=k[g>>2]|0;if((k[c>>2]|0)!=(d|0)){Al(ob,d+-24|0);k[mc+0>>2]=k[ob+0>>2];k[mc+4>>2]=k[ob+4>>2];k[mc+8>>2]=k[ob+8>>2];k[ob+0>>2]=0;k[ob+4>>2]=0;k[ob+8>>2]=0;tl(ob);d=k[g>>2]|0;m=d+-24|0;do{hc=d+-24|0;k[g>>2]=hc;hl(hc);d=k[g>>2]|0}while((d|0)!=(m|0));bc=c;Rb=1;hc=e;Lb=303}}else{if(g<<24>>24!=69){d=a;break a};k[mc+0>>2]=0;k[mc+4>>2]=0;k[mc+8>>2]=0;bc=c;m=k[c+4>>2]|0;Rb=0;hc=d;Lb=303}if((Lb|0)==303?(cc=c+4|0,(k[bc>>2]|0)!=(m|0)):0){Al(nc,m+-24|0);d=k[cc>>2]|0;m=d+-24|0;g=d;do{dc=g+-24|0;k[cc>>2]=dc;hl(dc);g=k[cc>>2]|0}while((g|0)!=(m|0));k[lc+0>>2]=0;k[lc+4>>2]=0;k[lc+8>>2]=0;if(f)if((k[bc>>2]|0)==(m|0)){d=a;g=1}else{Al(Kb,d+-48|0);k[lc+0>>2]=k[Kb+0>>2];k[lc+4>>2]=k[Kb+4>>2];k[lc+8>>2]=k[Kb+8>>2];k[Kb+0>>2]=0;k[Kb+4>>2]=0;k[Kb+8>>2]=0;tl(Kb);m=k[cc>>2]|0;d=m+-24|0;do{dc=m+-24|0;k[cc>>2]=dc;hl(dc);m=k[cc>>2]|0}while((m|0)!=(d|0));Lb=310}else Lb=310;if((Lb|0)==310){k[kc+0>>2]=0;k[kc+4>>2]=0;k[kc+8>>2]=0;if(j)_l(kc,58416,2);if(n)sl(kc,58832)|0;else sl(kc,58320)|0;if(f){Zl(Qb,58248,lc);d=sl(Qb,58840)|0;k[Pb+0>>2]=k[d+0>>2];k[Pb+4>>2]=k[d+4>>2];k[Pb+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=i[Pb>>0]|0;if(!(d&1)){m=Pb+1|0;d=(d&255)>>>1}else{m=k[Pb+8>>2]|0;d=k[Pb+4>>2]|0}jl(kc,m,d)|0;tl(Pb);tl(Qb)}d=i[nc>>0]|0;if(!(d&1)){m=nc+1|0;d=(d&255)>>>1}else{m=k[nc+8>>2]|0;d=k[nc+4>>2]|0}jl(kc,m,d)|0;if(Rb){Zl(ac,58232,mc);d=sl(ac,58240)|0;k[$b+0>>2]=k[d+0>>2];k[$b+4>>2]=k[d+4>>2];k[$b+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=i[$b>>0]|0;if(!(d&1)){m=$b+1|0;d=(d&255)>>>1}else{m=k[$b+8>>2]|0;d=k[$b+4>>2]|0}jl(kc,m,d)|0;tl($b);tl(ac)};k[jc+0>>2]=k[kc+0>>2];k[jc+4>>2]=k[kc+4>>2];k[jc+8>>2]=k[kc+8>>2];k[kc+0>>2]=0;k[kc+4>>2]=0;k[kc+8>>2]=0;k[ic+0>>2]=k[jc+0>>2];k[ic+4>>2]=k[jc+4>>2];k[ic+8>>2]=k[jc+8>>2];k[jc+0>>2]=0;k[jc+4>>2]=0;k[jc+8>>2]=0;n=ic+12|0;k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;d=k[cc>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[ic+0>>2];k[d+4>>2]=k[ic+4>>2];k[d+8>>2]=k[ic+8>>2];k[ic+0>>2]=0;k[ic+4>>2]=0;k[ic+8>>2]=0;d=d+12|0;k[d+0>>2]=k[n+0>>2];k[d+4>>2]=k[n+4>>2];k[d+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;d=k[cc>>2]|0}k[cc>>2]=d+24}else{g=k[bc>>2]|0;m=(d-g|0)/24|0;e=m+1|0;if((e|0)<0)Fl(c);d=(f-g|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(oc,d,m,c+12|0);d=oc+8|0;g=k[d>>2]|0;if(g){k[g+0>>2]=k[ic+0>>2];k[g+4>>2]=k[ic+4>>2];k[g+8>>2]=k[ic+8>>2];k[ic+0>>2]=0;k[ic+4>>2]=0;k[ic+8>>2]=0;dc=g+12|0;k[dc+0>>2]=k[n+0>>2];k[dc+4>>2]=k[n+4>>2];k[dc+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0}k[d>>2]=g+24;Ml(c,oc);Ll(oc)}hl(ic);tl(jc);tl(kc);d=hc+1|0;g=0}tl(lc);tl(nc);tl(mc);if(g){d=a;break a}else break}tl(mc);d=a;break a}else d=a}else d=a;while(0);break a}case 120:{q=a+2|0;d=Ql(q,b,c)|0;if((d|0)!=(q|0)?(oa=k[c+4>>2]|0,(k[c>>2]|0)!=(oa|0)):0){p=oa+-24|0;Al(_b,p);nc=rl(_b,0,58816)|0;k[Zb+0>>2]=k[nc+0>>2];k[Zb+4>>2]=k[nc+4>>2];k[Zb+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(Zb,58240)|0;k[oc+0>>2]=k[nc+0>>2];k[oc+4>>2]=k[nc+4>>2];k[oc+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;do if(i[p>>0]&1){o=oa+-16|0;i[k[o>>2]>>0]=0;n=oa+-20|0;k[n>>2]=0;g=i[p>>0]|0;if(!(g&1))j=10;else{j=k[p>>2]|0;g=j&255;j=(j&-2)+-1|0}if(!(g&1)){e=(g&255)>>>1;if((g&255)<22){m=10;h=e;l=1}else{m=(e+16&240)+-1|0;h=e;l=1}}else{m=10;h=0;l=0}if((m|0)!=(j|0)){if((m|0)==10){f=p+1|0;e=k[o>>2]|0;if(l){_m(f|0,e|0,((g&255)>>>1)+1|0)|0;ym(e)}else{i[f>>0]=i[e>>0]|0;ym(e)}i[p>>0]=h<<1;break}e=m+1|0;f=xm(e)|0;if(!(m>>>0<=j>>>0&(f|0)==0)){if(l)_m(f|0,p+1|0,((g&255)>>>1)+1|0)|0;else{nc=k[o>>2]|0;i[f>>0]=i[nc>>0]|0;ym(nc)}k[p>>2]=e|1;k[n>>2]=h;k[o>>2]=f}}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[oc+0>>2];k[p+4>>2]=k[oc+4>>2];k[p+8>>2]=k[oc+8>>2];k[oc+0>>2]=0;k[oc+4>>2]=0;k[oc+8>>2]=0;tl(oc);tl(Zb);tl(_b)}else d=q;d=(d|0)==(q|0)?a:d;break a}case 101:{nc=a+2|0;Ol(n,58568,2);d=lm(nc,b,n,c)|0;tl(n);d=(d|0)==(nc|0)?a:d;break a}case 103:{nc=a+2|0;Ol(j,58528,1);d=mm(nc,b,j,c)|0;tl(j);d=(d|0)==(nc|0)?a:d;break a}case 116:{nc=a+2|0;Ol(h,58576,1);d=mm(nc,b,h,c)|0;tl(h);d=(d|0)==(nc|0)?a:d;break a}default:{d=a;break a}}case 113:{if((i[H+1>>0]|0)!=117){d=a;break a}nc=a+2|0;d=Ql(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}m=Ql(d,b,c)|0;if((m|0)==(d|0)){d=c+4|0;f=k[d>>2]|0;e=f+-24|0;while(1){nc=f+-24|0;k[d>>2]=nc;hl(nc);f=k[d>>2]|0;if((f|0)==(e|0)){d=a;break a}}}d=Ql(m,b,c)|0;n=c+4|0;g=k[n>>2]|0;if((d|0)==(m|0)){d=g+-24|0;e=g;do{nc=e+-24|0;k[n>>2]=nc;hl(nc);e=k[n>>2]|0}while((e|0)!=(d|0));e=g+-48|0;while(1){nc=d+-24|0;k[n>>2]=nc;hl(nc);d=k[n>>2]|0;if((d|0)==(e|0)){d=a;break a}}}if(((g-(k[c>>2]|0)|0)/24|0)>>>0<3){d=a;break a}Al(Bb,g+-24|0);g=k[n>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[n>>2]=a;hl(a);f=k[n>>2]|0}while((f|0)!=(e|0));Al(Ab,g+-48|0);g=k[n>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[n>>2]=a;hl(a);f=k[n>>2]|0}while((f|0)!=(e|0));Al(zb,g+-48|0);m=(k[n>>2]|0)+-24|0;Zl(yb,58248,zb);g=sl(yb,58648)|0;k[xb+0>>2]=k[g+0>>2];k[xb+4>>2]=k[g+4>>2];k[xb+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[Ab>>0]|0;if(!(g&1)){e=Ab+1|0;g=(g&255)>>>1}else{e=k[Ab+8>>2]|0;g=k[Ab+4>>2]|0}g=jl(xb,e,g)|0;k[wb+0>>2]=k[g+0>>2];k[wb+4>>2]=k[g+4>>2];k[wb+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(wb,58656)|0;k[vb+0>>2]=k[g+0>>2];k[vb+4>>2]=k[g+4>>2];k[vb+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[Bb>>0]|0;if(!(g&1)){e=Bb+1|0;g=(g&255)>>>1}else{e=k[Bb+8>>2]|0;g=k[Bb+4>>2]|0}a=jl(vb,e,g)|0;k[ub+0>>2]=k[a+0>>2];k[ub+4>>2]=k[a+4>>2];k[ub+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(ub,58240)|0;k[tb+0>>2]=k[a+0>>2];k[tb+4>>2]=k[a+4>>2];k[tb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[sb+0>>2]=k[tb+0>>2];k[sb+4>>2]=k[tb+4>>2];k[sb+8>>2]=k[tb+8>>2];k[tb+0>>2]=0;k[tb+4>>2]=0;k[tb+8>>2]=0;a=sb+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(m,sb);hl(sb);tl(tb);tl(ub);tl(vb);tl(wb);tl(xb);tl(yb);tl(zb);tl(Ab);tl(Bb);break a}case 111:{d=i[H+1>>0]|0;if((d|0)==114){nc=a+2|0;Ol(N,58592,1);d=lm(nc,b,N,c)|0;tl(N);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==111){nc=a+2|0;Ol(M,58584,2);d=lm(nc,b,M,c)|0;tl(M);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==82){nc=a+2|0;Ol(O,58600,2);d=lm(nc,b,O,c)|0;tl(O);d=(d|0)==(nc|0)?a:d;break a}else if((d|0)==110){d=nm(a,b,c)|0;break a}else{d=a;break a}}case 112:switch(i[H+1>>0]|0){case 109:{nc=a+2|0;Ol(l,58608,3);d=lm(nc,b,l,c)|0;tl(l);d=(d|0)==(nc|0)?a:d;break a}case 115:{nc=a+2|0;Ol(q,58616,1);d=mm(nc,b,q,c)|0;tl(q);d=(d|0)==(nc|0)?a:d;break a}case 76:{nc=a+2|0;Ol(p,58624,2);d=lm(nc,b,p,c)|0;tl(p);d=(d|0)==(nc|0)?a:d;break a}case 116:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=112){d=a;break a}if((i[a+1>>0]|0)!=116){d=a;break a}nc=a+2|0;e=Ql(nc,b,c)|0;if((e|0)==(nc|0)){d=a;break a}d=Ql(e,b,c)|0;if((d|0)==(e|0)){d=a;break a}h=c+4|0;e=k[h>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(Da,e+-24|0);e=k[h>>2]|0;f=e+-24|0;g=e;do{a=g+-24|0;k[h>>2]=a;hl(a);g=k[h>>2]|0}while((g|0)!=(f|0));sl(e+-48|0,58808)|0;e=i[Da>>0]|0;if(!(e&1)){g=Da+1|0;e=(e&255)>>>1}else{g=k[Da+8>>2]|0;e=k[Da+4>>2]|0}jl((k[h>>2]|0)+-24|0,g,e)|0;tl(Da);break a}case 108:{nc=a+2|0;Ol(o,58616,1);d=lm(nc,b,o,c)|0;tl(o);d=(d|0)==(nc|0)?a:d;break a}case 112:{g=a+2|0;if((g|0)!=(b|0)?(i[g>>0]|0)==95:0){nc=a+3|0;Ol(P,58632,2);d=mm(nc,b,P,c)|0;tl(P);d=(d|0)==(nc|0)?a:d;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(ka,a);nc=rl(ka,0,58248)|0;k[ja+0>>2]=k[nc+0>>2];k[ja+4>>2]=k[nc+4>>2];k[ja+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(ja,58640)|0;k[ia+0>>2]=k[nc+0>>2];k[ia+4>>2]=k[nc+4>>2];k[ia+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[ha+0>>2]=k[ia+0>>2];k[ha+4>>2]=k[ia+4>>2];k[ha+8>>2]=k[ia+8>>2];k[ia+0>>2]=0;k[ia+4>>2]=0;k[ia+8>>2]=0;nc=ha+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,ha);hl(ha);tl(ia);tl(ja);tl(ka);break a}default:{d=a;break a}}case 84:{d=Sl(a,b,c)|0;break a}case 102:{d=km(a,b,c)|0;break a}case 76:{d=jm(a,b,c)|0;break a}case 97:switch(i[H+1>>0]|0){case 78:{nc=a+2|0;Ol(A,58384,2);d=lm(nc,b,A,c)|0;tl(A);d=(d|0)==(nc|0)?a:d;break a}case 97:{nc=a+2|0;Ol(x,58256,2);d=lm(nc,b,x,c)|0;tl(x);d=(d|0)==(nc|0)?a:d;break a}case 122:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=97){d=a;break a}if((i[a+1>>0]|0)!=122){d=a;break a}nc=a+2|0;d=Ql(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}p=g+-24|0;Al(rb,p);a=rl(rb,0,60144)|0;k[qb+0>>2]=k[a+0>>2];k[qb+4>>2]=k[a+4>>2];k[qb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(qb,58240)|0;k[pb+0>>2]=k[a+0>>2];k[pb+4>>2]=k[a+4>>2];k[pb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;do if(i[p>>0]&1){o=g+-16|0;i[k[o>>2]>>0]=0;m=g+-20|0;k[m>>2]=0;g=i[p>>0]|0;if(!(g&1))h=10;else{h=k[p>>2]|0;g=h&255;h=(h&-2)+-1|0}if(!(g&1)){e=(g&255)>>>1;if((g&255)<22){n=1;j=10;l=e}else{n=1;j=(e+16&240)+-1|0;l=e}}else{n=0;j=10;l=0}if((j|0)!=(h|0)){if((j|0)==10){f=p+1|0;e=k[o>>2]|0;if(n){_m(f|0,e|0,((g&255)>>>1)+1|0)|0;ym(e)}else{i[f>>0]=i[e>>0]|0;ym(e)}i[p>>0]=l<<1;break}e=j+1|0;f=xm(e)|0;if(!(j>>>0<=h>>>0&(f|0)==0)){if(n)_m(f|0,p+1|0,((g&255)>>>1)+1|0)|0;else{a=k[o>>2]|0;i[f>>0]=i[a>>0]|0;ym(a)}k[p>>2]=e|1;k[m>>2]=l;k[o>>2]=f}}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[pb+0>>2];k[p+4>>2]=k[pb+4>>2];k[p+8>>2]=k[pb+8>>2];k[pb+0>>2]=0;k[pb+4>>2]=0;k[pb+8>>2]=0;tl(pb);tl(qb);tl(rb);break a}case 110:{nc=a+2|0;Ol(z,58296,1);d=lm(nc,b,z,c)|0;tl(z);d=(d|0)==(nc|0)?a:d;break a}case 83:{nc=a+2|0;Ol(B,58392,1);d=lm(nc,b,B,c)|0;tl(B);d=(d|0)==(nc|0)?a:d;break a}case 100:{nc=a+2|0;Ol(y,58296,1);d=mm(nc,b,y,c)|0;tl(y);d=(d|0)==(nc|0)?a:d;break a}case 116:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=97){d=a;break a}if((i[a+1>>0]|0)!=116){d=a;break a}nc=a+2|0;d=ul(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}p=g+-24|0;Al(_b,p);a=rl(_b,0,60144)|0;k[Zb+0>>2]=k[a+0>>2];k[Zb+4>>2]=k[a+4>>2];k[Zb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(Zb,58240)|0;k[oc+0>>2]=k[a+0>>2];k[oc+4>>2]=k[a+4>>2];k[oc+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;do if(i[p>>0]&1){o=g+-16|0;i[k[o>>2]>>0]=0;l=g+-20|0;k[l>>2]=0;g=i[p>>0]|0;if(!(g&1))h=10;else{h=k[p>>2]|0;g=h&255;h=(h&-2)+-1|0}if(!(g&1)){e=(g&255)>>>1;if((g&255)<22){n=1;j=10;m=e}else{n=1;j=(e+16&240)+-1|0;m=e}}else{n=0;j=10;m=0}if((j|0)!=(h|0)){if((j|0)==10){f=p+1|0;e=k[o>>2]|0;if(n){_m(f|0,e|0,((g&255)>>>1)+1|0)|0;ym(e)}else{i[f>>0]=i[e>>0]|0;ym(e)}i[p>>0]=m<<1;break}e=j+1|0;f=xm(e)|0;if(!(j>>>0<=h>>>0&(f|0)==0)){if(n)_m(f|0,p+1|0,((g&255)>>>1)+1|0)|0;else{a=k[o>>2]|0;i[f>>0]=i[a>>0]|0;ym(a)}k[p>>2]=e|1;k[l>>2]=m;k[o>>2]=f}}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[oc+0>>2];k[p+4>>2]=k[oc+4>>2];k[p+8>>2]=k[oc+8>>2];k[oc+0>>2]=0;k[oc+4>>2]=0;k[oc+8>>2]=0;tl(oc);tl(Zb);tl(_b);break a}default:{d=a;break a}}case 99:switch(i[H+1>>0]|0){case 108:{if(!w){d=a;break a}if((i[a>>0]|0)!=99){d=a;break a}if((i[a+1>>0]|0)!=108){d=a;break a}nc=a+2|0;e=Ql(nc,b,c)|0;if((e|0)==(nc|0)|(e|0)==(b|0)){d=a;break a}q=c+4|0;h=k[q>>2]|0;if((k[c>>2]|0)==(h|0)){d=a;break a}d=h+-12|0;g=i[d>>0]|0;if(!(g&1)){f=d+1|0;d=(g&255)>>>1}else{f=k[h+-4>>2]|0;d=k[h+-8>>2]|0}jl(h+-24|0,f,d)|0;d=k[q>>2]|0;p=d+-12|0;k[Mb+0>>2]=0;k[Mb+4>>2]=0;k[Mb+8>>2]=0;do if(i[p>>0]&1){o=d+-4|0;i[k[o>>2]>>0]=0;j=d+-8|0;k[j>>2]=0;d=i[p>>0]|0;if(!(d&1))n=10;else{n=k[p>>2]|0;d=n&255;n=(n&-2)+-1|0}if(!(d&1)){g=(d&255)>>>1;if((d&255)<22){l=1;f=10;h=g}else{l=1;f=(g+16&240)+-1|0;h=g}}else{l=0;f=10;h=0}if((f|0)!=(n|0)){if((f|0)==10){f=p+1|0;g=k[o>>2]|0;if(l){_m(f|0,g|0,((d&255)>>>1)+1|0)|0;ym(g)}else{i[f>>0]=i[g>>0]|0;ym(g)}i[p>>0]=h<<1;break}m=f+1|0;g=xm(m)|0;if(!(f>>>0<=n>>>0&(g|0)==0)){if(l)_m(g|0,p+1|0,((d&255)>>>1)+1|0)|0;else{nc=k[o>>2]|0;i[g>>0]=i[nc>>0]|0;ym(nc)}k[p>>2]=m|1;k[j>>2]=h;k[o>>2]=g}}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[Mb+0>>2];k[p+4>>2]=k[Mb+4>>2];k[p+8>>2]=k[Mb+8>>2];k[Mb+0>>2]=0;k[Mb+4>>2]=0;k[Mb+8>>2]=0;tl(Mb);sl((k[q>>2]|0)+-24|0,58248)|0;b:do if((i[e>>0]|0)!=69){n=dc+1|0;h=dc+8|0;l=dc+4|0;d=e;while(1){e=Ql(d,b,c)|0;if((e|0)==(d|0)|(e|0)==(b|0)){d=a;break a}d=k[q>>2]|0;if((k[c>>2]|0)==(d|0)){d=a;break a}Al(dc,d+-24|0);m=k[q>>2]|0;f=m+-24|0;d=m;do{nc=d+-24|0;k[q>>2]=nc;hl(nc);d=k[q>>2]|0}while((d|0)!=(f|0));j=i[dc>>0]|0;d=(j&1)==0;if(d)g=(j&255)>>>1;else g=k[l>>2]|0;if(g){if((k[c>>2]|0)==(f|0))break;if(d){g=n;d=(j&255)>>>1}else{g=k[h>>2]|0;d=k[l>>2]|0}jl(m+-48|0,g,d)|0}tl(dc);if((i[e>>0]|0)==69)break b;else d=e}tl(dc);d=a;break a}while(0);d=k[q>>2]|0;if((k[c>>2]|0)==(d|0)){d=a;break a}sl(d+-24|0,58240)|0;d=e+1|0;break a}case 99:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=99){d=a;break a}if((i[a+1>>0]|0)!=99){d=a;break a}nc=a+2|0;g=ul(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}j=c+4|0;g=k[j>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(ib,g+-24|0);g=k[j>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[j>>2]=a;hl(a);f=k[j>>2]|0}while((f|0)!=(e|0));e=g+-48|0;Al(Fa,e);g=rl(Fa,0,60128)|0;k[Ea+0>>2]=k[g+0>>2];k[Ea+4>>2]=k[g+4>>2];k[Ea+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(Ea,58776)|0;k[$a+0>>2]=k[g+0>>2];k[$a+4>>2]=k[g+4>>2];k[$a+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[ib>>0]|0;if(!(g&1)){f=ib+1|0;g=(g&255)>>>1}else{f=k[ib+8>>2]|0;g=k[ib+4>>2]|0}a=jl($a,f,g)|0;k[_a+0>>2]=k[a+0>>2];k[_a+4>>2]=k[a+4>>2];k[_a+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(_a,58240)|0;k[Za+0>>2]=k[a+0>>2];k[Za+4>>2]=k[a+4>>2];k[Za+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[Ya+0>>2]=k[Za+0>>2];k[Ya+4>>2]=k[Za+4>>2];k[Ya+8>>2]=k[Za+8>>2];k[Za+0>>2]=0;k[Za+4>>2]=0;k[Za+8>>2]=0;a=Ya+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,Ya);hl(Ya);tl(Za);tl(_a);tl($a);tl(Ea);tl(Fa);tl(ib);break a}case 111:{nc=a+2|0;Ol(D,58408,1);d=mm(nc,b,D,c)|0;tl(D);d=(d|0)==(nc|0)?a:d;break a}case 118:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=99){d=a;break a}if((i[a+1>>0]|0)!=118){d=a;break a}mc=c+63|0;lc=i[mc>>0]|0;i[mc>>0]=0;nc=a+2|0;g=ul(nc,b,c)|0;i[mc>>0]=lc;if((g|0)==(nc|0)|(g|0)==(b|0)){d=a;break a}if((i[g>>0]|0)!=95){d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}}else{d=g+1|0;if((d|0)==(b|0)){d=a;break a}g=i[d>>0]|0;c:do if(g<<24>>24==69){e=c+4|0;g=k[e>>2]|0;f=k[c+8>>2]|0;if(g>>>0<f>>>0){if(!g)g=0;else{k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=0;k[g+16>>2]=0;k[g+20>>2]=0;g=k[e>>2]|0}k[e>>2]=g+24;break}m=k[c>>2]|0;n=(g-m|0)/24|0;e=n+1|0;if((e|0)<0)Fl(c);g=(f-m|0)/24|0;if(g>>>0<1073741823){g=g<<1;g=g>>>0<e>>>0?e:g}else g=2147483647;Kl(oc,g,n,c+12|0);g=oc+8|0;e=k[g>>2]|0;if(e){k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=0;k[e+16>>2]=0;k[e+20>>2]=0}k[g>>2]=e+24;Ml(c,oc);Ll(oc)}else while(1){if(g<<24>>24==69)break c;e=Ql(d,b,c)|0;if((e|0)==(d|0)|(e|0)==(b|0)){d=a;break a}g=i[e>>0]|0;d=e}while(0);d=d+1|0}j=c+4|0;g=k[j>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(Yb,g+-24|0);g=k[j>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[j>>2]=a;hl(a);f=k[j>>2]|0}while((f|0)!=(e|0));e=g+-48|0;Al(Xb,e);g=rl(Xb,0,58248)|0;k[Wb+0>>2]=k[g+0>>2];k[Wb+4>>2]=k[g+4>>2];k[Wb+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(Wb,60008)|0;k[Vb+0>>2]=k[g+0>>2];k[Vb+4>>2]=k[g+4>>2];k[Vb+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[Yb>>0]|0;if(!(g&1)){f=Yb+1|0;g=(g&255)>>>1}else{f=k[Yb+8>>2]|0;g=k[Yb+4>>2]|0}a=jl(Vb,f,g)|0;k[Ub+0>>2]=k[a+0>>2];k[Ub+4>>2]=k[a+4>>2];k[Ub+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(Ub,58240)|0;k[Tb+0>>2]=k[a+0>>2];k[Tb+4>>2]=k[a+4>>2];k[Tb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[Sb+0>>2]=k[Tb+0>>2];k[Sb+4>>2]=k[Tb+4>>2];k[Sb+8>>2]=k[Tb+8>>2];k[Tb+0>>2]=0;k[Tb+4>>2]=0;k[Tb+8>>2]=0;a=Sb+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,Sb);hl(Sb);tl(Tb);tl(Ub);tl(Vb);tl(Wb);tl(Xb);tl(Yb);break a}case 109:{nc=a+2|0;Ol(C,58400,1);d=lm(nc,b,C,c)|0;tl(C);d=(d|0)==(nc|0)?a:d;break a}default:{d=a;break a}}case 100:switch(i[H+1>>0]|0){case 116:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=100){d=a;break a}if((i[a+1>>0]|0)!=116){d=a;break a}nc=a+2|0;g=Ql(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=nm(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}f=c+4|0;g=k[f>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(Ca,g+-24|0);h=k[f>>2]|0;g=h+-24|0;e=h;do{a=e+-24|0;k[f>>2]=a;hl(a);e=k[f>>2]|0}while((e|0)!=(g|0));Zl(Aa,62960,Ca);g=i[Aa>>0]|0;if(!(g&1)){e=Aa+1|0;g=(g&255)>>>1}else{e=k[Aa+8>>2]|0;g=k[Aa+4>>2]|0}jl(h+-48|0,e,g)|0;tl(Aa);tl(Ca);break a}case 118:{nc=a+2|0;Ol(F,58448,1);d=lm(nc,b,F,c)|0;tl(F);d=(d|0)==(nc|0)?a:d;break a}case 86:{nc=a+2|0;Ol(G,58456,2);d=lm(nc,b,G,c)|0;tl(G);d=(d|0)==(nc|0)?a:d;break a}case 97:{nc=H+2|0;d=Ql(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=c+4|0;f=k[g>>2]|0;if((k[c>>2]|0)==(f|0)){d=a;break a}p=f+-24|0;if(ya)Ol(Eb,58416,2);else{k[Eb+0>>2]=0;k[Eb+4>>2]=0;k[Eb+8>>2]=0}a=sl(Eb,58424)|0;k[Db+0>>2]=k[a+0>>2];k[Db+4>>2]=k[a+4>>2];k[Db+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Al(Fb,(k[g>>2]|0)+-24|0);g=i[Fb>>0]|0;if(!(g&1)){e=Fb+1|0;g=(g&255)>>>1}else{e=k[Fb+8>>2]|0;g=k[Fb+4>>2]|0}a=jl(Db,e,g)|0;k[Cb+0>>2]=k[a+0>>2];k[Cb+4>>2]=k[a+4>>2];k[Cb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;do if(i[p>>0]&1){o=f+-16|0;i[k[o>>2]>>0]=0;n=f+-20|0;k[n>>2]=0;g=i[p>>0]|0;if(!(g&1))j=10;else{j=k[p>>2]|0;g=j&255;j=(j&-2)+-1|0}if(!(g&1)){e=(g&255)>>>1;if((g&255)<22){l=1;m=10;h=e}else{l=1;m=(e+16&240)+-1|0;h=e}}else{l=0;m=10;h=0}if((m|0)!=(j|0)){if((m|0)==10){f=p+1|0;e=k[o>>2]|0;if(l){_m(f|0,e|0,((g&255)>>>1)+1|0)|0;ym(e)}else{i[f>>0]=i[e>>0]|0;ym(e)}i[p>>0]=h<<1;break}e=m+1|0;f=xm(e)|0;if(!(m>>>0<=j>>>0&(f|0)==0)){if(l)_m(f|0,p+1|0,((g&255)>>>1)+1|0)|0;else{a=k[o>>2]|0;i[f>>0]=i[a>>0]|0;ym(a)}k[p>>2]=e|1;k[n>>2]=h;k[o>>2]=f}}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[Cb+0>>2];k[p+4>>2]=k[Cb+4>>2];k[p+8>>2]=k[Cb+8>>2];k[Cb+0>>2]=0;k[Cb+4>>2]=0;k[Cb+8>>2]=0;tl(Cb);tl(Fb);tl(Db);tl(Eb);break a}case 108:{nc=H+2|0;d=Ql(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=c+4|0;f=k[g>>2]|0;if((k[c>>2]|0)==(f|0)){d=a;break a}p=f+-24|0;if(ya)Ol(Ib,58416,2);else{k[Ib+0>>2]=0;k[Ib+4>>2]=0;k[Ib+8>>2]=0}a=sl(Ib,58440)|0;k[Hb+0>>2]=k[a+0>>2];k[Hb+4>>2]=k[a+4>>2];k[Hb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Al(Jb,(k[g>>2]|0)+-24|0);g=i[Jb>>0]|0;if(!(g&1)){e=Jb+1|0;g=(g&255)>>>1}else{e=k[Jb+8>>2]|0;g=k[Jb+4>>2]|0}a=jl(Hb,e,g)|0;k[Gb+0>>2]=k[a+0>>2];k[Gb+4>>2]=k[a+4>>2];k[Gb+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;do if(i[p>>0]&1){o=f+-16|0;i[k[o>>2]>>0]=0;n=f+-20|0;k[n>>2]=0;g=i[p>>0]|0;if(!(g&1))j=10;else{j=k[p>>2]|0;g=j&255;j=(j&-2)+-1|0}if(!(g&1)){e=(g&255)>>>1;if((g&255)<22){l=1;m=10;h=e}else{l=1;m=(e+16&240)+-1|0;h=e}}else{l=0;m=10;h=0}if((m|0)!=(j|0)){if((m|0)==10){f=p+1|0;e=k[o>>2]|0;if(l){_m(f|0,e|0,((g&255)>>>1)+1|0)|0;ym(e)}else{i[f>>0]=i[e>>0]|0;ym(e)}i[p>>0]=h<<1;break}e=m+1|0;f=xm(e)|0;if(!(m>>>0<=j>>>0&(f|0)==0)){if(l)_m(f|0,p+1|0,((g&255)>>>1)+1|0)|0;else{a=k[o>>2]|0;i[f>>0]=i[a>>0]|0;ym(a)}k[p>>2]=e|1;k[n>>2]=h;k[o>>2]=f}}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[Gb+0>>2];k[p+4>>2]=k[Gb+4>>2];k[p+8>>2]=k[Gb+8>>2];k[Gb+0>>2]=0;k[Gb+4>>2]=0;k[Gb+8>>2]=0;tl(Gb);tl(Jb);tl(Hb);tl(Ib);break a}case 99:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=100){d=a;break a}if((i[a+1>>0]|0)!=99){d=a;break a}nc=a+2|0;g=ul(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}j=c+4|0;g=k[j>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(hb,g+-24|0);g=k[j>>2]|0;e=g+-24|0;f=g;do{a=f+-24|0;k[j>>2]=a;hl(a);f=k[j>>2]|0}while((f|0)!=(e|0));e=g+-48|0;Al(La,e);g=rl(La,0,59992)|0;k[Ka+0>>2]=k[g+0>>2];k[Ka+4>>2]=k[g+4>>2];k[Ka+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(Ka,58776)|0;k[Ja+0>>2]=k[g+0>>2];k[Ja+4>>2]=k[g+4>>2];k[Ja+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[hb>>0]|0;if(!(g&1)){f=hb+1|0;g=(g&255)>>>1}else{f=k[hb+8>>2]|0;g=k[hb+4>>2]|0}a=jl(Ja,f,g)|0;k[Ia+0>>2]=k[a+0>>2];k[Ia+4>>2]=k[a+4>>2];k[Ia+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(Ia,58240)|0;k[Ha+0>>2]=k[a+0>>2];k[Ha+4>>2]=k[a+4>>2];k[Ha+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[Ga+0>>2]=k[Ha+0>>2];k[Ga+4>>2]=k[Ha+4>>2];k[Ga+8>>2]=k[Ha+8>>2];k[Ha+0>>2]=0;k[Ha+4>>2]=0;k[Ha+8>>2]=0;a=Ga+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,Ga);hl(Ga);tl(Ha);tl(Ia);tl(Ja);tl(Ka);tl(La);tl(hb);break a}case 110:{d=nm(a,b,c)|0;break a}case 115:{if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=100){d=a;break a}if((i[a+1>>0]|0)!=115){d=a;break a}nc=a+2|0;g=Ql(nc,b,c)|0;if((g|0)==(nc|0)){d=a;break a}d=Ql(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}f=c+4|0;g=k[f>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(Ba,g+-24|0);h=k[f>>2]|0;g=h+-24|0;e=h;do{a=e+-24|0;k[f>>2]=a;hl(a);e=k[f>>2]|0}while((e|0)!=(g|0));Zl(za,58848,Ba);g=i[za>>0]|0;if(!(g&1)){e=za+1|0;g=(g&255)>>>1}else{e=k[za+8>>2]|0;g=k[za+4>>2]|0}jl(h+-48|0,e,g)|0;tl(za);tl(Ba);break a}case 101:{nc=a+2|0;Ol(E,58280,1);d=mm(nc,b,E,c)|0;tl(E);d=(d|0)==(nc|0)?a:d;break a}default:{d=a;break a}}case 116:{d=i[H+1>>0]|0;if((d|0)==105|(d|0)==101){if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=116){d=a;break a}d=i[a+1>>0]|0;if(!(d<<24>>24==105|d<<24>>24==101)){d=a;break a}g=a+2|0;if(d<<24>>24==101)d=Ql(g,b,c)|0;else d=ul(g,b,c)|0;if((d|0)==(g|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(xa,a);nc=rl(xa,0,58712)|0;k[wa+0>>2]=k[nc+0>>2];k[wa+4>>2]=k[nc+4>>2];k[wa+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;nc=sl(wa,58240)|0;k[va+0>>2]=k[nc+0>>2];k[va+4>>2]=k[nc+4>>2];k[va+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[ua+0>>2]=k[va+0>>2];k[ua+4>>2]=k[va+4>>2];k[ua+8>>2]=k[va+8>>2];k[va+0>>2]=0;k[va+4>>2]=0;k[va+8>>2]=0;nc=ua+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,ua);hl(ua);tl(va);tl(wa);tl(xa);break a}else if((d|0)==119){if((W|0)<=2){d=a;break a}if((i[a>>0]|0)!=116){d=a;break a}if((i[a+1>>0]|0)!=119){d=a;break a}nc=a+2|0;d=Ql(nc,b,c)|0;if((d|0)==(nc|0)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}a=g+-24|0;Al(na,a);nc=rl(na,0,58704)|0;k[ma+0>>2]=k[nc+0>>2];k[ma+4>>2]=k[nc+4>>2];k[ma+8>>2]=k[nc+8>>2];k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;k[la+0>>2]=k[ma+0>>2];k[la+4>>2]=k[ma+4>>2];k[la+8>>2]=k[ma+8>>2];k[ma+0>>2]=0;k[ma+4>>2]=0;k[ma+8>>2]=0;nc=la+12|0;k[nc+0>>2]=0;k[nc+4>>2]=0;k[nc+8>>2]=0;Wl(a,la);hl(la);tl(ma);tl(na);break a}else if((d|0)==114){i[mb>>0]=10;j=mb+1|0;i[j+0>>0]=i[58696]|0;i[j+1>>0]=i[58697]|0;i[j+2>>0]=i[58698]|0;i[j+3>>0]=i[58699]|0;i[j+4>>0]=i[58700]|0;i[mb+6>>0]=0;j=mb+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;g=c+4|0;d=k[g>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[mb+0>>2];k[d+4>>2]=k[mb+4>>2];k[d+8>>2]=k[mb+8>>2];k[mb+0>>2]=0;k[mb+4>>2]=0;k[mb+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[g>>2]|0}k[g>>2]=d+24}else{g=k[c>>2]|0;h=(d-g|0)/24|0;e=h+1|0;if((e|0)<0)Fl(c);d=(f-g|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(oc,d,h,c+12|0);d=oc+8|0;g=k[d>>2]|0;if(g){k[g+0>>2]=k[mb+0>>2];k[g+4>>2]=k[mb+4>>2];k[g+8>>2]=k[mb+8>>2];k[mb+0>>2]=0;k[mb+4>>2]=0;k[mb+8>>2]=0;nc=g+12|0;k[nc+0>>2]=k[j+0>>2];k[nc+4>>2]=k[j+4>>2];k[nc+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=g+24;Ml(c,oc);Ll(oc)}hl(mb);d=a+2|0;break a}else{d=a;break a}}case 57:case 56:case 55:case 54:case 53:case 52:case 51:case 50:case 49:{d=nm(a,b,c)|0;break a}default:{d=a;break a}}while(0)}else d=a;while(0);r=pc;return d|0}function Rl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;k[a>>2]=0;d=a+4|0;k[d>>2]=0;c=k[c>>2]|0;e=a+8|0;k[e>>2]=0;k[a+12>>2]=c;c=ml(c,24)|0;k[d>>2]=c;k[a>>2]=c;k[e>>2]=c+24;if(!c)c=0;else{Jl(c,b);Jl(c+12|0,b+12|0);c=k[d>>2]|0}k[d>>2]=c+24;return}function Sl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0;s=r;r=r+80|0;q=s+60|0;l=s;o=s+24|0;p=s+48|0;j=a;a:do if((b-j|0)>1?(i[a>>0]|0)==84:0){d=i[a+1>>0]|0;if(d<<24>>24==95){d=k[c+36>>2]|0;if((k[c+32>>2]|0)==(d|0)){d=a;break}e=k[d+-16>>2]|0;if((e|0)==(k[d+-12>>2]|0)){i[l>>0]=4;j=l+1|0;i[j>>0]=84;i[j+1>>0]=95;i[l+3>>0]=0;j=l+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;h=(d-e|0)/24|0;f=h+1|0;if((f|0)<0)Fl(c);d=(g-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(q,d,h,c+12|0);d=q+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[l+0>>2];k[e+4>>2]=k[l+4>>2];k[e+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;p=e+12|0;k[p+0>>2]=k[j+0>>2];k[p+4>>2]=k[j+4>>2];k[p+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,q);Ll(q)}hl(l);i[c+62>>0]=1;d=a+2|0;break}d=k[e>>2]|0;b=k[e+4>>2]|0;b:do if((d|0)!=(b|0)){j=c+4|0;h=c+8|0;l=c+12|0;m=q+8|0;while(1){e=k[j>>2]|0;if((e|0)==(k[h>>2]|0)){f=(e-(k[c>>2]|0)|0)/24|0;g=f+1|0;if((g|0)<0)break;if(f>>>0<1073741823){e=f<<1;e=e>>>0<g>>>0?g:e}else e=2147483647;Kl(q,e,f,l);e=k[m>>2]|0;if(e){Jl(e,d);Jl(e+12|0,d+12|0)}k[m>>2]=e+24;Ml(c,q);Ll(q)}else{if(!e)e=0;else{Jl(e,d);Jl(e+12|0,d+12|0);e=k[j>>2]|0}k[j>>2]=e+24}d=d+24|0;if((d|0)==(b|0))break b}Fl(c)}while(0);d=a+2|0;break}d=(d<<24>>24)+-48|0;if(d>>>0<10?(g=a+2|0,(g|0)!=(b|0)):0){f=g;while(1){g=i[f>>0]|0;e=(g<<24>>24)+-48|0;if(e>>>0>=10){n=f;break}f=f+1|0;if((f|0)==(b|0)){d=a;break a}else d=e+(d*10|0)|0}if(g<<24>>24==95?(m=k[c+36>>2]|0,(k[c+32>>2]|0)!=(m|0)):0){d=d+1|0;e=k[m+-16>>2]|0;if(d>>>0<(k[m+-12>>2]|0)-e>>4>>>0){f=k[e+(d<<4)>>2]|0;e=k[e+(d<<4)+4>>2]|0;c:do if((f|0)!=(e|0)){j=c+4|0;h=c+8|0;l=c+12|0;b=q+8|0;while(1){d=k[j>>2]|0;if((d|0)==(k[h>>2]|0)){g=(d-(k[c>>2]|0)|0)/24|0;d=g+1|0;if((d|0)<0)break;if(g>>>0<1073741823){a=g<<1;d=a>>>0<d>>>0?d:a}else d=2147483647;Kl(q,d,g,l);d=k[b>>2]|0;if(d){Jl(d,f);Jl(d+12|0,f+12|0)}k[b>>2]=d+24;Ml(c,q);Ll(q)}else{if(!d)d=0;else{Jl(d,f);Jl(d+12|0,f+12|0);d=k[j>>2]|0}k[j>>2]=d+24}f=f+24|0;if((f|0)==(e|0))break c}Fl(c)}while(0);d=n+1|0;break}d=n+1|0;h=d-j|0;if(h>>>0>4294967279)ql(p);if(h>>>0<11){i[p>>0]=h<<1;e=p+1|0}else{l=h+16&-16;e=xm(l)|0;k[p+8>>2]=e;k[p>>2]=l|1;k[p+4>>2]=h}if((d|0)!=(a|0)){g=a;f=84;j=e;while(1){i[j>>0]=f;f=g+1|0;if((g|0)==(n|0))break;g=f;f=i[f>>0]|0;j=j+1|0}e=e+h|0}i[e>>0]=0;k[o+0>>2]=k[p+0>>2];k[o+4>>2]=k[p+4>>2];k[o+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;b=o+12|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;f=c+4|0;e=k[f>>2]|0;h=k[c+8>>2]|0;if(e>>>0<h>>>0){if(!e)e=0;else{k[e+0>>2]=k[o+0>>2];k[e+4>>2]=k[o+4>>2];k[e+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;e=e+12|0;k[e+0>>2]=k[b+0>>2];k[e+4>>2]=k[b+4>>2];k[e+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;e=k[f>>2]|0}k[f>>2]=e+24}else{f=k[c>>2]|0;j=(e-f|0)/24|0;g=j+1|0;if((g|0)<0)Fl(c);e=(h-f|0)/24|0;if(e>>>0<1073741823){e=e<<1;e=e>>>0<g>>>0?g:e}else e=2147483647;Kl(q,e,j,c+12|0);e=q+8|0;f=k[e>>2]|0;if(f){k[f+0>>2]=k[o+0>>2];k[f+4>>2]=k[o+4>>2];k[f+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;a=f+12|0;k[a+0>>2]=k[b+0>>2];k[a+4>>2]=k[b+4>>2];k[a+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0}k[e>>2]=f+24;Ml(c,q);Ll(q)}hl(o);tl(p);i[c+62>>0]=1}else d=a}else d=a}else d=a;while(0);r=s;return d|0}function Tl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;M=r;r=r+80|0;I=M+60|0;L=M;E=M+12|0;J=M+24|0;K=M+48|0;a:do if((b-a|0)>1?(i[a>>0]|0)==73:0){F=c+61|0;if((i[F>>0]|0)!=0?(e=k[c+36>>2]|0,d=k[e+-16>>2]|0,e=e+-12|0,f=k[e>>2]|0,(f|0)!=(d|0)):0)do{D=f+-16|0;k[e>>2]=D;il(D);f=k[e>>2]|0}while((f|0)!=(d|0));f=a+1|0;Ol(L,58328,1);b:do if((i[f>>0]|0)!=69){q=c+4|0;s=c+36|0;t=c+12|0;u=I+8|0;v=I+8|0;w=E+1|0;x=E+8|0;y=E+4|0;z=L+4|0;D=c+32|0;A=c+40|0;B=c+44|0;C=I+8|0;c:while(1){do if(i[F>>0]|0){l=k[t>>2]|0;d=k[s>>2]|0;e=k[A>>2]|0;if(d>>>0<e>>>0){if(!d)d=0;else{k[d>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;k[d+12>>2]=l;d=k[s>>2]|0}k[s>>2]=d+16;break}h=k[D>>2]|0;j=d-h>>4;g=j+1|0;if((g|0)<0){f=16;break c}d=e-h|0;if(d>>4>>>0<1073741823){d=d>>3;d=d>>>0<g>>>0?g:d}else d=2147483647;dl(I,d,j,B);d=k[C>>2]|0;if(d){k[d>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;k[d+12>>2]=l}k[C>>2]=d+16;el(D,I);fl(I)}while(0);p=((k[q>>2]|0)-(k[c>>2]|0)|0)/24|0;o=om(f,b,c)|0;d=((k[q>>2]|0)-(k[c>>2]|0)|0)/24|0;if(i[F>>0]|0){h=k[s>>2]|0;e=h+-16|0;do{n=h+-16|0;k[s>>2]=n;nl(n);h=k[s>>2]|0}while((h|0)!=(e|0))}if((o|0)==(f|0)|(o|0)==(b|0)){f=26;break}if(i[F>>0]|0){j=k[s>>2]|0;n=j+-16|0;m=k[t>>2]|0;e=j+-12|0;f=k[e>>2]|0;h=k[j+-8>>2]|0;if(f>>>0<h>>>0){if(!f)f=0;else{k[f>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;k[f+12>>2]=m;f=k[e>>2]|0}k[e>>2]=f+16}else{l=k[n>>2]|0;g=f-l>>4;e=g+1|0;if((e|0)<0){a=n;f=33;break}f=h-l|0;if(f>>4>>>0<1073741823){f=f>>3;f=f>>>0<e>>>0?e:f}else f=2147483647;Gl(I,f,g,j+-4|0);f=k[u>>2]|0;if(f){k[f>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;k[f+12>>2]=m}k[u>>2]=f+16;Hl(n,I);Il(I)}if(p>>>0<d>>>0){m=p;do{e=k[(k[s>>2]|0)+-12>>2]|0;h=e+-16|0;g=k[c>>2]|0;j=g+(m*24|0)|0;l=e+-12|0;f=k[l>>2]|0;if((f|0)==(k[e+-8>>2]|0)){l=(f-(k[h>>2]|0)|0)/24|0;f=l+1|0;if((f|0)<0){a=h;f=46;break c}if(l>>>0<1073741823){n=l<<1;f=n>>>0<f>>>0?f:n}else f=2147483647;Kl(I,f,l,e+-4|0);f=k[v>>2]|0;if(f){Jl(f,j);Jl(f+12|0,g+(m*24|0)+12|0)}k[v>>2]=f+24;Ml(h,I);Ll(I)}else{if(!f)f=0;else{Jl(f,j);Jl(f+12|0,g+(m*24|0)+12|0);f=k[l>>2]|0}k[l>>2]=f+24}m=m+1|0}while(m>>>0<d>>>0)}}if(p>>>0<d>>>0){h=p;do{f=i[L>>0]|0;if(!(f&1))f=(f&255)>>>1;else f=k[z>>2]|0;if(f>>>0>1)sl(L,58736)|0;Al(E,(k[c>>2]|0)+(h*24|0)|0);f=i[E>>0]|0;if(!(f&1)){e=w;f=(f&255)>>>1}else{e=k[x>>2]|0;f=k[y>>2]|0}jl(L,e,f)|0;tl(E);h=h+1|0}while(h>>>0<d>>>0)}if((d|0)!=(p|0)){e=k[q>>2]|0;do{f=e;e=e+-24|0;do{n=f+-24|0;k[q>>2]=n;hl(n);f=k[q>>2]|0}while((f|0)!=(e|0));d=d+-1|0}while((d|0)!=(p|0))}if((i[o>>0]|0)==69){H=L;G=o;break b}else f=o}if((f|0)==16)Fl(D);else if((f|0)==26){tl(L);break a}else if((f|0)==33)Fl(a);else if((f|0)==46)Fl(a)}else{H=L;G=f}while(0);a=G+1|0;d=i[H>>0]|0;if(!(d&1)){d=(d&255)>>>1;e=L+1|0}else{d=k[L+4>>2]|0;e=k[L+8>>2]|0}if((i[e+(d+-1)>>0]|0)==62)sl(L,60488)|0;else sl(L,58336)|0;k[K+0>>2]=k[H+0>>2];k[K+4>>2]=k[H+4>>2];k[K+8>>2]=k[H+8>>2];k[H+0>>2]=0;k[H+4>>2]=0;k[H+8>>2]=0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;j=J+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[J+0>>2];k[d+4>>2]=k[J+4>>2];k[d+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;h=(d-e|0)/24|0;f=h+1|0;if((f|0)<0)Fl(c);d=(g-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(I,d,h,c+12|0);d=I+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[J+0>>2];k[e+4>>2]=k[J+4>>2];k[e+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;H=e+12|0;k[H+0>>2]=k[j+0>>2];k[H+4>>2]=k[j+4>>2];k[H+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,I);Ll(I)}hl(J);tl(K);tl(L)}while(0);r=M;return a|0}function Ul(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0;t=r;r=r+112|0;q=t+84|0;s=t;j=t+12|0;l=t+24|0;m=t+48|0;n=t+72|0;a:do if(((a|0)!=(b|0)?(e=(i[a>>0]|0)+-48|0,e>>>0<10):0)?(f=a+1|0,(f|0)!=(b|0)):0){d=(i[f>>0]|0)+-48|0;if(d>>>0<10){g=a;h=f;while(1){f=g+2|0;if((f|0)==(b|0))break a;e=d+(e*10|0)|0;d=(i[f>>0]|0)+-48|0;if(d>>>0>=10){p=h;o=e;break}else{g=h;h=f}}}else{p=a;o=e}if((b-f|0)>>>0>=o>>>0){Ol(s,f,o);a=i[s>>0]|0;if(!(a&1)){a=(a&255)>>>1;d=s+1|0}else{a=k[s+4>>2]|0;d=k[s+8>>2]|0}Ol(j,d,a>>>0<10?a:10);a=i[j>>0]|0;if(!(a&1)){a=(a&255)>>>1;d=j+1|0}else{a=k[j+4>>2]|0;d=k[j+8>>2]|0}b=a>>>0>10;g=(Mm(d,60448,b?10:a)|0)!=0|a>>>0<10;tl(j);if(g|b){k[n+0>>2]=k[s+0>>2];k[n+4>>2]=k[s+4>>2];k[n+8>>2]=k[s+8>>2];k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;k[m+0>>2]=k[n+0>>2];k[m+4>>2]=k[n+4>>2];k[m+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;h=m+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=c+4|0;a=k[d>>2]|0;e=k[c+8>>2]|0;if(a>>>0<e>>>0){if(!a)a=0;else{k[a+0>>2]=k[m+0>>2];k[a+4>>2]=k[m+4>>2];k[a+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;a=a+12|0;k[a+0>>2]=k[h+0>>2];k[a+4>>2]=k[h+4>>2];k[a+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;a=k[d>>2]|0}k[d>>2]=a+24}else{f=k[c>>2]|0;g=(a-f|0)/24|0;d=g+1|0;if((d|0)<0)Fl(c);a=(e-f|0)/24|0;if(a>>>0<1073741823){a=a<<1;a=a>>>0<d>>>0?d:a}else a=2147483647;Kl(q,a,g,c+12|0);a=q+8|0;d=k[a>>2]|0;if(d){k[d+0>>2]=k[m+0>>2];k[d+4>>2]=k[m+4>>2];k[d+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;b=d+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[a>>2]=d+24;Ml(c,q);Ll(q)}hl(m);tl(n)}else{Ol(l,60464,21);h=l+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=c+4|0;a=k[d>>2]|0;f=k[c+8>>2]|0;if(a>>>0<f>>>0){if(!a)a=0;else{k[a+0>>2]=k[l+0>>2];k[a+4>>2]=k[l+4>>2];k[a+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;a=a+12|0;k[a+0>>2]=k[h+0>>2];k[a+4>>2]=k[h+4>>2];k[a+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;a=k[d>>2]|0}k[d>>2]=a+24}else{d=k[c>>2]|0;g=(a-d|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);a=(f-d|0)/24|0;if(a>>>0<1073741823){a=a<<1;a=a>>>0<e>>>0?e:a}else a=2147483647;Kl(q,a,g,c+12|0);a=q+8|0;d=k[a>>2]|0;if(d){k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;n=d+12|0;k[n+0>>2]=k[h+0>>2];k[n+4>>2]=k[h+4>>2];k[n+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[a>>2]=d+24;Ml(c,q);Ll(q)}hl(l)}tl(s);a=p+(o+1)|0}}while(0);r=t;return a|0}function Vl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;d=i[b>>0]|0;if(!(d&1)){f=Zm(c|0)|0;e=(d&255)>>>1;d=b+1|0}else{e=k[b+4>>2]|0;f=Zm(c|0)|0;d=k[b+8>>2]|0}pm(a,d,e,f+e|0);jl(a,c,f)|0;return}function Wl(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0;do if(i[a>>0]&1){m=a+8|0;i[k[m>>2]>>0]=0;j=a+4|0;k[j>>2]=0;c=i[a>>0]|0;if(!(c&1))g=10;else{g=k[a>>2]|0;c=g&255;g=(g&-2)+-1|0}if(!(c&1)){d=(c&255)>>>1;if((c&255)<22){f=10;h=d;l=1}else{f=(d+16&240)+-1|0;h=d;l=1}}else{f=10;h=0;l=0}if((f|0)!=(g|0)){if((f|0)==10){e=a+1|0;d=k[m>>2]|0;if(l){_m(e|0,d|0,((c&255)>>>1)+1|0)|0;ym(d)}else{i[e>>0]=i[d>>0]|0;ym(d)}i[a>>0]=h<<1;break}d=f+1|0;e=xm(d)|0;if(!(f>>>0<=g>>>0&(e|0)==0)){if(l)_m(e|0,a+1|0,((c&255)>>>1)+1|0)|0;else{n=k[m>>2]|0;i[e>>0]=i[n>>0]|0;ym(n)}k[a>>2]=d|1;k[j>>2]=h;k[m>>2]=e}}}else{i[a+1>>0]=0;i[a>>0]=0}while(0);k[a+0>>2]=k[b+0>>2];k[a+4>>2]=k[b+4>>2];k[a+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;n=a+12|0;b=b+12|0;do if(i[n>>0]&1){m=a+20|0;i[k[m>>2]>>0]=0;h=a+16|0;k[h>>2]=0;c=i[n>>0]|0;if(!(c&1))g=10;else{g=k[n>>2]|0;c=g&255;g=(g&-2)+-1|0}if(!(c&1)){d=(c&255)>>>1;if((c&255)<22){f=10;j=d;l=1}else{f=(d+16&240)+-1|0;j=d;l=1}}else{f=10;j=0;l=0}if((f|0)!=(g|0)){if((f|0)==10){e=n+1|0;d=k[m>>2]|0;if(l){_m(e|0,d|0,((c&255)>>>1)+1|0)|0;ym(d)}else{i[e>>0]=i[d>>0]|0;ym(d)}i[n>>0]=j<<1;break}d=f+1|0;e=xm(d)|0;if(!(f>>>0<=g>>>0&(e|0)==0)){if(l)_m(e|0,n+1|0,((c&255)>>>1)+1|0)|0;else{a=k[m>>2]|0;i[e>>0]=i[a>>0]|0;ym(a)}k[n>>2]=d|1;k[h>>2]=j;k[m>>2]=e}}}else{i[n+1>>0]=0;i[n>>0]=0}while(0);k[n+0>>2]=k[b+0>>2];k[n+4>>2]=k[b+4>>2];k[n+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;return}function Xl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0;q=r;r=r+176|0;p=q+144|0;j=q;l=q+24|0;h=q+48|0;m=q+72|0;n=q+96|0;o=q+120|0;a:do if((b-a|0)>1?(i[a>>0]|0)==83:0){f=a+1|0;d=i[f>>0]|0;e=d<<24>>24;switch(e|0){case 98:{im(l,60392);f=c+4|0;d=k[f>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;c=d+12|0;d=l+12|0;k[c+0>>2]=k[d+0>>2];k[c+4>>2]=k[d+4>>2];k[c+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[f>>2]|0}k[f>>2]=d+24}else{f=k[c>>2]|0;g=(d-f|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(b-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(p,d,g,c+12|0);d=p+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[l+0>>2];k[e+4>>2]=k[l+4>>2];k[e+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;n=e+12|0;o=l+12|0;k[n+0>>2]=k[o+0>>2];k[n+4>>2]=k[o+4>>2];k[n+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0}k[d>>2]=e+24;Ml(c,p);Ll(p)}hl(l);a=a+2|0;break a}case 115:{em(h,59624);f=c+4|0;d=k[f>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;c=d+12|0;d=h+12|0;k[c+0>>2]=k[d+0>>2];k[c+4>>2]=k[d+4>>2];k[c+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[f>>2]|0}k[f>>2]=d+24}else{f=k[c>>2]|0;g=(d-f|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(b-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(p,d,g,c+12|0);d=p+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[h+0>>2];k[e+4>>2]=k[h+4>>2];k[e+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;n=e+12|0;o=h+12|0;k[n+0>>2]=k[o+0>>2];k[n+4>>2]=k[o+4>>2];k[n+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0}k[d>>2]=e+24;Ml(c,p);Ll(p)}hl(h);a=a+2|0;break a}case 105:{hm(m,59728);e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[m+0>>2];k[d+4>>2]=k[m+4>>2];k[d+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;c=d+12|0;d=m+12|0;k[c+0>>2]=k[d+0>>2];k[c+4>>2]=k[d+4>>2];k[c+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{f=k[c>>2]|0;b=(d-f|0)/24|0;e=b+1|0;if((e|0)<0)Fl(c);d=(g-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(p,d,b,c+12|0);d=p+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[m+0>>2];k[e+4>>2]=k[m+4>>2];k[e+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;n=e+12|0;o=m+12|0;k[n+0>>2]=k[o+0>>2];k[n+4>>2]=k[o+4>>2];k[n+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0}k[d>>2]=e+24;Ml(c,p);Ll(p)}hl(m);a=a+2|0;break a}case 97:{gm(j,60376);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;c=d+12|0;d=j+12|0;k[c+0>>2]=k[d+0>>2];k[c+4>>2]=k[d+4>>2];k[c+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{f=k[c>>2]|0;g=(d-f|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(b-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(p,d,g,c+12|0);d=p+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[j+0>>2];k[e+4>>2]=k[j+4>>2];k[e+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;n=e+12|0;o=j+12|0;k[n+0>>2]=k[o+0>>2];k[n+4>>2]=k[o+4>>2];k[n+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0}k[d>>2]=e+24;Ml(c,p);Ll(p)}hl(j);a=a+2|0;break a}case 111:{hm(n,59816);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[n+0>>2];k[d+4>>2]=k[n+4>>2];k[d+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;c=d+12|0;d=n+12|0;k[c+0>>2]=k[d+0>>2];k[c+4>>2]=k[d+4>>2];k[c+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{f=k[c>>2]|0;g=(d-f|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(b-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(p,d,g,c+12|0);d=p+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[n+0>>2];k[e+4>>2]=k[n+4>>2];k[e+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;m=e+12|0;o=n+12|0;k[m+0>>2]=k[o+0>>2];k[m+4>>2]=k[o+4>>2];k[m+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0}k[d>>2]=e+24;Ml(c,p);Ll(p)}hl(n);a=a+2|0;break a}case 95:{d=k[c+16>>2]|0;if((d|0)==(k[c+20>>2]|0))break a;f=k[d>>2]|0;b=k[d+4>>2]|0;b:do if((f|0)!=(b|0)){g=c+4|0;h=c+8|0;j=c+12|0;l=p+8|0;while(1){d=k[g>>2]|0;if((d|0)==(k[h>>2]|0)){e=(d-(k[c>>2]|0)|0)/24|0;d=e+1|0;if((d|0)<0)break;if(e>>>0<1073741823){o=e<<1;d=o>>>0<d>>>0?d:o}else d=2147483647;Kl(p,d,e,j);d=k[l>>2]|0;if(d){Jl(d,f);Jl(d+12|0,f+12|0)}k[l>>2]=d+24;Ml(c,p);Ll(p)}else{if(!d)d=0;else{Jl(d,f);Jl(d+12|0,f+12|0);d=k[g>>2]|0}k[g>>2]=d+24}f=f+24|0;if((f|0)==(b|0))break b}Fl(c)}while(0);a=a+2|0;break a}case 100:{fm(o,59904);e=c+4|0;d=k[e>>2]|0;b=k[c+8>>2]|0;if(d>>>0<b>>>0){if(!d)d=0;else{k[d+0>>2]=k[o+0>>2];k[d+4>>2]=k[o+4>>2];k[d+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;c=d+12|0;d=o+12|0;k[c+0>>2]=k[d+0>>2];k[c+4>>2]=k[d+4>>2];k[c+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{f=k[c>>2]|0;g=(d-f|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);d=(b-f|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(p,d,g,c+12|0);d=p+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[o+0>>2];k[e+4>>2]=k[o+4>>2];k[e+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;m=e+12|0;n=o+12|0;k[m+0>>2]=k[n+0>>2];k[m+4>>2]=k[n+4>>2];k[m+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0}k[d>>2]=e+24;Ml(c,p);Ll(p)}hl(o);a=a+2|0;break a}default:{if((e+-48|0)>>>0>=10){if(!(Am(e)|0))break a;d=i[f>>0]|0}d=d<<24>>24;e=d+-48|0;f=a+2|0;if((f|0)==(b|0))break a;e=e>>>0<10?e:d+-55|0;while(1){d=i[f>>0]|0;g=d<<24>>24;if((g+-48|0)>>>0>=10){o=(Am(g)|0)==0;d=i[f>>0]|0;if(o)break}d=d<<24>>24;g=d+-48|0;f=f+1|0;if((f|0)==(b|0))break a;else e=(g>>>0<10?g:d+-55|0)+(e*36|0)|0}if(d<<24>>24!=95)break a;d=e+1|0;e=k[c+16>>2]|0;if(d>>>0>=(k[c+20>>2]|0)-e>>4>>>0)break a;a=k[e+(d<<4)>>2]|0;j=k[e+(d<<4)+4>>2]|0;c:do if((a|0)!=(j|0)){l=c+4|0;b=c+8|0;g=c+12|0;h=p+8|0;e=a;while(1){a=k[l>>2]|0;if((a|0)==(k[b>>2]|0)){d=(a-(k[c>>2]|0)|0)/24|0;a=d+1|0;if((a|0)<0)break;if(d>>>0<1073741823){o=d<<1;a=o>>>0<a>>>0?a:o}else a=2147483647;Kl(p,a,d,g);a=k[h>>2]|0;if(a){Jl(a,e);Jl(a+12|0,e+12|0)}k[h>>2]=a+24;Ml(c,p);Ll(p)}else{if(!a)a=0;else{Jl(a,e);Jl(a+12|0,e+12|0);a=k[l>>2]|0}k[l>>2]=a+24}e=e+24|0;if((e|0)==(j|0))break c}Fl(c)}while(0);a=f+1|0;break a}}}while(0);r=q;return a|0}function Yl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0;l=r;r=r+64|0;d=l+40|0;e=l;g=l+12|0;j=l+24|0;if((((((b-a|0)>3?(i[a>>0]|0)==68:0)?(m=i[a+1>>0]|0,(m|0)==84|(m|0)==116):0)?(m=a+2|0,f=Ql(m,b,c)|0,!((f|0)==(m|0)|(f|0)==(b|0))):0)?(i[f>>0]|0)==69:0)?(h=k[c+4>>2]|0,(k[c>>2]|0)!=(h|0)):0){a=h+-24|0;Al(j,a);m=rl(j,0,60360)|0;k[g+0>>2]=k[m+0>>2];k[g+4>>2]=k[m+4>>2];k[g+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;m=sl(g,58240)|0;k[e+0>>2]=k[m+0>>2];k[e+4>>2]=k[m+4>>2];k[e+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;k[d+0>>2]=k[e+0>>2];k[d+4>>2]=k[e+4>>2];k[d+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;m=d+12|0;k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;Wl(a,d);hl(d);tl(e);tl(g);tl(j);a=f+1|0}r=l;return a|0}function Zl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;e=Zm(b|0)|0;d=i[c>>0]|0;if(!(d&1))f=(d&255)>>>1;else f=k[c+4>>2]|0;pm(a,b,e,f+e|0);if(!(i[c>>0]&1))d=c+1|0;else d=k[c+8>>2]|0;jl(a,d,f)|0;return}function _l(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0;d=i[a>>0]|0;if(!(d&1))f=10;else{d=k[a>>2]|0;f=(d&-2)+-1|0;d=d&255}e=(d&1)==0;do if(f>>>0>=c>>>0){if(e)d=a+1|0;else d=k[a+8>>2]|0;an(d|0,b|0,c|0)|0;i[d+c>>0]=0;if(!(i[a>>0]&1)){i[a>>0]=c<<1;break}else{k[a+4>>2]=c;break}}else{if(e)d=(d&255)>>>1;else d=k[a+4>>2]|0;vl(a,f,c-f|0,d,0,d,c,b)}while(0);return}function $l(a,b){a=a|0;b=b|0;var c=0,d=0;if((a|0)!=(b|0)){c=i[b>>0]|0;if(!(c&1)){d=b+1|0;c=(c&255)>>>1}else{d=k[b+8>>2]|0;c=k[b+4>>2]|0}_l(a,d,c)}return}function am(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0;x=r;r=r+224|0;u=x+192|0;j=x+168|0;n=x+152|0;g=x+128|0;o=x+116|0;w=x+104|0;v=x+92|0;m=x+56|0;p=x+40|0;q=x+16|0;s=x;t=x+80|0;a:do if((a|0)!=(b|0)){l=i[a>>0]|0;d=l<<24>>24;switch(d|0){case 57:case 56:case 55:case 54:case 53:case 52:case 51:case 50:case 49:{b=Ul(a,b,c)|0;r=x;return b|0}case 85:{if(!((b-a|0)>2&l<<24>>24==85))break a;f=i[a+1>>0]|0;if((f|0)==116){Ol(n,59592,8);k[j+0>>2]=k[n+0>>2];k[j+4>>2]=k[n+4>>2];k[j+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;l=j+12|0;k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;m=c+4|0;f=k[m>>2]|0;d=k[c+8>>2]|0;if(f>>>0<d>>>0){if(!f)d=0;else{k[f+0>>2]=k[j+0>>2];k[f+4>>2]=k[j+4>>2];k[f+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=f+12|0;k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;d=k[m>>2]|0}k[m>>2]=d+24}else{e=k[c>>2]|0;g=(f-e|0)/24|0;h=g+1|0;if((h|0)<0)Fl(c);f=(d-e|0)/24|0;if(f>>>0<1073741823){f=f<<1;f=f>>>0<h>>>0?h:f}else f=2147483647;Kl(u,f,g,c+12|0);f=u+8|0;d=k[f>>2]|0;if(d){k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;w=d+12|0;k[w+0>>2]=k[l+0>>2];k[w+4>>2]=k[l+4>>2];k[w+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0}k[f>>2]=d+24;Ml(c,u);Ll(u)}hl(j);tl(n);e=a+2|0;if((e|0)==(b|0)){e=k[m>>2]|0;d=e+-24|0;while(1){b=e+-24|0;k[m>>2]=b;hl(b);e=k[m>>2]|0;if((e|0)==(d|0))break a}}if(((i[e>>0]|0)+-48|0)>>>0<10){d=a+3|0;b:do if((d|0)==(b|0))d=b;else while(1){if(((i[d>>0]|0)+-48|0)>>>0>=10)break b;d=d+1|0;if((d|0)==(b|0)){d=b;break}}while(0);rm((k[m>>2]|0)+-24|0,e,d)}else d=e;Cl((k[m>>2]|0)+-24|0,39);if((d|0)!=(b|0)?(i[d>>0]|0)==95:0){a=d+1|0;break a}e=k[m>>2]|0;d=e+-24|0;while(1){b=e+-24|0;k[m>>2]=b;hl(b);e=k[m>>2]|0;if((e|0)==(d|0))break a}}else if((f|0)!=108)break a;Ol(o,59608,9);k[g+0>>2]=k[o+0>>2];k[g+4>>2]=k[o+4>>2];k[g+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;m=g+12|0;k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;s=c+4|0;f=k[s>>2]|0;d=k[c+8>>2]|0;if(f>>>0<d>>>0){if(!f)f=0;else{k[f+0>>2]=k[g+0>>2];k[f+4>>2]=k[g+4>>2];k[f+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;f=f+12|0;k[f+0>>2]=k[m+0>>2];k[f+4>>2]=k[m+4>>2];k[f+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;f=k[s>>2]|0}k[s>>2]=f+24}else{e=k[c>>2]|0;l=(f-e|0)/24|0;h=l+1|0;if((h|0)<0)Fl(c);f=(d-e|0)/24|0;if(f>>>0<1073741823){f=f<<1;f=f>>>0<h>>>0?h:f}else f=2147483647;Kl(u,f,l,c+12|0);f=u+8|0;d=k[f>>2]|0;if(d){k[d+0>>2]=k[g+0>>2];k[d+4>>2]=k[g+4>>2];k[d+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;t=d+12|0;k[t+0>>2]=k[m+0>>2];k[t+4>>2]=k[m+4>>2];k[t+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0}k[f>>2]=d+24;Ml(c,u);Ll(u)}hl(g);tl(o);f=a+2|0;do if((i[f>>0]|0)!=118){l=ul(f,b,c)|0;d=k[s>>2]|0;if((l|0)==(f|0)){e=d+-24|0;while(1){b=d+-24|0;k[s>>2]=b;hl(b);d=k[s>>2]|0;if((d|0)==(e|0))break a}}if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2)break a;Al(w,d+-24|0);e=k[s>>2]|0;f=e+-24|0;d=e;do{u=d+-24|0;k[s>>2]=u;hl(u);d=k[s>>2]|0}while((d|0)!=(f|0));h=i[w>>0]|0;if(!(h&1)){f=w+1|0;d=(h&255)>>>1}else{f=k[w+8>>2]|0;d=k[w+4>>2]|0}jl(e+-48|0,f,d)|0;o=w+1|0;p=w+8|0;q=w+4|0;d=l;while(1){n=ul(d,b,c)|0;e=k[s>>2]|0;if((n|0)==(d|0)){f=111;break}if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2){f=144;break}Al(v,e+-24|0);do if(h&1){j=k[p>>2]|0;i[j>>0]=0;k[q>>2]=0;if(!(h&1))g=10;else{g=k[w>>2]|0;h=g&255;g=(g&-2)+-1|0}if(!(h&1)){f=(h&255)>>>1;if((h&255)<22){m=10;e=1}else{m=(f+16&240)+-1|0;e=1}}else{m=10;f=0;e=0}if((m|0)!=(g|0)){if((m|0)==10){if(e){_m(o|0,j|0,((h&255)>>>1)+1|0)|0;ym(j)}else{i[o>>0]=0;ym(j)}i[w>>0]=f<<1;break}l=m+1|0;d=xm(l)|0;if(!(m>>>0<=g>>>0&(d|0)==0)){if(e)_m(d|0,o|0,((h&255)>>>1)+1|0)|0;else{i[d>>0]=i[j>>0]|0;ym(j)}k[w>>2]=l|1;k[q>>2]=f;k[p>>2]=d}}}else{i[o>>0]=0;i[w>>0]=0}while(0);k[w+0>>2]=k[v+0>>2];k[w+4>>2]=k[v+4>>2];k[w+8>>2]=k[v+8>>2];k[v+0>>2]=0;k[v+4>>2]=0;k[v+8>>2]=0;tl(v);l=k[s>>2]|0;f=l+-24|0;d=l;do{u=d+-24|0;k[s>>2]=u;hl(u);d=k[s>>2]|0}while((d|0)!=(f|0));h=i[w>>0]|0;f=(h&1)==0;if(f)d=(h&255)>>>1;else d=k[q>>2]|0;if(!d){d=n;continue}sl(l+-48|0,58736)|0;if(f){f=o;d=(h&255)>>>1}else{f=k[p>>2]|0;d=k[q>>2]|0}jl((k[s>>2]|0)+-24|0,f,d)|0;d=n}if((f|0)==111){sl(e+-24|0,58240)|0;tl(w);e=d;break}else if((f|0)==144){tl(w);break a}}else{Cl((k[s>>2]|0)+-24|0,41);e=a+3|0}while(0);if((e|0)!=(b|0)?(i[e>>0]|0)==69:0){g=e+1|0;if((g|0)==(b|0)){e=k[s>>2]|0;d=e+-24|0;while(1){b=e+-24|0;k[s>>2]=b;hl(b);e=k[s>>2]|0;if((e|0)==(d|0))break a}}if(((i[g>>0]|0)+-48|0)>>>0<10){d=e+2|0;c:do if((d|0)==(b|0))d=b;else while(1){if(((i[d>>0]|0)+-48|0)>>>0>=10)break c;d=d+1|0;if((d|0)==(b|0)){d=b;break}}while(0);m=k[s>>2]|0;n=m+-24|0;f=i[n>>0]|0;if(!(f&1)){h=10;l=(f&255)>>>1}else{f=k[n>>2]|0;h=(f&-2)+-1|0;l=k[m+-20>>2]|0;f=f&255}j=d-g|0;if((d|0)!=(g|0)){if((h-l|0)>>>0>=j>>>0){if(!(f&1))f=n+1|0;else f=k[m+-16>>2]|0;if((l|0)==7)h=f;else{an(f+(j+7)|0,f+7|0,l+-7|0)|0;h=f}}else{cm(n,h,l+j-h|0,l,7,j);h=k[m+-16>>2]|0}f=l+j|0;if(!(i[n>>0]&1))i[n>>0]=f<<1;else k[m+-20>>2]=f;i[h+f>>0]=0;f=h+7|0;while(1){i[f>>0]=i[g>>0]|0;e=e+2|0;if((e|0)==(d|0))break;else{c=g;g=e;f=f+1|0;e=c}}}else d=g}else d=g;if((d|0)!=(b|0)?(i[d>>0]|0)==95:0){a=d+1|0;break a}e=k[s>>2]|0;d=e+-24|0;while(1){b=e+-24|0;k[s>>2]=b;hl(b);e=k[s>>2]|0;if((e|0)==(d|0))break a}}e=k[s>>2]|0;d=e+-24|0;do{b=e+-24|0;k[s>>2]=b;hl(b);e=k[s>>2]|0}while((e|0)!=(d|0));break}case 68:case 67:{if((b-a|0)<=1)break a;e=c+4|0;f=k[e>>2]|0;if((k[c>>2]|0)==(f|0))break a;if((d|0)==68){b=i[a+1>>0]|0;if(!((b|0)==53|(b|0)==50|(b|0)==49|(b|0)==48))break a;qm(t,f+-24|0);l=rl(t,0,58408)|0;k[s+0>>2]=k[l+0>>2];k[s+4>>2]=k[l+4>>2];k[s+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;k[q+0>>2]=k[s+0>>2];k[q+4>>2]=k[s+4>>2];k[q+8>>2]=k[s+8>>2];k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;l=q+12|0;k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;f=k[e>>2]|0;h=k[c+8>>2]|0;if(f>>>0<h>>>0){if(!f)d=0;else{k[f+0>>2]=k[q+0>>2];k[f+4>>2]=k[q+4>>2];k[f+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;d=f+12|0;k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{d=k[c>>2]|0;g=(f-d|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);f=(h-d|0)/24|0;if(f>>>0<1073741823){f=f<<1;f=f>>>0<e>>>0?e:f}else f=2147483647;Kl(u,f,g,c+12|0);f=u+8|0;d=k[f>>2]|0;if(d){k[d+0>>2]=k[q+0>>2];k[d+4>>2]=k[q+4>>2];k[d+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;b=d+12|0;k[b+0>>2]=k[l+0>>2];k[b+4>>2]=k[l+4>>2];k[b+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0}k[f>>2]=d+24;Ml(c,u);Ll(u)}hl(q);tl(s);tl(t);i[c+60>>0]=1;a=a+2|0;break a}else if((d|0)==67){b=i[a+1>>0]|0;if(!((b|0)==53|(b|0)==51|(b|0)==50|(b|0)==49))break a;qm(p,f+-24|0);k[m+0>>2]=k[p+0>>2];k[m+4>>2]=k[p+4>>2];k[m+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;l=m+12|0;k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;f=k[e>>2]|0;g=k[c+8>>2]|0;if(f>>>0<g>>>0){if(!f)d=0;else{k[f+0>>2]=k[m+0>>2];k[f+4>>2]=k[m+4>>2];k[f+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;d=f+12|0;k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{d=k[c>>2]|0;h=(f-d|0)/24|0;e=h+1|0;if((e|0)<0)Fl(c);f=(g-d|0)/24|0;if(f>>>0<1073741823){d=f<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(u,d,h,c+12|0);d=u+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[m+0>>2];k[e+4>>2]=k[m+4>>2];k[e+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;b=e+12|0;k[b+0>>2]=k[l+0>>2];k[b+4>>2]=k[l+4>>2];k[b+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0}k[d>>2]=e+24;Ml(c,u);Ll(u)}hl(m);tl(p);i[c+60>>0]=1;a=a+2|0;break a}else break a}default:{a=sm(a,b,c)|0;break a}}}while(0);r=x;return a|0}function bm(a,b){a=a|0;b=b|0;var c=0,d=0;a:do if((a|0)!=(b|0)){d=i[a>>0]|0;if(d<<24>>24!=95){if(((d<<24>>24)+-48|0)>>>0>=10)break;while(1){a=a+1|0;if((a|0)==(b|0)){a=b;break a}if(((i[a>>0]|0)+-48|0)>>>0>=10)break a}}d=a+1|0;if((d|0)!=(b|0)){d=i[d>>0]|0;if(((d<<24>>24)+-48|0)>>>0<10){a=a+2|0;break}if(d<<24>>24==95?(c=a+2|0,(c|0)!=(b|0)):0){while(1){d=i[c>>0]|0;c=c+1|0;if(((d<<24>>24)+-48|0)>>>0>=10)break;if((c|0)==(b|0))break a}return (d<<24>>24==95?c:a)|0}}}while(0);return a|0}function cm(a,b,c,d,e,f){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;if((-17-b|0)>>>0<c>>>0)ql(a);if(!(i[a>>0]&1))h=a+1|0;else h=k[a+8>>2]|0;if(b>>>0<2147483623){c=c+b|0;g=b<<1;c=c>>>0<g>>>0?g:c;if(c>>>0<11)c=11;else c=c+16&-16}else c=-17;g=xm(c)|0;if(e)_m(g|0,h|0,e|0)|0;if((d|0)!=(e|0))_m(g+(f+e)|0,h+e|0,d-e|0)|0;if((b|0)!=10)ym(h);k[a+8>>2]=g;k[a>>2]=c|1;return}function dm(a){a=a|0;Ca(60496,58040,1175,60528)}function em(a,b){a=a|0;b=b|0;Ol(a,b,11);a=a+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;return}function fm(a,b){a=a|0;b=b|0;Ol(a,b,13);a=a+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;return}function gm(a,b){a=a|0;b=b|0;Ol(a,b,14);a=a+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;return}function hm(a,b){a=a|0;b=b|0;Ol(a,b,12);a=a+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;return}function im(a,b){a=a|0;b=b|0;Ol(a,b,17);a=a+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;return}function jm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,q=0,s=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;M=r;r=r+416|0;L=M+8|0;H=M;I=M+368|0;J=M+328|0;K=M+316|0;q=M+304|0;z=M+280|0;A=M+256|0;s=M+244|0;u=M+232|0;v=M+220|0;w=M+208|0;d=M+196|0;m=M+352|0;g=M+64|0;e=M+76|0;f=M+100|0;j=M+52|0;h=M+28|0;l=M+40|0;n=M+184|0;B=M+112|0;C=M+136|0;D=M+148|0;E=M+160|0;F=M+172|0;G=M+88|0;y=b;a:do if((y-a|0)>3?(i[a>>0]|0)==76:0){x=a+1|0;do switch(i[x>>0]|0){case 110:{L=a+2|0;Ol(l,60296,8);d=tm(L,b,l,c)|0;tl(l);d=(d|0)==(L|0)?a:d;break a}case 99:{L=a+2|0;Ol(s,60184,4);d=tm(L,b,s,c)|0;tl(s);d=(d|0)==(L|0)?a:d;break a}case 115:{L=a+2|0;Ol(w,60224,5);d=tm(L,b,w,c)|0;tl(w);d=(d|0)==(L|0)?a:d;break a}case 109:{L=a+2|0;Ol(f,60272,2);d=tm(L,b,f,c)|0;tl(f);d=(d|0)==(L|0)?a:d;break a}case 106:{L=a+2|0;Ol(g,60256,1);d=tm(L,b,g,c)|0;tl(g);d=(d|0)==(L|0)?a:d;break a}case 120:{L=a+2|0;Ol(j,60280,2);d=tm(L,b,j,c)|0;tl(j);d=(d|0)==(L|0)?a:d;break a}case 102:{m=a+2|0;b:do if((y-m|0)>>>0>8){h=a+10|0;d=i[m>>0]|0;g=a;e=H;l=m;while(1){if(!(Bm(d<<24>>24)|0)){d=m;break b}d=i[l>>0]|0;G=d+-48|0;f=i[g+3>>0]|0;j=f+-48|0;f=((G>>>0<10?G:d+9|0)<<4)+(j>>>0<10?j:f+169|0)&255;i[e>>0]=f;j=g+4|0;g=e+1|0;d=i[j>>0]|0;if((j|0)==(h|0))break;else{G=l;e=g;l=j;g=G}}if(d<<24>>24==69){c:do if((H|0)!=(g|0)&e>>>0>H>>>0){d=H;while(1){G=i[d>>0]|0;i[d>>0]=f;i[e>>0]=G;d=d+1|0;g=g+-2|0;if(d>>>0>=g>>>0)break c;G=e;f=i[g>>0]|0;e=g;g=G}}while(0);d=I+0|0;g=d+24|0;do{i[d>>0]=0;d=d+1|0}while((d|0)<(g|0));p[t>>3]=+o[H>>2];k[L>>2]=k[t>>2];k[L+4>>2]=k[t+4>>2];d=Im(I,24,60352,L)|0;if(d>>>0<=23){Ol(K,I,d);k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;j=J+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[J+0>>2];k[d+4>>2]=k[J+4>>2];k[d+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{g=k[c>>2]|0;h=(d-g|0)/24|0;e=h+1|0;if((e|0)<0)Fl(c);d=(f-g|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(L,d,h,c+12|0);d=L+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[J+0>>2];k[e+4>>2]=k[J+4>>2];k[e+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;I=e+12|0;k[I+0>>2]=k[j+0>>2];k[I+4>>2]=k[j+4>>2];k[I+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,L);Ll(L)}hl(J);tl(K);d=a+11|0}else d=m}else d=m}else d=m;while(0);d=(d|0)==(m|0)?a:d;break a}case 116:{L=a+2|0;Ol(d,60232,14);c=tm(L,b,d,c)|0;tl(d);d=(c|0)==(L|0)?a:c;break a}case 111:{L=a+2|0;Ol(n,60312,17);d=tm(L,b,n,c)|0;tl(n);d=(d|0)==(L|0)?a:d;break a}case 98:{if((i[a+3>>0]|0)!=69){d=a;break a}d=i[a+2>>0]|0;if((d|0)==48){i[z>>0]=10;j=z+1|0;i[j+0>>0]=i[60176]|0;i[j+1>>0]=i[60177]|0;i[j+2>>0]=i[60178]|0;i[j+3>>0]=i[60179]|0;i[j+4>>0]=i[60180]|0;i[z+6>>0]=0;j=z+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[z+0>>2];k[d+4>>2]=k[z+4>>2];k[d+8>>2]=k[z+8>>2];k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;h=(d-e|0)/24|0;f=h+1|0;if((f|0)<0)Fl(c);d=(g-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(L,d,h,c+12|0);d=L+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[z+0>>2];k[e+4>>2]=k[z+4>>2];k[e+8>>2]=k[z+8>>2];k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;K=e+12|0;k[K+0>>2]=k[j+0>>2];k[K+4>>2]=k[j+4>>2];k[K+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,L);Ll(L)}hl(z);d=a+4|0;break a}else if((d|0)==49){i[A>>0]=8;j=A+1|0;i[j>>0]=116;i[j+1>>0]=114;i[j+2>>0]=117;i[j+3>>0]=101;i[A+5>>0]=0;j=A+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;g=k[c+8>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d+0>>2]=k[A+0>>2];k[d+4>>2]=k[A+4>>2];k[d+8>>2]=k[A+8>>2];k[A+0>>2]=0;k[A+4>>2]=0;k[A+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{e=k[c>>2]|0;h=(d-e|0)/24|0;f=h+1|0;if((f|0)<0)Fl(c);d=(g-e|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<f>>>0?f:d}else d=2147483647;Kl(L,d,h,c+12|0);d=L+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[A+0>>2];k[e+4>>2]=k[A+4>>2];k[e+8>>2]=k[A+8>>2];k[A+0>>2]=0;k[A+4>>2]=0;k[A+8>>2]=0;K=e+12|0;k[K+0>>2]=k[j+0>>2];k[K+4>>2]=k[j+4>>2];k[K+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,L);Ll(L)}hl(A);d=a+4|0;break a}else{d=a;break a}}case 108:{L=a+2|0;Ol(e,60264,1);d=tm(L,b,e,c)|0;tl(e);d=(d|0)==(L|0)?a:d;break a}case 105:{L=a+2|0;Ol(m,60248,0);d=tm(L,b,m,c)|0;tl(m);d=(d|0)==(L|0)?a:d;break a}case 97:{L=a+2|0;Ol(u,60192,11);d=tm(L,b,u,c)|0;tl(u);d=(d|0)==(L|0)?a:d;break a}case 119:{L=a+2|0;Ol(q,60168,7);d=tm(L,b,q,c)|0;tl(q);d=(d|0)==(L|0)?a:d;break a}case 104:{L=a+2|0;Ol(v,60208,13);d=tm(L,b,v,c)|0;tl(v);d=(d|0)==(L|0)?a:d;break a}case 121:{L=a+2|0;Ol(h,60288,3);d=tm(L,b,h,c)|0;tl(h);d=(d|0)==(L|0)?a:d;break a}case 101:{m=a+2|0;d:do if((y-m|0)>>>0>20){h=a+22|0;d=i[m>>0]|0;g=a;e=H;l=m;while(1){if(!(Bm(d<<24>>24)|0)){d=m;break d}d=i[l>>0]|0;G=d+-48|0;f=i[g+3>>0]|0;j=f+-48|0;f=((G>>>0<10?G:d+9|0)<<4)+(j>>>0<10?j:f+169|0)&255;i[e>>0]=f;j=g+4|0;g=e+1|0;d=i[j>>0]|0;if((j|0)==(h|0))break;else{G=l;e=g;l=j;g=G}}if(d<<24>>24==69){e:do if((H|0)!=(g|0)&e>>>0>H>>>0){d=H;while(1){G=i[d>>0]|0;i[d>>0]=f;i[e>>0]=G;d=d+1|0;g=g+-2|0;if(d>>>0>=g>>>0)break e;G=e;f=i[g>>0]|0;e=g;g=G}}while(0);d=I+0|0;g=d+40|0;do{i[d>>0]=0;d=d+1|0}while((d|0)<(g|0));p[t>>3]=+p[H>>3];k[L>>2]=k[t>>2];k[L+4>>2]=k[t+4>>2];d=Im(I,40,60336,L)|0;if(d>>>0<=39){Ol(K,I,d);k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;j=J+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[J+0>>2];k[d+4>>2]=k[J+4>>2];k[d+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{g=k[c>>2]|0;h=(d-g|0)/24|0;e=h+1|0;if((e|0)<0)Fl(c);d=(f-g|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(L,d,h,c+12|0);d=L+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[J+0>>2];k[e+4>>2]=k[J+4>>2];k[e+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;I=e+12|0;k[I+0>>2]=k[j+0>>2];k[I+4>>2]=k[j+4>>2];k[I+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,L);Ll(L)}hl(J);tl(K);d=a+23|0}else d=m}else d=m}else d=m;while(0);d=(d|0)==(m|0)?a:d;break a}case 95:{if((i[a+2>>0]|0)!=90){d=a;break a}L=a+3|0;d=pl(L,b,c)|0;if((d|0)==(L|0)|(d|0)==(b|0)){d=a;break a}r=M;return ((i[d>>0]|0)==69?d+1|0:a)|0}case 100:{m=a+2|0;f:do if((y-m|0)>>>0>16){h=a+18|0;d=i[m>>0]|0;g=a;e=H;l=m;while(1){if(!(Bm(d<<24>>24)|0)){d=m;break f}d=i[l>>0]|0;G=d+-48|0;f=i[g+3>>0]|0;j=f+-48|0;f=((G>>>0<10?G:d+9|0)<<4)+(j>>>0<10?j:f+169|0)&255;i[e>>0]=f;j=g+4|0;g=e+1|0;d=i[j>>0]|0;if((j|0)==(h|0))break;else{G=l;e=g;l=j;g=G}}if(d<<24>>24==69){g:do if((H|0)!=(g|0)&e>>>0>H>>>0){d=H;while(1){G=i[d>>0]|0;i[d>>0]=f;i[e>>0]=G;d=d+1|0;g=g+-2|0;if(d>>>0>=g>>>0)break g;G=e;f=i[g>>0]|0;e=g;g=G}}while(0);d=I+0|0;g=d+32|0;do{i[d>>0]=0;d=d+1|0}while((d|0)<(g|0));p[t>>3]=+p[H>>3];k[L>>2]=k[t>>2];k[L+4>>2]=k[t+4>>2];d=Im(I,32,60344,L)|0;if(d>>>0<=31){Ol(K,I,d);k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;j=J+12|0;k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;e=c+4|0;d=k[e>>2]|0;f=k[c+8>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+0>>2]=k[J+0>>2];k[d+4>>2]=k[J+4>>2];k[d+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;d=d+12|0;k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;d=k[e>>2]|0}k[e>>2]=d+24}else{g=k[c>>2]|0;h=(d-g|0)/24|0;e=h+1|0;if((e|0)<0)Fl(c);d=(f-g|0)/24|0;if(d>>>0<1073741823){d=d<<1;d=d>>>0<e>>>0?e:d}else d=2147483647;Kl(L,d,h,c+12|0);d=L+8|0;e=k[d>>2]|0;if(e){k[e+0>>2]=k[J+0>>2];k[e+4>>2]=k[J+4>>2];k[e+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;I=e+12|0;k[I+0>>2]=k[j+0>>2];k[I+4>>2]=k[j+4>>2];k[I+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0}k[d>>2]=e+24;Ml(c,L);Ll(L)}hl(J);tl(K);d=a+19|0}else d=m}else d=m}else d=m;while(0);d=(d|0)==(m|0)?a:d;break a}case 84:{d=a;break a}default:{m=ul(x,b,c)|0;if((m|0)==(x|0)|(m|0)==(b|0)){d=a;break a}d=i[m>>0]|0;if(d<<24>>24==69){d=m+1|0;break a}else{g=d;e=m}while(1){d=e+1|0;if(((g<<24>>24)+-48|0)>>>0>=10){l=e;break}if((d|0)==(b|0)){d=a;break a}g=i[d>>0]|0;e=d}if(!((l|0)!=(m|0)&g<<24>>24==69)){d=a;break a}g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0)){d=a;break a}h=g+-24|0;Al(F,h);f=rl(F,0,58248)|0;k[E+0>>2]=k[f+0>>2];k[E+4>>2]=k[f+4>>2];k[E+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=sl(E,58240)|0;k[D+0>>2]=k[f+0>>2];k[D+4>>2]=k[f+4>>2];k[D+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=l-m|0;if(f>>>0>4294967279)ql(G);if(f>>>0<11){i[G>>0]=f<<1;j=G+1|0}else{a=f+16&-16;j=xm(a)|0;k[G+8>>2]=j;k[G>>2]=a|1;k[G+4>>2]=f}g=m;e=j;while(1){i[e>>0]=i[g>>0]|0;g=g+1|0;if((g|0)==(l|0))break;else e=e+1|0}g=i[G>>0]|0;i[j+f>>0]=0;if(!(g&1)){f=G+1|0;e=(g&255)>>>1}else{f=k[G+8>>2]|0;e=k[G+4>>2]|0}a=jl(D,f,e)|0;k[C+0>>2]=k[a+0>>2];k[C+4>>2]=k[a+4>>2];k[C+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[B+0>>2]=k[C+0>>2];k[B+4>>2]=k[C+4>>2];k[B+8>>2]=k[C+8>>2];k[C+0>>2]=0;k[C+4>>2]=0;k[C+8>>2]=0;a=B+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(h,B);hl(B);tl(C);tl(G);tl(D);tl(E);tl(F);break a}}while(0)}else d=a;while(0);r=M;return d|0}function km(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0;s=r;r=r+128|0;q=s+108|0;e=s+104|0;n=s+80|0;o=s+68|0;p=s+56|0;g=s+40|0;h=s+16|0;j=s;l=s+44|0;do if((b-a|0)>2?(i[a>>0]|0)==102:0){f=i[a+1>>0]|0;if(f<<24>>24==112){d=El(a+2|0,b,e)|0;h=zl(d,b)|0;if((h|0)==(b|0))break;if((i[h>>0]|0)!=95)break;f=h-d|0;if(f>>>0>4294967279)ql(p);if(f>>>0<11){i[p>>0]=f<<1;a=p+1|0}else{m=f+16&-16;a=xm(m)|0;k[p+8>>2]=a;k[p>>2]=m|1;k[p+4>>2]=f}if((d|0)!=(h|0)){e=a;while(1){i[e>>0]=i[d>>0]|0;d=d+1|0;if((d|0)==(h|0))break;else e=e+1|0}a=a+f|0}i[a>>0]=0;b=rl(p,0,60160)|0;k[o+0>>2]=k[b+0>>2];k[o+4>>2]=k[b+4>>2];k[o+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[n+0>>2]=k[o+0>>2];k[n+4>>2]=k[o+4>>2];k[n+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;b=n+12|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;f=c+4|0;a=k[f>>2]|0;e=k[c+8>>2]|0;if(a>>>0<e>>>0){if(!a)a=0;else{k[a+0>>2]=k[n+0>>2];k[a+4>>2]=k[n+4>>2];k[a+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;a=a+12|0;k[a+0>>2]=k[b+0>>2];k[a+4>>2]=k[b+4>>2];k[a+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;a=k[f>>2]|0}k[f>>2]=a+24}else{f=k[c>>2]|0;g=(a-f|0)/24|0;d=g+1|0;if((d|0)<0)Fl(c);a=(e-f|0)/24|0;if(a>>>0<1073741823){a=a<<1;a=a>>>0<d>>>0?d:a}else a=2147483647;Kl(q,a,g,c+12|0);a=q+8|0;d=k[a>>2]|0;if(d){k[d+0>>2]=k[n+0>>2];k[d+4>>2]=k[n+4>>2];k[d+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;m=d+12|0;k[m+0>>2]=k[b+0>>2];k[m+4>>2]=k[b+4>>2];k[m+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0}k[a>>2]=d+24;Ml(c,q);Ll(q)}hl(n);tl(o);tl(p);a=h+1|0;break}else if(f<<24>>24!=76)break;f=zl(a+2|0,b)|0;if((((f|0)!=(b|0)?(i[f>>0]|0)==112:0)?(d=El(f+1|0,b,g)|0,m=zl(d,b)|0,(m|0)!=(b|0)):0)?(i[m>>0]|0)==95:0){f=m-d|0;if(f>>>0>4294967279)ql(l);if(f>>>0<11){i[l>>0]=f<<1;a=l+1|0}else{p=f+16&-16;a=xm(p)|0;k[l+8>>2]=a;k[l>>2]=p|1;k[l+4>>2]=f}if((d|0)!=(m|0)){e=a;while(1){i[e>>0]=i[d>>0]|0;d=d+1|0;if((d|0)==(m|0))break;else e=e+1|0}a=a+f|0}i[a>>0]=0;b=rl(l,0,60160)|0;k[j+0>>2]=k[b+0>>2];k[j+4>>2]=k[b+4>>2];k[j+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;k[h+0>>2]=k[j+0>>2];k[h+4>>2]=k[j+4>>2];k[h+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;b=h+12|0;k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;d=c+4|0;a=k[d>>2]|0;e=k[c+8>>2]|0;if(a>>>0<e>>>0){if(!a)a=0;else{k[a+0>>2]=k[h+0>>2];k[a+4>>2]=k[h+4>>2];k[a+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;a=a+12|0;k[a+0>>2]=k[b+0>>2];k[a+4>>2]=k[b+4>>2];k[a+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;a=k[d>>2]|0}k[d>>2]=a+24}else{f=k[c>>2]|0;g=(a-f|0)/24|0;d=g+1|0;if((d|0)<0)Fl(c);a=(e-f|0)/24|0;if(a>>>0<1073741823){a=a<<1;a=a>>>0<d>>>0?d:a}else a=2147483647;Kl(q,a,g,c+12|0);a=q+8|0;d=k[a>>2]|0;if(d){k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;p=d+12|0;k[p+0>>2]=k[b+0>>2];k[p+4>>2]=k[b+4>>2];k[p+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0}k[a>>2]=d+24;Ml(c,q);Ll(q)}hl(h);tl(j);tl(l);a=m+1|0}}while(0);r=s;return a|0}function lm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0;s=r;r=r+96|0;q=s+84|0;p=s;h=s+12|0;j=s+24|0;l=s+36|0;m=s+48|0;n=s+60|0;o=s+72|0;e=Ql(a,b,d)|0;a:do if((e|0)!=(a|0)){b=Ql(e,b,d)|0;g=d+4|0;f=k[g>>2]|0;if((b|0)==(e|0)){e=f+-24|0;b=f;while(1){q=b+-24|0;k[g>>2]=q;hl(q);b=k[g>>2]|0;if((b|0)==(e|0)){b=a;break a}}}if(((f-(k[d>>2]|0)|0)/24|0)>>>0>=2){Al(q,f+-24|0);f=k[g>>2]|0;e=f+-24|0;d=f;do{a=d+-24|0;k[g>>2]=a;hl(a);d=k[g>>2]|0}while((d|0)!=(e|0));Al(p,f+-48|0);f=k[g>>2]|0;g=f+-24|0;if(!(i[g>>0]&1)){i[g+1>>0]=0;i[g>>0]=0}else{i[k[f+-16>>2]>>0]=0;k[f+-20>>2]=0}f=i[c>>0]|0;if(!(f&1)){f=(f&255)>>>1;d=c+1|0}else{f=k[c+4>>2]|0;d=k[c+8>>2]|0}e=f>>>0>1;if((Mm(d,58336,e?1:f)|0)==0?(f|0)!=0&(e^1):0)Cl(g,40);Zl(o,58248,p);f=sl(o,58840)|0;k[n+0>>2]=k[f+0>>2];k[n+4>>2]=k[f+4>>2];k[n+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=i[c>>0]|0;if(!(f&1)){e=c+1|0;f=(f&255)>>>1}else{e=k[c+8>>2]|0;f=k[c+4>>2]|0}f=jl(n,e,f)|0;k[m+0>>2]=k[f+0>>2];k[m+4>>2]=k[f+4>>2];k[m+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=sl(m,58232)|0;k[l+0>>2]=k[f+0>>2];k[l+4>>2]=k[f+4>>2];k[l+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=i[q>>0]|0;if(!(f&1)){e=q+1|0;f=(f&255)>>>1}else{e=k[q+8>>2]|0;f=k[q+4>>2]|0}f=jl(l,e,f)|0;k[j+0>>2]=k[f+0>>2];k[j+4>>2]=k[f+4>>2];k[j+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=sl(j,58240)|0;k[h+0>>2]=k[f+0>>2];k[h+4>>2]=k[f+4>>2];k[h+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=i[h>>0]|0;if(!(f&1)){e=h+1|0;f=(f&255)>>>1}else{e=k[h+8>>2]|0;f=k[h+4>>2]|0}jl(g,e,f)|0;tl(h);tl(j);tl(l);tl(m);tl(n);tl(o);e=i[c>>0]|0;if(!(e&1)){f=(e&255)>>>1;d=c+1|0}else{f=k[c+4>>2]|0;d=k[c+8>>2]|0}e=f>>>0>1;if((Mm(d,58336,e?1:f)|0)==0?(f|0)!=0&(e^1):0)Cl(g,41);tl(p);tl(q)}else b=a}else b=a;while(0);r=s;return b|0}function mm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0;s=r;r=r+48|0;n=s+36|0;o=s;p=s+12|0;q=s+24|0;b=Ql(a,b,d)|0;if((b|0)!=(a|0)?(e=d+4|0,f=k[e>>2]|0,(k[d>>2]|0)!=(f|0)):0){m=f+-24|0;Vl(p,c,58248);Al(q,(k[e>>2]|0)+-24|0);d=i[q>>0]|0;if(!(d&1)){a=q+1|0;d=(d&255)>>>1}else{a=k[q+8>>2]|0;d=k[q+4>>2]|0}l=jl(p,a,d)|0;k[o+0>>2]=k[l+0>>2];k[o+4>>2]=k[l+4>>2];k[o+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;l=sl(o,58240)|0;k[n+0>>2]=k[l+0>>2];k[n+4>>2]=k[l+4>>2];k[n+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;do if(i[m>>0]&1){l=f+-16|0;i[k[l>>2]>>0]=0;g=f+-20|0;k[g>>2]=0;d=i[m>>0]|0;if(!(d&1))f=10;else{f=k[m>>2]|0;d=f&255;f=(f&-2)+-1|0}if(!(d&1)){a=(d&255)>>>1;if((d&255)<22){c=10;h=a;j=1}else{c=(a+16&240)+-1|0;h=a;j=1}}else{c=10;h=0;j=0}if((c|0)!=(f|0)){if((c|0)==10){e=m+1|0;a=k[l>>2]|0;if(j){_m(e|0,a|0,((d&255)>>>1)+1|0)|0;ym(a)}else{i[e>>0]=i[a>>0]|0;ym(a)}i[m>>0]=h<<1;break}e=c+1|0;a=xm(e)|0;if(!(c>>>0<=f>>>0&(a|0)==0)){if(j)_m(a|0,m+1|0,((d&255)>>>1)+1|0)|0;else{c=k[l>>2]|0;i[a>>0]=i[c>>0]|0;ym(c)}k[m>>2]=e|1;k[g>>2]=h;k[l>>2]=a}}}else{i[m+1>>0]=0;i[m>>0]=0}while(0);k[m+0>>2]=k[n+0>>2];k[m+4>>2]=k[n+4>>2];k[m+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;tl(n);tl(o);tl(q);tl(p)}else b=a;r=s;return b|0}function nm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=r;r=r+144|0;l=y+132|0;t=y+120|0;s=y+108|0;x=y+96|0;w=y+84|0;j=y+72|0;q=y+60|0;p=y+36|0;o=y+24|0;n=y+12|0;v=y;u=y+48|0;g=b;a:do if((g-a|0)>2){if((i[a>>0]|0)==103){e=(i[a+1>>0]|0)==115;m=e;e=e?a+2|0:a}else{m=0;e=a}d=um(e,b,c)|0;if((d|0)!=(e|0)){if(!m)break;e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break}rl(e+-24|0,0,58416)|0;break}if(((g-e|0)>2?(i[e>>0]|0)==115:0)?(i[e+1>>0]|0)==114:0){g=e+2|0;if((i[g>>0]|0)==78){v=e+3|0;g=vm(v,b,c)|0;if((g|0)==(v|0)|(g|0)==(b|0)){d=a;break}d=Tl(g,b,c)|0;do if((d|0)==(g|0))d=g;else{h=c+4|0;g=k[h>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(l,g+-24|0);f=k[h>>2]|0;g=f+-24|0;e=f;do{v=e+-24|0;k[h>>2]=v;hl(v);e=k[h>>2]|0}while((e|0)!=(g|0));g=i[l>>0]|0;if(!(g&1)){e=l+1|0;g=(g&255)>>>1}else{e=k[l+8>>2]|0;g=k[l+4>>2]|0}jl(f+-48|0,e,g)|0;if((d|0)!=(b|0)){tl(l);break}e=k[h>>2]|0;d=e+-24|0;do{c=e+-24|0;k[h>>2]=c;hl(c);e=k[h>>2]|0}while((e|0)!=(d|0));tl(l);d=a;break a}while(0);if((i[d>>0]|0)!=69){m=c+4|0;j=s+1|0;h=s+8|0;l=s+4|0;g=d;while(1){d=wm(g,b,c)|0;if((d|0)==(g|0)|(d|0)==(b|0)){d=a;break a}g=k[m>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(t,g+-24|0);f=k[m>>2]|0;g=f+-24|0;e=f;do{v=e+-24|0;k[m>>2]=v;hl(v);e=k[m>>2]|0}while((e|0)!=(g|0));g=rl(t,0,58416)|0;k[s+0>>2]=k[g+0>>2];k[s+4>>2]=k[g+4>>2];k[s+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[s>>0]|0;if(!(g&1)){e=j;g=(g&255)>>>1}else{e=k[h>>2]|0;g=k[l>>2]|0}jl(f+-48|0,e,g)|0;tl(s);tl(t);if((i[d>>0]|0)==69)break;else g=d}}v=d+1|0;d=um(v,b,c)|0;if((d|0)==(v|0)){f=c+4|0;d=k[f>>2]|0;if((k[c>>2]|0)==(d|0)){d=a;break}e=d+-24|0;while(1){c=d+-24|0;k[f>>2]=c;hl(c);d=k[f>>2]|0;if((d|0)==(e|0)){d=a;break a}}}g=c+4|0;e=k[g>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break}Al(x,e+-24|0);h=k[g>>2]|0;e=h+-24|0;f=h;do{a=f+-24|0;k[g>>2]=a;hl(a);f=k[g>>2]|0}while((f|0)!=(e|0));e=rl(x,0,58416)|0;k[w+0>>2]=k[e+0>>2];k[w+4>>2]=k[e+4>>2];k[w+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;e=i[w>>0]|0;if(!(e&1)){f=w+1|0;e=(e&255)>>>1}else{f=k[w+8>>2]|0;e=k[w+4>>2]|0}jl(h+-48|0,f,e)|0;tl(w);tl(x);break}d=vm(g,b,c)|0;if((d|0)!=(g|0)){e=Tl(d,b,c)|0;if((e|0)==(d|0))e=d;else{f=c+4|0;d=k[f>>2]|0;if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break}Al(j,d+-24|0);h=k[f>>2]|0;d=h+-24|0;g=h;do{x=g+-24|0;k[f>>2]=x;hl(x);g=k[f>>2]|0}while((g|0)!=(d|0));d=i[j>>0]|0;if(!(d&1)){g=j+1|0;d=(d&255)>>>1}else{g=k[j+8>>2]|0;d=k[j+4>>2]|0}jl(h+-48|0,g,d)|0;tl(j)}d=um(e,b,c)|0;if((d|0)==(e|0)){f=c+4|0;d=k[f>>2]|0;if((k[c>>2]|0)==(d|0)){d=a;break}e=d+-24|0;while(1){c=d+-24|0;k[f>>2]=c;hl(c);d=k[f>>2]|0;if((d|0)==(e|0)){d=a;break a}}}g=c+4|0;e=k[g>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break}Al(q,e+-24|0);h=k[g>>2]|0;e=h+-24|0;f=h;do{a=f+-24|0;k[g>>2]=a;hl(a);f=k[g>>2]|0}while((f|0)!=(e|0));e=rl(q,0,58416)|0;k[p+0>>2]=k[e+0>>2];k[p+4>>2]=k[e+4>>2];k[p+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;e=i[p>>0]|0;if(!(e&1)){f=p+1|0;e=(e&255)>>>1}else{f=k[p+8>>2]|0;e=k[p+4>>2]|0}jl(h+-48|0,f,e)|0;tl(p);tl(q);break}d=wm(g,b,c)|0;if(!((d|0)==(g|0)|(d|0)==(b|0))){if(m){e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break}rl(e+-24|0,0,58416)|0}if((i[d>>0]|0)!=69){h=c+4|0;j=n+1|0;l=n+8|0;m=n+4|0;g=d;while(1){d=wm(g,b,c)|0;if((d|0)==(g|0)|(d|0)==(b|0)){d=a;break a}g=k[h>>2]|0;if(((g-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(o,g+-24|0);f=k[h>>2]|0;g=f+-24|0;e=f;do{x=e+-24|0;k[h>>2]=x;hl(x);e=k[h>>2]|0}while((e|0)!=(g|0));g=rl(o,0,58416)|0;k[n+0>>2]=k[g+0>>2];k[n+4>>2]=k[g+4>>2];k[n+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[n>>0]|0;if(!(g&1)){e=j;g=(g&255)>>>1}else{e=k[l>>2]|0;g=k[m>>2]|0}jl(f+-48|0,e,g)|0;tl(n);tl(o);if((i[d>>0]|0)==69)break;else g=d}}x=d+1|0;d=um(x,b,c)|0;if((d|0)==(x|0)){f=c+4|0;d=k[f>>2]|0;if((k[c>>2]|0)==(d|0)){d=a;break}e=d+-24|0;while(1){c=d+-24|0;k[f>>2]=c;hl(c);d=k[f>>2]|0;if((d|0)==(e|0)){d=a;break a}}}g=c+4|0;e=k[g>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0>=2){Al(v,e+-24|0);h=k[g>>2]|0;e=h+-24|0;f=h;do{a=f+-24|0;k[g>>2]=a;hl(a);f=k[g>>2]|0}while((f|0)!=(e|0));e=rl(v,0,58416)|0;k[u+0>>2]=k[e+0>>2];k[u+4>>2]=k[e+4>>2];k[u+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;e=i[u>>0]|0;if(!(e&1)){f=u+1|0;e=(e&255)>>>1}else{f=k[u+8>>2]|0;e=k[u+4>>2]|0}jl(h+-48|0,f,e)|0;tl(u);tl(v)}else d=a}else d=a}else d=a}else d=a;while(0);r=y;return d|0}function om(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;a:do if((a|0)!=(b|0)){d=i[a>>0]|0;if((d|0)==76){d=a+1|0;if((d|0)!=(b|0)?(i[d>>0]|0)==90:0){e=a+2|0;d=pl(e,b,c)|0;if((d|0)==(e|0)|(d|0)==(b|0))break;return ((i[d>>0]|0)==69?d+1|0:a)|0}a=jm(a,b,c)|0;break}else if((d|0)==88){e=a+1|0;d=Ql(e,b,c)|0;if((d|0)==(e|0)|(d|0)==(b|0))break;a=(i[d>>0]|0)==69?d+1|0:a;break}else if((d|0)==74){d=a+1|0;if((d|0)==(b|0))break;while(1){if((i[d>>0]|0)==69){a=d;break}e=d;d=om(d,b,c)|0;if((d|0)==(e|0))break a}a=a+1|0;break}else{a=ul(a,b,c)|0;break}}while(0);return a|0}function pm(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;if(d>>>0>4294967279)ql(a);if(d>>>0<11){i[a>>0]=c<<1;d=a+1|0}else{e=d+16&-16;d=xm(e)|0;k[a+8>>2]=d;k[a>>2]=e|1;k[a+4>>2]=c}_m(d|0,b|0,c|0)|0;i[d+c>>0]=0;return}function qm(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;g=i[b>>0]|0;f=(g&1)==0;if(f)c=(g&255)>>>1;else c=k[b+4>>2]|0;a:do if(!c)Jl(a,b);else{if(f){c=(g&255)>>>1;e=b+1|0}else{c=k[b+4>>2]|0;e=k[b+8>>2]|0}d=c>>>0>11;if((Mm(e,59624,d?11:c)|0)==0?c>>>0>10&(d^1):0){_l(b,59640,70);Ol(a,59712,12);break}if(f){c=(g&255)>>>1;e=b+1|0}else{c=k[b+4>>2]|0;e=k[b+8>>2]|0}d=c>>>0>12;if((Mm(e,59728,d?12:c)|0)==0?c>>>0>11&(d^1):0){_l(b,59744,49);Ol(a,59800,13);break}if(f){c=(g&255)>>>1;e=b+1|0}else{c=k[b+4>>2]|0;e=k[b+8>>2]|0}d=c>>>0>12;if((Mm(e,59816,d?12:c)|0)==0?c>>>0>11&(d^1):0){_l(b,59832,49);Ol(a,59888,13);break}if(f){c=(g&255)>>>1;e=b+1|0}else{c=k[b+4>>2]|0;e=k[b+8>>2]|0}d=c>>>0>13;if((Mm(e,59904,d?13:c)|0)==0?c>>>0>12&(d^1):0){_l(b,59920,50);Ol(a,59976,14);break}if(f){h=b+1|0;c=(g&255)>>>1}else{h=k[b+8>>2]|0;c=k[b+4>>2]|0}d=h+c|0;b:do if((i[h+(c+-1)>>0]|0)==62){g=1;c=d;c:while(1){d=c;while(1){c=d+-1|0;if((c|0)==(h|0))break c;d=d+-2|0;e=i[d>>0]|0;if(e<<24>>24==62){d=39;break}else if(e<<24>>24==60){f=d;d=38;break}else d=c}if((d|0)==38){d=g+-1|0;if(!d){g=f;break b}else{g=d;continue}}else if((d|0)==39){g=g+1|0;continue}}k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;break a}else g=d;while(0);d=g;while(1){c=d+-1|0;if((c|0)==(h|0)){d=h;break}if((i[c>>0]|0)==58)break;else d=c}f=g-d|0;if(f>>>0>4294967279)ql(a);if(f>>>0<11){i[a>>0]=f<<1;c=a+1|0}else{h=f+16&-16;c=xm(h)|0;k[a+8>>2]=c;k[a>>2]=h|1;k[a+4>>2]=f}if((d|0)!=(g|0)){e=c;while(1){i[e>>0]=i[d>>0]|0;d=d+1|0;if((d|0)==(g|0))break;else e=e+1|0}c=c+f|0}i[c>>0]=0}while(0);return}function rm(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0;f=b;d=i[a>>0]|0;if(!(d&1)){e=10;j=(d&255)>>>1}else{d=k[a>>2]|0;e=(d&-2)+-1|0;j=k[a+4>>2]|0;d=d&255}h=c-f|0;do if((c|0)!=(b|0)){if((e-j|0)>>>0<h>>>0){cm(a,e,j+h-e|0,j,j,0);d=i[a>>0]|0}if(!(d&1))g=a+1|0;else g=k[a+8>>2]|0;f=c+(j-f)|0;d=b;e=g+j|0;while(1){i[e>>0]=i[d>>0]|0;d=d+1|0;if((d|0)==(c|0))break;else e=e+1|0}i[g+f>>0]=0;d=j+h|0;if(!(i[a>>0]&1)){i[a>>0]=d<<1;break}else{k[a+4>>2]=d;break}}while(0);return}
function pl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0;E=r;r=r+112|0;u=E+96|0;p=E+84|0;q=E+72|0;s=E+60|0;t=E+48|0;z=E+24|0;j=E+12|0;y=E;x=E+36|0;a:do if((a|0)==(b|0))b=a;else{B=c+56|0;C=k[B>>2]|0;w=C+1|0;k[B>>2]=w;D=c+61|0;A=i[D>>0]|0;if(w>>>0>1)i[D>>0]=1;f=i[a>>0]|0;b:do if((f|0)==84|(f|0)==71)if((b-a|0)>2){if((f|0)==71){d=i[a+1>>0]|0;if((d|0)==82){z=a+2|0;b=Bl(z,b,c)|0;if((b|0)==(z|0)){b=a;break}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break}rl(d+-24|0,0,61072)|0;break}else if((d|0)==86){z=a+2|0;b=Bl(z,b,c)|0;if((b|0)==(z|0)){b=a;break}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break}rl(d+-24|0,0,61048)|0;break}else{b=a;break}}else if((f|0)!=84){b=a;break}e=a+1|0;switch(i[e>>0]|0){case 83:{z=a+2|0;b=ul(z,b,c)|0;if((b|0)==(z|0)){b=a;break b}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break b}rl(d+-24|0,0,60904)|0;break b}case 73:{z=a+2|0;b=ul(z,b,c)|0;if((b|0)==(z|0)){b=a;break b}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break b}rl(d+-24|0,0,60888)|0;break b}case 99:{z=a+2|0;d=yl(z,b)|0;if((d|0)==(z|0)){b=a;break b}e=yl(d,b)|0;if((e|0)==(d|0)){b=a;break b}b=pl(e,b,c)|0;if((b|0)==(e|0)){b=a;break b}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break b}rl(d+-24|0,0,60928)|0;break b}case 86:{z=a+2|0;b=ul(z,b,c)|0;if((b|0)==(z|0)){b=a;break b}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break b}rl(d+-24|0,0,60856)|0;break b}case 84:{z=a+2|0;b=ul(z,b,c)|0;if((b|0)==(z|0)){b=a;break b}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break b}rl(d+-24|0,0,60872)|0;break b}case 67:{z=a+2|0;d=ul(z,b,c)|0;if((d|0)==(z|0)){b=a;break b}e=zl(d,b)|0;if((e|0)==(d|0)|(e|0)==(b|0)){b=a;break b}if((i[e>>0]|0)!=95){b=a;break b}z=e+1|0;b=ul(z,b,c)|0;if((b|0)==(z|0)){b=a;break b}f=c+4|0;d=k[f>>2]|0;if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2){b=a;break b}Al(u,d+-24|0);g=k[f>>2]|0;d=g+-24|0;e=g;do{a=e+-24|0;k[f>>2]=a;hl(a);e=k[f>>2]|0}while((e|0)!=(d|0));o=g+-48|0;d=rl(u,0,60960)|0;k[s+0>>2]=k[d+0>>2];k[s+4>>2]=k[d+4>>2];k[s+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=sl(s,60992)|0;k[q+0>>2]=k[d+0>>2];k[q+4>>2]=k[d+4>>2];k[q+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;Al(t,(k[f>>2]|0)+-24|0);d=i[t>>0]|0;if(!(d&1)){e=t+1|0;d=(d&255)>>>1}else{e=k[t+8>>2]|0;d=k[t+4>>2]|0}a=jl(q,e,d)|0;k[p+0>>2]=k[a+0>>2];k[p+4>>2]=k[a+4>>2];k[p+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;do if(i[o>>0]&1){n=g+-40|0;i[k[n>>2]>>0]=0;j=g+-44|0;k[j>>2]=0;d=i[o>>0]|0;if(!(d&1))h=10;else{h=k[o>>2]|0;d=h&255;h=(h&-2)+-1|0}if(!(d&1)){e=(d&255)>>>1;if((d&255)<22){g=10;l=e;m=1}else{g=(e+16&240)+-1|0;l=e;m=1}}else{g=10;l=0;m=0}if((g|0)!=(h|0)){if((g|0)==10){f=o+1|0;e=k[n>>2]|0;if(m){_m(f|0,e|0,((d&255)>>>1)+1|0)|0;ym(e)}else{i[f>>0]=i[e>>0]|0;ym(e)}i[o>>0]=l<<1;break}f=g+1|0;e=xm(f)|0;if(!(g>>>0<=h>>>0&(e|0)==0)){if(m)_m(e|0,o+1|0,((d&255)>>>1)+1|0)|0;else{a=k[n>>2]|0;i[e>>0]=i[a>>0]|0;ym(a)}k[o>>2]=f|1;k[j>>2]=l;k[n>>2]=e}}}else{i[o+1>>0]=0;i[o>>0]=0}while(0);k[o+0>>2]=k[p+0>>2];k[o+4>>2]=k[p+4>>2];k[o+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;tl(p);tl(t);tl(q);tl(s);tl(u);break b}default:{d=yl(e,b)|0;if((d|0)==(e|0)){b=a;break b}b=pl(d,b,c)|0;if((b|0)==(d|0)){b=a;break b}d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0)){b=a;break b}d=d+-24|0;if((i[a+2>>0]|0)==118){rl(d,0,61e3)|0;break b}else{rl(d,0,61024)|0;break b}}}}else b=a;else{g=Bl(a,b,c)|0;t=k[c+48>>2]|0;u=k[c+52>>2]|0;if((g|0)!=(a|0)){if((g|0)!=(b|0)){w=i[g>>0]|0;if(w<<24>>24==46|w<<24>>24==69)b=g;else{v=i[D>>0]|0;i[D>>0]=0;k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;w=c+4|0;f=k[w>>2]|0;c:do if((k[c>>2]|0)!=(f|0)){h=f+-24|0;e=i[h>>0]|0;m=(e&1)==0;if(m)l=(e&255)>>>1;else l=k[f+-20>>2]|0;if(l){if(!(i[c+60>>0]|0)){if(m){l=(e&255)>>>1;d=h+1|0}else{l=k[f+-20>>2]|0;d=k[f+-16>>2]|0}if((i[d+(l+-1)>>0]|0)==62){if(m){l=(e&255)>>>1;d=h+1|0}else{l=k[f+-20>>2]|0;d=k[f+-16>>2]|0}if((i[d+(l+-2)>>0]|0)!=45){if(m){e=(e&255)>>>1;d=h+1|0}else{e=k[f+-20>>2]|0;d=k[f+-16>>2]|0}if((i[d+(e+-2)>>0]|0)!=62){e=ul(g,b,c)|0;if((e|0)==(g|0))break;f=k[w>>2]|0;if(((f-(k[c>>2]|0)|0)/24|0)>>>0<2)break;f=f+-24|0;k[j+0>>2]=k[f+0>>2];k[j+4>>2]=k[f+4>>2];k[j+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=(k[w>>2]|0)+-12|0;k[z+0>>2]=k[f+0>>2];k[z+4>>2]=k[f+4>>2];k[z+8>>2]=k[f+8>>2];k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;f=i[z>>0]|0;if(!(f&1))f=(f&255)>>>1;else f=k[z+4>>2]|0;if(!f)Cl(j,32);l=k[w>>2]|0;f=l+-24|0;d=l;do{s=d+-24|0;k[w>>2]=s;hl(s);d=k[w>>2]|0}while((d|0)!=(f|0));f=i[j>>0]|0;if(!(f&1)){d=j+1|0;f=(f&255)>>>1}else{d=k[j+8>>2]|0;f=k[j+4>>2]|0}Dl(l+-48|0,0,d,f)|0;tl(j);f=k[w>>2]|0}else e=g}else e=g}else e=g}else e=g;Cl(f+-24|0,40);if((e|0)!=(b|0)?(i[e>>0]|0)==118:0){f=k[c>>2]|0;d=k[w>>2]|0;b=e+1|0}else n=103;d:do if((n|0)==103){j=y+1|0;n=y+8|0;o=y+4|0;p=x+1|0;q=x+8|0;s=x+4|0;l=1;while(1){d=k[w>>2]|0;f=k[c>>2]|0;g=e;while(1){m=(d-f|0)/24|0;e=ul(g,b,c)|0;d=k[w>>2]|0;f=k[c>>2]|0;h=(d-f|0)/24|0;if((e|0)==(g|0)){b=g;break d}if(h>>>0>m>>>0){d=m;break}else g=e}k[y+0>>2]=0;k[y+4>>2]=0;k[y+8>>2]=0;m=0;g=d;while(1){if(!(m&1))f=(m&255)>>>1;else f=k[o>>2]|0;if(f)sl(y,58736)|0;Al(x,(k[c>>2]|0)+(g*24|0)|0);f=i[x>>0]|0;if(!(f&1)){m=p;f=(f&255)>>>1}else{m=k[q>>2]|0;f=k[s>>2]|0}jl(y,m,f)|0;tl(x);f=g+1|0;if(f>>>0>=h>>>0)break;m=i[y>>0]|0;g=f}m=k[w>>2]|0;do{f=m;m=m+-24|0;do{g=f+-24|0;k[w>>2]=g;hl(g);f=k[w>>2]|0}while((f|0)!=(m|0));d=d+1|0}while((d|0)!=(h|0));d=i[y>>0]|0;if(!(d&1))f=(d&255)>>>1;else f=k[o>>2]|0;if(f){f=k[w>>2]|0;if((k[c>>2]|0)==(f|0))break;if(l)l=d;else{sl(f+-24|0,58736)|0;f=k[w>>2]|0;l=i[y>>0]|0}if(!(l&1)){d=j;l=(l&255)>>>1}else{d=k[n>>2]|0;l=k[o>>2]|0}jl(f+-24|0,d,l)|0;l=0}tl(y)}tl(y);break c}while(0);if((f|0)!=(d|0)){Cl(d+-24|0,41);if(t&1)sl((k[w>>2]|0)+-24|0,58152)|0;if(t&2)sl((k[w>>2]|0)+-24|0,58160)|0;if(t&4)sl((k[w>>2]|0)+-24|0,58176)|0;if((u|0)==2)sl((k[w>>2]|0)+-24|0,60568)|0;else if((u|0)==1)sl((k[w>>2]|0)+-24|0,60560)|0;d=i[z>>0]|0;if(!(d&1)){e=z+1|0;d=(d&255)>>>1}else{e=k[z+8>>2]|0;d=k[z+4>>2]|0}jl((k[w>>2]|0)+-24|0,e,d)|0;tl(z);i[D>>0]=v;break b}}}while(0);tl(z);i[D>>0]=A;k[B>>2]=C;b=a;break a}}}else b=a}while(0);i[D>>0]=A;k[B>>2]=C}while(0);r=E;return b|0}function ql(a){a=a|0;Ca(58008,58040,1164,58128)}function rl(a,b,c){a=a|0;b=b|0;c=c|0;return Dl(a,b,c,Zm(c|0)|0)|0}function sl(a,b){a=a|0;b=b|0;return jl(a,b,Zm(b|0)|0)|0}function tl(a){a=a|0;if(i[a>>0]&1)ym(k[a+8>>2]|0);return}function ul(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Da=0,Ea=0,Fa=0,Ga=0,Ha=0,Ia=0,Ja=0,Ka=0,La=0,Ma=0,Na=0,Oa=0,Pa=0;Pa=r;r=r+768|0;Oa=Pa+744|0;Ka=Pa+720|0;qa=Pa+708|0;ra=Pa+696|0;va=Pa+672|0;Ga=Pa+648|0;Ia=Pa+624|0;wa=Pa+612|0;Fa=Pa+600|0;za=Pa+588|0;Da=Pa+576|0;sa=Pa+564|0;p=Pa+560|0;Ha=Pa+544|0;Ca=Pa+536|0;M=Pa+520|0;C=Pa+512|0;pa=Pa+496|0;ba=Pa+488|0;N=Pa+472|0;D=Pa+464|0;Ea=Pa+448|0;ya=Pa+444|0;ha=Pa+432|0;Aa=Pa+420|0;Ba=Pa+408|0;ia=Pa+396|0;oa=Pa+384|0;na=Pa+368|0;ca=Pa+364|0;ua=Pa+180|0;P=Pa+168|0;Q=Pa+144|0;R=Pa+132|0;S=Pa+120|0;T=Pa+108|0;ka=Pa+96|0;X=Pa+48|0;Y=Pa+36|0;Z=Pa+24|0;_=Pa+12|0;$=Pa;ea=Pa+72|0;fa=Pa+192|0;ga=Pa+204|0;ta=Pa+216|0;la=Pa+232|0;L=Pa+240|0;B=Pa+256|0;V=Pa+260|0;U=Pa+272|0;J=Pa+288|0;O=Pa+296|0;E=Pa+312|0;ma=Pa+320|0;aa=Pa+336|0;Na=Pa+344|0;Ma=Pa+360|0;a:do if((a|0)!=(b|0)){x=i[a>>0]|0;if((x|0)==75|(x|0)==86|(x|0)==114){k[p>>2]=0;n=El(a,b,p)|0;if((n|0)==(a|0)){d=a;break}g=i[n>>0]|0;x=c+4|0;q=((k[x>>2]|0)-(k[c>>2]|0)|0)/24|0;d=ul(n,b,c)|0;x=((k[x>>2]|0)-(k[c>>2]|0)|0)/24|0;if((d|0)==(n|0)){d=a;break}w=g<<24>>24==70;g=c+20|0;n=k[g>>2]|0;if(w){e=n+-16|0;do{v=n+-16|0;k[g>>2]=v;il(v);n=k[g>>2]|0}while((n|0)!=(e|0));n=e}h=c+16|0;m=k[c+12>>2]|0;v=c+20|0;e=k[c+24>>2]|0;if(n>>>0<e>>>0){if(!n)n=0;else{k[n>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;k[n+12>>2]=m;n=k[v>>2]|0}k[v>>2]=n+16}else{o=k[h>>2]|0;l=n-o>>4;g=l+1|0;if((g|0)<0)Fl(h);n=e-o|0;if(n>>4>>>0<1073741823){n=n>>3;n=n>>>0<g>>>0?g:n}else n=2147483647;Gl(Oa,n,l,c+28|0);n=Oa+8|0;g=k[n>>2]|0;if(g){k[g>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=m}k[n>>2]=g+16;Hl(h,Oa);Il(Oa)}if(q>>>0>=x>>>0)break;t=k[p>>2]|0;p=(t&1|0)==0;s=(t&2|0)==0;t=(t&4|0)==0;u=Oa+8|0;while(1){if(w){o=k[c>>2]|0;m=o+(q*24|0)+12|0;n=i[m>>0]|0;g=(n&1)==0;if(g){l=(n&255)>>>1;e=m+1|0}else{l=k[o+(q*24|0)+16>>2]|0;e=k[o+(q*24|0)+20>>2]|0}h=l+-2|0;if((i[e+h>>0]|0)==38)n=l+-3|0;else{if(g){g=(n&255)>>>1;n=m+1|0}else{g=k[o+(q*24|0)+16>>2]|0;n=k[o+(q*24|0)+20>>2]|0}n=(i[n+(g+-1)>>0]|0)==38?h:l}if(!p){rl(m,n,58152)|0;n=n+6|0}if(!s){rl((k[c>>2]|0)+(q*24|0)+12|0,n,58160)|0;n=n+9|0}if(!t)rl((k[c>>2]|0)+(q*24|0)+12|0,n,58176)|0}else{if(!p)sl((k[c>>2]|0)+(q*24|0)|0,58152)|0;if(!s)sl((k[c>>2]|0)+(q*24|0)|0,58160)|0;if(!t)sl((k[c>>2]|0)+(q*24|0)|0,58176)|0}e=k[v>>2]|0;o=e+-16|0;l=k[c>>2]|0;h=l+(q*24|0)|0;g=e+-12|0;n=k[g>>2]|0;if((n|0)==(k[e+-8>>2]|0)){g=(n-(k[o>>2]|0)|0)/24|0;n=g+1|0;if((n|0)<0){d=o;break}if(g>>>0<1073741823){m=g<<1;n=m>>>0<n>>>0?n:m}else n=2147483647;Kl(Oa,n,g,e+-4|0);n=k[u>>2]|0;if(n){Jl(n,h);Jl(n+12|0,l+(q*24|0)+12|0)}k[u>>2]=n+24;Ml(o,Oa);Ll(Oa)}else{if(!n)n=0;else{Jl(n,h);Jl(n+12|0,l+(q*24|0)+12|0);n=k[g>>2]|0}k[g>>2]=n+24}q=q+1|0;if(q>>>0>=x>>>0)break a}Fl(d)}d=Nl(a,b,c)|0;if((d|0)==(a|0)){g=i[a>>0]|0;b:do switch(g<<24>>24|0){case 80:{B=c+4|0;m=((k[B>>2]|0)-(k[c>>2]|0)|0)/24|0;A=a+1|0;d=ul(A,b,c)|0;B=((k[B>>2]|0)-(k[c>>2]|0)|0)/24|0;if((d|0)==(A|0)){d=a;break a}l=c+16|0;h=k[c+12>>2]|0;C=c+20|0;g=k[C>>2]|0;n=k[c+24>>2]|0;if(g>>>0<n>>>0){if(!g)g=0;else{k[g>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=h;g=k[C>>2]|0}k[C>>2]=g+16}else{e=k[l>>2]|0;o=g-e>>4;f=o+1|0;if((f|0)<0)Fl(l);g=n-e|0;if(g>>4>>>0<1073741823){g=g>>3;g=g>>>0<f>>>0?f:g}else g=2147483647;Gl(Oa,g,o,c+28|0);g=Oa+8|0;e=k[g>>2]|0;if(e){k[e>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=h}k[g>>2]=e+16;Hl(l,Oa);Il(Oa)}if(m>>>0>=B>>>0)break a;t=Aa+1|0;u=Ba+1|0;v=Ba+8|0;w=Ba+4|0;x=Oa+8|0;y=Aa+8|0;z=Aa+4|0;while(1){g=k[c>>2]|0;e=g+(m*24|0)+12|0;n=i[e>>0]|0;if(!(n&1)){f=(n&255)>>>1;n=e+1|0}else{f=k[g+(m*24|0)+16>>2]|0;n=k[g+(m*24|0)+20>>2]|0}Ol(Aa,n,f>>>0<2?f:2);n=i[Aa>>0]|0;if(!(n&1)){n=(n&255)>>>1;g=t}else{n=k[z>>2]|0;g=k[y>>2]|0}Ka=n>>>0>2;Ia=(Mm(g,58224,Ka?2:n)|0)!=0|n>>>0<2;tl(Aa);g=k[c>>2]|0;if(Ia|Ka){n=g+(m*24|0)+12|0;if(!(i[n>>0]&1))n=n+1|0;else n=k[g+(m*24|0)+20>>2]|0;if((i[n>>0]|0)==40){sl(g+(m*24|0)|0,58248)|0;rl((k[c>>2]|0)+(m*24|0)+12|0,0,58240)|0}}else{sl(g+(m*24|0)|0,58232)|0;rl((k[c>>2]|0)+(m*24|0)+12|0,0,58240)|0}e=k[c>>2]|0;n=e+(m*24|0)|0;do if((i[A>>0]|0)==85){g=i[n>>0]|0;if(!(g&1)){g=(g&255)>>>1;n=n+1|0}else{g=k[e+(m*24|0)+4>>2]|0;n=k[e+(m*24|0)+8>>2]|0}Ol(Ba,n,g>>>0<12?g:12);n=i[Ba>>0]|0;if(!(n&1)){g=(n&255)>>>1;n=u}else{g=k[w>>2]|0;n=k[v>>2]|0}e=g>>>0>12;n=Mm(n,58264,e?12:g)|0;if(!n)g=g>>>0<12?-1:e&1;else g=n;tl(Ba);s=k[c>>2]|0;n=s+(m*24|0)|0;if(!g){g=i[n>>0]|0;if(!(g&1)){q=(g&255)>>>1;h=q>>>0<11?q:11;e=10}else{q=k[s+(m*24|0)+4>>2]|0;g=k[n>>2]|0;h=q>>>0<11?q:11;e=(g&-2)+-1|0;g=g&255}if((h-q+e|0)>>>0<2){vl(n,e,2-h+q-e|0,q,0,h,2,58288);break}if(!(g&1))p=n+1|0;else p=k[s+(m*24|0)+8>>2]|0;do if((h|0)==2){f=0;o=58288;e=2;g=2;Ja=446}else{l=q-h|0;if((q|0)==(h|0)){f=0;o=58288;e=2;g=h;Ja=446;break}if(h>>>0>2){i[p>>0]=105;i[p+1>>0]=100;an(p+2|0,p+h|0,l|0)|0;e=2;g=h;break}do if(p>>>0<58288>>>0&(p+q|0)>>>0>58288>>>0)if((p+h|0)>>>0>58288>>>0){_m(p|0,58288,h|0)|0;f=h;o=58290;e=2-h|0;g=0;break}else{f=0;o=58288+(2-h)|0;e=2;g=h;break}else{f=0;o=58288;e=2;g=h}while(0);an(p+(f+e)|0,p+(f+g)|0,l|0)|0;Ja=446}while(0);if((Ja|0)==446){Ja=0;an(p+f|0,o|0,e|0)|0}g=e-g+q|0;if(!(i[n>>0]&1))i[n>>0]=g<<1;else k[s+(m*24|0)+4>>2]=g;i[p+g>>0]=0}else Ja=429}else Ja=429;while(0);if((Ja|0)==429){Ja=0;sl(n,58280)|0}e=k[C>>2]|0;f=e+-16|0;o=k[c>>2]|0;l=o+(m*24|0)|0;g=e+-12|0;n=k[g>>2]|0;if((n|0)==(k[e+-8>>2]|0)){g=(n-(k[f>>2]|0)|0)/24|0;n=g+1|0;if((n|0)<0){d=f;break}if(g>>>0<1073741823){Ka=g<<1;n=Ka>>>0<n>>>0?n:Ka}else n=2147483647;Kl(Oa,n,g,e+-4|0);n=k[x>>2]|0;if(n){Jl(n,l);Jl(n+12|0,o+(m*24|0)+12|0)}k[x>>2]=n+24;Ml(f,Oa);Ll(Oa)}else{if(!n)n=0;else{Jl(n,l);Jl(n+12|0,o+(m*24|0)+12|0);n=k[g>>2]|0}k[g>>2]=n+24}m=m+1|0;if(m>>>0>=B>>>0)break a}Fl(d);break}case 79:{u=c+4|0;m=((k[u>>2]|0)-(k[c>>2]|0)|0)/24|0;Ka=a+1|0;d=ul(Ka,b,c)|0;u=((k[u>>2]|0)-(k[c>>2]|0)|0)/24|0;if((d|0)==(Ka|0)){d=a;break a}n=c+16|0;o=k[c+12>>2]|0;v=c+20|0;g=k[v>>2]|0;e=k[c+24>>2]|0;if(g>>>0<e>>>0){if(!g)g=0;else{k[g>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=o;g=k[v>>2]|0}k[v>>2]=g+16}else{f=k[n>>2]|0;h=g-f>>4;l=h+1|0;if((l|0)<0)Fl(n);g=e-f|0;if(g>>4>>>0<1073741823){g=g>>3;g=g>>>0<l>>>0?l:g}else g=2147483647;Gl(Oa,g,h,c+28|0);g=Oa+8|0;e=k[g>>2]|0;if(e){k[e>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=o}k[g>>2]=e+16;Hl(n,Oa);Il(Oa)}if(m>>>0>=u>>>0)break a;p=ha+1|0;q=Oa+8|0;s=ha+8|0;t=ha+4|0;while(1){e=k[c>>2]|0;f=e+(m*24|0)+12|0;g=i[f>>0]|0;if(!(g&1)){l=(g&255)>>>1;g=f+1|0}else{l=k[e+(m*24|0)+16>>2]|0;g=k[e+(m*24|0)+20>>2]|0}Ol(ha,g,l>>>0<2?l:2);g=i[ha>>0]|0;if(!(g&1)){g=(g&255)>>>1;e=p}else{g=k[t>>2]|0;e=k[s>>2]|0}Ka=g>>>0>2;Ia=(Mm(e,58224,Ka?2:g)|0)!=0|g>>>0<2;tl(ha);e=k[c>>2]|0;if(Ia|Ka){g=e+(m*24|0)+12|0;if(!(i[g>>0]&1))g=g+1|0;else g=k[e+(m*24|0)+20>>2]|0;if((i[g>>0]|0)==40){sl(e+(m*24|0)|0,58248)|0;rl((k[c>>2]|0)+(m*24|0)+12|0,0,58240)|0}}else{sl(e+(m*24|0)|0,58232)|0;rl((k[c>>2]|0)+(m*24|0)+12|0,0,58240)|0}sl((k[c>>2]|0)+(m*24|0)|0,58256)|0;f=k[v>>2]|0;o=f+-16|0;l=k[c>>2]|0;h=l+(m*24|0)|0;e=f+-12|0;n=k[e>>2]|0;if((n|0)==(k[f+-8>>2]|0)){g=(n-(k[o>>2]|0)|0)/24|0;n=g+1|0;if((n|0)<0){d=o;break}if(g>>>0<1073741823){Ka=g<<1;n=Ka>>>0<n>>>0?n:Ka}else n=2147483647;Kl(Oa,n,g,f+-4|0);g=k[q>>2]|0;if(g){Jl(g,h);Jl(g+12|0,l+(m*24|0)+12|0)}k[q>>2]=g+24;Ml(o,Oa);Ll(Oa)}else{if(!n)g=0;else{Jl(n,h);Jl(n+12|0,l+(m*24|0)+12|0);g=k[e>>2]|0}k[e>>2]=g+24}m=m+1|0;if(m>>>0>=u>>>0)break a}Fl(d);break}case 65:{do if(g<<24>>24==65?(f=a+1|0,(f|0)!=(b|0)):0){d=i[f>>0]|0;if(d<<24>>24==95){Na=a+2|0;d=ul(Na,b,c)|0;if((d|0)==(Na|0)){d=a;break}l=c+4|0;e=k[l>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break}f=e+-12|0;g=i[f>>0]|0;if(!(g&1)){g=(g&255)>>>1;e=f+1|0}else{g=k[e+-8>>2]|0;e=k[e+-4>>2]|0}Ol(Oa,e,g>>>0<2?g:2);e=i[Oa>>0]|0;if(!(e&1)){e=(e&255)>>>1;f=Oa+1|0}else{e=k[Oa+4>>2]|0;f=k[Oa+8>>2]|0}b=e>>>0>2;Na=(Mm(f,58224,b?2:e)|0)!=0|e>>>0<2;tl(Oa);if(!(Na|b))Pl((k[l>>2]|0)+-12|0);rl((k[l>>2]|0)+-12|0,0,60576)|0;break}if((d+-49&255)<9){o=zl(f,b)|0;if((o|0)==(b|0)){d=a;break}if((i[o>>0]|0)!=95){d=a;break}Na=o+1|0;d=ul(Na,b,c)|0;if((d|0)==(Na|0)){d=a;break}n=c+4|0;e=k[n>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break}l=e+-12|0;g=i[l>>0]|0;if(!(g&1)){h=(g&255)>>>1;g=l+1|0}else{h=k[e+-8>>2]|0;g=k[e+-4>>2]|0}Ol(Ka,g,h>>>0<2?h:2);g=i[Ka>>0]|0;if(!(g&1)){g=(g&255)>>>1;e=Ka+1|0}else{g=k[Ka+4>>2]|0;e=k[Ka+8>>2]|0}b=g>>>0>2;Na=(Mm(e,58224,b?2:g)|0)!=0|g>>>0<2;tl(Ka);if(!(Na|b))Pl((k[n>>2]|0)+-12|0);n=(k[n>>2]|0)+-12|0;h=o-f|0;if(h>>>0>4294967279)ql(va);if(h>>>0<11){i[va>>0]=h<<1;g=va+1|0}else{b=h+16&-16;g=xm(b)|0;k[va+8>>2]=g;k[va>>2]=b|1;k[va+4>>2]=h}if((f|0)!=(o|0)){e=a;l=g;while(1){i[l>>0]=i[f>>0]|0;e=e+2|0;if((e|0)==(o|0))break;else{b=f;f=e;l=l+1|0;e=b}}g=g+h|0}i[g>>0]=0;g=rl(va,0,58224)|0;k[ra+0>>2]=k[g+0>>2];k[ra+4>>2]=k[g+4>>2];k[ra+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(ra,58360)|0;k[qa+0>>2]=k[g+0>>2];k[qa+4>>2]=k[g+4>>2];k[qa+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[qa>>0]|0;if(!(g&1)){e=qa+1|0;g=(g&255)>>>1}else{e=k[qa+8>>2]|0;g=k[qa+4>>2]|0}Dl(n,0,e,g)|0;tl(qa);tl(ra);tl(va);break}d=Ql(f,b,c)|0;if(((!((d|0)==(f|0)|(d|0)==(b|0))?(i[d>>0]|0)==95:0)?(Na=d+1|0,ja=ul(Na,b,c)|0,(ja|0)!=(Na|0)):0)?(W=c+4|0,A=k[W>>2]|0,((A-(k[c>>2]|0)|0)/24|0)>>>0>=2):0){q=A+-24|0;k[Ga+0>>2]=k[q+0>>2];k[Ga+4>>2]=k[q+4>>2];k[Ga+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;q=Ga+12|0;d=A+-12|0;k[q+0>>2]=k[d+0>>2];k[q+4>>2]=k[d+4>>2];k[q+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[W>>2]|0;g=d+-24|0;e=d;do{b=e+-24|0;k[W>>2]=b;hl(b);e=k[W>>2]|0}while((e|0)!=(g|0));p=d+-48|0;k[Ia+0>>2]=k[p+0>>2];k[Ia+4>>2]=k[p+4>>2];k[Ia+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;p=Ia+12|0;d=d+-36|0;k[p+0>>2]=k[d+0>>2];k[p+4>>2]=k[d+4>>2];k[p+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[W>>2]|0;p=d+-24|0;do if(i[p>>0]&1){m=d+-16|0;i[k[m>>2]>>0]=0;o=d+-20|0;k[o>>2]=0;d=i[p>>0]|0;if(!(d&1))f=10;else{f=k[p>>2]|0;d=f&255;f=(f&-2)+-1|0}if(!(d&1)){n=(d&255)>>>1;if((d&255)<22){h=1;e=10;l=n}else{h=1;e=(n+16&240)+-1|0;l=n}}else{h=0;e=10;l=0}if((e|0)!=(f|0)){if((e|0)==10){g=p+1|0;n=k[m>>2]|0;if(h){_m(g|0,n|0,((d&255)>>>1)+1|0)|0;ym(n)}else{i[g>>0]=i[n>>0]|0;ym(n)}i[p>>0]=l<<1;break}n=e+1|0;g=xm(n)|0;if(e>>>0<=f>>>0&(g|0)==0)break;if(h)_m(g|0,p+1|0,((d&255)>>>1)+1|0)|0;else{b=k[m>>2]|0;i[g>>0]=i[b>>0]|0;ym(b)}k[p>>2]=n|1;k[o>>2]=l;k[m>>2]=g}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[Ga+0>>2];k[p+4>>2]=k[Ga+4>>2];k[p+8>>2]=k[Ga+8>>2];k[Ga+0>>2]=0;k[Ga+4>>2]=0;k[Ga+8>>2]=0;d=i[q>>0]|0;if(!(d&1)){d=(d&255)>>>1;g=q+1|0}else{d=k[Ga+16>>2]|0;g=k[Ga+20>>2]|0}Ol(wa,g,d>>>0<2?d:2);d=i[wa>>0]|0;if(!(d&1)){d=(d&255)>>>1;g=wa+1|0}else{d=k[wa+4>>2]|0;g=k[wa+8>>2]|0}b=d>>>0>2;Na=(Mm(g,58224,b?2:d)|0)!=0|d>>>0<2;tl(wa);if(!(Na|b))Pl(q);e=k[W>>2]|0;p=e+-12|0;Al(sa,Ia);d=rl(sa,0,58224)|0;k[Da+0>>2]=k[d+0>>2];k[Da+4>>2]=k[d+4>>2];k[Da+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=sl(Da,58360)|0;k[za+0>>2]=k[d+0>>2];k[za+4>>2]=k[d+4>>2];k[za+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=i[q>>0]|0;if(!(d&1)){g=q+1|0;d=(d&255)>>>1}else{g=k[Ga+20>>2]|0;d=k[Ga+16>>2]|0}b=jl(za,g,d)|0;k[Fa+0>>2]=k[b+0>>2];k[Fa+4>>2]=k[b+4>>2];k[Fa+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;do if(!(i[p>>0]&1)){i[p+1>>0]=0;i[p>>0]=0}else{m=e+-4|0;i[k[m>>2]>>0]=0;l=e+-8|0;k[l>>2]=0;d=i[p>>0]|0;if(!(d&1))o=10;else{o=k[p>>2]|0;d=o&255;o=(o&-2)+-1|0}do if(!(d&1)){n=(d&255)>>>1;if((d&255)<22){h=1;f=10;break}h=1;f=(n+16&240)+-1|0}else{h=0;f=10;n=0}while(0);if((f|0)==(o|0))break;if((f|0)==10){e=p+1|0;g=k[m>>2]|0;if(h){_m(e|0,g|0,((d&255)>>>1)+1|0)|0;ym(g)}else{i[e>>0]=i[g>>0]|0;ym(g)}i[p>>0]=n<<1;break}g=f+1|0;e=xm(g)|0;if(f>>>0<=o>>>0&(e|0)==0)break;if(h)_m(e|0,p+1|0,((d&255)>>>1)+1|0)|0;else{b=k[m>>2]|0;i[e>>0]=i[b>>0]|0;ym(b)}k[p>>2]=g|1;k[l>>2]=n;k[m>>2]=e}while(0);k[p+0>>2]=k[Fa+0>>2];k[p+4>>2]=k[Fa+4>>2];k[p+8>>2]=k[Fa+8>>2];k[Fa+0>>2]=0;k[Fa+4>>2]=0;k[Fa+8>>2]=0;tl(Fa);tl(za);tl(Da);tl(sa);hl(Ia);hl(Ga);d=ja}else d=a}else d=a;while(0);if((d|0)==(a|0)){d=a;break a}e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}m=c+16|0;k[Ca>>2]=k[c+12>>2];Rl(Ha,e+-24|0,Ca);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[Ha+12>>2];k[e>>2]=k[Ha>>2];Oa=Ha+4|0;k[e+4>>2]=k[Oa>>2];a=Ha+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[Ha>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[Ha+12>>2];k[f>>2]=k[Ha>>2];a=Ha+4|0;k[f+4>>2]=k[a>>2];b=Ha+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[Ha>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(Ha);break a}case 67:{Na=a+1|0;d=ul(Na,b,c)|0;if((d|0)==(Na|0)){d=a;break a}f=c+4|0;e=k[f>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}sl(e+-24|0,58192)|0;m=c+16|0;f=(k[f>>2]|0)+-24|0;k[C>>2]=k[c+12>>2];Rl(M,f,C);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[M+12>>2];k[e>>2]=k[M>>2];Oa=M+4|0;k[e+4>>2]=k[Oa>>2];a=M+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[M>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[M+12>>2];k[f>>2]=k[M>>2];a=M+4|0;k[f+4>>2]=k[a>>2];b=M+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[M>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(M);break a}case 70:{if(g<<24>>24!=70){d=a;break a}d=a+1|0;if((d|0)==(b|0)){d=a;break a}if((i[d>>0]|0)==89){d=a+2|0;if((d|0)==(b|0)){d=a;break a}}e=ul(d,b,c)|0;if((e|0)==(d|0)){d=a;break a}Ol(Oa,58248,1);t=c+4|0;c:do if((e|0)!=(b|0)){m=Ka+1|0;p=Ka+8|0;q=Ka+4|0;s=Oa+4|0;g=0;d=e;d:while(1){while(1){e=i[d>>0]|0;if(e<<24>>24==118)d=d+1|0;else if(e<<24>>24==82){e=d+1|0;if((e|0)!=(b|0)?(i[e>>0]|0)==69:0){g=1;d=e;break}else Ja=197}else if(e<<24>>24==79){e=d+1|0;if((e|0)!=(b|0)?(i[e>>0]|0)==69:0){g=2;d=e;break}else Ja=197}else if(e<<24>>24==69)break d;else Ja=197;if((Ja|0)==197){Ja=0;e=((k[t>>2]|0)-(k[c>>2]|0)|0)/24|0;l=ul(d,b,c)|0;h=((k[t>>2]|0)-(k[c>>2]|0)|0)/24|0;if((l|0)==(d|0)|(l|0)==(b|0))break c;f=e>>>0<h>>>0;if(f){o=e;do{d=i[Oa>>0]|0;if(!(d&1))d=(d&255)>>>1;else d=k[s>>2]|0;if(d>>>0>1)sl(Oa,58736)|0;Al(Ka,(k[c>>2]|0)+(o*24|0)|0);d=i[Ka>>0]|0;if(!(d&1)){n=m;d=(d&255)>>>1}else{n=k[p>>2]|0;d=k[q>>2]|0}jl(Oa,n,d)|0;tl(Ka);o=o+1|0}while(o>>>0<h>>>0);if(f){n=k[t>>2]|0;do{d=n;n=n+-24|0;do{Na=d+-24|0;k[t>>2]=Na;hl(Na);d=k[t>>2]|0}while((d|0)!=(n|0));e=e+1|0}while((e|0)!=(h|0));d=l}else d=l}else d=l}if((d|0)==(b|0)){Ja=187;break c}}if((d|0)==(b|0)){Ja=187;break c}}d=d+1|0;sl(Oa,58240)|0;if((g|0)==2)sl(Oa,60568)|0;else if((g|0)==1)sl(Oa,60560)|0;g=k[t>>2]|0;if((k[c>>2]|0)!=(g|0)){sl(g+-24|0,58320)|0;g=i[Oa>>0]|0;if(!(g&1)){f=Oa+1|0;e=(g&255)>>>1}else{f=k[Oa+8>>2]|0;e=k[s>>2]|0}Dl((k[t>>2]|0)+-12|0,0,f,e)|0;tl(Oa);if((d|0)==(a|0)){d=a;break a}e=k[t>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}m=c+16|0;k[ba>>2]=k[c+12>>2];Rl(pa,e+-24|0,ba);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[pa+12>>2];k[e>>2]=k[pa>>2];Oa=pa+4|0;k[e+4>>2]=k[Oa>>2];a=pa+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[pa>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[pa+12>>2];k[f>>2]=k[pa>>2];a=pa+4|0;k[f+4>>2]=k[a>>2];b=pa+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[pa>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(pa);break a}}else Ja=187;while(0);if((Ja|0)==187){e=k[t>>2]|0;d=e+-24|0;do{b=e+-24|0;k[t>>2]=b;hl(b);e=k[t>>2]|0}while((e|0)!=(d|0))}tl(Oa);d=a;break a}case 71:{Na=a+1|0;d=ul(Na,b,c)|0;if((d|0)==(Na|0)){d=a;break a}f=c+4|0;e=k[f>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}sl(e+-24|0,58208)|0;m=c+16|0;f=(k[f>>2]|0)+-24|0;k[D>>2]=k[c+12>>2];Rl(N,f,D);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[N+12>>2];k[e>>2]=k[N>>2];Oa=N+4|0;k[e+4>>2]=k[Oa>>2];a=N+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[N>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[N+12>>2];k[f>>2]=k[N>>2];a=N+4|0;k[f+4>>2]=k[a>>2];b=N+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[N>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(N);break a}case 77:{if(((g<<24>>24==77?(Na=a+1|0,y=ul(Na,b,c)|0,(y|0)!=(Na|0)):0)?(xa=ul(y,b,c)|0,(xa|0)!=(y|0)):0)?(da=c+4|0,z=k[da>>2]|0,((z-(k[c>>2]|0)|0)/24|0)>>>0>=2):0){q=z+-24|0;k[Oa+0>>2]=k[q+0>>2];k[Oa+4>>2]=k[q+4>>2];k[Oa+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;q=Oa+12|0;d=z+-12|0;k[q+0>>2]=k[d+0>>2];k[q+4>>2]=k[d+4>>2];k[q+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=k[da>>2]|0;n=d+-24|0;g=d;do{b=g+-24|0;k[da>>2]=b;hl(b);g=k[da>>2]|0}while((g|0)!=(n|0));b=d+-48|0;k[Ka+0>>2]=k[b+0>>2];k[Ka+4>>2]=k[b+4>>2];k[Ka+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=Ka+12|0;d=d+-36|0;k[b+0>>2]=k[d+0>>2];k[b+4>>2]=k[d+4>>2];k[b+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=j[q>>1]|0;if(!(d&1))d=(d&65535)>>>8&255;else d=i[k[Oa+20>>2]>>0]|0;n=k[da>>2]|0;p=n+-24|0;if(d<<24>>24==40){d=sl(Oa,58248)|0;k[va+0>>2]=k[d+0>>2];k[va+4>>2]=k[d+4>>2];k[va+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;Al(Ga,Ka);d=i[Ga>>0]|0;if(!(d&1)){g=Ga+1|0;d=(d&255)>>>1}else{g=k[Ga+8>>2]|0;d=k[Ga+4>>2]|0}b=jl(va,g,d)|0;k[ra+0>>2]=k[b+0>>2];k[ra+4>>2]=k[b+4>>2];k[ra+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=sl(ra,60552)|0;k[qa+0>>2]=k[b+0>>2];k[qa+4>>2]=k[b+4>>2];k[qa+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;do if(i[p>>0]&1){m=n+-16|0;i[k[m>>2]>>0]=0;o=n+-20|0;k[o>>2]=0;d=i[p>>0]|0;if(!(d&1))f=10;else{f=k[p>>2]|0;d=f&255;f=(f&-2)+-1|0}if(!(d&1)){n=(d&255)>>>1;if((d&255)<22){h=1;e=10;l=n}else{h=1;e=(n+16&240)+-1|0;l=n}}else{h=0;e=10;l=0}if((e|0)!=(f|0)){if((e|0)==10){g=p+1|0;n=k[m>>2]|0;if(h){_m(g|0,n|0,((d&255)>>>1)+1|0)|0;ym(n)}else{i[g>>0]=i[n>>0]|0;ym(n)}i[p>>0]=l<<1;break}n=e+1|0;g=xm(n)|0;if(e>>>0<=f>>>0&(g|0)==0)break;if(h)_m(g|0,p+1|0,((d&255)>>>1)+1|0)|0;else{b=k[m>>2]|0;i[g>>0]=i[b>>0]|0;ym(b)}k[p>>2]=n|1;k[o>>2]=l;k[m>>2]=g}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[qa+0>>2];k[p+4>>2]=k[qa+4>>2];k[p+8>>2]=k[qa+8>>2];k[qa+0>>2]=0;k[qa+4>>2]=0;k[qa+8>>2]=0;tl(qa);tl(ra);tl(Ga);tl(va);d=k[da>>2]|0;p=rl(q,0,58240)|0;k[Ia+0>>2]=k[p+0>>2];k[Ia+4>>2]=k[p+4>>2];k[Ia+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;p=d+-12|0;do if(i[p>>0]&1){o=d+-4|0;i[k[o>>2]>>0]=0;n=d+-8|0;k[n>>2]=0;d=i[p>>0]|0;if(!(d&1))l=10;else{l=k[p>>2]|0;d=l&255;l=(l&-2)+-1|0}do if(!(d&1)){g=(d&255)>>>1;if((d&255)<22){m=1;f=10;h=g;break}m=1;f=(g+16&240)+-1|0;h=g}else{m=0;f=10;h=0}while(0);if((f|0)!=(l|0)){if((f|0)==10){e=p+1|0;g=k[o>>2]|0;if(m){_m(e|0,g|0,((d&255)>>>1)+1|0)|0;ym(g)}else{i[e>>0]=i[g>>0]|0;ym(g)}i[p>>0]=h<<1;break}g=f+1|0;e=xm(g)|0;if(f>>>0<=l>>>0&(e|0)==0)break;if(m)_m(e|0,p+1|0,((d&255)>>>1)+1|0)|0;else{b=k[o>>2]|0;i[e>>0]=i[b>>0]|0;ym(b)}k[p>>2]=g|1;k[n>>2]=h;k[o>>2]=e}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[Ia+0>>2];k[p+4>>2]=k[Ia+4>>2];k[p+8>>2]=k[Ia+8>>2];k[Ia+0>>2]=0;k[Ia+4>>2]=0;k[Ia+8>>2]=0;tl(Ia)}else{d=sl(Oa,58320)|0;k[za+0>>2]=k[d+0>>2];k[za+4>>2]=k[d+4>>2];k[za+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;Al(Da,Ka);d=i[Da>>0]|0;if(!(d&1)){g=Da+1|0;d=(d&255)>>>1}else{g=k[Da+8>>2]|0;d=k[Da+4>>2]|0}b=jl(za,g,d)|0;k[Fa+0>>2]=k[b+0>>2];k[Fa+4>>2]=k[b+4>>2];k[Fa+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=sl(Fa,60552)|0;k[wa+0>>2]=k[b+0>>2];k[wa+4>>2]=k[b+4>>2];k[wa+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;do if(i[p>>0]&1){m=n+-16|0;i[k[m>>2]>>0]=0;h=n+-20|0;k[h>>2]=0;d=i[p>>0]|0;if(!(d&1))o=10;else{d=k[p>>2]|0;o=(d&-2)+-1|0;d=d&255}if(!(d&1)){n=(d&255)>>>1;if((d&255)<22){f=10;l=1}else{f=(n+16&240)+-1|0;l=1}}else{f=10;n=0;l=0}if((f|0)!=(o|0)){if((f|0)==10){e=p+1|0;g=k[m>>2]|0;if(l){_m(e|0,g|0,((d&255)>>>1)+1|0)|0;ym(g)}else{i[e>>0]=i[g>>0]|0;ym(g)}i[p>>0]=n<<1;break}g=f+1|0;e=xm(g)|0;if(f>>>0<=o>>>0&(e|0)==0)break;if(l)_m(e|0,p+1|0,((d&255)>>>1)+1|0)|0;else{b=k[m>>2]|0;i[e>>0]=i[b>>0]|0;ym(b)}k[p>>2]=g|1;k[h>>2]=n;k[m>>2]=e}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[wa+0>>2];k[p+4>>2]=k[wa+4>>2];k[p+8>>2]=k[wa+8>>2];k[wa+0>>2]=0;k[wa+4>>2]=0;k[wa+8>>2]=0;tl(wa);tl(Fa);tl(Da);tl(za);d=k[da>>2]|0;p=d+-12|0;do if(i[p>>0]&1){o=d+-4|0;i[k[o>>2]>>0]=0;h=d+-8|0;k[h>>2]=0;d=i[p>>0]|0;if(!(d&1))l=10;else{l=k[p>>2]|0;d=l&255;l=(l&-2)+-1|0}do if(!(d&1)){g=(d&255)>>>1;if((d&255)<22){f=10;m=g;n=1;break}f=(g+16&240)+-1|0;m=g;n=1}else{f=10;m=0;n=0}while(0);if((f|0)!=(l|0)){if((f|0)==10){e=p+1|0;g=k[o>>2]|0;if(n){_m(e|0,g|0,((d&255)>>>1)+1|0)|0;ym(g)}else{i[e>>0]=i[g>>0]|0;ym(g)}i[p>>0]=m<<1;break}g=f+1|0;e=xm(g)|0;if(f>>>0<=l>>>0&(e|0)==0)break;if(n)_m(e|0,p+1|0,((d&255)>>>1)+1|0)|0;else{b=k[o>>2]|0;i[e>>0]=i[b>>0]|0;ym(b)}k[p>>2]=g|1;k[h>>2]=m;k[o>>2]=e}}else{i[p+1>>0]=0;i[p>>0]=0}while(0);k[p+0>>2]=k[q+0>>2];k[p+4>>2]=k[q+4>>2];k[p+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0}hl(Ka);hl(Oa);d=xa}else d=a;if((d|0)==(a|0)){d=a;break a}e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}m=c+16|0;k[ya>>2]=k[c+12>>2];Rl(Ea,e+-24|0,ya);f=c+20|0;e=k[f>>2]|0;h=k[c+24>>2]|0;if(e>>>0<h>>>0){if(!e)e=0;else{k[e+12>>2]=k[Ea+12>>2];k[e>>2]=k[Ea>>2];Oa=Ea+4|0;k[e+4>>2]=k[Oa>>2];a=Ea+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[Ea>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{f=k[m>>2]|0;l=e-f>>4;g=l+1|0;if((g|0)<0)Fl(m);e=h-f|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<g>>>0?g:e}else e=2147483647;Gl(Oa,e,l,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[Ea+12>>2];k[f>>2]=k[Ea>>2];a=Ea+4|0;k[f+4>>2]=k[a>>2];b=Ea+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[Ea>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(Ea);break a}case 82:{u=c+4|0;m=((k[u>>2]|0)-(k[c>>2]|0)|0)/24|0;Ka=a+1|0;d=ul(Ka,b,c)|0;u=((k[u>>2]|0)-(k[c>>2]|0)|0)/24|0;if((d|0)==(Ka|0)){d=a;break a}n=c+16|0;o=k[c+12>>2]|0;v=c+20|0;g=k[v>>2]|0;e=k[c+24>>2]|0;if(g>>>0<e>>>0){if(!g)g=0;else{k[g>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=o;g=k[v>>2]|0}k[v>>2]=g+16}else{f=k[n>>2]|0;h=g-f>>4;l=h+1|0;if((l|0)<0)Fl(n);g=e-f|0;if(g>>4>>>0<1073741823){g=g>>3;g=g>>>0<l>>>0?l:g}else g=2147483647;Gl(Oa,g,h,c+28|0);g=Oa+8|0;e=k[g>>2]|0;if(e){k[e>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=o}k[g>>2]=e+16;Hl(n,Oa);Il(Oa)}if(m>>>0>=u>>>0)break a;p=ia+1|0;q=Oa+8|0;s=ia+8|0;t=ia+4|0;while(1){e=k[c>>2]|0;f=e+(m*24|0)+12|0;g=i[f>>0]|0;if(!(g&1)){l=(g&255)>>>1;g=f+1|0}else{l=k[e+(m*24|0)+16>>2]|0;g=k[e+(m*24|0)+20>>2]|0}Ol(ia,g,l>>>0<2?l:2);g=i[ia>>0]|0;if(!(g&1)){g=(g&255)>>>1;e=p}else{g=k[t>>2]|0;e=k[s>>2]|0}Ka=g>>>0>2;Ia=(Mm(e,58224,Ka?2:g)|0)!=0|g>>>0<2;tl(ia);e=k[c>>2]|0;if(Ia|Ka){g=e+(m*24|0)+12|0;if(!(i[g>>0]&1))g=g+1|0;else g=k[e+(m*24|0)+20>>2]|0;if((i[g>>0]|0)==40){sl(e+(m*24|0)|0,58248)|0;rl((k[c>>2]|0)+(m*24|0)+12|0,0,58240)|0}}else{sl(e+(m*24|0)|0,58232)|0;rl((k[c>>2]|0)+(m*24|0)+12|0,0,58240)|0}sl((k[c>>2]|0)+(m*24|0)|0,58296)|0;f=k[v>>2]|0;o=f+-16|0;l=k[c>>2]|0;h=l+(m*24|0)|0;e=f+-12|0;n=k[e>>2]|0;if((n|0)==(k[f+-8>>2]|0)){g=(n-(k[o>>2]|0)|0)/24|0;n=g+1|0;if((n|0)<0){d=o;break}if(g>>>0<1073741823){Ka=g<<1;n=Ka>>>0<n>>>0?n:Ka}else n=2147483647;Kl(Oa,n,g,f+-4|0);g=k[q>>2]|0;if(g){Jl(g,h);Jl(g+12|0,l+(m*24|0)+12|0)}k[q>>2]=g+24;Ml(o,Oa);Ll(Oa)}else{if(!n)g=0;else{Jl(n,h);Jl(n+12|0,l+(m*24|0)+12|0);g=k[e>>2]|0}k[e>>2]=g+24}m=m+1|0;if(m>>>0>=u>>>0)break a}Fl(d);break}case 84:{t=c+4|0;m=((k[t>>2]|0)-(k[c>>2]|0)|0)/24|0;q=Sl(a,b,c)|0;p=((k[t>>2]|0)-(k[c>>2]|0)|0)/24|0;if((q|0)==(a|0)){d=a;break a}w=c+16|0;s=c+12|0;o=k[s>>2]|0;v=c+20|0;d=k[v>>2]|0;u=c+24|0;g=k[u>>2]|0;if(d>>>0<g>>>0){if(!d)d=0;else{k[d>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;k[d+12>>2]=o;d=k[v>>2]|0}k[v>>2]=d+16}else{e=k[w>>2]|0;n=d-e>>4;f=n+1|0;if((f|0)<0)Fl(w);d=g-e|0;if(d>>4>>>0<1073741823){d=d>>3;d=d>>>0<f>>>0?f:d}else d=2147483647;Gl(Oa,d,n,c+28|0);d=Oa+8|0;g=k[d>>2]|0;if(g){k[g>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=o}k[d>>2]=g+16;Hl(w,Oa);Il(Oa)}e:do if(m>>>0<p>>>0){l=Oa+8|0;h=m;while(1){e=k[v>>2]|0;d=e+-16|0;f=k[c>>2]|0;o=f+(h*24|0)|0;g=e+-12|0;n=k[g>>2]|0;if((n|0)==(k[e+-8>>2]|0)){g=(n-(k[d>>2]|0)|0)/24|0;n=g+1|0;if((n|0)<0)break;if(g>>>0<1073741823){a=g<<1;n=a>>>0<n>>>0?n:a}else n=2147483647;Kl(Oa,n,g,e+-4|0);g=k[l>>2]|0;if(g){Jl(g,o);Jl(g+12|0,f+(h*24|0)+12|0)}k[l>>2]=g+24;Ml(d,Oa);Ll(Oa)}else{if(!n)d=0;else{Jl(n,o);Jl(n+12|0,f+(h*24|0)+12|0);d=k[g>>2]|0}k[g>>2]=d+24}h=h+1|0;if(h>>>0>=p>>>0)break e}Fl(d)}while(0);if(!((i[c+63>>0]|0)!=0&(p|0)==(m+1|0))){d=q;break a}d=Tl(q,b,c)|0;if((d|0)==(q|0)){d=q;break a}Al(oa,(k[t>>2]|0)+-24|0);f=k[t>>2]|0;g=f+-24|0;e=f;do{a=e+-24|0;k[t>>2]=a;hl(a);e=k[t>>2]|0}while((e|0)!=(g|0));g=i[oa>>0]|0;if(!(g&1)){e=oa+1|0;g=(g&255)>>>1}else{e=k[oa+8>>2]|0;g=k[oa+4>>2]|0}jl(f+-48|0,e,g)|0;g=(k[t>>2]|0)+-24|0;k[ca>>2]=k[s>>2];Rl(na,g,ca);g=k[v>>2]|0;f=k[u>>2]|0;if(g>>>0<f>>>0){if(!g)e=0;else{k[g+12>>2]=k[na+12>>2];k[g>>2]=k[na>>2];e=na+4|0;k[g+4>>2]=k[e>>2];Oa=na+8|0;k[g+8>>2]=k[Oa>>2];k[Oa>>2]=0;k[e>>2]=0;k[na>>2]=0;e=k[v>>2]|0}k[v>>2]=e+16}else{e=k[w>>2]|0;l=g-e>>4;g=l+1|0;if((g|0)<0)Fl(w);e=f-e|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<g>>>0?g:e}else e=2147483647;Gl(Oa,e,l,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[na+12>>2];k[f>>2]=k[na>>2];a=na+4|0;k[f+4>>2]=k[a>>2];b=na+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[na>>2]=0}k[e>>2]=f+16;Hl(w,Oa);Il(Oa)}il(na);tl(oa);break a}case 85:{d=a+1|0;if((d|0)==(b|0)){d=a;break a}n=Ul(d,b,c)|0;if((n|0)==(d|0)){d=a;break a}d=ul(n,b,c)|0;if((d|0)==(n|0)){d=a;break a}o=c+4|0;n=k[o>>2]|0;if(((n-(k[c>>2]|0)|0)/24|0)>>>0<2){d=a;break a}Al(ua,n+-24|0);f=k[o>>2]|0;n=f+-24|0;g=f;do{a=g+-24|0;k[o>>2]=a;hl(a);g=k[o>>2]|0}while((g|0)!=(n|0));g=f+-48|0;n=i[g>>0]|0;if(!(n&1)){e=(n&255)>>>1;n=g+1|0}else{e=k[f+-44>>2]|0;n=k[f+-40>>2]|0}Ol(P,n,e>>>0<9?e:9);n=i[P>>0]|0;if(!(n&1)){g=(n&255)>>>1;n=P+1|0}else{g=k[P+4>>2]|0;n=k[P+8>>2]|0}e=g>>>0>9;n=Mm(n,58304,e?9:g)|0;if(!n)n=g>>>0<9?-1:e&1;tl(P);f=(k[o>>2]|0)+-24|0;if(!n){Al(ka,f);e=k[o>>2]|0;g=e+-24|0;do{a=e+-24|0;k[o>>2]=a;hl(a);e=k[o>>2]|0}while((e|0)!=(g|0));g=i[ka>>0]|0;if(!(g&1)){e=ka+1|0;f=ka+1|0;g=(g&255)>>>1}else{f=k[ka+8>>2]|0;e=f;g=k[ka+4>>2]|0}g=Ul(e+9|0,f+g|0,c)|0;if(!(i[ka>>0]&1))e=ka+1|0;else e=k[ka+8>>2]|0;if((g|0)==(e+9|0)){Vl(ga,ua,58320);g=i[ka>>0]|0;if(!(g&1)){e=ka+1|0;g=(g&255)>>>1}else{e=k[ka+8>>2]|0;g=k[ka+4>>2]|0}n=jl(ga,e,g)|0;k[fa+0>>2]=k[n+0>>2];k[fa+4>>2]=k[n+4>>2];k[fa+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;k[ea+0>>2]=k[fa+0>>2];k[ea+4>>2]=k[fa+4>>2];k[ea+8>>2]=k[fa+8>>2];k[fa+0>>2]=0;k[fa+4>>2]=0;k[fa+8>>2]=0;n=ea+12|0;k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;g=k[o>>2]|0;e=k[c+8>>2]|0;if(g>>>0<e>>>0){if(!g)g=0;else{k[g+0>>2]=k[ea+0>>2];k[g+4>>2]=k[ea+4>>2];k[g+8>>2]=k[ea+8>>2];k[ea+0>>2]=0;k[ea+4>>2]=0;k[ea+8>>2]=0;g=g+12|0;k[g+0>>2]=k[n+0>>2];k[g+4>>2]=k[n+4>>2];k[g+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;g=k[o>>2]|0}k[o>>2]=g+24}else{f=k[c>>2]|0;h=(g-f|0)/24|0;l=h+1|0;if((l|0)<0)Fl(c);g=(e-f|0)/24|0;if(g>>>0<1073741823){g=g<<1;g=g>>>0<l>>>0?l:g}else g=2147483647;Kl(Oa,g,h,c+12|0);g=Oa+8|0;e=k[g>>2]|0;if(e){k[e+0>>2]=k[ea+0>>2];k[e+4>>2]=k[ea+4>>2];k[e+8>>2]=k[ea+8>>2];k[ea+0>>2]=0;k[ea+4>>2]=0;k[ea+8>>2]=0;a=e+12|0;k[a+0>>2]=k[n+0>>2];k[a+4>>2]=k[n+4>>2];k[a+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0}k[g>>2]=e+24;Ml(c,Oa);Ll(Oa)}hl(ea);tl(fa);tl(ga)}else{e=(k[o>>2]|0)+-24|0;Vl(_,ua,58328);Al($,(k[o>>2]|0)+-24|0);g=i[$>>0]|0;if(!(g&1)){f=$+1|0;g=(g&255)>>>1}else{f=k[$+8>>2]|0;g=k[$+4>>2]|0}a=jl(_,f,g)|0;k[Z+0>>2]=k[a+0>>2];k[Z+4>>2]=k[a+4>>2];k[Z+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;a=sl(Z,58336)|0;k[Y+0>>2]=k[a+0>>2];k[Y+4>>2]=k[a+4>>2];k[Y+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[X+0>>2]=k[Y+0>>2];k[X+4>>2]=k[Y+4>>2];k[X+8>>2]=k[Y+8>>2];k[Y+0>>2]=0;k[Y+4>>2]=0;k[Y+8>>2]=0;a=X+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(e,X);hl(X);tl(Y);tl(Z);tl($);tl(_)}tl(ka)}else{Vl(S,ua,58320);Al(T,(k[o>>2]|0)+-24|0);g=i[T>>0]|0;if(!(g&1)){e=T+1|0;g=(g&255)>>>1}else{e=k[T+8>>2]|0;g=k[T+4>>2]|0}a=jl(S,e,g)|0;k[R+0>>2]=k[a+0>>2];k[R+4>>2]=k[a+4>>2];k[R+8>>2]=k[a+8>>2];k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;k[Q+0>>2]=k[R+0>>2];k[Q+4>>2]=k[R+4>>2];k[Q+8>>2]=k[R+8>>2];k[R+0>>2]=0;k[R+4>>2]=0;k[R+8>>2]=0;a=Q+12|0;k[a+0>>2]=0;k[a+4>>2]=0;k[a+8>>2]=0;Wl(f,Q);hl(Q);tl(R);tl(T);tl(S)}m=(k[o>>2]|0)+-24|0;k[la>>2]=k[c+12>>2];Rl(ta,m,la);m=c+16|0;g=c+20|0;e=k[g>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[ta+12>>2];k[e>>2]=k[ta>>2];Oa=ta+4|0;k[e+4>>2]=k[Oa>>2];a=ta+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[ta>>2]=0;e=k[g>>2]|0}k[g>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[ta+12>>2];k[f>>2]=k[ta>>2];a=ta+4|0;k[f+4>>2]=k[a>>2];b=ta+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[ta>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(ta);tl(ua);break a}case 83:{Na=a+1|0;if((Na|0)!=(b|0)?(i[Na>>0]|0)==116:0){d=Bl(a,b,c)|0;if((d|0)==(a|0)){d=a;break a}e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}m=c+16|0;k[B>>2]=k[c+12>>2];Rl(L,e+-24|0,B);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[L+12>>2];k[e>>2]=k[L>>2];Oa=L+4|0;k[e+4>>2]=k[Oa>>2];a=L+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[L>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[L+12>>2];k[f>>2]=k[L>>2];a=L+4|0;k[f+4>>2]=k[a>>2];b=L+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[L>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(L);break a}d=Xl(a,b,c)|0;if((d|0)==(a|0)){d=a;break a}n=Tl(d,b,c)|0;if((n|0)==(d|0))break a;f=c+4|0;e=k[f>>2]|0;if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2)break a;Al(V,e+-24|0);e=k[f>>2]|0;d=e+-24|0;g=e;do{a=g+-24|0;k[f>>2]=a;hl(a);g=k[f>>2]|0}while((g|0)!=(d|0));d=i[V>>0]|0;if(!(d&1)){g=V+1|0;d=(d&255)>>>1}else{g=k[V+8>>2]|0;d=k[V+4>>2]|0}jl(e+-48|0,g,d)|0;h=(k[f>>2]|0)+-24|0;k[J>>2]=k[c+12>>2];Rl(U,h,J);h=c+16|0;g=c+20|0;d=k[g>>2]|0;f=k[c+24>>2]|0;if(d>>>0<f>>>0){if(!d)d=0;else{k[d+12>>2]=k[U+12>>2];k[d>>2]=k[U>>2];Oa=U+4|0;k[d+4>>2]=k[Oa>>2];a=U+8|0;k[d+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[U>>2]=0;d=k[g>>2]|0}k[g>>2]=d+16}else{g=k[h>>2]|0;l=d-g>>4;e=l+1|0;if((e|0)<0)Fl(h);d=f-g|0;if(d>>4>>>0<1073741823){d=d>>3;d=d>>>0<e>>>0?e:d}else d=2147483647;Gl(Oa,d,l,c+28|0);d=Oa+8|0;e=k[d>>2]|0;if(e){k[e+12>>2]=k[U+12>>2];k[e>>2]=k[U>>2];a=U+4|0;k[e+4>>2]=k[a>>2];b=U+8|0;k[e+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[U>>2]=0}k[d>>2]=e+16;Hl(h,Oa);Il(Oa)}il(U);tl(V);d=n;break a}case 68:{d=a+1|0;if((d|0)!=(b|0)){d=i[d>>0]|0;n=d<<24>>24;if((n|0)==112){q=c+4|0;m=((k[q>>2]|0)-(k[c>>2]|0)|0)/24|0;Ka=a+2|0;d=ul(Ka,b,c)|0;q=((k[q>>2]|0)-(k[c>>2]|0)|0)/24|0;if((d|0)==(Ka|0))break b;n=c+16|0;o=k[c+12>>2]|0;s=c+20|0;g=k[s>>2]|0;e=k[c+24>>2]|0;if(g>>>0<e>>>0){if(!g)g=0;else{k[g>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;k[g+12>>2]=o;g=k[s>>2]|0}k[s>>2]=g+16}else{f=k[n>>2]|0;h=g-f>>4;l=h+1|0;if((l|0)<0)Fl(n);g=e-f|0;if(g>>4>>>0<1073741823){g=g>>3;g=g>>>0<l>>>0?l:g}else g=2147483647;Gl(Oa,g,h,c+28|0);g=Oa+8|0;e=k[g>>2]|0;if(e){k[e>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;k[e+12>>2]=o}k[g>>2]=e+16;Hl(n,Oa);Il(Oa)}if(m>>>0>=q>>>0)break a;p=Oa+8|0;h=m;while(1){n=k[s>>2]|0;f=n+-16|0;o=k[c>>2]|0;l=o+(h*24|0)|0;e=n+-12|0;g=k[e>>2]|0;if((g|0)==(k[n+-8>>2]|0)){e=(g-(k[f>>2]|0)|0)/24|0;g=e+1|0;if((g|0)<0){d=f;break}if(e>>>0<1073741823){Ka=e<<1;g=Ka>>>0<g>>>0?g:Ka}else g=2147483647;Kl(Oa,g,e,n+-4|0);g=k[p>>2]|0;if(g){Jl(g,l);Jl(g+12|0,o+(h*24|0)+12|0)}k[p>>2]=g+24;Ml(f,Oa);Ll(Oa)}else{if(!g)g=0;else{Jl(g,l);Jl(g+12|0,o+(h*24|0)+12|0);g=k[e>>2]|0}k[e>>2]=g+24}h=h+1|0;if(h>>>0>=q>>>0)break a}Fl(d)}else if((n|0)==84|(n|0)==116){d=Yl(a,b,c)|0;if((d|0)==(a|0))break b;e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}m=c+16|0;k[E>>2]=k[c+12>>2];Rl(O,e+-24|0,E);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[O+12>>2];k[e>>2]=k[O>>2];Oa=O+4|0;k[e+4>>2]=k[Oa>>2];a=O+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[O>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[O+12>>2];k[f>>2]=k[O>>2];a=O+4|0;k[f+4>>2]=k[a>>2];b=O+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[O>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(O);break a}else if((n|0)==118){f:do if((b-a|0)>3&g<<24>>24==68&d<<24>>24==118){n=a+2|0;d=i[n>>0]|0;if((d+-49&255)>=9){k[Fa+0>>2]=0;k[Fa+4>>2]=0;k[Fa+8>>2]=0;if(d<<24>>24!=95?(H=Ql(n,b,c)|0,(H|0)!=(n|0)):0){n=c+4|0;d=k[n>>2]|0;if((k[c>>2]|0)!=(d|0)){Al(za,d+-24|0);k[Fa+0>>2]=k[za+0>>2];k[Fa+4>>2]=k[za+4>>2];k[Fa+8>>2]=k[za+8>>2];k[za+0>>2]=0;k[za+4>>2]=0;k[za+8>>2]=0;tl(za);g=k[n>>2]|0;d=g+-24|0;do{Ka=g+-24|0;k[n>>2]=Ka;hl(Ka);g=k[n>>2]|0}while((g|0)!=(d|0));d=H;Ja=715}}else{d=n;Ja=715}do if((Ja|0)==715){if((((d|0)!=(b|0)?(i[d>>0]|0)==95:0)?(I=d+1|0,(I|0)!=(b|0)):0)?(K=ul(I,b,c)|0,(K|0)!=(I|0)):0){g=k[c+4>>2]|0;if((k[c>>2]|0)==(g|0))break;Zl(sa,58344,Fa);d=sl(sa,58360)|0;k[Da+0>>2]=k[d+0>>2];k[Da+4>>2]=k[d+4>>2];k[Da+8>>2]=k[d+8>>2];k[d+0>>2]=0;k[d+4>>2]=0;k[d+8>>2]=0;d=i[Da>>0]|0;if(!(d&1)){e=Da+1|0;d=(d&255)>>>1}else{e=k[Da+8>>2]|0;d=k[Da+4>>2]|0}jl(g+-24|0,e,d)|0;tl(Da);tl(sa);d=K}else d=a;tl(Fa);break f}while(0);tl(Fa);d=a;break}d=zl(n,b)|0;if(((d|0)!=(b|0)?(i[d>>0]|0)==95:0)?(G=d-n|0,F=d+1|0,(F|0)!=(b|0)):0){if((i[F>>0]|0)!=112){d=ul(F,b,c)|0;if((d|0)==(F|0)){d=a;break}f=k[c+4>>2]|0;if((k[c>>2]|0)==(f|0)){d=a;break}Ol(ra,n,G);g=rl(ra,0,58344)|0;k[qa+0>>2]=k[g+0>>2];k[qa+4>>2]=k[g+4>>2];k[qa+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=sl(qa,58360)|0;k[Ka+0>>2]=k[g+0>>2];k[Ka+4>>2]=k[g+4>>2];k[Ka+8>>2]=k[g+8>>2];k[g+0>>2]=0;k[g+4>>2]=0;k[g+8>>2]=0;g=i[Ka>>0]|0;if(!(g&1)){e=Ka+1|0;g=(g&255)>>>1}else{e=k[Ka+8>>2]|0;g=k[Ka+4>>2]|0}jl(f+-24|0,e,g)|0;tl(Ka);tl(qa);tl(ra);break}d=d+2|0;Ol(wa,n,G);o=rl(wa,0,58368)|0;k[Ia+0>>2]=k[o+0>>2];k[Ia+4>>2]=k[o+4>>2];k[Ia+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;o=sl(Ia,58360)|0;k[Ga+0>>2]=k[o+0>>2];k[Ga+4>>2]=k[o+4>>2];k[Ga+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;k[va+0>>2]=k[Ga+0>>2];k[va+4>>2]=k[Ga+4>>2];k[va+8>>2]=k[Ga+8>>2];k[Ga+0>>2]=0;k[Ga+4>>2]=0;k[Ga+8>>2]=0;o=va+12|0;k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;e=c+4|0;g=k[e>>2]|0;n=k[c+8>>2]|0;if(g>>>0<n>>>0){if(!g)g=0;else{k[g+0>>2]=k[va+0>>2];k[g+4>>2]=k[va+4>>2];k[g+8>>2]=k[va+8>>2];k[va+0>>2]=0;k[va+4>>2]=0;k[va+8>>2]=0;g=g+12|0;k[g+0>>2]=k[o+0>>2];k[g+4>>2]=k[o+4>>2];k[g+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;g=k[e>>2]|0}k[e>>2]=g+24}else{e=k[c>>2]|0;l=(g-e|0)/24|0;f=l+1|0;if((f|0)<0)Fl(c);g=(n-e|0)/24|0;if(g>>>0<1073741823){g=g<<1;g=g>>>0<f>>>0?f:g}else g=2147483647;Kl(Oa,g,l,c+12|0);g=Oa+8|0;e=k[g>>2]|0;if(e){k[e+0>>2]=k[va+0>>2];k[e+4>>2]=k[va+4>>2];k[e+8>>2]=k[va+8>>2];k[va+0>>2]=0;k[va+4>>2]=0;k[va+8>>2]=0;Ka=e+12|0;k[Ka+0>>2]=k[o+0>>2];k[Ka+4>>2]=k[o+4>>2];k[Ka+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0}k[g>>2]=e+24;Ml(c,Oa);Ll(Oa)}hl(va);tl(Ga);tl(Ia);tl(wa)}else d=a}else d=a;while(0);if((d|0)==(a|0))break b;e=k[c+4>>2]|0;if((k[c>>2]|0)==(e|0)){d=a;break a}m=c+16|0;k[aa>>2]=k[c+12>>2];Rl(ma,e+-24|0,aa);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[ma+12>>2];k[e>>2]=k[ma>>2];Oa=ma+4|0;k[e+4>>2]=k[Oa>>2];a=ma+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[ma>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[ma+12>>2];k[f>>2]=k[ma>>2];a=ma+4|0;k[f+4>>2]=k[a>>2];b=ma+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[ma>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(ma);break a}else break b}break}default:{}}while(0);d=Nl(a,b,c)|0;if((d|0)==(a|0)){d=Bl(a,b,c)|0;if((d|0)!=(a|0)?(La=k[c+4>>2]|0,(k[c>>2]|0)!=(La|0)):0){m=c+16|0;k[Ma>>2]=k[c+12>>2];Rl(Na,La+-24|0,Ma);f=c+20|0;e=k[f>>2]|0;l=k[c+24>>2]|0;if(e>>>0<l>>>0){if(!e)e=0;else{k[e+12>>2]=k[Na+12>>2];k[e>>2]=k[Na>>2];Oa=Na+4|0;k[e+4>>2]=k[Oa>>2];a=Na+8|0;k[e+8>>2]=k[a>>2];k[a>>2]=0;k[Oa>>2]=0;k[Na>>2]=0;e=k[f>>2]|0}k[f>>2]=e+16}else{g=k[m>>2]|0;h=e-g>>4;f=h+1|0;if((f|0)<0)Fl(m);e=l-g|0;if(e>>4>>>0<1073741823){e=e>>3;e=e>>>0<f>>>0?f:e}else e=2147483647;Gl(Oa,e,h,c+28|0);e=Oa+8|0;f=k[e>>2]|0;if(f){k[f+12>>2]=k[Na+12>>2];k[f>>2]=k[Na>>2];a=Na+4|0;k[f+4>>2]=k[a>>2];b=Na+8|0;k[f+8>>2]=k[b>>2];k[b>>2]=0;k[a>>2]=0;k[Na>>2]=0}k[e>>2]=f+16;Hl(m,Oa);Il(Oa)}il(Na)}else d=a}}}else d=a;while(0);r=Pa;return d|0}function vl(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,l=0,m=0;if((-18-b|0)>>>0<c>>>0)ql(a);if(!(i[a>>0]&1))m=a+1|0;else m=k[a+8>>2]|0;if(b>>>0<2147483623){c=c+b|0;l=b<<1;c=c>>>0<l>>>0?l:c;if(c>>>0<11)j=11;else j=c+16&-16}else j=-17;l=xm(j)|0;if(e)_m(l|0,m|0,e|0)|0;if(g)_m(l+e|0,h|0,g|0)|0;c=d-f|0;if((c|0)!=(e|0))_m(l+(g+e)|0,m+(f+e)|0,c-e|0)|0;if((b|0)!=10)ym(m);k[a+8>>2]=l;k[a>>2]=j|1;b=c+g|0;k[a+4>>2]=b;i[l+b>>0]=0;return}function wl(a){a=a|0;var b=0,c=0,d=0,e=0;b=k[a>>2]|0;if(b){d=a+4|0;c=k[d>>2]|0;if((c|0)!=(b|0)){do{e=c+-16|0;k[d>>2]=e;nl(e);c=k[d>>2]|0}while((c|0)!=(b|0));b=k[a>>2]|0}ol(k[a+12>>2]|0,b,(k[a+8>>2]|0)-b|0)}return}function xl(a){a=a|0;var b=0;b=r;r=r+16|0;ym(a);if(!(bc(k[15276]|0,0)|0)){r=b;return}else vk(61232,b)}function yl(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;do if((a|0)!=(b|0)){c=i[a>>0]|0;if((c|0)==104){d=a+1|0;c=zl(d,b)|0;if((c|0)==(d|0)|(c|0)==(b|0))break;a=(i[c>>0]|0)==95?c+1|0:a;break}else if((c|0)!=118)break;e=a+1|0;c=zl(e,b)|0;if((!((c|0)==(e|0)|(c|0)==(b|0))?(i[c>>0]|0)==95:0)?(e=c+1|0,d=zl(e,b)|0,!((d|0)==(e|0)|(d|0)==(b|0))):0)return ((i[d>>0]|0)==95?d+1|0:a)|0}while(0);return a|0}function zl(a,b){a=a|0;b=b|0;var c=0,d=0;a:do if((a|0)!=(b|0)?(c=(i[a>>0]|0)==110?a+1|0:a,(c|0)!=(b|0)):0){d=i[c>>0]|0;if(d<<24>>24==48){c=c+1|0;break}if((d+-49&255)<9)do{c=c+1|0;if((c|0)==(b|0)){c=b;break a}}while(((i[c>>0]|0)+-48|0)>>>0<10);else c=a}else c=a;while(0);return c|0}function Al(a,b){a=a|0;b=b|0;var c=0,d=0,e=0;c=b+12|0;d=i[c>>0]|0;if(!(d&1)){e=c+1|0;c=(d&255)>>>1}else{e=k[b+20>>2]|0;c=k[b+16>>2]|0}b=jl(b,e,c)|0;k[a+0>>2]=k[b+0>>2];k[a+4>>2]=k[b+4>>2];k[a+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;return}function Bl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0;ya=r;r=r+304|0;wa=ya+284|0;va=ya+272|0;pa=ya+260|0;ba=ya+248|0;ca=ya+232|0;ha=ya+224|0;qa=ya+212|0;ia=ya+200|0;ja=ya+184|0;ka=ya+176|0;ra=ya+164|0;la=ya+152|0;ma=ya+136|0;na=ya+48|0;sa=ya;oa=ya+16|0;da=ya+32|0;ta=ya+36|0;ea=ya+52|0;fa=ya+64|0;ga=ya+80|0;n=ya+88|0;h=ya+104|0;o=ya+108|0;j=ya+120|0;g=b;a:do if((g-a|0)>1){xa=(i[a>>0]|0)==76?a+1|0:a;l=i[xa>>0]|0;f=l<<24>>24;if((f|0)==78){b:do if((xa|0)!=(b|0))if(l<<24>>24==78?(e=El(xa+1|0,b,va)|0,(e|0)!=(b|0)):0){l=c+52|0;k[l>>2]=0;f=i[e>>0]|0;if(f<<24>>24==79){k[l>>2]=2;h=e+1|0}else if(f<<24>>24==82){k[l>>2]=1;h=e+1|0}else h=e;aa=c+4|0;l=k[aa>>2]|0;f=k[c+8>>2]|0;if(l>>>0<f>>>0){if(!l)l=0;else{k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;k[l+12>>2]=0;k[l+16>>2]=0;k[l+20>>2]=0;l=k[aa>>2]|0}k[aa>>2]=l+24}else{d=k[c>>2]|0;m=(l-d|0)/24|0;e=m+1|0;if((e|0)<0)Fl(c);l=(f-d|0)/24|0;if(l>>>0<1073741823){l=l<<1;l=l>>>0<e>>>0?e:l}else l=2147483647;Kl(wa,l,m,c+12|0);l=wa+8|0;f=k[l>>2]|0;if(f){k[f+0>>2]=0;k[f+4>>2]=0;k[f+8>>2]=0;k[f+12>>2]=0;k[f+16>>2]=0;k[f+20>>2]=0}k[l>>2]=f+24;Ml(c,wa);Ll(wa)}if(((g-h|0)>1?(i[h>>0]|0)==83:0)?(i[h+1>>0]|0)==116:0){_l((k[aa>>2]|0)+-24|0,60440,3);h=h+2|0}if((h|0)==(b|0)){d=k[aa>>2]|0;b=d+-24|0;while(1){c=d+-24|0;k[aa>>2]=c;hl(c);d=k[aa>>2]|0;if((d|0)==(b|0)){b=xa;break b}}}l=i[h>>0]|0;if(l<<24>>24==69){k[c+48>>2]=k[va>>2];b=h+1|0;break}G=sa+1|0;H=c+12|0;I=c+16|0;J=c+20|0;K=c+24|0;L=oa+12|0;M=oa+4|0;N=oa+8|0;O=c+28|0;P=wa+8|0;Q=sa+8|0;R=sa+4|0;S=fa+12|0;T=fa+4|0;U=fa+8|0;V=wa+8|0;W=ea+1|0;X=ea+8|0;Y=ea+4|0;Z=ba+1|0;_=ca+12|0;$=ca+4|0;n=ca+8|0;o=wa+8|0;p=ba+8|0;q=ba+4|0;s=ja+12|0;t=ja+4|0;u=ja+8|0;v=wa+8|0;w=ia+1|0;x=ia+8|0;y=ia+4|0;z=ma+12|0;A=ma+4|0;B=ma+8|0;C=wa+8|0;D=la+1|0;E=la+8|0;F=la+4|0;j=0;c:while(1){d:while(1){switch(l<<24>>24|0){case 83:{l=h;g=31;break d}case 68:{f=h;g=81;break d}case 84:{l=h;g=57;break d}case 73:{g=Tl(h,b,c)|0;if((g|0)==(h|0)|(g|0)==(b|0)){b=xa;break b}Al(sa,(k[aa>>2]|0)+-24|0);d=k[aa>>2]|0;l=d+-24|0;f=d;do{h=f+-24|0;k[aa>>2]=h;hl(h);f=k[aa>>2]|0}while((f|0)!=(l|0));l=i[sa>>0]|0;if(!(l&1)){f=G;l=(l&255)>>>1}else{f=k[Q>>2]|0;l=k[R>>2]|0}jl(d+-48|0,f,l)|0;l=(k[aa>>2]|0)+-24|0;k[da>>2]=k[H>>2];Rl(oa,l,da);l=k[J>>2]|0;f=k[K>>2]|0;if(l>>>0<f>>>0){if(!l)l=0;else{k[l+12>>2]=k[L>>2];k[l>>2]=k[oa>>2];k[l+4>>2]=k[M>>2];k[l+8>>2]=k[N>>2];k[N>>2]=0;k[M>>2]=0;k[oa>>2]=0;l=k[J>>2]|0}k[J>>2]=l+16}else{d=k[I>>2]|0;m=l-d>>4;e=m+1|0;if((e|0)<0){g=118;break c}l=f-d|0;if(l>>4>>>0<1073741823){l=l>>3;l=l>>>0<e>>>0?e:l}else l=2147483647;Gl(wa,l,m,O);l=k[P>>2]|0;if(l){k[l+12>>2]=k[L>>2];k[l>>2]=k[oa>>2];k[l+4>>2]=k[M>>2];k[l+8>>2]=k[N>>2];k[N>>2]=0;k[M>>2]=0;k[oa>>2]=0}k[P>>2]=l+16;Hl(I,wa);Il(wa)}il(oa);tl(sa);h=g;break}case 76:{h=h+1|0;if((h|0)==(b|0)){b=xa;break b}break}default:{l=h;g=127;break d}}l=i[h>>0]|0;if(l<<24>>24==69){g=154;break c}}do if((g|0)==31){g=0;j=l+1|0;if((j|0)!=(b|0)?(i[j>>0]|0)==116:0){g=127;break}h=Xl(l,b,c)|0;if((h|0)==(l|0)|(h|0)==(b|0)){b=xa;break b}Al(pa,(k[aa>>2]|0)+-24|0);d=k[aa>>2]|0;l=d+-24|0;f=d;do{j=f+-24|0;k[aa>>2]=j;hl(j);f=k[aa>>2]|0}while((f|0)!=(l|0));e=d+-48|0;l=i[e>>0]|0;if(!(l&1))l=(l&255)>>>1;else l=k[d+-44>>2]|0;if(!l)$l(e,pa);else{Zl(ba,58416,pa);l=i[ba>>0]|0;if(!(l&1)){f=Z;l=(l&255)>>>1}else{f=k[p>>2]|0;l=k[q>>2]|0}jl(e,f,l)|0;tl(ba);l=(k[aa>>2]|0)+-24|0;k[ha>>2]=k[H>>2];Rl(ca,l,ha);l=k[J>>2]|0;f=k[K>>2]|0;if(l>>>0<f>>>0){if(!l)l=0;else{k[l+12>>2]=k[_>>2];k[l>>2]=k[ca>>2];k[l+4>>2]=k[$>>2];k[l+8>>2]=k[n>>2];k[n>>2]=0;k[$>>2]=0;k[ca>>2]=0;l=k[J>>2]|0}k[J>>2]=l+16}else{d=k[I>>2]|0;m=l-d>>4;e=m+1|0;if((e|0)<0){g=48;break c}l=f-d|0;if(l>>4>>>0<1073741823){l=l>>3;l=l>>>0<e>>>0?e:l}else l=2147483647;Gl(wa,l,m,O);l=k[o>>2]|0;if(l){k[l+12>>2]=k[_>>2];k[l>>2]=k[ca>>2];k[l+4>>2]=k[$>>2];k[l+8>>2]=k[n>>2];k[n>>2]=0;k[$>>2]=0;k[ca>>2]=0}k[o>>2]=l+16;Hl(I,wa);Il(wa)}il(ca)}tl(pa)}else if((g|0)==57){g=0;h=Sl(l,b,c)|0;if((h|0)==(l|0)|(h|0)==(b|0)){b=xa;break b}Al(qa,(k[aa>>2]|0)+-24|0);d=k[aa>>2]|0;l=d+-24|0;f=d;do{j=f+-24|0;k[aa>>2]=j;hl(j);f=k[aa>>2]|0}while((f|0)!=(l|0));e=d+-48|0;l=i[e>>0]|0;if(!(l&1))l=(l&255)>>>1;else l=k[d+-44>>2]|0;if(!l)$l(e,qa);else{Zl(ia,58416,qa);l=i[ia>>0]|0;if(!(l&1)){f=w;l=(l&255)>>>1}else{f=k[x>>2]|0;l=k[y>>2]|0}jl(e,f,l)|0;tl(ia)}l=(k[aa>>2]|0)+-24|0;k[ka>>2]=k[H>>2];Rl(ja,l,ka);l=k[J>>2]|0;f=k[K>>2]|0;if(l>>>0<f>>>0){if(!l)l=0;else{k[l+12>>2]=k[s>>2];k[l>>2]=k[ja>>2];k[l+4>>2]=k[t>>2];k[l+8>>2]=k[u>>2];k[u>>2]=0;k[t>>2]=0;k[ja>>2]=0;l=k[J>>2]|0}k[J>>2]=l+16}else{d=k[I>>2]|0;m=l-d>>4;e=m+1|0;if((e|0)<0){g=74;break c}l=f-d|0;if(l>>4>>>0<1073741823){l=l>>3;l=l>>>0<e>>>0?e:l}else l=2147483647;Gl(wa,l,m,O);l=k[v>>2]|0;if(l){k[l+12>>2]=k[s>>2];k[l>>2]=k[ja>>2];k[l+4>>2]=k[t>>2];k[l+8>>2]=k[u>>2];k[u>>2]=0;k[t>>2]=0;k[ja>>2]=0}k[v>>2]=l+16;Hl(I,wa);Il(wa)}il(ja);tl(qa)}else if((g|0)==81){g=0;l=f+1|0;if((l|0)!=(b|0)?(j=i[l>>0]|0,!(j<<24>>24==84|j<<24>>24==116)):0){l=f;g=127;break}h=Yl(f,b,c)|0;if((h|0)==(f|0)|(h|0)==(b|0)){b=xa;break b}Al(ra,(k[aa>>2]|0)+-24|0);d=k[aa>>2]|0;l=d+-24|0;f=d;do{j=f+-24|0;k[aa>>2]=j;hl(j);f=k[aa>>2]|0}while((f|0)!=(l|0));e=d+-48|0;l=i[e>>0]|0;if(!(l&1))l=(l&255)>>>1;else l=k[d+-44>>2]|0;if(!l)$l(e,ra);else{Zl(la,58416,ra);l=i[la>>0]|0;if(!(l&1)){f=D;l=(l&255)>>>1}else{f=k[E>>2]|0;l=k[F>>2]|0}jl(e,f,l)|0;tl(la)}l=(k[aa>>2]|0)+-24|0;k[na>>2]=k[H>>2];Rl(ma,l,na);l=k[J>>2]|0;f=k[K>>2]|0;if(l>>>0<f>>>0){if(!l)l=0;else{k[l+12>>2]=k[z>>2];k[l>>2]=k[ma>>2];k[l+4>>2]=k[A>>2];k[l+8>>2]=k[B>>2];k[B>>2]=0;k[A>>2]=0;k[ma>>2]=0;l=k[J>>2]|0}k[J>>2]=l+16}else{d=k[I>>2]|0;m=l-d>>4;e=m+1|0;if((e|0)<0){g=100;break c}l=f-d|0;if(l>>4>>>0<1073741823){l=l>>3;l=l>>>0<e>>>0?e:l}else l=2147483647;Gl(wa,l,m,O);l=k[C>>2]|0;if(l){k[l+12>>2]=k[z>>2];k[l>>2]=k[ma>>2];k[l+4>>2]=k[A>>2];k[l+8>>2]=k[B>>2];k[B>>2]=0;k[A>>2]=0;k[ma>>2]=0}k[C>>2]=l+16;Hl(I,wa);Il(wa)}il(ma);tl(ra)}while(0);if((g|0)==127){h=am(l,b,c)|0;if((h|0)==(l|0)|(h|0)==(b|0)){b=xa;break b}Al(ta,(k[aa>>2]|0)+-24|0);d=k[aa>>2]|0;l=d+-24|0;f=d;do{j=f+-24|0;k[aa>>2]=j;hl(j);f=k[aa>>2]|0}while((f|0)!=(l|0));e=d+-48|0;l=i[e>>0]|0;if(!(l&1))l=(l&255)>>>1;else l=k[d+-44>>2]|0;if(!l)$l(e,ta);else{Zl(ea,58416,ta);l=i[ea>>0]|0;if(!(l&1)){f=W;l=(l&255)>>>1}else{f=k[X>>2]|0;l=k[Y>>2]|0}jl(e,f,l)|0;tl(ea)}l=(k[aa>>2]|0)+-24|0;k[ga>>2]=k[H>>2];Rl(fa,l,ga);l=k[J>>2]|0;f=k[K>>2]|0;if(l>>>0<f>>>0){if(!l)l=0;else{k[l+12>>2]=k[S>>2];k[l>>2]=k[fa>>2];k[l+4>>2]=k[T>>2];k[l+8>>2]=k[U>>2];k[U>>2]=0;k[T>>2]=0;k[fa>>2]=0;l=k[J>>2]|0}k[J>>2]=l+16}else{d=k[I>>2]|0;m=l-d>>4;e=m+1|0;if((e|0)<0){g=144;break}l=f-d|0;if(l>>4>>>0<1073741823){l=l>>3;l=l>>>0<e>>>0?e:l}else l=2147483647;Gl(wa,l,m,O);l=k[V>>2]|0;if(l){k[l+12>>2]=k[S>>2];k[l>>2]=k[fa>>2];k[l+4>>2]=k[T>>2];k[l+8>>2]=k[U>>2];k[U>>2]=0;k[T>>2]=0;k[fa>>2]=0}k[V>>2]=l+16;Hl(I,wa);Il(wa)}il(fa);tl(ta)}l=i[h>>0]|0;if(l<<24>>24==69){b=h;g=152;break}else j=1}if((g|0)==48)Fl(I);else if((g|0)==74)Fl(I);else if((g|0)==100)Fl(I);else if((g|0)==118)Fl(I);else if((g|0)==144)Fl(I);else if((g|0)==152){k[c+48>>2]=k[va>>2];ua=b+1|0}else if((g|0)==154){b=h+1|0;k[c+48>>2]=k[va>>2];if(j)ua=b;else break}e=c+20|0;b=k[e>>2]|0;if((k[c+16>>2]|0)==(b|0))b=ua;else{d=b+-16|0;do{c=b+-16|0;k[e>>2]=c;il(c);b=k[e>>2]|0}while((b|0)!=(d|0));b=ua}}else b=xa;while(0);b=(b|0)==(xa|0)?a:b;break}else if((f|0)==90){e:do if((xa|0)!=(b|0))if(((l<<24>>24==90?(ua=xa+1|0,d=pl(ua,b,c)|0,!((d|0)==(ua|0)|(d|0)==(b|0))):0)?(i[d>>0]|0)==69:0)?(m=d+1|0,(m|0)!=(b|0)):0){f=i[m>>0]|0;if((f|0)==115){b=bm(d+2|0,b)|0;d=k[c+4>>2]|0;if((k[c>>2]|0)==(d|0))break;sl(d+-24|0,60416)|0;break}else if((f|0)==100){d=d+2|0;if((d|0)==(b|0)){b=xa;break}d=zl(d,b)|0;if((d|0)==(b|0)){b=xa;break}if((i[d>>0]|0)!=95){b=xa;break}va=d+1|0;b=Bl(va,b,c)|0;g=c+4|0;e=k[g>>2]|0;if((b|0)==(va|0)){d=e+-24|0;b=e;while(1){c=b+-24|0;k[g>>2]=c;hl(c);b=k[g>>2]|0;if((b|0)==(d|0)){b=xa;break e}}}if(((e-(k[c>>2]|0)|0)/24|0)>>>0<2){b=xa;break}Al(wa,e+-24|0);d=k[g>>2]|0;e=d+-24|0;f=d;do{c=f+-24|0;k[g>>2]=c;hl(c);f=k[g>>2]|0}while((f|0)!=(e|0));sl(d+-48|0,58416)|0;d=i[wa>>0]|0;if(!(d&1)){f=wa+1|0;d=(d&255)>>>1}else{f=k[wa+8>>2]|0;d=k[wa+4>>2]|0}jl((k[g>>2]|0)+-24|0,f,d)|0;tl(wa);break}else{d=Bl(m,b,c)|0;if((d|0)==(m|0)){b=c+4|0;e=k[b>>2]|0;d=e+-24|0;while(1){c=e+-24|0;k[b>>2]=c;hl(c);e=k[b>>2]|0;if((e|0)==(d|0)){b=xa;break e}}}b=bm(d,b)|0;g=c+4|0;d=k[g>>2]|0;if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2)break;Al(va,d+-24|0);f=k[g>>2]|0;d=f+-24|0;e=f;do{c=e+-24|0;k[g>>2]=c;hl(c);e=k[g>>2]|0}while((e|0)!=(d|0));sl(f+-48|0,58416)|0;d=i[va>>0]|0;if(!(d&1)){f=va+1|0;d=(d&255)>>>1}else{f=k[va+8>>2]|0;d=k[va+4>>2]|0}jl((k[g>>2]|0)+-24|0,f,d)|0;tl(va);break}}else b=xa;while(0);r=ya;return ((b|0)==(xa|0)?a:b)|0}else{do if((g-xa|0)>1){if(l<<24>>24==83?(i[xa+1>>0]|0)==116:0){f=xa+2|0;if((f|0)==(b|0)){e=0;f=b}else{e=0;f=(i[f>>0]|0)==76?xa+3|0:f}}else{e=1;f=xa}d=am(f,b,c)|0;f=(d|0)==(f|0);if(f|e)l=f?xa:d;else{f=k[c+4>>2]|0;if((k[c>>2]|0)==(f|0))break;rl(f+-24|0,0,58856)|0;l=d}if((l|0)!=(xa|0)){if((l|0)==(b|0))break a;if((i[l>>0]|0)!=73){b=l;break a}m=c+4|0;f=k[m>>2]|0;if((k[c>>2]|0)==(f|0)){b=a;break a}j=c+16|0;k[h>>2]=k[c+12>>2];Rl(n,f+-24|0,h);d=c+20|0;f=k[d>>2]|0;g=k[c+24>>2]|0;if(f>>>0<g>>>0){if(!f)f=0;else{k[f+12>>2]=k[n+12>>2];k[f>>2]=k[n>>2];xa=n+4|0;k[f+4>>2]=k[xa>>2];wa=n+8|0;k[f+8>>2]=k[wa>>2];k[wa>>2]=0;k[xa>>2]=0;k[n>>2]=0;f=k[d>>2]|0}k[d>>2]=f+16}else{d=k[j>>2]|0;h=f-d>>4;e=h+1|0;if((e|0)<0)Fl(j);f=g-d|0;if(f>>4>>>0<1073741823){f=f>>3;f=f>>>0<e>>>0?e:f}else f=2147483647;Gl(wa,f,h,c+28|0);f=wa+8|0;d=k[f>>2]|0;if(d){k[d+12>>2]=k[n+12>>2];k[d>>2]=k[n>>2];xa=n+4|0;k[d+4>>2]=k[xa>>2];va=n+8|0;k[d+8>>2]=k[va>>2];k[va>>2]=0;k[xa>>2]=0;k[n>>2]=0}k[f>>2]=d+16;Hl(j,wa);Il(wa)}il(n);b=Tl(l,b,c)|0;if((b|0)==(l|0)){b=a;break a}d=k[m>>2]|0;if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2){b=a;break a}Al(o,d+-24|0);f=k[m>>2]|0;d=f+-24|0;e=f;do{a=e+-24|0;k[m>>2]=a;hl(a);e=k[m>>2]|0}while((e|0)!=(d|0));d=i[o>>0]|0;if(!(d&1)){e=o+1|0;d=(d&255)>>>1}else{e=k[o+8>>2]|0;d=k[o+4>>2]|0}jl(f+-48|0,e,d)|0;tl(o);break a}}while(0);d=Xl(xa,b,c)|0;if((d|0)==(xa|0)|(d|0)==(b|0)){b=a;break}if((i[d>>0]|0)!=73){b=a;break}b=Tl(d,b,c)|0;if((b|0)==(d|0)){b=a;break}f=c+4|0;d=k[f>>2]|0;if(((d-(k[c>>2]|0)|0)/24|0)>>>0<2){b=a;break}Al(j,d+-24|0);g=k[f>>2]|0;d=g+-24|0;e=g;do{a=e+-24|0;k[f>>2]=a;hl(a);e=k[f>>2]|0}while((e|0)!=(d|0));d=i[j>>0]|0;if(!(d&1)){e=j+1|0;d=(d&255)>>>1}else{e=k[j+8>>2]|0;d=k[j+4>>2]|0}jl(g+-48|0,e,d)|0;tl(j);break}}else b=a;while(0);r=ya;return b|0}function Cl(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0;c=i[a>>0]|0;d=(c&1)!=0;if(d){e=(k[a>>2]&-2)+-1|0;f=k[a+4>>2]|0}else{e=10;f=(c&255)>>>1}if((f|0)==(e|0)){cm(a,e,1,e,e,0);if(!(i[a>>0]&1))e=7;else e=8}else if(d)e=8;else e=7;if((e|0)==7){i[a>>0]=(f<<1)+2;c=a+1|0;d=f+1|0}else if((e|0)==8){c=k[a+8>>2]|0;d=f+1|0;k[a+4>>2]=d}i[c+f>>0]=b;i[c+d>>0]=0;return}function Dl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;e=i[a>>0]|0;f=(e&1)==0;if(f)h=(e&255)>>>1;else h=k[a+4>>2]|0;if(h>>>0<b>>>0)dm(a);if(f)f=10;else{e=k[a>>2]|0;f=(e&-2)+-1|0;e=e&255}if((f-h|0)>>>0>=d>>>0){if(d){if(!(e&1))g=a+1|0;else g=k[a+8>>2]|0;e=h-b|0;f=g+b|0;if((h|0)!=(b|0)){if(f>>>0<=c>>>0&(g+h|0)>>>0>c>>>0)c=c+d|0;an(g+(d+b)|0,f|0,e|0)|0}an(f|0,c|0,d|0)|0;c=h+d|0;if(!(i[a>>0]&1))i[a>>0]=c<<1;else k[a+4>>2]=c;i[g+c>>0]=0}}else vl(a,f,h+d-f|0,h,b,0,d,c);return a|0}function El(a,b,c){a=a|0;b=b|0;c=c|0;var d=0;k[c>>2]=0;if((a|0)!=(b|0)){b=i[a>>0]|0;if(b<<24>>24==114){k[c>>2]=4;b=a+1|0;a=b;b=i[b>>0]|0;d=4}else d=0;if(b<<24>>24==86){d=d|2;k[c>>2]=d;b=a+1|0;a=b;b=i[b>>0]|0}if(b<<24>>24==75){k[c>>2]=d|1;a=a+1|0}}return a|0}function Fl(a){a=a|0;Ca(60016,60040,303,58128)}function Gl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+12|0;k[e>>2]=0;k[a+16>>2]=d;if(!b)d=0;else d=ml(k[d>>2]|0,b<<4)|0;k[a>>2]=d;c=d+(c<<4)|0;k[a+8>>2]=c;k[a+4>>2]=c;k[e>>2]=d+(b<<4);return}function Hl(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,l=0,m=0;d=k[a>>2]|0;f=a+4|0;e=k[f>>2]|0;g=b+4|0;c=k[g>>2]|0;if((e|0)!=(d|0)){do{h=e;e=e+-16|0;l=c+-16|0;k[l>>2]=0;j=c+-12|0;k[j>>2]=0;m=k[h+-4>>2]|0;i=c+-8|0;k[i>>2]=0;k[c+-4>>2]=m;k[l>>2]=k[e>>2];c=h+-12|0;k[j>>2]=k[c>>2];h=h+-8|0;k[i>>2]=k[h>>2];k[h>>2]=0;k[c>>2]=0;k[e>>2]=0;c=(k[g>>2]|0)+-16|0;k[g>>2]=c}while((e|0)!=(d|0));d=k[a>>2]|0}k[a>>2]=c;k[g>>2]=d;j=b+8|0;m=k[f>>2]|0;k[f>>2]=k[j>>2];k[j>>2]=m;j=a+8|0;m=b+12|0;l=k[j>>2]|0;k[j>>2]=k[m>>2];k[m>>2]=l;k[b>>2]=k[g>>2];return}function Il(a){a=a|0;var b=0,c=0,d=0,e=0;c=k[a+4>>2]|0;d=a+8|0;b=k[d>>2]|0;if((b|0)!=(c|0))do{e=b+-16|0;k[d>>2]=e;il(e);b=k[d>>2]|0}while((b|0)!=(c|0));b=k[a>>2]|0;if(b)ol(k[k[a+16>>2]>>2]|0,b,(k[a+12>>2]|0)-b|0);return}function Jl(a,b){a=a|0;b=b|0;if(!(i[b>>0]&1)){k[a+0>>2]=k[b+0>>2];k[a+4>>2]=k[b+4>>2];k[a+8>>2]=k[b+8>>2]}else Ol(a,k[b+8>>2]|0,k[b+4>>2]|0);return}function Kl(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;var e=0;e=a+12|0;k[e>>2]=0;k[a+16>>2]=d;if(!b)d=0;else d=ml(k[d>>2]|0,b*24|0)|0;k[a>>2]=d;c=d+(c*24|0)|0;k[a+8>>2]=c;k[a+4>>2]=c;k[e>>2]=d+(b*24|0);return}function Ll(a){a=a|0;var b=0,c=0,d=0,e=0;c=k[a+4>>2]|0;d=a+8|0;b=k[d>>2]|0;if((b|0)!=(c|0))do{e=b+-24|0;k[d>>2]=e;hl(e);b=k[d>>2]|0}while((b|0)!=(c|0));b=k[a>>2]|0;if(b)ol(k[k[a+16>>2]>>2]|0,b,(k[a+12>>2]|0)-b|0);return}function Ml(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0,i=0;d=k[a>>2]|0;f=a+4|0;e=k[f>>2]|0;g=b+4|0;c=k[g>>2]|0;if((e|0)!=(d|0)){do{h=c+-24|0;i=e;e=e+-24|0;k[h+0>>2]=k[e+0>>2];k[h+4>>2]=k[e+4>>2];k[h+8>>2]=k[e+8>>2];k[e+0>>2]=0;k[e+4>>2]=0;k[e+8>>2]=0;h=c+-12|0;c=i+-12|0;k[h+0>>2]=k[c+0>>2];k[h+4>>2]=k[c+4>>2];k[h+8>>2]=k[c+8>>2];k[c+0>>2]=0;k[c+4>>2]=0;k[c+8>>2]=0;c=(k[g>>2]|0)+-24|0;k[g>>2]=c}while((e|0)!=(d|0));d=k[a>>2]|0}k[a>>2]=c;k[g>>2]=d;e=b+8|0;i=k[f>>2]|0;k[f>>2]=k[e>>2];k[e>>2]=i;e=a+8|0;a=b+12|0;i=k[e>>2]|0;k[e>>2]=k[a>>2];k[a>>2]=i;k[b>>2]=k[g>>2];return}function Nl(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,l=0,m=0,n=0,o=0,p=0,q=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0;O=r;r=r+720|0;N=O+696|0;q=O+672|0;s=O+648|0;y=O+624|0;B=O+600|0;m=O+576|0;n=O+552|0;C=O+528|0;o=O+504|0;D=O+480|0;p=O+456|0;t=O+432|0;h=O+408|0;H=O+384|0;u=O+360|0;v=O+336|0;j=O+120|0;w=O;x=O+24|0;l=O+48|0;I=O+72|0;z=O+96|0;J=O+144|0;K=O+168|0;L=O+192|0;M=O+216|0;E=O+240|0;F=O+264|0;G=O+288|0;A=O+312|0;a:do if((a|0)!=(b|0))do switch(i[a>>0]|0){case 111:{im(j,60312);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[j+0>>2];k[b+4>>2]=k[j+4>>2];k[b+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;c=b+12|0;b=j+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[j+0>>2];k[d+4>>2]=k[j+4>>2];k[d+8>>2]=k[j+8>>2];k[j+0>>2]=0;k[j+4>>2]=0;k[j+8>>2]=0;J=d+12|0;K=j+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(j);a=a+1|0;break a}case 100:{i[x>>0]=12;h=x+1|0;i[h+0>>0]=i[60672]|0;i[h+1>>0]=i[60673]|0;i[h+2>>0]=i[60674]|0;i[h+3>>0]=i[60675]|0;i[h+4>>0]=i[60676]|0;i[h+5>>0]=i[60677]|0;i[x+7>>0]=0;h=x+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[x+0>>2];k[b+4>>2]=k[x+4>>2];k[b+8>>2]=k[x+8>>2];k[x+0>>2]=0;k[x+4>>2]=0;k[x+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[x+0>>2];k[d+4>>2]=k[x+4>>2];k[d+8>>2]=k[x+8>>2];k[x+0>>2]=0;k[x+4>>2]=0;k[x+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(x);a=a+1|0;break a}case 101:{em(l,60680);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[l+0>>2];k[b+4>>2]=k[l+4>>2];k[b+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;c=b+12|0;b=l+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[l+0>>2];k[d+4>>2]=k[l+4>>2];k[d+8>>2]=k[l+8>>2];k[l+0>>2]=0;k[l+4>>2]=0;k[l+8>>2]=0;J=d+12|0;K=l+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(l);a=a+1|0;break a}case 102:{i[w>>0]=10;h=w+1|0;i[h+0>>0]=i[60664]|0;i[h+1>>0]=i[60665]|0;i[h+2>>0]=i[60666]|0;i[h+3>>0]=i[60667]|0;i[h+4>>0]=i[60668]|0;i[w+6>>0]=0;h=w+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[w+0>>2];k[b+4>>2]=k[w+4>>2];k[b+8>>2]=k[w+8>>2];k[w+0>>2]=0;k[w+4>>2]=0;k[w+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[w+0>>2];k[d+4>>2]=k[w+4>>2];k[d+8>>2]=k[w+8>>2];k[w+0>>2]=0;k[w+4>>2]=0;k[w+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(w);a=a+1|0;break a}case 103:{i[I>>0]=20;e=I+1|0;b=60696;d=e+10|0;do{i[e>>0]=i[b>>0]|0;e=e+1|0;b=b+1|0}while((e|0)<(d|0));i[I+11>>0]=0;h=I+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[I+0>>2];k[b+4>>2]=k[I+4>>2];k[b+8>>2]=k[I+8>>2];k[I+0>>2]=0;k[I+4>>2]=0;k[I+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[I+0>>2];k[d+4>>2]=k[I+4>>2];k[d+8>>2]=k[I+8>>2];k[I+0>>2]=0;k[I+4>>2]=0;k[I+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(I);a=a+1|0;break a}case 117:{N=a+1|0;c=Ul(N,b,c)|0;r=O;return ((c|0)==(N|0)?a:c)|0}case 122:{i[z>>0]=6;h=z+1|0;i[h+0>>0]=i[60712]|0;i[h+1>>0]=i[60713]|0;i[h+2>>0]=i[60714]|0;i[z+4>>0]=0;h=z+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[z+0>>2];k[b+4>>2]=k[z+4>>2];k[b+8>>2]=k[z+8>>2];k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[z+0>>2];k[d+4>>2]=k[z+4>>2];k[d+8>>2]=k[z+8>>2];k[z+0>>2]=0;k[z+4>>2]=0;k[z+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(z);a=a+1|0;break a}case 68:{e=a+1|0;if((e|0)==(b|0))break a;switch(i[e>>0]|0){case 100:{i[J>>0]=18;e=J+1|0;b=60720;d=e+9|0;do{i[e>>0]=i[b>>0]|0;e=e+1|0;b=b+1|0}while((e|0)<(d|0));i[J+10>>0]=0;h=J+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[J+0>>2];k[b+4>>2]=k[J+4>>2];k[b+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[J+0>>2];k[d+4>>2]=k[J+4>>2];k[d+8>>2]=k[J+8>>2];k[J+0>>2]=0;k[J+4>>2]=0;k[J+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(J);a=a+2|0;break a}case 101:{i[K>>0]=20;e=K+1|0;b=60736;d=e+10|0;do{i[e>>0]=i[b>>0]|0;e=e+1|0;b=b+1|0}while((e|0)<(d|0));i[K+11>>0]=0;h=K+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[K+0>>2];k[b+4>>2]=k[K+4>>2];k[b+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[K+0>>2];k[d+4>>2]=k[K+4>>2];k[d+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0;J=d+12|0;k[J+0>>2]=k[h+0>>2];k[J+4>>2]=k[h+4>>2];k[J+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(K);a=a+2|0;break a}case 105:{i[E>>0]=16;h=E+1|0;e=h;i[e>>0]=99;i[e+1>>0]=104;i[e+2>>0]=97;i[e+3>>0]=114;h=h+4|0;i[h>>0]=51;i[h+1>>0]=50;i[h+2>>0]=95;i[h+3>>0]=116;i[E+9>>0]=0;h=E+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[E+0>>2];k[b+4>>2]=k[E+4>>2];k[b+8>>2]=k[E+8>>2];k[E+0>>2]=0;k[E+4>>2]=0;k[E+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[E+0>>2];k[d+4>>2]=k[E+4>>2];k[d+8>>2]=k[E+8>>2];k[E+0>>2]=0;k[E+4>>2]=0;k[E+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(E);a=a+2|0;break a}case 102:{i[L>>0]=18;e=L+1|0;b=60752;d=e+9|0;do{i[e>>0]=i[b>>0]|0;e=e+1|0;b=b+1|0}while((e|0)<(d|0));i[L+10>>0]=0;h=L+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[L+0>>2];k[b+4>>2]=k[L+4>>2];k[b+8>>2]=k[L+8>>2];k[L+0>>2]=0;k[L+4>>2]=0;k[L+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[L+0>>2];k[d+4>>2]=k[L+4>>2];k[d+8>>2]=k[L+8>>2];k[L+0>>2]=0;k[L+4>>2]=0;k[L+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(L);a=a+2|0;break a}case 97:{i[G>>0]=8;h=G+1|0;i[h>>0]=97;i[h+1>>0]=117;i[h+2>>0]=116;i[h+3>>0]=111;i[G+5>>0]=0;h=G+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[G+0>>2];k[b+4>>2]=k[G+4>>2];k[b+8>>2]=k[G+8>>2];k[G+0>>2]=0;k[G+4>>2]=0;k[G+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[G+0>>2];k[d+4>>2]=k[G+4>>2];k[d+8>>2]=k[G+8>>2];k[G+0>>2]=0;k[G+4>>2]=0;k[G+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(G);a=a+2|0;break a}case 104:{i[M>>0]=18;e=M+1|0;b=60768;d=e+9|0;do{i[e>>0]=i[b>>0]|0;e=e+1|0;b=b+1|0}while((e|0)<(d|0));i[M+10>>0]=0;h=M+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[M+0>>2];k[b+4>>2]=k[M+4>>2];k[b+8>>2]=k[M+8>>2];k[M+0>>2]=0;k[M+4>>2]=0;k[M+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[M+0>>2];k[d+4>>2]=k[M+4>>2];k[d+8>>2]=k[M+8>>2];k[M+0>>2]=0;k[M+4>>2]=0;k[M+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(M);a=a+2|0;break a}case 115:{i[F>>0]=16;h=F+1|0;e=h;i[e>>0]=99;i[e+1>>0]=104;i[e+2>>0]=97;i[e+3>>0]=114;h=h+4|0;i[h>>0]=49;i[h+1>>0]=54;i[h+2>>0]=95;i[h+3>>0]=116;i[F+9>>0]=0;h=F+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[F+0>>2];k[b+4>>2]=k[F+4>>2];k[b+8>>2]=k[F+8>>2];k[F+0>>2]=0;k[F+4>>2]=0;k[F+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[F+0>>2];k[d+4>>2]=k[F+4>>2];k[d+8>>2]=k[F+8>>2];k[F+0>>2]=0;k[F+4>>2]=0;k[F+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(F);a=a+2|0;break a}case 110:{gm(A,60784);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[A+0>>2];k[b+4>>2]=k[A+4>>2];k[b+8>>2]=k[A+8>>2];k[A+0>>2]=0;k[A+4>>2]=0;k[A+8>>2]=0;c=b+12|0;b=A+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[A+0>>2];k[d+4>>2]=k[A+4>>2];k[d+8>>2]=k[A+8>>2];k[A+0>>2]=0;k[A+4>>2]=0;k[A+8>>2]=0;J=d+12|0;K=A+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(A);a=a+2|0;break a}default:break a}}case 98:{i[y>>0]=8;h=y+1|0;i[h>>0]=98;i[h+1>>0]=111;i[h+2>>0]=111;i[h+3>>0]=108;i[y+5>>0]=0;h=y+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[y+0>>2];k[b+4>>2]=k[y+4>>2];k[b+8>>2]=k[y+8>>2];k[y+0>>2]=0;k[y+4>>2]=0;k[y+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[y+0>>2];k[d+4>>2]=k[y+4>>2];k[d+8>>2]=k[y+8>>2];k[y+0>>2]=0;k[y+4>>2]=0;k[y+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(y);a=a+1|0;break a}case 97:{em(m,60192);d=c+4|0;b=k[d>>2]|0;f=k[c+8>>2]|0;if(b>>>0<f>>>0){if(!b)b=0;else{k[b+0>>2]=k[m+0>>2];k[b+4>>2]=k[m+4>>2];k[b+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;c=b+12|0;b=m+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{d=k[c>>2]|0;g=(b-d|0)/24|0;e=g+1|0;if((e|0)<0)Fl(c);b=(f-d|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<e>>>0?e:b}else b=2147483647;Kl(N,b,g,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[m+0>>2];k[d+4>>2]=k[m+4>>2];k[d+8>>2]=k[m+8>>2];k[m+0>>2]=0;k[m+4>>2]=0;k[m+8>>2]=0;J=d+12|0;K=m+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(m);a=a+1|0;break a}case 118:{i[q>>0]=8;h=q+1|0;i[h>>0]=118;i[h+1>>0]=111;i[h+2>>0]=105;i[h+3>>0]=100;i[q+5>>0]=0;h=q+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[q+0>>2];k[b+4>>2]=k[q+4>>2];k[b+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[q+0>>2];k[d+4>>2]=k[q+4>>2];k[d+8>>2]=k[q+8>>2];k[q+0>>2]=0;k[q+4>>2]=0;k[q+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(q);a=a+1|0;break a}case 119:{i[s>>0]=14;h=s+1|0;i[h+0>>0]=i[60168]|0;i[h+1>>0]=i[60169]|0;i[h+2>>0]=i[60170]|0;i[h+3>>0]=i[60171]|0;i[h+4>>0]=i[60172]|0;i[h+5>>0]=i[60173]|0;i[h+6>>0]=i[60174]|0;i[s+8>>0]=0;h=s+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[s+0>>2];k[b+4>>2]=k[s+4>>2];k[b+8>>2]=k[s+8>>2];k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[s+0>>2];k[d+4>>2]=k[s+4>>2];k[d+8>>2]=k[s+8>>2];k[s+0>>2]=0;k[s+4>>2]=0;k[s+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(s);a=a+1|0;break a}case 99:{i[B>>0]=8;h=B+1|0;i[h>>0]=99;i[h+1>>0]=104;i[h+2>>0]=97;i[h+3>>0]=114;i[B+5>>0]=0;h=B+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[B+0>>2];k[b+4>>2]=k[B+4>>2];k[b+8>>2]=k[B+8>>2];k[B+0>>2]=0;k[B+4>>2]=0;k[B+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[B+0>>2];k[d+4>>2]=k[B+4>>2];k[d+8>>2]=k[B+8>>2];k[B+0>>2]=0;k[B+4>>2]=0;k[B+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(B);a=a+1|0;break a}case 115:{i[C>>0]=10;h=C+1|0;i[h+0>>0]=i[60224]|0;i[h+1>>0]=i[60225]|0;i[h+2>>0]=i[60226]|0;i[h+3>>0]=i[60227]|0;i[h+4>>0]=i[60228]|0;i[C+6>>0]=0;h=C+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[C+0>>2];k[b+4>>2]=k[C+4>>2];k[b+8>>2]=k[C+8>>2];k[C+0>>2]=0;k[C+4>>2]=0;k[C+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[C+0>>2];k[d+4>>2]=k[C+4>>2];k[d+8>>2]=k[C+8>>2];k[C+0>>2]=0;k[C+4>>2]=0;k[C+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(C);a=a+1|0;break a}case 116:{gm(o,60232);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[o+0>>2];k[b+4>>2]=k[o+4>>2];k[b+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;c=b+12|0;b=o+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[o+0>>2];k[d+4>>2]=k[o+4>>2];k[d+8>>2]=k[o+8>>2];k[o+0>>2]=0;k[o+4>>2]=0;k[o+8>>2]=0;J=d+12|0;K=o+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(o);a=a+1|0;break a}case 106:{hm(p,60592);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[p+0>>2];k[b+4>>2]=k[p+4>>2];k[b+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;c=b+12|0;b=p+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[p+0>>2];k[d+4>>2]=k[p+4>>2];k[d+8>>2]=k[p+8>>2];k[p+0>>2]=0;k[p+4>>2]=0;k[p+8>>2]=0;J=d+12|0;K=p+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(p);a=a+1|0;break a}case 104:{fm(n,60208);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[n+0>>2];k[b+4>>2]=k[n+4>>2];k[b+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;c=b+12|0;b=n+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[n+0>>2];k[d+4>>2]=k[n+4>>2];k[d+8>>2]=k[n+8>>2];k[n+0>>2]=0;k[n+4>>2]=0;k[n+8>>2]=0;J=d+12|0;K=n+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(n);a=a+1|0;break a}case 105:{i[D>>0]=6;h=D+1|0;i[h+0>>0]=i[60584]|0;i[h+1>>0]=i[60585]|0;i[h+2>>0]=i[60586]|0;i[D+4>>0]=0;h=D+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[D+0>>2];k[b+4>>2]=k[D+4>>2];k[b+8>>2]=k[D+8>>2];k[D+0>>2]=0;k[D+4>>2]=0;k[D+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[D+0>>2];k[d+4>>2]=k[D+4>>2];k[d+8>>2]=k[D+8>>2];k[D+0>>2]=0;k[D+4>>2]=0;k[D+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(D);a=a+1|0;break a}case 121:{Ol(u,60640,18);h=u+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[u+0>>2];k[b+4>>2]=k[u+4>>2];k[b+8>>2]=k[u+8>>2];k[u+0>>2]=0;k[u+4>>2]=0;k[u+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[u+0>>2];k[d+4>>2]=k[u+4>>2];k[d+8>>2]=k[u+8>>2];k[u+0>>2]=0;k[u+4>>2]=0;k[u+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(u);a=a+1|0;break a}case 110:{i[v>>0]=16;h=v+1|0;e=h;i[e>>0]=95;i[e+1>>0]=95;i[e+2>>0]=105;i[e+3>>0]=110;h=h+4|0;i[h>>0]=116;i[h+1>>0]=49;i[h+2>>0]=50;i[h+3>>0]=56;i[v+9>>0]=0;h=v+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[v+0>>2];k[b+4>>2]=k[v+4>>2];k[b+8>>2]=k[v+8>>2];k[v+0>>2]=0;k[v+4>>2]=0;k[v+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[v+0>>2];k[d+4>>2]=k[v+4>>2];k[d+8>>2]=k[v+8>>2];k[v+0>>2]=0;k[v+4>>2]=0;k[v+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(v);a=a+1|0;break a}case 108:{i[t>>0]=8;h=t+1|0;i[h>>0]=108;i[h+1>>0]=111;i[h+2>>0]=110;i[h+3>>0]=103;i[t+5>>0]=0;h=t+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[t+0>>2];k[b+4>>2]=k[t+4>>2];k[b+8>>2]=k[t+8>>2];k[t+0>>2]=0;k[t+4>>2]=0;k[t+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[t+0>>2];k[d+4>>2]=k[t+4>>2];k[d+8>>2]=k[t+8>>2];k[t+0>>2]=0;k[t+4>>2]=0;k[t+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(t);a=a+1|0;break a}case 120:{i[H>>0]=18;e=H+1|0;b=60624;d=e+9|0;do{i[e>>0]=i[b>>0]|0;e=e+1|0;b=b+1|0}while((e|0)<(d|0));i[H+10>>0]=0;h=H+12|0;k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;e=c+4|0;b=k[e>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[H+0>>2];k[b+4>>2]=k[H+4>>2];k[b+8>>2]=k[H+8>>2];k[H+0>>2]=0;k[H+4>>2]=0;k[H+8>>2]=0;b=b+12|0;k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;b=k[e>>2]|0}k[e>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[H+0>>2];k[d+4>>2]=k[H+4>>2];k[d+8>>2]=k[H+8>>2];k[H+0>>2]=0;k[H+4>>2]=0;k[H+8>>2]=0;K=d+12|0;k[K+0>>2]=k[h+0>>2];k[K+4>>2]=k[h+4>>2];k[K+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(H);a=a+1|0;break a}case 109:{fm(h,60608);d=c+4|0;b=k[d>>2]|0;g=k[c+8>>2]|0;if(b>>>0<g>>>0){if(!b)b=0;else{k[b+0>>2]=k[h+0>>2];k[b+4>>2]=k[h+4>>2];k[b+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;c=b+12|0;b=h+12|0;k[c+0>>2]=k[b+0>>2];k[c+4>>2]=k[b+4>>2];k[c+8>>2]=k[b+8>>2];k[b+0>>2]=0;k[b+4>>2]=0;k[b+8>>2]=0;b=k[d>>2]|0}k[d>>2]=b+24}else{e=k[c>>2]|0;f=(b-e|0)/24|0;d=f+1|0;if((d|0)<0)Fl(c);b=(g-e|0)/24|0;if(b>>>0<1073741823){b=b<<1;b=b>>>0<d>>>0?d:b}else b=2147483647;Kl(N,b,f,c+12|0);b=N+8|0;d=k[b>>2]|0;if(d){k[d+0>>2]=k[h+0>>2];k[d+4>>2]=k[h+4>>2];k[d+8>>2]=k[h+8>>2];k[h+0>>2]=0;k[h+4>>2]=0;k[h+8>>2]=0;J=d+12|0;K=h+12|0;k[J+0>>2]=k[K+0>>2];k[J+4>>2]=k[K+4>>2];k[J+8>>2]=k[K+8>>2];k[K+0>>2]=0;k[K+4>>2]=0;k[K+8>>2]=0}k[b>>2]=d+24;Ml(c,N);Ll(N)}hl(h);a=a+1|0;break a}default:break a}while(0);while(0);r=O;return a|0}function Ol(a,b,c){a=a|0;b=b|0;c=c|0;var d=0,e=0;if(c>>>0>4294967279)ql(a);if(c>>>0<11){i[a>>0]=c<<1;a=a+1|0}else{e=c+16&-16;d=xm(e)|0;k[a+8>>2]=d;k[a>>2]=e|1;k[a+4>>2]=c;a=d}_m(a|0,b|0,c|0)|0;i[a+c>>0]=0;return}function Pl(a){a=a|0;var b=0,c=0,d=0,e=0,f=0;b=i[a>>0]|0;if(!(b&1)){c=(b&255)>>>1;f=a+1|0}else{c=k[a+4>>2]|0;f=k[a+8>>2]|0}d=(c|0)!=0&1;e=c-d|0;if((c|0)!=(d|0)){an(f|0,f+d|0,e|0)|0;b=i[a>>0]|0}if(!(b&1))i[a>>0]=e<<1;else k[a+4>>2]=e;i[f+e>>0]=0;return}

// EMSCRIPTEN_END_FUNCS
var kc=[oo,oo,on,oo,pn,oo,qn,oo,rn,oo,sn,oo,nd,rd,Xd,Yd,Sk,Rk,Sm,oo,oo,oo,oo,oo,oo,oo,oo,oo,oo,oo,oo,oo];var lc=[po,po,un,po,vn,po,wn,po,xn,po,yn,po,Zk,Yk,po,po];var mc=[qo,qo,An,qo,Bn,qo,Cn,qo,Dn,qo,En,qo,kd,md,Rd,Sd,Dk,Ek,Lk,Pk,Mk,Nk,Ok,Qk,wg,lh,ri,xl,qo,qo,qo,qo];var nc=[ro,ro,Gn,ro,Hn,ro,In,ro,Jn,ro,Kn,ro,vd,_d,Fk,mi];var oc=[so,so,Mn,so,Nn,so,On,so,Pn,so,Qn,so,cl,ll,so,so];var pc=[to,to,Sn,to,Tn,to,Un,to,Vn,to,Wn,to,to,to,to,to];var qc=[uo,uo,Yn,uo,Zn,uo,_n,uo,$n,uo,ao,uo,$k,_k,uo,uo];var rc=[vo,vo,co,vo,eo,vo,fo,vo,go,vo,ho,vo,vo,vo,vo,vo];var sc=[wo,wo,jo,wo,ko,wo,lo,wo,mo,wo,no,wo,sd,Zd,Uk,Vk];return{_strlen:Zm,_emscripten_bind_RAROpenArchiveDataEx_set_OpenMode_1:$i,_emscripten_bind_RAROpenArchiveDataEx_get_OpenMode_0:_i,_emscripten_bind_RAROpenArchiveDataEx_get_OpenResult_0:aj,_emscripten_bind_RARHeaderDataEx_get_ArcName_1:qj,___cxa_can_catch:al,_memset:Ym,_emscripten_bind_RARHeaderDataEx_get_FileAttr_0:Ej,_emscripten_bind_RAROpenArchiveDataEx_get_Reserved_1:mj,_RAROpenArchiveEx:Ci,_bitshift64Lshr:Xm,_emscripten_bind_RARHeaderDataEx_get_Reserved_1:Oj,_emscripten_bind_RARHeaderDataEx_get_UnpVer_0:Cj,_i64Subtract:Um,_emscripten_bind_RAROpenArchiveDataEx_RAROpenArchiveDataEx_0:Vi,_bitshift64Shl:$m,_emscripten_bind_RARHeaderDataEx_get_CmtState_0:Kj,___cxa_demangle:wk,_emscripten_bind_RARHeaderDataEx_get_FileCRC_0:Aj,_malloc:xm,_emscripten_bind_RARHeaderDataEx_get_PackSizeHigh_0:wj,_strncpy:Wm,_RARReadHeaderEx:Ei,_emscripten_bind_VoidPtr___destroy___0:Rj,_emscripten_bind_RAROpenArchiveDataEx_set_Callback_1:jj,_emscripten_bind_RARHeaderDataEx_get_CmtBuf_0:Fj,_emscripten_bind_RARHeaderDataEx_get_HostOS_0:zj,_emscripten_bind_RAROpenArchiveDataEx_set_ArcNameW_1:Zi,_emscripten_bind_RARHeaderDataEx_get_DictSize_0:Lj,_memcpy:_m,_emscripten_bind_RARHeaderDataEx_get_UnpSizeHigh_0:yj,_RARProcessFileW:Gi,_emscripten_bind_RAROpenArchiveDataEx_get_Callback_0:ij,_emscripten_bind_RAROpenArchiveDataEx_get_CmtBuf_0:bj,_emscripten_bind_RAROpenArchiveDataEx_get_ArcNameW_0:Yi,_RARSetCallback:Hi,_emscripten_bind_RARHeaderDataEx_get_ArcNameW_1:rj,_emscripten_bind_RAROpenArchiveDataEx_set_Reserved_2:nj,_emscripten_bind_RAROpenArchiveDataEx_get_Flags_0:hj,_emscripten_bind_RARHeaderDataEx_get_FileTime_0:Bj,_realloc:zm,_i64Add:Vm,_emscripten_bind_RAROpenArchiveDataEx_set_CmtBuf_1:cj,_emscripten_bind_RARHeaderDataEx_get_CmtSize_0:Jj,_emscripten_bind_RARHeaderDataEx_get_FileName_1:sj,_emscripten_bind_RARHeaderDataEx_get_PackSize_0:vj,_emscripten_bind_RARHeaderDataEx_get_CmtBufSize_0:Hj,_emscripten_bind_RARHeaderDataEx_get_HashType_0:Mj,_RARGetDllVersion:Ji,_strcpy:cn,_emscripten_bind_RARHeaderDataEx_get_Method_0:Dj,_emscripten_bind_RARHeaderDataEx___destroy___0:Qj,_llvm_bswap_i32:bn,_emscripten_bind_RAROpenArchiveDataEx_get_CmtBufSize_0:dj,_emscripten_bind_RARHeaderDataEx_get_FileNameW_1:tj,_emscripten_bind_RAROpenArchiveDataEx_get_CmtState_0:gj,_RARSetPassword:Ii,_free:ym,_emscripten_bind_RAROpenArchiveDataEx_set_ArcName_1:Xi,_emscripten_bind_RAROpenArchiveDataEx_get_UserData_0:kj,_memmove:an,_emscripten_bind_RARHeaderDataEx_RARHeaderDataEx_0:pj,_emscripten_bind_RAROpenArchiveDataEx_get_ArcName_0:Wi,_emscripten_bind_RARHeaderDataEx_set_CmtBufSize_1:Ij,_emscripten_bind_RARHeaderDataEx_set_Reserved_2:Pj,_emscripten_bind_RARHeaderDataEx_get_Hash_1:Nj,_emscripten_bind_RAROpenArchiveDataEx_set_UserData_1:lj,_emscripten_bind_RARHeaderDataEx_get_UnpSize_0:xj,_emscripten_bind_RAROpenArchiveDataEx_get_CmtSize_0:fj,_emscripten_bind_RARHeaderDataEx_get_Flags_0:uj,_RARCloseArchive:Di,_emscripten_bind_RAROpenArchiveDataEx___destroy___0:oj,_emscripten_bind_RAROpenArchiveDataEx_set_CmtBufSize_1:ej,_emscripten_bind_RARHeaderDataEx_set_CmtBuf_1:Gj,___cxa_is_pointer_type:bl,__GLOBAL__sub_I_global_cpp:id,__GLOBAL__sub_I_crc_cpp:Oe,__GLOBAL__sub_I_threadpool_cpp:qi,runPostSets:Tm,_emscripten_replace_memory:_emscripten_replace_memory,stackAlloc:tc,stackSave:uc,stackRestore:vc,setThrew:wc,setTempRet0:zc,getTempRet0:Ac,dynCall_iiii:nn,dynCall_viiiii:tn,dynCall_vi:zn,dynCall_ii:Fn,dynCall_v:Ln,dynCall_iiiii:Rn,dynCall_viiiiii:Xn,dynCall_iii:bo,dynCall_viiii:io}})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var _strlen = Module["_strlen"] = asm["_strlen"];
var _emscripten_bind_RAROpenArchiveDataEx_set_OpenMode_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_OpenMode_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_OpenMode_1"];
var _emscripten_bind_RAROpenArchiveDataEx_get_OpenMode_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_OpenMode_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_OpenMode_0"];
var _emscripten_bind_RAROpenArchiveDataEx_get_OpenResult_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_OpenResult_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_OpenResult_0"];
var _emscripten_bind_RARHeaderDataEx_get_ArcName_1 = Module["_emscripten_bind_RARHeaderDataEx_get_ArcName_1"] = asm["_emscripten_bind_RARHeaderDataEx_get_ArcName_1"];
var ___cxa_can_catch = Module["___cxa_can_catch"] = asm["___cxa_can_catch"];
var _memset = Module["_memset"] = asm["_memset"];
var _emscripten_bind_RARHeaderDataEx_get_FileAttr_0 = Module["_emscripten_bind_RARHeaderDataEx_get_FileAttr_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_FileAttr_0"];
var _emscripten_bind_RAROpenArchiveDataEx_get_Reserved_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_Reserved_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_Reserved_1"];
var _RAROpenArchiveEx = Module["_RAROpenArchiveEx"] = asm["_RAROpenArchiveEx"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _emscripten_bind_RARHeaderDataEx_get_Reserved_1 = Module["_emscripten_bind_RARHeaderDataEx_get_Reserved_1"] = asm["_emscripten_bind_RARHeaderDataEx_get_Reserved_1"];
var _emscripten_bind_RARHeaderDataEx_get_UnpVer_0 = Module["_emscripten_bind_RARHeaderDataEx_get_UnpVer_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_UnpVer_0"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _emscripten_bind_RAROpenArchiveDataEx_RAROpenArchiveDataEx_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_RAROpenArchiveDataEx_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_RAROpenArchiveDataEx_0"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _emscripten_bind_RARHeaderDataEx_get_CmtState_0 = Module["_emscripten_bind_RARHeaderDataEx_get_CmtState_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_CmtState_0"];
var ___cxa_demangle = Module["___cxa_demangle"] = asm["___cxa_demangle"];
var _emscripten_bind_RARHeaderDataEx_get_FileCRC_0 = Module["_emscripten_bind_RARHeaderDataEx_get_FileCRC_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_FileCRC_0"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _emscripten_bind_RARHeaderDataEx_get_PackSizeHigh_0 = Module["_emscripten_bind_RARHeaderDataEx_get_PackSizeHigh_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_PackSizeHigh_0"];
var _strncpy = Module["_strncpy"] = asm["_strncpy"];
var _RARReadHeaderEx = Module["_RARReadHeaderEx"] = asm["_RARReadHeaderEx"];
var _emscripten_bind_VoidPtr___destroy___0 = Module["_emscripten_bind_VoidPtr___destroy___0"] = asm["_emscripten_bind_VoidPtr___destroy___0"];
var _emscripten_bind_RAROpenArchiveDataEx_set_Callback_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_Callback_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_Callback_1"];
var _emscripten_bind_RARHeaderDataEx_get_CmtBuf_0 = Module["_emscripten_bind_RARHeaderDataEx_get_CmtBuf_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_CmtBuf_0"];
var _emscripten_bind_RARHeaderDataEx_get_HostOS_0 = Module["_emscripten_bind_RARHeaderDataEx_get_HostOS_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_HostOS_0"];
var _emscripten_bind_RAROpenArchiveDataEx_set_ArcNameW_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_ArcNameW_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_ArcNameW_1"];
var _emscripten_bind_RARHeaderDataEx_get_DictSize_0 = Module["_emscripten_bind_RARHeaderDataEx_get_DictSize_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_DictSize_0"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _emscripten_bind_RARHeaderDataEx_get_UnpSizeHigh_0 = Module["_emscripten_bind_RARHeaderDataEx_get_UnpSizeHigh_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_UnpSizeHigh_0"];
var _RARProcessFileW = Module["_RARProcessFileW"] = asm["_RARProcessFileW"];
var _emscripten_bind_RAROpenArchiveDataEx_get_Callback_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_Callback_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_Callback_0"];
var _emscripten_bind_RAROpenArchiveDataEx_get_CmtBuf_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_CmtBuf_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_CmtBuf_0"];
var _emscripten_bind_RAROpenArchiveDataEx_get_ArcNameW_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_ArcNameW_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_ArcNameW_0"];
var _RARSetCallback = Module["_RARSetCallback"] = asm["_RARSetCallback"];
var _emscripten_bind_RARHeaderDataEx_get_ArcNameW_1 = Module["_emscripten_bind_RARHeaderDataEx_get_ArcNameW_1"] = asm["_emscripten_bind_RARHeaderDataEx_get_ArcNameW_1"];
var _emscripten_bind_RAROpenArchiveDataEx_set_Reserved_2 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_Reserved_2"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_Reserved_2"];
var _emscripten_bind_RAROpenArchiveDataEx_get_Flags_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_Flags_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_Flags_0"];
var _emscripten_bind_RARHeaderDataEx_get_FileTime_0 = Module["_emscripten_bind_RARHeaderDataEx_get_FileTime_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_FileTime_0"];
var _realloc = Module["_realloc"] = asm["_realloc"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _emscripten_bind_RAROpenArchiveDataEx_set_CmtBuf_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_CmtBuf_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_CmtBuf_1"];
var _emscripten_bind_RARHeaderDataEx_get_CmtSize_0 = Module["_emscripten_bind_RARHeaderDataEx_get_CmtSize_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_CmtSize_0"];
var _emscripten_bind_RARHeaderDataEx_get_FileName_1 = Module["_emscripten_bind_RARHeaderDataEx_get_FileName_1"] = asm["_emscripten_bind_RARHeaderDataEx_get_FileName_1"];
var _emscripten_bind_RARHeaderDataEx_get_PackSize_0 = Module["_emscripten_bind_RARHeaderDataEx_get_PackSize_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_PackSize_0"];
var _emscripten_bind_RARHeaderDataEx_get_CmtBufSize_0 = Module["_emscripten_bind_RARHeaderDataEx_get_CmtBufSize_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_CmtBufSize_0"];
var _emscripten_bind_RARHeaderDataEx_get_HashType_0 = Module["_emscripten_bind_RARHeaderDataEx_get_HashType_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_HashType_0"];
var _RARGetDllVersion = Module["_RARGetDllVersion"] = asm["_RARGetDllVersion"];
var _strcpy = Module["_strcpy"] = asm["_strcpy"];
var _emscripten_bind_RARHeaderDataEx_get_Method_0 = Module["_emscripten_bind_RARHeaderDataEx_get_Method_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_Method_0"];
var _emscripten_bind_RARHeaderDataEx___destroy___0 = Module["_emscripten_bind_RARHeaderDataEx___destroy___0"] = asm["_emscripten_bind_RARHeaderDataEx___destroy___0"];
var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = asm["_llvm_bswap_i32"];
var _emscripten_bind_RAROpenArchiveDataEx_get_CmtBufSize_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_CmtBufSize_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_CmtBufSize_0"];
var _emscripten_bind_RARHeaderDataEx_get_FileNameW_1 = Module["_emscripten_bind_RARHeaderDataEx_get_FileNameW_1"] = asm["_emscripten_bind_RARHeaderDataEx_get_FileNameW_1"];
var _emscripten_bind_RAROpenArchiveDataEx_get_CmtState_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_CmtState_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_CmtState_0"];
var _RARSetPassword = Module["_RARSetPassword"] = asm["_RARSetPassword"];
var _free = Module["_free"] = asm["_free"];
var _emscripten_bind_RAROpenArchiveDataEx_set_ArcName_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_ArcName_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_ArcName_1"];
var _emscripten_bind_RAROpenArchiveDataEx_get_UserData_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_UserData_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_UserData_0"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _emscripten_bind_RARHeaderDataEx_RARHeaderDataEx_0 = Module["_emscripten_bind_RARHeaderDataEx_RARHeaderDataEx_0"] = asm["_emscripten_bind_RARHeaderDataEx_RARHeaderDataEx_0"];
var _emscripten_bind_RAROpenArchiveDataEx_get_ArcName_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_ArcName_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_ArcName_0"];
var _emscripten_bind_RARHeaderDataEx_set_CmtBufSize_1 = Module["_emscripten_bind_RARHeaderDataEx_set_CmtBufSize_1"] = asm["_emscripten_bind_RARHeaderDataEx_set_CmtBufSize_1"];
var _emscripten_bind_RARHeaderDataEx_set_Reserved_2 = Module["_emscripten_bind_RARHeaderDataEx_set_Reserved_2"] = asm["_emscripten_bind_RARHeaderDataEx_set_Reserved_2"];
var _emscripten_bind_RARHeaderDataEx_get_Hash_1 = Module["_emscripten_bind_RARHeaderDataEx_get_Hash_1"] = asm["_emscripten_bind_RARHeaderDataEx_get_Hash_1"];
var _emscripten_bind_RAROpenArchiveDataEx_set_UserData_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_UserData_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_UserData_1"];
var _emscripten_bind_RARHeaderDataEx_get_UnpSize_0 = Module["_emscripten_bind_RARHeaderDataEx_get_UnpSize_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_UnpSize_0"];
var _emscripten_bind_RAROpenArchiveDataEx_get_CmtSize_0 = Module["_emscripten_bind_RAROpenArchiveDataEx_get_CmtSize_0"] = asm["_emscripten_bind_RAROpenArchiveDataEx_get_CmtSize_0"];
var _emscripten_bind_RARHeaderDataEx_get_Flags_0 = Module["_emscripten_bind_RARHeaderDataEx_get_Flags_0"] = asm["_emscripten_bind_RARHeaderDataEx_get_Flags_0"];
var _RARCloseArchive = Module["_RARCloseArchive"] = asm["_RARCloseArchive"];
var _emscripten_bind_RAROpenArchiveDataEx___destroy___0 = Module["_emscripten_bind_RAROpenArchiveDataEx___destroy___0"] = asm["_emscripten_bind_RAROpenArchiveDataEx___destroy___0"];
var _emscripten_bind_RAROpenArchiveDataEx_set_CmtBufSize_1 = Module["_emscripten_bind_RAROpenArchiveDataEx_set_CmtBufSize_1"] = asm["_emscripten_bind_RAROpenArchiveDataEx_set_CmtBufSize_1"];
var _emscripten_bind_RARHeaderDataEx_set_CmtBuf_1 = Module["_emscripten_bind_RARHeaderDataEx_set_CmtBuf_1"] = asm["_emscripten_bind_RARHeaderDataEx_set_CmtBuf_1"];
var ___cxa_is_pointer_type = Module["___cxa_is_pointer_type"] = asm["___cxa_is_pointer_type"];
var __GLOBAL__sub_I_global_cpp = Module["__GLOBAL__sub_I_global_cpp"] = asm["__GLOBAL__sub_I_global_cpp"];
var __GLOBAL__sub_I_crc_cpp = Module["__GLOBAL__sub_I_crc_cpp"] = asm["__GLOBAL__sub_I_crc_cpp"];
var __GLOBAL__sub_I_threadpool_cpp = Module["__GLOBAL__sub_I_threadpool_cpp"] = asm["__GLOBAL__sub_I_threadpool_cpp"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var _emscripten_replace_memory = Module["_emscripten_replace_memory"] = asm["_emscripten_replace_memory"];
var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
var dynCall_viiiii = Module["dynCall_viiiii"] = asm["dynCall_viiiii"];
var dynCall_vi = Module["dynCall_vi"] = asm["dynCall_vi"];
var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
var dynCall_v = Module["dynCall_v"] = asm["dynCall_v"];
var dynCall_iiiii = Module["dynCall_iiiii"] = asm["dynCall_iiiii"];
var dynCall_viiiiii = Module["dynCall_viiiiii"] = asm["dynCall_viiiiii"];
var dynCall_iii = Module["dynCall_iii"] = asm["dynCall_iii"];
var dynCall_viiii = Module["dynCall_viiii"] = asm["dynCall_viiii"];
Runtime.stackAlloc = asm["stackAlloc"];
Runtime.stackSave = asm["stackSave"];
Runtime.stackRestore = asm["stackRestore"];
Runtime.setTempRet0 = asm["setTempRet0"];
Runtime.getTempRet0 = asm["getTempRet0"];
var i64Math = (function() {
	var goog = {
		math: {}
	};
	goog.math.Long = (function(low, high) {
		this.low_ = low | 0;
		this.high_ = high | 0
	});
	goog.math.Long.IntCache_ = {};
	goog.math.Long.fromInt = (function(value) {
		if (-128 <= value && value < 128) {
			var cachedObj = goog.math.Long.IntCache_[value];
			if (cachedObj) {
				return cachedObj
			}
		}
		var obj = new goog.math.Long(value | 0, value < 0 ? -1 : 0);
		if (-128 <= value && value < 128) {
			goog.math.Long.IntCache_[value] = obj
		}
		return obj
	});
	goog.math.Long.fromNumber = (function(value) {
		if (isNaN(value) || !isFinite(value)) {
			return goog.math.Long.ZERO
		} else if (value <= -goog.math.Long.TWO_PWR_63_DBL_) {
			return goog.math.Long.MIN_VALUE
		} else if (value + 1 >= goog.math.Long.TWO_PWR_63_DBL_) {
			return goog.math.Long.MAX_VALUE
		} else if (value < 0) {
			return goog.math.Long.fromNumber(-value).negate()
		} else {
			return new goog.math.Long(value % goog.math.Long.TWO_PWR_32_DBL_ | 0, value / goog.math.Long.TWO_PWR_32_DBL_ | 0)
		}
	});
	goog.math.Long.fromBits = (function(lowBits, highBits) {
		return new goog.math.Long(lowBits, highBits)
	});
	goog.math.Long.fromString = (function(str, opt_radix) {
		if (str.length == 0) {
			throw Error("number format error: empty string")
		}
		var radix = opt_radix || 10;
		if (radix < 2 || 36 < radix) {
			throw Error("radix out of range: " + radix)
		}
		if (str.charAt(0) == "-") {
			return goog.math.Long.fromString(str.substring(1), radix).negate()
		} else if (str.indexOf("-") >= 0) {
			throw Error('number format error: interior "-" character: ' + str)
		}
		var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 8));
		var result = goog.math.Long.ZERO;
		for (var i = 0; i < str.length; i += 8) {
			var size = Math.min(8, str.length - i);
			var value = parseInt(str.substring(i, i + size), radix);
			if (size < 8) {
				var power = goog.math.Long.fromNumber(Math.pow(radix, size));
				result = result.multiply(power).add(goog.math.Long.fromNumber(value))
			} else {
				result = result.multiply(radixToPower);
				result = result.add(goog.math.Long.fromNumber(value))
			}
		}
		return result
	});
	goog.math.Long.TWO_PWR_16_DBL_ = 1 << 16;
	goog.math.Long.TWO_PWR_24_DBL_ = 1 << 24;
	goog.math.Long.TWO_PWR_32_DBL_ = goog.math.Long.TWO_PWR_16_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
	goog.math.Long.TWO_PWR_31_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ / 2;
	goog.math.Long.TWO_PWR_48_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_16_DBL_;
	goog.math.Long.TWO_PWR_64_DBL_ = goog.math.Long.TWO_PWR_32_DBL_ * goog.math.Long.TWO_PWR_32_DBL_;
	goog.math.Long.TWO_PWR_63_DBL_ = goog.math.Long.TWO_PWR_64_DBL_ / 2;
	goog.math.Long.ZERO = goog.math.Long.fromInt(0);
	goog.math.Long.ONE = goog.math.Long.fromInt(1);
	goog.math.Long.NEG_ONE = goog.math.Long.fromInt(-1);
	goog.math.Long.MAX_VALUE = goog.math.Long.fromBits(4294967295 | 0, 2147483647 | 0);
	goog.math.Long.MIN_VALUE = goog.math.Long.fromBits(0, 2147483648 | 0);
	goog.math.Long.TWO_PWR_24_ = goog.math.Long.fromInt(1 << 24);
	goog.math.Long.prototype.toInt = (function() {
		return this.low_
	});
	goog.math.Long.prototype.toNumber = (function() {
		return this.high_ * goog.math.Long.TWO_PWR_32_DBL_ + this.getLowBitsUnsigned()
	});
	goog.math.Long.prototype.toString = (function(opt_radix) {
		var radix = opt_radix || 10;
		if (radix < 2 || 36 < radix) {
			throw Error("radix out of range: " + radix)
		}
		if (this.isZero()) {
			return "0"
		}
		if (this.isNegative()) {
			if (this.equals(goog.math.Long.MIN_VALUE)) {
				var radixLong = goog.math.Long.fromNumber(radix);
				var div = this.div(radixLong);
				var rem = div.multiply(radixLong).subtract(this);
				return div.toString(radix) + rem.toInt().toString(radix)
			} else {
				return "-" + this.negate().toString(radix)
			}
		}
		var radixToPower = goog.math.Long.fromNumber(Math.pow(radix, 6));
		var rem = this;
		var result = "";
		while (true) {
			var remDiv = rem.div(radixToPower);
			var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
			var digits = intval.toString(radix);
			rem = remDiv;
			if (rem.isZero()) {
				return digits + result
			} else {
				while (digits.length < 6) {
					digits = "0" + digits
				}
				result = "" + digits + result
			}
		}
	});
	goog.math.Long.prototype.getHighBits = (function() {
		return this.high_
	});
	goog.math.Long.prototype.getLowBits = (function() {
		return this.low_
	});
	goog.math.Long.prototype.getLowBitsUnsigned = (function() {
		return this.low_ >= 0 ? this.low_ : goog.math.Long.TWO_PWR_32_DBL_ + this.low_
	});
	goog.math.Long.prototype.getNumBitsAbs = (function() {
		if (this.isNegative()) {
			if (this.equals(goog.math.Long.MIN_VALUE)) {
				return 64
			} else {
				return this.negate().getNumBitsAbs()
			}
		} else {
			var val = this.high_ != 0 ? this.high_ : this.low_;
			for (var bit = 31; bit > 0; bit--) {
				if ((val & 1 << bit) != 0) {
					break
				}
			}
			return this.high_ != 0 ? bit + 33 : bit + 1
		}
	});
	goog.math.Long.prototype.isZero = (function() {
		return this.high_ == 0 && this.low_ == 0
	});
	goog.math.Long.prototype.isNegative = (function() {
		return this.high_ < 0
	});
	goog.math.Long.prototype.isOdd = (function() {
		return (this.low_ & 1) == 1
	});
	goog.math.Long.prototype.equals = (function(other) {
		return this.high_ == other.high_ && this.low_ == other.low_
	});
	goog.math.Long.prototype.notEquals = (function(other) {
		return this.high_ != other.high_ || this.low_ != other.low_
	});
	goog.math.Long.prototype.lessThan = (function(other) {
		return this.compare(other) < 0
	});
	goog.math.Long.prototype.lessThanOrEqual = (function(other) {
		return this.compare(other) <= 0
	});
	goog.math.Long.prototype.greaterThan = (function(other) {
		return this.compare(other) > 0
	});
	goog.math.Long.prototype.greaterThanOrEqual = (function(other) {
		return this.compare(other) >= 0
	});
	goog.math.Long.prototype.compare = (function(other) {
		if (this.equals(other)) {
			return 0
		}
		var thisNeg = this.isNegative();
		var otherNeg = other.isNegative();
		if (thisNeg && !otherNeg) {
			return -1
		}
		if (!thisNeg && otherNeg) {
			return 1
		}
		if (this.subtract(other).isNegative()) {
			return -1
		} else {
			return 1
		}
	});
	goog.math.Long.prototype.negate = (function() {
		if (this.equals(goog.math.Long.MIN_VALUE)) {
			return goog.math.Long.MIN_VALUE
		} else {
			return this.not().add(goog.math.Long.ONE)
		}
	});
	goog.math.Long.prototype.add = (function(other) {
		var a48 = this.high_ >>> 16;
		var a32 = this.high_ & 65535;
		var a16 = this.low_ >>> 16;
		var a00 = this.low_ & 65535;
		var b48 = other.high_ >>> 16;
		var b32 = other.high_ & 65535;
		var b16 = other.low_ >>> 16;
		var b00 = other.low_ & 65535;
		var c48 = 0,
			c32 = 0,
			c16 = 0,
			c00 = 0;
		c00 += a00 + b00;
		c16 += c00 >>> 16;
		c00 &= 65535;
		c16 += a16 + b16;
		c32 += c16 >>> 16;
		c16 &= 65535;
		c32 += a32 + b32;
		c48 += c32 >>> 16;
		c32 &= 65535;
		c48 += a48 + b48;
		c48 &= 65535;
		return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32)
	});
	goog.math.Long.prototype.subtract = (function(other) {
		return this.add(other.negate())
	});
	goog.math.Long.prototype.multiply = (function(other) {
		if (this.isZero()) {
			return goog.math.Long.ZERO
		} else if (other.isZero()) {
			return goog.math.Long.ZERO
		}
		if (this.equals(goog.math.Long.MIN_VALUE)) {
			return other.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO
		} else if (other.equals(goog.math.Long.MIN_VALUE)) {
			return this.isOdd() ? goog.math.Long.MIN_VALUE : goog.math.Long.ZERO
		}
		if (this.isNegative()) {
			if (other.isNegative()) {
				return this.negate().multiply(other.negate())
			} else {
				return this.negate().multiply(other).negate()
			}
		} else if (other.isNegative()) {
			return this.multiply(other.negate()).negate()
		}
		if (this.lessThan(goog.math.Long.TWO_PWR_24_) && other.lessThan(goog.math.Long.TWO_PWR_24_)) {
			return goog.math.Long.fromNumber(this.toNumber() * other.toNumber())
		}
		var a48 = this.high_ >>> 16;
		var a32 = this.high_ & 65535;
		var a16 = this.low_ >>> 16;
		var a00 = this.low_ & 65535;
		var b48 = other.high_ >>> 16;
		var b32 = other.high_ & 65535;
		var b16 = other.low_ >>> 16;
		var b00 = other.low_ & 65535;
		var c48 = 0,
			c32 = 0,
			c16 = 0,
			c00 = 0;
		c00 += a00 * b00;
		c16 += c00 >>> 16;
		c00 &= 65535;
		c16 += a16 * b00;
		c32 += c16 >>> 16;
		c16 &= 65535;
		c16 += a00 * b16;
		c32 += c16 >>> 16;
		c16 &= 65535;
		c32 += a32 * b00;
		c48 += c32 >>> 16;
		c32 &= 65535;
		c32 += a16 * b16;
		c48 += c32 >>> 16;
		c32 &= 65535;
		c32 += a00 * b32;
		c48 += c32 >>> 16;
		c32 &= 65535;
		c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
		c48 &= 65535;
		return goog.math.Long.fromBits(c16 << 16 | c00, c48 << 16 | c32)
	});
	goog.math.Long.prototype.div = (function(other) {
		if (other.isZero()) {
			throw Error("division by zero")
		} else if (this.isZero()) {
			return goog.math.Long.ZERO
		}
		if (this.equals(goog.math.Long.MIN_VALUE)) {
			if (other.equals(goog.math.Long.ONE) || other.equals(goog.math.Long.NEG_ONE)) {
				return goog.math.Long.MIN_VALUE
			} else if (other.equals(goog.math.Long.MIN_VALUE)) {
				return goog.math.Long.ONE
			} else {
				var halfThis = this.shiftRight(1);
				var approx = halfThis.div(other).shiftLeft(1);
				if (approx.equals(goog.math.Long.ZERO)) {
					return other.isNegative() ? goog.math.Long.ONE : goog.math.Long.NEG_ONE
				} else {
					var rem = this.subtract(other.multiply(approx));
					var result = approx.add(rem.div(other));
					return result
				}
			}
		} else if (other.equals(goog.math.Long.MIN_VALUE)) {
			return goog.math.Long.ZERO
		}
		if (this.isNegative()) {
			if (other.isNegative()) {
				return this.negate().div(other.negate())
			} else {
				return this.negate().div(other).negate()
			}
		} else if (other.isNegative()) {
			return this.div(other.negate()).negate()
		}
		var res = goog.math.Long.ZERO;
		var rem = this;
		while (rem.greaterThanOrEqual(other)) {
			var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));
			var log2 = Math.ceil(Math.log(approx) / Math.LN2);
			var delta = log2 <= 48 ? 1 : Math.pow(2, log2 - 48);
			var approxRes = goog.math.Long.fromNumber(approx);
			var approxRem = approxRes.multiply(other);
			while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
				approx -= delta;
				approxRes = goog.math.Long.fromNumber(approx);
				approxRem = approxRes.multiply(other)
			}
			if (approxRes.isZero()) {
				approxRes = goog.math.Long.ONE
			}
			res = res.add(approxRes);
			rem = rem.subtract(approxRem)
		}
		return res
	});
	goog.math.Long.prototype.modulo = (function(other) {
		return this.subtract(this.div(other).multiply(other))
	});
	goog.math.Long.prototype.not = (function() {
		return goog.math.Long.fromBits(~this.low_, ~this.high_)
	});
	goog.math.Long.prototype.and = (function(other) {
		return goog.math.Long.fromBits(this.low_ & other.low_, this.high_ & other.high_)
	});
	goog.math.Long.prototype.or = (function(other) {
		return goog.math.Long.fromBits(this.low_ | other.low_, this.high_ | other.high_)
	});
	goog.math.Long.prototype.xor = (function(other) {
		return goog.math.Long.fromBits(this.low_ ^ other.low_, this.high_ ^ other.high_)
	});
	goog.math.Long.prototype.shiftLeft = (function(numBits) {
		numBits &= 63;
		if (numBits == 0) {
			return this
		} else {
			var low = this.low_;
			if (numBits < 32) {
				var high = this.high_;
				return goog.math.Long.fromBits(low << numBits, high << numBits | low >>> 32 - numBits)
			} else {
				return goog.math.Long.fromBits(0, low << numBits - 32)
			}
		}
	});
	goog.math.Long.prototype.shiftRight = (function(numBits) {
		numBits &= 63;
		if (numBits == 0) {
			return this
		} else {
			var high = this.high_;
			if (numBits < 32) {
				var low = this.low_;
				return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >> numBits)
			} else {
				return goog.math.Long.fromBits(high >> numBits - 32, high >= 0 ? 0 : -1)
			}
		}
	});
	goog.math.Long.prototype.shiftRightUnsigned = (function(numBits) {
		numBits &= 63;
		if (numBits == 0) {
			return this
		} else {
			var high = this.high_;
			if (numBits < 32) {
				var low = this.low_;
				return goog.math.Long.fromBits(low >>> numBits | high << 32 - numBits, high >>> numBits)
			} else if (numBits == 32) {
				return goog.math.Long.fromBits(high, 0)
			} else {
				return goog.math.Long.fromBits(high >>> numBits - 32, 0)
			}
		}
	});
	var navigator = {
		appName: "Modern Browser"
	};
	var dbits;
	var canary = 0xdeadbeefcafe;
	var j_lm = (canary & 16777215) == 15715070;

	function BigInteger(a, b, c) {
		if (a != null)
			if ("number" == typeof a) this.fromNumber(a, b, c);
			else if (b == null && "string" != typeof a) this.fromString(a, 256);
		else this.fromString(a, b)
	}

	function nbi() {
		return new BigInteger(null)
	}

	function am1(i, x, w, j, c, n) {
		while (--n >= 0) {
			var v = x * this[i++] + w[j] + c;
			c = Math.floor(v / 67108864);
			w[j++] = v & 67108863
		}
		return c
	}

	function am2(i, x, w, j, c, n) {
		var xl = x & 32767,
			xh = x >> 15;
		while (--n >= 0) {
			var l = this[i] & 32767;
			var h = this[i++] >> 15;
			var m = xh * l + h * xl;
			l = xl * l + ((m & 32767) << 15) + w[j] + (c & 1073741823);
			c = (l >>> 30) + (m >>> 15) + xh * h + (c >>> 30);
			w[j++] = l & 1073741823
		}
		return c
	}

	function am3(i, x, w, j, c, n) {
		var xl = x & 16383,
			xh = x >> 14;
		while (--n >= 0) {
			var l = this[i] & 16383;
			var h = this[i++] >> 14;
			var m = xh * l + h * xl;
			l = xl * l + ((m & 16383) << 14) + w[j] + c;
			c = (l >> 28) + (m >> 14) + xh * h;
			w[j++] = l & 268435455
		}
		return c
	}
	if (j_lm && navigator.appName == "Microsoft Internet Explorer") {
		BigInteger.prototype.am = am2;
		dbits = 30
	} else if (j_lm && navigator.appName != "Netscape") {
		BigInteger.prototype.am = am1;
		dbits = 26
	} else {
		BigInteger.prototype.am = am3;
		dbits = 28
	}
	BigInteger.prototype.DB = dbits;
	BigInteger.prototype.DM = (1 << dbits) - 1;
	BigInteger.prototype.DV = 1 << dbits;
	var BI_FP = 52;
	BigInteger.prototype.FV = Math.pow(2, BI_FP);
	BigInteger.prototype.F1 = BI_FP - dbits;
	BigInteger.prototype.F2 = 2 * dbits - BI_FP;
	var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
	var BI_RC = new Array;
	var rr, vv;
	rr = "0".charCodeAt(0);
	for (vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
	rr = "a".charCodeAt(0);
	for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
	rr = "A".charCodeAt(0);
	for (vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

	function int2char(n) {
		return BI_RM.charAt(n)
	}

	function intAt(s, i) {
		var c = BI_RC[s.charCodeAt(i)];
		return c == null ? -1 : c
	}

	function bnpCopyTo(r) {
		for (var i = this.t - 1; i >= 0; --i) r[i] = this[i];
		r.t = this.t;
		r.s = this.s
	}

	function bnpFromInt(x) {
		this.t = 1;
		this.s = x < 0 ? -1 : 0;
		if (x > 0) this[0] = x;
		else if (x < -1) this[0] = x + DV;
		else this.t = 0
	}

	function nbv(i) {
		var r = nbi();
		r.fromInt(i);
		return r
	}

	function bnpFromString(s, b) {
		var k;
		if (b == 16) k = 4;
		else if (b == 8) k = 3;
		else if (b == 256) k = 8;
		else if (b == 2) k = 1;
		else if (b == 32) k = 5;
		else if (b == 4) k = 2;
		else {
			this.fromRadix(s, b);
			return
		}
		this.t = 0;
		this.s = 0;
		var i = s.length,
			mi = false,
			sh = 0;
		while (--i >= 0) {
			var x = k == 8 ? s[i] & 255 : intAt(s, i);
			if (x < 0) {
				if (s.charAt(i) == "-") mi = true;
				continue
			}
			mi = false;
			if (sh == 0) this[this.t++] = x;
			else if (sh + k > this.DB) {
				this[this.t - 1] |= (x & (1 << this.DB - sh) - 1) << sh;
				this[this.t++] = x >> this.DB - sh
			} else this[this.t - 1] |= x << sh;
			sh += k;
			if (sh >= this.DB) sh -= this.DB
		}
		if (k == 8 && (s[0] & 128) != 0) {
			this.s = -1;
			if (sh > 0) this[this.t - 1] |= (1 << this.DB - sh) - 1 << sh
		}
		this.clamp();
		if (mi) BigInteger.ZERO.subTo(this, this)
	}

	function bnpClamp() {
		var c = this.s & this.DM;
		while (this.t > 0 && this[this.t - 1] == c) --this.t
	}

	function bnToString(b) {
		if (this.s < 0) return "-" + this.negate().toString(b);
		var k;
		if (b == 16) k = 4;
		else if (b == 8) k = 3;
		else if (b == 2) k = 1;
		else if (b == 32) k = 5;
		else if (b == 4) k = 2;
		else return this.toRadix(b);
		var km = (1 << k) - 1,
			d, m = false,
			r = "",
			i = this.t;
		var p = this.DB - i * this.DB % k;
		if (i-- > 0) {
			if (p < this.DB && (d = this[i] >> p) > 0) {
				m = true;
				r = int2char(d)
			}
			while (i >= 0) {
				if (p < k) {
					d = (this[i] & (1 << p) - 1) << k - p;
					d |= this[--i] >> (p += this.DB - k)
				} else {
					d = this[i] >> (p -= k) & km;
					if (p <= 0) {
						p += this.DB;
						--i
					}
				}
				if (d > 0) m = true;
				if (m) r += int2char(d)
			}
		}
		return m ? r : "0"
	}

	function bnNegate() {
		var r = nbi();
		BigInteger.ZERO.subTo(this, r);
		return r
	}

	function bnAbs() {
		return this.s < 0 ? this.negate() : this
	}

	function bnCompareTo(a) {
		var r = this.s - a.s;
		if (r != 0) return r;
		var i = this.t;
		r = i - a.t;
		if (r != 0) return this.s < 0 ? -r : r;
		while (--i >= 0)
			if ((r = this[i] - a[i]) != 0) return r;
		return 0
	}

	function nbits(x) {
		var r = 1,
			t;
		if ((t = x >>> 16) != 0) {
			x = t;
			r += 16
		}
		if ((t = x >> 8) != 0) {
			x = t;
			r += 8
		}
		if ((t = x >> 4) != 0) {
			x = t;
			r += 4
		}
		if ((t = x >> 2) != 0) {
			x = t;
			r += 2
		}
		if ((t = x >> 1) != 0) {
			x = t;
			r += 1
		}
		return r
	}

	function bnBitLength() {
		if (this.t <= 0) return 0;
		return this.DB * (this.t - 1) + nbits(this[this.t - 1] ^ this.s & this.DM)
	}

	function bnpDLShiftTo(n, r) {
		var i;
		for (i = this.t - 1; i >= 0; --i) r[i + n] = this[i];
		for (i = n - 1; i >= 0; --i) r[i] = 0;
		r.t = this.t + n;
		r.s = this.s
	}

	function bnpDRShiftTo(n, r) {
		for (var i = n; i < this.t; ++i) r[i - n] = this[i];
		r.t = Math.max(this.t - n, 0);
		r.s = this.s
	}

	function bnpLShiftTo(n, r) {
		var bs = n % this.DB;
		var cbs = this.DB - bs;
		var bm = (1 << cbs) - 1;
		var ds = Math.floor(n / this.DB),
			c = this.s << bs & this.DM,
			i;
		for (i = this.t - 1; i >= 0; --i) {
			r[i + ds + 1] = this[i] >> cbs | c;
			c = (this[i] & bm) << bs
		}
		for (i = ds - 1; i >= 0; --i) r[i] = 0;
		r[ds] = c;
		r.t = this.t + ds + 1;
		r.s = this.s;
		r.clamp()
	}

	function bnpRShiftTo(n, r) {
		r.s = this.s;
		var ds = Math.floor(n / this.DB);
		if (ds >= this.t) {
			r.t = 0;
			return
		}
		var bs = n % this.DB;
		var cbs = this.DB - bs;
		var bm = (1 << bs) - 1;
		r[0] = this[ds] >> bs;
		for (var i = ds + 1; i < this.t; ++i) {
			r[i - ds - 1] |= (this[i] & bm) << cbs;
			r[i - ds] = this[i] >> bs
		}
		if (bs > 0) r[this.t - ds - 1] |= (this.s & bm) << cbs;
		r.t = this.t - ds;
		r.clamp()
	}

	function bnpSubTo(a, r) {
		var i = 0,
			c = 0,
			m = Math.min(a.t, this.t);
		while (i < m) {
			c += this[i] - a[i];
			r[i++] = c & this.DM;
			c >>= this.DB
		}
		if (a.t < this.t) {
			c -= a.s;
			while (i < this.t) {
				c += this[i];
				r[i++] = c & this.DM;
				c >>= this.DB
			}
			c += this.s
		} else {
			c += this.s;
			while (i < a.t) {
				c -= a[i];
				r[i++] = c & this.DM;
				c >>= this.DB
			}
			c -= a.s
		}
		r.s = c < 0 ? -1 : 0;
		if (c < -1) r[i++] = this.DV + c;
		else if (c > 0) r[i++] = c;
		r.t = i;
		r.clamp()
	}

	function bnpMultiplyTo(a, r) {
		var x = this.abs(),
			y = a.abs();
		var i = x.t;
		r.t = i + y.t;
		while (--i >= 0) r[i] = 0;
		for (i = 0; i < y.t; ++i) r[i + x.t] = x.am(0, y[i], r, i, 0, x.t);
		r.s = 0;
		r.clamp();
		if (this.s != a.s) BigInteger.ZERO.subTo(r, r)
	}

	function bnpSquareTo(r) {
		var x = this.abs();
		var i = r.t = 2 * x.t;
		while (--i >= 0) r[i] = 0;
		for (i = 0; i < x.t - 1; ++i) {
			var c = x.am(i, x[i], r, 2 * i, 0, 1);
			if ((r[i + x.t] += x.am(i + 1, 2 * x[i], r, 2 * i + 1, c, x.t - i - 1)) >= x.DV) {
				r[i + x.t] -= x.DV;
				r[i + x.t + 1] = 1
			}
		}
		if (r.t > 0) r[r.t - 1] += x.am(i, x[i], r, 2 * i, 0, 1);
		r.s = 0;
		r.clamp()
	}

	function bnpDivRemTo(m, q, r) {
		var pm = m.abs();
		if (pm.t <= 0) return;
		var pt = this.abs();
		if (pt.t < pm.t) {
			if (q != null) q.fromInt(0);
			if (r != null) this.copyTo(r);
			return
		}
		if (r == null) r = nbi();
		var y = nbi(),
			ts = this.s,
			ms = m.s;
		var nsh = this.DB - nbits(pm[pm.t - 1]);
		if (nsh > 0) {
			pm.lShiftTo(nsh, y);
			pt.lShiftTo(nsh, r)
		} else {
			pm.copyTo(y);
			pt.copyTo(r)
		}
		var ys = y.t;
		var y0 = y[ys - 1];
		if (y0 == 0) return;
		var yt = y0 * (1 << this.F1) + (ys > 1 ? y[ys - 2] >> this.F2 : 0);
		var d1 = this.FV / yt,
			d2 = (1 << this.F1) / yt,
			e = 1 << this.F2;
		var i = r.t,
			j = i - ys,
			t = q == null ? nbi() : q;
		y.dlShiftTo(j, t);
		if (r.compareTo(t) >= 0) {
			r[r.t++] = 1;
			r.subTo(t, r)
		}
		BigInteger.ONE.dlShiftTo(ys, t);
		t.subTo(y, y);
		while (y.t < ys) y[y.t++] = 0;
		while (--j >= 0) {
			var qd = r[--i] == y0 ? this.DM : Math.floor(r[i] * d1 + (r[i - 1] + e) * d2);
			if ((r[i] += y.am(0, qd, r, j, 0, ys)) < qd) {
				y.dlShiftTo(j, t);
				r.subTo(t, r);
				while (r[i] < --qd) r.subTo(t, r)
			}
		}
		if (q != null) {
			r.drShiftTo(ys, q);
			if (ts != ms) BigInteger.ZERO.subTo(q, q)
		}
		r.t = ys;
		r.clamp();
		if (nsh > 0) r.rShiftTo(nsh, r);
		if (ts < 0) BigInteger.ZERO.subTo(r, r)
	}

	function bnMod(a) {
		var r = nbi();
		this.abs().divRemTo(a, null, r);
		if (this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a.subTo(r, r);
		return r
	}

	function Classic(m) {
		this.m = m
	}

	function cConvert(x) {
		if (x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
		else return x
	}

	function cRevert(x) {
		return x
	}

	function cReduce(x) {
		x.divRemTo(this.m, null, x)
	}

	function cMulTo(x, y, r) {
		x.multiplyTo(y, r);
		this.reduce(r)
	}

	function cSqrTo(x, r) {
		x.squareTo(r);
		this.reduce(r)
	}
	Classic.prototype.convert = cConvert;
	Classic.prototype.revert = cRevert;
	Classic.prototype.reduce = cReduce;
	Classic.prototype.mulTo = cMulTo;
	Classic.prototype.sqrTo = cSqrTo;

	function bnpInvDigit() {
		if (this.t < 1) return 0;
		var x = this[0];
		if ((x & 1) == 0) return 0;
		var y = x & 3;
		y = y * (2 - (x & 15) * y) & 15;
		y = y * (2 - (x & 255) * y) & 255;
		y = y * (2 - ((x & 65535) * y & 65535)) & 65535;
		y = y * (2 - x * y % this.DV) % this.DV;
		return y > 0 ? this.DV - y : -y
	}

	function Montgomery(m) {
		this.m = m;
		this.mp = m.invDigit();
		this.mpl = this.mp & 32767;
		this.mph = this.mp >> 15;
		this.um = (1 << m.DB - 15) - 1;
		this.mt2 = 2 * m.t
	}

	function montConvert(x) {
		var r = nbi();
		x.abs().dlShiftTo(this.m.t, r);
		r.divRemTo(this.m, null, r);
		if (x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m.subTo(r, r);
		return r
	}

	function montRevert(x) {
		var r = nbi();
		x.copyTo(r);
		this.reduce(r);
		return r
	}

	function montReduce(x) {
		while (x.t <= this.mt2) x[x.t++] = 0;
		for (var i = 0; i < this.m.t; ++i) {
			var j = x[i] & 32767;
			var u0 = j * this.mpl + ((j * this.mph + (x[i] >> 15) * this.mpl & this.um) << 15) & x.DM;
			j = i + this.m.t;
			x[j] += this.m.am(0, u0, x, i, 0, this.m.t);
			while (x[j] >= x.DV) {
				x[j] -= x.DV;
				x[++j]++
			}
		}
		x.clamp();
		x.drShiftTo(this.m.t, x);
		if (x.compareTo(this.m) >= 0) x.subTo(this.m, x)
	}

	function montSqrTo(x, r) {
		x.squareTo(r);
		this.reduce(r)
	}

	function montMulTo(x, y, r) {
		x.multiplyTo(y, r);
		this.reduce(r)
	}
	Montgomery.prototype.convert = montConvert;
	Montgomery.prototype.revert = montRevert;
	Montgomery.prototype.reduce = montReduce;
	Montgomery.prototype.mulTo = montMulTo;
	Montgomery.prototype.sqrTo = montSqrTo;

	function bnpIsEven() {
		return (this.t > 0 ? this[0] & 1 : this.s) == 0
	}

	function bnpExp(e, z) {
		if (e > 4294967295 || e < 1) return BigInteger.ONE;
		var r = nbi(),
			r2 = nbi(),
			g = z.convert(this),
			i = nbits(e) - 1;
		g.copyTo(r);
		while (--i >= 0) {
			z.sqrTo(r, r2);
			if ((e & 1 << i) > 0) z.mulTo(r2, g, r);
			else {
				var t = r;
				r = r2;
				r2 = t
			}
		}
		return z.revert(r)
	}

	function bnModPowInt(e, m) {
		var z;
		if (e < 256 || m.isEven()) z = new Classic(m);
		else z = new Montgomery(m);
		return this.exp(e, z)
	}
	BigInteger.prototype.copyTo = bnpCopyTo;
	BigInteger.prototype.fromInt = bnpFromInt;
	BigInteger.prototype.fromString = bnpFromString;
	BigInteger.prototype.clamp = bnpClamp;
	BigInteger.prototype.dlShiftTo = bnpDLShiftTo;
	BigInteger.prototype.drShiftTo = bnpDRShiftTo;
	BigInteger.prototype.lShiftTo = bnpLShiftTo;
	BigInteger.prototype.rShiftTo = bnpRShiftTo;
	BigInteger.prototype.subTo = bnpSubTo;
	BigInteger.prototype.multiplyTo = bnpMultiplyTo;
	BigInteger.prototype.squareTo = bnpSquareTo;
	BigInteger.prototype.divRemTo = bnpDivRemTo;
	BigInteger.prototype.invDigit = bnpInvDigit;
	BigInteger.prototype.isEven = bnpIsEven;
	BigInteger.prototype.exp = bnpExp;
	BigInteger.prototype.toString = bnToString;
	BigInteger.prototype.negate = bnNegate;
	BigInteger.prototype.abs = bnAbs;
	BigInteger.prototype.compareTo = bnCompareTo;
	BigInteger.prototype.bitLength = bnBitLength;
	BigInteger.prototype.mod = bnMod;
	BigInteger.prototype.modPowInt = bnModPowInt;
	BigInteger.ZERO = nbv(0);
	BigInteger.ONE = nbv(1);

	function bnpFromRadix(s, b) {
		this.fromInt(0);
		if (b == null) b = 10;
		var cs = this.chunkSize(b);
		var d = Math.pow(b, cs),
			mi = false,
			j = 0,
			w = 0;
		for (var i = 0; i < s.length; ++i) {
			var x = intAt(s, i);
			if (x < 0) {
				if (s.charAt(i) == "-" && this.signum() == 0) mi = true;
				continue
			}
			w = b * w + x;
			if (++j >= cs) {
				this.dMultiply(d);
				this.dAddOffset(w, 0);
				j = 0;
				w = 0
			}
		}
		if (j > 0) {
			this.dMultiply(Math.pow(b, j));
			this.dAddOffset(w, 0)
		}
		if (mi) BigInteger.ZERO.subTo(this, this)
	}

	function bnpChunkSize(r) {
		return Math.floor(Math.LN2 * this.DB / Math.log(r))
	}

	function bnSigNum() {
		if (this.s < 0) return -1;
		else if (this.t <= 0 || this.t == 1 && this[0] <= 0) return 0;
		else return 1
	}

	function bnpDMultiply(n) {
		this[this.t] = this.am(0, n - 1, this, 0, 0, this.t);
		++this.t;
		this.clamp()
	}

	function bnpDAddOffset(n, w) {
		if (n == 0) return;
		while (this.t <= w) this[this.t++] = 0;
		this[w] += n;
		while (this[w] >= this.DV) {
			this[w] -= this.DV;
			if (++w >= this.t) this[this.t++] = 0;
			++this[w]
		}
	}

	function bnpToRadix(b) {
		if (b == null) b = 10;
		if (this.signum() == 0 || b < 2 || b > 36) return "0";
		var cs = this.chunkSize(b);
		var a = Math.pow(b, cs);
		var d = nbv(a),
			y = nbi(),
			z = nbi(),
			r = "";
		this.divRemTo(d, y, z);
		while (y.signum() > 0) {
			r = (a + z.intValue()).toString(b).substr(1) + r;
			y.divRemTo(d, y, z)
		}
		return z.intValue().toString(b) + r
	}

	function bnIntValue() {
		if (this.s < 0) {
			if (this.t == 1) return this[0] - this.DV;
			else if (this.t == 0) return -1
		} else if (this.t == 1) return this[0];
		else if (this.t == 0) return 0;
		return (this[1] & (1 << 32 - this.DB) - 1) << this.DB | this[0]
	}

	function bnpAddTo(a, r) {
		var i = 0,
			c = 0,
			m = Math.min(a.t, this.t);
		while (i < m) {
			c += this[i] + a[i];
			r[i++] = c & this.DM;
			c >>= this.DB
		}
		if (a.t < this.t) {
			c += a.s;
			while (i < this.t) {
				c += this[i];
				r[i++] = c & this.DM;
				c >>= this.DB
			}
			c += this.s
		} else {
			c += this.s;
			while (i < a.t) {
				c += a[i];
				r[i++] = c & this.DM;
				c >>= this.DB
			}
			c += a.s
		}
		r.s = c < 0 ? -1 : 0;
		if (c > 0) r[i++] = c;
		else if (c < -1) r[i++] = this.DV + c;
		r.t = i;
		r.clamp()
	}
	BigInteger.prototype.fromRadix = bnpFromRadix;
	BigInteger.prototype.chunkSize = bnpChunkSize;
	BigInteger.prototype.signum = bnSigNum;
	BigInteger.prototype.dMultiply = bnpDMultiply;
	BigInteger.prototype.dAddOffset = bnpDAddOffset;
	BigInteger.prototype.toRadix = bnpToRadix;
	BigInteger.prototype.intValue = bnIntValue;
	BigInteger.prototype.addTo = bnpAddTo;
	var Wrapper = {
		abs: (function(l, h) {
			var x = new goog.math.Long(l, h);
			var ret;
			if (x.isNegative()) {
				ret = x.negate()
			} else {
				ret = x
			}
			HEAP32[tempDoublePtr >> 2] = ret.low_;
			HEAP32[tempDoublePtr + 4 >> 2] = ret.high_
		}),
		ensureTemps: (function() {
			if (Wrapper.ensuredTemps) return;
			Wrapper.ensuredTemps = true;
			Wrapper.two32 = new BigInteger;
			Wrapper.two32.fromString("4294967296", 10);
			Wrapper.two64 = new BigInteger;
			Wrapper.two64.fromString("18446744073709551616", 10);
			Wrapper.temp1 = new BigInteger;
			Wrapper.temp2 = new BigInteger
		}),
		lh2bignum: (function(l, h) {
			var a = new BigInteger;
			a.fromString(h.toString(), 10);
			var b = new BigInteger;
			a.multiplyTo(Wrapper.two32, b);
			var c = new BigInteger;
			c.fromString(l.toString(), 10);
			var d = new BigInteger;
			c.addTo(b, d);
			return d
		}),
		stringify: (function(l, h, unsigned) {
			var ret = (new goog.math.Long(l, h)).toString();
			if (unsigned && ret[0] == "-") {
				Wrapper.ensureTemps();
				var bignum = new BigInteger;
				bignum.fromString(ret, 10);
				ret = new BigInteger;
				Wrapper.two64.addTo(bignum, ret);
				ret = ret.toString(10)
			}
			return ret
		}),
		fromString: (function(str, base, min, max, unsigned) {
			Wrapper.ensureTemps();
			var bignum = new BigInteger;
			bignum.fromString(str, base);
			var bigmin = new BigInteger;
			bigmin.fromString(min, 10);
			var bigmax = new BigInteger;
			bigmax.fromString(max, 10);
			if (unsigned && bignum.compareTo(BigInteger.ZERO) < 0) {
				var temp = new BigInteger;
				bignum.addTo(Wrapper.two64, temp);
				bignum = temp
			}
			var error = false;
			if (bignum.compareTo(bigmin) < 0) {
				bignum = bigmin;
				error = true
			} else if (bignum.compareTo(bigmax) > 0) {
				bignum = bigmax;
				error = true
			}
			var ret = goog.math.Long.fromString(bignum.toString());
			HEAP32[tempDoublePtr >> 2] = ret.low_;
			HEAP32[tempDoublePtr + 4 >> 2] = ret.high_;
			if (error) throw "range error"
		})
	};
	return Wrapper
})();
if (memoryInitializer) {
	if (typeof Module["locateFile"] === "function") {
		memoryInitializer = Module["locateFile"](memoryInitializer)
	} else if (Module["memoryInitializerPrefixURL"]) {
		memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer
	}
	if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
		var data = Module["readBinary"](memoryInitializer);
		HEAPU8.set(data, STATIC_BASE)
	} else {
		addRunDependency("memory initializer");

		function applyMemoryInitializer(data) {
			if (data.byteLength) data = new Uint8Array(data);
			HEAPU8.set(data, STATIC_BASE);
			removeRunDependency("memory initializer")
		}
		var request = Module["memoryInitializerRequest"];
		if (request) {
			if (request.response) {
				setTimeout((function() {
					applyMemoryInitializer(request.response)
				}), 0)
			} else {
				request.addEventListener("load", (function() {
					if (request.status !== 200 && request.status !== 0) {
						console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status)
					}
					if (!request.response || typeof request.response !== "object" || !request.response.byteLength) {
						console.warn("a problem seems to have happened with Module.memoryInitializerRequest response (expected ArrayBuffer): " + request.response)
					}
					applyMemoryInitializer(request.response)
				}))
			}
		} else {
			Browser.asyncLoad(memoryInitializer, applyMemoryInitializer, (function() {
				throw "could not load memory initializer " + memoryInitializer
			}))
		}
	}
}

function ExitStatus(status) {
	this.name = "ExitStatus";
	this.message = "Program terminated with exit(" + status + ")";
	this.status = status
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
var preloadStartTime = null;
var calledMain = false;
dependenciesFulfilled = function runCaller() {
	if (!Module["calledRun"]) run();
	if (!Module["calledRun"]) dependenciesFulfilled = runCaller
};
Module["callMain"] = Module.callMain = function callMain(args) {
	assert(runDependencies == 0, "cannot call main when async dependencies remain! (listen on __ATMAIN__)");
	assert(__ATPRERUN__.length == 0, "cannot call main when preRun functions remain to be called");
	args = args || [];
	ensureInitRuntime();
	var argc = args.length + 1;

	function pad() {
		for (var i = 0; i < 4 - 1; i++) {
			argv.push(0)
		}
	}
	var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
	pad();
	for (var i = 0; i < argc - 1; i = i + 1) {
		argv.push(allocate(intArrayFromString(args[i]), "i8", ALLOC_NORMAL));
		pad()
	}
	argv.push(0);
	argv = allocate(argv, "i32", ALLOC_NORMAL);
	initialStackTop = STACKTOP;
	try {
		var ret = Module["_main"](argc, argv, 0);
		exit(ret)
	} catch (e) {
		if (e instanceof ExitStatus) {
			return
		} else if (e == "SimulateInfiniteLoop") {
			Module["noExitRuntime"] = true;
			return
		} else {
			if (e && typeof e === "object" && e.stack) Module.printErr("exception thrown: " + [e, e.stack]);
			throw e
		}
	} finally {
		calledMain = true
	}
};

function run(args) {
	args = args || Module["arguments"];
	if (preloadStartTime === null) preloadStartTime = Date.now();
	if (runDependencies > 0) {
		return
	}
	preRun();
	if (runDependencies > 0) return;
	if (Module["calledRun"]) return;

	function doRun() {
		if (Module["calledRun"]) return;
		Module["calledRun"] = true;
		if (ABORT) return;
		ensureInitRuntime();
		preMain();
		if (ENVIRONMENT_IS_WEB && preloadStartTime !== null) {
			Module.printErr("pre-main prep time: " + (Date.now() - preloadStartTime) + " ms")
		}
		if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
		if (Module["_main"] && shouldRunNow) Module["callMain"](args);
		postRun()
	}
	if (Module["setStatus"]) {
		Module["setStatus"]("Running...");
		setTimeout((function() {
			setTimeout((function() {
				Module["setStatus"]("")
			}), 1);
			doRun()
		}), 1)
	} else {
		doRun()
	}
}
Module["run"] = Module.run = run;

function exit(status) {
	if (Module["noExitRuntime"]) {
		return
	}
	ABORT = true;
	EXITSTATUS = status;
	STACKTOP = initialStackTop;
	exitRuntime();
	if (Module["onExit"]) Module["onExit"](status);
	if (ENVIRONMENT_IS_NODE) {
		process["stdout"]["once"]("drain", (function() {
			process["exit"](status)
		}));
		console.log(" ");
		setTimeout((function() {
			process["exit"](status)
		}), 500)
	} else if (ENVIRONMENT_IS_SHELL && typeof quit === "function") {
		quit(status)
	}
	throw new ExitStatus(status)
}
Module["exit"] = Module.exit = exit;
var abortDecorators = [];

function abort(what) {
	if (what !== undefined) {
		Module.print(what);
		Module.printErr(what);
		what = JSON.stringify(what)
	} else {
		what = ""
	}
	ABORT = true;
	EXITSTATUS = 1;
	var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
	var output = "abort(" + what + ") at " + stackTrace() + extra;
	abortDecorators.forEach((function(decorator) {
		output = decorator(output, what)
	}));
	throw output
}
Module["abort"] = Module.abort = abort;
if (Module["preInit"]) {
	if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
	while (Module["preInit"].length > 0) {
		Module["preInit"].pop()()
	}
}
var shouldRunNow = true;
if (Module["noInitialRun"]) {
	shouldRunNow = false
}
run();

function WrapperObject() {}
WrapperObject.prototype = Object.create(WrapperObject.prototype);
WrapperObject.prototype.constructor = WrapperObject;
WrapperObject.prototype.__class__ = WrapperObject;
WrapperObject.__cache__ = {};
Module["WrapperObject"] = WrapperObject;

function getCache(__class__) {
	return (__class__ || WrapperObject).__cache__
}
Module["getCache"] = getCache;

function wrapPointer(ptr, __class__) {
	var cache = getCache(__class__);
	var ret = cache[ptr];
	if (ret) return ret;
	ret = Object.create((__class__ || WrapperObject).prototype);
	ret.ptr = ptr;
	return cache[ptr] = ret
}
Module["wrapPointer"] = wrapPointer;

function castObject(obj, __class__) {
	return wrapPointer(obj.ptr, __class__)
}
Module["castObject"] = castObject;
Module["NULL"] = wrapPointer(0);

function destroy(obj) {
	if (!obj["__destroy__"]) throw "Error: Cannot destroy object. (Did you create it yourself?)";
	obj["__destroy__"]();
	delete getCache(obj.__class__)[obj.ptr]
}
Module["destroy"] = destroy;

function compare(obj1, obj2) {
	return obj1.ptr === obj2.ptr
}
Module["compare"] = compare;

function getPointer(obj) {
	return obj.ptr
}
Module["getPointer"] = getPointer;

function getClass(obj) {
	return obj.__class__
}
Module["getClass"] = getClass;
var ensureString = (function() {
	var stringCache = {};

	function ensureString(value) {
		if (typeof value == "string") {
			var cachedVal = stringCache[value];
			if (cachedVal) return cachedVal;
			var ret = allocate(intArrayFromString(value), "i8", ALLOC_STACK);
			stringCache[value] = ret;
			return ret
		}
		return value
	}
	return ensureString
})();

function RAROpenArchiveDataEx() {
	this.ptr = _emscripten_bind_RAROpenArchiveDataEx_RAROpenArchiveDataEx_0();
	getCache(RAROpenArchiveDataEx)[this.ptr] = this
}
RAROpenArchiveDataEx.prototype = Object.create(WrapperObject.prototype);
RAROpenArchiveDataEx.prototype.constructor = RAROpenArchiveDataEx;
RAROpenArchiveDataEx.prototype.__class__ = RAROpenArchiveDataEx;
RAROpenArchiveDataEx.__cache__ = {};
Module["RAROpenArchiveDataEx"] = RAROpenArchiveDataEx;
RAROpenArchiveDataEx.prototype["get_ArcName"] = (function() {
	var self = this.ptr;
	return Pointer_stringify(_emscripten_bind_RAROpenArchiveDataEx_get_ArcName_0(self))
});
RAROpenArchiveDataEx.prototype["set_ArcName"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_ArcName_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_ArcNameW"] = (function() {
	var self = this.ptr;
	return Pointer_stringify(_emscripten_bind_RAROpenArchiveDataEx_get_ArcNameW_0(self))
});
RAROpenArchiveDataEx.prototype["set_ArcNameW"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_ArcNameW_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_OpenMode"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_OpenMode_0(self)
});
RAROpenArchiveDataEx.prototype["set_OpenMode"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_OpenMode_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_OpenResult"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_OpenResult_0(self)
});
RAROpenArchiveDataEx.prototype["get_CmtBuf"] = (function() {
	var self = this.ptr;
	return Pointer_stringify(_emscripten_bind_RAROpenArchiveDataEx_get_CmtBuf_0(self))
});
RAROpenArchiveDataEx.prototype["set_CmtBuf"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_CmtBuf_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_CmtBufSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_CmtBufSize_0(self)
});
RAROpenArchiveDataEx.prototype["set_CmtBufSize"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_CmtBufSize_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_CmtSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_CmtSize_0(self)
});
RAROpenArchiveDataEx.prototype["get_CmtState"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_CmtState_0(self)
});
RAROpenArchiveDataEx.prototype["get_Flags"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_Flags_0(self)
});
RAROpenArchiveDataEx.prototype["get_Callback"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_Callback_0(self)
});
RAROpenArchiveDataEx.prototype["set_Callback"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_Callback_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_UserData"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RAROpenArchiveDataEx_get_UserData_0(self)
});
RAROpenArchiveDataEx.prototype["set_UserData"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RAROpenArchiveDataEx_set_UserData_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["get_Reserved"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RAROpenArchiveDataEx_get_Reserved_1(self, arg0)
});
RAROpenArchiveDataEx.prototype["set_Reserved"] = (function(arg0, arg1) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	if (arg1 && typeof arg1 === "object") arg1 = arg1.ptr;
	else arg1 = ensureString(arg1);
	_emscripten_bind_RAROpenArchiveDataEx_set_Reserved_2(self, arg0, arg1)
});
RAROpenArchiveDataEx.prototype["__destroy__"] = (function() {
	var self = this.ptr;
	_emscripten_bind_RAROpenArchiveDataEx___destroy___0(self)
});

function RARHeaderDataEx() {
	this.ptr = _emscripten_bind_RARHeaderDataEx_RARHeaderDataEx_0();
	getCache(RARHeaderDataEx)[this.ptr] = this
}
RARHeaderDataEx.prototype = Object.create(WrapperObject.prototype);
RARHeaderDataEx.prototype.constructor = RARHeaderDataEx;
RARHeaderDataEx.prototype.__class__ = RARHeaderDataEx;
RARHeaderDataEx.__cache__ = {};
Module["RARHeaderDataEx"] = RARHeaderDataEx;
RARHeaderDataEx.prototype["get_ArcName"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RARHeaderDataEx_get_ArcName_1(self, arg0)
});
RARHeaderDataEx.prototype["get_ArcNameW"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RARHeaderDataEx_get_ArcNameW_1(self, arg0)
});
RARHeaderDataEx.prototype["get_FileName"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RARHeaderDataEx_get_FileName_1(self, arg0)
});
RARHeaderDataEx.prototype["get_FileNameW"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RARHeaderDataEx_get_FileNameW_1(self, arg0)
});
RARHeaderDataEx.prototype["get_Flags"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_Flags_0(self)
});
RARHeaderDataEx.prototype["get_PackSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_PackSize_0(self)
});
RARHeaderDataEx.prototype["get_PackSizeHigh"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_PackSizeHigh_0(self)
});
RARHeaderDataEx.prototype["get_UnpSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_UnpSize_0(self)
});
RARHeaderDataEx.prototype["get_UnpSizeHigh"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_UnpSizeHigh_0(self)
});
RARHeaderDataEx.prototype["get_HostOS"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_HostOS_0(self)
});
RARHeaderDataEx.prototype["get_FileCRC"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_FileCRC_0(self)
});
RARHeaderDataEx.prototype["get_FileTime"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_FileTime_0(self)
});
RARHeaderDataEx.prototype["get_UnpVer"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_UnpVer_0(self)
});
RARHeaderDataEx.prototype["get_Method"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_Method_0(self)
});
RARHeaderDataEx.prototype["get_FileAttr"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_FileAttr_0(self)
});
RARHeaderDataEx.prototype["get_CmtBuf"] = (function() {
	var self = this.ptr;
	return Pointer_stringify(_emscripten_bind_RARHeaderDataEx_get_CmtBuf_0(self))
});
RARHeaderDataEx.prototype["set_CmtBuf"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RARHeaderDataEx_set_CmtBuf_1(self, arg0)
});
RARHeaderDataEx.prototype["get_CmtBufSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_CmtBufSize_0(self)
});
RARHeaderDataEx.prototype["set_CmtBufSize"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	_emscripten_bind_RARHeaderDataEx_set_CmtBufSize_1(self, arg0)
});
RARHeaderDataEx.prototype["get_CmtSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_CmtSize_0(self)
});
RARHeaderDataEx.prototype["get_CmtState"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_CmtState_0(self)
});
RARHeaderDataEx.prototype["get_DictSize"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_DictSize_0(self)
});
RARHeaderDataEx.prototype["get_HashType"] = (function() {
	var self = this.ptr;
	return _emscripten_bind_RARHeaderDataEx_get_HashType_0(self)
});
RARHeaderDataEx.prototype["get_Hash"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RARHeaderDataEx_get_Hash_1(self, arg0)
});
RARHeaderDataEx.prototype["get_Reserved"] = (function(arg0) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	return _emscripten_bind_RARHeaderDataEx_get_Reserved_1(self, arg0)
});
RARHeaderDataEx.prototype["set_Reserved"] = (function(arg0, arg1) {
	var self = this.ptr;
	if (arg0 && typeof arg0 === "object") arg0 = arg0.ptr;
	else arg0 = ensureString(arg0);
	if (arg1 && typeof arg1 === "object") arg1 = arg1.ptr;
	else arg1 = ensureString(arg1);
	_emscripten_bind_RARHeaderDataEx_set_Reserved_2(self, arg0, arg1)
});
RARHeaderDataEx.prototype["__destroy__"] = (function() {
	var self = this.ptr;
	_emscripten_bind_RARHeaderDataEx___destroy___0(self)
});

function VoidPtr() {
	throw "cannot construct a VoidPtr, no constructor in IDL"
}
VoidPtr.prototype = Object.create(WrapperObject.prototype);
VoidPtr.prototype.constructor = VoidPtr;
VoidPtr.prototype.__class__ = VoidPtr;
VoidPtr.__cache__ = {};
Module["VoidPtr"] = VoidPtr;
VoidPtr.prototype["__destroy__"] = (function() {
	var self = this.ptr;
	_emscripten_bind_VoidPtr___destroy___0(self)
});
((function() {
	function setupEnums() {}
	if (Module["calledRun"]) setupEnums();
	else addOnPreMain(setupEnums)
}))()

//My Code:
/* ----------------
 * CONSTANTS (from dll.hpp)
 * --------------*/
 
"use strict";
 
var ERAR_SUCCESS            =  0
var ERAR_END_ARCHIVE        = 10
var ERAR_NO_MEMORY          = 11
var ERAR_BAD_DATA           = 12
var ERAR_BAD_ARCHIVE        = 13
var ERAR_UNKNOWN_FORMAT     = 14
var ERAR_EOPEN              = 15
var ERAR_ECREATE            = 16
var ERAR_ECLOSE             = 17
var ERAR_EREAD              = 18
var ERAR_EWRITE             = 19
var ERAR_SMALL_BUF          = 20
var ERAR_UNKNOWN            = 21
var ERAR_MISSING_PASSWORD   = 22
var ERAR_EREFERENCE         = 23
var ERAR_BAD_PASSWORD       = 24

var RAR_OM_LIST           = 0
var RAR_OM_EXTRACT        = 1
var RAR_OM_LIST_INCSPLIT  = 2

var RAR_SKIP          = 0
var RAR_TEST          = 1
var RAR_EXTRACT       = 2

var RAR_VOL_ASK       = 0
var RAR_VOL_NOTIFY    = 1

var RAR_DLL_VERSION   = 6

var RAR_HASH_NONE     = 0
var RAR_HASH_CRC32    = 1
var RAR_HASH_BLAKE2   = 2

var RHDF_SPLITBEFORE = 0x01
var RHDF_SPLITAFTER  = 0x02
var RHDF_ENCRYPTED   = 0x04
var RHDF_SOLID       = 0x10
var RHDF_DIRECTORY   = 0x20

var UCM_CHANGEVOLUME    = 0
var UCM_PROCESSDATA     = 1
var UCM_NEEDPASSWORD    = 2
var UCM_CHANGEVOLUMEW   = 3
var UCM_NEEDPASSWORDW   = 4

/* -----------------
 * Error Reporting
 * ----------------*/

var reportOpenError = function(code){
	switch(code) {
		case ERAR_NO_MEMORY:
			throw "Not enough memory to initialize data structures"
			break
		case ERAR_BAD_DATA:
			throw "Archive header broken"
			break
		case ERAR_UNKNOWN_FORMAT:
			throw "Unknown encryption used for archive headers"
			break
		case ERAR_EOPEN:
			throw "File open error"
			break
		case ERAR_BAD_PASSWORD:
			throw "Entered password is invalid. This code is returned only for archives in RAR 5.0 format"
			break
		case ERAR_BAD_ARCHIVE:
			throw "Bad archive"
			break
		default:
			throw "Unknown open error code"
			break
	}
}

var reportReadHeaderError = function(code){
	switch(code) {
		case ERAR_BAD_DATA:
			throw "File header broken"
			break
		case ERAR_MISSING_PASSWORD:
			throw "Password was not provided for encrypted file header"
			break
		case ERAR_BAD_PASSWORD:
			throw "Bad password"
			break
		default:
			throw "Unknown read header error code"
			break
	}
}

var reportProcessFileError = function(code){
	switch(code) {
		case ERAR_BAD_DATA: 
			throw "File CRC error"
			break
		case ERAR_UNKNOWN_FORMAT: 
			throw "Unknown archive format"
			break
		case ERAR_EOPEN: 
			throw "Volume open error"
			break
		case ERAR_ECREATE: 
			throw "File create error"
			break
		case ERAR_ECLOSE: 
			throw "File close error"
			break
		case ERAR_EREAD: 
			throw "Read error"
			break
		case ERAR_EWRITE: 
			throw "Write error"
			break
		case ERAR_NO_MEMORY: 
			throw "Not enough memory"
			break
		case ERAR_EREFERENCE: 
			throw "When attempting to unpack a reference record (see RAR -oi switch), source file for this reference was not found. Entire archive needs to be unpacked to properly create file references. This error is returned when attempting to unpack the reference record without its source file."
			break
		case ERAR_BAD_PASSWORD: 
			throw "Entered password is invalid. This code is returned only for archives in RAR 5.0 format"
			break
		case ERAR_MISSING_PASSWORD:
			throw "Missing password"
			break
		default:
			throw "Unknown Process File error code"
			break
	}
}

/*--------------------------
 * Actual extraction code
 *-------------------------*/
 
/**
	Get the content of file(s) inside a RAR archive or archives(for multi-part RAR)
	
	@param data: Array of {name:filename in string, content: typed array of file}
	In case of single RAR archive, data = [
		{name: 'test.rar', content: typed array for content of test.rar}
	]
	In case of multi-part RAR, it would be like this:
	[
		{name: 'test.part1.rar', content: typed array for content of test.part1.rar},
		...
		{name: 'test.partN.rar', content: typed array for content of test.partN.rar}
	]
	@param password: string
	@param callbackFn: function(currFileName, currFileSize, currProcessed)
	It is used to show progress(of a single file only, whole archive progress not implemented)
	
	@return a JS Object representing the directory structure of the RAR archive content
	- Each directory is a map between the directory name and an object {type: 'dir', ls: {(file|directory map)}
	- Each file is a map between the file name and an object 
	{type: 'file',
	fullFileName: full file name including the directory path,
	fileSize: file size,
	fileContent: typed array (UInt8) of file content}
	
	There is always an outtermost rootDirectory object
	Example:
	return value = {
		ls: {
			'fileA' : { type: 'file', fullFileName: ..., fileSize: ..., fileContent: ...},
			'subDirA' : { type: 'dir'
				ls: {
					'fileB' : {type: 'file' ....},
					'subsubdirC' : {type: 'dir',
							ls: { 'fileD' : {type: 'file' ... } }
					} 
				}
			} 
		}
	}
	for RAR file like this:
	/
	/fileA
	/subDirA/
	/subDirA/fileB
	/subDirA/subsubdirC/
	/subDirA/subsubdirC/fileD
	
	Use a recursive function to walk this structure, see index.html for example
*/

var readRARContent = function(data, password, callbackFn) {
	var data = data
	var password = password
	var callbackFn = callbackFn
	console.log("Current working directory: ",FS.cwd())

	var returnVal = []

	var currVolumeIndex = 0
	
	// write the byte arrays to a file first
	// because the library operates on files
	// the canOwn flag reduces the memory usage
	for(var i = 0; i < data.length; i++) {
		FS.writeFile(data[i].name, data[i].content, {encoding: "binary", canOwn: true, flags: 'w+'})
	}

	var arcData = new Module.RAROpenArchiveDataEx();
	arcData.set_ArcName(data[0].name)
	arcData.set_OpenMode(RAR_OM_EXTRACT)
	
	var cb = Runtime.addFunction(function(msg, UserData, P1, P2){
		// volume change event
		if(msg === UCM_CHANGEVOLUMEW) return 0
		if(msg === UCM_CHANGEVOLUME){
			if(P2 === RAR_VOL_ASK) {
				return -1
			} else if(P2 === RAR_VOL_NOTIFY) {
				console.log('... volume is :', Pointer_stringify(P1))
				return 1
			}
			throw "Unknown P2 value in volume change event"
		} 
		
		if(msg === UCM_NEEDPASSWORDW) return 0
		if(msg === UCM_NEEDPASSWORD) {
			if(password) {
				writeStringToMemory(password, P1)
				return 1
			} else {
				return -1
			}
		}
		
		if(msg !== UCM_PROCESSDATA) {
			return -1 //abort operation
		}
		//additional callback function
		if(callbackFn){callbackFn(currFileName, currFileSize, currFileBufferEnd)}
	
		// directly access the HEAP
		var block = HEAPU8.subarray(P1, P1+P2)
		var view = new Uint8Array(currFileBuffer, currFileBufferEnd, P2)
		view.set(block)
		currFileBufferEnd += P2
		
		return 1
	})
	arcData.set_Callback(cb);
	
	var cleanup = function(){
		// clean up
		_RARCloseArchive(handle)

		for(var i = 0; i < data.length; i++) {
			FS.unlink(data[i].name)
		}
		Runtime.removeFunction(cb)
	}
	
	
	var handle = _RAROpenArchiveEx(getPointer(arcData))
	
	var or = arcData.get_OpenResult()
	if(or !== ERAR_SUCCESS || !handle) {
		cleanup()
		reportOpenError(or)
		return null
	}
	
	var ShowArcInfo = function(Flags) {
		// console.log("\nArchive %s\n",ArcName);
		console.log("Volume:\t\t%s",(Flags & 1) ? "yes":"no");
		console.log("Comment:\t%s",(Flags & 2) ? "yes":"no");
		console.log("Locked:\t\t%s",(Flags & 4) ? "yes":"no");
		console.log("Solid:\t\t%s",(Flags & 8) ? "yes":"no");
		console.log("New naming:\t%s",(Flags & 16) ? "yes":"no");
		console.log("Recovery:\t%s",(Flags & 64) ? "yes":"no");
		console.log("Encr.headers:\t%s",(Flags & 128) ? "yes":"no");
		console.log("First volume:\t%s",(Flags & 256) ? "yes":"no or older than 3.0");
		console.log("---------------------------\n");		
	}
	
	ShowArcInfo(arcData.get_Flags())
	
	// open success
	if(password){
		_RARSetPassword(handle, ensureString(password))
	}
	
	var header = new Module.RARHeaderDataEx();
	var res = _RARReadHeaderEx(handle, getPointer(header));
	
	var getFileName = function(){
		//assume UTF-16, base on the C code
		//actually not sure because the use of wchar_t depends on the compiler(emscripten) setting
	
		// console.log(arcData.get_Flags())
		// get entry name
		var filenameBytes = []
		var i = 0;
		while(i<2048){
			var oneByte = header.get_FileNameW(i)
			if(oneByte === 0) break; //null terminated
			filenameBytes.push(oneByte);
			i++;
		}
		//this part assume filenameBytes are array of 16bit char
		var filenameStr = String.fromCharCode.apply(null, filenameBytes)
		// console.log(filenameStr, filenameStr.length)
		return filenameStr
	// var filenamestr = intArrayToString(filenameBytes)
	}
	
	var currFileName
	var currFileSize
	var currFileBuffer
	var currFileBufferEnd
	var currFileFlags
	
	while(res === ERAR_SUCCESS){
		currFileName = getFileName()
		console.log('filename: ', currFileName);
		currFileSize = header.get_UnpSize()
		currFileBuffer = new ArrayBuffer(currFileSize)
		currFileBufferEnd = 0
		
		currFileFlags = header.get_Flags()
		console.log("File continued from previous volume? ", currFileFlags&RHDF_SPLITBEFORE ?  'yes': 'no')
		console.log("File continued on next volume? ", currFileFlags&RHDF_SPLITAFTER ? 'yes': 'no')
		console.log("Previous files data is used (solid flag)? ", currFileFlags&RHDF_SOLID ? 'yes': 'no')
		
		// ***process file***
		// use RAR_TEST instead of RAR_EXTRACT
		// because there is some problem reading from
		// the extracted file in Emscripten file system
		var PFCode=_RARProcessFileW(handle,RAR_TEST,0,0);
		if(PFCode === ERAR_SUCCESS){
			returnVal.push({
				type: (currFileFlags & RHDF_DIRECTORY)?'dir':'file',
				fileName: currFileName,
				fileNameSplit: currFileName.split('/'),
				fileSize: currFileSize,
				content: new Uint8Array(currFileBuffer)
			})
		} else {
			cleanup()
			reportProcessFileError(PFCode)
			return null
		}
		res = _RARReadHeaderEx(handle, getPointer(header));
	}
	console.log(res)
	if(res !== ERAR_END_ARCHIVE){
		cleanup()
		reportReadHeaderError(res)
		return null
	}
	
	cleanup()
	
	//build up a directory tree-like structure
	var dirs = returnVal.filter(function(en) { return en.type === 'dir' }).sort(function(a, b) { return a.fileNameSplit.length - b.fileNameSplit.length })
	
	var files = returnVal.filter(function(en) { return en.type === 'file' }).sort(function(a, b) { return a.fileNameSplit.length - b.fileNameSplit.length })
	
	var rootDir = {type: 'dir', ls: {}}
	var mkdir = function(path) {
		var dir = rootDir
		path.forEach(function(p) {
			if(!(p in dir.ls)) {
				dir.ls[p] = {
					type: 'dir',
					ls: {}
				}
			}
			dir = dir.ls[p]
		})
	}
	dirs.forEach(function(e){ mkdir(e.fileNameSplit) })
	
	var putFile = function(entry){
		var fileName = entry.fileNameSplit.pop()
		var dir = rootDir
		entry.fileNameSplit.forEach(function(p){
			dir = dir.ls[p]
		})
		dir.ls[fileName] = {
			type: 'file',
			fullFileName: entry.fileName,
			fileSize: entry.fileSize,
			fileContent: entry.content
		}
	}
	files.forEach(putFile)
	
	return rootDir
}

// export
if (typeof process === 'object' && typeof require === 'function') { // NODE
  module.exports = readRARContent;
} else if (typeof define === "function" && define.amd) { // AMD
  define('readRARContent', [], function () { return readRARContent; });
} else if (typeof window === 'object') { // WEB
  window['readRARContent'] = readRARContent;
} else if (typeof importScripts === 'function') { // WORKER
  this['readRARContent'] = readRARContent;
}