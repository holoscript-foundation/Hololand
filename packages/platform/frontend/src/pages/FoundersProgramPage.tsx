'use client';

/**
 * FoundersProgramPage
 *
 * Smart routing page that renders different founder components based on the
 * current user's application/onboarding state:
 *
 *   - Not applied         -> FoundersApplication
 *   - Waitlisted/Pending  -> FounderWaitlist
 *   - Approved, onboarding incomplete -> FounderOnboarding
 *   - Onboarding complete -> FoundersDashboard
 *
 * Uses foundersAPI to check user state on mount and handles transitions
 * between states (e.g., waitlist detects approval -> transition to onboarding).
 *
 * @module pages/FoundersProgramPage
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  foundersAPI,
  onboardingAPI,
  type Founder,
  type OnboardingProgress,
} from '../components/founders/foundersApi';
import { FoundersApplication } from '../components/founders/FoundersApplication';
import { FounderWaitlist } from '../components/founders/FounderWaitlist';
import { FounderOnboarding } from '../components/founders/FounderOnboarding';
import { FoundersDashboard } from '../components/founders/FoundersDashboard';

// ============================================================================
// Types
// ============================================================================

/**
 * The resolved view state for the founders program page.
 * Derived from the user's Founder record + onboarding progress.
 */
type FounderViewState =
  | 'loading'
  | 'not_applied'
  | 'waitlisted'
  | 'onboarding'
  | 'dashboard'
  | 'error';

// ============================================================================
// Props
// ============================================================================

export interface FoundersProgramPageProps {
  /** The currently authenticated user ID */
  userId: string;
}

// ============================================================================
// State Resolution Logic
// ============================================================================

/**
 * Determines which view to render based on founder record and onboarding progress.
 */
function resolveViewState(
  founder: Founder | null,
  onboardingProgress: OnboardingProgress | null,
): FounderViewState {
  if (!founder) {
    return 'not_applied';
  }

  switch (founder.applicationStatus) {
    case 'pending':
    case 'waitlisted':
      return 'waitlisted';

    case 'approved': {
      // Check if onboarding is complete
      if (onboardingProgress?.isComplete || founder.onboardingCompletedAt) {
        return 'dashboard';
      }
      return 'onboarding';
    }

    case 'rejected':
      // FounderWaitlist handles the rejected state display
      return 'waitlisted';

    case 'revoked':
      return 'not_applied';

    default:
      return 'not_applied';
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function FoundersProgramPage({ userId }: FoundersProgramPageProps) {
  // ---- State ----
  const [viewState, setViewState] = useState<FounderViewState>('loading');
  const [founder, setFounder] = useState<Founder | null>(null);
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track whether component is mounted (for async safety)
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ---- Load User State ----
  const loadUserState = useCallback(async () => {
    setViewState('loading');
    setError(null);

    try {
      // Step 1: Fetch founder record
      const { data: founderData, error: founderError } = await foundersAPI.getFounder(userId);

      if (!mountedRef.current) return;

      if (founderError) {
        // 404 means no founder record -> not applied
        if (founderError.message.includes('404') || founderError.message.includes('not found')) {
          setFounder(null);
          setViewState('not_applied');
          return;
        }
        throw new Error(founderError.message);
      }

      if (!founderData) {
        setFounder(null);
        setViewState('not_applied');
        return;
      }

      setFounder(founderData);

      // Step 2: If approved, also fetch onboarding progress
      let progress: OnboardingProgress | null = null;
      if (founderData.applicationStatus === 'approved') {
        const { data: progressData } = await onboardingAPI.getProgress(founderData.id);
        if (!mountedRef.current) return;
        progress = progressData;
        setOnboardingProgress(progress);
      }

      // Step 3: Resolve the view
      const resolved = resolveViewState(founderData, progress);
      if (mountedRef.current) {
        setViewState(resolved);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load founder status');
        setViewState('error');
      }
    }
  }, [userId]);

  // Load on mount and when userId changes
  useEffect(() => {
    loadUserState();
  }, [loadUserState]);

  // ---- Transition Handlers ----

  /**
   * Called when FoundersApplication succeeds.
   * The user is now in 'pending' state -> show waitlist.
   */
  const handleApplicationSuccess = useCallback((newFounder: Founder) => {
    setFounder(newFounder);
    setViewState('waitlisted');
  }, []);

  /**
   * Called when FoundersApplication detects user already applied.
   * Reload state to show the correct view.
   */
  const handleAlreadyApplied = useCallback((existingFounder: Founder) => {
    setFounder(existingFounder);
    const resolved = resolveViewState(existingFounder, onboardingProgress);
    setViewState(resolved);
  }, [onboardingProgress]);

  /**
   * Called when FounderWaitlist detects the user has been approved.
   * Transition to onboarding.
   */
  const handleWaitlistApproved = useCallback(async (approvedFounder: Founder) => {
    setFounder(approvedFounder);

    // Fetch onboarding progress for the newly approved founder
    const { data: progressData } = await onboardingAPI.getProgress(approvedFounder.id);
    if (!mountedRef.current) return;

    setOnboardingProgress(progressData);

    if (progressData?.isComplete || approvedFounder.onboardingCompletedAt) {
      setViewState('dashboard');
    } else {
      setViewState('onboarding');
    }
  }, []);

  /**
   * Called when FounderOnboarding completes all steps.
   * Transition to dashboard.
   */
  const handleOnboardingComplete = useCallback(() => {
    setViewState('dashboard');
  }, []);

  // ---- Render ----

  // Loading state
  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-gray-500">Checking your Founders Program status...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (viewState === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error || 'Unable to load your founder status.'}</p>
          <button
            onClick={loadUserState}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Not Applied -> Show application form
  if (viewState === 'not_applied') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <FoundersApplication
          userId={userId}
          onSuccess={handleApplicationSuccess}
          onAlreadyApplied={handleAlreadyApplied}
        />
      </div>
    );
  }

  // Waitlisted/Pending -> Show waitlist page
  if (viewState === 'waitlisted' && founder) {
    return (
      <FounderWaitlist
        userId={userId}
        founderId={founder.id}
        onApproved={handleWaitlistApproved}
      />
    );
  }

  // Onboarding -> Show onboarding wizard
  if (viewState === 'onboarding' && founder) {
    return (
      <FounderOnboarding
        founderId={founder.id}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Dashboard -> Show full founder dashboard
  if (viewState === 'dashboard' && founder) {
    return (
      <FoundersDashboard
        userId={userId}
        founderId={founder.id}
      />
    );
  }

  // Fallback (should not reach here)
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500">Unable to determine your Founders Program status.</p>
        <button
          onClick={loadUserState}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

export default FoundersProgramPage;
