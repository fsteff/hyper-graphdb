const codecs = require('codecs')
const Messages = require('../messages')

class Node {
  constructor (id, persist, opts = { valueEncoding: 'binary', autoSave: false, remoteFeed: null }) {
    opts = opts || {}
    this.id = id
    this.persist = () => persist(this.serialize())
    this.codec = toCodec(opts.valueEncoding)
    this.autoSave = !!opts.autoSave
    this.feed = opts.remoteFeed

    this.index = null
    this._data = null
    this._edges = []
    this._dirty = false
  }

  serialize () {
    const node = {
      value: this._data || Buffer.alloc(0),
      edges: this._edges
    }
    return Messages.GraphNode.encode(node)
  }

  setData (value) {
    this._data = value ? this.codec.encode(value) : null
    if (this.autoSave) this.persist()
    else this._dirty = true
  }

  getData () {
    return this._data ? this.codec.decode(this._data) : null
  }

  link (key, node, attributes = {}) {
    const edge = {
      index: node.index,
      name: key,
      attributes: attributes,
      feed: node.feed
    }

    const oldEdge = this._edges.findIndex(e => e.name === key)
    if (oldEdge >= 0) {
      this._edges[oldEdge] = edge
    } else {
      this._edges.push(edge)
    }
  }
}

function toCodec (encoding) {
  if (!encoding) return codecs.binary
  if (typeof encoding === 'string') return codecs(encoding)
  else return encoding
}

module.exports = Node
