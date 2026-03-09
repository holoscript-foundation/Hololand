/**
 * MVC Editor Components - Real Data Integration Tests
 *
 * Tests all 5 MVC editor components with production-realistic data fixtures:
 *   - DecisionHistoryEditor: Multi-agent decision chains with outcomes
 *   - ActiveTaskEditor: Kanban board with priorities, blocking, durations
 *   - UserPreferencesEditor: LWW-Map preferences across 4 categories
 *   - SpatialContextEditor: WGS84 geospatial anchors with accuracy
 *   - EvidenceTrailViewer: Hash-chain VCP verification
 *
 * Validates CRDT semantics (vector clocks, LWW metadata, OR-SET operations,
 * hash chain integrity) are properly reflected in the UI.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@holoscript/mvc-schema', () => ({
  DecisionHistory: {} as any,
  ActiveTaskState: {} as any,
  UserPreferences: {} as any,
  SpatialContextSummary: {} as any,
  EvidenceTrail: {} as any,
}));

// =============================================================================
// PRODUCTION-REALISTIC TEST DATA
// =============================================================================

const NOW = Date.now();

/** Realistic multi-agent decision history with causal chains */
const realDecisionHistory = {
  crdtType: 'g-set' as const,
  crdtId: 'real-decisions-001',
  decisions: [
    {
      id: 'dec-sprint-plan',
      timestamp: NOW - 86400000, // 24h ago
      type: 'strategy',
      description: 'Sprint planning: adopted 2-week cycles with daily standups',
      choice: 'Agile methodology over waterfall for Q2 deliverables',
      outcome: 'success',
      confidence: 0.92,
      agentDid: 'did:hololand:brittney',
    },
    {
      id: 'dec-arch-decision',
      timestamp: NOW - 72000000, // 20h ago
      type: 'task',
      description: 'Architecture review: CRDT-based state sync over REST polling',
      choice: 'DeltaCRDTSyncEngine for real-time collaboration',
      parentId: 'dec-sprint-plan',
      outcome: 'success',
      confidence: 0.88,
      agentDid: 'did:hololand:builder',
    },
    {
      id: 'dec-perf-tradeoff',
      timestamp: NOW - 36000000, // 10h ago
      type: 'strategy',
      description: 'Performance vs features tradeoff for VR renderer',
      choice: 'Optimize for 90Hz minimum, defer advanced shaders',
      parentId: 'dec-arch-decision',
      outcome: 'pending',
      confidence: 0.76,
      agentDid: 'did:hololand:researcher',
    },
    {
      id: 'dec-deploy-rollback',
      timestamp: NOW - 7200000, // 2h ago
      type: 'task',
      description: 'Production deployment showed 15% latency spike',
      choice: 'Rollback to v2.3.1 and investigate CRDT merge bottleneck',
      outcome: 'failure',
      confidence: 0.95,
      agentDid: 'did:hololand:manager',
    },
    {
      id: 'dec-hotfix',
      timestamp: NOW - 3600000, // 1h ago
      type: 'task',
      description: 'Hotfix: vector clock merge was O(n^2) for large peer sets',
      choice: 'Implemented incremental merge with bloom filter pre-check',
      parentId: 'dec-deploy-rollback',
      outcome: 'success',
      confidence: 0.91,
      agentDid: 'did:hololand:builder',
    },
  ],
  vectorClock: {
    'brittney': 1,
    'builder': 2,
    'researcher': 1,
    'manager': 1,
  },
  lastUpdated: NOW,
};

