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
        const pathName = [feedName].concat(path.map(p => encodeURIComponent(p.label))).join('/');
        for (const restriction of this.restrictions) {
            if (!restriction.allows(pathName))
                return false;
        }
        return true;
    }
    restrictsVersion(feed) {
        return minVersion(this.restrictions.map(r => r.restrictsVersion(feed) || 0));
    }
}
exports.QueryRule = QueryRule;
class QueryRestriction {
    constructor(restriction) {
        this.raw = restriction.rule;
        const firstSlash = restriction.rule.indexOf('/');
        const feedRule = firstSlash >= 0 ? restriction.rule.slice(0, firstSlash) : restriction.rule;
        const path = firstSlash >= 0 ? restriction.rule.slice(firstSlash) : '';
        const [feed, versionStr] = feedRule.split('#');
        const rule = feed + path;
        this.pinnedVersion = parseInt(versionStr);
        this.pinnedFeed = /[0-9a-f]+/.test(feed) ? feed : undefined;
        this.rule = minimatch_1.makeRe(rule, { nobrace: true, dot: true, noext: true, nocomment: true });
        if (restriction.except)
            this.except = new QueryRestriction(restriction.except);
    }
    allows(path) {
        const result = this.rule.test(path) || (this.except && this.except.allows(path));
        if (!result) {
            console.warn('QueryControl: path ' + path + ' is not allowed for rule ' + this.raw);
        }
        return result;
    }
    restrictsVersion(feed) {
        if (this.pinnedFeed === feed && this.pinnedVersion)
            return this.pinnedVersion;
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
    mergeStates(value, path, rules, view) {
        return new QueryStateT(value || this.value, path || this.path, rules || this.rules, view || this.view);
    }
    restrictsVersion(feed) {
        var _a;
        return minVersion((_a = this.rules) === null || _a === void 0 ? void 0 : _a.map(r => r.restrictsVersion(feed) || 0));
    }
    static minVersion(restrictions, feed) {
        return minVersion(restrictions.map(r => r.restrictsVersion(feed) || 0));
    }
}
exports.QueryStateT = QueryStateT;
class QueryState extends QueryStateT {
}
exports.QueryState = QueryState;
function minVersion(arr) {
    if (!Array.isArray(arr) || arr.length === 0)
        return undefined;
    const filtered = arr.filter(v => typeof v === 'number' && v > 0 && isFinite(v));
    if (filtered.length > 0)
        return Math.min(...filtered);
}
//# sourceMappingURL=QueryControl.js.map