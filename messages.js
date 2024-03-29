// This file is auto generated by the protocol-buffers compiler

/* eslint-disable quotes */
/* eslint-disable indent */
/* eslint-disable no-redeclare */
/* eslint-disable camelcase */

// Remember to `npm install --save protocol-buffers-encodings`
var encodings = require('protocol-buffers-encodings')
var varint = encodings.varint
var skip = encodings.skip

var Vertex = exports.Vertex = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

var Edge = exports.Edge = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

var GraphContent = exports.GraphContent = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

var Restriction = exports.Restriction = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

var Map_string_bytes = exports.Map_string_bytes = {
  buffer: true,
  encodingLength: null,
  encode: null,
  decode: null
}

defineVertex()
defineEdge()
defineGraphContent()
defineRestriction()
defineMap_string_bytes()

function defineVertex () {
  Vertex.encodingLength = encodingLength
  Vertex.encode = encode
  Vertex.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (defined(obj.edges)) {
      for (var i = 0; i < obj.edges.length; i++) {
        if (!defined(obj.edges[i])) continue
        var len = Edge.encodingLength(obj.edges[i])
        length += varint.encodingLength(len)
        length += 1 + len
      }
    }
    if (defined(obj.metadata)) {
      var tmp = Object.keys(obj.metadata)
      for (var i = 0; i < tmp.length; i++) {
        tmp[i] = {key: tmp[i], value: obj.metadata[tmp[i]]}
      }
      for (var i = 0; i < tmp.length; i++) {
        if (!defined(tmp[i])) continue
        var len = Map_string_bytes.encodingLength(tmp[i])
        length += varint.encodingLength(len)
        length += 1 + len
      }
    }
    if (defined(obj.content)) {
      var len = encodings.bytes.encodingLength(obj.content)
      length += 1 + len
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (defined(obj.edges)) {
      for (var i = 0; i < obj.edges.length; i++) {
        if (!defined(obj.edges[i])) continue
        buf[offset++] = 10
        varint.encode(Edge.encodingLength(obj.edges[i]), buf, offset)
        offset += varint.encode.bytes
        Edge.encode(obj.edges[i], buf, offset)
        offset += Edge.encode.bytes
      }
    }
    if (defined(obj.metadata)) {
      var tmp = Object.keys(obj.metadata)
      for (var i = 0; i < tmp.length; i++) {
        tmp[i] = {key: tmp[i], value: obj.metadata[tmp[i]]}
      }
      for (var i = 0; i < tmp.length; i++) {
        if (!defined(tmp[i])) continue
        buf[offset++] = 18
        varint.encode(Map_string_bytes.encodingLength(tmp[i]), buf, offset)
        offset += varint.encode.bytes
        Map_string_bytes.encode(tmp[i], buf, offset)
        offset += Map_string_bytes.encode.bytes
      }
    }
    if (defined(obj.content)) {
      buf[offset++] = 26
      encodings.bytes.encode(obj.content, buf, offset)
      offset += encodings.bytes.encode.bytes
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      edges: [],
      metadata: {},
      content: null
    }
    while (true) {
      if (end <= offset) {
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        var len = varint.decode(buf, offset)
        offset += varint.decode.bytes
        obj.edges.push(Edge.decode(buf, offset, offset + len))
        offset += Edge.decode.bytes
        break
        case 2:
        var len = varint.decode(buf, offset)
        offset += varint.decode.bytes
        var tmp = Map_string_bytes.decode(buf, offset, offset + len)
        obj.metadata[tmp.key] = tmp.value
        offset += Map_string_bytes.decode.bytes
        break
        case 3:
        obj.content = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function defineEdge () {
  Edge.encodingLength = encodingLength
  Edge.encode = encode
  Edge.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (!defined(obj.ref)) throw new Error("ref is required")
    var len = encodings.varint.encodingLength(obj.ref)
    length += 1 + len
    if (!defined(obj.label)) throw new Error("label is required")
    var len = encodings.string.encodingLength(obj.label)
    length += 1 + len
    if (defined(obj.feed)) {
      var len = encodings.bytes.encodingLength(obj.feed)
      length += 1 + len
    }
    if (defined(obj.version)) {
      var len = encodings.varint.encodingLength(obj.version)
      length += 1 + len
    }
    if (defined(obj.view)) {
      var len = encodings.string.encodingLength(obj.view)
      length += 1 + len
    }
    if (defined(obj.metadata)) {
      var tmp = Object.keys(obj.metadata)
      for (var i = 0; i < tmp.length; i++) {
        tmp[i] = {key: tmp[i], value: obj.metadata[tmp[i]]}
      }
      for (var i = 0; i < tmp.length; i++) {
        if (!defined(tmp[i])) continue
        var len = Map_string_bytes.encodingLength(tmp[i])
        length += varint.encodingLength(len)
        length += 1 + len
      }
    }
    if (defined(obj.restrictions)) {
      for (var i = 0; i < obj.restrictions.length; i++) {
        if (!defined(obj.restrictions[i])) continue
        var len = Restriction.encodingLength(obj.restrictions[i])
        length += varint.encodingLength(len)
        length += 1 + len
      }
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (!defined(obj.ref)) throw new Error("ref is required")
    buf[offset++] = 8
    encodings.varint.encode(obj.ref, buf, offset)
    offset += encodings.varint.encode.bytes
    if (!defined(obj.label)) throw new Error("label is required")
    buf[offset++] = 18
    encodings.string.encode(obj.label, buf, offset)
    offset += encodings.string.encode.bytes
    if (defined(obj.feed)) {
      buf[offset++] = 26
      encodings.bytes.encode(obj.feed, buf, offset)
      offset += encodings.bytes.encode.bytes
    }
    if (defined(obj.version)) {
      buf[offset++] = 32
      encodings.varint.encode(obj.version, buf, offset)
      offset += encodings.varint.encode.bytes
    }
    if (defined(obj.view)) {
      buf[offset++] = 42
      encodings.string.encode(obj.view, buf, offset)
      offset += encodings.string.encode.bytes
    }
    if (defined(obj.metadata)) {
      var tmp = Object.keys(obj.metadata)
      for (var i = 0; i < tmp.length; i++) {
        tmp[i] = {key: tmp[i], value: obj.metadata[tmp[i]]}
      }
      for (var i = 0; i < tmp.length; i++) {
        if (!defined(tmp[i])) continue
        buf[offset++] = 50
        varint.encode(Map_string_bytes.encodingLength(tmp[i]), buf, offset)
        offset += varint.encode.bytes
        Map_string_bytes.encode(tmp[i], buf, offset)
        offset += Map_string_bytes.encode.bytes
      }
    }
    if (defined(obj.restrictions)) {
      for (var i = 0; i < obj.restrictions.length; i++) {
        if (!defined(obj.restrictions[i])) continue
        buf[offset++] = 58
        varint.encode(Restriction.encodingLength(obj.restrictions[i]), buf, offset)
        offset += varint.encode.bytes
        Restriction.encode(obj.restrictions[i], buf, offset)
        offset += Restriction.encode.bytes
      }
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      ref: 0,
      label: "",
      feed: null,
      version: 0,
      view: "",
      metadata: {},
      restrictions: []
    }
    var found0 = false
    var found1 = false
    while (true) {
      if (end <= offset) {
        if (!found0 || !found1) throw new Error("Decoded message is not valid")
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        obj.ref = encodings.varint.decode(buf, offset)
        offset += encodings.varint.decode.bytes
        found0 = true
        break
        case 2:
        obj.label = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        found1 = true
        break
        case 3:
        obj.feed = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        break
        case 4:
        obj.version = encodings.varint.decode(buf, offset)
        offset += encodings.varint.decode.bytes
        break
        case 5:
        obj.view = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        break
        case 6:
        var len = varint.decode(buf, offset)
        offset += varint.decode.bytes
        var tmp = Map_string_bytes.decode(buf, offset, offset + len)
        obj.metadata[tmp.key] = tmp.value
        offset += Map_string_bytes.decode.bytes
        break
        case 7:
        var len = varint.decode(buf, offset)
        offset += varint.decode.bytes
        obj.restrictions.push(Restriction.decode(buf, offset, offset + len))
        offset += Restriction.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function defineGraphContent () {
  GraphContent.encodingLength = encodingLength
  GraphContent.encode = encode
  GraphContent.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (!defined(obj.type)) throw new Error("type is required")
    var len = encodings.string.encodingLength(obj.type)
    length += 1 + len
    if (defined(obj.data)) {
      var len = encodings.bytes.encodingLength(obj.data)
      length += 1 + len
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (!defined(obj.type)) throw new Error("type is required")
    buf[offset++] = 10
    encodings.string.encode(obj.type, buf, offset)
    offset += encodings.string.encode.bytes
    if (defined(obj.data)) {
      buf[offset++] = 18
      encodings.bytes.encode(obj.data, buf, offset)
      offset += encodings.bytes.encode.bytes
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      type: "",
      data: null
    }
    var found0 = false
    while (true) {
      if (end <= offset) {
        if (!found0) throw new Error("Decoded message is not valid")
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        obj.type = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        found0 = true
        break
        case 2:
        obj.data = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function defineRestriction () {
  Restriction.encodingLength = encodingLength
  Restriction.encode = encode
  Restriction.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (!defined(obj.rule)) throw new Error("rule is required")
    var len = encodings.string.encodingLength(obj.rule)
    length += 1 + len
    if (defined(obj.except)) {
      var len = Restriction.encodingLength(obj.except)
      length += varint.encodingLength(len)
      length += 1 + len
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (!defined(obj.rule)) throw new Error("rule is required")
    buf[offset++] = 10
    encodings.string.encode(obj.rule, buf, offset)
    offset += encodings.string.encode.bytes
    if (defined(obj.except)) {
      buf[offset++] = 18
      varint.encode(Restriction.encodingLength(obj.except), buf, offset)
      offset += varint.encode.bytes
      Restriction.encode(obj.except, buf, offset)
      offset += Restriction.encode.bytes
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      rule: "",
      except: null
    }
    var found0 = false
    while (true) {
      if (end <= offset) {
        if (!found0) throw new Error("Decoded message is not valid")
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        obj.rule = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        found0 = true
        break
        case 2:
        var len = varint.decode(buf, offset)
        offset += varint.decode.bytes
        obj.except = Restriction.decode(buf, offset, offset + len)
        offset += Restriction.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function defineMap_string_bytes () {
  Map_string_bytes.encodingLength = encodingLength
  Map_string_bytes.encode = encode
  Map_string_bytes.decode = decode

  function encodingLength (obj) {
    var length = 0
    if (!defined(obj.key)) throw new Error("key is required")
    var len = encodings.string.encodingLength(obj.key)
    length += 1 + len
    if (defined(obj.value)) {
      var len = encodings.bytes.encodingLength(obj.value)
      length += 1 + len
    }
    return length
  }

  function encode (obj, buf, offset) {
    if (!offset) offset = 0
    if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj))
    var oldOffset = offset
    if (!defined(obj.key)) throw new Error("key is required")
    buf[offset++] = 10
    encodings.string.encode(obj.key, buf, offset)
    offset += encodings.string.encode.bytes
    if (defined(obj.value)) {
      buf[offset++] = 18
      encodings.bytes.encode(obj.value, buf, offset)
      offset += encodings.bytes.encode.bytes
    }
    encode.bytes = offset - oldOffset
    return buf
  }

  function decode (buf, offset, end) {
    if (!offset) offset = 0
    if (!end) end = buf.length
    if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
    var oldOffset = offset
    var obj = {
      key: "",
      value: null
    }
    var found0 = false
    while (true) {
      if (end <= offset) {
        if (!found0) throw new Error("Decoded message is not valid")
        decode.bytes = offset - oldOffset
        return obj
      }
      var prefix = varint.decode(buf, offset)
      offset += varint.decode.bytes
      var tag = prefix >> 3
      switch (tag) {
        case 1:
        obj.key = encodings.string.decode(buf, offset)
        offset += encodings.string.decode.bytes
        found0 = true
        break
        case 2:
        obj.value = encodings.bytes.decode(buf, offset)
        offset += encodings.bytes.decode.bytes
        break
        default:
        offset = skip(prefix & 7, buf, offset)
      }
    }
  }
}

function defined (val) {
  return val !== null && val !== undefined && (typeof val !== 'number' || !isNaN(val))
}
