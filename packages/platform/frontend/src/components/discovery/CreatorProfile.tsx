'use client';

/**
 * CreatorProfile Component
 *
 * Public creator profile page for HoloLand with:
 *   - Header: avatar, display name, bio, follower/following count, follow button
 *   - Stats row: worlds published, total views, total remixes, member since
 *   - Worlds tab: grid of published worlds with metrics
 *   - Assets tab: grid of marketplace assets
 *   - Activity tab: recent actions timeline
 *   - "Remix Tree" section showing creator's contribution graph
 *
 * Wires to CurationService creator profiles via discoveryApi.
 *
 * @module discovery/CreatorProfile
 */

import { useState, useEffect, useCallback } from 'react';
import {
  discoveryAPI,
  type CreatorProfile as CreatorProfileType,
  type CreatorWorld,
  type CreatorAsset,
  type CreatorActivity,
  type RemixNode,
  type CreatorBadge,
} from './discoveryApi';

// ============================================================================
// Props
// ============================================================================

export interface CreatorProfileProps {
  /** The creator's user ID */
  creatorId: string;
  /** Called when user clicks a world card */
  onWorldClick: (worldId: string) => void;
  /** Called when user clicks an asset */
  onAssetClick?: (assetId: string) => void;
  /** Called when user navigates back */
  onBack: () => void;
}

// ============================================================================
// Types
// ============================================================================

type ProfileTab = 'worlds' | 'assets' | 'activity';

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
    month: 'short',
  });
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  const years = Math.floor(months / 12);
  return `${years}y ago`;
}

// ============================================================================
// Sub-Components
// ============================================================================

/** Star rating */
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

