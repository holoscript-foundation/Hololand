/**
 * Avatar Selector Component
 * 
 * Allows users to choose their avatar during onboarding
 */

import { useState } from 'react';

interface Avatar {
  id: string;
  name: string;
  preview: string;
  description: string;
  category: 'human' | 'robot' | 'fantasy' | 'animal';
}

const AVATARS: Avatar[] = [
  // Human avatars
  { id: 'human-1', name: 'Explorer', preview: '🧑‍🚀', description: 'Ready for adventure', category: 'human' },
  { id: 'human-2', name: 'Artist', preview: '🧑‍🎨', description: 'Creative soul', category: 'human' },
  { id: 'human-3', name: 'Scientist', preview: '🧑‍🔬', description: 'Curious mind', category: 'human' },
  { id: 'human-4', name: 'Athlete', preview: '🏃', description: 'Fast and agile', category: 'human' },
  
  // Robot avatars
  { id: 'robot-1', name: 'Cyber', preview: '🤖', description: 'Digital native', category: 'robot' },
  { id: 'robot-2', name: 'Mech', preview: '🦾', description: 'Power suit equipped', category: 'robot' },
  
  // Fantasy avatars
  { id: 'fantasy-1', name: 'Wizard', preview: '🧙', description: 'Master of magic', category: 'fantasy' },
  { id: 'fantasy-2', name: 'Elf', preview: '🧝', description: 'Nature guardian', category: 'fantasy' },
  { id: 'fantasy-3', name: 'Fairy', preview: '🧚', description: 'Light and playful', category: 'fantasy' },
  
  // Animal avatars
  { id: 'animal-1', name: 'Fox', preview: '🦊', description: 'Clever and quick', category: 'animal' },
  { id: 'animal-2', name: 'Wolf', preview: '🐺', description: 'Pack leader', category: 'animal' },
  { id: 'animal-3', name: 'Dragon', preview: '🐉', description: 'Legendary power', category: 'animal' },
];

interface AvatarSelectorProps {
  onSelect: (avatarId: string) => void;
  selectedId?: string;
}

export function AvatarSelector({ onSelect, selectedId }: AvatarSelectorProps) {
  const [category, setCategory] = useState<Avatar['category'] | 'all'>('all');
  
  const filteredAvatars = category === 'all' 
    ? AVATARS 
    : AVATARS.filter(a => a.category === category);

  return (
    <div className="avatar-selector">
      <style>{`
        .avatar-selector {
          width: 100%;
          max-width: 500px;
        }
        
        .category-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .category-tab {
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .category-tab:hover {
          background: rgba(255, 255, 255, 0.15);
        }
        
        .category-tab.active {
          background: rgba(74, 222, 128, 0.2);
          border-color: #4ade80;
          color: #4ade80;
        }
        
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        
        @media (max-width: 500px) {
          .avatar-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        
        .avatar-card {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          padding: 12px;
        }
        
        .avatar-card:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-4px);
        }
        
        .avatar-card.selected {
          background: rgba(74, 222, 128, 0.2);
          border-color: #4ade80;
          box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);
        }
        
        .avatar-preview {
          font-size: 40px;
          margin-bottom: 8px;
        }
        
        .avatar-name {
          font-size: 12px;
          color: white;
          font-weight: 500;
        }
        
        .avatar-desc {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
        }
      `}</style>
      
      {/* Category tabs */}
      <div className="category-tabs">
        {(['all', 'human', 'robot', 'fantasy', 'animal'] as const).map(cat => (
          <button
            key={cat}
            className={`category-tab ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat === 'all' ? '🌟 All' : 
             cat === 'human' ? '👤 Human' :
             cat === 'robot' ? '🤖 Robot' :
             cat === 'fantasy' ? '✨ Fantasy' : '🐾 Animal'}
          </button>
        ))}
      </div>
      
      {/* Avatar grid */}
      <div className="avatar-grid">
        {filteredAvatars.map(avatar => (
          <div
            key={avatar.id}
            className={`avatar-card ${selectedId === avatar.id ? 'selected' : ''}`}
            onClick={() => onSelect(avatar.id)}
          >
            <div className="avatar-preview">{avatar.preview}</div>
            <div className="avatar-name">{avatar.name}</div>
            <div className="avatar-desc">{avatar.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AvatarSelector;
