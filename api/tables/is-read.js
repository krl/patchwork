module.exports = function (makeTable) {
  return makeTable({
    version: 1,
    name: 'isRead',
    type: 'stateful',
    persisted: true,
    schema: { key: 'string', isRead: 'boolean' },
    queries: { default: { key: 'key' } }
  })
}