'use babel'
import mlib from 'ssb-msgs'

// :TODO: generalize and move this file into ssb-msgs

export function getReplies (thread, filter) {
  if (!thread.related)
    return []
  let replies = []
  let counted = {}
  thread.related.forEach(function (r) {
    if (!isaReplyTo(r, thread)) // only replies
      return
    if (counted[r.key]) // only count each message once
      return
    if (filter && !filter(r)) // run filter
      return
    replies.push(r)
    counted[r.key] = true
  })
  return replies
}

export function countReplies (thread, filter) {
  return getReplies(thread, filter).length
}

export function isaReplyTo (a, b) {
  var c = a.value.content
  return (c.root && mlib.link(c.root).link == b.key || c.branch && mlib.link(c.branch).link == b.key)
}