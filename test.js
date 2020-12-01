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
  console.log('saved node')

  const read = await db.getNode(node.id)
  t.equal(read.getData(), 'test')
  t.end()
})

tape('many', async t => {
  const tests = ['hello', 'world', 'who', 'is', 'there', 'I', 'am', 'a', 'graph', 'db']
  const nodes = []
  const core = hypercore(RAM)
  const db = new HyperGraphDB(core, { valueEncoding: 'utf-8' })
  await db.feed.ready()
  for (const text of tests) {
    const node = db.createNode()
    node.setData(text)
    await node.persist()
    nodes.push(node)
    console.log('saved node ' + node.id)
  }

  let i = 0
  for (const node of nodes) {
    const read = await db.getNode(node.id)
    t.equal(read.getData(), tests[i++])
  }

  t.end()
})
