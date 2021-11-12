import { IVertex } from ".."
import { Restriction } from "./Vertex"
import { makeRe } from "minimatch"

export type QueryPath<T> = Array<{label: string, vertex: IVertex<T>}>

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
        const pathName = path.map(p => encodeURIComponent(p.label)).join('/')
        for(const restriction of this.restrictions) {
            if(! restriction.allows(pathName)) return false
        }
        return true
    }
}

export class QueryRestriction {
    readonly rule: RegExp
    readonly except?: QueryRestriction

    constructor(restriction: Restriction) {
        this.rule = makeRe(restriction.rule, {nobrace: true, dot: true, noext: true, nocomment: true})
        if(restriction.except) this.except = new QueryRestriction(restriction.except)
    }

    allows(path: string) {
        return this.rule.test(path) || (this.except && this.except.allows(path))
    }
}

export class QueryStateT<V, T extends IVertex<V>> {
    constructor(readonly value: T, readonly path: QueryPath<V>, readonly rules: QueryRule<V>[]){}

    nextState(vertex: T, label: string): QueryStateT<V,T> {
        return new QueryStateT<V, T>(vertex, this.path.concat(this.path, [{label, vertex}]), this.rules)
    }

    addRestrictions(vertex: T, restrictions: Restriction[]): QueryStateT<V,T> {
        const newRules = new QueryRule<V>(vertex, restrictions)
        return new QueryStateT<V,T>(this.value, this.path, this.rules.concat(newRules))
    }
}

export class QueryState<T> extends QueryStateT<T, IVertex<T>> {}