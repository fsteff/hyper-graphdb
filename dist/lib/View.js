"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticView = exports.GraphView = exports.View = exports.STATIC_VIEW = exports.GRAPH_VIEW = void 0;
const Errors_1 = require("./Errors");
const Query_1 = require("./Query");
exports.GRAPH_VIEW = 'GraphView';
exports.STATIC_VIEW = 'StaticView';
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
    toResult(v, edge, state) {
        var _a;
        let newState = state;
        if (edge.restrictions && ((_a = edge.restrictions) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            newState = newState.addRestrictions(v, edge.restrictions);
        }
        return { result: v, label: edge.label, state: state };
    }
}
exports.View = View;
class GraphView extends View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = exports.GRAPH_VIEW;
    }
    async out(state, label) {
        var _a;
        const vertex = state.value;
        if (typeof vertex.getId !== 'function' || typeof vertex.getFeed !== 'function' || !vertex.getFeed()) {
            throw new Error('GraphView.out does only accept persisted Vertex instances as input');
        }
        const edges = vertex.getEdges(label);
        const vertices = [];
        for (const edge of edges) {
            let newState = state;
            const feed = ((_a = edge.feed) === null || _a === void 0 ? void 0 : _a.toString('hex')) || vertex.getFeed();
            // TODO: version pinning does not work yet
            const promise = this.get(feed, edge.ref, /*edge.version*/ undefined, edge.view, edge.metadata).then(v => this.toResult(v, edge, state));
            promise.catch(err => { var _a, _b; throw new Errors_1.EdgeTraversingError({ id: vertex.getId(), feed: vertex.getFeed() }, edge, new Error('key is ' + ((_b = (_a = edge.metadata) === null || _a === void 0 ? void 0 : _a['key']) === null || _b === void 0 ? void 0 : _b.toString('hex').substr(0, 2)) + '...')); });
            vertices.push(promise);
        }
        return vertices;
    }
}
exports.GraphView = GraphView;
class StaticView extends View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = exports.STATIC_VIEW;
    }
    async out(state, label) {
        var _a;
        const vertex = state.value;
        if (typeof vertex.getId !== 'function' || typeof vertex.getFeed !== 'function' || !vertex.getFeed()) {
            throw new Error('GraphView.out does only accept persisted Vertex instances as input');
        }
        const edges = vertex.getEdges(label);
        const vertices = [];
        for (const edge of edges) {
            const feed = ((_a = edge.feed) === null || _a === void 0 ? void 0 : _a.toString('hex')) || vertex.getFeed();
            // TODO: version pinning does not work yet
            const promise = this.get(feed, edge.ref).then(v => this.toResult(v, edge, state));
            promise.catch(err => { var _a, _b; throw new Errors_1.EdgeTraversingError({ id: vertex.getId(), feed: vertex.getFeed() }, edge, new Error('key is ' + ((_b = (_a = edge.metadata) === null || _a === void 0 ? void 0 : _a['key']) === null || _b === void 0 ? void 0 : _b.toString('hex').substr(0, 2)) + '...')); });
            vertices.push(promise);
        }
        return vertices;
    }
    // ignores other views in metadata
    async get(feed, id, version) {
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed;
        const tr = await this.getTransaction(feed, version);
        const promise = this.db.getInTransaction(id, this.codec, tr, feed);
        promise.catch(err => { throw new Errors_1.VertexLoadingError(err, feed, id, version); });
        return promise;
    }
}
exports.StaticView = StaticView;
//# sourceMappingURL=View.js.map