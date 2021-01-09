import { Vertex, Edge } from "./Vertex";

export type VertexId = {id: number, feed: string}

export interface Index {

    /**
     * Tests if the index contains entries for the given key
     * @param (string) key 
     */
    hasKey(key: string): boolean

    /**
     * Returns the index entries for the given key
     * @param (string) key
     * @returns (Array<VertexId>) the stored vertex id entries 
     */
    get(key: string): Array<VertexId>

    /**
     * This function is registered to a crawler that calls onVertex each time it processes a vertex.
     * The passed vertex may or may not be new to the index.
     * @param vertex to process 
     * @param feed hypercore feed key that contains the vertex
     * @param edge (optional) edge leading to the vertex
     */
    onVertex(vertex: Vertex<any>, feed: string, edge?: Edge)

    /**
     * The unique name of the index (must be constant)
     */
    readonly indexName: string
}