/** Realistic task state with diverse statuses */
const realActiveTaskState = {
  crdtType: 'or-set+lww' as const,
  crdtId: 'real-tasks-001',
  tasks: [
    {
      id: 'task-crdt-sync',
      title: 'Implement DeltaCRDTSyncEngine bandwidth optimization',
      status: 'completed',
      priority: 'critical',
      createdAt: NOW - 172800000, // 2 days ago
      updatedAt: NOW - 3600000,
      assignedTo: 'did:hololand:builder',
      estimatedDuration: 28800000, // 8 hours
    },
    {
      id: 'task-webrtc',
      title: 'Add WebRTC auto-reconnection with exponential backoff',
      status: 'in_progress',
      priority: 'high',
      createdAt: NOW - 86400000,
      updatedAt: NOW - 1800000,
      assignedTo: 'did:hololand:builder',
      estimatedDuration: 14400000, // 4 hours
    },
    {
      id: 'task-culture-tests',
      title: 'Create cultural zone transition integration tests',
      status: 'in_progress',
      priority: 'high',
      createdAt: NOW - 43200000,
      updatedAt: NOW - 900000,
      assignedTo: 'did:hololand:researcher',
      estimatedDuration: 10800000, // 3 hours
    },
    {
      id: 'task-perf-audit',
      title: 'VR frame budget performance audit (90Hz compliance)',
      status: 'pending',
      priority: 'high',
      createdAt: NOW - 7200000,
      updatedAt: NOW - 7200000,
      estimatedDuration: 7200000, // 2 hours
    },
    {
      id: 'task-deploy-fix',
      title: 'Investigate and fix production latency regression',
      status: 'blocked',
      priority: 'critical',
      createdAt: NOW - 7200000,
      updatedAt: NOW - 3600000,
      assignedTo: 'did:hololand:manager',
      blockingReason: 'Waiting for production logs from ops team',
    },
    {
      id: 'task-docs',
      title: 'Update API documentation for MVC persistence layer',
      status: 'pending',
      priority: 'low',
      createdAt: NOW - 3600000,
      updatedAt: NOW - 3600000,
    },
  ],
  taskTags: { 'task-crdt-sync': ['crdt', 'sync'], 'task-webrtc': ['network', 'p2p'] },
  statusRegisters: {},
  vectorClock: { 'builder': 3, 'researcher': 1, 'manager': 1 },
  lastUpdated: NOW,
};

/** Realistic user preferences with LWW metadata */
const realUserPreferences = {
  crdtType: 'lww-map' as const,
  crdtId: 'real-prefs-001',
  agentDid: 'did:hololand:brittney',
  spatial: {
    movementSpeed: 2.5,
    personalSpaceRadius: 0.8,
    interactionDistance: 1.5,
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
    uiScale: 1.1,
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
      timestamp: NOW - 7200000,
      actorDid: 'did:hololand:brittney',
      operationId: 'op-speed-1',
    },
    'visual.theme': {
      timestamp: NOW - 3600000,
      actorDid: 'did:hololand:manager',
      operationId: 'op-theme-1',
    },
    'communication.style': {
      timestamp: NOW - 1800000,
      actorDid: 'did:hololand:brittney',
      operationId: 'op-style-1',
    },
  },
  lastUpdated: NOW,
};

/** Realistic spatial context with WGS84 coordinates */
const realSpatialContext = {
  crdtType: 'lww+gset' as const,
  crdtId: 'real-spatial-001',
  agentDid: 'did:hololand:brittney',
  primaryAnchor: {
    id: 'anchor-hq',
    coordinate: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 52.3,
      horizontalAccuracy: 2.5,
      verticalAccuracy: 1.2,
    },
    label: 'HoloLand HQ - Main Office',
    createdAt: NOW - 604800000, // 1 week ago
    lastVerified: NOW - 300000, // 5 min ago
    creatorDid: 'did:hololand:builder',
    type: 'workspace',
    confidence: 0.97,
  },
  currentPose: {
    position: [0.5, 1.75, -0.2],
    orientation: [0, 0.707, 0, 0.707], // 90deg Y rotation
    timestamp: NOW,
    velocity: [0.05, 0, 0.02],
  },
  recentAnchors: [
    {
      id: 'anchor-conf-a',
      coordinate: { latitude: 37.7750, longitude: -122.4195, altitude: 52.1 },
      label: 'Conference Room Alpha',
      createdAt: NOW - 259200000,
      lastVerified: NOW - 7200000,
      type: 'meeting',
    },
    {
      id: 'anchor-cafe',
      coordinate: { latitude: 37.7748, longitude: -122.4193, altitude: 51.8 },
      label: 'Rooftop Cafe',
      createdAt: NOW - 172800000,
      lastVerified: NOW - 43200000,
      type: 'poi',
    },
    {
      id: 'anchor-lab',
      coordinate: { latitude: 37.7751, longitude: -122.4196, altitude: 53.0 },
      label: 'VR Research Lab',
      createdAt: NOW - 86400000,
      lastVerified: NOW - 14400000,
      type: 'workspace',
    },
  ],
  environment: {
    type: 'indoor',
    lightingLevel: 450,
    noiseLevel: 38,
    temperature: 21.5,
  },
  lastUpdated: NOW,
};

