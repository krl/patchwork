'use babel'
import * as MsgActions from '../actions/msgs';

// Master Messages by ID
// - { [mid]: Message }
// - all the messages currently in memory
export function msgsById (state = {}, action) {
  const { type, msg, msgs } = action

  switch (type) {
  case MsgActions.MSG_LOAD:
  case MsgActions.MSG_MARK_READ:
  case MsgActions.MSG_MARK_UNREAD:
    // replace/add message
    if (action.err)
      console.error(action.err) // TODO
    else
      return Object.assign({}, state, { [msg.key]: msg })

  case MsgActions.MSGLIST_LOAD_MORE_SUCCESS:
    // we have an array of messages, pull them into an { id: msg } object and merge with state
    let newMsgs = {}
    msgs.forEach(msg => newMsgs[msg.key] = msg)
    return Object.assign({}, state, newMsgs)

  case MsgActions.MSGLIST_LIVE_UPDATE:
    // a new message has arrived on its own
    return Object.assign({}, state, { [msg.key]: msg })
  }

  return state
}

// Message List
const defaultMsgListState = {
  // params:
  fetchFn: null, // source function, for loading new messages
  liveOptsFn: null, // options to pass to the source function to create a live-stream
  cursorFn: null, // cursor function, to convert a msg to the lte param for fetches

  // state:
  msgs: [], // list of message ids
  botcursor: null, // current position in the index (used for subsequent loads)
  isLoading: false, // currently fetching messages?
  isAtEnd: false, // no more posts to load?
}
function msgList(state = defaultMsgListState, action) {
  const { type, msgs, msg } = action

  switch (type) {
  case MsgActions.MSGLIST_CREATE:
    // create the new msg list, if DNE
    return Object.assign({}, state, {
      fetchFn: action.fetchFn,
      liveOptsFn: action.liveOptsFn,
      cursorFn: action.cursorFn
    })

  case MsgActions.MSGLIST_LOAD_MORE:
    // started a fetch
    return Object.assign({}, state, {
      isLoading: true
    })

  case MsgActions.MSGLIST_LOAD_MORE_SUCCESS:
    // fetch succeeded, append to end
    return Object.assign({}, state, {
      isLoading: false,
      isAtEnd: action.isAtEnd,
      msgs: state.msgs.concat(msgs.map(m => m.key)),
      botcursor: action.botcursor
    })

  case MsgActions.MSGLIST_LOAD_MORE_FAILURE:
    // failed a fetch
    // TODO how are errors handled?
    return Object.assign({}, state, {
      isLoading: false
    })

  case MsgActions.MSGLIST_LIVE_UPDATE:
    // a message arrived on its own, prepend to front
    return Object.assign({}, state, {
      msgs: [msg.key].concat(state.msgs)
    })

  default:
    return state;
  }
}

// Message Lists
// - { listId: msgList }
// - set of active lists
export function msgLists(state = {}, action) {
  switch (action.type) {
  case MsgActions.MSGLIST_CREATE:
  case MsgActions.MSGLIST_LOAD_MORE:
  case MsgActions.MSGLIST_LOAD_MORE_SUCCESS:
  case MsgActions.MSGLIST_LOAD_MORE_FAILURE:
  case MsgActions.MSGLIST_LIVE_UPDATE:
    return Object.assign({}, state, {
      [action.listId]: msgList(state[action.listId], action)
    })
  default:
    return state
  }
}