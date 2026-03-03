'use client';

/**
 * PublicSignup
 *
 * Streamlined public registration page for the HoloLand platform.
 *
 * Features:
 *   - Email input with real-time format validation
 *   - Password input with strength indicator (weak/medium/strong)
 *   - Username input with debounced availability check
 *   - Terms of service checkbox with link
 *   - Sign up button with loading state
 *   - Social auth buttons (Google, GitHub, Discord via Supabase OAuth)
 *   - Email verification pending screen after signup
 *
 * @module pages/PublicSignup
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

type SignupStep = 'form' | 'verifying';

type PasswordStrength = 'weak' | 'medium' | 'strong';

type SocialProvider = 'google' | 'github' | 'discord';

export interface PublicSignupProps {
  /** Callback after successful signup + verification. */
  onComplete?: (userId: string) => void;
  /** URL to redirect after signup. */
  redirectUrl?: string;
  /** Base API URL. Default: '/api'. */
  apiBaseUrl?: string;
  /** Whether to enable social auth buttons. Default: true. */
  enableSocialAuth?: boolean;
  /** Terms of service URL. Default: '/terms'. */
  tosUrl?: string;
  /** Privacy policy URL. Default: '/privacy'. */
  privacyUrl?: string;
  /** Sign-in link for existing users. Default: '/login'. */
  loginUrl?: string;
}

// =============================================================================
// Password Strength Evaluation
// =============================================================================

function evaluatePasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  feedback: string;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (/(.)\1{2,}/.test(password)) score--; // Penalize repeated chars

  if (score <= 2) {
    return {
      strength: 'weak',
      score,
      feedback: 'Add uppercase, numbers, or symbols for a stronger password',
    };
  }
  if (score <= 4) {
    return {
      strength: 'medium',
      score,
      feedback: 'Good password. Add more variety to make it stronger',
    };
  }
  return {
    strength: 'strong',
    score,
    feedback: 'Strong password',
  };
}

// =============================================================================
// Email Validation
// =============================================================================

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// =============================================================================
// Strength Indicator Colors
// =============================================================================

