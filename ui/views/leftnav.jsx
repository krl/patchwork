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
    const NavLink = ({ viewId, icon, title, count }) => {
      var selected = (viewId === this.props.currentView)
      return <div className={'leftnav-item '+(selected?'selected':'')}>
        <a onClick={()=>this.props.onOpenView(viewId)}><i className={'fa fa-'+(icon||'file-o')} /> {title||viewId} {count ? ' ('+count+')' : ''}</a>
      </div>
    }
    // helper component to render profile nav links
    const ProfLink = ({ id, title, icon }) => {
      return <NavLink viewId={'Profile:'+id} icon={icon} title={typeof title == 'string' ? title : this.nameOf(id)} />
    }

    // get all non-pinned views
    const views = this.props.views
    const nonPinnedViewIds = Object.keys(views).filter(viewId => !views[viewId].pinned)

    return <div id="leftnav" style={{height: this.props.height}}>
      <Issues />

      <div className="leftnav-item label">Messages</div>
      <NavLink viewId="NewsFeed" icon="newspaper-o" title="Feed" />
      <NavLink viewId="Inbox" icon="inbox" title="Inbox" count={this.state.indexCounts.inboxUnread} />
      <NavLink viewId="Bookmarks" icon="bookmark-o" title="Saved" count={this.state.indexCounts.bookmarksUnread} />

      <div className="leftnav-item label">People</div>
      <ProfLink id={this.props.userid} title="Your Profile" icon="user" />
      <NavLink viewId="People" icon="at" title="Contacts" />

      { nonPinnedViewIds.length ?
        <div>
          <div className="leftnav-item label">Opened</div>
          { nonPinnedViewIds.map(viewId => <NavLink key={viewId} viewId={viewId} icon={views[viewId].icon} title={views[viewId].title} />) }
        </div>
        : '' }
    </div>
  }
}
export default verticalFilled(LeftNav)