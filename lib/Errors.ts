import { IVertex } from '..'
import { Edge } from './Vertex'

export class VertexDecodingError extends Error {
    readonly cause: Error
    readonly id: number

    constructor(id: number, cause: Error) {
        super('Cannot decode Vertex #' + id)
        this.cause = cause
        this.id = id
    }
}

export class EdgeTraversingError<T> extends Error {
    constructor(readonly origin: {feed: string, id: number}, readonly edge: Edge, readonly cause: Error) {
        super('Cannot follow edge: ' + 
            JSON.stringify({id: edge.ref, feed: edge.feed?.toString('hex'), label: edge.label, view: edge.view, version: edge.version, metadata: Object.keys(<Object>edge.metadata)}) + 
            '\n from vertex: ' + JSON.stringify(origin) +
            '\n because of error: ' + cause.message)
    }
}

export class VertexLoadingError extends Error {
    constructor(readonly cause: Error, feed: string, id: number, version?: number, viewDesc?: string, metadata?: Object) {
        super('Cannot get vertex: ' + JSON.stringify({feed, id, version, viewDesc, metadata}) +
            '\n because of error: ' + cause.message)
    }
}
