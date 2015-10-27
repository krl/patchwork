'use babel'
import React from 'react'
import { connect } from 'react-redux'
import { viewOpen, viewOpenMsg, viewClose, viewUpdateSetting } from '../actions/views'
import { msglistCreate, msglistLoadMore, msgListSetFilter } from '../actions/msgs'
import SimpleInfinite from '../com/simple-infinite'
import FAB from '../com/fab'
import UserInfo from '../com/user-info'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list-item/card'
import app from '../lib/app'
import social from '../lib/social-graph'

const PAGE_SIZE = 25 // how many msgs do we load at once, and want to try to get on the page?
const FILTERS = [
  { label: 'About', fn: msg => true }, // TODO
  { label: 'Posts', fn: msg => true }, // TODO
  { label: 'To You', fn: msg => true } // TODO
]

class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      listLength: PAGE_SIZE // # the list should be showing right now
    }
  }

  componentDidMount() {
    this.props.onLoad(this.props.pid)
  }

  onSelectFilter(filter) {
    // reset the list size
    this.setState({ listLength: PAGE_SIZE })
    // bubble up
    this.props.onSelectFilter(this.props.pid, filter)
  }

  onInfiniteLoad() {
    // increase the list size
    this.setState({ listLength: this.state.listLength + PAGE_SIZE })
  }

  render() {
    const list = this.props.list
    const shouldLoadMore = list && !list.isFetching && (!list.isAtEnd || this.state.listLength < list.msgs.length)
    const filterFn = (msg) => {
      // toplevel post by this user
      var c = msg.value.content
      if (msg.value.author == this.props.pid && c.type == 'post' && !(c.root || c.branch) && this.props.activeFilter.fn(msg))
        return true
    }
    return <div id="profile">
      <FAB label="Compose" icon="pencil" onClick={this.props.onOpenComposer} />
      <SimpleInfinite onInfiniteLoad={this.onInfiniteLoad.bind(this)} infiniteLoadBeginBottomOffset={shouldLoadMore ? 100 : 0}>
        <UserInfo pid={this.props.pid} />
        <div className="toolbar">
          <a className="btn" onClick={()=>this.props.onCloseView(this.props.param)} title="Close"><i className="fa fa-close" /> Close</a>
          <Tabs options={FILTERS} selected={this.props.activeFilter} onSelect={this.onSelectFilter.bind(this)} />
        </div>
        <MsgList
          ListItem={Card}
          list={this.props.list}
          msgsById={this.props.msgsById}
          filterFn={filterFn}
          limit={this.state.listLength}
          onNeedsMore={this.props.onLoadMore.bind(null, this.props.pid)}
          onOpenMsg={this.props.onOpenMsg}
          isLoading={this.props.isLoading}
          emptyMsg="This feed is empty" />
      </SimpleInfinite>
    </div>
  }
}

function mapStateToProps (state, props) {
  const pid = props.param
  const view = state.views['Profile:'+pid]
  const msgList = state.msgLists['Profile:'+pid]
  const settings = view.settings
  return {
    pid: view.param,
    settings: settings,
    activeFilter: settings.activeFilter || FILTERS[0],
    msgsById: state.msgsById,
    list: (msgList) ? msgList.msgs : [],
    isLoading: (msgList) ? msgList.isLoading : true
  }
}
function mapDispatchToProps (dispatch) {
  return {
    onLoad: (pid) => dispatch(msglistCreate('Profile:'+pid, {
      fetchFn: (opts) => {
        opts = opts || {}
        opts.id = pid
        return app.ssb.createUserStream(opts)
      },
      cursorFn: (msg) => msg.value.sequence,
      numInitialLoad: PAGE_SIZE
    })),
    onCloseView: (pid) => dispatch(viewClose('Profile:'+pid)),
    onLoadMore: (pid) => dispatch(msglistLoadMore('Profile:'+pid, PAGE_SIZE)),
    onOpenMsg: (msgId) => dispatch(viewOpenMsg(msgId)),
    onOpenComposer: () => dispatch(viewOpen('Composer')),
    onSelectFilter: (pid, filter) => dispatch(viewUpdateSetting('Profile:'+pid, 'activeFilter', filter))
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Profile)