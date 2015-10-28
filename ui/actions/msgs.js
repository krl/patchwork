'use babel'
import pull from 'pull-stream'
import u from '../lib/util'

export const MSGLIST_CREATE = 'MSGLIST_CREATE'
export const MSGLIST_LOAD_MORE = 'MSGLIST_LOAD_MORE'
export const MSGLIST_LOAD_MORE_SUCCESS = 'MSGLIST_LOAD_MORE_SUCCESS'
export const MSGLIST_LOAD_MORE_FAILURE = 'MSGLIST_LOAD_MORE_FAILURE'
export const MSGLIST_LIVE_UPDATE = 'MSGLIST_LIVE_UPDATE'
export const MSG_LOAD = 'MSG_LOAD'
export const MSG_MARK_READ = 'MSG_MARK_READ'
export const MSG_MARK_UNREAD = 'MSG_MARK_UNREAD'

export function msglistCreate (listId, opts) {
  let { fetchFn, cursorFn, liveOptsFn, numInitialLoad } = opts
  return (dispatch, getState) => {
    let list = getState().msgLists[listId]
    if (!list) {
      dispatch({ type: MSGLIST_CREATE, listId, fetchFn, cursorFn, liveOptsFn })
      dispatch(msglistLoadMore(listId, numInitialLoad)) // do initial load
    }
  }
}

export function msglistLoadMore (listId, amt) {
  return (dispatch, getState) => {
    let list = getState().msgLists[listId]

    // dont fetch if already at end, or already fetching
    if (list && (list.isAtEnd || list.isLoading))
      return

    // dispatch start msg
    dispatch({ type: MSGLIST_LOAD_MORE, listId })

    let newMsgs = []
    let numFetched = 0
    let botcursor = list.botcursor
    let cursorFn = list.cursorFn || ((msg) => { if (msg) { return msg.value.timestamp } })

    // helper to fetch a batch of messages
    let fetchBottomBy = (amt, cb) => {
      amt = amt || 50
      var lastmsg
      pull(
        list.fetchFn({ reverse: true, limit: amt, lt: (botcursor) ? cursorFn(botcursor) : undefined }),
        pull.through(msg => { lastmsg = msg }), // track last message processed
    
        pull.asyncMap((msg, cb) => {
          // fetch thread data and decrypt
          u.getPostThread(msg.key, cb)
        }),/*,
        TODO search goes here?
        (this.props.searchQuery) ? pull.filter(this.searchQueryFilter.bind(this)) : undefined*/

        pull.collect((err, msgs) => {
          if (err)
            console.warn('Error while fetching messages', err)

          // add to messages
          if (msgs.length) {
            numFetched += msgs.length
            newMsgs = newMsgs.concat(msgs)
          }

          // nothing new? stop
          if (!lastmsg || (botcursor && botcursor.key == lastmsg.key))
            return cb(true)
          botcursor = lastmsg

          // fetch more if needed
          var remaining = amt - msgs.length
          if (remaining > 0)
            return fetchBottomBy(remaining, cb)

          // we're done
          cb(false)
        })
      )
    }

    // fetch amount requested
    fetchBottomBy(amt, isAtEnd => {
      dispatch({ type: MSGLIST_LOAD_MORE_SUCCESS, listId, msgs: newMsgs, botcursor, isAtEnd })
    })
  }
}

export function msglistLiveUpdate (listId, msg) {
  return { type: MSGLIST_LIVE_UPDATE, listId, msg }
}


export function msgLoad (msgId, opts) {
  return (dispatch, getState) => {
    let msg = getState().msgsById[msgId]

    // dont fetch if already loaded
    if (msg)
      return next()

    // fetch the thread
    u.getPostThread(msgId, (err, thread) => {
      if (err)
        dispatch({ type: MSG_LOAD, err: err })
      else {
        dispatch({ type: MSG_LOAD, msg: thread })
        next()
      }
    })

    function next () {
      if (opts && opts.markRead)
        dispatch(msgMarkRead(msgId))
    }
  }
}

export function msgMarkRead (msgId) {
  return (dispatch, getState) => {
    const msg = getState().msgsById[msgId]
    if (!msg)
      return console.error('Failed to mark thread as read: message not in memory') // TODO

    u.markThreadRead(msg, (err) => {
      if (err)
        return console.error('Failed to mark thread as read', err) // TODO
      dispatch({ type: MSG_MARK_READ, msg: msg })
    })
  }
}

export function msgMarkUnread (msgId) {
  return (dispatch, getState) => {
    const msg = getState().msgsById[msgId]
    if (!msg)
      return console.error('Failed to mark thread as unread: message not in memory') // TODO

    u.markThreadUnread(msg, (err) => {
      if (err)
        return console.error('Failed to mark thread as unread', err) // TODO
      dispatch({ type: MSG_MARK_UNREAD, msg: msg })
    })
  }
}