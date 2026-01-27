
import { useState, useEffect } from 'react';

const API_KEY_STORAGE = 'infinity_boost_api_key';

export interface BoostState {
  isActive: boolean;
  apiKey: string | null;
  tier: 'basic' | 'pro' | 'enterprise';
}

export function useInfinityBoost() {
  const [boostState, setBoostState] = useState<BoostState>({
    isActive: false,
    apiKey: null,
    tier: 'basic'
  });

  useEffect(() => {
    // Load from local storage on mount
    const storedKey = localStorage.getItem(API_KEY_STORAGE);
    if (storedKey) {
      validateAndSetKey(storedKey);
    }
  }, []);

  const validateAndSetKey = async (key: string) => {
    // Basic validation (length check, format)
    if (!key || key.length < 10 || !key.startsWith('inf_')) {
        console.warn("Invalid API Key format");
        return false;
    }

    // In a real app, we'd ping an endpoint to verify status.
    // Here we simulate the handshake.
    
    localStorage.setItem(API_KEY_STORAGE, key);
    setBoostState({
      isActive: true,
      apiKey: key,
      tier: 'pro' // Default to pro for valid keys
    });
    return true;
  };

  const clearBoost = () => {
    localStorage.removeItem(API_KEY_STORAGE);
    setBoostState({
      isActive: false,
      apiKey: null,
      tier: 'basic'
    });
  };

  return {
    ...boostState,
    activateBoost: validateAndSetKey,
    deactivateBoost: clearBoost
  };
}
