"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class NameIndex {
    constructor() {
        this.names = new Map();
        this.indexName = 'names';
    }
    hasKey(key) {
        return this.names.has(key);
    }
    get(key) {
        if (this.names.has(key)) {
            const vertices = this.names.get(key);
            return [...vertices];
        }
        else
            return [];
    }
    onVertex(vertex, feed, edge) {
        if (!edge || !edge.label)
            return;
        const name = edge.label;
        console.log('NamedIndex got ' + JSON.stringify({ v: vertex.getId(), l: edge.label }));
        let entries;
        if (!this.names.has(name)) {
            entries = new Set();
            this.names.set(name, entries);
        }
        else {
            entries = this.names.get(name);
        }
        const id = vertex.getId();
        entries.add({ id, feed });
    }
}
exports.default = NameIndex;
//# sourceMappingURL=NameIndex.js.map