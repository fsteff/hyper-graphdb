import { Readable } from 'streamx'


export class Generator<T> {
    private gen: AsyncGenerator<T | Error>

    constructor(gen: AsyncGenerator<T | Error>) {
        this.gen = gen
    }

    values(onError?: (err: Error) => any) {
        return this.handleOrThrowErrors(onError)
    }

    async destruct(onError?: (err: Error) => any) {
        const arr = new Array<T>()
        for await (const elem of this.gen) {
            if (elem instanceof Error && onError) onError(elem)
            else if (elem instanceof Error) throw elem
            else arr.push(elem)
        }
        return arr
    }

    stream(onError?: (err: Error) => any) {
        return Readable.from(this.handleOrThrowErrors(onError))
    }

    filter(predicate: (elem: T) => Promise<boolean>) {
        const self = this
        return new Generator(filter())

        async function* filter() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) yield elem
                else if (await predicate(elem)) yield elem
            }
        }
    }

    map<V>(mapper: (elem: T) => (V | Promise<V>)) {
        const self = this
        return new Generator<V>(map())
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) yield elem
                else yield await self.wrapAsync(mapper, elem).catch(err => err) // converts thrown error to Error even if the mapper is not async
            }
        }
    }

    flatMap<V>(mapper: (elem: T) => (V[] | Promise<V[]>)) {
        const self = this
        return new Generator<V>(map())
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) {
                    yield elem
                } else {
                    const arr = await self.wrapAsync(mapper, elem).catch(err => err)
                    if (arr instanceof Error) {
                        yield arr
                    } else {
                        for (const res of arr) {
                            yield res
                        }
                    }
                }
            }
        }
    }

    static from<T>(promises: Promise<T>[] | T[]) {
        return new Generator<T>(generate())

        async function* generate() {
            for (const p of promises) {
                try {
                    yield await p
                } catch (err) {
                    if (err instanceof Error) yield err
                    else yield new Error(err)
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
                else yield elem
            }
        }
    }

    private async wrapAsync(foo: (...args: any) => (any | Promise<any>), ...args) {
        return foo(...args)
    }
}