/** Profile header section */
function ProfileHeader({
  profile,
  isFollowing,
  onFollow,
}: {
  profile: CreatorProfileType;
  isFollowing: boolean;
  onFollow: () => void;
}) {
  return (
    <div className="relative">
      {/* Banner */}
      <div className="h-48 md:h-64 overflow-hidden">
        {profile.bannerUrl ? (
          <img
            src={profile.bannerUrl}
            alt="Profile banner"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
      </div>

      {/* Profile info */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-4 -mt-16 md:-mt-20">
          {/* Avatar */}
          <div className="relative">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-gray-900 object-cover"
              />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl border-4 border-gray-900 bg-indigo-600 flex items-center justify-center text-4xl text-white font-bold">
                {profile.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {profile.verified && (
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>

          {/* Name and bio */}
          <div className="flex-1 min-w-0 pb-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-white">{profile.displayName}</h1>
              <button
                onClick={onFollow}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                  isFollowing
                    ? 'bg-gray-700 text-gray-300 hover:bg-red-600/20 hover:text-red-400'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                }`}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
            <p className="text-gray-400 text-sm max-w-2xl line-clamp-3">{profile.bio}</p>

            {/* Social links */}
            <div className="flex items-center gap-3 mt-3">
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Website
                </a>
              )}
              {Object.entries(profile.socialLinks).map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 capitalize transition-colors"
                >
                  {platform}
                </a>
              ))}
            </div>

            {/* Follower counts */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-white font-semibold">
                {formatCount(profile.followerCount)}{' '}
                <span className="text-gray-400 font-normal">followers</span>
              </span>
              <span className="text-white font-semibold">
                {formatCount(profile.followingCount)}{' '}
                <span className="text-gray-400 font-normal">following</span>
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        {profile.badges.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {profile.badges.map((badge) => (
              <BadgePill key={badge.id} badge={badge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Badge pill */
function BadgePill({ badge }: { badge: CreatorBadge }) {
  const tierColors: Record<string, string> = {
    bronze: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    silver: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    gold: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    platinum: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        tierColors[badge.tier] ?? 'bg-gray-700 text-gray-300 border-gray-600'
      }`}
      title={badge.description}
    >
      {badge.iconUrl && <img src={badge.iconUrl} alt="" className="w-3.5 h-3.5" />}
      <span>{badge.name}</span>
    </div>
  );
}

/** Stats row */
function StatsRow({ profile }: { profile: CreatorProfileType }) {
  const stats = [
    { label: 'Worlds Published', value: formatCount(profile.worldIds.length), icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Total Views', value: formatCount(profile.totalViews), icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Total Remixes', value: formatCount(profile.totalRemixes), icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { label: 'Member Since', value: formatDate(profile.joinedAt), icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon }) => (
          <div key={label} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              <span className="text-xs text-gray-400">{label}</span>
            </div>
            <div className="text-xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** World card in the creator's grid */
function CreatorWorldCard({
  world,
  onClick,
}: {
  world: CreatorWorld;
  onClick: () => void;
}) {
  return (
    <div
      className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden">
        {world.thumbnailUrl ? (
          <img src={world.thumbnailUrl} alt={world.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
            <svg className="w-12 h-12 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        {(world.livePlayerCount ?? 0) > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {world.livePlayerCount} playing
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors">
          {world.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-1 mb-2">{world.description}</p>
        <div className="flex items-center justify-between">
          <StarRating rating={world.avgRating} count={world.ratingCount} />
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{formatCount(world.totalVisits)} visits</span>
            {world.remixCount > 0 && <span>{formatCount(world.remixCount)} remixes</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Asset card */
function CreatorAssetCard({
  asset,
  onClick,
}: {
  asset: CreatorAsset;
  onClick: () => void;
}) {
  return (
    <div
      className="group bg-gray-800 rounded-xl overflow-hidden border border-gray-700/50 hover:border-indigo-500/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="relative h-40 overflow-hidden">
        {asset.thumbnailUrl ? (
          <img src={asset.thumbnailUrl} alt={asset.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        {asset.priceCents === 0 && (
          <span className="absolute top-2 right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded">FREE</span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-white font-semibold text-sm line-clamp-1 mb-1 group-hover:text-indigo-300 transition-colors">
          {asset.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">
            {asset.priceCents === 0 ? 'Free' : `$${(asset.priceCents / 100).toFixed(2)}`}
          </span>
          <span className="text-xs text-gray-500">{formatCount(asset.downloadCount)} downloads</span>
        </div>
      </div>
    </div>
  );
}

/** Activity timeline */
function ActivityTimeline({ activities }: { activities: CreatorActivity[] }) {
  const typeIcons: Record<string, { icon: string; color: string }> = {
    world_published: { icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-400 bg-green-400/10' },
    world_updated: { icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', color: 'text-blue-400 bg-blue-400/10' },
    asset_listed: { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-purple-400 bg-purple-400/10' },
    badge_earned: { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'text-yellow-400 bg-yellow-400/10' },
    remix_created: { icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z', color: 'text-pink-400 bg-pink-400/10' },
    collection_curated: { icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547', color: 'text-cyan-400 bg-cyan-400/10' },
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, idx) => {
        const { icon, color } = typeIcons[activity.type] ?? { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a10 10 0 11-20 0 10 10 0 0120 0z', color: 'text-gray-400 bg-gray-400/10' };

        return (
          <div key={activity.id} className="flex gap-4 py-4 border-b border-gray-800 last:border-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-300">{activity.description}</p>
              {activity.targetTitle && (
                <p className="text-xs text-indigo-400 mt-0.5">{activity.targetTitle}</p>
              )}
              <p className="text-xs text-gray-600 mt-1">{timeAgo(activity.timestamp)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Remix tree visualization */
function RemixTreeSection({ nodes }: { nodes: RemixNode[] }) {
  if (nodes.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <p className="text-gray-500 text-sm">No remix contributions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {nodes.map((node) => (
        <RemixTreeNode key={node.worldId} node={node} />
      ))}
    </div>
  );
}

function RemixTreeNode({ node }: { node: RemixNode }) {
  const [expanded, setExpanded] = useState(node.depth === 0);

  return (
    <div style={{ marginLeft: `${node.depth * 24}px` }}>
      <div
        className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {node.children.length > 0 && (
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
        {node.children.length === 0 && <div className="w-4" />}

        {/* Connector line */}
        {node.depth > 0 && (
          <div className="w-0.5 h-4 bg-indigo-500/30 -ml-6 -mt-4 absolute" />
        )}

        {node.thumbnailUrl ? (
          <img src={node.thumbnailUrl} alt={node.title} className="w-8 h-8 rounded object-cover" />
        ) : (
          <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}

        <span className="text-sm text-gray-300">{node.title}</span>
        {node.children.length > 0 && (
          <span className="text-xs text-gray-600">{node.children.length} remix{node.children.length !== 1 ? 'es' : ''}</span>
        )}
      </div>

      {expanded && node.children.map((child) => (
        <RemixTreeNode key={child.worldId} node={child} />
      ))}
    </div>
  );
}

/** Skeleton loader for profile */
function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900 animate-pulse">
      <div className="h-64 bg-gray-800" />
      <div className="max-w-7xl mx-auto px-8 -mt-20">
        <div className="flex gap-4 items-end">
          <div className="w-36 h-36 rounded-2xl bg-gray-700 border-4 border-gray-900" />
          <div className="flex-1 space-y-3 pb-2">
            <div className="h-8 bg-gray-700 rounded w-64" />
            <div className="h-4 bg-gray-700 rounded w-96" />
            <div className="h-4 bg-gray-700 rounded w-48" />
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CreatorProfile({
  creatorId,
  onWorldClick,
  onAssetClick,
  onBack,
}: CreatorProfileProps) {
  // -- State --
  const [profile, setProfile] = useState<CreatorProfileType | null>(null);
  const [worlds, setWorlds] = useState<CreatorWorld[]>([]);
  const [assets, setAssets] = useState<CreatorAsset[]>([]);
  const [activities, setActivities] = useState<CreatorActivity[]>([]);
  const [remixTree, setRemixTree] = useState<RemixNode[]>([]);

  const [activeTab, setActiveTab] = useState<ProfileTab>('worlds');
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // -- Fetch profile data --
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchProfile = async () => {
      try {
        const [profileData, worldsData] = await Promise.all([
          discoveryAPI.getCreatorProfile(creatorId),
          discoveryAPI.getCreatorWorlds(creatorId, 50, 0),
        ]);

        if (!cancelled) {
          setProfile(profileData);
          setWorlds(worldsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();
    return () => { cancelled = true; };
  }, [creatorId]);

  // -- Lazy load tab data --
  useEffect(() => {
    if (activeTab === 'assets' && assets.length === 0) {
      discoveryAPI.getCreatorAssets(creatorId, 50, 0)
        .then(setAssets)
        .catch(() => setAssets([]));
    } else if (activeTab === 'activity' && activities.length === 0) {
      discoveryAPI.getCreatorActivity(creatorId, 50, 0)
        .then(setActivities)
        .catch(() => setActivities([]));
    }
  }, [activeTab, creatorId, assets.length, activities.length]);

  // -- Lazy load remix tree --
  useEffect(() => {
    if (remixTree.length === 0 && profile) {
      discoveryAPI.getRemixTree(creatorId)
        .then(setRemixTree)
        .catch(() => setRemixTree([]));
    }
  }, [creatorId, profile, remixTree.length]);

  // -- Follow toggle --
  const handleFollow = useCallback(async () => {
    try {
      if (isFollowing) {
        await discoveryAPI.unfollowCreator(creatorId);
        setIsFollowing(false);
        if (profile) {
          setProfile({ ...profile, followerCount: profile.followerCount - 1 });
        }
      } else {
        await discoveryAPI.followCreator(creatorId);
        setIsFollowing(true);
        if (profile) {
          setProfile({ ...profile, followerCount: profile.followerCount + 1 });
        }
      }
    } catch {
      // Revert optimistic update would go here
    }
  }, [isFollowing, creatorId, profile]);

  // -- Render --
  if (loading) return <ProfileSkeleton />;

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">{error ?? 'Profile not found'}</div>
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
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      {/* Profile Header */}
      <ProfileHeader
        profile={profile}
        isFollowing={isFollowing}
        onFollow={handleFollow}
      />

      {/* Stats Row */}
      <StatsRow profile={profile} />

      {/* Tab Navigation */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 border-b border-gray-800">
        <div className="flex items-center gap-1">
          {(['worlds', 'assets', 'activity'] as ProfileTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-indigo-400 border-indigo-400'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {activeTab === 'worlds' && (
          worlds.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {worlds.map((world) => (
                <CreatorWorldCard
                  key={world.worldId}
                  world={world}
                  onClick={() => onWorldClick(world.worldId)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500">No published worlds yet</p>
            </div>
          )
        )}

        {activeTab === 'assets' && (
          assets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <CreatorAssetCard
                  key={asset.id}
                  asset={asset}
                  onClick={() => onAssetClick?.(asset.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <svg className="w-12 h-12 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-gray-500">No marketplace assets</p>
            </div>
          )
        )}

        {activeTab === 'activity' && (
          <ActivityTimeline activities={activities} />
        )}
      </div>

      {/* Remix Tree Section */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 border-t border-gray-800">
        <h2 className="text-lg font-bold text-white mb-4">Remix Tree</h2>
        <p className="text-sm text-gray-500 mb-4">
          Contribution graph showing worlds created and their remixes
        </p>
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/50">
          <RemixTreeSection nodes={remixTree} />
        </div>
      </div>
    </div>
  );
}

export default CreatorProfile;
