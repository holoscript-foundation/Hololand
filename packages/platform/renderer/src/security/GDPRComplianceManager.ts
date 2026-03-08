/**
 * GDPR Compliance Manager for Cross-Reality Agent State
 *
 * Right to Erasure (Art. 17), Data Portability (Art. 20),
 * Consent Tracking (Art. 7), Data Retention, Processing Records (Art. 30).
 */

export interface ConsentRecord {
  did: string; purpose: string; granted: boolean;
  grantedAt: number; expiresAt: number | null; revokedAt: number | null;
}

export interface DataRetentionPolicy {
  category: string; retentionMs: number;
  basis: 'consent' | 'legitimate-interest' | 'contract' | 'legal-obligation';
  autoDelete: boolean;
}

export interface ProcessingRecord {
  id: string; timestamp: number; did: string;
  operation: 'collect' | 'store' | 'transfer' | 'delete' | 'export';
  category: string; purpose: string; recipient?: string; legalBasis: string;
}

export interface ErasureResult { did: string; erasedCategories: string[]; retainedCategories: string[]; timestamp: number; }
export interface PortabilityExport { did: string; exportedAt: number; format: 'json'; data: Record<string, unknown>; categories: string[]; }

export const DEFAULT_RETENTION_POLICIES: DataRetentionPolicy[] = [
  { category: 'identity', retentionMs: 365 * 24 * 3600_000, basis: 'contract', autoDelete: false },
  { category: 'spatial', retentionMs: 30 * 24 * 3600_000, basis: 'legitimate-interest', autoDelete: true },
  { category: 'conversation', retentionMs: 90 * 24 * 3600_000, basis: 'consent', autoDelete: true },
  { category: 'preferences', retentionMs: 365 * 24 * 3600_000, basis: 'consent', autoDelete: false },
  { category: 'evidence', retentionMs: 180 * 24 * 3600_000, basis: 'legitimate-interest', autoDelete: true },
];

export class GDPRComplianceManager {
  private consents: Map<string, ConsentRecord[]> = new Map();
  private processingLog: ProcessingRecord[] = [];
  private retentionPolicies: DataRetentionPolicy[];
  private dataStore: Map<string, Map<string, { data: unknown; storedAt: number }>> = new Map();

  constructor(config?: { retentionPolicies?: DataRetentionPolicy[] }) {
    this.retentionPolicies = config?.retentionPolicies ?? DEFAULT_RETENTION_POLICIES;
  }

  // ===== CONSENT =====

  recordConsent(did: string, purpose: string, granted: boolean, expiresAt?: number): void {
    if (!this.consents.has(did)) this.consents.set(did, []);
    this.consents.get(did)!.push({ did, purpose, granted, grantedAt: Date.now(), expiresAt: expiresAt ?? null, revokedAt: null });
    this.log(did, 'collect', 'consent', purpose, 'consent');
  }

  revokeConsent(did: string, purpose: string): boolean {
    const records = this.consents.get(did);
    if (!records) return false;
    const record = records.find(r => r.purpose === purpose && r.granted && !r.revokedAt);
    if (!record) return false;
    record.revokedAt = Date.now(); record.granted = false;
    this.log(did, 'delete', 'consent', `Consent revoked: ${purpose}`, 'consent');
    return true;
  }

  hasValidConsent(did: string, purpose: string): boolean {
    const records = this.consents.get(did);
    if (!records) return false;
    return records.some(r => r.purpose === purpose && r.granted && !r.revokedAt && (r.expiresAt === null || r.expiresAt > Date.now()));
  }

  // ===== RIGHT TO ERASURE =====

  async requestErasure(did: string): Promise<ErasureResult> {
    const erasedCategories: string[] = [];
    const retainedCategories: string[] = [];
    for (const policy of this.retentionPolicies) {
      if (policy.basis === 'legal-obligation') { retainedCategories.push(policy.category); continue; }
      const didStore = this.dataStore.get(did);
      if (didStore?.has(policy.category)) { didStore.delete(policy.category); erasedCategories.push(policy.category); }
    }
    this.consents.delete(did);
    this.log(did, 'delete', 'all', 'Right to erasure (Art. 17)', 'data-subject-request');
    return { did, erasedCategories, retainedCategories, timestamp: Date.now() };
  }

  // ===== DATA PORTABILITY =====

  async exportData(did: string): Promise<PortabilityExport> {
    const data: Record<string, unknown> = {};
    const categories: string[] = [];
    const didStore = this.dataStore.get(did);
    if (didStore) { for (const [cat, entry] of didStore) { data[cat] = entry.data; categories.push(cat); } }
    const consents = this.consents.get(did);
    if (consents) { data['consents'] = consents; categories.push('consents'); }
    this.log(did, 'export', 'all', 'Data portability (Art. 20)', 'data-subject-request');
    return { did, exportedAt: Date.now(), format: 'json', data, categories };
  }

  // ===== DATA STORAGE =====

  storeData(did: string, category: string, data: unknown): void {
    if (!this.dataStore.has(did)) this.dataStore.set(did, new Map());
    this.dataStore.get(did)!.set(category, { data, storedAt: Date.now() });
    this.log(did, 'store', category, 'Agent state storage', this.getBasis(category));
  }

  recordTransfer(did: string, category: string, recipient: string): void {
    this.log(did, 'transfer', category, `Handoff to ${recipient}`, this.getBasis(category));
  }

  // ===== RETENTION =====

  enforceRetention(): { expired: number; retained: number } {
    const now = Date.now(); let expired = 0; let retained = 0;
    for (const [did, store] of this.dataStore) {
      for (const [category, entry] of store) {
        const policy = this.retentionPolicies.find(p => p.category === category);
        if (policy && policy.autoDelete && (now - entry.storedAt) > policy.retentionMs) {
          store.delete(category); expired++;
          this.log(did, 'delete', category, 'Retention auto-delete', 'retention-policy');
        } else { retained++; }
      }
    }
    return { expired, retained };
  }

  // ===== PROCESSING LOG =====

  getProcessingLog(filter?: { did?: string; operation?: string }): ProcessingRecord[] {
    let log = [...this.processingLog];
    if (filter?.did) log = log.filter(r => r.did === filter.did);
    if (filter?.operation) log = log.filter(r => r.operation === filter.operation);
    return log;
  }

  getMetrics() {
    return { totalSubjects: this.dataStore.size, totalConsents: Array.from(this.consents.values()).flat().length, processingLogSize: this.processingLog.length };
  }

  private log(did: string, operation: ProcessingRecord['operation'], category: string, purpose: string, legalBasis: string): void {
    this.processingLog.push({ id: `proc:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now(), did, operation, category, purpose, legalBasis });
  }

  private getBasis(category: string): string {
    return this.retentionPolicies.find(p => p.category === category)?.basis ?? 'consent';
  }
}

export function createGDPRComplianceManager(config?: { retentionPolicies?: DataRetentionPolicy[] }): GDPRComplianceManager {
  return new GDPRComplianceManager(config);
}
