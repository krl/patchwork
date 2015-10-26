'use babel'
import React from 'react'
import { connect } from 'react-redux'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import { msglistCreate, msglistLoadMore } from '../actions/msgs'
import SimpleInfinite from '../com/simple-infinite'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list-item/card'
import app from '../lib/app'
import social from '../lib/social-graph'

const FILTERS = [
  { label: 'Friends', fn: msg => msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author) },
  { label: 'Friends + Network', fn: msg => true }
]

class NewsFeed extends React.Component {
  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this.props.dispatch(msglistCreate('newsfeed', {
      fetchFn: app.ssb.patchwork.createNewsfeedStream,
      cursorFn: (msg) => [msg.value.timestamp, msg.value.author],
      liveOptsFn: () => { gt: [Date.now(), null] },
      numInitialLoad: 25
    }))
  }

  onLoadMore() {
    console.log('tryin to load more')
    this.props.dispatch(msglistLoadMore('newsfeed', 25))
  }

  render() {
    console.log('shouldLoadMore', this.props.shouldLoadMore)
    return <div id="feed">
      <SimpleInfinite onInfiniteLoad={this.onLoadMore.bind(this)} infiniteLoadBeginBottomOffset={this.props.shouldLoadMore ? 100 : 0}>
        <MsgList
          ListItem={Card}
          list={this.props.list}
          msgsById={this.props.msgsById}
          isLoading={this.props.isLoading}
          emptyMsg="Your feed is empty" />
      </SimpleInfinite>
    </div>
  }
}

function mapStoreToProps (state) {
  const msgList = state.msgLists.newsfeed
  console.log(!!msgList, msgList && !msgList.isFetching, msgList && !msgList.isAtEnd)
  return {
    settings: state.views.NewsFeed.settings,
    msgsById: state.msgsById,
    list: (msgList) ? msgList.msgs : [],
    isLoading: (msgList) ? msgList.isLoading : true,
    shouldLoadMore: msgList && !msgList.isFetching && !msgList.isAtEnd
  }
}
export default connect(mapStoreToProps)(NewsFeed)
/*
*/