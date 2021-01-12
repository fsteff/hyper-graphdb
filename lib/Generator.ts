
export class Generator<T> {
    private gen : AsyncGenerator<T>

    constructor(gen: AsyncGenerator<T>) {
        this.gen = gen
    }

    values() {
        return this.gen
    }

    async destruct() {
        const arr = new Array<T>()
        for await (const elem of this.gen) {
            arr.push(elem)
        }
        return arr
    }

    filter(predicate: (elem: T) => Promise<boolean>) {
        const self = this
        return new Generator(filter())

        async function* filter() {
            for await (const elem of self.gen) {
                if(await predicate(elem)) yield elem
            }
        }
    }

    map<V>(mapper: (elem: T) => (V | Promise<V>)) {
        const self = this
        return new Generator<V>(map())
        async function* map() {
            for await (const elem of self.gen) {
                yield await mapper(elem)
            }
        }
    }

    flatMap<V>(mapper:(elem: T) => (V[] | Promise<V[]>)) {
        const self = this
        return new Generator<V>(map())
        async function* map() {
            for await (const elem of self.gen) {
                const arr = await mapper(elem)
                for(const res of arr) {
                    yield res
                }
            }
        } 
    }
 
    static from<T>(promises: Promise<T>[] | T[]) {
        return new Generator<T>(generate())

        async function* generate() {
            for(const p of promises) {
                yield await p
            }
        }
    }
}