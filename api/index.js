var fs          = require('fs')
var level       = require('level')
var sublevel    = require('level-sublevel/bytewise')
var highlevel   = require('highlevel')
var pull        = require('pull-stream')
var multicb     = require('multicb')
var pl          = require('pull-level')
var pushable    = require('pull-pushable')
var paramap     = require('pull-paramap')
var cat         = require('pull-cat')
var Notify      = require('pull-notify')
var toPull      = require('stream-to-pull-stream')
var ref         = require('ssb-ref')
var pathlib     = require('path')
var threadlib   = require('patchwork-threads')
var u           = require('./util')

exports.name        = 'patchwork'
exports.version     = '1.0.0'
exports.manifest    = require('./manifest')
exports.permissions = require('./permissions')

exports.init = function (sbot, opts) {

  var api = {}
  var db = {}
  var makeTable = highlevel({ db: sbot.sublevel('patchwork'), pullStreams: true })

  //
  // table definitions
  //
  
  db.isRead = makeTable({
    version: 1,
    name: 'isRead',
    type: 'stateful',
    persisted: true,
    schema: { key: 'string', isRead: 'boolean' },
    queries: { default: { key: 'key' } }
  })

  db.isBookmarked = makeTable({
    version: 1,
    name: 'isBookmarked',
    type: 'stateful',
    persisted: true,
    schema: { key: 'string', isBookmarked: 'boolean' },
    queries: { default: { key: 'key' } }
  })

  db.channels = makeTable({
    version: 1,
    name: 'channels',
    type: 'stateful',
    persisted: true,
    schema: { name: 'string', isPinned: 'boolean' },
    queries: { default: { key: 'name' } }
  })

  db.threads = makeTable({
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
    processor: threadProcessor,
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

  db.notifications = makeTable({
    version: 1,
    name: 'notifications',
    type: 'computed',
    processor: notificationProcessor,
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

  db.profiles = makeTable({
    version: 1,
    name: 'profiles',
    type: 'computed',
    processor: profileProcessor,
    schema: {
      name: 'string',
      image: 'object',
      following: 'boolean',
      blocking: 'boolean'
    },
    queries: {
      default: { key: ['subjectKey', 'author'] },
      byAuthor: { groupBy: 'author', key: 'subject' },
      bySubject: {
        groupBy: 'subjectKey',
        key: 'author',
        filter: { self: function (row) { return row.author === row.subjectKey } }
      }
    }
  })

  //
  // processing pipeline
  //

  // wire up ssb-log
  pull(
    pl.read(sbot.sublevel('log'), { live: true, onSync: onSSBHistorySync }),
    pull.through(function (e) { e.type = 'ssb-msg' }),
    highlevel.pullProcessor([db.threads, db.notifications, db.profiles])
  )
  function onSSBHistorySync () {
    // after ssb history has synced, wire up stateful table changelogs
    pull(db.isRead.createChangeStream({ live: true }), highlevel.pullProcessor([db.threads, db.notifications, db.profiles]))
    pull(db.isBookmarked.createChangeStream({ live: true }), highlevel.pullProcessor([db.threads, db.notifications, db.profiles]))
  }

  function threadProcessor (e, cb) {
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
          createdTime: ts(e),
          lastUpdatedTime: ts(e),

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
            return { lastUpdated: ts(e) }
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

  function notificationProcessor (e, cb) {
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

  function profileProcessor (e, cb) {
    if (e.type == 'ssb-msg') {
      // try to decrypt
      var isEncrypted = (typeof e.value.content == 'string' && e.value.content.slice(-4) == '.box')
      var c = e.value.content = ((isEncrypted) ? sbot.private.unbox(e.value.content) : e.value.content)
      if (!c)
        return cb()

      var row = {
        author: e.value.author,
        subjectKey: null
      }

      if (c.type == 'about') {
        // get subjectKey
        var about = mlib.link(c.about)
        if (!about)
          return cb()
        row.subjectKey = about.link
        
        // update
        if (nonEmptyStr(c.name))
          row.name = makeNameSafe(c.name)
        var image = mlib.link(c.image, 'blob')
        if (image)
          row.image = image
        db.profiles.put(row, cb)
      }
      else if (c.type == 'contact') {
        // get subjectKey
        var contact = mlib.link(c.contact)
        if (!contact)
          return cb()
        row.subjectKey = contact.link
        
        // update
        if (typeof c.following == 'boolean')
          row.following = c.following
        if (typeof c.blocking == 'boolean')
          row.blocking = c.blocking
        db.profiles.put(row, cb)
      }
    }
  }

  //
  // api
  //

  // threads
  api.threads = function (opts) {
    if (opts.threads) {
      // TODO include threads
    }
    if (opts.summaries) {
      // TODO include summaries
    }
    return db.threads.createReadStream(opts)
  }
  api.countThreads = db.threads.count.bind(db.threads)

  // notifications
  api.notifications = db.notifications.createReadStream.bind(db.notifications)
  api.countNotifications = db.notifications.count.bind(db.notifications)

  // profiles
  api.profiles = db.profiles.createReadStream.bind(db.profiles)
  api.countProfiles = db.profiles.count.bind(db.profiles)
  api.getProfile = db.profiles.get.bind(db.profiles)

  // channels
  api.channels = db.channels.createReadStream.bind(db.channels)
  api.getChannel = db.channels.get.bind(db.channes)
  api.setChannelPinned = function (name, v, cb) {
    db.channels.put({ name: name, isPinned: v }, cb)
  }
  api.toggleChannelPinned = function (name, cb) {
    db.channels.lock(name, function (err, unlock) {
      if (err) return cb(err)

      db.channels.get(name, function (err, row) {
        if (err) return unlock(), cb(err)
          
        var newRow = { name: name, isPinned: !row.isPinned }
        db.channels.put(newRow, function (err) {
          unlock()
          if (err) cb(err)
          else     cb(null, newRow)
        })
      }
    })
  }

  // isread
  api.getIsRead = db.isRead.get.bind(db.isRead)
  api.setIsRead = function (key, v, cb) {
    db.isRead.put({ key: key, isRead: v }, cb)
  }
  api.toggleIsRead = function (key, cb) {
    db.isRead.atomicUpdate(key, function (err, row) {
      if (row)
        return { isRead: !row.isRead }
    }, cb)
  }

  // isbookmarked
  api.getIsBookmarked = db.isBookmarked.get.bind(db.isBookmarked)
  api.setIsBookmarked = function (key, v, cb) {
    db.isBookmarked.put({ key: key, isBookmarked: v }, cb)
  }
  api.toggleIsBookmarked = function (key, cb) {
    db.isBookmarked.atomicUpdate(key, function (err, row) {
      if (row)
        return { isBookmarked: !row.isBookmarked }
    }, cb)
  }

  // file helpers
  api.addFileToBlobs = function (path, cb) {
    pull(
      toPull.source(fs.createReadStream(path)),
      sbot.blobs.add(function (err, hash) {
        if (err)
          cb(err)
        else {
          var ext = pathlib.extname(path)
          if (ext == '.png' || ext == '.jpg' || ext == '.jpeg') {
            var res = getImgDim(path)
            res.hash = hash
            cb(null, res)
          } else
            cb(null, { hash: hash })
        }
      })
    )
  }
  api.saveBlobToFile = function (hash, path, cb) {
    pull(
      sbot.blobs.get(hash),
      toPull.sink(fs.createWriteStream(path), cb)
    )
  }
  function getImgDim (path) {
    var NativeImage = require('native-image')
    var ni = NativeImage.createFromPath(path)
    return ni.getSize()
  }


  // helper to get the most reliable timestamp for a message
  // - stops somebody from boosting their ranking (accidentally, maliciously) with a future TS
  // - applies only when ordering by most-recent
  function ts (msg) {
    return Math.min(msg.received, msg.value.timestamp)
  }

  function nonEmptyStr (str) {
    return (typeof str === 'string' && !!(''+str).trim())
  }

  // allow A-z0-9._-, dont allow a trailing .
  var badNameCharsRegex = /[^A-z0-9\._-]/g
  function makeNameSafe (str) {
    str = str.replace(badNameCharsRegex, '_')
    if (str.charAt(str.length - 1) == '.')
      str = str.slice(0, -1) + '_'
    return str
  }

  //
  // legacy
  //

  var patchworkdb = sbot.sublevel('patchwork')  
  var db = {
    // local user data
    isread: patchworkdb.sublevel('isread'),
    bookmarked: patchworkdb.sublevel('bookmarked'),
    channelpinned: patchworkdb.sublevel('channelpinned')
  }

  var state = {
    // indexes (lists of {key:, ts:})
    mymsgs: [],
    newsfeed: u.index('newsfeed'),
    inbox: u.index('inbox'),
    bookmarks: u.index('bookmarks'),
    notifications: u.index('notifications'),
    // other indexes: channel-* are created as needed

    // views
    profiles: {},
    names: {}, // ids -> names
    ids: {}, // names -> ids
    actionItems: {}
  }

  // track sync state
  // - processor does async processing for each message that comes in
  // - awaitSync() waits for that processing to finish
  // - pinc() on message arrival, pdec() on message processed
  // - nP === 0 => all messages processed
  var nP = 0, syncCbs = []
  function awaitSync (cb) {
    if (nP > 0)
      syncCbs.push(cb)
    else cb()
  }
  state.pinc = function () { nP++ }
  state.pdec = function () {
    nP--
    if (nP === 0) {
      syncCbs.forEach(function (cb) { cb() })
      syncCbs.length = 0
    }
  }

  // load bookmarks into an index
  state.pinc()
  pull(
    pl.read(db.bookmarked, { keys: true, values: false }),
    pull.asyncMap(function (key, cb) {
      var obj = { key: key, value: null, isread: false }
      db.isread.get(key, function (err, isread) { obj.isread = isread; done() })
      sbot.get(key, function (err, value) { obj.value = value; done() })
      var n=0;
      function done() {
        if (++n == 2) cb(null, obj)
      }
    }),
    pull.drain(
      function (msg) {
        if (msg.value) {
          var row = state.bookmarks.sortedUpsert(msg.value.timestamp, msg.key)
          row.isread = msg.isread
        }
      },
      function () { state.pdec() }
    )
  )

  // load channelpins into indexes
  state.pinc()
  pull(
    pl.read(db.channelpinned, { keys: true, values: true }),
    pull.drain(function (pin) {
      if (typeof pin.key === 'string') {
        var index = getChannelIndex(pin.key)
        index.pinned = pin.value
      }
    },
    function () { state.pdec() })
  )

  // setup sbot log processor
  var processor = require('./processor')(sbot, db, state, emit)
  pull(pl.read(sbot.sublevel('log'), { live: true, onSync: onHistorySync }), pull.drain(processor))

  var isHistorySynced = false // track so we dont emit events for old messages
  // grab for history sync
  state.pinc()
  function onHistorySync () {
    console.log('Log history read...')
    // when all current items finish, consider prehistory synced (and start emitting)
    awaitSync(function () { 
      console.log('Indexes generated')
      isHistorySynced = true
    })
    // release
    state.pdec()
  }

  // events stream
  var notify = Notify()
  function emit (type, data) {
    if (!isHistorySynced)
      return
    var e = data || {}
    e.type = type
    if (e.type == 'index-change') {
      api.getIndexCounts(function (err, counts) {
        e.counts = counts
        e.total = counts[e.index]
        e.unread = counts[e.index+'Unread']
        notify(e)
      })
    } else
      notify(e)
  }

  // getters

  api.createEventStream = function () {
    return notify.listen()
  }

  api.getMyProfile = function (cb) {
    awaitSync(function () {
      api.getProfile(sbot.id, cb)
    })
  }

  api.getIndexCounts = function (cb) {
    awaitSync(function () {
      var counts = {
        inbox: state.inbox.rows.length,
        inboxUnread: state.inbox.filter(function (row) { return !row.isread }).length,
        bookmarks: state.bookmarks.rows.length,
        bookmarksUnread: state.bookmarks.filter(function (row) { return !row.isread }).length,
        notificationsUnread: state.notifications.countUntouched()
      }
      for (var k in state) {
        if (k.indexOf('channel-') === 0)
          counts[k] = state[k].rows.length
      }
      cb(null, counts)
    })
  }

  api.createNewsfeedStream = indexStreamFn(state.newsfeed)
  api.createInboxStream = indexStreamFn(state.inbox)
  api.createBookmarkStream = indexStreamFn(state.bookmarks)
  api.createNotificationsStream = indexStreamFn(state.notifications)
  api.createChannelStream = function (channel, opts) {
    if (typeof channel !== 'string' || !channel.trim())
      return cb(new Error('Invalid channel'))
    var index = getChannelIndex(channel)
    return indexStreamFn(index)(opts)
  }

  function indexMarkRead (indexname, key, keyname) {
    if (Array.isArray(key)) {
      key.forEach(function (k) {
        indexMarkRead(indexname, k, keyname)
      })
      return
    }

    var index = state[indexname]
    var row = index.find(key, keyname)
    if (row) {
      var wasread = row.isread
      row.isread = true
      if (!wasread)
        emit('index-change', { index: indexname })
    }
  }

  function indexMarkUnread (indexname, key, keyname) {
    if (Array.isArray(key)) {
      key.forEach(function (k) {
        indexMarkUnread(indexname, k, keyname)
      })
      return
    }

    var index = state[indexname]
    var row = index.find(key, keyname)
    if (row) {
      var wasread = row.isread
      row.isread = false
      if (wasread)
        emit('index-change', { index: indexname })
    }
  }

  api.markRead = function (key, cb) {
    awaitSync(function () {
      indexMarkRead('inbox', key)
      indexMarkRead('bookmarks', key)
      if (Array.isArray(key)) {
        db.isread.batch(key.map(function (k) { return { type: 'put', key: k, value: 1 }}), cb)
        key.forEach(function (key) { emit('isread', { key: key, value: true }) })
      } else {
        db.isread.put(key, 1, cb)
        emit('isread', { key: key, value: true })
      }
    })
  }
  api.markUnread = function (key, cb) {
    awaitSync(function () {
      indexMarkUnread('inbox', key)
      indexMarkUnread('bookmarks', key)
      if (Array.isArray(key)) {
        db.isread.batch(key.map(function (k) { return { type: 'del', key: k }}), cb)
        key.forEach(function (key) { emit('isread', { key: key, value: false }) })
      } else {
        db.isread.del(key, cb) 
        emit('isread', { key: key, value: false })
      }
    })
  }
  api.toggleRead = function (key, cb) {
    api.isRead(key, function (err, v) {
      if (!v) {
        api.markRead(key, function (err) {
          cb(err, true)
        })
      } else {
        api.markUnread(key, function (err) {
          cb(err, false)
        })
      }
    })
  }
  api.isRead = function (key, cb) {
    if (Array.isArray(key)) {
      var done = multicb({ pluck: 1 })
      key.forEach(function (k, i) {
        var cb = done()
        db.isread.get(k, function (err, v) { cb(null, !!v) })
      })
      done(cb)
    } else {
      db.isread.get(key, function (err, v) {
        cb && cb(null, !!v)
      })
    }
  }
 
  api.bookmark = function (key, cb) {
    sbot.get(key, function (err, value) {
      if (err) return cb(err)
      var done = multicb({ pluck: 1, spread: true })
      db.bookmarked.put(key, 1, done()) // update bookmarks index
      u.getThreadHasUnread(sbot, key, done()) // get the target thread's read/unread state
      done(function (err, putRes, hasUnread) {
        // insert into the bookmarks index
        var bookmarksRow = state.bookmarks.sortedUpsert(value.timestamp, key)
        bookmarksRow.isread = !hasUnread // set isread state
        emit('index-change', { index: 'bookmarks' })
        cb(err, putRes)
      })
    })
  }
  api.unbookmark = function (key, cb) {
    sbot.get(key, function (err, value) {
      if (err) return cb(err)
      state.bookmarks.remove(key)
      db.bookmarked.del(key, cb) 
    })
  }
  api.toggleBookmark = function (key, cb) {
    api.isBookmarked(key, function (err, v) {
      if (!v) {
        api.bookmark(key, function (err) {
          cb(err, true)
        })
      } else {
        api.unbookmark(key, function (err) {
          cb(err, false)
        })
      }
    })
  }
  api.isBookmarked = function (key, cb) {
    db.bookmarked.get(key, function (err, v) {
      cb && cb(null, !!v)
    })
  }

  function getChannelIndex (channel) {
    var k = 'channel-'+channel
    var index = state[k]
    if (!index)
      index = state[k] = u.index(k)
    return index
  }
  api.getChannels = function (cb) {
    awaitSync(function () {
      var channels = []
      for (var k in state) {
        if (k.indexOf('channel-') === 0) {
          var lastUpdated = (state[k].rows[0]) ? state[k].rows[0].ts : 0
          channels.push({
            name: k.slice('channel-'.length),
            lastUpdated: lastUpdated,
            pinned: state[k].pinned
          })
        }
      }
      cb(null, channels)
    })
  }
  api.pinChannel = function (channel, cb) {
    var index = getChannelIndex(channel)
    index.pinned = true
    db.channelpinned.put(channel, 1, cb)
    emit('channelpinned', { channel: channel, value: true })
  }
  api.unpinChannel = function (channel, cb) {
    var index = getChannelIndex(channel)
    index.pinned = false
    db.channelpinned.del(channel, cb) 
    emit('channelpinned', { channel: channel, value: false })
  }
  api.toggleChannelPinned = function (channel, cb) {
    var index = getChannelIndex(channel)
    if (index.pinned) {
      api.unpinChannel(channel, function (err) {
        cb(err, true)
      })
    } else {
      api.pinChannel(channel, function (err) {
        cb(err, false)
      })
    }
  }

  api.addFileToBlobs = function (path, cb) {
    pull(
      toPull.source(fs.createReadStream(path)),
      sbot.blobs.add(function (err, hash) {
        if (err)
          cb(err)
        else {
          var ext = pathlib.extname(path)
          if (ext == '.png' || ext == '.jpg' || ext == '.jpeg') {
            var res = getImgDim(path)
            res.hash = hash
            cb(null, res)
          } else
            cb(null, { hash: hash })
        }
      })
    )
  }
  api.saveBlobToFile = function (hash, path, cb) {
    pull(
      sbot.blobs.get(hash),
      toPull.sink(fs.createWriteStream(path), cb)
    )
  }
  function getImgDim (path) {
    var NativeImage = require('native-image')
    var ni = NativeImage.createFromPath(path)
    return ni.getSize()
  }

  var lookupcodeRegex = /(@[a-z0-9\/\+\=]+\.[a-z0-9]+)(?:\[via\])?(.+)?/i
  api.useLookupCode = function (code) {
    var eventPush = pushable()

    // parse and validate the code
    var id, addrs
    var parts = lookupcodeRegex.exec(code)
    var valid = true
    if (parts) {
      id  = parts[1]
      addrs = (parts[2]) ? parts[2].split(',') : []

      // validate id
      if (!ref.isFeedId(id))
        valid = false

      // parse addresses
      addrs = addrs
        .map(function (addr) {
          addr = addr.split(':')
          if (addr.length === 3)
            return { host: addr[0], port: +addr[1], key: addr[2] }
        })
        .filter(Boolean)
    } else
      valid = false

    if (!valid) {
      eventPush.push({ type: 'error', message: 'Invalid lookup code' })
      eventPush.end()
      return eventPush
    }

    // begin the search!
    search(addrs.concat(sbot.gossip.peers()))
    function search (peers) {
      var peer = peers.pop()
      if (!peer)
        return eventPush.end()

      // connect to the peer
      eventPush.push({ type: 'connecting', addr: peer })      
      sbot.connect(peer, function (err, rpc) {
        if (err) {
          eventPush.push({ type: 'error', message: 'Failed to connect', err: err })
          return search(peers)
        }
        // try a sync
        sync(rpc, function (err, seq) { 
          if (seq > 0) {
            // success!
            eventPush.push({ type: 'finished', seq: seq })
            eventPush.end()
          } else
            search(peers) // try next
        })
      })
    }

    function sync (rpc, cb) {
      // fetch the feed
      var seq
      eventPush.push({ type: 'syncing', id: id })
      pull(
        rpc.createHistoryStream({ id: id, keys: false }),
        pull.through(function (msg) {
          seq = msg.sequence
        }),
        sbot.createWriteStream(function (err) {
          cb(err, seq)
        })
      )
    }

    return eventPush
  }

  api.getProfile = function (id, cb) {
    awaitSync(function () { cb(null, state.profiles[id]) })
  }
  api.getAllProfiles = function (cb) {
    awaitSync(function () { cb(null, state.profiles) })
  }
  api.getNamesById = function (cb) {
    awaitSync(function () { cb(null, state.names) })
  }
  api.getName = function (id, cb) {
    awaitSync(function () { cb(null, state.names[id]) })
  }
  api.getIdsByName = function (cb) {
    awaitSync(function () { cb(null, state.ids) })
  }
  api.getActionItems = function (cb) {
    awaitSync(function () { cb(null, state.actionItems) })
  }

  // helper to get an option off an opt function (avoids the `opt || {}` pattern)
  function o (opts, k, def) {
    return opts && opts[k] !== void 0 ? opts[k] : def
  }

  // helper to get messages from an index
  function indexStreamFn (index, getkey) {
    return function (opts) {
      var lastAccessed = index.lastAccessed
      index.touch()

      // emulate the `ssb.createFeedStream` interface
      var lt      = o(opts, 'lt')
      var lte     = o(opts, 'lte')
      var gt      = o(opts, 'gt')
      var gte     = o(opts, 'gte')
      var limit   = o(opts, 'limit')
      var threads = o(opts, 'threads')

      // lt, lte, gt, gte should look like:
      // [msg.value.timestamp, msg.value.author]

      // helper to create emittable rows
      function lookup (row) {
        if (!row) return
        var key = (getkey) ? getkey(row) : row.key
        if (key) {
          var rowcopy = { key: key }
          for (var k in row) { // copy index attrs into rowcopy
            if (!rowcopy[k]) rowcopy[k] = row[k]
          }
          return rowcopy
        }
      }

      // helper to fetch rows
      function fetch (row, cb) {
        if (threads) {
          threadlib.getPostSummary(sbot, row.key, function (err, thread) {
            for (var k in thread)
              row[k] = thread[k]
            cb(null, row)
          })
        } else {
          sbot.get(row.key, function (err, value) {
            // if (err) {
              // suppress this error
              // the message isnt in the local cache (yet)
              // but it got into the index, likely due to a link
              // instead of an error, we'll put a null there to indicate the gap
            // }
            row.value = value
            cb(null, row)
          })
        }
      }

      // readstream
      var readPush = pushable()
      var read = pull(readPush, paramap(fetch))

      // await sync, then emit the reads
      awaitSync(function () {
        var added = 0
        for (var i=0; i < index.rows.length; i++) {
          var row = index.rows[i]

          if (limit && added >= limit)
            break

          // we're going to only look at timestamp, because that's all that phoenix cares about
          var invalid = !!(
            (lt  && row.ts >= lt[0]) ||
            (lte && row.ts > lte[0]) ||
            (gt  && row.ts <= gt[0]) ||
            (gte && row.ts < gte[0])
          )
          if (invalid)
            continue

          var r = lookup(row)
          if (r) {
            r.isNew = r.ts > lastAccessed
            readPush.push(r)
            added++
          }
        }
        readPush.end()
      })

      if (opts && opts.live) {
        // live stream, concat the live-emitter on the end
        index.on('add', onadd)
        var livePush = pushable(function () { index.removeListener('add', onadd) })
        function onadd (row) { livePush.push(lookup(row)) }
        var live = pull(livePush, paramap(fetch))
        return cat([read, live])
      }
      return read
    }
  }

  return api
}