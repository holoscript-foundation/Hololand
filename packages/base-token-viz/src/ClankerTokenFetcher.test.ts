import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ClankerTokenFetcher,
  CLANKER_FACTORIES,
  CLANKER_INFRASTRUCTURE,
  type ClankerTokenMetadata,
} from './ClankerTokenFetcher';

describe('ClankerTokenFetcher', () => {
  describe('CLANKER_FACTORIES', () => {
    it('should have correct v4 factory address', () => {
      expect(CLANKER_FACTORIES.v4).toBe('0xe85a59c628f7d27878aceb4bf3b35733630083a9');
    });

    it('should have correct v3.1 factory address', () => {
      expect(CLANKER_FACTORIES.v3_1).toBe('0x375C15db32D28cEcdcAB5C03Ab889bf15cbD2c5E');
    });

    it('should have all factory versions defined', () => {
      expect(CLANKER_FACTORIES).toHaveProperty('v4');
      expect(CLANKER_FACTORIES).toHaveProperty('v3_1');
      expect(CLANKER_FACTORIES).toHaveProperty('v3');
      expect(CLANKER_FACTORIES).toHaveProperty('legacy');
      expect(CLANKER_FACTORIES).toHaveProperty('original');
    });
  });

  describe('CLANKER_INFRASTRUCTURE', () => {
    it('should have fee locker address', () => {
      expect(CLANKER_INFRASTRUCTURE.feeLocker).toBe('0xf3622742b1e446d92e45e22923ef11c2fcd55d68');
    });

    it('should have all infrastructure contracts', () => {
      expect(CLANKER_INFRASTRUCTURE).toHaveProperty('feeLocker');
      expect(CLANKER_INFRASTRUCTURE).toHaveProperty('dynamicFeeHook');
      expect(CLANKER_INFRASTRUCTURE).toHaveProperty('staticFeeHook');
      expect(CLANKER_INFRASTRUCTURE).toHaveProperty('sniperAuction');
    });
  });

  describe('ClankerTokenFetcher', () => {
    let fetcher: ClankerTokenFetcher;

    beforeEach(() => {
      fetcher = new ClankerTokenFetcher({ onChainOnly: true });
    });

    it('should create fetcher with default options', () => {
      const defaultFetcher = new ClankerTokenFetcher();
      expect(defaultFetcher).toBeInstanceOf(ClankerTokenFetcher);
    });

    it('should create fetcher with Bitquery API key', () => {
      const fetcher = new ClankerTokenFetcher({ bitqueryApiKey: 'test-key' });
      expect(fetcher).toBeInstanceOf(ClankerTokenFetcher);
    });

    it('should inherit from BaseTokenFetcher', () => {
      expect(fetcher.isValidAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(true);
      expect(fetcher.isValidAddress('invalid')).toBe(false);
    });

    describe('fetchClankerMetadata', () => {
      it('should return metadata with isClanker flag', async () => {
        // Mock the base metadata fetch
        const mockMetadata = {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          name: 'USD Coin',
          symbol: 'USDC',
          decimals: 6,
          totalSupply: BigInt(1000000000000),
          totalSupplyFormatted: '1,000,000',
          chainId: 8453,
          complete: true,
        };

        vi.spyOn(fetcher, 'fetchMetadata').mockResolvedValue(mockMetadata);

        const result = await fetcher.fetchClankerMetadata('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');

        expect(result).toHaveProperty('isClanker');
        expect(result).toHaveProperty('warnings');
        expect(result).toHaveProperty('factoryVersion');
        expect(Array.isArray(result.warnings)).toBe(true);
      });

      it('should throw error for invalid address', async () => {
        await expect(fetcher.fetchClankerMetadata('invalid')).rejects.toThrow('Invalid token address');
      });
    });

    describe('isClankerToken', () => {
      it('should return boolean', async () => {
        const mockMetadata = {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          name: 'Test',
          symbol: 'TEST',
          decimals: 18,
          totalSupply: BigInt(0),
          totalSupplyFormatted: '0',
          chainId: 8453,
          complete: true,
        };

        vi.spyOn(fetcher, 'fetchMetadata').mockResolvedValue(mockMetadata);

        const result = await fetcher.isClankerToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
        expect(typeof result).toBe('boolean');
      });
    });

    describe('getFactoryVersion', () => {
      it('should return factory version string', async () => {
        const mockMetadata = {
          address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          name: 'Test',
          symbol: 'TEST',
          decimals: 18,
          totalSupply: BigInt(0),
          totalSupplyFormatted: '0',
          chainId: 8453,
          complete: true,
        };

        vi.spyOn(fetcher, 'fetchMetadata').mockResolvedValue(mockMetadata);

        const result = await fetcher.getFactoryVersion('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
        expect(['v4', 'v3.1', 'v3', 'legacy', 'original', 'unknown']).toContain(result);
      });
    });
  });

  describe('ClankerTokenMetadata interface', () => {
    it('should allow creating valid metadata objects', () => {
      const metadata: ClankerTokenMetadata = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        totalSupply: BigInt(1000000),
        totalSupplyFormatted: '1,000,000',
        chainId: 8453,
        complete: true,
        isClanker: true,
        fid: 12345,
        castHash: '0xabc123',
        deployer: '0x1234567890123456789012345678901234567890',
        positionId: 42,
        lockerAddress: '0xf3622742b1e446d92e45e22923ef11c2fcd55d68',
        warnings: [],
        factoryVersion: 'v4',
        deployedAt: new Date('2025-01-01'),
        deployTxHash: '0xdef456',
      };

      expect(metadata.isClanker).toBe(true);
      expect(metadata.fid).toBe(12345);
      expect(metadata.factoryVersion).toBe('v4');
    });

    it('should allow metadata with warnings', () => {
      const metadata: ClankerTokenMetadata = {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        name: 'Risky Token',
        symbol: 'RISK',
        decimals: 18,
        totalSupply: BigInt(0),
        totalSupplyFormatted: '0',
        chainId: 8453,
        complete: true,
        isClanker: true,
        warnings: ['UNUSUAL_TICK', 'LOW_LIQUIDITY'],
        factoryVersion: 'unknown',
      };

      expect(metadata.warnings).toContain('UNUSUAL_TICK');
      expect(metadata.warnings).toContain('LOW_LIQUIDITY');
    });
  });
});
