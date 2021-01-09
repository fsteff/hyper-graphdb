import { HyperGraphDB } from '../index'
import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { Vertex } from '../lib/Vertex'

tape('basic', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feed = await db.getDefaultFeedId()

    const v1 = new Vertex<string>('utf-8')
    const v2 = new Vertex<Object>('json')
    v1.setContent('test')
    v2.setContent({hello: 'world'})
    await db.putAll(feed, [v1, v2])
    t.same(v1.getId(), 0)
    t.same(v2.getId(), 1)

    let v = await db.get(feed, v1.getId(), 'utf-8')
    t.equal(v1.getContent(), 'test')
    t.equal(v.getContent(), 'test')

    v = await db.get(feed, v2.getId(), 'json')
    t.equal(JSON.stringify(v2.getContent()), JSON.stringify({hello: 'world'}))
    t.equal(JSON.stringify(v.getContent()), JSON.stringify({hello: 'world'}))
})