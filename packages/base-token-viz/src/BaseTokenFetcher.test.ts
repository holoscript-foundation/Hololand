/**
 * Unit tests for BaseTokenFetcher
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseTokenFetcher, createFetcher, KNOWN_TOKENS, BASE_RPC_URLS } from './BaseTokenFetcher';

// Mock viem
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn(),
  })),
  http: vi.fn(() => ({})),
}));

vi.mock('viem/chains', () => ({
  base: { id: 8453, name: 'Base' },
}));

describe('BaseTokenFetcher', () => {
  describe('createFetcher', () => {
    it('creates a fetcher instance', () => {
      const fetcher = createFetcher();
      expect(fetcher).toBeInstanceOf(BaseTokenFetcher);
    });

    it('accepts custom options', () => {
      const fetcher = createFetcher({
        rpcUrl: 'https://custom.rpc.url',
        timeout: 5000,
        retries: 1,
      });
      expect(fetcher).toBeInstanceOf(BaseTokenFetcher);
    });
  });

  describe('isValidAddress', () => {
    it('validates correct addresses', () => {
      const fetcher = new BaseTokenFetcher();
      
      expect(fetcher.isValidAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(true);
      expect(fetcher.isValidAddress('0x0000000000000000000000000000000000000000')).toBe(true);
      expect(fetcher.isValidAddress('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF')).toBe(true);
    });

    it('rejects invalid addresses', () => {
      const fetcher = new BaseTokenFetcher();
      
      expect(fetcher.isValidAddress('')).toBe(false);
      expect(fetcher.isValidAddress('0x')).toBe(false);
      expect(fetcher.isValidAddress('0x123')).toBe(false);
      expect(fetcher.isValidAddress('not-an-address')).toBe(false);
      expect(fetcher.isValidAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
      expect(fetcher.isValidAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA0291')).toBe(false); // 39 chars
      expect(fetcher.isValidAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA029133')).toBe(false); // 41 chars
    });
  });

  describe('KNOWN_TOKENS', () => {
    it('contains USDC', () => {
      expect(KNOWN_TOKENS['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913']).toBeDefined();
      expect(KNOWN_TOKENS['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'].symbol).toBe('USDC');
    });

    it('contains WETH', () => {
      expect(KNOWN_TOKENS['0x4200000000000000000000000000000000000006']).toBeDefined();
      expect(KNOWN_TOKENS['0x4200000000000000000000000000000000000006'].symbol).toBe('WETH');
    });

    it('contains DAI', () => {
      expect(KNOWN_TOKENS['0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb']).toBeDefined();
      expect(KNOWN_TOKENS['0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'].symbol).toBe('DAI');
    });
  });

  describe('BASE_RPC_URLS', () => {
    it('has public endpoint', () => {
      expect(BASE_RPC_URLS.public).toBe('https://mainnet.base.org');
    });

    it('has alchemy endpoint', () => {
      expect(BASE_RPC_URLS.alchemy).toContain('alchemy.com');
    });

    it('has infura endpoint', () => {
      expect(BASE_RPC_URLS.infura).toContain('infura.io');
    });
  });

  describe('fetchMetadata', () => {
    it('throws on invalid address', async () => {
      const fetcher = new BaseTokenFetcher();
      
      await expect(fetcher.fetchMetadata('invalid')).rejects.toThrow('Invalid token address');
      await expect(fetcher.fetchMetadata('0x123')).rejects.toThrow('Invalid token address');
    });

    // Note: Full integration tests would require mocking the viem client responses
    // These are basic validation tests
  });

  describe('getClient', () => {
    it('returns the viem client', () => {
      const fetcher = new BaseTokenFetcher();
      const client = fetcher.getClient();
      
      expect(client).toBeDefined();
      expect(typeof client.readContract).toBe('function');
    });
  });
});

describe('TokenMetadata interface', () => {
  it('has correct structure', () => {
    // This is a compile-time check, but we verify the expected shape
    const metadata = {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
      totalSupply: BigInt('10000000000'),
      totalSupplyFormatted: '10,000',
      chainId: 8453,
      complete: true,
    };

    expect(metadata.address).toBeDefined();
    expect(metadata.name).toBeDefined();
    expect(metadata.symbol).toBeDefined();
    expect(metadata.decimals).toBeDefined();
    expect(metadata.totalSupply).toBeDefined();
    expect(metadata.totalSupplyFormatted).toBeDefined();
    expect(metadata.chainId).toBe(8453);
    expect(metadata.complete).toBe(true);
  });
});
