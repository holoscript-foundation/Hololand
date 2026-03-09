/**
 * MVC Editor Component Storybook Stories
 *
 * Interactive documentation and visual testing for all MVC editor components.
 * Demonstrates various states, configurations, and use cases.
 *
 * @storybook
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { DecisionHistoryEditor } from './DecisionHistoryEditor';
import { ActiveTaskEditor } from './ActiveTaskEditor';
import { UserPreferencesEditor } from './UserPreferencesEditor';
import { SpatialContextEditor } from './SpatialContextEditor';
import { EvidenceTrailViewer } from './EvidenceTrailViewer';

import type {
  DecisionHistory,
  ActiveTaskState,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
} from '@holoscript/mvc-schema';

// ============================================================================
// Mock Data
// ============================================================================

const mockDecisionHistory: DecisionHistory = {
  crdtType: 'g-set',
  crdtId: 'decision-history-1',
  decisions: [
    {
      id: 'dec-1',
      timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
      type: 'task',
      description: 'Decided to implement MVC editor components',
      choice: 'Build comprehensive UI suite with CRDT integration',
      outcome: 'success',
      confidence: 0.95,
      agentDid: 'did:example:agent1',
    },
    {
      id: 'dec-2',
      timestamp: Date.now() - 1000 * 60 * 60 * 12, // 12 hours ago
      type: 'preference',
      description: 'Updated visual theme preference',
      choice: 'Switch to dark mode for better readability',
      parentId: 'dec-1',
      outcome: 'success',
      confidence: 0.88,
      agentDid: 'did:example:agent1',
    },
    {
      id: 'dec-3',
      timestamp: Date.now() - 1000 * 60 * 60 * 6, // 6 hours ago
      type: 'strategy',
      description: 'Chose test-driven development approach',
      choice: 'Write tests alongside component implementation',
      outcome: 'pending',
      confidence: 0.92,
      agentDid: 'did:example:agent1',
    },
    {
      id: 'dec-4',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      type: 'resource',
      description: 'Allocated time for documentation',
      choice: 'Write Storybook stories and README',
      outcome: 'pending',
      agentDid: 'did:example:agent1',
    },
  ],
  vectorClock: { 'agent1': 4 },
  lastUpdated: Date.now(),
};

const mockActiveTaskState: ActiveTaskState = {
  crdtType: 'or-set+lww',
  crdtId: 'task-state-1',
  tasks: [
    {
      id: 'task-1',
      title: 'Build DecisionHistoryEditor component',
      status: 'completed',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      updatedAt: Date.now() - 1000 * 60 * 60 * 12,
      assignedTo: 'did:example:agent1',
      estimatedDuration: 1000 * 60 * 120,
      actualDuration: 1000 * 60 * 90,
    },
    {
      id: 'task-2',
      title: 'Build ActiveTaskEditor component',
      status: 'completed',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 60 * 20,
      updatedAt: Date.now() - 1000 * 60 * 60 * 10,
      assignedTo: 'did:example:agent1',
      estimatedDuration: 1000 * 60 * 150,
      actualDuration: 1000 * 60 * 140,
    },
    {
      id: 'task-3',
      title: 'Write comprehensive test suite',
      status: 'in_progress',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 60 * 8,
      updatedAt: Date.now() - 1000 * 60 * 5,
      assignedTo: 'did:example:agent1',
      estimatedDuration: 1000 * 60 * 180,
    },
    {
      id: 'task-4',
      title: 'Create Storybook stories',
      status: 'in_progress',
      priority: 'medium',
      createdAt: Date.now() - 1000 * 60 * 60 * 4,
      updatedAt: Date.now() - 1000 * 60 * 2,
      estimatedDuration: 1000 * 60 * 90,
    },
    {
      id: 'task-5',
      title: 'Integrate with @holoscript/mvc-schema',
      status: 'pending',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 60 * 2,
      updatedAt: Date.now() - 1000 * 60 * 60 * 2,
      estimatedDuration: 1000 * 60 * 60,
    },
    {
      id: 'task-6',
      title: 'Fix TypeScript type errors',
      status: 'blocked',
      priority: 'critical',
      createdAt: Date.now() - 1000 * 60 * 60,
      updatedAt: Date.now() - 1000 * 60 * 30,
      blockingReason: 'Waiting for @holoscript/mvc-schema package update',
    },
  ],
  taskTags: {},
  statusRegisters: {},
  vectorClock: { 'agent1': 6 },
  lastUpdated: Date.now(),
};

const mockUserPreferences: UserPreferences = {
  crdtType: 'lww-map',
  crdtId: 'prefs-1',
  agentDid: 'did:example:agent1',
  spatial: {
    movementSpeed: 2.0,
    personalSpaceRadius: 0.6,
    interactionDistance: 1.2,
    handDominance: 'right',
  },
  communication: {
    style: 'casual',
    language: 'en',
    voiceInput: true,
    textToSpeech: false,
    notifications: 'important',
  },
  visual: {
    theme: 'dark',
    uiScale: 1.0,
    colorVisionMode: 'normal',
    reducedMotion: false,
    showAnchors: true,
  },
  privacy: {
    shareLocation: false,
    shareTaskState: true,
    allowCollaboration: true,
    visibilityMode: 'team',
  },
  lwwMetadata: {
    'spatial.movementSpeed': {
      timestamp: Date.now() - 1000 * 60 * 60,
      actorDid: 'did:example:agent1',
      operationId: 'op-1',
    },
    'communication.style': {
      timestamp: Date.now() - 1000 * 60 * 30,
      actorDid: 'did:example:agent2',
      operationId: 'op-2',
    },
    'visual.theme': {
      timestamp: Date.now() - 1000 * 60 * 10,
      actorDid: 'did:example:agent1',
      operationId: 'op-3',
    },
  },
  lastUpdated: Date.now(),
};

const mockSpatialContext: SpatialContextSummary = {
  crdtType: 'lww+gset',
  crdtId: 'spatial-1',
  agentDid: 'did:example:agent1',
  primaryAnchor: {
    id: 'anchor-1',
    coordinate: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 10.5,
      horizontalAccuracy: 5.0,
      verticalAccuracy: 2.0,
    },
    label: 'Office Building - Main Entrance',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    lastVerified: Date.now() - 1000 * 60 * 10,
    creatorDid: 'did:example:agent1',
    type: 'workspace',
    confidence: 0.95,
  },
  currentPose: {
    position: [0.5, 1.7, -0.3],
    orientation: [0, 0.707, 0, 0.707],
    timestamp: Date.now(),
    velocity: [0.1, 0, 0.05],
    angularVelocity: [0, 0.01, 0],
  },
  recentAnchors: [
    {
      id: 'anchor-2',
      coordinate: {
        latitude: 37.7750,
        longitude: -122.4195,
        altitude: 10.2,
      },
      label: 'Conference Room A',
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
      lastVerified: Date.now() - 1000 * 60 * 60,
      type: 'meeting',
      confidence: 0.88,
    },
    {
      id: 'anchor-3',
      coordinate: {
        latitude: 37.7748,
        longitude: -122.4193,
        altitude: 10.8,
      },
      label: 'Coffee & Collaboration Area',
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
      lastVerified: Date.now() - 1000 * 60 * 30,
      type: 'poi',
    },
    {
      id: 'anchor-4',
      coordinate: {
        latitude: 37.7751,
        longitude: -122.4196,
        altitude: 10.0,
      },
      label: 'Parking Structure',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7,
      lastVerified: Date.now() - 1000 * 60 * 60 * 24,
      type: 'reference',
    },
  ],
  environment: {
    type: 'indoor',
    lightingLevel: 400,
    noiseLevel: 45,
    temperature: 22,
  },
  lastUpdated: Date.now(),
};

const mockEvidenceTrail: EvidenceTrail = {
  crdtType: 'hash-chain',
  crdtId: 'evidence-1',
  vcpMetadata: {
    version: '1.1',
    hashAlgorithm: 'sha256',
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    creatorDid: 'did:example:agent1',
    purpose: 'Component development audit trail',
  },
  entries: [
    {
      sequence: 0,
      type: 'observation',
      timestamp: Date.now() - 1000 * 60 * 60 * 24,
      content: 'MVC editor component development initiated',
      hash: '9a7b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b',
      previousHash: null,
      agentDid: 'did:example:agent1',
      confidence: 1.0,
      source: 'ProjectManagement',
    },
    {
      sequence: 1,
      type: 'action',
      timestamp: Date.now() - 1000 * 60 * 60 * 20,
      content: 'Created DecisionHistoryEditor component with timeline view',
      hash: '8b6c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
      previousHash: '9a7b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b',
      agentDid: 'did:example:agent1',
      source: 'DecisionHistoryEditor',
    },
    {
      sequence: 2,
      type: 'reasoning',
      timestamp: Date.now() - 1000 * 60 * 60 * 16,
      content: 'Chose kanban board pattern for task management based on UX best practices',
      hash: '7c5d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
      previousHash: '8b6c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
      agentDid: 'did:example:agent1',
      confidence: 0.92,
    },
    {
      sequence: 3,
      type: 'action',
      timestamp: Date.now() - 1000 * 60 * 60 * 12,
      content: 'Implemented UserPreferencesEditor with learned vs explicit distinction',
      hash: '6d4e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
      previousHash: '7c5d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d',
      agentDid: 'did:example:agent1',
    },
    {
      sequence: 4,
      type: 'measurement',
      timestamp: Date.now() - 1000 * 60 * 60 * 8,
      content: 'Test coverage reached 84/84 test cases (100%)',
      hash: '5e3f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
      previousHash: '6d4e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e',
      agentDid: 'did:example:agent1',
      confidence: 1.0,
      source: 'TestRunner',
    },
    {
      sequence: 5,
      type: 'credential',
      timestamp: Date.now() - 1000 * 60 * 60 * 4,
      content: 'Components verified against WCAG 2.1 AA accessibility standards',
      hash: '4f2a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
      previousHash: '5e3f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
      agentDid: 'did:example:agent1',
      signature: 'sig_abc123def456',
    },
  ],
  headHash: '4f2a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a',
  lastVerification: {
    valid: true,
    entriesVerified: 6,
    brokenLinks: [],
    invalidSignatures: [],
    verifiedAt: Date.now() - 1000 * 60 * 60,
  },
  lastUpdated: Date.now(),
};

// ============================================================================
// DecisionHistoryEditor Stories
// ============================================================================

const decisionHistoryMeta: Meta<typeof DecisionHistoryEditor> = {
  title: 'MVC Editors/DecisionHistoryEditor',
  component: DecisionHistoryEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default decisionHistoryMeta;

type DecisionHistoryStory = StoryObj<typeof DecisionHistoryEditor>;

export const Default: DecisionHistoryStory = {
  args: {
    decisionHistory: mockDecisionHistory,
  },
};

export const WithOutcomes: DecisionHistoryStory = {
  args: {
    decisionHistory: mockDecisionHistory,
    showOutcomes: true,
    showConfidence: true,
  },
};

export const CompactMode: DecisionHistoryStory = {
  args: {
    decisionHistory: mockDecisionHistory,
    displayMode: 'compact',
  },
};

export const FilteredByType: DecisionHistoryStory = {
  args: {
    decisionHistory: mockDecisionHistory,
    filterType: 'task',
  },
};

export const OldestFirst: DecisionHistoryStory = {
  args: {
    decisionHistory: mockDecisionHistory,
    sortOrder: 'oldest',
  },
};

export const LimitedEntries: DecisionHistoryStory = {
  args: {
    decisionHistory: mockDecisionHistory,
    maxDecisions: 2,
  },
};

// ============================================================================
// ActiveTaskEditor Stories
// ============================================================================

const activeTaskMeta: Meta<typeof ActiveTaskEditor> = {
  title: 'MVC Editors/ActiveTaskEditor',
  component: ActiveTaskEditor,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export { activeTaskMeta };

type ActiveTaskStory = StoryObj<typeof ActiveTaskEditor>;

export const KanbanBoard: ActiveTaskStory = {
  args: {
    activeTaskState: mockActiveTaskState,
    showDurations: true,
  },
};

export const CompactTaskView: ActiveTaskStory = {
  args: {
    activeTaskState: mockActiveTaskState,
    displayMode: 'compact',
  },
};

export const PendingTasksOnly: ActiveTaskStory = {
  args: {
    activeTaskState: mockActiveTaskState,
  },
  render: (args) => <ActiveTaskEditor {...args} />,
};

export const WithSubtasks: ActiveTaskStory = {
  args: {
    activeTaskState: mockActiveTaskState,
    showSubtasks: true,
    showDurations: true,
  },
};

export const CustomKanbanColumns: ActiveTaskStory = {
  args: {
    activeTaskState: mockActiveTaskState,
    kanbanColumns: ['pending', 'in_progress', 'completed'],
  },
};

// ============================================================================
// UserPreferencesEditor Stories
// ============================================================================

const userPrefsMeta: Meta<typeof UserPreferencesEditor> = {
  title: 'MVC Editors/UserPreferencesEditor',
  component: UserPreferencesEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export { userPrefsMeta };

type UserPrefsStory = StoryObj<typeof UserPreferencesEditor>;

export const AllCategories: UserPrefsStory = {
  args: {
    userPreferences: mockUserPreferences,
    showLearnedVsExplicit: true,
    showMetadata: true,
  },
};

export const SpatialPreferences: UserPrefsStory = {
  args: {
    userPreferences: mockUserPreferences,
    categories: ['spatial'],
  },
};

export const ReadOnlyMode: UserPrefsStory = {
  args: {
    userPreferences: mockUserPreferences,
    allowEditing: false,
  },
};

export const CompactPreferences: UserPrefsStory = {
  args: {
    userPreferences: mockUserPreferences,
    displayMode: 'compact',
  },
};

export const ModifiedOnly: UserPrefsStory = {
  args: {
    userPreferences: mockUserPreferences,
    showLearnedVsExplicit: true,
  },
  render: (args) => <UserPreferencesEditor {...args} />,
};

// ============================================================================
// SpatialContextEditor Stories
// ============================================================================

const spatialContextMeta: Meta<typeof SpatialContextEditor> = {
  title: 'MVC Editors/SpatialContextEditor',
  component: SpatialContextEditor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export { spatialContextMeta };

type SpatialContextStory = StoryObj<typeof SpatialContextEditor>;

export const MapView: SpatialContextStory = {
  args: {
    spatialContext: mockSpatialContext,
    showEnvironment: true,
    show3DPose: true,
  },
};

export const ListView: SpatialContextStory = {
  args: {
    spatialContext: mockSpatialContext,
    showEnvironment: true,
  },
  render: (args) => <SpatialContextEditor {...args} />,
};

export const With3DPose: SpatialContextStory = {
  args: {
    spatialContext: mockSpatialContext,
    show3DPose: true,
    showEnvironment: true,
  },
};

export const CompactSpatial: SpatialContextStory = {
  args: {
    spatialContext: mockSpatialContext,
    displayMode: 'compact',
  },
};

export const EnvironmentDetails: SpatialContextStory = {
  args: {
    spatialContext: mockSpatialContext,
    showEnvironment: true,
    showMovementHistory: true,
  },
};

// ============================================================================
// EvidenceTrailViewer Stories
// ============================================================================

const evidenceTrailMeta: Meta<typeof EvidenceTrailViewer> = {
  title: 'MVC Editors/EvidenceTrailViewer',
  component: EvidenceTrailViewer,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export { evidenceTrailMeta };

type EvidenceTrailStory = StoryObj<typeof EvidenceTrailViewer>;

export const VerifiedChain: EvidenceTrailStory = {
  args: {
    evidenceTrail: mockEvidenceTrail,
    showCryptoDetails: false,
    showSignatures: true,
  },
};

export const WithHashDetails: EvidenceTrailStory = {
  args: {
    evidenceTrail: mockEvidenceTrail,
    showCryptoDetails: true,
    showSignatures: true,
  },
};

export const CompactEvidence: EvidenceTrailStory = {
  args: {
    evidenceTrail: mockEvidenceTrail,
    displayMode: 'compact',
  },
};

export const FilteredByType: EvidenceTrailStory = {
  args: {
    evidenceTrail: mockEvidenceTrail,
    filterType: 'action',
  },
};

export const LimitedEntries: EvidenceTrailStory = {
  args: {
    evidenceTrail: mockEvidenceTrail,
    maxEntries: 3,
  },
};

export const WithBrokenLinks: EvidenceTrailStory = {
  args: {
    evidenceTrail: {
      ...mockEvidenceTrail,
      lastVerification: {
        valid: false,
        entriesVerified: 6,
        brokenLinks: [2, 4],
        invalidSignatures: [5],
        verifiedAt: Date.now() - 1000 * 60 * 5,
        error: 'Hash chain integrity compromised',
      },
    },
    highlightBrokenLinks: true,
  },
};
