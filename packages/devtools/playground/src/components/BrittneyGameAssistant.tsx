/**
 * BrittneyGameAssistant Component
 * 
 * Demonstrates Brittney integration for game feature generation:
 * - Generate NPC dialogue
 * - Create quests dynamically
 * - Suggest combat abilities
 * - Build entire scenes
 */

import React, { useState } from 'react';
import useBrittneyGame from '@hooks/useBrittneyGame';
import type {
  NPCDialogue,
  QuestSuggestion,
  AbilitySuggestion,
  SceneGeneration,
} from '@services/BrittneyGameIntegration';

type GenerationMode = 'dialogue' | 'quest' | 'ability' | 'scene' | 'history';

interface DialogueParams {
  npcName: string;
  npcType: string;
  emotion: 'friendly' | 'hostile' | 'neutral' | 'mysterious';
}

interface QuestParams {
  theme: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  location: string;
}

interface AbilityParams {
  abilityType: string;
  characterClass: string;
  level: number;
}

interface SceneParams {
  sceneConcept: string;
  npcCount: number;
}

const BrittneyGameAssistant: React.FC = () => {
  const brittney = useBrittneyGame();
  const [mode, setMode] = useState<GenerationMode>('dialogue');

  // Dialogue state
  const [dialogueParams, setDialogueParams] = useState<DialogueParams>({
    npcName: 'Aldric',
    npcType: 'Warrior',
    emotion: 'friendly',
  });
  const [generatedDialogues, setGeneratedDialogues] = useState<NPCDialogue[]>([]);

  // Quest state
  const [questParams, setQuestParams] = useState<QuestParams>({
    theme: 'Dragon Slaying',
    difficulty: 'hard',
    location: 'Dragon Peak',
  });
  const [generatedQuests, setGeneratedQuests] = useState<QuestSuggestion[]>([]);

  // Ability state
  const [abilityParams, setAbilityParams] = useState<AbilityParams>({
    abilityType: 'Fireball',
    characterClass: 'Mage',
    level: 5,
  });
  const [generatedAbilities, setGeneratedAbilities] = useState<AbilitySuggestion[]>([]);

  // Scene state
  const [sceneParams, setSceneParams] = useState<SceneParams>({
    sceneConcept: 'Ancient Ruins',
    npcCount: 3,
  });
  const [generatedScene, setGeneratedScene] = useState<SceneGeneration | null>(null);

  // Event history
  const [eventHistory, setEventHistory] = useState<any[]>([]);

  const handleGenerateDialogue = async () => {
    try {
      const dialogue = await brittney.generateNPCDialogue(
        dialogueParams.npcName,
        dialogueParams.npcType,
        dialogueParams.emotion
      );
      setGeneratedDialogues(prev => [dialogue, ...prev]);
    } catch (err) {
      console.error('Failed to generate dialogue:', err);
    }
  };

  const handleGenerateQuest = async () => {
    try {
      const quest = await brittney.generateQuest(
        questParams.theme,
        questParams.difficulty,
        questParams.location
      );
      setGeneratedQuests(prev => [quest, ...prev]);
    } catch (err) {
      console.error('Failed to generate quest:', err);
    }
  };

  const handleGenerateAbility = async () => {
    try {
      const ability = await brittney.generateAbility(
        abilityParams.abilityType,
        abilityParams.characterClass,
        abilityParams.level
      );
      setGeneratedAbilities(prev => [ability, ...prev]);
    } catch (err) {
      console.error('Failed to generate ability:', err);
    }
  };

  const handleGenerateScene = async () => {
    try {
      const scene = await brittney.generateScene(
        sceneParams.sceneConcept,
        sceneParams.npcCount
      );
      setGeneratedScene(scene);
    } catch (err) {
      console.error('Failed to generate scene:', err);
    }
  };

  const handleLoadHistory = () => {
    const history = brittney.getEventHistory(undefined, 20);
    setEventHistory(history);
    setMode('history');
  };

  const handleClearHistory = () => {
    brittney.clearHistory();
    setEventHistory([]);
    setGeneratedDialogues([]);
    setGeneratedQuests([]);
    setGeneratedAbilities([]);
    setGeneratedScene(null);
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 border-b border-purple-400">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          🤖 Brittney Game Assistant
        </h1>
        <p className="text-purple-200 text-sm mt-1">
          AI-powered game feature generation for Hololand Legends
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2 p-4 bg-slate-800 border-b border-slate-700 flex-wrap">
        {(['dialogue', 'quest', 'ability', 'scene', 'history'] as GenerationMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-2 rounded font-medium capitalize transition ${
              mode === m
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {m === 'dialogue' && '💬'}
            {m === 'quest' && '📜'}
            {m === 'ability' && '⚡'}
            {m === 'scene' && '🌍'}
            {m === 'history' && '📚'}
            {m}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {brittney.loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg text-purple-300">Brittney is generating...</p>
            </div>
          </div>
        )}

        {brittney.error && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-4">
            <p className="text-red-200 font-semibold">Error</p>
            <p className="text-red-100 text-sm">{brittney.error}</p>
          </div>
        )}

        {/* Dialogue Mode */}
        {mode === 'dialogue' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Generate NPC Dialogue</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">NPC Name</label>
                  <input
                    type="text"
                    value={dialogueParams.npcName}
                    onChange={e =>
                      setDialogueParams(prev => ({ ...prev, npcName: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">NPC Type</label>
                  <input
                    type="text"
                    value={dialogueParams.npcType}
                    onChange={e =>
                      setDialogueParams(prev => ({ ...prev, npcType: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Emotion</label>
                  <select
                    value={dialogueParams.emotion}
                    onChange={e =>
                      setDialogueParams(prev => ({
                        ...prev,
                        emotion: e.target.value as any,
                      }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="hostile">Hostile</option>
                    <option value="neutral">Neutral</option>
                    <option value="mysterious">Mysterious</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateDialogue}
                disabled={brittney.loading}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded font-medium transition"
              >
                Generate Dialogue
              </button>
            </div>

            {generatedDialogues.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Generated Dialogues</h3>
                {generatedDialogues.map(d => (
                  <div
                    key={d.npcId}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-purple-300">{d.npcName}</p>
                        <p className="text-sm text-slate-400">{d.emotion}</p>
                      </div>
                      <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">
                        Use
                      </button>
                    </div>
                    <p className="text-white italic">"{d.dialogue}"</p>
                    {d.suggestedAction && (
                      <p className="text-sm text-yellow-300 mt-2">[{d.suggestedAction}]</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quest Mode */}
        {mode === 'quest' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Generate Quest</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Theme</label>
                  <input
                    type="text"
                    value={questParams.theme}
                    onChange={e => setQuestParams(prev => ({ ...prev, theme: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={questParams.location}
                    onChange={e =>
                      setQuestParams(prev => ({ ...prev, location: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={questParams.difficulty}
                    onChange={e =>
                      setQuestParams(prev => ({ ...prev, difficulty: e.target.value as any }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                    <option value="legendary">Legendary</option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleGenerateQuest}
                disabled={brittney.loading}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded font-medium transition"
              >
                Generate Quest
              </button>
            </div>

            {generatedQuests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Generated Quests</h3>
                {generatedQuests.map(q => (
                  <div
                    key={q.questId}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-purple-300">{q.title}</p>
                        <p className="text-xs text-slate-400 uppercase tracking-wider">
                          {q.difficulty}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">
                        Use
                      </button>
                    </div>
                    <p className="text-white text-sm mb-3">{q.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                      <div className="bg-slate-700 rounded p-2">
                        <p className="text-slate-400">XP</p>
                        <p className="font-bold text-yellow-300">{q.rewards.experience}</p>
                      </div>
                      <div className="bg-slate-700 rounded p-2">
                        <p className="text-slate-400">Gold</p>
                        <p className="font-bold text-yellow-300">{q.rewards.gold}</p>
                      </div>
                      <div className="bg-slate-700 rounded p-2">
                        <p className="text-slate-400">Items</p>
                        <p className="font-bold text-green-300">{q.rewards.items?.length || 0}</p>
                      </div>
                    </div>
                    {q.holoScriptCode && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-blue-300 hover:text-blue-200">
                          View HoloScript Code
                        </summary>
                        <pre className="mt-2 bg-slate-900 rounded p-2 overflow-auto text-slate-300">
                          {q.holoScriptCode}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ability Mode */}
        {mode === 'ability' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Generate Combat Ability</h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Ability Type</label>
                  <input
                    type="text"
                    value={abilityParams.abilityType}
                    onChange={e =>
                      setAbilityParams(prev => ({ ...prev, abilityType: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Character Class</label>
                  <input
                    type="text"
                    value={abilityParams.characterClass}
                    onChange={e =>
                      setAbilityParams(prev => ({ ...prev, characterClass: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Character Level ({abilityParams.level})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={abilityParams.level}
                    onChange={e =>
                      setAbilityParams(prev => ({ ...prev, level: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateAbility}
                disabled={brittney.loading}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded font-medium transition"
              >
                Generate Ability
              </button>
            </div>

            {generatedAbilities.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Generated Abilities</h3>
                {generatedAbilities.map(a => (
                  <div
                    key={a.abilityId}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-purple-300">{a.name}</p>
                        <p className="text-white text-sm">{a.description}</p>
                      </div>
                      <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">
                        Use
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm mt-3">
                      <div className="bg-slate-700 rounded p-2">
                        <p className="text-slate-400">Cooldown</p>
                        <p className="font-bold text-blue-300">{a.cooldown}s</p>
                      </div>
                      <div className="bg-slate-700 rounded p-2">
                        <p className="text-slate-400">Mana</p>
                        <p className="font-bold text-cyan-300">{a.manaCost}</p>
                      </div>
                      {a.damage && (
                        <div className="bg-slate-700 rounded p-2">
                          <p className="text-slate-400">Damage</p>
                          <p className="font-bold text-red-300">{a.damage}</p>
                        </div>
                      )}
                    </div>
                    {a.holoScriptCode && (
                      <details className="text-xs mt-3">
                        <summary className="cursor-pointer text-blue-300 hover:text-blue-200">
                          View HoloScript Code
                        </summary>
                        <pre className="mt-2 bg-slate-900 rounded p-2 overflow-auto text-slate-300">
                          {a.holoScriptCode}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scene Mode */}
        {mode === 'scene' && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
              <h2 className="text-lg font-bold mb-4">Generate Scene</h2>

              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Scene Concept</label>
                  <input
                    type="text"
                    value={sceneParams.sceneConcept}
                    onChange={e =>
                      setSceneParams(prev => ({ ...prev, sceneConcept: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Number of NPCs ({sceneParams.npcCount})
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sceneParams.npcCount}
                    onChange={e =>
                      setSceneParams(prev => ({ ...prev, npcCount: parseInt(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateScene}
                disabled={brittney.loading}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded font-medium transition"
              >
                Generate Scene
              </button>
            </div>

            {generatedScene && (
              <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-purple-500 transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="font-bold text-purple-300 text-lg">{generatedScene.sceneName}</p>
                    <p className="text-white text-sm mt-2">{generatedScene.description}</p>
                  </div>
                  <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">
                    Use
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <h4 className="font-bold text-sm mb-2 text-cyan-300">NPCs</h4>
                    <div className="space-y-2">
                      {generatedScene.npcs.map(npc => (
                        <div key={npc.id} className="bg-slate-700 rounded p-2">
                          <p className="font-medium">{npc.name}</p>
                          <p className="text-xs text-slate-400">{npc.type}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {generatedScene.hazards && generatedScene.hazards.length > 0 && (
                    <div>
                      <h4 className="font-bold text-sm mb-2 text-red-300">Hazards</h4>
                      <div className="space-y-2">
                        {generatedScene.hazards.map((hazard, idx) => (
                          <div key={idx} className="bg-slate-700 rounded p-2">
                            <p className="text-sm">{hazard}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {generatedScene.environmentCode && (
                  <details className="text-xs mt-4">
                    <summary className="cursor-pointer text-blue-300 hover:text-blue-200">
                      View Environment Code
                    </summary>
                    <pre className="mt-2 bg-slate-900 rounded p-2 overflow-auto text-slate-300">
                      {generatedScene.environmentCode}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}

        {/* History Mode */}
        {mode === 'history' && (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleLoadHistory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                Refresh History
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-medium"
              >
                Clear All
              </button>
            </div>

            {eventHistory.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-bold text-lg">Event History ({eventHistory.length})</h3>
                {eventHistory.map((event, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-800 rounded-lg p-3 border border-slate-700 text-sm"
                  >
                    <div className="flex justify-between mb-2">
                      <span className="font-bold uppercase text-purple-300">{event.type}</span>
                      <span className="text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-white">{event.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-center py-8">No events recorded yet</p>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-slate-800 border-t border-slate-700 px-4 py-3 text-sm text-slate-300">
        {brittney.lastGenerated && (
          <p>
            Last generated: <span className="text-purple-300 font-medium">{brittney.lastGenerated.type}</span> at{' '}
            <span className="text-purple-300">{brittney.lastGenerated.timestamp.toLocaleTimeString()}</span>
          </p>
        )}
        {!brittney.lastGenerated && <p>Ready to generate game features...</p>}
      </div>
    </div>
  );
};

export default BrittneyGameAssistant;
