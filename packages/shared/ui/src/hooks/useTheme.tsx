import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type ColorTokens, type ThemeName, themes, darkTheme } from '../tokens/colors';

/**
 * Theme context providing the active color tokens and theme switching capability.
 */
export interface ThemeContextValue {
  /** Current theme name */
  themeName: ThemeName;
  /** Resolved color tokens for the active theme */
  colors: ColorTokens;
  /** Switch to a different theme */
  setTheme: (theme: ThemeName) => void;
  /** Toggle between dark and light */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  /** Initial theme. Defaults to 'dark'. */
  defaultTheme?: ThemeName;
  children: ReactNode;
}

/**
 * Provides theme context to the component tree.
 *
 * @example
 * ```tsx
 * <ThemeProvider defaultTheme="dark">
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ defaultTheme = 'dark', children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(defaultTheme);

  const setTheme = useCallback((theme: ThemeName) => {
    setThemeName(theme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      themeName,
      colors: themes[themeName],
      setTheme,
      toggleTheme,
    }),
    [themeName, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Access the current theme context.
 * Must be used within a ThemeProvider.
 *
 * @example
 * ```tsx
 * const { colors, toggleTheme } = useTheme();
 * ```
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback to dark theme when no provider is present (standalone usage)
    return {
      themeName: 'dark',
      colors: darkTheme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return ctx;
}
