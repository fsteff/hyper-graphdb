import { Transaction } from 'hyperobjects'
import { Core } from './Core'
import { Generator } from './Generator'
import { IVertex, Vertex } from './Vertex'
import { View, Codec, VertexQueries } from './View'
import { ViewFactory } from './ViewFactory'

export const GRAPH_VIEW = 'GraphView'

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
            vertices.push(this.get(feed, edge.ref, /*edge.version*/ undefined, edge.view))
        }
        return Generator.from(vertices)
    }
}