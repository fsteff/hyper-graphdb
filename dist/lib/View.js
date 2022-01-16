"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaticView = exports.GraphView = exports.View = exports.STATIC_VIEW = exports.GRAPH_VIEW = void 0;
const Errors_1 = require("./Errors");
const Query_1 = require("./Query");
const QueryControl_1 = require("./QueryControl");
const __1 = require("..");
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
        const maxVersion = typeof version === 'number' ? version : version === null || version === void 0 ? void 0 : version.restrictsVersion(feed);
        if (maxVersion) {
            feedId += '@' + maxVersion;
        }
        if (this.transactions.has(feedId)) {
            return this.transactions.get(feedId);
        }
        else {
            const tr = await this.db.transaction(feed, undefined, maxVersion);
            this.transactions.set(feedId, tr);
            return tr;
        }
    }
    async getVertex(edge, state) {
        const feed = edge.feed.toString('hex');
        // rules are evaluated after out(), therefore versions have to be pre-checked
        const tr = await this.getTransaction(feed, this.pinnedVersion(edge) || state);
        return await this.db.getInTransaction(edge.ref, this.codec, tr, feed)
            .catch(err => { throw new Errors_1.VertexLoadingError(err, feed, edge.ref, edge.version, edge.view); });
    }
    async get(edge, state) {
        const feed = edge.feed.toString('hex');
        if (edge.view) {
            const view = this.getView(edge.view);
            return view.get({ ...edge, view: undefined }, state)
                .catch(err => { throw new Errors_1.VertexLoadingError(err, feed, edge.ref, edge.version); });
        }
        const vertex = await this.getVertex(edge, state);
        if (vertex) {
            return [Promise.resolve(this.toResult(vertex, edge, state))];
        }
        else {
            return [];
        }
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
            const results = await this.get({ ...edge, feed }, state)
                .catch(err => { var _a, _b; throw new Errors_1.EdgeTraversingError({ id: vertex.getId(), feed: vertex.getFeed() }, edge, err || new Error('key is ' + ((_b = (_a = edge.metadata) === null || _a === void 0 ? void 0 : _a['key']) === null || _b === void 0 ? void 0 : _b.toString('hex').substr(0, 2)) + '...')); });
            for (const res of results) {
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
    pinnedVersion(edge) {
        if (edge.restrictions) {
            const feed = edge.feed.toString('hex');
            const rules = new __1.QueryRule(undefined, edge.restrictions);
            return QueryControl_1.QueryState.minVersion([rules], feed);
        }
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
        const vertex = await this.getVertex(edge, state);
        return [Promise.resolve(this.toResult(vertex, edge, state))];
    }
}
exports.StaticView = StaticView;
//# sourceMappingURL=View.js.map