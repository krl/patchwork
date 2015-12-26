'use babel'
import React from 'react'
import cls from 'classnames'
import { LocalStoragePersistedComponent } from '../com'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import app from '../lib/app'
import social from '../lib/social-graph'

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
        dateDividers
        filter={filter}
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