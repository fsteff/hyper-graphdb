import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { IVertex, Restriction, Vertex } from '../lib/Vertex'
import { HyperGraphDB } from '..'
import { GraphObject, SimpleGraphObject } from '../lib/Codec'

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
    v1.addEdgeTo(v2, 'a', {restrictions: [{rule: '!a'}]})
    v1.addEdgeTo(v3, 'b', {restrictions: [{rule: '!b'}, {rule: '!b/*', except: {rule: 'b/c'}}]})
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
