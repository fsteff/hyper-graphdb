import codecs from 'codecs'
import { Transaction } from 'hyperobjects'
import { Core } from './Core'
import { Generator } from './Generator'
import { Query } from './Query'
import { IVertex, Vertex } from './Vertex'
import { ViewFactory } from './ViewFactory'

export const GRAPH_VIEW = 'GraphView'

export type Codec<T> = string | codecs.BaseCodec<T>
export type VertexQueries<T> = Generator<IVertex<T>>

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

    protected async getTransaction(feed: string, version?: number) : Promise<Transaction>{
        let feedId = feed
        if(version) {
            feedId += '@' + version
        }
        if(this.transactions.has(feedId)) {
            return <Transaction>this.transactions.get(feedId)
        }
        else {
            const tr = await this.db.transaction(feed, undefined, version)
            this.transactions.set(feedId, tr)
            return tr
        }
    }

    protected async get(feed: string|Buffer, id: number, version?: number, viewDesc?: string, metadata?: Object) : Promise<IVertex<T>>{
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed

        if(viewDesc) {
            const view = this.getView(viewDesc)
            return view.get(feed, id, version, undefined, metadata)
        }

        const tr = await this.getTransaction(feed, version)
        const vertex = this.db.getInTransaction<T>(id, this.codec, tr, feed)
        return vertex
    }

    protected getView(name?: string): View<T> {
        if(!name) return this
        else return this.factory.get(name, this.transactions)
    }

    /**
     * Default factory for queries, might be overridden by (stateful) View implementations
     * @param startAt Generator of vertices to start from
     * @returns a query
     */
    public query(startAt: Generator<IVertex<T>>) {
        return new Query(this, startAt)
    }

    /**
     * The out() function defines the core functionality of a view
     * @param vertex 
     * @param label 
     */
    public abstract out(vertex: IVertex<T>, label?: string): Promise<VertexQueries<T>>

    
}

export class GraphView<T> extends View<T> {
    public readonly viewName = GRAPH_VIEW

    constructor(db: Core, contentEncoding: Codec<T>, factory: ViewFactory<T>, transactions?: Map<string, Transaction>){
        super(db, contentEncoding, factory, transactions)

    }

    public async out(vertex: Vertex<T>, label?: string):  Promise<VertexQueries<T>> {
        if(!(vertex instanceof Vertex) || !vertex.getFeed() ) {
            throw new Error('GraphView.out does only accept persisted Vertex instances as input')
        }
        const edges = vertex.getEdges(label)
        const vertices = new Array<Promise<IVertex<T>>>()
        for(const edge of edges) {
            const feed =  edge.feed?.toString('hex') || <string>vertex.getFeed()
            // TODO: version pinning does not work yet
            vertices.push(this.get(feed, edge.ref, /*edge.version*/ undefined, edge.view, edge.metadata))
        }
        return Generator.from(vertices)
    }
}