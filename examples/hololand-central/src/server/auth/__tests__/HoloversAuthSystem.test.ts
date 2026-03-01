import { describe, it, expect, vi } from 'vitest';

// Mock heavy deps that HoloversAuthSystem imports
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    user: { findUnique: vi.fn(), create: vi.fn() },
    session: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
  })),
}));
vi.mock('bcrypt', () => ({
  default: { hash: vi.fn(), compare: vi.fn() },
  hash: vi.fn(),
  compare: vi.fn(),
}));
vi.mock('ethers', () => ({
  ethers: { verifyMessage: vi.fn() },
  verifyMessage: vi.fn(),
}));

import { EmailSignUpSchema, EmailSignInSchema, WalletAuthSchema, OAuthCallbackSchema } from '../HoloversAuthSystem';

describe('Auth Validation Schemas', () => {
  describe('EmailSignUpSchema', () => {
    it('accepts valid sign-up data', () => {
      const data = { email: 'user@example.com', password: 'securepass123', username: 'testuser' };
      const result = EmailSignUpSchema.parse(data);
      expect(result.email).toBe('user@example.com');
      expect(result.username).toBe('testuser');
    });

    it('rejects invalid email', () => {
      expect(() => EmailSignUpSchema.parse({
        email: 'not-an-email', password: 'securepass123', username: 'testuser',
      })).toThrow();
    });

    it('rejects short password', () => {
      expect(() => EmailSignUpSchema.parse({
        email: 'user@example.com', password: '1234567', username: 'testuser',
      })).toThrow();
    });

    it('rejects short username', () => {
      expect(() => EmailSignUpSchema.parse({
        email: 'user@example.com', password: 'securepass123', username: 'ab',
      })).toThrow();
    });

    it('rejects long username', () => {
      expect(() => EmailSignUpSchema.parse({
        email: 'user@example.com', password: 'securepass123', username: 'a'.repeat(51),
      })).toThrow();
    });
  });

  describe('EmailSignInSchema', () => {
    it('accepts valid sign-in data', () => {
      const result = EmailSignInSchema.parse({ email: 'user@test.com', password: 'pw' });
      expect(result.email).toBe('user@test.com');
    });

    it('rejects invalid email', () => {
      expect(() => EmailSignInSchema.parse({ email: 'bad', password: 'pw' })).toThrow();
    });
  });

  describe('WalletAuthSchema', () => {
    it('accepts valid wallet auth', () => {
      const data = {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        signature: '0xdeadbeef',
        message: 'Sign in to HoloLand',
      };
      const result = WalletAuthSchema.parse(data);
      expect(result.address).toBe(data.address);
    });

    it('rejects invalid Ethereum address', () => {
      expect(() => WalletAuthSchema.parse({
        address: '0xinvalid', signature: 'sig', message: 'msg',
      })).toThrow();
    });

    it('rejects address without 0x prefix', () => {
      expect(() => WalletAuthSchema.parse({
        address: '1234567890abcdef1234567890abcdef12345678',
        signature: 'sig',
        message: 'msg',
      })).toThrow();
    });
  });

  describe('OAuthCallbackSchema', () => {
    it('accepts valid OAuth callback', () => {
      const result = OAuthCallbackSchema.parse({
        provider: 'google', code: 'auth_code_123', state: 'csrf_state',
      });
      expect(result.provider).toBe('google');
    });

    it('accepts discord provider', () => {
      const result = OAuthCallbackSchema.parse({
        provider: 'discord', code: 'code', state: 'state',
      });
      expect(result.provider).toBe('discord');
    });

    it('accepts twitter provider', () => {
      const result = OAuthCallbackSchema.parse({
        provider: 'twitter', code: 'code', state: 'state',
      });
      expect(result.provider).toBe('twitter');
    });

    it('rejects unknown provider', () => {
      expect(() => OAuthCallbackSchema.parse({
        provider: 'facebook', code: 'code', state: 'state',
      })).toThrow();
    });
  });
});
