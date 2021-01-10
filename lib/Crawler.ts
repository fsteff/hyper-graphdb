import codecs from 'codecs'
import { Core } from './Core'
import { Vertex } from './Vertex'
import { Index } from './Index'

export default class Crawler {
    private readonly db: Core
    private mapped = new Set<string>()
    private processPromise: Promise<void>

    readonly indexes = new Array<Index>()

    constructor(db: Core) {
        this.db = db
        this.processPromise = Promise.resolve()
    }

    registerIndex(index: Index) {
        this.indexes.push(index)
    }

    async crawl<T> (feed: string, id: number, contentEncoding : string | codecs.BaseCodec<T>) {
        await this.processPromise
        let resolveCrawling, rejectCrawling
        this.processPromise = new Promise((resolve, reject) => { resolveCrawling = resolve; rejectCrawling = reject })

        try {
            const v = await this.db.get<T>(feed, id, contentEncoding)
            await this.deepAwait(this.process<T>(v, feed, contentEncoding))
            resolveCrawling()
        } catch (e) {
            rejectCrawling(e)
            throw e
        }
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
            for(const idx of this.indexes) {
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