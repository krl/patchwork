'use babel'
import React from 'react'
import { connect } from 'react-redux'
import { viewOpen, viewUpdateSetting } from '../actions/views'
import { msglistCreate, msglistLoadMore, msgListSetFilter } from '../actions/msgs'
import SimpleInfinite from '../com/simple-infinite'
import FAB from '../com/fab'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list-item/card'
import app from '../lib/app'
import social from '../lib/social-graph'

const PAGE_SIZE = 25 // how many msgs do we load at once, and want to try to get on the page?
const FILTERS = [
  { label: 'Friends', fn: msg => msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author) },
  { label: 'Friends + Network', fn: msg => true },
  { label: 'Every 10', fn: (msg, i) => (i % 10 === 0) }
]

class NewsFeed extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      listLength: PAGE_SIZE // # the list should be showing right now
    }
  }

  componentDidMount() {
    this.props.onLoad()
  }

  onSelectFilter(filter) {
    // reset the list size
    this.setState({ listLength: PAGE_SIZE })
    // bubble up
    this.props.onSelectFilter(filter)
  }

  onInfiniteLoad() {
    // increase the list size
    this.setState({ listLength: this.state.listLength + PAGE_SIZE })
  }

  render() {
    const list = this.props.list
    const shouldLoadMore = list && !list.isFetching && (!list.isAtEnd || this.state.listLength < list.msgs.length)
    return <div id="feed">
      <FAB label="Compose" icon="pencil" onClick={this.props.onOpenComposer} />
      <SimpleInfinite onInfiniteLoad={this.onInfiniteLoad.bind(this)} infiniteLoadBeginBottomOffset={shouldLoadMore ? 100 : 0}>
        <div className="toolbar">
          <a className="btn"><i className="fa fa-search" /></a>
          <Tabs options={FILTERS} selected={this.props.activeFilter} onSelect={this.onSelectFilter.bind(this)} />
        </div>
        <MsgList
          ListItem={Card}
          list={this.props.list}
          msgsById={this.props.msgsById}
          filterFn={this.props.activeFilter.fn}
          limit={this.state.listLength}
          onNeedsMore={this.props.onLoadMore}
          isLoading={this.props.isLoading}
          emptyMsg="Your feed is empty" />
      </SimpleInfinite>
    </div>
  }
}

function mapStateToProps (state) {
  const msgList = state.msgLists.NewsFeed
  const settings = state.views.NewsFeed.settings
  return {
    settings: settings,
    activeFilter: settings.activeFilter || FILTERS[0],
    msgsById: state.msgsById,
    list: (msgList) ? msgList.msgs : [],
    isLoading: (msgList) ? msgList.isLoading : true
  }
}
function mapDispatchToProps (dispatch) {
  return {
    onLoad: () => dispatch(msglistCreate('NewsFeed', {
      fetchFn: app.ssb.patchwork.createNewsfeedStream,
      cursorFn: (msg) => [msg.value.timestamp, msg.value.author],
      liveOptsFn: () => { gt: [Date.now(), null] },
      numInitialLoad: PAGE_SIZE
    })),
    onLoadMore: () => dispatch(msglistLoadMore('NewsFeed', PAGE_SIZE)),
    onOpenComposer: () => dispatch(viewOpen('composer')),
    onSelectFilter: (filter) => dispatch(viewUpdateSetting('NewsFeed', 'activeFilter', filter))
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(NewsFeed)