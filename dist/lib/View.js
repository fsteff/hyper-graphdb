"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphView = exports.View = exports.GRAPH_VIEW = void 0;
const Errors_1 = require("./Errors");
const Generator_1 = require("./Generator");
const Query_1 = require("./Query");
const Vertex_1 = require("./Vertex");
exports.GRAPH_VIEW = 'GraphView';
class View {
    constructor(db, contentEncoding, factory, transactions) {
        this.db = db;
        this.transactions = transactions || new Map();
        this.codec = contentEncoding;
        this.factory = factory;
    }
    async getTransaction(feed, version) {
        let feedId = feed;
        if (version) {
            feedId += '@' + version;
        }
        if (this.transactions.has(feedId)) {
            return this.transactions.get(feedId);
        }
        else {
            const tr = await this.db.transaction(feed, undefined, version);
            this.transactions.set(feedId, tr);
            return tr;
        }
    }
    async get(feed, id, version, viewDesc, metadata) {
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed;
        if (viewDesc) {
            const view = this.getView(viewDesc);
            return view.get(feed, id, version, undefined, metadata)
                .catch(err => { throw new Errors_1.VertexLoadingError(err, feed, id, version); });
        }
        const tr = await this.getTransaction(feed, version);
        const promise = this.db.getInTransaction(id, this.codec, tr, feed);
        promise.catch(err => { throw new Errors_1.VertexLoadingError(err, feed, id, version, viewDesc); });
        return promise;
    }
    getView(name) {
        if (!name)
            return this;
        else
            return this.factory.get(name, this.transactions);
    }
    /**
     * Default factory for queries, might be overridden by (stateful) View implementations
     * @param startAt Generator of vertices to start from
     * @returns a query
     */
    query(startAt) {
        return new Query_1.Query(this, startAt);
    }
}
exports.View = View;
class GraphView extends View {
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
            const promise = this.get(feed, edge.ref, /*edge.version*/ undefined, edge.view, edge.metadata);
            promise.catch(err => { var _a, _b; throw new Errors_1.EdgeTraversingError({ id: vertex.getId(), feed: vertex.getFeed() }, edge, new Error('key is ' + ((_b = (_a = edge.metadata) === null || _a === void 0 ? void 0 : _a['key']) === null || _b === void 0 ? void 0 : _b.toString('hex').substr(0, 2)) + '...')); });
            vertices.push(promise);
        }
        return Generator_1.Generator.from(vertices);
    }
}
exports.GraphView = GraphView;
//# sourceMappingURL=View.js.map