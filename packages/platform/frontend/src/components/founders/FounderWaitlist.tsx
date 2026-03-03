'use client';

/**
 * FounderWaitlist Component
 *
 * Waitlist status page for founders awaiting approval.
 *
 * Features:
 *   - Current position number in the waitlist
 *   - Estimated wait time
 *   - Referral bonus explainer ("invite friends to move up")
 *   - Shareable invite link with copy-to-clipboard
 *   - Auto-refresh of position data
 *
 * @module founders/FounderWaitlist
 */

import { useState, useEffect, useCallback } from 'react';
import { foundersAPI, type Founder, type WaitlistInfo } from './foundersApi';

// ============================================================================
// Props
// ============================================================================

interface FounderWaitlistProps {
  userId: string;
  founderId: string;
  /** Called when the founder is approved (waitlist position resolves) */
  onApproved?: (founder: Founder) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function formatEstimatedWait(days: number): string {
  if (days <= 0) return 'Very soon';
  if (days === 1) return '~1 day';
  if (days < 7) return `~${days} days`;
  if (days < 14) return '~1 week';
  if (days < 30) return `~${Math.ceil(days / 7)} weeks`;
  return `~${Math.ceil(days / 30)} month${Math.ceil(days / 30) > 1 ? 's' : ''}`;
}

// ============================================================================
// Main Component
// ============================================================================

export function FounderWaitlist({ userId, founderId, onApproved }: FounderWaitlistProps) {
  const [founder, setFounder] = useState<Founder | null>(null);
  const [waitlistInfo, setWaitlistInfo] = useState<WaitlistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const inviteCode = founder?.inviteCode || null;
  const shareUrl = inviteCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/founders/apply?ref=${inviteCode}`
    : '';

  // Load data
  const loadData = useCallback(async () => {
    const [founderRes, waitlistRes] = await Promise.all([
      foundersAPI.getFounder(userId),
      foundersAPI.getWaitlistInfo(founderId),
    ]);

    if (founderRes.data) {
      setFounder(founderRes.data);

      // Check if approved while we were waiting
      if (founderRes.data.applicationStatus === 'approved' && onApproved) {
        onApproved(founderRes.data);
        return;
      }
    }

    if (waitlistRes.data) {
      setWaitlistInfo(waitlistRes.data);
    }

    setLoading(false);
  }, [userId, founderId, onApproved]);

  useEffect(() => {
    loadData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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
          <p className="text-gray-500">Loading your waitlist status...</p>
        </div>
      </div>
    );
  }

  // Rejected state
  if (founder?.applicationStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Application Not Approved</h2>
          <p className="text-gray-600">
            Unfortunately, your Founders Program application was not approved at this time.
            Please check your email for more details.
          </p>
        </div>
      </div>
    );
  }

  const position = waitlistInfo?.position ?? -1;
  const totalCount = waitlistInfo?.totalCount ?? 0;
  const estimatedDays = waitlistInfo?.estimatedWaitDays ?? 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <h1 className="text-3xl font-bold mb-1">You're on the Waitlist</h1>
          <p className="text-gray-600">
            We're reviewing applications in priority order. Invite friends to move up!
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Position card */}
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-2">
            Your Position
          </p>
          <p className="text-6xl font-bold text-blue-600 mb-2">
            {position >= 0 ? `#${position + 1}` : '--'}
          </p>
          <p className="text-gray-500 text-sm">
            out of {totalCount.toLocaleString()} applicants on the waitlist
          </p>

          {/* Estimated wait */}
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mb-1">
              Estimated Wait
            </p>
            <p className="text-2xl font-bold text-gray-800">
              {formatEstimatedWait(estimatedDays)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Based on current review pace. Inviting friends can speed this up.
            </p>
          </div>
        </div>

        {/* Referral bonus explainer */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-800 mb-1">Move Up the Waitlist</h3>
              <p className="text-sm text-gray-600 mb-3">
                Each friend who applies using your invite code adds <strong>+5 priority points</strong> to
                your score. The higher your score, the faster you get approved. Your current referral
                count: <strong>{founder?.referralCount || 0}</strong>.
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>How it works:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2">
                  <li>Share your invite code or link with friends</li>
                  <li>When they apply using your code, you earn +5 points</li>
                  <li>Higher points = higher priority on the waitlist</li>
                  <li>Referrals also count toward your badge tier after approval</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Shareable invite link */}
        {inviteCode && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
              Your Invite Code
            </h3>

            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 bg-gray-100 px-4 py-3 rounded-md text-xl font-mono font-bold text-center tracking-widest">
                {inviteCode}
              </code>
              <button
                onClick={() => handleCopy(inviteCode)}
                className={`px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
                aria-label={copied ? 'Copied!' : 'Copy invite code'}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Or share this link directly:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-gray-50 px-3 py-2 rounded-md text-sm text-gray-600 border border-gray-200 font-mono"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => handleCopy(shareUrl)}
                  className="px-3 py-2 bg-gray-100 text-gray-600 rounded-md text-sm font-medium border border-gray-200 hover:bg-gray-200"
                  aria-label="Copy share link"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Application summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
            Your Application
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium capitalize">
                {founder?.applicationStatus || 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Applied</span>
              <span className="font-medium">
                {founder?.createdAt
                  ? new Date(founder.createdAt).toLocaleDateString()
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Score</span>
              <span className="font-medium">{founder?.score || 0} pts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Referrals</span>
              <span className="font-medium">{founder?.referralCount || 0}</span>
            </div>
            {founder?.portfolioUrl && (
              <div className="flex justify-between">
                <span className="text-gray-500">Portfolio</span>
                <a
                  href={founder.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline truncate max-w-[200px]"
                >
                  {founder.portfolioUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Auto-refresh note */}
        <p className="text-center text-xs text-gray-400">
          This page refreshes automatically every 30 seconds.
        </p>
      </main>
    </div>
  );
}
