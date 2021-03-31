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
    let iter = await db.queryAtId(v1.getId(), feed).out('child').vertices();
    for (const vertex of iter) {
        t.ok(v2.equals(vertex));
    }
    let results = await db.queryAtVertex(v1).out('child').matches(o => { var _a; return ((_a = o.getContent()) === null || _a === void 0 ? void 0 : _a.get('greeting')) === 'hola'; }).generator().destruct();
    t.same(1, results.length);
    t.ok(v2.equals(results[0]));
    results = await db.queryAtVertex(v1).out('child').matches(o => { var _a; return ((_a = o.getContent()) === null || _a === void 0 ? void 0 : _a.get('greeting')) === 'I`m grumpy'; }).generator().destruct();
    t.same(0, results.length);
    results = await db.queryAtVertex(v1).out('child').out('parent').generator().destruct();
    t.same(1, results.length);
    t.ok(v1.equals(results[0]));
});
tape_1.default('repeat query', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
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
    let results = await db.queryAtVertex(v[0]).repeat(q => q.out('next')).vertices();
    t.same(99, results.length);
    t.ok(v[1].equals(results[0]));
    v[99].addEdgeTo(v[0], 'next');
    await db.put(v[99]);
    t.timeoutAfter(1000);
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next')).generator().destruct();
    t.same(100, results.length);
    t.ok(v[1].equals(results[0]));
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next'), undefined, 10).generator().destruct();
    t.same(10, results.length);
    results = await db.queryAtVertex(v[0]).repeat(q => q.out('next'), arr => arr.findIndex(r => r.equals(v[10])) < 0).generator().destruct();
    t.same(10, results.length);
});
tape_1.default('error handling', async (t) => {
    t.plan(3);
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const feed = await db.core.getDefaultFeedId();
    try {
        // throws 
        await db.queryAtId(0, feed).generator().destruct();
        t.fail('should have thrown an error');
    }
    catch (err) {
        t.ok(err);
    }
    const v1 = db.create();
    v1.addEdge({ label: 'next', ref: 1 });
    await db.put(v1);
    // handle the error 
    const result = await db.queryAtId(0, feed).out('next').generator().destruct(err => {
        t.ok(err);
    });
    t.same(result.length, 0);
});
tape_1.default('path', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const v1 = db.create(), v2 = db.create(), v3 = db.create();
    v1.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hello'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hola'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'salut'));
    await db.put([v1, v2, v3]);
    v1.addEdgeTo(v2, 'a');
    v1.addEdgeTo(v3, 'a');
    v2.addEdgeTo(v3, 'b');
    v3.addEdgeTo(v1, 'c');
    await db.put([v1, v2, v3]);
    let results = await db.queryPathAtVertex('a', v1).generator().destruct();
    resultsEqual(results, [v2, v3]);
    results = await db.queryPathAtVertex('a/b', v1).generator().destruct();
    resultsEqual(results, [v3]);
    results = await db.queryPathAtVertex('\\a\\b', v1).generator().destruct();
    resultsEqual(results, [v3]);
    results = await db.queryPathAtVertex('', v1).generator().destruct();
    resultsEqual(results, [v1]);
    results = await db.queryPathAtVertex('c', v1).generator().destruct();
    resultsEqual(results, []);
    results = await db.queryPathAtVertex('a/b/c', v1).generator().destruct();
    resultsEqual(results, [v1]);
    function resultsEqual(results, expected) {
        results = results.slice();
        expected = expected.slice();
        for (const v of results) {
            let idx = expected.findIndex(e => e.equals(v));
            t.ok(idx >= 0);
            expected.splice(idx, 1);
        }
    }
});
tape_1.default('createEdgesToPath', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const db2 = new __1.HyperGraphDB(store);
    const feed = await db.core.getDefaultFeedId();
    const v1 = db.create(), v2 = db.create();
    await db.put([v1, v2]);
    const v21 = db.create(), v22 = db.create(), v23 = db.create();
    v23.setContent(new Codec_1.SimpleGraphObject().set('file', 'b'));
    await db2.put([v21, v22, v23]);
    v1.addEdgeTo(v2, 'a');
    v1.addEdgeTo(v21, 'a');
    await db.put(v1);
    v21.addEdgeTo(v22, 'b');
    v22.addEdgeTo(v23, 'c');
    await db2.put([v21, v22]);
    const result = await db.createEdgesToPath('a/b/c', v1);
    t.same(result.length, 2);
    const v3 = result[1].child;
    v3.setContent(new Codec_1.SimpleGraphObject().set('file', 'a'));
    await db.put(v3);
    const vertices = await db.queryPathAtVertex('a/b/c', v1).generator().destruct(err => t.fail(err));
    t.same(vertices.length, 2);
    resultsEqual(vertices, [v23, v3]);
    function resultsEqual(results, expected) {
        let resIds = results.map(v => v.getId()).sort();
        let expIds = expected.map(v => v.getId()).sort();
        t.same(resIds, expIds);
    }
});
//# sourceMappingURL=query.js.map