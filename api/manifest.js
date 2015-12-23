module.exports = {
  // new
  new_indexCounts: 'async',
  new_indexCountsChanges: 'source',

  new_threads: 'source',
  new_threadsChanges: 'source',
  new_countThreads: 'async',
  
  new_notifications: 'source',
  new_countNotifications: 'async',

  new_profiles: 'source',
  new_profilesChanges: 'source',
  new_countProfiles: 'async',
  new_getProfile: 'async',

  new_channels: 'source',
  new_channelsChanges: 'source',
  new_getChannel: 'async',
  new_setChannelPinned: 'async',
  new_toggleChannelPinned: 'async',

  new_getIsRead: 'async',
  new_setIsRead: 'async',
  new_toggleIsRead: 'async',

  new_getIsBookmarked: 'async',
  new_setIsBookmarked: 'async',
  new_toggleIsBookmarked: 'async',


  // legacy
  createEventStream: 'source',

  getIndexCounts: 'async',
  createNewsfeedStream: 'source',
  createInboxStream: 'source',
  createBookmarkStream: 'source',
  createNotificationsStream: 'source',
  createChannelStream: 'source',

  markRead: 'async',
  markUnread: 'async',
  toggleRead: 'async',
  isRead: 'async',

  bookmark: 'async',
  unbookmark: 'async',
  toggleBookmark: 'async',
  isBookmarked: 'async',

  getChannels: 'async',
  pinChannel: 'async',
  unpinChannel: 'async',
  toggleChannelPinned: 'async',

  addFileToBlobs: 'async',
  saveBlobToFile: 'async',

  useLookupCode: 'source',

  getMyProfile: 'async',
  getProfile: 'async',
  getAllProfiles: 'async',

  getNamesById: 'async',
  getName: 'async',
  getIdsByName: 'async',
  getActionItems: 'async'
}