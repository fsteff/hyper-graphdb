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
tape_1.default('multiple dbs', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db1 = new __1.HyperGraphDB(store);
    const feed1 = await (await db1.core.getDefaultFeedId()).toString('hex');
    const db2 = new __1.HyperGraphDB(store);
    const feed2 = await (await db2.core.getDefaultFeedId()).toString('hex');
    const v1 = db1.create(), v2 = db1.create();
    v1.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hello'));
    v2.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hola'));
    await db1.put([v1, v2]);
    const v3 = db2.create(), v4 = db2.create();
    v3.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'hallo'));
    v4.setContent(new Codec_1.SimpleGraphObject().set('greeting', 'salut'));
    await db2.put([v3, v4]);
    v1.addEdgeTo(v3, 'next');
    v2.addEdgeTo(v4, 'next');
    await db1.put([v1, v2]);
    v3.addEdgeTo(v2, 'next');
    v4.addEdgeTo(v1, 'next');
    await db2.put([v3, v4]);
    let results = await db1.queryAtVertex(v1).repeat(q => q.out('next')).generator().destruct();
    t.same(results.length, 4);
    let greetings = results.map(v => v.getContent().get('greeting')).sort();
    t.same(greetings, ['hallo', 'hello', 'hola', 'salut']);
    results = await db2.queryAtVertex(v2).repeat(q => q.out('next')).generator().destruct();
    t.same(results.length, 4);
    greetings = results.map(v => v.getContent().get('greeting')).sort();
    t.same(greetings, ['hallo', 'hello', 'hola', 'salut']);
});
//# sourceMappingURL=multifeed.js.map