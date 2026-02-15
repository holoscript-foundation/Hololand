import { useState, useCallback, useRef } from 'react';
import {
  translateToHoloScript,
  streamHoloScript,
  validateHoloScript,
  getWorldSuggestions,
  getWorldTemplates,
} from '@/services/brittneyService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  code?: string;
  timestamp: number;
}

interface BrittneyState {
  messages: Message[];
  isGenerating: boolean;
  currentCode: string;
  error: string | null;
}

/**
 * Hook for interacting with Brittney AI
 */
export function useBrittney() {
  const [state, setState] = useState<BrittneyState>({
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hi! I'm Brittney, your AI world builder. Describe the world you want to create, and I'll generate the HoloScript code for you.

Try something like:
• "Create a cozy coffee shop with jazz music"
• "Build a neon arcade with retro games"
• "Design a zen garden with koi pond"`,
        timestamp: Date.now(),
      },
    ],
    isGenerating: false,
    currentCode: '',
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message to Brittney and get HoloScript
   */
  const sendMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || state.isGenerating) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMessage],
      isGenerating: true,
      error: null,
    }));

    try {
      const result = await translateToHoloScript(prompt, {
        worldContext: state.currentCode || undefined,
        style: 'balanced',
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.success
          ? "Here's your generated HoloScript:"
          : `I encountered an error: ${result.errors?.join(', ')}`,
        code: result.holoScript,
        timestamp: Date.now(),
      };

      setState((s) => ({
        ...s,
        messages: [...s.messages, assistantMessage],
        currentCode: result.holoScript || s.currentCode,
        isGenerating: false,
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        isGenerating: false,
        error: (error as Error).message,
      }));
    }
  }, [state.isGenerating, state.currentCode]);

  /**
   * Stream a message with real-time updates
   */
  const streamMessage = useCallback(async (prompt: string) => {
    if (!prompt.trim() || state.isGenerating) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      code: '',
      timestamp: Date.now(),
    };

    setState((s) => ({
      ...s,
      messages: [...s.messages, userMessage, assistantMessage],
      isGenerating: true,
      error: null,
    }));

    abortControllerRef.current = new AbortController();

    try {
      let fullCode = '';
      let fullText = '';

      for await (const chunk of streamHoloScript(prompt, {
        worldContext: state.currentCode || undefined,
      })) {
        if (chunk.type === 'code') {
          fullCode += chunk.content;
        } else if (chunk.type === 'text') {
          fullText += chunk.content;
        } else if (chunk.type === 'done') {
          break;
        } else if (chunk.type === 'error') {
          throw new Error(chunk.content);
        }

        // Update message in real-time
        setState((s) => ({
          ...s,
          messages: s.messages.map((m) =>
            m.id === assistantId
              ? { ...m, content: fullText, code: fullCode }
              : m
          ),
        }));
      }

      setState((s) => ({
        ...s,
        currentCode: fullCode || s.currentCode,
        isGenerating: false,
      }));
    } catch (error) {
      setState((s) => ({
        ...s,
        isGenerating: false,
        error: (error as Error).message,
      }));
    }
  }, [state.isGenerating, state.currentCode]);

  /**
   * Cancel ongoing generation
   */
  const cancelGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setState((s) => ({ ...s, isGenerating: false }));
  }, []);

  /**
   * Update the current code manually
   */
  const setCode = useCallback((code: string) => {
    setState((s) => ({ ...s, currentCode: code }));
  }, []);

  /**
   * Validate current code
   */
  const validate = useCallback(() => {
    return validateHoloScript(state.currentCode);
  }, [state.currentCode]);

  /**
   * Clear conversation
   */
  const clearConversation = useCallback(() => {
    setState((s) => ({
      ...s,
      messages: s.messages.slice(0, 1), // Keep welcome message
      error: null,
    }));
  }, []);

  /**
   * Apply a suggestion prompt
   */
  const applySuggestion = useCallback((suggestion: string) => {
    sendMessage(suggestion);
  }, [sendMessage]);

  return {
    // State
    messages: state.messages,
    isGenerating: state.isGenerating,
    currentCode: state.currentCode,
    error: state.error,

    // Actions
    sendMessage,
    streamMessage,
    cancelGeneration,
    setCode,
    validate,
    clearConversation,
    applySuggestion,

    // Helpers
    suggestions: getWorldSuggestions(),
    templates: getWorldTemplates(),
  };
}
