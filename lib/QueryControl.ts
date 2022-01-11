import { IVertex, Vertex, View } from ".."
import { Restriction } from "./Vertex"
import { makeRe } from "minimatch"

export type QueryPath<T> = Array<{label: string, vertex: IVertex<T>, feed: string}>

/**
 * Rules have to follow shell-style matching rules, for implementation details see https://www.npmjs.com/package/minimatch.
 * Restrictions are applied in CNF (https://en.wikipedia.org/wiki/Conjunctive_normal_form), exceptions are applied as DNF.
 */
export class QueryRule<T> {
    restrictions: QueryRestriction[]
    startingAt: IVertex<T>

    constructor(startingAt: IVertex<T>, restrictions: Restriction[]) {
        this.startingAt = startingAt
        this.restrictions = restrictions.map(r => new QueryRestriction(r))
    }

    ruleHolds(path: QueryPath<T>): boolean {
        while(path.length > 0 && ! path[0].vertex.equals(this.startingAt)) {
            path = path.slice(1)
        }
        const feedName = path.length > 0 ? path[path.length-1].feed : (<Vertex<T>>this.startingAt).getFeed()
        const pathName = feedName + '/' + path.map(p => encodeURIComponent(p.label)).join('/')
        for(const restriction of this.restrictions) {
            if(! restriction.allows(pathName)) return false
        }
        return true
    }

    restrictsVersion(feed: string) {
        return minVersion(this.restrictions.map(r => r.restrictsVersion(feed) || 0))
    }
}

export class QueryRestriction {
    readonly rule: RegExp
    readonly pinnedVersion?: number
    readonly pinnedFeed?: string
    readonly except?: QueryRestriction

    constructor(restriction: Restriction) {
        const firstSlash = restriction.rule.indexOf('/')
        const feedRule = restriction.rule.slice(0, firstSlash)
        const path = restriction.rule.slice(firstSlash)
        const [feed, versionStr] = feedRule.split('#')
        const rule = feed + path
        this.pinnedVersion = parseInt(versionStr)
        this.pinnedFeed = /[0-9a-f]+/.test(feed) ? feed : undefined
        this.rule = makeRe(rule, {nobrace: true, dot: true, noext: true, nocomment: true})

        if(restriction.except) this.except = new QueryRestriction(restriction.except)
    }

    allows(path: string) {
        return this.rule.test(path) || (this.except && this.except.allows(path))
    }

    restrictsVersion(feed: string) {
        if(this.pinnedFeed === feed && this.pinnedVersion) return this.pinnedVersion
    }
}

export class QueryStateT<V, T extends IVertex<V>> {
    constructor(readonly value: T, readonly path: QueryPath<V>, readonly rules: QueryRule<V>[], readonly view: View<V>){}

    nextState(vertex: T, label: string, feed: string, view: View<V>): QueryStateT<V,T> {
        return new QueryStateT<V, T>(vertex, this.path.concat([{label, vertex, feed}]), this.rules, view)
    }

    addRestrictions(vertex: T, restrictions: Restriction[]): QueryStateT<V,T> {
        const newRules = new QueryRule<V>(vertex, restrictions)
        return new QueryStateT<V,T>(this.value, this.path, this.rules.concat(newRules), this.view)
    }

    mergeStates(value?: T, path?: QueryPath<V>, rules?: QueryRule<V>[], view?: View<V>) {
        return new QueryStateT<V, T>(value || this.value, path || this.path, rules || this.rules, view || this.view)
    }

    restrictsVersion(feed: string) {
        return minVersion(this.rules?.map(r => r.restrictsVersion(feed) || 0))  
    }

    static minVersion<V>(restrictions: QueryRule<V>[], feed: string) {
        return minVersion(restrictions.map(r => r.restrictsVersion(feed) || 0))  
    }
}

export class QueryState<T> extends QueryStateT<T, IVertex<T>> {}

function minVersion(arr: number[]) {
    if(! Array.isArray(arr) || arr.length === 0) return undefined
    const filtered = arr.filter(v => typeof v === 'number' && v > 0 && isFinite(v))
    if(filtered.length > 0) return Math.min(... filtered)
}