/**
 * useDevToolsHoloScript Hook
 * 
 * React hook that subscribes to live HoloScript updates from the IDE.
 * When Brittney generates new HoloScript, it appears live in the browser.
 */

import { useState, useEffect, useCallback } from 'react';

interface UseDevToolsHoloScriptResult {
  /** Current HoloScript content (either from file or live injection) */
  holoScript: string;
  /** Whether the script was injected live from IDE */
  isLiveInjected: boolean;
  /** Current world/scene */
  currentWorld: string;
  /** Manually set HoloScript (from file load) */
  setHoloScript: (script: string) => void;
  /** Force refresh the script */
  refresh: () => void;
}

export function useDevToolsHoloScript(initialScript: string = ''): UseDevToolsHoloScriptResult {
  const [holoScript, setHoloScript] = useState(initialScript);
  const [isLiveInjected, setIsLiveInjected] = useState(false);
  const [currentWorld, setCurrentWorld] = useState('oasis');

  useEffect(() => {
    // Subscribe to live HoloScript updates from IDE
    const api = window.__HOLOLAND_CENTRAL__;
    if (!api) return;

    const unsubHoloScript = api.onHoloScriptUpdate((script) => {
      console.log('[useDevToolsHoloScript] Live update received:', script.slice(0, 50) + '...');
      setHoloScript(script);
      setIsLiveInjected(true);
    });

    const unsubWorld = api.onWorldChange((world) => {
      console.log('[useDevToolsHoloScript] World changed:', world);
      setCurrentWorld(world);
    });

    return () => {
      unsubHoloScript();
      unsubWorld();
    };
  }, []);

  // When initial script changes, update (e.g., from file load)
  useEffect(() => {
    if (initialScript && initialScript !== holoScript) {
      setHoloScript(initialScript);
      setIsLiveInjected(false);
    }
  }, [initialScript]);

  const handleSetHoloScript = useCallback((script: string) => {
    setHoloScript(script);
    setIsLiveInjected(false);
  }, []);

  const refresh = useCallback(() => {
    const api = window.__HOLOLAND_CENTRAL__;
    if (api?.holoScriptContent) {
      setHoloScript(api.holoScriptContent);
    }
  }, []);

  return {
    holoScript,
    isLiveInjected,
    currentWorld,
    setHoloScript: handleSetHoloScript,
    refresh,
  };
}

// Type declarations for global API
declare global {
  interface Window {
    __HOLOLAND_CENTRAL__?: {
      appId: string;
      version: string;
      currentWorld: string;
      holoScriptContent: string;
      injectHoloScript: (script: string) => void;
      navigateTo: (world: string) => void;
      getScenes: () => string[];
      getStats: () => unknown;
      onWorldChange: (callback: (world: string) => void) => () => void;
      onHoloScriptUpdate: (callback: (script: string) => void) => () => void;
    };
  }
}
