const Messages = require('./messages')
const Node = require('./lib/Node')
const asyncFeed = require('./lib/asyncFeed')

const BUCKET_WIDTH = 3
const BUCKET_SIZE = 1 << BUCKET_WIDTH
const BUCKET_MASK = (BUCKET_SIZE - 1)

class HyperGraphDB {
  constructor (feed, opts = { valueEncoding: 'binary', onWrite: null, onRead: null }) {
    opts = opts || {}
    this.valueEncoding = opts.valueEncoding
    this.feed = asyncFeed(feed)
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

    let slot = id & BUCKET_MASK
    const indexNode = await this._getIndexNode(id)
    while (indexNode.content.length <= slot) indexNode.content.push(0)
    indexNode.content[slot] = index

    // console.log('saving data node at #' + index + ': id:' + id)
    // console.log('saving at #' + (index + 1) + ': ' + nodeToString(indexNode))
    const bulk = [data, Messages.IndexNode.encode(indexNode)]
    let addr = id >> BUCKET_WIDTH
    slot = (addr & BUCKET_MASK) - 1
    while (addr > 0) {
      const parent = await this._getIndexNode(addr)
      parent.children[slot] = index + bulk.length - 1
      // console.log('saving at #' + (index + bulk.length) + ': ' + nodeToString(parent))
      bulk.push(Messages.IndexNode.encode(parent))
      slot = addr & BUCKET_MASK
      addr = addr >> BUCKET_WIDTH
    }

    await this.feed.append(bulk)

    // function nodeToString (node) {
    //  return `IndexNode{id:${node.id}, children: [${node.children}], content: [${node.content}], index: ${node.index}}`
    // }
  }

  async _getIndexNode (id) {
    const prefix = id >> BUCKET_WIDTH
    let decoded
    if (id === 0 && await this.feed.length() < 3) {
      decoded = this._createIndexNode(id)
    } else {
      decoded = await this._fetchNodeAt(-1) // get head
    }
    let addr = prefix
    let slot = (addr & BUCKET_MASK) - 1
    while (decoded.id !== prefix) {
      if (decoded.children.length > slot && decoded.children[slot] !== 0) {
        decoded = await this._fetchNodeAt(decoded.children[slot])
      } else {
        // console.log(`IndexNode ${prefix} not found in {id: ${decoded.id}, children:[${decoded.children}]} at #${decoded.index}, creating new`)
        return this._createIndexNode(prefix)
      }
      slot = addr & BUCKET_MASK
      addr = addr >> BUCKET_WIDTH
    }
    return decoded
  }

  async _fetchNodeAt (index) {
    const head = await (index >= 0 ? this.feed.get(index) : this.feed.head())
    const node = Messages.IndexNode.decode(head)
    node.index = index >= 0 ? index : await this.feed.length() - 1
    return node
  }

  _createIndexNode (id) {
    return {
      id: id,
      children: [],
      content: []
    }
  }
}

module.exports = HyperGraphDB
