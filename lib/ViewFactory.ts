import { Transaction } from 'hyperobjects'
import { Core } from './Core'
import { View, Codec } from './View'

export class ViewFactory<T> {
    private readonly views = new Map<String, ViewConstructor<T>>()

    private db: Core
    private codec: Codec<T>

    constructor(db: Core, codec: Codec<T>) {
        this.db = db
        this.codec = codec
    }
    
    // TODO: implement caching
    get(name: string, transactions?: Map<string, Transaction>) {
        const constr = this.views.get(name)
        if(!constr) throw new Error(`View of type ${name} not found in ViewFactory`)
        return constr(this.db, this.codec, transactions)
    }

    register(name: string, constr: ViewConstructor<T>) {
        this.views.set(name, constr)
    }
}

export type ViewConstructor<T> = (db: Core, contentEncoding: Codec<T>, transactions?: Map<string, Transaction>) => View<T>