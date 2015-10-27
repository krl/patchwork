'use babel'

export const VIEW_OPEN = 'VIEW_OPEN'
export const VIEW_CLOSE = 'VIEW_CLOSE'
export const VIEW_UPDATE_SETTING = 'VIEW_UPDATE_SETTING'

// view id format = 'interfaceId:param'
const viewIdRegex = /([^:]+)\:?(.*)/

export function viewOpen (viewId, opts) {
  opts = opts || {}
  let match = viewIdRegex.exec(viewId)
  return { type: VIEW_OPEN, viewId, iface: match[1], param: match[2], ...opts }
}
export function viewClose (viewId) {
  return { type: VIEW_CLOSE, viewId }
}

export function viewUpdateSetting (viewId, key, value) {
  return { type: VIEW_UPDATE_SETTING, viewId, key, value }
}

export function viewUpdateSettings (viewId, KVs) {
  return (dispatch, getState) => {
    for (var k in KVs)
      dispatch(viewUpdateSetting(viewId, k, KVs[k]))
  }
}


// view templates
export function viewOpenMsg (msgId) {
  return viewOpen('Msg:'+msgId, { title: 'Message', icon: 'envelope' })
}