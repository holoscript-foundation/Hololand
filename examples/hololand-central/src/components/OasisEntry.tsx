/**
 * Oasis Entry Handler
 * 
 * Manages first-time user entry, welcome flow, and avatar setup
 */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AvatarSelector } from './AvatarSelector';

interface OasisEntryProps {
  onComplete: () => void;
}

export function OasisEntry({ onComplete }: OasisEntryProps) {
  const location = useLocation();
  const [step, setStep] = useState<'welcome' | 'avatar' | 'tutorial' | 'ready'>('welcome');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('');
  
  const isFirstTime = location.state?.firstTime ?? false;
  const showWelcome = location.state?.showWelcome ?? false;

  useEffect(() => {
    // Skip welcome if not first time
    if (!isFirstTime && !showWelcome) {
      onComplete();
    }
  }, [isFirstTime, showWelcome, onComplete]);

  const handleNext = () => {
    switch (step) {
      case 'welcome':
        setStep('avatar');
        break;
      case 'avatar':
        // Save selected avatar
        if (selectedAvatar) {
          localStorage.setItem('hololand_avatar', selectedAvatar);
        }
        setStep('tutorial');
        break;
      case 'tutorial':
        setStep('ready');
        // Mark onboarding complete
        localStorage.setItem('hololand_onboarded', 'true');
        setTimeout(onComplete, 1000);
        break;
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hololand_onboarded', 'true');
    onComplete();
  };

  const handleAvatarSelect = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  return (
    <div className="oasis-entry">
      <style>{`
        .oasis-entry {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Inter', sans-serif;
          z-index: 1000;
        }
        
        .entry-content {
          max-width: 600px;
          text-align: center;
          padding: 48px;
        }
        
        .entry-title {
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-bottom: 24px;
        }
        
        .entry-subtitle {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 48px;
          line-height: 1.6;
        }
        
        .entry-button {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          border: none;
          padding: 16px 48px;
          border-radius: 12px;
          color: #1a1a2e;
          font-size: 18px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .entry-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(74, 222, 128, 0.4);
        }
        
        .skip-button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          padding: 12px 24px;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
          cursor: pointer;
          margin-top: 24px;
        }
        
        .skip-button:hover {
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }
        
        .progress-dots {
          display: flex;
          gap: 8px;
          margin-top: 48px;
        }
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
        }
        
        .dot.active {
          background: #4ade80;
        }
      `}</style>
      
      <div className="entry-content">
        {step === 'welcome' && (
          <>
            <h1 className="entry-title">Welcome to Hololand</h1>
            <p className="entry-subtitle">
              You're about to enter a universe of infinite possibilities.<br/>
              Explore worlds, meet creators, and discover adventures.
            </p>
            <button className="entry-button" onClick={handleNext}>
              Enter the Oasis
            </button>
          </>
        )}
        
        {step === 'avatar' && (
          <>
            <h1 className="entry-title">Choose Your Look</h1>
            <p className="entry-subtitle">
              Express yourself! Pick an avatar to represent you in Hololand.
            </p>
            <AvatarSelector 
              onSelect={handleAvatarSelect} 
              selectedId={selectedAvatar} 
            />
            <button 
              className="entry-button" 
              onClick={handleNext}
              style={{ marginTop: 24 }}
            >
              {selectedAvatar ? 'Continue' : 'Skip for now'}
            </button>
          </>
        )}
        
        {step === 'tutorial' && (
          <>
            <h1 className="entry-title">Quick Tips</h1>
            <p className="entry-subtitle">
              🎮 Move with WASD or joystick<br/>
              🖱️ Click to interact<br/>
              🌲 Visit the Forest Portal for games<br/>
              💬 Chat with other explorers
            </p>
            <button className="entry-button" onClick={handleNext}>
              I'm Ready!
            </button>
          </>
        )}
        
        {step === 'ready' && (
          <>
            <h1 className="entry-title">Loading Oasis...</h1>
            <p className="entry-subtitle">
              Preparing your experience...
            </p>
          </>
        )}
        
        {step !== 'ready' && (
          <button className="skip-button" onClick={handleSkip}>
            Skip intro
          </button>
        )}
        
        <div className="progress-dots">
          <div className={`dot ${step === 'welcome' ? 'active' : ''}`} />
          <div className={`dot ${step === 'avatar' ? 'active' : ''}`} />
          <div className={`dot ${step === 'tutorial' ? 'active' : ''}`} />
        </div>
      </div>
    </div>
  );
}

export default OasisEntry;
