/**
 * StoryWeaver Protocol Demo Page
 *
 * Complete demo showcasing the StoryWeaver Protocol:
 * - Grand Hall 3D viewer with portals
 * - Quest progress tracking
 * - AI companion integration
 * - Interactive UI components
 */

import { useState } from 'react';
import { GrandHallViewer } from '../components/GrandHallViewer';
import { useQuestStore, useQuestActions } from '../state/QuestStateDB';
import { useQuestSync } from '../hooks/useQuestSync';
import { useEvent } from '../events/EventBus';
import { getCompanion } from '../ai/AICompanion';
import './StoryWeaverDemo.css';

export function StoryWeaverDemo() {
  const [showQuestLog, setShowQuestLog] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ from: string; text: string }>>([]);
  const [currentCompanion, setCurrentCompanion] = useState<string | null>(null);

  // Quest state
  const progress = useQuestStore(state => state.progress);
  const actions = useQuestActions();

  // Listen for portal activation
  useEvent('PortalActivated', (payload) => {
    console.log('[StoryWeaverDemo] Portal activated:', payload);

    // Open chat with appropriate companion
    if (payload.genre === 'adventure') {
      setCurrentCompanion('adventure_guide');
      setChatOpen(true);
      addSystemMessage('Captain Compass has appeared!');
    } else if (payload.genre === 'fantasy') {
      setCurrentCompanion('fantasy_guide');
      setChatOpen(true);
      addSystemMessage('Lumina Starweaver greets you!');
    }
  });

  // Listen for quest completion
  useEvent('QuestCompleted', (payload) => {
    console.log('[StoryWeaverDemo] Quest completed:', payload);
    addSystemMessage(`Quest "${payload.questId}" complete! Rewards: ${JSON.stringify(payload.rewards)}`);
  });

  // Listen for skill increases
  useEvent('SkillIncreased', (payload) => {
    console.log('[StoryWeaverDemo] Skill increased:', payload);
    addSystemMessage(`${payload.skill} increased: ${payload.oldValue} → ${payload.newValue}`);
  });

  function addSystemMessage(text: string) {
    setChatHistory(prev => [...prev, { from: 'system', text }]);
  }

  async function sendChatMessage() {
    if (!chatMessage.trim() || !currentCompanion) return;

    const message = chatMessage.trim();
    setChatMessage('');

    // Add user message to history
    setChatHistory(prev => [...prev, { from: 'user', text: message }]);

    // Get companion response
    const companion = getCompanion(currentCompanion);
    const response = await companion.chat({
      message,
      playerContext: progress,
    });

    // Add companion response
    setChatHistory(prev => [...prev, { from: 'companion', text: response }]);
  }

  return (
    <div className="storyweaver-demo">
      {/* 3D Viewer */}
      <div className="viewer-container">
        <GrandHallViewer debug={false} />
      </div>

      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Header */}
        <header className="demo-header">
          <h1>📚 The StoryWeaver Protocol</h1>
          <p className="subtitle">Interactive Library Experience</p>
        </header>

        {/* Control Panel */}
        <div className="control-panel">
          <button onClick={() => setShowQuestLog(!showQuestLog)} className="control-btn">
            📋 Quest Log
          </button>
          <button onClick={() => setShowSkills(!showSkills)} className="control-btn">
            ⭐ Skills
          </button>
          <button onClick={() => setChatOpen(!chatOpen)} className="control-btn">
            💬 Chat
          </button>
        </div>

        {/* Quest Log Panel */}
        {showQuestLog && (
          <div className="panel quest-log">
            <div className="panel-header">
              <h3>📋 Quest Log</h3>
              <button onClick={() => setShowQuestLog(false)}>✕</button>
            </div>
            <div className="panel-content">
              <div className="quest-section">
                <h4>Active Quests ({progress.quests.active.length})</h4>
                {progress.quests.active.length === 0 ? (
                  <p className="empty-state">No active quests. Visit a portal to begin!</p>
                ) : (
                  progress.quests.active.map(quest => (
                    <div key={quest.id} className="quest-item">
                      <div className="quest-name">{quest.title}</div>
                      <div className="quest-progress">
                        Progress: {quest.progress}%
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="quest-section">
                <h4>Completed Quests ({progress.quests.completed.length})</h4>
                {progress.quests.completed.map(quest => (
                  <div key={quest.id} className="quest-item completed">
                    <div className="quest-name">✓ {quest.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Skills Panel */}
        {showSkills && (
          <div className="panel skills">
            <div className="panel-header">
              <h3>⭐ Skills</h3>
              <button onClick={() => setShowSkills(false)}>✕</button>
            </div>
            <div className="panel-content">
              {Object.entries(progress.skills).map(([skill, value]) => (
                <div key={skill} className="skill-item">
                  <div className="skill-name">{skill}</div>
                  <div className="skill-bar">
                    <div
                      className="skill-fill"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <div className="skill-value">{value}/100</div>
                </div>
              ))}

              <div className="badges-section">
                <h4>🏆 Badges ({progress.badges.length})</h4>
                {progress.badges.length === 0 ? (
                  <p className="empty-state">No badges yet. Complete quests to earn them!</p>
                ) : (
                  <div className="badges-grid">
                    {progress.badges.map((badge, i) => (
                      <div key={i} className="badge">
                        🏆 {badge}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat Panel */}
        {chatOpen && (
          <div className="panel chat">
            <div className="panel-header">
              <h3>💬 {currentCompanion ? getCompanion(currentCompanion).config.name : 'Chat'}</h3>
              <button onClick={() => setChatOpen(false)}>✕</button>
            </div>
            <div className="panel-content">
              <div className="chat-history">
                {chatHistory.length === 0 ? (
                  <p className="empty-state">
                    Click on a portal or NPC to start a conversation!
                  </p>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={`chat-message ${msg.from}`}>
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              {currentCompanion && (
                <div className="chat-input">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={e => setChatMessage(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type your message..."
                  />
                  <button onClick={sendChatMessage}>Send</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portal Status */}
        <div className="portal-status">
          <div className="portal-indicator">
            <span className={progress.portals.adventure ? 'unlocked' : 'locked'}>
              {progress.portals.adventure ? '🟢' : '🔴'} Adventure
            </span>
          </div>
          <div className="portal-indicator">
            <span className={progress.portals.fantasy ? 'unlocked' : 'locked'}>
              {progress.portals.fantasy ? '🟢' : '🔴'} Fantasy
            </span>
          </div>
          <div className="portal-indicator">
            <span className={progress.portals.horror ? 'unlocked' : 'locked'}>
              {progress.portals.horror ? '🟢' : '🔴'} Horror
            </span>
          </div>
          <div className="portal-indicator">
            <span className={progress.portals.history ? 'unlocked' : 'locked'}>
              {progress.portals.history ? '🟢' : '🔴'} History
            </span>
          </div>
        </div>

        {/* Debug Actions */}
        <div className="debug-actions">
          <button onClick={() => actions.unlockPortal('adventure')}>🔓 Unlock Adventure</button>
          <button onClick={() => actions.unlockPortal('fantasy')}>🔓 Unlock Fantasy</button>
          <button onClick={() => actions.increaseSkill('courage', 10)}>⬆️ +10 Courage</button>
        </div>
      </div>
    </div>
  );
}
