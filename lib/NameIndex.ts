import { Index, VertexId } from './Index'
import { Vertex, Edge } from './Vertex';

export default class NameIndex implements Index {
    private names = new Map<string, Set<VertexId>>()

    hasKey(key: string): boolean {
        return this.names.has(key)
    }
    get(key: string): Array<VertexId> {
        if(this.names.has(key)){
            const vertices = this.names.get(key)
            return [...vertices]
        }
        else return []
    }
    onVertex(vertex: Vertex<any>, feed: string, edge?: Edge) {
        if(!edge || !edge.label) return
        const name = edge.label

        let entries: Set<VertexId>
        if(!this.names.has(name)) {
            entries = new Set<VertexId>()
            this.names.set(name, entries)
        } else {
            entries = this.names.get(name)
        }
        const id = vertex.getId()
        entries.add({id, feed})
    }

    readonly indexName = 'names'
}