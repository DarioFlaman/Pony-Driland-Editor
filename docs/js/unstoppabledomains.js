(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":3,"ieee754":4}],4:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],5:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],6:[function(require,module,exports){
(function (global){(function (){
var unstoppabledomains = require('@unstoppabledomains/resolution');
global.window.unstoppabledomains = unstoppabledomains;
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"@unstoppabledomains/resolution":68}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "abi/5.5.0";

},{}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultAbiCoder = exports.AbiCoder = void 0;
// See: https://github.com/ethereum/wiki/wiki/Ethereum-Contract-ABI
var bytes_1 = require("@ethersproject/bytes");
var properties_1 = require("@ethersproject/properties");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var abstract_coder_1 = require("./coders/abstract-coder");
var address_1 = require("./coders/address");
var array_1 = require("./coders/array");
var boolean_1 = require("./coders/boolean");
var bytes_2 = require("./coders/bytes");
var fixed_bytes_1 = require("./coders/fixed-bytes");
var null_1 = require("./coders/null");
var number_1 = require("./coders/number");
var string_1 = require("./coders/string");
var tuple_1 = require("./coders/tuple");
var fragments_1 = require("./fragments");
var paramTypeBytes = new RegExp(/^bytes([0-9]*)$/);
var paramTypeNumber = new RegExp(/^(u?int)([0-9]*)$/);
var AbiCoder = /** @class */ (function () {
    function AbiCoder(coerceFunc) {
        var _newTarget = this.constructor;
        logger.checkNew(_newTarget, AbiCoder);
        (0, properties_1.defineReadOnly)(this, "coerceFunc", coerceFunc || null);
    }
    AbiCoder.prototype._getCoder = function (param) {
        var _this = this;
        switch (param.baseType) {
            case "address":
                return new address_1.AddressCoder(param.name);
            case "bool":
                return new boolean_1.BooleanCoder(param.name);
            case "string":
                return new string_1.StringCoder(param.name);
            case "bytes":
                return new bytes_2.BytesCoder(param.name);
            case "array":
                return new array_1.ArrayCoder(this._getCoder(param.arrayChildren), param.arrayLength, param.name);
            case "tuple":
                return new tuple_1.TupleCoder((param.components || []).map(function (component) {
                    return _this._getCoder(component);
                }), param.name);
            case "":
                return new null_1.NullCoder(param.name);
        }
        // u?int[0-9]*
        var match = param.type.match(paramTypeNumber);
        if (match) {
            var size = parseInt(match[2] || "256");
            if (size === 0 || size > 256 || (size % 8) !== 0) {
                logger.throwArgumentError("invalid " + match[1] + " bit length", "param", param);
            }
            return new number_1.NumberCoder(size / 8, (match[1] === "int"), param.name);
        }
        // bytes[0-9]+
        match = param.type.match(paramTypeBytes);
        if (match) {
            var size = parseInt(match[1]);
            if (size === 0 || size > 32) {
                logger.throwArgumentError("invalid bytes length", "param", param);
            }
            return new fixed_bytes_1.FixedBytesCoder(size, param.name);
        }
        return logger.throwArgumentError("invalid type", "type", param.type);
    };
    AbiCoder.prototype._getWordSize = function () { return 32; };
    AbiCoder.prototype._getReader = function (data, allowLoose) {
        return new abstract_coder_1.Reader(data, this._getWordSize(), this.coerceFunc, allowLoose);
    };
    AbiCoder.prototype._getWriter = function () {
        return new abstract_coder_1.Writer(this._getWordSize());
    };
    AbiCoder.prototype.getDefaultValue = function (types) {
        var _this = this;
        var coders = types.map(function (type) { return _this._getCoder(fragments_1.ParamType.from(type)); });
        var coder = new tuple_1.TupleCoder(coders, "_");
        return coder.defaultValue();
    };
    AbiCoder.prototype.encode = function (types, values) {
        var _this = this;
        if (types.length !== values.length) {
            logger.throwError("types/values length mismatch", logger_1.Logger.errors.INVALID_ARGUMENT, {
                count: { types: types.length, values: values.length },
                value: { types: types, values: values }
            });
        }
        var coders = types.map(function (type) { return _this._getCoder(fragments_1.ParamType.from(type)); });
        var coder = (new tuple_1.TupleCoder(coders, "_"));
        var writer = this._getWriter();
        coder.encode(writer, values);
        return writer.data;
    };
    AbiCoder.prototype.decode = function (types, data, loose) {
        var _this = this;
        var coders = types.map(function (type) { return _this._getCoder(fragments_1.ParamType.from(type)); });
        var coder = new tuple_1.TupleCoder(coders, "_");
        return coder.decode(this._getReader((0, bytes_1.arrayify)(data), loose));
    };
    return AbiCoder;
}());
exports.AbiCoder = AbiCoder;
exports.defaultAbiCoder = new AbiCoder();

},{"./_version":7,"./coders/abstract-coder":9,"./coders/address":10,"./coders/array":12,"./coders/boolean":13,"./coders/bytes":14,"./coders/fixed-bytes":15,"./coders/null":16,"./coders/number":17,"./coders/string":18,"./coders/tuple":19,"./fragments":20,"@ethersproject/bytes":30,"@ethersproject/logger":44,"@ethersproject/properties":46}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Reader = exports.Writer = exports.Coder = exports.checkResultErrors = void 0;
var bytes_1 = require("@ethersproject/bytes");
var bignumber_1 = require("@ethersproject/bignumber");
var properties_1 = require("@ethersproject/properties");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("../_version");
var logger = new logger_1.Logger(_version_1.version);
function checkResultErrors(result) {
    // Find the first error (if any)
    var errors = [];
    var checkErrors = function (path, object) {
        if (!Array.isArray(object)) {
            return;
        }
        for (var key in object) {
            var childPath = path.slice();
            childPath.push(key);
            try {
                checkErrors(childPath, object[key]);
            }
            catch (error) {
                errors.push({ path: childPath, error: error });
            }
        }
    };
    checkErrors([], result);
    return errors;
}
exports.checkResultErrors = checkResultErrors;
var Coder = /** @class */ (function () {
    function Coder(name, type, localName, dynamic) {
        // @TODO: defineReadOnly these
        this.name = name;
        this.type = type;
        this.localName = localName;
        this.dynamic = dynamic;
    }
    Coder.prototype._throwError = function (message, value) {
        logger.throwArgumentError(message, this.localName, value);
    };
    return Coder;
}());
exports.Coder = Coder;
var Writer = /** @class */ (function () {
    function Writer(wordSize) {
        (0, properties_1.defineReadOnly)(this, "wordSize", wordSize || 32);
        this._data = [];
        this._dataLength = 0;
        this._padding = new Uint8Array(wordSize);
    }
    Object.defineProperty(Writer.prototype, "data", {
        get: function () {
            return (0, bytes_1.hexConcat)(this._data);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Writer.prototype, "length", {
        get: function () { return this._dataLength; },
        enumerable: false,
        configurable: true
    });
    Writer.prototype._writeData = function (data) {
        this._data.push(data);
        this._dataLength += data.length;
        return data.length;
    };
    Writer.prototype.appendWriter = function (writer) {
        return this._writeData((0, bytes_1.concat)(writer._data));
    };
    // Arrayish items; padded on the right to wordSize
    Writer.prototype.writeBytes = function (value) {
        var bytes = (0, bytes_1.arrayify)(value);
        var paddingOffset = bytes.length % this.wordSize;
        if (paddingOffset) {
            bytes = (0, bytes_1.concat)([bytes, this._padding.slice(paddingOffset)]);
        }
        return this._writeData(bytes);
    };
    Writer.prototype._getValue = function (value) {
        var bytes = (0, bytes_1.arrayify)(bignumber_1.BigNumber.from(value));
        if (bytes.length > this.wordSize) {
            logger.throwError("value out-of-bounds", logger_1.Logger.errors.BUFFER_OVERRUN, {
                length: this.wordSize,
                offset: bytes.length
            });
        }
        if (bytes.length % this.wordSize) {
            bytes = (0, bytes_1.concat)([this._padding.slice(bytes.length % this.wordSize), bytes]);
        }
        return bytes;
    };
    // BigNumberish items; padded on the left to wordSize
    Writer.prototype.writeValue = function (value) {
        return this._writeData(this._getValue(value));
    };
    Writer.prototype.writeUpdatableValue = function () {
        var _this = this;
        var offset = this._data.length;
        this._data.push(this._padding);
        this._dataLength += this.wordSize;
        return function (value) {
            _this._data[offset] = _this._getValue(value);
        };
    };
    return Writer;
}());
exports.Writer = Writer;
var Reader = /** @class */ (function () {
    function Reader(data, wordSize, coerceFunc, allowLoose) {
        (0, properties_1.defineReadOnly)(this, "_data", (0, bytes_1.arrayify)(data));
        (0, properties_1.defineReadOnly)(this, "wordSize", wordSize || 32);
        (0, properties_1.defineReadOnly)(this, "_coerceFunc", coerceFunc);
        (0, properties_1.defineReadOnly)(this, "allowLoose", allowLoose);
        this._offset = 0;
    }
    Object.defineProperty(Reader.prototype, "data", {
        get: function () { return (0, bytes_1.hexlify)(this._data); },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Reader.prototype, "consumed", {
        get: function () { return this._offset; },
        enumerable: false,
        configurable: true
    });
    // The default Coerce function
    Reader.coerce = function (name, value) {
        var match = name.match("^u?int([0-9]+)$");
        if (match && parseInt(match[1]) <= 48) {
            value = value.toNumber();
        }
        return value;
    };
    Reader.prototype.coerce = function (name, value) {
        if (this._coerceFunc) {
            return this._coerceFunc(name, value);
        }
        return Reader.coerce(name, value);
    };
    Reader.prototype._peekBytes = function (offset, length, loose) {
        var alignedLength = Math.ceil(length / this.wordSize) * this.wordSize;
        if (this._offset + alignedLength > this._data.length) {
            if (this.allowLoose && loose && this._offset + length <= this._data.length) {
                alignedLength = length;
            }
            else {
                logger.throwError("data out-of-bounds", logger_1.Logger.errors.BUFFER_OVERRUN, {
                    length: this._data.length,
                    offset: this._offset + alignedLength
                });
            }
        }
        return this._data.slice(this._offset, this._offset + alignedLength);
    };
    Reader.prototype.subReader = function (offset) {
        return new Reader(this._data.slice(this._offset + offset), this.wordSize, this._coerceFunc, this.allowLoose);
    };
    Reader.prototype.readBytes = function (length, loose) {
        var bytes = this._peekBytes(0, length, !!loose);
        this._offset += bytes.length;
        // @TODO: Make sure the length..end bytes are all 0?
        return bytes.slice(0, length);
    };
    Reader.prototype.readValue = function () {
        return bignumber_1.BigNumber.from(this.readBytes(this.wordSize));
    };
    return Reader;
}());
exports.Reader = Reader;

},{"../_version":7,"@ethersproject/bignumber":28,"@ethersproject/bytes":30,"@ethersproject/logger":44,"@ethersproject/properties":46}],10:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressCoder = void 0;
var address_1 = require("@ethersproject/address");
var bytes_1 = require("@ethersproject/bytes");
var abstract_coder_1 = require("./abstract-coder");
var AddressCoder = /** @class */ (function (_super) {
    __extends(AddressCoder, _super);
    function AddressCoder(localName) {
        return _super.call(this, "address", "address", localName, false) || this;
    }
    AddressCoder.prototype.defaultValue = function () {
        return "0x0000000000000000000000000000000000000000";
    };
    AddressCoder.prototype.encode = function (writer, value) {
        try {
            value = (0, address_1.getAddress)(value);
        }
        catch (error) {
            this._throwError(error.message, value);
        }
        return writer.writeValue(value);
    };
    AddressCoder.prototype.decode = function (reader) {
        return (0, address_1.getAddress)((0, bytes_1.hexZeroPad)(reader.readValue().toHexString(), 20));
    };
    return AddressCoder;
}(abstract_coder_1.Coder));
exports.AddressCoder = AddressCoder;

},{"./abstract-coder":9,"@ethersproject/address":24,"@ethersproject/bytes":30}],11:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnonymousCoder = void 0;
var abstract_coder_1 = require("./abstract-coder");
// Clones the functionality of an existing Coder, but without a localName
var AnonymousCoder = /** @class */ (function (_super) {
    __extends(AnonymousCoder, _super);
    function AnonymousCoder(coder) {
        var _this = _super.call(this, coder.name, coder.type, undefined, coder.dynamic) || this;
        _this.coder = coder;
        return _this;
    }
    AnonymousCoder.prototype.defaultValue = function () {
        return this.coder.defaultValue();
    };
    AnonymousCoder.prototype.encode = function (writer, value) {
        return this.coder.encode(writer, value);
    };
    AnonymousCoder.prototype.decode = function (reader) {
        return this.coder.decode(reader);
    };
    return AnonymousCoder;
}(abstract_coder_1.Coder));
exports.AnonymousCoder = AnonymousCoder;

},{"./abstract-coder":9}],12:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayCoder = exports.unpack = exports.pack = void 0;
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("../_version");
var logger = new logger_1.Logger(_version_1.version);
var abstract_coder_1 = require("./abstract-coder");
var anonymous_1 = require("./anonymous");
function pack(writer, coders, values) {
    var arrayValues = null;
    if (Array.isArray(values)) {
        arrayValues = values;
    }
    else if (values && typeof (values) === "object") {
        var unique_1 = {};
        arrayValues = coders.map(function (coder) {
            var name = coder.localName;
            if (!name) {
                logger.throwError("cannot encode object for signature with missing names", logger_1.Logger.errors.INVALID_ARGUMENT, {
                    argument: "values",
                    coder: coder,
                    value: values
                });
            }
            if (unique_1[name]) {
                logger.throwError("cannot encode object for signature with duplicate names", logger_1.Logger.errors.INVALID_ARGUMENT, {
                    argument: "values",
                    coder: coder,
                    value: values
                });
            }
            unique_1[name] = true;
            return values[name];
        });
    }
    else {
        logger.throwArgumentError("invalid tuple value", "tuple", values);
    }
    if (coders.length !== arrayValues.length) {
        logger.throwArgumentError("types/value length mismatch", "tuple", values);
    }
    var staticWriter = new abstract_coder_1.Writer(writer.wordSize);
    var dynamicWriter = new abstract_coder_1.Writer(writer.wordSize);
    var updateFuncs = [];
    coders.forEach(function (coder, index) {
        var value = arrayValues[index];
        if (coder.dynamic) {
            // Get current dynamic offset (for the future pointer)
            var dynamicOffset_1 = dynamicWriter.length;
            // Encode the dynamic value into the dynamicWriter
            coder.encode(dynamicWriter, value);
            // Prepare to populate the correct offset once we are done
            var updateFunc_1 = staticWriter.writeUpdatableValue();
            updateFuncs.push(function (baseOffset) {
                updateFunc_1(baseOffset + dynamicOffset_1);
            });
        }
        else {
            coder.encode(staticWriter, value);
        }
    });
    // Backfill all the dynamic offsets, now that we know the static length
    updateFuncs.forEach(function (func) { func(staticWriter.length); });
    var length = writer.appendWriter(staticWriter);
    length += writer.appendWriter(dynamicWriter);
    return length;
}
exports.pack = pack;
function unpack(reader, coders) {
    var values = [];
    // A reader anchored to this base
    var baseReader = reader.subReader(0);
    coders.forEach(function (coder) {
        var value = null;
        if (coder.dynamic) {
            var offset = reader.readValue();
            var offsetReader = baseReader.subReader(offset.toNumber());
            try {
                value = coder.decode(offsetReader);
            }
            catch (error) {
                // Cannot recover from this
                if (error.code === logger_1.Logger.errors.BUFFER_OVERRUN) {
                    throw error;
                }
                value = error;
                value.baseType = coder.name;
                value.name = coder.localName;
                value.type = coder.type;
            }
        }
        else {
            try {
                value = coder.decode(reader);
            }
            catch (error) {
                // Cannot recover from this
                if (error.code === logger_1.Logger.errors.BUFFER_OVERRUN) {
                    throw error;
                }
                value = error;
                value.baseType = coder.name;
                value.name = coder.localName;
                value.type = coder.type;
            }
        }
        if (value != undefined) {
            values.push(value);
        }
    });
    // We only output named properties for uniquely named coders
    var uniqueNames = coders.reduce(function (accum, coder) {
        var name = coder.localName;
        if (name) {
            if (!accum[name]) {
                accum[name] = 0;
            }
            accum[name]++;
        }
        return accum;
    }, {});
    // Add any named parameters (i.e. tuples)
    coders.forEach(function (coder, index) {
        var name = coder.localName;
        if (!name || uniqueNames[name] !== 1) {
            return;
        }
        if (name === "length") {
            name = "_length";
        }
        if (values[name] != null) {
            return;
        }
        var value = values[index];
        if (value instanceof Error) {
            Object.defineProperty(values, name, {
                enumerable: true,
                get: function () { throw value; }
            });
        }
        else {
            values[name] = value;
        }
    });
    var _loop_1 = function (i) {
        var value = values[i];
        if (value instanceof Error) {
            Object.defineProperty(values, i, {
                enumerable: true,
                get: function () { throw value; }
            });
        }
    };
    for (var i = 0; i < values.length; i++) {
        _loop_1(i);
    }
    return Object.freeze(values);
}
exports.unpack = unpack;
var ArrayCoder = /** @class */ (function (_super) {
    __extends(ArrayCoder, _super);
    function ArrayCoder(coder, length, localName) {
        var _this = this;
        var type = (coder.type + "[" + (length >= 0 ? length : "") + "]");
        var dynamic = (length === -1 || coder.dynamic);
        _this = _super.call(this, "array", type, localName, dynamic) || this;
        _this.coder = coder;
        _this.length = length;
        return _this;
    }
    ArrayCoder.prototype.defaultValue = function () {
        // Verifies the child coder is valid (even if the array is dynamic or 0-length)
        var defaultChild = this.coder.defaultValue();
        var result = [];
        for (var i = 0; i < this.length; i++) {
            result.push(defaultChild);
        }
        return result;
    };
    ArrayCoder.prototype.encode = function (writer, value) {
        if (!Array.isArray(value)) {
            this._throwError("expected array value", value);
        }
        var count = this.length;
        if (count === -1) {
            count = value.length;
            writer.writeValue(value.length);
        }
        logger.checkArgumentCount(value.length, count, "coder array" + (this.localName ? (" " + this.localName) : ""));
        var coders = [];
        for (var i = 0; i < value.length; i++) {
            coders.push(this.coder);
        }
        return pack(writer, coders, value);
    };
    ArrayCoder.prototype.decode = function (reader) {
        var count = this.length;
        if (count === -1) {
            count = reader.readValue().toNumber();
            // Check that there is *roughly* enough data to ensure
            // stray random data is not being read as a length. Each
            // slot requires at least 32 bytes for their value (or 32
            // bytes as a link to the data). This could use a much
            // tighter bound, but we are erroring on the side of safety.
            if (count * 32 > reader._data.length) {
                logger.throwError("insufficient data length", logger_1.Logger.errors.BUFFER_OVERRUN, {
                    length: reader._data.length,
                    count: count
                });
            }
        }
        var coders = [];
        for (var i = 0; i < count; i++) {
            coders.push(new anonymous_1.AnonymousCoder(this.coder));
        }
        return reader.coerce(this.name, unpack(reader, coders));
    };
    return ArrayCoder;
}(abstract_coder_1.Coder));
exports.ArrayCoder = ArrayCoder;

},{"../_version":7,"./abstract-coder":9,"./anonymous":11,"@ethersproject/logger":44}],13:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BooleanCoder = void 0;
var abstract_coder_1 = require("./abstract-coder");
var BooleanCoder = /** @class */ (function (_super) {
    __extends(BooleanCoder, _super);
    function BooleanCoder(localName) {
        return _super.call(this, "bool", "bool", localName, false) || this;
    }
    BooleanCoder.prototype.defaultValue = function () {
        return false;
    };
    BooleanCoder.prototype.encode = function (writer, value) {
        return writer.writeValue(value ? 1 : 0);
    };
    BooleanCoder.prototype.decode = function (reader) {
        return reader.coerce(this.type, !reader.readValue().isZero());
    };
    return BooleanCoder;
}(abstract_coder_1.Coder));
exports.BooleanCoder = BooleanCoder;

},{"./abstract-coder":9}],14:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytesCoder = exports.DynamicBytesCoder = void 0;
var bytes_1 = require("@ethersproject/bytes");
var abstract_coder_1 = require("./abstract-coder");
var DynamicBytesCoder = /** @class */ (function (_super) {
    __extends(DynamicBytesCoder, _super);
    function DynamicBytesCoder(type, localName) {
        return _super.call(this, type, type, localName, true) || this;
    }
    DynamicBytesCoder.prototype.defaultValue = function () {
        return "0x";
    };
    DynamicBytesCoder.prototype.encode = function (writer, value) {
        value = (0, bytes_1.arrayify)(value);
        var length = writer.writeValue(value.length);
        length += writer.writeBytes(value);
        return length;
    };
    DynamicBytesCoder.prototype.decode = function (reader) {
        return reader.readBytes(reader.readValue().toNumber(), true);
    };
    return DynamicBytesCoder;
}(abstract_coder_1.Coder));
exports.DynamicBytesCoder = DynamicBytesCoder;
var BytesCoder = /** @class */ (function (_super) {
    __extends(BytesCoder, _super);
    function BytesCoder(localName) {
        return _super.call(this, "bytes", localName) || this;
    }
    BytesCoder.prototype.decode = function (reader) {
        return reader.coerce(this.name, (0, bytes_1.hexlify)(_super.prototype.decode.call(this, reader)));
    };
    return BytesCoder;
}(DynamicBytesCoder));
exports.BytesCoder = BytesCoder;

},{"./abstract-coder":9,"@ethersproject/bytes":30}],15:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedBytesCoder = void 0;
var bytes_1 = require("@ethersproject/bytes");
var abstract_coder_1 = require("./abstract-coder");
// @TODO: Merge this with bytes
var FixedBytesCoder = /** @class */ (function (_super) {
    __extends(FixedBytesCoder, _super);
    function FixedBytesCoder(size, localName) {
        var _this = this;
        var name = "bytes" + String(size);
        _this = _super.call(this, name, name, localName, false) || this;
        _this.size = size;
        return _this;
    }
    FixedBytesCoder.prototype.defaultValue = function () {
        return ("0x0000000000000000000000000000000000000000000000000000000000000000").substring(0, 2 + this.size * 2);
    };
    FixedBytesCoder.prototype.encode = function (writer, value) {
        var data = (0, bytes_1.arrayify)(value);
        if (data.length !== this.size) {
            this._throwError("incorrect data length", value);
        }
        return writer.writeBytes(data);
    };
    FixedBytesCoder.prototype.decode = function (reader) {
        return reader.coerce(this.name, (0, bytes_1.hexlify)(reader.readBytes(this.size)));
    };
    return FixedBytesCoder;
}(abstract_coder_1.Coder));
exports.FixedBytesCoder = FixedBytesCoder;

},{"./abstract-coder":9,"@ethersproject/bytes":30}],16:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullCoder = void 0;
var abstract_coder_1 = require("./abstract-coder");
var NullCoder = /** @class */ (function (_super) {
    __extends(NullCoder, _super);
    function NullCoder(localName) {
        return _super.call(this, "null", "", localName, false) || this;
    }
    NullCoder.prototype.defaultValue = function () {
        return null;
    };
    NullCoder.prototype.encode = function (writer, value) {
        if (value != null) {
            this._throwError("not null", value);
        }
        return writer.writeBytes([]);
    };
    NullCoder.prototype.decode = function (reader) {
        reader.readBytes(0);
        return reader.coerce(this.name, null);
    };
    return NullCoder;
}(abstract_coder_1.Coder));
exports.NullCoder = NullCoder;

},{"./abstract-coder":9}],17:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberCoder = void 0;
var bignumber_1 = require("@ethersproject/bignumber");
var constants_1 = require("@ethersproject/constants");
var abstract_coder_1 = require("./abstract-coder");
var NumberCoder = /** @class */ (function (_super) {
    __extends(NumberCoder, _super);
    function NumberCoder(size, signed, localName) {
        var _this = this;
        var name = ((signed ? "int" : "uint") + (size * 8));
        _this = _super.call(this, name, name, localName, false) || this;
        _this.size = size;
        _this.signed = signed;
        return _this;
    }
    NumberCoder.prototype.defaultValue = function () {
        return 0;
    };
    NumberCoder.prototype.encode = function (writer, value) {
        var v = bignumber_1.BigNumber.from(value);
        // Check bounds are safe for encoding
        var maxUintValue = constants_1.MaxUint256.mask(writer.wordSize * 8);
        if (this.signed) {
            var bounds = maxUintValue.mask(this.size * 8 - 1);
            if (v.gt(bounds) || v.lt(bounds.add(constants_1.One).mul(constants_1.NegativeOne))) {
                this._throwError("value out-of-bounds", value);
            }
        }
        else if (v.lt(constants_1.Zero) || v.gt(maxUintValue.mask(this.size * 8))) {
            this._throwError("value out-of-bounds", value);
        }
        v = v.toTwos(this.size * 8).mask(this.size * 8);
        if (this.signed) {
            v = v.fromTwos(this.size * 8).toTwos(8 * writer.wordSize);
        }
        return writer.writeValue(v);
    };
    NumberCoder.prototype.decode = function (reader) {
        var value = reader.readValue().mask(this.size * 8);
        if (this.signed) {
            value = value.fromTwos(this.size * 8);
        }
        return reader.coerce(this.name, value);
    };
    return NumberCoder;
}(abstract_coder_1.Coder));
exports.NumberCoder = NumberCoder;

},{"./abstract-coder":9,"@ethersproject/bignumber":28,"@ethersproject/constants":34}],18:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringCoder = void 0;
var strings_1 = require("@ethersproject/strings");
var bytes_1 = require("./bytes");
var StringCoder = /** @class */ (function (_super) {
    __extends(StringCoder, _super);
    function StringCoder(localName) {
        return _super.call(this, "string", localName) || this;
    }
    StringCoder.prototype.defaultValue = function () {
        return "";
    };
    StringCoder.prototype.encode = function (writer, value) {
        return _super.prototype.encode.call(this, writer, (0, strings_1.toUtf8Bytes)(value));
    };
    StringCoder.prototype.decode = function (reader) {
        return (0, strings_1.toUtf8String)(_super.prototype.decode.call(this, reader));
    };
    return StringCoder;
}(bytes_1.DynamicBytesCoder));
exports.StringCoder = StringCoder;

},{"./bytes":14,"@ethersproject/strings":52}],19:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TupleCoder = void 0;
var abstract_coder_1 = require("./abstract-coder");
var array_1 = require("./array");
var TupleCoder = /** @class */ (function (_super) {
    __extends(TupleCoder, _super);
    function TupleCoder(coders, localName) {
        var _this = this;
        var dynamic = false;
        var types = [];
        coders.forEach(function (coder) {
            if (coder.dynamic) {
                dynamic = true;
            }
            types.push(coder.type);
        });
        var type = ("tuple(" + types.join(",") + ")");
        _this = _super.call(this, "tuple", type, localName, dynamic) || this;
        _this.coders = coders;
        return _this;
    }
    TupleCoder.prototype.defaultValue = function () {
        var values = [];
        this.coders.forEach(function (coder) {
            values.push(coder.defaultValue());
        });
        // We only output named properties for uniquely named coders
        var uniqueNames = this.coders.reduce(function (accum, coder) {
            var name = coder.localName;
            if (name) {
                if (!accum[name]) {
                    accum[name] = 0;
                }
                accum[name]++;
            }
            return accum;
        }, {});
        // Add named values
        this.coders.forEach(function (coder, index) {
            var name = coder.localName;
            if (!name || uniqueNames[name] !== 1) {
                return;
            }
            if (name === "length") {
                name = "_length";
            }
            if (values[name] != null) {
                return;
            }
            values[name] = values[index];
        });
        return Object.freeze(values);
    };
    TupleCoder.prototype.encode = function (writer, value) {
        return (0, array_1.pack)(writer, this.coders, value);
    };
    TupleCoder.prototype.decode = function (reader) {
        return reader.coerce(this.name, (0, array_1.unpack)(reader, this.coders));
    };
    return TupleCoder;
}(abstract_coder_1.Coder));
exports.TupleCoder = TupleCoder;

},{"./abstract-coder":9,"./array":12}],20:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFragment = exports.FunctionFragment = exports.ConstructorFragment = exports.EventFragment = exports.Fragment = exports.ParamType = exports.FormatTypes = void 0;
var bignumber_1 = require("@ethersproject/bignumber");
var properties_1 = require("@ethersproject/properties");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
;
var _constructorGuard = {};
var ModifiersBytes = { calldata: true, memory: true, storage: true };
var ModifiersNest = { calldata: true, memory: true };
function checkModifier(type, name) {
    if (type === "bytes" || type === "string") {
        if (ModifiersBytes[name]) {
            return true;
        }
    }
    else if (type === "address") {
        if (name === "payable") {
            return true;
        }
    }
    else if (type.indexOf("[") >= 0 || type === "tuple") {
        if (ModifiersNest[name]) {
            return true;
        }
    }
    if (ModifiersBytes[name] || name === "payable") {
        logger.throwArgumentError("invalid modifier", "name", name);
    }
    return false;
}
// @TODO: Make sure that children of an indexed tuple are marked with a null indexed
function parseParamType(param, allowIndexed) {
    var originalParam = param;
    function throwError(i) {
        logger.throwArgumentError("unexpected character at position " + i, "param", param);
    }
    param = param.replace(/\s/g, " ");
    function newNode(parent) {
        var node = { type: "", name: "", parent: parent, state: { allowType: true } };
        if (allowIndexed) {
            node.indexed = false;
        }
        return node;
    }
    var parent = { type: "", name: "", state: { allowType: true } };
    var node = parent;
    for (var i = 0; i < param.length; i++) {
        var c = param[i];
        switch (c) {
            case "(":
                if (node.state.allowType && node.type === "") {
                    node.type = "tuple";
                }
                else if (!node.state.allowParams) {
                    throwError(i);
                }
                node.state.allowType = false;
                node.type = verifyType(node.type);
                node.components = [newNode(node)];
                node = node.components[0];
                break;
            case ")":
                delete node.state;
                if (node.name === "indexed") {
                    if (!allowIndexed) {
                        throwError(i);
                    }
                    node.indexed = true;
                    node.name = "";
                }
                if (checkModifier(node.type, node.name)) {
                    node.name = "";
                }
                node.type = verifyType(node.type);
                var child = node;
                node = node.parent;
                if (!node) {
                    throwError(i);
                }
                delete child.parent;
                node.state.allowParams = false;
                node.state.allowName = true;
                node.state.allowArray = true;
                break;
            case ",":
                delete node.state;
                if (node.name === "indexed") {
                    if (!allowIndexed) {
                        throwError(i);
                    }
                    node.indexed = true;
                    node.name = "";
                }
                if (checkModifier(node.type, node.name)) {
                    node.name = "";
                }
                node.type = verifyType(node.type);
                var sibling = newNode(node.parent);
                //{ type: "", name: "", parent: node.parent, state: { allowType: true } };
                node.parent.components.push(sibling);
                delete node.parent;
                node = sibling;
                break;
            // Hit a space...
            case " ":
                // If reading type, the type is done and may read a param or name
                if (node.state.allowType) {
                    if (node.type !== "") {
                        node.type = verifyType(node.type);
                        delete node.state.allowType;
                        node.state.allowName = true;
                        node.state.allowParams = true;
                    }
                }
                // If reading name, the name is done
                if (node.state.allowName) {
                    if (node.name !== "") {
                        if (node.name === "indexed") {
                            if (!allowIndexed) {
                                throwError(i);
                            }
                            if (node.indexed) {
                                throwError(i);
                            }
                            node.indexed = true;
                            node.name = "";
                        }
                        else if (checkModifier(node.type, node.name)) {
                            node.name = "";
                        }
                        else {
                            node.state.allowName = false;
                        }
                    }
                }
                break;
            case "[":
                if (!node.state.allowArray) {
                    throwError(i);
                }
                node.type += c;
                node.state.allowArray = false;
                node.state.allowName = false;
                node.state.readArray = true;
                break;
            case "]":
                if (!node.state.readArray) {
                    throwError(i);
                }
                node.type += c;
                node.state.readArray = false;
                node.state.allowArray = true;
                node.state.allowName = true;
                break;
            default:
                if (node.state.allowType) {
                    node.type += c;
                    node.state.allowParams = true;
                    node.state.allowArray = true;
                }
                else if (node.state.allowName) {
                    node.name += c;
                    delete node.state.allowArray;
                }
                else if (node.state.readArray) {
                    node.type += c;
                }
                else {
                    throwError(i);
                }
        }
    }
    if (node.parent) {
        logger.throwArgumentError("unexpected eof", "param", param);
    }
    delete parent.state;
    if (node.name === "indexed") {
        if (!allowIndexed) {
            throwError(originalParam.length - 7);
        }
        if (node.indexed) {
            throwError(originalParam.length - 7);
        }
        node.indexed = true;
        node.name = "";
    }
    else if (checkModifier(node.type, node.name)) {
        node.name = "";
    }
    parent.type = verifyType(parent.type);
    return parent;
}
function populate(object, params) {
    for (var key in params) {
        (0, properties_1.defineReadOnly)(object, key, params[key]);
    }
}
exports.FormatTypes = Object.freeze({
    // Bare formatting, as is needed for computing a sighash of an event or function
    sighash: "sighash",
    // Human-Readable with Minimal spacing and without names (compact human-readable)
    minimal: "minimal",
    // Human-Readable with nice spacing, including all names
    full: "full",
    // JSON-format a la Solidity
    json: "json"
});
var paramTypeArray = new RegExp(/^(.*)\[([0-9]*)\]$/);
var ParamType = /** @class */ (function () {
    function ParamType(constructorGuard, params) {
        if (constructorGuard !== _constructorGuard) {
            logger.throwError("use fromString", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "new ParamType()"
            });
        }
        populate(this, params);
        var match = this.type.match(paramTypeArray);
        if (match) {
            populate(this, {
                arrayLength: parseInt(match[2] || "-1"),
                arrayChildren: ParamType.fromObject({
                    type: match[1],
                    components: this.components
                }),
                baseType: "array"
            });
        }
        else {
            populate(this, {
                arrayLength: null,
                arrayChildren: null,
                baseType: ((this.components != null) ? "tuple" : this.type)
            });
        }
        this._isParamType = true;
        Object.freeze(this);
    }
    // Format the parameter fragment
    //   - sighash: "(uint256,address)"
    //   - minimal: "tuple(uint256,address) indexed"
    //   - full:    "tuple(uint256 foo, address bar) indexed baz"
    ParamType.prototype.format = function (format) {
        if (!format) {
            format = exports.FormatTypes.sighash;
        }
        if (!exports.FormatTypes[format]) {
            logger.throwArgumentError("invalid format type", "format", format);
        }
        if (format === exports.FormatTypes.json) {
            var result_1 = {
                type: ((this.baseType === "tuple") ? "tuple" : this.type),
                name: (this.name || undefined)
            };
            if (typeof (this.indexed) === "boolean") {
                result_1.indexed = this.indexed;
            }
            if (this.components) {
                result_1.components = this.components.map(function (comp) { return JSON.parse(comp.format(format)); });
            }
            return JSON.stringify(result_1);
        }
        var result = "";
        // Array
        if (this.baseType === "array") {
            result += this.arrayChildren.format(format);
            result += "[" + (this.arrayLength < 0 ? "" : String(this.arrayLength)) + "]";
        }
        else {
            if (this.baseType === "tuple") {
                if (format !== exports.FormatTypes.sighash) {
                    result += this.type;
                }
                result += "(" + this.components.map(function (comp) { return comp.format(format); }).join((format === exports.FormatTypes.full) ? ", " : ",") + ")";
            }
            else {
                result += this.type;
            }
        }
        if (format !== exports.FormatTypes.sighash) {
            if (this.indexed === true) {
                result += " indexed";
            }
            if (format === exports.FormatTypes.full && this.name) {
                result += " " + this.name;
            }
        }
        return result;
    };
    ParamType.from = function (value, allowIndexed) {
        if (typeof (value) === "string") {
            return ParamType.fromString(value, allowIndexed);
        }
        return ParamType.fromObject(value);
    };
    ParamType.fromObject = function (value) {
        if (ParamType.isParamType(value)) {
            return value;
        }
        return new ParamType(_constructorGuard, {
            name: (value.name || null),
            type: verifyType(value.type),
            indexed: ((value.indexed == null) ? null : !!value.indexed),
            components: (value.components ? value.components.map(ParamType.fromObject) : null)
        });
    };
    ParamType.fromString = function (value, allowIndexed) {
        function ParamTypify(node) {
            return ParamType.fromObject({
                name: node.name,
                type: node.type,
                indexed: node.indexed,
                components: node.components
            });
        }
        return ParamTypify(parseParamType(value, !!allowIndexed));
    };
    ParamType.isParamType = function (value) {
        return !!(value != null && value._isParamType);
    };
    return ParamType;
}());
exports.ParamType = ParamType;
;
function parseParams(value, allowIndex) {
    return splitNesting(value).map(function (param) { return ParamType.fromString(param, allowIndex); });
}
var Fragment = /** @class */ (function () {
    function Fragment(constructorGuard, params) {
        if (constructorGuard !== _constructorGuard) {
            logger.throwError("use a static from method", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "new Fragment()"
            });
        }
        populate(this, params);
        this._isFragment = true;
        Object.freeze(this);
    }
    Fragment.from = function (value) {
        if (Fragment.isFragment(value)) {
            return value;
        }
        if (typeof (value) === "string") {
            return Fragment.fromString(value);
        }
        return Fragment.fromObject(value);
    };
    Fragment.fromObject = function (value) {
        if (Fragment.isFragment(value)) {
            return value;
        }
        switch (value.type) {
            case "function":
                return FunctionFragment.fromObject(value);
            case "event":
                return EventFragment.fromObject(value);
            case "constructor":
                return ConstructorFragment.fromObject(value);
            case "error":
                return ErrorFragment.fromObject(value);
            case "fallback":
            case "receive":
                // @TODO: Something? Maybe return a FunctionFragment? A custom DefaultFunctionFragment?
                return null;
        }
        return logger.throwArgumentError("invalid fragment object", "value", value);
    };
    Fragment.fromString = function (value) {
        // Make sure the "returns" is surrounded by a space and all whitespace is exactly one space
        value = value.replace(/\s/g, " ");
        value = value.replace(/\(/g, " (").replace(/\)/g, ") ").replace(/\s+/g, " ");
        value = value.trim();
        if (value.split(" ")[0] === "event") {
            return EventFragment.fromString(value.substring(5).trim());
        }
        else if (value.split(" ")[0] === "function") {
            return FunctionFragment.fromString(value.substring(8).trim());
        }
        else if (value.split("(")[0].trim() === "constructor") {
            return ConstructorFragment.fromString(value.trim());
        }
        else if (value.split(" ")[0] === "error") {
            return ErrorFragment.fromString(value.substring(5).trim());
        }
        return logger.throwArgumentError("unsupported fragment", "value", value);
    };
    Fragment.isFragment = function (value) {
        return !!(value && value._isFragment);
    };
    return Fragment;
}());
exports.Fragment = Fragment;
var EventFragment = /** @class */ (function (_super) {
    __extends(EventFragment, _super);
    function EventFragment() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EventFragment.prototype.format = function (format) {
        if (!format) {
            format = exports.FormatTypes.sighash;
        }
        if (!exports.FormatTypes[format]) {
            logger.throwArgumentError("invalid format type", "format", format);
        }
        if (format === exports.FormatTypes.json) {
            return JSON.stringify({
                type: "event",
                anonymous: this.anonymous,
                name: this.name,
                inputs: this.inputs.map(function (input) { return JSON.parse(input.format(format)); })
            });
        }
        var result = "";
        if (format !== exports.FormatTypes.sighash) {
            result += "event ";
        }
        result += this.name + "(" + this.inputs.map(function (input) { return input.format(format); }).join((format === exports.FormatTypes.full) ? ", " : ",") + ") ";
        if (format !== exports.FormatTypes.sighash) {
            if (this.anonymous) {
                result += "anonymous ";
            }
        }
        return result.trim();
    };
    EventFragment.from = function (value) {
        if (typeof (value) === "string") {
            return EventFragment.fromString(value);
        }
        return EventFragment.fromObject(value);
    };
    EventFragment.fromObject = function (value) {
        if (EventFragment.isEventFragment(value)) {
            return value;
        }
        if (value.type !== "event") {
            logger.throwArgumentError("invalid event object", "value", value);
        }
        var params = {
            name: verifyIdentifier(value.name),
            anonymous: value.anonymous,
            inputs: (value.inputs ? value.inputs.map(ParamType.fromObject) : []),
            type: "event"
        };
        return new EventFragment(_constructorGuard, params);
    };
    EventFragment.fromString = function (value) {
        var match = value.match(regexParen);
        if (!match) {
            logger.throwArgumentError("invalid event string", "value", value);
        }
        var anonymous = false;
        match[3].split(" ").forEach(function (modifier) {
            switch (modifier.trim()) {
                case "anonymous":
                    anonymous = true;
                    break;
                case "":
                    break;
                default:
                    logger.warn("unknown modifier: " + modifier);
            }
        });
        return EventFragment.fromObject({
            name: match[1].trim(),
            anonymous: anonymous,
            inputs: parseParams(match[2], true),
            type: "event"
        });
    };
    EventFragment.isEventFragment = function (value) {
        return (value && value._isFragment && value.type === "event");
    };
    return EventFragment;
}(Fragment));
exports.EventFragment = EventFragment;
function parseGas(value, params) {
    params.gas = null;
    var comps = value.split("@");
    if (comps.length !== 1) {
        if (comps.length > 2) {
            logger.throwArgumentError("invalid human-readable ABI signature", "value", value);
        }
        if (!comps[1].match(/^[0-9]+$/)) {
            logger.throwArgumentError("invalid human-readable ABI signature gas", "value", value);
        }
        params.gas = bignumber_1.BigNumber.from(comps[1]);
        return comps[0];
    }
    return value;
}
function parseModifiers(value, params) {
    params.constant = false;
    params.payable = false;
    params.stateMutability = "nonpayable";
    value.split(" ").forEach(function (modifier) {
        switch (modifier.trim()) {
            case "constant":
                params.constant = true;
                break;
            case "payable":
                params.payable = true;
                params.stateMutability = "payable";
                break;
            case "nonpayable":
                params.payable = false;
                params.stateMutability = "nonpayable";
                break;
            case "pure":
                params.constant = true;
                params.stateMutability = "pure";
                break;
            case "view":
                params.constant = true;
                params.stateMutability = "view";
                break;
            case "external":
            case "public":
            case "":
                break;
            default:
                console.log("unknown modifier: " + modifier);
        }
    });
}
function verifyState(value) {
    var result = {
        constant: false,
        payable: true,
        stateMutability: "payable"
    };
    if (value.stateMutability != null) {
        result.stateMutability = value.stateMutability;
        // Set (and check things are consistent) the constant property
        result.constant = (result.stateMutability === "view" || result.stateMutability === "pure");
        if (value.constant != null) {
            if ((!!value.constant) !== result.constant) {
                logger.throwArgumentError("cannot have constant function with mutability " + result.stateMutability, "value", value);
            }
        }
        // Set (and check things are consistent) the payable property
        result.payable = (result.stateMutability === "payable");
        if (value.payable != null) {
            if ((!!value.payable) !== result.payable) {
                logger.throwArgumentError("cannot have payable function with mutability " + result.stateMutability, "value", value);
            }
        }
    }
    else if (value.payable != null) {
        result.payable = !!value.payable;
        // If payable we can assume non-constant; otherwise we can't assume
        if (value.constant == null && !result.payable && value.type !== "constructor") {
            logger.throwArgumentError("unable to determine stateMutability", "value", value);
        }
        result.constant = !!value.constant;
        if (result.constant) {
            result.stateMutability = "view";
        }
        else {
            result.stateMutability = (result.payable ? "payable" : "nonpayable");
        }
        if (result.payable && result.constant) {
            logger.throwArgumentError("cannot have constant payable function", "value", value);
        }
    }
    else if (value.constant != null) {
        result.constant = !!value.constant;
        result.payable = !result.constant;
        result.stateMutability = (result.constant ? "view" : "payable");
    }
    else if (value.type !== "constructor") {
        logger.throwArgumentError("unable to determine stateMutability", "value", value);
    }
    return result;
}
var ConstructorFragment = /** @class */ (function (_super) {
    __extends(ConstructorFragment, _super);
    function ConstructorFragment() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ConstructorFragment.prototype.format = function (format) {
        if (!format) {
            format = exports.FormatTypes.sighash;
        }
        if (!exports.FormatTypes[format]) {
            logger.throwArgumentError("invalid format type", "format", format);
        }
        if (format === exports.FormatTypes.json) {
            return JSON.stringify({
                type: "constructor",
                stateMutability: ((this.stateMutability !== "nonpayable") ? this.stateMutability : undefined),
                payable: this.payable,
                gas: (this.gas ? this.gas.toNumber() : undefined),
                inputs: this.inputs.map(function (input) { return JSON.parse(input.format(format)); })
            });
        }
        if (format === exports.FormatTypes.sighash) {
            logger.throwError("cannot format a constructor for sighash", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "format(sighash)"
            });
        }
        var result = "constructor(" + this.inputs.map(function (input) { return input.format(format); }).join((format === exports.FormatTypes.full) ? ", " : ",") + ") ";
        if (this.stateMutability && this.stateMutability !== "nonpayable") {
            result += this.stateMutability + " ";
        }
        return result.trim();
    };
    ConstructorFragment.from = function (value) {
        if (typeof (value) === "string") {
            return ConstructorFragment.fromString(value);
        }
        return ConstructorFragment.fromObject(value);
    };
    ConstructorFragment.fromObject = function (value) {
        if (ConstructorFragment.isConstructorFragment(value)) {
            return value;
        }
        if (value.type !== "constructor") {
            logger.throwArgumentError("invalid constructor object", "value", value);
        }
        var state = verifyState(value);
        if (state.constant) {
            logger.throwArgumentError("constructor cannot be constant", "value", value);
        }
        var params = {
            name: null,
            type: value.type,
            inputs: (value.inputs ? value.inputs.map(ParamType.fromObject) : []),
            payable: state.payable,
            stateMutability: state.stateMutability,
            gas: (value.gas ? bignumber_1.BigNumber.from(value.gas) : null)
        };
        return new ConstructorFragment(_constructorGuard, params);
    };
    ConstructorFragment.fromString = function (value) {
        var params = { type: "constructor" };
        value = parseGas(value, params);
        var parens = value.match(regexParen);
        if (!parens || parens[1].trim() !== "constructor") {
            logger.throwArgumentError("invalid constructor string", "value", value);
        }
        params.inputs = parseParams(parens[2].trim(), false);
        parseModifiers(parens[3].trim(), params);
        return ConstructorFragment.fromObject(params);
    };
    ConstructorFragment.isConstructorFragment = function (value) {
        return (value && value._isFragment && value.type === "constructor");
    };
    return ConstructorFragment;
}(Fragment));
exports.ConstructorFragment = ConstructorFragment;
var FunctionFragment = /** @class */ (function (_super) {
    __extends(FunctionFragment, _super);
    function FunctionFragment() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    FunctionFragment.prototype.format = function (format) {
        if (!format) {
            format = exports.FormatTypes.sighash;
        }
        if (!exports.FormatTypes[format]) {
            logger.throwArgumentError("invalid format type", "format", format);
        }
        if (format === exports.FormatTypes.json) {
            return JSON.stringify({
                type: "function",
                name: this.name,
                constant: this.constant,
                stateMutability: ((this.stateMutability !== "nonpayable") ? this.stateMutability : undefined),
                payable: this.payable,
                gas: (this.gas ? this.gas.toNumber() : undefined),
                inputs: this.inputs.map(function (input) { return JSON.parse(input.format(format)); }),
                outputs: this.outputs.map(function (output) { return JSON.parse(output.format(format)); }),
            });
        }
        var result = "";
        if (format !== exports.FormatTypes.sighash) {
            result += "function ";
        }
        result += this.name + "(" + this.inputs.map(function (input) { return input.format(format); }).join((format === exports.FormatTypes.full) ? ", " : ",") + ") ";
        if (format !== exports.FormatTypes.sighash) {
            if (this.stateMutability) {
                if (this.stateMutability !== "nonpayable") {
                    result += (this.stateMutability + " ");
                }
            }
            else if (this.constant) {
                result += "view ";
            }
            if (this.outputs && this.outputs.length) {
                result += "returns (" + this.outputs.map(function (output) { return output.format(format); }).join(", ") + ") ";
            }
            if (this.gas != null) {
                result += "@" + this.gas.toString() + " ";
            }
        }
        return result.trim();
    };
    FunctionFragment.from = function (value) {
        if (typeof (value) === "string") {
            return FunctionFragment.fromString(value);
        }
        return FunctionFragment.fromObject(value);
    };
    FunctionFragment.fromObject = function (value) {
        if (FunctionFragment.isFunctionFragment(value)) {
            return value;
        }
        if (value.type !== "function") {
            logger.throwArgumentError("invalid function object", "value", value);
        }
        var state = verifyState(value);
        var params = {
            type: value.type,
            name: verifyIdentifier(value.name),
            constant: state.constant,
            inputs: (value.inputs ? value.inputs.map(ParamType.fromObject) : []),
            outputs: (value.outputs ? value.outputs.map(ParamType.fromObject) : []),
            payable: state.payable,
            stateMutability: state.stateMutability,
            gas: (value.gas ? bignumber_1.BigNumber.from(value.gas) : null)
        };
        return new FunctionFragment(_constructorGuard, params);
    };
    FunctionFragment.fromString = function (value) {
        var params = { type: "function" };
        value = parseGas(value, params);
        var comps = value.split(" returns ");
        if (comps.length > 2) {
            logger.throwArgumentError("invalid function string", "value", value);
        }
        var parens = comps[0].match(regexParen);
        if (!parens) {
            logger.throwArgumentError("invalid function signature", "value", value);
        }
        params.name = parens[1].trim();
        if (params.name) {
            verifyIdentifier(params.name);
        }
        params.inputs = parseParams(parens[2], false);
        parseModifiers(parens[3].trim(), params);
        // We have outputs
        if (comps.length > 1) {
            var returns = comps[1].match(regexParen);
            if (returns[1].trim() != "" || returns[3].trim() != "") {
                logger.throwArgumentError("unexpected tokens", "value", value);
            }
            params.outputs = parseParams(returns[2], false);
        }
        else {
            params.outputs = [];
        }
        return FunctionFragment.fromObject(params);
    };
    FunctionFragment.isFunctionFragment = function (value) {
        return (value && value._isFragment && value.type === "function");
    };
    return FunctionFragment;
}(ConstructorFragment));
exports.FunctionFragment = FunctionFragment;
//export class StructFragment extends Fragment {
//}
function checkForbidden(fragment) {
    var sig = fragment.format();
    if (sig === "Error(string)" || sig === "Panic(uint256)") {
        logger.throwArgumentError("cannot specify user defined " + sig + " error", "fragment", fragment);
    }
    return fragment;
}
var ErrorFragment = /** @class */ (function (_super) {
    __extends(ErrorFragment, _super);
    function ErrorFragment() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ErrorFragment.prototype.format = function (format) {
        if (!format) {
            format = exports.FormatTypes.sighash;
        }
        if (!exports.FormatTypes[format]) {
            logger.throwArgumentError("invalid format type", "format", format);
        }
        if (format === exports.FormatTypes.json) {
            return JSON.stringify({
                type: "error",
                name: this.name,
                inputs: this.inputs.map(function (input) { return JSON.parse(input.format(format)); }),
            });
        }
        var result = "";
        if (format !== exports.FormatTypes.sighash) {
            result += "error ";
        }
        result += this.name + "(" + this.inputs.map(function (input) { return input.format(format); }).join((format === exports.FormatTypes.full) ? ", " : ",") + ") ";
        return result.trim();
    };
    ErrorFragment.from = function (value) {
        if (typeof (value) === "string") {
            return ErrorFragment.fromString(value);
        }
        return ErrorFragment.fromObject(value);
    };
    ErrorFragment.fromObject = function (value) {
        if (ErrorFragment.isErrorFragment(value)) {
            return value;
        }
        if (value.type !== "error") {
            logger.throwArgumentError("invalid error object", "value", value);
        }
        var params = {
            type: value.type,
            name: verifyIdentifier(value.name),
            inputs: (value.inputs ? value.inputs.map(ParamType.fromObject) : [])
        };
        return checkForbidden(new ErrorFragment(_constructorGuard, params));
    };
    ErrorFragment.fromString = function (value) {
        var params = { type: "error" };
        var parens = value.match(regexParen);
        if (!parens) {
            logger.throwArgumentError("invalid error signature", "value", value);
        }
        params.name = parens[1].trim();
        if (params.name) {
            verifyIdentifier(params.name);
        }
        params.inputs = parseParams(parens[2], false);
        return checkForbidden(ErrorFragment.fromObject(params));
    };
    ErrorFragment.isErrorFragment = function (value) {
        return (value && value._isFragment && value.type === "error");
    };
    return ErrorFragment;
}(Fragment));
exports.ErrorFragment = ErrorFragment;
function verifyType(type) {
    // These need to be transformed to their full description
    if (type.match(/^uint($|[^1-9])/)) {
        type = "uint256" + type.substring(4);
    }
    else if (type.match(/^int($|[^1-9])/)) {
        type = "int256" + type.substring(3);
    }
    // @TODO: more verification
    return type;
}
// See: https://github.com/ethereum/solidity/blob/1f8f1a3db93a548d0555e3e14cfc55a10e25b60e/docs/grammar/SolidityLexer.g4#L234
var regexIdentifier = new RegExp("^[a-zA-Z$_][a-zA-Z0-9$_]*$");
function verifyIdentifier(value) {
    if (!value || !value.match(regexIdentifier)) {
        logger.throwArgumentError("invalid identifier \"" + value + "\"", "value", value);
    }
    return value;
}
var regexParen = new RegExp("^([^)(]*)\\((.*)\\)([^)(]*)$");
function splitNesting(value) {
    value = value.trim();
    var result = [];
    var accum = "";
    var depth = 0;
    for (var offset = 0; offset < value.length; offset++) {
        var c = value[offset];
        if (c === "," && depth === 0) {
            result.push(accum);
            accum = "";
        }
        else {
            accum += c;
            if (c === "(") {
                depth++;
            }
            else if (c === ")") {
                depth--;
                if (depth === -1) {
                    logger.throwArgumentError("unbalanced parenthesis", "value", value);
                }
            }
        }
    }
    if (accum) {
        result.push(accum);
    }
    return result;
}

},{"./_version":7,"@ethersproject/bignumber":28,"@ethersproject/logger":44,"@ethersproject/properties":46}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionDescription = exports.LogDescription = exports.checkResultErrors = exports.Indexed = exports.Interface = exports.defaultAbiCoder = exports.AbiCoder = exports.FormatTypes = exports.ParamType = exports.FunctionFragment = exports.Fragment = exports.EventFragment = exports.ErrorFragment = exports.ConstructorFragment = void 0;
var fragments_1 = require("./fragments");
Object.defineProperty(exports, "ConstructorFragment", { enumerable: true, get: function () { return fragments_1.ConstructorFragment; } });
Object.defineProperty(exports, "ErrorFragment", { enumerable: true, get: function () { return fragments_1.ErrorFragment; } });
Object.defineProperty(exports, "EventFragment", { enumerable: true, get: function () { return fragments_1.EventFragment; } });
Object.defineProperty(exports, "FormatTypes", { enumerable: true, get: function () { return fragments_1.FormatTypes; } });
Object.defineProperty(exports, "Fragment", { enumerable: true, get: function () { return fragments_1.Fragment; } });
Object.defineProperty(exports, "FunctionFragment", { enumerable: true, get: function () { return fragments_1.FunctionFragment; } });
Object.defineProperty(exports, "ParamType", { enumerable: true, get: function () { return fragments_1.ParamType; } });
var abi_coder_1 = require("./abi-coder");
Object.defineProperty(exports, "AbiCoder", { enumerable: true, get: function () { return abi_coder_1.AbiCoder; } });
Object.defineProperty(exports, "defaultAbiCoder", { enumerable: true, get: function () { return abi_coder_1.defaultAbiCoder; } });
var interface_1 = require("./interface");
Object.defineProperty(exports, "checkResultErrors", { enumerable: true, get: function () { return interface_1.checkResultErrors; } });
Object.defineProperty(exports, "Indexed", { enumerable: true, get: function () { return interface_1.Indexed; } });
Object.defineProperty(exports, "Interface", { enumerable: true, get: function () { return interface_1.Interface; } });
Object.defineProperty(exports, "LogDescription", { enumerable: true, get: function () { return interface_1.LogDescription; } });
Object.defineProperty(exports, "TransactionDescription", { enumerable: true, get: function () { return interface_1.TransactionDescription; } });

},{"./abi-coder":8,"./fragments":20,"./interface":22}],22:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Interface = exports.Indexed = exports.ErrorDescription = exports.TransactionDescription = exports.LogDescription = exports.checkResultErrors = void 0;
var address_1 = require("@ethersproject/address");
var bignumber_1 = require("@ethersproject/bignumber");
var bytes_1 = require("@ethersproject/bytes");
var hash_1 = require("@ethersproject/hash");
var keccak256_1 = require("@ethersproject/keccak256");
var properties_1 = require("@ethersproject/properties");
var abi_coder_1 = require("./abi-coder");
var abstract_coder_1 = require("./coders/abstract-coder");
Object.defineProperty(exports, "checkResultErrors", { enumerable: true, get: function () { return abstract_coder_1.checkResultErrors; } });
var fragments_1 = require("./fragments");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var LogDescription = /** @class */ (function (_super) {
    __extends(LogDescription, _super);
    function LogDescription() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return LogDescription;
}(properties_1.Description));
exports.LogDescription = LogDescription;
var TransactionDescription = /** @class */ (function (_super) {
    __extends(TransactionDescription, _super);
    function TransactionDescription() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return TransactionDescription;
}(properties_1.Description));
exports.TransactionDescription = TransactionDescription;
var ErrorDescription = /** @class */ (function (_super) {
    __extends(ErrorDescription, _super);
    function ErrorDescription() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ErrorDescription;
}(properties_1.Description));
exports.ErrorDescription = ErrorDescription;
var Indexed = /** @class */ (function (_super) {
    __extends(Indexed, _super);
    function Indexed() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Indexed.isIndexed = function (value) {
        return !!(value && value._isIndexed);
    };
    return Indexed;
}(properties_1.Description));
exports.Indexed = Indexed;
var BuiltinErrors = {
    "0x08c379a0": { signature: "Error(string)", name: "Error", inputs: ["string"], reason: true },
    "0x4e487b71": { signature: "Panic(uint256)", name: "Panic", inputs: ["uint256"] }
};
function wrapAccessError(property, error) {
    var wrap = new Error("deferred error during ABI decoding triggered accessing " + property);
    wrap.error = error;
    return wrap;
}
/*
function checkNames(fragment: Fragment, type: "input" | "output", params: Array<ParamType>): void {
    params.reduce((accum, param) => {
        if (param.name) {
            if (accum[param.name]) {
                logger.throwArgumentError(`duplicate ${ type } parameter ${ JSON.stringify(param.name) } in ${ fragment.format("full") }`, "fragment", fragment);
            }
            accum[param.name] = true;
        }
        return accum;
    }, <{ [ name: string ]: boolean }>{ });
}
*/
var Interface = /** @class */ (function () {
    function Interface(fragments) {
        var _newTarget = this.constructor;
        var _this = this;
        logger.checkNew(_newTarget, Interface);
        var abi = [];
        if (typeof (fragments) === "string") {
            abi = JSON.parse(fragments);
        }
        else {
            abi = fragments;
        }
        (0, properties_1.defineReadOnly)(this, "fragments", abi.map(function (fragment) {
            return fragments_1.Fragment.from(fragment);
        }).filter(function (fragment) { return (fragment != null); }));
        (0, properties_1.defineReadOnly)(this, "_abiCoder", (0, properties_1.getStatic)(_newTarget, "getAbiCoder")());
        (0, properties_1.defineReadOnly)(this, "functions", {});
        (0, properties_1.defineReadOnly)(this, "errors", {});
        (0, properties_1.defineReadOnly)(this, "events", {});
        (0, properties_1.defineReadOnly)(this, "structs", {});
        // Add all fragments by their signature
        this.fragments.forEach(function (fragment) {
            var bucket = null;
            switch (fragment.type) {
                case "constructor":
                    if (_this.deploy) {
                        logger.warn("duplicate definition - constructor");
                        return;
                    }
                    //checkNames(fragment, "input", fragment.inputs);
                    (0, properties_1.defineReadOnly)(_this, "deploy", fragment);
                    return;
                case "function":
                    //checkNames(fragment, "input", fragment.inputs);
                    //checkNames(fragment, "output", (<FunctionFragment>fragment).outputs);
                    bucket = _this.functions;
                    break;
                case "event":
                    //checkNames(fragment, "input", fragment.inputs);
                    bucket = _this.events;
                    break;
                case "error":
                    bucket = _this.errors;
                    break;
                default:
                    return;
            }
            var signature = fragment.format();
            if (bucket[signature]) {
                logger.warn("duplicate definition - " + signature);
                return;
            }
            bucket[signature] = fragment;
        });
        // If we do not have a constructor add a default
        if (!this.deploy) {
            (0, properties_1.defineReadOnly)(this, "deploy", fragments_1.ConstructorFragment.from({
                payable: false,
                type: "constructor"
            }));
        }
        (0, properties_1.defineReadOnly)(this, "_isInterface", true);
    }
    Interface.prototype.format = function (format) {
        if (!format) {
            format = fragments_1.FormatTypes.full;
        }
        if (format === fragments_1.FormatTypes.sighash) {
            logger.throwArgumentError("interface does not support formatting sighash", "format", format);
        }
        var abi = this.fragments.map(function (fragment) { return fragment.format(format); });
        // We need to re-bundle the JSON fragments a bit
        if (format === fragments_1.FormatTypes.json) {
            return JSON.stringify(abi.map(function (j) { return JSON.parse(j); }));
        }
        return abi;
    };
    // Sub-classes can override these to handle other blockchains
    Interface.getAbiCoder = function () {
        return abi_coder_1.defaultAbiCoder;
    };
    Interface.getAddress = function (address) {
        return (0, address_1.getAddress)(address);
    };
    Interface.getSighash = function (fragment) {
        return (0, bytes_1.hexDataSlice)((0, hash_1.id)(fragment.format()), 0, 4);
    };
    Interface.getEventTopic = function (eventFragment) {
        return (0, hash_1.id)(eventFragment.format());
    };
    // Find a function definition by any means necessary (unless it is ambiguous)
    Interface.prototype.getFunction = function (nameOrSignatureOrSighash) {
        if ((0, bytes_1.isHexString)(nameOrSignatureOrSighash)) {
            for (var name_1 in this.functions) {
                if (nameOrSignatureOrSighash === this.getSighash(name_1)) {
                    return this.functions[name_1];
                }
            }
            logger.throwArgumentError("no matching function", "sighash", nameOrSignatureOrSighash);
        }
        // It is a bare name, look up the function (will return null if ambiguous)
        if (nameOrSignatureOrSighash.indexOf("(") === -1) {
            var name_2 = nameOrSignatureOrSighash.trim();
            var matching = Object.keys(this.functions).filter(function (f) { return (f.split("(" /* fix:) */)[0] === name_2); });
            if (matching.length === 0) {
                logger.throwArgumentError("no matching function", "name", name_2);
            }
            else if (matching.length > 1) {
                logger.throwArgumentError("multiple matching functions", "name", name_2);
            }
            return this.functions[matching[0]];
        }
        // Normalize the signature and lookup the function
        var result = this.functions[fragments_1.FunctionFragment.fromString(nameOrSignatureOrSighash).format()];
        if (!result) {
            logger.throwArgumentError("no matching function", "signature", nameOrSignatureOrSighash);
        }
        return result;
    };
    // Find an event definition by any means necessary (unless it is ambiguous)
    Interface.prototype.getEvent = function (nameOrSignatureOrTopic) {
        if ((0, bytes_1.isHexString)(nameOrSignatureOrTopic)) {
            var topichash = nameOrSignatureOrTopic.toLowerCase();
            for (var name_3 in this.events) {
                if (topichash === this.getEventTopic(name_3)) {
                    return this.events[name_3];
                }
            }
            logger.throwArgumentError("no matching event", "topichash", topichash);
        }
        // It is a bare name, look up the function (will return null if ambiguous)
        if (nameOrSignatureOrTopic.indexOf("(") === -1) {
            var name_4 = nameOrSignatureOrTopic.trim();
            var matching = Object.keys(this.events).filter(function (f) { return (f.split("(" /* fix:) */)[0] === name_4); });
            if (matching.length === 0) {
                logger.throwArgumentError("no matching event", "name", name_4);
            }
            else if (matching.length > 1) {
                logger.throwArgumentError("multiple matching events", "name", name_4);
            }
            return this.events[matching[0]];
        }
        // Normalize the signature and lookup the function
        var result = this.events[fragments_1.EventFragment.fromString(nameOrSignatureOrTopic).format()];
        if (!result) {
            logger.throwArgumentError("no matching event", "signature", nameOrSignatureOrTopic);
        }
        return result;
    };
    // Find a function definition by any means necessary (unless it is ambiguous)
    Interface.prototype.getError = function (nameOrSignatureOrSighash) {
        if ((0, bytes_1.isHexString)(nameOrSignatureOrSighash)) {
            var getSighash = (0, properties_1.getStatic)(this.constructor, "getSighash");
            for (var name_5 in this.errors) {
                var error = this.errors[name_5];
                if (nameOrSignatureOrSighash === getSighash(error)) {
                    return this.errors[name_5];
                }
            }
            logger.throwArgumentError("no matching error", "sighash", nameOrSignatureOrSighash);
        }
        // It is a bare name, look up the function (will return null if ambiguous)
        if (nameOrSignatureOrSighash.indexOf("(") === -1) {
            var name_6 = nameOrSignatureOrSighash.trim();
            var matching = Object.keys(this.errors).filter(function (f) { return (f.split("(" /* fix:) */)[0] === name_6); });
            if (matching.length === 0) {
                logger.throwArgumentError("no matching error", "name", name_6);
            }
            else if (matching.length > 1) {
                logger.throwArgumentError("multiple matching errors", "name", name_6);
            }
            return this.errors[matching[0]];
        }
        // Normalize the signature and lookup the function
        var result = this.errors[fragments_1.FunctionFragment.fromString(nameOrSignatureOrSighash).format()];
        if (!result) {
            logger.throwArgumentError("no matching error", "signature", nameOrSignatureOrSighash);
        }
        return result;
    };
    // Get the sighash (the bytes4 selector) used by Solidity to identify a function
    Interface.prototype.getSighash = function (fragment) {
        if (typeof (fragment) === "string") {
            try {
                fragment = this.getFunction(fragment);
            }
            catch (error) {
                try {
                    fragment = this.getError(fragment);
                }
                catch (_) {
                    throw error;
                }
            }
        }
        return (0, properties_1.getStatic)(this.constructor, "getSighash")(fragment);
    };
    // Get the topic (the bytes32 hash) used by Solidity to identify an event
    Interface.prototype.getEventTopic = function (eventFragment) {
        if (typeof (eventFragment) === "string") {
            eventFragment = this.getEvent(eventFragment);
        }
        return (0, properties_1.getStatic)(this.constructor, "getEventTopic")(eventFragment);
    };
    Interface.prototype._decodeParams = function (params, data) {
        return this._abiCoder.decode(params, data);
    };
    Interface.prototype._encodeParams = function (params, values) {
        return this._abiCoder.encode(params, values);
    };
    Interface.prototype.encodeDeploy = function (values) {
        return this._encodeParams(this.deploy.inputs, values || []);
    };
    Interface.prototype.decodeErrorResult = function (fragment, data) {
        if (typeof (fragment) === "string") {
            fragment = this.getError(fragment);
        }
        var bytes = (0, bytes_1.arrayify)(data);
        if ((0, bytes_1.hexlify)(bytes.slice(0, 4)) !== this.getSighash(fragment)) {
            logger.throwArgumentError("data signature does not match error " + fragment.name + ".", "data", (0, bytes_1.hexlify)(bytes));
        }
        return this._decodeParams(fragment.inputs, bytes.slice(4));
    };
    Interface.prototype.encodeErrorResult = function (fragment, values) {
        if (typeof (fragment) === "string") {
            fragment = this.getError(fragment);
        }
        return (0, bytes_1.hexlify)((0, bytes_1.concat)([
            this.getSighash(fragment),
            this._encodeParams(fragment.inputs, values || [])
        ]));
    };
    // Decode the data for a function call (e.g. tx.data)
    Interface.prototype.decodeFunctionData = function (functionFragment, data) {
        if (typeof (functionFragment) === "string") {
            functionFragment = this.getFunction(functionFragment);
        }
        var bytes = (0, bytes_1.arrayify)(data);
        if ((0, bytes_1.hexlify)(bytes.slice(0, 4)) !== this.getSighash(functionFragment)) {
            logger.throwArgumentError("data signature does not match function " + functionFragment.name + ".", "data", (0, bytes_1.hexlify)(bytes));
        }
        return this._decodeParams(functionFragment.inputs, bytes.slice(4));
    };
    // Encode the data for a function call (e.g. tx.data)
    Interface.prototype.encodeFunctionData = function (functionFragment, values) {
        if (typeof (functionFragment) === "string") {
            functionFragment = this.getFunction(functionFragment);
        }
        return (0, bytes_1.hexlify)((0, bytes_1.concat)([
            this.getSighash(functionFragment),
            this._encodeParams(functionFragment.inputs, values || [])
        ]));
    };
    // Decode the result from a function call (e.g. from eth_call)
    Interface.prototype.decodeFunctionResult = function (functionFragment, data) {
        if (typeof (functionFragment) === "string") {
            functionFragment = this.getFunction(functionFragment);
        }
        var bytes = (0, bytes_1.arrayify)(data);
        var reason = null;
        var errorArgs = null;
        var errorName = null;
        var errorSignature = null;
        switch (bytes.length % this._abiCoder._getWordSize()) {
            case 0:
                try {
                    return this._abiCoder.decode(functionFragment.outputs, bytes);
                }
                catch (error) { }
                break;
            case 4: {
                var selector = (0, bytes_1.hexlify)(bytes.slice(0, 4));
                var builtin = BuiltinErrors[selector];
                if (builtin) {
                    errorArgs = this._abiCoder.decode(builtin.inputs, bytes.slice(4));
                    errorName = builtin.name;
                    errorSignature = builtin.signature;
                    if (builtin.reason) {
                        reason = errorArgs[0];
                    }
                }
                else {
                    try {
                        var error = this.getError(selector);
                        errorArgs = this._abiCoder.decode(error.inputs, bytes.slice(4));
                        errorName = error.name;
                        errorSignature = error.format();
                    }
                    catch (error) {
                        console.log(error);
                    }
                }
                break;
            }
        }
        return logger.throwError("call revert exception", logger_1.Logger.errors.CALL_EXCEPTION, {
            method: functionFragment.format(),
            errorArgs: errorArgs,
            errorName: errorName,
            errorSignature: errorSignature,
            reason: reason
        });
    };
    // Encode the result for a function call (e.g. for eth_call)
    Interface.prototype.encodeFunctionResult = function (functionFragment, values) {
        if (typeof (functionFragment) === "string") {
            functionFragment = this.getFunction(functionFragment);
        }
        return (0, bytes_1.hexlify)(this._abiCoder.encode(functionFragment.outputs, values || []));
    };
    // Create the filter for the event with search criteria (e.g. for eth_filterLog)
    Interface.prototype.encodeFilterTopics = function (eventFragment, values) {
        var _this = this;
        if (typeof (eventFragment) === "string") {
            eventFragment = this.getEvent(eventFragment);
        }
        if (values.length > eventFragment.inputs.length) {
            logger.throwError("too many arguments for " + eventFragment.format(), logger_1.Logger.errors.UNEXPECTED_ARGUMENT, {
                argument: "values",
                value: values
            });
        }
        var topics = [];
        if (!eventFragment.anonymous) {
            topics.push(this.getEventTopic(eventFragment));
        }
        var encodeTopic = function (param, value) {
            if (param.type === "string") {
                return (0, hash_1.id)(value);
            }
            else if (param.type === "bytes") {
                return (0, keccak256_1.keccak256)((0, bytes_1.hexlify)(value));
            }
            // Check addresses are valid
            if (param.type === "address") {
                _this._abiCoder.encode(["address"], [value]);
            }
            return (0, bytes_1.hexZeroPad)((0, bytes_1.hexlify)(value), 32);
        };
        values.forEach(function (value, index) {
            var param = eventFragment.inputs[index];
            if (!param.indexed) {
                if (value != null) {
                    logger.throwArgumentError("cannot filter non-indexed parameters; must be null", ("contract." + param.name), value);
                }
                return;
            }
            if (value == null) {
                topics.push(null);
            }
            else if (param.baseType === "array" || param.baseType === "tuple") {
                logger.throwArgumentError("filtering with tuples or arrays not supported", ("contract." + param.name), value);
            }
            else if (Array.isArray(value)) {
                topics.push(value.map(function (value) { return encodeTopic(param, value); }));
            }
            else {
                topics.push(encodeTopic(param, value));
            }
        });
        // Trim off trailing nulls
        while (topics.length && topics[topics.length - 1] === null) {
            topics.pop();
        }
        return topics;
    };
    Interface.prototype.encodeEventLog = function (eventFragment, values) {
        var _this = this;
        if (typeof (eventFragment) === "string") {
            eventFragment = this.getEvent(eventFragment);
        }
        var topics = [];
        var dataTypes = [];
        var dataValues = [];
        if (!eventFragment.anonymous) {
            topics.push(this.getEventTopic(eventFragment));
        }
        if (values.length !== eventFragment.inputs.length) {
            logger.throwArgumentError("event arguments/values mismatch", "values", values);
        }
        eventFragment.inputs.forEach(function (param, index) {
            var value = values[index];
            if (param.indexed) {
                if (param.type === "string") {
                    topics.push((0, hash_1.id)(value));
                }
                else if (param.type === "bytes") {
                    topics.push((0, keccak256_1.keccak256)(value));
                }
                else if (param.baseType === "tuple" || param.baseType === "array") {
                    // @TODO
                    throw new Error("not implemented");
                }
                else {
                    topics.push(_this._abiCoder.encode([param.type], [value]));
                }
            }
            else {
                dataTypes.push(param);
                dataValues.push(value);
            }
        });
        return {
            data: this._abiCoder.encode(dataTypes, dataValues),
            topics: topics
        };
    };
    // Decode a filter for the event and the search criteria
    Interface.prototype.decodeEventLog = function (eventFragment, data, topics) {
        if (typeof (eventFragment) === "string") {
            eventFragment = this.getEvent(eventFragment);
        }
        if (topics != null && !eventFragment.anonymous) {
            var topicHash = this.getEventTopic(eventFragment);
            if (!(0, bytes_1.isHexString)(topics[0], 32) || topics[0].toLowerCase() !== topicHash) {
                logger.throwError("fragment/topic mismatch", logger_1.Logger.errors.INVALID_ARGUMENT, { argument: "topics[0]", expected: topicHash, value: topics[0] });
            }
            topics = topics.slice(1);
        }
        var indexed = [];
        var nonIndexed = [];
        var dynamic = [];
        eventFragment.inputs.forEach(function (param, index) {
            if (param.indexed) {
                if (param.type === "string" || param.type === "bytes" || param.baseType === "tuple" || param.baseType === "array") {
                    indexed.push(fragments_1.ParamType.fromObject({ type: "bytes32", name: param.name }));
                    dynamic.push(true);
                }
                else {
                    indexed.push(param);
                    dynamic.push(false);
                }
            }
            else {
                nonIndexed.push(param);
                dynamic.push(false);
            }
        });
        var resultIndexed = (topics != null) ? this._abiCoder.decode(indexed, (0, bytes_1.concat)(topics)) : null;
        var resultNonIndexed = this._abiCoder.decode(nonIndexed, data, true);
        var result = [];
        var nonIndexedIndex = 0, indexedIndex = 0;
        eventFragment.inputs.forEach(function (param, index) {
            if (param.indexed) {
                if (resultIndexed == null) {
                    result[index] = new Indexed({ _isIndexed: true, hash: null });
                }
                else if (dynamic[index]) {
                    result[index] = new Indexed({ _isIndexed: true, hash: resultIndexed[indexedIndex++] });
                }
                else {
                    try {
                        result[index] = resultIndexed[indexedIndex++];
                    }
                    catch (error) {
                        result[index] = error;
                    }
                }
            }
            else {
                try {
                    result[index] = resultNonIndexed[nonIndexedIndex++];
                }
                catch (error) {
                    result[index] = error;
                }
            }
            // Add the keyword argument if named and safe
            if (param.name && result[param.name] == null) {
                var value_1 = result[index];
                // Make error named values throw on access
                if (value_1 instanceof Error) {
                    Object.defineProperty(result, param.name, {
                        enumerable: true,
                        get: function () { throw wrapAccessError("property " + JSON.stringify(param.name), value_1); }
                    });
                }
                else {
                    result[param.name] = value_1;
                }
            }
        });
        var _loop_1 = function (i) {
            var value = result[i];
            if (value instanceof Error) {
                Object.defineProperty(result, i, {
                    enumerable: true,
                    get: function () { throw wrapAccessError("index " + i, value); }
                });
            }
        };
        // Make all error indexed values throw on access
        for (var i = 0; i < result.length; i++) {
            _loop_1(i);
        }
        return Object.freeze(result);
    };
    // Given a transaction, find the matching function fragment (if any) and
    // determine all its properties and call parameters
    Interface.prototype.parseTransaction = function (tx) {
        var fragment = this.getFunction(tx.data.substring(0, 10).toLowerCase());
        if (!fragment) {
            return null;
        }
        return new TransactionDescription({
            args: this._abiCoder.decode(fragment.inputs, "0x" + tx.data.substring(10)),
            functionFragment: fragment,
            name: fragment.name,
            signature: fragment.format(),
            sighash: this.getSighash(fragment),
            value: bignumber_1.BigNumber.from(tx.value || "0"),
        });
    };
    // @TODO
    //parseCallResult(data: BytesLike): ??
    // Given an event log, find the matching event fragment (if any) and
    // determine all its properties and values
    Interface.prototype.parseLog = function (log) {
        var fragment = this.getEvent(log.topics[0]);
        if (!fragment || fragment.anonymous) {
            return null;
        }
        // @TODO: If anonymous, and the only method, and the input count matches, should we parse?
        //        Probably not, because just because it is the only event in the ABI does
        //        not mean we have the full ABI; maybe just a fragment?
        return new LogDescription({
            eventFragment: fragment,
            name: fragment.name,
            signature: fragment.format(),
            topic: this.getEventTopic(fragment),
            args: this.decodeEventLog(fragment, log.data, log.topics)
        });
    };
    Interface.prototype.parseError = function (data) {
        var hexData = (0, bytes_1.hexlify)(data);
        var fragment = this.getError(hexData.substring(0, 10).toLowerCase());
        if (!fragment) {
            return null;
        }
        return new ErrorDescription({
            args: this._abiCoder.decode(fragment.inputs, "0x" + hexData.substring(10)),
            errorFragment: fragment,
            name: fragment.name,
            signature: fragment.format(),
            sighash: this.getSighash(fragment),
        });
    };
    /*
    static from(value: Array<Fragment | string | JsonAbi> | string | Interface) {
        if (Interface.isInterface(value)) {
            return value;
        }
        if (typeof(value) === "string") {
            return new Interface(JSON.parse(value));
        }
        return new Interface(value);
    }
    */
    Interface.isInterface = function (value) {
        return !!(value && value._isInterface);
    };
    return Interface;
}());
exports.Interface = Interface;

},{"./_version":7,"./abi-coder":8,"./coders/abstract-coder":9,"./fragments":20,"@ethersproject/address":24,"@ethersproject/bignumber":28,"@ethersproject/bytes":30,"@ethersproject/hash":38,"@ethersproject/keccak256":42,"@ethersproject/logger":44,"@ethersproject/properties":46}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "address/5.5.0";

},{}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCreate2Address = exports.getContractAddress = exports.getIcapAddress = exports.isAddress = exports.getAddress = void 0;
var bytes_1 = require("@ethersproject/bytes");
var bignumber_1 = require("@ethersproject/bignumber");
var keccak256_1 = require("@ethersproject/keccak256");
var rlp_1 = require("@ethersproject/rlp");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
function getChecksumAddress(address) {
    if (!(0, bytes_1.isHexString)(address, 20)) {
        logger.throwArgumentError("invalid address", "address", address);
    }
    address = address.toLowerCase();
    var chars = address.substring(2).split("");
    var expanded = new Uint8Array(40);
    for (var i = 0; i < 40; i++) {
        expanded[i] = chars[i].charCodeAt(0);
    }
    var hashed = (0, bytes_1.arrayify)((0, keccak256_1.keccak256)(expanded));
    for (var i = 0; i < 40; i += 2) {
        if ((hashed[i >> 1] >> 4) >= 8) {
            chars[i] = chars[i].toUpperCase();
        }
        if ((hashed[i >> 1] & 0x0f) >= 8) {
            chars[i + 1] = chars[i + 1].toUpperCase();
        }
    }
    return "0x" + chars.join("");
}
// Shims for environments that are missing some required constants and functions
var MAX_SAFE_INTEGER = 0x1fffffffffffff;
function log10(x) {
    if (Math.log10) {
        return Math.log10(x);
    }
    return Math.log(x) / Math.LN10;
}
// See: https://en.wikipedia.org/wiki/International_Bank_Account_Number
// Create lookup table
var ibanLookup = {};
for (var i = 0; i < 10; i++) {
    ibanLookup[String(i)] = String(i);
}
for (var i = 0; i < 26; i++) {
    ibanLookup[String.fromCharCode(65 + i)] = String(10 + i);
}
// How many decimal digits can we process? (for 64-bit float, this is 15)
var safeDigits = Math.floor(log10(MAX_SAFE_INTEGER));
function ibanChecksum(address) {
    address = address.toUpperCase();
    address = address.substring(4) + address.substring(0, 2) + "00";
    var expanded = address.split("").map(function (c) { return ibanLookup[c]; }).join("");
    // Javascript can handle integers safely up to 15 (decimal) digits
    while (expanded.length >= safeDigits) {
        var block = expanded.substring(0, safeDigits);
        expanded = parseInt(block, 10) % 97 + expanded.substring(block.length);
    }
    var checksum = String(98 - (parseInt(expanded, 10) % 97));
    while (checksum.length < 2) {
        checksum = "0" + checksum;
    }
    return checksum;
}
;
function getAddress(address) {
    var result = null;
    if (typeof (address) !== "string") {
        logger.throwArgumentError("invalid address", "address", address);
    }
    if (address.match(/^(0x)?[0-9a-fA-F]{40}$/)) {
        // Missing the 0x prefix
        if (address.substring(0, 2) !== "0x") {
            address = "0x" + address;
        }
        result = getChecksumAddress(address);
        // It is a checksummed address with a bad checksum
        if (address.match(/([A-F].*[a-f])|([a-f].*[A-F])/) && result !== address) {
            logger.throwArgumentError("bad address checksum", "address", address);
        }
        // Maybe ICAP? (we only support direct mode)
    }
    else if (address.match(/^XE[0-9]{2}[0-9A-Za-z]{30,31}$/)) {
        // It is an ICAP address with a bad checksum
        if (address.substring(2, 4) !== ibanChecksum(address)) {
            logger.throwArgumentError("bad icap checksum", "address", address);
        }
        result = (0, bignumber_1._base36To16)(address.substring(4));
        while (result.length < 40) {
            result = "0" + result;
        }
        result = getChecksumAddress("0x" + result);
    }
    else {
        logger.throwArgumentError("invalid address", "address", address);
    }
    return result;
}
exports.getAddress = getAddress;
function isAddress(address) {
    try {
        getAddress(address);
        return true;
    }
    catch (error) { }
    return false;
}
exports.isAddress = isAddress;
function getIcapAddress(address) {
    var base36 = (0, bignumber_1._base16To36)(getAddress(address).substring(2)).toUpperCase();
    while (base36.length < 30) {
        base36 = "0" + base36;
    }
    return "XE" + ibanChecksum("XE00" + base36) + base36;
}
exports.getIcapAddress = getIcapAddress;
// http://ethereum.stackexchange.com/questions/760/how-is-the-address-of-an-ethereum-contract-computed
function getContractAddress(transaction) {
    var from = null;
    try {
        from = getAddress(transaction.from);
    }
    catch (error) {
        logger.throwArgumentError("missing from address", "transaction", transaction);
    }
    var nonce = (0, bytes_1.stripZeros)((0, bytes_1.arrayify)(bignumber_1.BigNumber.from(transaction.nonce).toHexString()));
    return getAddress((0, bytes_1.hexDataSlice)((0, keccak256_1.keccak256)((0, rlp_1.encode)([from, nonce])), 12));
}
exports.getContractAddress = getContractAddress;
function getCreate2Address(from, salt, initCodeHash) {
    if ((0, bytes_1.hexDataLength)(salt) !== 32) {
        logger.throwArgumentError("salt must be 32 bytes", "salt", salt);
    }
    if ((0, bytes_1.hexDataLength)(initCodeHash) !== 32) {
        logger.throwArgumentError("initCodeHash must be 32 bytes", "initCodeHash", initCodeHash);
    }
    return getAddress((0, bytes_1.hexDataSlice)((0, keccak256_1.keccak256)((0, bytes_1.concat)(["0xff", getAddress(from), salt, initCodeHash])), 12));
}
exports.getCreate2Address = getCreate2Address;

},{"./_version":23,"@ethersproject/bignumber":28,"@ethersproject/bytes":30,"@ethersproject/keccak256":42,"@ethersproject/logger":44,"@ethersproject/rlp":48}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "bignumber/5.5.0";

},{}],26:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports._base16To36 = exports._base36To16 = exports.BigNumber = exports.isBigNumberish = void 0;
/**
 *  BigNumber
 *
 *  A wrapper around the BN.js object. We use the BN.js library
 *  because it is used by elliptic, so it is required regardless.
 *
 */
var bn_js_1 = __importDefault(require("bn.js"));
var BN = bn_js_1.default.BN;
var bytes_1 = require("@ethersproject/bytes");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var _constructorGuard = {};
var MAX_SAFE = 0x1fffffffffffff;
function isBigNumberish(value) {
    return (value != null) && (BigNumber.isBigNumber(value) ||
        (typeof (value) === "number" && (value % 1) === 0) ||
        (typeof (value) === "string" && !!value.match(/^-?[0-9]+$/)) ||
        (0, bytes_1.isHexString)(value) ||
        (typeof (value) === "bigint") ||
        (0, bytes_1.isBytes)(value));
}
exports.isBigNumberish = isBigNumberish;
// Only warn about passing 10 into radix once
var _warnedToStringRadix = false;
var BigNumber = /** @class */ (function () {
    function BigNumber(constructorGuard, hex) {
        var _newTarget = this.constructor;
        logger.checkNew(_newTarget, BigNumber);
        if (constructorGuard !== _constructorGuard) {
            logger.throwError("cannot call constructor directly; use BigNumber.from", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "new (BigNumber)"
            });
        }
        this._hex = hex;
        this._isBigNumber = true;
        Object.freeze(this);
    }
    BigNumber.prototype.fromTwos = function (value) {
        return toBigNumber(toBN(this).fromTwos(value));
    };
    BigNumber.prototype.toTwos = function (value) {
        return toBigNumber(toBN(this).toTwos(value));
    };
    BigNumber.prototype.abs = function () {
        if (this._hex[0] === "-") {
            return BigNumber.from(this._hex.substring(1));
        }
        return this;
    };
    BigNumber.prototype.add = function (other) {
        return toBigNumber(toBN(this).add(toBN(other)));
    };
    BigNumber.prototype.sub = function (other) {
        return toBigNumber(toBN(this).sub(toBN(other)));
    };
    BigNumber.prototype.div = function (other) {
        var o = BigNumber.from(other);
        if (o.isZero()) {
            throwFault("division by zero", "div");
        }
        return toBigNumber(toBN(this).div(toBN(other)));
    };
    BigNumber.prototype.mul = function (other) {
        return toBigNumber(toBN(this).mul(toBN(other)));
    };
    BigNumber.prototype.mod = function (other) {
        var value = toBN(other);
        if (value.isNeg()) {
            throwFault("cannot modulo negative values", "mod");
        }
        return toBigNumber(toBN(this).umod(value));
    };
    BigNumber.prototype.pow = function (other) {
        var value = toBN(other);
        if (value.isNeg()) {
            throwFault("cannot raise to negative values", "pow");
        }
        return toBigNumber(toBN(this).pow(value));
    };
    BigNumber.prototype.and = function (other) {
        var value = toBN(other);
        if (this.isNegative() || value.isNeg()) {
            throwFault("cannot 'and' negative values", "and");
        }
        return toBigNumber(toBN(this).and(value));
    };
    BigNumber.prototype.or = function (other) {
        var value = toBN(other);
        if (this.isNegative() || value.isNeg()) {
            throwFault("cannot 'or' negative values", "or");
        }
        return toBigNumber(toBN(this).or(value));
    };
    BigNumber.prototype.xor = function (other) {
        var value = toBN(other);
        if (this.isNegative() || value.isNeg()) {
            throwFault("cannot 'xor' negative values", "xor");
        }
        return toBigNumber(toBN(this).xor(value));
    };
    BigNumber.prototype.mask = function (value) {
        if (this.isNegative() || value < 0) {
            throwFault("cannot mask negative values", "mask");
        }
        return toBigNumber(toBN(this).maskn(value));
    };
    BigNumber.prototype.shl = function (value) {
        if (this.isNegative() || value < 0) {
            throwFault("cannot shift negative values", "shl");
        }
        return toBigNumber(toBN(this).shln(value));
    };
    BigNumber.prototype.shr = function (value) {
        if (this.isNegative() || value < 0) {
            throwFault("cannot shift negative values", "shr");
        }
        return toBigNumber(toBN(this).shrn(value));
    };
    BigNumber.prototype.eq = function (other) {
        return toBN(this).eq(toBN(other));
    };
    BigNumber.prototype.lt = function (other) {
        return toBN(this).lt(toBN(other));
    };
    BigNumber.prototype.lte = function (other) {
        return toBN(this).lte(toBN(other));
    };
    BigNumber.prototype.gt = function (other) {
        return toBN(this).gt(toBN(other));
    };
    BigNumber.prototype.gte = function (other) {
        return toBN(this).gte(toBN(other));
    };
    BigNumber.prototype.isNegative = function () {
        return (this._hex[0] === "-");
    };
    BigNumber.prototype.isZero = function () {
        return toBN(this).isZero();
    };
    BigNumber.prototype.toNumber = function () {
        try {
            return toBN(this).toNumber();
        }
        catch (error) {
            throwFault("overflow", "toNumber", this.toString());
        }
        return null;
    };
    BigNumber.prototype.toBigInt = function () {
        try {
            return BigInt(this.toString());
        }
        catch (e) { }
        return logger.throwError("this platform does not support BigInt", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
            value: this.toString()
        });
    };
    BigNumber.prototype.toString = function () {
        // Lots of people expect this, which we do not support, so check (See: #889)
        if (arguments.length > 0) {
            if (arguments[0] === 10) {
                if (!_warnedToStringRadix) {
                    _warnedToStringRadix = true;
                    logger.warn("BigNumber.toString does not accept any parameters; base-10 is assumed");
                }
            }
            else if (arguments[0] === 16) {
                logger.throwError("BigNumber.toString does not accept any parameters; use bigNumber.toHexString()", logger_1.Logger.errors.UNEXPECTED_ARGUMENT, {});
            }
            else {
                logger.throwError("BigNumber.toString does not accept parameters", logger_1.Logger.errors.UNEXPECTED_ARGUMENT, {});
            }
        }
        return toBN(this).toString(10);
    };
    BigNumber.prototype.toHexString = function () {
        return this._hex;
    };
    BigNumber.prototype.toJSON = function (key) {
        return { type: "BigNumber", hex: this.toHexString() };
    };
    BigNumber.from = function (value) {
        if (value instanceof BigNumber) {
            return value;
        }
        if (typeof (value) === "string") {
            if (value.match(/^-?0x[0-9a-f]+$/i)) {
                return new BigNumber(_constructorGuard, toHex(value));
            }
            if (value.match(/^-?[0-9]+$/)) {
                return new BigNumber(_constructorGuard, toHex(new BN(value)));
            }
            return logger.throwArgumentError("invalid BigNumber string", "value", value);
        }
        if (typeof (value) === "number") {
            if (value % 1) {
                throwFault("underflow", "BigNumber.from", value);
            }
            if (value >= MAX_SAFE || value <= -MAX_SAFE) {
                throwFault("overflow", "BigNumber.from", value);
            }
            return BigNumber.from(String(value));
        }
        var anyValue = value;
        if (typeof (anyValue) === "bigint") {
            return BigNumber.from(anyValue.toString());
        }
        if ((0, bytes_1.isBytes)(anyValue)) {
            return BigNumber.from((0, bytes_1.hexlify)(anyValue));
        }
        if (anyValue) {
            // Hexable interface (takes priority)
            if (anyValue.toHexString) {
                var hex = anyValue.toHexString();
                if (typeof (hex) === "string") {
                    return BigNumber.from(hex);
                }
            }
            else {
                // For now, handle legacy JSON-ified values (goes away in v6)
                var hex = anyValue._hex;
                // New-form JSON
                if (hex == null && anyValue.type === "BigNumber") {
                    hex = anyValue.hex;
                }
                if (typeof (hex) === "string") {
                    if ((0, bytes_1.isHexString)(hex) || (hex[0] === "-" && (0, bytes_1.isHexString)(hex.substring(1)))) {
                        return BigNumber.from(hex);
                    }
                }
            }
        }
        return logger.throwArgumentError("invalid BigNumber value", "value", value);
    };
    BigNumber.isBigNumber = function (value) {
        return !!(value && value._isBigNumber);
    };
    return BigNumber;
}());
exports.BigNumber = BigNumber;
// Normalize the hex string
function toHex(value) {
    // For BN, call on the hex string
    if (typeof (value) !== "string") {
        return toHex(value.toString(16));
    }
    // If negative, prepend the negative sign to the normalized positive value
    if (value[0] === "-") {
        // Strip off the negative sign
        value = value.substring(1);
        // Cannot have multiple negative signs (e.g. "--0x04")
        if (value[0] === "-") {
            logger.throwArgumentError("invalid hex", "value", value);
        }
        // Call toHex on the positive component
        value = toHex(value);
        // Do not allow "-0x00"
        if (value === "0x00") {
            return value;
        }
        // Negate the value
        return "-" + value;
    }
    // Add a "0x" prefix if missing
    if (value.substring(0, 2) !== "0x") {
        value = "0x" + value;
    }
    // Normalize zero
    if (value === "0x") {
        return "0x00";
    }
    // Make the string even length
    if (value.length % 2) {
        value = "0x0" + value.substring(2);
    }
    // Trim to smallest even-length string
    while (value.length > 4 && value.substring(0, 4) === "0x00") {
        value = "0x" + value.substring(4);
    }
    return value;
}
function toBigNumber(value) {
    return BigNumber.from(toHex(value));
}
function toBN(value) {
    var hex = BigNumber.from(value).toHexString();
    if (hex[0] === "-") {
        return (new BN("-" + hex.substring(3), 16));
    }
    return new BN(hex.substring(2), 16);
}
function throwFault(fault, operation, value) {
    var params = { fault: fault, operation: operation };
    if (value != null) {
        params.value = value;
    }
    return logger.throwError(fault, logger_1.Logger.errors.NUMERIC_FAULT, params);
}
// value should have no prefix
function _base36To16(value) {
    return (new BN(value, 36)).toString(16);
}
exports._base36To16 = _base36To16;
// value should have no prefix
function _base16To36(value) {
    return (new BN(value, 16)).toString(36);
}
exports._base16To36 = _base16To36;

},{"./_version":25,"@ethersproject/bytes":30,"@ethersproject/logger":44,"bn.js":80}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedNumber = exports.FixedFormat = exports.parseFixed = exports.formatFixed = void 0;
var bytes_1 = require("@ethersproject/bytes");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var bignumber_1 = require("./bignumber");
var _constructorGuard = {};
var Zero = bignumber_1.BigNumber.from(0);
var NegativeOne = bignumber_1.BigNumber.from(-1);
function throwFault(message, fault, operation, value) {
    var params = { fault: fault, operation: operation };
    if (value !== undefined) {
        params.value = value;
    }
    return logger.throwError(message, logger_1.Logger.errors.NUMERIC_FAULT, params);
}
// Constant to pull zeros from for multipliers
var zeros = "0";
while (zeros.length < 256) {
    zeros += zeros;
}
// Returns a string "1" followed by decimal "0"s
function getMultiplier(decimals) {
    if (typeof (decimals) !== "number") {
        try {
            decimals = bignumber_1.BigNumber.from(decimals).toNumber();
        }
        catch (e) { }
    }
    if (typeof (decimals) === "number" && decimals >= 0 && decimals <= 256 && !(decimals % 1)) {
        return ("1" + zeros.substring(0, decimals));
    }
    return logger.throwArgumentError("invalid decimal size", "decimals", decimals);
}
function formatFixed(value, decimals) {
    if (decimals == null) {
        decimals = 0;
    }
    var multiplier = getMultiplier(decimals);
    // Make sure wei is a big number (convert as necessary)
    value = bignumber_1.BigNumber.from(value);
    var negative = value.lt(Zero);
    if (negative) {
        value = value.mul(NegativeOne);
    }
    var fraction = value.mod(multiplier).toString();
    while (fraction.length < multiplier.length - 1) {
        fraction = "0" + fraction;
    }
    // Strip training 0
    fraction = fraction.match(/^([0-9]*[1-9]|0)(0*)/)[1];
    var whole = value.div(multiplier).toString();
    if (multiplier.length === 1) {
        value = whole;
    }
    else {
        value = whole + "." + fraction;
    }
    if (negative) {
        value = "-" + value;
    }
    return value;
}
exports.formatFixed = formatFixed;
function parseFixed(value, decimals) {
    if (decimals == null) {
        decimals = 0;
    }
    var multiplier = getMultiplier(decimals);
    if (typeof (value) !== "string" || !value.match(/^-?[0-9.]+$/)) {
        logger.throwArgumentError("invalid decimal value", "value", value);
    }
    // Is it negative?
    var negative = (value.substring(0, 1) === "-");
    if (negative) {
        value = value.substring(1);
    }
    if (value === ".") {
        logger.throwArgumentError("missing value", "value", value);
    }
    // Split it into a whole and fractional part
    var comps = value.split(".");
    if (comps.length > 2) {
        logger.throwArgumentError("too many decimal points", "value", value);
    }
    var whole = comps[0], fraction = comps[1];
    if (!whole) {
        whole = "0";
    }
    if (!fraction) {
        fraction = "0";
    }
    // Trim trailing zeros
    while (fraction[fraction.length - 1] === "0") {
        fraction = fraction.substring(0, fraction.length - 1);
    }
    // Check the fraction doesn't exceed our decimals size
    if (fraction.length > multiplier.length - 1) {
        throwFault("fractional component exceeds decimals", "underflow", "parseFixed");
    }
    // If decimals is 0, we have an empty string for fraction
    if (fraction === "") {
        fraction = "0";
    }
    // Fully pad the string with zeros to get to wei
    while (fraction.length < multiplier.length - 1) {
        fraction += "0";
    }
    var wholeValue = bignumber_1.BigNumber.from(whole);
    var fractionValue = bignumber_1.BigNumber.from(fraction);
    var wei = (wholeValue.mul(multiplier)).add(fractionValue);
    if (negative) {
        wei = wei.mul(NegativeOne);
    }
    return wei;
}
exports.parseFixed = parseFixed;
var FixedFormat = /** @class */ (function () {
    function FixedFormat(constructorGuard, signed, width, decimals) {
        if (constructorGuard !== _constructorGuard) {
            logger.throwError("cannot use FixedFormat constructor; use FixedFormat.from", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "new FixedFormat"
            });
        }
        this.signed = signed;
        this.width = width;
        this.decimals = decimals;
        this.name = (signed ? "" : "u") + "fixed" + String(width) + "x" + String(decimals);
        this._multiplier = getMultiplier(decimals);
        Object.freeze(this);
    }
    FixedFormat.from = function (value) {
        if (value instanceof FixedFormat) {
            return value;
        }
        if (typeof (value) === "number") {
            value = "fixed128x" + value;
        }
        var signed = true;
        var width = 128;
        var decimals = 18;
        if (typeof (value) === "string") {
            if (value === "fixed") {
                // defaults...
            }
            else if (value === "ufixed") {
                signed = false;
            }
            else {
                var match = value.match(/^(u?)fixed([0-9]+)x([0-9]+)$/);
                if (!match) {
                    logger.throwArgumentError("invalid fixed format", "format", value);
                }
                signed = (match[1] !== "u");
                width = parseInt(match[2]);
                decimals = parseInt(match[3]);
            }
        }
        else if (value) {
            var check = function (key, type, defaultValue) {
                if (value[key] == null) {
                    return defaultValue;
                }
                if (typeof (value[key]) !== type) {
                    logger.throwArgumentError("invalid fixed format (" + key + " not " + type + ")", "format." + key, value[key]);
                }
                return value[key];
            };
            signed = check("signed", "boolean", signed);
            width = check("width", "number", width);
            decimals = check("decimals", "number", decimals);
        }
        if (width % 8) {
            logger.throwArgumentError("invalid fixed format width (not byte aligned)", "format.width", width);
        }
        if (decimals > 80) {
            logger.throwArgumentError("invalid fixed format (decimals too large)", "format.decimals", decimals);
        }
        return new FixedFormat(_constructorGuard, signed, width, decimals);
    };
    return FixedFormat;
}());
exports.FixedFormat = FixedFormat;
var FixedNumber = /** @class */ (function () {
    function FixedNumber(constructorGuard, hex, value, format) {
        var _newTarget = this.constructor;
        logger.checkNew(_newTarget, FixedNumber);
        if (constructorGuard !== _constructorGuard) {
            logger.throwError("cannot use FixedNumber constructor; use FixedNumber.from", logger_1.Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "new FixedFormat"
            });
        }
        this.format = format;
        this._hex = hex;
        this._value = value;
        this._isFixedNumber = true;
        Object.freeze(this);
    }
    FixedNumber.prototype._checkFormat = function (other) {
        if (this.format.name !== other.format.name) {
            logger.throwArgumentError("incompatible format; use fixedNumber.toFormat", "other", other);
        }
    };
    FixedNumber.prototype.addUnsafe = function (other) {
        this._checkFormat(other);
        var a = parseFixed(this._value, this.format.decimals);
        var b = parseFixed(other._value, other.format.decimals);
        return FixedNumber.fromValue(a.add(b), this.format.decimals, this.format);
    };
    FixedNumber.prototype.subUnsafe = function (other) {
        this._checkFormat(other);
        var a = parseFixed(this._value, this.format.decimals);
        var b = parseFixed(other._value, other.format.decimals);
        return FixedNumber.fromValue(a.sub(b), this.format.decimals, this.format);
    };
    FixedNumber.prototype.mulUnsafe = function (other) {
        this._checkFormat(other);
        var a = parseFixed(this._value, this.format.decimals);
        var b = parseFixed(other._value, other.format.decimals);
        return FixedNumber.fromValue(a.mul(b).div(this.format._multiplier), this.format.decimals, this.format);
    };
    FixedNumber.prototype.divUnsafe = function (other) {
        this._checkFormat(other);
        var a = parseFixed(this._value, this.format.decimals);
        var b = parseFixed(other._value, other.format.decimals);
        return FixedNumber.fromValue(a.mul(this.format._multiplier).div(b), this.format.decimals, this.format);
    };
    FixedNumber.prototype.floor = function () {
        var comps = this.toString().split(".");
        if (comps.length === 1) {
            comps.push("0");
        }
        var result = FixedNumber.from(comps[0], this.format);
        var hasFraction = !comps[1].match(/^(0*)$/);
        if (this.isNegative() && hasFraction) {
            result = result.subUnsafe(ONE.toFormat(result.format));
        }
        return result;
    };
    FixedNumber.prototype.ceiling = function () {
        var comps = this.toString().split(".");
        if (comps.length === 1) {
            comps.push("0");
        }
        var result = FixedNumber.from(comps[0], this.format);
        var hasFraction = !comps[1].match(/^(0*)$/);
        if (!this.isNegative() && hasFraction) {
            result = result.addUnsafe(ONE.toFormat(result.format));
        }
        return result;
    };
    // @TODO: Support other rounding algorithms
    FixedNumber.prototype.round = function (decimals) {
        if (decimals == null) {
            decimals = 0;
        }
        // If we are already in range, we're done
        var comps = this.toString().split(".");
        if (comps.length === 1) {
            comps.push("0");
        }
        if (decimals < 0 || decimals > 80 || (decimals % 1)) {
            logger.throwArgumentError("invalid decimal count", "decimals", decimals);
        }
        if (comps[1].length <= decimals) {
            return this;
        }
        var factor = FixedNumber.from("1" + zeros.substring(0, decimals), this.format);
        var bump = BUMP.toFormat(this.format);
        return this.mulUnsafe(factor).addUnsafe(bump).floor().divUnsafe(factor);
    };
    FixedNumber.prototype.isZero = function () {
        return (this._value === "0.0" || this._value === "0");
    };
    FixedNumber.prototype.isNegative = function () {
        return (this._value[0] === "-");
    };
    FixedNumber.prototype.toString = function () { return this._value; };
    FixedNumber.prototype.toHexString = function (width) {
        if (width == null) {
            return this._hex;
        }
        if (width % 8) {
            logger.throwArgumentError("invalid byte width", "width", width);
        }
        var hex = bignumber_1.BigNumber.from(this._hex).fromTwos(this.format.width).toTwos(width).toHexString();
        return (0, bytes_1.hexZeroPad)(hex, width / 8);
    };
    FixedNumber.prototype.toUnsafeFloat = function () { return parseFloat(this.toString()); };
    FixedNumber.prototype.toFormat = function (format) {
        return FixedNumber.fromString(this._value, format);
    };
    FixedNumber.fromValue = function (value, decimals, format) {
        // If decimals looks more like a format, and there is no format, shift the parameters
        if (format == null && decimals != null && !(0, bignumber_1.isBigNumberish)(decimals)) {
            format = decimals;
            decimals = null;
        }
        if (decimals == null) {
            decimals = 0;
        }
        if (format == null) {
            format = "fixed";
        }
        return FixedNumber.fromString(formatFixed(value, decimals), FixedFormat.from(format));
    };
    FixedNumber.fromString = function (value, format) {
        if (format == null) {
            format = "fixed";
        }
        var fixedFormat = FixedFormat.from(format);
        var numeric = parseFixed(value, fixedFormat.decimals);
        if (!fixedFormat.signed && numeric.lt(Zero)) {
            throwFault("unsigned value cannot be negative", "overflow", "value", value);
        }
        var hex = null;
        if (fixedFormat.signed) {
            hex = numeric.toTwos(fixedFormat.width).toHexString();
        }
        else {
            hex = numeric.toHexString();
            hex = (0, bytes_1.hexZeroPad)(hex, fixedFormat.width / 8);
        }
        var decimal = formatFixed(numeric, fixedFormat.decimals);
        return new FixedNumber(_constructorGuard, hex, decimal, fixedFormat);
    };
    FixedNumber.fromBytes = function (value, format) {
        if (format == null) {
            format = "fixed";
        }
        var fixedFormat = FixedFormat.from(format);
        if ((0, bytes_1.arrayify)(value).length > fixedFormat.width / 8) {
            throw new Error("overflow");
        }
        var numeric = bignumber_1.BigNumber.from(value);
        if (fixedFormat.signed) {
            numeric = numeric.fromTwos(fixedFormat.width);
        }
        var hex = numeric.toTwos((fixedFormat.signed ? 0 : 1) + fixedFormat.width).toHexString();
        var decimal = formatFixed(numeric, fixedFormat.decimals);
        return new FixedNumber(_constructorGuard, hex, decimal, fixedFormat);
    };
    FixedNumber.from = function (value, format) {
        if (typeof (value) === "string") {
            return FixedNumber.fromString(value, format);
        }
        if ((0, bytes_1.isBytes)(value)) {
            return FixedNumber.fromBytes(value, format);
        }
        try {
            return FixedNumber.fromValue(value, 0, format);
        }
        catch (error) {
            // Allow NUMERIC_FAULT to bubble up
            if (error.code !== logger_1.Logger.errors.INVALID_ARGUMENT) {
                throw error;
            }
        }
        return logger.throwArgumentError("invalid FixedNumber value", "value", value);
    };
    FixedNumber.isFixedNumber = function (value) {
        return !!(value && value._isFixedNumber);
    };
    return FixedNumber;
}());
exports.FixedNumber = FixedNumber;
var ONE = FixedNumber.from(1);
var BUMP = FixedNumber.from("0.5");

},{"./_version":25,"./bignumber":26,"@ethersproject/bytes":30,"@ethersproject/logger":44}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._base36To16 = exports._base16To36 = exports.parseFixed = exports.FixedNumber = exports.FixedFormat = exports.formatFixed = exports.BigNumber = void 0;
var bignumber_1 = require("./bignumber");
Object.defineProperty(exports, "BigNumber", { enumerable: true, get: function () { return bignumber_1.BigNumber; } });
var fixednumber_1 = require("./fixednumber");
Object.defineProperty(exports, "formatFixed", { enumerable: true, get: function () { return fixednumber_1.formatFixed; } });
Object.defineProperty(exports, "FixedFormat", { enumerable: true, get: function () { return fixednumber_1.FixedFormat; } });
Object.defineProperty(exports, "FixedNumber", { enumerable: true, get: function () { return fixednumber_1.FixedNumber; } });
Object.defineProperty(exports, "parseFixed", { enumerable: true, get: function () { return fixednumber_1.parseFixed; } });
// Internal methods used by address
var bignumber_2 = require("./bignumber");
Object.defineProperty(exports, "_base16To36", { enumerable: true, get: function () { return bignumber_2._base16To36; } });
Object.defineProperty(exports, "_base36To16", { enumerable: true, get: function () { return bignumber_2._base36To16; } });

},{"./bignumber":26,"./fixednumber":27}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "bytes/5.5.0";

},{}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinSignature = exports.splitSignature = exports.hexZeroPad = exports.hexStripZeros = exports.hexValue = exports.hexConcat = exports.hexDataSlice = exports.hexDataLength = exports.hexlify = exports.isHexString = exports.zeroPad = exports.stripZeros = exports.concat = exports.arrayify = exports.isBytes = exports.isBytesLike = void 0;
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
///////////////////////////////
function isHexable(value) {
    return !!(value.toHexString);
}
function addSlice(array) {
    if (array.slice) {
        return array;
    }
    array.slice = function () {
        var args = Array.prototype.slice.call(arguments);
        return addSlice(new Uint8Array(Array.prototype.slice.apply(array, args)));
    };
    return array;
}
function isBytesLike(value) {
    return ((isHexString(value) && !(value.length % 2)) || isBytes(value));
}
exports.isBytesLike = isBytesLike;
function isInteger(value) {
    return (typeof (value) === "number" && value == value && (value % 1) === 0);
}
function isBytes(value) {
    if (value == null) {
        return false;
    }
    if (value.constructor === Uint8Array) {
        return true;
    }
    if (typeof (value) === "string") {
        return false;
    }
    if (!isInteger(value.length) || value.length < 0) {
        return false;
    }
    for (var i = 0; i < value.length; i++) {
        var v = value[i];
        if (!isInteger(v) || v < 0 || v >= 256) {
            return false;
        }
    }
    return true;
}
exports.isBytes = isBytes;
function arrayify(value, options) {
    if (!options) {
        options = {};
    }
    if (typeof (value) === "number") {
        logger.checkSafeUint53(value, "invalid arrayify value");
        var result = [];
        while (value) {
            result.unshift(value & 0xff);
            value = parseInt(String(value / 256));
        }
        if (result.length === 0) {
            result.push(0);
        }
        return addSlice(new Uint8Array(result));
    }
    if (options.allowMissingPrefix && typeof (value) === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
    }
    if (isHexable(value)) {
        value = value.toHexString();
    }
    if (isHexString(value)) {
        var hex = value.substring(2);
        if (hex.length % 2) {
            if (options.hexPad === "left") {
                hex = "0x0" + hex.substring(2);
            }
            else if (options.hexPad === "right") {
                hex += "0";
            }
            else {
                logger.throwArgumentError("hex data is odd-length", "value", value);
            }
        }
        var result = [];
        for (var i = 0; i < hex.length; i += 2) {
            result.push(parseInt(hex.substring(i, i + 2), 16));
        }
        return addSlice(new Uint8Array(result));
    }
    if (isBytes(value)) {
        return addSlice(new Uint8Array(value));
    }
    return logger.throwArgumentError("invalid arrayify value", "value", value);
}
exports.arrayify = arrayify;
function concat(items) {
    var objects = items.map(function (item) { return arrayify(item); });
    var length = objects.reduce(function (accum, item) { return (accum + item.length); }, 0);
    var result = new Uint8Array(length);
    objects.reduce(function (offset, object) {
        result.set(object, offset);
        return offset + object.length;
    }, 0);
    return addSlice(result);
}
exports.concat = concat;
function stripZeros(value) {
    var result = arrayify(value);
    if (result.length === 0) {
        return result;
    }
    // Find the first non-zero entry
    var start = 0;
    while (start < result.length && result[start] === 0) {
        start++;
    }
    // If we started with zeros, strip them
    if (start) {
        result = result.slice(start);
    }
    return result;
}
exports.stripZeros = stripZeros;
function zeroPad(value, length) {
    value = arrayify(value);
    if (value.length > length) {
        logger.throwArgumentError("value out of range", "value", arguments[0]);
    }
    var result = new Uint8Array(length);
    result.set(value, length - value.length);
    return addSlice(result);
}
exports.zeroPad = zeroPad;
function isHexString(value, length) {
    if (typeof (value) !== "string" || !value.match(/^0x[0-9A-Fa-f]*$/)) {
        return false;
    }
    if (length && value.length !== 2 + 2 * length) {
        return false;
    }
    return true;
}
exports.isHexString = isHexString;
var HexCharacters = "0123456789abcdef";
function hexlify(value, options) {
    if (!options) {
        options = {};
    }
    if (typeof (value) === "number") {
        logger.checkSafeUint53(value, "invalid hexlify value");
        var hex = "";
        while (value) {
            hex = HexCharacters[value & 0xf] + hex;
            value = Math.floor(value / 16);
        }
        if (hex.length) {
            if (hex.length % 2) {
                hex = "0" + hex;
            }
            return "0x" + hex;
        }
        return "0x00";
    }
    if (typeof (value) === "bigint") {
        value = value.toString(16);
        if (value.length % 2) {
            return ("0x0" + value);
        }
        return "0x" + value;
    }
    if (options.allowMissingPrefix && typeof (value) === "string" && value.substring(0, 2) !== "0x") {
        value = "0x" + value;
    }
    if (isHexable(value)) {
        return value.toHexString();
    }
    if (isHexString(value)) {
        if (value.length % 2) {
            if (options.hexPad === "left") {
                value = "0x0" + value.substring(2);
            }
            else if (options.hexPad === "right") {
                value += "0";
            }
            else {
                logger.throwArgumentError("hex data is odd-length", "value", value);
            }
        }
        return value.toLowerCase();
    }
    if (isBytes(value)) {
        var result = "0x";
        for (var i = 0; i < value.length; i++) {
            var v = value[i];
            result += HexCharacters[(v & 0xf0) >> 4] + HexCharacters[v & 0x0f];
        }
        return result;
    }
    return logger.throwArgumentError("invalid hexlify value", "value", value);
}
exports.hexlify = hexlify;
/*
function unoddify(value: BytesLike | Hexable | number): BytesLike | Hexable | number {
    if (typeof(value) === "string" && value.length % 2 && value.substring(0, 2) === "0x") {
        return "0x0" + value.substring(2);
    }
    return value;
}
*/
function hexDataLength(data) {
    if (typeof (data) !== "string") {
        data = hexlify(data);
    }
    else if (!isHexString(data) || (data.length % 2)) {
        return null;
    }
    return (data.length - 2) / 2;
}
exports.hexDataLength = hexDataLength;
function hexDataSlice(data, offset, endOffset) {
    if (typeof (data) !== "string") {
        data = hexlify(data);
    }
    else if (!isHexString(data) || (data.length % 2)) {
        logger.throwArgumentError("invalid hexData", "value", data);
    }
    offset = 2 + 2 * offset;
    if (endOffset != null) {
        return "0x" + data.substring(offset, 2 + 2 * endOffset);
    }
    return "0x" + data.substring(offset);
}
exports.hexDataSlice = hexDataSlice;
function hexConcat(items) {
    var result = "0x";
    items.forEach(function (item) {
        result += hexlify(item).substring(2);
    });
    return result;
}
exports.hexConcat = hexConcat;
function hexValue(value) {
    var trimmed = hexStripZeros(hexlify(value, { hexPad: "left" }));
    if (trimmed === "0x") {
        return "0x0";
    }
    return trimmed;
}
exports.hexValue = hexValue;
function hexStripZeros(value) {
    if (typeof (value) !== "string") {
        value = hexlify(value);
    }
    if (!isHexString(value)) {
        logger.throwArgumentError("invalid hex string", "value", value);
    }
    value = value.substring(2);
    var offset = 0;
    while (offset < value.length && value[offset] === "0") {
        offset++;
    }
    return "0x" + value.substring(offset);
}
exports.hexStripZeros = hexStripZeros;
function hexZeroPad(value, length) {
    if (typeof (value) !== "string") {
        value = hexlify(value);
    }
    else if (!isHexString(value)) {
        logger.throwArgumentError("invalid hex string", "value", value);
    }
    if (value.length > 2 * length + 2) {
        logger.throwArgumentError("value out of range", "value", arguments[1]);
    }
    while (value.length < 2 * length + 2) {
        value = "0x0" + value.substring(2);
    }
    return value;
}
exports.hexZeroPad = hexZeroPad;
function splitSignature(signature) {
    var result = {
        r: "0x",
        s: "0x",
        _vs: "0x",
        recoveryParam: 0,
        v: 0
    };
    if (isBytesLike(signature)) {
        var bytes = arrayify(signature);
        if (bytes.length !== 65) {
            logger.throwArgumentError("invalid signature string; must be 65 bytes", "signature", signature);
        }
        // Get the r, s and v
        result.r = hexlify(bytes.slice(0, 32));
        result.s = hexlify(bytes.slice(32, 64));
        result.v = bytes[64];
        // Allow a recid to be used as the v
        if (result.v < 27) {
            if (result.v === 0 || result.v === 1) {
                result.v += 27;
            }
            else {
                logger.throwArgumentError("signature invalid v byte", "signature", signature);
            }
        }
        // Compute recoveryParam from v
        result.recoveryParam = 1 - (result.v % 2);
        // Compute _vs from recoveryParam and s
        if (result.recoveryParam) {
            bytes[32] |= 0x80;
        }
        result._vs = hexlify(bytes.slice(32, 64));
    }
    else {
        result.r = signature.r;
        result.s = signature.s;
        result.v = signature.v;
        result.recoveryParam = signature.recoveryParam;
        result._vs = signature._vs;
        // If the _vs is available, use it to populate missing s, v and recoveryParam
        // and verify non-missing s, v and recoveryParam
        if (result._vs != null) {
            var vs_1 = zeroPad(arrayify(result._vs), 32);
            result._vs = hexlify(vs_1);
            // Set or check the recid
            var recoveryParam = ((vs_1[0] >= 128) ? 1 : 0);
            if (result.recoveryParam == null) {
                result.recoveryParam = recoveryParam;
            }
            else if (result.recoveryParam !== recoveryParam) {
                logger.throwArgumentError("signature recoveryParam mismatch _vs", "signature", signature);
            }
            // Set or check the s
            vs_1[0] &= 0x7f;
            var s = hexlify(vs_1);
            if (result.s == null) {
                result.s = s;
            }
            else if (result.s !== s) {
                logger.throwArgumentError("signature v mismatch _vs", "signature", signature);
            }
        }
        // Use recid and v to populate each other
        if (result.recoveryParam == null) {
            if (result.v == null) {
                logger.throwArgumentError("signature missing v and recoveryParam", "signature", signature);
            }
            else if (result.v === 0 || result.v === 1) {
                result.recoveryParam = result.v;
            }
            else {
                result.recoveryParam = 1 - (result.v % 2);
            }
        }
        else {
            if (result.v == null) {
                result.v = 27 + result.recoveryParam;
            }
            else {
                var recId = (result.v === 0 || result.v === 1) ? result.v : (1 - (result.v % 2));
                if (result.recoveryParam !== recId) {
                    logger.throwArgumentError("signature recoveryParam mismatch v", "signature", signature);
                }
            }
        }
        if (result.r == null || !isHexString(result.r)) {
            logger.throwArgumentError("signature missing or invalid r", "signature", signature);
        }
        else {
            result.r = hexZeroPad(result.r, 32);
        }
        if (result.s == null || !isHexString(result.s)) {
            logger.throwArgumentError("signature missing or invalid s", "signature", signature);
        }
        else {
            result.s = hexZeroPad(result.s, 32);
        }
        var vs = arrayify(result.s);
        if (vs[0] >= 128) {
            logger.throwArgumentError("signature s out of range", "signature", signature);
        }
        if (result.recoveryParam) {
            vs[0] |= 0x80;
        }
        var _vs = hexlify(vs);
        if (result._vs) {
            if (!isHexString(result._vs)) {
                logger.throwArgumentError("signature invalid _vs", "signature", signature);
            }
            result._vs = hexZeroPad(result._vs, 32);
        }
        // Set or check the _vs
        if (result._vs == null) {
            result._vs = _vs;
        }
        else if (result._vs !== _vs) {
            logger.throwArgumentError("signature _vs mismatch v and s", "signature", signature);
        }
    }
    return result;
}
exports.splitSignature = splitSignature;
function joinSignature(signature) {
    signature = splitSignature(signature);
    return hexlify(concat([
        signature.r,
        signature.s,
        (signature.recoveryParam ? "0x1c" : "0x1b")
    ]));
}
exports.joinSignature = joinSignature;

},{"./_version":29,"@ethersproject/logger":44}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressZero = void 0;
exports.AddressZero = "0x0000000000000000000000000000000000000000";

},{}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaxInt256 = exports.MinInt256 = exports.MaxUint256 = exports.WeiPerEther = exports.Two = exports.One = exports.Zero = exports.NegativeOne = void 0;
var bignumber_1 = require("@ethersproject/bignumber");
var NegativeOne = ( /*#__PURE__*/bignumber_1.BigNumber.from(-1));
exports.NegativeOne = NegativeOne;
var Zero = ( /*#__PURE__*/bignumber_1.BigNumber.from(0));
exports.Zero = Zero;
var One = ( /*#__PURE__*/bignumber_1.BigNumber.from(1));
exports.One = One;
var Two = ( /*#__PURE__*/bignumber_1.BigNumber.from(2));
exports.Two = Two;
var WeiPerEther = ( /*#__PURE__*/bignumber_1.BigNumber.from("1000000000000000000"));
exports.WeiPerEther = WeiPerEther;
var MaxUint256 = ( /*#__PURE__*/bignumber_1.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
exports.MaxUint256 = MaxUint256;
var MinInt256 = ( /*#__PURE__*/bignumber_1.BigNumber.from("-0x8000000000000000000000000000000000000000000000000000000000000000"));
exports.MinInt256 = MinInt256;
var MaxInt256 = ( /*#__PURE__*/bignumber_1.BigNumber.from("0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"));
exports.MaxInt256 = MaxInt256;

},{"@ethersproject/bignumber":28}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HashZero = void 0;
exports.HashZero = "0x0000000000000000000000000000000000000000000000000000000000000000";

},{}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtherSymbol = exports.HashZero = exports.MaxInt256 = exports.MinInt256 = exports.MaxUint256 = exports.WeiPerEther = exports.Two = exports.One = exports.Zero = exports.NegativeOne = exports.AddressZero = void 0;
var addresses_1 = require("./addresses");
Object.defineProperty(exports, "AddressZero", { enumerable: true, get: function () { return addresses_1.AddressZero; } });
var bignumbers_1 = require("./bignumbers");
Object.defineProperty(exports, "NegativeOne", { enumerable: true, get: function () { return bignumbers_1.NegativeOne; } });
Object.defineProperty(exports, "Zero", { enumerable: true, get: function () { return bignumbers_1.Zero; } });
Object.defineProperty(exports, "One", { enumerable: true, get: function () { return bignumbers_1.One; } });
Object.defineProperty(exports, "Two", { enumerable: true, get: function () { return bignumbers_1.Two; } });
Object.defineProperty(exports, "WeiPerEther", { enumerable: true, get: function () { return bignumbers_1.WeiPerEther; } });
Object.defineProperty(exports, "MaxUint256", { enumerable: true, get: function () { return bignumbers_1.MaxUint256; } });
Object.defineProperty(exports, "MinInt256", { enumerable: true, get: function () { return bignumbers_1.MinInt256; } });
Object.defineProperty(exports, "MaxInt256", { enumerable: true, get: function () { return bignumbers_1.MaxInt256; } });
var hashes_1 = require("./hashes");
Object.defineProperty(exports, "HashZero", { enumerable: true, get: function () { return hashes_1.HashZero; } });
var strings_1 = require("./strings");
Object.defineProperty(exports, "EtherSymbol", { enumerable: true, get: function () { return strings_1.EtherSymbol; } });

},{"./addresses":31,"./bignumbers":32,"./hashes":33,"./strings":35}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EtherSymbol = void 0;
// NFKC (composed)             // (decomposed)
exports.EtherSymbol = "\u039e"; // "\uD835\uDF63";

},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "hash/5.5.0";

},{}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.id = void 0;
var keccak256_1 = require("@ethersproject/keccak256");
var strings_1 = require("@ethersproject/strings");
function id(text) {
    return (0, keccak256_1.keccak256)((0, strings_1.toUtf8Bytes)(text));
}
exports.id = id;

},{"@ethersproject/keccak256":42,"@ethersproject/strings":52}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._TypedDataEncoder = exports.hashMessage = exports.messagePrefix = exports.isValidName = exports.namehash = exports.id = void 0;
var id_1 = require("./id");
Object.defineProperty(exports, "id", { enumerable: true, get: function () { return id_1.id; } });
var namehash_1 = require("./namehash");
Object.defineProperty(exports, "isValidName", { enumerable: true, get: function () { return namehash_1.isValidName; } });
Object.defineProperty(exports, "namehash", { enumerable: true, get: function () { return namehash_1.namehash; } });
var message_1 = require("./message");
Object.defineProperty(exports, "hashMessage", { enumerable: true, get: function () { return message_1.hashMessage; } });
Object.defineProperty(exports, "messagePrefix", { enumerable: true, get: function () { return message_1.messagePrefix; } });
var typed_data_1 = require("./typed-data");
Object.defineProperty(exports, "_TypedDataEncoder", { enumerable: true, get: function () { return typed_data_1.TypedDataEncoder; } });

},{"./id":37,"./message":39,"./namehash":40,"./typed-data":41}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashMessage = exports.messagePrefix = void 0;
var bytes_1 = require("@ethersproject/bytes");
var keccak256_1 = require("@ethersproject/keccak256");
var strings_1 = require("@ethersproject/strings");
exports.messagePrefix = "\x19Ethereum Signed Message:\n";
function hashMessage(message) {
    if (typeof (message) === "string") {
        message = (0, strings_1.toUtf8Bytes)(message);
    }
    return (0, keccak256_1.keccak256)((0, bytes_1.concat)([
        (0, strings_1.toUtf8Bytes)(exports.messagePrefix),
        (0, strings_1.toUtf8Bytes)(String(message.length)),
        message
    ]));
}
exports.hashMessage = hashMessage;

},{"@ethersproject/bytes":30,"@ethersproject/keccak256":42,"@ethersproject/strings":52}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.namehash = exports.isValidName = void 0;
var bytes_1 = require("@ethersproject/bytes");
var strings_1 = require("@ethersproject/strings");
var keccak256_1 = require("@ethersproject/keccak256");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var Zeros = new Uint8Array(32);
Zeros.fill(0);
var Partition = new RegExp("^((.*)\\.)?([^.]+)$");
function isValidName(name) {
    try {
        var comps = name.split(".");
        for (var i = 0; i < comps.length; i++) {
            if ((0, strings_1.nameprep)(comps[i]).length === 0) {
                throw new Error("empty");
            }
        }
        return true;
    }
    catch (error) { }
    return false;
}
exports.isValidName = isValidName;
function namehash(name) {
    /* istanbul ignore if */
    if (typeof (name) !== "string") {
        logger.throwArgumentError("invalid ENS name; not a string", "name", name);
    }
    var current = name;
    var result = Zeros;
    while (current.length) {
        var partition = current.match(Partition);
        if (partition == null || partition[2] === "") {
            logger.throwArgumentError("invalid ENS address; missing component", "name", name);
        }
        var label = (0, strings_1.toUtf8Bytes)((0, strings_1.nameprep)(partition[3]));
        result = (0, keccak256_1.keccak256)((0, bytes_1.concat)([result, (0, keccak256_1.keccak256)(label)]));
        current = partition[2] || "";
    }
    return (0, bytes_1.hexlify)(result);
}
exports.namehash = namehash;

},{"./_version":36,"@ethersproject/bytes":30,"@ethersproject/keccak256":42,"@ethersproject/logger":44,"@ethersproject/strings":52}],41:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypedDataEncoder = void 0;
var address_1 = require("@ethersproject/address");
var bignumber_1 = require("@ethersproject/bignumber");
var bytes_1 = require("@ethersproject/bytes");
var keccak256_1 = require("@ethersproject/keccak256");
var properties_1 = require("@ethersproject/properties");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
var id_1 = require("./id");
var padding = new Uint8Array(32);
padding.fill(0);
var NegativeOne = bignumber_1.BigNumber.from(-1);
var Zero = bignumber_1.BigNumber.from(0);
var One = bignumber_1.BigNumber.from(1);
var MaxUint256 = bignumber_1.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
function hexPadRight(value) {
    var bytes = (0, bytes_1.arrayify)(value);
    var padOffset = bytes.length % 32;
    if (padOffset) {
        return (0, bytes_1.hexConcat)([bytes, padding.slice(padOffset)]);
    }
    return (0, bytes_1.hexlify)(bytes);
}
var hexTrue = (0, bytes_1.hexZeroPad)(One.toHexString(), 32);
var hexFalse = (0, bytes_1.hexZeroPad)(Zero.toHexString(), 32);
var domainFieldTypes = {
    name: "string",
    version: "string",
    chainId: "uint256",
    verifyingContract: "address",
    salt: "bytes32"
};
var domainFieldNames = [
    "name", "version", "chainId", "verifyingContract", "salt"
];
function checkString(key) {
    return function (value) {
        if (typeof (value) !== "string") {
            logger.throwArgumentError("invalid domain value for " + JSON.stringify(key), "domain." + key, value);
        }
        return value;
    };
}
var domainChecks = {
    name: checkString("name"),
    version: checkString("version"),
    chainId: function (value) {
        try {
            return bignumber_1.BigNumber.from(value).toString();
        }
        catch (error) { }
        return logger.throwArgumentError("invalid domain value for \"chainId\"", "domain.chainId", value);
    },
    verifyingContract: function (value) {
        try {
            return (0, address_1.getAddress)(value).toLowerCase();
        }
        catch (error) { }
        return logger.throwArgumentError("invalid domain value \"verifyingContract\"", "domain.verifyingContract", value);
    },
    salt: function (value) {
        try {
            var bytes = (0, bytes_1.arrayify)(value);
            if (bytes.length !== 32) {
                throw new Error("bad length");
            }
            return (0, bytes_1.hexlify)(bytes);
        }
        catch (error) { }
        return logger.throwArgumentError("invalid domain value \"salt\"", "domain.salt", value);
    }
};
function getBaseEncoder(type) {
    // intXX and uintXX
    {
        var match = type.match(/^(u?)int(\d*)$/);
        if (match) {
            var signed = (match[1] === "");
            var width = parseInt(match[2] || "256");
            if (width % 8 !== 0 || width > 256 || (match[2] && match[2] !== String(width))) {
                logger.throwArgumentError("invalid numeric width", "type", type);
            }
            var boundsUpper_1 = MaxUint256.mask(signed ? (width - 1) : width);
            var boundsLower_1 = signed ? boundsUpper_1.add(One).mul(NegativeOne) : Zero;
            return function (value) {
                var v = bignumber_1.BigNumber.from(value);
                if (v.lt(boundsLower_1) || v.gt(boundsUpper_1)) {
                    logger.throwArgumentError("value out-of-bounds for " + type, "value", value);
                }
                return (0, bytes_1.hexZeroPad)(v.toTwos(256).toHexString(), 32);
            };
        }
    }
    // bytesXX
    {
        var match = type.match(/^bytes(\d+)$/);
        if (match) {
            var width_1 = parseInt(match[1]);
            if (width_1 === 0 || width_1 > 32 || match[1] !== String(width_1)) {
                logger.throwArgumentError("invalid bytes width", "type", type);
            }
            return function (value) {
                var bytes = (0, bytes_1.arrayify)(value);
                if (bytes.length !== width_1) {
                    logger.throwArgumentError("invalid length for " + type, "value", value);
                }
                return hexPadRight(value);
            };
        }
    }
    switch (type) {
        case "address": return function (value) {
            return (0, bytes_1.hexZeroPad)((0, address_1.getAddress)(value), 32);
        };
        case "bool": return function (value) {
            return ((!value) ? hexFalse : hexTrue);
        };
        case "bytes": return function (value) {
            return (0, keccak256_1.keccak256)(value);
        };
        case "string": return function (value) {
            return (0, id_1.id)(value);
        };
    }
    return null;
}
function encodeType(name, fields) {
    return name + "(" + fields.map(function (_a) {
        var name = _a.name, type = _a.type;
        return (type + " " + name);
    }).join(",") + ")";
}
var TypedDataEncoder = /** @class */ (function () {
    function TypedDataEncoder(types) {
        (0, properties_1.defineReadOnly)(this, "types", Object.freeze((0, properties_1.deepCopy)(types)));
        (0, properties_1.defineReadOnly)(this, "_encoderCache", {});
        (0, properties_1.defineReadOnly)(this, "_types", {});
        // Link struct types to their direct child structs
        var links = {};
        // Link structs to structs which contain them as a child
        var parents = {};
        // Link all subtypes within a given struct
        var subtypes = {};
        Object.keys(types).forEach(function (type) {
            links[type] = {};
            parents[type] = [];
            subtypes[type] = {};
        });
        var _loop_1 = function (name_1) {
            var uniqueNames = {};
            types[name_1].forEach(function (field) {
                // Check each field has a unique name
                if (uniqueNames[field.name]) {
                    logger.throwArgumentError("duplicate variable name " + JSON.stringify(field.name) + " in " + JSON.stringify(name_1), "types", types);
                }
                uniqueNames[field.name] = true;
                // Get the base type (drop any array specifiers)
                var baseType = field.type.match(/^([^\x5b]*)(\x5b|$)/)[1];
                if (baseType === name_1) {
                    logger.throwArgumentError("circular type reference to " + JSON.stringify(baseType), "types", types);
                }
                // Is this a base encoding type?
                var encoder = getBaseEncoder(baseType);
                if (encoder) {
                    return;
                }
                if (!parents[baseType]) {
                    logger.throwArgumentError("unknown type " + JSON.stringify(baseType), "types", types);
                }
                // Add linkage
                parents[baseType].push(name_1);
                links[name_1][baseType] = true;
            });
        };
        for (var name_1 in types) {
            _loop_1(name_1);
        }
        // Deduce the primary type
        var primaryTypes = Object.keys(parents).filter(function (n) { return (parents[n].length === 0); });
        if (primaryTypes.length === 0) {
            logger.throwArgumentError("missing primary type", "types", types);
        }
        else if (primaryTypes.length > 1) {
            logger.throwArgumentError("ambiguous primary types or unused types: " + primaryTypes.map(function (t) { return (JSON.stringify(t)); }).join(", "), "types", types);
        }
        (0, properties_1.defineReadOnly)(this, "primaryType", primaryTypes[0]);
        // Check for circular type references
        function checkCircular(type, found) {
            if (found[type]) {
                logger.throwArgumentError("circular type reference to " + JSON.stringify(type), "types", types);
            }
            found[type] = true;
            Object.keys(links[type]).forEach(function (child) {
                if (!parents[child]) {
                    return;
                }
                // Recursively check children
                checkCircular(child, found);
                // Mark all ancestors as having this decendant
                Object.keys(found).forEach(function (subtype) {
                    subtypes[subtype][child] = true;
                });
            });
            delete found[type];
        }
        checkCircular(this.primaryType, {});
        // Compute each fully describe type
        for (var name_2 in subtypes) {
            var st = Object.keys(subtypes[name_2]);
            st.sort();
            this._types[name_2] = encodeType(name_2, types[name_2]) + st.map(function (t) { return encodeType(t, types[t]); }).join("");
        }
    }
    TypedDataEncoder.prototype.getEncoder = function (type) {
        var encoder = this._encoderCache[type];
        if (!encoder) {
            encoder = this._encoderCache[type] = this._getEncoder(type);
        }
        return encoder;
    };
    TypedDataEncoder.prototype._getEncoder = function (type) {
        var _this = this;
        // Basic encoder type (address, bool, uint256, etc)
        {
            var encoder = getBaseEncoder(type);
            if (encoder) {
                return encoder;
            }
        }
        // Array
        var match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);
        if (match) {
            var subtype_1 = match[1];
            var subEncoder_1 = this.getEncoder(subtype_1);
            var length_1 = parseInt(match[3]);
            return function (value) {
                if (length_1 >= 0 && value.length !== length_1) {
                    logger.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
                }
                var result = value.map(subEncoder_1);
                if (_this._types[subtype_1]) {
                    result = result.map(keccak256_1.keccak256);
                }
                return (0, keccak256_1.keccak256)((0, bytes_1.hexConcat)(result));
            };
        }
        // Struct
        var fields = this.types[type];
        if (fields) {
            var encodedType_1 = (0, id_1.id)(this._types[type]);
            return function (value) {
                var values = fields.map(function (_a) {
                    var name = _a.name, type = _a.type;
                    var result = _this.getEncoder(type)(value[name]);
                    if (_this._types[type]) {
                        return (0, keccak256_1.keccak256)(result);
                    }
                    return result;
                });
                values.unshift(encodedType_1);
                return (0, bytes_1.hexConcat)(values);
            };
        }
        return logger.throwArgumentError("unknown type: " + type, "type", type);
    };
    TypedDataEncoder.prototype.encodeType = function (name) {
        var result = this._types[name];
        if (!result) {
            logger.throwArgumentError("unknown type: " + JSON.stringify(name), "name", name);
        }
        return result;
    };
    TypedDataEncoder.prototype.encodeData = function (type, value) {
        return this.getEncoder(type)(value);
    };
    TypedDataEncoder.prototype.hashStruct = function (name, value) {
        return (0, keccak256_1.keccak256)(this.encodeData(name, value));
    };
    TypedDataEncoder.prototype.encode = function (value) {
        return this.encodeData(this.primaryType, value);
    };
    TypedDataEncoder.prototype.hash = function (value) {
        return this.hashStruct(this.primaryType, value);
    };
    TypedDataEncoder.prototype._visit = function (type, value, callback) {
        var _this = this;
        // Basic encoder type (address, bool, uint256, etc)
        {
            var encoder = getBaseEncoder(type);
            if (encoder) {
                return callback(type, value);
            }
        }
        // Array
        var match = type.match(/^(.*)(\x5b(\d*)\x5d)$/);
        if (match) {
            var subtype_2 = match[1];
            var length_2 = parseInt(match[3]);
            if (length_2 >= 0 && value.length !== length_2) {
                logger.throwArgumentError("array length mismatch; expected length ${ arrayLength }", "value", value);
            }
            return value.map(function (v) { return _this._visit(subtype_2, v, callback); });
        }
        // Struct
        var fields = this.types[type];
        if (fields) {
            return fields.reduce(function (accum, _a) {
                var name = _a.name, type = _a.type;
                accum[name] = _this._visit(type, value[name], callback);
                return accum;
            }, {});
        }
        return logger.throwArgumentError("unknown type: " + type, "type", type);
    };
    TypedDataEncoder.prototype.visit = function (value, callback) {
        return this._visit(this.primaryType, value, callback);
    };
    TypedDataEncoder.from = function (types) {
        return new TypedDataEncoder(types);
    };
    TypedDataEncoder.getPrimaryType = function (types) {
        return TypedDataEncoder.from(types).primaryType;
    };
    TypedDataEncoder.hashStruct = function (name, types, value) {
        return TypedDataEncoder.from(types).hashStruct(name, value);
    };
    TypedDataEncoder.hashDomain = function (domain) {
        var domainFields = [];
        for (var name_3 in domain) {
            var type = domainFieldTypes[name_3];
            if (!type) {
                logger.throwArgumentError("invalid typed-data domain key: " + JSON.stringify(name_3), "domain", domain);
            }
            domainFields.push({ name: name_3, type: type });
        }
        domainFields.sort(function (a, b) {
            return domainFieldNames.indexOf(a.name) - domainFieldNames.indexOf(b.name);
        });
        return TypedDataEncoder.hashStruct("EIP712Domain", { EIP712Domain: domainFields }, domain);
    };
    TypedDataEncoder.encode = function (domain, types, value) {
        return (0, bytes_1.hexConcat)([
            "0x1901",
            TypedDataEncoder.hashDomain(domain),
            TypedDataEncoder.from(types).hash(value)
        ]);
    };
    TypedDataEncoder.hash = function (domain, types, value) {
        return (0, keccak256_1.keccak256)(TypedDataEncoder.encode(domain, types, value));
    };
    // Replaces all address types with ENS names with their looked up address
    TypedDataEncoder.resolveNames = function (domain, types, value, resolveName) {
        return __awaiter(this, void 0, void 0, function () {
            var ensCache, encoder, _a, _b, _i, name_4, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        // Make a copy to isolate it from the object passed in
                        domain = (0, properties_1.shallowCopy)(domain);
                        ensCache = {};
                        // Do we need to look up the domain's verifyingContract?
                        if (domain.verifyingContract && !(0, bytes_1.isHexString)(domain.verifyingContract, 20)) {
                            ensCache[domain.verifyingContract] = "0x";
                        }
                        encoder = TypedDataEncoder.from(types);
                        // Get a list of all the addresses
                        encoder.visit(value, function (type, value) {
                            if (type === "address" && !(0, bytes_1.isHexString)(value, 20)) {
                                ensCache[value] = "0x";
                            }
                            return value;
                        });
                        _a = [];
                        for (_b in ensCache)
                            _a.push(_b);
                        _i = 0;
                        _e.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                        name_4 = _a[_i];
                        _c = ensCache;
                        _d = name_4;
                        return [4 /*yield*/, resolveName(name_4)];
                    case 2:
                        _c[_d] = _e.sent();
                        _e.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4:
                        // Replace the domain verifyingContract if needed
                        if (domain.verifyingContract && ensCache[domain.verifyingContract]) {
                            domain.verifyingContract = ensCache[domain.verifyingContract];
                        }
                        // Replace all ENS names with their address
                        value = encoder.visit(value, function (type, value) {
                            if (type === "address" && ensCache[value]) {
                                return ensCache[value];
                            }
                            return value;
                        });
                        return [2 /*return*/, { domain: domain, value: value }];
                }
            });
        });
    };
    TypedDataEncoder.getPayload = function (domain, types, value) {
        // Validate the domain fields
        TypedDataEncoder.hashDomain(domain);
        // Derive the EIP712Domain Struct reference type
        var domainValues = {};
        var domainTypes = [];
        domainFieldNames.forEach(function (name) {
            var value = domain[name];
            if (value == null) {
                return;
            }
            domainValues[name] = domainChecks[name](value);
            domainTypes.push({ name: name, type: domainFieldTypes[name] });
        });
        var encoder = TypedDataEncoder.from(types);
        var typesWithDomain = (0, properties_1.shallowCopy)(types);
        if (typesWithDomain.EIP712Domain) {
            logger.throwArgumentError("types must not contain EIP712Domain type", "types.EIP712Domain", types);
        }
        else {
            typesWithDomain.EIP712Domain = domainTypes;
        }
        // Validate the data structures and types
        encoder.encode(value);
        return {
            types: typesWithDomain,
            domain: domainValues,
            primaryType: encoder.primaryType,
            message: encoder.visit(value, function (type, value) {
                // bytes
                if (type.match(/^bytes(\d*)/)) {
                    return (0, bytes_1.hexlify)((0, bytes_1.arrayify)(value));
                }
                // uint or int
                if (type.match(/^u?int/)) {
                    return bignumber_1.BigNumber.from(value).toString();
                }
                switch (type) {
                    case "address":
                        return value.toLowerCase();
                    case "bool":
                        return !!value;
                    case "string":
                        if (typeof (value) !== "string") {
                            logger.throwArgumentError("invalid string", "value", value);
                        }
                        return value;
                }
                return logger.throwArgumentError("unsupported type", "type", type);
            })
        };
    };
    return TypedDataEncoder;
}());
exports.TypedDataEncoder = TypedDataEncoder;

},{"./_version":36,"./id":37,"@ethersproject/address":24,"@ethersproject/bignumber":28,"@ethersproject/bytes":30,"@ethersproject/keccak256":42,"@ethersproject/logger":44,"@ethersproject/properties":46}],42:[function(require,module,exports){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.keccak256 = void 0;
var js_sha3_1 = __importDefault(require("js-sha3"));
var bytes_1 = require("@ethersproject/bytes");
function keccak256(data) {
    return '0x' + js_sha3_1.default.keccak_256((0, bytes_1.arrayify)(data));
}
exports.keccak256 = keccak256;

},{"@ethersproject/bytes":30,"js-sha3":114}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "logger/5.5.0";

},{}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.ErrorCode = exports.LogLevel = void 0;
var _permanentCensorErrors = false;
var _censorErrors = false;
var LogLevels = { debug: 1, "default": 2, info: 2, warning: 3, error: 4, off: 5 };
var _logLevel = LogLevels["default"];
var _version_1 = require("./_version");
var _globalLogger = null;
function _checkNormalize() {
    try {
        var missing_1 = [];
        // Make sure all forms of normalization are supported
        ["NFD", "NFC", "NFKD", "NFKC"].forEach(function (form) {
            try {
                if ("test".normalize(form) !== "test") {
                    throw new Error("bad normalize");
                }
                ;
            }
            catch (error) {
                missing_1.push(form);
            }
        });
        if (missing_1.length) {
            throw new Error("missing " + missing_1.join(", "));
        }
        if (String.fromCharCode(0xe9).normalize("NFD") !== String.fromCharCode(0x65, 0x0301)) {
            throw new Error("broken implementation");
        }
    }
    catch (error) {
        return error.message;
    }
    return null;
}
var _normalizeError = _checkNormalize();
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARNING"] = "WARNING";
    LogLevel["ERROR"] = "ERROR";
    LogLevel["OFF"] = "OFF";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
var ErrorCode;
(function (ErrorCode) {
    ///////////////////
    // Generic Errors
    // Unknown Error
    ErrorCode["UNKNOWN_ERROR"] = "UNKNOWN_ERROR";
    // Not Implemented
    ErrorCode["NOT_IMPLEMENTED"] = "NOT_IMPLEMENTED";
    // Unsupported Operation
    //   - operation
    ErrorCode["UNSUPPORTED_OPERATION"] = "UNSUPPORTED_OPERATION";
    // Network Error (i.e. Ethereum Network, such as an invalid chain ID)
    //   - event ("noNetwork" is not re-thrown in provider.ready; otherwise thrown)
    ErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    // Some sort of bad response from the server
    ErrorCode["SERVER_ERROR"] = "SERVER_ERROR";
    // Timeout
    ErrorCode["TIMEOUT"] = "TIMEOUT";
    ///////////////////
    // Operational  Errors
    // Buffer Overrun
    ErrorCode["BUFFER_OVERRUN"] = "BUFFER_OVERRUN";
    // Numeric Fault
    //   - operation: the operation being executed
    //   - fault: the reason this faulted
    ErrorCode["NUMERIC_FAULT"] = "NUMERIC_FAULT";
    ///////////////////
    // Argument Errors
    // Missing new operator to an object
    //  - name: The name of the class
    ErrorCode["MISSING_NEW"] = "MISSING_NEW";
    // Invalid argument (e.g. value is incompatible with type) to a function:
    //   - argument: The argument name that was invalid
    //   - value: The value of the argument
    ErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    // Missing argument to a function:
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["MISSING_ARGUMENT"] = "MISSING_ARGUMENT";
    // Too many arguments
    //   - count: The number of arguments received
    //   - expectedCount: The number of arguments expected
    ErrorCode["UNEXPECTED_ARGUMENT"] = "UNEXPECTED_ARGUMENT";
    ///////////////////
    // Blockchain Errors
    // Call exception
    //  - transaction: the transaction
    //  - address?: the contract address
    //  - args?: The arguments passed into the function
    //  - method?: The Solidity method signature
    //  - errorSignature?: The EIP848 error signature
    //  - errorArgs?: The EIP848 error parameters
    //  - reason: The reason (only for EIP848 "Error(string)")
    ErrorCode["CALL_EXCEPTION"] = "CALL_EXCEPTION";
    // Insufficient funds (< value + gasLimit * gasPrice)
    //   - transaction: the transaction attempted
    ErrorCode["INSUFFICIENT_FUNDS"] = "INSUFFICIENT_FUNDS";
    // Nonce has already been used
    //   - transaction: the transaction attempted
    ErrorCode["NONCE_EXPIRED"] = "NONCE_EXPIRED";
    // The replacement fee for the transaction is too low
    //   - transaction: the transaction attempted
    ErrorCode["REPLACEMENT_UNDERPRICED"] = "REPLACEMENT_UNDERPRICED";
    // The gas limit could not be estimated
    //   - transaction: the transaction passed to estimateGas
    ErrorCode["UNPREDICTABLE_GAS_LIMIT"] = "UNPREDICTABLE_GAS_LIMIT";
    // The transaction was replaced by one with a higher gas price
    //   - reason: "cancelled", "replaced" or "repriced"
    //   - cancelled: true if reason == "cancelled" or reason == "replaced")
    //   - hash: original transaction hash
    //   - replacement: the full TransactionsResponse for the replacement
    //   - receipt: the receipt of the replacement
    ErrorCode["TRANSACTION_REPLACED"] = "TRANSACTION_REPLACED";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
;
var HEX = "0123456789abcdef";
var Logger = /** @class */ (function () {
    function Logger(version) {
        Object.defineProperty(this, "version", {
            enumerable: true,
            value: version,
            writable: false
        });
    }
    Logger.prototype._log = function (logLevel, args) {
        var level = logLevel.toLowerCase();
        if (LogLevels[level] == null) {
            this.throwArgumentError("invalid log level name", "logLevel", logLevel);
        }
        if (_logLevel > LogLevels[level]) {
            return;
        }
        console.log.apply(console, args);
    };
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log(Logger.levels.DEBUG, args);
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log(Logger.levels.INFO, args);
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._log(Logger.levels.WARNING, args);
    };
    Logger.prototype.makeError = function (message, code, params) {
        // Errors are being censored
        if (_censorErrors) {
            return this.makeError("censored error", code, {});
        }
        if (!code) {
            code = Logger.errors.UNKNOWN_ERROR;
        }
        if (!params) {
            params = {};
        }
        var messageDetails = [];
        Object.keys(params).forEach(function (key) {
            var value = params[key];
            try {
                if (value instanceof Uint8Array) {
                    var hex = "";
                    for (var i = 0; i < value.length; i++) {
                        hex += HEX[value[i] >> 4];
                        hex += HEX[value[i] & 0x0f];
                    }
                    messageDetails.push(key + "=Uint8Array(0x" + hex + ")");
                }
                else {
                    messageDetails.push(key + "=" + JSON.stringify(value));
                }
            }
            catch (error) {
                messageDetails.push(key + "=" + JSON.stringify(params[key].toString()));
            }
        });
        messageDetails.push("code=" + code);
        messageDetails.push("version=" + this.version);
        var reason = message;
        if (messageDetails.length) {
            message += " (" + messageDetails.join(", ") + ")";
        }
        // @TODO: Any??
        var error = new Error(message);
        error.reason = reason;
        error.code = code;
        Object.keys(params).forEach(function (key) {
            error[key] = params[key];
        });
        return error;
    };
    Logger.prototype.throwError = function (message, code, params) {
        throw this.makeError(message, code, params);
    };
    Logger.prototype.throwArgumentError = function (message, name, value) {
        return this.throwError(message, Logger.errors.INVALID_ARGUMENT, {
            argument: name,
            value: value
        });
    };
    Logger.prototype.assert = function (condition, message, code, params) {
        if (!!condition) {
            return;
        }
        this.throwError(message, code, params);
    };
    Logger.prototype.assertArgument = function (condition, message, name, value) {
        if (!!condition) {
            return;
        }
        this.throwArgumentError(message, name, value);
    };
    Logger.prototype.checkNormalize = function (message) {
        if (message == null) {
            message = "platform missing String.prototype.normalize";
        }
        if (_normalizeError) {
            this.throwError("platform missing String.prototype.normalize", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "String.prototype.normalize", form: _normalizeError
            });
        }
    };
    Logger.prototype.checkSafeUint53 = function (value, message) {
        if (typeof (value) !== "number") {
            return;
        }
        if (message == null) {
            message = "value not safe";
        }
        if (value < 0 || value >= 0x1fffffffffffff) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "out-of-safe-range",
                value: value
            });
        }
        if (value % 1) {
            this.throwError(message, Logger.errors.NUMERIC_FAULT, {
                operation: "checkSafeInteger",
                fault: "non-integer",
                value: value
            });
        }
    };
    Logger.prototype.checkArgumentCount = function (count, expectedCount, message) {
        if (message) {
            message = ": " + message;
        }
        else {
            message = "";
        }
        if (count < expectedCount) {
            this.throwError("missing argument" + message, Logger.errors.MISSING_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
        if (count > expectedCount) {
            this.throwError("too many arguments" + message, Logger.errors.UNEXPECTED_ARGUMENT, {
                count: count,
                expectedCount: expectedCount
            });
        }
    };
    Logger.prototype.checkNew = function (target, kind) {
        if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    };
    Logger.prototype.checkAbstract = function (target, kind) {
        if (target === kind) {
            this.throwError("cannot instantiate abstract class " + JSON.stringify(kind.name) + " directly; use a sub-class", Logger.errors.UNSUPPORTED_OPERATION, { name: target.name, operation: "new" });
        }
        else if (target === Object || target == null) {
            this.throwError("missing new", Logger.errors.MISSING_NEW, { name: kind.name });
        }
    };
    Logger.globalLogger = function () {
        if (!_globalLogger) {
            _globalLogger = new Logger(_version_1.version);
        }
        return _globalLogger;
    };
    Logger.setCensorship = function (censorship, permanent) {
        if (!censorship && permanent) {
            this.globalLogger().throwError("cannot permanently disable censorship", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        if (_permanentCensorErrors) {
            if (!censorship) {
                return;
            }
            this.globalLogger().throwError("error censorship permanent", Logger.errors.UNSUPPORTED_OPERATION, {
                operation: "setCensorship"
            });
        }
        _censorErrors = !!censorship;
        _permanentCensorErrors = !!permanent;
    };
    Logger.setLogLevel = function (logLevel) {
        var level = LogLevels[logLevel.toLowerCase()];
        if (level == null) {
            Logger.globalLogger().warn("invalid log level - " + logLevel);
            return;
        }
        _logLevel = level;
    };
    Logger.from = function (version) {
        return new Logger(version);
    };
    Logger.errors = ErrorCode;
    Logger.levels = LogLevel;
    return Logger;
}());
exports.Logger = Logger;

},{"./_version":43}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "properties/5.5.0";

},{}],46:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Description = exports.deepCopy = exports.shallowCopy = exports.checkProperties = exports.resolveProperties = exports.getStatic = exports.defineReadOnly = void 0;
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
function defineReadOnly(object, name, value) {
    Object.defineProperty(object, name, {
        enumerable: true,
        value: value,
        writable: false,
    });
}
exports.defineReadOnly = defineReadOnly;
// Crawl up the constructor chain to find a static method
function getStatic(ctor, key) {
    for (var i = 0; i < 32; i++) {
        if (ctor[key]) {
            return ctor[key];
        }
        if (!ctor.prototype || typeof (ctor.prototype) !== "object") {
            break;
        }
        ctor = Object.getPrototypeOf(ctor.prototype).constructor;
    }
    return null;
}
exports.getStatic = getStatic;
function resolveProperties(object) {
    return __awaiter(this, void 0, void 0, function () {
        var promises, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    promises = Object.keys(object).map(function (key) {
                        var value = object[key];
                        return Promise.resolve(value).then(function (v) { return ({ key: key, value: v }); });
                    });
                    return [4 /*yield*/, Promise.all(promises)];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, results.reduce(function (accum, result) {
                            accum[(result.key)] = result.value;
                            return accum;
                        }, {})];
            }
        });
    });
}
exports.resolveProperties = resolveProperties;
function checkProperties(object, properties) {
    if (!object || typeof (object) !== "object") {
        logger.throwArgumentError("invalid object", "object", object);
    }
    Object.keys(object).forEach(function (key) {
        if (!properties[key]) {
            logger.throwArgumentError("invalid object key - " + key, "transaction:" + key, object);
        }
    });
}
exports.checkProperties = checkProperties;
function shallowCopy(object) {
    var result = {};
    for (var key in object) {
        result[key] = object[key];
    }
    return result;
}
exports.shallowCopy = shallowCopy;
var opaque = { bigint: true, boolean: true, "function": true, number: true, string: true };
function _isFrozen(object) {
    // Opaque objects are not mutable, so safe to copy by assignment
    if (object === undefined || object === null || opaque[typeof (object)]) {
        return true;
    }
    if (Array.isArray(object) || typeof (object) === "object") {
        if (!Object.isFrozen(object)) {
            return false;
        }
        var keys = Object.keys(object);
        for (var i = 0; i < keys.length; i++) {
            var value = null;
            try {
                value = object[keys[i]];
            }
            catch (error) {
                // If accessing a value triggers an error, it is a getter
                // designed to do so (e.g. Result) and is therefore "frozen"
                continue;
            }
            if (!_isFrozen(value)) {
                return false;
            }
        }
        return true;
    }
    return logger.throwArgumentError("Cannot deepCopy " + typeof (object), "object", object);
}
// Returns a new copy of object, such that no properties may be replaced.
// New properties may be added only to objects.
function _deepCopy(object) {
    if (_isFrozen(object)) {
        return object;
    }
    // Arrays are mutable, so we need to create a copy
    if (Array.isArray(object)) {
        return Object.freeze(object.map(function (item) { return deepCopy(item); }));
    }
    if (typeof (object) === "object") {
        var result = {};
        for (var key in object) {
            var value = object[key];
            if (value === undefined) {
                continue;
            }
            defineReadOnly(result, key, deepCopy(value));
        }
        return result;
    }
    return logger.throwArgumentError("Cannot deepCopy " + typeof (object), "object", object);
}
function deepCopy(object) {
    return _deepCopy(object);
}
exports.deepCopy = deepCopy;
var Description = /** @class */ (function () {
    function Description(info) {
        for (var key in info) {
            this[key] = deepCopy(info[key]);
        }
    }
    return Description;
}());
exports.Description = Description;

},{"./_version":45,"@ethersproject/logger":44}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "rlp/5.5.0";

},{}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decode = exports.encode = void 0;
//See: https://github.com/ethereum/wiki/wiki/RLP
var bytes_1 = require("@ethersproject/bytes");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
function arrayifyInteger(value) {
    var result = [];
    while (value) {
        result.unshift(value & 0xff);
        value >>= 8;
    }
    return result;
}
function unarrayifyInteger(data, offset, length) {
    var result = 0;
    for (var i = 0; i < length; i++) {
        result = (result * 256) + data[offset + i];
    }
    return result;
}
function _encode(object) {
    if (Array.isArray(object)) {
        var payload_1 = [];
        object.forEach(function (child) {
            payload_1 = payload_1.concat(_encode(child));
        });
        if (payload_1.length <= 55) {
            payload_1.unshift(0xc0 + payload_1.length);
            return payload_1;
        }
        var length_1 = arrayifyInteger(payload_1.length);
        length_1.unshift(0xf7 + length_1.length);
        return length_1.concat(payload_1);
    }
    if (!(0, bytes_1.isBytesLike)(object)) {
        logger.throwArgumentError("RLP object must be BytesLike", "object", object);
    }
    var data = Array.prototype.slice.call((0, bytes_1.arrayify)(object));
    if (data.length === 1 && data[0] <= 0x7f) {
        return data;
    }
    else if (data.length <= 55) {
        data.unshift(0x80 + data.length);
        return data;
    }
    var length = arrayifyInteger(data.length);
    length.unshift(0xb7 + length.length);
    return length.concat(data);
}
function encode(object) {
    return (0, bytes_1.hexlify)(_encode(object));
}
exports.encode = encode;
function _decodeChildren(data, offset, childOffset, length) {
    var result = [];
    while (childOffset < offset + 1 + length) {
        var decoded = _decode(data, childOffset);
        result.push(decoded.result);
        childOffset += decoded.consumed;
        if (childOffset > offset + 1 + length) {
            logger.throwError("child data too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
    }
    return { consumed: (1 + length), result: result };
}
// returns { consumed: number, result: Object }
function _decode(data, offset) {
    if (data.length === 0) {
        logger.throwError("data too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
    }
    // Array with extra length prefix
    if (data[offset] >= 0xf8) {
        var lengthLength = data[offset] - 0xf7;
        if (offset + 1 + lengthLength > data.length) {
            logger.throwError("data short segment too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
        var length_2 = unarrayifyInteger(data, offset + 1, lengthLength);
        if (offset + 1 + lengthLength + length_2 > data.length) {
            logger.throwError("data long segment too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
        return _decodeChildren(data, offset, offset + 1 + lengthLength, lengthLength + length_2);
    }
    else if (data[offset] >= 0xc0) {
        var length_3 = data[offset] - 0xc0;
        if (offset + 1 + length_3 > data.length) {
            logger.throwError("data array too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
        return _decodeChildren(data, offset, offset + 1, length_3);
    }
    else if (data[offset] >= 0xb8) {
        var lengthLength = data[offset] - 0xb7;
        if (offset + 1 + lengthLength > data.length) {
            logger.throwError("data array too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
        var length_4 = unarrayifyInteger(data, offset + 1, lengthLength);
        if (offset + 1 + lengthLength + length_4 > data.length) {
            logger.throwError("data array too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
        var result = (0, bytes_1.hexlify)(data.slice(offset + 1 + lengthLength, offset + 1 + lengthLength + length_4));
        return { consumed: (1 + lengthLength + length_4), result: result };
    }
    else if (data[offset] >= 0x80) {
        var length_5 = data[offset] - 0x80;
        if (offset + 1 + length_5 > data.length) {
            logger.throwError("data too short", logger_1.Logger.errors.BUFFER_OVERRUN, {});
        }
        var result = (0, bytes_1.hexlify)(data.slice(offset + 1, offset + 1 + length_5));
        return { consumed: (1 + length_5), result: result };
    }
    return { consumed: 1, result: (0, bytes_1.hexlify)(data[offset]) };
}
function decode(data) {
    var bytes = (0, bytes_1.arrayify)(data);
    var decoded = _decode(bytes, 0);
    if (decoded.consumed !== bytes.length) {
        logger.throwArgumentError("invalid rlp data", "data", data);
    }
    return decoded.result;
}
exports.decode = decode;

},{"./_version":47,"@ethersproject/bytes":30,"@ethersproject/logger":44}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.version = void 0;
exports.version = "strings/5.5.0";

},{}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBytes32String = exports.formatBytes32String = void 0;
var constants_1 = require("@ethersproject/constants");
var bytes_1 = require("@ethersproject/bytes");
var utf8_1 = require("./utf8");
function formatBytes32String(text) {
    // Get the bytes
    var bytes = (0, utf8_1.toUtf8Bytes)(text);
    // Check we have room for null-termination
    if (bytes.length > 31) {
        throw new Error("bytes32 string must be less than 32 bytes");
    }
    // Zero-pad (implicitly null-terminates)
    return (0, bytes_1.hexlify)((0, bytes_1.concat)([bytes, constants_1.HashZero]).slice(0, 32));
}
exports.formatBytes32String = formatBytes32String;
function parseBytes32String(bytes) {
    var data = (0, bytes_1.arrayify)(bytes);
    // Must be 32 bytes with a null-termination
    if (data.length !== 32) {
        throw new Error("invalid bytes32 - not 32 bytes long");
    }
    if (data[31] !== 0) {
        throw new Error("invalid bytes32 string - no null terminator");
    }
    // Find the null termination
    var length = 31;
    while (data[length - 1] === 0) {
        length--;
    }
    // Determine the string value
    return (0, utf8_1.toUtf8String)(data.slice(0, length));
}
exports.parseBytes32String = parseBytes32String;

},{"./utf8":53,"@ethersproject/bytes":30,"@ethersproject/constants":34}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameprep = exports._nameprepTableC = exports._nameprepTableB2 = exports._nameprepTableA1 = void 0;
var utf8_1 = require("./utf8");
function bytes2(data) {
    if ((data.length % 4) !== 0) {
        throw new Error("bad data");
    }
    var result = [];
    for (var i = 0; i < data.length; i += 4) {
        result.push(parseInt(data.substring(i, i + 4), 16));
    }
    return result;
}
function createTable(data, func) {
    if (!func) {
        func = function (value) { return [parseInt(value, 16)]; };
    }
    var lo = 0;
    var result = {};
    data.split(",").forEach(function (pair) {
        var comps = pair.split(":");
        lo += parseInt(comps[0], 16);
        result[lo] = func(comps[1]);
    });
    return result;
}
function createRangeTable(data) {
    var hi = 0;
    return data.split(",").map(function (v) {
        var comps = v.split("-");
        if (comps.length === 1) {
            comps[1] = "0";
        }
        else if (comps[1] === "") {
            comps[1] = "1";
        }
        var lo = hi + parseInt(comps[0], 16);
        hi = parseInt(comps[1], 16);
        return { l: lo, h: hi };
    });
}
function matchMap(value, ranges) {
    var lo = 0;
    for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        lo += range.l;
        if (value >= lo && value <= lo + range.h && ((value - lo) % (range.d || 1)) === 0) {
            if (range.e && range.e.indexOf(value - lo) !== -1) {
                continue;
            }
            return range;
        }
    }
    return null;
}
var Table_A_1_ranges = createRangeTable("221,13-1b,5f-,40-10,51-f,11-3,3-3,2-2,2-4,8,2,15,2d,28-8,88,48,27-,3-5,11-20,27-,8,28,3-5,12,18,b-a,1c-4,6-16,2-d,2-2,2,1b-4,17-9,8f-,10,f,1f-2,1c-34,33-14e,4,36-,13-,6-2,1a-f,4,9-,3-,17,8,2-2,5-,2,8-,3-,4-8,2-3,3,6-,16-6,2-,7-3,3-,17,8,3,3,3-,2,6-3,3-,4-a,5,2-6,10-b,4,8,2,4,17,8,3,6-,b,4,4-,2-e,2-4,b-10,4,9-,3-,17,8,3-,5-,9-2,3-,4-7,3-3,3,4-3,c-10,3,7-2,4,5-2,3,2,3-2,3-2,4-2,9,4-3,6-2,4,5-8,2-e,d-d,4,9,4,18,b,6-3,8,4,5-6,3-8,3-3,b-11,3,9,4,18,b,6-3,8,4,5-6,3-6,2,3-3,b-11,3,9,4,18,11-3,7-,4,5-8,2-7,3-3,b-11,3,13-2,19,a,2-,8-2,2-3,7,2,9-11,4-b,3b-3,1e-24,3,2-,3,2-,2-5,5,8,4,2,2-,3,e,4-,6,2,7-,b-,3-21,49,23-5,1c-3,9,25,10-,2-2f,23,6,3,8-2,5-5,1b-45,27-9,2a-,2-3,5b-4,45-4,53-5,8,40,2,5-,8,2,5-,28,2,5-,20,2,5-,8,2,5-,8,8,18,20,2,5-,8,28,14-5,1d-22,56-b,277-8,1e-2,52-e,e,8-a,18-8,15-b,e,4,3-b,5e-2,b-15,10,b-5,59-7,2b-555,9d-3,5b-5,17-,7-,27-,7-,9,2,2,2,20-,36,10,f-,7,14-,4,a,54-3,2-6,6-5,9-,1c-10,13-1d,1c-14,3c-,10-6,32-b,240-30,28-18,c-14,a0,115-,3,66-,b-76,5,5-,1d,24,2,5-2,2,8-,35-2,19,f-10,1d-3,311-37f,1b,5a-b,d7-19,d-3,41,57-,68-4,29-3,5f,29-37,2e-2,25-c,2c-2,4e-3,30,78-3,64-,20,19b7-49,51a7-59,48e-2,38-738,2ba5-5b,222f-,3c-94,8-b,6-4,1b,6,2,3,3,6d-20,16e-f,41-,37-7,2e-2,11-f,5-b,18-,b,14,5-3,6,88-,2,bf-2,7-,7-,7-,4-2,8,8-9,8-2ff,20,5-b,1c-b4,27-,27-cbb1,f7-9,28-2,b5-221,56,48,3-,2-,3-,5,d,2,5,3,42,5-,9,8,1d,5,6,2-2,8,153-3,123-3,33-27fd,a6da-5128,21f-5df,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3-fffd,3,2-1d,61-ff7d");
// @TODO: Make this relative...
var Table_B_1_flags = "ad,34f,1806,180b,180c,180d,200b,200c,200d,2060,feff".split(",").map(function (v) { return parseInt(v, 16); });
var Table_B_2_ranges = [
    { h: 25, s: 32, l: 65 },
    { h: 30, s: 32, e: [23], l: 127 },
    { h: 54, s: 1, e: [48], l: 64, d: 2 },
    { h: 14, s: 1, l: 57, d: 2 },
    { h: 44, s: 1, l: 17, d: 2 },
    { h: 10, s: 1, e: [2, 6, 8], l: 61, d: 2 },
    { h: 16, s: 1, l: 68, d: 2 },
    { h: 84, s: 1, e: [18, 24, 66], l: 19, d: 2 },
    { h: 26, s: 32, e: [17], l: 435 },
    { h: 22, s: 1, l: 71, d: 2 },
    { h: 15, s: 80, l: 40 },
    { h: 31, s: 32, l: 16 },
    { h: 32, s: 1, l: 80, d: 2 },
    { h: 52, s: 1, l: 42, d: 2 },
    { h: 12, s: 1, l: 55, d: 2 },
    { h: 40, s: 1, e: [38], l: 15, d: 2 },
    { h: 14, s: 1, l: 48, d: 2 },
    { h: 37, s: 48, l: 49 },
    { h: 148, s: 1, l: 6351, d: 2 },
    { h: 88, s: 1, l: 160, d: 2 },
    { h: 15, s: 16, l: 704 },
    { h: 25, s: 26, l: 854 },
    { h: 25, s: 32, l: 55915 },
    { h: 37, s: 40, l: 1247 },
    { h: 25, s: -119711, l: 53248 },
    { h: 25, s: -119763, l: 52 },
    { h: 25, s: -119815, l: 52 },
    { h: 25, s: -119867, e: [1, 4, 5, 7, 8, 11, 12, 17], l: 52 },
    { h: 25, s: -119919, l: 52 },
    { h: 24, s: -119971, e: [2, 7, 8, 17], l: 52 },
    { h: 24, s: -120023, e: [2, 7, 13, 15, 16, 17], l: 52 },
    { h: 25, s: -120075, l: 52 },
    { h: 25, s: -120127, l: 52 },
    { h: 25, s: -120179, l: 52 },
    { h: 25, s: -120231, l: 52 },
    { h: 25, s: -120283, l: 52 },
    { h: 25, s: -120335, l: 52 },
    { h: 24, s: -119543, e: [17], l: 56 },
    { h: 24, s: -119601, e: [17], l: 58 },
    { h: 24, s: -119659, e: [17], l: 58 },
    { h: 24, s: -119717, e: [17], l: 58 },
    { h: 24, s: -119775, e: [17], l: 58 }
];
var Table_B_2_lut_abs = createTable("b5:3bc,c3:ff,7:73,2:253,5:254,3:256,1:257,5:259,1:25b,3:260,1:263,2:269,1:268,5:26f,1:272,2:275,7:280,3:283,5:288,3:28a,1:28b,5:292,3f:195,1:1bf,29:19e,125:3b9,8b:3b2,1:3b8,1:3c5,3:3c6,1:3c0,1a:3ba,1:3c1,1:3c3,2:3b8,1:3b5,1bc9:3b9,1c:1f76,1:1f77,f:1f7a,1:1f7b,d:1f78,1:1f79,1:1f7c,1:1f7d,107:63,5:25b,4:68,1:68,1:68,3:69,1:69,1:6c,3:6e,4:70,1:71,1:72,1:72,1:72,7:7a,2:3c9,2:7a,2:6b,1:e5,1:62,1:63,3:65,1:66,2:6d,b:3b3,1:3c0,6:64,1b574:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3,20:3b8,1a:3c3");
var Table_B_2_lut_rel = createTable("179:1,2:1,2:1,5:1,2:1,a:4f,a:1,8:1,2:1,2:1,3:1,5:1,3:1,4:1,2:1,3:1,4:1,8:2,1:1,2:2,1:1,2:2,27:2,195:26,2:25,1:25,1:25,2:40,2:3f,1:3f,33:1,11:-6,1:-9,1ac7:-3a,6d:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,b:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,c:-8,2:-8,2:-8,2:-8,9:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,1:-8,49:-8,1:-8,1:-4a,1:-4a,d:-56,1:-56,1:-56,1:-56,d:-8,1:-8,f:-8,1:-8,3:-7");
var Table_B_2_complex = createTable("df:00730073,51:00690307,19:02BC006E,a7:006A030C,18a:002003B9,16:03B903080301,20:03C503080301,1d7:05650582,190f:00680331,1:00740308,1:0077030A,1:0079030A,1:006102BE,b6:03C50313,2:03C503130300,2:03C503130301,2:03C503130342,2a:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F0003B9,1:1F0103B9,1:1F0203B9,1:1F0303B9,1:1F0403B9,1:1F0503B9,1:1F0603B9,1:1F0703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F2003B9,1:1F2103B9,1:1F2203B9,1:1F2303B9,1:1F2403B9,1:1F2503B9,1:1F2603B9,1:1F2703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,1:1F6003B9,1:1F6103B9,1:1F6203B9,1:1F6303B9,1:1F6403B9,1:1F6503B9,1:1F6603B9,1:1F6703B9,3:1F7003B9,1:03B103B9,1:03AC03B9,2:03B10342,1:03B1034203B9,5:03B103B9,6:1F7403B9,1:03B703B9,1:03AE03B9,2:03B70342,1:03B7034203B9,5:03B703B9,6:03B903080300,1:03B903080301,3:03B90342,1:03B903080342,b:03C503080300,1:03C503080301,1:03C10313,2:03C50342,1:03C503080342,b:1F7C03B9,1:03C903B9,1:03CE03B9,2:03C90342,1:03C9034203B9,5:03C903B9,ac:00720073,5b:00B00063,6:00B00066,d:006E006F,a:0073006D,1:00740065006C,1:0074006D,124f:006800700061,2:00610075,2:006F0076,b:00700061,1:006E0061,1:03BC0061,1:006D0061,1:006B0061,1:006B0062,1:006D0062,1:00670062,3:00700066,1:006E0066,1:03BC0066,4:0068007A,1:006B0068007A,1:006D0068007A,1:00670068007A,1:00740068007A,15:00700061,1:006B00700061,1:006D00700061,1:006700700061,8:00700076,1:006E0076,1:03BC0076,1:006D0076,1:006B0076,1:006D0076,1:00700077,1:006E0077,1:03BC0077,1:006D0077,1:006B0077,1:006D0077,1:006B03C9,1:006D03C9,2:00620071,3:00632215006B0067,1:0063006F002E,1:00640062,1:00670079,2:00680070,2:006B006B,1:006B006D,9:00700068,2:00700070006D,1:00700072,2:00730076,1:00770062,c723:00660066,1:00660069,1:0066006C,1:006600660069,1:00660066006C,1:00730074,1:00730074,d:05740576,1:05740565,1:0574056B,1:057E0576,1:0574056D", bytes2);
var Table_C_ranges = createRangeTable("80-20,2a0-,39c,32,f71,18e,7f2-f,19-7,30-4,7-5,f81-b,5,a800-20ff,4d1-1f,110,fa-6,d174-7,2e84-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,ffff-,2,1f-5f,ff7f-20001");
function flatten(values) {
    return values.reduce(function (accum, value) {
        value.forEach(function (value) { accum.push(value); });
        return accum;
    }, []);
}
function _nameprepTableA1(codepoint) {
    return !!matchMap(codepoint, Table_A_1_ranges);
}
exports._nameprepTableA1 = _nameprepTableA1;
function _nameprepTableB2(codepoint) {
    var range = matchMap(codepoint, Table_B_2_ranges);
    if (range) {
        return [codepoint + range.s];
    }
    var codes = Table_B_2_lut_abs[codepoint];
    if (codes) {
        return codes;
    }
    var shift = Table_B_2_lut_rel[codepoint];
    if (shift) {
        return [codepoint + shift[0]];
    }
    var complex = Table_B_2_complex[codepoint];
    if (complex) {
        return complex;
    }
    return null;
}
exports._nameprepTableB2 = _nameprepTableB2;
function _nameprepTableC(codepoint) {
    return !!matchMap(codepoint, Table_C_ranges);
}
exports._nameprepTableC = _nameprepTableC;
function nameprep(value) {
    // This allows platforms with incomplete normalize to bypass
    // it for very basic names which the built-in toLowerCase
    // will certainly handle correctly
    if (value.match(/^[a-z0-9-]*$/i) && value.length <= 59) {
        return value.toLowerCase();
    }
    // Get the code points (keeping the current normalization)
    var codes = (0, utf8_1.toUtf8CodePoints)(value);
    codes = flatten(codes.map(function (code) {
        // Substitute Table B.1 (Maps to Nothing)
        if (Table_B_1_flags.indexOf(code) >= 0) {
            return [];
        }
        if (code >= 0xfe00 && code <= 0xfe0f) {
            return [];
        }
        // Substitute Table B.2 (Case Folding)
        var codesTableB2 = _nameprepTableB2(code);
        if (codesTableB2) {
            return codesTableB2;
        }
        // No Substitution
        return [code];
    }));
    // Normalize using form KC
    codes = (0, utf8_1.toUtf8CodePoints)((0, utf8_1._toUtf8String)(codes), utf8_1.UnicodeNormalizationForm.NFKC);
    // Prohibit Tables C.1.2, C.2.2, C.3, C.4, C.5, C.6, C.7, C.8, C.9
    codes.forEach(function (code) {
        if (_nameprepTableC(code)) {
            throw new Error("STRINGPREP_CONTAINS_PROHIBITED");
        }
    });
    // Prohibit Unassigned Code Points (Table A.1)
    codes.forEach(function (code) {
        if (_nameprepTableA1(code)) {
            throw new Error("STRINGPREP_CONTAINS_UNASSIGNED");
        }
    });
    // IDNA extras
    var name = (0, utf8_1._toUtf8String)(codes);
    // IDNA: 4.2.3.1
    if (name.substring(0, 1) === "-" || name.substring(2, 4) === "--" || name.substring(name.length - 1) === "-") {
        throw new Error("invalid hyphen");
    }
    // IDNA: 4.2.4
    if (name.length > 63) {
        throw new Error("too long");
    }
    return name;
}
exports.nameprep = nameprep;

},{"./utf8":53}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nameprep = exports.parseBytes32String = exports.formatBytes32String = exports.UnicodeNormalizationForm = exports.Utf8ErrorReason = exports.Utf8ErrorFuncs = exports.toUtf8String = exports.toUtf8CodePoints = exports.toUtf8Bytes = exports._toEscapedUtf8String = void 0;
var bytes32_1 = require("./bytes32");
Object.defineProperty(exports, "formatBytes32String", { enumerable: true, get: function () { return bytes32_1.formatBytes32String; } });
Object.defineProperty(exports, "parseBytes32String", { enumerable: true, get: function () { return bytes32_1.parseBytes32String; } });
var idna_1 = require("./idna");
Object.defineProperty(exports, "nameprep", { enumerable: true, get: function () { return idna_1.nameprep; } });
var utf8_1 = require("./utf8");
Object.defineProperty(exports, "_toEscapedUtf8String", { enumerable: true, get: function () { return utf8_1._toEscapedUtf8String; } });
Object.defineProperty(exports, "toUtf8Bytes", { enumerable: true, get: function () { return utf8_1.toUtf8Bytes; } });
Object.defineProperty(exports, "toUtf8CodePoints", { enumerable: true, get: function () { return utf8_1.toUtf8CodePoints; } });
Object.defineProperty(exports, "toUtf8String", { enumerable: true, get: function () { return utf8_1.toUtf8String; } });
Object.defineProperty(exports, "UnicodeNormalizationForm", { enumerable: true, get: function () { return utf8_1.UnicodeNormalizationForm; } });
Object.defineProperty(exports, "Utf8ErrorFuncs", { enumerable: true, get: function () { return utf8_1.Utf8ErrorFuncs; } });
Object.defineProperty(exports, "Utf8ErrorReason", { enumerable: true, get: function () { return utf8_1.Utf8ErrorReason; } });

},{"./bytes32":50,"./idna":51,"./utf8":53}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toUtf8CodePoints = exports.toUtf8String = exports._toUtf8String = exports._toEscapedUtf8String = exports.toUtf8Bytes = exports.Utf8ErrorFuncs = exports.Utf8ErrorReason = exports.UnicodeNormalizationForm = void 0;
var bytes_1 = require("@ethersproject/bytes");
var logger_1 = require("@ethersproject/logger");
var _version_1 = require("./_version");
var logger = new logger_1.Logger(_version_1.version);
///////////////////////////////
var UnicodeNormalizationForm;
(function (UnicodeNormalizationForm) {
    UnicodeNormalizationForm["current"] = "";
    UnicodeNormalizationForm["NFC"] = "NFC";
    UnicodeNormalizationForm["NFD"] = "NFD";
    UnicodeNormalizationForm["NFKC"] = "NFKC";
    UnicodeNormalizationForm["NFKD"] = "NFKD";
})(UnicodeNormalizationForm = exports.UnicodeNormalizationForm || (exports.UnicodeNormalizationForm = {}));
;
var Utf8ErrorReason;
(function (Utf8ErrorReason) {
    // A continuation byte was present where there was nothing to continue
    // - offset = the index the codepoint began in
    Utf8ErrorReason["UNEXPECTED_CONTINUE"] = "unexpected continuation byte";
    // An invalid (non-continuation) byte to start a UTF-8 codepoint was found
    // - offset = the index the codepoint began in
    Utf8ErrorReason["BAD_PREFIX"] = "bad codepoint prefix";
    // The string is too short to process the expected codepoint
    // - offset = the index the codepoint began in
    Utf8ErrorReason["OVERRUN"] = "string overrun";
    // A missing continuation byte was expected but not found
    // - offset = the index the continuation byte was expected at
    Utf8ErrorReason["MISSING_CONTINUE"] = "missing continuation byte";
    // The computed code point is outside the range for UTF-8
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; outside the UTF-8 range
    Utf8ErrorReason["OUT_OF_RANGE"] = "out of UTF-8 range";
    // UTF-8 strings may not contain UTF-16 surrogate pairs
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; inside the UTF-16 surrogate range
    Utf8ErrorReason["UTF16_SURROGATE"] = "UTF-16 surrogate";
    // The string is an overlong representation
    // - offset       = start of this codepoint
    // - badCodepoint = the computed codepoint; already bounds checked
    Utf8ErrorReason["OVERLONG"] = "overlong representation";
})(Utf8ErrorReason = exports.Utf8ErrorReason || (exports.Utf8ErrorReason = {}));
;
function errorFunc(reason, offset, bytes, output, badCodepoint) {
    return logger.throwArgumentError("invalid codepoint at offset " + offset + "; " + reason, "bytes", bytes);
}
function ignoreFunc(reason, offset, bytes, output, badCodepoint) {
    // If there is an invalid prefix (including stray continuation), skip any additional continuation bytes
    if (reason === Utf8ErrorReason.BAD_PREFIX || reason === Utf8ErrorReason.UNEXPECTED_CONTINUE) {
        var i = 0;
        for (var o = offset + 1; o < bytes.length; o++) {
            if (bytes[o] >> 6 !== 0x02) {
                break;
            }
            i++;
        }
        return i;
    }
    // This byte runs us past the end of the string, so just jump to the end
    // (but the first byte was read already read and therefore skipped)
    if (reason === Utf8ErrorReason.OVERRUN) {
        return bytes.length - offset - 1;
    }
    // Nothing to skip
    return 0;
}
function replaceFunc(reason, offset, bytes, output, badCodepoint) {
    // Overlong representations are otherwise "valid" code points; just non-deistingtished
    if (reason === Utf8ErrorReason.OVERLONG) {
        output.push(badCodepoint);
        return 0;
    }
    // Put the replacement character into the output
    output.push(0xfffd);
    // Otherwise, process as if ignoring errors
    return ignoreFunc(reason, offset, bytes, output, badCodepoint);
}
// Common error handing strategies
exports.Utf8ErrorFuncs = Object.freeze({
    error: errorFunc,
    ignore: ignoreFunc,
    replace: replaceFunc
});
// http://stackoverflow.com/questions/13356493/decode-utf-8-with-javascript#13691499
function getUtf8CodePoints(bytes, onError) {
    if (onError == null) {
        onError = exports.Utf8ErrorFuncs.error;
    }
    bytes = (0, bytes_1.arrayify)(bytes);
    var result = [];
    var i = 0;
    // Invalid bytes are ignored
    while (i < bytes.length) {
        var c = bytes[i++];
        // 0xxx xxxx
        if (c >> 7 === 0) {
            result.push(c);
            continue;
        }
        // Multibyte; how many bytes left for this character?
        var extraLength = null;
        var overlongMask = null;
        // 110x xxxx 10xx xxxx
        if ((c & 0xe0) === 0xc0) {
            extraLength = 1;
            overlongMask = 0x7f;
            // 1110 xxxx 10xx xxxx 10xx xxxx
        }
        else if ((c & 0xf0) === 0xe0) {
            extraLength = 2;
            overlongMask = 0x7ff;
            // 1111 0xxx 10xx xxxx 10xx xxxx 10xx xxxx
        }
        else if ((c & 0xf8) === 0xf0) {
            extraLength = 3;
            overlongMask = 0xffff;
        }
        else {
            if ((c & 0xc0) === 0x80) {
                i += onError(Utf8ErrorReason.UNEXPECTED_CONTINUE, i - 1, bytes, result);
            }
            else {
                i += onError(Utf8ErrorReason.BAD_PREFIX, i - 1, bytes, result);
            }
            continue;
        }
        // Do we have enough bytes in our data?
        if (i - 1 + extraLength >= bytes.length) {
            i += onError(Utf8ErrorReason.OVERRUN, i - 1, bytes, result);
            continue;
        }
        // Remove the length prefix from the char
        var res = c & ((1 << (8 - extraLength - 1)) - 1);
        for (var j = 0; j < extraLength; j++) {
            var nextChar = bytes[i];
            // Invalid continuation byte
            if ((nextChar & 0xc0) != 0x80) {
                i += onError(Utf8ErrorReason.MISSING_CONTINUE, i, bytes, result);
                res = null;
                break;
            }
            ;
            res = (res << 6) | (nextChar & 0x3f);
            i++;
        }
        // See above loop for invalid continuation byte
        if (res === null) {
            continue;
        }
        // Maximum code point
        if (res > 0x10ffff) {
            i += onError(Utf8ErrorReason.OUT_OF_RANGE, i - 1 - extraLength, bytes, result, res);
            continue;
        }
        // Reserved for UTF-16 surrogate halves
        if (res >= 0xd800 && res <= 0xdfff) {
            i += onError(Utf8ErrorReason.UTF16_SURROGATE, i - 1 - extraLength, bytes, result, res);
            continue;
        }
        // Check for overlong sequences (more bytes than needed)
        if (res <= overlongMask) {
            i += onError(Utf8ErrorReason.OVERLONG, i - 1 - extraLength, bytes, result, res);
            continue;
        }
        result.push(res);
    }
    return result;
}
// http://stackoverflow.com/questions/18729405/how-to-convert-utf8-string-to-byte-array
function toUtf8Bytes(str, form) {
    if (form === void 0) { form = UnicodeNormalizationForm.current; }
    if (form != UnicodeNormalizationForm.current) {
        logger.checkNormalize();
        str = str.normalize(form);
    }
    var result = [];
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 0x80) {
            result.push(c);
        }
        else if (c < 0x800) {
            result.push((c >> 6) | 0xc0);
            result.push((c & 0x3f) | 0x80);
        }
        else if ((c & 0xfc00) == 0xd800) {
            i++;
            var c2 = str.charCodeAt(i);
            if (i >= str.length || (c2 & 0xfc00) !== 0xdc00) {
                throw new Error("invalid utf-8 string");
            }
            // Surrogate Pair
            var pair = 0x10000 + ((c & 0x03ff) << 10) + (c2 & 0x03ff);
            result.push((pair >> 18) | 0xf0);
            result.push(((pair >> 12) & 0x3f) | 0x80);
            result.push(((pair >> 6) & 0x3f) | 0x80);
            result.push((pair & 0x3f) | 0x80);
        }
        else {
            result.push((c >> 12) | 0xe0);
            result.push(((c >> 6) & 0x3f) | 0x80);
            result.push((c & 0x3f) | 0x80);
        }
    }
    return (0, bytes_1.arrayify)(result);
}
exports.toUtf8Bytes = toUtf8Bytes;
;
function escapeChar(value) {
    var hex = ("0000" + value.toString(16));
    return "\\u" + hex.substring(hex.length - 4);
}
function _toEscapedUtf8String(bytes, onError) {
    return '"' + getUtf8CodePoints(bytes, onError).map(function (codePoint) {
        if (codePoint < 256) {
            switch (codePoint) {
                case 8: return "\\b";
                case 9: return "\\t";
                case 10: return "\\n";
                case 13: return "\\r";
                case 34: return "\\\"";
                case 92: return "\\\\";
            }
            if (codePoint >= 32 && codePoint < 127) {
                return String.fromCharCode(codePoint);
            }
        }
        if (codePoint <= 0xffff) {
            return escapeChar(codePoint);
        }
        codePoint -= 0x10000;
        return escapeChar(((codePoint >> 10) & 0x3ff) + 0xd800) + escapeChar((codePoint & 0x3ff) + 0xdc00);
    }).join("") + '"';
}
exports._toEscapedUtf8String = _toEscapedUtf8String;
function _toUtf8String(codePoints) {
    return codePoints.map(function (codePoint) {
        if (codePoint <= 0xffff) {
            return String.fromCharCode(codePoint);
        }
        codePoint -= 0x10000;
        return String.fromCharCode((((codePoint >> 10) & 0x3ff) + 0xd800), ((codePoint & 0x3ff) + 0xdc00));
    }).join("");
}
exports._toUtf8String = _toUtf8String;
function toUtf8String(bytes, onError) {
    return _toUtf8String(getUtf8CodePoints(bytes, onError));
}
exports.toUtf8String = toUtf8String;
function toUtf8CodePoints(str, form) {
    if (form === void 0) { form = UnicodeNormalizationForm.current; }
    return getUtf8CodePoints(toUtf8Bytes(str, form));
}
exports.toUtf8CodePoints = toUtf8CodePoints;

},{"./_version":49,"@ethersproject/bytes":30,"@ethersproject/logger":44}],54:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var resolutionError_1 = __importStar(require("./errors/resolutionError"));
var Networking_1 = __importDefault(require("./utils/Networking"));
var FetchProvider = /** @class */ (function () {
    function FetchProvider(name, url) {
        this.url = url;
        this.name = name;
    }
    // This is used for test mocking
    FetchProvider.factory = function (name, url) {
        return new this(name, url);
    };
    FetchProvider.prototype.request = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var json;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.fetchJson(args)];
                    case 1:
                        json = _a.sent();
                        if (json.error) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                                providerMessage: json.error.message,
                            });
                        }
                        return [2 /*return*/, json.result];
                }
            });
        });
    };
    FetchProvider.prototype.fetchJson = function (args) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Networking_1.default.fetch(this.url, {
                            method: 'POST',
                            body: JSON.stringify({
                                jsonrpc: '2.0',
                                id: '1',
                                method: args.method,
                                params: args.params || [],
                            }),
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        })];
                    case 1:
                        response = _a.sent();
                        if (response.status !== 200) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                                providerMessage: "Request to " + this.url + " failed with response status " + response.status,
                            });
                        }
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    return FetchProvider;
}());
exports.default = FetchProvider;

},{"./errors/resolutionError":67,"./utils/Networking":73}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @internal
 */
var NamingService = /** @class */ (function () {
    function NamingService() {
    }
    return NamingService;
}());
exports.NamingService = NamingService;

},{}],56:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var bn_js_1 = __importDefault(require("bn.js"));
var Zns_1 = __importDefault(require("./Zns"));
var Uns_1 = __importDefault(require("./Uns"));
var UdApi_1 = __importDefault(require("./UdApi"));
var publicTypes_1 = require("./types/publicTypes");
var resolutionError_1 = __importStar(require("./errors/resolutionError"));
var DnsUtils_1 = __importDefault(require("./utils/DnsUtils"));
var utils_1 = require("./utils");
var Eip1993Factories_1 = require("./utils/Eip1993Factories");
var Networking_1 = __importDefault(require("./utils/Networking"));
var prepareAndValidate_1 = require("./utils/prepareAndValidate");
/**
 * Blockchain domain Resolution library - Resolution.
 * @example
 * ```
 * import Resolution from '@unstoppabledomains/resolution';
 *
 * let resolution = new Resolution({ blockchain: {
 *        uns: {
 *           url: "https://mainnet.infura.io/v3/12351245223",
 *           network: "mainnet"
 *        }
 *      }
 *   });
 *
 * let domain = "brad.zil";
 * resolution.addr(domain, "eth").then(addr => console.log(addr));;
 * ```
 */
var Resolution = /** @class */ (function () {
    function Resolution(_a) {
        var _b;
        var _c = (_a === void 0 ? {} : _a).sourceConfig, sourceConfig = _c === void 0 ? undefined : _c;
        var uns = isApi(sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.uns)
            ? new UdApi_1.default(sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.uns)
            : new Uns_1.default(sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.uns);
        var zns = isApi(sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.zns)
            ? new UdApi_1.default(sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.zns)
            : new Zns_1.default(sourceConfig === null || sourceConfig === void 0 ? void 0 : sourceConfig.zns);
        this.serviceMap = (_b = {},
            _b[publicTypes_1.NamingServiceName.UNS] = uns,
            _b[publicTypes_1.NamingServiceName.ZNS] = zns,
            _b);
    }
    /**
     * AutoConfigure the blockchain network for UNS
     * We make a "net_version" JSON RPC call to the blockchain either via url or with the help of given provider.
     * @param sourceConfig - configuration object for uns
     * @returns configured Resolution object
     */
    Resolution.autoNetwork = function (sourceConfig) {
        return __awaiter(this, void 0, void 0, function () {
            var resolution, _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        resolution = new this();
                        if (!sourceConfig.uns) return [3 /*break*/, 2];
                        _a = resolution.serviceMap;
                        _b = publicTypes_1.NamingServiceName.UNS;
                        return [4 /*yield*/, Uns_1.default.autoNetwork(sourceConfig.uns)];
                    case 1:
                        _a[_b] = _c.sent();
                        _c.label = 2;
                    case 2: return [2 /*return*/, resolution];
                }
            });
        });
    };
    /**
     * Creates a resolution with configured infura id for uns
     * @param infura - infura project id
     * @param networks - an optional object that describes what network to use when connecting UNS default is mainnet
     */
    Resolution.infura = function (infura, networks) {
        var _a, _b, _c, _d;
        return new this({
            sourceConfig: {
                uns: {
                    locations: {
                        Layer1: {
                            url: utils_1.signedInfuraLink(infura, (_a = networks === null || networks === void 0 ? void 0 : networks.uns) === null || _a === void 0 ? void 0 : _a.locations.Layer1.network),
                            network: ((_b = networks === null || networks === void 0 ? void 0 : networks.uns) === null || _b === void 0 ? void 0 : _b.locations.Layer1.network) || 'mainnet',
                        },
                        Layer2: {
                            url: utils_1.signedInfuraLink(infura, (_c = networks === null || networks === void 0 ? void 0 : networks.uns) === null || _c === void 0 ? void 0 : _c.locations.Layer2.network),
                            network: ((_d = networks === null || networks === void 0 ? void 0 : networks.uns) === null || _d === void 0 ? void 0 : _d.locations.Layer2.network) || 'polygon-mainnet',
                        },
                    },
                },
            },
        });
    };
    /**
     * Creates a resolution instance with configured provider
     * @param networks - an object that describes what network to use when connecting UNS or ZNS default is mainnet
     * @see https://eips.ethereum.org/EIPS/eip-1193
     */
    Resolution.fromResolutionProvider = function (networks) {
        if (networks.uns) {
            return this.fromEthereumEip1193Provider({
                uns: networks.uns,
            });
        }
        if (networks.zns) {
            return this.fromZilliqaProvider(networks.zns.provider, networks);
        }
        throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
            providerMessage: 'Must specify network for uns or zns',
        });
    };
    /**
     * Creates a resolution instance with configured provider
     * @param networks - an object that describes what network to use when connecting UNS default is mainnet
     * @see https://eips.ethereum.org/EIPS/eip-1193
     */
    Resolution.fromEthereumEip1193Provider = function (networks) {
        var sourceConfig = {};
        if (networks.uns) {
            sourceConfig.uns = {
                locations: {
                    Layer1: {
                        provider: networks.uns.locations.Layer1.provider,
                        network: networks.uns.locations.Layer1.network || 'mainnet',
                    },
                    Layer2: {
                        provider: networks.uns.locations.Layer2.provider,
                        network: networks.uns.locations.Layer2.network || 'polygon-mainnet',
                    },
                },
            };
        }
        return new this({
            sourceConfig: sourceConfig,
        });
    };
    /**
     * Creates a resolution instance with configured provider
     * @param provider - any provider compatible with EIP-1193
     * @param networks - an optional object that describes what network to use when connecting ZNS default is mainnet
     * @see https://eips.ethereum.org/EIPS/eip-1193
     */
    Resolution.fromZilliqaProvider = function (provider, networks) {
        var _a;
        return new this({
            sourceConfig: {
                zns: { provider: provider, network: ((_a = networks === null || networks === void 0 ? void 0 : networks.zns) === null || _a === void 0 ? void 0 : _a.network) || 'mainnet' },
            },
        });
    };
    /**
     * Create a resolution instance from web3 0.x version provider
     * @param networks - Ethereum network configuration with 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
     * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
     */
    Resolution.fromWeb3Version0Provider = function (networks) {
        return this.fromEthereumEip1193Provider({
            uns: networks.uns
                ? {
                    locations: {
                        Layer1: {
                            network: networks.uns.locations.Layer1.network,
                            provider: Eip1993Factories_1.Eip1993Factories.fromWeb3Version0Provider(networks.uns.locations.Layer1.provider),
                        },
                        Layer2: {
                            network: networks.uns.locations.Layer2.network,
                            provider: Eip1993Factories_1.Eip1993Factories.fromWeb3Version0Provider(networks.uns.locations.Layer2.provider),
                        },
                    },
                }
                : undefined,
        });
    };
    /**
     * Create a resolution instance from web3 1.x version provider
     * @param networks - an optional object with 1.x version provider from web3 ( must implement send(payload, callback) ) that describes what network to use when connecting UNS default is mainnet
     * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
     * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
     */
    Resolution.fromWeb3Version1Provider = function (networks) {
        return this.fromEthereumEip1193Provider({
            uns: networks.uns
                ? {
                    locations: {
                        Layer1: {
                            network: networks.uns.locations.Layer1.network,
                            provider: Eip1993Factories_1.Eip1993Factories.fromWeb3Version1Provider(networks.uns.locations.Layer1.provider),
                        },
                        Layer2: {
                            network: networks.uns.locations.Layer2.network,
                            provider: Eip1993Factories_1.Eip1993Factories.fromWeb3Version1Provider(networks.uns.locations.Layer2.provider),
                        },
                    },
                }
                : undefined,
        });
    };
    /**
     * Creates instance of resolution from provider that implements Ethers Provider#call interface.
     * This wrapper support only `eth_call` method for now, which is enough for all the current Resolution functionality
     * @param networks - an object that describes what network to use when connecting UNS default is mainnet
     * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
     * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
     * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
     * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
     */
    Resolution.fromEthersProvider = function (networks) {
        return this.fromEthereumEip1193Provider({
            uns: networks.uns
                ? {
                    locations: {
                        Layer1: {
                            network: networks.uns.locations.Layer1.network,
                            provider: Eip1993Factories_1.Eip1993Factories.fromEthersProvider(networks.uns.locations.Layer1.provider),
                        },
                        Layer2: {
                            network: networks.uns.locations.Layer2.network,
                            provider: Eip1993Factories_1.Eip1993Factories.fromEthersProvider(networks.uns.locations.Layer2.provider),
                        },
                    },
                }
                : undefined,
        });
    };
    /**
     * Resolves given domain name to a specific currency address if exists
     * @async
     * @param domain - domain name to be resolved
     * @param ticker - currency ticker like BTC, ETH, ZIL
     * @throws [[ResolutionError]] if address is not found
     * @returns A promise that resolves in an address
     */
    Resolution.prototype.addr = function (domain, ticker) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.record(domain, "crypto." + ticker.toUpperCase() + ".address")];
            });
        });
    };
    /**
     * Read multi-chain currency address if exists
     * @async
     * @param domain - domain name to be resolved
     * @param ticker - currency ticker (USDT, FTM, etc.)
     * @param chain - chain version, usually means blockchain ( ERC20, BEP2, OMNI, etc. )
     * @throws [[ResolutionError]] if address is not found
     * @returns A promise that resolves in an adress
     */
    Resolution.prototype.multiChainAddr = function (domain, ticker, chain) {
        return __awaiter(this, void 0, void 0, function () {
            var method, recordKey;
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                method = this.getNamingMethodOrThrow(domain);
                recordKey = "crypto." + ticker.toUpperCase() + ".version." + chain.toUpperCase() + ".address";
                return [2 /*return*/, method.record(domain, recordKey)];
            });
        });
    };
    /**
     * Resolves given domain name to a verified twitter handle
     * @async
     * @param domain - domain name to be resolved
     * @throws [[ResolutionError]] if twitter is not found
     * @returns A promise that resolves in a verified twitter handle
     */
    Resolution.prototype.twitter = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                method = this.getNamingMethodOrThrow(domain);
                return [2 /*return*/, method.twitter(domain)];
            });
        });
    };
    /**
     * Resolve a chat id from the domain record
     * @param domain - domain name to be resolved
     * @throws [[ResolutionError]]
     * @returns A promise that resolves in chatId
     */
    Resolution.prototype.chatId = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.record(domain, 'gundb.username.value')];
            });
        });
    };
    /**
     * Resolve a gundb public key from the domain record
     * @param domain - domain name to be resolved
     * @throws [[ResolutionError]]
     * @returns a promise that resolves in gundb public key
     */
    Resolution.prototype.chatPk = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.record(domain, 'gundb.public_key.value')];
            });
        });
    };
    /**
     * Resolves the IPFS hash configured for domain records on ZNS
     * @param domain - domain name
     * @throws [[ResolutionError]]
     */
    Resolution.prototype.ipfsHash = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                return [2 /*return*/, this.getPreferableNewRecord(domain, 'dweb.ipfs.hash', 'ipfs.html.value')];
            });
        });
    };
    /**
     * Resolves the httpUrl attached to domain
     * @param domain - domain name
     */
    Resolution.prototype.httpUrl = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                return [2 /*return*/, this.getPreferableNewRecord(domain, 'browser.redirect_url', 'ipfs.redirect_domain.value')];
            });
        });
    };
    /**
     * Resolves the ipfs email field from whois configurations
     * @param domain - domain name
     * @throws [[ResolutionError]]
     * @returns A Promise that resolves in an email address configured for this domain whois
     */
    Resolution.prototype.email = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.record(domain, 'whois.email.value')];
            });
        });
    };
    /**
     * @returns the resolver address for a specific domain
     * @param domain - domain to look for
     */
    Resolution.prototype.resolver = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var resolver;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                        return [4 /*yield*/, this.getNamingMethodOrThrow(domain).resolver(domain)];
                    case 1:
                        resolver = _a.sent();
                        if (!resolver) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnspecifiedResolver, {
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, resolver];
                }
            });
        });
    };
    /**
     * @param domain - domain name
     * @returns An owner address of the domain
     */
    Resolution.prototype.owner = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                        method = this.getNamingMethodOrThrow(domain);
                        return [4 /*yield*/, method.owner(domain)];
                    case 1: return [2 /*return*/, (_a.sent()) || null];
                }
            });
        });
    };
    /**
     * @param domain - domain name
     * @param recordKey - a name of a record to be resolved
     * @returns A record value promise for a given record name
     */
    Resolution.prototype.record = function (domain, recordKey) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                method = this.getNamingMethodOrThrow(domain);
                return [2 /*return*/, method.record(domain, recordKey)];
            });
        });
    };
    /**
     * @param domain domain name
     * @param keys Array of record keys to be resolved
     * @returns A Promise with key-value mapping of domain records
     */
    Resolution.prototype.records = function (domain, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                method = this.getNamingMethodOrThrow(domain);
                return [2 /*return*/, method.records(domain, keys)];
            });
        });
    };
    /**
     * @param domain domain name
     * @returns A Promise of whether or not the domain belongs to a wallet
     */
    Resolution.prototype.isRegistered = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                method = this.getNamingMethodOrThrow(domain);
                return [2 /*return*/, method.isRegistered(domain)];
            });
        });
    };
    /**
     * @param domain domain name
     * @returns A Promise of whether or not the domain is available
     */
    Resolution.prototype.isAvailable = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                method = this.getNamingMethodOrThrow(domain);
                return [2 /*return*/, method.isAvailable(domain)];
            });
        });
    };
    /**
     * @returns Produces a namehash from supported naming service in hex format with 0x prefix.
     * Corresponds to ERC721 token id in case of Ethereum based naming service like UNS.
     * @param domain domain name to be converted
     * @param options formatting options
     * @throws [[ResolutionError]] with UnsupportedDomain error code if domain extension is unknown
     */
    Resolution.prototype.namehash = function (domain, options) {
        if (options === void 0) { options = publicTypes_1.NamehashOptionsDefault; }
        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
        return this.formatNamehash(this.getNamingMethodOrThrow(domain).namehash(domain), options);
    };
    /**
     * @returns a namehash of a subdomain with name label
     * @param parent namehash of a parent domain
     * @param label subdomain name
     * @param namingService "UNS" or "ZNS"
     * @param options formatting options
     */
    Resolution.prototype.childhash = function (parent, label, namingService, options) {
        if (options === void 0) { options = publicTypes_1.NamehashOptionsDefault; }
        var service = this.serviceMap[namingService];
        if (!service) {
            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnsupportedService, {
                namingService: namingService,
            });
        }
        return this.formatNamehash(service.childhash(parent, label), options);
    };
    Resolution.prototype.formatNamehash = function (hash, options) {
        hash = hash.replace('0x', '');
        if (options.format === 'dec') {
            return new bn_js_1.default(hash, 'hex').toString(10);
        }
        else {
            return options.prefix ? '0x' + hash : hash;
        }
    };
    /**
     * Checks weather the domain name matches the hash
     * @param domain - domain name to check againt
     * @param hash - hash obtained from the blockchain
     */
    Resolution.prototype.isValidHash = function (domain, hash) {
        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
        return this.namehash(domain) === hash;
    };
    /**
     * Checks if the domain name is valid according to naming service rules
     * for valid domain names.
     * @param domain - domain name to be checked
     */
    Resolution.prototype.isSupportedDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var namingMethod, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                        namingMethod = this.getNamingMethod(domain);
                        if (!namingMethod) return [3 /*break*/, 2];
                        return [4 /*yield*/, namingMethod.isSupportedDomain(domain)];
                    case 1:
                        _a = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        _a = false;
                        _b.label = 3;
                    case 3: return [2 /*return*/, _a];
                }
            });
        });
    };
    /**
     * Returns the name of the service for a domain UNS | ZNS
     * @param domain - domain name to look for
     */
    Resolution.prototype.serviceName = function (domain) {
        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
        return this.getNamingMethodOrThrow(domain).serviceName();
    };
    /**
     * Returns all record keys of the domain.
     * This method is strongly unrecommended for production use due to lack of support for many ethereum service providers and low performance
     * @param domain - domain name
     */
    Resolution.prototype.allRecords = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                return [2 /*return*/, this.getNamingMethodOrThrow(domain).allRecords(domain)];
            });
        });
    };
    Resolution.prototype.allNonEmptyRecords = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var records, nonEmptyRecords, _i, _a, _b, key, value;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.allRecords(domain)];
                    case 1:
                        records = _c.sent();
                        nonEmptyRecords = {};
                        for (_i = 0, _a = Object.entries(records); _i < _a.length; _i++) {
                            _b = _a[_i], key = _b[0], value = _b[1];
                            if (value) {
                                nonEmptyRecords[key] = value;
                            }
                        }
                        return [2 /*return*/, nonEmptyRecords];
                }
            });
        });
    };
    Resolution.prototype.dns = function (domain, types) {
        return __awaiter(this, void 0, void 0, function () {
            var dnsUtils, method, dnsRecordKeys, blockchainData;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        dnsUtils = new DnsUtils_1.default();
                        domain = prepareAndValidate_1.prepareAndValidateDomain(domain);
                        method = this.getNamingMethodOrThrow(domain);
                        dnsRecordKeys = this.getDnsRecordKeys(types);
                        return [4 /*yield*/, method.records(domain, dnsRecordKeys)];
                    case 1:
                        blockchainData = _a.sent();
                        return [2 /*return*/, dnsUtils.toList(blockchainData)];
                }
            });
        });
    };
    /**
     * Retrieves the tokenURI from the registry smart contract.
     * @returns the ERC721Metadata#tokenURI contract method result
     * @param domain - domain name
     */
    Resolution.prototype.tokenURI = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var namehash;
            return __generator(this, function (_a) {
                namehash = this.namehash(domain);
                return [2 /*return*/, this.getNamingMethodOrThrow(domain).getTokenUri(namehash)];
            });
        });
    };
    /**
     * Retrieves the data from the endpoint provided by tokenURI from the registry smart contract.
     * @returns the JSON response of the token URI endpoint
     * @param domain - domain name
     */
    Resolution.prototype.tokenURIMetadata = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenUri;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.tokenURI(domain)];
                    case 1:
                        tokenUri = _a.sent();
                        return [2 /*return*/, this.getMetadataFromTokenURI(tokenUri)];
                }
            });
        });
    };
    /**
     * Retrieves address of registry contract used for domain
     * @param domain - domain name
     * @returns Registry contract address
     */
    Resolution.prototype.registryAddress = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var method;
            return __generator(this, function (_a) {
                method = this.getNamingMethodOrThrow(domain);
                return [2 /*return*/, method.registryAddress(domain)];
            });
        });
    };
    /**
     * Retrieves the domain name from tokenId by parsing registry smart contract event logs.
     * @throws {ResolutionError} if returned domain name doesn't match the original namhash.
     * @returns the domain name retrieved from token metadata
     * @param hash - domain hash
     * @param service - nameservice which is used for lookup
     */
    Resolution.prototype.unhash = function (hash, service) {
        return __awaiter(this, void 0, void 0, function () {
            var name;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.serviceMap[service].getDomainFromTokenId(hash)];
                    case 1:
                        name = _a.sent();
                        if (this.namehash(name) !== hash) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                                methodName: 'unhash',
                                domain: name,
                                providerMessage: 'Service provider returned an invalid domain name',
                            });
                        }
                        return [2 /*return*/, name];
                }
            });
        });
    };
    /**
     * Retrieves address of registry contract used for domain
     * @param domains - domain name
     * @returns Promise<Locations> - A map of domain name and Location (a set of attributes like blockchain,
     */
    Resolution.prototype.locations = function (domains) {
        return __awaiter(this, void 0, void 0, function () {
            var method, _i, domains_1, domain;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        method = this.getNamingMethodOrThrow(domains[0]);
                        _i = 0, domains_1 = domains;
                        _a.label = 1;
                    case 1:
                        if (!(_i < domains_1.length)) return [3 /*break*/, 4];
                        domain = domains_1[_i];
                        return [4 /*yield*/, method.isSupportedDomain(domain)];
                    case 2:
                        if (!(_a.sent())) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.InconsistentDomainArray);
                        }
                        _a.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/, method.locations(domains)];
                }
            });
        });
    };
    Resolution.prototype.getMetadataFromTokenURI = function (tokenUri) {
        return __awaiter(this, void 0, void 0, function () {
            var resp, _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0: return [4 /*yield*/, Networking_1.default.fetch(tokenUri, {})];
                    case 1:
                        resp = _d.sent();
                        if (resp.ok) {
                            return [2 /*return*/, resp.json()];
                        }
                        _a = resolutionError_1.default.bind;
                        _b = [void 0, resolutionError_1.ResolutionErrorCode.ServiceProviderError];
                        _c = {};
                        return [4 /*yield*/, resp.text()];
                    case 2: throw new (_a.apply(resolutionError_1.default, _b.concat([(_c.providerMessage = _d.sent(),
                            _c.method = 'UDAPI',
                            _c.methodName = 'tokenURIMetadata',
                            _c)])))();
                }
            });
        });
    };
    Resolution.prototype.getDnsRecordKeys = function (types) {
        var records = ['dns.ttl'];
        types.forEach(function (type) {
            records.push("dns." + type);
            records.push("dns." + type + ".ttl");
        });
        return records;
    };
    Resolution.prototype.getPreferableNewRecord = function (domain, newRecord, oldRecord) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.records(domain, [newRecord, oldRecord])];
                    case 1:
                        records = _a.sent();
                        if (!records[newRecord] && !records[oldRecord]) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                recordName: newRecord,
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, records[newRecord] || records[oldRecord]];
                }
            });
        });
    };
    Resolution.prototype.getNamingMethod = function (domain) {
        return this.serviceMap[utils_1.findNamingServiceName(domain)];
    };
    Resolution.prototype.getNamingMethodOrThrow = function (domain) {
        var method = this.getNamingMethod(domain);
        if (!method) {
            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnsupportedDomain, {
                domain: domain,
            });
        }
        return method;
    };
    return Resolution;
}());
exports.Resolution = Resolution;
exports.default = Resolution;
function isApi(obj) {
    return obj && obj.api;
}

},{"./UdApi":57,"./Uns":58,"./Zns":60,"./errors/resolutionError":67,"./types/publicTypes":70,"./utils":75,"./utils/DnsUtils":71,"./utils/Eip1993Factories":72,"./utils/Networking":73,"./utils/prepareAndValidate":77,"bn.js":80}],57:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var znsUtils_1 = require("./utils/znsUtils");
var resolutionError_1 = require("./errors/resolutionError");
var TwitterSignatureValidator_1 = require("./utils/TwitterSignatureValidator");
var publicTypes_1 = require("./types/publicTypes");
var Networking_1 = __importDefault(require("./utils/Networking"));
var utils_1 = require("./utils");
var namehash_1 = require("./utils/namehash");
var NamingService_1 = require("./NamingService");
/**
 * @internal
 */
var Udapi = /** @class */ (function (_super) {
    __extends(Udapi, _super);
    function Udapi(api) {
        var _this = _super.call(this) || this;
        _this.name = 'UDAPI';
        _this.url = (api === null || api === void 0 ? void 0 : api.url) || 'https://unstoppabledomains.com/api/v1';
        var DefaultUserAgent = 'cross-fetch/3.1.4 (+https://github.com/lquixada/cross-fetch)';
        var CustomUserAgent = DefaultUserAgent + " Resolution";
        _this.headers = { 'X-user-agent': CustomUserAgent };
        _this.network = (api === null || api === void 0 ? void 0 : api.network) || 1;
        return _this;
    }
    Udapi.prototype.isSupportedDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'isSupportedDomain',
                });
            });
        });
    };
    Udapi.prototype.namehash = function (domain) {
        var serviceName = utils_1.findNamingServiceName(domain);
        if (serviceName === publicTypes_1.NamingServiceName.ZNS) {
            return namehash_1.znsNamehash(domain);
        }
        return namehash_1.eip137Namehash(domain);
    };
    Udapi.prototype.childhash = function (parentHash, label) {
        throw new Error('Unsupported method whe using UD Resolution API');
    };
    Udapi.prototype.record = function (domain, key) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.records(domain, [key])];
                    case 1: return [2 /*return*/, (_a.sent())[key]];
                }
            });
        });
    };
    Udapi.prototype.records = function (domain, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.allRecords(domain)];
                    case 1:
                        records = _a.sent();
                        return [2 /*return*/, utils_1.constructRecords(keys, records)];
                }
            });
        });
    };
    Udapi.prototype.owner = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var owner;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolve(domain)];
                    case 1:
                        owner = (_a.sent()).meta.owner;
                        if (!owner) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domain,
                            });
                        }
                        if (domain.endsWith('.zil')) {
                            return [2 /*return*/, owner.startsWith('zil1') ? owner : znsUtils_1.toBech32Address(owner)];
                        }
                        return [2 /*return*/, owner];
                }
            });
        });
    };
    Udapi.prototype.twitter = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var serviceName, domainMetaData, owner, records, validationSignature, twitterHandle;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        serviceName = utils_1.findNamingServiceName(domain);
                        if (serviceName !== publicTypes_1.NamingServiceName.UNS) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                                domain: domain,
                                methodName: 'twitter',
                            });
                        }
                        return [4 /*yield*/, this.resolve(domain)];
                    case 1:
                        domainMetaData = _a.sent();
                        if (!domainMetaData.meta.owner) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domain,
                            });
                        }
                        owner = domainMetaData.meta.owner;
                        records = domainMetaData.records || {};
                        validationSignature = records['validation.social.twitter.username'];
                        twitterHandle = records['social.twitter.username'];
                        if (!validationSignature) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                recordName: 'validation.social.twitter.username',
                                domain: domain,
                            });
                        }
                        if (!twitterHandle) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                recordName: 'social.twitter.username',
                                domain: domain,
                            });
                        }
                        if (!TwitterSignatureValidator_1.isValidTwitterSignature({
                            tokenId: domainMetaData.meta.namehash,
                            owner: owner,
                            twitterHandle: twitterHandle,
                            validationSignature: validationSignature,
                        })) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.InvalidTwitterVerification, {
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, twitterHandle];
                }
            });
        });
    };
    Udapi.prototype.allRecords = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolve(domain)];
                    case 1: return [2 /*return*/, (_a.sent()).records || {}];
                }
            });
        });
    };
    Udapi.prototype.getDomainFromTokenId = function (tokenId) {
        throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
            methodName: 'isSupportedDomain',
        });
    };
    Udapi.prototype.resolve = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Networking_1.default.fetch(this.url + "/" + domain, {
                            method: 'GET',
                            headers: this.headers,
                        })];
                    case 1:
                        response = _a.sent();
                        return [2 /*return*/, response.json()];
                }
            });
        });
    };
    Udapi.prototype.serviceName = function () {
        return this.name;
    };
    Udapi.prototype.resolver = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var record;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolve(domain)];
                    case 1:
                        record = _a.sent();
                        return [2 /*return*/, record.meta.resolver];
                }
            });
        });
    };
    Udapi.prototype.reverse = function (address, currencyTicker) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'reverse',
                });
            });
        });
    };
    Udapi.prototype.isRegistered = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var record;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolve(domain)];
                    case 1:
                        record = _a.sent();
                        return [2 /*return*/, !utils_1.isNullAddress(record.meta.owner)];
                }
            });
        });
    };
    Udapi.prototype.getTokenUri = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'getTokenUri',
                });
            });
        });
    };
    Udapi.prototype.isAvailable = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.isRegistered(domain)];
                    case 1: return [2 /*return*/, !(_a.sent())];
                }
            });
        });
    };
    Udapi.prototype.registryAddress = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    domain: domain,
                    methodName: 'registryAddress',
                });
            });
        });
    };
    Udapi.prototype.locations = function (domains) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'locations',
                });
            });
        });
    };
    return Udapi;
}(NamingService_1.NamingService));
exports.default = Udapi;

},{"./NamingService":55,"./errors/resolutionError":67,"./types/publicTypes":70,"./utils":75,"./utils/Networking":73,"./utils/TwitterSignatureValidator":74,"./utils/namehash":76,"./utils/znsUtils":79}],58:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("./types");
var resolutionError_1 = __importStar(require("./errors/resolutionError"));
var utils_1 = require("./utils");
var publicTypes_1 = require("./types/publicTypes");
var TwitterSignatureValidator_1 = require("./utils/TwitterSignatureValidator");
var FetchProvider_1 = __importDefault(require("./FetchProvider"));
var namehash_1 = require("./utils/namehash");
var NamingService_1 = require("./NamingService");
var configurationError_1 = __importStar(require("./errors/configurationError"));
var UnsInternal_1 = __importDefault(require("./UnsInternal"));
var Networking_1 = __importDefault(require("./utils/Networking"));
var resolver_keys_json_1 = __importDefault(require("./config/resolver-keys.json"));
/**
 * @internal
 */
var Uns = /** @class */ (function (_super) {
    __extends(Uns, _super);
    function Uns(source) {
        var _this = _super.call(this) || this;
        _this.name = publicTypes_1.NamingServiceName.UNS;
        if (source &&
            source.locations &&
            (!source.locations.Layer1 || !source.locations.Layer2)) {
            throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.NetworkConfigMissing, {
                method: publicTypes_1.NamingServiceName.UNS,
                config: !source.locations.Layer1 ? 'Layer1' : 'Layer2',
            });
        }
        if (!source) {
            source = {
                locations: {
                    Layer1: {
                        url: UnsInternal_1.default.UrlMap['mainnet'],
                        network: 'mainnet',
                    },
                    Layer2: {
                        url: UnsInternal_1.default.UrlMap['polygon-mainnet'],
                        network: 'polygon-mainnet',
                    },
                },
            };
        }
        _this.unsl1 = new UnsInternal_1.default(publicTypes_1.UnsLocation.Layer1, source.locations.Layer1, publicTypes_1.BlockchainType.ETH);
        _this.unsl2 = new UnsInternal_1.default(publicTypes_1.UnsLocation.Layer2, source.locations.Layer2, publicTypes_1.BlockchainType.MATIC);
        return _this;
    }
    Uns.autoNetwork = function (config) {
        return __awaiter(this, void 0, void 0, function () {
            var providerLayer1, providerLayer2, networkIdLayer1, networkIdLayer2, networkNameLayer1, networkNameLayer2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (types_1.hasProvider(config.locations.Layer1) &&
                            types_1.hasProvider(config.locations.Layer2)) {
                            providerLayer1 = config.locations.Layer1.provider;
                            providerLayer2 = config.locations.Layer2.provider;
                        }
                        else {
                            if (!config.locations.Layer1['url'] || !config.locations.Layer2['url']) {
                                throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.UnspecifiedUrl, {
                                    method: publicTypes_1.NamingServiceName.UNS,
                                });
                            }
                            providerLayer1 = FetchProvider_1.default.factory(publicTypes_1.NamingServiceName.UNS, config.locations.Layer1['url']);
                            providerLayer2 = FetchProvider_1.default.factory(publicTypes_1.NamingServiceName.UNS, config.locations.Layer2['url']);
                        }
                        return [4 /*yield*/, providerLayer1.request({
                                method: 'net_version',
                            })];
                    case 1:
                        networkIdLayer1 = (_a.sent());
                        return [4 /*yield*/, providerLayer2.request({
                                method: 'net_version',
                            })];
                    case 2:
                        networkIdLayer2 = (_a.sent());
                        networkNameLayer1 = utils_1.EthereumNetworksInverted[networkIdLayer1];
                        networkNameLayer2 = utils_1.EthereumNetworksInverted[networkIdLayer2];
                        if (!networkNameLayer1 ||
                            !types_1.UnsSupportedNetwork.guard(networkNameLayer1) ||
                            !networkNameLayer2 ||
                            !types_1.UnsSupportedNetwork.guard(networkNameLayer2)) {
                            throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.UnsupportedNetwork, {
                                method: publicTypes_1.NamingServiceName.UNS,
                            });
                        }
                        return [2 /*return*/, new this({
                                locations: {
                                    Layer1: { network: networkNameLayer1, provider: providerLayer1 },
                                    Layer2: { network: networkNameLayer2, provider: providerLayer2 },
                                },
                            })];
                }
            });
        });
    };
    Uns.prototype.namehash = function (domain) {
        if (!this.checkDomain(domain)) {
            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnsupportedDomain, {
                domain: domain,
            });
        }
        return namehash_1.eip137Namehash(domain);
    };
    Uns.prototype.childhash = function (parentHash, label) {
        return namehash_1.eip137Childhash(parentHash, label);
    };
    Uns.prototype.serviceName = function () {
        return this.name;
    };
    Uns.prototype.isSupportedDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var tld, _a, existsL1, existsL2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.checkDomain(domain)) {
                            return [2 /*return*/, false];
                        }
                        tld = domain.split('.').pop();
                        if (!tld) {
                            return [2 /*return*/, false];
                        }
                        return [4 /*yield*/, Promise.all([
                                this.unsl1.exists(tld),
                                this.unsl2.exists(tld),
                            ])];
                    case 1:
                        _a = _b.sent(), existsL1 = _a[0], existsL2 = _a[1];
                        return [2 /*return*/, existsL1 || existsL2];
                }
            });
        });
    };
    Uns.prototype.owner = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenId, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenId = this.namehash(domain);
                        return [4 /*yield*/, this.get(tokenId, [])];
                    case 1:
                        data = _a.sent();
                        if (utils_1.isNullAddress(data.owner)) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, data.owner];
                }
            });
        });
    };
    Uns.prototype.resolver = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getVerifiedData(domain)];
                    case 1: return [2 /*return*/, (_a.sent()).resolver];
                }
            });
        });
    };
    Uns.prototype.record = function (domain, key) {
        return __awaiter(this, void 0, void 0, function () {
            var returnee;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.records(domain, [key])];
                    case 1:
                        returnee = (_a.sent())[key];
                        if (!returnee) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                recordName: key,
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, returnee];
                }
            });
        });
    };
    Uns.prototype.records = function (domain, keys) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getVerifiedData(domain, keys)];
                    case 1: return [2 /*return*/, (_a.sent()).records];
                }
            });
        });
    };
    Uns.prototype.allRecords = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenId, metadata;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenId = this.namehash(domain);
                        return [4 /*yield*/, this.getMetadata(tokenId)];
                    case 1:
                        metadata = _a.sent();
                        return [2 /*return*/, this.records(domain, __spreadArrays(Object.keys(resolver_keys_json_1.default.keys), Object.keys(metadata.properties.records)))];
                }
            });
        });
    };
    Uns.prototype.twitter = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenId, keys, data, records, location, validationSignature, twitterHandle, owner;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenId = this.namehash(domain);
                        keys = [
                            'validation.social.twitter.username',
                            'social.twitter.username',
                        ];
                        return [4 /*yield*/, this.getVerifiedData(domain, keys)];
                    case 1:
                        data = _a.sent();
                        records = data.records, location = data.location;
                        validationSignature = records['validation.social.twitter.username'];
                        twitterHandle = records['social.twitter.username'];
                        if (utils_1.isNullAddress(validationSignature)) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                domain: domain,
                                location: location,
                                recordName: 'validation.social.twitter.username',
                            });
                        }
                        if (!twitterHandle) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                domain: domain,
                                location: location,
                                recordName: 'social.twitter.username',
                            });
                        }
                        owner = data.owner;
                        if (!TwitterSignatureValidator_1.isValidTwitterSignature({
                            tokenId: tokenId,
                            owner: owner,
                            twitterHandle: twitterHandle,
                            validationSignature: validationSignature,
                        })) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.InvalidTwitterVerification, {
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, twitterHandle];
                }
            });
        });
    };
    Uns.prototype.reverse = function (address, currencyTicker) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'reverse',
                });
            });
        });
    };
    Uns.prototype.isRegistered = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenId, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenId = this.namehash(domain);
                        return [4 /*yield*/, this.get(tokenId, [])];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, !utils_1.isNullAddress(data.owner)];
                }
            });
        });
    };
    Uns.prototype.getTokenUri = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, resultOrErrorL1, resultOrErrorL2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.unsl1.getTokenUri(tokenId).catch(function (err) { return err; }),
                            this.unsl2.getTokenUri(tokenId).catch(function (err) { return err; }),
                        ])];
                    case 1:
                        _a = _b.sent(), resultOrErrorL1 = _a[0], resultOrErrorL2 = _a[1];
                        if (resultOrErrorL2 instanceof Error) {
                            if (!resultOrErrorL2.message.includes('ERC721Metadata: URI query for nonexistent token')) {
                                throw resultOrErrorL2;
                            }
                        }
                        else {
                            return [2 /*return*/, resultOrErrorL2];
                        }
                        if (resultOrErrorL1 instanceof Error) {
                            validResolutionErrorOrThrow(resultOrErrorL1, resolutionError_1.ResolutionErrorCode.ServiceProviderError);
                            if (resultOrErrorL1.message === '< execution reverted >') {
                                throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                    domain: "with tokenId " + tokenId,
                                });
                            }
                        }
                        return [2 /*return*/, resultOrErrorL1];
                }
            });
        });
    };
    Uns.prototype.isAvailable = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.isRegistered(domain)];
                    case 1: return [2 /*return*/, !(_a.sent())];
                }
            });
        });
    };
    Uns.prototype.registryAddress = function (domainOrNamehash) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, resultOrErrorL1, resultOrErrorL2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.unsl1.registryAddress(domainOrNamehash).catch(function (err) { return err; }),
                            this.unsl2.registryAddress(domainOrNamehash).catch(function (err) { return err; }),
                        ])];
                    case 1:
                        _a = _b.sent(), resultOrErrorL1 = _a[0], resultOrErrorL2 = _a[1];
                        if (resultOrErrorL2 instanceof Error) {
                            validResolutionErrorOrThrow(resultOrErrorL2, resolutionError_1.ResolutionErrorCode.UnregisteredDomain);
                        }
                        else if (!utils_1.isNullAddress(resultOrErrorL2)) {
                            return [2 /*return*/, resultOrErrorL2];
                        }
                        return [2 /*return*/, validResultOrThrow(resultOrErrorL1)];
                }
            });
        });
    };
    Uns.prototype.locations = function (domains) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, resultL1, resultL2, nonEmptyRecordsFromL2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.unsl1.locations(domains),
                            this.unsl2.locations(domains),
                        ])];
                    case 1:
                        _a = _b.sent(), resultL1 = _a[0], resultL2 = _a[1];
                        nonEmptyRecordsFromL2 = Object.keys(resultL2)
                            .filter(function (k) { return resultL2[k] != null; })
                            .reduce(function (a, k) {
                            var _a;
                            return (__assign(__assign({}, a), (_a = {}, _a[k] = resultL2[k], _a)));
                        }, {});
                        return [2 /*return*/, __assign(__assign({}, resultL1), nonEmptyRecordsFromL2)];
                }
            });
        });
    };
    Uns.prototype.getDomainFromTokenId = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var metadata;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getMetadata(tokenId)];
                    case 1:
                        metadata = _a.sent();
                        return [2 /*return*/, metadata.name];
                }
            });
        });
    };
    Uns.prototype.getMetadata = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenUri, resp, metadata;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getTokenUri(tokenId)];
                    case 1:
                        tokenUri = _a.sent();
                        return [4 /*yield*/, Networking_1.default.fetch(tokenUri, {}).catch(function (err) {
                                throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.MetadataEndpointError, {
                                    tokenUri: tokenUri || 'undefined',
                                    errorMessage: err.message,
                                });
                            })];
                    case 2:
                        resp = _a.sent();
                        if (!resp.ok) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.MetadataEndpointError, {
                                tokenUri: tokenUri || 'undefined',
                            });
                        }
                        return [4 /*yield*/, resp.json()];
                    case 3:
                        metadata = _a.sent();
                        if (!metadata.name) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: "with tokenId " + tokenId,
                            });
                        }
                        if (this.namehash(metadata.name) !== tokenId) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                                methodName: 'unhash',
                                domain: metadata.name,
                                providerMessage: 'Service provider returned an invalid domain name',
                            });
                        }
                        return [2 /*return*/, metadata];
                }
            });
        });
    };
    Uns.prototype.getVerifiedData = function (domain, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenId, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenId = this.namehash(domain);
                        return [4 /*yield*/, this.get(tokenId, keys)];
                    case 1:
                        data = _a.sent();
                        if (utils_1.isNullAddress(data.resolver)) {
                            if (utils_1.isNullAddress(data.owner)) {
                                throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                    domain: domain,
                                });
                            }
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnspecifiedResolver, {
                                location: data.location,
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    Uns.prototype.get = function (tokenId, keys) {
        if (keys === void 0) { keys = []; }
        return __awaiter(this, void 0, void 0, function () {
            var _a, resultOrErrorL1, resultOrErrorL2, resolverL2, ownerL2, recordsL2, resolverL1, ownerL1, recordsL1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, Promise.all([
                            this.unsl1.get(tokenId, keys).catch(function (err) { return err; }),
                            this.unsl2.get(tokenId, keys).catch(function (err) { return err; }),
                        ])];
                    case 1:
                        _a = _b.sent(), resultOrErrorL1 = _a[0], resultOrErrorL2 = _a[1];
                        validResultOrThrow(resultOrErrorL2);
                        resolverL2 = resultOrErrorL2.resolver, ownerL2 = resultOrErrorL2.owner, recordsL2 = resultOrErrorL2.records;
                        if (!utils_1.isNullAddress(ownerL2)) {
                            return [2 /*return*/, {
                                    resolver: resolverL2,
                                    owner: ownerL2,
                                    records: utils_1.constructRecords(keys, recordsL2),
                                    location: publicTypes_1.UnsLocation.Layer2,
                                }];
                        }
                        validResultOrThrow(resultOrErrorL1);
                        resolverL1 = resultOrErrorL1.resolver, ownerL1 = resultOrErrorL1.owner, recordsL1 = resultOrErrorL1.records;
                        return [2 /*return*/, {
                                resolver: resolverL1,
                                owner: ownerL1,
                                records: utils_1.constructRecords(keys, recordsL1),
                                location: publicTypes_1.UnsLocation.Layer1,
                            }];
                }
            });
        });
    };
    Uns.prototype.checkDomain = function (domain, passIfTokenID) {
        if (passIfTokenID === void 0) { passIfTokenID = false; }
        if (passIfTokenID) {
            return true;
        }
        var tokens = domain.split('.');
        return (!!tokens.length &&
            tokens[tokens.length - 1] !== 'zil' &&
            !(domain === 'eth' ||
                /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain)) &&
            tokens.every(function (v) { return !!v.length; }));
    };
    return Uns;
}(NamingService_1.NamingService));
exports.default = Uns;
function validResultOrThrow(resultOrError) {
    if (resultOrError instanceof Error) {
        throw resultOrError;
    }
    return resultOrError;
}
function validResolutionErrorOrThrow(error, validCode) {
    if (!(error instanceof resolutionError_1.default)) {
        throw error;
    }
    if (error.code === validCode) {
        return true;
    }
    throw error;
}

},{"./FetchProvider":54,"./NamingService":55,"./UnsInternal":59,"./config/resolver-keys.json":61,"./errors/configurationError":65,"./errors/resolutionError":67,"./types":69,"./types/publicTypes":70,"./utils":75,"./utils/Networking":73,"./utils/TwitterSignatureValidator":74,"./utils/namehash":76}],59:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var types_1 = require("./types");
var configurationError_1 = __importDefault(require("./errors/configurationError"));
var configurationError_2 = require("./errors/configurationError");
var utils_1 = require("./utils");
var FetchProvider_1 = __importDefault(require("./FetchProvider"));
var EthereumContract_1 = __importDefault(require("./contracts/EthereumContract"));
var proxyReader_1 = __importDefault(require("./contracts/uns/proxyReader"));
var uns_config_json_1 = __importDefault(require("./config/uns-config.json"));
var resolutionError_1 = __importStar(require("./errors/resolutionError"));
var namehash_1 = require("./utils/namehash");
var UnsInternal = /** @class */ (function () {
    function UnsInternal(unsLocation, source, blockchain) {
        this.unsLocation = unsLocation;
        this.checkNetworkConfig(unsLocation, source);
        this.network = source.network;
        this.blockchain = blockchain;
        this.url = source['url'] || UnsInternal.UrlMap[this.network];
        this.provider =
            source['provider'] || new FetchProvider_1.default(this.unsLocation, this.url);
        this.readerContract = new EthereumContract_1.default(proxyReader_1.default, source.proxyReaderAddress ||
            UnsInternal.ProxyReaderMap[utils_1.EthereumNetworks[this.network]], this.provider);
    }
    UnsInternal.prototype.exists = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var exists;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.readerContract.call('exists', [
                            this.namehash(domain),
                        ])];
                    case 1:
                        exists = (_a.sent())[0];
                        return [2 /*return*/, exists];
                }
            });
        });
    };
    UnsInternal.prototype.getTokenUri = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenURI;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.readerContract.call('tokenURI', [tokenId])];
                    case 1:
                        tokenURI = (_a.sent())[0];
                        return [2 /*return*/, tokenURI];
                }
            });
        });
    };
    UnsInternal.prototype.registryAddress = function (domainOrNamehash) {
        return __awaiter(this, void 0, void 0, function () {
            var namehash, address;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.checkDomain(domainOrNamehash, domainOrNamehash.startsWith('0x'))) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnsupportedDomain, {
                                domain: domainOrNamehash,
                            });
                        }
                        namehash = domainOrNamehash.startsWith('0x')
                            ? domainOrNamehash
                            : this.namehash(domainOrNamehash);
                        return [4 /*yield*/, this.readerContract.call('registryOf', [namehash])];
                    case 1:
                        address = (_a.sent())[0];
                        if (utils_1.isNullAddress(address)) {
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domainOrNamehash,
                            });
                        }
                        return [2 /*return*/, address];
                }
            });
        });
    };
    UnsInternal.prototype.resolver = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getVerifiedData(domain)];
                    case 1: return [2 /*return*/, (_a.sent()).resolver];
                }
            });
        });
    };
    UnsInternal.prototype.get = function (tokenId, keys) {
        if (keys === void 0) { keys = []; }
        return __awaiter(this, void 0, void 0, function () {
            var _a, resolver, owner, values;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.readerContract.call('getData', [keys, tokenId])];
                    case 1:
                        _a = _b.sent(), resolver = _a[0], owner = _a[1], values = _a[2];
                        return [2 /*return*/, {
                                owner: owner,
                                resolver: resolver,
                                records: utils_1.constructRecords(keys, values),
                                location: this.unsLocation,
                            }];
                }
            });
        });
    };
    UnsInternal.prototype.locations = function (domains) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenIds, _a, _b, resolvers, owners, registries, locations;
            var _this = this;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        tokenIds = domains.map(function (d) { return _this.namehash(d); });
                        return [4 /*yield*/, this.readerContract.multicall(__spreadArrays([
                                {
                                    method: 'getDataForMany',
                                    args: [[], tokenIds],
                                }
                            ], tokenIds.map(function (id) { return ({
                                method: 'registryOf',
                                args: [id],
                            }); })))];
                    case 1:
                        _a = _c.sent(), _b = _a[0], resolvers = _b[0], owners = _b[1], registries = _a.slice(1);
                        locations = domains.reduce(function (locations, domain, i) {
                            locations[domain] = null;
                            if (owners && owners[i] !== types_1.NullAddress) {
                                locations[domain] = {
                                    resolverAddress: resolvers[i],
                                    registryAddress: registries[i][0],
                                    ownerAddress: owners[i],
                                    networkId: utils_1.EthereumNetworks[_this.network],
                                    blockchain: _this.blockchain,
                                    blockchainProviderUrl: _this.url,
                                };
                            }
                            return locations;
                        }, {});
                        return [2 /*return*/, locations];
                }
            });
        });
    };
    UnsInternal.prototype.namehash = function (domain) {
        if (!this.checkDomain(domain)) {
            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnsupportedDomain, {
                domain: domain,
            });
        }
        return namehash_1.eip137Namehash(domain);
    };
    UnsInternal.prototype.checkDomain = function (domain, passIfTokenID) {
        if (passIfTokenID === void 0) { passIfTokenID = false; }
        if (passIfTokenID) {
            return true;
        }
        var tokens = domain.split('.');
        return (!!tokens.length &&
            tokens[tokens.length - 1] !== 'zil' &&
            !(domain === 'eth' ||
                /^[^-]*[^-]*\.(eth|luxe|xyz|kred|addr\.reverse)$/.test(domain)) &&
            tokens.every(function (v) { return !!v.length; }));
    };
    UnsInternal.prototype.getVerifiedData = function (domain, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenId, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        tokenId = this.namehash(domain);
                        return [4 /*yield*/, this.get(tokenId, keys)];
                    case 1:
                        data = _a.sent();
                        if (utils_1.isNullAddress(data.resolver)) {
                            if (utils_1.isNullAddress(data.owner)) {
                                throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                    domain: domain,
                                });
                            }
                            throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.UnspecifiedResolver, {
                                location: this.unsLocation,
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, data];
                }
            });
        });
    };
    UnsInternal.prototype.checkNetworkConfig = function (location, source) {
        if (!source.network) {
            throw new configurationError_1.default(configurationError_2.ConfigurationErrorCode.UnsupportedNetwork, {
                method: location,
            });
        }
        if (source.proxyReaderAddress &&
            !this.isValidProxyReader(source.proxyReaderAddress)) {
            throw new configurationError_1.default(configurationError_2.ConfigurationErrorCode.InvalidConfigurationField, {
                method: this.unsLocation,
                field: 'proxyReaderAddress',
            });
        }
        if (!types_1.UnsSupportedNetwork.guard(source.network)) {
            this.checkCustomNetworkConfig(source);
        }
    };
    UnsInternal.prototype.checkCustomNetworkConfig = function (source) {
        if (!this.isValidProxyReader(source.proxyReaderAddress)) {
            throw new configurationError_1.default(configurationError_2.ConfigurationErrorCode.InvalidConfigurationField, {
                method: this.unsLocation,
                field: 'proxyReaderAddress',
            });
        }
        if (!source['url'] && !source['provider']) {
            throw new configurationError_1.default(configurationError_2.ConfigurationErrorCode.CustomNetworkConfigMissing, {
                method: this.unsLocation,
                config: 'url or provider',
            });
        }
    };
    UnsInternal.prototype.isValidProxyReader = function (address) {
        if (!address) {
            throw new configurationError_1.default(configurationError_2.ConfigurationErrorCode.CustomNetworkConfigMissing, {
                method: this.unsLocation,
                config: 'proxyReaderAddress',
            });
        }
        var ethLikePattern = new RegExp('^0x[a-fA-F0-9]{40}$');
        return ethLikePattern.test(address);
    };
    UnsInternal.ProxyReaderMap = getProxyReaderMap();
    UnsInternal.UrlMap = {
        mainnet: 'https://mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
        rinkeby: 'https://rinkeby.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
        goerli: 'https://goerli.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
        'polygon-mainnet': 'https://polygon-mainnet.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
        'polygon-mumbai': 'https://polygon-mumbai.infura.io/v3/c4bb906ed6904c42b19c95825fe55f39',
    };
    return UnsInternal;
}());
exports.default = UnsInternal;
function getProxyReaderMap() {
    var map = {};
    for (var _i = 0, _a = Object.keys(uns_config_json_1.default.networks); _i < _a.length; _i++) {
        var id = _a[_i];
        map[id] =
            uns_config_json_1.default.networks[id].contracts.ProxyReader.address.toLowerCase();
    }
    return map;
}

},{"./FetchProvider":54,"./config/uns-config.json":62,"./contracts/EthereumContract":63,"./contracts/uns/proxyReader":64,"./errors/configurationError":65,"./errors/resolutionError":67,"./types":69,"./utils":75,"./utils/namehash":76}],60:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var znsUtils_1 = require("./utils/znsUtils");
var utils_1 = require("./utils");
var types_1 = require("./types");
var resolutionError_1 = require("./errors/resolutionError");
var publicTypes_1 = require("./types/publicTypes");
var FetchProvider_1 = __importDefault(require("./FetchProvider"));
var namehash_1 = require("./utils/namehash");
var NamingService_1 = require("./NamingService");
var configurationError_1 = __importStar(require("./errors/configurationError"));
/**
 * @internal
 */
var Zns = /** @class */ (function (_super) {
    __extends(Zns, _super);
    function Zns(source) {
        if (source === void 0) { source = {
            url: Zns.UrlMap[1],
            network: 'mainnet',
        }; }
        var _this = _super.call(this) || this;
        _this.name = publicTypes_1.NamingServiceName.ZNS;
        _this.checkNetworkConfig(source);
        _this.network = Zns.NetworkNameMap[source.network];
        _this.url = source['url'] || Zns.UrlMap[_this.network];
        _this.provider =
            source['provider'] || new FetchProvider_1.default(_this.name, _this.url);
        _this.registryAddr =
            source['registryAddress'] || Zns.RegistryMap[_this.network];
        _this.checkRegistryAddress(_this.registryAddr);
        if (_this.registryAddr.startsWith('0x')) {
            _this.registryAddr = znsUtils_1.toBech32Address(_this.registryAddr);
        }
        return _this;
    }
    Zns.prototype.serviceName = function () {
        return this.name;
    };
    Zns.prototype.owner = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var recordAddresses, ownerAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRecordsAddresses(domain)];
                    case 1:
                        recordAddresses = _a.sent();
                        if (!recordAddresses) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domain,
                            });
                        }
                        ownerAddress = recordAddresses[0];
                        if (!ownerAddress) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, ownerAddress];
                }
            });
        });
    };
    Zns.prototype.resolver = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var recordsAddresses, resolverAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRecordsAddresses(domain)];
                    case 1:
                        recordsAddresses = _a.sent();
                        if (!recordsAddresses || !recordsAddresses[0]) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnregisteredDomain, {
                                domain: domain,
                            });
                        }
                        resolverAddress = recordsAddresses[1];
                        if (utils_1.isNullAddress(resolverAddress)) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnspecifiedResolver, {
                                domain: domain,
                            });
                        }
                        return [2 /*return*/, resolverAddress];
                }
            });
        });
    };
    Zns.prototype.namehash = function (domain) {
        if (!this.checkDomain(domain)) {
            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedDomain, {
                domain: domain,
            });
        }
        return namehash_1.znsNamehash(domain);
    };
    Zns.prototype.childhash = function (parentHash, label) {
        return namehash_1.znsChildhash(parentHash, label);
    };
    Zns.prototype.isSupportedDomain = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.checkDomain(domain)];
            });
        });
    };
    Zns.prototype.record = function (domain, key) {
        return __awaiter(this, void 0, void 0, function () {
            var returnee;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.records(domain, [key])];
                    case 1:
                        returnee = (_a.sent())[key];
                        if (!returnee) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.RecordNotFound, {
                                domain: domain,
                                recordName: key,
                            });
                        }
                        return [2 /*return*/, returnee];
                }
            });
        });
    };
    Zns.prototype.records = function (domain, keys) {
        return __awaiter(this, void 0, void 0, function () {
            var records;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.allRecords(domain)];
                    case 1:
                        records = _a.sent();
                        return [2 /*return*/, utils_1.constructRecords(keys, records)];
                }
            });
        });
    };
    Zns.prototype.allRecords = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var resolverAddress;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.resolver(domain)];
                    case 1:
                        resolverAddress = _a.sent();
                        return [2 /*return*/, this.getResolverRecords(resolverAddress)];
                }
            });
        });
    };
    Zns.prototype.twitter = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    domain: domain,
                    methodName: 'twitter',
                });
            });
        });
    };
    Zns.prototype.reverse = function (address, currencyTicker) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'reverse',
                });
            });
        });
    };
    Zns.prototype.isRegistered = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var recordAddresses;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getRecordsAddresses(domain)];
                    case 1:
                        recordAddresses = _a.sent();
                        return [2 /*return*/, Boolean(recordAddresses && recordAddresses[0])];
                }
            });
        });
    };
    Zns.prototype.getTokenUri = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'getTokenUri',
                });
            });
        });
    };
    Zns.prototype.getDomainFromTokenId = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
                    methodName: 'getDomainFromTokenId',
                });
            });
        });
    };
    Zns.prototype.isAvailable = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.isRegistered(domain)];
                    case 1: return [2 /*return*/, !(_a.sent())];
                }
            });
        });
    };
    Zns.prototype.registryAddress = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registryAddr];
            });
        });
    };
    Zns.prototype.locations = function (domains) {
        throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedMethod, {
            method: publicTypes_1.NamingServiceName.ZNS,
            methodName: 'locations',
        });
    };
    Zns.prototype.getRecordsAddresses = function (domain) {
        return __awaiter(this, void 0, void 0, function () {
            var registryRecord, _a, ownerAddress, resolverAddress;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!this.isSupportedDomain(domain)) {
                            throw new resolutionError_1.ResolutionError(resolutionError_1.ResolutionErrorCode.UnsupportedDomain, {
                                domain: domain,
                            });
                        }
                        return [4 /*yield*/, this.getContractMapValue(this.registryAddr, 'records', this.namehash(domain))];
                    case 1:
                        registryRecord = _b.sent();
                        if (!registryRecord) {
                            return [2 /*return*/, undefined];
                        }
                        _a = registryRecord.arguments, ownerAddress = _a[0], resolverAddress = _a[1];
                        return [2 /*return*/, [
                                ownerAddress.startsWith('0x')
                                    ? znsUtils_1.toBech32Address(ownerAddress)
                                    : ownerAddress,
                                resolverAddress,
                            ]];
                }
            });
        });
    };
    Zns.prototype.getResolverRecords = function (resolverAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var resolver;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (utils_1.isNullAddress(resolverAddress)) {
                            return [2 /*return*/, {}];
                        }
                        resolver = znsUtils_1.toChecksumAddress(resolverAddress);
                        return [4 /*yield*/, this.getContractField(resolver, 'records')];
                    case 1: return [2 /*return*/, ((_a.sent()) ||
                            {})];
                }
            });
        });
    };
    Zns.prototype.fetchSubState = function (contractAddress, field, keys) {
        if (keys === void 0) { keys = []; }
        return __awaiter(this, void 0, void 0, function () {
            var params, method;
            return __generator(this, function (_a) {
                params = [contractAddress.replace('0x', ''), field, keys];
                method = 'GetSmartContractSubState';
                return [2 /*return*/, this.provider.request({ method: method, params: params })];
            });
        });
    };
    Zns.prototype.getContractField = function (contractAddress, field, keys) {
        if (keys === void 0) { keys = []; }
        return __awaiter(this, void 0, void 0, function () {
            var contractAddr, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        contractAddr = contractAddress.startsWith('zil1')
                            ? znsUtils_1.fromBech32Address(contractAddress)
                            : contractAddress;
                        return [4 /*yield*/, this.fetchSubState(contractAddr, field, keys)];
                    case 1:
                        result = (_a.sent()) || {};
                        return [2 /*return*/, result[field]];
                }
            });
        });
    };
    Zns.prototype.getContractMapValue = function (contractAddress, field, key) {
        return __awaiter(this, void 0, void 0, function () {
            var record;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getContractField(contractAddress, field, [key])];
                    case 1:
                        record = _a.sent();
                        return [2 /*return*/, (record && record[key]) || null];
                }
            });
        });
    };
    Zns.prototype.checkDomain = function (domain) {
        var tokens = domain.split('.');
        return (!!tokens.length &&
            tokens[tokens.length - 1] === 'zil' &&
            tokens.every(function (v) { return !!v.length; }));
    };
    Zns.prototype.checkNetworkConfig = function (source) {
        if (!source.network) {
            throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.UnsupportedNetwork, {
                method: publicTypes_1.NamingServiceName.ZNS,
            });
        }
        if (!types_1.ZnsSupportedNetwork.guard(source.network)) {
            this.checkCustomNetworkConfig(source);
        }
    };
    Zns.prototype.checkRegistryAddress = function (address) {
        // Represents both versions of Zilliqa addresses eth-like and bech32 zil-like
        var addressValidator = new RegExp('^0x[a-fA-F0-9]{40}$|^zil1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$');
        if (!addressValidator.test(address)) {
            throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.InvalidConfigurationField, {
                method: this.name,
                field: 'registryAddress',
            });
        }
    };
    Zns.prototype.checkCustomNetworkConfig = function (source) {
        if (!source.registryAddress) {
            throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.CustomNetworkConfigMissing, {
                method: publicTypes_1.NamingServiceName.ZNS,
                config: 'registryAddress',
            });
        }
        if (!source['url'] && !source['provider']) {
            throw new configurationError_1.default(configurationError_1.ConfigurationErrorCode.CustomNetworkConfigMissing, {
                method: publicTypes_1.NamingServiceName.ZNS,
                config: 'url or provider',
            });
        }
    };
    Zns.UrlMap = {
        1: 'https://api.zilliqa.com',
        333: 'https://dev-api.zilliqa.com',
        111: 'http://localhost:4201',
    };
    Zns.NetworkNameMap = {
        mainnet: 1,
        testnet: 333,
        localnet: 111,
    };
    Zns.RegistryMap = {
        1: 'zil1jcgu2wlx6xejqk9jw3aaankw6lsjzeunx2j0jz',
        333: 'zil1hyj6m5w4atcn7s806s69r0uh5g4t84e8gp6nps',
    };
    return Zns;
}(NamingService_1.NamingService));
exports.default = Zns;

},{"./FetchProvider":54,"./NamingService":55,"./errors/configurationError":65,"./errors/resolutionError":67,"./types":69,"./types/publicTypes":70,"./utils":75,"./utils/namehash":76,"./utils/znsUtils":79}],61:[function(require,module,exports){
module.exports={
    "version": "1.1.1",
    "keys": {
        "crypto.BTC.address": {
            "deprecatedKeyName": "BTC",
            "deprecated": false,
            "validationRegex": "^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$"
        },
        "crypto.ETH.address": {
            "deprecatedKeyName": "ETH",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.ZIL.address": {
            "deprecatedKeyName": "ZIL",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$|^zil1[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{38}$"
        },
        "crypto.LTC.address": {
            "deprecatedKeyName": "LTC",
            "deprecated": false,
            "validationRegex": "^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$|^ltc1[a-zA-HJ-NP-Z0-9]{25,39}$"
        },
        "crypto.ETC.address": {
            "deprecatedKeyName": "ETC",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.EQL.address": {
            "deprecatedKeyName": "EQL",
            "deprecated": false,
            "validationRegex": "^bnb[0-9a-z]{39}$"
        },
        "crypto.LINK.address": {
            "deprecatedKeyName": "LINK",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.USDC.address": {
            "deprecatedKeyName": "USDC",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.BAT.address": {
            "deprecatedKeyName": "BAT",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.REP.address": {
            "deprecatedKeyName": "REP",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.ZRX.address": {
            "deprecatedKeyName": "ZRX",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.DAI.address": {
            "deprecatedKeyName": "DAI",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.BCH.address": {
            "deprecatedKeyName": "BCH",
            "deprecated": false,
            "validationRegex": "^[13][a-km-zA-HJ-NP-Z1-9]{33}$|^((bitcoincash|bchreg|bchtest):)?(q|p)[a-z0-9]{41}$|^((BITCOINCASH:)?(Q|P)[A-Z0-9]{41})$"
        },
        "crypto.XMR.address": {
            "deprecatedKeyName": "XMR",
            "deprecated": false,
            "validationRegex": "^[48]{1}[0-9AB][1-9A-HJ-NP-Za-km-z]{93}$"
        },
        "crypto.DASH.address": {
            "deprecatedKeyName": "DASH",
            "deprecated": false,
            "validationRegex": "^X[1-9A-HJ-NP-Za-km-z]{33}$"
        },
        "crypto.NEO.address": {
            "deprecatedKeyName": "NEO",
            "deprecated": false,
            "validationRegex": "^A[0-9a-zA-Z]{33}$"
        },
        "crypto.SWTH.address": {
            "deprecatedKeyName": "SWTH",
            "deprecated": false,
            "validationRegex": "^A[0-9a-zA-Z]{33}$"
        },
        "crypto.DOGE.address": {
            "deprecatedKeyName": "DOGE",
            "deprecated": false,
            "validationRegex": "^D[5-9A-HJ-NP-U]{1}[1-9A-HJ-NP-Za-km-z]{32}$"
        },
        "crypto.XRP.address": {
            "deprecatedKeyName": "XRP",
            "deprecated": false,
            "validationRegex": "^r[1-9a-km-zA-HJ-NP-Z]{24,34}$"
        },
        "crypto.ZEC.address": {
            "deprecatedKeyName": "ZEC",
            "deprecated": false,
            "validationRegex": "^z([a-zA-Z0-9]){94}$|^zs([a-zA-Z0-9]){75}$|^t([a-zA-Z0-9]){34}$"
        },
        "crypto.ADA.address": {
            "deprecatedKeyName": "ADA",
            "deprecated": false,
            "validationRegex": "^[1-9a-km-zA-HJ-NP-Z]{104}$|^A[1-9A-HJ-NP-Za-km-z]{58}$|^addr[0-9a-zA-Z]{99}$"
        },
        "crypto.EOS.address": {
            "deprecatedKeyName": "EOS",
            "deprecated": false,
            "validationRegex": "^[a-z][a-z1-5.]{10}[a-z1-5]$"
        },
        "crypto.XLM.address": {
            "deprecatedKeyName": "XLM",
            "deprecated": false,
            "validationRegex": "^G[A-Z2-7]{55}$"
        },
        "crypto.BNB.address": {
            "deprecatedKeyName": "BNB",
            "deprecated": false,
            "validationRegex": "^bnb[0-9a-z]{39}$"
        },
        "crypto.BTG.address": {
            "deprecatedKeyName": "BTG",
            "deprecated": false,
            "validationRegex": "^[GA][a-km-zA-HJ-NP-Z1-9]{33}$"
        },
        "crypto.NANO.address": {
            "deprecatedKeyName": "NANO",
            "deprecated": false,
            "validationRegex": "^nano_[1-9a-z]{60}$"
        },
        "crypto.WAVES.address": {
            "deprecatedKeyName": "WAVES",
            "deprecated": false,
            "validationRegex": "^3[a-km-zA-HJ-NP-Z1-9]{34}$"
        },
        "crypto.KMD.address": {
            "deprecatedKeyName": "KMD",
            "deprecated": false,
            "validationRegex": "^R[a-km-zA-Z1-9]{33}$"
        },
        "crypto.AE.address": {
            "deprecatedKeyName": "AE",
            "deprecated": false,
            "validationRegex": "^ak_[a-km-zA-Z1-9]{48,52}$"
        },
        "crypto.RSK.address": {
            "deprecatedKeyName": "RSK",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.WAN.address": {
            "deprecatedKeyName": "WAN",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.STRAT.address": {
            "deprecatedKeyName": "STRAT",
            "deprecated": false,
            "validationRegex": "^S[a-km-zA-HJ-NP-Z1-9]{33}$"
        },
        "crypto.UBQ.address": {
            "deprecatedKeyName": "UBQ",
            "deprecated": false,
            "validationRegex": "^0x[a-km-zA-HJ-NP-Z0-9]{40}$"
        },
        "crypto.XTZ.address": {
            "deprecatedKeyName": "XTZ",
            "deprecated": false,
            "validationRegex": "^(tz|KT)[a-km-zA-HJ-NP-Z1-9]{34}$"
        },
        "crypto.IOTA.address": {
            "deprecatedKeyName": "IOTA",
            "deprecated": false,
            "validationRegex": "^[A-Z0-9]{90}$|^iota1[a-z0-9]{59}$"
        },
        "crypto.VET.address": {
            "deprecatedKeyName": "VET",
            "deprecated": false,
            "validationRegex": "^0x[a-km-zA-HJ-NP-Z0-9]{40}$"
        },
        "crypto.QTUM.address": {
            "deprecatedKeyName": "QTUM",
            "deprecated": false,
            "validationRegex": "^Q[a-km-zA-HJ-NP-Z1-9]{33}$"
        },
        "crypto.ICX.address": {
            "deprecatedKeyName": "ICX",
            "deprecated": false,
            "validationRegex": "^[a-km-zA-HJ-NP-Z0-9]{42}$"
        },
        "crypto.DGB.address": {
            "deprecatedKeyName": "DGB",
            "deprecated": false,
            "validationRegex": "(^[a-km-zA-HJ-NP-Z1-9]{34}$)|(^[a-zA-Z1-9]{42}$)|(^dgb1[a-zA-Z0-9]{39}$)"
        },
        "crypto.XZC.address": {
            "deprecatedKeyName": "XZC",
            "deprecated": false,
            "validationRegex": "^[a-km-zA-HJ-NP-Z1-9]{34}$"
        },
        "crypto.BURST.address": {
            "deprecatedKeyName": "BURST",
            "deprecated": false,
            "validationRegex": "^BURST-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{5}"
        },
        "crypto.DCR.address": {
            "deprecatedKeyName": "DCR",
            "deprecated": false,
            "validationRegex": null
        },
        "crypto.XEM.address": {
            "deprecatedKeyName": "XEM",
            "deprecated": false,
            "validationRegex": "^N[ABCDEFGHIJKLMNOPQRSTUVWXYZ234567]{39}$"
        },
        "crypto.LSK.address": {
            "deprecatedKeyName": "LSK",
            "deprecated": false,
            "validationRegex": "^\\d{1,21}[L]$"
        },
        "crypto.ATOM.address": {
            "deprecatedKeyName": "ATOM",
            "deprecated": false,
            "validationRegex": "^(cosmos)1([qpzry9x8gf2tvdw0s3jn54khce6mua7l]+)$"
        },
        "crypto.ONG.address": {
            "deprecatedKeyName": "ONG",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.ONT.address": {
            "deprecatedKeyName": "ONT",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.SMART.address": {
            "deprecatedKeyName": "SMART",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.TPAY.address": {
            "deprecatedKeyName": "TPAY",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.GRS.address": {
            "deprecatedKeyName": "GRS",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.BSV.address": {
            "deprecatedKeyName": "BSV",
            "deprecated": false,
            "validationRegex": "^bitcoincash:[a-zA-Z0-9]{42}$"
        },
        "crypto.GAS.address": {
            "deprecatedKeyName": "GAS",
            "deprecated": false,
            "validationRegex": null
        },
        "crypto.TRX.address": {
            "deprecatedKeyName": "TRX",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.VTHO.address": {
            "deprecatedKeyName": "VTHO",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{42}$"
        },
        "crypto.BCD.address": {
            "deprecatedKeyName": "BCD",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.BTT.address": {
            "deprecatedKeyName": "BTT",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.KIN.address": {
            "deprecatedKeyName": "KIN",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{56}$"
        },
        "crypto.RVN.address": {
            "deprecatedKeyName": "RVN",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.ARK.address": {
            "deprecatedKeyName": "ARK",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.XVG.address": {
            "deprecatedKeyName": "XVG",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.ALGO.address": {
            "deprecatedKeyName": "ALGO",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{58}$"
        },
        "crypto.NEBL.address": {
            "deprecatedKeyName": "NEBL",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.XPM.address": {
            "deprecatedKeyName": "XPM",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.ONE.address": {
            "deprecatedKeyName": "ONE",
            "deprecated": false,
            "validationRegex": "^one[a-zA-Z0-9]{39}$"
        },
        "crypto.BNTY.address": {
            "deprecatedKeyName": "BNTY",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.CRO.address": {
            "deprecatedKeyName": "CRO",
            "deprecated": false,
            "validationRegex": "^0x[a-fA-F0-9]{40}$"
        },
        "crypto.TWT.address": {
            "deprecatedKeyName": "TWT",
            "deprecated": false,
            "validationRegex": "^bnb[0-9a-z]{39}$"
        },
        "crypto.SIERRA.address": {
            "deprecatedKeyName": "SIERRA",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{34}$"
        },
        "crypto.VSYS.address": {
            "deprecatedKeyName": "VSYS",
            "deprecated": false,
            "validationRegex": "^[a-zA-Z0-9]{35}$"
        },
        "crypto.HIVE.address": {
            "deprecatedKeyName": "HIVE",
            "validationRegex": "^(?!s*$).+",
            "deprecated": false
        },
        "crypto.HT.address": {
            "deprecatedKeyName": "HT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ENJ.address": {
            "deprecatedKeyName": "ENJ",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.YFI.address": {
            "deprecatedKeyName": "YFI",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MTA.address": {
            "deprecatedKeyName": "MTA",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.COMP.address": {
            "deprecatedKeyName": "COMP",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BAL.address": {
            "deprecatedKeyName": "BAL",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AMPL.address": {
            "deprecatedKeyName": "AMPL",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.LEND.address": {
            "deprecatedKeyName": "LEND",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TLOS.address": {
            "deprecatedKeyName": "TLOS",
            "validationRegex": "^[a-z][a-z1-5.]{10}[a-z1-5]$",
            "deprecated": false
        },
        "crypto.XDC.address": {
            "deprecatedKeyName": "XDC",
            "validationRegex": "^xdc[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.XST.address": {
            "deprecatedKeyName": "XST",
            "validationRegex": "(?:RwxQ3jUs2BjKhseNX1em4msn2GyV5XAec[PQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]|RwxQ3jUs2BjKhseNX1em4msn2GyV5XAe[defghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]|RwxQ3jUs2BjKhseNX1em4msn2GyV5XA[fghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{2}|RwxQ3jUs2BjKhseNX1em4msn2GyV5X[BCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{3}|RwxQ3jUs2BjKhseNX1em4msn2GyV5[YZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{4}|RwxQ3jUs2BjKhseNX1em4msn2GyV[6789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{5}|RwxQ3jUs2BjKhseNX1em4msn2Gy[WXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{6}|RwxQ3jUs2BjKhseNX1em4msn2G[z][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{7}|RwxQ3jUs2BjKhseNX1em4msn2[HJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8}|RwxQ3jUs2BjKhseNX1em4msn[3456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{9}|RwxQ3jUs2BjKhseNX1em4ms[opqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{10}|RwxQ3jUs2BjKhseNX1em4m[tuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{11}|RwxQ3jUs2BjKhseNX1em4[nopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12}|RwxQ3jUs2BjKhseNX1em[56789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{13}|RwxQ3jUs2BjKhseNX1e[nopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{14}|RwxQ3jUs2BjKhseNX1[fghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{15}|RwxQ3jUs2BjKhseNX[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{16}|RwxQ3jUs2BjKhseN[YZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{17}|RwxQ3jUs2BjKhse[PQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{18}|RwxQ3jUs2BjKhs[fghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{19}|RwxQ3jUs2BjKh[tuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20}|RwxQ3jUs2BjK[ijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{21}|RwxQ3jUs2Bj[LMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{22}|RwxQ3jUs2B[kmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{23}|RwxQ3jUs2[CDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24}|RwxQ3jUs[3456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25}|RwxQ3jU[tuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26}|RwxQ3j[VWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{27}|RwxQ3[kmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{28}|RwxQ[456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{29}|Rwx[RSTUVWXYZabcdefghijkmnopqrstuvwxyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{30}|Rw[yz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{31}|R[xyz][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32}|S[123456789ABCDEFGHJKL][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{32}|SM[123456789ABCDEFGH][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{31}|SMJ11[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{29}|SMJ11[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{29}|SMJ12[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnop][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{28}|SMJ12q[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkm][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{27}|SMJ12qn[12345678][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{26}|SMJ12qn9[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghi][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25}|SMJ12qn9j[123456789ABCDEFGHJKLM][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{24}|SMJ12qn9jN[123456789AB][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{23}|SMJ12qn9jNC[123456789AB][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{22}|SMJ12qn9jNCC[123456789ABCDEFGHJKLMNPQRSTUVW][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{21}|SMJ12qn9jNCCX[123456789ABCDEFGH][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{20}|SMJ12qn9jNCCXJ[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkm][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{19}|SMJ12qn9jNCCXJn[123456789ABCDEFGHJKLMNPQRS][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{18}|SMJ12qn9jNCCXJnT[123456789ABCDEFGHJKLMNPQRSTUVWX][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{17}|SMJ12qn9jNCCXJnTY[123456789ABCDEFGHJKLMNPQ][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{16}|SMJ12qn9jNCCXJnTYR[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxy][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{15}|SMJ12qn9jNCCXJnTYRz[1234][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{14}|SMJ12qn9jNCCXJnTYRz5[123456789ABCDEFGHJKLMNPQRSTUVWX][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{13}|SMJ12qn9jNCCXJnTYRz5Y[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrst][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{12}|SMJ12qn9jNCCXJnTYRz5Yu[12345678][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{11}|SMJ12qn9jNCCXJnTYRz5Yu9[123456789ABCDEFGHJKLMNPQRSTUVWXY][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{10}|SMJ12qn9jNCCXJnTYRz5Yu9Z[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcd][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{9}|SMJ12qn9jNCCXJnTYRz5Yu9Ze[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkm][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{8}|SMJ12qn9jNCCXJnTYRz5Yu9Zen[123456789ABCD][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{7}|SMJ12qn9jNCCXJnTYRz5Yu9ZenE[123456789ABCDEFGHJKLMNPQ][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{6}|SMJ12qn9jNCCXJnTYRz5Yu9ZenER[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkm][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{5}|SMJ12qn9jNCCXJnTYRz5Yu9ZenERn[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghij][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{4}|SMJ12qn9jNCCXJnTYRz5Yu9ZenERnk[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghij][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{3}|SMJ12qn9jNCCXJnTYRz5Yu9ZenERnkk[123456789ABCDEFGHJKLMNPQRST][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{2}|SMJ12qn9jNCCXJnTYRz5Yu9ZenERnkkU[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstu][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]|SMJ12qn9jNCCXJnTYRz5Yu9ZenERnkkUv[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghi])",
            "deprecated": false
        },
        "crypto.STRAX.address": {
            "deprecatedKeyName": "STRAX",
            "validationRegex": "^X[a-km-zA-HJ-NP-Z1-9]{33}$",
            "deprecated": false
        },
        "crypto.SIGNA.address": {
            "deprecatedKeyName": "SIGNA",
            "validationRegex": "^S-((?=[A-Z2-9]{4})(?:[^IO]{4})-){3}(?=[A-Z2-9]{5})(?:[^IO]{5})$",
            "deprecated": false
        },
        "crypto.NIM.address": {
            "deprecatedKeyName": "NIM",
            "validationRegex": "^NQ[0-9]{2} ([A-Z0-9]{4} ){7}[A-Z0-9]{4}$",
            "deprecated": false
        },
        "crypto.ELA.version.ELA.address": {
            "deprecatedKeyName": "ELA_ELA",
            "validationRegex": "E[a-zA-HJ-NP-Z0-9]{33}",
            "deprecated": false
        },
        "crypto.ELA.version.ESC.address": {
            "deprecatedKeyName": "ELA_ESC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ELA.version.HRC20.address": {
            "deprecatedKeyName": "ELA_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ELA.version.ERC20.address": {
            "deprecatedKeyName": "ELA_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.USDT.version.ERC20.address": {
            "deprecatedKeyName": "USDT_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.USDT.version.TRON.address": {
            "deprecatedKeyName": "USDT_TRON",
            "validationRegex": "^[T][a-zA-HJ-NP-Z0-9]{33}$",
            "deprecated": false
        },
        "crypto.USDT.version.EOS.address": {
            "deprecatedKeyName": "USDT_EOS",
            "validationRegex": "^[a-z][a-z1-5.]{10}[a-z1-5]$",
            "deprecated": false
        },
        "crypto.USDT.version.OMNI.address": {
            "deprecatedKeyName": "USDT_OMNI",
            "validationRegex": "^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$",
            "deprecated": false
        },
        "crypto.FTM.version.ERC20.address": {
            "deprecatedKeyName": "FTM_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FTM.version.BEP2.address": {
            "deprecatedKeyName": "FTM_BEP2",
            "validationRegex": "^(bnb|tbnb)[a-zA-HJ-NP-Z0-9]{39}$",
            "deprecated": false
        },
        "crypto.FTM.version.OPERA.address": {
            "deprecatedKeyName": "FTM_OPERA",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FUSE.version.ERC20.address": {
            "deprecatedKeyName": "FUSE_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FUSE.version.FUSE.address": {
            "deprecatedKeyName": "FUSE_FUSE",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MATIC.version.MATIC.address": {
            "deprecatedKeyName": "MATIC_MATIC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MATIC.version.BEP20.address": {
            "deprecatedKeyName": "MATIC_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MATIC.version.ERC20.address": {
            "deprecatedKeyName": "MATIC_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "social.payid.name": {
            "deprecatedKeyName": "payid",
            "validationRegex": "^[0-9a-zA-Z]+\\$[0-9a-zA-Z]+\\.[0-9a-zA-Z]+$",
            "deprecated": false
        },
        "social.picture.value": {
            "deprecatedKeyName": "picture",
            "validationRegex": null,
            "deprecated": false
        },
        "whois.email.value": {
            "deprecatedKeyName": "email",
            "validationRegex": "^[^@]+@[^\\.]+\\..+$",
            "deprecated": false
        },
        "whois.for_sale.value": {
            "deprecatedKeyName": "for_sale",
            "validationRegex": "(true)|(false)",
            "deprecated": false
        },
        "ipfs.html.value": {
            "deprecatedKeyName": "html",
            "validationRegex": ".{0,100}",
            "deprecated": false
        },
        "ipfs.redirect_domain.value": {
            "deprecatedKeyName": "redirect_domain",
            "validationRegex": ".{0,253}",
            "deprecated": false
        },
        "dweb.ipfs.hash": {
            "deprecatedKeyName": "dweb_hash",
            "validationRegex": ".{0,100}",
            "deprecated": false
        },
        "browser.redirect_url": {
            "deprecatedKeyName": "browser_redirect",
            "validationRegex": ".{0,253}",
            "deprecated": false
        },
        "browser.preferred_protocols": {
            "deprecatedKeyName": "browser_preferred_protocols",
            "validationRegex": null,
            "deprecated": false
        },
        "gundb.username.value": {
            "deprecatedKeyName": "gundb_username",
            "validationRegex": null,
            "deprecated": false
        },
        "gundb.public_key.value": {
            "deprecatedKeyName": "gundb_public_key",
            "validationRegex": null,
            "deprecated": false
        },
        "social.image.value": {
            "deprecatedKeyName": "image",
            "validationRegex": null,
            "deprecated": false
        },
        "social.twitter.username": {
            "deprecatedKeyName": "twitter_username",
            "validationRegex": null,
            "deprecated": false
        },
        "validation.social.twitter.username": {
            "deprecatedKeyName": "validation_twitter_username",
            "validationRegex": null,
            "deprecated": false
        },
        "forwarding.url": {
            "deprecatedKeyName": "forwarding_url",
            "validationRegex": "^(https?)://[^\\s/$.?#].[^\\s]*$",
            "deprecated": false
        },
        "dns.ttl": {
            "deprecatedKeyName": "dns_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.A": {
            "deprecatedKeyName": "dns_A",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.A.ttl": {
            "deprecatedKeyName": "dns_A_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.AAAA": {
            "deprecatedKeyName": "dns_AAAA",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.AAAA.ttl": {
            "deprecatedKeyName": "dns_AAAA_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.AFSDB": {
            "deprecatedKeyName": "dns_AFSDB",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.AFSDB.ttl": {
            "deprecatedKeyName": "dns_AFSDB_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.APL": {
            "deprecatedKeyName": "dns_APL",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.APL.ttl": {
            "deprecatedKeyName": "dns_APL_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CAA": {
            "deprecatedKeyName": "dns_CAA",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CAA.ttl": {
            "deprecatedKeyName": "dns_CAA_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CDNSKEY": {
            "deprecatedKeyName": "dns_CDNSKEY",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CDNSKEY.ttl": {
            "deprecatedKeyName": "dns_CDNSKEY_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CDS": {
            "deprecatedKeyName": "dns_CDS",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CDS.ttl": {
            "deprecatedKeyName": "dns_CDS_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CERT": {
            "deprecatedKeyName": "dns_CERT",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CERT.ttl": {
            "deprecatedKeyName": "dns_CERT_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CNAME": {
            "deprecatedKeyName": "dns_CNAME",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CNAME.ttl": {
            "deprecatedKeyName": "dns_CNAME_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CSYNC": {
            "deprecatedKeyName": "dns_CSYNC",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.CSYNC.ttl": {
            "deprecatedKeyName": "dns_CSYNC_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DHCID": {
            "deprecatedKeyName": "dns_DHCID",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DHCID.ttl": {
            "deprecatedKeyName": "dns_DHCID_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DLV": {
            "deprecatedKeyName": "dns_DLV",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DLV.ttl": {
            "deprecatedKeyName": "dns_DLV_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DNAME": {
            "deprecatedKeyName": "dns_DNAME",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DNAME.ttl": {
            "deprecatedKeyName": "dns_DNAME_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DNSKEY": {
            "deprecatedKeyName": "dns_DNSKEY",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DNSKEY.ttl": {
            "deprecatedKeyName": "dns_DNSKEY_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DS": {
            "deprecatedKeyName": "dns_DS",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.DS.ttl": {
            "deprecatedKeyName": "dns_DS_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.EUI48": {
            "deprecatedKeyName": "dns_EUI48",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.EUI48.ttl": {
            "deprecatedKeyName": "dns_EUI48_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.EUI64": {
            "deprecatedKeyName": "dns_EUI64",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.EUI64.ttl": {
            "deprecatedKeyName": "dns_EUI64_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.HINFO": {
            "deprecatedKeyName": "dns_HINFO",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.HINFO.ttl": {
            "deprecatedKeyName": "dns_HINFO_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.HIP": {
            "deprecatedKeyName": "dns_HIP",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.HIP.ttl": {
            "deprecatedKeyName": "dns_HIP_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.HTTPS": {
            "deprecatedKeyName": "dns_HTTPS",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.HTTPS.ttl": {
            "deprecatedKeyName": "dns_HTTPS_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.IPSECKEY": {
            "deprecatedKeyName": "dns_IPSECKEY",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.IPSECKEY.ttl": {
            "deprecatedKeyName": "dns_IPSECKEY_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.KEY": {
            "deprecatedKeyName": "dns_KEY",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.KEY.ttl": {
            "deprecatedKeyName": "dns_KEY_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.KX": {
            "deprecatedKeyName": "dns_KX",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.KX.ttl": {
            "deprecatedKeyName": "dns_KX_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.LOC": {
            "deprecatedKeyName": "dns_LOC",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.LOC.ttl": {
            "deprecatedKeyName": "dns_LOC_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.MX": {
            "deprecatedKeyName": "dns_MX",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.MX.ttl": {
            "deprecatedKeyName": "dns_MX_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NAPTR": {
            "deprecatedKeyName": "dns_NAPTR",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NAPTR.ttl": {
            "deprecatedKeyName": "dns_NAPTR_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NS": {
            "deprecatedKeyName": "dns_NS",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NS.ttl": {
            "deprecatedKeyName": "dns_NS_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NSEC": {
            "deprecatedKeyName": "dns_NSEC",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NSEC.ttl": {
            "deprecatedKeyName": "dns_NSEC_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NSEC3": {
            "deprecatedKeyName": "dns_NSEC3",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NSEC3.ttl": {
            "deprecatedKeyName": "dns_NSEC3_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NSEC3PARAM": {
            "deprecatedKeyName": "dns_NSEC3PARAM",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.NSEC3PARAM.ttl": {
            "deprecatedKeyName": "dns_NSEC3PARAM_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.OPENPGPKEY": {
            "deprecatedKeyName": "dns_OPENPGPKEY",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.OPENPGPKEY.ttl": {
            "deprecatedKeyName": "dns_OPENPGPKEY_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.PTR": {
            "deprecatedKeyName": "dns_PTR",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.PTR.ttl": {
            "deprecatedKeyName": "dns_PTR_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.RP": {
            "deprecatedKeyName": "dns_RP",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.RP.ttl": {
            "deprecatedKeyName": "dns_RP_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.RRSIG": {
            "deprecatedKeyName": "dns_RRSIG",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.RRSIG.ttl": {
            "deprecatedKeyName": "dns_RRSIG_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SIG": {
            "deprecatedKeyName": "dns_SIG",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SIG.ttl": {
            "deprecatedKeyName": "dns_SIG_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SMIMEA": {
            "deprecatedKeyName": "dns_SMIMEA",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SMIMEA.ttl": {
            "deprecatedKeyName": "dns_SMIMEA_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SOA": {
            "deprecatedKeyName": "dns_SOA",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SOA.ttl": {
            "deprecatedKeyName": "dns_SOA_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SRV": {
            "deprecatedKeyName": "dns_SRV",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SRV.ttl": {
            "deprecatedKeyName": "dns_SRV_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SSHFP": {
            "deprecatedKeyName": "dns_SSHFP",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SSHFP.ttl": {
            "deprecatedKeyName": "dns_SSHFP_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SVCB": {
            "deprecatedKeyName": "dns_SVCB",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.SVCB.ttl": {
            "deprecatedKeyName": "dns_SVCB_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TA": {
            "deprecatedKeyName": "dns_TA",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TA.ttl": {
            "deprecatedKeyName": "dns_TA_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TKEY": {
            "deprecatedKeyName": "dns_TKEY",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TKEY.ttl": {
            "deprecatedKeyName": "dns_TKEY_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TLSA": {
            "deprecatedKeyName": "dns_TLSA",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TLSA.ttl": {
            "deprecatedKeyName": "dns_TLSA_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TSIG": {
            "deprecatedKeyName": "dns_TSIG",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TSIG.ttl": {
            "deprecatedKeyName": "dns_TSIG_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TXT": {
            "deprecatedKeyName": "dns_TXT",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.TXT.ttl": {
            "deprecatedKeyName": "dns_TXT_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.URI": {
            "deprecatedKeyName": "dns_URI",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.URI.ttl": {
            "deprecatedKeyName": "dns_URI_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.ZONEMD": {
            "deprecatedKeyName": "dns_ZONEMD",
            "validationRegex": null,
            "deprecated": false
        },
        "dns.ZONEMD.ttl": {
            "deprecatedKeyName": "dns_ZONEMD_ttl",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.DOT.address": {
            "deprecatedKeyName": "DOT",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.UNI.version.ERC20.address": {
            "deprecatedKeyName": "UNI_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.UNI.version.BEP20.address": {
            "deprecatedKeyName": "UNI_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.UNI.version.MATIC.address": {
            "deprecatedKeyName": "UNI_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.UNI.version.HRC20.address": {
            "deprecatedKeyName": "UNI_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.UNI.version.XDAI.address": {
            "deprecatedKeyName": "UNI_XDAI",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SOL.address": {
            "deprecatedKeyName": "SOL",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.BUSD.version.ERC20.address": {
            "deprecatedKeyName": "BUSD_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BUSD.version.BEP20.address": {
            "deprecatedKeyName": "BUSD_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BUSD.version.HRC20.address": {
            "deprecatedKeyName": "BUSD_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ICP.address": {
            "deprecatedKeyName": "ICP",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.THETA.address": {
            "deprecatedKeyName": "THETA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.WBTC.version.ERC20.address": {
            "deprecatedKeyName": "WBTC_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.WBTC.version.MATIC.address": {
            "deprecatedKeyName": "WBTC_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.WBTC.version.FANTOM.address": {
            "deprecatedKeyName": "WBTC_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.WBTC.version.HRC20.address": {
            "deprecatedKeyName": "WBTC_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.WBTC.version.XDAI.address": {
            "deprecatedKeyName": "WBTC_XDAI",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.FIL.address": {
            "deprecatedKeyName": "FIL",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CDAI.address": {
            "deprecatedKeyName": "CDAI",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KSM.address": {
            "deprecatedKeyName": "KSM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.OKB.address": {
            "deprecatedKeyName": "OKB",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AAVE.version.ERC20.address": {
            "deprecatedKeyName": "AAVE_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AAVE.version.MATIC.address": {
            "deprecatedKeyName": "AAVE_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.AAVE.version.FANTOM.address": {
            "deprecatedKeyName": "AAVE_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.AAVE.version.HRC20.address": {
            "deprecatedKeyName": "AAVE_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SHIB.version.ERC20.address": {
            "deprecatedKeyName": "SHIB_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SHIB.version.MATIC.address": {
            "deprecatedKeyName": "SHIB_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SHIB.version.FANTOM.address": {
            "deprecatedKeyName": "SHIB_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CEL.version.ERC20.address": {
            "deprecatedKeyName": "CEL_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CEL.version.MATIC.address": {
            "deprecatedKeyName": "CEL_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CEL.version.FANTOM.address": {
            "deprecatedKeyName": "CEL_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CEL.version.HRC20.address": {
            "deprecatedKeyName": "CEL_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CUSDC.address": {
            "deprecatedKeyName": "CUSDC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CETH.address": {
            "deprecatedKeyName": "CETH",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AMP.address": {
            "deprecatedKeyName": "AMP",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CAKE.version.BEP20.address": {
            "deprecatedKeyName": "CAKE_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CAKE.version.HRC20.address": {
            "deprecatedKeyName": "CAKE_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MIOTA.address": {
            "deprecatedKeyName": "MIOTA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.FTT.address": {
            "deprecatedKeyName": "FTT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MKR.address": {
            "deprecatedKeyName": "MKR",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TFUEL.address": {
            "deprecatedKeyName": "TFUEL",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.KLAY.address": {
            "deprecatedKeyName": "KLAY",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.LUNA.address": {
            "deprecatedKeyName": "LUNA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.AVAX.address": {
            "deprecatedKeyName": "AVAX",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.LEO.address": {
            "deprecatedKeyName": "LEO",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SAFEMOON.version.BEP20.address": {
            "deprecatedKeyName": "SAFEMOON_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SAFEMOON.version.HRC20.address": {
            "deprecatedKeyName": "SAFEMOON_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.UST.address": {
            "deprecatedKeyName": "UST",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.RUNE.address": {
            "deprecatedKeyName": "RUNE",
            "validationRegex": "^(bnb|tbnb)[a-zA-HJ-NP-Z0-9]{39}$",
            "deprecated": false
        },
        "crypto.HBAR.address": {
            "deprecatedKeyName": "HBAR",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.TEL.version.ERC20.address": {
            "deprecatedKeyName": "TEL_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TEL.version.MATIC.address": {
            "deprecatedKeyName": "TEL_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CHZ.address": {
            "deprecatedKeyName": "CHZ",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SUSHI.version.ERC20.address": {
            "deprecatedKeyName": "SUSHI_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SUSHI.version.BEP20.address": {
            "deprecatedKeyName": "SUSHI_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SUSHI.version.MATIC.address": {
            "deprecatedKeyName": "SUSHI_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SUSHI.version.FANTOM.address": {
            "deprecatedKeyName": "SUSHI_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SUSHI.version.HRC20.address": {
            "deprecatedKeyName": "SUSHI_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.EGLD.address": {
            "deprecatedKeyName": "EGLD",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.TUSD.version.ERC20.address": {
            "deprecatedKeyName": "TUSD_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TUSD.version.BEP20.address": {
            "deprecatedKeyName": "TUSD_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TUSD.version.AVAX.address": {
            "deprecatedKeyName": "TUSD_AVAX",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.TUSD.version.HRC20.address": {
            "deprecatedKeyName": "TUSD_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TUSD.version.BEP2.address": {
            "deprecatedKeyName": "TUSD_BEP2",
            "validationRegex": "^(bnb|tbnb)[a-zA-HJ-NP-Z0-9]{39}$",
            "deprecated": false
        },
        "crypto.TUSD.version.TRON.address": {
            "deprecatedKeyName": "TUSD_TRON",
            "validationRegex": "^[T][a-zA-HJ-NP-Z0-9]{33}$",
            "deprecated": false
        },
        "crypto.HBTC.version.ERC20.address": {
            "deprecatedKeyName": "HBTC_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HBTC.version.HRC20.address": {
            "deprecatedKeyName": "HBTC_HRC20",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SNX.version.ERC20.address": {
            "deprecatedKeyName": "SNX_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SNX.version.MATIC.address": {
            "deprecatedKeyName": "SNX_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SNX.version.FANTOM.address": {
            "deprecatedKeyName": "SNX_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SNX.version.HRC20.address": {
            "deprecatedKeyName": "SNX_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HOT.version.ERC20.address": {
            "deprecatedKeyName": "HOT_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HOT.version.HRC20.address": {
            "deprecatedKeyName": "HOT_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.NEAR.address": {
            "deprecatedKeyName": "NEAR",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.HNT.address": {
            "deprecatedKeyName": "HNT",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.STETH.address": {
            "deprecatedKeyName": "STETH",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.NEXO.version.ERC20.address": {
            "deprecatedKeyName": "NEXO_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.NEXO.version.FANTOM.address": {
            "deprecatedKeyName": "NEXO_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.PAX.address": {
            "deprecatedKeyName": "PAX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.STX.address": {
            "deprecatedKeyName": "STX",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.MANA.version.ERC20.address": {
            "deprecatedKeyName": "MANA_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MANA.version.MATIC.address": {
            "deprecatedKeyName": "MANA_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.MDX.version.HRC20.address": {
            "deprecatedKeyName": "MDX_HRC20",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.MDX.version.BEP20.address": {
            "deprecatedKeyName": "MDX_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ZEN.address": {
            "deprecatedKeyName": "ZEN",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ARRR.address": {
            "deprecatedKeyName": "ARRR",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.BNT.address": {
            "deprecatedKeyName": "BNT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.LUSD.version.ERC20.address": {
            "deprecatedKeyName": "LUSD_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.LUSD.version.MATIC.address": {
            "deprecatedKeyName": "LUSD_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.GRT.version.ERC20.address": {
            "deprecatedKeyName": "GRT_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.GRT.version.MATIC.address": {
            "deprecatedKeyName": "GRT_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.GRT.version.HRC20.address": {
            "deprecatedKeyName": "GRT_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SC.address": {
            "deprecatedKeyName": "SC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.HUSD.version.ERC20.address": {
            "deprecatedKeyName": "HUSD_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HUSD.version.HRC20.address": {
            "deprecatedKeyName": "HUSD_HRC20",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CRV.version.ERC20.address": {
            "deprecatedKeyName": "CRV_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CRV.version.MATIC.address": {
            "deprecatedKeyName": "CRV_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.CRV.version.FANTOM.address": {
            "deprecatedKeyName": "CRV_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.UMA.address": {
            "deprecatedKeyName": "UMA",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.WRX.version.BEP2.address": {
            "deprecatedKeyName": "WRX_BEP2",
            "validationRegex": "^(bnb|tbnb)[a-zA-HJ-NP-Z0-9]{39}$",
            "deprecated": false
        },
        "crypto.WRX.version.MATIC.address": {
            "deprecatedKeyName": "WRX_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.AR.address": {
            "deprecatedKeyName": "AR",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.OMG.address": {
            "deprecatedKeyName": "OMG",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.GT.address": {
            "deprecatedKeyName": "GT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.QNT.address": {
            "deprecatedKeyName": "QNT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CHSB.address": {
            "deprecatedKeyName": "CHSB",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.IOST.address": {
            "deprecatedKeyName": "IOST",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.NXM.address": {
            "deprecatedKeyName": "NXM",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KCS.address": {
            "deprecatedKeyName": "KCS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.LPT.version.ERC20.address": {
            "deprecatedKeyName": "LPT_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.LPT.version.HRC20.address": {
            "deprecatedKeyName": "LPT_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.XSUSHI.address": {
            "deprecatedKeyName": "XSUSHI",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CUSDT.address": {
            "deprecatedKeyName": "CUSDT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FLOW.address": {
            "deprecatedKeyName": "FLOW",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ANKR.address": {
            "deprecatedKeyName": "ANKR",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HBC.address": {
            "deprecatedKeyName": "HBC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.VGX.address": {
            "deprecatedKeyName": "VGX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FEI.address": {
            "deprecatedKeyName": "FEI",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BAKE.version.BEP20.address": {
            "deprecatedKeyName": "BAKE_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BAKE.version.HRC20.address": {
            "deprecatedKeyName": "BAKE_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.1INCH.version.ERC20.address": {
            "deprecatedKeyName": "1INCH_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.1INCH.version.BEP20.address": {
            "deprecatedKeyName": "1INCH_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.1INCH.version.MATIC.address": {
            "deprecatedKeyName": "1INCH_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.1INCH.version.HRC20.address": {
            "deprecatedKeyName": "1INCH_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CKB.address": {
            "deprecatedKeyName": "CKB",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.WOO.version.ERC20.address": {
            "deprecatedKeyName": "WOO_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.WOO.version.HRC20.address": {
            "deprecatedKeyName": "WOO_HRC20",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.TITAN.address": {
            "deprecatedKeyName": "TITAN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.OMI.address": {
            "deprecatedKeyName": "OMI",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.MINA.address": {
            "deprecatedKeyName": "MINA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SETH.address": {
            "deprecatedKeyName": "SETH",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.RSR.address": {
            "deprecatedKeyName": "RSR",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.OXY.version.SOLANA.address": {
            "deprecatedKeyName": "OXY_SOLANA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.OXY.version.ERC20.address": {
            "deprecatedKeyName": "OXY_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.REN.version.ERC20.address": {
            "deprecatedKeyName": "REN_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.REN.version.HRC20.address": {
            "deprecatedKeyName": "REN_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.XCH.address": {
            "deprecatedKeyName": "XCH",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.RENBTC.version.ERC20.address": {
            "deprecatedKeyName": "RENBTC_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.RENBTC.version.BEP20.address": {
            "deprecatedKeyName": "RENBTC_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.RENBTC.version.HRC20.address": {
            "deprecatedKeyName": "RENBTC_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.USDN.address": {
            "deprecatedKeyName": "USDN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BCHA.address": {
            "deprecatedKeyName": "BCHA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.LRC.address": {
            "deprecatedKeyName": "LRC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.PUNDIX.address": {
            "deprecatedKeyName": "PUNDIX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ERG.address": {
            "deprecatedKeyName": "ERG",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.WIN.address": {
            "deprecatedKeyName": "WIN",
            "validationRegex": "^[T][a-zA-HJ-NP-Z0-9]{33}$",
            "deprecated": false
        },
        "crypto.NPXS.address": {
            "deprecatedKeyName": "NPXS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TRIBE.address": {
            "deprecatedKeyName": "TRIBE",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MAID.address": {
            "deprecatedKeyName": "MAID",
            "validationRegex": "^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,39}$",
            "deprecated": false
        },
        "crypto.ASD.address": {
            "deprecatedKeyName": "ASD",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CUNI.address": {
            "deprecatedKeyName": "CUNI",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CELO.address": {
            "deprecatedKeyName": "CELO",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.DENT.address": {
            "deprecatedKeyName": "DENT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SNT.address": {
            "deprecatedKeyName": "SNT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FEG.version.ERC20.address": {
            "deprecatedKeyName": "FEG_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FEG.version.HRC20.address": {
            "deprecatedKeyName": "FEG_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SKL.address": {
            "deprecatedKeyName": "SKL",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ALUSD.address": {
            "deprecatedKeyName": "ALUSD",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MIR.version.ERC20.address": {
            "deprecatedKeyName": "MIR_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MIR.version.BEP20.address": {
            "deprecatedKeyName": "MIR_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.GLM.address": {
            "deprecatedKeyName": "GLM",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.PAXG.version.ERC20.address": {
            "deprecatedKeyName": "PAXG_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.PAXG.version.HRC20.address": {
            "deprecatedKeyName": "PAXG_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CFX.address": {
            "deprecatedKeyName": "CFX",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.UOS.address": {
            "deprecatedKeyName": "UOS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SVCS.address": {
            "deprecatedKeyName": "SVCS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.REEF.version.ERC20.address": {
            "deprecatedKeyName": "REEF_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.REEF.version.BEP20.address": {
            "deprecatedKeyName": "REEF_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.REEF.version.HRC20.address": {
            "deprecatedKeyName": "REEF_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.GNO.address": {
            "deprecatedKeyName": "GNO",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.USDP.address": {
            "deprecatedKeyName": "USDP",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KAVA.address": {
            "deprecatedKeyName": "KAVA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ALCX.address": {
            "deprecatedKeyName": "ALCX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.EWT.address": {
            "deprecatedKeyName": "EWT",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.TON.address": {
            "deprecatedKeyName": "TON",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.RLC.address": {
            "deprecatedKeyName": "RLC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AXS.address": {
            "deprecatedKeyName": "AXS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AUDIO.address": {
            "deprecatedKeyName": "AUDIO",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.XVS.address": {
            "deprecatedKeyName": "XVS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BAND.version.ERC20.address": {
            "deprecatedKeyName": "BAND_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.BAND.version.FANTOM.address": {
            "deprecatedKeyName": "BAND_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.NMR.address": {
            "deprecatedKeyName": "NMR",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.INJ.version.ERC20.address": {
            "deprecatedKeyName": "INJ_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.INJ.version.BEP20.address": {
            "deprecatedKeyName": "INJ_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.WAXP.address": {
            "deprecatedKeyName": "WAXP",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.UQC.address": {
            "deprecatedKeyName": "UQC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.IOTX.address": {
            "deprecatedKeyName": "IOTX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FUN.address": {
            "deprecatedKeyName": "FUN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.OCEAN.address": {
            "deprecatedKeyName": "OCEAN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SAND.version.ERC20.address": {
            "deprecatedKeyName": "SAND_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SAND.version.HRC20.address": {
            "deprecatedKeyName": "SAND_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CTSI.version.ERC20.address": {
            "deprecatedKeyName": "CTSI_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CTSI.version.BEP20.address": {
            "deprecatedKeyName": "CTSI_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CTSI.version.MATIC.address": {
            "deprecatedKeyName": "CTSI_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.RAY.address": {
            "deprecatedKeyName": "RAY",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ANC.version.TERRA.address": {
            "deprecatedKeyName": "ANC_TERRA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ANC.version.ERC20.address": {
            "deprecatedKeyName": "ANC_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.IQ.version.ERC20.address": {
            "deprecatedKeyName": "IQ_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.IQ.version.BEP20.address": {
            "deprecatedKeyName": "IQ_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.IQ.version.MATIC.address": {
            "deprecatedKeyName": "IQ_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SUSD.version.ERC20.address": {
            "deprecatedKeyName": "SUSD_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SUSD.version.FANTOM.address": {
            "deprecatedKeyName": "SUSD_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.KLV.address": {
            "deprecatedKeyName": "KLV",
            "validationRegex": "^[T][a-zA-HJ-NP-Z0-9]{33}$",
            "deprecated": false
        },
        "crypto.BTCST.address": {
            "deprecatedKeyName": "BTCST",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TLM.address": {
            "deprecatedKeyName": "TLM",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AKT.address": {
            "deprecatedKeyName": "AKT",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.STMX.address": {
            "deprecatedKeyName": "STMX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.PROM.address": {
            "deprecatedKeyName": "PROM",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.XPRT.address": {
            "deprecatedKeyName": "XPRT",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.SRM.version.ERC20.address": {
            "deprecatedKeyName": "SRM_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SRM.version.SOLANA.address": {
            "deprecatedKeyName": "SRM_SOLANA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.RPL.address": {
            "deprecatedKeyName": "RPL",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AGIX.address": {
            "deprecatedKeyName": "AGIX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CELR.address": {
            "deprecatedKeyName": "CELR",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.FET.address": {
            "deprecatedKeyName": "FET",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.OXT.address": {
            "deprecatedKeyName": "OXT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ARDR.address": {
            "deprecatedKeyName": "ARDR",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.MATH.address": {
            "deprecatedKeyName": "MATH",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.10SET.address": {
            "deprecatedKeyName": "10SET",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.POLY.address": {
            "deprecatedKeyName": "POLY",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.GUSD.address": {
            "deprecatedKeyName": "GUSD",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.NKN.address": {
            "deprecatedKeyName": "NKN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CVC.address": {
            "deprecatedKeyName": "CVC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.GTC.address": {
            "deprecatedKeyName": "GTC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.STEEM.address": {
            "deprecatedKeyName": "STEEM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ORN.address": {
            "deprecatedKeyName": "ORN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KEEP.version.ERC20.address": {
            "deprecatedKeyName": "KEEP_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KEEP.version.HRC20.address": {
            "deprecatedKeyName": "KEEP_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HXRO.address": {
            "deprecatedKeyName": "HXRO",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ORBS.address": {
            "deprecatedKeyName": "ORBS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ALPHA.version.ERC20.address": {
            "deprecatedKeyName": "ALPHA_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ALPHA.version.BEP20.address": {
            "deprecatedKeyName": "ALPHA_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.DODO.version.ERC20.address": {
            "deprecatedKeyName": "DODO_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.DODO.version.BEP20.address": {
            "deprecatedKeyName": "DODO_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.OGN.address": {
            "deprecatedKeyName": "OGN",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KNCL.version.ERC20.address": {
            "deprecatedKeyName": "KNCL_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KNCL.version.FANTOM.address": {
            "deprecatedKeyName": "KNCL_FANTOM",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.KNCL.version.HRC20.address": {
            "deprecatedKeyName": "KNCL_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MED.address": {
            "deprecatedKeyName": "MED",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.XAUT.address": {
            "deprecatedKeyName": "XAUT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.VLX.address": {
            "deprecatedKeyName": "VLX",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.PHA.address": {
            "deprecatedKeyName": "PHA",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.KOBE.address": {
            "deprecatedKeyName": "KOBE",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.PERP.address": {
            "deprecatedKeyName": "PERP",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.XHV.address": {
            "deprecatedKeyName": "XHV",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.META.address": {
            "deprecatedKeyName": "META",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SEUR.address": {
            "deprecatedKeyName": "SEUR",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.MONA.address": {
            "deprecatedKeyName": "MONA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ANT.address": {
            "deprecatedKeyName": "ANT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.HYDRA.address": {
            "deprecatedKeyName": "HYDRA",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.ZKS.address": {
            "deprecatedKeyName": "ZKS",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SXP.version.ERC20.address": {
            "deprecatedKeyName": "SXP_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SXP.version.BEP20.address": {
            "deprecatedKeyName": "SXP_BEP20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.SXP.version.HRC20.address": {
            "deprecatedKeyName": "SXP_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.CSPR.address": {
            "deprecatedKeyName": "CSPR",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.MTL.address": {
            "deprecatedKeyName": "MTL",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.NU.address": {
            "deprecatedKeyName": "NU",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ZMT.address": {
            "deprecatedKeyName": "ZMT",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.LOC.address": {
            "deprecatedKeyName": "LOC",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.TKO.address": {
            "deprecatedKeyName": "TKO",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.ETN.address": {
            "deprecatedKeyName": "ETN",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.UBT.version.ERC20.address": {
            "deprecatedKeyName": "UBT_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.UBT.version.MATIC.address": {
            "deprecatedKeyName": "UBT_MATIC",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.EXRD.address": {
            "deprecatedKeyName": "EXRD",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.NMX.address": {
            "deprecatedKeyName": "NMX",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.RIF.address": {
            "deprecatedKeyName": "RIF",
            "validationRegex": null,
            "deprecated": false
        },
        "crypto.STORJ.version.ERC20.address": {
            "deprecatedKeyName": "STORJ_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.STORJ.version.HRC20.address": {
            "deprecatedKeyName": "STORJ_HRC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.AVA.address": {
            "deprecatedKeyName": "AVA",
            "validationRegex": "^(bnb|tbnb)[a-zA-HJ-NP-Z0-9]{39}$",
            "deprecated": false
        },
        "crypto.DPI.version.ERC20.address": {
            "deprecatedKeyName": "DPI_ERC20",
            "validationRegex": "^0x[a-fA-F0-9]{40}$",
            "deprecated": false
        },
        "crypto.DPI.version.MATIC.address": {
            "deprecatedKeyName": "DPI_MATIC",
            "validationRegex": null,
            "deprecated": false
        }
    }
}

},{}],62:[function(require,module,exports){
module.exports={
    "version": "0.2.0",
    "networks": {
        "1": {
            "contracts": {
                "UNSRegistry": {
                    "address": "0x049aba7510f45BA5b64ea9E658E342F904DB358D",
                    "implementation": "0x2351f8557Ec733F35a278C922F9DcAac32c687AF",
                    "legacyAddresses": [],
                    "deploymentBlock": "0xc2fede",
                    "forwarder": "0x049aba7510f45BA5b64ea9E658E342F904DB358D"
                },
                "CNSRegistry": {
                    "address": "0xD1E5b0FF1287aA9f9A268759062E4Ab08b9Dacbe",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x8a958b",
                    "forwarder": "0x97B0E89fC1B7eD4A8B237D9d8Fcce9b234f25A37"
                },
                "MintingManager": {
                    "address": "0x2a7084870bB724175a3C96Da8FaA55128fa3E19D",
                    "implementation": "0x1c776e8D286a35e8B4bc51388A77dD2044E5Fa7d",
                    "legacyAddresses": [],
                    "deploymentBlock": "0xc2fee0",
                    "forwarder": "0xb970fbCF52cd8111c76c379D4f2FE12E7f8AE7fb"
                },
                "ProxyAdmin": {
                    "address": "0xAA16DA78110D9A9742c760a1a064F28654Ab93de",
                    "legacyAddresses": [],
                    "deploymentBlock": "0xc2fedc"
                },
                "SignatureController": {
                    "address": "0x82EF94294C95aD0930055f31e53A34509227c5f7",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x8a95a6"
                },
                "MintingController": {
                    "address": "0xb0EE56339C3253361730F50c08d3d7817ecD60Ca",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x8a95aa",
                    "deprecated": true
                },
                "WhitelistedMinter": {
                    "address": "0xd3fF3377b0ceade1303dAF9Db04068ef8a650757",
                    "legacyAddresses": [],
                    "deploymentBlock": "0xa76ad3",
                    "deprecated": true
                },
                "URIPrefixController": {
                    "address": "0x09B091492759737C03da9dB7eDF1CD6BCC3A9d91",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x8a95ae",
                    "deprecated": true
                },
                "DomainZoneController": {
                    "address": "0xeA70777e28E00E81f58b8921fC47F78B8a72eFE7",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x98ca20",
                    "deprecated": true
                },
                "Resolver": {
                    "address": "0xb66DcE2DA6afAAa98F2013446dBCB0f4B0ab2842",
                    "legacyAddresses": [
                        "0xa1cac442be6673c49f8e74ffc7c4fd746f3cbd0d",
                        "0x878bc2f3f717766ab69c0a5f9a6144931e61aed3"
                    ],
                    "deploymentBlock": "0x960844",
                    "forwarder": "0x92660E5F403679aB45e0C6DB7c35B5629d265fDd"
                },
                "ProxyReader": {
                    "address": "0xc3C2BAB5e3e52DBF311b2aAcEf2e40344f19494E",
                    "legacyAddresses": [
                        "0xfEe4D4F0aDFF8D84c12170306507554bC7045878",
                        "0xa6E7cEf2EDDEA66352Fd68E5915b60BDbb7309f5",
                        "0x7ea9Ee21077F84339eDa9C80048ec6db678642B1"
                    ],
                    "deploymentBlock": "0xca7ab2"
                },
                "TwitterValidationOperator": {
                    "address": "0x2F659766E3D08561CA3408FbAba7C0749ab2c402",
                    "legacyAddresses": ["0xbb486C6E9cF1faA86a6E3eAAFE2e5665C0507855"],
                    "deploymentBlock": "0xc300b5"
                },
                "FreeMinter": {
                    "address": "0x1fC985cAc641ED5846b631f96F35d9b48Bc3b834",
                    "legacyAddresses": [],
                    "deploymentBlock": "0xacc390",
                    "deprecated": true
                }
            }
        },
        "4": {
            "contracts": {
                "UNSRegistry": {
                    "address": "0x7fb83000B8eD59D3eAD22f0D584Df3a85fBC0086",
                    "implementation": "0xc479D7A65243f7Eb1641F06a6C04E5F06cb5c4F7",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x85e628",
                    "forwarder": "0x7fb83000B8eD59D3eAD22f0D584Df3a85fBC0086"
                },
                "CNSRegistry": {
                    "address": "0xAad76bea7CFEc82927239415BB18D2e93518ecBB",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232bc",
                    "forwarder": "0xdf5CC97216785398D5C77348e68fc9461108f85d"
                },
                "MintingManager": {
                    "address": "0xdAAf99A920D31F4f5720e4667b12b24e54A03070",
                    "implementation": "0x38Fa95a0AC0E59D6e2845eFADBc17aF0FF9c7089",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x85e629",
                    "forwarder": "0xfB13e29C4D31a48B4Cd61131Cf3b681416e11681"
                },
                "ProxyAdmin": {
                    "address": "0xaf9815005A208d1460b6fC60B4f90B9f2185E88c",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x85e627"
                },
                "SignatureController": {
                    "address": "0x66a5e3e2C27B4ce4F46BBd975270BE154748D164",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232be"
                },
                "MintingController": {
                    "address": "0x51765307AeB3Df2E647014a2C501d5324212467c",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232bf",
                    "deprecated": true
                },
                "WhitelistedMinter": {
                    "address": "0xbcB32f13f90978a9e059E8Cb40FaA9e6619d98e7",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232c6",
                    "deprecated": true
                },
                "URIPrefixController": {
                    "address": "0xe1d2e4B9f0518CA5c803073C3dFa886470627237",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232c0",
                    "deprecated": true
                },
                "DomainZoneController": {
                    "address": "0x6f8F96A566663C1d4fEe70edD37E9b62Fe39dE5D",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232c2",
                    "deprecated": true
                },
                "Resolver": {
                    "address": "0x95AE1515367aa64C462c71e87157771165B1287A",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x7232cf",
                    "forwarder": "0xE172D8557d6F342b1b2976dE784F6Dff6ABC0a37"
                },
                "ProxyReader": {
                    "address": "0xE6729D224D00b3dd4FC731C4Ee3274E35Da06578",
                    "legacyAddresses": [
                        "0x299974AeD8911bcbd2C61262605b89F591a53E83",
                        "0x9F19473F6a98a715176291c930558E1954fd3D1e",
                        "0x3A2e74CF832cbA3d77E72708d55370119E4323a6"
                    ],
                    "deploymentBlock": "0x8dc79a"
                },
                "TwitterValidationOperator": {
                    "address": "0x9ea4A63184ebE9CBA55CD1af473D98075Aa02b4C",
                    "legacyAddresses": ["0x1CB337b3b208dc29a6AcE8d11Bb591b66c5Dd83d"],
                    "deploymentBlock": "0x86935e"
                },
                "FreeMinter": {
                    "address": "0x84214215904cDEbA9044ECf95F3eBF009185AAf4",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x740d93",
                    "deprecated": true
                }
            }
        },
        "5": {
            "contracts": {
                "UNSRegistry": {
                    "address": "0x070e83FCed225184E67c86302493ffFCDB953f71",
                    "implementation": "0x24b91e7Cd07cb5ae581034e545Db2Fe36F9e9Ada",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57ea",
                    "forwarder": "0x070e83FCed225184E67c86302493ffFCDB953f71"
                },
                "CNSRegistry": {
                    "address": "0x801452cFAC27e79a11c6b185986fdE09e8637589",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57d7",
                    "forwarder": "0x00443017FFaa4C840Caf5Dc7d3CB59147f363080"
                },
                "MintingManager": {
                    "address": "0x9ee42D3EB042e06F8Cd241890C4fA0d51e4DA345",
                    "implementation": "0x487DE785da9A671E23976F08abF991072Af9dB21",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57ec",
                    "forwarder": "0x7F9F48cF94C69ce91D4b442DA186F31118ac0185"
                },
                "ProxyAdmin": {
                    "address": "0xf4906E210523F9dA79E33811A44EE000441F4E04",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57e8"
                },
                "SignatureController": {
                    "address": "0x5199dAE4B24B987ba18FcE1b64664D1B798d372B",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57d8"
                },
                "MintingController": {
                    "address": "0xCEC41677be322049cC885c0DAe2fE0D52CA195ca",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57d9",
                    "deprecated": true
                },
                "WhitelistedMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "URIPrefixController": {
                    "address": "0x29465e3d2daA588E62375977bCe9b3f51406a794",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57da",
                    "deprecated": true
                },
                "DomainZoneController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "Resolver": {
                    "address": "0x0555344A5F440Bd1d8cb6B42db46c5e5D4070437",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57dc",
                    "forwarder": "0xdD076eBC73f3AE9F4F946B3707eb8d26Fb53ede7"
                },
                "ProxyReader": {
                    "address": "0xFc5f608149f4D9e2Ed0733efFe9DD57ee24BCF68",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x5b57f3"
                },
                "TwitterValidationOperator": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0"
                },
                "FreeMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                }
            }
        },
        "137": {
            "contracts": {
                "UNSRegistry": {
                    "address": "0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01272eb5",
                    "implementation": "0x0a7b33E986f2c8BF2a16bdda6004d3FaFFC27695",
                    "forwarder": "0xa9a6A3626993D487d2Dbda3173cf58cA1a9D9e9f"
                },
                "CNSRegistry": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "forwarder": "0x0000000000000000000000000000000000000000"
                },
                "MintingManager": {
                    "address": "0x7be83293BeeDc9Eba1bd76c66A65F10F3efaeC26",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01272f41",
                    "implementation": "0x10e91753eC98cd259A62085002C25E92C9dc8Aed",
                    "forwarder": "0xC37d3c4326ab0E1D2b9D8b916bBdf5715f780fcF"
                },
                "ProxyAdmin": {
                    "address": "0xe1D668052D52388F52b90f4d1798DB2b04bC3b88",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01272d15"
                },
                "SignatureController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0"
                },
                "MintingController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "WhitelistedMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "URIPrefixController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "DomainZoneController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "Resolver": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "forwarder": "0x0000000000000000000000000000000000000000"
                },
                "ProxyReader": {
                    "address": "0xA3f32c8cd786dc089Bd1fC175F2707223aeE5d00",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01273234"
                },
                "TwitterValidationOperator": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0"
                },
                "FreeMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                }
            }
        },
        "1337": {
            "contracts": {
                "UNSRegistry": {
                    "address": "0xC20631145b77a58018E2b10f2282Dd048E12fC81",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x11",
                    "implementation": "0x27935e7e85db3c4e7885eB828B9e889BA69a4e7f",
                    "forwarder": "0xC20631145b77a58018E2b10f2282Dd048E12fC81"
                },
                "CNSRegistry": {
                    "address": "0xC58206842E4030a3B2CaBC78780Ae7635173C533",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01",
                    "forwarder": "0x58a175BEbc8ec21A94ea63Aa5a28743945940EE6"
                },
                "MintingManager": {
                    "address": "0x62b11ad5F582a5C5d378fB310125b030042554F1",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x13",
                    "implementation": "0x16F93031FE514e57dBd07eF34FEdAeb89980fa3E",
                    "forwarder": "0x107733feD96C4Cd390c944a31F5425A7FB98Ae5e"
                },
                "ProxyAdmin": {
                    "address": "0x6E53896B006fA3f173aF0096f8DfC0a179cFe8c8",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01"
                },
                "SignatureController": {
                    "address": "0x7bB6Cd9be29fab783c0b494A06FED8b2E2596B7a",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x02"
                },
                "MintingController": {
                    "address": "0x4a3C194eB88966178bfDD81744ddDafED611B830",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x03",
                    "deprecated": true
                },
                "WhitelistedMinter": {
                    "address": "0xAc52F68f31577E44aE0C7E95A42dC9eb574B9383",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x09",
                    "deprecated": true
                },
                "URIPrefixController": {
                    "address": "0x4872CC1be60A9DB9c880A0A437Da7a6AF134F08f",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x04",
                    "deprecated": true
                },
                "DomainZoneController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "Resolver": {
                    "address": "0xF8C26340C1eAeA6c7fF1760B25005e1306953572",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x08",
                    "forwarder": "0xa1A2114B0C4bDF9AEe05fdd80801e6267639FAd9"
                },
                "ProxyReader": {
                    "address": "0xe85541865Bbb62A05064ce5C9F41cC293A8eA996",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x18"
                },
                "TwitterValidationOperator": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0"
                },
                "FreeMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                }
            }
        },
        "80001": {
            "contracts": {
                "UNSRegistry": {
                    "address": "0x2a93C52E7B6E7054870758e15A1446E769EdfB93",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01213f43",
                    "implementation": "0x6EBa8D5fD76a7C2A760BE0fB993F18FB54920010",
                    "forwarder": "0x2a93C52E7B6E7054870758e15A1446E769EdfB93"
                },
                "CNSRegistry": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "forwarder": "0x0000000000000000000000000000000000000000"
                },
                "MintingManager": {
                    "address": "0x428189346bb3CC52f031A1092fd47C919AC30A9f",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01213f4a",
                    "implementation": "0x4f4c3a4B75346A546d309934726e7FfbdA13262D",
                    "forwarder": "0xEf3a491A8750BEC2Dff5339CF6Df94436d432C4d"
                },
                "ProxyAdmin": {
                    "address": "0x460d63117c7Ab1624b7474C45BF46eC6702f57ce",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01213b22"
                },
                "SignatureController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0"
                },
                "MintingController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "WhitelistedMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "URIPrefixController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "DomainZoneController": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                },
                "Resolver": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "forwarder": "0x0000000000000000000000000000000000000000"
                },
                "ProxyReader": {
                    "address": "0x332A8191905fA8E6eeA7350B5799F225B8ed30a9",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x01213f87"
                },
                "TwitterValidationOperator": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0"
                },
                "FreeMinter": {
                    "address": "0x0000000000000000000000000000000000000000",
                    "legacyAddresses": [],
                    "deploymentBlock": "0x0",
                    "deprecated": true
                }
            }
        }
    }
}

},{}],63:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var abi_1 = require("@ethersproject/abi");
var EthereumContract = /** @class */ (function () {
    function EthereumContract(abi, address, provider) {
        this.abi = abi;
        this.address = address;
        this.provider = provider;
        this.coder = new abi_1.Interface(this.abi);
    }
    EthereumContract.prototype.call = function (method, args) {
        return __awaiter(this, void 0, void 0, function () {
            var inputParam, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        inputParam = this.coder.encodeFunctionData(method, args);
                        return [4 /*yield*/, this.callEth(inputParam)];
                    case 1:
                        response = (_a.sent());
                        if (!response || response === '0x') {
                            return [2 /*return*/, []];
                        }
                        return [2 /*return*/, this.coder.decodeFunctionResult(method, response)];
                }
            });
        });
    };
    EthereumContract.prototype.multicall = function (callArgs) {
        return __awaiter(this, void 0, void 0, function () {
            var methods, _i, callArgs_1, call, inputParam, response, multicallResult, results, i;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        methods = [];
                        for (_i = 0, callArgs_1 = callArgs; _i < callArgs_1.length; _i++) {
                            call = callArgs_1[_i];
                            methods.push(this.coder.encodeFunctionData(call.method, call.args));
                        }
                        inputParam = this.coder.encodeFunctionData('multicall', [methods]);
                        return [4 /*yield*/, this.callEth(inputParam)];
                    case 1:
                        response = (_a.sent());
                        if (!response || response === '0x') {
                            return [2 /*return*/, []];
                        }
                        multicallResult = this.coder.decodeFunctionResult('multicall', response);
                        results = [];
                        for (i = 0; i < multicallResult.results.length; i++) {
                            results.push(this.coder.decodeFunctionResult(callArgs[i].method, multicallResult.results[i]));
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    };
    EthereumContract.prototype.fetchLogs = function (eventName, tokenId, fromBlock) {
        if (fromBlock === void 0) { fromBlock = 'earliest'; }
        return __awaiter(this, void 0, void 0, function () {
            var topic, params, request;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        topic = this.coder.getEventTopic(eventName);
                        params = [
                            {
                                fromBlock: fromBlock,
                                toBlock: 'latest',
                                address: this.address,
                                topics: [topic, tokenId],
                            },
                        ];
                        request = {
                            method: 'eth_getLogs',
                            params: params,
                        };
                        return [4 /*yield*/, this.provider.request(request)];
                    case 1: return [2 /*return*/, (_a.sent())];
                }
            });
        });
    };
    EthereumContract.prototype.callEth = function (data) {
        return __awaiter(this, void 0, void 0, function () {
            var params, request;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = [
                            {
                                data: data,
                                to: this.address,
                            },
                            'latest',
                        ];
                        request = {
                            method: 'eth_call',
                            params: params,
                        };
                        return [4 /*yield*/, this.provider.request(request)];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return EthereumContract;
}());
exports.default = EthereumContract;

},{"@ethersproject/abi":21}],64:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = [
    {
        inputs: [
            {
                internalType: 'contract IUNSRegistry',
                name: 'unsRegistry',
                type: 'address',
            },
            {
                internalType: 'contract ICNSRegistry',
                name: 'cnsRegistry',
                type: 'address',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'constructor',
    },
    {
        inputs: [],
        name: 'NAME',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [],
        name: 'VERSION',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
            {
                internalType: 'string',
                name: 'label',
                type: 'string',
            },
        ],
        name: 'childIdOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'exists',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string',
                name: 'key',
                type: 'string',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'get',
        outputs: [
            {
                internalType: 'string',
                name: 'value',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'getApproved',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'keyHash',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'getByHash',
        outputs: [
            {
                internalType: 'string',
                name: 'key',
                type: 'string',
            },
            {
                internalType: 'string',
                name: 'value',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string[]',
                name: 'keys',
                type: 'string[]',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'getData',
        outputs: [
            {
                internalType: 'address',
                name: 'resolver',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'keyHashes',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'getDataByHash',
        outputs: [
            {
                internalType: 'address',
                name: 'resolver',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'owner',
                type: 'address',
            },
            {
                internalType: 'string[]',
                name: 'keys',
                type: 'string[]',
            },
            {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'keyHashes',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'tokenIds',
                type: 'uint256[]',
            },
        ],
        name: 'getDataByHashForMany',
        outputs: [
            {
                internalType: 'address[]',
                name: 'resolvers',
                type: 'address[]',
            },
            {
                internalType: 'address[]',
                name: 'owners',
                type: 'address[]',
            },
            {
                internalType: 'string[][]',
                name: 'keys',
                type: 'string[][]',
            },
            {
                internalType: 'string[][]',
                name: 'values',
                type: 'string[][]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string[]',
                name: 'keys',
                type: 'string[]',
            },
            {
                internalType: 'uint256[]',
                name: 'tokenIds',
                type: 'uint256[]',
            },
        ],
        name: 'getDataForMany',
        outputs: [
            {
                internalType: 'address[]',
                name: 'resolvers',
                type: 'address[]',
            },
            {
                internalType: 'address[]',
                name: 'owners',
                type: 'address[]',
            },
            {
                internalType: 'string[][]',
                name: 'values',
                type: 'string[][]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'string[]',
                name: 'keys',
                type: 'string[]',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'getMany',
        outputs: [
            {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'keyHashes',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'getManyByHash',
        outputs: [
            {
                internalType: 'string[]',
                name: 'keys',
                type: 'string[]',
            },
            {
                internalType: 'string[]',
                name: 'values',
                type: 'string[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        name: 'isApprovedForAll',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'pure',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'spender',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'isApprovedOrOwner',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes[]',
                name: 'data',
                type: 'bytes[]',
            },
        ],
        name: 'multicall',
        outputs: [
            {
                internalType: 'bytes[]',
                name: 'results',
                type: 'bytes[]',
            },
        ],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'ownerOf',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256[]',
                name: 'tokenIds',
                type: 'uint256[]',
            },
        ],
        name: 'ownerOfForMany',
        outputs: [
            {
                internalType: 'address[]',
                name: 'owners',
                type: 'address[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'registryOf',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'resolverOf',
        outputs: [
            {
                internalType: 'address',
                name: '',
                type: 'address',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes4',
                name: 'interfaceId',
                type: 'bytes4',
            },
        ],
        name: 'supportsInterface',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'tokenId',
                type: 'uint256',
            },
        ],
        name: 'tokenURI',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];

},{}],65:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var ConfigurationErrorCode;
(function (ConfigurationErrorCode) {
    ConfigurationErrorCode["IncorrectProvider"] = "IncorrectProvider";
    ConfigurationErrorCode["UnsupportedNetwork"] = "UnsupportedNetwork";
    ConfigurationErrorCode["UnspecifiedUrl"] = "UnspecifiedUrl";
    ConfigurationErrorCode["NetworkConfigMissing"] = "NetworkConfigMissing";
    ConfigurationErrorCode["CustomNetworkConfigMissing"] = "CustomNetworkConfigMissing";
    ConfigurationErrorCode["InvalidConfigurationField"] = "InvalidProxyReader";
})(ConfigurationErrorCode = exports.ConfigurationErrorCode || (exports.ConfigurationErrorCode = {}));
/**
 * @internal
 * Internal Mapping object from ConfigurationErrorCode to a ConfigurationErrorHandler
 */
var HandlersByCode = (_a = {},
    _a[ConfigurationErrorCode.IncorrectProvider] = function () {
        return "Provider doesn't implement sendAsync or send method";
    },
    _a[ConfigurationErrorCode.UnsupportedNetwork] = function (params) {
        return "Unsupported network in Resolution " + (params.method || '') + " configuration";
    },
    _a[ConfigurationErrorCode.UnspecifiedUrl] = function (params) { return "Unspecified url in Resolution " + params.method + " configuration"; },
    _a[ConfigurationErrorCode.NetworkConfigMissing] = function (params) {
        return "Missing configuration in Resolution " + params.method + ". Please specify " + params.config;
    },
    _a[ConfigurationErrorCode.CustomNetworkConfigMissing] = function (params) {
        return "Missing configuration in Resolution " + params.method + ". Please specify " + params.config + " when using a custom network";
    },
    _a[ConfigurationErrorCode.InvalidConfigurationField] = function (params) { return "Invalid '" + params.field + "' in Resolution " + params.method; },
    _a);
/**
 * Configuration Error class is designed to control every error being thrown by wrong configurations for objects
 * @param code - Error Code
 * - IncorrectProvider - When provider doesn't have implemented send or sendAsync methods
 * - UnsupportedNetwork - When network is not specified or not supported
 * - UnspecifiedUrl - When url is not specified for custom naming service configurations
 * - CustomNetworkConfigMissing - When configuration is missing for custom network configurations
 * @param method - optional param to specify which namingService errored out
 */
var ConfigurationError = /** @class */ (function (_super) {
    __extends(ConfigurationError, _super);
    function ConfigurationError(code, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        var configurationErrorHandler = HandlersByCode[code];
        _this = _super.call(this, configurationErrorHandler(options)) || this;
        _this.code = code;
        _this.method = options.method;
        _this.name = 'ConfigurationError';
        Object.setPrototypeOf(_this, ConfigurationError.prototype);
        return _this;
    }
    return ConfigurationError;
}(Error));
exports.ConfigurationError = ConfigurationError;
exports.default = ConfigurationError;

},{}],66:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var DnsRecordsErrorCode;
(function (DnsRecordsErrorCode) {
    DnsRecordsErrorCode["InconsistentTtl"] = "InconsistentTtl";
    DnsRecordsErrorCode["DnsRecordCorrupted"] = "DnsRecordCorrupted";
})(DnsRecordsErrorCode = exports.DnsRecordsErrorCode || (exports.DnsRecordsErrorCode = {}));
/**
 * @internal
 * Internal Mapping object from DnsRecordsErrorCode to a DnsRecordsErrorHandler
 */
var HandlersByCode = (_a = {},
    _a[DnsRecordsErrorCode.InconsistentTtl] = function (params) {
        return "ttl for record " + params.recordType + " is different for other records of the same type";
    },
    _a[DnsRecordsErrorCode.DnsRecordCorrupted] = function (params) {
        return "dns record " + params.recordType + " is invalid json-string";
    },
    _a);
/**
 * Configuration Error class is designed to control every error being thrown by wrong configurations for objects
 * @param code - Error Code
 * - IncorrectProvider - When provider doesn't have implemented send or sendAsync methods
 * - UnsupportedNetwork - When network is not specified or not supported
 * - UnspecifiedUrl - When url is not specified for custom naming service configurations
 * @param method - optional param to specify which namingService errored out
 */
var DnsRecordsError = /** @class */ (function (_super) {
    __extends(DnsRecordsError, _super);
    function DnsRecordsError(code, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        var DnsRecordsErrorHandler = HandlersByCode[code];
        _this = _super.call(this, DnsRecordsErrorHandler(options)) || this;
        _this.code = code;
        _this.name = 'DnsRecordsError';
        Object.setPrototypeOf(_this, DnsRecordsError.prototype);
        return _this;
    }
    return DnsRecordsError;
}(Error));
exports.DnsRecordsError = DnsRecordsError;
exports.default = DnsRecordsError;

},{}],67:[function(require,module,exports){
"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var ResolutionErrorCode;
(function (ResolutionErrorCode) {
    ResolutionErrorCode["UnregisteredDomain"] = "UnregisteredDomain";
    ResolutionErrorCode["UnspecifiedResolver"] = "UnspecifiedResolver";
    ResolutionErrorCode["UnsupportedDomain"] = "UnsupportedDomain";
    ResolutionErrorCode["UnsupportedService"] = "UnsupportedService";
    ResolutionErrorCode["UnsupportedMethod"] = "UnsupportedMethod";
    ResolutionErrorCode["UnspecifiedCurrency"] = "UnspecifiedCurrency";
    ResolutionErrorCode["UnsupportedCurrency"] = "UnsupportedCurrency";
    ResolutionErrorCode["IncorrectResolverInterface"] = "IncorrectResolverInterface";
    ResolutionErrorCode["RecordNotFound"] = "RecordNotFound";
    ResolutionErrorCode["MetadataEndpointError"] = "MetadataEndpointError";
    ResolutionErrorCode["ServiceProviderError"] = "ServiceProviderError";
    ResolutionErrorCode["InvalidTwitterVerification"] = "InvalidTwitterVerification";
    ResolutionErrorCode["InconsistentDomainArray"] = "InconsistentDomainArray";
    ResolutionErrorCode["InvalidDomainAddress"] = "InvalidDomainAddress";
})(ResolutionErrorCode = exports.ResolutionErrorCode || (exports.ResolutionErrorCode = {}));
/**
 * @internal
 * Internal Mapping object from ResolutionErrorCode to a ResolutionErrorHandler
 */
var HandlersByCode = (_a = {},
    _a[ResolutionErrorCode.UnregisteredDomain] = function (params) {
        return "Domain " + params.domain + " is not registered";
    },
    _a[ResolutionErrorCode.UnspecifiedResolver] = function (params) {
        return (params.location ? params.location + ": " : '') + "Domain " + params.domain + " is not configured";
    },
    _a[ResolutionErrorCode.UnsupportedDomain] = function (params) {
        return "Domain " + params.domain + " is not supported";
    },
    _a[ResolutionErrorCode.UnsupportedMethod] = function (params) { return "Method " + params.methodName + " is not supported for " + params.domain; },
    _a[ResolutionErrorCode.InvalidTwitterVerification] = function (params) {
        return (params.location ? params.location + ": " : '') + "Domain " + params.domain + " has invalid Twitter signature verification";
    },
    _a[ResolutionErrorCode.UnsupportedCurrency] = function (params) { return params.currencyTicker + " is not supported"; },
    _a[ResolutionErrorCode.IncorrectResolverInterface] = function (params) { return "Domain resolver is configured incorrectly for " + params.method; },
    _a[ResolutionErrorCode.RecordNotFound] = function (params) {
        return (params.location ? params.location + ": " : '') + "No " + params.recordName + " record found for " + params.domain;
    },
    _a[ResolutionErrorCode.ServiceProviderError] = function (params) { return "< " + params.providerMessage + " >"; },
    _a[ResolutionErrorCode.MetadataEndpointError] = function (params) {
        return "Failed to query tokenUri " + params.tokenUri + ". Error: " + params.errorMessage;
    },
    _a[ResolutionErrorCode.UnsupportedService] = function (params) {
        return "Naming service " + params.namingService + " is not supported";
    },
    _a[ResolutionErrorCode.InvalidDomainAddress] = function (params) {
        return "Domain address " + params.domain + " is invalid";
    },
    _a);
/**
 * Resolution Error class is designed to control every error being thrown by Resolution
 * @param code - Error Code
 * - UnsupportedDomain - domain is not supported by current Resolution instance
 * - UnregisteredDomain - domain is not owned by any address
 * - UnspecifiedResolver - domain has no resolver specified
 * - UnspecifiedCurrency - domain resolver doesn't have any address of specified currency
 * - UnsupportedCurrency - currency is not supported
 * - IncorrectResolverInterface - ResolverInterface is incorrected
 * - RecordNotFound - No record was found
 * @param domain - Domain name that was being used
 * @param method
 */
var ResolutionError = /** @class */ (function (_super) {
    __extends(ResolutionError, _super);
    function ResolutionError(code, options) {
        if (options === void 0) { options = {}; }
        var _this = this;
        var resolutionErrorHandler = HandlersByCode[code];
        var domain = options.domain, method = options.method, currencyTicker = options.currencyTicker;
        var message = resolutionErrorHandler(options);
        _this = _super.call(this, message) || this;
        _this.code = code;
        _this.domain = domain;
        _this.method = method;
        _this.currencyTicker = currencyTicker;
        _this.name = 'ResolutionError';
        Object.setPrototypeOf(_this, ResolutionError.prototype);
        return _this;
    }
    return ResolutionError;
}(Error));
exports.ResolutionError = ResolutionError;
exports.default = ResolutionError;

},{}],68:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var Resolution_1 = require("./Resolution");
exports.Resolution = Resolution_1.Resolution;
exports.default = Resolution_1.Resolution;
__export(require("./types/publicTypes"));
var DnsUtils_1 = require("./utils/DnsUtils");
exports.DnsUtils = DnsUtils_1.default;
var resolutionError_1 = require("./errors/resolutionError");
exports.ResolutionError = resolutionError_1.ResolutionError;
exports.ResolutionErrorCode = resolutionError_1.ResolutionErrorCode;
var configurationError_1 = require("./errors/configurationError");
exports.ConfigurationError = configurationError_1.ConfigurationError;
exports.ConfigurationErrorCode = configurationError_1.ConfigurationErrorCode;
var dnsRecordsError_1 = require("./errors/dnsRecordsError");
exports.DnsRecordsError = dnsRecordsError_1.DnsRecordsError;
exports.DnsRecordsErrorCode = dnsRecordsError_1.DnsRecordsErrorCode;
var Eip1993Factories_1 = require("./utils/Eip1993Factories");
exports.Eip1993Factories = Eip1993Factories_1.Eip1993Factories;
var Eip1993Factories_2 = require("./utils/Eip1993Factories");
exports.Eip1193Factories = Eip1993Factories_2.Eip1993Factories;
var Eip1993Factories_3 = require("./utils/Eip1993Factories");
exports.ProviderFactories = Eip1993Factories_3.Eip1993Factories;

},{"./Resolution":56,"./errors/configurationError":65,"./errors/dnsRecordsError":66,"./errors/resolutionError":67,"./types/publicTypes":70,"./utils/DnsUtils":71,"./utils/Eip1993Factories":72}],69:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NullAddress = '0x0000000000000000000000000000000000000000';
var NullAddresses;
(function (NullAddresses) {
    NullAddresses[NullAddresses["0x"] = 0] = "0x";
    NullAddresses[NullAddresses["0x0000000000000000000000000000000000000000"] = 1] = "0x0000000000000000000000000000000000000000";
    NullAddresses[NullAddresses["0x0000000000000000000000000000000000000000000000000000000000000000"] = 2] = "0x0000000000000000000000000000000000000000000000000000000000000000";
})(NullAddresses = exports.NullAddresses || (exports.NullAddresses = {}));
// TypeScript will infer a string union type from the literal values passed to
// this function. Without `extends string`, it would instead generalize them
// to the common string type.
// @see https://stackoverflow.com/questions/36836011/checking-validity-of-string-literal-union-type-at-runtime
var StringUnion = function () {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    Object.freeze(values);
    var valueSet = new Set(values);
    var guard = function (value) {
        return valueSet.has(value);
    };
    var check = function (value) {
        if (!guard(value)) {
            var actual = JSON.stringify(value);
            var expected = values.map(function (s) { return JSON.stringify(s); }).join(' | ');
            throw new TypeError("Value '" + actual + "' is not assignable to type '" + expected + "'.");
        }
        return value;
    };
    var unionNamespace = { guard: guard, check: check, values: values };
    return Object.freeze(unionNamespace);
};
exports.UnsSupportedNetwork = StringUnion('mainnet', 'rinkeby', 'polygon-mainnet', 'polygon-mumbai');
exports.ZnsSupportedNetwork = StringUnion('mainnet', 'testnet');
function hasProvider(obj) {
    return obj && !!obj.provider;
}
exports.hasProvider = hasProvider;

},{}],70:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var UnsLocation;
(function (UnsLocation) {
    UnsLocation["Layer1"] = "UNSLayer1";
    UnsLocation["Layer2"] = "UNSLayer2";
})(UnsLocation = exports.UnsLocation || (exports.UnsLocation = {}));
var NamingServiceName;
(function (NamingServiceName) {
    NamingServiceName["UNS"] = "UNS";
    NamingServiceName["ZNS"] = "ZNS";
})(NamingServiceName = exports.NamingServiceName || (exports.NamingServiceName = {}));
exports.UnclaimedDomainResponse = {
    addresses: {},
    meta: {
        namehash: '',
        resolver: '',
        owner: null,
        type: '',
        ttl: 0,
    },
    records: {},
};
exports.UDApiDefaultUrl = 'https://unstoppabledomains.com/api/v1';
exports.NamehashOptionsDefault = { format: 'hex', prefix: true };
var DnsRecordType;
(function (DnsRecordType) {
    DnsRecordType["A"] = "A";
    DnsRecordType["AAAA"] = "AAAA";
    DnsRecordType["AFSDB"] = "AFSDB";
    DnsRecordType["APL"] = "APL";
    DnsRecordType["CAA"] = "CAA";
    DnsRecordType["CDNSKEY"] = "CDNSKEY";
    DnsRecordType["CDS"] = "CDS";
    DnsRecordType["CERT"] = "CERT";
    DnsRecordType["CNAME"] = "CNAME";
    DnsRecordType["CSYNC"] = "CSYNC";
    DnsRecordType["DHCID"] = "DHCID";
    DnsRecordType["DLV"] = "DLV";
    DnsRecordType["DNAME"] = "DNAME";
    DnsRecordType["DNSKEY"] = "DNSKEY";
    DnsRecordType["DS"] = "DS";
    DnsRecordType["EUI48"] = "EUI48";
    DnsRecordType["EUI64"] = "EUI64";
    DnsRecordType["HINFO"] = "HINFO";
    DnsRecordType["HIP"] = "HIP";
    DnsRecordType["HTTPS"] = "HTTPS";
    DnsRecordType["IPSECKEY"] = "IPSECKEY";
    DnsRecordType["KEY"] = "KEY";
    DnsRecordType["KX"] = "KX";
    DnsRecordType["LOC"] = "LOC";
    DnsRecordType["MX"] = "MX";
    DnsRecordType["NAPTR"] = "NAPTR";
    DnsRecordType["NS"] = "NS";
    DnsRecordType["NSEC"] = "NSEC";
    DnsRecordType["NSEC3"] = "NSEC3";
    DnsRecordType["NSEC3PARAM"] = "NSEC3PARAM";
    DnsRecordType["OPENPGPKEY"] = "OPENPGPKEY";
    DnsRecordType["PTR"] = "PTR";
    DnsRecordType["RP"] = "RP";
    DnsRecordType["RRSIG"] = "RRSIG";
    DnsRecordType["SIG"] = "SIG";
    DnsRecordType["SMIMEA"] = "SMIMEA";
    DnsRecordType["SOA"] = "SOA";
    DnsRecordType["SRV"] = "SRV";
    DnsRecordType["SSHFP"] = "SSHFP";
    DnsRecordType["SVCB"] = "SVCB";
    DnsRecordType["TA"] = "TA";
    DnsRecordType["TKEY"] = "TKEY";
    DnsRecordType["TLSA"] = "TLSA";
    DnsRecordType["TSIG"] = "TSIG";
    DnsRecordType["TXT"] = "TXT";
    DnsRecordType["URI"] = "URI";
    DnsRecordType["ZONEMD"] = "ZONEMD";
})(DnsRecordType = exports.DnsRecordType || (exports.DnsRecordType = {}));
var BlockchainType;
(function (BlockchainType) {
    BlockchainType["ETH"] = "ETH";
    BlockchainType["MATIC"] = "MATIC";
    BlockchainType["ZIL"] = "ZIL";
})(BlockchainType = exports.BlockchainType || (exports.BlockchainType = {}));

},{}],71:[function(require,module,exports){
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var dnsRecordsError_1 = __importStar(require("../errors/dnsRecordsError"));
var publicTypes_1 = require("../types/publicTypes");
var DnsUtils = /** @class */ (function () {
    function DnsUtils() {
    }
    DnsUtils.prototype.toList = function (record) {
        var _a;
        var _this = this;
        var dnsTypes = this.getAllDnsTypes(record);
        return (_a = []).concat.apply(_a, dnsTypes.map(function (type) { return _this.constructDnsRecords(record, type); }));
    };
    DnsUtils.prototype.toCrypto = function (records) {
        var cryptoRecords = {};
        for (var _i = 0, records_1 = records; _i < records_1.length; _i++) {
            var record = records_1[_i];
            var type = record.type, TTL = record.TTL, data = record.data;
            var ttlInRecord = this.getJsonNumber(cryptoRecords["dns." + type + ".ttl"]);
            var dnsInRecord = this.getJsonArray(cryptoRecords, "dns." + type);
            if (dnsInRecord) {
                dnsInRecord.push(data);
                cryptoRecords["dns." + type] = JSON.stringify(dnsInRecord);
            }
            else {
                cryptoRecords["dns." + type] = JSON.stringify([data]);
                cryptoRecords["dns." + type + ".ttl"] = TTL.toString(10);
            }
            if (!!ttlInRecord && ttlInRecord !== TTL) {
                throw new dnsRecordsError_1.default(dnsRecordsError_1.DnsRecordsErrorCode.InconsistentTtl, {
                    recordType: type,
                });
            }
        }
        return cryptoRecords;
    };
    DnsUtils.prototype.protectFromCorruptRecord = function (rawRecord, type) {
        try {
            return rawRecord ? JSON.parse(rawRecord) : undefined;
        }
        catch (err) {
            if (err instanceof SyntaxError) {
                throw new dnsRecordsError_1.default(dnsRecordsError_1.DnsRecordsErrorCode.DnsRecordCorrupted, {
                    recordType: type,
                });
            }
            throw err;
        }
    };
    DnsUtils.prototype.getJsonArray = function (cryptoRecrods, key) {
        var rawRecord = cryptoRecrods[key];
        var type = key.split('.')[1];
        return this.protectFromCorruptRecord(rawRecord, type);
    };
    DnsUtils.prototype.getJsonNumber = function (rawRecord) {
        return rawRecord ? parseInt(rawRecord, 10) : undefined;
    };
    DnsUtils.prototype.getAllDnsTypes = function (records) {
        var keys = new Set();
        Object.keys(records).forEach(function (key) {
            var chunks = key.split('.');
            var type = chunks[1] && chunks[1] !== 'ttl';
            if (type) {
                keys.add(publicTypes_1.DnsRecordType[chunks[1]]);
            }
        });
        return Array.from(keys);
    };
    DnsUtils.prototype.constructDnsRecords = function (cryptoData, type) {
        var TTL = this.parseTtl(cryptoData, type);
        var jsonValueString = cryptoData["dns." + type];
        if (!jsonValueString) {
            return [];
        }
        var typeData = this.protectFromCorruptRecord(jsonValueString, type);
        if (!this.isStringArray(typeData)) {
            return [];
        }
        return typeData.map(function (data) { return ({ TTL: TTL, data: data, type: type }); });
    };
    DnsUtils.prototype.parseTtl = function (data, type) {
        var defaultTtl = data['dns.ttl'];
        var recordTtl = data["dns." + type + ".ttl"];
        if (recordTtl) {
            var parsedInt = this.parseIfNumber(recordTtl);
            if (parsedInt) {
                return parsedInt;
            }
        }
        if (defaultTtl) {
            var parsedInt = this.parseIfNumber(defaultTtl);
            if (parsedInt) {
                return parsedInt;
            }
        }
        return DnsUtils.DefaultTtl;
    };
    DnsUtils.prototype.parseIfNumber = function (str) {
        var parsedInt = parseInt(str, 10);
        if (!isNaN(parsedInt)) {
            return parsedInt;
        }
    };
    DnsUtils.prototype.isStringArray = function (value) {
        if (value instanceof Array) {
            return value.every(function (item) { return typeof item === 'string'; });
        }
        return false;
    };
    DnsUtils.DefaultTtl = 300; // 5 minutes
    return DnsUtils;
}());
exports.default = DnsUtils;

},{"../errors/dnsRecordsError":66,"../types/publicTypes":70}],72:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var configurationError_1 = require("../errors/configurationError");
var resolutionError_1 = __importStar(require("../errors/resolutionError"));
exports.Eip1993Factories = {
    fromWeb3Version0Provider: fromWeb3Version0Provider,
    fromWeb3Version1Provider: fromWeb3Version1Provider,
    fromEthersProvider: fromEthersProvider,
    fromZilliqaProvider: fromZilliqaProvider,
};
/**
 * Create a Provider instance from web3 0.x version provider
 * @param provider - an 0.x version provider from web3 ( must implement sendAsync(payload, callback) )
 * @see https://github.com/ethereum/web3.js/blob/0.20.7/lib/web3/httpprovider.js#L116
 */
function fromWeb3Version0Provider(provider) {
    if (provider.sendAsync === undefined) {
        throw new configurationError_1.ConfigurationError(configurationError_1.ConfigurationErrorCode.IncorrectProvider);
    }
    return {
        request: function (request) {
            return new Promise(function (resolve, reject) {
                provider.sendAsync({
                    jsonrpc: '2.0',
                    method: request.method,
                    params: wrapArray(request.params),
                    id: 1,
                }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    if (result.error) {
                        reject(new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                            providerMessage: result.error,
                        }));
                    }
                    resolve(result.result);
                });
            });
        },
    };
}
/**
 * Create a Provider instance from web3 1.x version provider
 * @param provider - an 1.x version provider from web3 ( must implement send(payload, callback) )
 * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-core-helpers/types/index.d.ts#L165
 * @see https://github.com/ethereum/web3.js/blob/1.x/packages/web3-providers-http/src/index.js#L95
 */
function fromWeb3Version1Provider(provider) {
    if (provider.send === undefined) {
        throw new configurationError_1.ConfigurationError(configurationError_1.ConfigurationErrorCode.IncorrectProvider);
    }
    return {
        request: function (request) {
            return new Promise(function (resolve, reject) {
                provider.send({
                    jsonrpc: '2.0',
                    method: request.method,
                    params: wrapArray(request.params),
                    id: 1,
                }, function (error, result) {
                    if (error) {
                        reject(error);
                    }
                    if (result.error) {
                        reject(new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                            providerMessage: result.error,
                        }));
                    }
                    resolve(result.result);
                });
            });
        },
    };
}
/**
 * Creates a Provider instance from a provider that implements Ethers Provider#call interface.
 * This wrapper support only `eth_call` method for now, which is enough for all the current Resolution functionality
 * @param provider - provider object
 * @see https://github.com/ethers-io/ethers.js/blob/v4-legacy/providers/abstract-provider.d.ts#L91
 * @see https://github.com/ethers-io/ethers.js/blob/v5.0.4/packages/abstract-provider/src.ts/index.ts#L224
 * @see https://docs.ethers.io/ethers.js/v5-beta/api-providers.html#jsonrpcprovider-inherits-from-provider
 * @see https://github.com/ethers-io/ethers.js/blob/master/packages/providers/src.ts/json-rpc-provider.ts
 */
function fromEthersProvider(provider) {
    var _this = this;
    if (provider.call === undefined) {
        throw new configurationError_1.ConfigurationError(configurationError_1.ConfigurationErrorCode.IncorrectProvider);
    }
    return {
        request: function (request) { return __awaiter(_this, void 0, void 0, function () {
            var _a, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 7, , 8]);
                        _a = request.method;
                        switch (_a) {
                            case 'eth_call': return [3 /*break*/, 1];
                            case 'eth_getLogs': return [3 /*break*/, 3];
                        }
                        return [3 /*break*/, 5];
                    case 1: return [4 /*yield*/, provider.call(request.params[0])];
                    case 2: return [2 /*return*/, _b.sent()];
                    case 3: return [4 /*yield*/, provider.getLogs(request.params[0])];
                    case 4: return [2 /*return*/, _b.sent()];
                    case 5: throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                        providerMessage: "Unsupported provider method " + request.method,
                    });
                    case 6: return [3 /*break*/, 8];
                    case 7:
                        error_1 = _b.sent();
                        throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                            providerMessage: error_1.message,
                        });
                    case 8: return [2 /*return*/];
                }
            });
        }); },
    };
}
/**
 * Creates a Provider instance from @zilliqa-js/core Provider
 * @param provider - provider object
 */
function fromZilliqaProvider(provider) {
    var _this = this;
    if (provider.middleware === undefined || provider.send === undefined) {
        throw new configurationError_1.ConfigurationError(configurationError_1.ConfigurationErrorCode.IncorrectProvider);
    }
    return {
        request: function (request) { return __awaiter(_this, void 0, void 0, function () {
            var resp, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, provider.send.apply(provider, __spreadArrays([request.method], (request.params || [])))];
                    case 1:
                        resp = _a.sent();
                        if (resp.error) {
                            throw new Error(resp.error.message);
                        }
                        return [2 /*return*/, resp.result];
                    case 2:
                        error_2 = _a.sent();
                        throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.ServiceProviderError, {
                            providerMessage: error_2.message,
                        });
                    case 3: return [2 /*return*/];
                }
            });
        }); },
    };
}
function wrapArray(params) {
    if (params === void 0) { params = []; }
    return params instanceof Array ? params : [params];
}

},{"../errors/configurationError":65,"../errors/resolutionError":67}],73:[function(require,module,exports){
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cross_fetch_1 = __importDefault(require("cross-fetch"));
var Networking = /** @class */ (function () {
    function Networking() {
    }
    Networking.fetch = function (url, options) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, cross_fetch_1.default(url, options)];
            });
        });
    };
    return Networking;
}());
exports.default = Networking;

},{"cross-fetch":82}],74:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
var js_sha3_1 = require("js-sha3");
var recoverSignature_1 = require("./recoverSignature");
var namehash_1 = require("./namehash");
var TwitterVerificationAddress = '0x12cfb13522F13a78b650a8bCbFCf50b7CB899d82';
exports.isValidTwitterSignature = function (_a) {
    var tokenId = _a.tokenId, owner = _a.owner, twitterHandle = _a.twitterHandle, validationSignature = _a.validationSignature;
    var tokenIdInDecimals = namehash_1.fromHexStringToDecimals(tokenId);
    var message = [
        tokenIdInDecimals,
        owner,
        'social.twitter.username',
        twitterHandle,
    ]
        .map(function (value) {
        return '0x' + js_sha3_1.keccak256(value.startsWith('0x') ? index_1.hexToBytes(value) : value);
    })
        .reduce(function (message, hashedValue) { return message + hashedValue; }, '');
    var signerAddress = recoverSignature_1.recover(message, validationSignature);
    return signerAddress === TwitterVerificationAddress;
};

},{"./index":75,"./namehash":76,"./recoverSignature":78,"js-sha3":114}],75:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var publicTypes_1 = require("../types/publicTypes");
var types_1 = require("../types");
function signedInfuraLink(infura, network) {
    if (network === void 0) { network = 'mainnet'; }
    return "https://" + network + ".infura.io/v3/" + infura;
}
exports.signedInfuraLink = signedInfuraLink;
function hexToBytes(hexString) {
    var hex = hexString.replace(/^0x/i, '');
    var bytes = [];
    for (var c = 0; c < hex.length; c += 2) {
        bytes.push(parseInt(hex.substr(c, 2), 16));
    }
    return bytes;
}
exports.hexToBytes = hexToBytes;
function isNullAddress(key) {
    if (!key) {
        return true;
    }
    return Object.values(types_1.NullAddresses).includes(key);
}
exports.isNullAddress = isNullAddress;
function constructRecords(keys, values) {
    var records = {};
    keys.forEach(function (key, index) {
        records[key] =
            (values instanceof Array ? values[index] : values === null || values === void 0 ? void 0 : values[key]) || '';
    });
    return records;
}
exports.constructRecords = constructRecords;
exports.domainExtensionToNamingServiceName = {
    crypto: publicTypes_1.NamingServiceName.UNS,
    zil: publicTypes_1.NamingServiceName.ZNS,
};
exports.findNamingServiceName = function (domain) {
    var extension = domain.split('.').pop();
    if (!extension) {
        return '';
    }
    else if (extension in exports.domainExtensionToNamingServiceName) {
        return exports.domainExtensionToNamingServiceName[extension];
    }
    else {
        return exports.domainExtensionToNamingServiceName.crypto;
    }
};
exports.EthereumNetworks = {
    mainnet: 1,
    ropsten: 3,
    rinkeby: 4,
    goerli: 5,
    'polygon-mainnet': 137,
    'polygon-mumbai': 80001,
};
exports.EthereumNetworksInverted = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    137: 'polygon-mainnet',
    80001: 'polygon-mumbai',
};

},{"../types":69,"../types/publicTypes":70}],76:[function(require,module,exports){
"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var js_sha3_1 = require("js-sha3");
var js_sha256_1 = require("js-sha256");
var buffer_1 = require("buffer");
var bn_js_1 = __importDefault(require("bn.js"));
function eip137Namehash(domain) {
    var arr = hashArray(domain, js_sha3_1.keccak_256);
    return arrayToHex(arr);
}
exports.eip137Namehash = eip137Namehash;
function eip137Childhash(parentHash, label) {
    return childhash(parentHash, label, js_sha3_1.keccak_256);
}
exports.eip137Childhash = eip137Childhash;
function znsNamehash(domain) {
    var arr = hashArray(domain, js_sha256_1.sha256);
    return arrayToHex(arr);
}
exports.znsNamehash = znsNamehash;
function znsChildhash(parentHash, label) {
    return childhash(parentHash, label, js_sha256_1.sha256);
}
exports.znsChildhash = znsChildhash;
function childhash(parentHash, label, hashingAlgo) {
    var parent = parentHash.replace(/^0x/, '');
    var childHash = hashingAlgo.hex(label);
    return "0x" + hashingAlgo.hex(buffer_1.Buffer.from("" + parent + childHash, 'hex'));
}
function hashArray(domain, hashingAlgo) {
    if (!domain) {
        return Array.from(new Uint8Array(32));
    }
    var _a = domain.split('.'), label = _a[0], remainder = _a.slice(1);
    var labelHash = hashingAlgo.array(label);
    var remainderHash = hashArray(remainder.join('.'), hashingAlgo);
    return hashingAlgo.array(new Uint8Array(__spreadArrays(remainderHash, labelHash)));
}
function arrayToHex(arr) {
    return "0x" + Array.prototype.map
        .call(arr, function (x) { return ('00' + x.toString(16)).slice(-2); })
        .join('');
}
function fromHexStringToDecimals(value) {
    if (value.startsWith('0x')) {
        var valueWithoutPrefix = value.slice(2, value.length);
        var bn = new bn_js_1.default(valueWithoutPrefix, 16);
        return bn.toString(10);
    }
    return value;
}
exports.fromHexStringToDecimals = fromHexStringToDecimals;

},{"bn.js":80,"buffer":3,"js-sha256":113,"js-sha3":114}],77:[function(require,module,exports){
"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var resolutionError_1 = __importStar(require("../errors/resolutionError"));
/**
 * Checks domain name for special symbols and returns address in lowercase without spaces
 * @throws Will throw an error if domain address contains special symbols
 * @param domain - a domain address
 */
var reg = RegExp('^[.a-z0-9-]+$');
function prepareAndValidateDomain(domain) {
    var retVal = domain ? domain.trim().toLowerCase() : '';
    if (!reg.test(retVal)) {
        throw new resolutionError_1.default(resolutionError_1.ResolutionErrorCode.InvalidDomainAddress, {
            domain: domain,
        });
    }
    return retVal;
}
exports.prepareAndValidateDomain = prepareAndValidateDomain;

},{"../errors/resolutionError":67}],78:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-undef */
var js_sha3_1 = require("js-sha3");
var index_1 = require("./index");
var elliptic_1 = require("elliptic");
var secp256k1 = new elliptic_1.ec('secp256k1');
var bytesLength = function (a) { return (a.length - 2) / 2; };
var bytesSlice = function (i, j, bs) {
    return '0x' + bs.slice(i * 2 + 2, j * 2 + 2);
};
var bytesToNumber = function (hex) { return parseInt(hex.slice(2), 16); };
var decodeSignature = function (hex) { return [
    bytesSlice(64, bytesLength(hex), hex),
    bytesSlice(0, 32, hex),
    bytesSlice(32, 64, hex),
]; };
var toChecksum = function (address) {
    var addressHash = js_sha3_1.keccak256(address.slice(2));
    var checksumAddress = '0x';
    for (var i = 0; i < 40; i++) {
        checksumAddress +=
            parseInt(addressHash[i + 2], 16) > 7
                ? address[i + 2].toUpperCase()
                : address[i + 2];
    }
    return checksumAddress;
};
exports.hashMessage = function (message) {
    var messageBytes = index_1.hexToBytes(Buffer.from(message, 'utf8').toString('hex'));
    var messageBuffer = Buffer.from(messageBytes);
    var preamble = '\x19Ethereum Signed Message:\n' + messageBytes.length;
    var preambleBuffer = Buffer.from(preamble);
    var ethMessage = Buffer.concat([preambleBuffer, messageBuffer]);
    return '0x' + js_sha3_1.keccak256(ethMessage.toString());
};
exports.recover = function (message, signature) {
    var hash = exports.hashMessage(message);
    var vals = decodeSignature(signature);
    var vrs = {
        v: bytesToNumber(vals[0]),
        r: vals[1].slice(2),
        s: vals[2].slice(2),
    };
    var ecPublicKey = secp256k1.recoverPubKey(Buffer.from(hash.slice(2), 'hex'), vrs, vrs.v < 2 ? vrs.v : 1 - (vrs.v % 2));
    var publicKey = '0x' + ecPublicKey.encode('hex', false).slice(2);
    var publicHash = '0x' + js_sha3_1.keccak256(index_1.hexToBytes(publicKey));
    return toChecksum('0x' + publicHash.slice(-40));
};

}).call(this)}).call(this,require("buffer").Buffer)
},{"./index":75,"buffer":3,"elliptic":83,"js-sha3":114}],79:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/* eslint-disable no-undef */
/**
 * All functionality below came from here https://github.com/Zilliqa/Zilliqa-JavaScript-Library/tree/dev/packages/zilliqa-js-crypto/src
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var bn_js_1 = __importDefault(require("bn.js"));
var js_sha256_1 = require("js-sha256");
var index_1 = require("./index");
var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
var GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
// HRP is the human-readable part of zilliqa bech32 addresses
var HRP = 'zil';
var tHRP = 'tzil';
function isByteString(str, len) {
    return !!str.replace('0x', '').match("^[0-9a-fA-F]{" + len + "}$");
}
function isAddress(address) {
    return isByteString(address, 40);
}
/**
 * convertBits
 *
 * groups buffers of a certain width to buffers of the desired width.
 *
 * For example, converts byte buffers to buffers of maximum 5 bit numbers,
 * padding those numbers as necessary. Necessary for encoding Ethereum-style
 * addresses as bech32 ones.
 * @param {Buffer} data
 * @param {number} fromWidth
 * @param {number} toWidth
 * @param {boolean} pad
 * @returns {Buffer|null}
 */
function convertBits(data, fromWidth, toWidth, pad) {
    if (pad === void 0) { pad = true; }
    var acc = 0;
    var bits = 0;
    var ret = [];
    var maxv = (1 << toWidth) - 1;
    // tslint:disable-next-line
    for (var p = 0; p < data.length; ++p) {
        var value = data[p];
        if (value < 0 || value >> fromWidth !== 0) {
            return null;
        }
        acc = (acc << fromWidth) | value;
        bits += fromWidth;
        while (bits >= toWidth) {
            bits -= toWidth;
            ret.push((acc >> bits) & maxv);
        }
    }
    if (pad) {
        if (bits > 0) {
            ret.push((acc << (toWidth - bits)) & maxv);
        }
    }
    else if (bits >= fromWidth || (acc << (toWidth - bits)) & maxv) {
        return null;
    }
    return Buffer.from(ret);
}
function hrpExpand(hrp) {
    var ret = [];
    var p;
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) >> 5);
    }
    ret.push(0);
    for (p = 0; p < hrp.length; ++p) {
        ret.push(hrp.charCodeAt(p) & 31);
    }
    return Buffer.from(ret);
}
function polymod(values) {
    var chk = 1;
    // tslint:disable-next-line
    for (var p = 0; p < values.length; ++p) {
        var top_1 = chk >> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ values[p];
        for (var i = 0; i < 5; ++i) {
            if ((top_1 >> i) & 1) {
                chk ^= GENERATOR[i];
            }
        }
    }
    return chk;
}
function createChecksum(hrp, data) {
    var values = Buffer.concat([
        Buffer.from(hrpExpand(hrp)),
        data,
        Buffer.from([0, 0, 0, 0, 0, 0]),
    ]);
    // var values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    var mod = polymod(values) ^ 1;
    var ret = [];
    for (var p = 0; p < 6; ++p) {
        ret.push((mod >> (5 * (5 - p))) & 31);
    }
    return Buffer.from(ret);
}
function verifyChecksum(hrp, data) {
    return polymod(Buffer.concat([hrpExpand(hrp), data])) === 1;
}
function encode(hrp, data) {
    var combined = Buffer.concat([data, createChecksum(hrp, data)]);
    var ret = hrp + '1';
    // tslint:disable-next-line
    for (var p = 0; p < combined.length; ++p) {
        ret += CHARSET.charAt(combined[p]);
    }
    return ret;
}
function decode(bechString) {
    var p;
    var hasLower = false;
    var hasUpper = false;
    for (p = 0; p < bechString.length; ++p) {
        if (bechString.charCodeAt(p) < 33 || bechString.charCodeAt(p) > 126) {
            return null;
        }
        if (bechString.charCodeAt(p) >= 97 && bechString.charCodeAt(p) <= 122) {
            hasLower = true;
        }
        if (bechString.charCodeAt(p) >= 65 && bechString.charCodeAt(p) <= 90) {
            hasUpper = true;
        }
    }
    if (hasLower && hasUpper) {
        return null;
    }
    bechString = bechString.toLowerCase();
    var pos = bechString.lastIndexOf('1');
    if (pos < 1 || pos + 7 > bechString.length || bechString.length > 90) {
        return null;
    }
    var hrp = bechString.substring(0, pos);
    var data = [];
    for (p = pos + 1; p < bechString.length; ++p) {
        var d = CHARSET.indexOf(bechString.charAt(p));
        if (d === -1) {
            return null;
        }
        data.push(d);
    }
    if (!verifyChecksum(hrp, Buffer.from(data))) {
        return null;
    }
    return { hrp: hrp, data: Buffer.from(data.slice(0, data.length - 6)) };
}
/**
 * toChecksumAddress
 *
 * takes hex-encoded string and returns the corresponding address
 * @param {string} address
 * @returns {string}
 */
exports.toChecksumAddress = function (address) {
    if (!isAddress(address)) {
        throw new Error(address + " is not a valid base 16 address");
    }
    address = address.toLowerCase().replace('0x', '');
    var hash = js_sha256_1.sha256(index_1.hexToBytes(address));
    var v = new bn_js_1.default(hash, 'hex', 'be');
    var ret = '0x';
    for (var i = 0; i < address.length; i++) {
        if ('0123456789'.indexOf(address[i]) !== -1) {
            ret += address[i];
        }
        else {
            ret += v.and(new bn_js_1.default(2).pow(new bn_js_1.default(255 - 6 * i))).gte(new bn_js_1.default(1))
                ? address[i].toUpperCase()
                : address[i].toLowerCase();
        }
    }
    return ret;
};
/**
 * toBech32Address
 *
 * Encodes a canonical 20-byte Ethereum-style address as a bech32 zilliqa
 * address.
 *
 * The expected format is zil1<address><checksum> where address and checksum
 * are the result of bech32 encoding a Buffer containing the address bytes.
 * @param {string} address 20 byte canonical address
 * @param {boolean} testnet
 * @returns {string} 38 char bech32 encoded zilliqa address
 */
function toBech32Address(address, testnet) {
    if (testnet === void 0) { testnet = false; }
    if (!isAddress(address)) {
        throw new Error('Invalid address format.');
    }
    var addrBz = convertBits(Buffer.from(address.replace('0x', ''), 'hex'), 8, 5);
    if (addrBz === null) {
        throw new Error('Could not convert byte Buffer to 5-bit Buffer');
    }
    return encode(testnet ? tHRP : HRP, addrBz);
}
exports.toBech32Address = toBech32Address;
/**
 * fromBech32Address
 * @param {string} address - a valid Zilliqa bech32 address
 * @param {boolean} testnet
 * @returns {string} a canonical 20-byte Ethereum-style address
 */
function fromBech32Address(address, testnet) {
    if (testnet === void 0) { testnet = false; }
    var res = decode(address);
    if (res === null) {
        throw new Error('Invalid bech32 address');
    }
    var hrp = res.hrp, data = res.data;
    var shouldBe = testnet ? tHRP : HRP;
    if (hrp !== shouldBe) {
        throw new Error("Expected hrp to be " + shouldBe + " but got " + hrp);
    }
    var buf = convertBits(data, 5, 8, false);
    if (buf === null) {
        throw new Error('Could not convert buffer to bytes');
    }
    return exports.toChecksumAddress(buf.toString('hex'));
}
exports.fromBech32Address = fromBech32Address;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./index":75,"bn.js":80,"buffer":3,"js-sha256":113}],80:[function(require,module,exports){
(function (module, exports) {
  'use strict';

  // Utils
  function assert (val, msg) {
    if (!val) throw new Error(msg || 'Assertion failed');
  }

  // Could use `inherits` module, but don't want to move from single file
  // architecture yet.
  function inherits (ctor, superCtor) {
    ctor.super_ = superCtor;
    var TempCtor = function () {};
    TempCtor.prototype = superCtor.prototype;
    ctor.prototype = new TempCtor();
    ctor.prototype.constructor = ctor;
  }

  // BN

  function BN (number, base, endian) {
    if (BN.isBN(number)) {
      return number;
    }

    this.negative = 0;
    this.words = null;
    this.length = 0;

    // Reduction context
    this.red = null;

    if (number !== null) {
      if (base === 'le' || base === 'be') {
        endian = base;
        base = 10;
      }

      this._init(number || 0, base || 10, endian || 'be');
    }
  }
  if (typeof module === 'object') {
    module.exports = BN;
  } else {
    exports.BN = BN;
  }

  BN.BN = BN;
  BN.wordSize = 26;

  var Buffer;
  try {
    if (typeof window !== 'undefined' && typeof window.Buffer !== 'undefined') {
      Buffer = window.Buffer;
    } else {
      Buffer = require('buffer').Buffer;
    }
  } catch (e) {
  }

  BN.isBN = function isBN (num) {
    if (num instanceof BN) {
      return true;
    }

    return num !== null && typeof num === 'object' &&
      num.constructor.wordSize === BN.wordSize && Array.isArray(num.words);
  };

  BN.max = function max (left, right) {
    if (left.cmp(right) > 0) return left;
    return right;
  };

  BN.min = function min (left, right) {
    if (left.cmp(right) < 0) return left;
    return right;
  };

  BN.prototype._init = function init (number, base, endian) {
    if (typeof number === 'number') {
      return this._initNumber(number, base, endian);
    }

    if (typeof number === 'object') {
      return this._initArray(number, base, endian);
    }

    if (base === 'hex') {
      base = 16;
    }
    assert(base === (base | 0) && base >= 2 && base <= 36);

    number = number.toString().replace(/\s+/g, '');
    var start = 0;
    if (number[0] === '-') {
      start++;
      this.negative = 1;
    }

    if (start < number.length) {
      if (base === 16) {
        this._parseHex(number, start, endian);
      } else {
        this._parseBase(number, base, start);
        if (endian === 'le') {
          this._initArray(this.toArray(), base, endian);
        }
      }
    }
  };

  BN.prototype._initNumber = function _initNumber (number, base, endian) {
    if (number < 0) {
      this.negative = 1;
      number = -number;
    }
    if (number < 0x4000000) {
      this.words = [ number & 0x3ffffff ];
      this.length = 1;
    } else if (number < 0x10000000000000) {
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff
      ];
      this.length = 2;
    } else {
      assert(number < 0x20000000000000); // 2 ^ 53 (unsafe)
      this.words = [
        number & 0x3ffffff,
        (number / 0x4000000) & 0x3ffffff,
        1
      ];
      this.length = 3;
    }

    if (endian !== 'le') return;

    // Reverse the bytes
    this._initArray(this.toArray(), base, endian);
  };

  BN.prototype._initArray = function _initArray (number, base, endian) {
    // Perhaps a Uint8Array
    assert(typeof number.length === 'number');
    if (number.length <= 0) {
      this.words = [ 0 ];
      this.length = 1;
      return this;
    }

    this.length = Math.ceil(number.length / 3);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    var j, w;
    var off = 0;
    if (endian === 'be') {
      for (i = number.length - 1, j = 0; i >= 0; i -= 3) {
        w = number[i] | (number[i - 1] << 8) | (number[i - 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    } else if (endian === 'le') {
      for (i = 0, j = 0; i < number.length; i += 3) {
        w = number[i] | (number[i + 1] << 8) | (number[i + 2] << 16);
        this.words[j] |= (w << off) & 0x3ffffff;
        this.words[j + 1] = (w >>> (26 - off)) & 0x3ffffff;
        off += 24;
        if (off >= 26) {
          off -= 26;
          j++;
        }
      }
    }
    return this.strip();
  };

  function parseHex4Bits (string, index) {
    var c = string.charCodeAt(index);
    // 'A' - 'F'
    if (c >= 65 && c <= 70) {
      return c - 55;
    // 'a' - 'f'
    } else if (c >= 97 && c <= 102) {
      return c - 87;
    // '0' - '9'
    } else {
      return (c - 48) & 0xf;
    }
  }

  function parseHexByte (string, lowerBound, index) {
    var r = parseHex4Bits(string, index);
    if (index - 1 >= lowerBound) {
      r |= parseHex4Bits(string, index - 1) << 4;
    }
    return r;
  }

  BN.prototype._parseHex = function _parseHex (number, start, endian) {
    // Create possibly bigger array to ensure that it fits the number
    this.length = Math.ceil((number.length - start) / 6);
    this.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      this.words[i] = 0;
    }

    // 24-bits chunks
    var off = 0;
    var j = 0;

    var w;
    if (endian === 'be') {
      for (i = number.length - 1; i >= start; i -= 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    } else {
      var parseLength = number.length - start;
      for (i = parseLength % 2 === 0 ? start + 1 : start; i < number.length; i += 2) {
        w = parseHexByte(number, start, i) << off;
        this.words[j] |= w & 0x3ffffff;
        if (off >= 18) {
          off -= 18;
          j += 1;
          this.words[j] |= w >>> 26;
        } else {
          off += 8;
        }
      }
    }

    this.strip();
  };

  function parseBase (str, start, end, mul) {
    var r = 0;
    var len = Math.min(str.length, end);
    for (var i = start; i < len; i++) {
      var c = str.charCodeAt(i) - 48;

      r *= mul;

      // 'a'
      if (c >= 49) {
        r += c - 49 + 0xa;

      // 'A'
      } else if (c >= 17) {
        r += c - 17 + 0xa;

      // '0' - '9'
      } else {
        r += c;
      }
    }
    return r;
  }

  BN.prototype._parseBase = function _parseBase (number, base, start) {
    // Initialize as zero
    this.words = [ 0 ];
    this.length = 1;

    // Find length of limb in base
    for (var limbLen = 0, limbPow = 1; limbPow <= 0x3ffffff; limbPow *= base) {
      limbLen++;
    }
    limbLen--;
    limbPow = (limbPow / base) | 0;

    var total = number.length - start;
    var mod = total % limbLen;
    var end = Math.min(total, total - mod) + start;

    var word = 0;
    for (var i = start; i < end; i += limbLen) {
      word = parseBase(number, i, i + limbLen, base);

      this.imuln(limbPow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    if (mod !== 0) {
      var pow = 1;
      word = parseBase(number, i, number.length, base);

      for (i = 0; i < mod; i++) {
        pow *= base;
      }

      this.imuln(pow);
      if (this.words[0] + word < 0x4000000) {
        this.words[0] += word;
      } else {
        this._iaddn(word);
      }
    }

    this.strip();
  };

  BN.prototype.copy = function copy (dest) {
    dest.words = new Array(this.length);
    for (var i = 0; i < this.length; i++) {
      dest.words[i] = this.words[i];
    }
    dest.length = this.length;
    dest.negative = this.negative;
    dest.red = this.red;
  };

  BN.prototype.clone = function clone () {
    var r = new BN(null);
    this.copy(r);
    return r;
  };

  BN.prototype._expand = function _expand (size) {
    while (this.length < size) {
      this.words[this.length++] = 0;
    }
    return this;
  };

  // Remove leading `0` from `this`
  BN.prototype.strip = function strip () {
    while (this.length > 1 && this.words[this.length - 1] === 0) {
      this.length--;
    }
    return this._normSign();
  };

  BN.prototype._normSign = function _normSign () {
    // -0 = 0
    if (this.length === 1 && this.words[0] === 0) {
      this.negative = 0;
    }
    return this;
  };

  BN.prototype.inspect = function inspect () {
    return (this.red ? '<BN-R: ' : '<BN: ') + this.toString(16) + '>';
  };

  /*

  var zeros = [];
  var groupSizes = [];
  var groupBases = [];

  var s = '';
  var i = -1;
  while (++i < BN.wordSize) {
    zeros[i] = s;
    s += '0';
  }
  groupSizes[0] = 0;
  groupSizes[1] = 0;
  groupBases[0] = 0;
  groupBases[1] = 0;
  var base = 2 - 1;
  while (++base < 36 + 1) {
    var groupSize = 0;
    var groupBase = 1;
    while (groupBase < (1 << BN.wordSize) / base) {
      groupBase *= base;
      groupSize += 1;
    }
    groupSizes[base] = groupSize;
    groupBases[base] = groupBase;
  }

  */

  var zeros = [
    '',
    '0',
    '00',
    '000',
    '0000',
    '00000',
    '000000',
    '0000000',
    '00000000',
    '000000000',
    '0000000000',
    '00000000000',
    '000000000000',
    '0000000000000',
    '00000000000000',
    '000000000000000',
    '0000000000000000',
    '00000000000000000',
    '000000000000000000',
    '0000000000000000000',
    '00000000000000000000',
    '000000000000000000000',
    '0000000000000000000000',
    '00000000000000000000000',
    '000000000000000000000000',
    '0000000000000000000000000'
  ];

  var groupSizes = [
    0, 0,
    25, 16, 12, 11, 10, 9, 8,
    8, 7, 7, 7, 7, 6, 6,
    6, 6, 6, 6, 6, 5, 5,
    5, 5, 5, 5, 5, 5, 5,
    5, 5, 5, 5, 5, 5, 5
  ];

  var groupBases = [
    0, 0,
    33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216,
    43046721, 10000000, 19487171, 35831808, 62748517, 7529536, 11390625,
    16777216, 24137569, 34012224, 47045881, 64000000, 4084101, 5153632,
    6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149,
    24300000, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176
  ];

  BN.prototype.toString = function toString (base, padding) {
    base = base || 10;
    padding = padding | 0 || 1;

    var out;
    if (base === 16 || base === 'hex') {
      out = '';
      var off = 0;
      var carry = 0;
      for (var i = 0; i < this.length; i++) {
        var w = this.words[i];
        var word = (((w << off) | carry) & 0xffffff).toString(16);
        carry = (w >>> (24 - off)) & 0xffffff;
        if (carry !== 0 || i !== this.length - 1) {
          out = zeros[6 - word.length] + word + out;
        } else {
          out = word + out;
        }
        off += 2;
        if (off >= 26) {
          off -= 26;
          i--;
        }
      }
      if (carry !== 0) {
        out = carry.toString(16) + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    if (base === (base | 0) && base >= 2 && base <= 36) {
      // var groupSize = Math.floor(BN.wordSize * Math.LN2 / Math.log(base));
      var groupSize = groupSizes[base];
      // var groupBase = Math.pow(base, groupSize);
      var groupBase = groupBases[base];
      out = '';
      var c = this.clone();
      c.negative = 0;
      while (!c.isZero()) {
        var r = c.modn(groupBase).toString(base);
        c = c.idivn(groupBase);

        if (!c.isZero()) {
          out = zeros[groupSize - r.length] + r + out;
        } else {
          out = r + out;
        }
      }
      if (this.isZero()) {
        out = '0' + out;
      }
      while (out.length % padding !== 0) {
        out = '0' + out;
      }
      if (this.negative !== 0) {
        out = '-' + out;
      }
      return out;
    }

    assert(false, 'Base should be between 2 and 36');
  };

  BN.prototype.toNumber = function toNumber () {
    var ret = this.words[0];
    if (this.length === 2) {
      ret += this.words[1] * 0x4000000;
    } else if (this.length === 3 && this.words[2] === 0x01) {
      // NOTE: at this stage it is known that the top bit is set
      ret += 0x10000000000000 + (this.words[1] * 0x4000000);
    } else if (this.length > 2) {
      assert(false, 'Number can only safely store up to 53 bits');
    }
    return (this.negative !== 0) ? -ret : ret;
  };

  BN.prototype.toJSON = function toJSON () {
    return this.toString(16);
  };

  BN.prototype.toBuffer = function toBuffer (endian, length) {
    assert(typeof Buffer !== 'undefined');
    return this.toArrayLike(Buffer, endian, length);
  };

  BN.prototype.toArray = function toArray (endian, length) {
    return this.toArrayLike(Array, endian, length);
  };

  BN.prototype.toArrayLike = function toArrayLike (ArrayType, endian, length) {
    var byteLength = this.byteLength();
    var reqLength = length || Math.max(1, byteLength);
    assert(byteLength <= reqLength, 'byte array longer than desired length');
    assert(reqLength > 0, 'Requested array length <= 0');

    this.strip();
    var littleEndian = endian === 'le';
    var res = new ArrayType(reqLength);

    var b, i;
    var q = this.clone();
    if (!littleEndian) {
      // Assume big-endian
      for (i = 0; i < reqLength - byteLength; i++) {
        res[i] = 0;
      }

      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[reqLength - i - 1] = b;
      }
    } else {
      for (i = 0; !q.isZero(); i++) {
        b = q.andln(0xff);
        q.iushrn(8);

        res[i] = b;
      }

      for (; i < reqLength; i++) {
        res[i] = 0;
      }
    }

    return res;
  };

  if (Math.clz32) {
    BN.prototype._countBits = function _countBits (w) {
      return 32 - Math.clz32(w);
    };
  } else {
    BN.prototype._countBits = function _countBits (w) {
      var t = w;
      var r = 0;
      if (t >= 0x1000) {
        r += 13;
        t >>>= 13;
      }
      if (t >= 0x40) {
        r += 7;
        t >>>= 7;
      }
      if (t >= 0x8) {
        r += 4;
        t >>>= 4;
      }
      if (t >= 0x02) {
        r += 2;
        t >>>= 2;
      }
      return r + t;
    };
  }

  BN.prototype._zeroBits = function _zeroBits (w) {
    // Short-cut
    if (w === 0) return 26;

    var t = w;
    var r = 0;
    if ((t & 0x1fff) === 0) {
      r += 13;
      t >>>= 13;
    }
    if ((t & 0x7f) === 0) {
      r += 7;
      t >>>= 7;
    }
    if ((t & 0xf) === 0) {
      r += 4;
      t >>>= 4;
    }
    if ((t & 0x3) === 0) {
      r += 2;
      t >>>= 2;
    }
    if ((t & 0x1) === 0) {
      r++;
    }
    return r;
  };

  // Return number of used bits in a BN
  BN.prototype.bitLength = function bitLength () {
    var w = this.words[this.length - 1];
    var hi = this._countBits(w);
    return (this.length - 1) * 26 + hi;
  };

  function toBitArray (num) {
    var w = new Array(num.bitLength());

    for (var bit = 0; bit < w.length; bit++) {
      var off = (bit / 26) | 0;
      var wbit = bit % 26;

      w[bit] = (num.words[off] & (1 << wbit)) >>> wbit;
    }

    return w;
  }

  // Number of trailing zero bits
  BN.prototype.zeroBits = function zeroBits () {
    if (this.isZero()) return 0;

    var r = 0;
    for (var i = 0; i < this.length; i++) {
      var b = this._zeroBits(this.words[i]);
      r += b;
      if (b !== 26) break;
    }
    return r;
  };

  BN.prototype.byteLength = function byteLength () {
    return Math.ceil(this.bitLength() / 8);
  };

  BN.prototype.toTwos = function toTwos (width) {
    if (this.negative !== 0) {
      return this.abs().inotn(width).iaddn(1);
    }
    return this.clone();
  };

  BN.prototype.fromTwos = function fromTwos (width) {
    if (this.testn(width - 1)) {
      return this.notn(width).iaddn(1).ineg();
    }
    return this.clone();
  };

  BN.prototype.isNeg = function isNeg () {
    return this.negative !== 0;
  };

  // Return negative clone of `this`
  BN.prototype.neg = function neg () {
    return this.clone().ineg();
  };

  BN.prototype.ineg = function ineg () {
    if (!this.isZero()) {
      this.negative ^= 1;
    }

    return this;
  };

  // Or `num` with `this` in-place
  BN.prototype.iuor = function iuor (num) {
    while (this.length < num.length) {
      this.words[this.length++] = 0;
    }

    for (var i = 0; i < num.length; i++) {
      this.words[i] = this.words[i] | num.words[i];
    }

    return this.strip();
  };

  BN.prototype.ior = function ior (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuor(num);
  };

  // Or `num` with `this`
  BN.prototype.or = function or (num) {
    if (this.length > num.length) return this.clone().ior(num);
    return num.clone().ior(this);
  };

  BN.prototype.uor = function uor (num) {
    if (this.length > num.length) return this.clone().iuor(num);
    return num.clone().iuor(this);
  };

  // And `num` with `this` in-place
  BN.prototype.iuand = function iuand (num) {
    // b = min-length(num, this)
    var b;
    if (this.length > num.length) {
      b = num;
    } else {
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = this.words[i] & num.words[i];
    }

    this.length = b.length;

    return this.strip();
  };

  BN.prototype.iand = function iand (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuand(num);
  };

  // And `num` with `this`
  BN.prototype.and = function and (num) {
    if (this.length > num.length) return this.clone().iand(num);
    return num.clone().iand(this);
  };

  BN.prototype.uand = function uand (num) {
    if (this.length > num.length) return this.clone().iuand(num);
    return num.clone().iuand(this);
  };

  // Xor `num` with `this` in-place
  BN.prototype.iuxor = function iuxor (num) {
    // a.length > b.length
    var a;
    var b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    for (var i = 0; i < b.length; i++) {
      this.words[i] = a.words[i] ^ b.words[i];
    }

    if (this !== a) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = a.length;

    return this.strip();
  };

  BN.prototype.ixor = function ixor (num) {
    assert((this.negative | num.negative) === 0);
    return this.iuxor(num);
  };

  // Xor `num` with `this`
  BN.prototype.xor = function xor (num) {
    if (this.length > num.length) return this.clone().ixor(num);
    return num.clone().ixor(this);
  };

  BN.prototype.uxor = function uxor (num) {
    if (this.length > num.length) return this.clone().iuxor(num);
    return num.clone().iuxor(this);
  };

  // Not ``this`` with ``width`` bitwidth
  BN.prototype.inotn = function inotn (width) {
    assert(typeof width === 'number' && width >= 0);

    var bytesNeeded = Math.ceil(width / 26) | 0;
    var bitsLeft = width % 26;

    // Extend the buffer with leading zeroes
    this._expand(bytesNeeded);

    if (bitsLeft > 0) {
      bytesNeeded--;
    }

    // Handle complete words
    for (var i = 0; i < bytesNeeded; i++) {
      this.words[i] = ~this.words[i] & 0x3ffffff;
    }

    // Handle the residue
    if (bitsLeft > 0) {
      this.words[i] = ~this.words[i] & (0x3ffffff >> (26 - bitsLeft));
    }

    // And remove leading zeroes
    return this.strip();
  };

  BN.prototype.notn = function notn (width) {
    return this.clone().inotn(width);
  };

  // Set `bit` of `this`
  BN.prototype.setn = function setn (bit, val) {
    assert(typeof bit === 'number' && bit >= 0);

    var off = (bit / 26) | 0;
    var wbit = bit % 26;

    this._expand(off + 1);

    if (val) {
      this.words[off] = this.words[off] | (1 << wbit);
    } else {
      this.words[off] = this.words[off] & ~(1 << wbit);
    }

    return this.strip();
  };

  // Add `num` to `this` in-place
  BN.prototype.iadd = function iadd (num) {
    var r;

    // negative + positive
    if (this.negative !== 0 && num.negative === 0) {
      this.negative = 0;
      r = this.isub(num);
      this.negative ^= 1;
      return this._normSign();

    // positive + negative
    } else if (this.negative === 0 && num.negative !== 0) {
      num.negative = 0;
      r = this.isub(num);
      num.negative = 1;
      return r._normSign();
    }

    // a.length > b.length
    var a, b;
    if (this.length > num.length) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) + (b.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      this.words[i] = r & 0x3ffffff;
      carry = r >>> 26;
    }

    this.length = a.length;
    if (carry !== 0) {
      this.words[this.length] = carry;
      this.length++;
    // Copy the rest of the words
    } else if (a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    return this;
  };

  // Add `num` to `this`
  BN.prototype.add = function add (num) {
    var res;
    if (num.negative !== 0 && this.negative === 0) {
      num.negative = 0;
      res = this.sub(num);
      num.negative ^= 1;
      return res;
    } else if (num.negative === 0 && this.negative !== 0) {
      this.negative = 0;
      res = num.sub(this);
      this.negative = 1;
      return res;
    }

    if (this.length > num.length) return this.clone().iadd(num);

    return num.clone().iadd(this);
  };

  // Subtract `num` from `this` in-place
  BN.prototype.isub = function isub (num) {
    // this - (-num) = this + num
    if (num.negative !== 0) {
      num.negative = 0;
      var r = this.iadd(num);
      num.negative = 1;
      return r._normSign();

    // -this - num = -(this + num)
    } else if (this.negative !== 0) {
      this.negative = 0;
      this.iadd(num);
      this.negative = 1;
      return this._normSign();
    }

    // At this point both numbers are positive
    var cmp = this.cmp(num);

    // Optimization - zeroify
    if (cmp === 0) {
      this.negative = 0;
      this.length = 1;
      this.words[0] = 0;
      return this;
    }

    // a > b
    var a, b;
    if (cmp > 0) {
      a = this;
      b = num;
    } else {
      a = num;
      b = this;
    }

    var carry = 0;
    for (var i = 0; i < b.length; i++) {
      r = (a.words[i] | 0) - (b.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }
    for (; carry !== 0 && i < a.length; i++) {
      r = (a.words[i] | 0) + carry;
      carry = r >> 26;
      this.words[i] = r & 0x3ffffff;
    }

    // Copy rest of the words
    if (carry === 0 && i < a.length && a !== this) {
      for (; i < a.length; i++) {
        this.words[i] = a.words[i];
      }
    }

    this.length = Math.max(this.length, i);

    if (a !== this) {
      this.negative = 1;
    }

    return this.strip();
  };

  // Subtract `num` from `this`
  BN.prototype.sub = function sub (num) {
    return this.clone().isub(num);
  };

  function smallMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    var len = (self.length + num.length) | 0;
    out.length = len;
    len = (len - 1) | 0;

    // Peel one iteration (compiler can't do it, because of code complexity)
    var a = self.words[0] | 0;
    var b = num.words[0] | 0;
    var r = a * b;

    var lo = r & 0x3ffffff;
    var carry = (r / 0x4000000) | 0;
    out.words[0] = lo;

    for (var k = 1; k < len; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = carry >>> 26;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = (k - j) | 0;
        a = self.words[i] | 0;
        b = num.words[j] | 0;
        r = a * b + rword;
        ncarry += (r / 0x4000000) | 0;
        rword = r & 0x3ffffff;
      }
      out.words[k] = rword | 0;
      carry = ncarry | 0;
    }
    if (carry !== 0) {
      out.words[k] = carry | 0;
    } else {
      out.length--;
    }

    return out.strip();
  }

  // TODO(indutny): it may be reasonable to omit it for users who don't need
  // to work with 256-bit numbers, otherwise it gives 20% improvement for 256-bit
  // multiplication (like elliptic secp256k1).
  var comb10MulTo = function comb10MulTo (self, num, out) {
    var a = self.words;
    var b = num.words;
    var o = out.words;
    var c = 0;
    var lo;
    var mid;
    var hi;
    var a0 = a[0] | 0;
    var al0 = a0 & 0x1fff;
    var ah0 = a0 >>> 13;
    var a1 = a[1] | 0;
    var al1 = a1 & 0x1fff;
    var ah1 = a1 >>> 13;
    var a2 = a[2] | 0;
    var al2 = a2 & 0x1fff;
    var ah2 = a2 >>> 13;
    var a3 = a[3] | 0;
    var al3 = a3 & 0x1fff;
    var ah3 = a3 >>> 13;
    var a4 = a[4] | 0;
    var al4 = a4 & 0x1fff;
    var ah4 = a4 >>> 13;
    var a5 = a[5] | 0;
    var al5 = a5 & 0x1fff;
    var ah5 = a5 >>> 13;
    var a6 = a[6] | 0;
    var al6 = a6 & 0x1fff;
    var ah6 = a6 >>> 13;
    var a7 = a[7] | 0;
    var al7 = a7 & 0x1fff;
    var ah7 = a7 >>> 13;
    var a8 = a[8] | 0;
    var al8 = a8 & 0x1fff;
    var ah8 = a8 >>> 13;
    var a9 = a[9] | 0;
    var al9 = a9 & 0x1fff;
    var ah9 = a9 >>> 13;
    var b0 = b[0] | 0;
    var bl0 = b0 & 0x1fff;
    var bh0 = b0 >>> 13;
    var b1 = b[1] | 0;
    var bl1 = b1 & 0x1fff;
    var bh1 = b1 >>> 13;
    var b2 = b[2] | 0;
    var bl2 = b2 & 0x1fff;
    var bh2 = b2 >>> 13;
    var b3 = b[3] | 0;
    var bl3 = b3 & 0x1fff;
    var bh3 = b3 >>> 13;
    var b4 = b[4] | 0;
    var bl4 = b4 & 0x1fff;
    var bh4 = b4 >>> 13;
    var b5 = b[5] | 0;
    var bl5 = b5 & 0x1fff;
    var bh5 = b5 >>> 13;
    var b6 = b[6] | 0;
    var bl6 = b6 & 0x1fff;
    var bh6 = b6 >>> 13;
    var b7 = b[7] | 0;
    var bl7 = b7 & 0x1fff;
    var bh7 = b7 >>> 13;
    var b8 = b[8] | 0;
    var bl8 = b8 & 0x1fff;
    var bh8 = b8 >>> 13;
    var b9 = b[9] | 0;
    var bl9 = b9 & 0x1fff;
    var bh9 = b9 >>> 13;

    out.negative = self.negative ^ num.negative;
    out.length = 19;
    /* k = 0 */
    lo = Math.imul(al0, bl0);
    mid = Math.imul(al0, bh0);
    mid = (mid + Math.imul(ah0, bl0)) | 0;
    hi = Math.imul(ah0, bh0);
    var w0 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w0 >>> 26)) | 0;
    w0 &= 0x3ffffff;
    /* k = 1 */
    lo = Math.imul(al1, bl0);
    mid = Math.imul(al1, bh0);
    mid = (mid + Math.imul(ah1, bl0)) | 0;
    hi = Math.imul(ah1, bh0);
    lo = (lo + Math.imul(al0, bl1)) | 0;
    mid = (mid + Math.imul(al0, bh1)) | 0;
    mid = (mid + Math.imul(ah0, bl1)) | 0;
    hi = (hi + Math.imul(ah0, bh1)) | 0;
    var w1 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w1 >>> 26)) | 0;
    w1 &= 0x3ffffff;
    /* k = 2 */
    lo = Math.imul(al2, bl0);
    mid = Math.imul(al2, bh0);
    mid = (mid + Math.imul(ah2, bl0)) | 0;
    hi = Math.imul(ah2, bh0);
    lo = (lo + Math.imul(al1, bl1)) | 0;
    mid = (mid + Math.imul(al1, bh1)) | 0;
    mid = (mid + Math.imul(ah1, bl1)) | 0;
    hi = (hi + Math.imul(ah1, bh1)) | 0;
    lo = (lo + Math.imul(al0, bl2)) | 0;
    mid = (mid + Math.imul(al0, bh2)) | 0;
    mid = (mid + Math.imul(ah0, bl2)) | 0;
    hi = (hi + Math.imul(ah0, bh2)) | 0;
    var w2 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w2 >>> 26)) | 0;
    w2 &= 0x3ffffff;
    /* k = 3 */
    lo = Math.imul(al3, bl0);
    mid = Math.imul(al3, bh0);
    mid = (mid + Math.imul(ah3, bl0)) | 0;
    hi = Math.imul(ah3, bh0);
    lo = (lo + Math.imul(al2, bl1)) | 0;
    mid = (mid + Math.imul(al2, bh1)) | 0;
    mid = (mid + Math.imul(ah2, bl1)) | 0;
    hi = (hi + Math.imul(ah2, bh1)) | 0;
    lo = (lo + Math.imul(al1, bl2)) | 0;
    mid = (mid + Math.imul(al1, bh2)) | 0;
    mid = (mid + Math.imul(ah1, bl2)) | 0;
    hi = (hi + Math.imul(ah1, bh2)) | 0;
    lo = (lo + Math.imul(al0, bl3)) | 0;
    mid = (mid + Math.imul(al0, bh3)) | 0;
    mid = (mid + Math.imul(ah0, bl3)) | 0;
    hi = (hi + Math.imul(ah0, bh3)) | 0;
    var w3 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w3 >>> 26)) | 0;
    w3 &= 0x3ffffff;
    /* k = 4 */
    lo = Math.imul(al4, bl0);
    mid = Math.imul(al4, bh0);
    mid = (mid + Math.imul(ah4, bl0)) | 0;
    hi = Math.imul(ah4, bh0);
    lo = (lo + Math.imul(al3, bl1)) | 0;
    mid = (mid + Math.imul(al3, bh1)) | 0;
    mid = (mid + Math.imul(ah3, bl1)) | 0;
    hi = (hi + Math.imul(ah3, bh1)) | 0;
    lo = (lo + Math.imul(al2, bl2)) | 0;
    mid = (mid + Math.imul(al2, bh2)) | 0;
    mid = (mid + Math.imul(ah2, bl2)) | 0;
    hi = (hi + Math.imul(ah2, bh2)) | 0;
    lo = (lo + Math.imul(al1, bl3)) | 0;
    mid = (mid + Math.imul(al1, bh3)) | 0;
    mid = (mid + Math.imul(ah1, bl3)) | 0;
    hi = (hi + Math.imul(ah1, bh3)) | 0;
    lo = (lo + Math.imul(al0, bl4)) | 0;
    mid = (mid + Math.imul(al0, bh4)) | 0;
    mid = (mid + Math.imul(ah0, bl4)) | 0;
    hi = (hi + Math.imul(ah0, bh4)) | 0;
    var w4 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w4 >>> 26)) | 0;
    w4 &= 0x3ffffff;
    /* k = 5 */
    lo = Math.imul(al5, bl0);
    mid = Math.imul(al5, bh0);
    mid = (mid + Math.imul(ah5, bl0)) | 0;
    hi = Math.imul(ah5, bh0);
    lo = (lo + Math.imul(al4, bl1)) | 0;
    mid = (mid + Math.imul(al4, bh1)) | 0;
    mid = (mid + Math.imul(ah4, bl1)) | 0;
    hi = (hi + Math.imul(ah4, bh1)) | 0;
    lo = (lo + Math.imul(al3, bl2)) | 0;
    mid = (mid + Math.imul(al3, bh2)) | 0;
    mid = (mid + Math.imul(ah3, bl2)) | 0;
    hi = (hi + Math.imul(ah3, bh2)) | 0;
    lo = (lo + Math.imul(al2, bl3)) | 0;
    mid = (mid + Math.imul(al2, bh3)) | 0;
    mid = (mid + Math.imul(ah2, bl3)) | 0;
    hi = (hi + Math.imul(ah2, bh3)) | 0;
    lo = (lo + Math.imul(al1, bl4)) | 0;
    mid = (mid + Math.imul(al1, bh4)) | 0;
    mid = (mid + Math.imul(ah1, bl4)) | 0;
    hi = (hi + Math.imul(ah1, bh4)) | 0;
    lo = (lo + Math.imul(al0, bl5)) | 0;
    mid = (mid + Math.imul(al0, bh5)) | 0;
    mid = (mid + Math.imul(ah0, bl5)) | 0;
    hi = (hi + Math.imul(ah0, bh5)) | 0;
    var w5 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w5 >>> 26)) | 0;
    w5 &= 0x3ffffff;
    /* k = 6 */
    lo = Math.imul(al6, bl0);
    mid = Math.imul(al6, bh0);
    mid = (mid + Math.imul(ah6, bl0)) | 0;
    hi = Math.imul(ah6, bh0);
    lo = (lo + Math.imul(al5, bl1)) | 0;
    mid = (mid + Math.imul(al5, bh1)) | 0;
    mid = (mid + Math.imul(ah5, bl1)) | 0;
    hi = (hi + Math.imul(ah5, bh1)) | 0;
    lo = (lo + Math.imul(al4, bl2)) | 0;
    mid = (mid + Math.imul(al4, bh2)) | 0;
    mid = (mid + Math.imul(ah4, bl2)) | 0;
    hi = (hi + Math.imul(ah4, bh2)) | 0;
    lo = (lo + Math.imul(al3, bl3)) | 0;
    mid = (mid + Math.imul(al3, bh3)) | 0;
    mid = (mid + Math.imul(ah3, bl3)) | 0;
    hi = (hi + Math.imul(ah3, bh3)) | 0;
    lo = (lo + Math.imul(al2, bl4)) | 0;
    mid = (mid + Math.imul(al2, bh4)) | 0;
    mid = (mid + Math.imul(ah2, bl4)) | 0;
    hi = (hi + Math.imul(ah2, bh4)) | 0;
    lo = (lo + Math.imul(al1, bl5)) | 0;
    mid = (mid + Math.imul(al1, bh5)) | 0;
    mid = (mid + Math.imul(ah1, bl5)) | 0;
    hi = (hi + Math.imul(ah1, bh5)) | 0;
    lo = (lo + Math.imul(al0, bl6)) | 0;
    mid = (mid + Math.imul(al0, bh6)) | 0;
    mid = (mid + Math.imul(ah0, bl6)) | 0;
    hi = (hi + Math.imul(ah0, bh6)) | 0;
    var w6 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w6 >>> 26)) | 0;
    w6 &= 0x3ffffff;
    /* k = 7 */
    lo = Math.imul(al7, bl0);
    mid = Math.imul(al7, bh0);
    mid = (mid + Math.imul(ah7, bl0)) | 0;
    hi = Math.imul(ah7, bh0);
    lo = (lo + Math.imul(al6, bl1)) | 0;
    mid = (mid + Math.imul(al6, bh1)) | 0;
    mid = (mid + Math.imul(ah6, bl1)) | 0;
    hi = (hi + Math.imul(ah6, bh1)) | 0;
    lo = (lo + Math.imul(al5, bl2)) | 0;
    mid = (mid + Math.imul(al5, bh2)) | 0;
    mid = (mid + Math.imul(ah5, bl2)) | 0;
    hi = (hi + Math.imul(ah5, bh2)) | 0;
    lo = (lo + Math.imul(al4, bl3)) | 0;
    mid = (mid + Math.imul(al4, bh3)) | 0;
    mid = (mid + Math.imul(ah4, bl3)) | 0;
    hi = (hi + Math.imul(ah4, bh3)) | 0;
    lo = (lo + Math.imul(al3, bl4)) | 0;
    mid = (mid + Math.imul(al3, bh4)) | 0;
    mid = (mid + Math.imul(ah3, bl4)) | 0;
    hi = (hi + Math.imul(ah3, bh4)) | 0;
    lo = (lo + Math.imul(al2, bl5)) | 0;
    mid = (mid + Math.imul(al2, bh5)) | 0;
    mid = (mid + Math.imul(ah2, bl5)) | 0;
    hi = (hi + Math.imul(ah2, bh5)) | 0;
    lo = (lo + Math.imul(al1, bl6)) | 0;
    mid = (mid + Math.imul(al1, bh6)) | 0;
    mid = (mid + Math.imul(ah1, bl6)) | 0;
    hi = (hi + Math.imul(ah1, bh6)) | 0;
    lo = (lo + Math.imul(al0, bl7)) | 0;
    mid = (mid + Math.imul(al0, bh7)) | 0;
    mid = (mid + Math.imul(ah0, bl7)) | 0;
    hi = (hi + Math.imul(ah0, bh7)) | 0;
    var w7 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w7 >>> 26)) | 0;
    w7 &= 0x3ffffff;
    /* k = 8 */
    lo = Math.imul(al8, bl0);
    mid = Math.imul(al8, bh0);
    mid = (mid + Math.imul(ah8, bl0)) | 0;
    hi = Math.imul(ah8, bh0);
    lo = (lo + Math.imul(al7, bl1)) | 0;
    mid = (mid + Math.imul(al7, bh1)) | 0;
    mid = (mid + Math.imul(ah7, bl1)) | 0;
    hi = (hi + Math.imul(ah7, bh1)) | 0;
    lo = (lo + Math.imul(al6, bl2)) | 0;
    mid = (mid + Math.imul(al6, bh2)) | 0;
    mid = (mid + Math.imul(ah6, bl2)) | 0;
    hi = (hi + Math.imul(ah6, bh2)) | 0;
    lo = (lo + Math.imul(al5, bl3)) | 0;
    mid = (mid + Math.imul(al5, bh3)) | 0;
    mid = (mid + Math.imul(ah5, bl3)) | 0;
    hi = (hi + Math.imul(ah5, bh3)) | 0;
    lo = (lo + Math.imul(al4, bl4)) | 0;
    mid = (mid + Math.imul(al4, bh4)) | 0;
    mid = (mid + Math.imul(ah4, bl4)) | 0;
    hi = (hi + Math.imul(ah4, bh4)) | 0;
    lo = (lo + Math.imul(al3, bl5)) | 0;
    mid = (mid + Math.imul(al3, bh5)) | 0;
    mid = (mid + Math.imul(ah3, bl5)) | 0;
    hi = (hi + Math.imul(ah3, bh5)) | 0;
    lo = (lo + Math.imul(al2, bl6)) | 0;
    mid = (mid + Math.imul(al2, bh6)) | 0;
    mid = (mid + Math.imul(ah2, bl6)) | 0;
    hi = (hi + Math.imul(ah2, bh6)) | 0;
    lo = (lo + Math.imul(al1, bl7)) | 0;
    mid = (mid + Math.imul(al1, bh7)) | 0;
    mid = (mid + Math.imul(ah1, bl7)) | 0;
    hi = (hi + Math.imul(ah1, bh7)) | 0;
    lo = (lo + Math.imul(al0, bl8)) | 0;
    mid = (mid + Math.imul(al0, bh8)) | 0;
    mid = (mid + Math.imul(ah0, bl8)) | 0;
    hi = (hi + Math.imul(ah0, bh8)) | 0;
    var w8 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w8 >>> 26)) | 0;
    w8 &= 0x3ffffff;
    /* k = 9 */
    lo = Math.imul(al9, bl0);
    mid = Math.imul(al9, bh0);
    mid = (mid + Math.imul(ah9, bl0)) | 0;
    hi = Math.imul(ah9, bh0);
    lo = (lo + Math.imul(al8, bl1)) | 0;
    mid = (mid + Math.imul(al8, bh1)) | 0;
    mid = (mid + Math.imul(ah8, bl1)) | 0;
    hi = (hi + Math.imul(ah8, bh1)) | 0;
    lo = (lo + Math.imul(al7, bl2)) | 0;
    mid = (mid + Math.imul(al7, bh2)) | 0;
    mid = (mid + Math.imul(ah7, bl2)) | 0;
    hi = (hi + Math.imul(ah7, bh2)) | 0;
    lo = (lo + Math.imul(al6, bl3)) | 0;
    mid = (mid + Math.imul(al6, bh3)) | 0;
    mid = (mid + Math.imul(ah6, bl3)) | 0;
    hi = (hi + Math.imul(ah6, bh3)) | 0;
    lo = (lo + Math.imul(al5, bl4)) | 0;
    mid = (mid + Math.imul(al5, bh4)) | 0;
    mid = (mid + Math.imul(ah5, bl4)) | 0;
    hi = (hi + Math.imul(ah5, bh4)) | 0;
    lo = (lo + Math.imul(al4, bl5)) | 0;
    mid = (mid + Math.imul(al4, bh5)) | 0;
    mid = (mid + Math.imul(ah4, bl5)) | 0;
    hi = (hi + Math.imul(ah4, bh5)) | 0;
    lo = (lo + Math.imul(al3, bl6)) | 0;
    mid = (mid + Math.imul(al3, bh6)) | 0;
    mid = (mid + Math.imul(ah3, bl6)) | 0;
    hi = (hi + Math.imul(ah3, bh6)) | 0;
    lo = (lo + Math.imul(al2, bl7)) | 0;
    mid = (mid + Math.imul(al2, bh7)) | 0;
    mid = (mid + Math.imul(ah2, bl7)) | 0;
    hi = (hi + Math.imul(ah2, bh7)) | 0;
    lo = (lo + Math.imul(al1, bl8)) | 0;
    mid = (mid + Math.imul(al1, bh8)) | 0;
    mid = (mid + Math.imul(ah1, bl8)) | 0;
    hi = (hi + Math.imul(ah1, bh8)) | 0;
    lo = (lo + Math.imul(al0, bl9)) | 0;
    mid = (mid + Math.imul(al0, bh9)) | 0;
    mid = (mid + Math.imul(ah0, bl9)) | 0;
    hi = (hi + Math.imul(ah0, bh9)) | 0;
    var w9 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w9 >>> 26)) | 0;
    w9 &= 0x3ffffff;
    /* k = 10 */
    lo = Math.imul(al9, bl1);
    mid = Math.imul(al9, bh1);
    mid = (mid + Math.imul(ah9, bl1)) | 0;
    hi = Math.imul(ah9, bh1);
    lo = (lo + Math.imul(al8, bl2)) | 0;
    mid = (mid + Math.imul(al8, bh2)) | 0;
    mid = (mid + Math.imul(ah8, bl2)) | 0;
    hi = (hi + Math.imul(ah8, bh2)) | 0;
    lo = (lo + Math.imul(al7, bl3)) | 0;
    mid = (mid + Math.imul(al7, bh3)) | 0;
    mid = (mid + Math.imul(ah7, bl3)) | 0;
    hi = (hi + Math.imul(ah7, bh3)) | 0;
    lo = (lo + Math.imul(al6, bl4)) | 0;
    mid = (mid + Math.imul(al6, bh4)) | 0;
    mid = (mid + Math.imul(ah6, bl4)) | 0;
    hi = (hi + Math.imul(ah6, bh4)) | 0;
    lo = (lo + Math.imul(al5, bl5)) | 0;
    mid = (mid + Math.imul(al5, bh5)) | 0;
    mid = (mid + Math.imul(ah5, bl5)) | 0;
    hi = (hi + Math.imul(ah5, bh5)) | 0;
    lo = (lo + Math.imul(al4, bl6)) | 0;
    mid = (mid + Math.imul(al4, bh6)) | 0;
    mid = (mid + Math.imul(ah4, bl6)) | 0;
    hi = (hi + Math.imul(ah4, bh6)) | 0;
    lo = (lo + Math.imul(al3, bl7)) | 0;
    mid = (mid + Math.imul(al3, bh7)) | 0;
    mid = (mid + Math.imul(ah3, bl7)) | 0;
    hi = (hi + Math.imul(ah3, bh7)) | 0;
    lo = (lo + Math.imul(al2, bl8)) | 0;
    mid = (mid + Math.imul(al2, bh8)) | 0;
    mid = (mid + Math.imul(ah2, bl8)) | 0;
    hi = (hi + Math.imul(ah2, bh8)) | 0;
    lo = (lo + Math.imul(al1, bl9)) | 0;
    mid = (mid + Math.imul(al1, bh9)) | 0;
    mid = (mid + Math.imul(ah1, bl9)) | 0;
    hi = (hi + Math.imul(ah1, bh9)) | 0;
    var w10 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w10 >>> 26)) | 0;
    w10 &= 0x3ffffff;
    /* k = 11 */
    lo = Math.imul(al9, bl2);
    mid = Math.imul(al9, bh2);
    mid = (mid + Math.imul(ah9, bl2)) | 0;
    hi = Math.imul(ah9, bh2);
    lo = (lo + Math.imul(al8, bl3)) | 0;
    mid = (mid + Math.imul(al8, bh3)) | 0;
    mid = (mid + Math.imul(ah8, bl3)) | 0;
    hi = (hi + Math.imul(ah8, bh3)) | 0;
    lo = (lo + Math.imul(al7, bl4)) | 0;
    mid = (mid + Math.imul(al7, bh4)) | 0;
    mid = (mid + Math.imul(ah7, bl4)) | 0;
    hi = (hi + Math.imul(ah7, bh4)) | 0;
    lo = (lo + Math.imul(al6, bl5)) | 0;
    mid = (mid + Math.imul(al6, bh5)) | 0;
    mid = (mid + Math.imul(ah6, bl5)) | 0;
    hi = (hi + Math.imul(ah6, bh5)) | 0;
    lo = (lo + Math.imul(al5, bl6)) | 0;
    mid = (mid + Math.imul(al5, bh6)) | 0;
    mid = (mid + Math.imul(ah5, bl6)) | 0;
    hi = (hi + Math.imul(ah5, bh6)) | 0;
    lo = (lo + Math.imul(al4, bl7)) | 0;
    mid = (mid + Math.imul(al4, bh7)) | 0;
    mid = (mid + Math.imul(ah4, bl7)) | 0;
    hi = (hi + Math.imul(ah4, bh7)) | 0;
    lo = (lo + Math.imul(al3, bl8)) | 0;
    mid = (mid + Math.imul(al3, bh8)) | 0;
    mid = (mid + Math.imul(ah3, bl8)) | 0;
    hi = (hi + Math.imul(ah3, bh8)) | 0;
    lo = (lo + Math.imul(al2, bl9)) | 0;
    mid = (mid + Math.imul(al2, bh9)) | 0;
    mid = (mid + Math.imul(ah2, bl9)) | 0;
    hi = (hi + Math.imul(ah2, bh9)) | 0;
    var w11 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w11 >>> 26)) | 0;
    w11 &= 0x3ffffff;
    /* k = 12 */
    lo = Math.imul(al9, bl3);
    mid = Math.imul(al9, bh3);
    mid = (mid + Math.imul(ah9, bl3)) | 0;
    hi = Math.imul(ah9, bh3);
    lo = (lo + Math.imul(al8, bl4)) | 0;
    mid = (mid + Math.imul(al8, bh4)) | 0;
    mid = (mid + Math.imul(ah8, bl4)) | 0;
    hi = (hi + Math.imul(ah8, bh4)) | 0;
    lo = (lo + Math.imul(al7, bl5)) | 0;
    mid = (mid + Math.imul(al7, bh5)) | 0;
    mid = (mid + Math.imul(ah7, bl5)) | 0;
    hi = (hi + Math.imul(ah7, bh5)) | 0;
    lo = (lo + Math.imul(al6, bl6)) | 0;
    mid = (mid + Math.imul(al6, bh6)) | 0;
    mid = (mid + Math.imul(ah6, bl6)) | 0;
    hi = (hi + Math.imul(ah6, bh6)) | 0;
    lo = (lo + Math.imul(al5, bl7)) | 0;
    mid = (mid + Math.imul(al5, bh7)) | 0;
    mid = (mid + Math.imul(ah5, bl7)) | 0;
    hi = (hi + Math.imul(ah5, bh7)) | 0;
    lo = (lo + Math.imul(al4, bl8)) | 0;
    mid = (mid + Math.imul(al4, bh8)) | 0;
    mid = (mid + Math.imul(ah4, bl8)) | 0;
    hi = (hi + Math.imul(ah4, bh8)) | 0;
    lo = (lo + Math.imul(al3, bl9)) | 0;
    mid = (mid + Math.imul(al3, bh9)) | 0;
    mid = (mid + Math.imul(ah3, bl9)) | 0;
    hi = (hi + Math.imul(ah3, bh9)) | 0;
    var w12 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w12 >>> 26)) | 0;
    w12 &= 0x3ffffff;
    /* k = 13 */
    lo = Math.imul(al9, bl4);
    mid = Math.imul(al9, bh4);
    mid = (mid + Math.imul(ah9, bl4)) | 0;
    hi = Math.imul(ah9, bh4);
    lo = (lo + Math.imul(al8, bl5)) | 0;
    mid = (mid + Math.imul(al8, bh5)) | 0;
    mid = (mid + Math.imul(ah8, bl5)) | 0;
    hi = (hi + Math.imul(ah8, bh5)) | 0;
    lo = (lo + Math.imul(al7, bl6)) | 0;
    mid = (mid + Math.imul(al7, bh6)) | 0;
    mid = (mid + Math.imul(ah7, bl6)) | 0;
    hi = (hi + Math.imul(ah7, bh6)) | 0;
    lo = (lo + Math.imul(al6, bl7)) | 0;
    mid = (mid + Math.imul(al6, bh7)) | 0;
    mid = (mid + Math.imul(ah6, bl7)) | 0;
    hi = (hi + Math.imul(ah6, bh7)) | 0;
    lo = (lo + Math.imul(al5, bl8)) | 0;
    mid = (mid + Math.imul(al5, bh8)) | 0;
    mid = (mid + Math.imul(ah5, bl8)) | 0;
    hi = (hi + Math.imul(ah5, bh8)) | 0;
    lo = (lo + Math.imul(al4, bl9)) | 0;
    mid = (mid + Math.imul(al4, bh9)) | 0;
    mid = (mid + Math.imul(ah4, bl9)) | 0;
    hi = (hi + Math.imul(ah4, bh9)) | 0;
    var w13 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w13 >>> 26)) | 0;
    w13 &= 0x3ffffff;
    /* k = 14 */
    lo = Math.imul(al9, bl5);
    mid = Math.imul(al9, bh5);
    mid = (mid + Math.imul(ah9, bl5)) | 0;
    hi = Math.imul(ah9, bh5);
    lo = (lo + Math.imul(al8, bl6)) | 0;
    mid = (mid + Math.imul(al8, bh6)) | 0;
    mid = (mid + Math.imul(ah8, bl6)) | 0;
    hi = (hi + Math.imul(ah8, bh6)) | 0;
    lo = (lo + Math.imul(al7, bl7)) | 0;
    mid = (mid + Math.imul(al7, bh7)) | 0;
    mid = (mid + Math.imul(ah7, bl7)) | 0;
    hi = (hi + Math.imul(ah7, bh7)) | 0;
    lo = (lo + Math.imul(al6, bl8)) | 0;
    mid = (mid + Math.imul(al6, bh8)) | 0;
    mid = (mid + Math.imul(ah6, bl8)) | 0;
    hi = (hi + Math.imul(ah6, bh8)) | 0;
    lo = (lo + Math.imul(al5, bl9)) | 0;
    mid = (mid + Math.imul(al5, bh9)) | 0;
    mid = (mid + Math.imul(ah5, bl9)) | 0;
    hi = (hi + Math.imul(ah5, bh9)) | 0;
    var w14 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w14 >>> 26)) | 0;
    w14 &= 0x3ffffff;
    /* k = 15 */
    lo = Math.imul(al9, bl6);
    mid = Math.imul(al9, bh6);
    mid = (mid + Math.imul(ah9, bl6)) | 0;
    hi = Math.imul(ah9, bh6);
    lo = (lo + Math.imul(al8, bl7)) | 0;
    mid = (mid + Math.imul(al8, bh7)) | 0;
    mid = (mid + Math.imul(ah8, bl7)) | 0;
    hi = (hi + Math.imul(ah8, bh7)) | 0;
    lo = (lo + Math.imul(al7, bl8)) | 0;
    mid = (mid + Math.imul(al7, bh8)) | 0;
    mid = (mid + Math.imul(ah7, bl8)) | 0;
    hi = (hi + Math.imul(ah7, bh8)) | 0;
    lo = (lo + Math.imul(al6, bl9)) | 0;
    mid = (mid + Math.imul(al6, bh9)) | 0;
    mid = (mid + Math.imul(ah6, bl9)) | 0;
    hi = (hi + Math.imul(ah6, bh9)) | 0;
    var w15 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w15 >>> 26)) | 0;
    w15 &= 0x3ffffff;
    /* k = 16 */
    lo = Math.imul(al9, bl7);
    mid = Math.imul(al9, bh7);
    mid = (mid + Math.imul(ah9, bl7)) | 0;
    hi = Math.imul(ah9, bh7);
    lo = (lo + Math.imul(al8, bl8)) | 0;
    mid = (mid + Math.imul(al8, bh8)) | 0;
    mid = (mid + Math.imul(ah8, bl8)) | 0;
    hi = (hi + Math.imul(ah8, bh8)) | 0;
    lo = (lo + Math.imul(al7, bl9)) | 0;
    mid = (mid + Math.imul(al7, bh9)) | 0;
    mid = (mid + Math.imul(ah7, bl9)) | 0;
    hi = (hi + Math.imul(ah7, bh9)) | 0;
    var w16 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w16 >>> 26)) | 0;
    w16 &= 0x3ffffff;
    /* k = 17 */
    lo = Math.imul(al9, bl8);
    mid = Math.imul(al9, bh8);
    mid = (mid + Math.imul(ah9, bl8)) | 0;
    hi = Math.imul(ah9, bh8);
    lo = (lo + Math.imul(al8, bl9)) | 0;
    mid = (mid + Math.imul(al8, bh9)) | 0;
    mid = (mid + Math.imul(ah8, bl9)) | 0;
    hi = (hi + Math.imul(ah8, bh9)) | 0;
    var w17 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w17 >>> 26)) | 0;
    w17 &= 0x3ffffff;
    /* k = 18 */
    lo = Math.imul(al9, bl9);
    mid = Math.imul(al9, bh9);
    mid = (mid + Math.imul(ah9, bl9)) | 0;
    hi = Math.imul(ah9, bh9);
    var w18 = (((c + lo) | 0) + ((mid & 0x1fff) << 13)) | 0;
    c = (((hi + (mid >>> 13)) | 0) + (w18 >>> 26)) | 0;
    w18 &= 0x3ffffff;
    o[0] = w0;
    o[1] = w1;
    o[2] = w2;
    o[3] = w3;
    o[4] = w4;
    o[5] = w5;
    o[6] = w6;
    o[7] = w7;
    o[8] = w8;
    o[9] = w9;
    o[10] = w10;
    o[11] = w11;
    o[12] = w12;
    o[13] = w13;
    o[14] = w14;
    o[15] = w15;
    o[16] = w16;
    o[17] = w17;
    o[18] = w18;
    if (c !== 0) {
      o[19] = c;
      out.length++;
    }
    return out;
  };

  // Polyfill comb
  if (!Math.imul) {
    comb10MulTo = smallMulTo;
  }

  function bigMulTo (self, num, out) {
    out.negative = num.negative ^ self.negative;
    out.length = self.length + num.length;

    var carry = 0;
    var hncarry = 0;
    for (var k = 0; k < out.length - 1; k++) {
      // Sum all words with the same `i + j = k` and accumulate `ncarry`,
      // note that ncarry could be >= 0x3ffffff
      var ncarry = hncarry;
      hncarry = 0;
      var rword = carry & 0x3ffffff;
      var maxJ = Math.min(k, num.length - 1);
      for (var j = Math.max(0, k - self.length + 1); j <= maxJ; j++) {
        var i = k - j;
        var a = self.words[i] | 0;
        var b = num.words[j] | 0;
        var r = a * b;

        var lo = r & 0x3ffffff;
        ncarry = (ncarry + ((r / 0x4000000) | 0)) | 0;
        lo = (lo + rword) | 0;
        rword = lo & 0x3ffffff;
        ncarry = (ncarry + (lo >>> 26)) | 0;

        hncarry += ncarry >>> 26;
        ncarry &= 0x3ffffff;
      }
      out.words[k] = rword;
      carry = ncarry;
      ncarry = hncarry;
    }
    if (carry !== 0) {
      out.words[k] = carry;
    } else {
      out.length--;
    }

    return out.strip();
  }

  function jumboMulTo (self, num, out) {
    var fftm = new FFTM();
    return fftm.mulp(self, num, out);
  }

  BN.prototype.mulTo = function mulTo (num, out) {
    var res;
    var len = this.length + num.length;
    if (this.length === 10 && num.length === 10) {
      res = comb10MulTo(this, num, out);
    } else if (len < 63) {
      res = smallMulTo(this, num, out);
    } else if (len < 1024) {
      res = bigMulTo(this, num, out);
    } else {
      res = jumboMulTo(this, num, out);
    }

    return res;
  };

  // Cooley-Tukey algorithm for FFT
  // slightly revisited to rely on looping instead of recursion

  function FFTM (x, y) {
    this.x = x;
    this.y = y;
  }

  FFTM.prototype.makeRBT = function makeRBT (N) {
    var t = new Array(N);
    var l = BN.prototype._countBits(N) - 1;
    for (var i = 0; i < N; i++) {
      t[i] = this.revBin(i, l, N);
    }

    return t;
  };

  // Returns binary-reversed representation of `x`
  FFTM.prototype.revBin = function revBin (x, l, N) {
    if (x === 0 || x === N - 1) return x;

    var rb = 0;
    for (var i = 0; i < l; i++) {
      rb |= (x & 1) << (l - i - 1);
      x >>= 1;
    }

    return rb;
  };

  // Performs "tweedling" phase, therefore 'emulating'
  // behaviour of the recursive algorithm
  FFTM.prototype.permute = function permute (rbt, rws, iws, rtws, itws, N) {
    for (var i = 0; i < N; i++) {
      rtws[i] = rws[rbt[i]];
      itws[i] = iws[rbt[i]];
    }
  };

  FFTM.prototype.transform = function transform (rws, iws, rtws, itws, N, rbt) {
    this.permute(rbt, rws, iws, rtws, itws, N);

    for (var s = 1; s < N; s <<= 1) {
      var l = s << 1;

      var rtwdf = Math.cos(2 * Math.PI / l);
      var itwdf = Math.sin(2 * Math.PI / l);

      for (var p = 0; p < N; p += l) {
        var rtwdf_ = rtwdf;
        var itwdf_ = itwdf;

        for (var j = 0; j < s; j++) {
          var re = rtws[p + j];
          var ie = itws[p + j];

          var ro = rtws[p + j + s];
          var io = itws[p + j + s];

          var rx = rtwdf_ * ro - itwdf_ * io;

          io = rtwdf_ * io + itwdf_ * ro;
          ro = rx;

          rtws[p + j] = re + ro;
          itws[p + j] = ie + io;

          rtws[p + j + s] = re - ro;
          itws[p + j + s] = ie - io;

          /* jshint maxdepth : false */
          if (j !== l) {
            rx = rtwdf * rtwdf_ - itwdf * itwdf_;

            itwdf_ = rtwdf * itwdf_ + itwdf * rtwdf_;
            rtwdf_ = rx;
          }
        }
      }
    }
  };

  FFTM.prototype.guessLen13b = function guessLen13b (n, m) {
    var N = Math.max(m, n) | 1;
    var odd = N & 1;
    var i = 0;
    for (N = N / 2 | 0; N; N = N >>> 1) {
      i++;
    }

    return 1 << i + 1 + odd;
  };

  FFTM.prototype.conjugate = function conjugate (rws, iws, N) {
    if (N <= 1) return;

    for (var i = 0; i < N / 2; i++) {
      var t = rws[i];

      rws[i] = rws[N - i - 1];
      rws[N - i - 1] = t;

      t = iws[i];

      iws[i] = -iws[N - i - 1];
      iws[N - i - 1] = -t;
    }
  };

  FFTM.prototype.normalize13b = function normalize13b (ws, N) {
    var carry = 0;
    for (var i = 0; i < N / 2; i++) {
      var w = Math.round(ws[2 * i + 1] / N) * 0x2000 +
        Math.round(ws[2 * i] / N) +
        carry;

      ws[i] = w & 0x3ffffff;

      if (w < 0x4000000) {
        carry = 0;
      } else {
        carry = w / 0x4000000 | 0;
      }
    }

    return ws;
  };

  FFTM.prototype.convert13b = function convert13b (ws, len, rws, N) {
    var carry = 0;
    for (var i = 0; i < len; i++) {
      carry = carry + (ws[i] | 0);

      rws[2 * i] = carry & 0x1fff; carry = carry >>> 13;
      rws[2 * i + 1] = carry & 0x1fff; carry = carry >>> 13;
    }

    // Pad with zeroes
    for (i = 2 * len; i < N; ++i) {
      rws[i] = 0;
    }

    assert(carry === 0);
    assert((carry & ~0x1fff) === 0);
  };

  FFTM.prototype.stub = function stub (N) {
    var ph = new Array(N);
    for (var i = 0; i < N; i++) {
      ph[i] = 0;
    }

    return ph;
  };

  FFTM.prototype.mulp = function mulp (x, y, out) {
    var N = 2 * this.guessLen13b(x.length, y.length);

    var rbt = this.makeRBT(N);

    var _ = this.stub(N);

    var rws = new Array(N);
    var rwst = new Array(N);
    var iwst = new Array(N);

    var nrws = new Array(N);
    var nrwst = new Array(N);
    var niwst = new Array(N);

    var rmws = out.words;
    rmws.length = N;

    this.convert13b(x.words, x.length, rws, N);
    this.convert13b(y.words, y.length, nrws, N);

    this.transform(rws, _, rwst, iwst, N, rbt);
    this.transform(nrws, _, nrwst, niwst, N, rbt);

    for (var i = 0; i < N; i++) {
      var rx = rwst[i] * nrwst[i] - iwst[i] * niwst[i];
      iwst[i] = rwst[i] * niwst[i] + iwst[i] * nrwst[i];
      rwst[i] = rx;
    }

    this.conjugate(rwst, iwst, N);
    this.transform(rwst, iwst, rmws, _, N, rbt);
    this.conjugate(rmws, _, N);
    this.normalize13b(rmws, N);

    out.negative = x.negative ^ y.negative;
    out.length = x.length + y.length;
    return out.strip();
  };

  // Multiply `this` by `num`
  BN.prototype.mul = function mul (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return this.mulTo(num, out);
  };

  // Multiply employing FFT
  BN.prototype.mulf = function mulf (num) {
    var out = new BN(null);
    out.words = new Array(this.length + num.length);
    return jumboMulTo(this, num, out);
  };

  // In-place Multiplication
  BN.prototype.imul = function imul (num) {
    return this.clone().mulTo(num, this);
  };

  BN.prototype.imuln = function imuln (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);

    // Carry
    var carry = 0;
    for (var i = 0; i < this.length; i++) {
      var w = (this.words[i] | 0) * num;
      var lo = (w & 0x3ffffff) + (carry & 0x3ffffff);
      carry >>= 26;
      carry += (w / 0x4000000) | 0;
      // NOTE: lo is 27bit maximum
      carry += lo >>> 26;
      this.words[i] = lo & 0x3ffffff;
    }

    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }

    return this;
  };

  BN.prototype.muln = function muln (num) {
    return this.clone().imuln(num);
  };

  // `this` * `this`
  BN.prototype.sqr = function sqr () {
    return this.mul(this);
  };

  // `this` * `this` in-place
  BN.prototype.isqr = function isqr () {
    return this.imul(this.clone());
  };

  // Math.pow(`this`, `num`)
  BN.prototype.pow = function pow (num) {
    var w = toBitArray(num);
    if (w.length === 0) return new BN(1);

    // Skip leading zeroes
    var res = this;
    for (var i = 0; i < w.length; i++, res = res.sqr()) {
      if (w[i] !== 0) break;
    }

    if (++i < w.length) {
      for (var q = res.sqr(); i < w.length; i++, q = q.sqr()) {
        if (w[i] === 0) continue;

        res = res.mul(q);
      }
    }

    return res;
  };

  // Shift-left in-place
  BN.prototype.iushln = function iushln (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;
    var carryMask = (0x3ffffff >>> (26 - r)) << (26 - r);
    var i;

    if (r !== 0) {
      var carry = 0;

      for (i = 0; i < this.length; i++) {
        var newCarry = this.words[i] & carryMask;
        var c = ((this.words[i] | 0) - newCarry) << r;
        this.words[i] = c | carry;
        carry = newCarry >>> (26 - r);
      }

      if (carry) {
        this.words[i] = carry;
        this.length++;
      }
    }

    if (s !== 0) {
      for (i = this.length - 1; i >= 0; i--) {
        this.words[i + s] = this.words[i];
      }

      for (i = 0; i < s; i++) {
        this.words[i] = 0;
      }

      this.length += s;
    }

    return this.strip();
  };

  BN.prototype.ishln = function ishln (bits) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushln(bits);
  };

  // Shift-right in-place
  // NOTE: `hint` is a lowest bit before trailing zeroes
  // NOTE: if `extended` is present - it will be filled with destroyed bits
  BN.prototype.iushrn = function iushrn (bits, hint, extended) {
    assert(typeof bits === 'number' && bits >= 0);
    var h;
    if (hint) {
      h = (hint - (hint % 26)) / 26;
    } else {
      h = 0;
    }

    var r = bits % 26;
    var s = Math.min((bits - r) / 26, this.length);
    var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
    var maskedWords = extended;

    h -= s;
    h = Math.max(0, h);

    // Extended mode, copy masked part
    if (maskedWords) {
      for (var i = 0; i < s; i++) {
        maskedWords.words[i] = this.words[i];
      }
      maskedWords.length = s;
    }

    if (s === 0) {
      // No-op, we should not move anything at all
    } else if (this.length > s) {
      this.length -= s;
      for (i = 0; i < this.length; i++) {
        this.words[i] = this.words[i + s];
      }
    } else {
      this.words[0] = 0;
      this.length = 1;
    }

    var carry = 0;
    for (i = this.length - 1; i >= 0 && (carry !== 0 || i >= h); i--) {
      var word = this.words[i] | 0;
      this.words[i] = (carry << (26 - r)) | (word >>> r);
      carry = word & mask;
    }

    // Push carried bits as a mask
    if (maskedWords && carry !== 0) {
      maskedWords.words[maskedWords.length++] = carry;
    }

    if (this.length === 0) {
      this.words[0] = 0;
      this.length = 1;
    }

    return this.strip();
  };

  BN.prototype.ishrn = function ishrn (bits, hint, extended) {
    // TODO(indutny): implement me
    assert(this.negative === 0);
    return this.iushrn(bits, hint, extended);
  };

  // Shift-left
  BN.prototype.shln = function shln (bits) {
    return this.clone().ishln(bits);
  };

  BN.prototype.ushln = function ushln (bits) {
    return this.clone().iushln(bits);
  };

  // Shift-right
  BN.prototype.shrn = function shrn (bits) {
    return this.clone().ishrn(bits);
  };

  BN.prototype.ushrn = function ushrn (bits) {
    return this.clone().iushrn(bits);
  };

  // Test if n bit is set
  BN.prototype.testn = function testn (bit) {
    assert(typeof bit === 'number' && bit >= 0);
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) return false;

    // Check bit and return
    var w = this.words[s];

    return !!(w & q);
  };

  // Return only lowers bits of number (in-place)
  BN.prototype.imaskn = function imaskn (bits) {
    assert(typeof bits === 'number' && bits >= 0);
    var r = bits % 26;
    var s = (bits - r) / 26;

    assert(this.negative === 0, 'imaskn works only with positive numbers');

    if (this.length <= s) {
      return this;
    }

    if (r !== 0) {
      s++;
    }
    this.length = Math.min(s, this.length);

    if (r !== 0) {
      var mask = 0x3ffffff ^ ((0x3ffffff >>> r) << r);
      this.words[this.length - 1] &= mask;
    }

    return this.strip();
  };

  // Return only lowers bits of number
  BN.prototype.maskn = function maskn (bits) {
    return this.clone().imaskn(bits);
  };

  // Add plain number `num` to `this`
  BN.prototype.iaddn = function iaddn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.isubn(-num);

    // Possible sign change
    if (this.negative !== 0) {
      if (this.length === 1 && (this.words[0] | 0) < num) {
        this.words[0] = num - (this.words[0] | 0);
        this.negative = 0;
        return this;
      }

      this.negative = 0;
      this.isubn(num);
      this.negative = 1;
      return this;
    }

    // Add without checks
    return this._iaddn(num);
  };

  BN.prototype._iaddn = function _iaddn (num) {
    this.words[0] += num;

    // Carry
    for (var i = 0; i < this.length && this.words[i] >= 0x4000000; i++) {
      this.words[i] -= 0x4000000;
      if (i === this.length - 1) {
        this.words[i + 1] = 1;
      } else {
        this.words[i + 1]++;
      }
    }
    this.length = Math.max(this.length, i + 1);

    return this;
  };

  // Subtract plain number `num` from `this`
  BN.prototype.isubn = function isubn (num) {
    assert(typeof num === 'number');
    assert(num < 0x4000000);
    if (num < 0) return this.iaddn(-num);

    if (this.negative !== 0) {
      this.negative = 0;
      this.iaddn(num);
      this.negative = 1;
      return this;
    }

    this.words[0] -= num;

    if (this.length === 1 && this.words[0] < 0) {
      this.words[0] = -this.words[0];
      this.negative = 1;
    } else {
      // Carry
      for (var i = 0; i < this.length && this.words[i] < 0; i++) {
        this.words[i] += 0x4000000;
        this.words[i + 1] -= 1;
      }
    }

    return this.strip();
  };

  BN.prototype.addn = function addn (num) {
    return this.clone().iaddn(num);
  };

  BN.prototype.subn = function subn (num) {
    return this.clone().isubn(num);
  };

  BN.prototype.iabs = function iabs () {
    this.negative = 0;

    return this;
  };

  BN.prototype.abs = function abs () {
    return this.clone().iabs();
  };

  BN.prototype._ishlnsubmul = function _ishlnsubmul (num, mul, shift) {
    var len = num.length + shift;
    var i;

    this._expand(len);

    var w;
    var carry = 0;
    for (i = 0; i < num.length; i++) {
      w = (this.words[i + shift] | 0) + carry;
      var right = (num.words[i] | 0) * mul;
      w -= right & 0x3ffffff;
      carry = (w >> 26) - ((right / 0x4000000) | 0);
      this.words[i + shift] = w & 0x3ffffff;
    }
    for (; i < this.length - shift; i++) {
      w = (this.words[i + shift] | 0) + carry;
      carry = w >> 26;
      this.words[i + shift] = w & 0x3ffffff;
    }

    if (carry === 0) return this.strip();

    // Subtraction overflow
    assert(carry === -1);
    carry = 0;
    for (i = 0; i < this.length; i++) {
      w = -(this.words[i] | 0) + carry;
      carry = w >> 26;
      this.words[i] = w & 0x3ffffff;
    }
    this.negative = 1;

    return this.strip();
  };

  BN.prototype._wordDiv = function _wordDiv (num, mode) {
    var shift = this.length - num.length;

    var a = this.clone();
    var b = num;

    // Normalize
    var bhi = b.words[b.length - 1] | 0;
    var bhiBits = this._countBits(bhi);
    shift = 26 - bhiBits;
    if (shift !== 0) {
      b = b.ushln(shift);
      a.iushln(shift);
      bhi = b.words[b.length - 1] | 0;
    }

    // Initialize quotient
    var m = a.length - b.length;
    var q;

    if (mode !== 'mod') {
      q = new BN(null);
      q.length = m + 1;
      q.words = new Array(q.length);
      for (var i = 0; i < q.length; i++) {
        q.words[i] = 0;
      }
    }

    var diff = a.clone()._ishlnsubmul(b, 1, m);
    if (diff.negative === 0) {
      a = diff;
      if (q) {
        q.words[m] = 1;
      }
    }

    for (var j = m - 1; j >= 0; j--) {
      var qj = (a.words[b.length + j] | 0) * 0x4000000 +
        (a.words[b.length + j - 1] | 0);

      // NOTE: (qj / bhi) is (0x3ffffff * 0x4000000 + 0x3ffffff) / 0x2000000 max
      // (0x7ffffff)
      qj = Math.min((qj / bhi) | 0, 0x3ffffff);

      a._ishlnsubmul(b, qj, j);
      while (a.negative !== 0) {
        qj--;
        a.negative = 0;
        a._ishlnsubmul(b, 1, j);
        if (!a.isZero()) {
          a.negative ^= 1;
        }
      }
      if (q) {
        q.words[j] = qj;
      }
    }
    if (q) {
      q.strip();
    }
    a.strip();

    // Denormalize
    if (mode !== 'div' && shift !== 0) {
      a.iushrn(shift);
    }

    return {
      div: q || null,
      mod: a
    };
  };

  // NOTE: 1) `mode` can be set to `mod` to request mod only,
  //       to `div` to request div only, or be absent to
  //       request both div & mod
  //       2) `positive` is true if unsigned mod is requested
  BN.prototype.divmod = function divmod (num, mode, positive) {
    assert(!num.isZero());

    if (this.isZero()) {
      return {
        div: new BN(0),
        mod: new BN(0)
      };
    }

    var div, mod, res;
    if (this.negative !== 0 && num.negative === 0) {
      res = this.neg().divmod(num, mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.iadd(num);
        }
      }

      return {
        div: div,
        mod: mod
      };
    }

    if (this.negative === 0 && num.negative !== 0) {
      res = this.divmod(num.neg(), mode);

      if (mode !== 'mod') {
        div = res.div.neg();
      }

      return {
        div: div,
        mod: res.mod
      };
    }

    if ((this.negative & num.negative) !== 0) {
      res = this.neg().divmod(num.neg(), mode);

      if (mode !== 'div') {
        mod = res.mod.neg();
        if (positive && mod.negative !== 0) {
          mod.isub(num);
        }
      }

      return {
        div: res.div,
        mod: mod
      };
    }

    // Both numbers are positive at this point

    // Strip both numbers to approximate shift value
    if (num.length > this.length || this.cmp(num) < 0) {
      return {
        div: new BN(0),
        mod: this
      };
    }

    // Very short reduction
    if (num.length === 1) {
      if (mode === 'div') {
        return {
          div: this.divn(num.words[0]),
          mod: null
        };
      }

      if (mode === 'mod') {
        return {
          div: null,
          mod: new BN(this.modn(num.words[0]))
        };
      }

      return {
        div: this.divn(num.words[0]),
        mod: new BN(this.modn(num.words[0]))
      };
    }

    return this._wordDiv(num, mode);
  };

  // Find `this` / `num`
  BN.prototype.div = function div (num) {
    return this.divmod(num, 'div', false).div;
  };

  // Find `this` % `num`
  BN.prototype.mod = function mod (num) {
    return this.divmod(num, 'mod', false).mod;
  };

  BN.prototype.umod = function umod (num) {
    return this.divmod(num, 'mod', true).mod;
  };

  // Find Round(`this` / `num`)
  BN.prototype.divRound = function divRound (num) {
    var dm = this.divmod(num);

    // Fast case - exact division
    if (dm.mod.isZero()) return dm.div;

    var mod = dm.div.negative !== 0 ? dm.mod.isub(num) : dm.mod;

    var half = num.ushrn(1);
    var r2 = num.andln(1);
    var cmp = mod.cmp(half);

    // Round down
    if (cmp < 0 || r2 === 1 && cmp === 0) return dm.div;

    // Round up
    return dm.div.negative !== 0 ? dm.div.isubn(1) : dm.div.iaddn(1);
  };

  BN.prototype.modn = function modn (num) {
    assert(num <= 0x3ffffff);
    var p = (1 << 26) % num;

    var acc = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      acc = (p * acc + (this.words[i] | 0)) % num;
    }

    return acc;
  };

  // In-place division by number
  BN.prototype.idivn = function idivn (num) {
    assert(num <= 0x3ffffff);

    var carry = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var w = (this.words[i] | 0) + carry * 0x4000000;
      this.words[i] = (w / num) | 0;
      carry = w % num;
    }

    return this.strip();
  };

  BN.prototype.divn = function divn (num) {
    return this.clone().idivn(num);
  };

  BN.prototype.egcd = function egcd (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var x = this;
    var y = p.clone();

    if (x.negative !== 0) {
      x = x.umod(p);
    } else {
      x = x.clone();
    }

    // A * x + B * y = x
    var A = new BN(1);
    var B = new BN(0);

    // C * x + D * y = y
    var C = new BN(0);
    var D = new BN(1);

    var g = 0;

    while (x.isEven() && y.isEven()) {
      x.iushrn(1);
      y.iushrn(1);
      ++g;
    }

    var yp = y.clone();
    var xp = x.clone();

    while (!x.isZero()) {
      for (var i = 0, im = 1; (x.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        x.iushrn(i);
        while (i-- > 0) {
          if (A.isOdd() || B.isOdd()) {
            A.iadd(yp);
            B.isub(xp);
          }

          A.iushrn(1);
          B.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (y.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        y.iushrn(j);
        while (j-- > 0) {
          if (C.isOdd() || D.isOdd()) {
            C.iadd(yp);
            D.isub(xp);
          }

          C.iushrn(1);
          D.iushrn(1);
        }
      }

      if (x.cmp(y) >= 0) {
        x.isub(y);
        A.isub(C);
        B.isub(D);
      } else {
        y.isub(x);
        C.isub(A);
        D.isub(B);
      }
    }

    return {
      a: C,
      b: D,
      gcd: y.iushln(g)
    };
  };

  // This is reduced incarnation of the binary EEA
  // above, designated to invert members of the
  // _prime_ fields F(p) at a maximal speed
  BN.prototype._invmp = function _invmp (p) {
    assert(p.negative === 0);
    assert(!p.isZero());

    var a = this;
    var b = p.clone();

    if (a.negative !== 0) {
      a = a.umod(p);
    } else {
      a = a.clone();
    }

    var x1 = new BN(1);
    var x2 = new BN(0);

    var delta = b.clone();

    while (a.cmpn(1) > 0 && b.cmpn(1) > 0) {
      for (var i = 0, im = 1; (a.words[0] & im) === 0 && i < 26; ++i, im <<= 1);
      if (i > 0) {
        a.iushrn(i);
        while (i-- > 0) {
          if (x1.isOdd()) {
            x1.iadd(delta);
          }

          x1.iushrn(1);
        }
      }

      for (var j = 0, jm = 1; (b.words[0] & jm) === 0 && j < 26; ++j, jm <<= 1);
      if (j > 0) {
        b.iushrn(j);
        while (j-- > 0) {
          if (x2.isOdd()) {
            x2.iadd(delta);
          }

          x2.iushrn(1);
        }
      }

      if (a.cmp(b) >= 0) {
        a.isub(b);
        x1.isub(x2);
      } else {
        b.isub(a);
        x2.isub(x1);
      }
    }

    var res;
    if (a.cmpn(1) === 0) {
      res = x1;
    } else {
      res = x2;
    }

    if (res.cmpn(0) < 0) {
      res.iadd(p);
    }

    return res;
  };

  BN.prototype.gcd = function gcd (num) {
    if (this.isZero()) return num.abs();
    if (num.isZero()) return this.abs();

    var a = this.clone();
    var b = num.clone();
    a.negative = 0;
    b.negative = 0;

    // Remove common factor of two
    for (var shift = 0; a.isEven() && b.isEven(); shift++) {
      a.iushrn(1);
      b.iushrn(1);
    }

    do {
      while (a.isEven()) {
        a.iushrn(1);
      }
      while (b.isEven()) {
        b.iushrn(1);
      }

      var r = a.cmp(b);
      if (r < 0) {
        // Swap `a` and `b` to make `a` always bigger than `b`
        var t = a;
        a = b;
        b = t;
      } else if (r === 0 || b.cmpn(1) === 0) {
        break;
      }

      a.isub(b);
    } while (true);

    return b.iushln(shift);
  };

  // Invert number in the field F(num)
  BN.prototype.invm = function invm (num) {
    return this.egcd(num).a.umod(num);
  };

  BN.prototype.isEven = function isEven () {
    return (this.words[0] & 1) === 0;
  };

  BN.prototype.isOdd = function isOdd () {
    return (this.words[0] & 1) === 1;
  };

  // And first word and num
  BN.prototype.andln = function andln (num) {
    return this.words[0] & num;
  };

  // Increment at the bit position in-line
  BN.prototype.bincn = function bincn (bit) {
    assert(typeof bit === 'number');
    var r = bit % 26;
    var s = (bit - r) / 26;
    var q = 1 << r;

    // Fast case: bit is much higher than all existing words
    if (this.length <= s) {
      this._expand(s + 1);
      this.words[s] |= q;
      return this;
    }

    // Add bit and propagate, if needed
    var carry = q;
    for (var i = s; carry !== 0 && i < this.length; i++) {
      var w = this.words[i] | 0;
      w += carry;
      carry = w >>> 26;
      w &= 0x3ffffff;
      this.words[i] = w;
    }
    if (carry !== 0) {
      this.words[i] = carry;
      this.length++;
    }
    return this;
  };

  BN.prototype.isZero = function isZero () {
    return this.length === 1 && this.words[0] === 0;
  };

  BN.prototype.cmpn = function cmpn (num) {
    var negative = num < 0;

    if (this.negative !== 0 && !negative) return -1;
    if (this.negative === 0 && negative) return 1;

    this.strip();

    var res;
    if (this.length > 1) {
      res = 1;
    } else {
      if (negative) {
        num = -num;
      }

      assert(num <= 0x3ffffff, 'Number is too big');

      var w = this.words[0] | 0;
      res = w === num ? 0 : w < num ? -1 : 1;
    }
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Compare two numbers and return:
  // 1 - if `this` > `num`
  // 0 - if `this` == `num`
  // -1 - if `this` < `num`
  BN.prototype.cmp = function cmp (num) {
    if (this.negative !== 0 && num.negative === 0) return -1;
    if (this.negative === 0 && num.negative !== 0) return 1;

    var res = this.ucmp(num);
    if (this.negative !== 0) return -res | 0;
    return res;
  };

  // Unsigned comparison
  BN.prototype.ucmp = function ucmp (num) {
    // At this point both numbers have the same sign
    if (this.length > num.length) return 1;
    if (this.length < num.length) return -1;

    var res = 0;
    for (var i = this.length - 1; i >= 0; i--) {
      var a = this.words[i] | 0;
      var b = num.words[i] | 0;

      if (a === b) continue;
      if (a < b) {
        res = -1;
      } else if (a > b) {
        res = 1;
      }
      break;
    }
    return res;
  };

  BN.prototype.gtn = function gtn (num) {
    return this.cmpn(num) === 1;
  };

  BN.prototype.gt = function gt (num) {
    return this.cmp(num) === 1;
  };

  BN.prototype.gten = function gten (num) {
    return this.cmpn(num) >= 0;
  };

  BN.prototype.gte = function gte (num) {
    return this.cmp(num) >= 0;
  };

  BN.prototype.ltn = function ltn (num) {
    return this.cmpn(num) === -1;
  };

  BN.prototype.lt = function lt (num) {
    return this.cmp(num) === -1;
  };

  BN.prototype.lten = function lten (num) {
    return this.cmpn(num) <= 0;
  };

  BN.prototype.lte = function lte (num) {
    return this.cmp(num) <= 0;
  };

  BN.prototype.eqn = function eqn (num) {
    return this.cmpn(num) === 0;
  };

  BN.prototype.eq = function eq (num) {
    return this.cmp(num) === 0;
  };

  //
  // A reduce context, could be using montgomery or something better, depending
  // on the `m` itself.
  //
  BN.red = function red (num) {
    return new Red(num);
  };

  BN.prototype.toRed = function toRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    assert(this.negative === 0, 'red works only with positives');
    return ctx.convertTo(this)._forceRed(ctx);
  };

  BN.prototype.fromRed = function fromRed () {
    assert(this.red, 'fromRed works only with numbers in reduction context');
    return this.red.convertFrom(this);
  };

  BN.prototype._forceRed = function _forceRed (ctx) {
    this.red = ctx;
    return this;
  };

  BN.prototype.forceRed = function forceRed (ctx) {
    assert(!this.red, 'Already a number in reduction context');
    return this._forceRed(ctx);
  };

  BN.prototype.redAdd = function redAdd (num) {
    assert(this.red, 'redAdd works only with red numbers');
    return this.red.add(this, num);
  };

  BN.prototype.redIAdd = function redIAdd (num) {
    assert(this.red, 'redIAdd works only with red numbers');
    return this.red.iadd(this, num);
  };

  BN.prototype.redSub = function redSub (num) {
    assert(this.red, 'redSub works only with red numbers');
    return this.red.sub(this, num);
  };

  BN.prototype.redISub = function redISub (num) {
    assert(this.red, 'redISub works only with red numbers');
    return this.red.isub(this, num);
  };

  BN.prototype.redShl = function redShl (num) {
    assert(this.red, 'redShl works only with red numbers');
    return this.red.shl(this, num);
  };

  BN.prototype.redMul = function redMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.mul(this, num);
  };

  BN.prototype.redIMul = function redIMul (num) {
    assert(this.red, 'redMul works only with red numbers');
    this.red._verify2(this, num);
    return this.red.imul(this, num);
  };

  BN.prototype.redSqr = function redSqr () {
    assert(this.red, 'redSqr works only with red numbers');
    this.red._verify1(this);
    return this.red.sqr(this);
  };

  BN.prototype.redISqr = function redISqr () {
    assert(this.red, 'redISqr works only with red numbers');
    this.red._verify1(this);
    return this.red.isqr(this);
  };

  // Square root over p
  BN.prototype.redSqrt = function redSqrt () {
    assert(this.red, 'redSqrt works only with red numbers');
    this.red._verify1(this);
    return this.red.sqrt(this);
  };

  BN.prototype.redInvm = function redInvm () {
    assert(this.red, 'redInvm works only with red numbers');
    this.red._verify1(this);
    return this.red.invm(this);
  };

  // Return negative clone of `this` % `red modulo`
  BN.prototype.redNeg = function redNeg () {
    assert(this.red, 'redNeg works only with red numbers');
    this.red._verify1(this);
    return this.red.neg(this);
  };

  BN.prototype.redPow = function redPow (num) {
    assert(this.red && !num.red, 'redPow(normalNum)');
    this.red._verify1(this);
    return this.red.pow(this, num);
  };

  // Prime numbers with efficient reduction
  var primes = {
    k256: null,
    p224: null,
    p192: null,
    p25519: null
  };

  // Pseudo-Mersenne prime
  function MPrime (name, p) {
    // P = 2 ^ N - K
    this.name = name;
    this.p = new BN(p, 16);
    this.n = this.p.bitLength();
    this.k = new BN(1).iushln(this.n).isub(this.p);

    this.tmp = this._tmp();
  }

  MPrime.prototype._tmp = function _tmp () {
    var tmp = new BN(null);
    tmp.words = new Array(Math.ceil(this.n / 13));
    return tmp;
  };

  MPrime.prototype.ireduce = function ireduce (num) {
    // Assumes that `num` is less than `P^2`
    // num = HI * (2 ^ N - K) + HI * K + LO = HI * K + LO (mod P)
    var r = num;
    var rlen;

    do {
      this.split(r, this.tmp);
      r = this.imulK(r);
      r = r.iadd(this.tmp);
      rlen = r.bitLength();
    } while (rlen > this.n);

    var cmp = rlen < this.n ? -1 : r.ucmp(this.p);
    if (cmp === 0) {
      r.words[0] = 0;
      r.length = 1;
    } else if (cmp > 0) {
      r.isub(this.p);
    } else {
      if (r.strip !== undefined) {
        // r is BN v4 instance
        r.strip();
      } else {
        // r is BN v5 instance
        r._strip();
      }
    }

    return r;
  };

  MPrime.prototype.split = function split (input, out) {
    input.iushrn(this.n, 0, out);
  };

  MPrime.prototype.imulK = function imulK (num) {
    return num.imul(this.k);
  };

  function K256 () {
    MPrime.call(
      this,
      'k256',
      'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f');
  }
  inherits(K256, MPrime);

  K256.prototype.split = function split (input, output) {
    // 256 = 9 * 26 + 22
    var mask = 0x3fffff;

    var outLen = Math.min(input.length, 9);
    for (var i = 0; i < outLen; i++) {
      output.words[i] = input.words[i];
    }
    output.length = outLen;

    if (input.length <= 9) {
      input.words[0] = 0;
      input.length = 1;
      return;
    }

    // Shift by 9 limbs
    var prev = input.words[9];
    output.words[output.length++] = prev & mask;

    for (i = 10; i < input.length; i++) {
      var next = input.words[i] | 0;
      input.words[i - 10] = ((next & mask) << 4) | (prev >>> 22);
      prev = next;
    }
    prev >>>= 22;
    input.words[i - 10] = prev;
    if (prev === 0 && input.length > 10) {
      input.length -= 10;
    } else {
      input.length -= 9;
    }
  };

  K256.prototype.imulK = function imulK (num) {
    // K = 0x1000003d1 = [ 0x40, 0x3d1 ]
    num.words[num.length] = 0;
    num.words[num.length + 1] = 0;
    num.length += 2;

    // bounded at: 0x40 * 0x3ffffff + 0x3d0 = 0x100000390
    var lo = 0;
    for (var i = 0; i < num.length; i++) {
      var w = num.words[i] | 0;
      lo += w * 0x3d1;
      num.words[i] = lo & 0x3ffffff;
      lo = w * 0x40 + ((lo / 0x4000000) | 0);
    }

    // Fast length reduction
    if (num.words[num.length - 1] === 0) {
      num.length--;
      if (num.words[num.length - 1] === 0) {
        num.length--;
      }
    }
    return num;
  };

  function P224 () {
    MPrime.call(
      this,
      'p224',
      'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001');
  }
  inherits(P224, MPrime);

  function P192 () {
    MPrime.call(
      this,
      'p192',
      'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff');
  }
  inherits(P192, MPrime);

  function P25519 () {
    // 2 ^ 255 - 19
    MPrime.call(
      this,
      '25519',
      '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed');
  }
  inherits(P25519, MPrime);

  P25519.prototype.imulK = function imulK (num) {
    // K = 0x13
    var carry = 0;
    for (var i = 0; i < num.length; i++) {
      var hi = (num.words[i] | 0) * 0x13 + carry;
      var lo = hi & 0x3ffffff;
      hi >>>= 26;

      num.words[i] = lo;
      carry = hi;
    }
    if (carry !== 0) {
      num.words[num.length++] = carry;
    }
    return num;
  };

  // Exported mostly for testing purposes, use plain name instead
  BN._prime = function prime (name) {
    // Cached version of prime
    if (primes[name]) return primes[name];

    var prime;
    if (name === 'k256') {
      prime = new K256();
    } else if (name === 'p224') {
      prime = new P224();
    } else if (name === 'p192') {
      prime = new P192();
    } else if (name === 'p25519') {
      prime = new P25519();
    } else {
      throw new Error('Unknown prime ' + name);
    }
    primes[name] = prime;

    return prime;
  };

  //
  // Base reduction engine
  //
  function Red (m) {
    if (typeof m === 'string') {
      var prime = BN._prime(m);
      this.m = prime.p;
      this.prime = prime;
    } else {
      assert(m.gtn(1), 'modulus must be greater than 1');
      this.m = m;
      this.prime = null;
    }
  }

  Red.prototype._verify1 = function _verify1 (a) {
    assert(a.negative === 0, 'red works only with positives');
    assert(a.red, 'red works only with red numbers');
  };

  Red.prototype._verify2 = function _verify2 (a, b) {
    assert((a.negative | b.negative) === 0, 'red works only with positives');
    assert(a.red && a.red === b.red,
      'red works only with red numbers');
  };

  Red.prototype.imod = function imod (a) {
    if (this.prime) return this.prime.ireduce(a)._forceRed(this);
    return a.umod(this.m)._forceRed(this);
  };

  Red.prototype.neg = function neg (a) {
    if (a.isZero()) {
      return a.clone();
    }

    return this.m.sub(a)._forceRed(this);
  };

  Red.prototype.add = function add (a, b) {
    this._verify2(a, b);

    var res = a.add(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.iadd = function iadd (a, b) {
    this._verify2(a, b);

    var res = a.iadd(b);
    if (res.cmp(this.m) >= 0) {
      res.isub(this.m);
    }
    return res;
  };

  Red.prototype.sub = function sub (a, b) {
    this._verify2(a, b);

    var res = a.sub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res._forceRed(this);
  };

  Red.prototype.isub = function isub (a, b) {
    this._verify2(a, b);

    var res = a.isub(b);
    if (res.cmpn(0) < 0) {
      res.iadd(this.m);
    }
    return res;
  };

  Red.prototype.shl = function shl (a, num) {
    this._verify1(a);
    return this.imod(a.ushln(num));
  };

  Red.prototype.imul = function imul (a, b) {
    this._verify2(a, b);
    return this.imod(a.imul(b));
  };

  Red.prototype.mul = function mul (a, b) {
    this._verify2(a, b);
    return this.imod(a.mul(b));
  };

  Red.prototype.isqr = function isqr (a) {
    return this.imul(a, a.clone());
  };

  Red.prototype.sqr = function sqr (a) {
    return this.mul(a, a);
  };

  Red.prototype.sqrt = function sqrt (a) {
    if (a.isZero()) return a.clone();

    var mod3 = this.m.andln(3);
    assert(mod3 % 2 === 1);

    // Fast case
    if (mod3 === 3) {
      var pow = this.m.add(new BN(1)).iushrn(2);
      return this.pow(a, pow);
    }

    // Tonelli-Shanks algorithm (Totally unoptimized and slow)
    //
    // Find Q and S, that Q * 2 ^ S = (P - 1)
    var q = this.m.subn(1);
    var s = 0;
    while (!q.isZero() && q.andln(1) === 0) {
      s++;
      q.iushrn(1);
    }
    assert(!q.isZero());

    var one = new BN(1).toRed(this);
    var nOne = one.redNeg();

    // Find quadratic non-residue
    // NOTE: Max is such because of generalized Riemann hypothesis.
    var lpow = this.m.subn(1).iushrn(1);
    var z = this.m.bitLength();
    z = new BN(2 * z * z).toRed(this);

    while (this.pow(z, lpow).cmp(nOne) !== 0) {
      z.redIAdd(nOne);
    }

    var c = this.pow(z, q);
    var r = this.pow(a, q.addn(1).iushrn(1));
    var t = this.pow(a, q);
    var m = s;
    while (t.cmp(one) !== 0) {
      var tmp = t;
      for (var i = 0; tmp.cmp(one) !== 0; i++) {
        tmp = tmp.redSqr();
      }
      assert(i < m);
      var b = this.pow(c, new BN(1).iushln(m - i - 1));

      r = r.redMul(b);
      c = b.redSqr();
      t = t.redMul(c);
      m = i;
    }

    return r;
  };

  Red.prototype.invm = function invm (a) {
    var inv = a._invmp(this.m);
    if (inv.negative !== 0) {
      inv.negative = 0;
      return this.imod(inv).redNeg();
    } else {
      return this.imod(inv);
    }
  };

  Red.prototype.pow = function pow (a, num) {
    if (num.isZero()) return new BN(1).toRed(this);
    if (num.cmpn(1) === 0) return a.clone();

    var windowSize = 4;
    var wnd = new Array(1 << windowSize);
    wnd[0] = new BN(1).toRed(this);
    wnd[1] = a;
    for (var i = 2; i < wnd.length; i++) {
      wnd[i] = this.mul(wnd[i - 1], a);
    }

    var res = wnd[0];
    var current = 0;
    var currentLen = 0;
    var start = num.bitLength() % 26;
    if (start === 0) {
      start = 26;
    }

    for (i = num.length - 1; i >= 0; i--) {
      var word = num.words[i];
      for (var j = start - 1; j >= 0; j--) {
        var bit = (word >> j) & 1;
        if (res !== wnd[0]) {
          res = this.sqr(res);
        }

        if (bit === 0 && current === 0) {
          currentLen = 0;
          continue;
        }

        current <<= 1;
        current |= bit;
        currentLen++;
        if (currentLen !== windowSize && (i !== 0 || j !== 0)) continue;

        res = this.mul(res, wnd[current]);
        currentLen = 0;
        current = 0;
      }
      start = 26;
    }

    return res;
  };

  Red.prototype.convertTo = function convertTo (num) {
    var r = num.umod(this.m);

    return r === num ? r.clone() : r;
  };

  Red.prototype.convertFrom = function convertFrom (num) {
    var res = num.clone();
    res.red = null;
    return res;
  };

  //
  // Montgomery method engine
  //

  BN.mont = function mont (num) {
    return new Mont(num);
  };

  function Mont (m) {
    Red.call(this, m);

    this.shift = this.m.bitLength();
    if (this.shift % 26 !== 0) {
      this.shift += 26 - (this.shift % 26);
    }

    this.r = new BN(1).iushln(this.shift);
    this.r2 = this.imod(this.r.sqr());
    this.rinv = this.r._invmp(this.m);

    this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
    this.minv = this.minv.umod(this.r);
    this.minv = this.r.sub(this.minv);
  }
  inherits(Mont, Red);

  Mont.prototype.convertTo = function convertTo (num) {
    return this.imod(num.ushln(this.shift));
  };

  Mont.prototype.convertFrom = function convertFrom (num) {
    var r = this.imod(num.mul(this.rinv));
    r.red = null;
    return r;
  };

  Mont.prototype.imul = function imul (a, b) {
    if (a.isZero() || b.isZero()) {
      a.words[0] = 0;
      a.length = 1;
      return a;
    }

    var t = a.imul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;

    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.mul = function mul (a, b) {
    if (a.isZero() || b.isZero()) return new BN(0)._forceRed(this);

    var t = a.mul(b);
    var c = t.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m);
    var u = t.isub(c).iushrn(this.shift);
    var res = u;
    if (u.cmp(this.m) >= 0) {
      res = u.isub(this.m);
    } else if (u.cmpn(0) < 0) {
      res = u.iadd(this.m);
    }

    return res._forceRed(this);
  };

  Mont.prototype.invm = function invm (a) {
    // (AR)^-1 * R^2 = (A^-1 * R^-1) * R^2 = A^-1 * R
    var res = this.imod(a._invmp(this.m).mul(this.r2));
    return res._forceRed(this);
  };
})(typeof module === 'undefined' || module, this);

},{"buffer":2}],81:[function(require,module,exports){
var r;

module.exports = function rand(len) {
  if (!r)
    r = new Rand(null);

  return r.generate(len);
};

function Rand(rand) {
  this.rand = rand;
}
module.exports.Rand = Rand;

Rand.prototype.generate = function generate(len) {
  return this._rand(len);
};

// Emulate crypto API using randy
Rand.prototype._rand = function _rand(n) {
  if (this.rand.getBytes)
    return this.rand.getBytes(n);

  var res = new Uint8Array(n);
  for (var i = 0; i < res.length; i++)
    res[i] = this.rand.getByte();
  return res;
};

if (typeof self === 'object') {
  if (self.crypto && self.crypto.getRandomValues) {
    // Modern browsers
    Rand.prototype._rand = function _rand(n) {
      var arr = new Uint8Array(n);
      self.crypto.getRandomValues(arr);
      return arr;
    };
  } else if (self.msCrypto && self.msCrypto.getRandomValues) {
    // IE
    Rand.prototype._rand = function _rand(n) {
      var arr = new Uint8Array(n);
      self.msCrypto.getRandomValues(arr);
      return arr;
    };

  // Safari's WebWorkers do not have `crypto`
  } else if (typeof window === 'object') {
    // Old junk
    Rand.prototype._rand = function() {
      throw new Error('Not implemented yet');
    };
  }
} else {
  // Node.js or Web worker with no crypto support
  try {
    var crypto = require('crypto');
    if (typeof crypto.randomBytes !== 'function')
      throw new Error('Not supported');

    Rand.prototype._rand = function _rand(n) {
      return crypto.randomBytes(n);
    };
  } catch (e) {
  }
}

},{"crypto":2}],82:[function(require,module,exports){
var global = typeof self !== 'undefined' ? self : this;
var __self__ = (function () {
function F() {
this.fetch = false;
this.DOMException = global.DOMException
}
F.prototype = global;
return new F();
})();
(function(self) {

var irrelevant = (function (exports) {

  var support = {
    searchParams: 'URLSearchParams' in self,
    iterable: 'Symbol' in self && 'iterator' in Symbol,
    blob:
      'FileReader' in self &&
      'Blob' in self &&
      (function() {
        try {
          new Blob();
          return true
        } catch (e) {
          return false
        }
      })(),
    formData: 'FormData' in self,
    arrayBuffer: 'ArrayBuffer' in self
  };

  function isDataView(obj) {
    return obj && DataView.prototype.isPrototypeOf(obj)
  }

  if (support.arrayBuffer) {
    var viewClasses = [
      '[object Int8Array]',
      '[object Uint8Array]',
      '[object Uint8ClampedArray]',
      '[object Int16Array]',
      '[object Uint16Array]',
      '[object Int32Array]',
      '[object Uint32Array]',
      '[object Float32Array]',
      '[object Float64Array]'
    ];

    var isArrayBufferView =
      ArrayBuffer.isView ||
      function(obj) {
        return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1
      };
  }

  function normalizeName(name) {
    if (typeof name !== 'string') {
      name = String(name);
    }
    if (/[^a-z0-9\-#$%&'*+.^_`|~]/i.test(name)) {
      throw new TypeError('Invalid character in header field name')
    }
    return name.toLowerCase()
  }

  function normalizeValue(value) {
    if (typeof value !== 'string') {
      value = String(value);
    }
    return value
  }

  // Build a destructive iterator for the value list
  function iteratorFor(items) {
    var iterator = {
      next: function() {
        var value = items.shift();
        return {done: value === undefined, value: value}
      }
    };

    if (support.iterable) {
      iterator[Symbol.iterator] = function() {
        return iterator
      };
    }

    return iterator
  }

  function Headers(headers) {
    this.map = {};

    if (headers instanceof Headers) {
      headers.forEach(function(value, name) {
        this.append(name, value);
      }, this);
    } else if (Array.isArray(headers)) {
      headers.forEach(function(header) {
        this.append(header[0], header[1]);
      }, this);
    } else if (headers) {
      Object.getOwnPropertyNames(headers).forEach(function(name) {
        this.append(name, headers[name]);
      }, this);
    }
  }

  Headers.prototype.append = function(name, value) {
    name = normalizeName(name);
    value = normalizeValue(value);
    var oldValue = this.map[name];
    this.map[name] = oldValue ? oldValue + ', ' + value : value;
  };

  Headers.prototype['delete'] = function(name) {
    delete this.map[normalizeName(name)];
  };

  Headers.prototype.get = function(name) {
    name = normalizeName(name);
    return this.has(name) ? this.map[name] : null
  };

  Headers.prototype.has = function(name) {
    return this.map.hasOwnProperty(normalizeName(name))
  };

  Headers.prototype.set = function(name, value) {
    this.map[normalizeName(name)] = normalizeValue(value);
  };

  Headers.prototype.forEach = function(callback, thisArg) {
    for (var name in this.map) {
      if (this.map.hasOwnProperty(name)) {
        callback.call(thisArg, this.map[name], name, this);
      }
    }
  };

  Headers.prototype.keys = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push(name);
    });
    return iteratorFor(items)
  };

  Headers.prototype.values = function() {
    var items = [];
    this.forEach(function(value) {
      items.push(value);
    });
    return iteratorFor(items)
  };

  Headers.prototype.entries = function() {
    var items = [];
    this.forEach(function(value, name) {
      items.push([name, value]);
    });
    return iteratorFor(items)
  };

  if (support.iterable) {
    Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
  }

  function consumed(body) {
    if (body.bodyUsed) {
      return Promise.reject(new TypeError('Already read'))
    }
    body.bodyUsed = true;
  }

  function fileReaderReady(reader) {
    return new Promise(function(resolve, reject) {
      reader.onload = function() {
        resolve(reader.result);
      };
      reader.onerror = function() {
        reject(reader.error);
      };
    })
  }

  function readBlobAsArrayBuffer(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsArrayBuffer(blob);
    return promise
  }

  function readBlobAsText(blob) {
    var reader = new FileReader();
    var promise = fileReaderReady(reader);
    reader.readAsText(blob);
    return promise
  }

  function readArrayBufferAsText(buf) {
    var view = new Uint8Array(buf);
    var chars = new Array(view.length);

    for (var i = 0; i < view.length; i++) {
      chars[i] = String.fromCharCode(view[i]);
    }
    return chars.join('')
  }

  function bufferClone(buf) {
    if (buf.slice) {
      return buf.slice(0)
    } else {
      var view = new Uint8Array(buf.byteLength);
      view.set(new Uint8Array(buf));
      return view.buffer
    }
  }

  function Body() {
    this.bodyUsed = false;

    this._initBody = function(body) {
      this._bodyInit = body;
      if (!body) {
        this._bodyText = '';
      } else if (typeof body === 'string') {
        this._bodyText = body;
      } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
        this._bodyBlob = body;
      } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
        this._bodyFormData = body;
      } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
        this._bodyText = body.toString();
      } else if (support.arrayBuffer && support.blob && isDataView(body)) {
        this._bodyArrayBuffer = bufferClone(body.buffer);
        // IE 10-11 can't handle a DataView body.
        this._bodyInit = new Blob([this._bodyArrayBuffer]);
      } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
        this._bodyArrayBuffer = bufferClone(body);
      } else {
        this._bodyText = body = Object.prototype.toString.call(body);
      }

      if (!this.headers.get('content-type')) {
        if (typeof body === 'string') {
          this.headers.set('content-type', 'text/plain;charset=UTF-8');
        } else if (this._bodyBlob && this._bodyBlob.type) {
          this.headers.set('content-type', this._bodyBlob.type);
        } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
          this.headers.set('content-type', 'application/x-www-form-urlencoded;charset=UTF-8');
        }
      }
    };

    if (support.blob) {
      this.blob = function() {
        var rejected = consumed(this);
        if (rejected) {
          return rejected
        }

        if (this._bodyBlob) {
          return Promise.resolve(this._bodyBlob)
        } else if (this._bodyArrayBuffer) {
          return Promise.resolve(new Blob([this._bodyArrayBuffer]))
        } else if (this._bodyFormData) {
          throw new Error('could not read FormData body as blob')
        } else {
          return Promise.resolve(new Blob([this._bodyText]))
        }
      };

      this.arrayBuffer = function() {
        if (this._bodyArrayBuffer) {
          return consumed(this) || Promise.resolve(this._bodyArrayBuffer)
        } else {
          return this.blob().then(readBlobAsArrayBuffer)
        }
      };
    }

    this.text = function() {
      var rejected = consumed(this);
      if (rejected) {
        return rejected
      }

      if (this._bodyBlob) {
        return readBlobAsText(this._bodyBlob)
      } else if (this._bodyArrayBuffer) {
        return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer))
      } else if (this._bodyFormData) {
        throw new Error('could not read FormData body as text')
      } else {
        return Promise.resolve(this._bodyText)
      }
    };

    if (support.formData) {
      this.formData = function() {
        return this.text().then(decode)
      };
    }

    this.json = function() {
      return this.text().then(JSON.parse)
    };

    return this
  }

  // HTTP methods whose capitalization should be normalized
  var methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'];

  function normalizeMethod(method) {
    var upcased = method.toUpperCase();
    return methods.indexOf(upcased) > -1 ? upcased : method
  }

  function Request(input, options) {
    options = options || {};
    var body = options.body;

    if (input instanceof Request) {
      if (input.bodyUsed) {
        throw new TypeError('Already read')
      }
      this.url = input.url;
      this.credentials = input.credentials;
      if (!options.headers) {
        this.headers = new Headers(input.headers);
      }
      this.method = input.method;
      this.mode = input.mode;
      this.signal = input.signal;
      if (!body && input._bodyInit != null) {
        body = input._bodyInit;
        input.bodyUsed = true;
      }
    } else {
      this.url = String(input);
    }

    this.credentials = options.credentials || this.credentials || 'same-origin';
    if (options.headers || !this.headers) {
      this.headers = new Headers(options.headers);
    }
    this.method = normalizeMethod(options.method || this.method || 'GET');
    this.mode = options.mode || this.mode || null;
    this.signal = options.signal || this.signal;
    this.referrer = null;

    if ((this.method === 'GET' || this.method === 'HEAD') && body) {
      throw new TypeError('Body not allowed for GET or HEAD requests')
    }
    this._initBody(body);
  }

  Request.prototype.clone = function() {
    return new Request(this, {body: this._bodyInit})
  };

  function decode(body) {
    var form = new FormData();
    body
      .trim()
      .split('&')
      .forEach(function(bytes) {
        if (bytes) {
          var split = bytes.split('=');
          var name = split.shift().replace(/\+/g, ' ');
          var value = split.join('=').replace(/\+/g, ' ');
          form.append(decodeURIComponent(name), decodeURIComponent(value));
        }
      });
    return form
  }

  function parseHeaders(rawHeaders) {
    var headers = new Headers();
    // Replace instances of \r\n and \n followed by at least one space or horizontal tab with a space
    // https://tools.ietf.org/html/rfc7230#section-3.2
    var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, ' ');
    preProcessedHeaders.split(/\r?\n/).forEach(function(line) {
      var parts = line.split(':');
      var key = parts.shift().trim();
      if (key) {
        var value = parts.join(':').trim();
        headers.append(key, value);
      }
    });
    return headers
  }

  Body.call(Request.prototype);

  function Response(bodyInit, options) {
    if (!options) {
      options = {};
    }

    this.type = 'default';
    this.status = options.status === undefined ? 200 : options.status;
    this.ok = this.status >= 200 && this.status < 300;
    this.statusText = 'statusText' in options ? options.statusText : 'OK';
    this.headers = new Headers(options.headers);
    this.url = options.url || '';
    this._initBody(bodyInit);
  }

  Body.call(Response.prototype);

  Response.prototype.clone = function() {
    return new Response(this._bodyInit, {
      status: this.status,
      statusText: this.statusText,
      headers: new Headers(this.headers),
      url: this.url
    })
  };

  Response.error = function() {
    var response = new Response(null, {status: 0, statusText: ''});
    response.type = 'error';
    return response
  };

  var redirectStatuses = [301, 302, 303, 307, 308];

  Response.redirect = function(url, status) {
    if (redirectStatuses.indexOf(status) === -1) {
      throw new RangeError('Invalid status code')
    }

    return new Response(null, {status: status, headers: {location: url}})
  };

  exports.DOMException = self.DOMException;
  try {
    new exports.DOMException();
  } catch (err) {
    exports.DOMException = function(message, name) {
      this.message = message;
      this.name = name;
      var error = Error(message);
      this.stack = error.stack;
    };
    exports.DOMException.prototype = Object.create(Error.prototype);
    exports.DOMException.prototype.constructor = exports.DOMException;
  }

  function fetch(input, init) {
    return new Promise(function(resolve, reject) {
      var request = new Request(input, init);

      if (request.signal && request.signal.aborted) {
        return reject(new exports.DOMException('Aborted', 'AbortError'))
      }

      var xhr = new XMLHttpRequest();

      function abortXhr() {
        xhr.abort();
      }

      xhr.onload = function() {
        var options = {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: parseHeaders(xhr.getAllResponseHeaders() || '')
        };
        options.url = 'responseURL' in xhr ? xhr.responseURL : options.headers.get('X-Request-URL');
        var body = 'response' in xhr ? xhr.response : xhr.responseText;
        resolve(new Response(body, options));
      };

      xhr.onerror = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.ontimeout = function() {
        reject(new TypeError('Network request failed'));
      };

      xhr.onabort = function() {
        reject(new exports.DOMException('Aborted', 'AbortError'));
      };

      xhr.open(request.method, request.url, true);

      if (request.credentials === 'include') {
        xhr.withCredentials = true;
      } else if (request.credentials === 'omit') {
        xhr.withCredentials = false;
      }

      if ('responseType' in xhr && support.blob) {
        xhr.responseType = 'blob';
      }

      request.headers.forEach(function(value, name) {
        xhr.setRequestHeader(name, value);
      });

      if (request.signal) {
        request.signal.addEventListener('abort', abortXhr);

        xhr.onreadystatechange = function() {
          // DONE (success or failure)
          if (xhr.readyState === 4) {
            request.signal.removeEventListener('abort', abortXhr);
          }
        };
      }

      xhr.send(typeof request._bodyInit === 'undefined' ? null : request._bodyInit);
    })
  }

  fetch.polyfill = true;

  if (!self.fetch) {
    self.fetch = fetch;
    self.Headers = Headers;
    self.Request = Request;
    self.Response = Response;
  }

  exports.Headers = Headers;
  exports.Request = Request;
  exports.Response = Response;
  exports.fetch = fetch;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
})(__self__);
__self__.fetch.ponyfill = true;
// Remove "polyfill" property added by whatwg-fetch
delete __self__.fetch.polyfill;
// Choose between native implementation (global) or custom implementation (__self__)
// var ctx = global.fetch ? global : __self__;
var ctx = __self__; // this line disable service worker support temporarily
exports = ctx.fetch // To enable: import fetch from 'cross-fetch'
exports.default = ctx.fetch // For TypeScript consumers without esModuleInterop.
exports.fetch = ctx.fetch // To enable: import {fetch} from 'cross-fetch'
exports.Headers = ctx.Headers
exports.Request = ctx.Request
exports.Response = ctx.Response
module.exports = exports

},{}],83:[function(require,module,exports){
'use strict';

var elliptic = exports;

elliptic.version = require('../package.json').version;
elliptic.utils = require('./elliptic/utils');
elliptic.rand = require('brorand');
elliptic.curve = require('./elliptic/curve');
elliptic.curves = require('./elliptic/curves');

// Protocols
elliptic.ec = require('./elliptic/ec');
elliptic.eddsa = require('./elliptic/eddsa');

},{"../package.json":98,"./elliptic/curve":86,"./elliptic/curves":89,"./elliptic/ec":90,"./elliptic/eddsa":93,"./elliptic/utils":97,"brorand":81}],84:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var utils = require('../utils');
var getNAF = utils.getNAF;
var getJSF = utils.getJSF;
var assert = utils.assert;

function BaseCurve(type, conf) {
  this.type = type;
  this.p = new BN(conf.p, 16);

  // Use Montgomery, when there is no fast reduction for the prime
  this.red = conf.prime ? BN.red(conf.prime) : BN.mont(this.p);

  // Useful for many curves
  this.zero = new BN(0).toRed(this.red);
  this.one = new BN(1).toRed(this.red);
  this.two = new BN(2).toRed(this.red);

  // Curve configuration, optional
  this.n = conf.n && new BN(conf.n, 16);
  this.g = conf.g && this.pointFromJSON(conf.g, conf.gRed);

  // Temporary arrays
  this._wnafT1 = new Array(4);
  this._wnafT2 = new Array(4);
  this._wnafT3 = new Array(4);
  this._wnafT4 = new Array(4);

  this._bitLength = this.n ? this.n.bitLength() : 0;

  // Generalized Greg Maxwell's trick
  var adjustCount = this.n && this.p.div(this.n);
  if (!adjustCount || adjustCount.cmpn(100) > 0) {
    this.redN = null;
  } else {
    this._maxwellTrick = true;
    this.redN = this.n.toRed(this.red);
  }
}
module.exports = BaseCurve;

BaseCurve.prototype.point = function point() {
  throw new Error('Not implemented');
};

BaseCurve.prototype.validate = function validate() {
  throw new Error('Not implemented');
};

BaseCurve.prototype._fixedNafMul = function _fixedNafMul(p, k) {
  assert(p.precomputed);
  var doubles = p._getDoubles();

  var naf = getNAF(k, 1, this._bitLength);
  var I = (1 << (doubles.step + 1)) - (doubles.step % 2 === 0 ? 2 : 1);
  I /= 3;

  // Translate into more windowed form
  var repr = [];
  var j;
  var nafW;
  for (j = 0; j < naf.length; j += doubles.step) {
    nafW = 0;
    for (var l = j + doubles.step - 1; l >= j; l--)
      nafW = (nafW << 1) + naf[l];
    repr.push(nafW);
  }

  var a = this.jpoint(null, null, null);
  var b = this.jpoint(null, null, null);
  for (var i = I; i > 0; i--) {
    for (j = 0; j < repr.length; j++) {
      nafW = repr[j];
      if (nafW === i)
        b = b.mixedAdd(doubles.points[j]);
      else if (nafW === -i)
        b = b.mixedAdd(doubles.points[j].neg());
    }
    a = a.add(b);
  }
  return a.toP();
};

BaseCurve.prototype._wnafMul = function _wnafMul(p, k) {
  var w = 4;

  // Precompute window
  var nafPoints = p._getNAFPoints(w);
  w = nafPoints.wnd;
  var wnd = nafPoints.points;

  // Get NAF form
  var naf = getNAF(k, w, this._bitLength);

  // Add `this`*(N+1) for every w-NAF index
  var acc = this.jpoint(null, null, null);
  for (var i = naf.length - 1; i >= 0; i--) {
    // Count zeroes
    for (var l = 0; i >= 0 && naf[i] === 0; i--)
      l++;
    if (i >= 0)
      l++;
    acc = acc.dblp(l);

    if (i < 0)
      break;
    var z = naf[i];
    assert(z !== 0);
    if (p.type === 'affine') {
      // J +- P
      if (z > 0)
        acc = acc.mixedAdd(wnd[(z - 1) >> 1]);
      else
        acc = acc.mixedAdd(wnd[(-z - 1) >> 1].neg());
    } else {
      // J +- J
      if (z > 0)
        acc = acc.add(wnd[(z - 1) >> 1]);
      else
        acc = acc.add(wnd[(-z - 1) >> 1].neg());
    }
  }
  return p.type === 'affine' ? acc.toP() : acc;
};

BaseCurve.prototype._wnafMulAdd = function _wnafMulAdd(defW,
  points,
  coeffs,
  len,
  jacobianResult) {
  var wndWidth = this._wnafT1;
  var wnd = this._wnafT2;
  var naf = this._wnafT3;

  // Fill all arrays
  var max = 0;
  var i;
  var j;
  var p;
  for (i = 0; i < len; i++) {
    p = points[i];
    var nafPoints = p._getNAFPoints(defW);
    wndWidth[i] = nafPoints.wnd;
    wnd[i] = nafPoints.points;
  }

  // Comb small window NAFs
  for (i = len - 1; i >= 1; i -= 2) {
    var a = i - 1;
    var b = i;
    if (wndWidth[a] !== 1 || wndWidth[b] !== 1) {
      naf[a] = getNAF(coeffs[a], wndWidth[a], this._bitLength);
      naf[b] = getNAF(coeffs[b], wndWidth[b], this._bitLength);
      max = Math.max(naf[a].length, max);
      max = Math.max(naf[b].length, max);
      continue;
    }

    var comb = [
      points[a], /* 1 */
      null, /* 3 */
      null, /* 5 */
      points[b], /* 7 */
    ];

    // Try to avoid Projective points, if possible
    if (points[a].y.cmp(points[b].y) === 0) {
      comb[1] = points[a].add(points[b]);
      comb[2] = points[a].toJ().mixedAdd(points[b].neg());
    } else if (points[a].y.cmp(points[b].y.redNeg()) === 0) {
      comb[1] = points[a].toJ().mixedAdd(points[b]);
      comb[2] = points[a].add(points[b].neg());
    } else {
      comb[1] = points[a].toJ().mixedAdd(points[b]);
      comb[2] = points[a].toJ().mixedAdd(points[b].neg());
    }

    var index = [
      -3, /* -1 -1 */
      -1, /* -1 0 */
      -5, /* -1 1 */
      -7, /* 0 -1 */
      0, /* 0 0 */
      7, /* 0 1 */
      5, /* 1 -1 */
      1, /* 1 0 */
      3,  /* 1 1 */
    ];

    var jsf = getJSF(coeffs[a], coeffs[b]);
    max = Math.max(jsf[0].length, max);
    naf[a] = new Array(max);
    naf[b] = new Array(max);
    for (j = 0; j < max; j++) {
      var ja = jsf[0][j] | 0;
      var jb = jsf[1][j] | 0;

      naf[a][j] = index[(ja + 1) * 3 + (jb + 1)];
      naf[b][j] = 0;
      wnd[a] = comb;
    }
  }

  var acc = this.jpoint(null, null, null);
  var tmp = this._wnafT4;
  for (i = max; i >= 0; i--) {
    var k = 0;

    while (i >= 0) {
      var zero = true;
      for (j = 0; j < len; j++) {
        tmp[j] = naf[j][i] | 0;
        if (tmp[j] !== 0)
          zero = false;
      }
      if (!zero)
        break;
      k++;
      i--;
    }
    if (i >= 0)
      k++;
    acc = acc.dblp(k);
    if (i < 0)
      break;

    for (j = 0; j < len; j++) {
      var z = tmp[j];
      p;
      if (z === 0)
        continue;
      else if (z > 0)
        p = wnd[j][(z - 1) >> 1];
      else if (z < 0)
        p = wnd[j][(-z - 1) >> 1].neg();

      if (p.type === 'affine')
        acc = acc.mixedAdd(p);
      else
        acc = acc.add(p);
    }
  }
  // Zeroify references
  for (i = 0; i < len; i++)
    wnd[i] = null;

  if (jacobianResult)
    return acc;
  else
    return acc.toP();
};

function BasePoint(curve, type) {
  this.curve = curve;
  this.type = type;
  this.precomputed = null;
}
BaseCurve.BasePoint = BasePoint;

BasePoint.prototype.eq = function eq(/*other*/) {
  throw new Error('Not implemented');
};

BasePoint.prototype.validate = function validate() {
  return this.curve.validate(this);
};

BaseCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
  bytes = utils.toArray(bytes, enc);

  var len = this.p.byteLength();

  // uncompressed, hybrid-odd, hybrid-even
  if ((bytes[0] === 0x04 || bytes[0] === 0x06 || bytes[0] === 0x07) &&
      bytes.length - 1 === 2 * len) {
    if (bytes[0] === 0x06)
      assert(bytes[bytes.length - 1] % 2 === 0);
    else if (bytes[0] === 0x07)
      assert(bytes[bytes.length - 1] % 2 === 1);

    var res =  this.point(bytes.slice(1, 1 + len),
      bytes.slice(1 + len, 1 + 2 * len));

    return res;
  } else if ((bytes[0] === 0x02 || bytes[0] === 0x03) &&
              bytes.length - 1 === len) {
    return this.pointFromX(bytes.slice(1, 1 + len), bytes[0] === 0x03);
  }
  throw new Error('Unknown point format');
};

BasePoint.prototype.encodeCompressed = function encodeCompressed(enc) {
  return this.encode(enc, true);
};

BasePoint.prototype._encode = function _encode(compact) {
  var len = this.curve.p.byteLength();
  var x = this.getX().toArray('be', len);

  if (compact)
    return [ this.getY().isEven() ? 0x02 : 0x03 ].concat(x);

  return [ 0x04 ].concat(x, this.getY().toArray('be', len));
};

BasePoint.prototype.encode = function encode(enc, compact) {
  return utils.encode(this._encode(compact), enc);
};

BasePoint.prototype.precompute = function precompute(power) {
  if (this.precomputed)
    return this;

  var precomputed = {
    doubles: null,
    naf: null,
    beta: null,
  };
  precomputed.naf = this._getNAFPoints(8);
  precomputed.doubles = this._getDoubles(4, power);
  precomputed.beta = this._getBeta();
  this.precomputed = precomputed;

  return this;
};

BasePoint.prototype._hasDoubles = function _hasDoubles(k) {
  if (!this.precomputed)
    return false;

  var doubles = this.precomputed.doubles;
  if (!doubles)
    return false;

  return doubles.points.length >= Math.ceil((k.bitLength() + 1) / doubles.step);
};

BasePoint.prototype._getDoubles = function _getDoubles(step, power) {
  if (this.precomputed && this.precomputed.doubles)
    return this.precomputed.doubles;

  var doubles = [ this ];
  var acc = this;
  for (var i = 0; i < power; i += step) {
    for (var j = 0; j < step; j++)
      acc = acc.dbl();
    doubles.push(acc);
  }
  return {
    step: step,
    points: doubles,
  };
};

BasePoint.prototype._getNAFPoints = function _getNAFPoints(wnd) {
  if (this.precomputed && this.precomputed.naf)
    return this.precomputed.naf;

  var res = [ this ];
  var max = (1 << wnd) - 1;
  var dbl = max === 1 ? null : this.dbl();
  for (var i = 1; i < max; i++)
    res[i] = res[i - 1].add(dbl);
  return {
    wnd: wnd,
    points: res,
  };
};

BasePoint.prototype._getBeta = function _getBeta() {
  return null;
};

BasePoint.prototype.dblp = function dblp(k) {
  var r = this;
  for (var i = 0; i < k; i++)
    r = r.dbl();
  return r;
};

},{"../utils":97,"bn.js":80}],85:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var BN = require('bn.js');
var inherits = require('inherits');
var Base = require('./base');

var assert = utils.assert;

function EdwardsCurve(conf) {
  // NOTE: Important as we are creating point in Base.call()
  this.twisted = (conf.a | 0) !== 1;
  this.mOneA = this.twisted && (conf.a | 0) === -1;
  this.extended = this.mOneA;

  Base.call(this, 'edwards', conf);

  this.a = new BN(conf.a, 16).umod(this.red.m);
  this.a = this.a.toRed(this.red);
  this.c = new BN(conf.c, 16).toRed(this.red);
  this.c2 = this.c.redSqr();
  this.d = new BN(conf.d, 16).toRed(this.red);
  this.dd = this.d.redAdd(this.d);

  assert(!this.twisted || this.c.fromRed().cmpn(1) === 0);
  this.oneC = (conf.c | 0) === 1;
}
inherits(EdwardsCurve, Base);
module.exports = EdwardsCurve;

EdwardsCurve.prototype._mulA = function _mulA(num) {
  if (this.mOneA)
    return num.redNeg();
  else
    return this.a.redMul(num);
};

EdwardsCurve.prototype._mulC = function _mulC(num) {
  if (this.oneC)
    return num;
  else
    return this.c.redMul(num);
};

// Just for compatibility with Short curve
EdwardsCurve.prototype.jpoint = function jpoint(x, y, z, t) {
  return this.point(x, y, z, t);
};

EdwardsCurve.prototype.pointFromX = function pointFromX(x, odd) {
  x = new BN(x, 16);
  if (!x.red)
    x = x.toRed(this.red);

  var x2 = x.redSqr();
  var rhs = this.c2.redSub(this.a.redMul(x2));
  var lhs = this.one.redSub(this.c2.redMul(this.d).redMul(x2));

  var y2 = rhs.redMul(lhs.redInvm());
  var y = y2.redSqrt();
  if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  var isOdd = y.fromRed().isOdd();
  if (odd && !isOdd || !odd && isOdd)
    y = y.redNeg();

  return this.point(x, y);
};

EdwardsCurve.prototype.pointFromY = function pointFromY(y, odd) {
  y = new BN(y, 16);
  if (!y.red)
    y = y.toRed(this.red);

  // x^2 = (y^2 - c^2) / (c^2 d y^2 - a)
  var y2 = y.redSqr();
  var lhs = y2.redSub(this.c2);
  var rhs = y2.redMul(this.d).redMul(this.c2).redSub(this.a);
  var x2 = lhs.redMul(rhs.redInvm());

  if (x2.cmp(this.zero) === 0) {
    if (odd)
      throw new Error('invalid point');
    else
      return this.point(this.zero, y);
  }

  var x = x2.redSqrt();
  if (x.redSqr().redSub(x2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  if (x.fromRed().isOdd() !== odd)
    x = x.redNeg();

  return this.point(x, y);
};

EdwardsCurve.prototype.validate = function validate(point) {
  if (point.isInfinity())
    return true;

  // Curve: A * X^2 + Y^2 = C^2 * (1 + D * X^2 * Y^2)
  point.normalize();

  var x2 = point.x.redSqr();
  var y2 = point.y.redSqr();
  var lhs = x2.redMul(this.a).redAdd(y2);
  var rhs = this.c2.redMul(this.one.redAdd(this.d.redMul(x2).redMul(y2)));

  return lhs.cmp(rhs) === 0;
};

function Point(curve, x, y, z, t) {
  Base.BasePoint.call(this, curve, 'projective');
  if (x === null && y === null && z === null) {
    this.x = this.curve.zero;
    this.y = this.curve.one;
    this.z = this.curve.one;
    this.t = this.curve.zero;
    this.zOne = true;
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    this.z = z ? new BN(z, 16) : this.curve.one;
    this.t = t && new BN(t, 16);
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.y.red)
      this.y = this.y.toRed(this.curve.red);
    if (!this.z.red)
      this.z = this.z.toRed(this.curve.red);
    if (this.t && !this.t.red)
      this.t = this.t.toRed(this.curve.red);
    this.zOne = this.z === this.curve.one;

    // Use extended coordinates
    if (this.curve.extended && !this.t) {
      this.t = this.x.redMul(this.y);
      if (!this.zOne)
        this.t = this.t.redMul(this.z.redInvm());
    }
  }
}
inherits(Point, Base.BasePoint);

EdwardsCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
  return Point.fromJSON(this, obj);
};

EdwardsCurve.prototype.point = function point(x, y, z, t) {
  return new Point(this, x, y, z, t);
};

Point.fromJSON = function fromJSON(curve, obj) {
  return new Point(curve, obj[0], obj[1], obj[2]);
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' y: ' + this.y.fromRed().toString(16, 2) +
      ' z: ' + this.z.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.x.cmpn(0) === 0 &&
    (this.y.cmp(this.z) === 0 ||
    (this.zOne && this.y.cmp(this.curve.c) === 0));
};

Point.prototype._extDbl = function _extDbl() {
  // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
  //     #doubling-dbl-2008-hwcd
  // 4M + 4S

  // A = X1^2
  var a = this.x.redSqr();
  // B = Y1^2
  var b = this.y.redSqr();
  // C = 2 * Z1^2
  var c = this.z.redSqr();
  c = c.redIAdd(c);
  // D = a * A
  var d = this.curve._mulA(a);
  // E = (X1 + Y1)^2 - A - B
  var e = this.x.redAdd(this.y).redSqr().redISub(a).redISub(b);
  // G = D + B
  var g = d.redAdd(b);
  // F = G - C
  var f = g.redSub(c);
  // H = D - B
  var h = d.redSub(b);
  // X3 = E * F
  var nx = e.redMul(f);
  // Y3 = G * H
  var ny = g.redMul(h);
  // T3 = E * H
  var nt = e.redMul(h);
  // Z3 = F * G
  var nz = f.redMul(g);
  return this.curve.point(nx, ny, nz, nt);
};

Point.prototype._projDbl = function _projDbl() {
  // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
  //     #doubling-dbl-2008-bbjlp
  //     #doubling-dbl-2007-bl
  // and others
  // Generally 3M + 4S or 2M + 4S

  // B = (X1 + Y1)^2
  var b = this.x.redAdd(this.y).redSqr();
  // C = X1^2
  var c = this.x.redSqr();
  // D = Y1^2
  var d = this.y.redSqr();

  var nx;
  var ny;
  var nz;
  var e;
  var h;
  var j;
  if (this.curve.twisted) {
    // E = a * C
    e = this.curve._mulA(c);
    // F = E + D
    var f = e.redAdd(d);
    if (this.zOne) {
      // X3 = (B - C - D) * (F - 2)
      nx = b.redSub(c).redSub(d).redMul(f.redSub(this.curve.two));
      // Y3 = F * (E - D)
      ny = f.redMul(e.redSub(d));
      // Z3 = F^2 - 2 * F
      nz = f.redSqr().redSub(f).redSub(f);
    } else {
      // H = Z1^2
      h = this.z.redSqr();
      // J = F - 2 * H
      j = f.redSub(h).redISub(h);
      // X3 = (B-C-D)*J
      nx = b.redSub(c).redISub(d).redMul(j);
      // Y3 = F * (E - D)
      ny = f.redMul(e.redSub(d));
      // Z3 = F * J
      nz = f.redMul(j);
    }
  } else {
    // E = C + D
    e = c.redAdd(d);
    // H = (c * Z1)^2
    h = this.curve._mulC(this.z).redSqr();
    // J = E - 2 * H
    j = e.redSub(h).redSub(h);
    // X3 = c * (B - E) * J
    nx = this.curve._mulC(b.redISub(e)).redMul(j);
    // Y3 = c * E * (C - D)
    ny = this.curve._mulC(e).redMul(c.redISub(d));
    // Z3 = E * J
    nz = e.redMul(j);
  }
  return this.curve.point(nx, ny, nz);
};

Point.prototype.dbl = function dbl() {
  if (this.isInfinity())
    return this;

  // Double in extended coordinates
  if (this.curve.extended)
    return this._extDbl();
  else
    return this._projDbl();
};

Point.prototype._extAdd = function _extAdd(p) {
  // hyperelliptic.org/EFD/g1p/auto-twisted-extended-1.html
  //     #addition-add-2008-hwcd-3
  // 8M

  // A = (Y1 - X1) * (Y2 - X2)
  var a = this.y.redSub(this.x).redMul(p.y.redSub(p.x));
  // B = (Y1 + X1) * (Y2 + X2)
  var b = this.y.redAdd(this.x).redMul(p.y.redAdd(p.x));
  // C = T1 * k * T2
  var c = this.t.redMul(this.curve.dd).redMul(p.t);
  // D = Z1 * 2 * Z2
  var d = this.z.redMul(p.z.redAdd(p.z));
  // E = B - A
  var e = b.redSub(a);
  // F = D - C
  var f = d.redSub(c);
  // G = D + C
  var g = d.redAdd(c);
  // H = B + A
  var h = b.redAdd(a);
  // X3 = E * F
  var nx = e.redMul(f);
  // Y3 = G * H
  var ny = g.redMul(h);
  // T3 = E * H
  var nt = e.redMul(h);
  // Z3 = F * G
  var nz = f.redMul(g);
  return this.curve.point(nx, ny, nz, nt);
};

Point.prototype._projAdd = function _projAdd(p) {
  // hyperelliptic.org/EFD/g1p/auto-twisted-projective.html
  //     #addition-add-2008-bbjlp
  //     #addition-add-2007-bl
  // 10M + 1S

  // A = Z1 * Z2
  var a = this.z.redMul(p.z);
  // B = A^2
  var b = a.redSqr();
  // C = X1 * X2
  var c = this.x.redMul(p.x);
  // D = Y1 * Y2
  var d = this.y.redMul(p.y);
  // E = d * C * D
  var e = this.curve.d.redMul(c).redMul(d);
  // F = B - E
  var f = b.redSub(e);
  // G = B + E
  var g = b.redAdd(e);
  // X3 = A * F * ((X1 + Y1) * (X2 + Y2) - C - D)
  var tmp = this.x.redAdd(this.y).redMul(p.x.redAdd(p.y)).redISub(c).redISub(d);
  var nx = a.redMul(f).redMul(tmp);
  var ny;
  var nz;
  if (this.curve.twisted) {
    // Y3 = A * G * (D - a * C)
    ny = a.redMul(g).redMul(d.redSub(this.curve._mulA(c)));
    // Z3 = F * G
    nz = f.redMul(g);
  } else {
    // Y3 = A * G * (D - C)
    ny = a.redMul(g).redMul(d.redSub(c));
    // Z3 = c * F * G
    nz = this.curve._mulC(f).redMul(g);
  }
  return this.curve.point(nx, ny, nz);
};

Point.prototype.add = function add(p) {
  if (this.isInfinity())
    return p;
  if (p.isInfinity())
    return this;

  if (this.curve.extended)
    return this._extAdd(p);
  else
    return this._projAdd(p);
};

Point.prototype.mul = function mul(k) {
  if (this._hasDoubles(k))
    return this.curve._fixedNafMul(this, k);
  else
    return this.curve._wnafMul(this, k);
};

Point.prototype.mulAdd = function mulAdd(k1, p, k2) {
  return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, false);
};

Point.prototype.jmulAdd = function jmulAdd(k1, p, k2) {
  return this.curve._wnafMulAdd(1, [ this, p ], [ k1, k2 ], 2, true);
};

Point.prototype.normalize = function normalize() {
  if (this.zOne)
    return this;

  // Normalize coordinates
  var zi = this.z.redInvm();
  this.x = this.x.redMul(zi);
  this.y = this.y.redMul(zi);
  if (this.t)
    this.t = this.t.redMul(zi);
  this.z = this.curve.one;
  this.zOne = true;
  return this;
};

Point.prototype.neg = function neg() {
  return this.curve.point(this.x.redNeg(),
    this.y,
    this.z,
    this.t && this.t.redNeg());
};

Point.prototype.getX = function getX() {
  this.normalize();
  return this.x.fromRed();
};

Point.prototype.getY = function getY() {
  this.normalize();
  return this.y.fromRed();
};

Point.prototype.eq = function eq(other) {
  return this === other ||
         this.getX().cmp(other.getX()) === 0 &&
         this.getY().cmp(other.getY()) === 0;
};

Point.prototype.eqXToP = function eqXToP(x) {
  var rx = x.toRed(this.curve.red).redMul(this.z);
  if (this.x.cmp(rx) === 0)
    return true;

  var xc = x.clone();
  var t = this.curve.redN.redMul(this.z);
  for (;;) {
    xc.iadd(this.curve.n);
    if (xc.cmp(this.curve.p) >= 0)
      return false;

    rx.redIAdd(t);
    if (this.x.cmp(rx) === 0)
      return true;
  }
};

// Compatibility with BaseCurve
Point.prototype.toP = Point.prototype.normalize;
Point.prototype.mixedAdd = Point.prototype.add;

},{"../utils":97,"./base":84,"bn.js":80,"inherits":112}],86:[function(require,module,exports){
'use strict';

var curve = exports;

curve.base = require('./base');
curve.short = require('./short');
curve.mont = require('./mont');
curve.edwards = require('./edwards');

},{"./base":84,"./edwards":85,"./mont":87,"./short":88}],87:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var inherits = require('inherits');
var Base = require('./base');

var utils = require('../utils');

function MontCurve(conf) {
  Base.call(this, 'mont', conf);

  this.a = new BN(conf.a, 16).toRed(this.red);
  this.b = new BN(conf.b, 16).toRed(this.red);
  this.i4 = new BN(4).toRed(this.red).redInvm();
  this.two = new BN(2).toRed(this.red);
  this.a24 = this.i4.redMul(this.a.redAdd(this.two));
}
inherits(MontCurve, Base);
module.exports = MontCurve;

MontCurve.prototype.validate = function validate(point) {
  var x = point.normalize().x;
  var x2 = x.redSqr();
  var rhs = x2.redMul(x).redAdd(x2.redMul(this.a)).redAdd(x);
  var y = rhs.redSqrt();

  return y.redSqr().cmp(rhs) === 0;
};

function Point(curve, x, z) {
  Base.BasePoint.call(this, curve, 'projective');
  if (x === null && z === null) {
    this.x = this.curve.one;
    this.z = this.curve.zero;
  } else {
    this.x = new BN(x, 16);
    this.z = new BN(z, 16);
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.z.red)
      this.z = this.z.toRed(this.curve.red);
  }
}
inherits(Point, Base.BasePoint);

MontCurve.prototype.decodePoint = function decodePoint(bytes, enc) {
  return this.point(utils.toArray(bytes, enc), 1);
};

MontCurve.prototype.point = function point(x, z) {
  return new Point(this, x, z);
};

MontCurve.prototype.pointFromJSON = function pointFromJSON(obj) {
  return Point.fromJSON(this, obj);
};

Point.prototype.precompute = function precompute() {
  // No-op
};

Point.prototype._encode = function _encode() {
  return this.getX().toArray('be', this.curve.p.byteLength());
};

Point.fromJSON = function fromJSON(curve, obj) {
  return new Point(curve, obj[0], obj[1] || curve.one);
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' z: ' + this.z.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.z.cmpn(0) === 0;
};

Point.prototype.dbl = function dbl() {
  // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#doubling-dbl-1987-m-3
  // 2M + 2S + 4A

  // A = X1 + Z1
  var a = this.x.redAdd(this.z);
  // AA = A^2
  var aa = a.redSqr();
  // B = X1 - Z1
  var b = this.x.redSub(this.z);
  // BB = B^2
  var bb = b.redSqr();
  // C = AA - BB
  var c = aa.redSub(bb);
  // X3 = AA * BB
  var nx = aa.redMul(bb);
  // Z3 = C * (BB + A24 * C)
  var nz = c.redMul(bb.redAdd(this.curve.a24.redMul(c)));
  return this.curve.point(nx, nz);
};

Point.prototype.add = function add() {
  throw new Error('Not supported on Montgomery curve');
};

Point.prototype.diffAdd = function diffAdd(p, diff) {
  // http://hyperelliptic.org/EFD/g1p/auto-montgom-xz.html#diffadd-dadd-1987-m-3
  // 4M + 2S + 6A

  // A = X2 + Z2
  var a = this.x.redAdd(this.z);
  // B = X2 - Z2
  var b = this.x.redSub(this.z);
  // C = X3 + Z3
  var c = p.x.redAdd(p.z);
  // D = X3 - Z3
  var d = p.x.redSub(p.z);
  // DA = D * A
  var da = d.redMul(a);
  // CB = C * B
  var cb = c.redMul(b);
  // X5 = Z1 * (DA + CB)^2
  var nx = diff.z.redMul(da.redAdd(cb).redSqr());
  // Z5 = X1 * (DA - CB)^2
  var nz = diff.x.redMul(da.redISub(cb).redSqr());
  return this.curve.point(nx, nz);
};

Point.prototype.mul = function mul(k) {
  var t = k.clone();
  var a = this; // (N / 2) * Q + Q
  var b = this.curve.point(null, null); // (N / 2) * Q
  var c = this; // Q

  for (var bits = []; t.cmpn(0) !== 0; t.iushrn(1))
    bits.push(t.andln(1));

  for (var i = bits.length - 1; i >= 0; i--) {
    if (bits[i] === 0) {
      // N * Q + Q = ((N / 2) * Q + Q)) + (N / 2) * Q
      a = a.diffAdd(b, c);
      // N * Q = 2 * ((N / 2) * Q + Q))
      b = b.dbl();
    } else {
      // N * Q = ((N / 2) * Q + Q) + ((N / 2) * Q)
      b = a.diffAdd(b, c);
      // N * Q + Q = 2 * ((N / 2) * Q + Q)
      a = a.dbl();
    }
  }
  return b;
};

Point.prototype.mulAdd = function mulAdd() {
  throw new Error('Not supported on Montgomery curve');
};

Point.prototype.jumlAdd = function jumlAdd() {
  throw new Error('Not supported on Montgomery curve');
};

Point.prototype.eq = function eq(other) {
  return this.getX().cmp(other.getX()) === 0;
};

Point.prototype.normalize = function normalize() {
  this.x = this.x.redMul(this.z.redInvm());
  this.z = this.curve.one;
  return this;
};

Point.prototype.getX = function getX() {
  // Normalize coordinates
  this.normalize();

  return this.x.fromRed();
};

},{"../utils":97,"./base":84,"bn.js":80,"inherits":112}],88:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var BN = require('bn.js');
var inherits = require('inherits');
var Base = require('./base');

var assert = utils.assert;

function ShortCurve(conf) {
  Base.call(this, 'short', conf);

  this.a = new BN(conf.a, 16).toRed(this.red);
  this.b = new BN(conf.b, 16).toRed(this.red);
  this.tinv = this.two.redInvm();

  this.zeroA = this.a.fromRed().cmpn(0) === 0;
  this.threeA = this.a.fromRed().sub(this.p).cmpn(-3) === 0;

  // If the curve is endomorphic, precalculate beta and lambda
  this.endo = this._getEndomorphism(conf);
  this._endoWnafT1 = new Array(4);
  this._endoWnafT2 = new Array(4);
}
inherits(ShortCurve, Base);
module.exports = ShortCurve;

ShortCurve.prototype._getEndomorphism = function _getEndomorphism(conf) {
  // No efficient endomorphism
  if (!this.zeroA || !this.g || !this.n || this.p.modn(3) !== 1)
    return;

  // Compute beta and lambda, that lambda * P = (beta * Px; Py)
  var beta;
  var lambda;
  if (conf.beta) {
    beta = new BN(conf.beta, 16).toRed(this.red);
  } else {
    var betas = this._getEndoRoots(this.p);
    // Choose the smallest beta
    beta = betas[0].cmp(betas[1]) < 0 ? betas[0] : betas[1];
    beta = beta.toRed(this.red);
  }
  if (conf.lambda) {
    lambda = new BN(conf.lambda, 16);
  } else {
    // Choose the lambda that is matching selected beta
    var lambdas = this._getEndoRoots(this.n);
    if (this.g.mul(lambdas[0]).x.cmp(this.g.x.redMul(beta)) === 0) {
      lambda = lambdas[0];
    } else {
      lambda = lambdas[1];
      assert(this.g.mul(lambda).x.cmp(this.g.x.redMul(beta)) === 0);
    }
  }

  // Get basis vectors, used for balanced length-two representation
  var basis;
  if (conf.basis) {
    basis = conf.basis.map(function(vec) {
      return {
        a: new BN(vec.a, 16),
        b: new BN(vec.b, 16),
      };
    });
  } else {
    basis = this._getEndoBasis(lambda);
  }

  return {
    beta: beta,
    lambda: lambda,
    basis: basis,
  };
};

ShortCurve.prototype._getEndoRoots = function _getEndoRoots(num) {
  // Find roots of for x^2 + x + 1 in F
  // Root = (-1 +- Sqrt(-3)) / 2
  //
  var red = num === this.p ? this.red : BN.mont(num);
  var tinv = new BN(2).toRed(red).redInvm();
  var ntinv = tinv.redNeg();

  var s = new BN(3).toRed(red).redNeg().redSqrt().redMul(tinv);

  var l1 = ntinv.redAdd(s).fromRed();
  var l2 = ntinv.redSub(s).fromRed();
  return [ l1, l2 ];
};

ShortCurve.prototype._getEndoBasis = function _getEndoBasis(lambda) {
  // aprxSqrt >= sqrt(this.n)
  var aprxSqrt = this.n.ushrn(Math.floor(this.n.bitLength() / 2));

  // 3.74
  // Run EGCD, until r(L + 1) < aprxSqrt
  var u = lambda;
  var v = this.n.clone();
  var x1 = new BN(1);
  var y1 = new BN(0);
  var x2 = new BN(0);
  var y2 = new BN(1);

  // NOTE: all vectors are roots of: a + b * lambda = 0 (mod n)
  var a0;
  var b0;
  // First vector
  var a1;
  var b1;
  // Second vector
  var a2;
  var b2;

  var prevR;
  var i = 0;
  var r;
  var x;
  while (u.cmpn(0) !== 0) {
    var q = v.div(u);
    r = v.sub(q.mul(u));
    x = x2.sub(q.mul(x1));
    var y = y2.sub(q.mul(y1));

    if (!a1 && r.cmp(aprxSqrt) < 0) {
      a0 = prevR.neg();
      b0 = x1;
      a1 = r.neg();
      b1 = x;
    } else if (a1 && ++i === 2) {
      break;
    }
    prevR = r;

    v = u;
    u = r;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  a2 = r.neg();
  b2 = x;

  var len1 = a1.sqr().add(b1.sqr());
  var len2 = a2.sqr().add(b2.sqr());
  if (len2.cmp(len1) >= 0) {
    a2 = a0;
    b2 = b0;
  }

  // Normalize signs
  if (a1.negative) {
    a1 = a1.neg();
    b1 = b1.neg();
  }
  if (a2.negative) {
    a2 = a2.neg();
    b2 = b2.neg();
  }

  return [
    { a: a1, b: b1 },
    { a: a2, b: b2 },
  ];
};

ShortCurve.prototype._endoSplit = function _endoSplit(k) {
  var basis = this.endo.basis;
  var v1 = basis[0];
  var v2 = basis[1];

  var c1 = v2.b.mul(k).divRound(this.n);
  var c2 = v1.b.neg().mul(k).divRound(this.n);

  var p1 = c1.mul(v1.a);
  var p2 = c2.mul(v2.a);
  var q1 = c1.mul(v1.b);
  var q2 = c2.mul(v2.b);

  // Calculate answer
  var k1 = k.sub(p1).sub(p2);
  var k2 = q1.add(q2).neg();
  return { k1: k1, k2: k2 };
};

ShortCurve.prototype.pointFromX = function pointFromX(x, odd) {
  x = new BN(x, 16);
  if (!x.red)
    x = x.toRed(this.red);

  var y2 = x.redSqr().redMul(x).redIAdd(x.redMul(this.a)).redIAdd(this.b);
  var y = y2.redSqrt();
  if (y.redSqr().redSub(y2).cmp(this.zero) !== 0)
    throw new Error('invalid point');

  // XXX Is there any way to tell if the number is odd without converting it
  // to non-red form?
  var isOdd = y.fromRed().isOdd();
  if (odd && !isOdd || !odd && isOdd)
    y = y.redNeg();

  return this.point(x, y);
};

ShortCurve.prototype.validate = function validate(point) {
  if (point.inf)
    return true;

  var x = point.x;
  var y = point.y;

  var ax = this.a.redMul(x);
  var rhs = x.redSqr().redMul(x).redIAdd(ax).redIAdd(this.b);
  return y.redSqr().redISub(rhs).cmpn(0) === 0;
};

ShortCurve.prototype._endoWnafMulAdd =
    function _endoWnafMulAdd(points, coeffs, jacobianResult) {
      var npoints = this._endoWnafT1;
      var ncoeffs = this._endoWnafT2;
      for (var i = 0; i < points.length; i++) {
        var split = this._endoSplit(coeffs[i]);
        var p = points[i];
        var beta = p._getBeta();

        if (split.k1.negative) {
          split.k1.ineg();
          p = p.neg(true);
        }
        if (split.k2.negative) {
          split.k2.ineg();
          beta = beta.neg(true);
        }

        npoints[i * 2] = p;
        npoints[i * 2 + 1] = beta;
        ncoeffs[i * 2] = split.k1;
        ncoeffs[i * 2 + 1] = split.k2;
      }
      var res = this._wnafMulAdd(1, npoints, ncoeffs, i * 2, jacobianResult);

      // Clean-up references to points and coefficients
      for (var j = 0; j < i * 2; j++) {
        npoints[j] = null;
        ncoeffs[j] = null;
      }
      return res;
    };

function Point(curve, x, y, isRed) {
  Base.BasePoint.call(this, curve, 'affine');
  if (x === null && y === null) {
    this.x = null;
    this.y = null;
    this.inf = true;
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    // Force redgomery representation when loading from JSON
    if (isRed) {
      this.x.forceRed(this.curve.red);
      this.y.forceRed(this.curve.red);
    }
    if (!this.x.red)
      this.x = this.x.toRed(this.curve.red);
    if (!this.y.red)
      this.y = this.y.toRed(this.curve.red);
    this.inf = false;
  }
}
inherits(Point, Base.BasePoint);

ShortCurve.prototype.point = function point(x, y, isRed) {
  return new Point(this, x, y, isRed);
};

ShortCurve.prototype.pointFromJSON = function pointFromJSON(obj, red) {
  return Point.fromJSON(this, obj, red);
};

Point.prototype._getBeta = function _getBeta() {
  if (!this.curve.endo)
    return;

  var pre = this.precomputed;
  if (pre && pre.beta)
    return pre.beta;

  var beta = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
  if (pre) {
    var curve = this.curve;
    var endoMul = function(p) {
      return curve.point(p.x.redMul(curve.endo.beta), p.y);
    };
    pre.beta = beta;
    beta.precomputed = {
      beta: null,
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: pre.naf.points.map(endoMul),
      },
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: pre.doubles.points.map(endoMul),
      },
    };
  }
  return beta;
};

Point.prototype.toJSON = function toJSON() {
  if (!this.precomputed)
    return [ this.x, this.y ];

  return [ this.x, this.y, this.precomputed && {
    doubles: this.precomputed.doubles && {
      step: this.precomputed.doubles.step,
      points: this.precomputed.doubles.points.slice(1),
    },
    naf: this.precomputed.naf && {
      wnd: this.precomputed.naf.wnd,
      points: this.precomputed.naf.points.slice(1),
    },
  } ];
};

Point.fromJSON = function fromJSON(curve, obj, red) {
  if (typeof obj === 'string')
    obj = JSON.parse(obj);
  var res = curve.point(obj[0], obj[1], red);
  if (!obj[2])
    return res;

  function obj2point(obj) {
    return curve.point(obj[0], obj[1], red);
  }

  var pre = obj[2];
  res.precomputed = {
    beta: null,
    doubles: pre.doubles && {
      step: pre.doubles.step,
      points: [ res ].concat(pre.doubles.points.map(obj2point)),
    },
    naf: pre.naf && {
      wnd: pre.naf.wnd,
      points: [ res ].concat(pre.naf.points.map(obj2point)),
    },
  };
  return res;
};

Point.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC Point Infinity>';
  return '<EC Point x: ' + this.x.fromRed().toString(16, 2) +
      ' y: ' + this.y.fromRed().toString(16, 2) + '>';
};

Point.prototype.isInfinity = function isInfinity() {
  return this.inf;
};

Point.prototype.add = function add(p) {
  // O + P = P
  if (this.inf)
    return p;

  // P + O = P
  if (p.inf)
    return this;

  // P + P = 2P
  if (this.eq(p))
    return this.dbl();

  // P + (-P) = O
  if (this.neg().eq(p))
    return this.curve.point(null, null);

  // P + Q = O
  if (this.x.cmp(p.x) === 0)
    return this.curve.point(null, null);

  var c = this.y.redSub(p.y);
  if (c.cmpn(0) !== 0)
    c = c.redMul(this.x.redSub(p.x).redInvm());
  var nx = c.redSqr().redISub(this.x).redISub(p.x);
  var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
  return this.curve.point(nx, ny);
};

Point.prototype.dbl = function dbl() {
  if (this.inf)
    return this;

  // 2P = O
  var ys1 = this.y.redAdd(this.y);
  if (ys1.cmpn(0) === 0)
    return this.curve.point(null, null);

  var a = this.curve.a;

  var x2 = this.x.redSqr();
  var dyinv = ys1.redInvm();
  var c = x2.redAdd(x2).redIAdd(x2).redIAdd(a).redMul(dyinv);

  var nx = c.redSqr().redISub(this.x.redAdd(this.x));
  var ny = c.redMul(this.x.redSub(nx)).redISub(this.y);
  return this.curve.point(nx, ny);
};

Point.prototype.getX = function getX() {
  return this.x.fromRed();
};

Point.prototype.getY = function getY() {
  return this.y.fromRed();
};

Point.prototype.mul = function mul(k) {
  k = new BN(k, 16);
  if (this.isInfinity())
    return this;
  else if (this._hasDoubles(k))
    return this.curve._fixedNafMul(this, k);
  else if (this.curve.endo)
    return this.curve._endoWnafMulAdd([ this ], [ k ]);
  else
    return this.curve._wnafMul(this, k);
};

Point.prototype.mulAdd = function mulAdd(k1, p2, k2) {
  var points = [ this, p2 ];
  var coeffs = [ k1, k2 ];
  if (this.curve.endo)
    return this.curve._endoWnafMulAdd(points, coeffs);
  else
    return this.curve._wnafMulAdd(1, points, coeffs, 2);
};

Point.prototype.jmulAdd = function jmulAdd(k1, p2, k2) {
  var points = [ this, p2 ];
  var coeffs = [ k1, k2 ];
  if (this.curve.endo)
    return this.curve._endoWnafMulAdd(points, coeffs, true);
  else
    return this.curve._wnafMulAdd(1, points, coeffs, 2, true);
};

Point.prototype.eq = function eq(p) {
  return this === p ||
         this.inf === p.inf &&
             (this.inf || this.x.cmp(p.x) === 0 && this.y.cmp(p.y) === 0);
};

Point.prototype.neg = function neg(_precompute) {
  if (this.inf)
    return this;

  var res = this.curve.point(this.x, this.y.redNeg());
  if (_precompute && this.precomputed) {
    var pre = this.precomputed;
    var negate = function(p) {
      return p.neg();
    };
    res.precomputed = {
      naf: pre.naf && {
        wnd: pre.naf.wnd,
        points: pre.naf.points.map(negate),
      },
      doubles: pre.doubles && {
        step: pre.doubles.step,
        points: pre.doubles.points.map(negate),
      },
    };
  }
  return res;
};

Point.prototype.toJ = function toJ() {
  if (this.inf)
    return this.curve.jpoint(null, null, null);

  var res = this.curve.jpoint(this.x, this.y, this.curve.one);
  return res;
};

function JPoint(curve, x, y, z) {
  Base.BasePoint.call(this, curve, 'jacobian');
  if (x === null && y === null && z === null) {
    this.x = this.curve.one;
    this.y = this.curve.one;
    this.z = new BN(0);
  } else {
    this.x = new BN(x, 16);
    this.y = new BN(y, 16);
    this.z = new BN(z, 16);
  }
  if (!this.x.red)
    this.x = this.x.toRed(this.curve.red);
  if (!this.y.red)
    this.y = this.y.toRed(this.curve.red);
  if (!this.z.red)
    this.z = this.z.toRed(this.curve.red);

  this.zOne = this.z === this.curve.one;
}
inherits(JPoint, Base.BasePoint);

ShortCurve.prototype.jpoint = function jpoint(x, y, z) {
  return new JPoint(this, x, y, z);
};

JPoint.prototype.toP = function toP() {
  if (this.isInfinity())
    return this.curve.point(null, null);

  var zinv = this.z.redInvm();
  var zinv2 = zinv.redSqr();
  var ax = this.x.redMul(zinv2);
  var ay = this.y.redMul(zinv2).redMul(zinv);

  return this.curve.point(ax, ay);
};

JPoint.prototype.neg = function neg() {
  return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
};

JPoint.prototype.add = function add(p) {
  // O + P = P
  if (this.isInfinity())
    return p;

  // P + O = P
  if (p.isInfinity())
    return this;

  // 12M + 4S + 7A
  var pz2 = p.z.redSqr();
  var z2 = this.z.redSqr();
  var u1 = this.x.redMul(pz2);
  var u2 = p.x.redMul(z2);
  var s1 = this.y.redMul(pz2.redMul(p.z));
  var s2 = p.y.redMul(z2.redMul(this.z));

  var h = u1.redSub(u2);
  var r = s1.redSub(s2);
  if (h.cmpn(0) === 0) {
    if (r.cmpn(0) !== 0)
      return this.curve.jpoint(null, null, null);
    else
      return this.dbl();
  }

  var h2 = h.redSqr();
  var h3 = h2.redMul(h);
  var v = u1.redMul(h2);

  var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
  var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
  var nz = this.z.redMul(p.z).redMul(h);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.mixedAdd = function mixedAdd(p) {
  // O + P = P
  if (this.isInfinity())
    return p.toJ();

  // P + O = P
  if (p.isInfinity())
    return this;

  // 8M + 3S + 7A
  var z2 = this.z.redSqr();
  var u1 = this.x;
  var u2 = p.x.redMul(z2);
  var s1 = this.y;
  var s2 = p.y.redMul(z2).redMul(this.z);

  var h = u1.redSub(u2);
  var r = s1.redSub(s2);
  if (h.cmpn(0) === 0) {
    if (r.cmpn(0) !== 0)
      return this.curve.jpoint(null, null, null);
    else
      return this.dbl();
  }

  var h2 = h.redSqr();
  var h3 = h2.redMul(h);
  var v = u1.redMul(h2);

  var nx = r.redSqr().redIAdd(h3).redISub(v).redISub(v);
  var ny = r.redMul(v.redISub(nx)).redISub(s1.redMul(h3));
  var nz = this.z.redMul(h);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.dblp = function dblp(pow) {
  if (pow === 0)
    return this;
  if (this.isInfinity())
    return this;
  if (!pow)
    return this.dbl();

  var i;
  if (this.curve.zeroA || this.curve.threeA) {
    var r = this;
    for (i = 0; i < pow; i++)
      r = r.dbl();
    return r;
  }

  // 1M + 2S + 1A + N * (4S + 5M + 8A)
  // N = 1 => 6M + 6S + 9A
  var a = this.curve.a;
  var tinv = this.curve.tinv;

  var jx = this.x;
  var jy = this.y;
  var jz = this.z;
  var jz4 = jz.redSqr().redSqr();

  // Reuse results
  var jyd = jy.redAdd(jy);
  for (i = 0; i < pow; i++) {
    var jx2 = jx.redSqr();
    var jyd2 = jyd.redSqr();
    var jyd4 = jyd2.redSqr();
    var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

    var t1 = jx.redMul(jyd2);
    var nx = c.redSqr().redISub(t1.redAdd(t1));
    var t2 = t1.redISub(nx);
    var dny = c.redMul(t2);
    dny = dny.redIAdd(dny).redISub(jyd4);
    var nz = jyd.redMul(jz);
    if (i + 1 < pow)
      jz4 = jz4.redMul(jyd4);

    jx = nx;
    jz = nz;
    jyd = dny;
  }

  return this.curve.jpoint(jx, jyd.redMul(tinv), jz);
};

JPoint.prototype.dbl = function dbl() {
  if (this.isInfinity())
    return this;

  if (this.curve.zeroA)
    return this._zeroDbl();
  else if (this.curve.threeA)
    return this._threeDbl();
  else
    return this._dbl();
};

JPoint.prototype._zeroDbl = function _zeroDbl() {
  var nx;
  var ny;
  var nz;
  // Z = 1
  if (this.zOne) {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
    //     #doubling-mdbl-2007-bl
    // 1M + 5S + 14A

    // XX = X1^2
    var xx = this.x.redSqr();
    // YY = Y1^2
    var yy = this.y.redSqr();
    // YYYY = YY^2
    var yyyy = yy.redSqr();
    // S = 2 * ((X1 + YY)^2 - XX - YYYY)
    var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    s = s.redIAdd(s);
    // M = 3 * XX + a; a = 0
    var m = xx.redAdd(xx).redIAdd(xx);
    // T = M ^ 2 - 2*S
    var t = m.redSqr().redISub(s).redISub(s);

    // 8 * YYYY
    var yyyy8 = yyyy.redIAdd(yyyy);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    yyyy8 = yyyy8.redIAdd(yyyy8);

    // X3 = T
    nx = t;
    // Y3 = M * (S - T) - 8 * YYYY
    ny = m.redMul(s.redISub(t)).redISub(yyyy8);
    // Z3 = 2*Y1
    nz = this.y.redAdd(this.y);
  } else {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html
    //     #doubling-dbl-2009-l
    // 2M + 5S + 13A

    // A = X1^2
    var a = this.x.redSqr();
    // B = Y1^2
    var b = this.y.redSqr();
    // C = B^2
    var c = b.redSqr();
    // D = 2 * ((X1 + B)^2 - A - C)
    var d = this.x.redAdd(b).redSqr().redISub(a).redISub(c);
    d = d.redIAdd(d);
    // E = 3 * A
    var e = a.redAdd(a).redIAdd(a);
    // F = E^2
    var f = e.redSqr();

    // 8 * C
    var c8 = c.redIAdd(c);
    c8 = c8.redIAdd(c8);
    c8 = c8.redIAdd(c8);

    // X3 = F - 2 * D
    nx = f.redISub(d).redISub(d);
    // Y3 = E * (D - X3) - 8 * C
    ny = e.redMul(d.redISub(nx)).redISub(c8);
    // Z3 = 2 * Y1 * Z1
    nz = this.y.redMul(this.z);
    nz = nz.redIAdd(nz);
  }

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype._threeDbl = function _threeDbl() {
  var nx;
  var ny;
  var nz;
  // Z = 1
  if (this.zOne) {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html
    //     #doubling-mdbl-2007-bl
    // 1M + 5S + 15A

    // XX = X1^2
    var xx = this.x.redSqr();
    // YY = Y1^2
    var yy = this.y.redSqr();
    // YYYY = YY^2
    var yyyy = yy.redSqr();
    // S = 2 * ((X1 + YY)^2 - XX - YYYY)
    var s = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
    s = s.redIAdd(s);
    // M = 3 * XX + a
    var m = xx.redAdd(xx).redIAdd(xx).redIAdd(this.curve.a);
    // T = M^2 - 2 * S
    var t = m.redSqr().redISub(s).redISub(s);
    // X3 = T
    nx = t;
    // Y3 = M * (S - T) - 8 * YYYY
    var yyyy8 = yyyy.redIAdd(yyyy);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    yyyy8 = yyyy8.redIAdd(yyyy8);
    ny = m.redMul(s.redISub(t)).redISub(yyyy8);
    // Z3 = 2 * Y1
    nz = this.y.redAdd(this.y);
  } else {
    // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-3.html#doubling-dbl-2001-b
    // 3M + 5S

    // delta = Z1^2
    var delta = this.z.redSqr();
    // gamma = Y1^2
    var gamma = this.y.redSqr();
    // beta = X1 * gamma
    var beta = this.x.redMul(gamma);
    // alpha = 3 * (X1 - delta) * (X1 + delta)
    var alpha = this.x.redSub(delta).redMul(this.x.redAdd(delta));
    alpha = alpha.redAdd(alpha).redIAdd(alpha);
    // X3 = alpha^2 - 8 * beta
    var beta4 = beta.redIAdd(beta);
    beta4 = beta4.redIAdd(beta4);
    var beta8 = beta4.redAdd(beta4);
    nx = alpha.redSqr().redISub(beta8);
    // Z3 = (Y1 + Z1)^2 - gamma - delta
    nz = this.y.redAdd(this.z).redSqr().redISub(gamma).redISub(delta);
    // Y3 = alpha * (4 * beta - X3) - 8 * gamma^2
    var ggamma8 = gamma.redSqr();
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ggamma8 = ggamma8.redIAdd(ggamma8);
    ny = alpha.redMul(beta4.redISub(nx)).redISub(ggamma8);
  }

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype._dbl = function _dbl() {
  var a = this.curve.a;

  // 4M + 6S + 10A
  var jx = this.x;
  var jy = this.y;
  var jz = this.z;
  var jz4 = jz.redSqr().redSqr();

  var jx2 = jx.redSqr();
  var jy2 = jy.redSqr();

  var c = jx2.redAdd(jx2).redIAdd(jx2).redIAdd(a.redMul(jz4));

  var jxd4 = jx.redAdd(jx);
  jxd4 = jxd4.redIAdd(jxd4);
  var t1 = jxd4.redMul(jy2);
  var nx = c.redSqr().redISub(t1.redAdd(t1));
  var t2 = t1.redISub(nx);

  var jyd8 = jy2.redSqr();
  jyd8 = jyd8.redIAdd(jyd8);
  jyd8 = jyd8.redIAdd(jyd8);
  jyd8 = jyd8.redIAdd(jyd8);
  var ny = c.redMul(t2).redISub(jyd8);
  var nz = jy.redAdd(jy).redMul(jz);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.trpl = function trpl() {
  if (!this.curve.zeroA)
    return this.dbl().add(this);

  // hyperelliptic.org/EFD/g1p/auto-shortw-jacobian-0.html#tripling-tpl-2007-bl
  // 5M + 10S + ...

  // XX = X1^2
  var xx = this.x.redSqr();
  // YY = Y1^2
  var yy = this.y.redSqr();
  // ZZ = Z1^2
  var zz = this.z.redSqr();
  // YYYY = YY^2
  var yyyy = yy.redSqr();
  // M = 3 * XX + a * ZZ2; a = 0
  var m = xx.redAdd(xx).redIAdd(xx);
  // MM = M^2
  var mm = m.redSqr();
  // E = 6 * ((X1 + YY)^2 - XX - YYYY) - MM
  var e = this.x.redAdd(yy).redSqr().redISub(xx).redISub(yyyy);
  e = e.redIAdd(e);
  e = e.redAdd(e).redIAdd(e);
  e = e.redISub(mm);
  // EE = E^2
  var ee = e.redSqr();
  // T = 16*YYYY
  var t = yyyy.redIAdd(yyyy);
  t = t.redIAdd(t);
  t = t.redIAdd(t);
  t = t.redIAdd(t);
  // U = (M + E)^2 - MM - EE - T
  var u = m.redIAdd(e).redSqr().redISub(mm).redISub(ee).redISub(t);
  // X3 = 4 * (X1 * EE - 4 * YY * U)
  var yyu4 = yy.redMul(u);
  yyu4 = yyu4.redIAdd(yyu4);
  yyu4 = yyu4.redIAdd(yyu4);
  var nx = this.x.redMul(ee).redISub(yyu4);
  nx = nx.redIAdd(nx);
  nx = nx.redIAdd(nx);
  // Y3 = 8 * Y1 * (U * (T - U) - E * EE)
  var ny = this.y.redMul(u.redMul(t.redISub(u)).redISub(e.redMul(ee)));
  ny = ny.redIAdd(ny);
  ny = ny.redIAdd(ny);
  ny = ny.redIAdd(ny);
  // Z3 = (Z1 + E)^2 - ZZ - EE
  var nz = this.z.redAdd(e).redSqr().redISub(zz).redISub(ee);

  return this.curve.jpoint(nx, ny, nz);
};

JPoint.prototype.mul = function mul(k, kbase) {
  k = new BN(k, kbase);

  return this.curve._wnafMul(this, k);
};

JPoint.prototype.eq = function eq(p) {
  if (p.type === 'affine')
    return this.eq(p.toJ());

  if (this === p)
    return true;

  // x1 * z2^2 == x2 * z1^2
  var z2 = this.z.redSqr();
  var pz2 = p.z.redSqr();
  if (this.x.redMul(pz2).redISub(p.x.redMul(z2)).cmpn(0) !== 0)
    return false;

  // y1 * z2^3 == y2 * z1^3
  var z3 = z2.redMul(this.z);
  var pz3 = pz2.redMul(p.z);
  return this.y.redMul(pz3).redISub(p.y.redMul(z3)).cmpn(0) === 0;
};

JPoint.prototype.eqXToP = function eqXToP(x) {
  var zs = this.z.redSqr();
  var rx = x.toRed(this.curve.red).redMul(zs);
  if (this.x.cmp(rx) === 0)
    return true;

  var xc = x.clone();
  var t = this.curve.redN.redMul(zs);
  for (;;) {
    xc.iadd(this.curve.n);
    if (xc.cmp(this.curve.p) >= 0)
      return false;

    rx.redIAdd(t);
    if (this.x.cmp(rx) === 0)
      return true;
  }
};

JPoint.prototype.inspect = function inspect() {
  if (this.isInfinity())
    return '<EC JPoint Infinity>';
  return '<EC JPoint x: ' + this.x.toString(16, 2) +
      ' y: ' + this.y.toString(16, 2) +
      ' z: ' + this.z.toString(16, 2) + '>';
};

JPoint.prototype.isInfinity = function isInfinity() {
  // XXX This code assumes that zero is always zero in red
  return this.z.cmpn(0) === 0;
};

},{"../utils":97,"./base":84,"bn.js":80,"inherits":112}],89:[function(require,module,exports){
'use strict';

var curves = exports;

var hash = require('hash.js');
var curve = require('./curve');
var utils = require('./utils');

var assert = utils.assert;

function PresetCurve(options) {
  if (options.type === 'short')
    this.curve = new curve.short(options);
  else if (options.type === 'edwards')
    this.curve = new curve.edwards(options);
  else
    this.curve = new curve.mont(options);
  this.g = this.curve.g;
  this.n = this.curve.n;
  this.hash = options.hash;

  assert(this.g.validate(), 'Invalid curve');
  assert(this.g.mul(this.n).isInfinity(), 'Invalid curve, G*N != O');
}
curves.PresetCurve = PresetCurve;

function defineCurve(name, options) {
  Object.defineProperty(curves, name, {
    configurable: true,
    enumerable: true,
    get: function() {
      var curve = new PresetCurve(options);
      Object.defineProperty(curves, name, {
        configurable: true,
        enumerable: true,
        value: curve,
      });
      return curve;
    },
  });
}

defineCurve('p192', {
  type: 'short',
  prime: 'p192',
  p: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff',
  a: 'ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc',
  b: '64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1',
  n: 'ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831',
  hash: hash.sha256,
  gRed: false,
  g: [
    '188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012',
    '07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811',
  ],
});

defineCurve('p224', {
  type: 'short',
  prime: 'p224',
  p: 'ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001',
  a: 'ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe',
  b: 'b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4',
  n: 'ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d',
  hash: hash.sha256,
  gRed: false,
  g: [
    'b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21',
    'bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34',
  ],
});

defineCurve('p256', {
  type: 'short',
  prime: null,
  p: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff',
  a: 'ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc',
  b: '5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b',
  n: 'ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551',
  hash: hash.sha256,
  gRed: false,
  g: [
    '6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296',
    '4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5',
  ],
});

defineCurve('p384', {
  type: 'short',
  prime: null,
  p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'fffffffe ffffffff 00000000 00000000 ffffffff',
  a: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'fffffffe ffffffff 00000000 00000000 fffffffc',
  b: 'b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f ' +
     '5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef',
  n: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 ' +
     'f4372ddf 581a0db2 48b0a77a ecec196a ccc52973',
  hash: hash.sha384,
  gRed: false,
  g: [
    'aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 ' +
    '5502f25d bf55296c 3a545e38 72760ab7',
    '3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 ' +
    '0a60b1ce 1d7e819d 7a431d7c 90ea0e5f',
  ],
});

defineCurve('p521', {
  type: 'short',
  prime: null,
  p: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff',
  a: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff ffffffff ffffffff fffffffc',
  b: '00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b ' +
     '99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd ' +
     '3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00',
  n: '000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ' +
     'ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 ' +
     'f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409',
  hash: hash.sha512,
  gRed: false,
  g: [
    '000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 ' +
    '053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 ' +
    'a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66',
    '00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 ' +
    '579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 ' +
    '3fad0761 353c7086 a272c240 88be9476 9fd16650',
  ],
});

defineCurve('curve25519', {
  type: 'mont',
  prime: 'p25519',
  p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
  a: '76d06',
  b: '1',
  n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
  hash: hash.sha256,
  gRed: false,
  g: [
    '9',
  ],
});

defineCurve('ed25519', {
  type: 'edwards',
  prime: 'p25519',
  p: '7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed',
  a: '-1',
  c: '1',
  // -121665 * (121666^(-1)) (mod P)
  d: '52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3',
  n: '1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed',
  hash: hash.sha256,
  gRed: false,
  g: [
    '216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a',

    // 4/5
    '6666666666666666666666666666666666666666666666666666666666666658',
  ],
});

var pre;
try {
  pre = require('./precomputed/secp256k1');
} catch (e) {
  pre = undefined;
}

defineCurve('secp256k1', {
  type: 'short',
  prime: 'k256',
  p: 'ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f',
  a: '0',
  b: '7',
  n: 'ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141',
  h: '1',
  hash: hash.sha256,

  // Precomputed endomorphism
  beta: '7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee',
  lambda: '5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72',
  basis: [
    {
      a: '3086d221a7d46bcde86c90e49284eb15',
      b: '-e4437ed6010e88286f547fa90abfe4c3',
    },
    {
      a: '114ca50f7a8e2f3f657c1108d9d44cfd8',
      b: '3086d221a7d46bcde86c90e49284eb15',
    },
  ],

  gRed: false,
  g: [
    '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
    '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8',
    pre,
  ],
});

},{"./curve":86,"./precomputed/secp256k1":96,"./utils":97,"hash.js":99}],90:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var HmacDRBG = require('hmac-drbg');
var utils = require('../utils');
var curves = require('../curves');
var rand = require('brorand');
var assert = utils.assert;

var KeyPair = require('./key');
var Signature = require('./signature');

function EC(options) {
  if (!(this instanceof EC))
    return new EC(options);

  // Shortcut `elliptic.ec(curve-name)`
  if (typeof options === 'string') {
    assert(Object.prototype.hasOwnProperty.call(curves, options),
      'Unknown curve ' + options);

    options = curves[options];
  }

  // Shortcut for `elliptic.ec(elliptic.curves.curveName)`
  if (options instanceof curves.PresetCurve)
    options = { curve: options };

  this.curve = options.curve.curve;
  this.n = this.curve.n;
  this.nh = this.n.ushrn(1);
  this.g = this.curve.g;

  // Point on curve
  this.g = options.curve.g;
  this.g.precompute(options.curve.n.bitLength() + 1);

  // Hash for function for DRBG
  this.hash = options.hash || options.curve.hash;
}
module.exports = EC;

EC.prototype.keyPair = function keyPair(options) {
  return new KeyPair(this, options);
};

EC.prototype.keyFromPrivate = function keyFromPrivate(priv, enc) {
  return KeyPair.fromPrivate(this, priv, enc);
};

EC.prototype.keyFromPublic = function keyFromPublic(pub, enc) {
  return KeyPair.fromPublic(this, pub, enc);
};

EC.prototype.genKeyPair = function genKeyPair(options) {
  if (!options)
    options = {};

  // Instantiate Hmac_DRBG
  var drbg = new HmacDRBG({
    hash: this.hash,
    pers: options.pers,
    persEnc: options.persEnc || 'utf8',
    entropy: options.entropy || rand(this.hash.hmacStrength),
    entropyEnc: options.entropy && options.entropyEnc || 'utf8',
    nonce: this.n.toArray(),
  });

  var bytes = this.n.byteLength();
  var ns2 = this.n.sub(new BN(2));
  for (;;) {
    var priv = new BN(drbg.generate(bytes));
    if (priv.cmp(ns2) > 0)
      continue;

    priv.iaddn(1);
    return this.keyFromPrivate(priv);
  }
};

EC.prototype._truncateToN = function _truncateToN(msg, truncOnly) {
  var delta = msg.byteLength() * 8 - this.n.bitLength();
  if (delta > 0)
    msg = msg.ushrn(delta);
  if (!truncOnly && msg.cmp(this.n) >= 0)
    return msg.sub(this.n);
  else
    return msg;
};

EC.prototype.sign = function sign(msg, key, enc, options) {
  if (typeof enc === 'object') {
    options = enc;
    enc = null;
  }
  if (!options)
    options = {};

  key = this.keyFromPrivate(key, enc);
  msg = this._truncateToN(new BN(msg, 16));

  // Zero-extend key to provide enough entropy
  var bytes = this.n.byteLength();
  var bkey = key.getPrivate().toArray('be', bytes);

  // Zero-extend nonce to have the same byte size as N
  var nonce = msg.toArray('be', bytes);

  // Instantiate Hmac_DRBG
  var drbg = new HmacDRBG({
    hash: this.hash,
    entropy: bkey,
    nonce: nonce,
    pers: options.pers,
    persEnc: options.persEnc || 'utf8',
  });

  // Number of bytes to generate
  var ns1 = this.n.sub(new BN(1));

  for (var iter = 0; ; iter++) {
    var k = options.k ?
      options.k(iter) :
      new BN(drbg.generate(this.n.byteLength()));
    k = this._truncateToN(k, true);
    if (k.cmpn(1) <= 0 || k.cmp(ns1) >= 0)
      continue;

    var kp = this.g.mul(k);
    if (kp.isInfinity())
      continue;

    var kpX = kp.getX();
    var r = kpX.umod(this.n);
    if (r.cmpn(0) === 0)
      continue;

    var s = k.invm(this.n).mul(r.mul(key.getPrivate()).iadd(msg));
    s = s.umod(this.n);
    if (s.cmpn(0) === 0)
      continue;

    var recoveryParam = (kp.getY().isOdd() ? 1 : 0) |
                        (kpX.cmp(r) !== 0 ? 2 : 0);

    // Use complement of `s`, if it is > `n / 2`
    if (options.canonical && s.cmp(this.nh) > 0) {
      s = this.n.sub(s);
      recoveryParam ^= 1;
    }

    return new Signature({ r: r, s: s, recoveryParam: recoveryParam });
  }
};

EC.prototype.verify = function verify(msg, signature, key, enc) {
  msg = this._truncateToN(new BN(msg, 16));
  key = this.keyFromPublic(key, enc);
  signature = new Signature(signature, 'hex');

  // Perform primitive values validation
  var r = signature.r;
  var s = signature.s;
  if (r.cmpn(1) < 0 || r.cmp(this.n) >= 0)
    return false;
  if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0)
    return false;

  // Validate signature
  var sinv = s.invm(this.n);
  var u1 = sinv.mul(msg).umod(this.n);
  var u2 = sinv.mul(r).umod(this.n);
  var p;

  if (!this.curve._maxwellTrick) {
    p = this.g.mulAdd(u1, key.getPublic(), u2);
    if (p.isInfinity())
      return false;

    return p.getX().umod(this.n).cmp(r) === 0;
  }

  // NOTE: Greg Maxwell's trick, inspired by:
  // https://git.io/vad3K

  p = this.g.jmulAdd(u1, key.getPublic(), u2);
  if (p.isInfinity())
    return false;

  // Compare `p.x` of Jacobian point with `r`,
  // this will do `p.x == r * p.z^2` instead of multiplying `p.x` by the
  // inverse of `p.z^2`
  return p.eqXToP(r);
};

EC.prototype.recoverPubKey = function(msg, signature, j, enc) {
  assert((3 & j) === j, 'The recovery param is more than two bits');
  signature = new Signature(signature, enc);

  var n = this.n;
  var e = new BN(msg);
  var r = signature.r;
  var s = signature.s;

  // A set LSB signifies that the y-coordinate is odd
  var isYOdd = j & 1;
  var isSecondKey = j >> 1;
  if (r.cmp(this.curve.p.umod(this.curve.n)) >= 0 && isSecondKey)
    throw new Error('Unable to find sencond key candinate');

  // 1.1. Let x = r + jn.
  if (isSecondKey)
    r = this.curve.pointFromX(r.add(this.curve.n), isYOdd);
  else
    r = this.curve.pointFromX(r, isYOdd);

  var rInv = signature.r.invm(n);
  var s1 = n.sub(e).mul(rInv).umod(n);
  var s2 = s.mul(rInv).umod(n);

  // 1.6.1 Compute Q = r^-1 (sR -  eG)
  //               Q = r^-1 (sR + -eG)
  return this.g.mulAdd(s1, r, s2);
};

EC.prototype.getKeyRecoveryParam = function(e, signature, Q, enc) {
  signature = new Signature(signature, enc);
  if (signature.recoveryParam !== null)
    return signature.recoveryParam;

  for (var i = 0; i < 4; i++) {
    var Qprime;
    try {
      Qprime = this.recoverPubKey(e, signature, i);
    } catch (e) {
      continue;
    }

    if (Qprime.eq(Q))
      return i;
  }
  throw new Error('Unable to find valid recovery factor');
};

},{"../curves":89,"../utils":97,"./key":91,"./signature":92,"bn.js":80,"brorand":81,"hmac-drbg":111}],91:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var utils = require('../utils');
var assert = utils.assert;

function KeyPair(ec, options) {
  this.ec = ec;
  this.priv = null;
  this.pub = null;

  // KeyPair(ec, { priv: ..., pub: ... })
  if (options.priv)
    this._importPrivate(options.priv, options.privEnc);
  if (options.pub)
    this._importPublic(options.pub, options.pubEnc);
}
module.exports = KeyPair;

KeyPair.fromPublic = function fromPublic(ec, pub, enc) {
  if (pub instanceof KeyPair)
    return pub;

  return new KeyPair(ec, {
    pub: pub,
    pubEnc: enc,
  });
};

KeyPair.fromPrivate = function fromPrivate(ec, priv, enc) {
  if (priv instanceof KeyPair)
    return priv;

  return new KeyPair(ec, {
    priv: priv,
    privEnc: enc,
  });
};

KeyPair.prototype.validate = function validate() {
  var pub = this.getPublic();

  if (pub.isInfinity())
    return { result: false, reason: 'Invalid public key' };
  if (!pub.validate())
    return { result: false, reason: 'Public key is not a point' };
  if (!pub.mul(this.ec.curve.n).isInfinity())
    return { result: false, reason: 'Public key * N != O' };

  return { result: true, reason: null };
};

KeyPair.prototype.getPublic = function getPublic(compact, enc) {
  // compact is optional argument
  if (typeof compact === 'string') {
    enc = compact;
    compact = null;
  }

  if (!this.pub)
    this.pub = this.ec.g.mul(this.priv);

  if (!enc)
    return this.pub;

  return this.pub.encode(enc, compact);
};

KeyPair.prototype.getPrivate = function getPrivate(enc) {
  if (enc === 'hex')
    return this.priv.toString(16, 2);
  else
    return this.priv;
};

KeyPair.prototype._importPrivate = function _importPrivate(key, enc) {
  this.priv = new BN(key, enc || 16);

  // Ensure that the priv won't be bigger than n, otherwise we may fail
  // in fixed multiplication method
  this.priv = this.priv.umod(this.ec.curve.n);
};

KeyPair.prototype._importPublic = function _importPublic(key, enc) {
  if (key.x || key.y) {
    // Montgomery points only have an `x` coordinate.
    // Weierstrass/Edwards points on the other hand have both `x` and
    // `y` coordinates.
    if (this.ec.curve.type === 'mont') {
      assert(key.x, 'Need x coordinate');
    } else if (this.ec.curve.type === 'short' ||
               this.ec.curve.type === 'edwards') {
      assert(key.x && key.y, 'Need both x and y coordinate');
    }
    this.pub = this.ec.curve.point(key.x, key.y);
    return;
  }
  this.pub = this.ec.curve.decodePoint(key, enc);
};

// ECDH
KeyPair.prototype.derive = function derive(pub) {
  if(!pub.validate()) {
    assert(pub.validate(), 'public point not validated');
  }
  return pub.mul(this.priv).getX();
};

// ECDSA
KeyPair.prototype.sign = function sign(msg, enc, options) {
  return this.ec.sign(msg, this, enc, options);
};

KeyPair.prototype.verify = function verify(msg, signature) {
  return this.ec.verify(msg, signature, this);
};

KeyPair.prototype.inspect = function inspect() {
  return '<Key priv: ' + (this.priv && this.priv.toString(16, 2)) +
         ' pub: ' + (this.pub && this.pub.inspect()) + ' >';
};

},{"../utils":97,"bn.js":80}],92:[function(require,module,exports){
'use strict';

var BN = require('bn.js');

var utils = require('../utils');
var assert = utils.assert;

function Signature(options, enc) {
  if (options instanceof Signature)
    return options;

  if (this._importDER(options, enc))
    return;

  assert(options.r && options.s, 'Signature without r or s');
  this.r = new BN(options.r, 16);
  this.s = new BN(options.s, 16);
  if (options.recoveryParam === undefined)
    this.recoveryParam = null;
  else
    this.recoveryParam = options.recoveryParam;
}
module.exports = Signature;

function Position() {
  this.place = 0;
}

function getLength(buf, p) {
  var initial = buf[p.place++];
  if (!(initial & 0x80)) {
    return initial;
  }
  var octetLen = initial & 0xf;

  // Indefinite length or overflow
  if (octetLen === 0 || octetLen > 4) {
    return false;
  }

  var val = 0;
  for (var i = 0, off = p.place; i < octetLen; i++, off++) {
    val <<= 8;
    val |= buf[off];
    val >>>= 0;
  }

  // Leading zeroes
  if (val <= 0x7f) {
    return false;
  }

  p.place = off;
  return val;
}

function rmPadding(buf) {
  var i = 0;
  var len = buf.length - 1;
  while (!buf[i] && !(buf[i + 1] & 0x80) && i < len) {
    i++;
  }
  if (i === 0) {
    return buf;
  }
  return buf.slice(i);
}

Signature.prototype._importDER = function _importDER(data, enc) {
  data = utils.toArray(data, enc);
  var p = new Position();
  if (data[p.place++] !== 0x30) {
    return false;
  }
  var len = getLength(data, p);
  if (len === false) {
    return false;
  }
  if ((len + p.place) !== data.length) {
    return false;
  }
  if (data[p.place++] !== 0x02) {
    return false;
  }
  var rlen = getLength(data, p);
  if (rlen === false) {
    return false;
  }
  var r = data.slice(p.place, rlen + p.place);
  p.place += rlen;
  if (data[p.place++] !== 0x02) {
    return false;
  }
  var slen = getLength(data, p);
  if (slen === false) {
    return false;
  }
  if (data.length !== slen + p.place) {
    return false;
  }
  var s = data.slice(p.place, slen + p.place);
  if (r[0] === 0) {
    if (r[1] & 0x80) {
      r = r.slice(1);
    } else {
      // Leading zeroes
      return false;
    }
  }
  if (s[0] === 0) {
    if (s[1] & 0x80) {
      s = s.slice(1);
    } else {
      // Leading zeroes
      return false;
    }
  }

  this.r = new BN(r);
  this.s = new BN(s);
  this.recoveryParam = null;

  return true;
};

function constructLength(arr, len) {
  if (len < 0x80) {
    arr.push(len);
    return;
  }
  var octets = 1 + (Math.log(len) / Math.LN2 >>> 3);
  arr.push(octets | 0x80);
  while (--octets) {
    arr.push((len >>> (octets << 3)) & 0xff);
  }
  arr.push(len);
}

Signature.prototype.toDER = function toDER(enc) {
  var r = this.r.toArray();
  var s = this.s.toArray();

  // Pad values
  if (r[0] & 0x80)
    r = [ 0 ].concat(r);
  // Pad values
  if (s[0] & 0x80)
    s = [ 0 ].concat(s);

  r = rmPadding(r);
  s = rmPadding(s);

  while (!s[0] && !(s[1] & 0x80)) {
    s = s.slice(1);
  }
  var arr = [ 0x02 ];
  constructLength(arr, r.length);
  arr = arr.concat(r);
  arr.push(0x02);
  constructLength(arr, s.length);
  var backHalf = arr.concat(s);
  var res = [ 0x30 ];
  constructLength(res, backHalf.length);
  res = res.concat(backHalf);
  return utils.encode(res, enc);
};

},{"../utils":97,"bn.js":80}],93:[function(require,module,exports){
'use strict';

var hash = require('hash.js');
var curves = require('../curves');
var utils = require('../utils');
var assert = utils.assert;
var parseBytes = utils.parseBytes;
var KeyPair = require('./key');
var Signature = require('./signature');

function EDDSA(curve) {
  assert(curve === 'ed25519', 'only tested with ed25519 so far');

  if (!(this instanceof EDDSA))
    return new EDDSA(curve);

  curve = curves[curve].curve;
  this.curve = curve;
  this.g = curve.g;
  this.g.precompute(curve.n.bitLength() + 1);

  this.pointClass = curve.point().constructor;
  this.encodingLength = Math.ceil(curve.n.bitLength() / 8);
  this.hash = hash.sha512;
}

module.exports = EDDSA;

/**
* @param {Array|String} message - message bytes
* @param {Array|String|KeyPair} secret - secret bytes or a keypair
* @returns {Signature} - signature
*/
EDDSA.prototype.sign = function sign(message, secret) {
  message = parseBytes(message);
  var key = this.keyFromSecret(secret);
  var r = this.hashInt(key.messagePrefix(), message);
  var R = this.g.mul(r);
  var Rencoded = this.encodePoint(R);
  var s_ = this.hashInt(Rencoded, key.pubBytes(), message)
    .mul(key.priv());
  var S = r.add(s_).umod(this.curve.n);
  return this.makeSignature({ R: R, S: S, Rencoded: Rencoded });
};

/**
* @param {Array} message - message bytes
* @param {Array|String|Signature} sig - sig bytes
* @param {Array|String|Point|KeyPair} pub - public key
* @returns {Boolean} - true if public key matches sig of message
*/
EDDSA.prototype.verify = function verify(message, sig, pub) {
  message = parseBytes(message);
  sig = this.makeSignature(sig);
  var key = this.keyFromPublic(pub);
  var h = this.hashInt(sig.Rencoded(), key.pubBytes(), message);
  var SG = this.g.mul(sig.S());
  var RplusAh = sig.R().add(key.pub().mul(h));
  return RplusAh.eq(SG);
};

EDDSA.prototype.hashInt = function hashInt() {
  var hash = this.hash();
  for (var i = 0; i < arguments.length; i++)
    hash.update(arguments[i]);
  return utils.intFromLE(hash.digest()).umod(this.curve.n);
};

EDDSA.prototype.keyFromPublic = function keyFromPublic(pub) {
  return KeyPair.fromPublic(this, pub);
};

EDDSA.prototype.keyFromSecret = function keyFromSecret(secret) {
  return KeyPair.fromSecret(this, secret);
};

EDDSA.prototype.makeSignature = function makeSignature(sig) {
  if (sig instanceof Signature)
    return sig;
  return new Signature(this, sig);
};

/**
* * https://tools.ietf.org/html/draft-josefsson-eddsa-ed25519-03#section-5.2
*
* EDDSA defines methods for encoding and decoding points and integers. These are
* helper convenience methods, that pass along to utility functions implied
* parameters.
*
*/
EDDSA.prototype.encodePoint = function encodePoint(point) {
  var enc = point.getY().toArray('le', this.encodingLength);
  enc[this.encodingLength - 1] |= point.getX().isOdd() ? 0x80 : 0;
  return enc;
};

EDDSA.prototype.decodePoint = function decodePoint(bytes) {
  bytes = utils.parseBytes(bytes);

  var lastIx = bytes.length - 1;
  var normed = bytes.slice(0, lastIx).concat(bytes[lastIx] & ~0x80);
  var xIsOdd = (bytes[lastIx] & 0x80) !== 0;

  var y = utils.intFromLE(normed);
  return this.curve.pointFromY(y, xIsOdd);
};

EDDSA.prototype.encodeInt = function encodeInt(num) {
  return num.toArray('le', this.encodingLength);
};

EDDSA.prototype.decodeInt = function decodeInt(bytes) {
  return utils.intFromLE(bytes);
};

EDDSA.prototype.isPoint = function isPoint(val) {
  return val instanceof this.pointClass;
};

},{"../curves":89,"../utils":97,"./key":94,"./signature":95,"hash.js":99}],94:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var assert = utils.assert;
var parseBytes = utils.parseBytes;
var cachedProperty = utils.cachedProperty;

/**
* @param {EDDSA} eddsa - instance
* @param {Object} params - public/private key parameters
*
* @param {Array<Byte>} [params.secret] - secret seed bytes
* @param {Point} [params.pub] - public key point (aka `A` in eddsa terms)
* @param {Array<Byte>} [params.pub] - public key point encoded as bytes
*
*/
function KeyPair(eddsa, params) {
  this.eddsa = eddsa;
  this._secret = parseBytes(params.secret);
  if (eddsa.isPoint(params.pub))
    this._pub = params.pub;
  else
    this._pubBytes = parseBytes(params.pub);
}

KeyPair.fromPublic = function fromPublic(eddsa, pub) {
  if (pub instanceof KeyPair)
    return pub;
  return new KeyPair(eddsa, { pub: pub });
};

KeyPair.fromSecret = function fromSecret(eddsa, secret) {
  if (secret instanceof KeyPair)
    return secret;
  return new KeyPair(eddsa, { secret: secret });
};

KeyPair.prototype.secret = function secret() {
  return this._secret;
};

cachedProperty(KeyPair, 'pubBytes', function pubBytes() {
  return this.eddsa.encodePoint(this.pub());
});

cachedProperty(KeyPair, 'pub', function pub() {
  if (this._pubBytes)
    return this.eddsa.decodePoint(this._pubBytes);
  return this.eddsa.g.mul(this.priv());
});

cachedProperty(KeyPair, 'privBytes', function privBytes() {
  var eddsa = this.eddsa;
  var hash = this.hash();
  var lastIx = eddsa.encodingLength - 1;

  var a = hash.slice(0, eddsa.encodingLength);
  a[0] &= 248;
  a[lastIx] &= 127;
  a[lastIx] |= 64;

  return a;
});

cachedProperty(KeyPair, 'priv', function priv() {
  return this.eddsa.decodeInt(this.privBytes());
});

cachedProperty(KeyPair, 'hash', function hash() {
  return this.eddsa.hash().update(this.secret()).digest();
});

cachedProperty(KeyPair, 'messagePrefix', function messagePrefix() {
  return this.hash().slice(this.eddsa.encodingLength);
});

KeyPair.prototype.sign = function sign(message) {
  assert(this._secret, 'KeyPair can only verify');
  return this.eddsa.sign(message, this);
};

KeyPair.prototype.verify = function verify(message, sig) {
  return this.eddsa.verify(message, sig, this);
};

KeyPair.prototype.getSecret = function getSecret(enc) {
  assert(this._secret, 'KeyPair is public only');
  return utils.encode(this.secret(), enc);
};

KeyPair.prototype.getPublic = function getPublic(enc) {
  return utils.encode(this.pubBytes(), enc);
};

module.exports = KeyPair;

},{"../utils":97}],95:[function(require,module,exports){
'use strict';

var BN = require('bn.js');
var utils = require('../utils');
var assert = utils.assert;
var cachedProperty = utils.cachedProperty;
var parseBytes = utils.parseBytes;

/**
* @param {EDDSA} eddsa - eddsa instance
* @param {Array<Bytes>|Object} sig -
* @param {Array<Bytes>|Point} [sig.R] - R point as Point or bytes
* @param {Array<Bytes>|bn} [sig.S] - S scalar as bn or bytes
* @param {Array<Bytes>} [sig.Rencoded] - R point encoded
* @param {Array<Bytes>} [sig.Sencoded] - S scalar encoded
*/
function Signature(eddsa, sig) {
  this.eddsa = eddsa;

  if (typeof sig !== 'object')
    sig = parseBytes(sig);

  if (Array.isArray(sig)) {
    sig = {
      R: sig.slice(0, eddsa.encodingLength),
      S: sig.slice(eddsa.encodingLength),
    };
  }

  assert(sig.R && sig.S, 'Signature without R or S');

  if (eddsa.isPoint(sig.R))
    this._R = sig.R;
  if (sig.S instanceof BN)
    this._S = sig.S;

  this._Rencoded = Array.isArray(sig.R) ? sig.R : sig.Rencoded;
  this._Sencoded = Array.isArray(sig.S) ? sig.S : sig.Sencoded;
}

cachedProperty(Signature, 'S', function S() {
  return this.eddsa.decodeInt(this.Sencoded());
});

cachedProperty(Signature, 'R', function R() {
  return this.eddsa.decodePoint(this.Rencoded());
});

cachedProperty(Signature, 'Rencoded', function Rencoded() {
  return this.eddsa.encodePoint(this.R());
});

cachedProperty(Signature, 'Sencoded', function Sencoded() {
  return this.eddsa.encodeInt(this.S());
});

Signature.prototype.toBytes = function toBytes() {
  return this.Rencoded().concat(this.Sencoded());
};

Signature.prototype.toHex = function toHex() {
  return utils.encode(this.toBytes(), 'hex').toUpperCase();
};

module.exports = Signature;

},{"../utils":97,"bn.js":80}],96:[function(require,module,exports){
module.exports = {
  doubles: {
    step: 4,
    points: [
      [
        'e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a',
        'f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821',
      ],
      [
        '8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508',
        '11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf',
      ],
      [
        '175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739',
        'd3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695',
      ],
      [
        '363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640',
        '4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9',
      ],
      [
        '8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c',
        '4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36',
      ],
      [
        '723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda',
        '96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f',
      ],
      [
        'eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa',
        '5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999',
      ],
      [
        '100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0',
        'cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09',
      ],
      [
        'e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d',
        '9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d',
      ],
      [
        'feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d',
        'e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088',
      ],
      [
        'da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1',
        '9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d',
      ],
      [
        '53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0',
        '5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8',
      ],
      [
        '8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047',
        '10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a',
      ],
      [
        '385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862',
        '283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453',
      ],
      [
        '6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7',
        '7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160',
      ],
      [
        '3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd',
        '56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0',
      ],
      [
        '85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83',
        '7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6',
      ],
      [
        '948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a',
        '53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589',
      ],
      [
        '6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8',
        'bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17',
      ],
      [
        'e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d',
        '4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda',
      ],
      [
        'e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725',
        '7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd',
      ],
      [
        '213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754',
        '4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2',
      ],
      [
        '4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c',
        '17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6',
      ],
      [
        'fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6',
        '6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f',
      ],
      [
        '76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39',
        'c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01',
      ],
      [
        'c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891',
        '893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3',
      ],
      [
        'd895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b',
        'febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f',
      ],
      [
        'b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03',
        '2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7',
      ],
      [
        'e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d',
        'eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78',
      ],
      [
        'a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070',
        '7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1',
      ],
      [
        '90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4',
        'e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150',
      ],
      [
        '8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da',
        '662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82',
      ],
      [
        'e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11',
        '1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc',
      ],
      [
        '8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e',
        'efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b',
      ],
      [
        'e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41',
        '2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51',
      ],
      [
        'b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef',
        '67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45',
      ],
      [
        'd68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8',
        'db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120',
      ],
      [
        '324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d',
        '648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84',
      ],
      [
        '4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96',
        '35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d',
      ],
      [
        '9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd',
        'ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d',
      ],
      [
        '6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5',
        '9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8',
      ],
      [
        'a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266',
        '40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8',
      ],
      [
        '7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71',
        '34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac',
      ],
      [
        '928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac',
        'c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f',
      ],
      [
        '85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751',
        '1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962',
      ],
      [
        'ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e',
        '493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907',
      ],
      [
        '827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241',
        'c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec',
      ],
      [
        'eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3',
        'be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d',
      ],
      [
        'e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f',
        '4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414',
      ],
      [
        '1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19',
        'aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd',
      ],
      [
        '146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be',
        'b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0',
      ],
      [
        'fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9',
        '6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811',
      ],
      [
        'da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2',
        '8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1',
      ],
      [
        'a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13',
        '7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c',
      ],
      [
        '174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c',
        'ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73',
      ],
      [
        '959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba',
        '2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd',
      ],
      [
        'd2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151',
        'e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405',
      ],
      [
        '64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073',
        'd99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589',
      ],
      [
        '8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458',
        '38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e',
      ],
      [
        '13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b',
        '69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27',
      ],
      [
        'bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366',
        'd3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1',
      ],
      [
        '8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa',
        '40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482',
      ],
      [
        '8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0',
        '620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945',
      ],
      [
        'dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787',
        '7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573',
      ],
      [
        'f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e',
        'ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82',
      ],
    ],
  },
  naf: {
    wnd: 7,
    points: [
      [
        'f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
        '388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672',
      ],
      [
        '2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4',
        'd8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6',
      ],
      [
        '5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc',
        '6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da',
      ],
      [
        'acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe',
        'cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37',
      ],
      [
        '774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb',
        'd984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b',
      ],
      [
        'f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8',
        'ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81',
      ],
      [
        'd7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e',
        '581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58',
      ],
      [
        'defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34',
        '4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77',
      ],
      [
        '2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c',
        '85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a',
      ],
      [
        '352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5',
        '321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c',
      ],
      [
        '2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f',
        '2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67',
      ],
      [
        '9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714',
        '73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402',
      ],
      [
        'daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729',
        'a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55',
      ],
      [
        'c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db',
        '2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482',
      ],
      [
        '6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4',
        'e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82',
      ],
      [
        '1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5',
        'b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396',
      ],
      [
        '605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479',
        '2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49',
      ],
      [
        '62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d',
        '80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf',
      ],
      [
        '80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f',
        '1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a',
      ],
      [
        '7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb',
        'd0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7',
      ],
      [
        'd528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9',
        'eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933',
      ],
      [
        '49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963',
        '758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a',
      ],
      [
        '77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74',
        '958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6',
      ],
      [
        'f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530',
        'e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37',
      ],
      [
        '463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b',
        '5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e',
      ],
      [
        'f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247',
        'cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6',
      ],
      [
        'caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1',
        'cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476',
      ],
      [
        '2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120',
        '4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40',
      ],
      [
        '7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435',
        '91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61',
      ],
      [
        '754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18',
        '673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683',
      ],
      [
        'e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8',
        '59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5',
      ],
      [
        '186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb',
        '3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b',
      ],
      [
        'df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f',
        '55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417',
      ],
      [
        '5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143',
        'efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868',
      ],
      [
        '290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba',
        'e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a',
      ],
      [
        'af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45',
        'f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6',
      ],
      [
        '766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a',
        '744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996',
      ],
      [
        '59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e',
        'c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e',
      ],
      [
        'f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8',
        'e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d',
      ],
      [
        '7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c',
        '30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2',
      ],
      [
        '948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519',
        'e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e',
      ],
      [
        '7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab',
        '100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437',
      ],
      [
        '3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca',
        'ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311',
      ],
      [
        'd3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf',
        '8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4',
      ],
      [
        '1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610',
        '68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575',
      ],
      [
        '733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4',
        'f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d',
      ],
      [
        '15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c',
        'd56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d',
      ],
      [
        'a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940',
        'edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629',
      ],
      [
        'e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980',
        'a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06',
      ],
      [
        '311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3',
        '66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374',
      ],
      [
        '34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf',
        '9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee',
      ],
      [
        'f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63',
        '4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1',
      ],
      [
        'd7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448',
        'fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b',
      ],
      [
        '32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf',
        '5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661',
      ],
      [
        '7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5',
        '8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6',
      ],
      [
        'ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6',
        '8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e',
      ],
      [
        '16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5',
        '5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d',
      ],
      [
        'eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99',
        'f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc',
      ],
      [
        '78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51',
        'f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4',
      ],
      [
        '494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5',
        '42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c',
      ],
      [
        'a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5',
        '204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b',
      ],
      [
        'c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997',
        '4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913',
      ],
      [
        '841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881',
        '73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154',
      ],
      [
        '5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5',
        '39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865',
      ],
      [
        '36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66',
        'd2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc',
      ],
      [
        '336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726',
        'ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224',
      ],
      [
        '8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede',
        '6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e',
      ],
      [
        '1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94',
        '60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6',
      ],
      [
        '85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31',
        '3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511',
      ],
      [
        '29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51',
        'b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b',
      ],
      [
        'a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252',
        'ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2',
      ],
      [
        '4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5',
        'cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c',
      ],
      [
        'd24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b',
        '6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3',
      ],
      [
        'ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4',
        '322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d',
      ],
      [
        'af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f',
        '6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700',
      ],
      [
        'e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889',
        '2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4',
      ],
      [
        '591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246',
        'b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196',
      ],
      [
        '11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984',
        '998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4',
      ],
      [
        '3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a',
        'b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257',
      ],
      [
        'cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030',
        'bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13',
      ],
      [
        'c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197',
        '6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096',
      ],
      [
        'c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593',
        'c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38',
      ],
      [
        'a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef',
        '21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f',
      ],
      [
        '347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38',
        '60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448',
      ],
      [
        'da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a',
        '49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a',
      ],
      [
        'c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111',
        '5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4',
      ],
      [
        '4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502',
        '7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437',
      ],
      [
        '3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea',
        'be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7',
      ],
      [
        'cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26',
        '8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d',
      ],
      [
        'b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986',
        '39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a',
      ],
      [
        'd4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e',
        '62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54',
      ],
      [
        '48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4',
        '25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77',
      ],
      [
        'dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda',
        'ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517',
      ],
      [
        '6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859',
        'cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10',
      ],
      [
        'e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f',
        'f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125',
      ],
      [
        'eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c',
        '6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e',
      ],
      [
        '13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942',
        'fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1',
      ],
      [
        'ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a',
        '1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2',
      ],
      [
        'b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80',
        '5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423',
      ],
      [
        'ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d',
        '438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8',
      ],
      [
        '8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1',
        'cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758',
      ],
      [
        '52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63',
        'c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375',
      ],
      [
        'e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352',
        '6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d',
      ],
      [
        '7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193',
        'ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec',
      ],
      [
        '5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00',
        '9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0',
      ],
      [
        '32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58',
        'ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c',
      ],
      [
        'e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7',
        'd3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4',
      ],
      [
        '8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8',
        'c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f',
      ],
      [
        '4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e',
        '67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649',
      ],
      [
        '3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d',
        'cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826',
      ],
      [
        '674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b',
        '299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5',
      ],
      [
        'd32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f',
        'f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87',
      ],
      [
        '30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6',
        '462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b',
      ],
      [
        'be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297',
        '62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc',
      ],
      [
        '93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a',
        '7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c',
      ],
      [
        'b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c',
        'ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f',
      ],
      [
        'd5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52',
        '4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a',
      ],
      [
        'd3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb',
        'bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46',
      ],
      [
        '463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065',
        'bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f',
      ],
      [
        '7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917',
        '603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03',
      ],
      [
        '74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9',
        'cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08',
      ],
      [
        '30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3',
        '553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8',
      ],
      [
        '9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57',
        '712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373',
      ],
      [
        '176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66',
        'ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3',
      ],
      [
        '75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8',
        '9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8',
      ],
      [
        '809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721',
        '9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1',
      ],
      [
        '1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180',
        '4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9',
      ],
    ],
  },
};

},{}],97:[function(require,module,exports){
'use strict';

var utils = exports;
var BN = require('bn.js');
var minAssert = require('minimalistic-assert');
var minUtils = require('minimalistic-crypto-utils');

utils.assert = minAssert;
utils.toArray = minUtils.toArray;
utils.zero2 = minUtils.zero2;
utils.toHex = minUtils.toHex;
utils.encode = minUtils.encode;

// Represent num in a w-NAF form
function getNAF(num, w, bits) {
  var naf = new Array(Math.max(num.bitLength(), bits) + 1);
  naf.fill(0);

  var ws = 1 << (w + 1);
  var k = num.clone();

  for (var i = 0; i < naf.length; i++) {
    var z;
    var mod = k.andln(ws - 1);
    if (k.isOdd()) {
      if (mod > (ws >> 1) - 1)
        z = (ws >> 1) - mod;
      else
        z = mod;
      k.isubn(z);
    } else {
      z = 0;
    }

    naf[i] = z;
    k.iushrn(1);
  }

  return naf;
}
utils.getNAF = getNAF;

// Represent k1, k2 in a Joint Sparse Form
function getJSF(k1, k2) {
  var jsf = [
    [],
    [],
  ];

  k1 = k1.clone();
  k2 = k2.clone();
  var d1 = 0;
  var d2 = 0;
  var m8;
  while (k1.cmpn(-d1) > 0 || k2.cmpn(-d2) > 0) {
    // First phase
    var m14 = (k1.andln(3) + d1) & 3;
    var m24 = (k2.andln(3) + d2) & 3;
    if (m14 === 3)
      m14 = -1;
    if (m24 === 3)
      m24 = -1;
    var u1;
    if ((m14 & 1) === 0) {
      u1 = 0;
    } else {
      m8 = (k1.andln(7) + d1) & 7;
      if ((m8 === 3 || m8 === 5) && m24 === 2)
        u1 = -m14;
      else
        u1 = m14;
    }
    jsf[0].push(u1);

    var u2;
    if ((m24 & 1) === 0) {
      u2 = 0;
    } else {
      m8 = (k2.andln(7) + d2) & 7;
      if ((m8 === 3 || m8 === 5) && m14 === 2)
        u2 = -m24;
      else
        u2 = m24;
    }
    jsf[1].push(u2);

    // Second phase
    if (2 * d1 === u1 + 1)
      d1 = 1 - d1;
    if (2 * d2 === u2 + 1)
      d2 = 1 - d2;
    k1.iushrn(1);
    k2.iushrn(1);
  }

  return jsf;
}
utils.getJSF = getJSF;

function cachedProperty(obj, name, computer) {
  var key = '_' + name;
  obj.prototype[name] = function cachedProperty() {
    return this[key] !== undefined ? this[key] :
      this[key] = computer.call(this);
  };
}
utils.cachedProperty = cachedProperty;

function parseBytes(bytes) {
  return typeof bytes === 'string' ? utils.toArray(bytes, 'hex') :
    bytes;
}
utils.parseBytes = parseBytes;

function intFromLE(bytes) {
  return new BN(bytes, 'hex', 'le');
}
utils.intFromLE = intFromLE;


},{"bn.js":80,"minimalistic-assert":115,"minimalistic-crypto-utils":116}],98:[function(require,module,exports){
module.exports={
  "name": "elliptic",
  "version": "6.5.4",
  "description": "EC cryptography",
  "main": "lib/elliptic.js",
  "files": [
    "lib"
  ],
  "scripts": {
    "lint": "eslint lib test",
    "lint:fix": "npm run lint -- --fix",
    "unit": "istanbul test _mocha --reporter=spec test/index.js",
    "test": "npm run lint && npm run unit",
    "version": "grunt dist && git add dist/"
  },
  "repository": {
    "type": "git",
    "url": "git@github.com:indutny/elliptic"
  },
  "keywords": [
    "EC",
    "Elliptic",
    "curve",
    "Cryptography"
  ],
  "author": "Fedor Indutny <fedor@indutny.com>",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/indutny/elliptic/issues"
  },
  "homepage": "https://github.com/indutny/elliptic",
  "devDependencies": {
    "brfs": "^2.0.2",
    "coveralls": "^3.1.0",
    "eslint": "^7.6.0",
    "grunt": "^1.2.1",
    "grunt-browserify": "^5.3.0",
    "grunt-cli": "^1.3.2",
    "grunt-contrib-connect": "^3.0.0",
    "grunt-contrib-copy": "^1.0.0",
    "grunt-contrib-uglify": "^5.0.0",
    "grunt-mocha-istanbul": "^5.0.2",
    "grunt-saucelabs": "^9.0.1",
    "istanbul": "^0.4.5",
    "mocha": "^8.0.1"
  },
  "dependencies": {
    "bn.js": "^4.11.9",
    "brorand": "^1.1.0",
    "hash.js": "^1.0.0",
    "hmac-drbg": "^1.0.1",
    "inherits": "^2.0.4",
    "minimalistic-assert": "^1.0.1",
    "minimalistic-crypto-utils": "^1.0.1"
  }
}

},{}],99:[function(require,module,exports){
var hash = exports;

hash.utils = require('./hash/utils');
hash.common = require('./hash/common');
hash.sha = require('./hash/sha');
hash.ripemd = require('./hash/ripemd');
hash.hmac = require('./hash/hmac');

// Proxy hash functions to the main object
hash.sha1 = hash.sha.sha1;
hash.sha256 = hash.sha.sha256;
hash.sha224 = hash.sha.sha224;
hash.sha384 = hash.sha.sha384;
hash.sha512 = hash.sha.sha512;
hash.ripemd160 = hash.ripemd.ripemd160;

},{"./hash/common":100,"./hash/hmac":101,"./hash/ripemd":102,"./hash/sha":103,"./hash/utils":110}],100:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var assert = require('minimalistic-assert');

function BlockHash() {
  this.pending = null;
  this.pendingTotal = 0;
  this.blockSize = this.constructor.blockSize;
  this.outSize = this.constructor.outSize;
  this.hmacStrength = this.constructor.hmacStrength;
  this.padLength = this.constructor.padLength / 8;
  this.endian = 'big';

  this._delta8 = this.blockSize / 8;
  this._delta32 = this.blockSize / 32;
}
exports.BlockHash = BlockHash;

BlockHash.prototype.update = function update(msg, enc) {
  // Convert message to array, pad it, and join into 32bit blocks
  msg = utils.toArray(msg, enc);
  if (!this.pending)
    this.pending = msg;
  else
    this.pending = this.pending.concat(msg);
  this.pendingTotal += msg.length;

  // Enough data, try updating
  if (this.pending.length >= this._delta8) {
    msg = this.pending;

    // Process pending data in blocks
    var r = msg.length % this._delta8;
    this.pending = msg.slice(msg.length - r, msg.length);
    if (this.pending.length === 0)
      this.pending = null;

    msg = utils.join32(msg, 0, msg.length - r, this.endian);
    for (var i = 0; i < msg.length; i += this._delta32)
      this._update(msg, i, i + this._delta32);
  }

  return this;
};

BlockHash.prototype.digest = function digest(enc) {
  this.update(this._pad());
  assert(this.pending === null);

  return this._digest(enc);
};

BlockHash.prototype._pad = function pad() {
  var len = this.pendingTotal;
  var bytes = this._delta8;
  var k = bytes - ((len + this.padLength) % bytes);
  var res = new Array(k + this.padLength);
  res[0] = 0x80;
  for (var i = 1; i < k; i++)
    res[i] = 0;

  // Append length
  len <<= 3;
  if (this.endian === 'big') {
    for (var t = 8; t < this.padLength; t++)
      res[i++] = 0;

    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = (len >>> 24) & 0xff;
    res[i++] = (len >>> 16) & 0xff;
    res[i++] = (len >>> 8) & 0xff;
    res[i++] = len & 0xff;
  } else {
    res[i++] = len & 0xff;
    res[i++] = (len >>> 8) & 0xff;
    res[i++] = (len >>> 16) & 0xff;
    res[i++] = (len >>> 24) & 0xff;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;
    res[i++] = 0;

    for (t = 8; t < this.padLength; t++)
      res[i++] = 0;
  }

  return res;
};

},{"./utils":110,"minimalistic-assert":115}],101:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var assert = require('minimalistic-assert');

function Hmac(hash, key, enc) {
  if (!(this instanceof Hmac))
    return new Hmac(hash, key, enc);
  this.Hash = hash;
  this.blockSize = hash.blockSize / 8;
  this.outSize = hash.outSize / 8;
  this.inner = null;
  this.outer = null;

  this._init(utils.toArray(key, enc));
}
module.exports = Hmac;

Hmac.prototype._init = function init(key) {
  // Shorten key, if needed
  if (key.length > this.blockSize)
    key = new this.Hash().update(key).digest();
  assert(key.length <= this.blockSize);

  // Add padding to key
  for (var i = key.length; i < this.blockSize; i++)
    key.push(0);

  for (i = 0; i < key.length; i++)
    key[i] ^= 0x36;
  this.inner = new this.Hash().update(key);

  // 0x36 ^ 0x5c = 0x6a
  for (i = 0; i < key.length; i++)
    key[i] ^= 0x6a;
  this.outer = new this.Hash().update(key);
};

Hmac.prototype.update = function update(msg, enc) {
  this.inner.update(msg, enc);
  return this;
};

Hmac.prototype.digest = function digest(enc) {
  this.outer.update(this.inner.digest());
  return this.outer.digest(enc);
};

},{"./utils":110,"minimalistic-assert":115}],102:[function(require,module,exports){
'use strict';

var utils = require('./utils');
var common = require('./common');

var rotl32 = utils.rotl32;
var sum32 = utils.sum32;
var sum32_3 = utils.sum32_3;
var sum32_4 = utils.sum32_4;
var BlockHash = common.BlockHash;

function RIPEMD160() {
  if (!(this instanceof RIPEMD160))
    return new RIPEMD160();

  BlockHash.call(this);

  this.h = [ 0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0 ];
  this.endian = 'little';
}
utils.inherits(RIPEMD160, BlockHash);
exports.ripemd160 = RIPEMD160;

RIPEMD160.blockSize = 512;
RIPEMD160.outSize = 160;
RIPEMD160.hmacStrength = 192;
RIPEMD160.padLength = 64;

RIPEMD160.prototype._update = function update(msg, start) {
  var A = this.h[0];
  var B = this.h[1];
  var C = this.h[2];
  var D = this.h[3];
  var E = this.h[4];
  var Ah = A;
  var Bh = B;
  var Ch = C;
  var Dh = D;
  var Eh = E;
  for (var j = 0; j < 80; j++) {
    var T = sum32(
      rotl32(
        sum32_4(A, f(j, B, C, D), msg[r[j] + start], K(j)),
        s[j]),
      E);
    A = E;
    E = D;
    D = rotl32(C, 10);
    C = B;
    B = T;
    T = sum32(
      rotl32(
        sum32_4(Ah, f(79 - j, Bh, Ch, Dh), msg[rh[j] + start], Kh(j)),
        sh[j]),
      Eh);
    Ah = Eh;
    Eh = Dh;
    Dh = rotl32(Ch, 10);
    Ch = Bh;
    Bh = T;
  }
  T = sum32_3(this.h[1], C, Dh);
  this.h[1] = sum32_3(this.h[2], D, Eh);
  this.h[2] = sum32_3(this.h[3], E, Ah);
  this.h[3] = sum32_3(this.h[4], A, Bh);
  this.h[4] = sum32_3(this.h[0], B, Ch);
  this.h[0] = T;
};

RIPEMD160.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'little');
  else
    return utils.split32(this.h, 'little');
};

function f(j, x, y, z) {
  if (j <= 15)
    return x ^ y ^ z;
  else if (j <= 31)
    return (x & y) | ((~x) & z);
  else if (j <= 47)
    return (x | (~y)) ^ z;
  else if (j <= 63)
    return (x & z) | (y & (~z));
  else
    return x ^ (y | (~z));
}

function K(j) {
  if (j <= 15)
    return 0x00000000;
  else if (j <= 31)
    return 0x5a827999;
  else if (j <= 47)
    return 0x6ed9eba1;
  else if (j <= 63)
    return 0x8f1bbcdc;
  else
    return 0xa953fd4e;
}

function Kh(j) {
  if (j <= 15)
    return 0x50a28be6;
  else if (j <= 31)
    return 0x5c4dd124;
  else if (j <= 47)
    return 0x6d703ef3;
  else if (j <= 63)
    return 0x7a6d76e9;
  else
    return 0x00000000;
}

var r = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
  3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
  1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
  4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
];

var rh = [
  5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
  6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
  15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
  8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
  12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
];

var s = [
  11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
  7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
  11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
  11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
  9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
];

var sh = [
  8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
  9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
  9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
  15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
  8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
];

},{"./common":100,"./utils":110}],103:[function(require,module,exports){
'use strict';

exports.sha1 = require('./sha/1');
exports.sha224 = require('./sha/224');
exports.sha256 = require('./sha/256');
exports.sha384 = require('./sha/384');
exports.sha512 = require('./sha/512');

},{"./sha/1":104,"./sha/224":105,"./sha/256":106,"./sha/384":107,"./sha/512":108}],104:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var common = require('../common');
var shaCommon = require('./common');

var rotl32 = utils.rotl32;
var sum32 = utils.sum32;
var sum32_5 = utils.sum32_5;
var ft_1 = shaCommon.ft_1;
var BlockHash = common.BlockHash;

var sha1_K = [
  0x5A827999, 0x6ED9EBA1,
  0x8F1BBCDC, 0xCA62C1D6
];

function SHA1() {
  if (!(this instanceof SHA1))
    return new SHA1();

  BlockHash.call(this);
  this.h = [
    0x67452301, 0xefcdab89, 0x98badcfe,
    0x10325476, 0xc3d2e1f0 ];
  this.W = new Array(80);
}

utils.inherits(SHA1, BlockHash);
module.exports = SHA1;

SHA1.blockSize = 512;
SHA1.outSize = 160;
SHA1.hmacStrength = 80;
SHA1.padLength = 64;

SHA1.prototype._update = function _update(msg, start) {
  var W = this.W;

  for (var i = 0; i < 16; i++)
    W[i] = msg[start + i];

  for(; i < W.length; i++)
    W[i] = rotl32(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);

  var a = this.h[0];
  var b = this.h[1];
  var c = this.h[2];
  var d = this.h[3];
  var e = this.h[4];

  for (i = 0; i < W.length; i++) {
    var s = ~~(i / 20);
    var t = sum32_5(rotl32(a, 5), ft_1(s, b, c, d), e, W[i], sha1_K[s]);
    e = d;
    d = c;
    c = rotl32(b, 30);
    b = a;
    a = t;
  }

  this.h[0] = sum32(this.h[0], a);
  this.h[1] = sum32(this.h[1], b);
  this.h[2] = sum32(this.h[2], c);
  this.h[3] = sum32(this.h[3], d);
  this.h[4] = sum32(this.h[4], e);
};

SHA1.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'big');
  else
    return utils.split32(this.h, 'big');
};

},{"../common":100,"../utils":110,"./common":109}],105:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var SHA256 = require('./256');

function SHA224() {
  if (!(this instanceof SHA224))
    return new SHA224();

  SHA256.call(this);
  this.h = [
    0xc1059ed8, 0x367cd507, 0x3070dd17, 0xf70e5939,
    0xffc00b31, 0x68581511, 0x64f98fa7, 0xbefa4fa4 ];
}
utils.inherits(SHA224, SHA256);
module.exports = SHA224;

SHA224.blockSize = 512;
SHA224.outSize = 224;
SHA224.hmacStrength = 192;
SHA224.padLength = 64;

SHA224.prototype._digest = function digest(enc) {
  // Just truncate output
  if (enc === 'hex')
    return utils.toHex32(this.h.slice(0, 7), 'big');
  else
    return utils.split32(this.h.slice(0, 7), 'big');
};


},{"../utils":110,"./256":106}],106:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var common = require('../common');
var shaCommon = require('./common');
var assert = require('minimalistic-assert');

var sum32 = utils.sum32;
var sum32_4 = utils.sum32_4;
var sum32_5 = utils.sum32_5;
var ch32 = shaCommon.ch32;
var maj32 = shaCommon.maj32;
var s0_256 = shaCommon.s0_256;
var s1_256 = shaCommon.s1_256;
var g0_256 = shaCommon.g0_256;
var g1_256 = shaCommon.g1_256;

var BlockHash = common.BlockHash;

var sha256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function SHA256() {
  if (!(this instanceof SHA256))
    return new SHA256();

  BlockHash.call(this);
  this.h = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  this.k = sha256_K;
  this.W = new Array(64);
}
utils.inherits(SHA256, BlockHash);
module.exports = SHA256;

SHA256.blockSize = 512;
SHA256.outSize = 256;
SHA256.hmacStrength = 192;
SHA256.padLength = 64;

SHA256.prototype._update = function _update(msg, start) {
  var W = this.W;

  for (var i = 0; i < 16; i++)
    W[i] = msg[start + i];
  for (; i < W.length; i++)
    W[i] = sum32_4(g1_256(W[i - 2]), W[i - 7], g0_256(W[i - 15]), W[i - 16]);

  var a = this.h[0];
  var b = this.h[1];
  var c = this.h[2];
  var d = this.h[3];
  var e = this.h[4];
  var f = this.h[5];
  var g = this.h[6];
  var h = this.h[7];

  assert(this.k.length === W.length);
  for (i = 0; i < W.length; i++) {
    var T1 = sum32_5(h, s1_256(e), ch32(e, f, g), this.k[i], W[i]);
    var T2 = sum32(s0_256(a), maj32(a, b, c));
    h = g;
    g = f;
    f = e;
    e = sum32(d, T1);
    d = c;
    c = b;
    b = a;
    a = sum32(T1, T2);
  }

  this.h[0] = sum32(this.h[0], a);
  this.h[1] = sum32(this.h[1], b);
  this.h[2] = sum32(this.h[2], c);
  this.h[3] = sum32(this.h[3], d);
  this.h[4] = sum32(this.h[4], e);
  this.h[5] = sum32(this.h[5], f);
  this.h[6] = sum32(this.h[6], g);
  this.h[7] = sum32(this.h[7], h);
};

SHA256.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'big');
  else
    return utils.split32(this.h, 'big');
};

},{"../common":100,"../utils":110,"./common":109,"minimalistic-assert":115}],107:[function(require,module,exports){
'use strict';

var utils = require('../utils');

var SHA512 = require('./512');

function SHA384() {
  if (!(this instanceof SHA384))
    return new SHA384();

  SHA512.call(this);
  this.h = [
    0xcbbb9d5d, 0xc1059ed8,
    0x629a292a, 0x367cd507,
    0x9159015a, 0x3070dd17,
    0x152fecd8, 0xf70e5939,
    0x67332667, 0xffc00b31,
    0x8eb44a87, 0x68581511,
    0xdb0c2e0d, 0x64f98fa7,
    0x47b5481d, 0xbefa4fa4 ];
}
utils.inherits(SHA384, SHA512);
module.exports = SHA384;

SHA384.blockSize = 1024;
SHA384.outSize = 384;
SHA384.hmacStrength = 192;
SHA384.padLength = 128;

SHA384.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h.slice(0, 12), 'big');
  else
    return utils.split32(this.h.slice(0, 12), 'big');
};

},{"../utils":110,"./512":108}],108:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var common = require('../common');
var assert = require('minimalistic-assert');

var rotr64_hi = utils.rotr64_hi;
var rotr64_lo = utils.rotr64_lo;
var shr64_hi = utils.shr64_hi;
var shr64_lo = utils.shr64_lo;
var sum64 = utils.sum64;
var sum64_hi = utils.sum64_hi;
var sum64_lo = utils.sum64_lo;
var sum64_4_hi = utils.sum64_4_hi;
var sum64_4_lo = utils.sum64_4_lo;
var sum64_5_hi = utils.sum64_5_hi;
var sum64_5_lo = utils.sum64_5_lo;

var BlockHash = common.BlockHash;

var sha512_K = [
  0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
  0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
  0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
  0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
  0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
  0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
  0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
  0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
  0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
  0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
  0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
  0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
  0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
  0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
  0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
  0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
  0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
  0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
  0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
  0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
  0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
  0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
  0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
  0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
  0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
  0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
  0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
  0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
  0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
  0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
  0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
  0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
  0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
  0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
  0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
  0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
  0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
  0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
  0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
  0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];

function SHA512() {
  if (!(this instanceof SHA512))
    return new SHA512();

  BlockHash.call(this);
  this.h = [
    0x6a09e667, 0xf3bcc908,
    0xbb67ae85, 0x84caa73b,
    0x3c6ef372, 0xfe94f82b,
    0xa54ff53a, 0x5f1d36f1,
    0x510e527f, 0xade682d1,
    0x9b05688c, 0x2b3e6c1f,
    0x1f83d9ab, 0xfb41bd6b,
    0x5be0cd19, 0x137e2179 ];
  this.k = sha512_K;
  this.W = new Array(160);
}
utils.inherits(SHA512, BlockHash);
module.exports = SHA512;

SHA512.blockSize = 1024;
SHA512.outSize = 512;
SHA512.hmacStrength = 192;
SHA512.padLength = 128;

SHA512.prototype._prepareBlock = function _prepareBlock(msg, start) {
  var W = this.W;

  // 32 x 32bit words
  for (var i = 0; i < 32; i++)
    W[i] = msg[start + i];
  for (; i < W.length; i += 2) {
    var c0_hi = g1_512_hi(W[i - 4], W[i - 3]);  // i - 2
    var c0_lo = g1_512_lo(W[i - 4], W[i - 3]);
    var c1_hi = W[i - 14];  // i - 7
    var c1_lo = W[i - 13];
    var c2_hi = g0_512_hi(W[i - 30], W[i - 29]);  // i - 15
    var c2_lo = g0_512_lo(W[i - 30], W[i - 29]);
    var c3_hi = W[i - 32];  // i - 16
    var c3_lo = W[i - 31];

    W[i] = sum64_4_hi(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo);
    W[i + 1] = sum64_4_lo(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo);
  }
};

SHA512.prototype._update = function _update(msg, start) {
  this._prepareBlock(msg, start);

  var W = this.W;

  var ah = this.h[0];
  var al = this.h[1];
  var bh = this.h[2];
  var bl = this.h[3];
  var ch = this.h[4];
  var cl = this.h[5];
  var dh = this.h[6];
  var dl = this.h[7];
  var eh = this.h[8];
  var el = this.h[9];
  var fh = this.h[10];
  var fl = this.h[11];
  var gh = this.h[12];
  var gl = this.h[13];
  var hh = this.h[14];
  var hl = this.h[15];

  assert(this.k.length === W.length);
  for (var i = 0; i < W.length; i += 2) {
    var c0_hi = hh;
    var c0_lo = hl;
    var c1_hi = s1_512_hi(eh, el);
    var c1_lo = s1_512_lo(eh, el);
    var c2_hi = ch64_hi(eh, el, fh, fl, gh, gl);
    var c2_lo = ch64_lo(eh, el, fh, fl, gh, gl);
    var c3_hi = this.k[i];
    var c3_lo = this.k[i + 1];
    var c4_hi = W[i];
    var c4_lo = W[i + 1];

    var T1_hi = sum64_5_hi(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo,
      c4_hi, c4_lo);
    var T1_lo = sum64_5_lo(
      c0_hi, c0_lo,
      c1_hi, c1_lo,
      c2_hi, c2_lo,
      c3_hi, c3_lo,
      c4_hi, c4_lo);

    c0_hi = s0_512_hi(ah, al);
    c0_lo = s0_512_lo(ah, al);
    c1_hi = maj64_hi(ah, al, bh, bl, ch, cl);
    c1_lo = maj64_lo(ah, al, bh, bl, ch, cl);

    var T2_hi = sum64_hi(c0_hi, c0_lo, c1_hi, c1_lo);
    var T2_lo = sum64_lo(c0_hi, c0_lo, c1_hi, c1_lo);

    hh = gh;
    hl = gl;

    gh = fh;
    gl = fl;

    fh = eh;
    fl = el;

    eh = sum64_hi(dh, dl, T1_hi, T1_lo);
    el = sum64_lo(dl, dl, T1_hi, T1_lo);

    dh = ch;
    dl = cl;

    ch = bh;
    cl = bl;

    bh = ah;
    bl = al;

    ah = sum64_hi(T1_hi, T1_lo, T2_hi, T2_lo);
    al = sum64_lo(T1_hi, T1_lo, T2_hi, T2_lo);
  }

  sum64(this.h, 0, ah, al);
  sum64(this.h, 2, bh, bl);
  sum64(this.h, 4, ch, cl);
  sum64(this.h, 6, dh, dl);
  sum64(this.h, 8, eh, el);
  sum64(this.h, 10, fh, fl);
  sum64(this.h, 12, gh, gl);
  sum64(this.h, 14, hh, hl);
};

SHA512.prototype._digest = function digest(enc) {
  if (enc === 'hex')
    return utils.toHex32(this.h, 'big');
  else
    return utils.split32(this.h, 'big');
};

function ch64_hi(xh, xl, yh, yl, zh) {
  var r = (xh & yh) ^ ((~xh) & zh);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function ch64_lo(xh, xl, yh, yl, zh, zl) {
  var r = (xl & yl) ^ ((~xl) & zl);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function maj64_hi(xh, xl, yh, yl, zh) {
  var r = (xh & yh) ^ (xh & zh) ^ (yh & zh);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function maj64_lo(xh, xl, yh, yl, zh, zl) {
  var r = (xl & yl) ^ (xl & zl) ^ (yl & zl);
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s0_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 28);
  var c1_hi = rotr64_hi(xl, xh, 2);  // 34
  var c2_hi = rotr64_hi(xl, xh, 7);  // 39

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s0_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 28);
  var c1_lo = rotr64_lo(xl, xh, 2);  // 34
  var c2_lo = rotr64_lo(xl, xh, 7);  // 39

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s1_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 14);
  var c1_hi = rotr64_hi(xh, xl, 18);
  var c2_hi = rotr64_hi(xl, xh, 9);  // 41

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function s1_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 14);
  var c1_lo = rotr64_lo(xh, xl, 18);
  var c2_lo = rotr64_lo(xl, xh, 9);  // 41

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g0_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 1);
  var c1_hi = rotr64_hi(xh, xl, 8);
  var c2_hi = shr64_hi(xh, xl, 7);

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g0_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 1);
  var c1_lo = rotr64_lo(xh, xl, 8);
  var c2_lo = shr64_lo(xh, xl, 7);

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g1_512_hi(xh, xl) {
  var c0_hi = rotr64_hi(xh, xl, 19);
  var c1_hi = rotr64_hi(xl, xh, 29);  // 61
  var c2_hi = shr64_hi(xh, xl, 6);

  var r = c0_hi ^ c1_hi ^ c2_hi;
  if (r < 0)
    r += 0x100000000;
  return r;
}

function g1_512_lo(xh, xl) {
  var c0_lo = rotr64_lo(xh, xl, 19);
  var c1_lo = rotr64_lo(xl, xh, 29);  // 61
  var c2_lo = shr64_lo(xh, xl, 6);

  var r = c0_lo ^ c1_lo ^ c2_lo;
  if (r < 0)
    r += 0x100000000;
  return r;
}

},{"../common":100,"../utils":110,"minimalistic-assert":115}],109:[function(require,module,exports){
'use strict';

var utils = require('../utils');
var rotr32 = utils.rotr32;

function ft_1(s, x, y, z) {
  if (s === 0)
    return ch32(x, y, z);
  if (s === 1 || s === 3)
    return p32(x, y, z);
  if (s === 2)
    return maj32(x, y, z);
}
exports.ft_1 = ft_1;

function ch32(x, y, z) {
  return (x & y) ^ ((~x) & z);
}
exports.ch32 = ch32;

function maj32(x, y, z) {
  return (x & y) ^ (x & z) ^ (y & z);
}
exports.maj32 = maj32;

function p32(x, y, z) {
  return x ^ y ^ z;
}
exports.p32 = p32;

function s0_256(x) {
  return rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22);
}
exports.s0_256 = s0_256;

function s1_256(x) {
  return rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25);
}
exports.s1_256 = s1_256;

function g0_256(x) {
  return rotr32(x, 7) ^ rotr32(x, 18) ^ (x >>> 3);
}
exports.g0_256 = g0_256;

function g1_256(x) {
  return rotr32(x, 17) ^ rotr32(x, 19) ^ (x >>> 10);
}
exports.g1_256 = g1_256;

},{"../utils":110}],110:[function(require,module,exports){
'use strict';

var assert = require('minimalistic-assert');
var inherits = require('inherits');

exports.inherits = inherits;

function isSurrogatePair(msg, i) {
  if ((msg.charCodeAt(i) & 0xFC00) !== 0xD800) {
    return false;
  }
  if (i < 0 || i + 1 >= msg.length) {
    return false;
  }
  return (msg.charCodeAt(i + 1) & 0xFC00) === 0xDC00;
}

function toArray(msg, enc) {
  if (Array.isArray(msg))
    return msg.slice();
  if (!msg)
    return [];
  var res = [];
  if (typeof msg === 'string') {
    if (!enc) {
      // Inspired by stringToUtf8ByteArray() in closure-library by Google
      // https://github.com/google/closure-library/blob/8598d87242af59aac233270742c8984e2b2bdbe0/closure/goog/crypt/crypt.js#L117-L143
      // Apache License 2.0
      // https://github.com/google/closure-library/blob/master/LICENSE
      var p = 0;
      for (var i = 0; i < msg.length; i++) {
        var c = msg.charCodeAt(i);
        if (c < 128) {
          res[p++] = c;
        } else if (c < 2048) {
          res[p++] = (c >> 6) | 192;
          res[p++] = (c & 63) | 128;
        } else if (isSurrogatePair(msg, i)) {
          c = 0x10000 + ((c & 0x03FF) << 10) + (msg.charCodeAt(++i) & 0x03FF);
          res[p++] = (c >> 18) | 240;
          res[p++] = ((c >> 12) & 63) | 128;
          res[p++] = ((c >> 6) & 63) | 128;
          res[p++] = (c & 63) | 128;
        } else {
          res[p++] = (c >> 12) | 224;
          res[p++] = ((c >> 6) & 63) | 128;
          res[p++] = (c & 63) | 128;
        }
      }
    } else if (enc === 'hex') {
      msg = msg.replace(/[^a-z0-9]+/ig, '');
      if (msg.length % 2 !== 0)
        msg = '0' + msg;
      for (i = 0; i < msg.length; i += 2)
        res.push(parseInt(msg[i] + msg[i + 1], 16));
    }
  } else {
    for (i = 0; i < msg.length; i++)
      res[i] = msg[i] | 0;
  }
  return res;
}
exports.toArray = toArray;

function toHex(msg) {
  var res = '';
  for (var i = 0; i < msg.length; i++)
    res += zero2(msg[i].toString(16));
  return res;
}
exports.toHex = toHex;

function htonl(w) {
  var res = (w >>> 24) |
            ((w >>> 8) & 0xff00) |
            ((w << 8) & 0xff0000) |
            ((w & 0xff) << 24);
  return res >>> 0;
}
exports.htonl = htonl;

function toHex32(msg, endian) {
  var res = '';
  for (var i = 0; i < msg.length; i++) {
    var w = msg[i];
    if (endian === 'little')
      w = htonl(w);
    res += zero8(w.toString(16));
  }
  return res;
}
exports.toHex32 = toHex32;

function zero2(word) {
  if (word.length === 1)
    return '0' + word;
  else
    return word;
}
exports.zero2 = zero2;

function zero8(word) {
  if (word.length === 7)
    return '0' + word;
  else if (word.length === 6)
    return '00' + word;
  else if (word.length === 5)
    return '000' + word;
  else if (word.length === 4)
    return '0000' + word;
  else if (word.length === 3)
    return '00000' + word;
  else if (word.length === 2)
    return '000000' + word;
  else if (word.length === 1)
    return '0000000' + word;
  else
    return word;
}
exports.zero8 = zero8;

function join32(msg, start, end, endian) {
  var len = end - start;
  assert(len % 4 === 0);
  var res = new Array(len / 4);
  for (var i = 0, k = start; i < res.length; i++, k += 4) {
    var w;
    if (endian === 'big')
      w = (msg[k] << 24) | (msg[k + 1] << 16) | (msg[k + 2] << 8) | msg[k + 3];
    else
      w = (msg[k + 3] << 24) | (msg[k + 2] << 16) | (msg[k + 1] << 8) | msg[k];
    res[i] = w >>> 0;
  }
  return res;
}
exports.join32 = join32;

function split32(msg, endian) {
  var res = new Array(msg.length * 4);
  for (var i = 0, k = 0; i < msg.length; i++, k += 4) {
    var m = msg[i];
    if (endian === 'big') {
      res[k] = m >>> 24;
      res[k + 1] = (m >>> 16) & 0xff;
      res[k + 2] = (m >>> 8) & 0xff;
      res[k + 3] = m & 0xff;
    } else {
      res[k + 3] = m >>> 24;
      res[k + 2] = (m >>> 16) & 0xff;
      res[k + 1] = (m >>> 8) & 0xff;
      res[k] = m & 0xff;
    }
  }
  return res;
}
exports.split32 = split32;

function rotr32(w, b) {
  return (w >>> b) | (w << (32 - b));
}
exports.rotr32 = rotr32;

function rotl32(w, b) {
  return (w << b) | (w >>> (32 - b));
}
exports.rotl32 = rotl32;

function sum32(a, b) {
  return (a + b) >>> 0;
}
exports.sum32 = sum32;

function sum32_3(a, b, c) {
  return (a + b + c) >>> 0;
}
exports.sum32_3 = sum32_3;

function sum32_4(a, b, c, d) {
  return (a + b + c + d) >>> 0;
}
exports.sum32_4 = sum32_4;

function sum32_5(a, b, c, d, e) {
  return (a + b + c + d + e) >>> 0;
}
exports.sum32_5 = sum32_5;

function sum64(buf, pos, ah, al) {
  var bh = buf[pos];
  var bl = buf[pos + 1];

  var lo = (al + bl) >>> 0;
  var hi = (lo < al ? 1 : 0) + ah + bh;
  buf[pos] = hi >>> 0;
  buf[pos + 1] = lo;
}
exports.sum64 = sum64;

function sum64_hi(ah, al, bh, bl) {
  var lo = (al + bl) >>> 0;
  var hi = (lo < al ? 1 : 0) + ah + bh;
  return hi >>> 0;
}
exports.sum64_hi = sum64_hi;

function sum64_lo(ah, al, bh, bl) {
  var lo = al + bl;
  return lo >>> 0;
}
exports.sum64_lo = sum64_lo;

function sum64_4_hi(ah, al, bh, bl, ch, cl, dh, dl) {
  var carry = 0;
  var lo = al;
  lo = (lo + bl) >>> 0;
  carry += lo < al ? 1 : 0;
  lo = (lo + cl) >>> 0;
  carry += lo < cl ? 1 : 0;
  lo = (lo + dl) >>> 0;
  carry += lo < dl ? 1 : 0;

  var hi = ah + bh + ch + dh + carry;
  return hi >>> 0;
}
exports.sum64_4_hi = sum64_4_hi;

function sum64_4_lo(ah, al, bh, bl, ch, cl, dh, dl) {
  var lo = al + bl + cl + dl;
  return lo >>> 0;
}
exports.sum64_4_lo = sum64_4_lo;

function sum64_5_hi(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
  var carry = 0;
  var lo = al;
  lo = (lo + bl) >>> 0;
  carry += lo < al ? 1 : 0;
  lo = (lo + cl) >>> 0;
  carry += lo < cl ? 1 : 0;
  lo = (lo + dl) >>> 0;
  carry += lo < dl ? 1 : 0;
  lo = (lo + el) >>> 0;
  carry += lo < el ? 1 : 0;

  var hi = ah + bh + ch + dh + eh + carry;
  return hi >>> 0;
}
exports.sum64_5_hi = sum64_5_hi;

function sum64_5_lo(ah, al, bh, bl, ch, cl, dh, dl, eh, el) {
  var lo = al + bl + cl + dl + el;

  return lo >>> 0;
}
exports.sum64_5_lo = sum64_5_lo;

function rotr64_hi(ah, al, num) {
  var r = (al << (32 - num)) | (ah >>> num);
  return r >>> 0;
}
exports.rotr64_hi = rotr64_hi;

function rotr64_lo(ah, al, num) {
  var r = (ah << (32 - num)) | (al >>> num);
  return r >>> 0;
}
exports.rotr64_lo = rotr64_lo;

function shr64_hi(ah, al, num) {
  return ah >>> num;
}
exports.shr64_hi = shr64_hi;

function shr64_lo(ah, al, num) {
  var r = (ah << (32 - num)) | (al >>> num);
  return r >>> 0;
}
exports.shr64_lo = shr64_lo;

},{"inherits":112,"minimalistic-assert":115}],111:[function(require,module,exports){
'use strict';

var hash = require('hash.js');
var utils = require('minimalistic-crypto-utils');
var assert = require('minimalistic-assert');

function HmacDRBG(options) {
  if (!(this instanceof HmacDRBG))
    return new HmacDRBG(options);
  this.hash = options.hash;
  this.predResist = !!options.predResist;

  this.outLen = this.hash.outSize;
  this.minEntropy = options.minEntropy || this.hash.hmacStrength;

  this._reseed = null;
  this.reseedInterval = null;
  this.K = null;
  this.V = null;

  var entropy = utils.toArray(options.entropy, options.entropyEnc || 'hex');
  var nonce = utils.toArray(options.nonce, options.nonceEnc || 'hex');
  var pers = utils.toArray(options.pers, options.persEnc || 'hex');
  assert(entropy.length >= (this.minEntropy / 8),
         'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');
  this._init(entropy, nonce, pers);
}
module.exports = HmacDRBG;

HmacDRBG.prototype._init = function init(entropy, nonce, pers) {
  var seed = entropy.concat(nonce).concat(pers);

  this.K = new Array(this.outLen / 8);
  this.V = new Array(this.outLen / 8);
  for (var i = 0; i < this.V.length; i++) {
    this.K[i] = 0x00;
    this.V[i] = 0x01;
  }

  this._update(seed);
  this._reseed = 1;
  this.reseedInterval = 0x1000000000000;  // 2^48
};

HmacDRBG.prototype._hmac = function hmac() {
  return new hash.hmac(this.hash, this.K);
};

HmacDRBG.prototype._update = function update(seed) {
  var kmac = this._hmac()
                 .update(this.V)
                 .update([ 0x00 ]);
  if (seed)
    kmac = kmac.update(seed);
  this.K = kmac.digest();
  this.V = this._hmac().update(this.V).digest();
  if (!seed)
    return;

  this.K = this._hmac()
               .update(this.V)
               .update([ 0x01 ])
               .update(seed)
               .digest();
  this.V = this._hmac().update(this.V).digest();
};

HmacDRBG.prototype.reseed = function reseed(entropy, entropyEnc, add, addEnc) {
  // Optional entropy enc
  if (typeof entropyEnc !== 'string') {
    addEnc = add;
    add = entropyEnc;
    entropyEnc = null;
  }

  entropy = utils.toArray(entropy, entropyEnc);
  add = utils.toArray(add, addEnc);

  assert(entropy.length >= (this.minEntropy / 8),
         'Not enough entropy. Minimum is: ' + this.minEntropy + ' bits');

  this._update(entropy.concat(add || []));
  this._reseed = 1;
};

HmacDRBG.prototype.generate = function generate(len, enc, add, addEnc) {
  if (this._reseed > this.reseedInterval)
    throw new Error('Reseed is required');

  // Optional encoding
  if (typeof enc !== 'string') {
    addEnc = add;
    add = enc;
    enc = null;
  }

  // Optional additional data
  if (add) {
    add = utils.toArray(add, addEnc || 'hex');
    this._update(add);
  }

  var temp = [];
  while (temp.length < len) {
    this.V = this._hmac().update(this.V).digest();
    temp = temp.concat(this.V);
  }

  var res = temp.slice(0, len);
  this._update(add);
  this._reseed++;
  return utils.encode(res, enc);
};

},{"hash.js":99,"minimalistic-assert":115,"minimalistic-crypto-utils":116}],112:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],113:[function(require,module,exports){
(function (process,global){(function (){
/**
 * [js-sha256]{@link https://github.com/emn178/js-sha256}
 *
 * @version 0.9.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2014-2017
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var ERROR = 'input is invalid type';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA256_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA256_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA256_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_SHA256_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  var OUTPUT_TYPES = ['hex', 'array', 'digest', 'arrayBuffer'];

  var blocks = [];

  if (root.JS_SHA256_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA256_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (outputType, is224) {
    return function (message) {
      return new Sha256(is224, true).update(message)[outputType]();
    };
  };

  var createMethod = function (is224) {
    var method = createOutputMethod('hex', is224);
    if (NODE_JS) {
      method = nodeWrap(method, is224);
    }
    method.create = function () {
      return new Sha256(is224);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createOutputMethod(type, is224);
    }
    return method;
  };

  var nodeWrap = function (method, is224) {
    var crypto = eval("require('crypto')");
    var Buffer = eval("require('buffer').Buffer");
    var algorithm = is224 ? 'sha224' : 'sha256';
    var nodeMethod = function (message) {
      if (typeof message === 'string') {
        return crypto.createHash(algorithm).update(message, 'utf8').digest('hex');
      } else {
        if (message === null || message === undefined) {
          throw new Error(ERROR);
        } else if (message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        }
      }
      if (Array.isArray(message) || ArrayBuffer.isView(message) ||
        message.constructor === Buffer) {
        return crypto.createHash(algorithm).update(new Buffer(message)).digest('hex');
      } else {
        return method(message);
      }
    };
    return nodeMethod;
  };

  var createHmacOutputMethod = function (outputType, is224) {
    return function (key, message) {
      return new HmacSha256(key, is224, true).update(message)[outputType]();
    };
  };

  var createHmacMethod = function (is224) {
    var method = createHmacOutputMethod('hex', is224);
    method.create = function (key) {
      return new HmacSha256(key, is224);
    };
    method.update = function (key, message) {
      return method.create(key).update(message);
    };
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createHmacOutputMethod(type, is224);
    }
    return method;
  };

  function Sha256(is224, sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
    } else {
      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    if (is224) {
      this.h0 = 0xc1059ed8;
      this.h1 = 0x367cd507;
      this.h2 = 0x3070dd17;
      this.h3 = 0xf70e5939;
      this.h4 = 0xffc00b31;
      this.h5 = 0x68581511;
      this.h6 = 0x64f98fa7;
      this.h7 = 0xbefa4fa4;
    } else { // 256
      this.h0 = 0x6a09e667;
      this.h1 = 0xbb67ae85;
      this.h2 = 0x3c6ef372;
      this.h3 = 0xa54ff53a;
      this.h4 = 0x510e527f;
      this.h5 = 0x9b05688c;
      this.h6 = 0x1f83d9ab;
      this.h7 = 0x5be0cd19;
    }

    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
    this.is224 = is224;
  }

  Sha256.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
      notString = true;
    }
    var code, index = 0, i, length = message.length, blocks = this.blocks;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
          blocks[4] = blocks[5] = blocks[6] = blocks[7] =
          blocks[8] = blocks[9] = blocks[10] = blocks[11] =
          blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if (notString) {
        for (i = this.start; index < length && i < 64; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < 64; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }

      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.block = blocks[16];
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };

  Sha256.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[16] = this.block;
    blocks[i >> 2] |= EXTRA[i & 3];
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };

  Sha256.prototype.hash = function () {
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6,
      h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

    for (j = 16; j < 64; ++j) {
      // rightrotate
      t1 = blocks[j - 15];
      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
      t1 = blocks[j - 2];
      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
    }

    bc = b & c;
    for (j = 0; j < 64; j += 4) {
      if (this.first) {
        if (this.is224) {
          ab = 300032;
          t1 = blocks[0] - 1413257819;
          h = t1 - 150054599 << 0;
          d = t1 + 24177077 << 0;
        } else {
          ab = 704751109;
          t1 = blocks[0] - 210244248;
          h = t1 - 1521486534 << 0;
          d = t1 + 143694565 << 0;
        }
        this.first = false;
      } else {
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        ab = a & b;
        maj = ab ^ (a & c) ^ bc;
        ch = (e & f) ^ (~e & g);
        t1 = h + s1 + ch + K[j] + blocks[j];
        t2 = s0 + maj;
        h = d + t1 << 0;
        d = t1 + t2 << 0;
      }
      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
      da = d & a;
      maj = da ^ (d & b) ^ ab;
      ch = (h & e) ^ (~h & f);
      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
      t2 = s0 + maj;
      g = c + t1 << 0;
      c = t1 + t2 << 0;
      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
      cd = c & d;
      maj = cd ^ (c & a) ^ da;
      ch = (g & h) ^ (~g & e);
      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
      t2 = s0 + maj;
      f = b + t1 << 0;
      b = t1 + t2 << 0;
      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
      bc = b & c;
      maj = bc ^ (b & d) ^ cd;
      ch = (f & g) ^ (~f & h);
      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
      t2 = s0 + maj;
      e = a + t1 << 0;
      a = t1 + t2 << 0;
    }

    this.h0 = this.h0 + a << 0;
    this.h1 = this.h1 + b << 0;
    this.h2 = this.h2 + c << 0;
    this.h3 = this.h3 + d << 0;
    this.h4 = this.h4 + e << 0;
    this.h5 = this.h5 + f << 0;
    this.h6 = this.h6 + g << 0;
    this.h7 = this.h7 + h << 0;
  };

  Sha256.prototype.hex = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var hex = HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] +
      HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] +
      HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] +
      HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] +
      HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] +
      HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] +
      HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] +
      HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] +
      HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] +
      HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] +
      HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] +
      HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] +
      HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] +
      HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] +
      HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] +
      HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] +
      HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] +
      HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] +
      HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] +
      HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] +
      HEX_CHARS[(h5 >> 28) & 0x0F] + HEX_CHARS[(h5 >> 24) & 0x0F] +
      HEX_CHARS[(h5 >> 20) & 0x0F] + HEX_CHARS[(h5 >> 16) & 0x0F] +
      HEX_CHARS[(h5 >> 12) & 0x0F] + HEX_CHARS[(h5 >> 8) & 0x0F] +
      HEX_CHARS[(h5 >> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] +
      HEX_CHARS[(h6 >> 28) & 0x0F] + HEX_CHARS[(h6 >> 24) & 0x0F] +
      HEX_CHARS[(h6 >> 20) & 0x0F] + HEX_CHARS[(h6 >> 16) & 0x0F] +
      HEX_CHARS[(h6 >> 12) & 0x0F] + HEX_CHARS[(h6 >> 8) & 0x0F] +
      HEX_CHARS[(h6 >> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F];
    if (!this.is224) {
      hex += HEX_CHARS[(h7 >> 28) & 0x0F] + HEX_CHARS[(h7 >> 24) & 0x0F] +
        HEX_CHARS[(h7 >> 20) & 0x0F] + HEX_CHARS[(h7 >> 16) & 0x0F] +
        HEX_CHARS[(h7 >> 12) & 0x0F] + HEX_CHARS[(h7 >> 8) & 0x0F] +
        HEX_CHARS[(h7 >> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
    }
    return hex;
  };

  Sha256.prototype.toString = Sha256.prototype.hex;

  Sha256.prototype.digest = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var arr = [
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,
      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,
      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF
    ];
    if (!this.is224) {
      arr.push((h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF);
    }
    return arr;
  };

  Sha256.prototype.array = Sha256.prototype.digest;

  Sha256.prototype.arrayBuffer = function () {
    this.finalize();

    var buffer = new ArrayBuffer(this.is224 ? 28 : 32);
    var dataView = new DataView(buffer);
    dataView.setUint32(0, this.h0);
    dataView.setUint32(4, this.h1);
    dataView.setUint32(8, this.h2);
    dataView.setUint32(12, this.h3);
    dataView.setUint32(16, this.h4);
    dataView.setUint32(20, this.h5);
    dataView.setUint32(24, this.h6);
    if (!this.is224) {
      dataView.setUint32(28, this.h7);
    }
    return buffer;
  };

  function HmacSha256(key, is224, sharedMemory) {
    var i, type = typeof key;
    if (type === 'string') {
      var bytes = [], length = key.length, index = 0, code;
      for (i = 0; i < length; ++i) {
        code = key.charCodeAt(i);
        if (code < 0x80) {
          bytes[index++] = code;
        } else if (code < 0x800) {
          bytes[index++] = (0xc0 | (code >> 6));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes[index++] = (0xe0 | (code >> 12));
          bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (key.charCodeAt(++i) & 0x3ff));
          bytes[index++] = (0xf0 | (code >> 18));
          bytes[index++] = (0x80 | ((code >> 12) & 0x3f));
          bytes[index++] = (0x80 | ((code >> 6) & 0x3f));
          bytes[index++] = (0x80 | (code & 0x3f));
        }
      }
      key = bytes;
    } else {
      if (type === 'object') {
        if (key === null) {
          throw new Error(ERROR);
        } else if (ARRAY_BUFFER && key.constructor === ArrayBuffer) {
          key = new Uint8Array(key);
        } else if (!Array.isArray(key)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(key)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
    }

    if (key.length > 64) {
      key = (new Sha256(is224, true)).update(key).array();
    }

    var oKeyPad = [], iKeyPad = [];
    for (i = 0; i < 64; ++i) {
      var b = key[i] || 0;
      oKeyPad[i] = 0x5c ^ b;
      iKeyPad[i] = 0x36 ^ b;
    }

    Sha256.call(this, is224, sharedMemory);

    this.update(iKeyPad);
    this.oKeyPad = oKeyPad;
    this.inner = true;
    this.sharedMemory = sharedMemory;
  }
  HmacSha256.prototype = new Sha256();

  HmacSha256.prototype.finalize = function () {
    Sha256.prototype.finalize.call(this);
    if (this.inner) {
      this.inner = false;
      var innerHash = this.array();
      Sha256.call(this, this.is224, this.sharedMemory);
      this.update(this.oKeyPad);
      this.update(innerHash);
      Sha256.prototype.finalize.call(this);
    }
  };

  var exports = createMethod();
  exports.sha256 = exports;
  exports.sha224 = createMethod(true);
  exports.sha256.hmac = createHmacMethod();
  exports.sha224.hmac = createHmacMethod(true);

  if (COMMON_JS) {
    module.exports = exports;
  } else {
    root.sha256 = exports.sha256;
    root.sha224 = exports.sha224;
    if (AMD) {
      define(function () {
        return exports;
      });
    }
  }
})();

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":5}],114:[function(require,module,exports){
(function (process,global){(function (){
/**
 * [js-sha3]{@link https://github.com/emn178/js-sha3}
 *
 * @version 0.8.0
 * @author Chen, Yi-Cyuan [emn178@gmail.com]
 * @copyright Chen, Yi-Cyuan 2015-2018
 * @license MIT
 */
/*jslint bitwise: true */
(function () {
  'use strict';

  var INPUT_ERROR = 'input is invalid type';
  var FINALIZE_ERROR = 'finalize already called';
  var WINDOW = typeof window === 'object';
  var root = WINDOW ? window : {};
  if (root.JS_SHA3_NO_WINDOW) {
    WINDOW = false;
  }
  var WEB_WORKER = !WINDOW && typeof self === 'object';
  var NODE_JS = !root.JS_SHA3_NO_NODE_JS && typeof process === 'object' && process.versions && process.versions.node;
  if (NODE_JS) {
    root = global;
  } else if (WEB_WORKER) {
    root = self;
  }
  var COMMON_JS = !root.JS_SHA3_NO_COMMON_JS && typeof module === 'object' && module.exports;
  var AMD = typeof define === 'function' && define.amd;
  var ARRAY_BUFFER = !root.JS_SHA3_NO_ARRAY_BUFFER && typeof ArrayBuffer !== 'undefined';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var SHAKE_PADDING = [31, 7936, 2031616, 520093696];
  var CSHAKE_PADDING = [4, 1024, 262144, 67108864];
  var KECCAK_PADDING = [1, 256, 65536, 16777216];
  var PADDING = [6, 1536, 393216, 100663296];
  var SHIFT = [0, 8, 16, 24];
  var RC = [1, 0, 32898, 0, 32906, 2147483648, 2147516416, 2147483648, 32907, 0, 2147483649,
    0, 2147516545, 2147483648, 32777, 2147483648, 138, 0, 136, 0, 2147516425, 0,
    2147483658, 0, 2147516555, 0, 139, 2147483648, 32905, 2147483648, 32771,
    2147483648, 32770, 2147483648, 128, 2147483648, 32778, 0, 2147483658, 2147483648,
    2147516545, 2147483648, 32896, 2147483648, 2147483649, 0, 2147516424, 2147483648];
  var BITS = [224, 256, 384, 512];
  var SHAKE_BITS = [128, 256];
  var OUTPUT_TYPES = ['hex', 'buffer', 'arrayBuffer', 'array', 'digest'];
  var CSHAKE_BYTEPAD = {
    '128': 168,
    '256': 136
  };

  if (root.JS_SHA3_NO_NODE_JS || !Array.isArray) {
    Array.isArray = function (obj) {
      return Object.prototype.toString.call(obj) === '[object Array]';
    };
  }

  if (ARRAY_BUFFER && (root.JS_SHA3_NO_ARRAY_BUFFER_IS_VIEW || !ArrayBuffer.isView)) {
    ArrayBuffer.isView = function (obj) {
      return typeof obj === 'object' && obj.buffer && obj.buffer.constructor === ArrayBuffer;
    };
  }

  var createOutputMethod = function (bits, padding, outputType) {
    return function (message) {
      return new Keccak(bits, padding, bits).update(message)[outputType]();
    };
  };

  var createShakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits) {
      return new Keccak(bits, padding, outputBits).update(message)[outputType]();
    };
  };

  var createCshakeOutputMethod = function (bits, padding, outputType) {
    return function (message, outputBits, n, s) {
      return methods['cshake' + bits].update(message, outputBits, n, s)[outputType]();
    };
  };

  var createKmacOutputMethod = function (bits, padding, outputType) {
    return function (key, message, outputBits, s) {
      return methods['kmac' + bits].update(key, message, outputBits, s)[outputType]();
    };
  };

  var createOutputMethods = function (method, createMethod, bits, padding) {
    for (var i = 0; i < OUTPUT_TYPES.length; ++i) {
      var type = OUTPUT_TYPES[i];
      method[type] = createMethod(bits, padding, type);
    }
    return method;
  };

  var createMethod = function (bits, padding) {
    var method = createOutputMethod(bits, padding, 'hex');
    method.create = function () {
      return new Keccak(bits, padding, bits);
    };
    method.update = function (message) {
      return method.create().update(message);
    };
    return createOutputMethods(method, createOutputMethod, bits, padding);
  };

  var createShakeMethod = function (bits, padding) {
    var method = createShakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits) {
      return new Keccak(bits, padding, outputBits);
    };
    method.update = function (message, outputBits) {
      return method.create(outputBits).update(message);
    };
    return createOutputMethods(method, createShakeOutputMethod, bits, padding);
  };

  var createCshakeMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createCshakeOutputMethod(bits, padding, 'hex');
    method.create = function (outputBits, n, s) {
      if (!n && !s) {
        return methods['shake' + bits].create(outputBits);
      } else {
        return new Keccak(bits, padding, outputBits).bytepad([n, s], w);
      }
    };
    method.update = function (message, outputBits, n, s) {
      return method.create(outputBits, n, s).update(message);
    };
    return createOutputMethods(method, createCshakeOutputMethod, bits, padding);
  };

  var createKmacMethod = function (bits, padding) {
    var w = CSHAKE_BYTEPAD[bits];
    var method = createKmacOutputMethod(bits, padding, 'hex');
    method.create = function (key, outputBits, s) {
      return new Kmac(bits, padding, outputBits).bytepad(['KMAC', s], w).bytepad([key], w);
    };
    method.update = function (key, message, outputBits, s) {
      return method.create(key, outputBits, s).update(message);
    };
    return createOutputMethods(method, createKmacOutputMethod, bits, padding);
  };

  var algorithms = [
    { name: 'keccak', padding: KECCAK_PADDING, bits: BITS, createMethod: createMethod },
    { name: 'sha3', padding: PADDING, bits: BITS, createMethod: createMethod },
    { name: 'shake', padding: SHAKE_PADDING, bits: SHAKE_BITS, createMethod: createShakeMethod },
    { name: 'cshake', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createCshakeMethod },
    { name: 'kmac', padding: CSHAKE_PADDING, bits: SHAKE_BITS, createMethod: createKmacMethod }
  ];

  var methods = {}, methodNames = [];

  for (var i = 0; i < algorithms.length; ++i) {
    var algorithm = algorithms[i];
    var bits = algorithm.bits;
    for (var j = 0; j < bits.length; ++j) {
      var methodName = algorithm.name + '_' + bits[j];
      methodNames.push(methodName);
      methods[methodName] = algorithm.createMethod(bits[j], algorithm.padding);
      if (algorithm.name !== 'sha3') {
        var newMethodName = algorithm.name + bits[j];
        methodNames.push(newMethodName);
        methods[newMethodName] = methods[methodName];
      }
    }
  }

  function Keccak(bits, padding, outputBits) {
    this.blocks = [];
    this.s = [];
    this.padding = padding;
    this.outputBits = outputBits;
    this.reset = true;
    this.finalized = false;
    this.block = 0;
    this.start = 0;
    this.blockCount = (1600 - (bits << 1)) >> 5;
    this.byteCount = this.blockCount << 2;
    this.outputBlocks = outputBits >> 5;
    this.extraBytes = (outputBits & 31) >> 3;

    for (var i = 0; i < 50; ++i) {
      this.s[i] = 0;
    }
  }

  Keccak.prototype.update = function (message) {
    if (this.finalized) {
      throw new Error(FINALIZE_ERROR);
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var blocks = this.blocks, byteCount = this.byteCount, length = message.length,
      blockCount = this.blockCount, index = 0, s = this.s, i, code;

    while (index < length) {
      if (this.reset) {
        this.reset = false;
        blocks[0] = this.block;
        for (i = 1; i < blockCount + 1; ++i) {
          blocks[i] = 0;
        }
      }
      if (notString) {
        for (i = this.start; index < length && i < byteCount; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < byteCount; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }
      this.lastByteIndex = i;
      if (i >= byteCount) {
        this.start = i - byteCount;
        this.block = blocks[blockCount];
        for (i = 0; i < blockCount; ++i) {
          s[i] ^= blocks[i];
        }
        f(s);
        this.reset = true;
      } else {
        this.start = i;
      }
    }
    return this;
  };

  Keccak.prototype.encode = function (x, right) {
    var o = x & 255, n = 1;
    var bytes = [o];
    x = x >> 8;
    o = x & 255;
    while (o > 0) {
      bytes.unshift(o);
      x = x >> 8;
      o = x & 255;
      ++n;
    }
    if (right) {
      bytes.push(n);
    } else {
      bytes.unshift(n);
    }
    this.update(bytes);
    return bytes.length;
  };

  Keccak.prototype.encodeString = function (str) {
    var notString, type = typeof str;
    if (type !== 'string') {
      if (type === 'object') {
        if (str === null) {
          throw new Error(INPUT_ERROR);
        } else if (ARRAY_BUFFER && str.constructor === ArrayBuffer) {
          str = new Uint8Array(str);
        } else if (!Array.isArray(str)) {
          if (!ARRAY_BUFFER || !ArrayBuffer.isView(str)) {
            throw new Error(INPUT_ERROR);
          }
        }
      } else {
        throw new Error(INPUT_ERROR);
      }
      notString = true;
    }
    var bytes = 0, length = str.length;
    if (notString) {
      bytes = length;
    } else {
      for (var i = 0; i < str.length; ++i) {
        var code = str.charCodeAt(i);
        if (code < 0x80) {
          bytes += 1;
        } else if (code < 0x800) {
          bytes += 2;
        } else if (code < 0xd800 || code >= 0xe000) {
          bytes += 3;
        } else {
          code = 0x10000 + (((code & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
          bytes += 4;
        }
      }
    }
    bytes += this.encode(bytes * 8);
    this.update(str);
    return bytes;
  };

  Keccak.prototype.bytepad = function (strs, w) {
    var bytes = this.encode(w);
    for (var i = 0; i < strs.length; ++i) {
      bytes += this.encodeString(strs[i]);
    }
    var paddingBytes = w - bytes % w;
    var zeros = [];
    zeros.length = paddingBytes;
    this.update(zeros);
    return this;
  };

  Keccak.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex, blockCount = this.blockCount, s = this.s;
    blocks[i >> 2] |= this.padding[i & 3];
    if (this.lastByteIndex === this.byteCount) {
      blocks[0] = blocks[blockCount];
      for (i = 1; i < blockCount + 1; ++i) {
        blocks[i] = 0;
      }
    }
    blocks[blockCount - 1] |= 0x80000000;
    for (i = 0; i < blockCount; ++i) {
      s[i] ^= blocks[i];
    }
    f(s);
  };

  Keccak.prototype.toString = Keccak.prototype.hex = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var hex = '', block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        block = s[i];
        hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F] +
          HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F] +
          HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F] +
          HEX_CHARS[(block >> 28) & 0x0F] + HEX_CHARS[(block >> 24) & 0x0F];
      }
      if (j % blockCount === 0) {
        f(s);
        i = 0;
      }
    }
    if (extraBytes) {
      block = s[i];
      hex += HEX_CHARS[(block >> 4) & 0x0F] + HEX_CHARS[block & 0x0F];
      if (extraBytes > 1) {
        hex += HEX_CHARS[(block >> 12) & 0x0F] + HEX_CHARS[(block >> 8) & 0x0F];
      }
      if (extraBytes > 2) {
        hex += HEX_CHARS[(block >> 20) & 0x0F] + HEX_CHARS[(block >> 16) & 0x0F];
      }
    }
    return hex;
  };

  Keccak.prototype.arrayBuffer = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var bytes = this.outputBits >> 3;
    var buffer;
    if (extraBytes) {
      buffer = new ArrayBuffer((outputBlocks + 1) << 2);
    } else {
      buffer = new ArrayBuffer(bytes);
    }
    var array = new Uint32Array(buffer);
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        array[j] = s[i];
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      array[i] = s[i];
      buffer = buffer.slice(0, bytes);
    }
    return buffer;
  };

  Keccak.prototype.buffer = Keccak.prototype.arrayBuffer;

  Keccak.prototype.digest = Keccak.prototype.array = function () {
    this.finalize();

    var blockCount = this.blockCount, s = this.s, outputBlocks = this.outputBlocks,
      extraBytes = this.extraBytes, i = 0, j = 0;
    var array = [], offset, block;
    while (j < outputBlocks) {
      for (i = 0; i < blockCount && j < outputBlocks; ++i, ++j) {
        offset = j << 2;
        block = s[i];
        array[offset] = block & 0xFF;
        array[offset + 1] = (block >> 8) & 0xFF;
        array[offset + 2] = (block >> 16) & 0xFF;
        array[offset + 3] = (block >> 24) & 0xFF;
      }
      if (j % blockCount === 0) {
        f(s);
      }
    }
    if (extraBytes) {
      offset = j << 2;
      block = s[i];
      array[offset] = block & 0xFF;
      if (extraBytes > 1) {
        array[offset + 1] = (block >> 8) & 0xFF;
      }
      if (extraBytes > 2) {
        array[offset + 2] = (block >> 16) & 0xFF;
      }
    }
    return array;
  };

  function Kmac(bits, padding, outputBits) {
    Keccak.call(this, bits, padding, outputBits);
  }

  Kmac.prototype = new Keccak();

  Kmac.prototype.finalize = function () {
    this.encode(this.outputBits, true);
    return Keccak.prototype.finalize.call(this);
  };

  var f = function (s) {
    var h, l, n, c0, c1, c2, c3, c4, c5, c6, c7, c8, c9,
      b0, b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13, b14, b15, b16, b17,
      b18, b19, b20, b21, b22, b23, b24, b25, b26, b27, b28, b29, b30, b31, b32, b33,
      b34, b35, b36, b37, b38, b39, b40, b41, b42, b43, b44, b45, b46, b47, b48, b49;
    for (n = 0; n < 48; n += 2) {
      c0 = s[0] ^ s[10] ^ s[20] ^ s[30] ^ s[40];
      c1 = s[1] ^ s[11] ^ s[21] ^ s[31] ^ s[41];
      c2 = s[2] ^ s[12] ^ s[22] ^ s[32] ^ s[42];
      c3 = s[3] ^ s[13] ^ s[23] ^ s[33] ^ s[43];
      c4 = s[4] ^ s[14] ^ s[24] ^ s[34] ^ s[44];
      c5 = s[5] ^ s[15] ^ s[25] ^ s[35] ^ s[45];
      c6 = s[6] ^ s[16] ^ s[26] ^ s[36] ^ s[46];
      c7 = s[7] ^ s[17] ^ s[27] ^ s[37] ^ s[47];
      c8 = s[8] ^ s[18] ^ s[28] ^ s[38] ^ s[48];
      c9 = s[9] ^ s[19] ^ s[29] ^ s[39] ^ s[49];

      h = c8 ^ ((c2 << 1) | (c3 >>> 31));
      l = c9 ^ ((c3 << 1) | (c2 >>> 31));
      s[0] ^= h;
      s[1] ^= l;
      s[10] ^= h;
      s[11] ^= l;
      s[20] ^= h;
      s[21] ^= l;
      s[30] ^= h;
      s[31] ^= l;
      s[40] ^= h;
      s[41] ^= l;
      h = c0 ^ ((c4 << 1) | (c5 >>> 31));
      l = c1 ^ ((c5 << 1) | (c4 >>> 31));
      s[2] ^= h;
      s[3] ^= l;
      s[12] ^= h;
      s[13] ^= l;
      s[22] ^= h;
      s[23] ^= l;
      s[32] ^= h;
      s[33] ^= l;
      s[42] ^= h;
      s[43] ^= l;
      h = c2 ^ ((c6 << 1) | (c7 >>> 31));
      l = c3 ^ ((c7 << 1) | (c6 >>> 31));
      s[4] ^= h;
      s[5] ^= l;
      s[14] ^= h;
      s[15] ^= l;
      s[24] ^= h;
      s[25] ^= l;
      s[34] ^= h;
      s[35] ^= l;
      s[44] ^= h;
      s[45] ^= l;
      h = c4 ^ ((c8 << 1) | (c9 >>> 31));
      l = c5 ^ ((c9 << 1) | (c8 >>> 31));
      s[6] ^= h;
      s[7] ^= l;
      s[16] ^= h;
      s[17] ^= l;
      s[26] ^= h;
      s[27] ^= l;
      s[36] ^= h;
      s[37] ^= l;
      s[46] ^= h;
      s[47] ^= l;
      h = c6 ^ ((c0 << 1) | (c1 >>> 31));
      l = c7 ^ ((c1 << 1) | (c0 >>> 31));
      s[8] ^= h;
      s[9] ^= l;
      s[18] ^= h;
      s[19] ^= l;
      s[28] ^= h;
      s[29] ^= l;
      s[38] ^= h;
      s[39] ^= l;
      s[48] ^= h;
      s[49] ^= l;

      b0 = s[0];
      b1 = s[1];
      b32 = (s[11] << 4) | (s[10] >>> 28);
      b33 = (s[10] << 4) | (s[11] >>> 28);
      b14 = (s[20] << 3) | (s[21] >>> 29);
      b15 = (s[21] << 3) | (s[20] >>> 29);
      b46 = (s[31] << 9) | (s[30] >>> 23);
      b47 = (s[30] << 9) | (s[31] >>> 23);
      b28 = (s[40] << 18) | (s[41] >>> 14);
      b29 = (s[41] << 18) | (s[40] >>> 14);
      b20 = (s[2] << 1) | (s[3] >>> 31);
      b21 = (s[3] << 1) | (s[2] >>> 31);
      b2 = (s[13] << 12) | (s[12] >>> 20);
      b3 = (s[12] << 12) | (s[13] >>> 20);
      b34 = (s[22] << 10) | (s[23] >>> 22);
      b35 = (s[23] << 10) | (s[22] >>> 22);
      b16 = (s[33] << 13) | (s[32] >>> 19);
      b17 = (s[32] << 13) | (s[33] >>> 19);
      b48 = (s[42] << 2) | (s[43] >>> 30);
      b49 = (s[43] << 2) | (s[42] >>> 30);
      b40 = (s[5] << 30) | (s[4] >>> 2);
      b41 = (s[4] << 30) | (s[5] >>> 2);
      b22 = (s[14] << 6) | (s[15] >>> 26);
      b23 = (s[15] << 6) | (s[14] >>> 26);
      b4 = (s[25] << 11) | (s[24] >>> 21);
      b5 = (s[24] << 11) | (s[25] >>> 21);
      b36 = (s[34] << 15) | (s[35] >>> 17);
      b37 = (s[35] << 15) | (s[34] >>> 17);
      b18 = (s[45] << 29) | (s[44] >>> 3);
      b19 = (s[44] << 29) | (s[45] >>> 3);
      b10 = (s[6] << 28) | (s[7] >>> 4);
      b11 = (s[7] << 28) | (s[6] >>> 4);
      b42 = (s[17] << 23) | (s[16] >>> 9);
      b43 = (s[16] << 23) | (s[17] >>> 9);
      b24 = (s[26] << 25) | (s[27] >>> 7);
      b25 = (s[27] << 25) | (s[26] >>> 7);
      b6 = (s[36] << 21) | (s[37] >>> 11);
      b7 = (s[37] << 21) | (s[36] >>> 11);
      b38 = (s[47] << 24) | (s[46] >>> 8);
      b39 = (s[46] << 24) | (s[47] >>> 8);
      b30 = (s[8] << 27) | (s[9] >>> 5);
      b31 = (s[9] << 27) | (s[8] >>> 5);
      b12 = (s[18] << 20) | (s[19] >>> 12);
      b13 = (s[19] << 20) | (s[18] >>> 12);
      b44 = (s[29] << 7) | (s[28] >>> 25);
      b45 = (s[28] << 7) | (s[29] >>> 25);
      b26 = (s[38] << 8) | (s[39] >>> 24);
      b27 = (s[39] << 8) | (s[38] >>> 24);
      b8 = (s[48] << 14) | (s[49] >>> 18);
      b9 = (s[49] << 14) | (s[48] >>> 18);

      s[0] = b0 ^ (~b2 & b4);
      s[1] = b1 ^ (~b3 & b5);
      s[10] = b10 ^ (~b12 & b14);
      s[11] = b11 ^ (~b13 & b15);
      s[20] = b20 ^ (~b22 & b24);
      s[21] = b21 ^ (~b23 & b25);
      s[30] = b30 ^ (~b32 & b34);
      s[31] = b31 ^ (~b33 & b35);
      s[40] = b40 ^ (~b42 & b44);
      s[41] = b41 ^ (~b43 & b45);
      s[2] = b2 ^ (~b4 & b6);
      s[3] = b3 ^ (~b5 & b7);
      s[12] = b12 ^ (~b14 & b16);
      s[13] = b13 ^ (~b15 & b17);
      s[22] = b22 ^ (~b24 & b26);
      s[23] = b23 ^ (~b25 & b27);
      s[32] = b32 ^ (~b34 & b36);
      s[33] = b33 ^ (~b35 & b37);
      s[42] = b42 ^ (~b44 & b46);
      s[43] = b43 ^ (~b45 & b47);
      s[4] = b4 ^ (~b6 & b8);
      s[5] = b5 ^ (~b7 & b9);
      s[14] = b14 ^ (~b16 & b18);
      s[15] = b15 ^ (~b17 & b19);
      s[24] = b24 ^ (~b26 & b28);
      s[25] = b25 ^ (~b27 & b29);
      s[34] = b34 ^ (~b36 & b38);
      s[35] = b35 ^ (~b37 & b39);
      s[44] = b44 ^ (~b46 & b48);
      s[45] = b45 ^ (~b47 & b49);
      s[6] = b6 ^ (~b8 & b0);
      s[7] = b7 ^ (~b9 & b1);
      s[16] = b16 ^ (~b18 & b10);
      s[17] = b17 ^ (~b19 & b11);
      s[26] = b26 ^ (~b28 & b20);
      s[27] = b27 ^ (~b29 & b21);
      s[36] = b36 ^ (~b38 & b30);
      s[37] = b37 ^ (~b39 & b31);
      s[46] = b46 ^ (~b48 & b40);
      s[47] = b47 ^ (~b49 & b41);
      s[8] = b8 ^ (~b0 & b2);
      s[9] = b9 ^ (~b1 & b3);
      s[18] = b18 ^ (~b10 & b12);
      s[19] = b19 ^ (~b11 & b13);
      s[28] = b28 ^ (~b20 & b22);
      s[29] = b29 ^ (~b21 & b23);
      s[38] = b38 ^ (~b30 & b32);
      s[39] = b39 ^ (~b31 & b33);
      s[48] = b48 ^ (~b40 & b42);
      s[49] = b49 ^ (~b41 & b43);

      s[0] ^= RC[n];
      s[1] ^= RC[n + 1];
    }
  };

  if (COMMON_JS) {
    module.exports = methods;
  } else {
    for (i = 0; i < methodNames.length; ++i) {
      root[methodNames[i]] = methods[methodNames[i]];
    }
    if (AMD) {
      define(function () {
        return methods;
      });
    }
  }
})();

}).call(this)}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":5}],115:[function(require,module,exports){
module.exports = assert;

function assert(val, msg) {
  if (!val)
    throw new Error(msg || 'Assertion failed');
}

assert.equal = function assertEqual(l, r, msg) {
  if (l != r)
    throw new Error(msg || ('Assertion failed: ' + l + ' != ' + r));
};

},{}],116:[function(require,module,exports){
'use strict';

var utils = exports;

function toArray(msg, enc) {
  if (Array.isArray(msg))
    return msg.slice();
  if (!msg)
    return [];
  var res = [];
  if (typeof msg !== 'string') {
    for (var i = 0; i < msg.length; i++)
      res[i] = msg[i] | 0;
    return res;
  }
  if (enc === 'hex') {
    msg = msg.replace(/[^a-z0-9]+/ig, '');
    if (msg.length % 2 !== 0)
      msg = '0' + msg;
    for (var i = 0; i < msg.length; i += 2)
      res.push(parseInt(msg[i] + msg[i + 1], 16));
  } else {
    for (var i = 0; i < msg.length; i++) {
      var c = msg.charCodeAt(i);
      var hi = c >> 8;
      var lo = c & 0xff;
      if (hi)
        res.push(hi, lo);
      else
        res.push(lo);
    }
  }
  return res;
}
utils.toArray = toArray;

function zero2(word) {
  if (word.length === 1)
    return '0' + word;
  else
    return word;
}
utils.zero2 = zero2;

function toHex(msg) {
  var res = '';
  for (var i = 0; i < msg.length; i++)
    res += zero2(msg[i].toString(16));
  return res;
}
utils.toHex = toHex;

utils.encode = function encode(arr, enc) {
  if (enc === 'hex')
    return toHex(arr);
  else
    return arr;
};

},{}]},{},[6]);
