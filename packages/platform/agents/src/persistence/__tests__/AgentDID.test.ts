/**
 * Tests for AgentDID - W3C DID Identity Module
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgentDIDRegistry,
  createDID,
  parseDID,
  isValidDID,
  createDIDDocument,
  DID_PREFIX,
  DID_CONTEXT,
  getAgentDIDRegistry,
  resetAgentDIDRegistry,
} from '../AgentDID.js';

describe('AgentDID', () => {
  // =========================================================================
  // Utility Functions
  // =========================================================================

  describe('createDID', () => {
    it('creates a valid DID from agent ID', () => {
      expect(createDID('brittney')).toBe('did:holo:brittney');
    });

    it('handles complex agent IDs', () => {
      expect(createDID('agent-123')).toBe('did:holo:agent-123');
      expect(createDID('manager_v2')).toBe('did:holo:manager_v2');
    });
  });

  describe('parseDID', () => {
    it('extracts agent ID from valid DID', () => {
      expect(parseDID('did:holo:brittney')).toBe('brittney');
    });

    it('returns null for invalid DIDs', () => {
      expect(parseDID('did:other:brittney')).toBeNull();
      expect(parseDID('invalid')).toBeNull();
      expect(parseDID('')).toBeNull();
      expect(parseDID('did:holo:')).toBeNull();
    });
  });

  describe('isValidDID', () => {
    it('validates correct DIDs', () => {
      expect(isValidDID('did:holo:brittney')).toBe(true);
      expect(isValidDID('did:holo:agent-123')).toBe(true);
    });

    it('rejects invalid DIDs', () => {
      expect(isValidDID('did:other:brittney')).toBe(false);
      expect(isValidDID('invalid')).toBe(false);
      expect(isValidDID('did:holo:')).toBe(false);
    });
  });

  // =========================================================================
  // DID Document Factory
  // =========================================================================

  describe('createDIDDocument', () => {
    it('creates a valid W3C DID Document', () => {
      const doc = createDIDDocument({
        agentId: 'brittney',
        name: 'Brittney',
        role: 'assistant',
      });

      expect(doc['@context']).toEqual(DID_CONTEXT);
      expect(doc.id).toBe('did:holo:brittney');
      expect(doc.deactivated).toBe(false);
      expect(doc.created).toBeDefined();
      expect(doc.updated).toBeDefined();
    });

    it('includes verification methods', () => {
      const doc = createDIDDocument({ agentId: 'test' });

      expect(doc.verificationMethod).toHaveLength(2);
      expect(doc.verificationMethod![0].type).toBe('Ed25519VerificationKey2020');
      expect(doc.verificationMethod![0].id).toBe('did:holo:test#key-1');
      expect(doc.verificationMethod![0].controller).toBe('did:holo:test');
      expect(doc.verificationMethod![0].publicKeyMultibase).toMatch(/^z/);

      expect(doc.verificationMethod![1].type).toBe('X25519KeyAgreementKey2020');
    });

    it('includes authentication and assertion references', () => {
      const doc = createDIDDocument({ agentId: 'test' });

      expect(doc.authentication).toEqual(['did:holo:test#key-1']);
      expect(doc.assertionMethod).toEqual(['did:holo:test#key-1']);
      expect(doc.keyAgreement).toEqual(['did:holo:test#key-agreement-1']);
    });

    it('includes default service endpoints', () => {
      const doc = createDIDDocument({ agentId: 'brittney', name: 'Brittney' });

      expect(doc.service).toBeDefined();
      expect(doc.service!.length).toBeGreaterThanOrEqual(1);
      expect(doc.service![0].type).toBe('AgentProfile');
    });

    it('includes capabilities as service endpoint', () => {
      const doc = createDIDDocument({
        agentId: 'analyst',
        capabilities: ['data-analysis', 'sentiment-analysis'],
      });

      const capService = doc.service?.find(s => s.type === 'AgentCapabilities');
      expect(capService).toBeDefined();
    });

    it('includes custom services', () => {
      const doc = createDIDDocument({
        agentId: 'test',
        services: [
          {
            id: 'did:holo:test#custom-service',
            type: 'CustomService',
            serviceEndpoint: 'https://example.com',
          },
        ],
      });

      const custom = doc.service?.find(s => s.type === 'CustomService');
      expect(custom).toBeDefined();
      expect(custom!.serviceEndpoint).toBe('https://example.com');
    });

    it('includes controller when specified', () => {
      const doc = createDIDDocument({
        agentId: 'worker',
        controller: 'did:holo:manager',
      });

      expect(doc.controller).toBe('did:holo:manager');
    });

    it('stores metadata', () => {
      const doc = createDIDDocument({
        agentId: 'test',
        name: 'Test Agent',
        role: 'tester',
        metadata: { version: '1.0' },
      });

      expect(doc.metadata?.name).toBe('Test Agent');
      expect(doc.metadata?.role).toBe('tester');
      expect(doc.metadata?.version).toBe('1.0');
    });
  });

  // =========================================================================
  // DID Registry
  // =========================================================================

  describe('AgentDIDRegistry', () => {
    let registry: AgentDIDRegistry;

    beforeEach(() => {
      registry = new AgentDIDRegistry();
    });

    describe('registration', () => {
      it('registers a new agent DID', () => {
        const doc = registry.register({
          agentId: 'brittney',
          name: 'Brittney',
          role: 'assistant',
        });

        expect(doc.id).toBe('did:holo:brittney');
        expect(doc.deactivated).toBe(false);
        expect(registry.size).toBe(1);
      });

      it('updates existing DID on re-registration', () => {
        registry.register({ agentId: 'brittney', name: 'Brittney' });
        const updated = registry.register({
          agentId: 'brittney',
          metadata: { version: '2.0' },
        });

        expect(updated.metadata?.version).toBe('2.0');
        expect(registry.size).toBe(1); // Still only one DID
      });

      it('registers multiple agents', () => {
        registry.register({ agentId: 'brittney' });
        registry.register({ agentId: 'manager' });
        registry.register({ agentId: 'analyst' });

        expect(registry.size).toBe(3);
      });
    });

    describe('deactivation/reactivation', () => {
      it('deactivates a DID', () => {
        registry.register({ agentId: 'brittney' });
        const result = registry.deactivate('did:holo:brittney');

        expect(result).toBe(true);
        expect(registry.isActive('did:holo:brittney')).toBe(false);
      });

      it('returns false for non-existent DID', () => {
        expect(registry.deactivate('did:holo:nonexistent')).toBe(false);
      });

      it('reactivates a deactivated DID', () => {
        registry.register({ agentId: 'brittney' });
        registry.deactivate('did:holo:brittney');
        registry.reactivate('did:holo:brittney');

        expect(registry.isActive('did:holo:brittney')).toBe(true);
      });

      it('removes a DID entirely', () => {
        registry.register({ agentId: 'brittney' });
        const result = registry.remove('did:holo:brittney');

        expect(result).toBe(true);
        expect(registry.size).toBe(0);
      });
    });

    describe('resolution', () => {
      it('resolves an active DID', () => {
        registry.register({ agentId: 'brittney', name: 'Brittney' });

        const result = registry.resolve('did:holo:brittney');

        expect(result.didDocument).not.toBeNull();
        expect(result.didDocument!.id).toBe('did:holo:brittney');
        expect(result.didResolutionMetadata.error).toBeUndefined();
        expect(result.didDocumentMetadata.deactivated).toBe(false);
      });

      it('resolves by agent ID', () => {
        registry.register({ agentId: 'brittney' });

        const result = registry.resolveByAgentId('brittney');
        expect(result.didDocument).not.toBeNull();
      });

      it('returns notFound for unknown DID', () => {
        const result = registry.resolve('did:holo:unknown');

        expect(result.didDocument).toBeNull();
        expect(result.didResolutionMetadata.error).toBe('notFound');
      });

      it('returns invalidDid for malformed DID', () => {
        const result = registry.resolve('invalid:did');

        expect(result.didDocument).toBeNull();
        expect(result.didResolutionMetadata.error).toBe('invalidDid');
      });

      it('returns deactivated error for deactivated DID', () => {
        registry.register({ agentId: 'brittney' });
        registry.deactivate('did:holo:brittney');

        const result = registry.resolve('did:holo:brittney');

        expect(result.didDocument).not.toBeNull(); // Document still returned
        expect(result.didResolutionMetadata.error).toBe('deactivated');
        expect(result.didDocumentMetadata.deactivated).toBe(true);
      });

      it('caches resolution results', () => {
        registry.register({ agentId: 'brittney' });

        // First resolution
        registry.resolve('did:holo:brittney');
        // Second resolution (should hit cache)
        registry.resolve('did:holo:brittney');

        const metrics = registry.getMetrics();
        expect(metrics.totalResolutions).toBe(2);
        expect(metrics.cacheHitRate).toBeGreaterThan(0);
      });
    });

    describe('query', () => {
      beforeEach(() => {
        registry.register({ agentId: 'brittney', role: 'assistant', capabilities: ['chat'] });
        registry.register({ agentId: 'analyst', role: 'analyst', capabilities: ['data-analysis'] });
        registry.register({ agentId: 'builder', role: 'developer', capabilities: ['code'] });
      });

      it('lists all active DIDs', () => {
        const all = registry.listAll();
        expect(all).toHaveLength(3);
      });

      it('excludes deactivated from list by default', () => {
        registry.deactivate('did:holo:analyst');
        const active = registry.listAll();
        expect(active).toHaveLength(2);
      });

      it('includes deactivated when requested', () => {
        registry.deactivate('did:holo:analyst');
        const all = registry.listAll(true);
        expect(all).toHaveLength(3);
      });

      it('finds agents by role', () => {
        const analysts = registry.findByRole('analyst');
        expect(analysts).toHaveLength(1);
        expect(analysts[0].id).toBe('did:holo:analyst');
      });

      it('checks active status', () => {
        expect(registry.isActive('did:holo:brittney')).toBe(true);
        expect(registry.isActive('did:holo:nonexistent')).toBe(false);
      });
    });

    describe('service management', () => {
      it('adds a service to existing DID', () => {
        registry.register({ agentId: 'brittney' });

        const added = registry.addService('did:holo:brittney', {
          id: 'did:holo:brittney#mcp',
          type: 'MCPEndpoint',
          serviceEndpoint: 'http://localhost:5567',
        });

        expect(added).toBe(true);

        const result = registry.resolve('did:holo:brittney');
        const mcp = result.didDocument!.service?.find(s => s.type === 'MCPEndpoint');
        expect(mcp).toBeDefined();
      });

      it('updates existing service', () => {
        registry.register({ agentId: 'brittney' });
        registry.addService('did:holo:brittney', {
          id: 'did:holo:brittney#mcp',
          type: 'MCPEndpoint',
          serviceEndpoint: 'http://localhost:5567',
        });
        registry.addService('did:holo:brittney', {
          id: 'did:holo:brittney#mcp',
          type: 'MCPEndpoint',
          serviceEndpoint: 'http://localhost:5568',
        });

        const result = registry.resolve('did:holo:brittney');
        const mcp = result.didDocument!.service?.find(s => s.type === 'MCPEndpoint');
        expect(mcp!.serviceEndpoint).toBe('http://localhost:5568');
      });

      it('removes a service', () => {
        registry.register({ agentId: 'brittney' });
        registry.addService('did:holo:brittney', {
          id: 'did:holo:brittney#mcp',
          type: 'MCPEndpoint',
          serviceEndpoint: 'http://localhost:5567',
        });

        const removed = registry.removeService('did:holo:brittney', 'did:holo:brittney#mcp');
        expect(removed).toBe(true);
      });
    });

    describe('metrics', () => {
      it('tracks registration metrics', () => {
        registry.register({ agentId: 'brittney' });
        registry.register({ agentId: 'analyst' });
        registry.deactivate('did:holo:analyst');

        const metrics = registry.getMetrics();
        expect(metrics.totalRegistered).toBe(2);
        expect(metrics.activeDIDs).toBe(1);
        expect(metrics.deactivatedDIDs).toBe(1);
      });

      it('tracks resolution metrics', () => {
        registry.register({ agentId: 'brittney' });
        registry.resolve('did:holo:brittney');
        registry.resolve('did:holo:unknown');

        const metrics = registry.getMetrics();
        expect(metrics.totalResolutions).toBe(2);
      });
    });

    describe('lifecycle', () => {
      it('destroys all state', () => {
        registry.register({ agentId: 'brittney' });
        registry.resolve('did:holo:brittney');
        registry.destroy();

        expect(registry.size).toBe(0);
        const metrics = registry.getMetrics();
        expect(metrics.totalResolutions).toBe(0);
      });
    });
  });

  // =========================================================================
  // Singleton
  // =========================================================================

  describe('singleton', () => {
    beforeEach(() => {
      resetAgentDIDRegistry();
    });

    it('returns the same instance', () => {
      const a = getAgentDIDRegistry();
      const b = getAgentDIDRegistry();
      expect(a).toBe(b);
    });

    it('resets correctly', () => {
      const a = getAgentDIDRegistry();
      a.register({ agentId: 'test' });
      resetAgentDIDRegistry();

      const b = getAgentDIDRegistry();
      expect(b.size).toBe(0);
      expect(a).not.toBe(b);
    });
  });
});
