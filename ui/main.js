'use strict'

// install babel hooks
require('babel/register')

var pull  = require('pull-stream')
var render = require('react-dom').render
var createStore = require('./lib/create-store')
var viewOpen = require('./actions/views').viewOpen
var layout = require('./layout')

// Init
// ====

// master state
window.app = require('./lib/app')
window.store = createStore(require('./reducers'))

// toplevel events TODO restore
/*window.addEventListener('error', function onError (e) {
  e.preventDefault()
  app.minorIssue('Unexpected Error', e.error, 'This was an unhandled exception.')
})*/

// render
app.fetchLatestState(function () {
  render(layout(window.store), document.getElementById('app'))
  window.store.dispatch(viewOpen('NewsFeed'))
})