import { HyperObjects } from 'hyperobjects'
import Corestore from 'corestore'
import { Vertex } from './lib/Vertex'
import { Index } from './lib/Index'
import codecs from 'codecs'
import { AsyncFeed } from 'hyperobjects/lib/AsyncFeed'

type RWFunction = (data: Buffer, feed: Buffer, index: number) => Buffer
type DBOpts = {onRead: RWFunction, onWrite: RWFunction}

export class HyperGraphDB {
    private objectStores = new Map<string, HyperObjects>()
    private corestore: Corestore
    private opts?: DBOpts
    readonly indexes = new Array<Index>()
    private defaultFeed: Promise<HyperObjects>

    constructor(corestore: Corestore, key?: string | Buffer, opts?: DBOpts) {
        this.corestore = corestore
        this.opts = opts
        this.defaultFeed = this.getStore()
    }

    async get<T>(feed: string | Buffer, id: number | string, contentEncoding : string | codecs.BaseCodec<T>): Promise<Vertex<T>> {
        const vertexId = typeof id === 'string' ? parseInt(id, 16) : <number> id
        const store = await this.getStore(feed)
        const obj = await store.transaction(tr => {
            return tr.get(vertexId)
        })
        const vertex = Vertex.decode<T>(obj, contentEncoding)
        vertex.setId(vertexId)

        return vertex
    }

    async put<T>(feed: string | Buffer, vertex: Vertex<T>) {
        return this.putAll(feed, [vertex])
    }

    async putAll<T>(feed: string | Buffer, vertices: Array<Vertex<T>>) {
        const ids = new Array<{vertex: Vertex<T>, id: {id?: number}}>()
        const store = await this.getStore(feed)
        await store.transaction(async tr => {
            for(const vertex of vertices) {
                const encoded = vertex.encode()
                if(vertex.getId() < 0) {
                    const id = await tr.create(encoded)
                    ids.push({vertex, id: id})
                } else {
                    await tr.set(vertex.getId(), encoded)
                }
            }
        })

        for(const {vertex, id} of ids) {
            vertex.setId(<number>id?.id)
        }
    }

    async getDefaultFeedId() {
        return (await this.defaultFeed).feed.feed.key
    }

    registerIndex(idx: Index) {
        if(this.indexes.findIndex(i => i.indexName === idx.indexName) >= 0) {
            throw new Error('Index name has to be unique')
        }
        this.indexes.push(idx)
    }


    private feedId (feed: string | Buffer) {
        if (Buffer.isBuffer(feed)) {
            return feed.toString('hex')
        } else if (typeof feed === 'string') {
            return feed
        } else {
            throw new Error('feed is not a string or Buffer')
        } 
    }

    private async getStore(feed?: string | Buffer) : Promise<HyperObjects>{
        const self = this
        if(!feed) {
            const created = await getDB()
            this.objectStores.set(created.feed.feed.key.toString('hex'), created)
            return created
        }
        feed = this.feedId(feed)
        const store = this.objectStores.get(feed)
        if(store) {
            return store
        } else {
            const created = await getDB(feed)
            this.objectStores.set(feed, created)
            return created
        }

        async function getDB(feed?: string) : Promise<HyperObjects> {
            const core = self.corestore.get(feed ? {key: feed} : undefined)
            const created = new HyperObjects(core, {onRead, onWrite})
            await created.feed.ready()
            return created
            
            function onRead(index: number, data: Buffer) {
                if(self.opts?.onRead) return self.opts?.onRead(data, core.key, index)
                else return data
            }

            function onWrite(index: number, data: Buffer) {
                if(self.opts?.onWrite) return self.opts?.onWrite(data, core.key, index)
                else return data
            }
        }
    }
}