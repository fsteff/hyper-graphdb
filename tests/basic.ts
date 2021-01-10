import { Core } from '../lib/Core'
import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { Vertex, Edge } from '../lib/Vertex'
import Crawler from '../lib/Crawler'
import NameIndex from '../lib/NameIndex'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'

tape('core', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new Core(store)
    const feed = await db.getDefaultFeedId()

    const v1 = new Vertex<string>('utf-8')
    const v2 = new Vertex<Object>('json')
    v1.setContent('test')
    v2.setContent({hello: 'world'})
    await db.putAll(feed, [v1, v2])
    t.same(v1.getId(), 0)
    t.same(v2.getId(), 1)

    let v = await db.get(feed, v1.getId(), 'utf-8')
    t.same(v1.getContent(), 'test')
    t.same(v.getContent(), 'test')

    v = await db.get(feed, v2.getId(), 'json')
    t.same(JSON.stringify(v2.getContent()), JSON.stringify({hello: 'world'}))
    t.same(JSON.stringify(v.getContent()), JSON.stringify({hello: 'world'}))

    v1.addEdgeTo(v2, 'snd', feed)
    await db.put(feed, v1)
    t.same(v1.getId(), v1.getId())

    v = await db.get(feed, v1.getId(), 'utf-8')
    const e1 = v1.getEdges()[0]
    const e2 = v.getEdges()[0]
    t.same(e1.label, e2.label)
    t.same(e1.feed?.toString('hex'), e2.feed?.toString('hex'))
    t.same(e1.ref, e2.ref)
})

tape('crawler', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new Core(store)
    const feed = (await db.getDefaultFeedId()).toString('hex')

    const v1 = new Vertex<Buffer>('binary')
    const v2 = new Vertex<Object>('binary')
    await db.putAll(feed, [v1, v2])
    v1.addEdgeTo(v2, 'child', await db.getDefaultFeedId())
    v2.addEdgeTo(v1, 'parent')
    await db.putAll(feed, [v1, v2])

    const crawler = new Crawler(db)
    const idx = new NameIndex()
    crawler.registerIndex(idx)

    await crawler.crawl(feed, v1.getId(), 'binary')
    t.same([v2.getId()], idx.get('child').map(o => o.id))
    t.same([v1.getId()], idx.get('parent').map(o => o.id))
})

tape('onRW', async t => {
    t.plan(6)
    function onRead(data: Buffer, feed: Buffer, index: number) {
        t.ok(data && feed && index)
        return Buffer.from(data.map(v => v - 1))
    }

    function onWrite(data: Buffer, feed: Buffer, index: number) {
        t.ok(data && feed && index)
        return Buffer.from(data.map(v => v + 1))
    }

    const store = new Corestore(RAM)
    await store.ready()
    const db = new Core(store, undefined, {onRead, onWrite})
    const feed = (await db.getDefaultFeedId()).toString('hex')

    const v1 = new Vertex<string>('utf-8')
    v1.setContent('hello')
    const v2 = new Vertex<string>('utf-8')
    v2.setContent('world')
    await db.putAll(feed, [v1, v2])

    let v = await db.get<string>(feed, v1.getId(), 'utf-8')
    t.same(v.getContent(), 'hello')
    v = await db.get<string>(feed, v2.getId(), 'utf-8')
    t.same(v.getContent(), 'world')
})

tape('db', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)

    const v1 = db.create<SimpleGraphObject>(), v2 = db.create<SimpleGraphObject>()
    v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
    await db.put([v1, v2])

    let c1 = <Vertex<SimpleGraphObject>> await db.get(v1.getId())
    let c2 = <Vertex<SimpleGraphObject>> await db.get(v2.getId())
    t.same('hello', c1.getContent()?.get('greeting'))
    t.same('hola', c2.getContent()?.get('greeting'))
})