var fs = require('fs');
var path = require('path');
var stream = require('stream');
var util = require('util');
var Readable = stream.Readable;

var Filesystem = require('./filesystem');
var disk = require('./disk');
var mkdirp = require('./mkdirp');
var pickle = require('./chromium-pickle-js');

var PATH_TMP = require('os').tmpDir();

// 遍历目录
function readdir(asar_path, metadata) {
	if (fs.existsSync(asar_path)) {
		var files = asar.listPackage(asar_path);
		files.sort().forEach(function(fullName) {
			var stat = fs.lstatSync(fullName);
			if (stat.isFile()) {
				metadata[fullName] = {
					type: 'file',
					stat: stat
				};
			} else if (stat.isDirectory()) {
				metadata[fullName] = {
					type: 'directory',
					stat: stat
				};
			} else if (stat.isSymbolicLink()) {
				metadata[fullName] = {
					type: 'link',
					stat: stat
				};
			}
		});
		return files;
	}
	return null;
}

function readdir(asar_path, metadata) {
	if (fs.existsSync(asar_path)) {
		var stat = fs.statSync(asar_path);
		if (stat.isDirectory()) {
			var return_val = [];
			var files = fs.readdirSync(asar_path);
			files.sort().forEach(function(file) {
				var fullName = path.join(asar_path, file);
				var stat = fs.lstatSync(fullName);
				var isDir = false;
				if (stat.isFile()) {
					metadata[fullName] = {
						type: 'file',
						stat: stat
					};
				} else if ((isDir = stat.isDirectory())) {
					metadata[fullName] = {
						type: 'directory',
						stat: stat
					};
				} else if (stat.isSymbolicLink()) {
					metadata[fullName] = {
						type: 'link',
						stat: stat
					};
				}
				if (isDir) {
					var list = readdir(fullName, metadata);
					if (list) {
						return_val = return_val.concat(list);
					}
				}
				return_val.push(fullName);
			});
			return return_val;
		}
	}
}

function glob(asar_path) {
	var metadata = {};
	var filenames = readdir(asar_path, metadata);
	filenames.sort();
	return {
		filenames: filenames,
		metadata: metadata
	}
}

function listPackage() {
	return disk.readFilesystemSync(archive).listFiles();
}
function extractAll(archive, dest) {
	var content, destFilename, error, file, filename, filenames, filesystem, followLinks, linkDestPath, linkSrcPath, linkTo, relativePath, _i, _len, _results;
	filesystem = disk.readFilesystemSync(archive);
	filenames = filesystem.listFiles();
	followLinks = process.platform === 'win32';
	mkdirp.sync(dest);
	_results = [];
	for (_i = 0, _len = filenames.length; _i < _len; _i++) {
		filename = filenames[_i];
		filename = filename.substr(1);
		destFilename = path.join(dest, filename);
		file = filesystem.getFile(filename, followLinks);
		if (file.files) {
			_results.push(mkdirp.sync(destFilename));
		} else if (file.link) {
			linkSrcPath = path.dirname(path.join(dest, file.link));
			linkDestPath = path.dirname(destFilename);
			relativePath = path.relative(linkDestPath, linkSrcPath);
			try {
				fs.unlinkSync(destFilename);
			} catch (_error) {
				error = _error;
			}
			linkTo = path.join(relativePath, path.basename(file.link));
			_results.push(fs.symlinkSync(linkTo, destFilename));
		} else {
			content = disk.readFileSync(filesystem, filename, file);
			_results.push(fs.writeFileSync(destFilename, content));
		}
	}
	return _results;
}

function initFileSystem(src, filenames, metadata) {
	var filesystem = new Filesystem(src);
	var files = [];
	var filenamesSorted = filenames;
	for (var _m = 0, _len4 = filenamesSorted.length; _m < _len4; _m++) {
		filename = filenamesSorted[_m];
		file = metadata[filename];
		if (!file) {
			stat = fs.lstatSync(filename);
			if (stat.isDirectory()) {
				type = 'directory';
			}
			if (stat.isFile()) {
				type = 'file';
			}
			if (stat.isSymbolicLink()) {
				type = 'link';
			}
			file = {
				stat: stat,
				type: type
			};
		}
		var shouldUnpack = false;
		// filename = path.relative(src, filename);
		switch (file.type) {
			case 'directory':
				// shouldUnpack = options.unpackDir ? isUnpackDir(path.relative(src, filename), options.unpackDir) : false;
				filesystem.insertDirectory(filename, shouldUnpack);
				break;
			case 'file':
				files.push({
					filename: filename,
					unpack: shouldUnpack
				});
				filesystem.insertFile(filename, shouldUnpack, file.stat);
				break;
			case 'link':
				filesystem.insertLink(filename, file.stat);
		}
	}
	filesystem._files = files;
	return filesystem;
}

var AsarReader = function(asar_path, options) {
	if (options === undefined) {
		options = {};
	}
	Readable.call(this, options);
	asar_path = path.resolve(asar_path);
	var name = path.basename(asar_path);
	var src;
	if (fs.statSync(asar_path).isDirectory()) {
		src = asar_path;
	} else {
		src = path.join(PATH_TMP, name);
		extractAll(asar_path, src);
	}


	var data = glob(src);
	console.log('tmp_dir = ' + src);

	var filesystem = initFileSystem(src, data.filenames, data.metadata);
	this.filesystem = filesystem;
	var queue_bf = this.queue_bf = [];
	var error, headerBuf, headerPickle, out, sizeBuf, sizePickle;
	try {
		headerPickle = pickle.createEmpty();
		headerPickle.writeString(JSON.stringify(filesystem.header));
		headerBuf = headerPickle.toBuffer();
		sizePickle = pickle.createEmpty();
		sizePickle.writeUInt32(headerBuf.length);
		sizeBuf = sizePickle.toBuffer();
		queue_bf.push(sizeBuf);
		queue_bf.push(headerBuf);
	} catch (_error) {
		error = _error;
		console.log(error);
	}
}
util.inherits(AsarReader, Readable);
AsarReader.prototype._read = function() {
	var self = this;
	var bf;
	while ((bf = self.queue_bf.shift())) {
		self.push(bf);
	}
	var file;
	while ((file = self.filesystem._files.shift())) {
		var file_path = file.filename;
		var content = fs.readFileSync(file_path);
		self.push(content);
	}
	self.push(null);
};

exports.getStream = function(asar_path) {
	return new AsarReader(asar_path);
}