"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const random_access_memory_1 = __importDefault(require("random-access-memory"));
const corestore_1 = __importDefault(require("corestore"));
const tape_1 = __importDefault(require("tape"));
const View_1 = require("../lib/View");
const __1 = require("..");
const Codec_1 = require("../lib/Codec");
const QueryControl_1 = require("../lib/QueryControl");
class NextView extends View_1.View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = 'NextView';
    }
    async out(state, label) {
        const vertex = state.value;
        if (!(vertex.getContent() instanceof Codec_1.SimpleGraphObject)) {
            throw new Error('Vertex is not a SimpleGraphObject');
        }
        const edges = vertex.getEdges(label);
        const vertices = [];
        for (const edge of edges) {
            const feed = edge.feed || Buffer.from(vertex.getFeed(), 'hex');
            const res = this.get({ ...edge, feed }, state);
            vertices.push(res);
        }
        return vertices;
    }
    async get(edge, state) {
        const feed = edge.feed.toString('hex');
        const viewDesc = edge.view || View_1.GRAPH_VIEW;
        const tr = await this.getTransaction(feed);
        const vertex = await this.db.getInTransaction(edge.ref, this.codec, tr, feed);
        const view = this.getView(viewDesc);
        const next = await view.out(new QueryControl_1.QueryState(vertex, [], [], view), 'next');
        if (next.length === 0)
            throw new Error('vertex has no edge "next", cannot use NextView');
        return this.toResult((await next[0]).result, edge, state);
    }
}
tape_1.default('query with view', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    db.factory.register('NextView', (core, codec, tr) => new NextView(core, codec, db.factory, tr));
    const v1 = db.create(), v2 = db.create(), v3 = db.create(), v4 = db.create();
    v1.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hello'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hola'));
    v3.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'salut'));
    v4.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hi'));
    await db.put([v1, v2, v3, v4]);
    v1.addEdgeTo(v2, 'next', { view: 'NextView' });
    v2.addEdgeTo(v3, 'next');
    v3.addEdgeTo(v4, 'next');
    await db.put([v1, v2, v3]);
    let results = await db.queryAtVertex(v1).out('next').generator().destruct();
    t.ok(results[0].equals(v3));
    results = await db.queryAtVertex(v1).out('next').out('next').generator().destruct();
    t.ok(results[0].equals(v4));
});
//# sourceMappingURL=view.js.map