/**
 * BaseTokenFetcher - Fetch ERC-20 token metadata from Base chain
 *
 * Uses viem for lightweight, type-safe Ethereum interaction.
 * Designed for read-only token visualization (no wallet required).
 *
 * @example
 * ```typescript
 * import { BaseTokenFetcher } from '@hololand/base-token-viz';
 *
 * const fetcher = new BaseTokenFetcher();
 * const metadata = await fetcher.fetchMetadata('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
 * console.log(metadata); // { name: 'USD Coin', symbol: 'USDC', decimals: 6, ... }
 * ```
 *
 * @module
 */

import { createPublicClient, http, type Address } from 'viem';
import { base } from 'viem/chains';

// Use a simplified client type to avoid viem version conflicts in DTS
type BasePublicClient = ReturnType<typeof createPublicClient>;

/**
 * Minimal ERC-20 ABI for metadata fetching
 */
const ERC20_ABI = [
  {
    type: 'function',
    name: 'name',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'totalSupply',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Token metadata returned from Base chain
 */
export interface TokenMetadata {
  /** Token contract address */
  address: Address;
  /** Token name (e.g., "USD Coin") */
  name: string;
  /** Token symbol (e.g., "USDC") */
  symbol: string;
  /** Token decimals (e.g., 6 for USDC, 18 for most tokens) */
  decimals: number;
  /** Total supply in raw units */
  totalSupply: bigint;
  /** Total supply formatted with decimals */
  totalSupplyFormatted: string;
  /** Chain ID (8453 for Base mainnet) */
  chainId: number;
  /** Whether metadata fetch was fully successful */
  complete: boolean;
  /** Token logo URL (if available) */
  logoUrl?: string;
  /** Logo source (trustwallet, coingecko, generated) */
  logoSource?: 'trustwallet' | 'coingecko' | 'generated' | 'none';
}

/**
 * Fetcher configuration options
 */
export interface FetcherOptions {
  /** Custom RPC URL (default: public Base RPC) */
  rpcUrl?: string;
  /** Request timeout in ms (default: 10000) */
  timeout?: number;
  /** Retry attempts on failure (default: 3) */
  retries?: number;
  /** Fetch token logo from external sources (default: true) */
  fetchLogo?: boolean;
  /** CoinGecko API key for higher rate limits (optional) */
  coingeckoApiKey?: string;
}

/**
 * Logo sources with CDN URLs
 */
export const LOGO_SOURCES = {
  /** Trust Wallet Assets - checksummed address required */
  trustwallet: (address: string) =>
    `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/${address}/logo.png`,
  /** 0xSequence token directory */
  sequence: (address: string) =>
    `https://metadata.sequence.app/tokens/base/${address.toLowerCase()}/image`,
  /** CoinGecko API (requires API call to get image URL) */
  coingecko: 'https://api.coingecko.com/api/v3/coins/base/contract/',
};

/**
 * Known Base chain tokens for fallback/testing
 */
export const KNOWN_TOKENS: Record<string, Partial<TokenMetadata>> = {
  // USDC on Base
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    logoUrl:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/assets/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913/logo.png',
    logoSource: 'trustwallet',
  },
  // WETH on Base
  '0x4200000000000000000000000000000000000006': {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    logoUrl:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    logoSource: 'trustwallet',
  },
  // DAI on Base
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb': {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    logoUrl:
      'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EesafC09ac96c/logo.png',
    logoSource: 'trustwallet',
  },
  // CLANKER token
  '0x1bc0c42215582d5a085795f4badbac3ff36d1bcb': {
    name: 'Clanker',
    symbol: 'CLANKER',
    decimals: 18,
    logoUrl:
      'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/1be0c9c9-3a8b-4f33-6e42-97f58a7e7700/rectcrop3',
    logoSource: 'coingecko',
  },
};

/**
 * Default RPC endpoints for Base
 */
export const BASE_RPC_URLS = {
  public: 'https://mainnet.base.org',
  alchemy: 'https://base-mainnet.g.alchemy.com/v2/',
  infura: 'https://base-mainnet.infura.io/v3/',
};

