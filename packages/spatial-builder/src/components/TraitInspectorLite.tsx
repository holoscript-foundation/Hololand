import React, { useState } from 'react';
import { Sliders, X, Save, Box } from 'lucide-react';

export interface TraitInspectorLiteProps {
  targetObjectId: string;
  initialType: string;
  onClose: () => void;
  onUpdate: (payload: any) => void;
  position?: { x: number; y: number };
}

export function TraitInspectorLite({ targetObjectId, initialType, onClose, onUpdate, position = { x: 800, y: 300 } }: TraitInspectorLiteProps) {
  const [color, setColor] = useState('#ffffff');
  const [scale, setScale] = useState(1.0);
  const [damage, setDamage] = useState(10);
  
  const isWeapon = initialType === 'sword';

  const handleApply = () => {
    // Package into an abstract intent that SpatialBridgeService will interpret
    const payload = {
      targetId: targetObjectId,
      type: initialType,
      modifiers: {
        color,
        scale,
        damage: isWeapon ? damage : undefined
      }
    };
    onUpdate(payload);
  };

  return (
    <div 
      className="fixed z-50 bg-neutral-900/90 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden"
      style={{ left: position.x, top: position.y, width: '280px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center gap-2 text-white/90 font-medium">
          <Sliders size={16} className="text-orange-400" />
          <span className="text-sm tracking-wide">{initialType.toUpperCase()} TRAITS</span>
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Sliders */}
      <div className="p-4 space-y-4">
        
        {/* Color */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Core Color</span>
            <span className="font-mono">{color}</span>
          </div>
          <input 
            type="color" 
            value={color} 
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-8 rounded shrink-0 cursor-pointer bg-transparent border-0" 
          />
        </div>

        {/* Scale */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>Item Scale</span>
            <span className="font-mono">{scale.toFixed(1)}x</span>
          </div>
          <input 
            type="range" 
            min="0.1" max="5.0" step="0.1"
            value={scale} 
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full accent-orange-500" 
          />
        </div>

        {/* Damage (Conditional) */}
        {isWeapon && (
          <div className="space-y-1 pt-2 border-t border-white/10">
            <div className="flex justify-between text-xs text-white/50 mb-1">
              <span className="text-red-400 font-semibold">Base Damage</span>
              <span className="font-mono text-red-400">{damage}</span>
            </div>
            <input 
              type="range" 
              min="1" max="100" step="1"
              value={damage} 
              onChange={(e) => setDamage(parseInt(e.target.value))}
              className="w-full accent-red-500" 
            />
          </div>
        )}

      </div>

      {/* Footer */}
      <div className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
        <button 
          onClick={handleApply}
          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Save size={14} />
          Apply Traits
        </button>
      </div>
    </div>
  );
}
