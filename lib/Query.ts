import Transaction from "hyperobjects/lib/Transaction";
import { Vertex } from "..";

export type VertexQuery<T> = {
    transaction: Transaction,
    vertex: Promise<Vertex<T>>
}

export class Query<T> {
    private entry: Array<VertexQuery<T>>
    constructor(vertices: Array<VertexQuery<T>>) {
        this.entry = vertices
    }

}