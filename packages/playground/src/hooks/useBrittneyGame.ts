/**
 * useBrittneyGame Hook - React integration for Brittney game features
 * 
 * Provides easy access to Brittney's game generation capabilities:
 * - NPC dialogue
 * - Quest generation
 * - Ability suggestions
 * - Scene creation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import BrittneyGameIntegration, {
  type NPCDialogue,
  type QuestSuggestion,
  type AbilitySuggestion,
  type SceneGeneration,
  type GameEvent,
  type BrittneyGameContext,
} from '../services/BrittneyGameIntegration';

export interface UseBrittneyGameState {
  loading: boolean;
  error: string | null;
  lastGenerated?: {
    type: 'dialogue' | 'quest' | 'ability' | 'scene';
    timestamp: Date;
  };
}

export interface UseBrittneyGameReturn {
  // State
  loading: boolean;
  error: string | null;
  lastGenerated?: UseBrittneyGameState['lastGenerated'];

  // Generation methods
  generateNPCDialogue: (
    npcName: string,
    npcType: string,
    emotion?: 'friendly' | 'hostile' | 'neutral' | 'mysterious',
    playerContext?: string
  ) => Promise<NPCDialogue>;

  generateQuest: (
    theme: string,
    difficulty?: 'easy' | 'medium' | 'hard' | 'legendary',
    location?: string
  ) => Promise<QuestSuggestion>;

  generateAbility: (
    abilityType: string,
    characterClass: string,
    level?: number
  ) => Promise<AbilitySuggestion>;

  generateScene: (sceneConcept: string, npcCount?: number) => Promise<SceneGeneration>;

  // Context management
  setGameContext: (context: Partial<BrittneyGameContext>) => void;
  getGameContext: () => BrittneyGameContext;

  // History
  getDialogueHistory: (npcName: string) => NPCDialogue[];
  getEventHistory: (type?: GameEvent['type'], limit?: number) => GameEvent[];
  clearHistory: () => void;

  // Batch generation
  generateMultiple: <T extends 'dialogue' | 'quest' | 'ability'>(
    type: T,
    count: number,
    params: Record<string, any>
  ) => Promise<any[]>;
}

export function useBrittneyGame(
  apiBaseUrl: string = 'http://localhost:3001',
  apiKey?: string
): UseBrittneyGameReturn {
  const [state, setState] = useState<UseBrittneyGameState>({
    loading: false,
    error: null,
  });

  const brittney = useRef<BrittneyGameIntegration | null>(null);

  // Initialize Brittney integration
  useEffect(() => {
    brittney.current = new BrittneyGameIntegration(apiBaseUrl, apiKey);
  }, [apiBaseUrl, apiKey]);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const recordGeneration = useCallback(
    (type: 'dialogue' | 'quest' | 'ability' | 'scene') => {
      setState(prev => ({
        ...prev,
        lastGenerated: { type, timestamp: new Date() },
      }));
    },
    []
  );

  // Generate NPC Dialogue
  const generateNPCDialogue = useCallback(
    async (
      npcName: string,
      npcType: string,
      emotion: 'friendly' | 'hostile' | 'neutral' | 'mysterious' = 'neutral',
      playerContext?: string
    ): Promise<NPCDialogue> => {
      setLoading(true);
      setError(null);
      try {
        const dialogue = await brittney.current!.generateNPCDialogue(
          npcName,
          npcType,
          emotion,
          playerContext
        );
        recordGeneration('dialogue');
        return dialogue;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate dialogue';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [recordGeneration]
  );

  // Generate Quest
  const generateQuest = useCallback(
    async (
      theme: string,
      difficulty: 'easy' | 'medium' | 'hard' | 'legendary' = 'medium',
      location?: string
    ): Promise<QuestSuggestion> => {
      setLoading(true);
      setError(null);
      try {
        const quest = await brittney.current!.generateQuest(theme, difficulty, location);
        recordGeneration('quest');
        return quest;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate quest';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [recordGeneration]
  );

  // Generate Ability
  const generateAbility = useCallback(
    async (
      abilityType: string,
      characterClass: string,
      level: number = 1
    ): Promise<AbilitySuggestion> => {
      setLoading(true);
      setError(null);
      try {
        const ability = await brittney.current!.generateAbility(
          abilityType,
          characterClass,
          level
        );
        recordGeneration('ability');
        return ability;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate ability';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [recordGeneration]
  );

  // Generate Scene
  const generateScene = useCallback(
    async (sceneConcept: string, npcCount: number = 3): Promise<SceneGeneration> => {
      setLoading(true);
      setError(null);
      try {
        const scene = await brittney.current!.generateScene(sceneConcept, npcCount);
        recordGeneration('scene');
        return scene;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to generate scene';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [recordGeneration]
  );

  // Set game context
  const setGameContext = useCallback((context: Partial<BrittneyGameContext>) => {
    brittney.current?.setGameContext(context);
  }, []);

  // Get game context
  const getGameContext = useCallback((): BrittneyGameContext => {
    return brittney.current?.getGameContext() || {};
  }, []);

  // Get dialogue history
  const getDialogueHistory = useCallback(
    (npcName: string): NPCDialogue[] => {
      return brittney.current?.getDialogueHistory(npcName) || [];
    },
    []
  );

  // Get event history
  const getEventHistory = useCallback(
    (type?: GameEvent['type'], limit: number = 50): GameEvent[] => {
      return brittney.current?.getEventHistory(type, limit) || [];
    },
    []
  );

  // Clear history
  const clearHistory = useCallback(() => {
    brittney.current?.clearHistory();
  }, []);

  // Batch generation
  const generateMultiple = useCallback(
    async <T extends 'dialogue' | 'quest' | 'ability'>(
      type: T,
      count: number,
      params: Record<string, any>
    ): Promise<any[]> => {
      setLoading(true);
      setError(null);
      const results: any[] = [];

      try {
        for (let i = 0; i < count; i++) {
          try {
            if (type === 'dialogue') {
              const dialogue = await generateNPCDialogue(
                params.npcName || `NPC ${i + 1}`,
                params.npcType || 'Generic',
                params.emotion || 'neutral',
                params.playerContext
              );
              results.push(dialogue);
            } else if (type === 'quest') {
              const quest = await generateQuest(
                params.theme || `Quest ${i + 1}`,
                params.difficulty || 'medium',
                params.location
              );
              results.push(quest);
            } else if (type === 'ability') {
              const ability = await generateAbility(
                params.abilityType || `Ability ${i + 1}`,
                params.characterClass || 'Warrior',
                params.level || 1
              );
              results.push(ability);
            }
          } catch (err) {
            console.error(`Failed to generate ${type} ${i + 1}:`, err);
            // Continue with next generation
          }
        }
        recordGeneration(type as any);
        return results;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : `Failed to generate ${type}s`;
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [generateNPCDialogue, generateQuest, generateAbility, recordGeneration]
  );

  return {
    // State
    loading: state.loading,
    error: state.error,
    lastGenerated: state.lastGenerated,

    // Methods
    generateNPCDialogue,
    generateQuest,
    generateAbility,
    generateScene,
    setGameContext,
    getGameContext,
    getDialogueHistory,
    getEventHistory,
    clearHistory,
    generateMultiple,
  };
}

export default useBrittneyGame;
