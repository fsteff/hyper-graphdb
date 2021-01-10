import { Core, DBOpts } from './lib/Core'
import Corestore from 'corestore'
import { Codec, SimpleGraphObject, GraphObject } from './lib/Codec'
import { Vertex } from './lib/Vertex'
import Crawler from './lib/Crawler'
import { Index } from './lib/Index'

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
}

export {Vertex, GraphObject, Index}