"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = exports.GeneratorT = exports.ValueGenerator = void 0;
class ValueGenerator {
    constructor(gen) {
        this.gen = gen;
    }
    generator() {
        return this.gen;
    }
    async destruct() {
        const arr = new Array();
        for await (const elem of this.gen) {
            arr.push(elem);
        }
        return arr;
    }
    filter(predicate) {
        const self = this;
        return new ValueGenerator(filter());
        async function* filter() {
            for await (const elem of self.gen) {
                if (await predicate(elem))
                    yield elem;
            }
        }
    }
    map(mapper) {
        const self = this;
        return new ValueGenerator(map());
        async function* map() {
            for await (const elem of self.gen) {
                yield await self.wrapAsync(mapper, elem);
            }
        }
    }
    flatMap(mapper) {
        const self = this;
        return new ValueGenerator(map());
        async function* map() {
            for await (const elem of self.gen) {
                const mapped = await self.wrapAsync(mapper, elem);
                if (mapped instanceof ValueGenerator) {
                    for await (const res of mapped.gen) {
                        yield res;
                    }
                }
                else if (Array.isArray(mapped)) {
                    for (const res of mapped) {
                        yield await res;
                    }
                }
            }
        }
    }
    concat(other) {
        const self = this;
        return new ValueGenerator(gen());
        async function* gen() {
            for await (const value of self.gen) {
                yield value;
            }
            for await (const value of other.gen) {
                yield value;
            }
        }
    }
    static from(values) {
        return new ValueGenerator(gen());
        async function* gen() {
            const elems = await values;
            if (Array.isArray(elems)) {
                for (const v of elems) {
                    yield await v;
                }
            }
            else {
                for await (const v of elems.gen) {
                    yield v;
                }
            }
        }
    }
    async wrapAsync(foo, ...args) {
        return foo(...args);
    }
}
exports.ValueGenerator = ValueGenerator;
class GeneratorT {
    constructor(gen) {
        this.gen = gen;
    }
    values(onError) {
        return new ValueGenerator(this.handleOrThrowErrors(onError));
    }
    async destruct(onError) {
        const arr = new Array();
        for await (const elem of this.gen) {
            if (elem instanceof Error && onError)
                onError(elem);
            else if (elem instanceof Error)
                throw elem;
            else
                arr.push(elem.value);
        }
        return arr;
    }
    async rawQueryStates(onError) {
        const arr = new Array();
        for await (const elem of this.gen) {
            if (elem instanceof Error && onError)
                onError(elem);
            else if (elem instanceof Error)
                throw elem;
            else
                arr.push(elem);
        }
        return arr;
    }
    filter(predicate) {
        const self = this;
        return new GeneratorT(filter());
        async function* filter() {
            for await (const elem of self.gen) {
                if (elem instanceof Error)
                    yield elem;
                else if (await predicate(elem.value, elem))
                    yield elem;
            }
        }
    }
    map(mapper) {
        const self = this;
        return new GeneratorT(map());
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error)
                    yield elem;
                else
                    yield await self.wrapAsync(mapper, elem.value, elem).catch(err => err); // converts thrown error to Error even if the mapper is not async
            }
        }
    }
    flatMap(mapper) {
        const self = this;
        return new GeneratorT(map());
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) {
                    yield elem;
                }
                else {
                    let mapped = await self.wrapAsync(mapper, elem.value, elem).catch(err => err);
                    if (mapped instanceof Error) {
                        yield mapped;
                    }
                    else if (mapped instanceof GeneratorT) {
                        for await (const res of mapped.gen) {
                            yield res;
                        }
                    }
                    else if (Array.isArray(mapped)) {
                        for (const res of mapped) {
                            yield res;
                        }
                    }
                    else {
                        yield new Error('mapper did not return Array or Generator');
                    }
                }
            }
        }
    }
    static from(promises) {
        return new GeneratorT(generate());
        async function* generate() {
            for (const p of await promises) {
                try {
                    yield await p;
                }
                catch (err) {
                    if (err instanceof Error)
                        yield err;
                    else
                        yield new Error(err);
                }
            }
        }
    }
    handleOrThrowErrors(onError) {
        const self = this;
        return generate();
        async function* generate() {
            for await (const elem of self.gen) {
                if (elem instanceof Error && onError)
                    onError(elem);
                else if (elem instanceof Error)
                    throw elem;
                else
                    yield elem.value;
            }
        }
    }
    async wrapAsync(foo, ...args) {
        return foo(...args);
    }
}
exports.GeneratorT = GeneratorT;
class Generator extends GeneratorT {
}
exports.Generator = Generator;
//# sourceMappingURL=Generator.js.map