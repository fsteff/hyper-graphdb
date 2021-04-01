"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphView = exports.GRAPH_VIEW = void 0;
const Generator_1 = require("./Generator");
const Vertex_1 = require("./Vertex");
const View_1 = require("./View");
exports.GRAPH_VIEW = 'GraphView';
class GraphView extends View_1.View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = exports.GRAPH_VIEW;
    }
    async out(vertex, label) {
        var _a;
        if (!(vertex instanceof Vertex_1.Vertex) || !vertex.getFeed()) {
            throw new Error('GraphView.out does only accept persisted Vertex instances as input');
        }
        const edges = vertex.getEdges(label);
        const vertices = new Array();
        for (const edge of edges) {
            const feed = ((_a = edge.feed) === null || _a === void 0 ? void 0 : _a.toString('hex')) || vertex.getFeed();
            // TODO: version pinning does not work yet
            vertices.push(this.get(feed, edge.ref, /*edge.version*/ undefined, edge.view));
        }
        return Generator_1.Generator.from(vertices);
    }
}
exports.GraphView = GraphView;
//# sourceMappingURL=GraphView.js.map