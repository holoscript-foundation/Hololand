/**
 * usePersistedState Hook
 *
 * useState that persists to localStorage, surviving page refreshes
 * and mode transitions.
 */

import { useState, useEffect, useCallback } from 'react';

export function usePersistedState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize from localStorage or use default
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch (error) {
      console.warn(`Failed to load persisted state for ${key}:`, error);
    }

    return initialValue;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Failed to persist state for ${key}:`, error);
    }
  }, [key, state]);

  // Wrapped setter that handles both value and function updates
  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = value instanceof Function ? value(prev) : value;
      return newValue;
    });
  }, []);

  return [state, setPersistedState];
}
