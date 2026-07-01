/**
 * @hololand/creation-tools/feed
 *
 * The sovereign consumer feed (WS-2 consume half): list shareable worlds and
 * resolve any one into an openable `mcp.holoscript.net/scene/:id` sovereign link.
 */

export {
  WorldFeed,
  seedFeedWorlds,
  seedTemplateToFeedWorld,
  isOpenableSovereignSceneUrl,
} from './WorldFeed';

export type {
  FeedWorld,
  OpenableWorld,
  ShareLinkResult,
  ShareLinkResolver,
  StoreWorldLister,
  WorldFeedConfig,
} from './WorldFeed';
