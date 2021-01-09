import { HyperObjects } from 'hyperobjects'
import Corestore from 'corestore'
import { Vertex } from './lib/Vertex'
import codecs from 'codecs'

export class HyperGraphDB {
    private objectStores = new Map<string, HyperObjects>()
    private corestore: Corestore
    readonly defaultFeed: HyperObjects

    constructor(corestore: Corestore, key?: string | Buffer) {
        this.corestore = corestore

        const feedOpts = key ? {key} : {}
        const core = corestore.get(feedOpts)
        this.defaultFeed = new HyperObjects(core)

        this.defaultFeed.feed.ready().then(() => {
            const feed = this.defaultFeed.feed.feed.key.toString('hex')
            this.objectStores.set(feed, this.defaultFeed)
        })
    }

    async get<T>(feed: string | Buffer, id: number | string, contentEncoding : string | codecs.BaseCodec<T>): Promise<Vertex<T>> {
        const vertexId = typeof id === 'string' ? parseInt(id, 16) : <number> id
        const obj = await this.getStore(feed).transaction(tr => {
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
        await this.getStore(feed).transaction(async tr => {
            for(const vertex of vertices) {
                const encoded = vertex.encode()
                if(!vertex.getId()) {
                    const id = await tr.create(encoded)
                    ids.push({vertex, id: id})
                } else {
                    await tr.set(vertex.getId(), encoded)
                }
            }
        })

        for(const {vertex, id} of ids) {
            if(id?.id) vertex.setId(id.id)
        }
    }

    async getDefaultFeedId() {
        await this.defaultFeed.feed.ready()
        return this.defaultFeed.feed.feed.key
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

    private getStore(feed: string | Buffer) : HyperObjects{
        feed = this.feedId(feed)
        const store = this.objectStores.get(feed)
        if(store) {
            return store
        } else {
            const core = this.corestore.get({feed})
            const created = new HyperObjects(core)
            this.objectStores.set(feed, created)
            return created
        }
    }
}