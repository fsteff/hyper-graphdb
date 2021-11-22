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
    async get(edge, state) {
        const feed = edge.feed.toString('hex');
        if (edge.view) {
            const view = this.getView(edge.view);
            return view.get({ ...edge, view: undefined }, state)
                .catch(err => { throw new Errors_1.VertexLoadingError(err, feed, edge.ref, edge.version); });
        }
        // TODO: version pinning
        const tr = await this.getTransaction(feed, undefined);
        const vertex = await this.db.getInTransaction(edge.ref, this.codec, tr, feed)
            .catch(err => { throw new Errors_1.VertexLoadingError(err, feed, edge.ref, edge.version, edge.view); });
        return [Promise.resolve(this.toResult(vertex, edge, state))];
    }
    getView(name) {
        if (!name)
            return this.factory.get(exports.GRAPH_VIEW, this.transactions);
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
    async out(state, label) {
        const vertex = state.value;
        if (typeof vertex.getId !== 'function' || typeof vertex.getFeed !== 'function' || !vertex.getFeed()) {
            throw new Error('View.out does only accept persisted Vertex instances as input');
        }
        const edges = vertex.getEdges(label);
        const vertices = [];
        for (const edge of edges) {
            const feed = edge.feed || Buffer.from(vertex.getFeed(), 'hex');
            const promise = this.get({ ...edge, feed }, state);
            promise.catch(err => { var _a, _b; throw new Errors_1.EdgeTraversingError({ id: vertex.getId(), feed: vertex.getFeed() }, edge, new Error('key is ' + ((_b = (_a = edge.metadata) === null || _a === void 0 ? void 0 : _a['key']) === null || _b === void 0 ? void 0 : _b.toString('hex').substr(0, 2)) + '...')); });
            for (const res of await promise) {
                vertices.push(res);
            }
        }
        return vertices;
    }
    toResult(v, edge, oldState) {
        var _a;
        let newState = oldState;
        if (edge.restrictions && ((_a = edge.restrictions) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            newState = newState.addRestrictions(v, edge.restrictions);
        }
        return { result: v, label: edge.label, state: newState, view: newState.view };
    }
}
exports.View = View;
class GraphView extends View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = exports.GRAPH_VIEW;
    }
}
exports.GraphView = GraphView;
class StaticView extends View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = exports.STATIC_VIEW;
    }
    // ignores other views in metadata
    async get(edge, state) {
        const feed = edge.feed.toString('hex');
        const tr = await this.getTransaction(feed, undefined);
        const vertex = await this.db.getInTransaction(edge.ref, this.codec, tr, feed)
            .catch(err => { throw new Errors_1.VertexLoadingError(err, feed, edge.ref, edge.version); });
        return [Promise.resolve(this.toResult(vertex, edge, state))];
    }
}
exports.StaticView = StaticView;
//# sourceMappingURL=View.js.map