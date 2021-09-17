import { Core, DBOpts, Corestore } from './lib/Core'
import { Codec, SimpleGraphObject, GraphObject } from './lib/Codec'
import { Edge, IVertex, Vertex } from './lib/Vertex'
import Crawler from './lib/Crawler'
import { Index } from './lib/Index'
import { Query } from './lib/Query'
import { GraphView, GRAPH_VIEW } from './lib/View'
import { Transaction } from 'hyperobjects'
import { Generator } from './lib/Generator'
import * as Errors from './lib/Errors'
import { View, VertexQueries } from './lib/View'
import { ViewFactory } from './lib/ViewFactory'

export {IVertex, Vertex, Edge, GraphObject, Index, SimpleGraphObject, Core, Corestore, Query, Crawler, Generator, Errors, View, VertexQueries, GRAPH_VIEW }

export class HyperGraphDB {
    readonly core: Core
    readonly crawler: Crawler
    readonly codec = new Codec()
    readonly factory: ViewFactory<GraphObject>

    constructor(corestore: Corestore, key?: string | Buffer, opts?: DBOpts, customCore?: Core) {
        this.core = customCore || new Core(corestore, key, opts)
        this.codec.registerImpl(data => new SimpleGraphObject(data))
        this.crawler = new Crawler(this.core)
        this.factory = new ViewFactory<GraphObject>(this.core, this.codec)
        this.factory.register(GRAPH_VIEW, (db, codec, tr) => new GraphView(db, codec, this.factory, tr))
    }

    async put(vertex: Vertex<GraphObject> | Array<Vertex<GraphObject>>, feed?: string | Buffer) {
        feed = feed || await this.core.getDefaultFeedId()
        if(Array.isArray(vertex)) {
            return await this.core.putAll(feed, vertex)
        } else {
            return await this.core.put(feed, vertex)
        }
    }

    async get(id: number, feed?: string | Buffer) : Promise<Vertex<GraphObject>>{
        feed = feed || await this.core.getDefaultFeedId()
        return await this.core.get<GraphObject>(feed, id, this.codec)
    }

    get indexes () {
        return this.crawler.indexes
    }

    create<T extends GraphObject>() : Vertex<T> {
        return <Vertex<T>> new Vertex<GraphObject>(this.codec)
    }

    queryIndex(indexName: string, key: string, view?: View<GraphObject>): Query<GraphObject> {
        const idx = this.indexes.find(i => i.indexName === indexName)
        if(!idx) throw new Error('no index of name "' + indexName + '" found')

        const vertices = new Array<Promise<IVertex<GraphObject>>>()
        const transactions = new Map<string, Transaction>()
        for(const {id, feed} of idx.get(key)) {
            let tr: Promise<Transaction>
            if(!transactions.has(feed)) {
                tr = this.core.transaction(feed)
                tr.then(tr => transactions.set(feed, tr))
            } else {
                tr = Promise.resolve(<Transaction> transactions.get(feed))
            }
            const promise = tr.then(tr => this.core.getInTransaction<GraphObject>(id, this.codec, tr, feed))
            vertices.push(promise)
        }
        if(!view) view = this.factory.get(GRAPH_VIEW, transactions)
        return view.query(Generator.from(vertices))
    }

    queryAtId(id: number, feed: string|Buffer, view?: View<GraphObject>): Query<GraphObject> {
        const transactions = new Map<string, Transaction>()
        feed = <string> (Buffer.isBuffer(feed) ? feed.toString('hex') : feed)
        const trPromise = this.core.transaction(feed)
        const vertex = trPromise.then(tr => {
            const v = this.core.getInTransaction<GraphObject>(id, this.codec, tr, <string>feed)
            transactions.set(<string>feed, tr)
            return v
        })
        
        if(!view) view = this.factory.get(GRAPH_VIEW, transactions)
        return view.query(Generator.from([<Promise<IVertex<GraphObject>>>vertex]))
    }

    queryAtVertex(vertex: Vertex<GraphObject>, view?: View<GraphObject>): Query<GraphObject> {
        return this.queryAtId(vertex.getId(), <string> vertex.getFeed(), view)
    }

    queryPathAtVertex<T extends GraphObject>(path: string, vertex: Vertex<T>, view?: View<GraphObject>) : Query<GraphObject> {
        const parts = path.replace(/\\/g, '/').split('/').filter(s => s.length > 0)
        let last = this.queryAtVertex(vertex, view)
        for(const next of parts) {
            last = last.out(next)
        }
        return last
    }

    async createEdgesToPath<K extends GraphObject, T extends GraphObject>(path: string, root: Vertex<K>, leaf?: Vertex<T>) {
        const self = this
        const parts = path.replace(/\\/g, '/').split('/').filter(s => s.length > 0)
        let leafName = ''
        if(leaf) {
            leafName = parts.splice(parts.length-1, 1)[0]
        }
        if(!root.getWriteable()) throw new Error('passed root vertex has to be writeable')
        const tr = <Transaction> await this.core.transaction(<string>root.getFeed())
        const feed = tr.store.key

        const created = new Array<Vertex<GraphObject>>()
        const route = new Array<{parent: Vertex<GraphObject>, child: Vertex<GraphObject>, label: string, path: string}>()
        let currentPath = ''
        for (const next of parts) {
            let current
            currentPath += '/' + next
            const edges = root.getEdges(next).filter(e => !e.feed || e.feed.equals(feed))
            const vertices = await Promise.all(getVertices(edges))
            if(vertices.length === 0) {
                current = this.create<T>()
                created.push(current)
                route.push({parent: root, child: current, label: next, path: currentPath})
            } else if (vertices.length === 1) {
                current = vertices[0]
            } else {
                current = vertices.sort(newest)[0]
            }
            root = current
        }

        if(created.length > 0) {
            await this.put(created, feed)
        }

        const changes = new Array<Vertex<any>>()
        for(const v of route) {
           v.parent.addEdgeTo(v.child, v.label)
           changes.push(v.parent)
        }
        if(leaf) {
            const last = route.length > 0 ? route[route.length-1].child : root
            const matchingEdge = last.getEdges(leafName).find(e => (!Buffer.isBuffer(e.feed) || feed.equals(e.feed)) && e.ref === leaf.getId())
            if(!matchingEdge) {
                last.addEdgeTo(leaf, leafName)
                changes.push(last)
            }
        }

        if(changes.length > 0) {
            await this.put(changes, feed)
        }
        return route
       
        function getVertices(edges: Edge[]) {
            return edges.map(e => self.core.getInTransaction(e.ref, self.codec, tr, feed.toString('hex') ))
        }

        function newest(a: Vertex<any>, b: Vertex<any>) {
            return (b.getTimestamp() || 0) - (a.getTimestamp() || 0)
        }
    }

    async updateVertex(vertex: Vertex<GraphObject>) {
       const update = await this.core.transaction(<string>vertex.getFeed(), async tr => {
            const version = await tr.getPreviousTransactionIndex()
            if(version > <number> vertex.getVersion()) {
                return this.core.getInTransaction(vertex.getId(), this.codec, tr, <string>vertex.getFeed())
            }
       })
       if(update) {
           Object.assign(vertex, update)
       }
    }
}
