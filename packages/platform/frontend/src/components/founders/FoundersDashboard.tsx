'use client';

/**
 * FoundersDashboard Component
 *
 * Founder-specific dashboard showing program status, quotas, referrals,
 * onboarding progress, early access features, and recent activity.
 *
 * Features:
 *   - Badge tier display with icon (Pioneer/Visionary/Architect)
 *   - Invite code with copy-to-clipboard and share link
 *   - Referral count and leaderboard position
 *   - Quota usage bars (worlds, assets, storage)
 *   - Onboarding progress indicator (6 steps)
 *   - Early access features toggle list
 *   - Recent activity feed
 *
 * @module founders/FoundersDashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { useVRDashboardAgent } from '../../ag-ui/hooks';
import { AgentOverlay, AgentThinkingIndicator } from '../../ag-ui/components';
import {
  foundersAPI,
  onboardingAPI,
  type Founder,
  type FounderBadgeTier,
  type OnboardingProgress,
  type FounderQuotas,
  type FounderUsage,
  type LeaderboardEntry,
  type ActivityItem,
  type EarlyAccessFeature,
} from './foundersApi';

// ============================================================================
// Props
// ============================================================================

interface FoundersDashboardProps {
  userId: string;
  founderId: string;
}

// ============================================================================
// Badge Configuration
// ============================================================================

const BADGE_CONFIG: Record<FounderBadgeTier, { label: string; color: string; bgColor: string; icon: string }> = {
  pioneer: {
    label: 'Pioneer',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  },
  visionary: {
    label: 'Visionary',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    icon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
  },
  architect: {
    label: 'Architect',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  },
};

const ONBOARDING_STEP_LABELS: Record<string, string> = {
  welcome: 'Welcome',
  profile: 'Profile Setup',
  first_world: 'First World',
  tutorial: 'Tutorial',
  community: 'Community',
  complete: 'Complete',
};

// ============================================================================
// Sub-Components
// ============================================================================

/** Badge tier display card */
function BadgeTierCard({ tier }: { tier: FounderBadgeTier | null }) {
  const badge = tier ? BADGE_CONFIG[tier] : null;

  if (!badge) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
        <p className="text-gray-500 text-sm">Badge tier pending...</p>
      </div>
    );
  }

  return (
    <div className={`${badge.bgColor} border rounded-lg p-6 text-center`}>
      <div className="flex justify-center mb-3">
        <svg className={`w-12 h-12 ${badge.color}`} fill="currentColor" viewBox="0 0 24 24">
          <path d={badge.icon} />
        </svg>
      </div>
      <h3 className={`text-xl font-bold ${badge.color}`}>{badge.label}</h3>
      <p className="text-gray-500 text-xs mt-1 uppercase tracking-wide font-medium">Founder Tier</p>
    </div>
  );
}

/** Invite code with copy button */
function InviteCodeCard({ inviteCode }: { inviteCode: string | null }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/founders/apply?ref=${inviteCode}`
    : '';

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  if (!inviteCode) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Your Invite Code</h3>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-gray-100 px-4 py-2 rounded-md text-lg font-mono font-bold text-center tracking-widest">
          {inviteCode}
        </code>
        <button
          onClick={() => handleCopy(inviteCode)}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
          }`}
          aria-label={copied ? 'Copied!' : 'Copy invite code'}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Share Link</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 bg-gray-50 px-3 py-1.5 rounded-md text-xs text-gray-600 border border-gray-200 font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={() => handleCopy(shareUrl)}
            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-md text-xs font-medium border border-gray-200 hover:bg-gray-200"
            aria-label="Copy share link"
          >
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

