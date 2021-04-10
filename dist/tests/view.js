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
const Generator_1 = require("../lib/Generator");
class NextView extends View_1.View {
    constructor(db, contentEncoding, factory, transactions) {
        super(db, contentEncoding, factory, transactions);
        this.viewName = 'NextView';
    }
    async out(vertex, label) {
        var _a;
        if (!(vertex.getContent() instanceof Codec_1.SimpleGraphObject)) {
            throw new Error('Vertex is not a SimpleGraphObject');
        }
        const edges = vertex.getEdges(label);
        const vertices = new Array();
        for (const edge of edges) {
            const feed = ((_a = edge.feed) === null || _a === void 0 ? void 0 : _a.toString('hex')) || vertex.getFeed();
            vertices.push(this.get(feed, edge.ref, undefined, edge.view));
        }
        return Generator_1.Generator.from(vertices);
    }
    async get(feed, id, version, viewDesc) {
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed;
        viewDesc = viewDesc || View_1.GRAPH_VIEW;
        const tr = await this.getTransaction(feed, version);
        const vertex = await this.db.getInTransaction(id, this.codec, tr, feed);
        const view = this.getView(viewDesc);
        const next = await (await view.out(vertex, 'next')).destruct();
        if (next.length === 0)
            throw new Error('vertex has no edge "next", cannot use NextView');
        return next[0];
    }
}
tape_1.default('query with view', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const feed = await db.core.getDefaultFeedId();
    db.factory.register('NextView', (core, codec, tr) => new NextView(core, codec, db.factory, tr));
    const v1 = db.create(), v2 = db.create(), v3 = db.create();
    v1.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hello'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hola'));
    v3.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'salut'));
    await db.put([v1, v2, v3]);
    v1.addEdgeTo(v2, 'next', feed, undefined, 'NextView');
    v2.addEdgeTo(v3, 'next', feed, undefined, 'GraphView');
    await db.put([v1, v2]);
    let results = await db.queryAtVertex(v1).out('next').generator().destruct();
    t.ok(results[0].equals(v3));
});
//# sourceMappingURL=view.js.map