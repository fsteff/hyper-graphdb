const hypercore = require('hypercore')
const RAM = require('random-access-memory')
const tape = require('tape')
const HyperGraphDB = require('./index')

tape('basic', async t => {
  const core = hypercore(RAM)
  const db = new HyperGraphDB(core, { valueEncoding: 'utf-8' })
  await db.feed.ready()
  const node = db.createNode()
  node.setData('test')
  await node.persist()
  console.log('saved data')

  const read = await db.getNode(node.id)
  t.equal(read.getData(), 'test')
  t.end()
})