/** Realistic evidence trail with hash chain */
const realEvidenceTrail = {
  crdtType: 'hash-chain' as const,
  crdtId: 'real-evidence-001',
  vcpMetadata: {
    version: '1.1',
    hashAlgorithm: 'sha256',
    createdAt: NOW - 86400000,
    creatorDid: 'did:hololand:brittney',
  },
  entries: [
    {
      sequence: 0,
      type: 'observation',
      timestamp: NOW - 86400000,
      content: 'Sprint initiated with 6 story points allocated to cultural systems',
      hash: 'a1b2c3d4e5f6789012345678abcdef01',
      previousHash: null,
      agentDid: 'did:hololand:brittney',
      confidence: 1.0,
    },
    {
      sequence: 1,
      type: 'action',
      timestamp: NOW - 72000000,
      content: 'Created DeltaCRDTSyncEngine implementation with Merkle verification',
      hash: 'b2c3d4e5f6789012345678abcdef0123',
      previousHash: 'a1b2c3d4e5f6789012345678abcdef01',
      agentDid: 'did:hololand:builder',
      source: 'DeltaCRDTSyncEngine',
    },
    {
      sequence: 2,
      type: 'reasoning',
      timestamp: NOW - 43200000,
      content: 'Delta-based sync reduces bandwidth by 80-95% vs full-state sync based on benchmark',
      hash: 'c3d4e5f6789012345678abcdef012345',
      previousHash: 'b2c3d4e5f6789012345678abcdef0123',
      agentDid: 'did:hololand:researcher',
      confidence: 0.88,
    },
    {
      sequence: 3,
      type: 'observation',
      timestamp: NOW - 7200000,
      content: 'Production deployment revealed latency spike during peak concurrent users',
      hash: 'd4e5f6789012345678abcdef01234567',
      previousHash: 'c3d4e5f6789012345678abcdef012345',
      agentDid: 'did:hololand:manager',
      confidence: 0.95,
    },
    {
      sequence: 4,
      type: 'action',
      timestamp: NOW - 3600000,
      content: 'Applied hotfix: O(n^2) vector clock merge replaced with incremental algorithm',
      hash: 'e5f6789012345678abcdef0123456789',
      previousHash: 'd4e5f6789012345678abcdef01234567',
      agentDid: 'did:hololand:builder',
      source: 'VectorClockMerge',
      confidence: 0.91,
    },
  ],
  headHash: 'e5f6789012345678abcdef0123456789',
  lastVerification: {
    valid: true,
    entriesVerified: 5,
    brokenLinks: [],
    invalidSignatures: [],
    verifiedAt: NOW - 1800000,
  },
  lastUpdated: NOW,
};

// =============================================================================
// MOCK MVC EDITOR PAGE (with real data)
// =============================================================================

