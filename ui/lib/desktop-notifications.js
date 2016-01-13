var pull = require('pull-stream')
var u    = require('./util')
var app  = require('./app')

exports.notify = function notify(opts) {
  if (!opts || typeof Notification != 'function')
    return
  if (Notification.permission == 'granted')
    return new Notification(opts.title, opts)
  if (Notification.permission != 'denied')
    Notification.requestPermission(notify.bind(this, opts))
}

/* text taken from ui/com/msg-view/notification.jsx */

var render = {
  post: function (msg, c, cb) {
    var subject = c.text || 'a message'
    var author = u.getName(msg.value.author)
    cb({
      title: author + ' mentioned you in ',
      body: subject
    })
  },

  vote: function (msg, c, cb) {
    u.getSubjectMessage(msg, function (subject) {
      var text = (subject && subject.value.content &&
                  subject.value.content.text || 'this message')
      var author = u.getName(msg.value.author)
      if (typeof c.vote.value !== 'number')
        return null
      var desc = (c.vote.value > 0) ? 'dug'
        : (c.vote.value == 0) ? 'removed their vote for'
        : 'flagged'
      var reason = (c.vote.reason) ? (' as ' + c.vote.reason) : ''
      cb({
        title: author + ' ' + desc + ' ' + text + reason
      })
    })
  },

  contact: function (msg, c, cb) {
    var name = u.getName(msg.value.author)
    var title =
      (c.following === true)  ? name + ' followed you' :
      (c.blocking === true)   ? name + ' blocked you' :
      (c.following === false) ? name + ' unfollowed you' :
      null
    cb(title && {title: title})
  }
}

function notifyMsg(msg) {
  var content = msg.value.content
  var renderMsg = render[content.type]
  if (renderMsg) {
    renderMsg(msg, content, function (notif) {
      if (notif) {
        notif.icon = u.profilePicUrl(msg.value.author)
        exports.notify(notif)
      }
    })
  }
}

exports.stream = function (getNotifs) {
  if (typeof Notification == 'function')
    pull(getNotifs({live: 'only'}), pull.drain(notifyMsg))
}
