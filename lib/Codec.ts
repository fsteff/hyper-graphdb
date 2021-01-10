import { NamedCodec } from 'codecs'
import Messages from '../messages'

export abstract class GraphObject {
    abstract readonly typeName: string

    constructor(serialized?: Uint8Array) {
        if(serialized) {
            const obj = JSON.parse(serialized.toString())
            Object.assign(this, obj)
        }
    }

    serialize() : Buffer {
        return Buffer.from(JSON.stringify(this))
    }
}

export class Codec implements NamedCodec<'graphObject', GraphObject> {
    readonly name = 'graphObject';

    private readonly impl = new Map<string, (Uint8Array) => GraphObject>()

    encode(input: GraphObject) : Buffer {
        return Messages.GraphContent.encode({
            type: input.typeName,
            data: input.serialize()
        })
    }

    decode(input: Uint8Array) : GraphObject {
        const content = Messages.GraphContent.decode(input)
        if(!this.impl.has(content.type)) {
            throw new Error('Cannot decode unknown GraphObject type: ' + content.type)
        }
        const data = content.data || Uint8Array.of()
        const constr = <(Uint8Array) => GraphObject> this.impl.get(content.type)
        return constr(data)
    }

    registerImpl(constr: (Uint8Array?) => GraphObject) {
        this.impl.set(constr().typeName, constr)
    }
}

type jsonable = string | number | Object | Array<jsonable> | null | undefined

export class SimpleGraphObject extends GraphObject {
    readonly typeName = 'Simple'
    readonly properties = new Map<string, jsonable>()
    
    constructor(serialized?: Uint8Array) {
        super()
        if(serialized) {
            const arr = JSON.parse(serialized.toString())
            this.properties = new Map<string, jsonable>(arr)
        }
    }

    serialize() : Buffer {
        const arr = [...this.properties.entries()]
        return Buffer.from(JSON.stringify(arr))
    }

    set(key: string, value: jsonable) : SimpleGraphObject {
        this.properties.set(key, value)
        return this
    }

    get(key) {
        return this.properties.get(key)
    }
}