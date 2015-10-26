'use babel'
import * as ViewActions from '../actions/views'

const DEFAULT_VIEW = 'NewsFeed'

// Active UI View
const defaultViewState = {
  iface: '', // id of the interface
  param: '', // arbitrary string given to the view on open
  settings: {} // arbitrary KVs maintained by the view
}
function view (state = defaultViewState, action) {
  switch (action.type) {
  case ViewActions.VIEW_OPEN:
    // view opened - will create if previously DNE, no effect otherwise
    return Object.assign({}, state, {
      iface: action.iface,
      param: action.param
    })

  case ViewActions.VIEW_UPDATE_SETTING:
    // update to the settings kv
    return Object.assign({}, state, {
      settings: Object.assign({}, state.settings, { [action.key]: action.value })
    })
  }
  return state
}

// Active UI Views
// - { viewId: view }
export function views (state = {}, action) {
  switch (action.type) {
  case ViewActions.VIEW_OPEN:
  case ViewActions.VIEW_UPDATE_SETTING:
    // pass on to individual views
    return Object.assign({}, state, {
      [action.viewId]: view(state[action.viewId], action)
    })

  case ViewActions.VIEW_CLOSE:
    // create new object without the view
    let newState = Object.assign({}, state)
    delete newState[action.viewId]
    return newState
  }
  return state
}

// Current UI View
// - string
export function currentView (state = '', action) {
  switch (action.type) {
  case ViewActions.VIEW_OPEN:
    // assign to that view
    return action.viewId

  case ViewActions.VIEW_CLOSE:
    // if the current view got destroyed, go back to the default view
    // TODO should go to last view, need to maintain that history
    if (state === action.viewId)
      return DEFAULT_VIEW
  }
  return state
}