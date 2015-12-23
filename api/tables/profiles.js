var u = require('../util')

module.exports = function (makeTable) {
  function processor (e, cb) {
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
        if (u.nonEmptyStr(c.name))
          row.name = u.makeNameSafe(c.name)
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

  return makeTable({
    version: 1,
    name: 'profiles',
    type: 'computed',
    processor: processor,
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
}