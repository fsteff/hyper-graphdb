import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'

tape('query restrictions', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)

    const v1 = db.create<SimpleGraphObject>()
    const v2 = db.create<SimpleGraphObject>()
    const v3 = db.create<SimpleGraphObject>()
    const v4 = db.create<SimpleGraphObject>()
    const v5 = db.create<SimpleGraphObject>()

    await db.put([v1, v2, v3, v4, v5])
    v1.addEdgeTo(v2, 'a', {restrictions: [{rule: '!*/a'}]})
    v1.addEdgeTo(v3, 'b', {restrictions: [{rule: '!*/b'}, {rule: '!*/b/*', except: {rule: '*/b/c'}}]})
    v3.addEdgeTo(v4, 'c')
    v3.addEdgeTo(v5, 'd')
    await db.put([v1, v3])

   const a = await db.queryAtVertex(v1).out('a').vertices()
   t.same(a, [])
   const b = await db.queryAtVertex(v1).out('b').vertices()
   t.same(b, [])
   const c = await db.queryAtVertex(v1).out('b').out('c').vertices()
   t.same(c.length, 1)
   t.ok(c[0].equals(v4))
   const d = await db.queryAtVertex(v1).out('b').out('d').vertices()
   t.same(d, [])
   const all = await db.queryAtVertex(v1).repeat(q => q.out()).vertices()
   t.same(all.length, 1)
   t.ok(all[0].equals(v4))
})

tape('restrict to feed', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db1 = new HyperGraphDB(store)
    const db1Feed = (await db1.core.getDefaultFeedId()).toString('hex')
    const db2 = new HyperGraphDB(store)
    const db2Feed = (await db2.core.getDefaultFeedId()).toString('hex')
    t.ok(db1Feed !== db2Feed)

    const v1 = db1.create<SimpleGraphObject>()
    const v2 = db1.create<SimpleGraphObject>()
    const v3 = db1.create<SimpleGraphObject>()
    await db1.put([v1, v2, v3])

    const v4 = db2.create<SimpleGraphObject>()
    await db2.put(v4)

    v1.addEdgeTo(v2, 'test', {restrictions: [{rule: db1Feed + '/test/*'}]})
    v2.addEdgeTo(v3, 'db1')
    v2.addEdgeTo(v4, 'db2')
    await db1.put([v1, v2])

   const res = await db1.queryAtVertex(v1).out().out().vertices()
   t.same(res.length, 1)
   t.ok(res[0].equals(v3))
})

tape('restriction edge cases', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feedId = (await db.core.getDefaultFeedId()).toString('hex')

    const v1 = db.create<SimpleGraphObject>()
    const v2 = db.create<SimpleGraphObject>()
    const v3 = db.create<SimpleGraphObject>()
    const v4 = db.create<SimpleGraphObject>()
    const v5 = db.create<SimpleGraphObject>()
    const v6 = db.create<SimpleGraphObject>()

    //     a - (!) readme.txt
    //    / 
    // V1       c.doc
    //    \   /
    //     "b _"
    //        \
    //         (!) d.txt

    await db.put([v1, v2, v3, v4, v5, v6])
    v1.addEdgeTo(v2, 'a', {restrictions: [{rule: '!**/*.txt'}]})
    v2.addEdgeTo(v3, 'readme.txt')
    v1.addEdgeTo(v4, 'b _', {restrictions: [{rule: '!*/' + encodeURIComponent('b _') + '/*', except: {rule: feedId + '/' + encodeURIComponent('b _') + '/c.doc'}}]})
    v4.addEdgeTo(v5, 'c.doc')
    v4.addEdgeTo(v6, 'd.txt')
    await db.put([v1, v2, v4])

   const a = await db.queryAtVertex(v1).out('a').out().vertices()
   t.same(a, [])

   const b = await db.queryAtVertex(v1).out('b _').out().vertices()
   t.same(b.length, 1)
   t.ok(b[0].equals(v5)) 
   
   const all = await db.queryAtVertex(v1).repeat(q => q.out()).vertices()
   t.same(all.length, 3)
   t.ok(all[0].equals(v2))
   t.ok(all[1].equals(v4))
   t.ok(all[2].equals(v5))

   const sub = await db.queryAtVertex(v1).out().out().vertices()
   t.same(sub.length, 1)
   t.ok(b[0].equals(v5)) 
})
