"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const random_access_memory_1 = __importDefault(require("random-access-memory"));
const corestore_1 = __importDefault(require("corestore"));
const tape_1 = __importDefault(require("tape"));
const __1 = require("..");
tape_1.default('reductor', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const v1 = db.create();
    const v2 = db.create();
    const v3 = db.create();
    const v4 = db.create();
    await db.put([v1, v2, v3, v4]);
    v1.addEdgeTo(v2, 'a'); // v2 is a directory
    v1.addEdgeTo(v3, 'a'); // v3 is a thombstone
    v2.addEdgeTo(v4, 'c'); // v4 is a file in the directory of v2
    await db.put([v1, v2]);
    const a = await db.queryAtVertex(v1)
        .out('a')
        .reduce(arr => arr.find(s => s.value.equals(v3)) ? [] : arr)
        .out('c')
        .vertices();
    t.same(a.length, 0);
});
tape_1.default('path reductor', async (t) => {
    const store = new corestore_1.default(random_access_memory_1.default);
    await store.ready();
    const db = new __1.HyperGraphDB(store);
    const v1 = db.create();
    const v2 = db.create();
    const v3 = db.create();
    const v4 = db.create();
    await db.put([v1, v2, v3, v4]);
    v1.addEdgeTo(v2, 'a'); // v2 is a directory
    v1.addEdgeTo(v3, 'a'); // v3 is a thombstone
    v2.addEdgeTo(v4, 'c'); // v4 is a file in the directory of v2
    await db.put([v1, v2]);
    const c = await db.queryPathAtVertex('a/c', v1, undefined, arr => arr.find(s => s.value.equals(v3)) ? [] : arr).vertices();
    t.same(c.length, 0);
    const a = await db.queryPathAtVertex('a', v1, undefined, arr => t.fail('should not be called') || arr).vertices();
    t.same(a.length, 2);
});
//# sourceMappingURL=reduce.js.map