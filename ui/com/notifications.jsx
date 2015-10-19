'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { MsgLink, UserLink } from '../com/index'
import u from '../lib/util'
import app from '../lib/app'

class Notification extends React.Component {
  onSelect() {
    // get root msg
    u.getParentPostThread(this.props.msg.voteMsg.key, (err, thread) => {
      if (err)
        return app.issue('Failed to load thread', err, 'This occurred when a notification link was clicked')
      this.props.onSelect(thread)
    })
  }
  render() {
    let msg = this.props.msg
    let c = msg.value.content
    switch (c.type) {
      case 'vote':
        let key = mlib.link(c.vote).link
        let text = (this.props.msg.voteMsg && this.props.msg.voteMsg.value.content && this.props.msg.voteMsg.value.content.text || 'your message')
        if (c.vote.value > 0) return <span><i className="fa fa-star" /> <UserLink id={msg.value.author} /> starred <a onClick={this.onSelect.bind(this)}>{text}</a></span>
        if (c.vote.value === 0) return <span><i className="fa fa-star-o" /> <UserLink id={msg.value.author} /> unstarred <a onClick={this.onSelect.bind(this)}>{text}</a></span>
        break
      case 'contact':
        let pid = mlib.link(c.contact).link
        if (c.following === true) return <span><i className="fa fa-user-plus" /> <UserLink id={msg.value.author} /> followed you</span>
        if (c.blocking === true) return <span><i className="fa fa-microphone-slash" /> <UserLink id={msg.value.author} /> blocked you</span>
        if (c.following === false) return <span><i className="fa fa-user-times" /> <UserLink id={msg.value.author} /> unfollowed you</span>
        break
    }
    return ''
  }
}

export default class Notifications extends React.Component {
  constructor(props) {
    super(props)
    this.state = { msgs: [] }
  }

  componentDidMount() {
    pull(
      app.ssb.patchwork.createNotificationsStream({ limit: 5 }),
      pull.asyncMap((msg, cb) => {
        if (typeof msg.value.content == 'string') {
          app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
            if (decrypted) {
              msg.value.content = decrypted
              cb(null, msg)
            } else
              cb()
          })
        } else
          cb(null, msg)
      }),
      pull.filter(msg => !!msg),
      pull.asyncMap((msg, cb) => {
        if (msg.value.content.type === 'vote') {
          let vote = mlib.link(msg.value.content.vote, 'msg')
          if (vote) {
            return app.ssb.get(vote.link, (err, voteMsg) => {
              msg.voteMsg = { key: vote.link, value: voteMsg }
              cb(null, msg)
            })
          }
        }
        cb(null, msg)
      }),
      pull.collect((err, msgs) => {
        if (err)
          app.minorIssue('Failed to fetch notifications', err)
        else
          this.setState({ msgs: msgs })
      })
    )    
  }

  render() {
    return <div className="notifications" style={{height: this.props.height}}>
      <div><small><i className="fa fa-bell" /> Notifications</small></div>
      { this.state.msgs.map((msg, i) => {
        return <div key={i}><Notification msg={msg} onSelect={this.props.onSelect} /></div>
      }) }
    </div>
  }
}