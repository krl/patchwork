'use babel'
import { currentView, views } from './views'
import { msgsById, msgLists } from './msgs'
import { combineReducers } from 'redux'

const rootReducer = combineReducers({
  msgsById,
  msgLists,
  currentView,
  views
})
export default rootReducer