'use babel'

import { createStore, applyMiddleware, compose } from 'redux'
import thunk from 'redux-thunk'
import createLogger from 'redux-logger'

const finalCreateStore = compose(
  applyMiddleware(thunk),
  applyMiddleware(createLogger())
)(createStore)
export default finalCreateStore