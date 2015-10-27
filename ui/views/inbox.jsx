'use babel'
import React from 'react'
import { connect } from 'react-redux'
import { viewOpen, viewUpdateSetting } from '../actions/views'
import { msglistCreate, msglistLoadMore, msgListSetFilter } from '../actions/msgs'
import SimpleInfinite from '../com/simple-infinite'
import FAB from '../com/fab'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-list-item/oneline'
import app from '../lib/app'

const PAGE_SIZE = 50 // how many msgs do we load at once, and want to try to get on the page?
const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: 'Unread', fn: msg => msg.hasUnread },
  { label: 'Private Messages', fn: msg => !msg.plaintext },
  { label: 'Mentions', fn: msg => msg.mentionsUser }
]

class Inbox extends React.Component {
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
    return <div id="inbox">
      <FAB label="Compose" icon="pencil" onClick={this.props.onOpenComposer} />
      <SimpleInfinite onInfiniteLoad={this.onInfiniteLoad.bind(this)} infiniteLoadBeginBottomOffset={shouldLoadMore ? 100 : 0}>
        <div className="toolbar">
          <a className="btn"><i className="fa fa-search" /></a>
          <Tabs options={FILTERS} selected={this.props.activeFilter} onSelect={this.onSelectFilter.bind(this)} />
        </div>
        <MsgList
          ListItem={Oneline}
          list={this.props.list}
          msgsById={this.props.msgsById}
          filterFn={this.props.activeFilter.fn}
          limit={this.state.listLength}
          onNeedsMore={this.props.onLoadMore}
          isLoading={this.props.isLoading}
          emptyMsg="Your inbox is empty" />
      </SimpleInfinite>
    </div>
  }
}

function mapStateToProps (state) {
  const msgList = state.msgLists.Inbox
  const settings = state.views.Inbox.settings
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
    onLoad: () => dispatch(msglistCreate('Inbox', {
      fetchFn: app.ssb.patchwork.createInboxStream,
      cursorFn: (msg) => [msg.value.timestamp, msg.value.author],
      liveOptsFn: () => { gt: [Date.now(), null] },
      numInitialLoad: PAGE_SIZE
    })),
    onLoadMore: () => dispatch(msglistLoadMore('Inbox', PAGE_SIZE)),
    onOpenComposer: () => dispatch(viewOpen('composer')),
    onSelectFilter: (filter) => dispatch(viewUpdateSetting('Inbox', 'activeFilter', filter))
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Inbox)