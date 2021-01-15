"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Generator = void 0;
class Generator {
    constructor(gen) {
        this.gen = gen;
    }
    values() {
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
        return new Generator(filter());
        async function* filter() {
            for await (const elem of self.gen) {
                if (await predicate(elem))
                    yield elem;
            }
        }
    }
    map(mapper) {
        const self = this;
        return new Generator(map());
        async function* map() {
            for await (const elem of self.gen) {
                yield await mapper(elem);
            }
        }
    }
    flatMap(mapper) {
        const self = this;
        return new Generator(map());
        async function* map() {
            for await (const elem of self.gen) {
                const arr = await mapper(elem);
                for (const res of arr) {
                    yield res;
                }
            }
        }
    }
    static from(promises) {
        return new Generator(generate());
        async function* generate() {
            for (const p of promises) {
                yield await p;
            }
        }
    }
}
exports.Generator = Generator;
//# sourceMappingURL=Generator.js.map