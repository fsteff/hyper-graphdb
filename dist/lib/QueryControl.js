"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryState = exports.QueryStateT = exports.QueryRestriction = exports.QueryRule = void 0;
const minimatch_1 = require("minimatch");
/**
 * Rules have to follow shell-style matching rules, for implementation details see https://www.npmjs.com/package/minimatch.
 * Restrictions are applied in CNF (https://en.wikipedia.org/wiki/Conjunctive_normal_form), exceptions are applied as DNF.
 */
class QueryRule {
    constructor(startingAt, restrictions) {
        this.startingAt = startingAt;
        this.restrictions = restrictions.map(r => new QueryRestriction(r));
    }
    ruleHolds(path) {
        while (path.length > 0 && !path[0].vertex.equals(this.startingAt)) {
            path = path.slice(1);
        }
        const feedName = path.length > 0 ? path[path.length - 1].feed : this.startingAt.getFeed();
        const pathName = feedName + '/' + path.map(p => encodeURIComponent(p.label)).join('/');
        for (const restriction of this.restrictions) {
            if (!restriction.allows(pathName))
                return false;
        }
        return true;
    }
}
exports.QueryRule = QueryRule;
class QueryRestriction {
    constructor(restriction) {
        this.rule = minimatch_1.makeRe(restriction.rule, { nobrace: true, dot: true, noext: true, nocomment: true });
        if (restriction.except)
            this.except = new QueryRestriction(restriction.except);
    }
    allows(path) {
        return this.rule.test(path) || (this.except && this.except.allows(path));
    }
}
exports.QueryRestriction = QueryRestriction;
class QueryStateT {
    constructor(value, path, rules, view) {
        this.value = value;
        this.path = path;
        this.rules = rules;
        this.view = view;
    }
    nextState(vertex, label, feed, view) {
        return new QueryStateT(vertex, this.path.concat([{ label, vertex, feed }]), this.rules, view);
    }
    addRestrictions(vertex, restrictions) {
        const newRules = new QueryRule(vertex, restrictions);
        return new QueryStateT(this.value, this.path, this.rules.concat(newRules), this.view);
    }
}
exports.QueryStateT = QueryStateT;
class QueryState extends QueryStateT {
}
exports.QueryState = QueryState;
//# sourceMappingURL=QueryControl.js.map