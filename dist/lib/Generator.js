"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = void 0;
const streamx_1 = require("streamx");
class Generator {
    constructor(gen) {
        this.gen = gen;
    }
    values(onError) {
        return this.handleOrThrowErrors(onError);
    }
    async destruct(onError) {
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
    stream(onError) {
        return streamx_1.Readable.from(this.handleOrThrowErrors(onError));
    }
    filter(predicate) {
        const self = this;
        return new Generator(filter());
        async function* filter() {
            for await (const elem of self.gen) {
                if (elem instanceof Error)
                    yield elem;
                else if (await predicate(elem))
                    yield elem;
            }
        }
    }
    map(mapper) {
        const self = this;
        return new Generator(map());
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error)
                    yield elem;
                else
                    yield await self.wrapAsync(mapper, elem).catch(err => err); // converts thrown error to Error even if the mapper is not async
            }
        }
    }
    flatMap(mapper) {
        const self = this;
        return new Generator(map());
        async function* map() {
            for await (const elem of self.gen) {
                if (elem instanceof Error) {
                    yield elem;
                }
                else {
                    let mapped = await self.wrapAsync(mapper, elem).catch(err => err);
                    if (mapped instanceof Error) {
                        yield mapped;
                    }
                    else if (mapped instanceof Generator) {
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
        return new Generator(generate());
        async function* generate() {
            for (const p of promises) {
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
                    yield elem;
            }
        }
    }
    async wrapAsync(foo, ...args) {
        return foo(...args);
    }
}
exports.Generator = Generator;
//# sourceMappingURL=Generator.js.map