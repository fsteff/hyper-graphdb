"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.View = void 0;
class View {
    constructor(db, contentEncoding, transactions) {
        this.db = db;
        this.transactions = transactions || new Map();
        this.codec = contentEncoding;
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
    async get(feed, id, version) {
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed;
        const tr = await this.getTransaction(feed, version);
        const vertex = this.db.getInTransaction(id, this.codec, tr, feed);
        return vertex;
    }
}
exports.View = View;
//# sourceMappingURL=View.js.map