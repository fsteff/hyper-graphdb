import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'

tape('reductor', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)

    const v1 = db.create<SimpleGraphObject>()
    const v2 = db.create<SimpleGraphObject>()
    const v3 = db.create<SimpleGraphObject>()
    const v4 = db.create<SimpleGraphObject>()

    await db.put([v1, v2, v3, v4])
    v1.addEdgeTo(v2, 'a') // v2 is a directory
    v1.addEdgeTo(v3, 'a') // v3 is a thombstone
    v2.addEdgeTo(v4, 'c') // v4 is a file in the directory of v2
    await db.put([v1, v2])

   const a = await db.queryAtVertex(v1)
    .out('a')
    .reduce(arr => arr.find(s => s.value.equals(v3)) ? [] : arr)
    .out('c')
    .vertices()
   t.same(a.length, 0)
})

tape('path reductor', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)

    const v1 = db.create<SimpleGraphObject>()
    const v2 = db.create<SimpleGraphObject>()
    const v3 = db.create<SimpleGraphObject>()
    const v4 = db.create<SimpleGraphObject>()

    await db.put([v1, v2, v3, v4])
    v1.addEdgeTo(v2, 'a') // v2 is a directory
    v1.addEdgeTo(v3, 'a') // v3 is a thombstone
    v2.addEdgeTo(v4, 'c') // v4 is a file in the directory of v2
    await db.put([v1, v2])

   const c = await db.queryPathAtVertex('a/c', v1, undefined, arr => arr.find(s => s.value.equals(v3)) ? [] : arr).vertices()
   t.same(c.length, 0)

   const a = await db.queryPathAtVertex('a', v1, undefined, arr => t.fail('should not be called') || arr).vertices()
   t.same(a.length, 2)
})