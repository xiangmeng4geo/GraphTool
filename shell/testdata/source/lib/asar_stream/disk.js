(function() {
  var Filesystem, copyFileToSync, filesystemCache, fs, mkdirp, path, pickle, writeFileListToStream;

  fs = require('fs');

  path = require('path');

  mkdirp = require('./mkdirp');

  pickle = require('./chromium-pickle-js');

  Filesystem = require('./filesystem');

  filesystemCache = {};

  copyFileToSync = function(dest, src, filename) {
    var content, srcFile, stats, targetFile;
    srcFile = path.join(src, filename);
    targetFile = path.join(dest, filename);
    content = fs.readFileSync(srcFile);
    stats = fs.statSync(srcFile);
    mkdirp.sync(path.dirname(targetFile));
    return fs.writeFileSync(targetFile, content, {
      mode: stats.mode
    });
  };

  writeFileListToStream = function(dest, filesystem, out, list, callback) {
    var error, file, filename, stream;
    if (list.length === 0) {
      out.end();
      return callback(null);
    }
    file = list[0];
    if (file.unpack) {
      filename = path.relative(filesystem.src, file.filename);
      try {
        copyFileToSync("" + dest + ".unpacked", filesystem.src, filename);
      } catch (_error) {
        error = _error;
        return callback(error);
      }
      return writeFileListToStream(dest, filesystem, out, list.slice(1), callback);
    } else {
      stream = fs.createReadStream(file.filename);
      stream.on('error', callback);
      stream.on('end', function() {
        return writeFileListToStream(dest, filesystem, out, list.slice(1), callback);
      });
      return stream.pipe(out, {
        end: false
      });
    }
  };

  module.exports.writeFilesystem = function(dest, filesystem, files, callback) {
    var error, headerBuf, headerPickle, out, sizeBuf, sizePickle;
    try {
      headerPickle = pickle.createEmpty();
      headerPickle.writeString(JSON.stringify(filesystem.header));
      headerBuf = headerPickle.toBuffer();
      sizePickle = pickle.createEmpty();
      sizePickle.writeUInt32(headerBuf.length);
      sizeBuf = sizePickle.toBuffer();
    } catch (_error) {
      error = _error;
      return callback(error);
    }
    out = fs.createWriteStream(dest);
    out.on('error', callback);
    out.write(sizeBuf);
    return out.write(headerBuf, function() {
      return writeFileListToStream(dest, filesystem, out, files, callback);
    });
  };

  module.exports.readArchiveHeaderSync = function(archive) {
    var fd, header, headerBuf, headerPickle, size, sizeBuf, sizePickle;
    fd = fs.openSync(archive, 'r');
    try {
      sizeBuf = new Buffer(8);
      if (fs.readSync(fd, sizeBuf, 0, 8, null) !== 8) {
        throw new Error('Unable to read header size');
      }
      sizePickle = pickle.createFromBuffer(sizeBuf);
      size = sizePickle.createIterator().readUInt32();
      headerBuf = new Buffer(size);
      if (fs.readSync(fd, headerBuf, 0, size, null) !== size) {
        throw new Error('Unable to read header');
      }
    } finally {
      fs.closeSync(fd);
    }
    headerPickle = pickle.createFromBuffer(headerBuf);
    header = headerPickle.createIterator().readString();
    return {
      header: JSON.parse(header),
      headerSize: size
    };
  };

  module.exports.readFilesystemSync = function(archive) {
    var filesystem, header;
    if (!filesystemCache[archive]) {
      header = this.readArchiveHeaderSync(archive);
      filesystem = new Filesystem(archive);
      filesystem.header = header.header;
      filesystem.headerSize = header.headerSize;
      filesystemCache[archive] = filesystem;
    }
    return filesystemCache[archive];
  };

  module.exports.readFileSync = function(filesystem, filename, info) {
    var buffer, fd, offset;
    buffer = new Buffer(info.size);
    if (info.size <= 0) {
      return buffer;
    }
    if (info.unpacked) {
      buffer = fs.readFileSync(path.join("" + filesystem.src + ".unpacked", filename));
    } else {
      fd = fs.openSync(filesystem.src, 'r');
      try {
        offset = 8 + filesystem.headerSize + parseInt(info.offset);
        fs.readSync(fd, buffer, 0, info.size, offset);
      } finally {
        fs.closeSync(fd);
      }
    }
    return buffer;
  };

}).call(this);
