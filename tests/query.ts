import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { Vertex } from '../lib/Vertex'
import { HyperGraphDB } from '..'
import { GraphObject, SimpleGraphObject } from '../lib/Codec'

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

    let iter = db.queryAtId(v1.getId(), feed).out('child').vertices()
    for await (const vertex of iter) {
        t.same(v2.getId(), vertex.getId())
    }

    let results = await db.queryAtVertex(v1).out('child').matches(o => (<Vertex<SimpleGraphObject>>o).getContent()?.get('greeting') === 'hola').generator().destruct()
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

tape('error handling', async t => {
    t.plan(3)
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feed = await db.core.getDefaultFeedId()

    try{
        // throws 
        await db.queryAtId(0, feed).generator().destruct()
        t.fail('should have thrown an error')
    } catch (err) {
        t.ok(err)
    }

    const v1 = db.create<SimpleGraphObject>()
    v1.addEdge({label: 'next', ref: 1})
    await db.put(v1)
    // handle the error 
    const result = await db.queryAtId(0, feed).out('next').generator().destruct(err => {
        t.ok(err)
    })
    t.same(result.length, 0)
})

tape('path', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feed = await db.core.getDefaultFeedId()

    const v1 = db.create<SimpleGraphObject>(), 
          v2 = db.create<SimpleGraphObject>(),
          v3 = db.create<SimpleGraphObject>()
    v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'salut'))
    await db.put([v1, v2, v3])
    v1.addEdgeTo(v2, 'a')
    v1.addEdgeTo(v3, 'a')
    v2.addEdgeTo(v3, 'b')
    v3.addEdgeTo(v1, 'c')
    await db.put([v1, v2, v3])

    let results = await db.queryPathAtVertex('a', v1).generator().destruct()
    resultsEqual(results, [v2, v3])

    results = await db.queryPathAtVertex('a/b', v1).generator().destruct()
    resultsEqual(results, [v3])

    results = await db.queryPathAtVertex('\\a\\b', v1).generator().destruct()
    resultsEqual(results, [v3])

    results = await db.queryPathAtVertex('', v1).generator().destruct()
    resultsEqual(results, [v1])

    results = await db.queryPathAtVertex('c', v1).generator().destruct()
    resultsEqual(results, [])

    results = await db.queryPathAtVertex('a/b/c', v1).generator().destruct()
    resultsEqual(results, [v1])

    function resultsEqual(results: Vertex<GraphObject>[], expected: Vertex<GraphObject>[]) {
        let resIds = results.map(v => v.getId()).sort()
        let expIds = expected.map(v => v.getId()).sort()
        t.same(resIds, expIds)
    }
})
