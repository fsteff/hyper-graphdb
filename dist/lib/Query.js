"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
const Generator_1 = require("./Generator");
class Query {
    constructor(db, vertexQueries, transactions, contentEncoding) {
        this.transactions = new Map();
        this.vertexQueries = vertexQueries;
        this.db = db;
        this.transactions = transactions;
        this.codec = contentEncoding;
    }
    matches(test) {
        const filtered = this.vertexQueries.filter(async (q) => await test(await q.vertex));
        return new Query(this.db, filtered, this.transactions, this.codec);
    }
    out(label) {
        const vertexQuery = this.vertexQueries.flatMap(async (q) => {
            var _a;
            const edges = (await q.vertex).getEdges(label);
            const vertices = new Array();
            for (const edge of edges) {
                const feed = ((_a = edge.feed) === null || _a === void 0 ? void 0 : _a.toString('hex')) || q.feed;
                const tr = await this.getTransaction(feed);
                const vertex = this.db.getInTransaction(edge.ref, this.codec, tr, feed);
                vertices.push({ feed, vertex });
            }
            return vertices;
        });
        return new Query(this.db, vertexQuery, this.transactions, this.codec);
    }
    vertices() {
        return this.vertexQueries.map(async (v) => await v.vertex).values();
    }
    generator() {
        return this.vertexQueries.map(async (v) => await v.vertex);
    }
    repeat(operators, until, maxDepth) {
        const self = this;
        return new Query(this.db, new Generator_1.Generator(gen()), this.transactions, this.codec);
        async function* gen() {
            let depth = 0;
            let mapped = new Array();
            let state = self;
            let queries = await self.vertexQueries.destruct();
            const results = new Array();
            while ((!maxDepth || depth < maxDepth) && (!until || until(results)) && queries.length > 0) {
                const newVertices = await self.leftDisjoint(queries, mapped, self.vertexQueryEquals);
                const subQuery = new Query(self.db, Generator_1.Generator.from(newVertices), self.transactions, self.codec);
                mapped = mapped.concat(newVertices);
                state = await operators(subQuery);
                queries = await state.vertexQueries.destruct();
                for (const q of queries) {
                    yield q;
                    results.push(await q.vertex);
                }
                depth++;
            }
        }
    }
    values(extractor) {
        return this.vertexQueries.map(async (v) => await extractor(await v.vertex)).values();
    }
    async getTransaction(feed) {
        if (this.transactions.has(feed))
            return this.transactions.get(feed);
        else
            return this.db.startTransaction(feed);
    }
    async resultReductor(arr, vertices) {
        return (await vertices).concat(arr ? await arr : []);
    }
    async vertexQueryEquals(q1, q2) {
        return q1.feed === q2.feed && (await q1.vertex).getId() === (await q2.vertex).getId();
    }
    async leftDisjoint(arr1, arr2, comparator) {
        const res = new Array();
        for (const v1 of arr1) {
            if (!(await contained(v1)))
                res.push(v1);
        }
        return res;
        async function contained(v1) {
            for (const v2 of arr2) {
                if (await comparator(v1, v2))
                    return true;
            }
            return false;
        }
    }
}
exports.Query = Query;
//# sourceMappingURL=Query.js.map