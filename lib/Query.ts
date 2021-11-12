import { IVertex, Vertex } from "./Vertex";
import { Generator, GeneratorT } from './Generator'
import { QueryResult, VertexQueries, View } from './View' 
import { QueryState, QueryStateT} from './QueryControl'

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
        return this.view.query(filtered)
    }

    out(label?: string, view?: View<T>) : Query<T> {
        const self = this
        const vertexQuery = this.vertexQueries.flatMap(process)
        return (view || this.view).query(vertexQuery)

        async function process(vertex: IVertex<T>, state: QueryState<T>) {
            const result = await (view || self.view).out(state, label)
            return makeState(result, state)
        }

        function makeState(result: QueryResult<T>, state: QueryState<T>): Generator<T> {
            return Generator.from(result.map(async p => p.then(r => (r.state || state).nextState(r.result, r.label))))
        }
    }

    vertices() {
        return this.applyRules().destruct()
    }

    generator() {
        return this.applyRules()
    }

    values<V>(extractor: (v: IVertex<T>) => V | Promise<V>){
        return this.applyRules().map(async v => await extractor(v)).values()
    }

    repeat(operators: (query: Query<T>) => Query<T>, until?: (vertices: IVertex<T>[]) => boolean,  maxDepth?: number) : Query<T> {
        const self = this
        return this.view.query(new Generator(gen()))

        async function* gen() {
            let depth = 0
            let mapped = new Array<QueryState<T>>()
            let state: Query<T> = self
            let queries = await self.applyRules().rawQueryStates()
            const results = new Array<QueryState<T>>()

            while((!maxDepth || depth < maxDepth) && (!until || until(results.map(r => r.value))) && queries.length > 0) {
                const newVertices = await self.leftDisjoint(queries, mapped, (a,b) => a.value.equals(b.value)) 
                const subQuery = self.view.query(Generator.from(newVertices))
                mapped = mapped.concat(newVertices)
    
                state = await operators(subQuery)
                queries = await state.applyRules().rawQueryStates()
                for(const q of queries) {
                    yield q
                    results.push(q)
                }
                depth++
            }
        }
    }

    private applyRules() {
        return this.vertexQueries.filter(rulesHold)

        function rulesHold(_elem: IVertex<T>, state: QueryState<T>) {
            for(const rule of state.rules) {
                if(! rule.ruleHolds(state.path)) return false
            }
            return true
        }
    }

    private async leftDisjoint(arr1: QueryState<T>[], arr2: QueryState<T>[], comparator: (left: QueryState<T>, right: QueryState<T>) => Promise<boolean> | boolean) {
        const res = new Array<QueryState<T>>()
        for(const v1 of arr1) {
            if(!(await contained(v1))) res.push(v1)
        } 
        return res

        async function contained(v1: QueryState<T>) {
            for(const v2 of arr2) {
                if(await comparator(v1, v2)) return true
            }
            return false
        }
    }
}

