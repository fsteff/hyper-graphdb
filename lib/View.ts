import { Core } from "./Core";
import {IVertex, Vertex} from "./Vertex"
import  { Transaction } from "hyperobjects"
import codecs from "codecs"

type Codec<T> = string | codecs.BaseCodec<T>

export abstract class View<T> {
    protected transactions: Map<string, Transaction>
    protected codec: Codec<T>
    protected db: Core

    constructor(db: Core, transactions: Map<string, Transaction>, contentEncoding: Codec<T>) {
        this.db = db
        this.transactions = transactions
        this.codec = contentEncoding
    }

    protected async getTransaction(feed: string, version?: number) : Promise<Transaction>{
        let feedId = feed
        if(version !== undefined) {
            feedId += '@' + version
        }
        if(this.transactions.has(feed)) {
            return <Transaction>this.transactions.get(feedId)
        }
        else {
            const tr = await this.db.transaction(feed, undefined, version)
            this.transactions.set(feedId, tr)
            return tr
        }
    }

    protected async get(feed: string|Buffer, id: number, version?: number) : Promise<Vertex<T>>{
        feed = Buffer.isBuffer(feed) ? feed.toString('hex') : feed
        const tr = await this.getTransaction(feed, version)
        const vertex = this.db.getInTransaction<T>(id, this.codec, tr, feed)
        return vertex
    }

    public abstract out(vertex: IVertex<T>, label?: string): Promise<IVertex<T>[]>
}