/** Quota usage bar */
function QuotaBar({
  label,
  used,
  max,
  unit,
}: {
  label: string;
  used: number;
  max: number;
  unit: string;
}) {
  const percent = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const barColor =
    percent >= 90 ? 'bg-red-500' : percent >= 70 ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">
          {used.toLocaleString()} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div
        className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label} usage`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {percent >= 80 && (
        <p className={`text-xs mt-1 ${percent >= 90 ? 'text-red-600' : 'text-yellow-600'}`}>
          {percent >= 90 ? 'Critical: ' : 'Warning: '}
          {percent.toFixed(0)}% used
        </p>
      )}
    </div>
  );
}

/** Onboarding progress indicator */
function OnboardingProgressCard({ progress }: { progress: OnboardingProgress | null }) {
  if (!progress) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Onboarding</h3>
        <span className="text-xs text-gray-500">{progress.progressPercent}% complete</span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.isComplete ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress.progressPercent}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {['welcome', 'profile', 'first_world', 'tutorial', 'community', 'complete'].map(
          (step, idx) => {
            const isCompleted = progress.completedSteps.includes(step as any);
            const isCurrent = progress.currentStep === step;

            return (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? 'bg-green-500 text-white'
                      : isCurrent
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-[9px] mt-1 text-center leading-tight ${
                    isCurrent ? 'text-blue-600 font-bold' : isCompleted ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {ONBOARDING_STEP_LABELS[step] || step}
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

/** Early access feature toggle */
function FeatureToggle({
  feature,
  onToggle,
}: {
  feature: EarlyAccessFeature;
  onToggle: (id: string, enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{feature.name}</p>
        <p className="text-xs text-gray-500">{feature.description}</p>
      </div>
      <button
        onClick={() => onToggle(feature.id, !feature.enabled)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          feature.enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
        role="switch"
        aria-checked={feature.enabled}
        aria-label={`Toggle ${feature.name}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            feature.enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

