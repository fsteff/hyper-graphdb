"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const random_access_memory_1 = __importDefault(require("random-access-memory"));
const corestore_1 = __importDefault(require("corestore"));
const tape_1 = __importDefault(require("tape"));
const __1 = require("..");
const Codec_1 = require("../lib/Codec");
tape_1.default('query', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const feed = await db.core.getDefaultFeedId();
    const v1 = db.create(), v2 = db.create();
    v1.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hello'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hola'));
    await db.put([v1, v2]);
    v1.addEdgeTo(v2, 'child');
    v2.addEdgeTo(v1, 'parent');
    await db.put([v1, v2]);
    let iter = db.queryAtId(v1.getId(), feed).out('child').vertices();
    for await (const vertex of iter) {
        t.same(v2.getId(), vertex.getId());
    }
    let results = await db.queryAtVertex(v1).out('child').matches(o => { var _a; return ((_a = o.getContent()) === null || _a === void 0 ? void 0 : _a.get('greeting')) === 'hola'; }).generator().destruct();
    t.same(1, results.length);
    t.same(v2.getId(), results[0].getId());
    results = await db.queryAtVertex(v1).out('child').matches(o => { var _a; return ((_a = o.getContent()) === null || _a === void 0 ? void 0 : _a.get('greeting')) === 'I`m grumpy'; }).generator().destruct();
    t.same(0, results.length);
    results = await db.queryAtVertex(v1).out('child').out('parent').generator().destruct();
    t.same(1, results.length);
    t.same(v1.getId(), results[0].getId());
});
tape_1.default('repeat query', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const feed = await db.core.getDefaultFeedId();
    const v = new Array();
    for (let i = 0; i < 100; i++) {
        v[i] = db.create();
        v[i].setContent(new Codec_1.SimpleGraphObject().set('value', i));
    }
    await db.put(v);
    for (let i = 0; i < 99; i++) {
        v[i].addEdgeTo(v[i + 1], 'next');
    }
    await db.put(v);
    let results = await db.queryAtVertex(v[0]).repeat(q => q.out('next')).generator().destruct();
    t.same(99, results.length);
    t.same(v[1].getId(), results[0].getId());
    v[99].addEdgeTo(v[0], 'next');
    await db.put(v[99]);
    t.timeoutAfter(1000);
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next')).generator().destruct();
    t.same(100, results.length);
    t.same(v[1].getId(), results[0].getId());
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next'), undefined, 10).generator().destruct();
    t.same(10, results.length);
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next'), arr => arr.findIndex(r => r.getId() === v[10].getId()) < 0).generator().destruct();
    t.same(10, results.length);
});
//# sourceMappingURL=query.js.map