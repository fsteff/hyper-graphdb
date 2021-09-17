"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VertexLoadingError = exports.EdgeTraversingError = exports.VertexDecodingError = void 0;
class VertexDecodingError extends Error {
    constructor(id, cause) {
        super('Cannot decode Vertex #' + id);
        this.cause = cause;
        this.id = id;
    }
}
exports.VertexDecodingError = VertexDecodingError;
class EdgeTraversingError extends Error {
    constructor(origin, edge, cause) {
        var _a;
        super('Cannot follow edge: ' +
            JSON.stringify({ id: edge.ref, feed: (_a = edge.feed) === null || _a === void 0 ? void 0 : _a.toString('hex'), label: edge.label, view: edge.view, version: edge.version, metadata: Object.keys(edge.metadata) }) +
            '\n from vertex: ' + JSON.stringify(origin) +
            '\n because of error: ' + cause.message);
        this.origin = origin;
        this.edge = edge;
        this.cause = cause;
    }
}
exports.EdgeTraversingError = EdgeTraversingError;
class VertexLoadingError extends Error {
    constructor(cause, feed, id, version, viewDesc, metadata) {
        super('Cannot get vertex: ' + JSON.stringify({ feed, id, version, viewDesc, metadata }) +
            '\n because of error: ' + cause.message);
        this.cause = cause;
    }
}
exports.VertexLoadingError = VertexLoadingError;
//# sourceMappingURL=Errors.js.map