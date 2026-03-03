'use client';

/**
 * WorldDetailPage Component
 *
 * Full world info page with:
 *   - Large hero image/screenshot
 *   - Title, creator profile with avatar and follow button
 *   - Description and tags
 *   - Live player count and join button (large CTA)
 *   - Version history accordion
 *   - Reviews section with star rating
 *   - Screenshots gallery with lightbox on click
 *   - Related worlds section
 *
 * Wires to WorldPublishingService via worldsApi.
 *
 * @module worlds/WorldDetailPage
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  worldsAPI,
  type WorldDetail,
  type WorldSummary,
  type WorldVersion,
  type WorldReview,
  type CreatorProfile,
} from './worldsApi';

// ============================================================================
// Props
// ============================================================================

export interface WorldDetailPageProps {
  /** The world ID to display */
  worldId: string;
  /** Called when user clicks "Join World" */
  onJoinWorld: (worldId: string) => void;
  /** Called when user clicks a related world card */
  onWorldClick: (worldId: string) => void;
  /** Called when user clicks back/navigate */
  onBack?: () => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating display */
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25;
  const sizeClass = size === 'lg' ? 'w-6 h-6' : size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${sizeClass} ${
            i < fullStars
              ? 'text-yellow-400'
              : i === fullStars && hasHalf
              ? 'text-yellow-400'
              : 'text-gray-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

/** Interactive star rating input for reviews */
function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        return (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <svg
              className={`w-8 h-8 ${
                star <= (hovered || value) ? 'text-yellow-400' : 'text-gray-600'
              } transition-colors`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        );
      })}
      <span className="ml-2 text-gray-400 text-sm">{value > 0 ? `${value}/5` : 'Select rating'}</span>
    </div>
  );
}

/** Player count badge (large) */
function PlayerCountDisplay({ count, maxCapacity }: { count: number; maxCapacity: number }) {
  const isActive = count > 0;
  const fillPercent = Math.min(100, (count / maxCapacity) * 100);

  return (
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-500'
      }`}>
        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
        {count} / {maxCapacity} players
      </div>
      {/* Capacity bar */}
      <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden max-w-32">
        <div
          className={`h-full rounded-full transition-all ${
            fillPercent > 80 ? 'bg-red-500' : fillPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
          }`}
          style={{ width: `${fillPercent}%` }}
        />
      </div>
    </div>
  );
}

/** Category tag pill */
function CategoryTag({ category }: { category: string }) {
  const colors: Record<string, string> = {
    games: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    art: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    education: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    social: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    enterprise: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize border ${colors[category] ?? 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {category}
    </span>
  );
}

/** Screenshots gallery with lightbox */
function ScreenshotGallery({ screenshots }: { screenshots: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (screenshots.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {screenshots.map((url, idx) => (
          <button
            key={idx}
            onClick={() => setLightboxIndex(idx)}
            className="group aspect-video rounded-lg overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all"
          >
            <img
              src={url}
              alt={`Screenshot ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Prev/Next */}
          {lightboxIndex > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 rounded-full p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {lightboxIndex < screenshots.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white bg-black/50 rounded-full p-2"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <img
            src={screenshots[lightboxIndex]}
            alt={`Screenshot ${lightboxIndex + 1}`}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-400 text-sm">
            {lightboxIndex + 1} / {screenshots.length}
          </div>
        </div>
      )}
    </>
  );
}

