'use client';

/**
 * CollectionPage Component
 *
 * Editorial collection view for the HoloLand platform with:
 *   - Collection title, curator attribution, description
 *   - Curated world list with curator notes per world
 *   - Share button
 *   - Follow collection for updates
 *
 * Wires to CurationService collections via discoveryApi.
 *
 * @module discovery/CollectionPage
 */

import { useState, useEffect, useCallback } from 'react';
import {
  discoveryAPI,
  type CollectionDetail,
} from './discoveryApi';

// ============================================================================
// Props
// ============================================================================

export interface CollectionPageProps {
  /** The collection ID to display */
  collectionId: string;
  /** Called when user clicks a world card */
  onWorldClick: (worldId: string) => void;
  /** Called when user clicks a creator name */
  onCreatorClick: (creatorId: string) => void;
  /** Called when user navigates back */
  onBack: () => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating display */
function StarRating({ rating, count }: { rating: number; count?: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${
            i < fullStars ? 'text-yellow-400' : i === fullStars && hasHalf ? 'text-yellow-400' : 'text-gray-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {count !== undefined && count > 0 && (
        <span className="text-xs text-gray-500 ml-1">({count})</span>
      )}
    </div>
  );
}

/** Collection header with cover image */
function CollectionHeader({
  collection,
  isFollowing,
  onFollow,
  onShare,
}: {
  collection: CollectionDetail;
  isFollowing: boolean;
  onFollow: () => void;
  onShare: () => void;
}) {
  const typeLabels: Record<string, string> = {
    featured: 'Featured Collection',
    staff_picks: 'Staff Picks',
    seasonal: 'Seasonal Event',
    themed: 'Themed Collection',
    spotlight: 'Spotlight',
    custom: 'Collection',
  };

  return (
    <div className="relative">
      {/* Cover image */}
      <div className="h-64 md:h-80 overflow-hidden">
        {collection.coverImageUrl ? (
          <img
            src={collection.coverImageUrl}
            alt={collection.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/50 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-indigo-500/30 text-indigo-300 text-xs font-semibold rounded-full uppercase tracking-wider">
              {typeLabels[collection.type] ?? 'Collection'}
            </span>
            {collection.featured && (
              <span className="px-3 py-1 bg-yellow-500/30 text-yellow-300 text-xs font-semibold rounded-full">
                Featured
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{collection.name}</h1>
          <p className="text-gray-300 text-base md:text-lg max-w-3xl mb-4">{collection.description}</p>

          {/* Curator and metadata */}
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Curator */}
              {collection.curatorAvatarUrl ? (
                <img
                  src={collection.curatorAvatarUrl}
                  alt={collection.curatorName ?? 'Curator'}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-500/50 flex items-center justify-center text-sm text-white font-bold">
                  {(collection.curatorName ?? 'C').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-sm text-gray-300">Curated by </span>
                <span className="text-sm text-white font-medium">{collection.curatorName ?? 'Editor'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{collection.worldCount} world{collection.worldCount !== 1 ? 's' : ''}</span>
              <span>{formatCount(collection.viewCount)} views</span>
              <span>Created {formatDate(collection.createdAt)}</span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2 md:ml-auto">
              <button
                onClick={onFollow}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isFollowing
                    ? 'bg-gray-700 text-gray-300 hover:bg-red-600/20 hover:text-red-400'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow Collection'}
              </button>

              <button
                onClick={onShare}
                className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-2"
                aria-label="Share collection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
          </div>

          {/* Tags */}
          {collection.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {collection.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 bg-gray-800/80 text-gray-400 text-xs rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Curated world card with curator note */
function CuratedWorldCard({
  world,
  index,
  onClick,
  onCreatorClick,
}: {
  world: CollectionDetail['worlds'][0];
  index: number;
  onClick: () => void;
  onCreatorClick: (creatorId: string) => void;
}) {
  return (
    <div className="group bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/30 transition-all duration-200">
      <div className="flex flex-col md:flex-row">
        {/* Thumbnail */}
        <div className="relative md:w-72 flex-shrink-0 cursor-pointer" onClick={onClick}>
          <div className="aspect-video md:aspect-auto md:h-full overflow-hidden">
            {world.thumbnailUrl ? (
              <img
                src={world.thumbnailUrl}
                alt={world.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
          </div>

          {/* Order number */}
          <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gray-900/80 flex items-center justify-center text-sm font-bold text-white">
            {index + 1}
          </div>

          {/* Live players */}
          {world.livePlayerCount > 0 && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {world.livePlayerCount} playing
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3
                className="text-lg font-semibold text-white mb-1 group-hover:text-indigo-300 transition-colors cursor-pointer"
                onClick={onClick}
              >
                {world.title}
              </h3>

              {/* Creator */}
              <div className="flex items-center gap-2 mb-2">
                {world.creatorAvatarUrl ? (
                  <img src={world.creatorAvatarUrl} alt={world.creatorName} className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-indigo-500/50 flex items-center justify-center text-[10px] text-white font-bold">
                    {world.creatorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onCreatorClick(world.creatorId); }}
                  className="text-sm text-gray-400 hover:text-indigo-300 transition-colors"
                >
                  {world.creatorName}
                </button>
              </div>

              <p className="text-sm text-gray-400 line-clamp-2 mb-3">{world.description}</p>

              {/* Curator note */}
              {world.curatorNote && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3.5 h-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs font-medium text-indigo-400">Curator's Note</span>
                  </div>
                  <p className="text-sm text-indigo-200/80 italic">"{world.curatorNote}"</p>
                </div>
              )}

              {/* Tags */}
              {world.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {world.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 bg-gray-700/50 text-gray-400 text-[10px] rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex items-center gap-4 pt-2 border-t border-gray-700/50">
            <StarRating rating={world.avgRating} count={world.ratingCount} />
            <span className="text-xs text-gray-500">{formatCount(world.totalVisits)} visits</span>
            {world.totalRemixes > 0 && (
              <span className="text-xs text-gray-500 flex items-center gap-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {formatCount(world.totalRemixes)} remixes
              </span>
            )}
            <span className="text-xs text-gray-600 capitalize">{world.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton loader */
function CollectionSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 animate-pulse">
      <div className="h-80 bg-gray-800" />
      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl h-48 flex">
            <div className="w-72 bg-gray-700 rounded-l-xl" />
            <div className="flex-1 p-5 space-y-3">
              <div className="h-5 bg-gray-700 rounded w-2/3" />
              <div className="h-4 bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-700 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CollectionPage({
  collectionId,
  onWorldClick,
  onCreatorClick,
  onBack,
}: CollectionPageProps) {
  // -- State --
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  // -- Fetch collection --
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    discoveryAPI.getCollection(collectionId)
      .then((data) => {
        if (!cancelled) setCollection(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load collection');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [collectionId]);

  // -- Follow toggle --
  const handleFollow = useCallback(async () => {
    try {
      if (isFollowing) {
        await discoveryAPI.unfollowCollection(collectionId);
        setIsFollowing(false);
      } else {
        await discoveryAPI.followCollection(collectionId);
        setIsFollowing(true);
      }
    } catch {
      // Silently fail
    }
  }, [isFollowing, collectionId]);

  // -- Share --
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/discover/collections/${collectionId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: collection?.name ?? 'HoloLand Collection',
          text: collection?.description ?? 'Check out this collection on HoloLand',
          url,
        });
      } catch {
        // User cancelled or share API failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setShareMessage('Link copied to clipboard');
        setTimeout(() => setShareMessage(null), 3000);
      } catch {
        // Clipboard API failed
      }
    }
  }, [collectionId, collection]);

  // -- Render --
  if (loading) return <CollectionSkeleton />;

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">{error ?? 'Collection not found'}</div>
          <button
            onClick={onBack}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Back button */}
      <div className="absolute top-4 left-4 md:left-8 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/80 hover:text-white text-sm bg-black/40 hover:bg-black/60 px-4 py-2 rounded-lg backdrop-blur-sm transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Share toast */}
      {shareMessage && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-green-400 shadow-xl animate-pulse">
          {shareMessage}
        </div>
      )}

      {/* Collection Header */}
      <CollectionHeader
        collection={collection}
        isFollowing={isFollowing}
        onFollow={handleFollow}
        onShare={handleShare}
      />

      {/* World List */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            {collection.worlds.length} World{collection.worlds.length !== 1 ? 's' : ''} in Collection
          </h2>
        </div>

        {collection.worlds.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547" />
            </svg>
            <h3 className="text-white font-semibold mb-1">No worlds in this collection yet</h3>
            <p className="text-gray-500 text-sm">Check back later for curated picks.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {collection.worlds.map((world, idx) => (
              <CuratedWorldCard
                key={world.worldId}
                world={world}
                index={idx}
                onClick={() => onWorldClick(world.worldId)}
                onCreatorClick={onCreatorClick}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default CollectionPage;
