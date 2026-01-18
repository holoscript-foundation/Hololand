/**
 * Email Verification Callback Page
 * 
 * Handles the email verification link click and redirects to Oasis.
 * Route: /verify-email?token=xxx
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

interface VerificationState {
  status: 'verifying' | 'success' | 'error';
  message: string;
}

export function VerifyEmailCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>({
    status: 'verifying',
    message: 'Verifying your email...',
  });

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      setState({
        status: 'error',
        message: 'Invalid verification link. Please try again.',
      });
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token: string) => {
    try {
      // Call verification API
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Verification failed');
      }

      const data = await response.json();

      // Store auth token
      if (data.accessToken) {
        localStorage.setItem('hololand_token', data.accessToken);
      }

      setState({
        status: 'success',
        message: 'Email verified! Entering Hololand Oasis...',
      });

      // Redirect to Oasis after short delay
      setTimeout(() => {
        navigate('/oasis', { 
          state: { 
            firstTime: true,
            showWelcome: true 
          } 
        });
      }, 1500);

    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Verification failed',
      });
    }
  };

  return (
    <div className="verify-email-page">
      <style>{`
        .verify-email-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          color: white;
          font-family: 'Inter', sans-serif;
        }
        
        .verify-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 48px;
          text-align: center;
          max-width: 400px;
        }
        
        .verify-icon {
          width: 80px;
          height: 80px;
          margin-bottom: 24px;
        }
        
        .verify-title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        
        .verify-message {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 24px;
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #4ade80;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 24px;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .success-icon {
          color: #4ade80;
          font-size: 64px;
        }
        
        .error-icon {
          color: #ef4444;
          font-size: 64px;
        }
        
        .retry-button {
          background: linear-gradient(135deg, #e94560, #ff6b6b);
          border: none;
          padding: 12px 32px;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .retry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
        }
      `}</style>
      
      <div className="verify-card">
        {state.status === 'verifying' && (
          <>
            <div className="spinner" />
            <h1 className="verify-title">Verifying Email</h1>
            <p className="verify-message">{state.message}</p>
          </>
        )}
        
        {state.status === 'success' && (
          <>
            <div className="success-icon">✓</div>
            <h1 className="verify-title">Welcome to Hololand!</h1>
            <p className="verify-message">{state.message}</p>
            <div className="spinner" />
          </>
        )}
        
        {state.status === 'error' && (
          <>
            <div className="error-icon">✕</div>
            <h1 className="verify-title">Verification Failed</h1>
            <p className="verify-message">{state.message}</p>
            <button 
              className="retry-button"
              onClick={() => window.location.href = '/'}
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyEmailCallback;
