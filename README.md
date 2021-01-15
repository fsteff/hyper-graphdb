# Hyper-GraphDB, a [Hypercore](https://github.com/hypercore-protocol/hypercore)-backed Graph DB

An experimental graph DB based on [HyperObjects](https://github.com/fsteff/hyperobjects).
A DB can consist of an arbitrary number of feeds and the data is loaded sparsely.

The query language is vaguely based on the gremlin query language, but technically does not have much in common.

## Examples

```javascript
const { HyperGraphDB, SimpleGraphObject, GraphObject } = require('hyper-graphdb')
// for creating hypercore feeds an instance of Corestore or an object that implements its interface is required
// the optional key parameter can be used to open an existing DB from any hypercore feed that contains such
const db = new HyperGraphDB(corestore, key)
const feed = await db.core.getDefaultFeedId()

// this creates vertices in the db's default feed
const v1 = db.create(), v2 = db.create()
// the content store of a Vertex needs to implement the GraphObject interface, e.g. SimpleGraphObject contains a Map to store arbitrary properties
v1.setContent(new SimpleGraphObject().set('greeting', 'hello'))
v2.setContent(new SimpleGraphObject().set('greeting', 'hola'))
// vertices need to be saved prior to their use
// saving them as a batch includes them into one atomic HyperObjects transaction
await db.put([v1, v2])

// the easiest way creating edges is by passing a vertex
// every edge must have a label, but can also have a map of arbitrary metadata
v1.addEdgeTo(v2, 'child')
v2.addEdgeTo(v1, 'parent')
// saving them again persists the changes
await db.put([v1, v2])

/** 
 * Queries are created by chaining query operators, which each return a new query object.
 * The results of a query can then be extracted using one of .vertices(), .generator(), .values(extractor: (Vertex) => any)
 * 
 * Internally a wrapper-class around async generators is utilized - .generator() returns the instance of the Generator<Vertex<SimpleGraphObject>>
 * The Generator can be converted to a Promise<Vertex<SimpleGraphObject>[]> by calling .destruct() on the generator.
 * 
 * There are 3 ways to start a query: 
 * - db.queryAtId(vertexId, feedId) starts at a given vertex ID in the given feed
 * - db.queryAtVertex(vertex) starts at a given vertex instance
 * - db.queryIndex(indexName, key) queries an index that is created using the Crawler (WIP)
 */
let query = db.queryAtId(v1.getId(), feed).out('child') // returns a Query<SimpleGraphObject>
for async (const vertex of query.vertices()) {
    // process result
}

// by using repeat() the passed query is repeated until a given predicate is met or the passed max depth is reached
// the start point vertices are only visited once, so you don't have to worry about endless loops
let results = await db.queryAtVertex(v1).repeat(q => q.out('child').out('parent')).generator().destruct()

// the .machtes() query function allows you to filter the vertices
query = db.queryAtVertex(v1).out('child').matches(v => v.getContent().get('greeting') === 'hola')

```
