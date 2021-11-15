"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const random_access_memory_1 = __importDefault(require("random-access-memory"));
const corestore_1 = __importDefault(require("corestore"));
const tape_1 = __importDefault(require("tape"));
const __1 = require("..");
tape_1.default('query restrictions', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const v1 = db.create();
    const v2 = db.create();
    const v3 = db.create();
    const v4 = db.create();
    const v5 = db.create();
    await db.put([v1, v2, v3, v4, v5]);
    v1.addEdgeTo(v2, 'a', { restrictions: [{ rule: '!a' }] });
    v1.addEdgeTo(v3, 'b', { restrictions: [{ rule: '!b' }, { rule: '!b/*', except: { rule: 'b/c' } }] });
    v3.addEdgeTo(v4, 'c');
    v3.addEdgeTo(v5, 'd');
    await db.put([v1, v3]);
    const a = await db.queryAtVertex(v1).out('a').vertices();
    t.same(a, []);
    const b = await db.queryAtVertex(v1).out('b').vertices();
    t.same(b, []);
    const c = await db.queryAtVertex(v1).out('b').out('c').vertices();
    t.same(c.length, 1);
    t.ok(c[0].equals(v4));
    const d = await db.queryAtVertex(v1).out('b').out('d').vertices();
    t.same(d, []);
    const all = await db.queryAtVertex(v1).repeat(q => q.out()).vertices();
    t.same(all.length, 1);
    t.ok(all[0].equals(v4));
});
tape_1.default('restriction edge cases', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const v1 = db.create();
    const v2 = db.create();
    const v3 = db.create();
    const v4 = db.create();
    const v5 = db.create();
    const v6 = db.create();
    //     a - (!) readme.txt
    //    / 
    // V1       c.doc
    //    \   /
    //     "b _"
    //        \
    //         (!) d.txt
    await db.put([v1, v2, v3, v4, v5, v6]);
    v1.addEdgeTo(v2, 'a', { restrictions: [{ rule: '!**/*.txt' }] });
    v2.addEdgeTo(v3, 'readme.txt');
    v1.addEdgeTo(v4, 'b _', { restrictions: [{ rule: '!' + encodeURIComponent('b _') + '/*', except: { rule: encodeURIComponent('b _') + '/c.doc' } }] });
    v4.addEdgeTo(v5, 'c.doc');
    v4.addEdgeTo(v6, 'd.txt');
    await db.put([v1, v2, v4]);
    const a = await db.queryAtVertex(v1).out('a').out().vertices();
    t.same(a, []);
    const b = await db.queryAtVertex(v1).out('b _').out().vertices();
    t.same(b.length, 1);
    t.ok(b[0].equals(v5));
    const all = await db.queryAtVertex(v1).repeat(q => q.out()).vertices();
    t.same(all.length, 3);
    t.ok(all[0].equals(v2));
    t.ok(all[1].equals(v4));
    t.ok(all[2].equals(v5));
    const sub = await db.queryAtVertex(v1).out().out().vertices();
    t.same(sub.length, 1);
    t.ok(b[0].equals(v5));
});
//# sourceMappingURL=restrictions.js.map