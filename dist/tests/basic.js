"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Core_1 = require("../lib/Core");
const random_access_memory_1 = __importDefault(require("random-access-memory"));
const corestore_1 = __importDefault(require("corestore"));
const tape_1 = __importDefault(require("tape"));
const Vertex_1 = require("../lib/Vertex");
const Crawler_1 = __importDefault(require("../lib/Crawler"));
const NameIndex_1 = __importDefault(require("../lib/NameIndex"));
const __1 = require("..");
const Codec_1 = require("../lib/Codec");
tape_1.default('core', async (t) => {
    var _a, _b;
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new Core_1.Core(store);
    const feed = await db.getDefaultFeedId();
    const v1 = new Vertex_1.Vertex('utf-8');
    const v2 = new Vertex_1.Vertex('json');
    v1.setContent('test');
    v2.setContent({ hello: 'world' });
    await db.putAll(feed, [v1, v2]);
    t.same(v1.getId(), 0);
    t.same(v2.getId(), 1);
    let v = await db.get(feed, v1.getId(), 'utf-8');
    t.same(v1.getContent(), 'test');
    t.same(v.getContent(), 'test');
    v = await db.get(feed, v2.getId(), 'json');
    t.same(JSON.stringify(v2.getContent()), JSON.stringify({ hello: 'world' }));
    t.same(JSON.stringify(v.getContent()), JSON.stringify({ hello: 'world' }));
    v1.addEdgeTo(v2, 'snd', feed);
    await db.put(feed, v1);
    t.same(v1.getId(), v1.getId());
    v = await db.get(feed, v1.getId(), 'utf-8');
    const e1 = v1.getEdges()[0];
    const e2 = v.getEdges()[0];
    t.same(e1.label, e2.label);
    t.same((_a = e1.feed) === null || _a === void 0 ? void 0 : _a.toString('hex'), (_b = e2.feed) === null || _b === void 0 ? void 0 : _b.toString('hex'));
    t.same(e1.ref, e2.ref);
});
tape_1.default('crawler', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new Core_1.Core(store);
    const feed = (await db.getDefaultFeedId()).toString('hex');
    const v1 = new Vertex_1.Vertex('binary');
    const v2 = new Vertex_1.Vertex('binary');
    await db.putAll(feed, [v1, v2]);
    v1.addEdgeTo(v2, 'child', await db.getDefaultFeedId());
    v2.addEdgeTo(v1, 'parent');
    await db.putAll(feed, [v1, v2]);
    const crawler = new Crawler_1.default(db);
    const idx = new NameIndex_1.default();
    crawler.registerIndex(idx);
    await crawler.crawl(feed, v1.getId(), 'binary');
    t.same([v2.getId()], idx.get('child').map(o => o.id));
    t.same([v1.getId()], idx.get('parent').map(o => o.id));
});
tape_1.default('onRW', async (t) => {
    t.plan(6);
    function onRead(data, feed, index) {
        t.ok(data && feed && index);
        return Buffer.from(data.map(v => v - 1));
    }
    function onWrite(data, feed, index) {
        t.ok(data && feed && index);
        return Buffer.from(data.map(v => v + 1));
    }
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new Core_1.Core(store, undefined, { onRead, onWrite });
    const feed = (await db.getDefaultFeedId()).toString('hex');
    const v1 = new Vertex_1.Vertex('utf-8');
    v1.setContent('hello');
    const v2 = new Vertex_1.Vertex('utf-8');
    v2.setContent('world');
    await db.putAll(feed, [v1, v2]);
    let v = await db.get(feed, v1.getId(), 'utf-8');
    t.same(v.getContent(), 'hello');
    v = await db.get(feed, v2.getId(), 'utf-8');
    t.same(v.getContent(), 'world');
});
tape_1.default('db', async (t) => {
    var _a, _b;
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const v1 = db.create(), v2 = db.create();
    v1.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hello'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hola'));
    await db.put([v1, v2]);
    let c1 = await db.get(v1.getId());
    let c2 = await db.get(v2.getId());
    t.same('hello', (_a = c1.getContent()) === null || _a === void 0 ? void 0 : _a.get('greeting'));
    t.same('hola', (_b = c2.getContent()) === null || _b === void 0 ? void 0 : _b.get('greeting'));
});
//# sourceMappingURL=basic.js.map