/**
 * Base chain token metadata fetcher
 *
 * Fetches ERC-20 token metadata from Base chain (Chain ID: 8453).
 * Designed for read-only operations—no wallet connection required.
 */
export class BaseTokenFetcher {
  private client: BasePublicClient;
  private retries: number;
  private fetchLogo: boolean;
  private coingeckoApiKey?: string;

  constructor(options: FetcherOptions = {}) {
    const {
      rpcUrl = BASE_RPC_URLS.public,
      timeout = 10000,
      retries = 3,
      fetchLogo = true,
      coingeckoApiKey,
    } = options;

    this.retries = retries;
    this.fetchLogo = fetchLogo;
    this.coingeckoApiKey = coingeckoApiKey;
    // Cast to avoid viem version conflicts with OP Stack transaction types
    this.client = createPublicClient({
      chain: base,
      transport: http(rpcUrl, {
        timeout,
        retryCount: retries,
      }),
    }) as BasePublicClient;
  }

  /**
   * Validate an Ethereum address format
   */
  isValidAddress(address: string): address is Address {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Fetch token metadata from Base chain
   *
   * @param tokenAddress - ERC-20 token contract address
   * @returns Token metadata including name, symbol, decimals, totalSupply
   * @throws Error if address is invalid or token doesn't exist
   *
   * @example
   * ```typescript
   * const metadata = await fetcher.fetchMetadata('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
   * // Returns: { name: 'USD Coin', symbol: 'USDC', decimals: 6, ... }
   * ```
   */
  async fetchMetadata(tokenAddress: string): Promise<TokenMetadata> {
    // Validate address format
    if (!this.isValidAddress(tokenAddress)) {
      throw new Error(`Invalid token address: ${tokenAddress}`);
    }

    const address = tokenAddress as Address;

    // Fetch all metadata in parallel with error handling
    const [nameResult, symbolResult, decimalsResult, totalSupplyResult] = await Promise.allSettled([
      this.client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'name',
      }),
      this.client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'symbol',
      }),
      this.client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'decimals',
      }),
      this.client.readContract({
        address,
        abi: ERC20_ABI,
        functionName: 'totalSupply',
      }),
    ]);

    // Extract values with fallbacks
    const name = this.extractValue(nameResult, 'name', address);
    const symbol = this.extractValue(symbolResult, 'symbol', address);
    const decimals = this.extractValue(decimalsResult, 'decimals', address);
    const totalSupply = this.extractValue(totalSupplyResult, 'totalSupply', address);

    // Format total supply
    const totalSupplyFormatted = this.formatSupply(totalSupply, decimals);

    // Determine if fetch was complete
    const complete =
      nameResult.status === 'fulfilled' &&
      symbolResult.status === 'fulfilled' &&
      decimalsResult.status === 'fulfilled' &&
      totalSupplyResult.status === 'fulfilled';

    // Fetch logo if enabled
    let logoUrl: string | undefined;
    let logoSource: TokenMetadata['logoSource'] = 'none';

    if (this.fetchLogo) {
      const logoResult = await this.fetchLogoUrl(address);
      logoUrl = logoResult.url;
      logoSource = logoResult.source;
    }

    return {
      address,
      name,
      symbol,
      decimals,
      totalSupply,
      totalSupplyFormatted,
      chainId: base.id,
      complete,
      logoUrl,
      logoSource,
    };
  }

  /**
   * Fetch token logo from multiple sources
   * Priority: Known tokens -> Trust Wallet -> CoinGecko -> Generated
   */
  async fetchLogoUrl(
    address: Address
  ): Promise<{ url?: string; source: TokenMetadata['logoSource'] }> {
    // Check known tokens first
    const known = KNOWN_TOKENS[address] || KNOWN_TOKENS[address.toLowerCase()];
    if (known?.logoUrl) {
      return { url: known.logoUrl, source: known.logoSource || 'trustwallet' };
    }

    // Try Trust Wallet Assets (checksummed address)
    const trustwalletUrl = LOGO_SOURCES.trustwallet(address);
    if (await this.checkImageExists(trustwalletUrl)) {
      return { url: trustwalletUrl, source: 'trustwallet' };
    }

    // Try 0xSequence token directory
    const sequenceUrl = LOGO_SOURCES.sequence(address);
    if (await this.checkImageExists(sequenceUrl)) {
      return { url: sequenceUrl, source: 'trustwallet' }; // Using trustwallet as generic CDN source
    }

    // Try CoinGecko API
    const coingeckoResult = await this.fetchCoinGeckoLogo(address);
    if (coingeckoResult) {
      return { url: coingeckoResult, source: 'coingecko' };
    }

    // No logo found
    return { url: undefined, source: 'none' };
  }

  /**
   * Check if an image URL exists (HEAD request)
   */
  private async checkImageExists(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok && (response.headers.get('content-type')?.includes('image') ?? false);
    } catch {
      return false;
    }
  }

  /**
   * Fetch logo from CoinGecko API
   */
  private async fetchCoinGeckoLogo(address: Address): Promise<string | undefined> {
    try {
      const url = `${LOGO_SOURCES.coingecko}${address.toLowerCase()}`;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (this.coingeckoApiKey) {
        headers['x-cg-demo-api-key'] = this.coingeckoApiKey;
      }

      const response = await fetch(url, { headers });
      if (!response.ok) return undefined;

      const data = await response.json();
      return data?.image?.large || data?.image?.small || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract value from PromiseSettledResult with fallback
   */
  private extractValue<T extends 'name' | 'symbol' | 'decimals' | 'totalSupply'>(
    result: PromiseSettledResult<unknown>,
    field: T,
    address: Address
  ): T extends 'name' | 'symbol' ? string : T extends 'decimals' ? number : bigint {
    if (result.status === 'fulfilled') {
      return result.value as never;
    }

    // Try known tokens fallback
    const known = KNOWN_TOKENS[address];
    if (known && field in known) {
      return known[field as keyof typeof known] as never;
    }

    // Default fallbacks
    switch (field) {
      case 'name':
        return `Token ${address.slice(0, 8)}...` as never;
      case 'symbol':
        return address.slice(0, 6).toUpperCase() as never;
      case 'decimals':
        return 18 as never;
      case 'totalSupply':
        return BigInt(0) as never;
      default:
        throw new Error(`Unknown field: ${field}`);
    }
  }

  /**
   * Format total supply with decimals
   */
  private formatSupply(supply: bigint, decimals: number): string {
    if (supply === BigInt(0)) return '0';

    const divisor = BigInt(10 ** decimals);
    const integerPart = supply / divisor;
    const remainder = supply % divisor;

    if (remainder === BigInt(0)) {
      return this.formatNumber(integerPart);
    }

    // Format with up to 4 decimal places
    const decimalStr = remainder.toString().padStart(decimals, '0').slice(0, 4);
    return `${this.formatNumber(integerPart)}.${decimalStr.replace(/0+$/, '')}`;
  }

  /**
   * Format large numbers with commas
   */
  private formatNumber(n: bigint): string {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /**
   * Batch fetch metadata for multiple tokens
   *
   * @param addresses - Array of token addresses
   * @returns Map of address to metadata (errors are included as partial metadata)
   */
  async fetchBatch(addresses: string[]): Promise<Map<string, TokenMetadata | Error>> {
    const results = new Map<string, TokenMetadata | Error>();

    const fetchPromises = addresses.map(async (addr) => {
      try {
        const metadata = await this.fetchMetadata(addr);
        results.set(addr, metadata);
      } catch (error) {
        results.set(addr, error instanceof Error ? error : new Error(String(error)));
      }
    });

    await Promise.all(fetchPromises);
    return results;
  }

  /**
   * Get the viem public client for advanced usage
   */
  getClient(): BasePublicClient {
    return this.client;
  }
}

/**
 * Create a BaseTokenFetcher with default options
 */
export function createFetcher(options?: FetcherOptions): BaseTokenFetcher {
  return new BaseTokenFetcher(options);
}

export default BaseTokenFetcher;
