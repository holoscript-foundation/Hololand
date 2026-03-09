/**
 * Mock for @holoscript/mvc-schema
 * Used in integration tests for MVC editor
 */

export interface DecisionHistory {
  crdtType: 'g-set';
  crdtId: string;
  decisions: any[];
  vectorClock: Record<string, number>;
  lastUpdated: number;
}

export interface ActiveTaskState {
  crdtType: 'or-set+lww';
  crdtId: string;
  tasks: any[];
  taskTags?: Record<string, any>;
  statusRegisters?: Record<string, any>;
  vectorClock: Record<string, number>;
  lastUpdated: number;
}

export interface UserPreferences {
  crdtType: 'lww-map';
  crdtId: string;
  agentDid: string;
  spatial: Record<string, any>;
  communication: Record<string, any>;
  visual: Record<string, any>;
  privacy: Record<string, any>;
  lwwMetadata: Record<string, any>;
  lastUpdated: number;
}

export interface SpatialContextSummary {
  crdtType: 'lww+gset';
  crdtId: string;
  agentDid: string;
  primaryAnchor?: any;
  currentPose?: any;
  recentAnchors: any[];
  environment?: Record<string, any>;
  lastUpdated: number;
}

export interface EvidenceTrail {
  crdtType: 'hash-chain';
  crdtId: string;
  vcpMetadata: {
    version: string;
    hashAlgorithm: string;
    createdAt: number;
    creatorDid: string;
  };
  entries: any[];
  headHash: string | null;
  lastVerification: any | null;
  lastUpdated: number;
}
