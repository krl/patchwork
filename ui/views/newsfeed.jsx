'use babel'
import React from 'react'
import { Link } from 'react-router'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import cls from 'classnames'
import { LocalStoragePersistedComponent } from '../com'
import Dipswitch from '../com/form-elements/dipswitch'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Thread from '../com/msg-thread'
import { ALL_CHANNELS, ChannelList } from '../com/channel-list'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'
import social from '../lib/social-graph'

// nav helper component
class TopNav extends React.Component {
  render() {
    // predicates
    const isPinned = b => channel => (!!channel.pinned == b)
    
    // lists
    const pinnedChannels = this.props.channels.filter(isPinned(true))

    // render
    const NavLink = props => {
      return <div className="newsfeed-topnav-link">
        <Link to={props.to} className={this.props.location.pathname === props.to ? 'selected' : ''}>{props.children}</Link>
      </div>
    }
    const renderChannel = c => <NavLink to={'/newsfeed/channel/'+c.name}>#{c.name}</NavLink>
    return <div className="newsfeed-topnav">
      <NavLink to="/">All</NavLink>
      { pinnedChannels.map(renderChannel) }
      <NavLink to="/channels">More channels...</NavLink>
    </div>
  }
}

// newsfeed view
export default class NewsFeed extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'newsfeedState', {
      isToolbarOpen: true,
      listItemIndex: 0,
      isFollowedOnly: true,
      isUsingThreadPanel: false,
      currentThreadKey: null
    })

    // watch for updates to the channels
    this.state.channels = app.channels || []
    app.on('update:channels', (this.onUpdateChannels = () => this.setState({ channels: app.channels })))
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.onUpdateChannels)
  }

  render() {
    const channel = this.props.params.channel

    // msg-list params
    const cursor = msg => {
      if (msg)
        return [msg.value.timestamp, msg.value.author]
    }
    const source = (opts) => {
      if (channel) 
        return app.ssb.patchwork.createChannelStream(channel, opts)
      return app.ssb.patchwork.createNewsfeedStream(opts)
    }
    const filter = msg => {
      if (this.state.isFollowedOnly)
        return followedOnlyFilter(msg)
      return true
    }

    // render content
    return <div id="newsfeed" key={channel||'*'}>
      <MsgList
        ref="list"
        threads
        composer composerProps={{isPublic: true, channel: channel, placeholder: 'Write a public post'+(channel?' on '+channel:'')}}
        queueNewMsgs
        dateDividers
        filter={filter}
        Hero={TopNav} heroProps={{ location: this.props.location, channels: this.state.channels }}
        ListItem={Card}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={(channel) ? ('No posts on "'+channel+'"... yet!') : 'Your newsfeed is empty.'}
        source={source}
        cursor={cursor} />
    </div>
  }
}

function followedOnlyFilter (msg) {
  return msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author)
}