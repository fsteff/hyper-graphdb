import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { IVertex, Vertex } from '../lib/Vertex'
import { View, Codec, VertexQueries, GRAPH_VIEW } from '../lib/View'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'
import { Core } from '../lib/Core'
import { ViewFactory } from '../lib/ViewFactory'
import { Transaction } from 'hyperobjects'
import { Generator } from '../lib/Generator'

class NextView<SimpleGraphObject> extends View<SimpleGraphObject> {
    public readonly viewName = 'NextView'

    constructor(db: Core, contentEncoding: Codec<SimpleGraphObject>, factory: ViewFactory<SimpleGraphObject>, transactions?: Map<string, Transaction>){
        super(db, contentEncoding, factory, transactions)

    }

    public async out(vertex: Vertex<SimpleGraphObject>, label?: string):  Promise<VertexQueries<SimpleGraphObject>> {
        if(!(vertex.getContent() instanceof SimpleGraphObject)) {
            throw new Error('Vertex is not a SimpleGraphObject')
        }
        const edges = vertex.getEdges(label)
        const vertices = new Array<Promise<IVertex<SimpleGraphObject>>>()
        for(const edge of edges) {
            const feed =  edge.feed?.toString('hex') || <string>vertex.getFeed()
            vertices.push(this.get(feed, edge.ref, undefined, edge.view))
        }
        
        return Generator.from(vertices)
    }

    public async get(feed: string|Buffer, id: number, version?: number, viewDesc?: string) : Promise<IVertex<SimpleGraphObject>>{
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed
        viewDesc = viewDesc || GRAPH_VIEW

        const tr = await this.getTransaction(feed, version)
        const vertex = await this.db.getInTransaction<SimpleGraphObject>(id, this.codec, tr, feed)

        const view = this.getView(viewDesc)
        const next = await (await view.out(vertex, 'next')).destruct()
        if(next.length === 0) throw new Error('vertex has no edge "next", cannot use NextView')
        return next[0]
    }
}


tape('query with view', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    const feed = await db.core.getDefaultFeedId()
    db.factory.register('NextView', (core, codec, tr) => new NextView(core, codec, db.factory, tr))

    const v1 = db.create<SimpleGraphObject>(), v2 = db.create<SimpleGraphObject>(), v3 = db.create<SimpleGraphObject>()
    v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
    v3.setContent(new SimpleGraphObject().set('greeting', 'salut'))
    await db.put([v1, v2, v3])
    v1.addEdgeTo(v2, 'next', feed, undefined, 'NextView')
    v2.addEdgeTo(v3, 'next', feed, undefined, 'GraphView')
    await db.put([v1, v2])

    let results = await db.queryAtVertex(v1).out('next').generator().destruct()
    t.ok(results[0].equals(v3))
  
})