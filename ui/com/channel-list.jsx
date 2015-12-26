'use babel'
import pull from 'pull-stream'
import React from 'react'
import classNames from 'classnames'
import { verticalFilled } from './index'
import app from '../lib/app'

function cls (selected, hasNew) {
  return classNames({ 'channel-list-item': true, flex: true, selected: selected, unread: hasNew })
}

class ChannelListItem extends React.Component {
  shouldComponentUpdate(nextProps) {
    return this.props.selected !== nextProps.selected || this.props.channel !== nextProps.channel
  }
  onPin(e) {
    e.preventDefault()
    e.stopPropagation()
    app.ssb.patchwork.toggleChannelPinned(this.props.channel.name, err => {
      if (err)
        app.issue('Failed to pin channel', err)
    })
  }
  render() {
    const channel = this.props.channel
    const onSelect = () => this.props.onSelect(channel)
    return <div className={cls(this.props.selected, channel.hasNew)} onClick={onSelect}>
      <div className="flex-fill"><i className="fa fa-hashtag" /> { channel.name }</div>
      <div className="ctrls">
        <a className={classNames({ pin: true, pinned: channel.pinned })} onClick={this.onPin.bind(this)}><i className="fa fa-thumb-tack" /></a>
      </div>
    </div>
  }
}

export class ChannelList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { searchText: '', searchQuery: false, channels: app.channels||[] }
    app.on('update:channels', (this.onUpdateChannels = () => this.setState({ channels: app.channels })))
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.onUpdateChannels)
  }

  onSearchChange(e) {
    const v = e.target.value
    this.setState({ searchText: v, searchQuery: (v) ? new RegExp(v, 'i') : false })
  }

  onSelect(channel) {
    app.history.pushState(null, '/newsfeed/channel/' + encodeURIComponent(channel.name))
  }

  onSearchKeyDown(e) {
    if (e.keyCode == 13) {
      e.preventDefault()
      e.stopPropagation()
      if (this.state.searchText.trim())
        this.onSelect({ name: this.state.searchText })
      this.onClearSearch()
    }
  }

  onClearSearch() {
    this.setState({ searchText: '', searchQuery: false })    
  }

  onClickOpen() {
    this.onSelect({ name: this.state.searchText })
    this.onClearSearch()
  }

  onClickCreate() {
    // Pin, then open
    app.ssb.patchwork.pinChannel(this.state.searchText, err => {
      if (err)
        return app.issue('Failed to create channel', err)
      this.onSelect({ name: this.state.searchText })
      this.onClearSearch()
    })
  }

  render() {
    const selected = this.props.selected
    const search = this.state.searchText
    
    // predicates
    const isPartialMatch = channel => ((this.state.searchQuery) ? this.state.searchQuery.test(channel.name) : true)
    const isExactMatch   = channel => ((this.state.searchText)  ? this.state.searchText === channel.name : false)
    const isPinned = b => channel => (!!channel.pinned == b)

    // filtered channels
    const pinnedChannels   = this.state.channels.filter(isPinned(true)).filter(isPartialMatch)
    const unpinnedChannels = this.state.channels.filter(isPinned(false)).filter(isPartialMatch)

    // render
    const hasExactMatch = this.state.channels.filter(isExactMatch).length > 0
    const renderChannel = channel => <ChannelListItem key={channel.name} channel={channel} selected={channel.name === selected} onSelect={this.onSelect} />
    return <div className="channel-list" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="channel-list-ctrls">
        <div className="search">
          <i className="fa fa-hashtag" />
          <input ref="searchInput" type="text" placeholder="New Channel" value={search} onChange={this.onSearchChange.bind(this)} onKeyDown={this.onSearchKeyDown.bind(this)} />
        </div>
      </div>
      { pinnedChannels.length ? <div className="channel-list-heading">Pinned</div> : '' }
      { pinnedChannels.map(renderChannel) }
      { unpinnedChannels.length ? <div className="channel-list-heading">Unpinned</div> : '' }
      { unpinnedChannels.map(renderChannel) }
      <hr/>
      <div style={{fontWeight: 'normal', color: 'gray', padding: '0 10px'}}>
        <p><small>Channels are topical filters for conversations.</small></p>
        <p>
          { search
            ? (hasExactMatch
              ? <small><a onClick={this.onClickOpen.bind(this)}>Open "#{search}"</a> | </small>
              : <small><a onClick={this.onClickCreate.bind(this)}>Create "#{search}"</a> | </small>)
            : '' }
          { search
            ? <small><a onClick={this.onClearSearch.bind(this)}>Clear filter</a></small>
            : '' }
        </p>
      </div>
    </div>
  }
}
const ChannelListVertical = verticalFilled(ChannelList)
export default ChannelListVertical
