import React, { useState } from 'react';
import { Box, Circle, Sword, Lightbulb, Settings, X } from 'lucide-react';

export interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrimitive: (type: string) => void;
  position?: { x: number; y: number }; // Screen coordinates or VR anchor
}

export function RadialMenu({ isOpen, onClose, onSelectPrimitive, position = { x: 500, y: 500 } }: RadialMenuProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const items: Array<{ id: string; icon: JSX.Element; label: string; action?: () => void }> = [
    { id: 'cube', icon: <Box size={24} />, label: 'Cube' },
    { id: 'sphere', icon: <Circle size={24} />, label: 'Sphere' },
    { id: 'sword', icon: <Sword size={24} />, label: 'Sword' },
    { id: 'light', icon: <Lightbulb size={24} />, label: 'Light' },
    { id: 'settings', icon: <Settings size={24} />, label: 'Settings' },
    { id: 'close', icon: <X size={24} />, label: 'Close', action: onClose }
  ];

  const radius = 100;

  return (
    <div 
      className="fixed z-50 pointer-events-auto"
      style={{ left: position.x, top: position.y, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative w-64 h-64 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center">
        {/* Center Reticle */}
        <div className="w-12 h-12 rounded-full bg-neutral-900/80 border-2 border-white/30 flex items-center justify-center text-white/50">
          <span className="text-xs tracking-wider font-bold">SPAWN</span>
        </div>

        {/* Radial Items */}
        {items.map((item, index) => {
          const angle = (index * (360 / items.length)) - 90;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * radius;
          const y = Math.sin(rad) * radius;

          const isHovered = hoveredIndex === index;

          return (
            <button
              key={item.id}
              className={`absolute flex flex-col items-center justify-center w-16 h-16 rounded-full transition-all duration-200 ${
                isHovered ? 'bg-orange-500 text-white scale-110 shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-neutral-800 text-neutral-300 border border-white/10 hover:bg-neutral-700'
              }`}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else {
                  onSelectPrimitive(item.id);
                  onClose();
                }
              }}
            >
              {item.icon}
              {isHovered && (
                <span className="absolute -bottom-6 text-xs font-bold text-white whitespace-nowrap bg-black/50 px-2 py-0.5 rounded">
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
