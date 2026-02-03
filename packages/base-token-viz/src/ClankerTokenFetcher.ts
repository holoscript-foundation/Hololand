/**
 * ClankerTokenFetcher - Fetch Clanker-specific token metadata beyond ERC-20
 *
 * Extends BaseTokenFetcher with Farcaster identity, liquidity data, safety warnings,
 * and deployment info from Clanker factory contracts.
 *
 * @example
 * ```typescript
 * import { ClankerTokenFetcher } from '@hololand/base-token-viz';
 *
 * const fetcher = new ClankerTokenFetcher({ bitqueryApiKey: 'YOUR_KEY' });
 * const metadata = await fetcher.fetchClankerMetadata('0x...');
 * console.log(metadata.fid); // Creator's Farcaster ID
 * console.log(metadata.warnings); // Safety warnings
 * ```
 *
 * @module
 */

import { BaseTokenFetcher, type TokenMetadata, type FetcherOptions } from './BaseTokenFetcher';
import type { Address } from 'viem';

/**
 * Clanker factory contract addresses on Base
 */
export const CLANKER_FACTORIES = {
  v4: '0xe85a59c628f7d27878aceb4bf3b35733630083a9',
  v3_1: '0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E',
  v3: '0x732560fa1d1A76350b1A500155BA978031B53833',
  legacy: '0x9B84fcE5Dcd9a38d2D01d5D72373F6b6b067c3e1',
  original: '0x250c9FB2b411B48273f69879007803790A6AeA47',
} as const;

/**
 * Clanker infrastructure contracts
 */
export const CLANKER_INFRASTRUCTURE = {
  feeLocker: '0xf3622742b1e446d92e45e22923ef11c2fcd55d68',
  dynamicFeeHook: '0xd60D6B218116cFd801E28F78d011a203D2b068Cc',
  staticFeeHook: '0xb429d62f8f3bFFb98CdB9569533eA23bF0Ba28CC',
  sniperAuction: '0xebB25BB797D82CB78E1bc70406b13233c0854413',
} as const;

/**
 * Clanker safety warning types
 */
export type ClankerWarning =
  | 'UNUSUAL_TICK'
  | 'UNUSUAL_PAIR_ADDRESS'
  | 'MISSING_POOL_CONFIG'
  | 'LOW_LIQUIDITY'
  | 'UNKNOWN_FACTORY';

/**
 * Clanker factory version
 */
export type FactoryVersion = 'v4' | 'v3.1' | 'v3' | 'legacy' | 'original' | 'unknown';

/**
 * Clanker-specific token metadata
 */
export interface ClankerTokenMetadata extends TokenMetadata {
  /** Whether this is a Clanker token */
  isClanker: boolean;

  // Farcaster Identity
  /** Creator's Farcaster ID */
  fid?: number;
  /** Origin Farcaster cast hash */
  castHash?: string;
  /** Deployer address (msg_sender) */
  deployer?: Address;

  // Liquidity
  /** Uniswap LP NFT position ID */
  positionId?: number;
  /** LP token locker contract address */
  lockerAddress?: Address;
  /** Initial market cap in quote token */
  startingMarketCap?: bigint;
  /** Paired token address (usually WETH) */
  pairedToken?: Address;

  // Safety
  /** Risk warnings for this token */
  warnings: ClankerWarning[];

  // Deployment
  /** Factory contract that deployed this token */
  factoryAddress?: Address;
  /** Factory version */
  factoryVersion: FactoryVersion;
  /** Deployment timestamp */
  deployedAt?: Date;
  /** Transaction hash of deployment */
  deployTxHash?: string;
}

/**
 * Clanker fetcher configuration
 */
export interface ClankerFetcherOptions extends FetcherOptions {
  /** Bitquery API key for GraphQL queries */
  bitqueryApiKey?: string;
  /** Skip Bitquery and only use on-chain data */
  onChainOnly?: boolean;
}

/**
 * Bitquery GraphQL response structure
 */
