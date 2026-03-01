/**
 * Unit tests for HoloScriptGenerator
 */

import { describe, it, expect } from 'vitest';
import { HoloScriptGenerator, createGenerator } from './HoloScriptGenerator';
import type { TokenMetadata } from './BaseTokenFetcher';

const mockMetadata: TokenMetadata = {
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  totalSupply: BigInt('10000000000000000'),
  totalSupplyFormatted: '10,000,000,000',
  chainId: 8453,
  complete: true,
};

describe('HoloScriptGenerator', () => {
  describe('createGenerator', () => {
    it('creates a generator instance', () => {
      const generator = createGenerator();
      expect(generator).toBeInstanceOf(HoloScriptGenerator);
    });
  });

  describe('generate', () => {
    it('generates orb style by default', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata);

      expect(script).toContain('composition "TokenViz_usdc"');
      expect(script).toContain('@grabbable');
      expect(script).toContain('USDC - USD Coin');
    });

    it('generates cube style when specified', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata, { style: 'cube' });

      expect(script).toContain('composition "TokenCubeViz_usdc"');
    });

    it('generates pedestal style when specified', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata, { style: 'pedestal' });

      expect(script).toContain('object "PedestalBase" using "PedestalBase"');
      expect(script).toContain('object "usdc" using "TokenOrb"');
    });

    it('generates floating style when specified', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata, { style: 'floating' });

      expect(script).toContain('object "usdc_main" using "MainOrb"');
      expect(script).toContain('object "usdc_1" using "FloatingOrb"');
    });

    it('generates galaxy style when specified', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata, { style: 'galaxy' });

      expect(script).toContain('object "usdc_core" using "CoreOrb"');
      expect(script).toContain('particle_');
      expect(script).toContain('exponential');
    });
  });

  describe('generateOrb', () => {
    it('includes world config by default', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata);

      expect(script).toContain('environment {');
      expect(script).toContain('backgroundColor');
      expect(script).toContain('camera');
    });

    it('excludes world config when disabled', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { includeWorld: false });

      expect(script).not.toContain('environment {');
    });

    it('includes glow when enabled', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { glow: true });

      expect(script).toContain('emissive:');
      expect(script).toContain('emissiveIntensity');
    });

    it('excludes glow when disabled', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { glow: false });

      expect(script).not.toContain('emissive:');
    });

    it('includes animation when enabled', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { animated: true });

      expect(script).toContain('animation rotate');
      expect(script).toContain('animation float');
    });

    it('excludes animation when disabled', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { animated: false });

      expect(script).not.toContain('animation rotate');
    });

    it('applies custom scale', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { scale: 2 });

      expect(script).toContain('scale: [2, 2, 2]');
    });

    it('includes grabbable trait when enabled', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generateOrb(mockMetadata, { grabbable: true });

      expect(script).toContain('@grabbable');
    });
  });

  describe('color schemes', () => {
    it('uses stablecoin colors for USDC', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata);

      // Stablecoin primary is green
      expect(script).toContain('#00ff88');
    });

    it('uses meme colors for DOGE-like tokens', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate({
        ...mockMetadata,
        symbol: 'DOGE',
        name: 'Dogecoin',
      });

      // Meme primary is orange
      expect(script).toContain('#ff6600');
    });

    it('uses DeFi colors for protocol tokens', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate({
        ...mockMetadata,
        symbol: 'UNI',
        name: 'Uniswap',
      });

      // DeFi primary is purple
      expect(script).toContain('#8b5cf6');
    });

    it('uses default colors for unknown tokens', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate({
        ...mockMetadata,
        symbol: 'XYZ',
        name: 'Random Token',
      });

      // Default primary is cyan
      expect(script).toContain('#00d4ff');
    });
  });

  describe('info panel', () => {
    it('includes token info panel', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata);

      expect(script).toContain('spatial_group "InfoPanel"');
      expect(script).toContain('USDC');
      expect(script).toContain('USD Coin');
      expect(script).toContain('Base (8453)');
    });

    it('truncates long addresses', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata);

      expect(script).toContain('0x8335...2913');
    });

    it('includes total supply', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate(mockMetadata);

      expect(script).toContain('10,000,000,000');
    });
  });

  describe('edge cases', () => {
    it('handles missing metadata gracefully', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate({});

      expect(script).toContain('object "token" using "TokenOrb"');
      expect(script).toContain('TOKEN - Unknown Token');
    });

    it('sanitizes special characters in symbol', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate({
        ...mockMetadata,
        symbol: 'USD$COIN',
      });

      expect(script).toContain('object "usd_coin" using "TokenOrb"');
    });

    it('handles empty symbol', () => {
      const generator = new HoloScriptGenerator();
      const script = generator.generate({
        ...mockMetadata,
        symbol: '',
      });

      expect(script).toContain('object "token" using "TokenOrb"');
    });
  });
});
