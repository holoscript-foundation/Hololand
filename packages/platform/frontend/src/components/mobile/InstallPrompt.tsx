/**
 * InstallPrompt
 *
 * Custom PWA install banner that intercepts the browser's
 * `beforeinstallprompt` event and presents a branded "Add to Home Screen"
 * call-to-action.
 *
 * Behaviour:
 *   - Listens for `beforeinstallprompt` and stores the deferred prompt
 *   - Shows a bottom banner with app icon, name, and CTA button
 *   - Dismiss button stores a "don't show again" flag in localStorage
 *   - Auto-hides when the app is successfully installed
 *
 * @module components/mobile/InstallPrompt
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The `beforeinstallprompt` event is not yet in the standard TS lib.
 * Provide a minimal interface so we can store and invoke the prompt.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface InstallPromptProps {
  /** Override the app name shown in the banner (default "HoloLand"). */
  appName?: string;
  /** Override the description line (default "Add HoloLand to your home screen for a better experience"). */
  description?: string;
  /** Optional icon URL. Falls back to a placeholder globe icon. */
  iconUrl?: string;
  /** Called after the user accepts or dismisses the native prompt. */
  onInstallOutcome?: (outcome: 'accepted' | 'dismissed') => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DISMISS_KEY = 'hololand:install-prompt-dismissed';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InstallPrompt({
  appName = 'HoloLand',
  description = 'Add HoloLand to your home screen for a better experience',
  iconUrl,
  onInstallOutcome,
}: InstallPromptProps) {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  // -----------------------------------------------------------------------
  // Listen for the beforeinstallprompt event
  // -----------------------------------------------------------------------

  useEffect(() => {
    // Don't show if the user previously dismissed.
    if (typeof localStorage !== 'undefined' && localStorage.getItem(DISMISS_KEY)) {
      return;
    }

    const onBeforeInstall = (e: Event) => {
      // Prevent the default mini-infobar on Android.
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // Auto-hide when installed.
    const onInstalled = () => {
      setShowBanner(false);
      deferredPrompt.current = null;
    };

    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    onInstallOutcome?.(outcome);

    // Regardless of outcome, hide the banner.
    setShowBanner(false);
    deferredPrompt.current = null;
  }, [onInstallOutcome]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    deferredPrompt.current = null;

    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Ignore storage errors (private browsing, quota, etc.).
    }
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-20 inset-x-0 z-50 px-4 animate-slide-up"
      role="banner"
      aria-label="Install application"
    >
      <div
        className="mx-auto max-w-lg flex items-center gap-3 rounded-xl
                   bg-gray-900 border border-gray-700 p-4 shadow-2xl"
      >
        {/* App icon */}
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={`${appName} icon`}
            className="w-12 h-12 rounded-xl flex-shrink-0"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-7 h-7 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-4.247m0 0A8.966 8.966 0 013 12c0-1.777.515-3.434 1.404-4.832"
              />
            </svg>
          </div>
        )}

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate">{appName}</p>
          <p className="text-xs text-gray-400 leading-snug line-clamp-2">{description}</p>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleInstall}
          className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white
                     hover:bg-indigo-500 active:bg-indigo-700 transition-colors"
        >
          Install
        </button>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="flex-shrink-0 p-1 rounded-full text-gray-500 hover:text-gray-300 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Slide-up animation */}
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 400ms ease-out;
        }
      `}</style>
    </div>
  );
}