interface BitqueryTokenCreatedEvent {
  Arguments: Array<{
    Name: string;
    Value: {
      string?: string;
      integer?: string;
      address?: string;
    };
  }>;
  Block: {
    Time: string;
  };
  Transaction: {
    Hash: string;
  };
}

/**
 * Environment variable for Bitquery API key
 */
const ENV_BITQUERY_API_KEY = typeof process !== 'undefined' ? process.env.BITQUERY_API_KEY : undefined;

/**
 * Clanker token metadata fetcher
 *
 * Fetches Clanker-specific metadata including Farcaster identity,
 * liquidity data, safety warnings, and deployment info.
 *
 * API key can be provided via:
 * 1. Constructor option: `new ClankerTokenFetcher({ bitqueryApiKey: 'KEY' })`
 * 2. Environment variable: `BITQUERY_API_KEY=KEY`
 */
export class ClankerTokenFetcher extends BaseTokenFetcher {
  private bitqueryApiKey?: string;
  private onChainOnly: boolean;

  constructor(options: ClankerFetcherOptions = {}) {
    super(options);
    // Priority: constructor option > environment variable
    this.bitqueryApiKey = options.bitqueryApiKey ?? ENV_BITQUERY_API_KEY;
    this.onChainOnly = options.onChainOnly ?? false;
  }

  /**
   * Fetch Clanker-specific metadata for a token
   *
   * @param tokenAddress - ERC-20 token contract address
   * @returns Clanker token metadata including Farcaster identity and warnings
   */
  async fetchClankerMetadata(tokenAddress: string): Promise<ClankerTokenMetadata> {
    // First fetch standard ERC-20 metadata
    const baseMetadata = await this.fetchMetadata(tokenAddress);

    // Initialize Clanker metadata with defaults
    const clankerMetadata: ClankerTokenMetadata = {
      ...baseMetadata,
      isClanker: false,
      warnings: [],
      factoryVersion: 'unknown',
    };

    // Try to fetch Clanker-specific data
    if (!this.onChainOnly && this.bitqueryApiKey) {
      const clankerData = await this.fetchFromBitquery(tokenAddress);
      if (clankerData) {
        Object.assign(clankerMetadata, clankerData);
        clankerMetadata.isClanker = true;
      }
    }

    // If no Bitquery data, try to detect from known patterns
    if (!clankerMetadata.isClanker) {
      const detectionResult = await this.detectClankerToken(tokenAddress);
      if (detectionResult.isClanker) {
        Object.assign(clankerMetadata, detectionResult);
      }
    }

    // Add warnings based on metadata
    clankerMetadata.warnings = this.analyzeWarnings(clankerMetadata);

    return clankerMetadata;
  }

  /**
   * Fetch token creation event from Bitquery
   */
  private async fetchFromBitquery(tokenAddress: string): Promise<Partial<ClankerTokenMetadata> | null> {
    if (!this.bitqueryApiKey) return null;

    const query = `
      query ClankerToken($tokenAddress: String!) {
        EVM(network: base) {
          Events(
            where: {
              Log: {
                SmartContract: {
                  in: [
                    "${CLANKER_FACTORIES.v4}",
                    "${CLANKER_FACTORIES.v3_1}",
                    "${CLANKER_FACTORIES.v3}"
                  ]
                }
                Signature: { Name: { is: "TokenCreated" } }
              }
              Arguments: {
                includes: [
                  { Name: { is: "tokenAddress" }, Value: { Address: { is: $tokenAddress } } }
                ]
              }
            }
            limit: { count: 1 }
          ) {
            Arguments {
              Name
              Value {
                ... on EVM_ABI_String_Value_Arg { string }
                ... on EVM_ABI_Integer_Value_Arg { integer }
                ... on EVM_ABI_Address_Value_Arg { address }
              }
            }
            Block { Time }
            Transaction { Hash }
            Log { SmartContract }
          }
        }
      }
    `;

    try {
      const response = await fetch('https://streaming.bitquery.io/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.bitqueryApiKey}`,
        },
        body: JSON.stringify({
          query,
          variables: { tokenAddress: tokenAddress.toLowerCase() },
        }),
      });

