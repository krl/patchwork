// master interface list
// - these are the addressable interfaces in the app
// - eg 'NewsFeed' gets you the newsfeed, 'Profile:@...' gets you a user profile
import NewsFeed from './newsfeed'
import Inbox from './inbox'
import Bookmarks from './bookmarks'
import Data from './data'
import Msg from './msg'
import Profile from './profile'
import People from './people'
import Sync from './sync'
import Webview from './webview'

export {
  NewsFeed,
  Inbox,
  Bookmarks,
  Data,
  Msg,
  Profile,
  People,
  Sync,
  Webview
}