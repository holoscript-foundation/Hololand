/**
 * Founders Program API Client
 *
 * Provides typed fetch wrappers for the FoundersProgramService and
 * FounderOnboardingService backend endpoints.
 *
 * Follows the same pattern as @/lib/api used by Dashboard and SignupForm.
 *
 * @module founders/foundersApi
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// Types (mirrors backend types for frontend use)
// ============================================================================

export type FounderApplicationStatus =
  | 'pending'
  | 'waitlisted'
  | 'approved'
  | 'rejected'
  | 'revoked';

export type FounderBadgeTier = 'pioneer' | 'visionary' | 'architect';

export type FounderOnboardingStep =
  | 'welcome'
  | 'profile'
  | 'first_world'
  | 'tutorial'
  | 'community'
  | 'complete';

export interface Founder {
  id: string;
  userId: string;
  applicationStatus: FounderApplicationStatus;
  inviteCode: string | null;
  score: number;
  badgeTier: FounderBadgeTier | null;
  onboardingStep: FounderOnboardingStep;
  onboardingCompletedAt: string | null;
  referredBy: string | null;
  referralCount: number;
  quotaWorlds: number;
  quotaAssets: number;
  quotaStorageMb: number;
  portfolioUrl: string | null;
  applicationNote: string | null;
  createdAt: string;
  approvedAt: string | null;
  updatedAt: string;
}

export interface OnboardingProgress {
  founderId: string;
  userId: string;
  currentStep: FounderOnboardingStep;
  currentStepIndex: number;
  totalSteps: number;
  progressPercent: number;
  completedSteps: FounderOnboardingStep[];
  remainingSteps: FounderOnboardingStep[];
  isComplete: boolean;
  templateWorldsForked: number;
  assetsGranted: number;
}

export interface OnboardingStepConfig {
  step: FounderOnboardingStep;
  title: string;
  description: string;
  estimatedMinutes: number;
}

export interface WaitlistInfo {
  position: number;
  totalCount: number;
  estimatedWaitDays: number;
}

export interface FounderQuotas {
  maxWorlds: number;
  maxAssets: number;
  maxStorageMb: number;
}

export interface FounderUsage {
  worldsUsed: number;
  assetsUsed: number;
  storageMbUsed: number;
}

export interface ActivityItem {
  id: string;
  type: 'world_created' | 'asset_added' | 'referral' | 'badge_upgrade' | 'onboarding';
  description: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  founderId: string;
  username: string;
  referralCount: number;
  badgeTier: FounderBadgeTier | null;
}

export interface EarlyAccessFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return {
        data: null,
        error: { message: body.message || body.error || `Request failed (${response.status})` },
      };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : 'Network error' },
    };
  }
}

// ============================================================================
// Founders Program API
// ============================================================================

export const foundersAPI = {
  /** Submit a new founder application */
  submitApplication(params: {
    userId: string;
    portfolioUrl?: string;
    applicationNote?: string;
    referralCode?: string;
  }): Promise<ApiResponse<Founder>> {
    return apiRequest<Founder>('/founders/apply', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /** Get the current user's founder record */
  getFounder(userId: string): Promise<ApiResponse<Founder>> {
    return apiRequest<Founder>(`/founders/user/${userId}`);
  },

  /** Get waitlist info for the current founder */
  getWaitlistInfo(founderId: string): Promise<ApiResponse<WaitlistInfo>> {
    return apiRequest<WaitlistInfo>(`/founders/${founderId}/waitlist`);
  },

  /** Get quotas for a user */
  getQuotas(userId: string): Promise<ApiResponse<FounderQuotas>> {
    return apiRequest<FounderQuotas>(`/founders/user/${userId}/quotas`);
  },

  /** Get current usage for a user */
  getUsage(userId: string): Promise<ApiResponse<FounderUsage>> {
    return apiRequest<FounderUsage>(`/founders/user/${userId}/usage`);
  },

  /** Get referral leaderboard */
  getLeaderboard(limit?: number): Promise<ApiResponse<LeaderboardEntry[]>> {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest<LeaderboardEntry[]>(`/founders/leaderboard${params}`);
  },

  /** Get recent activity feed for a founder */
  getActivity(founderId: string): Promise<ApiResponse<ActivityItem[]>> {
    return apiRequest<ActivityItem[]>(`/founders/${founderId}/activity`);
  },

  /** Get early access features for a founder */
  getEarlyAccessFeatures(founderId: string): Promise<ApiResponse<EarlyAccessFeature[]>> {
    return apiRequest<EarlyAccessFeature[]>(`/founders/${founderId}/features`);
  },

  /** Toggle an early access feature */
  toggleFeature(founderId: string, featureId: string, enabled: boolean): Promise<ApiResponse<EarlyAccessFeature>> {
    return apiRequest<EarlyAccessFeature>(`/founders/${founderId}/features/${featureId}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  },
};

// ============================================================================
// Onboarding API
// ============================================================================

export const onboardingAPI = {
  /** Get onboarding progress */
  getProgress(founderId: string): Promise<ApiResponse<OnboardingProgress>> {
    return apiRequest<OnboardingProgress>(`/founders/${founderId}/onboarding`);
  },

  /** Advance to the next onboarding step */
  advanceStep(founderId: string): Promise<ApiResponse<OnboardingProgress>> {
    return apiRequest<OnboardingProgress>(`/founders/${founderId}/onboarding/advance`, {
      method: 'POST',
    });
  },

  /** Get all step configurations */
  getStepConfigs(): Promise<ApiResponse<OnboardingStepConfig[]>> {
    return apiRequest<OnboardingStepConfig[]>('/founders/onboarding/steps');
  },

  /** Check if the founder can advance from current step */
  canAdvance(founderId: string): Promise<ApiResponse<{ canAdvance: boolean; reason?: string }>> {
    return apiRequest<{ canAdvance: boolean; reason?: string }>(
      `/founders/${founderId}/onboarding/can-advance`,
    );
  },
};
