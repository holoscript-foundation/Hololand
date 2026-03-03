'use client';

/**
 * FoundersApplication Component
 *
 * Multi-step application form for the HoloLand Founders Program.
 *
 * Features:
 *   - Portfolio URL input with validation (GitHub, ArtStation, Behance, personal site)
 *   - "Why you want to join" textarea with 500 char max and real-time character count
 *   - Optional referral code field
 *   - Submit with loading state and error handling
 *   - Step indicator for multi-step flow
 *
 * Uses React hooks and Tailwind CSS matching Dashboard/SignupForm patterns.
 *
 * @module founders/FoundersApplication
 */

import { useState, useCallback, useMemo } from 'react';
import { foundersAPI, type Founder } from './foundersApi';

// ============================================================================
// Constants
// ============================================================================

const MAX_NOTE_LENGTH = 500;

const PORTFOLIO_PATTERNS = [
  { label: 'GitHub', pattern: /^https?:\/\/(www\.)?github\.com\/.+/i },
  { label: 'ArtStation', pattern: /^https?:\/\/(www\.)?artstation\.com\/.+/i },
  { label: 'Behance', pattern: /^https?:\/\/(www\.)?behance\.net\/.+/i },
  { label: 'Dribbble', pattern: /^https?:\/\/(www\.)?dribbble\.com\/.+/i },
  { label: 'Sketchfab', pattern: /^https?:\/\/(www\.)?sketchfab\.com\/.+/i },
  { label: 'LinkedIn', pattern: /^https?:\/\/(www\.)?linkedin\.com\/.+/i },
];

const URL_PATTERN = /^https?:\/\/.+\..+/i;

type ApplicationStep = 'portfolio' | 'motivation' | 'referral' | 'review';

const STEPS: ApplicationStep[] = ['portfolio', 'motivation', 'referral', 'review'];

// ============================================================================
// Props
// ============================================================================

interface FoundersApplicationProps {
  userId: string;
  onSuccess?: (founder: Founder) => void;
  onAlreadyApplied?: (founder: Founder) => void;
}

// ============================================================================
// Validation Helpers
// ============================================================================

function validatePortfolioUrl(url: string): { valid: boolean; message: string } {
  if (!url.trim()) {
    return { valid: true, message: '' }; // Optional field
  }

  if (!URL_PATTERN.test(url)) {
    return { valid: false, message: 'Please enter a valid URL (e.g., https://example.com)' };
  }

  const matchedPlatform = PORTFOLIO_PATTERNS.find((p) => p.pattern.test(url));
  if (matchedPlatform) {
    return { valid: true, message: `Detected: ${matchedPlatform.label}` };
  }

  return { valid: true, message: 'Personal website detected' };
}

// ============================================================================
// Sub-Components
// ============================================================================

