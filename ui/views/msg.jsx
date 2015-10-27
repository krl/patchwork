'use babel'
import React from 'react'
import { connect } from 'react-redux'
import { msgLoad } from '../actions/msgs'
import { viewOpen, viewClose, viewUpdateSetting } from '../actions/views'
import FAB from '../com/fab'
import MsgThread from '../com/msg-thread'
import app from '../lib/app'

class Msg extends React.Component {
  componentDidMount() {
    this.props.onLoad(this.props.param)
  }

  render() {
    return <div id="msg">
      <FAB label="Compose" icon="pencil" onClick={this.props.onOpenComposer} />
      <div className="toolbar">
        <a className="btn" onClick={()=>this.props.onCloseView(this.props.param)} title="Close"><i className="fa fa-close" /> Close</a>
        <a className="btn"><i className="fa fa-search" /></a>
      </div>
      <MsgThread
        thread={this.props.thread}
        isLoading={this.props.isLoading} />
    </div>
  }
}

function mapStateToProps (state, props) {
  const mid = props.param
  const settings = state.views['Msg:'+mid].settings
  return {
    settings: settings,
    thread: state.msgsById[mid],
    isLoading: false // TODO
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