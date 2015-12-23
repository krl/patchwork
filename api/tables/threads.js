var u = require('../util')

module.exports = function (makeTable) {
  function processor (e, cb) {
    if (e.type == 'ssb-msg') {
      // try to decrypt
      var isEncrypted = (typeof e.value.content == 'string' && e.value.content.slice(-4) == '.box')
      var c = e.value.content = ((isEncrypted) ? sbot.private.unbox(e.value.content) : e.value.content)
      if (!c)
        return cb()

      // posts only
      if (c.type != 'post')
        return cb()

      // root post?
      var root = mlib.link(c.root)
      if (root) {
        // new thread
        db.threads.put({
          key: e.key,
          author: e.value.author,
          sequence: e.value.sequence,

          sendTime: e.value.timestamp,
          recvTime: e.received,
          createdTime: u.ts(e),
          lastUpdatedTime: u.ts(e),

          isEncrypted: isEncrypted,
          isBookmarked: false,
          isRead: false,

          content: c,
          contentChannel: c.channel
        }, cb)
      } else {
        // thread update
        db.threads.atomicUpdate(root.link, function (err, thread) {
          if (thread)
            return { lastUpdated: u.ts(e) }
        }, cb)
      }
    }
    if (e.type == 'change' && e.table == 'isRead' && 'isRead' in e.data) {
      // isRead update
      db.threads.atomicUpdate(e.data.key, function (err, thread) {
        if (thread)
          return { isRead: e.data.isRead }
      }, cb)
    }
    if (e.type == 'change' && e.table == 'isBookmarked' && 'isBookmarked' in e.data) {
      // isBookmarked update
      db.threads.atomicUpdate(e.data.key, function (err, thread) {
        if (thread)
          return { isBookmarked: e.data.isBookmarked }
      }, cb)
    }
  }

  return makeTable({
    version: 1,
    name: 'threads',
    type: 'computed'
    schema: {
      key: 'string', // root key of the thread
      author: 'string',
      sequence: 'number',
      sendTime: 'number', // as declared in the message (not trustworthy)
      recvTime: 'number', // as received
      createdTime: 'number', // min(sendTime, recvTime)
      lastUpdatedTime: 'number', // min(sendTime, recvTime) for most recent reply
      isEncrypted: 'boolean',
      isBookmarked: 'boolean',
      isRead: 'boolean',
      content: 'object',
      contentChannel: 'string'
    },
    processor: processor,
    queries: {
      default: { key: 'key' },
      received: { key: 'recvTime' },
      byAuthor: { groupBy: 'author', key: 'sequence' },
      newsfeed: {
        prefilter: function (row) { return !row.isEncrypted },
        key: {
          created: ['createdTime', 'key'],
          updated: ['lastUpdatedTime', 'key']
        },
        recomputeOn: ['lastUpdatedTime']
      },
      inbox: {
        prefilter: function (row) { return row.isEncrypted },
        key: {
          created: ['createdTime', 'key'],
          updated: ['lastUpdatedTime', 'key']
        },
        filter: { unread: function (row) { return !row.isRead } },
        recomputeOn: ['lastUpdatedTime']
      },
      channels: {
        groupBy: 'contentChannel',
        prefilter: function (row) { return !row.isEncrypted },
        key: {
          created: ['createdTime', 'key'],
          updated: ['lastUpdatedTime', 'key']
        },
        recomputeOn: ['lastUpdatedTime']
      },
      bookmarks: {
        prefilter: function (row) { return row.isBookmarked },
        key: {
          created: ['createdTime', 'key'],
          updated: ['lastUpdatedTime', 'key']
        },
        filter: { unread: function (row) { return !row.isRead } },
        recomputeOn: ['isBookmarked', 'lastUpdatedTime']
      }
    }
  })
}