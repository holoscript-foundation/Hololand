'use client';

import { useState } from 'react';

export function EmailSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    // TODO: Implement actual email signup
    // For now, just simulate API call
    setTimeout(() => {
      setStatus('success');
      setEmail('');
    }, 1000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-white">
        Ready to Build?
      </h2>
      <p className="text-xl text-white/90 mb-8">
        Get early access to Infinity Builder and stay updated on the latest Hololand features
      </p>

      {status === 'success' ? (
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="text-xl font-semibold mb-2 text-white">You're on the list!</h3>
          <p className="text-white/80">
            We'll notify you when Infinity Builder launches.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              className="flex-1 px-6 py-4 rounded-lg bg-white/20 backdrop-blur-sm border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'loading' ? 'Joining...' : 'Get Early Access'}
            </button>
          </div>
          <p className="text-sm text-white/70 mt-4">
            No spam. Unsubscribe anytime. We respect your privacy.
          </p>
        </form>
      )}
    </div>
  );
}
