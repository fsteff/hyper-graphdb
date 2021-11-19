import RAM from 'random-access-memory'
import Corestore from 'corestore'
import tape from 'tape'
import { IVertex, Vertex, Edge } from '../lib/Vertex'
import { View, Codec, VertexQueries, GRAPH_VIEW, QueryResult, ViewGetResult } from '../lib/View'
import { HyperGraphDB } from '..'
import { SimpleGraphObject } from '../lib/Codec'
import { Core } from '../lib/Core'
import { ViewFactory } from '../lib/ViewFactory'
import { Transaction } from 'hyperobjects'
import { Generator } from '../lib/Generator'
import { QueryState } from '../lib/QueryControl'

class NextView<SimpleGraphObject> extends View<SimpleGraphObject> {
    public readonly viewName = 'NextView'

    constructor(db: Core, contentEncoding: Codec<SimpleGraphObject>, factory: ViewFactory<SimpleGraphObject>, transactions?: Map<string, Transaction>){
        super(db, contentEncoding, factory, transactions)

    }

    public async out(state: QueryState<SimpleGraphObject>, label?: string):  Promise<QueryResult<SimpleGraphObject>> {
        const vertex = <Vertex<SimpleGraphObject>> state.value
        if(!(vertex.getContent() instanceof SimpleGraphObject)) {
            throw new Error('Vertex is not a SimpleGraphObject')
        }
        const edges = vertex.getEdges(label)
        const vertices: QueryResult<SimpleGraphObject> = []
        for(const edge of edges) {
            const feed =  edge.feed || Buffer.from(<string>vertex.getFeed(), 'hex')
            const res = this.get({...edge, feed}, state)
            vertices.push(res)
        }
        
        return vertices
    }

    public async get(edge: Edge & {feed: Buffer}, state: QueryState<SimpleGraphObject>): ViewGetResult<SimpleGraphObject> {
        const feed = edge.feed.toString('hex')
        const viewDesc = edge.view || GRAPH_VIEW

        const tr = await this.getTransaction(feed)
        const vertex = await this.db.getInTransaction<SimpleGraphObject>(edge.ref, this.codec, tr, feed)

        const view = this.getView(viewDesc)
        const next = await view.out(new QueryState(vertex, [], [], view),'next')
        if(next.length === 0) throw new Error('vertex has no edge "next", cannot use NextView')
        return this.toResult((await next[0]).result, edge, state)
    }
}


tape('query with view', async t => {
    const store = new Corestore(RAM)
    await store.ready()
    const db = new HyperGraphDB(store)
    db.factory.register('NextView', (core, codec, tr) => new NextView(core, codec, db.factory, tr))

    const v1 = db.create<SimpleGraphObject>(), v2 = db.create<SimpleGraphObject>(), v3 = db.create<SimpleGraphObject>(), v4 = db.create<SimpleGraphObject>()
    v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
    v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
    v3.setContent(new SimpleGraphObject().set('greeting', 'salut'))
    v4.setContent(new SimpleGraphObject().set('greeting', 'hi'))
    await db.put([v1, v2, v3, v4])
    v1.addEdgeTo(v2, 'next', {view: 'NextView'})
    v2.addEdgeTo(v3, 'next')
    v3.addEdgeTo(v4, 'next')
    await db.put([v1, v2, v3])

    let results = await db.queryAtVertex(v1).out('next').generator().destruct()
    t.ok(results[0].equals(v3))

    results = await db.queryAtVertex(v1).out('next').out('next').generator().destruct()
    t.ok(results[0].equals(v4))
  
})