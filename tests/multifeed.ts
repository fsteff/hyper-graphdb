import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { Vertex } from '../lib/Vertex'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'

tape('multiple dbs', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db1 = new HyperGraphDB(store)
    const feed1 = await (await db1.core.getDefaultFeedId()).toString('hex')
    const db2 = new HyperGraphDB(store)
    const feed2 = await (await db2.core.getDefaultFeedId()).toString('hex')

    const v1 = db1.create<SimpleGraphObject>(), v2 = db1.create<SimpleGraphObject>()
    v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
    await db1.put([v1, v2])

    const v3 = db2.create<SimpleGraphObject>(), v4 = db2.create<SimpleGraphObject>()
    v3.setContent(new SimpleGraphObject().set('greeting', 'hallo'))
    v4.setContent(new SimpleGraphObject().set('greeting', 'salut'))
    await db2.put([v3, v4])
       
    v1.addEdgeTo(v3, 'next')
    v2.addEdgeTo(v4, 'next')
    await db1.put([v1, v2])

    v3.addEdgeTo(v2, 'next')
    v4.addEdgeTo(v1, 'next')
    await db2.put([v3, v4])

    let results = await db1.queryAtVertex(v1).repeat(q => q.out('next')).generator().destruct()
    t.same(results.length, 4)
    let greetings = results.map(v => (<SimpleGraphObject>v.getContent()).get('greeting')).sort()
    t.same(greetings, ['hallo', 'hello', 'hola', 'salut'])

    results = await db2.queryAtVertex(v2).repeat(q => q.out('next')).generator().destruct()
    t.same(results.length, 4)
    greetings = results.map(v => (<SimpleGraphObject>v.getContent()).get('greeting')).sort()
    t.same(greetings, ['hallo', 'hello', 'hola', 'salut'])
})