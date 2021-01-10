import { Core, DBOpts } from './lib/Core'
import Corestore from 'corestore'
import { Codec, SimpleGraphObject, GraphObject } from './lib/Codec'
import { Vertex } from './lib/Vertex'
import Crawler from './lib/Crawler'
import { Index } from './lib/Index'
import { Query, VertexQuery } from './lib/Query'
import { Transaction } from 'hyperobjects'

export {Vertex, GraphObject, Index}
export class HyperGraphDB {
    readonly core: Core
    readonly crawler: Crawler
    readonly codec = new Codec()

    constructor(corestore: Corestore, key?: string | Buffer, opts?: DBOpts) {
        this.core = new Core(corestore, key, opts)
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

    async queryIndex(indexName: string, key: string) {
        const idx = this.indexes.find(i => i.indexName === indexName)
        if(!idx) throw new Error('no index of name "' + indexName + '" found')

        const vertices = new Array<VertexQuery<GraphObject>>()
        const transactions = new Map<string, Transaction>()
        for(const {id, feed} of idx.get(key)) {
            let tr: Transaction
            if(!transactions.has(feed)) {
                tr = await this.startTransaction(feed)
                transactions.set(feed, tr)
            } else {
                tr = <Transaction> transactions.get(feed)
            }
            transactions.set(feed, tr)
            const promise = this.core.getInTransaction<GraphObject>(id, this.codec, tr, feed)
            vertices.push({transaction: tr, vertex: promise})
        }
        return new Query<GraphObject>(vertices)
    }

    async queryAt(id: number, feed: string|Buffer) {
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed
        const tr = await this.startTransaction(feed)
        const v = this.core.getInTransaction<GraphObject>(id, this.codec, tr, feed)
        return new Query<GraphObject>([{transaction: tr, vertex: v}])
    }

    private async startTransaction(feed: string) {
        const store = await this.core.getStore(feed)
        await store.storage.ready()
        const head = await store.feed.length()
        const tr = new Transaction(store.storage, head)
        await tr.ready()
        return tr
    }
}
