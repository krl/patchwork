'use babel'
import React from 'react'
import { verticalFilled } from '../com'
import Issues from '../com/issues'
import u from '../lib/util'

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
    // helper component to render nav links
    const NavLink = ({ to, icon, label, count }) => {
      var selected = (to === this.props.currentView)
      return <div className={'leftnav-item '+(selected?'selected':'')}>
        <a onClick={()=>this.props.onOpenView(to)}><i className={'fa fa-'+icon} /> {label} {count ? ' ('+count+')' : ''}</a>
      </div>
    }
    // helper component to render profile nav links
    const ProfLink = ({ id, label, icon }) => {
      return <NavLink to={'Profile:'+encodeURIComponent(id)} icon={icon} label={typeof label == 'string' ? label : this.nameOf(id)} />
    }

    return <div id="leftnav" style={{height: this.props.height}}>
      <div className="leftnav-item label">Messages</div>
      <NavLink to="NewsFeed" icon="newspaper-o" label="Feed" />
      <NavLink to="Inbox" icon="inbox" label="Inbox" count={this.state.indexCounts.inboxUnread} />
      <NavLink to="Bookmarks" icon="bookmark-o" label="Saved" count={this.state.indexCounts.bookmarksUnread} />

      <div className="leftnav-item label">People</div>
      <ProfLink id={this.props.userid} label="Your Profile" icon="user" />
      <NavLink to="People" icon="at" label="Contacts" />
      <Issues />
    </div>
  }
}
export default verticalFilled(LeftNav)