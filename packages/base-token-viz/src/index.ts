/**
 * @hololand/base-token-viz
 *
 * Base chain token visualization for Hololand
 * "Clanker token → Hololand VR in 5 mins"
 *
 * @example Quick Start
 * ```typescript
 * import { visualizeToken } from '@hololand/base-token-viz';
 *
 * // Generate HoloScript from a Base token address
 * const script = await visualizeToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
 * console.log(script); // Ready-to-render .hsplus code
 * ```
 *
 * @example With Options
 * ```typescript
 * import { BaseTokenFetcher, HoloScriptGenerator } from '@hololand/base-token-viz';
 *
 * const fetcher = new BaseTokenFetcher();
 * const generator = new HoloScriptGenerator();
 *
 * const metadata = await fetcher.fetchMetadata('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
 * const script = generator.generate(metadata, {
 *   style: 'galaxy',
 *   animated: true,
 *   grabbable: true,
 * });
 * ```
 *
 * @packageDocumentation
 */

// Core exports
export {
  BaseTokenFetcher,
  createFetcher,
  KNOWN_TOKENS,
  BASE_RPC_URLS,
  type TokenMetadata,
  type FetcherOptions,
} from './BaseTokenFetcher';

export {
  HoloScriptGenerator,
  createGenerator,
  type VizStyle,
  type ColorScheme,
  type GeneratorOptions,
} from './HoloScriptGenerator';

// Clanker exports
export {
  ClankerTokenFetcher,
  createClankerFetcher,
  CLANKER_FACTORIES,
  CLANKER_INFRASTRUCTURE,
  type ClankerTokenMetadata,
  type ClankerFetcherOptions,
  type ClankerWarning,
  type FactoryVersion,
} from './ClankerTokenFetcher';

// Re-export types
export type { Address } from 'viem';

/**
 * Quick visualization function - fetches token and generates HoloScript in one call
 *
 * @param tokenAddress - Base chain ERC-20 token address
 * @param style - Visualization style (default: 'orb')
 * @returns Ready-to-render HoloScript code
 *
 * @example
 * ```typescript
 * // Visualize USDC on Base
 * const script = await visualizeToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
 *
 * // Visualize with galaxy style
 * const galaxyScript = await visualizeToken(address, 'galaxy');
 * ```
 */
export async function visualizeToken(
  tokenAddress: string,
  style: import('./HoloScriptGenerator').VizStyle = 'orb'
): Promise<string> {
  const { BaseTokenFetcher } = await import('./BaseTokenFetcher');
  const { HoloScriptGenerator } = await import('./HoloScriptGenerator');

  const fetcher = new BaseTokenFetcher();
  const generator = new HoloScriptGenerator();

  const metadata = await fetcher.fetchMetadata(tokenAddress);
  return generator.generate(metadata, { style });
}

/**
 * Visualize a Clanker token with enhanced metadata
 *
 * Fetches Clanker-specific data (Farcaster identity, factory version, warnings)
 * and generates HoloScript with appropriate visual indicators.
 *
 * API key can be provided via:
 * 1. Function argument: `visualizeClankerToken('0x...', 'orb', 'KEY')`
 * 2. Environment variable: `BITQUERY_API_KEY=KEY`
 *
 * @param tokenAddress - Clanker token contract address on Base
 * @param style - Visualization style (default: 'orb')
 * @param bitqueryApiKey - Optional Bitquery API key (falls back to BITQUERY_API_KEY env var)
 * @returns Ready-to-render HoloScript code with Clanker info
 *
 * @example
 * ```typescript
 * // With env var set (BITQUERY_API_KEY)
 * const script = await visualizeClankerToken('0x...', 'galaxy');
 *
 * // Or pass key directly
 * const fullScript = await visualizeClankerToken('0x...', 'orb', 'YOUR_BITQUERY_KEY');
 * ```
 */
export async function visualizeClankerToken(
  tokenAddress: string,
  style: import('./HoloScriptGenerator').VizStyle = 'orb',
  bitqueryApiKey?: string
): Promise<string> {
  const { ClankerTokenFetcher } = await import('./ClankerTokenFetcher');
  const { HoloScriptGenerator } = await import('./HoloScriptGenerator');

  // ClankerTokenFetcher will fall back to BITQUERY_API_KEY env var if not provided
  const fetcher = new ClankerTokenFetcher({ bitqueryApiKey });
  const generator = new HoloScriptGenerator();

  const metadata = await fetcher.fetchClankerMetadata(tokenAddress);
  return generator.generate(metadata, {
    style,
    showClankerInfo: true,
    showWarnings: true,
  });
}

/**
 * Validate a token address without fetching
 */
export function isValidTokenAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Get a color scheme for a token based on its metadata
 */
export function getTokenColorScheme(
  symbol: string,
  name: string
): import('./HoloScriptGenerator').ColorScheme {
  const combined = `${symbol} ${name}`.toLowerCase();

  if (/usdc|usdt|dai|busd|tusd|frax|usd/i.test(combined)) {
    return {
      primary: '#00ff88',
      secondary: '#00cc66',
      glow: '#66ffaa',
      background: '#0f2f1f',
    };
  }

  if (/doge|shib|pepe|wojak|inu|cat|dog|frog|moon|elon/i.test(combined)) {
    return {
      primary: '#ff6600',
      secondary: '#ff3300',
      glow: '#ffaa00',
      background: '#2f1f0f',
    };
  }

  if (/aave|comp|uni|sushi|curve|lido|maker|yearn/i.test(combined)) {
    return {
      primary: '#8b5cf6',
      secondary: '#6d28d9',
      glow: '#a78bfa',
      background: '#1f0f2f',
    };
  }

  return {
    primary: '#00d4ff',
    secondary: '#0088cc',
    glow: '#00ffff',
    background: '#16213e',
  };
}

/**
 * Package version
 */
export const VERSION = '1.0.0';

/**
 * Package metadata
 */
export const PACKAGE = {
  name: '@hololand/base-token-viz',
  version: VERSION,
  description: "Base chain token visualization for Hololand - 'Clanker for worlds'",
  chainId: 8453,
  chainName: 'Base',
};
