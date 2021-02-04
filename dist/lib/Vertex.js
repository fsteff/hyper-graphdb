"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Vertex = void 0;
const messages_1 = __importDefault(require("../messages"));
const codecs_1 = __importDefault(require("codecs"));
class Vertex {
    constructor(contentEncoding, data, version) {
        this.id = -1;
        this.version = version;
        if (data) {
            this.content = data.content;
            this.edges = data.edges || [];
        }
        else {
            this.edges = [];
        }
        if (typeof contentEncoding === 'string') {
            this.codec = codecs_1.default(contentEncoding);
        }
        else {
            this.codec = contentEncoding;
        }
    }
    getContent() {
        if (this.content)
            return this.codec.decode(this.content);
        else
            return null;
    }
    setContent(content) {
        this.content = this.codec.encode(content);
    }
    getMetadata(key) {
        if (!this.metadata)
            return null;
        if (key)
            return this.metadata[key];
        else
            return this.metadata;
    }
    setAllMetadata(map) {
        this.metadata = map;
    }
    setMetadata(key, value) {
        if (!this.metadata)
            this.metadata = new Map();
        this.metadata[key] = value;
    }
    getId() {
        return this.id;
    }
    setId(id) {
        this.id = id;
    }
    getEdges(label) {
        if (label)
            return this.edges.filter(e => e.label === label);
        else
            return this.edges;
    }
    setEdges(edges) {
        this.edges = edges;
    }
    addEdge(edge) {
        this.edges.push(edge);
    }
    addEdgeTo(vertex, label, feed, metadata) {
        if (vertex.getId() < 0)
            throw new Error('Referenced vertex has no id');
        // get feed from vertex
        if (!feed && vertex.getFeed())
            feed = Buffer.from(vertex.getFeed(), 'hex');
        // if the referenced vertex is in the same feed, we don't need to store that
        if (feed === null || feed === void 0 ? void 0 : feed.equals(Buffer.from(this.getFeed(), 'hex')))
            feed = undefined;
        this.edges.push({ ref: vertex.getId(), label, feed, version: vertex.version, metadata });
    }
    removeEdge(ref) {
        let predicate;
        if (typeof ref === 'number')
            predicate = e => e.ref !== ref;
        else if (typeof ref === 'string')
            predicate = e => e.label !== ref;
        else if (Array.isArray(ref))
            predicate = e => ref.findIndex(e) < 0;
        else
            predicate = e => e !== ref;
        this.edges = this.edges.filter(predicate);
    }
    encode() {
        return messages_1.default.Vertex.encode(this);
    }
    static decode(buf, contentEncoding, version) {
        return new Vertex(contentEncoding, messages_1.default.Vertex.decode(buf), version);
    }
    getFeed() {
        return this.feed;
    }
    setFeed(feed) {
        this.feed = feed;
    }
    getVersion() {
        return this.version;
    }
    setVersion(version) {
        this.version = version;
    }
}
exports.Vertex = Vertex;
//# sourceMappingURL=Vertex.js.map