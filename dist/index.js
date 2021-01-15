"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HyperGraphDB = exports.SimpleGraphObject = exports.GraphObject = exports.Vertex = void 0;
const Core_1 = require("./lib/Core");
const Codec_1 = require("./lib/Codec");
Object.defineProperty(exports, "SimpleGraphObject", { enumerable: true, get: function () { return Codec_1.SimpleGraphObject; } });
Object.defineProperty(exports, "GraphObject", { enumerable: true, get: function () { return Codec_1.GraphObject; } });
const Vertex_1 = require("./lib/Vertex");
Object.defineProperty(exports, "Vertex", { enumerable: true, get: function () { return Vertex_1.Vertex; } });
const Crawler_1 = __importDefault(require("./lib/Crawler"));
const Query_1 = require("./lib/Query");
const Generator_1 = require("./lib/Generator");
class HyperGraphDB {
    constructor(corestore, key, opts) {
        this.codec = new Codec_1.Codec();
        this.core = new Core_1.Core(corestore, key, opts);
        this.codec.registerImpl(data => new Codec_1.SimpleGraphObject(data));
        this.crawler = new Crawler_1.default(this.core);
    }
    async put(vertex, feed) {
        feed = feed || await this.core.getDefaultFeedId();
        if (Array.isArray(vertex)) {
            return await this.core.putAll(feed, vertex);
        }
        else {
            return await this.core.put(feed, vertex);
        }
    }
    async get(id, feed) {
        feed = feed || await this.core.getDefaultFeedId();
        return await this.core.get(feed, id, this.codec);
    }
    get indexes() {
        return this.crawler.indexes;
    }
    create() {
        return new Vertex_1.Vertex(this.codec);
    }
    queryIndex(indexName, key) {
        const idx = this.indexes.find(i => i.indexName === indexName);
        if (!idx)
            throw new Error('no index of name "' + indexName + '" found');
        const vertices = new Array();
        const transactions = new Map();
        for (const { id, feed } of idx.get(key)) {
            let tr;
            if (!transactions.has(feed)) {
                tr = this.core.startTransaction(feed);
                tr.then(tr => transactions.set(feed, tr));
            }
            else {
                tr = Promise.resolve(transactions.get(feed));
            }
            const promise = tr.then(tr => this.core.getInTransaction(id, this.codec, tr, feed));
            vertices.push({ feed, vertex: promise });
        }
        return new Query_1.Query(this.core, Generator_1.Generator.from(vertices), transactions, this.codec);
    }
    queryAtId(id, feed) {
        const transactions = new Map();
        feed = (Buffer.isBuffer(feed) ? feed.toString('hex') : feed);
        const trPromise = this.core.startTransaction(feed);
        const vertex = trPromise.then(tr => {
            const v = this.core.getInTransaction(id, this.codec, tr, feed);
            transactions.set(feed, tr);
            return v;
        });
        return new Query_1.Query(this.core, Generator_1.Generator.from([{ feed, vertex }]), transactions, this.codec);
    }
    queryAtVertex(vertex) {
        return this.queryAtId(vertex.getId(), vertex.getFeed());
    }
}
exports.HyperGraphDB = HyperGraphDB;
//# sourceMappingURL=index.js.map