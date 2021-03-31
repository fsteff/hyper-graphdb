import { IVertex, Vertex } from "./Vertex";
import { Generator } from './Generator'
import { VertexQueries, View } from './View' 

type QueryPredicate<T> = (v: IVertex<T>) => boolean | Promise<boolean>

export class Query<T> {
    private vertexQueries: VertexQueries<T>
    private view: View<T>

    constructor(view: View<T>, vertexQueries: VertexQueries<T>) {
        this.vertexQueries = vertexQueries
        this.view = view
    }

    matches (test:  QueryPredicate<T>): Query<T> {
        const filtered = this.vertexQueries.filter(async q => await test(q))
        return new Query<T>(this.view, filtered)
    }

    out(label?: string) : Query<T> {
        const vertexQuery = this.vertexQueries.flatMap(async q => (await this.view.out(q, label)))
        return new Query<T>(this.view, vertexQuery)
    }

    vertices() {
        return this.vertexQueries.destruct()
    }

    generator() {
        return this.vertexQueries
    }

    repeat(operators: (query: Query<T>) => Query<T>, until?: (vertices: IVertex<T>[]) => boolean,  maxDepth?: number) : Query<T> {
        const self = this
        return new Query<T>(this.view, new Generator(gen()))

        async function* gen() {
            let depth = 0
            let mapped = new Array<IVertex<T>>()
            let state: Query<T> = self
            let queries = await self.vertexQueries.destruct()
            const results = new Array<IVertex<T>>()

            while((!maxDepth || depth < maxDepth) && (!until || until(results)) && queries.length > 0) {
                const newVertices = await self.leftDisjoint(queries, mapped, (a,b) => a.equals(b)) 
                const subQuery = new Query<T>(self.view, Generator.from(newVertices))
                mapped = mapped.concat(newVertices)
    
                state = await operators(subQuery)
                queries = await state.vertexQueries.destruct()
                for(const q of queries) {
                    yield q
                    results.push(q)
                }
                depth++
            }
        }
    }

    values<V>(extractor: (v: IVertex<T>) => V | Promise<V>){
        return this.vertexQueries.map(async v => await extractor(v)).values()
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

