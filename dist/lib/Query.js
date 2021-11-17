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
    out(label, view) {
        const self = this;
        const vertexQuery = this.vertexQueries.flatMap(process);
        return (view || this.view).query(vertexQuery);
        async function process(vertex, state) {
            const result = await (view || self.view).out(state, label);
            return makeState(result, state);
        }
        function makeState(result, state) {
            return Generator_1.Generator.from(result.map(async (p) => {
                return p.then(r => {
                    var _a;
                    const feed = getFeed(r.result) || ((_a = state.path[state.path.length - 1]) === null || _a === void 0 ? void 0 : _a.feed);
                    return (r.state || state).nextState(r.result, r.label, feed);
                });
            }));
        }
        function getFeed(v) {
            if (typeof v.getFeed === 'function') {
                return v.getFeed();
            }
            else {
                return undefined;
            }
        }
    }
    reduce(reductor) {
        return this.view.query(Generator_1.Generator.from(this.vertexQueries.rawQueryStates().then(reductor)));
    }
    vertices() {
        return this.applyRules().destruct();
    }
    generator() {
        return this.applyRules();
    }
    values(extractor) {
        return this.applyRules().values().map(async (v) => await extractor(v)).generator();
    }
    repeat(operators, until, maxDepth) {
        const self = this;
        return this.view.query(new Generator_1.Generator(gen()));
        async function* gen() {
            let depth = 0;
            let mapped = new Array();
            let state = self;
            let queries = await self.applyRules().rawQueryStates();
            const results = new Array();
            while ((!maxDepth || depth < maxDepth) && (!until || until(await Generator_1.Generator.from(results).filter(rulesHold).destruct())) && queries.length > 0) {
                const newVertices = await self.leftDisjoint(queries, mapped, (a, b) => a.value.equals(b.value));
                const subQuery = self.view.query(Generator_1.Generator.from(newVertices));
                mapped = mapped.concat(newVertices);
                state = await operators(subQuery);
                queries = await state.vertexQueries.rawQueryStates();
                for (const q of queries) {
                    let allowed = true;
                    for (const rule of q.rules) {
                        if (!rule.ruleHolds(q.path))
                            allowed = false;
                    }
                    if (allowed)
                        yield q;
                    results.push(q);
                }
                depth++;
            }
        }
        function rulesHold(_elem, state) {
            for (const rule of state.rules) {
                if (!rule.ruleHolds(state.path))
                    return false;
            }
            return true;
        }
    }
    applyRules() {
        return this.vertexQueries.filter(rulesHold);
        function rulesHold(_elem, state) {
            for (const rule of state.rules) {
                if (!rule.ruleHolds(state.path))
                    return false;
            }
            return true;
        }
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