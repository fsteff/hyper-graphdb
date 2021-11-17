import { Readable } from 'streamx'
import { IVertex } from '..'
import {QueryPath, QueryRule, QueryState, QueryStateT} from './QueryControl'
import { Restriction } from './Vertex'



export class GeneratorT<V, T extends IVertex<V>> {
    protected gen: AsyncGenerator<QueryStateT<V, T> | Error>

    constructor(gen: AsyncGenerator<QueryStateT<V,T> | Error>) {
        this.gen = gen
    }

    values(onError?: (err: Error) => any) : AsyncGenerator<T>{
        return this.handleOrThrowErrors(onError)
    }

    async destruct(onError?: (err: Error) => any) {
        const arr = new Array<T>()
        for await (const elem of this.gen) {
            if (elem instanceof Error && onError) onError(elem)
            else if (elem instanceof Error) throw elem
            else arr.push(elem.value)
        }
        return arr
    }

    stream(onError?: (err: Error) => any) {
        return Readable.from(this.handleOrThrowErrors(onError))
    }

    async rawQueryStates(onError?: (err: Error) => any) {
        const arr = new Array<QueryStateT<V,T>>()
        for await (const elem of this.gen) {
            if (elem instanceof Error && onError) onError(elem)
            else if (elem instanceof Error) throw elem
            else arr.push(elem)
        }
        return arr
    }

    filter(predicate: (elem: T, state: QueryStateT<V,T>) => Promise<boolean>|boolean) {
        const self = this
        return new GeneratorT(filter())

        async function* filter() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) yield elem
                else if (await predicate(elem.value, elem)) yield elem
            }
        }
    }

    map<K,N extends IVertex<K>>(mapper: (elem: T, state: QueryStateT<V,T>) => (K | Promise<K>)) {
        const self = this
        return new GeneratorT<K,N>(map())
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) yield elem
                else yield await self.wrapAsync(mapper, elem.value, elem).catch(err => err) // converts thrown error to Error even if the mapper is not async
            }
        }
    }

    flatMap<K,N extends IVertex<K>>(mapper: (elem: T, state: QueryStateT<V,T>) => (V[] | Promise<V[]> | GeneratorT<K,N> | Promise<GeneratorT<K,N>>)) {
        const self = this
        return new GeneratorT<K,N>(map())
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) {
                    yield elem
                } else {
                    let mapped: (Error | QueryStateT<K,N>[] | GeneratorT<K,N> | AsyncGenerator<V>) = await self.wrapAsync(mapper, elem.value, elem).catch(err => err) 
                    if (mapped instanceof Error) {
                        yield mapped
                    } else if(mapped instanceof GeneratorT){
                        for await (const res of mapped.gen) {
                            yield res
                        }
                    } else if(Array.isArray(mapped)){
                        for (const res of mapped) {
                            yield res
                        }
                    } else {
                        yield new Error('mapper did not return Array or Generator')
                    }
                }
            }
        }
    }

    static from<V,T extends IVertex<V>>(promises:QueryStateT<V,T>[] | Promise<QueryStateT<V,T>>[] | Promise<QueryStateT<V,T>[]>) {
        return new GeneratorT<V,T>(generate())

        async function* generate() {
            for (const p of await promises) {
                try {
                    yield await p
                } catch (err) {
                    if (err instanceof Error) yield err
                    else yield new Error(<string>err)
                }
            }
        }
    }

    private handleOrThrowErrors(onError?: (err: Error) => any) {
        const self = this
        return generate()

        async function* generate() {
            for await (const elem of self.gen) {
                if (elem instanceof Error && onError) onError(elem)
                else if (elem instanceof Error) throw elem
                else yield elem.value
            }
        }
    }

    private async wrapAsync(foo: (...args: any) => (any | Promise<any>), ...args) {
        return foo(...args)
    }
}

export class Generator<T> extends GeneratorT<T, IVertex<T>>{}