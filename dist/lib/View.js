"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = void 0;
const __1 = require("..");
class View {
    constructor(db, contentEncoding, factory, transactions) {
        this.db = db;
        this.transactions = transactions || new Map();
        this.codec = contentEncoding;
        this.factory = factory;
    }
    async getTransaction(feed, version) {
        let feedId = feed;
        if (version) {
            feedId += '@' + version;
        }
        if (this.transactions.has(feed)) {
            return this.transactions.get(feedId);
        }
        else {
            const tr = await this.db.transaction(feed, undefined, version);
            this.transactions.set(feedId, tr);
            return tr;
        }
    }
    async get(feed, id, version, viewDesc) {
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed;
        if (viewDesc) {
            const view = this.getView(viewDesc);
            return view.get(feed, id, version);
        }
        const tr = await this.getTransaction(feed, version);
        const vertex = this.db.getInTransaction(id, this.codec, tr, feed);
        return vertex;
    }
    getView(name) {
        if (!name)
            return this;
        else
            return this.factory.get(name, this.transactions);
    }
    /**
     * Default factory for queries, might be overridden by (stateful) View implementations
     * @param startAt Generator of vertices to start from
     * @returns a query
     */
    query(startAt) {
        return new __1.Query(this, startAt);
    }
}
exports.View = View;
//# sourceMappingURL=View.js.map