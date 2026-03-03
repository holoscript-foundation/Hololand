'use client';

/**
 * FounderOnboarding Component
 *
 * 6-step guided wizard matching the backend state machine:
 *   1. welcome      -> Introduction to the Founders Program
 *   2. profile      -> Complete creator profile setup
 *   3. first_world  -> Template world provisioning
 *   4. tutorial     -> Interactive HoloScript tutorial
 *   5. community    -> Join community channels
 *   6. complete     -> All steps done
 *
 * Features:
 *   - Visual step indicator showing progress
 *   - Each step has appropriate content and action button to advance
 *   - Validates canAdvance before allowing progression
 *   - Integrates with FounderOnboardingService backend API
 *
 * @module founders/FounderOnboarding
 */

import { useState, useEffect, useCallback } from 'react';
import {
  onboardingAPI,
  type OnboardingProgress,
  type OnboardingStepConfig,
  type FounderOnboardingStep,
} from './foundersApi';

// ============================================================================
// Props
// ============================================================================

interface FounderOnboardingProps {
  founderId: string;
  /** Called when onboarding is fully complete */
  onComplete?: () => void;
}

// ============================================================================
// Step Content Configuration
// ============================================================================

interface StepContent {
  icon: string;
  iconBg: string;
  iconColor: string;
  actionLabel: string;
  content: React.ReactNode;
}

function getStepContent(
  step: FounderOnboardingStep,
  config: OnboardingStepConfig | undefined,
): StepContent {
  const defaultContent = {
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    actionLabel: 'Continue',
    content: <p className="text-gray-600">{config?.description || ''}</p>,
  };

  switch (step) {
    case 'welcome':
      return {
        icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        actionLabel: 'Get Started',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">
              Welcome to the HoloLand Founders Program! As a founder, you get exclusive benefits:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <BenefitCard
                title="3x Quotas"
                description="Triple the default limits for worlds, assets, and storage."
                icon="M13 10V3L4 14h7v7l9-11h-7z"
              />
              <BenefitCard
                title="Exclusive Assets"
                description="14 premium assets, materials, and a founder badge model."
                icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
              <BenefitCard
                title="Early Access"
                description="Be the first to try new features and provide feedback."
                icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
              <BenefitCard
                title="Community"
                description="Join exclusive channels and collaborate with fellow founders."
                icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </div>
          </div>
        ),
      };

    case 'profile':
      return {
        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        actionLabel: 'I\'ve Set Up My Profile',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">
              Set up your public creator profile so other founders and community members can discover you.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-gray-700">Your profile should include:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>A display name that represents your creative brand</li>
                <li>A bio describing your interests and expertise</li>
                <li>Portfolio links to showcase your work</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              Tip: A complete profile helps you get discovered in the creator marketplace.
            </p>
          </div>
        ),
      };

    case 'first_world':
      return {
        icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        actionLabel: 'I\'ve Created My World',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">
              Create your first VR world! Choose from 8 templates to get started quickly.
              A Blank Canvas world has been auto-provisioned for you.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                'Blank Canvas', 'Art Gallery', 'Social Hub', 'Learning Lab',
                'Game Arena', 'Marketplace', 'Nature Sanctuary', 'Sci-Fi Station',
              ].map((template) => (
                <div
                  key={template}
                  className="bg-gray-50 rounded px-3 py-2 text-gray-700 border border-gray-200"
                >
                  {template}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              You can fork additional templates later from the World Builder.
            </p>
          </div>
        ),
      };

    case 'tutorial':
      return {
        icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600',
        actionLabel: 'I\'ve Completed the Tutorial',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">
              Learn the basics of HoloScript to build interactive VR experiences.
              This tutorial covers the fundamentals you need to get started.
            </p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <p className="font-medium text-gray-700">Tutorial covers:</p>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>Creating and positioning objects in 3D space</li>
                <li>Adding interactivity with event handlers</li>
                <li>Using the component system for reusable elements</li>
                <li>Working with materials, lighting, and audio</li>
                <li>Publishing your world for others to visit</li>
              </ol>
            </div>
            <p className="text-xs text-gray-500">
              Estimated time: ~15 minutes. You received your starter pack of 14 exclusive assets!
            </p>
          </div>
        ),
      };

    case 'community':
      return {
        icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
        iconBg: 'bg-teal-100',
        iconColor: 'text-teal-600',
        actionLabel: 'I\'ve Joined the Community',
        content: (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect with fellow founders! Join the exclusive community channels to share ideas,
              get feedback, and collaborate on projects.
            </p>
            <div className="space-y-2">
              <CommunityChannel
                name="#founders-general"
                description="General discussion and announcements"
                members={156}
              />
              <CommunityChannel
                name="#founders-showcase"
                description="Share your worlds and get feedback"
                members={89}
              />
              <CommunityChannel
                name="#founders-collab"
                description="Find collaborators for joint projects"
                members={42}
              />
              <CommunityChannel
                name="#founders-support"
                description="Technical help from the team and peers"
                members={134}
              />
            </div>
          </div>
        ),
      };

    case 'complete':
      return {
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        actionLabel: 'Go to Dashboard',
        content: (
          <div className="space-y-4 text-center">
            <p className="text-gray-600 text-lg">
              Congratulations! You have completed the Founders Program onboarding.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Your founder benefits are now fully active:</p>
              <ul className="text-sm text-green-700 mt-2 space-y-1">
                <li>3x quota limits enabled</li>
                <li>Starter pack (14 assets) granted</li>
                <li>Tier-specific badge model unlocked</li>
                <li>Community channels accessible</li>
              </ul>
            </div>
          </div>
        ),
      };

    default:
      return defaultContent;
  }
}

