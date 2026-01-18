/**
 * Mobile Controls Component
 * 
 * Virtual joystick and touch buttons for mobile devices
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface MobileControlsProps {
  onMove: (x: number, y: number) => void;
  onInteract: () => void;
  onMenu: () => void;
  onJump?: () => void;
  visible?: boolean;
}

export function MobileControls({
  onMove,
  onInteract,
  onMenu,
  onJump,
  visible = true,
}: MobileControlsProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile/touch device
    const checkMobile = () => {
      setIsMobile(
        'ontouchstart' in window || 
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isMobile || !visible) return null;

  return (
    <div className="mobile-controls">
      <style>{`
        .mobile-controls {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 100;
        }
        
        .joystick-container {
          position: absolute;
          bottom: 40px;
          left: 40px;
          pointer-events: auto;
        }
        
        .action-buttons {
          position: absolute;
          bottom: 40px;
          right: 40px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          pointer-events: auto;
        }
        
        .action-btn {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.3);
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          color: white;
          cursor: pointer;
          transition: transform 0.1s, background 0.1s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        
        .action-btn:active {
          transform: scale(0.9);
          background: rgba(74, 222, 128, 0.4);
        }
        
        .action-btn.primary {
          width: 80px;
          height: 80px;
          font-size: 36px;
          border-color: #4ade80;
        }
        
        .menu-btn {
          position: absolute;
          top: 40px;
          right: 40px;
          pointer-events: auto;
        }
      `}</style>
      
      {/* Virtual Joystick */}
      <div className="joystick-container">
        <VirtualJoystick onMove={onMove} />
      </div>
      
      {/* Action Buttons */}
      <div className="action-buttons">
        {onJump && (
          <button className="action-btn" onClick={onJump}>
            ⬆️
          </button>
        )}
        <button className="action-btn primary" onClick={onInteract}>
          👆
        </button>
      </div>
      
      {/* Menu Button */}
      <button className="action-btn menu-btn" onClick={onMenu}>
        ☰
      </button>
    </div>
  );
}

/**
 * Virtual Joystick Component
 */
interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  size?: number;
  deadzone?: number;
}

function VirtualJoystick({ 
  onMove, 
  size = 120, 
  deadzone = 0.1 
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const animationRef = useRef<number>();
  
  const knobSize = size * 0.4;
  const maxDistance = (size - knobSize) / 2;

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    setActive(true);
    updatePosition(clientX, clientY);
  }, []);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!active || !containerRef.current) return;
    updatePosition(clientX, clientY);
  }, [active]);

  const handleEnd = useCallback(() => {
    setActive(false);
    setPosition({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  const updatePosition = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    // Clamp to max distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > maxDistance) {
      dx = (dx / distance) * maxDistance;
      dy = (dy / distance) * maxDistance;
    }
    
    setPosition({ x: dx, y: dy });
    
    // Normalize to -1 to 1
    const normalX = dx / maxDistance;
    const normalY = dy / maxDistance;
    
    // Apply deadzone
    const magnitude = Math.sqrt(normalX * normalX + normalY * normalY);
    if (magnitude > deadzone) {
      onMove(normalX, normalY);
    } else {
      onMove(0, 0);
    }
  };

  // Continuous movement while held
  useEffect(() => {
    if (active) {
      const tick = () => {
        animationRef.current = requestAnimationFrame(tick);
      };
      tick();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(0, 0, 0, 0.3)',
        border: '2px solid rgba(255, 255, 255, 0.2)',
        position: 'relative',
        touchAction: 'none',
      }}
      onTouchStart={(e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={handleEnd}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {/* Knob */}
      <div
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: active 
            ? 'rgba(74, 222, 128, 0.8)' 
            : 'rgba(255, 255, 255, 0.5)',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          transition: active ? 'none' : 'transform 0.2s',
          boxShadow: active 
            ? '0 0 20px rgba(74, 222, 128, 0.5)' 
            : 'none',
        }}
      />
    </div>
  );
}

export default MobileControls;
