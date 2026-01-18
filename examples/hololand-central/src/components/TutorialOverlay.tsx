/**
 * Tutorial Overlay Component
 * 
 * Provides guidance for first-time users
 */

import { useState, useEffect } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  message: string;
  icon: string;
  target?: string; // CSS selector for highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Hololand!',
    message: 'This is the Oasis - your gateway to infinite virtual worlds.',
    icon: '🌐',
    position: 'center',
  },
  {
    id: 'controls',
    title: 'Movement Controls',
    message: 'Desktop: Click and drag to look around. Scroll to zoom.\nMobile: Use the joystick on the left.',
    icon: '🎮',
    position: 'center',
  },
  {
    id: 'portals',
    title: 'Explore Worlds',
    message: 'Click on portals to visit different worlds. Each portal leads to a unique experience!',
    icon: '🚪',
    position: 'bottom',
  },
  {
    id: 'legends',
    title: 'Play Hololand Legends',
    message: 'Find the Forest Portal to enter Hololand Legends - a 2D adventure game!',
    icon: '🌲',
    position: 'center',
  },
  {
    id: 'vr',
    title: 'VR Mode',
    message: 'Have a VR headset? Click "Enter VR" for an immersive experience!',
    icon: '🥽',
    position: 'top',
  },
];

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  useEffect(() => {
    // Check if already completed
    if (localStorage.getItem('hololand_tutorial_complete') === 'true') {
      setVisible(false);
      onComplete();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (isLast) {
      localStorage.setItem('hololand_tutorial_complete', 'true');
      setVisible(false);
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('hololand_tutorial_complete', 'true');
    setVisible(false);
    onSkip();
  };

  if (!visible) return null;

  return (
    <div className="tutorial-overlay">
      <style>{`
        .tutorial-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .tutorial-card {
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 40px;
          max-width: 450px;
          text-align: center;
          color: white;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .tutorial-icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        
        .tutorial-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 16px;
          background: linear-gradient(135deg, #4ade80, #22c55e);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .tutorial-message {
          font-size: 16px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
          margin-bottom: 32px;
          white-space: pre-line;
        }
        
        .tutorial-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }
        
        .tutorial-btn {
          padding: 14px 32px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .tutorial-btn.primary {
          background: linear-gradient(135deg, #4ade80, #22c55e);
          border: none;
          color: #1a1a2e;
        }
        
        .tutorial-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(74, 222, 128, 0.4);
        }
        
        .tutorial-btn.secondary {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.6);
        }
        
        .tutorial-btn.secondary:hover {
          border-color: rgba(255, 255, 255, 0.4);
          color: white;
        }
        
        .tutorial-progress {
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 24px;
        }
        
        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
        }
        
        .progress-dot.active {
          background: #4ade80;
        }
        
        .progress-dot.completed {
          background: rgba(74, 222, 128, 0.5);
        }
      `}</style>
      
      <div className="tutorial-card">
        <div className="tutorial-icon">{step.icon}</div>
        <h2 className="tutorial-title">{step.title}</h2>
        <p className="tutorial-message">{step.message}</p>
        
        <div className="tutorial-actions">
          <button className="tutorial-btn secondary" onClick={handleSkip}>
            Skip
          </button>
          <button className="tutorial-btn primary" onClick={handleNext}>
            {isLast ? 'Start Exploring!' : 'Next'}
          </button>
        </div>
        
        <div className="tutorial-progress">
          {TUTORIAL_STEPS.map((_, index) => (
            <div
              key={index}
              className={`progress-dot ${
                index === currentStep ? 'active' : 
                index < currentStep ? 'completed' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TutorialOverlay;
