import { Core, DBOpts, Corestore } from './lib/Core'
import { Codec, SimpleGraphObject, GraphObject } from './lib/Codec'
import { Vertex } from './lib/Vertex'
import Crawler from './lib/Crawler'
import { Index } from './lib/Index'
import { Query, VertexQuery } from './lib/Query'
import { Transaction } from 'hyperobjects'
import { Generator } from './lib/Generator'

export {Vertex, GraphObject, Index, SimpleGraphObject}
export class HyperGraphDB {
    readonly core: Core
    readonly crawler: Crawler
    readonly codec = new Codec()

    constructor(corestore: Corestore, key?: string | Buffer, opts?: DBOpts, customCore?: Core) {
        this.core = customCore || new Core(corestore, key, opts)
        this.codec.registerImpl(data => new SimpleGraphObject(data))
        this.crawler = new Crawler(this.core)
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

    queryIndex(indexName: string, key: string) {
        const idx = this.indexes.find(i => i.indexName === indexName)
        if(!idx) throw new Error('no index of name "' + indexName + '" found')

        const vertices = new Array<VertexQuery<GraphObject>>()
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
            vertices.push({feed, vertex: promise})
        }
        return new Query<GraphObject>(this.core, Generator.from(vertices), transactions, this.codec)
    }

    queryAtId(id: number, feed: string|Buffer) {
        const transactions = new Map<string, Transaction>()
        feed = <string> (Buffer.isBuffer(feed) ? feed.toString('hex') : feed)
        const trPromise = this.core.transaction(feed)
        const vertex = trPromise.then(tr => {
            const v = this.core.getInTransaction<GraphObject>(id, this.codec, tr, <string>feed)
            transactions.set(<string>feed, tr)
            return v
        })
        
        return new Query<GraphObject>(this.core, Generator.from([{feed, vertex}]), transactions, this.codec)
    }

    queryAtVertex(vertex: Vertex<GraphObject>) {
        return this.queryAtId(vertex.getId(), <string> vertex.getFeed())
    }

}
