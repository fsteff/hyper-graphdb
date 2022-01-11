import codecs from 'codecs'
import { Transaction } from 'hyperobjects'
import { Core } from './Core'
import { EdgeTraversingError, VertexLoadingError } from './Errors'
import { Generator} from './Generator'
import { Query } from './Query'
import { IVertex, Vertex } from './Vertex'
import { ViewFactory } from './ViewFactory'
import { QueryState } from './QueryControl'
import { Edge, QueryRule } from '..'

export const GRAPH_VIEW = 'GraphView'
export const STATIC_VIEW = 'StaticView'

export type Codec<T> = string | codecs.BaseCodec<T>
export type VertexQueries<T> = Generator<T>
export type QueryResult<T> = Array<Promise<{result: IVertex<T>, label: string, state?: QueryState<T>, view?: View<T>, version?: number}>>

export abstract class View<T> {
    protected readonly transactions: Map<string, Transaction>
    protected readonly codec: Codec<T>
    protected readonly db: Core
    protected readonly factory: ViewFactory<T>
    
    public abstract readonly viewName: string

    constructor(db: Core, contentEncoding: Codec<T>, factory: ViewFactory<T> ,transactions?: Map<string, Transaction>) {
        this.db = db
        this.transactions = transactions || new Map<string, Transaction>()
        this.codec = contentEncoding
        this.factory = factory
    }

    protected async getTransaction(feed: string, version?: number | QueryState<T>) : Promise<Transaction>{
        let feedId = feed
        const maxVersion = typeof version === 'number' ? version : version?.restrictsVersion(feed)
        if(maxVersion) {
            feedId += '@' + maxVersion
        }
        if(this.transactions.has(feedId)) {
            return <Transaction>this.transactions.get(feedId)
        }
        else {
            const tr = await this.db.transaction(feed, undefined, maxVersion)
            this.transactions.set(feedId, tr)
            return tr
        }
    }

    protected async getVertex(edge: Edge & {feed: Buffer}, state?: QueryState<T>) {
        const feed = edge.feed.toString('hex')
        // rules are evaluated after out(), therefore versions have to be pre-checked
        const tr = await this.getTransaction(feed, this.pinnedVersion(edge) || state)
        return await this.db.getInTransaction<T>(edge.ref, this.codec, tr, feed)
            .catch(err => {throw new VertexLoadingError(err, <string>feed, edge.ref, edge.version, edge.view)})
    }

    public async get(edge: Edge & {feed: Buffer}, state: QueryState<T>): Promise<QueryResult<T>> {
        const feed = edge.feed.toString('hex')

        if(edge.view) {
            const view = this.getView(edge.view)
            return view.get({...edge, view: undefined}, state)
                .catch(err => {throw new VertexLoadingError(err, <string>feed, edge.ref, edge.version)})
        }

        const vertex = await this.getVertex(edge, state)
        return [Promise.resolve(this.toResult(vertex, edge, state))]
    }

    protected getView(name?: string): View<T> {
        if(!name) return this.factory.get(GRAPH_VIEW, this.transactions)
        else return this.factory.get(name, this.transactions)
    }

    /**
     * Default factory for queries, might be overridden by (stateful) View implementations
     * @param startAt Generator of vertices to start from
     * @returns a query
     */
    public query(startAt: VertexQueries<T>): Query<T> {
        return new Query(this, startAt)
    }

    public async out(state: QueryState<T>, label?: string): Promise<QueryResult<T>> {
        const vertex = <Vertex<T>> state.value
        if(typeof vertex.getId !== 'function' || typeof vertex.getFeed !== 'function' || !vertex.getFeed()) {
            throw new Error('View.out does only accept persisted Vertex instances as input')
        }
        const edges = vertex.getEdges(label)
        const vertices: QueryResult<T> = []
        for(const edge of edges) {
            const feed =  edge.feed || Buffer.from(<string>vertex.getFeed(), 'hex')
            const promise = this.get({...edge, feed}, state)
            promise.catch(err => {throw new EdgeTraversingError({id: vertex.getId(), feed: <string>vertex.getFeed()}, edge, new Error('key is ' + edge.metadata?.['key']?.toString('hex').substr(0,2) + '...'))})
            for(const res of await promise) {
                vertices.push(res)
            }
        }
        return vertices
    }

    protected toResult(v: IVertex<T>, edge: Edge, oldState: QueryState<T>): {result: IVertex<T>, label: string, state: QueryState<T>, view: View<T>} {
        let newState = oldState
        if(edge.restrictions && edge.restrictions?.length > 0) {
            newState = newState.addRestrictions(v, edge.restrictions)
        }
        return {result: v, label: edge.label, state: newState, view: newState.view}
    }

    protected pinnedVersion(edge: Edge & {feed: Buffer}) : number | undefined{
        if(edge.restrictions) {
            const feed = edge.feed.toString('hex')
            const rules = new QueryRule<T>(<Vertex<T>><unknown>undefined, edge.restrictions)
            return QueryState.minVersion<T>([rules], feed)
        }
    }

    
}

export class GraphView<T> extends View<T> {
    public readonly viewName = GRAPH_VIEW

    constructor(db: Core, contentEncoding: Codec<T>, factory: ViewFactory<T>, transactions?: Map<string, Transaction>){
        super(db, contentEncoding, factory, transactions)

    }
}

export class StaticView<T> extends View<T> {
    public readonly viewName = STATIC_VIEW

    constructor(db: Core, contentEncoding: Codec<T>, factory: ViewFactory<T>, transactions?: Map<string, Transaction>){
        super(db, contentEncoding, factory, transactions)
    }

    // ignores other views in metadata
    public async get(edge: Edge & {feed: Buffer}, state: QueryState<T>): Promise<QueryResult<T>> {
        const vertex = await this.getVertex(edge, state)
        return [Promise.resolve(this.toResult(vertex, edge, state))]
    }

}