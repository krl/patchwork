module.exports = function (makeTable) {
  return makeTable({
    version: 1,
    name: 'channels',
    type: 'stateful',
    persisted: true,
    schema: { name: 'string', isPinned: 'boolean' },
    queries: { default: { key: 'name' } }
  })
}