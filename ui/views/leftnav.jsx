'use babel'
import React from 'react'
import { Link } from 'react-router'
import { verticalFilled } from '../com'
import Issues from '../com/issues'
import u from '../lib/util'

class NavLink extends React.Component {
  render() {
    var selected = (this.props.to === this.props.currentView)
    let content = this.props.children
    if (!content)
      content = <span><i className={'fa fa-'+this.props.icon} /> {this.props.label} {this.props.count ? ' ('+this.props.count+')' : ''}</span>
    return <div className={'leftnav-item '+(selected?'selected':'')}>
      <Link to={this.props.to}>{content}</Link>
    </div>
  }
}

class LeftNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = { indexCounts: app.indexCounts||{} }
    this.refreshState = () => {
      this.setState({ indexCounts: app.indexCounts })
    }
  }
  componentDidMount() {
    // setup event stream
    app.on('update:all', this.refreshState)
    app.on('update:indexCounts', this.refreshState)
  }
  componentWillUnmount() {
    // abort streams
    app.removeListener('update:all', this.refreshState)
    app.removeListener('update:indexCounts', this.refreshState)
  }

  nameOf(id) {
    return this.props.names[id] || u.shortString(id||'', 6)
  }
  render() {
    let renderProfLink = (id, name, icon) => {
      return <NavLink key={'profile:'+id} to={'/profile/'+encodeURIComponent(id)} currentView={this.props.currentView}>
        <i className={'fa fa-'+icon} /> {typeof name == 'string' ? name : this.nameOf(id)}
      </NavLink>
    }

    return <div id="leftnav" style={{height: this.props.height}}>
      <div className="leftnav-item label">Messages</div>
      <NavLink to="newsfeed" currentView={this.props.currentView} icon="newspaper-o" label="Feed" />
      <NavLink to="inbox" currentView={this.props.currentView} icon="inbox" label="Inbox" count={this.state.indexCounts.inboxUnread} />
      <NavLink to="bookmarks" currentView={this.props.currentView} icon="bookmark-o" label="Saved" count={this.state.indexCounts.bookmarksUnread} />

      <div className="leftnav-item label">People</div>
      {renderProfLink(this.props.userid, 'Your Profile', 'user')}
      <NavLink to="people" currentView={this.props.currentView} icon="at" label="Contacts" />
      <Issues />
    </div>
  }
}
export default verticalFilled(LeftNav)