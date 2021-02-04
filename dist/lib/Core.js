"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Core = void 0;
const hyperobjects_1 = require("hyperobjects");
const hyperobjects_2 = require("hyperobjects");
const Vertex_1 = require("./Vertex");
const Errors_1 = require("./Errors");
class Core {
    constructor(corestore, key, opts) {
        this.objectStores = new Map();
        this.corestore = corestore;
        this.opts = opts;
        this.defaultFeed = this.getStore();
    }
    async get(feed, id, contentEncoding) {
        const vertexId = typeof id === 'string' ? parseInt(id, 16) : id;
        const { obj, version } = await this.transaction(feed, async (tr) => { return { obj: await tr.get(vertexId), version: await tr.getPreviousTransactionIndex() }; });
        try {
            const vertex = Vertex_1.Vertex.decode(obj, contentEncoding, version);
            vertex.setId(vertexId);
            vertex.setFeed(this.feedId(feed));
            return vertex;
        }
        catch (err) {
            throw new Errors_1.VertexDecodingError(vertexId, err);
        }
    }
    async getInTransaction(id, contentEncoding, tr, feed) {
        const vertexId = typeof id === 'string' ? parseInt(id, 16) : id;
        const version = await tr.getPreviousTransactionIndex();
        return tr.get(vertexId)
            .then(obj => {
            const vertex = Vertex_1.Vertex.decode(obj, contentEncoding, version);
            vertex.setId(vertexId);
            vertex.setFeed(feed);
            return vertex;
        }).catch(err => { throw new Errors_1.VertexDecodingError(vertexId, err); });
    }
    async put(feed, vertex) {
        return this.putAll(feed, [vertex]);
    }
    async putAll(feed, vertices) {
        const ids = new Array();
        let trans;
        await this.transaction(feed, async (tr) => {
            trans = tr;
            for (const vertex of vertices) {
                const encoded = vertex.encode();
                if (vertex.getId() < 0) {
                    const id = await tr.create(encoded);
                    ids.push({ vertex, id: id });
                }
                else {
                    await tr.set(vertex.getId(), encoded);
                }
            }
        });
        const version = await (trans === null || trans === void 0 ? void 0 : trans.getPreviousTransactionIndex());
        for (const { vertex, id } of ids) {
            vertex.setId(id === null || id === void 0 ? void 0 : id.id);
            vertex.setFeed(this.feedId(feed));
            vertex.setVersion(version);
        }
    }
    async getDefaultFeedId() {
        return (await this.defaultFeed).feed.feed.key;
    }
    feedId(feed) {
        if (Buffer.isBuffer(feed)) {
            return feed.toString('hex');
        }
        else if (typeof feed === 'string') {
            return feed;
        }
        else {
            throw new Error('feed is not a string or Buffer');
        }
    }
    async getStore(feed) {
        const self = this;
        if (!feed) {
            const created = await getDB();
            this.objectStores.set(created.feed.feed.key.toString('hex'), created);
            return created;
        }
        feed = this.feedId(feed);
        const store = this.objectStores.get(feed);
        if (store) {
            return store;
        }
        else {
            const created = await getDB(feed);
            this.objectStores.set(feed, created);
            return created;
        }
        async function getDB(feed) {
            const core = self.corestore.get(feed ? { key: feed } : undefined);
            const created = new hyperobjects_2.HyperObjects(core, { onRead, onWrite });
            await created.feed.ready();
            return created;
            function onRead(index, data) {
                var _a, _b;
                if ((_a = self.opts) === null || _a === void 0 ? void 0 : _a.onRead)
                    return (_b = self.opts) === null || _b === void 0 ? void 0 : _b.onRead(data, core.key, index);
                else
                    return data;
            }
            function onWrite(index, data) {
                var _a, _b;
                if ((_a = self.opts) === null || _a === void 0 ? void 0 : _a.onWrite)
                    return (_b = self.opts) === null || _b === void 0 ? void 0 : _b.onWrite(data, core.key, index);
                else
                    return data;
            }
        }
    }
    async transaction(feed, exec) {
        const store = await this.getStore(feed);
        await store.storage.ready();
        const head = await store.feed.length();
        const tr = new hyperobjects_1.Transaction(store.storage, head);
        await tr.ready();
        if (exec) {
            const retval = await exec(tr);
            await tr.commit();
            return retval;
        }
        return tr;
    }
}
exports.Core = Core;
//# sourceMappingURL=Core.js.map