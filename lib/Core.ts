import codecs from 'codecs'
import { Transaction } from 'hyperobjects'
import { Feed, HyperObjects } from 'hyperobjects'
import { Vertex } from './Vertex'
import { VertexDecodingError } from './Errors'

export type RWFunction = (data: Buffer, feed: Buffer, index: number) => Buffer
export type DBOpts = {onRead: RWFunction, onWrite: RWFunction}
export interface Corestore  {
    get(opts?: {key?: string | Buffer}): Feed,
    namespace(name: string): Corestore
}

export class Core {
    private objectStores = new Map<string, HyperObjects>()
    private corestore: Corestore
    private opts?: DBOpts
    private defaultFeed: Promise<HyperObjects>

    constructor(corestore: Corestore, key?: string | Buffer, opts?: DBOpts) {
        this.corestore = corestore
        this.opts = opts
        this.defaultFeed = this.getStore()
    }

    async get<T>(feed: string | Buffer, id: number | string, contentEncoding : string | codecs.BaseCodec<T>, version?: number): Promise<Vertex<T>> {
        const vertexId = typeof id === 'string' ? parseInt(id, 16) : <number> id
        feed = this.feedId(feed)
        const tr = await this.transaction(feed, undefined, version)
        return this.getInTransaction(vertexId, contentEncoding, tr, feed)
    }

    async getInTransaction<T>(id: number | string, contentEncoding : string | codecs.BaseCodec<T>, tr: Transaction, feed: string) : Promise<Vertex<T>> {
        const vertexId = typeof id === 'string' ? parseInt(id, 16) : <number> id
        const version = await tr.getPreviousTransactionIndex()
        const timestamp = (await tr.getPreviousTransactionMarker()).timestamp
        return tr.get(vertexId)
        .then(obj => {
            const vertex = Vertex.decode<T>(obj, contentEncoding, version)
            vertex.setId(vertexId)
            vertex.setFeed(feed)
            vertex.setWritable(tr.store.writable)
            vertex.setTimestamp(timestamp)
            return vertex
        }).catch(err => { throw new VertexDecodingError(vertexId, err) })
    }

    async put<T>(feed: string | Buffer, vertex: Vertex<T>) {
        return this.putAll(feed, [vertex])
    }

    async putAll<T>(feed: string | Buffer, vertices: Array<Vertex<T>>) {
        const ids = new Array<{vertex: Vertex<T>, id: {id?: number}}>()
        let trans: Transaction | undefined
        await this.transaction(feed, async tr => {
            trans = tr
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

        const version = await trans?.getPreviousTransactionIndex()
        const marker = await trans?.getPreviousTransactionMarker()
        for(const {vertex, id} of ids) {
            vertex.setId(<number>id?.id)
            vertex.setFeed(this.feedId(feed))
            vertex.setVersion(version)
            vertex.setTimestamp(marker?.timestamp)
            vertex.setWritable(true)
        }
    }

    async getDefaultFeedId() {
        return (await this.defaultFeed).feed.feed.key
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

    async getStore(feed?: string | Buffer) : Promise<HyperObjects>{
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

    async transaction(feed: string|Buffer, exec?: (tr: Transaction) => any, version?: number) {
        const store = await this.getStore(feed)
        await store.storage.ready()
        const head = version || await store.feed.length()
        const tr = new Transaction(store.storage, head)
        await tr.ready()

        if(exec) {
            const retval = await exec(tr)
            await tr.commit()
            return retval
        }

        return tr
    }
}