const strengthConfig: Record<PasswordStrength, { color: string; bg: string; width: string; label: string }> = {
  weak: { color: 'text-red-400', bg: 'bg-red-500', width: 'w-1/3', label: 'Weak' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500', width: 'w-2/3', label: 'Medium' },
  strong: { color: 'text-green-400', bg: 'bg-green-500', width: 'w-full', label: 'Strong' },
};

// =============================================================================
// Social Auth Icon Components
// =============================================================================

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
    </svg>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function PublicSignup({
  onComplete,
  redirectUrl,
  apiBaseUrl = '/api',
  enableSocialAuth = true,
  tosUrl = '/terms',
  privacyUrl = '/privacy',
  loginUrl = '/login',
}: PublicSignupProps) {
  // ---- State ----
  const [step, setStep] = useState<SignupStep>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [agreedToTos, setAgreedToTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof evaluatePasswordStrength> | null>(null);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);

  // Refs
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (usernameCheckTimer.current) {
        clearTimeout(usernameCheckTimer.current);
      }
    };
  }, []);

  // ---- Email Validation ----
  useEffect(() => {
    if (emailTouched) {
      setEmailValid(isValidEmail(email));
    }
  }, [email, emailTouched]);

  // ---- Password Strength ----
  useEffect(() => {
    if (password.length > 0) {
      setPasswordStrength(evaluatePasswordStrength(password));
    } else {
      setPasswordStrength(null);
    }
  }, [password]);

  // ---- Username Availability Check (debounced) ----
  useEffect(() => {
    if (!usernameTouched || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    setUsernameChecking(true);
    if (usernameCheckTimer.current) {
      clearTimeout(usernameCheckTimer.current);
    }

    usernameCheckTimer.current = setTimeout(async () => {
      try {
        // Check username format first
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          if (mountedRef.current) {
            setUsernameAvailable(false);
            setUsernameChecking(false);
          }
          return;
        }

        const response = await fetch(`${apiBaseUrl}/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (mountedRef.current) {
          setUsernameAvailable(data.available ?? !data.taken);
          setUsernameChecking(false);
        }
      } catch {
        if (mountedRef.current) {
          // On network error, don't block -- assume available
          setUsernameAvailable(null);
          setUsernameChecking(false);
        }
      }
    }, 500);
  }, [username, usernameTouched, apiBaseUrl]);

  // ---- Form Submission ----
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    if (!agreedToTos) {
      setError('You must agree to the Terms of Service');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!mountedRef.current) return;

      if (!response.ok) {
        setError(data.error || data.message || 'Signup failed. Please try again.');
        setLoading(false);
        return;
      }

      // Signup successful -- show verification pending screen
      setStep('verifying');
      setLoading(false);
    } catch {
      if (mountedRef.current) {
        setError('Network error. Please check your connection and try again.');
        setLoading(false);
      }
    }
  }, [email, password, username, agreedToTos, apiBaseUrl]);

  // ---- Social Auth ----
  const handleSocialAuth = useCallback(async (provider: SocialProvider) => {
    setError(null);
    setLoading(true);

    try {
      // Redirect to Supabase OAuth endpoint
      window.location.href = `${apiBaseUrl}/auth/oauth/${provider}?redirect=${encodeURIComponent(redirectUrl || '/')}`;
    } catch {
      if (mountedRef.current) {
        setError(`Failed to connect with ${provider}. Please try again.`);
        setLoading(false);
      }
    }
  }, [apiBaseUrl, redirectUrl]);

  // ---- Resend Verification ----
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleResendVerification = useCallback(async () => {
    if (resendCooldown > 0) return;

    try {
      await fetch(`${apiBaseUrl}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Start cooldown
      setResendCooldown(60);
    } catch {
      setError('Failed to resend verification email');
    }
  }, [email, apiBaseUrl, resendCooldown]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // ============================================================================
  // RENDER: Verification Pending Screen
  // ============================================================================

  if (step === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          {/* Mail icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-indigo-500/10 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>
          <p className="text-gray-400 mb-2">
            We sent a verification link to
          </p>
          <p className="text-white font-medium mb-6">{email}</p>
          <p className="text-gray-500 text-sm mb-8">
            Click the link in the email to verify your account and get started. The link expires in 24 hours.
          </p>

          <button
            onClick={handleResendVerification}
            disabled={resendCooldown > 0}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {resendCooldown > 0
              ? `Resend available in ${resendCooldown}s`
              : 'Resend verification email'
            }
          </button>

          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-gray-500 text-sm">
              Wrong email?{' '}
              <button
                onClick={() => setStep('form')}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Go back and try again
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Signup Form
  // ============================================================================

  const canSubmit =
    emailValid &&
    password.length >= 8 &&
    username.length >= 3 &&
    agreedToTos &&
    !loading &&
    usernameAvailable !== false;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Create your account
          </h1>
          <p className="text-gray-400">
            Join HoloLand and start building spatial experiences
          </p>
        </div>

        {/* Social Auth Buttons */}
        {enableSocialAuth && (
          <>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleSocialAuth('google')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <button
                onClick={() => handleSocialAuth('github')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <GitHubIcon />
                Continue with GitHub
              </button>

              <button
                onClick={() => handleSocialAuth('discord')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#5865F2] text-white rounded-lg font-medium hover:bg-[#4752c4] disabled:opacity-50 transition-colors"
              >
                <DiscordIcon />
                Continue with Discord
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-950 text-gray-500">or sign up with email</span>
              </div>
            </div>
          </>
        )}

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required
              autoComplete="email"
              className={`w-full px-4 py-2.5 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                emailTouched && !emailValid && email.length > 0
                  ? 'border-red-500'
                  : emailTouched && emailValid
                    ? 'border-green-500/50'
                    : 'border-gray-700'
              }`}
              placeholder="you@example.com"
            />
            {emailTouched && !emailValid && email.length > 0 && (
              <p className="mt-1 text-sm text-red-400">Please enter a valid email address</p>
            )}
          </div>

          {/* Username */}
          <div>
            <label htmlFor="signup-username" className="block text-sm font-medium text-gray-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <input
                id="signup-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                onBlur={() => setUsernameTouched(true)}
                required
                autoComplete="username"
                minLength={3}
                maxLength={30}
                className={`w-full px-4 py-2.5 bg-gray-900 border rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
                  usernameTouched && usernameAvailable === false
                    ? 'border-red-500'
                    : usernameTouched && usernameAvailable === true
                      ? 'border-green-500/50'
                      : 'border-gray-700'
                }`}
                placeholder="your_username"
              />
              {/* Loading spinner for availability check */}
              {usernameChecking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              {/* Availability indicator */}
              {!usernameChecking && usernameTouched && username.length >= 3 && usernameAvailable === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {!usernameChecking && usernameTouched && username.length >= 3 && usernameAvailable === false && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
            {usernameTouched && usernameAvailable === false && (
              <p className="mt-1 text-sm text-red-400">
                {!/^[a-zA-Z0-9_-]+$/.test(username)
                  ? 'Username can only contain letters, numbers, underscores, and hyphens'
                  : 'This username is already taken'
                }
              </p>
            )}
            {usernameTouched && usernameAvailable === true && (
              <p className="mt-1 text-sm text-green-400">Username is available</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
              className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              placeholder="At least 8 characters"
            />

            {/* Strength indicator */}
            {passwordStrength && (
              <div className="mt-2">
                {/* Bar */}
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strengthConfig[passwordStrength.strength].bg} rounded-full transition-all duration-300 ${strengthConfig[passwordStrength.strength].width}`}
                  />
                </div>
                {/* Label + feedback */}
                <div className="flex justify-between items-center mt-1">
                  <span className={`text-xs font-medium ${strengthConfig[passwordStrength.strength].color}`}>
                    {strengthConfig[passwordStrength.strength].label}
                  </span>
                  <span className="text-xs text-gray-500">
                    {passwordStrength.feedback}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Terms of Service */}
          <div className="flex items-start gap-3 pt-2">
            <input
              id="signup-tos"
              type="checkbox"
              checked={agreedToTos}
              onChange={(e) => setAgreedToTos(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-950"
            />
            <label htmlFor="signup-tos" className="text-sm text-gray-400">
              I agree to the{' '}
              <a
                href={tosUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Terms of Service
              </a>{' '}
              and{' '}
              <a
                href={privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3 px-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <a href={loginUrl} className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

export default PublicSignup;