/** Activity feed item */
function ActivityFeedItem({ item }: { item: ActivityItem }) {
  const iconMap: Record<string, { icon: string; color: string }> = {
    world_created: { icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064', color: 'text-blue-500' },
    asset_added: { icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', color: 'text-green-500' },
    referral: { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-purple-500' },
    badge_upgrade: { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', color: 'text-yellow-500' },
    onboarding: { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-teal-500' },
  };

  const config = iconMap[item.type] || { icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-gray-500' };

  const timeAgo = getTimeAgo(item.createdAt);

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <svg className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={config.icon} />
      </svg>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800">{item.description}</p>
        <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
      </div>
    </div>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ============================================================================
// Main Component
// ============================================================================

export function FoundersDashboard({ userId, founderId }: FoundersDashboardProps) {
  // AG-UI: Agent interaction for founders dashboard
  const { reportActivity, isThinking, agentState } = useVRDashboardAgent();

  const [founder, setFounder] = useState<Founder | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const [quotas, setQuotas] = useState<FounderQuotas | null>(null);
  const [usage, setUsage] = useState<FounderUsage | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [features, setFeatures] = useState<EarlyAccessFeature[]>([]);
  const [loading, setLoading] = useState(true);

  // Data loading
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      const [
        founderRes,
        progressRes,
        quotasRes,
        usageRes,
        leaderboardRes,
        activityRes,
        featuresRes,
      ] = await Promise.all([
        foundersAPI.getFounder(userId),
        onboardingAPI.getProgress(founderId),
        foundersAPI.getQuotas(userId),
        foundersAPI.getUsage(userId),
        foundersAPI.getLeaderboard(10),
        foundersAPI.getActivity(founderId),
        foundersAPI.getEarlyAccessFeatures(founderId),
      ]);

      if (founderRes.data) setFounder(founderRes.data);
      if (progressRes.data) setOnboardingProgress(progressRes.data);
      if (quotasRes.data) setQuotas(quotasRes.data);
      if (usageRes.data) setUsage(usageRes.data);
      if (leaderboardRes.data) setLeaderboard(leaderboardRes.data);
      if (activityRes.data) setActivity(activityRes.data);
      if (featuresRes.data) setFeatures(featuresRes.data);

      setLoading(false);
    }

    loadDashboard();
  }, [userId, founderId]);

  // AG-UI: Report founders dashboard load to agent
  useEffect(() => {
    if (!loading && founder) {
      reportActivity('dashboard_navigation', {
        panel: 'founders',
        dashboardType: 'founders',
        badgeTier: founder.badgeTier,
        referralCount: founder.referralCount,
      });
    }
  }, [loading, founder, reportActivity]);

  // Feature toggle handler
  const handleFeatureToggle = useCallback(
    async (featureId: string, enabled: boolean) => {
      const { data } = await foundersAPI.toggleFeature(founderId, featureId, enabled);
      if (data) {
        setFeatures((prev) =>
          prev.map((f) => (f.id === featureId ? { ...f, enabled: data.enabled } : f)),
        );
      }
    },
    [founderId],
  );

  // Find current user's leaderboard position
  const myLeaderboardPosition = leaderboard.findIndex((e) => e.founderId === founderId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-500">Loading your Founder dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ position: 'relative' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Founders Dashboard</h1>
              <p className="text-gray-600">Your Founders Program hub</p>
            </div>
            {/* AG-UI: Agent thinking indicator */}
            <AgentThinkingIndicator />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="space-y-6">
            {/* Badge tier */}
            <BadgeTierCard tier={founder?.badgeTier || null} />

            {/* Invite code */}
            <InviteCodeCard inviteCode={founder?.inviteCode || null} />

            {/* Referral stats */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Referrals</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{founder?.referralCount || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Referrals</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {myLeaderboardPosition >= 0 ? `#${myLeaderboardPosition + 1}` : '--'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Leaderboard Rank</p>
                </div>
              </div>
            </div>
          </div>

          {/* Center column */}
          <div className="space-y-6">
            {/* Quota usage */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Quota Usage</h3>
              {quotas && usage ? (
                <>
                  <QuotaBar
                    label="Worlds"
                    used={usage.worldsUsed}
                    max={quotas.maxWorlds}
                    unit="worlds"
                  />
                  <QuotaBar
                    label="Assets"
                    used={usage.assetsUsed}
                    max={quotas.maxAssets}
                    unit="assets"
                  />
                  <QuotaBar
                    label="Storage"
                    used={usage.storageMbUsed}
                    max={quotas.maxStorageMb}
                    unit="MB"
                  />
                </>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">Loading quotas...</p>
              )}
            </div>

            {/* Onboarding progress */}
            <OnboardingProgressCard progress={onboardingProgress} />

            {/* Early access features */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                Early Access Features
              </h3>
              {features.length > 0 ? (
                <div>
                  {features.map((feature) => (
                    <FeatureToggle
                      key={feature.id}
                      feature={feature}
                      onToggle={handleFeatureToggle}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">
                  No early access features available yet.
                </p>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Recent activity */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                Recent Activity
              </h3>
              {activity.length > 0 ? (
                <div>
                  {activity.slice(0, 10).map((item) => (
                    <ActivityFeedItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">
                  No activity yet. Start building to see your history here.
                </p>
              )}
            </div>

            {/* Referral leaderboard */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                Referral Leaderboard
              </h3>
              {leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((entry, idx) => {
                    const isMe = entry.founderId === founderId;
                    return (
                      <div
                        key={entry.founderId}
                        className={`flex items-center gap-3 py-1.5 px-2 rounded ${
                          isMe ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span className="text-sm font-bold text-gray-400 w-6 text-right">
                          #{idx + 1}
                        </span>
                        <span className={`text-sm flex-1 ${isMe ? 'font-bold text-blue-700' : 'text-gray-700'}`}>
                          {entry.username}
                          {isMe && ' (you)'}
                        </span>
                        {entry.badgeTier && (
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              entry.badgeTier === 'architect'
                                ? 'bg-blue-100 text-blue-700'
                                : entry.badgeTier === 'visionary'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {entry.badgeTier}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 tabular-nums">
                          {entry.referralCount} refs
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">
                  Leaderboard data loading...
                </p>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* AG-UI: Agent overlay */}
      <AgentOverlay position="bottom-right" showChat={true} showSuggestions={true} />
    </div>
  );
}
