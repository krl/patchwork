module.exports = function (makeTable) {
  return {
    isRead:        require('./is-read')(makeTable),
    isBookmarked:  require('./is-bookmarked')(makeTable),
    channels:      require('./channels')(makeTable),
    threads:       require('./threads')(makeTable),
    notifications: require('./notifications')(makeTable),
    profiles:      require('./profiles')(makeTable)
  }
}