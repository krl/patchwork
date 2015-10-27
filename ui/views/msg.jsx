'use babel'
import React from 'react'
import { connect } from 'react-redux'
import { msgLoad } from '../actions/msgs'
import { viewOpen, viewClose, viewUpdateSetting } from '../actions/views'
import { VerticalFilledContainer } from '../com/index'
import FAB from '../com/fab'
import MsgThread from '../com/msg-thread'
import app from '../lib/app'

class Msg extends React.Component {
  constructor(props) {
    super(props)
    this.state = { forceRaw: false }
  }

  componentDidMount() {
    this.props.onLoad(this.props.param)
  }

  toggleRaw() {
    this.setState({ forceRaw: !this.state.forceRaw })
  }

  render() {
    const mid = this.props.param
    const thread = this.props.thread
    return <VerticalFilledContainer id="msg">
      <FAB label="Compose" icon="pencil" onClick={this.props.onOpenComposer} />
      <div className="toolbar">
        <a className="btn" onClick={()=>this.props.onCloseView(mid)} title="Close"><i className="fa fa-close" /> Close</a>
        <a className="btn" onClick={()=>this.props.onMarkUnread(mid)} title="Mark Unread"><i className="fa fa-eye-slash" /> Mark Unread</a>
        <a className={'btn'+(thread.isBookmarked?' highlighted':'')} onClick={()=>this.props.onToggleBookmark(mid)} title="Save">
          { thread.isBookmarked ?
            <span><i className="fa fa-bookmark" /> Saved</span> :
            <span><i className="fa fa-bookmark-o" /> Save</span> }
        </a>
        <a className={'btn'+(this.state.forceRaw?' highlighted':'')} onClick={this.toggleRaw.bind(this)} title="View Raw Data"><i className="fa fa-code" /></a>
      </div>
      <MsgThread thread={thread} forceRaw={this.state.forceRaw} />
    </VerticalFilledContainer>
  }
}

function mapStateToProps (state, props) {
  const mid = props.param
  const settings = state.views['Msg:'+mid].settings
  return {
    settings: settings,
    thread: state.msgsById[mid]
  }
}
function mapDispatchToProps (dispatch) {
  return {
    onLoad: (mid) => dispatch(msgLoad(mid)),
    onCloseView: (mid) => dispatch(viewClose('Msg:'+mid)),
    onOpenComposer: () => dispatch(viewOpen('composer'))
  }
}
export default connect(mapStateToProps, mapDispatchToProps)(Msg)