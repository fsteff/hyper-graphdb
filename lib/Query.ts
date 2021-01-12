import codecs from "codecs";
import  { Transaction } from "hyperobjects";
import { Core } from "./Core";
import { Vertex } from "./Vertex";
import { Generator } from './Generator'

type QueryPredicate<T> = (v: Vertex<T>) => boolean | Promise<boolean>
type Codec<T> = string | codecs.BaseCodec<T>

export type VertexQuery<T> = {
    feed: string,
    vertex: Promise<Vertex<T>>
}

export type VertexQueries<T> = Generator<VertexQuery<T>>

export class Query<T> {
    private vertexQueries: VertexQueries<T>
    private db: Core
    private transactions = new Map<string, Transaction>()
    private codec: Codec<T>

    constructor(db: Core, vertexQueries: VertexQueries<T>, transactions: Map<string, Transaction>, contentEncoding: Codec<T>) {
        this.vertexQueries = vertexQueries
        this.db = db
        this.transactions = transactions
        this.codec = contentEncoding
    }

    matches (test:  QueryPredicate<T>): Query<T> {
        const filtered = this.vertexQueries.filter(async q => await test(await q.vertex))
        return new Query<T>(this.db, filtered, this.transactions, this.codec)
    }

    out(label?: string) : Query<T> {
        const vertexQuery = this.vertexQueries.flatMap(async q => {
            const edges = (await q.vertex).getEdges(label)
            const vertices = new Array<VertexQuery<T>>()
            for(const edge of edges) {
                const feed =  edge.feed?.toString('hex') || q.feed
                const tr = await this.getTransaction(feed)
                const vertex = this.db.getInTransaction<T>(edge.ref, this.codec, tr, feed)
                vertices.push({feed, vertex})
            }
            return vertices
        })

        return new Query<T>(this.db, vertexQuery, this.transactions, this.codec)
    }

    vertices() {
        return this.vertexQueries.map(async v => await v.vertex).values()
    }

    generator() {
        return this.vertexQueries.map(async v => await v.vertex)
    }

    repeat(operators: (query: Query<T>) => Query<T>, until?: (vertices: Vertex<T>[]) => boolean,  maxDepth?: number) : Query<T> {
        const self = this
        return new Query<T>(this.db, new Generator<VertexQuery<T>>(gen()), this.transactions, this.codec)

        async function* gen() {
            let depth = 0
            let mapped = new Array<VertexQuery<T>>()
            let state: Query<T> = self
            let queries = await self.vertexQueries.destruct()
            const results = new Array<Vertex<T>>()

            while((!maxDepth || depth < maxDepth) && (!until || until(results)) && queries.length > 0) {
                const newVertices = await self.leftDisjoint<VertexQuery<T>>(queries, mapped, self.vertexQueryEquals) 
                const subQuery = new Query<T>(self.db, Generator.from(newVertices), self.transactions, self.codec)
                mapped = mapped.concat(newVertices)
    
                state = await operators(subQuery)
                queries = await state.vertexQueries.destruct()
                for(const q of queries) {
                    yield q
                    results.push(await q.vertex)
                }
                depth++
            }
        }
    }

    values<V>(extractor: (v: Vertex<T>) => V){
        return this.vertexQueries.map(async v => await extractor(await v.vertex)).values()
    }

    private async getTransaction(feed: string) : Promise<Transaction>{
        if(this.transactions.has(feed)) return <Transaction>this.transactions.get(feed)
        else return this.db.startTransaction(feed)
    }

    async resultReductor (arr: Promise<Array<VertexQuery<T>>> | undefined, vertices: Promise<Array<VertexQuery<T>>>) {
        return (await vertices).concat(arr ? await arr : [])
    }

    private async vertexQueryEquals(q1: VertexQuery<T>, q2: VertexQuery<T>) : Promise<boolean> {
        return q1.feed === q2.feed && (await q1.vertex).getId() === (await q2.vertex).getId()
    }

    private async leftDisjoint<V>(arr1: V[], arr2: V[], comparator: (left: V, right: V) => Promise<boolean> | boolean) {
        const res = new Array<V>()
        for(const v1 of arr1) {
            if(!(await contained(v1))) res.push(v1)
        } 
        return res

        async function contained(v1: V) {
            for(const v2 of arr2) {
                if(await comparator(v1, v2)) return true
            }
            return false
        }
    }

}

