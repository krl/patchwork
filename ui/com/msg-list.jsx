'use babel'
import pull from 'pull-stream'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import { isaReplyTo } from '../lib/msg-relation'
import app from '../lib/app'
import u from '../lib/util'

// used when live msgs come in, how many msgs, from the top, should we check for deduplication?
const DEDUPLICATE_LIMIT = 100

export default class MsgList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { list: props.list }

    // handlers
    this.handlers = {
      onToggleBookmark: (msg) => {
        // TODO move into message-dispatch system
        // toggle in the DB
        app.ssb.patchwork.toggleBookmark(msg.key, (err, isBookmarked) => {
          if (err)
            return app.issue('Failed to toggle bookmark', err, 'Happened in onToggleBookmark of MsgList')

          // re-render
          msg.isBookmarked = isBookmarked
          this.setState(this.state)
        })
      }
    }
  }

  componentDidMount() {
    this.runFilter(this.props)
  }
  componentWillReceiveProps(nextProps) {
    this.runFilter(nextProps)
  }
  runFilter(props) {
    // reduce the list by the active filter, if there is one
    if (!props.filterFn || props.list.length === 0)
      return
    let list = props.list.filter((mid, i) => props.filterFn(props.msgsById[mid], i))
    this.setState({ list: list })

    // fire the needs-more CB if that's too few
    if (props.minimumCount && list.length < props.minimumCount)
      props.onNeedsMore()
  }

  render() {
    const isEmpty = (!this.props.isLoading && this.props.list.length === 0)
    const ListItem = this.props.ListItem
    return <div className="msg-list">
      <div className="msg-list-items">
        { isEmpty ?
          <em>
            { this.props.emptyMsg || 'No messages found' }
          </em>
          :
          <div>
            { this.state.list.map((mid, i) => {
              return <ListItem key={mid} msg={this.props.msgsById[mid]} {...this.handlers} forceRaw={this.props.forceRaw} />
            }) }
          </div>
        }
      </div>
    </div>
  }
}