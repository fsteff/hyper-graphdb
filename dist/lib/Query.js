"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Query = void 0;
const Generator_1 = require("./Generator");
class Query {
    constructor(view, vertexQueries) {
        this.vertexQueries = vertexQueries;
        this.view = view;
    }
    matches(test) {
        const filtered = this.vertexQueries.filter(async (q) => await test(q));
        return this.view.query(filtered);
    }
    out(label) {
        const vertexQuery = this.vertexQueries.flatMap(async (q) => (await this.view.out(q, label)));
        return this.view.query(vertexQuery);
    }
    vertices() {
        return this.vertexQueries.destruct();
    }
    generator() {
        return this.vertexQueries;
    }
    repeat(operators, until, maxDepth) {
        const self = this;
        return this.view.query(new Generator_1.Generator(gen()));
        async function* gen() {
            let depth = 0;
            let mapped = new Array();
            let state = self;
            let queries = await self.vertexQueries.destruct();
            const results = new Array();
            while ((!maxDepth || depth < maxDepth) && (!until || until(results)) && queries.length > 0) {
                const newVertices = await self.leftDisjoint(queries, mapped, (a, b) => a.equals(b));
                const subQuery = self.view.query(Generator_1.Generator.from(newVertices));
                mapped = mapped.concat(newVertices);
                state = await operators(subQuery);
                queries = await state.vertexQueries.destruct();
                for (const q of queries) {
                    yield q;
                    results.push(q);
                }
                depth++;
            }
        }
    }
    values(extractor) {
        return this.vertexQueries.map(async (v) => await extractor(v)).values();
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