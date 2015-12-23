module.exports = function (makeTable) {
  function processor (e, cb) {
    /*
      type: 'string', // 'vote', 'follow', 'mention'
      key: 'string', // the key will depend on the type
      recvTime: 'number',
      data: 'object' // event-specific data
    */
    if (e.type == 'ssb-msg') {
      // try to decrypt
      var isEncrypted = (typeof e.value.content == 'string' && e.value.content.slice(-4) == '.box')
      var c = e.value.content = ((isEncrypted) ? sbot.private.unbox(e.value.content) : e.value.content)
      if (!c)
        return cb()

      // TODO
      return cb()
    }
  }

  return makeTable({
    version: 1,
    name: 'notifications',
    type: 'computed',
    processor: processor,
    schema: {
      type: 'string', // 'vote', 'follow', 'mention'
      key: 'string', // the key will depend on the type
      recvTime: 'number',
      data: 'object' // event-specific data
    },
    queries: {
      default: { key: 'recvTime' },
      byType: { groupBy: 'type', key: 'recvTime' }
    }
  })
}