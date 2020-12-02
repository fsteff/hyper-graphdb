const Messages = require('../messages')

module.exports = function promisify (feed) {
  const pending = []
  const readyPromise = ready().then(onReady)
  return {
    feed,
    length,
    ready: () => readyPromise,
    get: (...args) => promise(feed.get, ...args),
    append: (...args) => promise(feed.append, ...args),
    head: (...args) => promise(feed.head, ...args)
  }

  async function ready () {
    return new Promise((resolve, reject) => {
      feed.ready((err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async function onReady () {
    if (await length() === 0) {
      const encoded = Messages.HypercoreHeader.encode({ dataStructureType: 'hyper-graphdb' })
      await new Promise((resolve, reject) => {
        feed.append(encoded, err => {
          if (err) reject(err)
          else resolve()
        })
      })
    }
  }

  async function length () {
    while (pending.length > 0) {
      await Promise.all(pending)
    }
    if (pending.length > 0) throw new Error('pending should be zero!')
    return feed.length
  }

  async function promise (foo, ...args) {
    await readyPromise
    const p = new Promise((resolve, reject) => {
      foo.call(feed, ...args, (err, result) => {
        pending.splice(pending.indexOf(p), 1)

        if (err) reject(err)
        else resolve(result)
      })
    })
    pending.push(p)
    return p
  }
}
