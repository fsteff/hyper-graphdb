import Messages from '../messages'
import codecs from 'codecs'

export type Edge = { ref: number, feed?: Buffer, label: string, version?: number, metadata?: Object }
export class Vertex<T> {
    private id: number
    private content: Buffer | null
    private metadata?: Object
    private edges: Array<Edge>
    private codec: codecs.BaseCodec<T>
    private feed?: string
    private version?: number
    private timestamp?: number
    private writable: boolean

    constructor(contentEncoding: string | codecs.BaseCodec<T>, data?: { id: number, content: Buffer, edges: Array<Edge> }, version?: number) {
        this.id = -1
        this.version = version
        if (data) {
            this.content = data.content
            this.edges = data.edges || []
        } else {
            this.edges = []
            this.content = null
        }

        if (typeof contentEncoding === 'string') {
            this.codec = codecs(contentEncoding)
        } else {
            this.codec = contentEncoding
        }
        this.writable = false
    }

    getContent(): T | null {
        if (this.content) return this.codec.decode(this.content)
        else return null
    }

    setContent(content: T | null) {
        if(content) this.content = this.codec.encode(content)
        else this.content = null
    }

    getMetadata(key?: string): Buffer | Object | null {
        if (!this.metadata) return null
        if (key) return this.metadata[key]
        else return this.metadata
    }

    setAllMetadata(map: Map<string, Buffer>) {
        this.metadata = map
    }

    setMetadata(key: string, value: Buffer) {
        if (!this.metadata) this.metadata = new Map<string, Buffer>()
        this.metadata[key] = value
    }

    getId(): number {
        return this.id
    }

    setId(id: number) {
        this.id = id
    }

    getEdges(label?: string): Array<Edge> {
        if (label) return this.edges.filter(e => e.label === label)
        else return this.edges
    }

    setEdges(edges: Array<Edge>) {
        this.edges = edges
    }

    addEdge(edge: Edge) {
        this.edges.push(edge)
    }

    addEdgeTo(vertex: Vertex<any>, label: string, feed?: Buffer, metadata?: Object) {
        if (vertex.getId() < 0) throw new Error('Referenced vertex has no id')
        // get feed from vertex
        if (!feed && vertex.getFeed()) feed = Buffer.from(<string>vertex.getFeed(), 'hex')
        // if the referenced vertex is in the same feed, we don't need to store that
        if (feed && this.feed && feed.equals(Buffer.from(<string>this.getFeed(), 'hex'))) feed = undefined
        this.edges.push({ ref: vertex.getId(), label, feed, version: vertex.version, metadata })
    }

    removeEdge(ref: number | string | Edge | Array<Edge>) {
        let predicate: (Edge) => boolean
        if (typeof ref === 'number') predicate = e => e.ref !== ref
        else if (typeof ref === 'string') predicate = e => e.label !== ref
        else if (Array.isArray(ref)) predicate = e => ref.findIndex(e) < 0
        else predicate = e => e !== ref
        this.edges = this.edges.filter(predicate)
    }

    encode() {
        const copy = Object.assign({}, this)
        copy.content = copy.content || null
        return Messages.Vertex.encode(this)
    }

    static decode<T>(buf: Buffer, contentEncoding: string | codecs.BaseCodec<T>, version?: number): Vertex<T> {
        return new Vertex(contentEncoding, Messages.Vertex.decode(buf), version)
    }

    getFeed(): string | undefined {
        return this.feed
    }

    setFeed(feed: string) {
        this.feed = feed
    }

    getVersion() {
        return this.version
    }

    setVersion(version?: number) {
        this.version = version
    }

    getTimestamp() {
        return this.timestamp
    }

    setTimestamp(timestamp?: number) {
        this.timestamp = timestamp
    }

    getWriteable() {
        return this.writable
    }

    setWritable(writable: boolean) {
        this.writable = writable
    }
}