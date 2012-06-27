
var expect = require('expect.js')
  , assert = require('assert')
  , ref = require('ref')
  , Struct = require('ref-struct')
  , Library = require('../lib/library')
  , LIB_EXT = {
        'linux':  '.so'
      , 'linux2': '.so'
      , 'sunos':  '.so'
      , 'solaris':'.so'
      , 'darwin': '.dylib'
      , 'mac':    '.dylib'
      , 'win32':  '.dll'
    }[process.platform]

describe('Library', function () {

  var charPtr = ref.refType(ref.types.char)

  afterEach(gc)

  it('should be a function', function () {
    expect(Library).to.be.a('function')
  })

  it('should work with the `new` operator', function () {
    var l = new Library()
    expect(l).to.be.an('object')
  })

  it('should accept `null` as a first argument', function () {
    var thisFuncs = new Library(null, {
      'printf': [ 'void', [ charPtr ] ]
    })
    var test = thisFuncs.printf instanceof Function
    expect(test).to.be(true)
  })

  it('should accept a lib name as the first argument', function () {
    var lib = process.platform == 'win32' ? 'msvcrt' : 'libm'
    var libm = new Library(lib, {
        'ceil': [ 'double', [ 'double' ] ]
    })
    var test = libm.ceil instanceof Function
    expect(test).to.be(true)
    expect(libm.ceil(1.1)).to.equal(2)
  })

  it('should accept a lib name with file extension', function() {
    var lib = process.platform == 'win32'
      ? 'msvcrt.dll'
      : 'libm' + LIB_EXT
    var libm = new Library(lib, {
      'ceil': [ 'double', ['double'] ]
    })
    var test = libm.ceil instanceof Function
    expect(test).to.be(true)
    expect(libm.ceil(100.9)).to.equal(101)
  })

  it('should throw when an invalid function name is used', function () {
    expect(function () {
      new Library(null, {
          'doesnotexist__': [ 'void', [] ]
      })
    }).to.throwException()
  })

  it('should work with "strcpy" and a 128 length string', function () {
    var ZEROS_128 = Array(128 + 1).join('0')
    var buf = new Buffer(256)
    var strcpy = new Library(null, {
        'strcpy': [ charPtr, [ charPtr, 'string' ] ]
    }).strcpy
    strcpy(buf, ZEROS_128)
    expect(buf.readCString()).to.equal(ZEROS_128)
  })

  it('should work with "strcpy" and a 2k length string', function () {
    var ZEROS_2K = Array(2e3 + 1).join('0')
    var buf = new Buffer(4096)
    var strcpy = new Library(null, {
        'strcpy': [ charPtr, [ charPtr, 'string' ] ]
    }).strcpy
    strcpy(buf, ZEROS_2K)
    expect(buf.readCString()).to.equal(ZEROS_2K)
  })

  if (process.platform == 'win32') {

    it('should work with "GetTimeOfDay" and a "FILETIME" Struct pointer',
    function () {
      var FILETIME = new Struct({
          'dwLowDateTime': ref.types.uint32
        , 'dwHighDateTime': ref.types.uint32
      })
      var l = new Library('kernel32', {
          'GetSystemTimeAsFileTime': [ 'void', [ 'pointer' ]]
      })
      var ft = new FILETIME()
      l.GetSystemTimeAsFileTime(ft.ref())
      // TODO: Add an assert clause here...
    })

  } else {

    it('should work with "gettimeofday" and a "timeval" Struct pointer',
    function () {
      var timeval = new Struct({
          'tv_sec': ref.types.long
        , 'tv_usec': ref.types.long
      })
      var timevalPtr = ref.refType(timeval)
      var timezonePtr = ref.refType(ref.types.void)
      var l = new Library(null, {
          'gettimeofday': [ref.types.int, [timevalPtr, timezonePtr]]
      })
      var tv = new timeval()
      l.gettimeofday(tv.ref(), null)
      assert.equal(Math.floor(Date.now() / 1000), tv.tv_sec)
    })

  }

  describe('async', function () {

    it('should call a function asynchronously', function (done) {
      var lib = process.platform == 'win32' ? 'msvcrt' : 'libm'
      var libm = new Library(lib, {
          'ceil': [ 'double', [ 'double' ], { async: true } ]
      })
      libm.ceil(1.1, function (err, res) {
        expect(err).to.equal(null)
        expect(res).to.equal(2)
        done()
      })
    })

  })

})
