import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { Vertex } from '../lib/Vertex'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'

tape('query', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feed = await db.core.getDefaultFeedId()

    const v1 = db.create<SimpleGraphObject>(), v2 = db.create<SimpleGraphObject>()
    v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
    await db.put([v1, v2])
    v1.addEdgeTo(v2, 'child')
    v2.addEdgeTo(v1, 'parent')
    await db.put([v1, v2])

    let results = await db.queryAtId(v1.getId(), feed).out('child').generator().destruct()
    t.same(1, results.length)
    t.same(v2.getId(), results[0].getId())

    results = await db.queryAtVertex(v1).out('child').matches(o => (<Vertex<SimpleGraphObject>>o).getContent()?.get('greeting') === 'hola').generator().destruct()
    t.same(1, results.length)
    t.same(v2.getId(), results[0].getId())

    results = await db.queryAtVertex(v1).out('child').matches(o => (<Vertex<SimpleGraphObject>>o).getContent()?.get('greeting') === 'I`m grumpy').generator().destruct()
    t.same(0, results.length)

    results = await db.queryAtVertex(v1).out('child').out('parent').generator().destruct()
    t.same(1, results.length)
    t.same(v1.getId(), results[0].getId())
})

tape('repeat query', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feed = await db.core.getDefaultFeedId()

    const v = new Array<Vertex<SimpleGraphObject>>()
    for(let i = 0; i < 100; i++) {
        v[i] = db.create<SimpleGraphObject>()
        v[i].setContent(new SimpleGraphObject().set('value', i))
    }
    await db.put(v)

    for(let i = 0; i < 99; i++) {
        v[i].addEdgeTo(v[i+1], 'next')
    }
    await db.put(v)

    let results = await db.queryAtVertex(v[0]).repeat(q => q.out('next')).generator().destruct()
    t.same(99, results.length)
    t.same(v[1].getId(), results[0].getId())

    v[99].addEdgeTo(v[0], 'next')
    await db.put(v[99])

    t.timeoutAfter(1000)
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next')).generator().destruct()
    t.same(100, results.length)
    t.same(v[1].getId(), results[0].getId())

    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next'), undefined, 10).generator().destruct()
    t.same(10, results.length)

    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next'), arr => arr.findIndex(r => r.getId() === v[10].getId()) < 0).generator().destruct()
    t.same(10, results.length)
})