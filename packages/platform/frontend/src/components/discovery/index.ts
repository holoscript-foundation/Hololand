/**
 * Discovery Module
 *
 * Frontend components for the HoloLand Discovery system:
 *   - DiscoveryPage: Main discovery/explore page with feeds, categories, staff picks
 *   - SearchResults: Full search results with faceted filtering and autocomplete
 *   - CreatorProfile: Public creator profile with worlds, assets, activity, remix tree
 *   - CollectionPage: Editorial collection view with curator notes
 *   - discoveryAPI: API client wired to SceneRankingService and CurationService
 *
 * @module discovery
 */

// Pages
export { DiscoveryPage, type DiscoveryPageProps } from './DiscoveryPage';
export { SearchResults, type SearchResultsProps } from './SearchResults';
export { CreatorProfile, type CreatorProfileProps } from './CreatorProfile';
export { CollectionPage, type CollectionPageProps } from './CollectionPage';

// API client
export { discoveryAPI } from './discoveryApi';

// Types re-exported for consumers
export type {
  FeedType,
  RankedWorld,
  FeedResult,
  TopCategory,
  CategoryNode,
  CategoryTree,
  SearchQuery,
  SearchResult,
  SearchResponse,
  CollectionType,
  CollectionInfo,
  CollectionDetail,
  CreatorProfile as CreatorProfileData,
  CreatorBadge,
  CreatorWorld,
  CreatorAsset,
  CreatorActivity,
  CreatorPortfolio,
  RemixNode,
} from './discoveryApi';