function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: ApplicationStep[];
  currentIndex: number;
}) {
  const labels: Record<ApplicationStep, string> = {
    portfolio: 'Portfolio',
    motivation: 'Motivation',
    referral: 'Referral',
    review: 'Review',
  };

  return (
    <div className="flex items-center justify-center mb-8" role="navigation" aria-label="Application steps">
      {steps.map((step, idx) => {
        const isComplete = idx < currentIndex;
        const isCurrent = idx === currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
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
                className={`mt-1 text-xs font-medium ${
                  isCurrent ? 'text-blue-600' : isComplete ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {labels[step]}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 mt-[-16px] ${
                  idx < currentIndex ? 'bg-green-500' : 'bg-gray-200'
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

export function FoundersApplication({ userId, onSuccess, onAlreadyApplied }: FoundersApplicationProps) {
  // Form state
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [applicationNote, setApplicationNote] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // UI state
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Derived state
  const portfolioValidation = useMemo(() => validatePortfolioUrl(portfolioUrl), [portfolioUrl]);
  const noteCharsRemaining = MAX_NOTE_LENGTH - applicationNote.length;
  const noteOverLimit = noteCharsRemaining < 0;

  // Step navigation
  const canGoNext = useCallback((): boolean => {
    const step = STEPS[currentStep];
    switch (step) {
      case 'portfolio':
        return portfolioValidation.valid;
      case 'motivation':
        return !noteOverLimit;
      case 'referral':
        return true; // Referral is optional
      case 'review':
        return !loading;
      default:
        return false;
    }
  }, [currentStep, portfolioValidation.valid, noteOverLimit, loading]);

  const goNext = useCallback(() => {
    if (currentStep < STEPS.length - 1 && canGoNext()) {
      setCurrentStep((prev) => prev + 1);
      setError(null);
    }
  }, [currentStep, canGoNext]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  }, [currentStep]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await foundersAPI.submitApplication({
      userId,
      portfolioUrl: portfolioUrl.trim() || undefined,
      applicationNote: applicationNote.trim() || undefined,
      referralCode: referralCode.trim() || undefined,
    });

    setLoading(false);

    if (apiError) {
      if (apiError.message.includes('already has')) {
        // User already applied - fetch their existing record
        const { data: existing } = await foundersAPI.getFounder(userId);
        if (existing && onAlreadyApplied) {
          onAlreadyApplied(existing);
        }
      }
      setError(apiError.message);
      return;
    }

    if (data) {
      setSubmitted(true);
      if (onSuccess) onSuccess(data);
    }
  }, [userId, portfolioUrl, applicationNote, referralCode, onSuccess, onAlreadyApplied]);

  // Success state
  if (submitted) {
    return (
      <div className="w-full max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2">Application Submitted</h2>
        <p className="text-gray-600 mb-6">
          Your Founders Program application has been received. We will review it and notify you
          when your status changes.
        </p>
        <p className="text-sm text-gray-500">
          You can check your application status on the waitlist page.
        </p>
      </div>
    );
  }

  // Render current step
  const step = STEPS[currentStep];

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Founders Program Application</h1>
        <p className="text-gray-600">
          Join an exclusive group of creators shaping the future of HoloLand.
        </p>
      </div>

      <StepIndicator steps={STEPS} currentIndex={currentStep} />

      <div className="bg-white rounded-lg shadow-md p-6">
        {/* Step 1: Portfolio */}
        {step === 'portfolio' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Your Portfolio</h2>
              <p className="text-gray-500 text-sm mb-4">
                Share a link to your creative work. Accepted platforms include GitHub, ArtStation,
                Behance, Dribbble, or a personal website.
              </p>
            </div>
            <div>
              <label htmlFor="portfolioUrl" className="block text-sm font-medium mb-1">
                Portfolio URL <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="portfolioUrl"
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://github.com/your-username"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  portfolioUrl && !portfolioValidation.valid
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
                aria-describedby="portfolio-hint"
              />
              {portfolioUrl && (
                <p
                  id="portfolio-hint"
                  className={`mt-1 text-xs ${
                    portfolioValidation.valid ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {portfolioValidation.message}
                </p>
              )}
            </div>
            <div className="text-xs text-gray-400 space-y-1">
              <p>Supported platforms get bonus score points:</p>
              <ul className="list-disc list-inside">
                {PORTFOLIO_PATTERNS.map((p) => (
                  <li key={p.label}>{p.label}</li>
                ))}
                <li>Personal websites also accepted</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Motivation */}
        {step === 'motivation' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Why do you want to join?</h2>
              <p className="text-gray-500 text-sm mb-4">
                Tell us about your creative vision and what you hope to build in HoloLand.
              </p>
            </div>
            <div>
              <label htmlFor="applicationNote" className="block text-sm font-medium mb-1">
                Your Answer <span className="text-gray-400">(optional, max {MAX_NOTE_LENGTH} characters)</span>
              </label>
              <textarea
                id="applicationNote"
                value={applicationNote}
                onChange={(e) => setApplicationNote(e.target.value)}
                placeholder="I'm excited about building immersive VR worlds because..."
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 resize-none ${
                  noteOverLimit
                    ? 'border-red-300 focus:ring-red-200'
                    : 'border-gray-300 focus:ring-blue-200'
                }`}
                rows={5}
                aria-describedby="note-counter"
              />
              <div
                id="note-counter"
                className={`text-right text-xs mt-1 ${
                  noteOverLimit
                    ? 'text-red-600 font-bold'
                    : noteCharsRemaining <= 50
                      ? 'text-yellow-600'
                      : 'text-gray-400'
                }`}
              >
                {applicationNote.length}/{MAX_NOTE_LENGTH} characters
                {noteOverLimit && ` (${Math.abs(noteCharsRemaining)} over limit)`}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Referral */}
        {step === 'referral' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Referral Code</h2>
              <p className="text-gray-500 text-sm mb-4">
                Were you invited by an existing founder? Enter their invite code to boost your
                application priority and help them climb the leaderboard.
              </p>
            </div>
            <div>
              <label htmlFor="referralCode" className="block text-sm font-medium mb-1">
                Invite Code <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="referralCode"
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                maxLength={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono tracking-wider uppercase"
              />
              <p className="mt-1 text-xs text-gray-400">
                8-character alphanumeric code from an existing founder.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Review Your Application</h2>
              <p className="text-gray-500 text-sm mb-4">
                Please confirm the details below before submitting.
              </p>
            </div>

            <div className="space-y-3 bg-gray-50 rounded-md p-4">
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Portfolio</span>
                <p className="text-sm mt-0.5">
                  {portfolioUrl.trim() || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Motivation</span>
                <p className="text-sm mt-0.5">
                  {applicationNote.trim() || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Referral Code</span>
                <p className="text-sm mt-0.5 font-mono">
                  {referralCode.trim() || <span className="text-gray-400 italic font-sans">None</span>}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={goBack}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {step === 'review' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || noteOverLimit}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && (
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
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          ) : (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
