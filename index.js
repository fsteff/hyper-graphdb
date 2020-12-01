const Messages = require('./messages')
const codecs = require('codecs')

const BUCKET_WIDTH = 3
const BUCKET_SIZE = 1 << BUCKET_WIDTH
const BUCKET_MASK = (BUCKET_SIZE - 1)

class HyperGraphDB {
  constructor (feed, opts = { valueEncoding: 'binary', onWrite: null, onRead: null }) {
    opts = opts || {}
    this.valueEncoding = opts.valueEncoding
    this.feed = promisify(feed)
    this.idCtr = 0
  }

  createNode (opts = {}) {
    opts = Object.assign({ valueEncoding: this.valueEncoding }, opts)
    const id = this.idCtr++
    const node = new Node(id, (encoded) => this._persist(id, encoded), opts)
    return node
  }

  async getNode (id, opts = {}) {
    opts = Object.assign({ valueEncoding: this.valueEncoding }, opts)
    const indexNode = await this._getIndexNode(id)
    const index = indexNode.content[id & BUCKET_MASK]

    let data = await this.feed.get(index)
    if (this.onRead) {
      data = this.onRead(index, data)
    }
    const decoded = Messages.GraphNode.decode(data)
    const node = new Node(id, (encoded) => this._persist(id, encoded), opts)
    node._data = decoded.value
    node._edges = decoded.edges
    return node
  }

  async _persist (id, data) {
    const index = await this.feed.length()
    if (this.onWrite) {
      data = this.onWrite(index, data)
    }

    const slot = id & BUCKET_MASK
    const indexNode = await this._getIndexNode(id)
    while (indexNode.content.length <= slot) indexNode.content.push(0)
    indexNode.content[slot] = index

    const bulk = [data, Messages.IndexNode.encode(indexNode)]
    let addr = id >> BUCKET_WIDTH
    while (addr > 0) {
      const parent = await this._getIndexNode(addr)
      parent.children[addr & BUCKET_MASK] = index + bulk.length
      bulk.push(Messages.IndexNode.encode(parent))
      addr = addr >> BUCKET_WIDTH
    }

    await this.feed.append(bulk)
  }

  async _getIndexNode (id) {
    let decoded = await this._fetchNodeAt(-1) // get head
    let addr = id >> BUCKET_WIDTH
    let slot = addr & BUCKET_MASK
    while (decoded.id !== addr) {
      if (decoded.children.length > slot) {
        decoded = await this._fetchNodeAt(decoded.children[slot])
      } else {
        decoded = this._createIndexNode(addr)
      }
      slot = addr & BUCKET_MASK
      addr = addr >> BUCKET_WIDTH
    }
    return decoded
  }

  async _fetchNodeAt (index) {
    const head = await (index >= 0 ? this.feed.get(index) : this.feed.head())
    return Messages.IndexNode.decode(head)
  }

  _createIndexNode (id) {
    return {
      id: id,
      children: [],
      content: []
    }
  }
}

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

function promisify (feed) {
  const pending = []
  const readyPromise = ready().then(onReady)
  return {
    feed,
    length,
    ready: () => readyPromise,
    get: (...args) => promise(feed.get, ...args),
    append: (...args) => promise(feed.append, ...args),
    head: (...args) => promise(feed.head, ...args)
  }

  async function ready () {
    return new Promise((resolve, reject) => {
      feed.ready((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async function onReady () {
    if (await length() === 0) {
      const encoded = Messages.HypercoreHeader.encode({ dataStructureType: 'hyper-graphdb' })
      await new Promise((resolve, reject) => {
        feed.append(encoded, err => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  async function length () {
    while (pending.length > 0) {
      await Promise.all(pending)
    }
    if (pending.length > 0) throw new Error('pending should be zero!')
    return feed.length
  }

  async function promise (foo, ...args) {
    await readyPromise
    const p = new Promise((resolve, reject) => {
      foo.call(feed, ...args, (err, result) => {
        pending.splice(pending.indexOf(p), 1)

        if (err) reject(err)
        else resolve(result)
      })
    })
    pending.push(p)
    return p
  }
}

module.exports = HyperGraphDB
