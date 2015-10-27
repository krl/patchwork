'use babel'
import React from 'react'
import { Provider, connect } from 'react-redux'
import app from './lib/app'
import * as Views from './views'
import LeftNav from './views/leftnav'
import { SetupModal } from './com/modals'
import { viewOpen } from './actions/views'

class NotFoundView extends React.Component {
  render() {
    return <div>View Not Found</div>
  }
}

class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    app.on('update:all', () => { this.setState(this.buildState()) })
    app.on('modal:setup', (isOpen) => this.setState({ setupIsOpen: isOpen }))
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  buildState() {
    let needsSetup = !app.users.names[app.user.id]
    return {
      user: app.user,
      users: app.users,
      setupIsOpen: needsSetup,
      setupCantClose: needsSetup
    }
  }
  render() {
    const CurrentView = Views[this.props.currentView] || NotFoundView
    return <div className="layout-rows">
      <SetupModal isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
      <div className="layout-columns">
        <LeftNav
          currentView={this.props.currentView}
          views={this.props.views}
          onOpenView={this.props.onOpenView}
          userid={this.state.user.id}
          names={this.state.users.names}
          friends={this.state.user.friends}
          following={this.state.user.nonfriendFolloweds}
          followers={this.state.user.nonfriendFollowers} />
        <div id="mainview"><CurrentView /></div>
      </div>
    </div>
  }
}

function mapStateToProps (state) {
  return {
    currentView: state.currentView,
    views: state.views
  }
}
function mapDispatchToProps (dispatch) {
  return {
    onOpenView: (viewId) => dispatch(viewOpen(viewId))
  }
}
const ConnectedLayout = connect(mapStateToProps, mapDispatchToProps)(Layout)


export default function (store) {
  return <Provider store={store}><ConnectedLayout /></Provider>
}