module.exports = function (makeTable) {
  return makeTable({
    version: 1,
    name: 'isBookmarked',
    type: 'stateful',
    persisted: true,
    schema: { key: 'string', isBookmarked: 'boolean' },
    queries: { default: { key: 'key' } }
  })
}