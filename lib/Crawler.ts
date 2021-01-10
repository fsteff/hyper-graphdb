import codecs from 'codecs'
import { HyperGraphDB } from '../'
import { Vertex } from './Vertex'

export default class Crawler {
    private readonly db: HyperGraphDB
    private mapped = new Set<string>()

    constructor(db: HyperGraphDB) {
        this.db = db
    }

    async crawl<T> (feed: string, id: number, contentEncoding : string | codecs.BaseCodec<T>) {
        const v = await this.db.get<T>(feed, id, contentEncoding)
        return this.deepAwait(this.process<T>(v, feed, contentEncoding))
    }

    private process<T>(vertex: Vertex<T>, feed: string, contentEncoding : string | codecs.BaseCodec<T>) : Array<Promise<any>> {
        const id = feed + '@' + vertex.getId()
        if(this.mapped.has(id)) {
            return []
        } else {
            this.mapped.add(id)
        }

        const promises = vertex.getEdges().map(async edge => {
            const f = edge.feed?.toString('hex') || feed
            const v = await this.db.get<T>(f, edge.ref, contentEncoding)
            for(const idx of this.db.indexes) {
                idx.onVertex(v, feed, edge)
            }
            return this.process<T>(v, f, contentEncoding)
        })
        return promises
    }

    private async deepAwait(input: Array<Promise<any>>) {
        const stack = [...input]
        while(stack.length) {
          const next = stack.pop()
          if(Array.isArray(next)) {
            stack.push(...next)
          } else {
            let value = await next
            if(value && Array.isArray(value)) {
                stack.push(...value)
            }
          }
        }
      }
}