// ============================================================================
// Helper Components
// ============================================================================

function BenefitCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
        <h4 className="font-bold text-sm text-gray-800">{title}</h4>
      </div>
      <p className="text-xs text-gray-600">{description}</p>
    </div>
  );
}

function CommunityChannel({
  name,
  description,
  members,
}: {
  name: string;
  description: string;
  members: number;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-between">
      <div>
        <p className="font-mono text-sm font-bold text-gray-800">{name}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <span className="text-xs text-gray-400 shrink-0">{members} members</span>
    </div>
  );
}

// ============================================================================
// Step Indicator
// ============================================================================

const ALL_STEPS: FounderOnboardingStep[] = [
  'welcome',
  'profile',
  'first_world',
  'tutorial',
  'community',
  'complete',
];

const STEP_LABELS: Record<FounderOnboardingStep, string> = {
  welcome: 'Welcome',
  profile: 'Profile',
  first_world: 'World',
  tutorial: 'Tutorial',
  community: 'Community',
  complete: 'Done',
};

function OnboardingStepIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: FounderOnboardingStep;
  completedSteps: FounderOnboardingStep[];
}) {
  return (
    <div className="flex items-center justify-center mb-8" role="navigation" aria-label="Onboarding steps">
      {ALL_STEPS.map((step, idx) => {
        const isComplete = completedSteps.includes(step);
        const isCurrent = currentStep === step;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isComplete ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1 text-[10px] font-medium ${
                  isCurrent ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {idx < ALL_STEPS.length - 1 && (
              <div
                className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 mt-[-16px] ${
                  completedSteps.includes(ALL_STEPS[idx + 1]) || currentStep === ALL_STEPS[idx + 1]
                    ? 'bg-green-500'
                    : isComplete
                      ? 'bg-green-300'
                      : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function FounderOnboarding({ founderId, onComplete }: FounderOnboardingProps) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [stepConfigs, setStepConfigs] = useState<OnboardingStepConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function loadOnboarding() {
      setLoading(true);

      const [progressRes, configsRes] = await Promise.all([
        onboardingAPI.getProgress(founderId),
        onboardingAPI.getStepConfigs(),
      ]);

      if (progressRes.data) setProgress(progressRes.data);
      if (configsRes.data) setStepConfigs(configsRes.data);

      setLoading(false);
    }

    loadOnboarding();
  }, [founderId]);

  // Advance step handler
  const handleAdvance = useCallback(async () => {
    if (!progress) return;

    // If complete, fire callback
    if (progress.isComplete) {
      if (onComplete) onComplete();
      return;
    }

    setAdvancing(true);
    setError(null);

    // Check if we can advance
    const canAdvanceRes = await onboardingAPI.canAdvance(founderId);
    if (canAdvanceRes.data && !canAdvanceRes.data.canAdvance) {
      setError(canAdvanceRes.data.reason || 'Cannot advance yet. Please complete the current step.');
      setAdvancing(false);
      return;
    }

    // Advance
    const { data, error: apiError } = await onboardingAPI.advanceStep(founderId);

    if (apiError) {
      setError(apiError.message);
      setAdvancing(false);
      return;
    }

    if (data) {
      setProgress(data);

      // If now complete, notify
      if (data.isComplete && onComplete) {
        // Delay slightly so the user sees the complete step
        setTimeout(() => onComplete(), 100);
      }
    }

    setAdvancing(false);
  }, [founderId, progress, onComplete]);

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
          <p className="text-gray-500">Loading onboarding...</p>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Onboarding Not Available</h2>
          <p className="text-gray-600">
            Your founder application must be approved before starting onboarding.
          </p>
        </div>
      </div>
    );
  }

  const currentConfig = stepConfigs.find((c) => c.step === progress.currentStep);
  const stepContent = getStepContent(progress.currentStep, currentConfig);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <h1 className="text-3xl font-bold mb-1">Founder Onboarding</h1>
          <p className="text-gray-600">
            Step {progress.currentStepIndex + 1} of {progress.totalSteps}
            {currentConfig && ` - ${currentConfig.title}`}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Step indicator */}
        <OnboardingStepIndicator
          currentStep={progress.currentStep}
          completedSteps={progress.completedSteps}
        />

        {/* Step content card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Step icon and title */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 ${stepContent.iconBg} rounded-full flex items-center justify-center shrink-0`}>
              <svg className={`w-6 h-6 ${stepContent.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stepContent.icon} />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {currentConfig?.title || progress.currentStep}
              </h2>
              {currentConfig && currentConfig.estimatedMinutes > 0 && (
                <p className="text-xs text-gray-400">
                  Estimated time: {currentConfig.estimatedMinutes} minutes
                </p>
              )}
            </div>
          </div>

          {/* Step-specific content */}
          {stepContent.content}

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Action button */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {advancing && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
              )}
              {advancing ? 'Processing...' : stepContent.actionLabel}
            </button>
          </div>
        </div>

        {/* Progress summary */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${progress.progressPercent}%` }}
              />
            </div>
            <span className="tabular-nums">{progress.progressPercent}% complete</span>
          </div>
        </div>
      </main>
    </div>
  );
}