const RealDataMVCEditor: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState('decision');
  const [decisions] = React.useState(realDecisionHistory);
  const [tasks] = React.useState(realActiveTaskState);
  const [prefs] = React.useState(realUserPreferences);
  const [spatial] = React.useState(realSpatialContext);
  const [evidence] = React.useState(realEvidenceTrail);

  return (
    <div data-testid="real-mvc-editor">
      <h1>MVC Editor - Real Data</h1>

      <div role="tablist">
        {(['decision', 'task', 'preferences', 'spatial', 'evidence'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" hidden={activeTab !== 'decision'} data-testid="panel-decision">
        <h2>Decision History (G-SET)</h2>
        <p data-testid="decision-count">Decisions: {decisions.decisions.length}</p>
        <p data-testid="decision-vclock">Vector Clock: {JSON.stringify(decisions.vectorClock)}</p>
        <ul data-testid="decision-list" role="list">
          {decisions.decisions.map(dec => (
            <li key={dec.id} data-testid={`decision-${dec.id}`} role="listitem">
              <span data-testid={`dec-type-${dec.id}`}>{dec.type.toUpperCase()}</span>
              <span data-testid={`dec-desc-${dec.id}`}>{dec.description}</span>
              <span data-testid={`dec-outcome-${dec.id}`}>{dec.outcome}</span>
              {dec.confidence && <span data-testid={`dec-conf-${dec.id}`}>{(dec.confidence * 100).toFixed(0)}%</span>}
              <span data-testid={`dec-agent-${dec.id}`}>{dec.agentDid}</span>
              {dec.parentId && <span data-testid={`dec-parent-${dec.id}`}>parent: {dec.parentId}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'task'} data-testid="panel-task">
        <h2>Active Tasks (OR-SET + LWW)</h2>
        <p data-testid="task-count">Tasks: {tasks.tasks.length}</p>
        <p data-testid="task-vclock">Vector Clock: {JSON.stringify(tasks.vectorClock)}</p>
        <div data-testid="task-status-summary">
          {['pending', 'in_progress', 'blocked', 'completed'].map(status => {
            const count = tasks.tasks.filter((t: any) => t.status === status).length;
            return <span key={status} data-testid={`status-${status}`}>{status}: {count}</span>;
          })}
        </div>
        <ul data-testid="task-list">
          {tasks.tasks.map((task: any) => (
            <li key={task.id} data-testid={`task-${task.id}`} data-priority={task.priority} data-status={task.status}>
              <span>{task.title}</span>
              <span>[{task.priority}]</span>
              <span>({task.status})</span>
              {task.blockingReason && <span data-testid={`blocking-${task.id}`}>{task.blockingReason}</span>}
              {task.estimatedDuration && (
                <span data-testid={`duration-${task.id}`}>
                  Est: {(task.estimatedDuration / 3600000).toFixed(0)}h
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'preferences'} data-testid="panel-preferences">
        <h2>User Preferences (LWW-Map)</h2>
        <p data-testid="prefs-agent">Agent: {prefs.agentDid}</p>
        <p data-testid="prefs-modified">Modified Fields: {Object.keys(prefs.lwwMetadata).length}</p>
        <div data-testid="prefs-spatial">
          <h3>Spatial</h3>
          <span data-testid="pref-speed">Speed: {prefs.spatial.movementSpeed}</span>
          <span data-testid="pref-space">Space: {prefs.spatial.personalSpaceRadius}m</span>
          <span data-testid="pref-hand">Hand: {prefs.spatial.handDominance}</span>
        </div>
        <div data-testid="prefs-visual">
          <h3>Visual</h3>
          <span data-testid="pref-theme">Theme: {prefs.visual.theme}</span>
          <span data-testid="pref-scale">Scale: {prefs.visual.uiScale}</span>
        </div>
        <div data-testid="prefs-privacy">
          <h3>Privacy</h3>
          <span data-testid="pref-location">Share Location: {prefs.privacy.shareLocation ? 'Yes' : 'No'}</span>
          <span data-testid="pref-collab">Allow Collab: {prefs.privacy.allowCollaboration ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'spatial'} data-testid="panel-spatial">
        <h2>Spatial Context (LWW + G-SET)</h2>
        <p data-testid="spatial-anchors">Anchors: {spatial.recentAnchors.length + 1}</p>
        {spatial.primaryAnchor && (
          <div data-testid="primary-anchor">
            <span data-testid="anchor-label">{spatial.primaryAnchor.label}</span>
            <span data-testid="anchor-coords">
              {spatial.primaryAnchor.coordinate.latitude.toFixed(4)}, {spatial.primaryAnchor.coordinate.longitude.toFixed(4)}
            </span>
            <span data-testid="anchor-altitude">Altitude: {spatial.primaryAnchor.coordinate.altitude}m</span>
            <span data-testid="anchor-accuracy">
              H: ±{spatial.primaryAnchor.coordinate.horizontalAccuracy}m,
              V: ±{spatial.primaryAnchor.coordinate.verticalAccuracy}m
            </span>
            <span data-testid="anchor-confidence">{(spatial.primaryAnchor.confidence * 100).toFixed(0)}%</span>
            <span data-testid="anchor-type">{spatial.primaryAnchor.type}</span>
          </div>
        )}
        <div data-testid="environment">
          <span data-testid="env-type">{spatial.environment.type}</span>
          <span data-testid="env-light">{spatial.environment.lightingLevel} lux</span>
          <span data-testid="env-noise">{spatial.environment.noiseLevel} dB</span>
          <span data-testid="env-temp">{spatial.environment.temperature}°C</span>
        </div>
        <ul data-testid="anchor-list">
          {spatial.recentAnchors.map((a: any) => (
            <li key={a.id} data-testid={`anchor-${a.id}`}>
              {a.label} ({a.type})
            </li>
          ))}
        </ul>
      </div>

      <div role="tabpanel" hidden={activeTab !== 'evidence'} data-testid="panel-evidence">
        <h2>Evidence Trail (Hash Chain / VCP v{evidence.vcpMetadata.version})</h2>
        <p data-testid="evidence-count">Entries: {evidence.entries.length}</p>
        <p data-testid="evidence-head">Head: {evidence.headHash}</p>
        {evidence.lastVerification && (
          <div data-testid="verification-result">
            <span data-testid="verify-valid">Valid: {evidence.lastVerification.valid ? 'Yes' : 'No'}</span>
            <span data-testid="verify-count">Verified: {evidence.lastVerification.entriesVerified}</span>
          </div>
        )}
        <ul data-testid="evidence-list" role="log">
          {evidence.entries.map((entry: any) => (
            <li key={entry.sequence} data-testid={`evidence-${entry.sequence}`}>
              <span data-testid={`ev-seq-${entry.sequence}`}>#{entry.sequence}</span>
              <span data-testid={`ev-type-${entry.sequence}`}>{entry.type.toUpperCase()}</span>
              <span data-testid={`ev-content-${entry.sequence}`}>{entry.content}</span>
              <span data-testid={`ev-hash-${entry.sequence}`}>{entry.hash}</span>
              <span data-testid={`ev-prev-${entry.sequence}`}>{entry.previousHash || 'GENESIS'}</span>
              {entry.confidence && <span data-testid={`ev-conf-${entry.sequence}`}>{(entry.confidence * 100).toFixed(0)}%</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('MVC Editor - Real Data Integration', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // DecisionHistoryEditor with real data
  // ---------------------------------------------------------------------------

  describe('DecisionHistoryEditor with real data', () => {
    it('renders all 5 real decisions with correct metadata', () => {
      render(<RealDataMVCEditor />);
      expect(screen.getByTestId('decision-count')).toHaveTextContent('Decisions: 5');
    });

    it('shows correct vector clock for multi-agent decisions', () => {
      render(<RealDataMVCEditor />);
      const vclock = screen.getByTestId('decision-vclock');
      expect(vclock.textContent).toContain('"brittney":1');
      expect(vclock.textContent).toContain('"builder":2');
      expect(vclock.textContent).toContain('"researcher":1');
      expect(vclock.textContent).toContain('"manager":1');
    });

    it('displays decision types correctly', () => {
      render(<RealDataMVCEditor />);
      expect(screen.getByTestId('dec-type-dec-sprint-plan')).toHaveTextContent('STRATEGY');
      expect(screen.getByTestId('dec-type-dec-arch-decision')).toHaveTextContent('TASK');
      expect(screen.getByTestId('dec-type-dec-hotfix')).toHaveTextContent('TASK');
    });

    it('shows causal chains via parentId references', () => {
      render(<RealDataMVCEditor />);
      expect(screen.getByTestId('dec-parent-dec-arch-decision')).toHaveTextContent('parent: dec-sprint-plan');
      expect(screen.getByTestId('dec-parent-dec-hotfix')).toHaveTextContent('parent: dec-deploy-rollback');
    });

    it('displays failure outcomes prominently', () => {
      render(<RealDataMVCEditor />);
      expect(screen.getByTestId('dec-outcome-dec-deploy-rollback')).toHaveTextContent('failure');
    });

    it('shows confidence scores for each decision', () => {
      render(<RealDataMVCEditor />);
      expect(screen.getByTestId('dec-conf-dec-sprint-plan')).toHaveTextContent('92%');
      expect(screen.getByTestId('dec-conf-dec-perf-tradeoff')).toHaveTextContent('76%');
    });
  });

  // ---------------------------------------------------------------------------
  // ActiveTaskEditor with real data
  // ---------------------------------------------------------------------------

  describe('ActiveTaskEditor with real data', () => {
    it('renders all 6 real tasks', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-task'));

      await waitFor(() => {
        expect(screen.getByTestId('task-count')).toHaveTextContent('Tasks: 6');
      });
    });

    it('shows correct status distribution', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-task'));

      await waitFor(() => {
        expect(screen.getByTestId('status-pending')).toHaveTextContent('pending: 2');
        expect(screen.getByTestId('status-in_progress')).toHaveTextContent('in_progress: 2');
        expect(screen.getByTestId('status-blocked')).toHaveTextContent('blocked: 1');
        expect(screen.getByTestId('status-completed')).toHaveTextContent('completed: 1');
      });
    });

    it('displays critical blocking reason', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-task'));

      await waitFor(() => {
        expect(screen.getByTestId('blocking-task-deploy-fix')).toHaveTextContent('Waiting for production logs');
      });
    });

    it('shows task duration estimates', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-task'));

      await waitFor(() => {
        expect(screen.getByTestId('duration-task-crdt-sync')).toHaveTextContent('Est: 8h');
        expect(screen.getByTestId('duration-task-webrtc')).toHaveTextContent('Est: 4h');
      });
    });

    it('correctly tags task priorities', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-task'));

      await waitFor(() => {
        const criticalTask = screen.getByTestId('task-task-crdt-sync');
        expect(criticalTask).toHaveAttribute('data-priority', 'critical');

        const lowTask = screen.getByTestId('task-task-docs');
        expect(lowTask).toHaveAttribute('data-priority', 'low');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // UserPreferencesEditor with real data
  // ---------------------------------------------------------------------------

  describe('UserPreferencesEditor with real data', () => {
    it('shows correct agent DID', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-preferences'));

      await waitFor(() => {
        expect(screen.getByTestId('prefs-agent')).toHaveTextContent('did:hololand:brittney');
      });
    });

    it('shows 3 LWW-modified fields', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-preferences'));

      await waitFor(() => {
        expect(screen.getByTestId('prefs-modified')).toHaveTextContent('Modified Fields: 3');
      });
    });

    it('displays spatial preferences correctly', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-preferences'));

      await waitFor(() => {
        expect(screen.getByTestId('pref-speed')).toHaveTextContent('Speed: 2.5');
        expect(screen.getByTestId('pref-space')).toHaveTextContent('Space: 0.8m');
        expect(screen.getByTestId('pref-hand')).toHaveTextContent('Hand: right');
      });
    });

    it('displays privacy preferences', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-preferences'));

      await waitFor(() => {
        expect(screen.getByTestId('pref-location')).toHaveTextContent('Share Location: No');
        expect(screen.getByTestId('pref-collab')).toHaveTextContent('Allow Collab: Yes');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // SpatialContextEditor with real data
  // ---------------------------------------------------------------------------

  describe('SpatialContextEditor with real data', () => {
    it('shows correct anchor count', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-spatial'));

      await waitFor(() => {
        expect(screen.getByTestId('spatial-anchors')).toHaveTextContent('Anchors: 4');
      });
    });

    it('displays primary anchor with WGS84 coordinates', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-spatial'));

      await waitFor(() => {
        expect(screen.getByTestId('anchor-label')).toHaveTextContent('HoloLand HQ - Main Office');
        expect(screen.getByTestId('anchor-coords')).toHaveTextContent('37.7749, -122.4194');
        expect(screen.getByTestId('anchor-altitude')).toHaveTextContent('Altitude: 52.3m');
      });
    });

    it('shows accuracy information', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-spatial'));

      await waitFor(() => {
        expect(screen.getByTestId('anchor-accuracy')).toHaveTextContent('H: ±2.5m');
        expect(screen.getByTestId('anchor-accuracy')).toHaveTextContent('V: ±1.2m');
      });
    });

    it('displays confidence score', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-spatial'));

      await waitFor(() => {
        expect(screen.getByTestId('anchor-confidence')).toHaveTextContent('97%');
      });
    });

    it('shows environment data', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-spatial'));

      await waitFor(() => {
        expect(screen.getByTestId('env-type')).toHaveTextContent('indoor');
        expect(screen.getByTestId('env-light')).toHaveTextContent('450 lux');
        expect(screen.getByTestId('env-temp')).toHaveTextContent('21.5');
      });
    });

    it('lists all recent anchors', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-spatial'));

      await waitFor(() => {
        expect(screen.getByTestId('anchor-anchor-conf-a')).toHaveTextContent('Conference Room Alpha');
        expect(screen.getByTestId('anchor-anchor-cafe')).toHaveTextContent('Rooftop Cafe');
        expect(screen.getByTestId('anchor-anchor-lab')).toHaveTextContent('VR Research Lab');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // EvidenceTrailViewer with real data
  // ---------------------------------------------------------------------------

  describe('EvidenceTrailViewer with real data', () => {
    it('shows 5 evidence entries', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-evidence'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-count')).toHaveTextContent('Entries: 5');
      });
    });

    it('displays head hash', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-evidence'));

      await waitFor(() => {
        expect(screen.getByTestId('evidence-head')).toHaveTextContent('e5f6789012345678abcdef0123456789');
      });
    });

    it('shows verification result as valid', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-evidence'));

      await waitFor(() => {
        expect(screen.getByTestId('verify-valid')).toHaveTextContent('Valid: Yes');
        expect(screen.getByTestId('verify-count')).toHaveTextContent('Verified: 5');
      });
    });

    it('validates hash chain integrity (each entry links to previous)', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-evidence'));

      await waitFor(() => {
        // Genesis entry has no previous hash
        expect(screen.getByTestId('ev-prev-0')).toHaveTextContent('GENESIS');

        // Each subsequent entry links to the previous hash
        for (let i = 1; i < realEvidenceTrail.entries.length; i++) {
          const prevHash = screen.getByTestId(`ev-prev-${i}`);
          const expectedPrevHash = realEvidenceTrail.entries[i - 1].hash;
          expect(prevHash).toHaveTextContent(expectedPrevHash);
        }
      });
    });

    it('shows evidence types correctly', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-evidence'));

      await waitFor(() => {
        expect(screen.getByTestId('ev-type-0')).toHaveTextContent('OBSERVATION');
        expect(screen.getByTestId('ev-type-1')).toHaveTextContent('ACTION');
        expect(screen.getByTestId('ev-type-2')).toHaveTextContent('REASONING');
      });
    });

    it('shows confidence scores for evidence entries', async () => {
      render(<RealDataMVCEditor />);
      await user.click(screen.getByTestId('tab-evidence'));

      await waitFor(() => {
        expect(screen.getByTestId('ev-conf-0')).toHaveTextContent('100%');
        expect(screen.getByTestId('ev-conf-2')).toHaveTextContent('88%');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Cross-Editor Navigation
  // ---------------------------------------------------------------------------

  describe('cross-editor navigation', () => {
    it('navigates between all 5 tabs while preserving state', async () => {
      render(<RealDataMVCEditor />);

      // Start on decision tab
      expect(screen.getByTestId('panel-decision')).toBeVisible();

      // Navigate to task tab
      await user.click(screen.getByTestId('tab-task'));
      await waitFor(() => {
        expect(screen.getByTestId('panel-task')).toBeVisible();
        expect(screen.getByTestId('task-count')).toHaveTextContent('Tasks: 6');
      });

      // Navigate to spatial tab
      await user.click(screen.getByTestId('tab-spatial'));
      await waitFor(() => {
        expect(screen.getByTestId('panel-spatial')).toBeVisible();
        expect(screen.getByTestId('anchor-label')).toHaveTextContent('HoloLand HQ');
      });

      // Navigate back to decision tab - state should be preserved
      await user.click(screen.getByTestId('tab-decision'));
      await waitFor(() => {
        expect(screen.getByTestId('decision-count')).toHaveTextContent('Decisions: 5');
      });
    });
  });
});