/** Version history accordion */
function VersionHistoryAccordion({ versions }: { versions: WorldVersion[] }) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  if (versions.length === 0) return null;

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-2">
      {sortedVersions.map((v) => (
        <div key={v.version} className="border border-gray-700/50 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedVersion(expandedVersion === v.version ? null : v.version)}
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/50 hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">v{v.version}</span>
              {v.isLive && (
                <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                  Live
                </span>
              )}
              <span className="text-gray-500 text-sm">
                {new Date(v.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${
                expandedVersion === v.version ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expandedVersion === v.version && (
            <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700/50 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-500">Title:</span>{' '}
                  <span className="text-gray-300">{v.metadata.title}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>{' '}
                  <span className="text-gray-300 capitalize">{v.metadata.category}</span>
                </div>
                <div>
                  <span className="text-gray-500">Capacity:</span>{' '}
                  <span className="text-gray-300">{v.metadata.maxCapacity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Visibility:</span>{' '}
                  <span className="text-gray-300 capitalize">{v.metadata.visibility}</span>
                </div>
              </div>
              {v.changelog && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                  <span className="text-gray-500">Changelog:</span>{' '}
                  <span className="text-gray-300">{v.changelog}</span>
                </div>
              )}
              {v.metadata.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {v.metadata.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-700/50 text-gray-400 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Single review card */
function ReviewCard({
  review,
  onHelpful,
}: {
  review: WorldReview;
  onHelpful: () => void;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5">
      {/* Review header */}
      <div className="flex items-start gap-3 mb-3">
        {review.userAvatarUrl ? (
          <img
            src={review.userAvatarUrl}
            alt={review.userName}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold">
            {review.userName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">{review.userName}</span>
            <span className="text-gray-600 text-xs">
              {new Date(review.createdAt).toLocaleDateString()}
            </span>
          </div>
          <StarRating rating={review.rating} size="sm" />
        </div>
      </div>

      {/* Review body */}
      <h4 className="text-white font-medium mb-1">{review.title}</h4>
      <p className="text-gray-400 text-sm leading-relaxed">{review.body}</p>

      {/* Helpful button */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={onHelpful}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-400 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          Helpful ({review.helpful})
        </button>
      </div>
    </div>
  );
}

/** Related world card (compact) */
function RelatedWorldCard({
  world,
  onClick,
}: {
  world: WorldSummary;
  onClick: () => void;
}) {
  return (
    <div
      className="group bg-gray-800 rounded-lg overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-video overflow-hidden">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700" />
        )}
      </div>
      <div className="p-3">
        <h4 className="text-white text-sm font-medium line-clamp-1 group-hover:text-indigo-300 transition-colors">
          {world.title}
        </h4>
        <p className="text-gray-500 text-xs mt-0.5">{world.creatorName}</p>
        <div className="flex items-center gap-1 mt-1">
          <StarRating rating={world.avgRating} size="sm" />
          {world.ratingCount > 0 && (
            <span className="text-xs text-gray-600">({world.ratingCount})</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorldDetailPage({
  worldId,
  onJoinWorld,
  onWorldClick,
  onBack,
}: WorldDetailPageProps) {
  // -- State --
  const [world, setWorld] = useState<WorldDetail | null>(null);
  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [relatedWorlds, setRelatedWorlds] = useState<WorldSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // -- Fetch world data --
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const [worldData, similar] = await Promise.all([
          worldsAPI.getWorld(worldId),
          worldsAPI.getSimilarWorlds(worldId, 6),
        ]);

        if (!cancelled) {
          setWorld(worldData);
          setRelatedWorlds(similar);

          // Fetch creator profile
          try {
            const profile = await worldsAPI.getCreatorProfile(worldData.creatorId);
            if (!cancelled) setCreator(profile);
          } catch {
            // Creator profile may not exist
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load world');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [worldId]);

  // -- Review submission --
  const handleSubmitReview = useCallback(async () => {
    if (!world || reviewRating === 0 || !reviewTitle.trim()) return;
    setSubmittingReview(true);

    try {
      await worldsAPI.addReview(world.id, reviewRating, reviewTitle, reviewBody);
      // Refresh world data
      const updated = await worldsAPI.getWorld(worldId);
      setWorld(updated);
      setShowReviewForm(false);
      setReviewRating(0);
      setReviewTitle('');
      setReviewBody('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  }, [world, worldId, reviewRating, reviewTitle, reviewBody]);

  // -- Follow toggle --
  const handleFollowToggle = useCallback(async () => {
    if (!world) return;
    try {
      if (isFollowing) {
        await worldsAPI.unfollowCreator(world.creatorId);
      } else {
        await worldsAPI.followCreator(world.creatorId);
      }
      setIsFollowing(!isFollowing);
    } catch {
      // Non-fatal
    }
  }, [world, isFollowing]);

  // -- Helpful review --
  const handleReviewHelpful = useCallback(async (reviewId: string) => {
    if (!world) return;
    try {
      await worldsAPI.markReviewHelpful(world.id, reviewId);
      const updated = await worldsAPI.getWorld(worldId);
      setWorld(updated);
    } catch {
      // Non-fatal
    }
  }, [world, worldId]);

  // -- Format date --
  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  // -- Rating distribution --
  const ratingDistribution = useMemo(() => {
    if (!world) return Array(5).fill(0);
    const dist = Array(5).fill(0);
    for (const review of world.reviews) {
      const idx = Math.min(4, Math.max(0, Math.round(review.rating) - 1));
      dist[idx]++;
    }
    return dist;
  }, [world]);

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 animate-pulse">
        <div className="h-80 bg-gray-800" />
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-2/3" />
          <div className="h-4 bg-gray-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !world) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-2">Failed to load world</div>
          <p className="text-gray-500">{error ?? 'World not found'}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const sortedReviews = [...world.reviews].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ================================================================== */}
      {/* Hero Image */}
      {/* ================================================================== */}
      <section className="relative h-72 md:h-96 overflow-hidden">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />

        {/* Back button */}
        {onBack && (
          <button
            onClick={onBack}
            className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-black/40 backdrop-blur rounded-lg text-white/80 hover:text-white hover:bg-black/60 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <CategoryTag category={world.category} />
              <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                world.ageRating === 'everyone'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : world.ageRating === 'teen'
                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}>
                {world.ageRating === 'everyone' ? 'E' : world.ageRating === 'teen' ? 'T' : 'M'} - {world.ageRating}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">{world.title}</h1>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Main Content */}
      {/* ================================================================== */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Creator + Rating Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Creator profile */}
              <div className="flex items-center gap-3">
                {world.creatorAvatarUrl ? (
                  <img
                    src={world.creatorAvatarUrl}
                    alt={world.creatorName}
                    className="w-12 h-12 rounded-full border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-lg border-2 border-gray-700">
                    {world.creatorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{world.creatorName}</span>
                    {creator?.verified && (
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {creator?.followerCount?.toLocaleString() ?? 0} followers
                  </span>
                </div>
                <button
                  onClick={handleFollowToggle}
                  className={`ml-3 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isFollowing
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-2">
                <StarRating rating={world.avgRating} size="md" />
                <span className="text-white font-semibold">{world.avgRating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({world.ratingCount} reviews)</span>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">About this World</h2>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{world.description}</p>
            </div>

            {/* Tags */}
            {world.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {world.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-800 text-gray-400 text-sm rounded-full border border-gray-700/50 hover:border-gray-600 transition-colors cursor-default"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Screenshots Gallery */}
            {world.screenshotUrls.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Screenshots</h2>
                <ScreenshotGallery screenshots={world.screenshotUrls} />
              </div>
            )}

            {/* Version History */}
            {world.versions.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-3">Version History</h2>
                <VersionHistoryAccordion versions={world.versions} />
              </div>
            )}

            {/* Reviews Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Reviews</h2>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Write a Review
                </button>
              </div>

              {/* Rating distribution */}
              {world.ratingCount > 0 && (
                <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white">{world.avgRating.toFixed(1)}</div>
                      <StarRating rating={world.avgRating} size="md" />
                      <div className="text-gray-500 text-sm mt-1">{world.ratingCount} reviews</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingDistribution[star - 1];
                        const percent = world.ratingCount > 0 ? (count / world.ratingCount) * 100 : 0;
                        return (
                          <div key={star} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-500 w-4 text-right">{star}</span>
                            <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 rounded-full"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="text-gray-600 w-8 text-right">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Review form */}
              {showReviewForm && (
                <div className="mb-6 p-5 bg-gray-800 rounded-xl border border-gray-700/50">
                  <h3 className="text-white font-semibold mb-4">Write Your Review</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Rating</label>
                      <StarRatingInput value={reviewRating} onChange={setReviewRating} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Title</label>
                      <input
                        type="text"
                        value={reviewTitle}
                        onChange={(e) => setReviewTitle(e.target.value)}
                        placeholder="Summarize your experience"
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Review</label>
                      <textarea
                        value={reviewBody}
                        onChange={(e) => setReviewBody(e.target.value)}
                        placeholder="Share your thoughts about this world..."
                        rows={4}
                        className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview || reviewRating === 0 || !reviewTitle.trim()}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                      >
                        {submittingReview ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button
                        onClick={() => setShowReviewForm(false)}
                        className="px-5 py-2.5 text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Review list */}
              {sortedReviews.length > 0 ? (
                <div className="space-y-4">
                  {sortedReviews.map((review) => (
                    <ReviewCard
                      key={review.id}
                      review={review}
                      onHelpful={() => handleReviewHelpful(review.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================== */}
          {/* Right Sidebar: Join CTA + Info */}
          {/* ================================================================== */}
          <div className="space-y-6">
            {/* Join button */}
            <div className="bg-gray-800 rounded-xl border border-gray-700/50 p-6 sticky top-6">
              <button
                onClick={() => onJoinWorld(world.id)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg rounded-xl transition-colors shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
              >
                Join World
              </button>

              <div className="mt-4">
                <PlayerCountDisplay
                  count={world.livePlayerCount}
                  maxCapacity={world.maxCapacity}
                />
              </div>

              {/* Quick stats */}
              <div className="mt-4 space-y-3 pt-4 border-t border-gray-700/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Visits</span>
                  <span className="text-white font-medium">
                    {world.totalVisits >= 1000
                      ? `${(world.totalVisits / 1000).toFixed(1)}k`
                      : world.totalVisits}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Bookmarks</span>
                  <span className="text-white font-medium">{world.totalBookmarks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Version</span>
                  <span className="text-white font-medium">v{world.currentVersion}</span>
                </div>
                {world.publishedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Published</span>
                    <span className="text-white font-medium">{formatDate(world.publishedAt)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Max Capacity</span>
                  <span className="text-white font-medium">{world.maxCapacity} players</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Visibility</span>
                  <span className="text-white font-medium capitalize">{world.visibility}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* Related Worlds */}
        {/* ================================================================== */}
        {relatedWorlds.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Related Worlds</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {relatedWorlds.map((rw) => (
                <RelatedWorldCard
                  key={rw.id}
                  world={rw}
                  onClick={() => onWorldClick(rw.id)}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default WorldDetailPage;
