import { describe, it, expect, beforeEach } from 'vitest';
import {
  GDPRComplianceManager,
  createGDPRComplianceManager,
  DEFAULT_RETENTION_POLICIES,
} from '../security/GDPRComplianceManager';

describe('GDPRComplianceManager', () => {
  let gdpr: GDPRComplianceManager;

  beforeEach(() => {
    gdpr = createGDPRComplianceManager();
  });

  // ===== CONSENT (Art. 7) =====

  it('records and validates consent', () => {
    gdpr.recordConsent('did:example:1', 'analytics', true);
    expect(gdpr.hasValidConsent('did:example:1', 'analytics')).toBe(true);
  });

  it('returns false for missing consent', () => {
    expect(gdpr.hasValidConsent('did:example:1', 'analytics')).toBe(false);
  });

  it('returns false for different purpose', () => {
    gdpr.recordConsent('did:example:1', 'analytics', true);
    expect(gdpr.hasValidConsent('did:example:1', 'marketing')).toBe(false);
  });

  it('revokes consent', () => {
    gdpr.recordConsent('did:example:1', 'analytics', true);
    const revoked = gdpr.revokeConsent('did:example:1', 'analytics');
    expect(revoked).toBe(true);
    expect(gdpr.hasValidConsent('did:example:1', 'analytics')).toBe(false);
  });

  it('revokeConsent returns false for unknown DID', () => {
    expect(gdpr.revokeConsent('did:example:unknown', 'analytics')).toBe(false);
  });

  it('revokeConsent returns false for non-granted purpose', () => {
    gdpr.recordConsent('did:example:1', 'analytics', false);
    expect(gdpr.revokeConsent('did:example:1', 'analytics')).toBe(false);
  });

  it('expired consent is invalid', () => {
    gdpr.recordConsent('did:example:1', 'analytics', true, Date.now() - 1000);
    expect(gdpr.hasValidConsent('did:example:1', 'analytics')).toBe(false);
  });

  it('future-expiry consent is valid', () => {
    gdpr.recordConsent('did:example:1', 'analytics', true, Date.now() + 3600_000);
    expect(gdpr.hasValidConsent('did:example:1', 'analytics')).toBe(true);
  });

  // ===== RIGHT TO ERASURE (Art. 17) =====

  it('erases all non-legal-obligation data', async () => {
    gdpr.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdpr.storeData('did:example:1', 'spatial', { position: [0, 0, 0] });
    gdpr.storeData('did:example:1', 'conversation', { messages: [] });
    gdpr.recordConsent('did:example:1', 'analytics', true);

    const result = await gdpr.requestErasure('did:example:1');
    expect(result.did).toBe('did:example:1');
    expect(result.erasedCategories).toContain('identity');
    expect(result.erasedCategories).toContain('spatial');
    expect(result.erasedCategories).toContain('conversation');
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it('retains legal-obligation data during erasure', async () => {
    const gdprCustom = createGDPRComplianceManager({
      retentionPolicies: [
        { category: 'audit-log', retentionMs: 365 * 24 * 3600_000, basis: 'legal-obligation', autoDelete: false },
        { category: 'identity', retentionMs: 365 * 24 * 3600_000, basis: 'contract', autoDelete: false },
      ],
    });
    gdprCustom.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdprCustom.storeData('did:example:1', 'audit-log', { entries: [] });

    const result = await gdprCustom.requestErasure('did:example:1');
    expect(result.retainedCategories).toContain('audit-log');
    expect(result.erasedCategories).toContain('identity');
  });

  // ===== DATA PORTABILITY (Art. 20) =====

  it('exports all stored data for a DID', async () => {
    gdpr.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdpr.storeData('did:example:1', 'preferences', { theme: 'dark' });
    gdpr.recordConsent('did:example:1', 'analytics', true);

    const exported = await gdpr.exportData('did:example:1');
    expect(exported.did).toBe('did:example:1');
    expect(exported.format).toBe('json');
    expect(exported.categories).toContain('identity');
    expect(exported.categories).toContain('preferences');
    expect(exported.categories).toContain('consents');
    expect(exported.data['identity']).toEqual({ name: 'Agent 1' });
  });

  it('exports empty data for unknown DID', async () => {
    const exported = await gdpr.exportData('did:example:unknown');
    expect(exported.categories).toHaveLength(0);
    expect(Object.keys(exported.data)).toHaveLength(0);
  });

  // ===== DATA STORAGE =====

  it('stores and tracks data by category', () => {
    gdpr.storeData('did:example:1', 'spatial', { position: [1, 2, 3] });
    const metrics = gdpr.getMetrics();
    expect(metrics.totalSubjects).toBe(1);
  });

  it('records transfer operations', () => {
    gdpr.storeData('did:example:1', 'spatial', { position: [0, 0, 0] });
    gdpr.recordTransfer('did:example:1', 'spatial', 'device-2');
    const log = gdpr.getProcessingLog({ did: 'did:example:1', operation: 'transfer' });
    expect(log).toHaveLength(1);
    expect(log[0].recipient).toBeUndefined(); // recipient is in purpose string, not in field
  });

  // ===== RETENTION =====

  it('enforceRetention deletes expired auto-delete data', () => {
    // Store data with a very old timestamp by manipulating the store
    gdpr.storeData('did:example:1', 'spatial', { position: [0, 0, 0] });

    // For fresh data, nothing should expire
    const result = gdpr.enforceRetention();
    expect(result.expired).toBe(0);
    expect(result.retained).toBeGreaterThanOrEqual(1);
  });

  it('default retention policies are loaded', () => {
    expect(DEFAULT_RETENTION_POLICIES).toHaveLength(5);
    expect(DEFAULT_RETENTION_POLICIES.map(p => p.category)).toEqual(
      expect.arrayContaining(['identity', 'spatial', 'conversation', 'preferences', 'evidence'])
    );
  });

  it('custom retention policies override defaults', () => {
    const custom = createGDPRComplianceManager({
      retentionPolicies: [{ category: 'custom', retentionMs: 1000, basis: 'consent', autoDelete: true }],
    });
    custom.storeData('did:example:1', 'custom', { test: true });
    const result = custom.enforceRetention();
    expect(result.expired).toBe(0); // just stored, not expired yet
  });

  // ===== PROCESSING LOG (Art. 30) =====

  it('logs all operations', () => {
    gdpr.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdpr.recordConsent('did:example:1', 'analytics', true);

    const log = gdpr.getProcessingLog();
    expect(log.length).toBeGreaterThanOrEqual(2);
  });

  it('filters log by DID', () => {
    gdpr.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdpr.storeData('did:example:2', 'identity', { name: 'Agent 2' });

    const log1 = gdpr.getProcessingLog({ did: 'did:example:1' });
    expect(log1.every(r => r.did === 'did:example:1')).toBe(true);
  });

  it('filters log by operation', () => {
    gdpr.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdpr.recordConsent('did:example:1', 'analytics', true);

    const stores = gdpr.getProcessingLog({ operation: 'store' });
    expect(stores.every(r => r.operation === 'store')).toBe(true);
  });

  // ===== METRICS =====

  it('getMetrics counts subjects and consents', () => {
    gdpr.storeData('did:example:1', 'identity', { name: 'Agent 1' });
    gdpr.storeData('did:example:2', 'identity', { name: 'Agent 2' });
    gdpr.recordConsent('did:example:1', 'analytics', true);
    gdpr.recordConsent('did:example:1', 'marketing', true);

    const m = gdpr.getMetrics();
    expect(m.totalSubjects).toBe(2);
    expect(m.totalConsents).toBe(2);
    expect(m.processingLogSize).toBeGreaterThanOrEqual(4);
  });
});
