export class VertexDecodingError extends Error {
    readonly cause: Error
    readonly id: number

    constructor(id: number, cause: Error) {
        super('Cannot decode Vertex #' + id)
        this.cause = cause
        this.id = id
    }
}