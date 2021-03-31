import codecs from 'codecs'
import { Transaction } from 'hyperobjects'
import { Core } from './Core'
import { Generator } from './Generator'
import { IVertex, Vertex } from './Vertex'
import { View, Codec, VertexQueries } from './View'

export class GraphView<T> extends View<T> {

    constructor(db: Core, contentEncoding: Codec<T>, transactions?: Map<string, Transaction>){
        super(db, contentEncoding, transactions)

    }

    public async out(vertex: Vertex<T>, label?: string):  Promise<VertexQueries<T>> {
        if(!(vertex instanceof Vertex) || !vertex.getFeed() ) {
            throw new Error('GraphView.out does only accept persisted Vertex instances as input')
        }
        const edges = vertex.getEdges(label)
        const vertices = new Array<Promise<IVertex<T>>>()
        for(const edge of edges) {
            const feed =  edge.feed?.toString('hex') || <string>vertex.getFeed()
            const tr = await this.getTransaction(feed)
            const v = this.db.getInTransaction<T>(edge.ref, this.codec, tr, feed)
            vertices.push(v)
        }
        return Generator.from(vertices)
    }
    
}