      if (!response.ok) {
        console.warn(`Bitquery request failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      const events = data?.data?.EVM?.Events;

      if (!events || events.length === 0) {
        return null;
      }

      return this.parseTokenCreatedEvent(events[0]);
    } catch (error) {
      console.warn('Bitquery fetch error:', error);
      return null;
    }
  }

  /**
   * Parse TokenCreated event arguments
   */
  private parseTokenCreatedEvent(event: BitqueryTokenCreatedEvent & { Log?: { SmartContract?: string } }): Partial<ClankerTokenMetadata> {
    const args = new Map<string, string>();

    for (const arg of event.Arguments) {
      const value = arg.Value.string ?? arg.Value.integer ?? arg.Value.address;
      if (value) {
        args.set(arg.Name, value);
      }
    }

    const factoryAddress = event.Log?.SmartContract?.toLowerCase() as Address | undefined;
    const factoryVersion = this.detectFactoryVersion(factoryAddress);

    return {
      isClanker: true,
      fid: args.has('fid') ? parseInt(args.get('fid')!, 10) : undefined,
      castHash: args.get('castHash'),
      deployer: args.get('deployer') as Address | undefined,
      positionId: args.has('positionId') ? parseInt(args.get('positionId')!, 10) : undefined,
      lockerAddress: args.get('lockerAddress') as Address | undefined,
      factoryAddress,
      factoryVersion,
      deployedAt: new Date(event.Block.Time),
      deployTxHash: event.Transaction.Hash,
    };
  }

  /**
   * Detect factory version from address
   */
  private detectFactoryVersion(factoryAddress?: string): FactoryVersion {
    if (!factoryAddress) return 'unknown';

    const normalized = factoryAddress.toLowerCase();

    if (normalized === CLANKER_FACTORIES.v4) return 'v4';
    if (normalized === CLANKER_FACTORIES.v3_1) return 'v3.1';
    if (normalized === CLANKER_FACTORIES.v3) return 'v3';
    if (normalized === CLANKER_FACTORIES.legacy) return 'legacy';
    if (normalized === CLANKER_FACTORIES.original) return 'original';

    return 'unknown';
  }

  /**
   * Detect if token is a Clanker token based on patterns
   * (fallback when Bitquery is not available)
   */
  private async detectClankerToken(tokenAddress: string): Promise<Partial<ClankerTokenMetadata>> {
    // Check if token name/symbol matches common Clanker patterns
    // Many Clanker tokens have specific naming patterns

    // For now, return non-Clanker
    // Future: Add on-chain event log scanning
    return {
      isClanker: false,
      factoryVersion: 'unknown',
    };
  }

  /**
   * Analyze token for potential warnings
   */
  private analyzeWarnings(metadata: ClankerTokenMetadata): ClankerWarning[] {
    const warnings: ClankerWarning[] = [];

    // Unknown factory warning
    if (metadata.isClanker && metadata.factoryVersion === 'unknown') {
      warnings.push('UNKNOWN_FACTORY');
    }

    // No locker address (potential rug risk)
    if (metadata.isClanker && !metadata.lockerAddress) {
      warnings.push('MISSING_POOL_CONFIG');
    }

    // Very low starting market cap
    if (metadata.startingMarketCap !== undefined && metadata.startingMarketCap < BigInt(1000)) {
      warnings.push('LOW_LIQUIDITY');
    }

    return warnings;
  }

  /**
   * Check if a token address was deployed by a Clanker factory
   */
  async isClankerToken(tokenAddress: string): Promise<boolean> {
    const metadata = await this.fetchClankerMetadata(tokenAddress);
    return metadata.isClanker;
  }

  /**
   * Get factory version for a Clanker token
   */
  async getFactoryVersion(tokenAddress: string): Promise<FactoryVersion> {
    const metadata = await this.fetchClankerMetadata(tokenAddress);
    return metadata.factoryVersion;
  }
}

/**
 * Create a ClankerTokenFetcher with default options
 */
export function createClankerFetcher(options?: ClankerFetcherOptions): ClankerTokenFetcher {
  return new ClankerTokenFetcher(options);
}

export default ClankerTokenFetcher;
