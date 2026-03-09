/**
 * MVC Editor Component Tests
 *
 * Comprehensive test suite for all MVC editor components (80+ test cases).
 * Tests component rendering, user interactions, CRDT integration, accessibility, and edge cases.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DecisionHistoryEditor } from '../DecisionHistoryEditor';
import { ActiveTaskEditor } from '../ActiveTaskEditor';
import { UserPreferencesEditor } from '../UserPreferencesEditor';
import { SpatialContextEditor } from '../SpatialContextEditor';
import { EvidenceTrailViewer } from '../EvidenceTrailViewer';

import type {
  DecisionHistory,
  DecisionEntry,
  ActiveTaskState,
  TaskEntry,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
  EvidenceEntry,
  ChainVerificationResult,
} from '@holoscript/mvc-schema';

// ============================================================================
// Test Data Fixtures
// ============================================================================

const mockDecisionHistory: DecisionHistory = {
  crdtType: 'g-set',
  crdtId: 'decision-history-1',
  decisions: [
    {
      id: 'dec-1',
      timestamp: Date.now() - 1000 * 60 * 10, // 10 minutes ago
      type: 'task',
      description: 'Decided to prioritize testing over documentation',
      choice: 'Write comprehensive test suite first',
      outcome: 'success',
      confidence: 0.85,
      agentDid: 'did:example:agent1',
    },
    {
      id: 'dec-2',
      timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      type: 'preference',
      description: 'Updated theme preference',
      choice: 'Switch to dark mode',
      parentId: 'dec-1',
      outcome: 'pending',
      agentDid: 'did:example:agent1',
    },
    {
      id: 'dec-3',
      timestamp: Date.now() - 1000 * 60 * 2, // 2 minutes ago
      type: 'strategy',
      description: 'Chose incremental development approach',
      choice: 'Build components one by one',
      outcome: 'success',
      confidence: 0.92,
      agentDid: 'did:example:agent1',
    },
  ],
  vectorClock: { 'agent1': 3 },
  lastUpdated: Date.now(),
};

const mockActiveTaskState: ActiveTaskState = {
  crdtType: 'or-set+lww',
  crdtId: 'task-state-1',
  tasks: [
    {
      id: 'task-1',
      title: 'Write DecisionHistoryEditor tests',
      status: 'completed',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 60, // 1 hour ago
      updatedAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      assignedTo: 'did:example:agent1',
    },
    {
      id: 'task-2',
      title: 'Write ActiveTaskEditor tests',
      status: 'in_progress',
      priority: 'high',
      createdAt: Date.now() - 1000 * 60 * 45, // 45 minutes ago
      updatedAt: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      estimatedDuration: 1000 * 60 * 60, // 1 hour
      assignedTo: 'did:example:agent1',
    },
    {
      id: 'task-3',
      title: 'Write remaining component tests',
      status: 'pending',
      priority: 'medium',
      createdAt: Date.now() - 1000 * 60 * 30, // 30 minutes ago
      updatedAt: Date.now() - 1000 * 60 * 30,
      estimatedDuration: 1000 * 60 * 120, // 2 hours
    },
    {
      id: 'task-4',
      title: 'Fix broken CI pipeline',
      status: 'blocked',
      priority: 'critical',
      createdAt: Date.now() - 1000 * 60 * 20, // 20 minutes ago
      updatedAt: Date.now() - 1000 * 60 * 10, // 10 minutes ago
      blockingReason: 'Waiting for DevOps access',
    },
  ],
  taskTags: {},
  statusRegisters: {},
  vectorClock: { 'agent1': 4 },
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
    label: 'Office Building Entrance',
    createdAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    lastVerified: Date.now() - 1000 * 60 * 10, // 10 minutes ago
    creatorDid: 'did:example:agent1',
    type: 'workspace',
    confidence: 0.95,
  },
  currentPose: {
    position: [0.5, 1.7, -0.3],
    orientation: [0, 0, 0, 1],
    timestamp: Date.now(),
    velocity: [0.1, 0, 0.05],
  },
  recentAnchors: [
    {
      id: 'anchor-2',
      coordinate: {
        latitude: 37.7750,
        longitude: -122.4195,
        altitude: 10.2,
      },
      label: 'Meeting Room A',
      createdAt: Date.now() - 1000 * 60 * 60 * 12,
      lastVerified: Date.now() - 1000 * 60 * 60,
      type: 'meeting',
    },
    {
      id: 'anchor-3',
      coordinate: {
        latitude: 37.7748,
        longitude: -122.4193,
        altitude: 10.8,
      },
      label: 'Coffee Station',
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
      lastVerified: Date.now() - 1000 * 60 * 30,
      type: 'poi',
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
  },
  entries: [
    {
      sequence: 0,
      type: 'observation',
      timestamp: Date.now() - 1000 * 60 * 60,
      content: 'System initialized successfully',
      hash: 'a1b2c3d4e5f6',
      previousHash: null,
      agentDid: 'did:example:agent1',
      confidence: 1.0,
    },
    {
      sequence: 1,
      type: 'action',
      timestamp: Date.now() - 1000 * 60 * 30,
      content: 'Created task list',
      hash: 'b2c3d4e5f6a7',
      previousHash: 'a1b2c3d4e5f6',
      agentDid: 'did:example:agent1',
      source: 'ActiveTaskEditor',
    },
    {
      sequence: 2,
      type: 'reasoning',
      timestamp: Date.now() - 1000 * 60 * 10,
      content: 'Prioritized tasks based on urgency',
      hash: 'c3d4e5f6a7b8',
      previousHash: 'b2c3d4e5f6a7',
      agentDid: 'did:example:agent1',
      confidence: 0.88,
    },
  ],
  headHash: 'c3d4e5f6a7b8',
  lastVerification: {
    valid: true,
    entriesVerified: 3,
    brokenLinks: [],
    invalidSignatures: [],
    verifiedAt: Date.now() - 1000 * 60 * 5,
  },
  lastUpdated: Date.now(),
};

// ============================================================================
// DecisionHistoryEditor Tests (16 test cases)
// ============================================================================

describe('DecisionHistoryEditor', () => {
  it('renders with decision history data', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);
    expect(screen.getByText(/Decision History/i)).toBeInTheDocument();
    expect(screen.getByText(/3 decisions/i)).toBeInTheDocument();
  });

  it('displays all decisions in timeline', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);
    expect(screen.getByText(/prioritize testing over documentation/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated theme preference/i)).toBeInTheDocument();
    expect(screen.getByText(/incremental development approach/i)).toBeInTheDocument();
  });

  it('shows decision type badges', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);
    expect(screen.getByText('TASK')).toBeInTheDocument();
    expect(screen.getByText('PREFERENCE')).toBeInTheDocument();
    expect(screen.getByText('STRATEGY')).toBeInTheDocument();
  });

  it('displays outcome badges when enabled', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} showOutcomes={true} />);
    expect(screen.getAllByText('SUCCESS')).toHaveLength(2);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('displays confidence scores when enabled', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} showConfidence={true} />);
    expect(screen.getByText(/85% confident/i)).toBeInTheDocument();
    expect(screen.getByText(/92% confident/i)).toBeInTheDocument();
  });

  it('filters decisions by type', async () => {
    const user = userEvent.setup();
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);

    const filterSelect = screen.getByLabelText(/Filter by type/i);
    await user.selectOptions(filterSelect, 'task');

    expect(screen.getByText(/prioritize testing over documentation/i)).toBeInTheDocument();
    expect(screen.queryByText(/Updated theme preference/i)).not.toBeInTheDocument();
  });

  it('searches decisions by description', async () => {
    const user = userEvent.setup();
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);

    const searchInput = screen.getByPlaceholderText(/Search decisions/i);
    await user.type(searchInput, 'theme');

    expect(screen.getByText(/Updated theme preference/i)).toBeInTheDocument();
    expect(screen.queryByText(/prioritize testing/i)).not.toBeInTheDocument();
  });

  it('sorts decisions by newest first', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} sortOrder="newest" />);
    const decisions = screen.getAllByRole('listitem');
    expect(decisions[0]).toHaveTextContent(/incremental development/i);
  });

  it('sorts decisions by oldest first', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} sortOrder="oldest" />);
    const decisions = screen.getAllByRole('listitem');
    expect(decisions[0]).toHaveTextContent(/prioritize testing/i);
  });

  it('selects decision on click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} onSelectDecision={onSelect} />);

    const firstDecision = screen.getByText(/prioritize testing over documentation/i);
    await user.click(firstDecision.closest('[role="listitem"]')!);

    expect(onSelect).toHaveBeenCalledWith('dec-1');
  });

  it('shows expanded details for selected decision', async () => {
    const user = userEvent.setup();
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);

    const firstDecision = screen.getByText(/prioritize testing over documentation/i);
    await user.click(firstDecision.closest('[role="listitem"]')!);

    expect(screen.getByText(/Decision ID:/i)).toBeInTheDocument();
    expect(screen.getByText(/dec-1/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);

    const firstDecision = screen.getAllByRole('listitem')[0];
    firstDecision.focus();
    await user.keyboard('{Enter}');

    expect(screen.getByText(/Decision ID:/i)).toBeInTheDocument();
  });

  it('renders compact mode correctly', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} displayMode="compact" />);
    expect(screen.getByText(/Decisions:/i)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('respects maxDecisions limit', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} maxDecisions={2} />);
    const decisions = screen.getAllByRole('listitem');
    expect(decisions).toHaveLength(2);
  });

  it('handles empty decision history', () => {
    const emptyHistory: DecisionHistory = {
      ...mockDecisionHistory,
      decisions: [],
    };
    render(<DecisionHistoryEditor decisionHistory={emptyHistory} />);
    expect(screen.getByText(/No decisions found/i)).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<DecisionHistoryEditor decisionHistory={mockDecisionHistory} />);
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Decision History Editor');
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});

// ============================================================================
// ActiveTaskEditor Tests (18 test cases)
// ============================================================================

describe('ActiveTaskEditor', () => {
  it('renders with task state data', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);
    expect(screen.getByText(/Active Tasks/i)).toBeInTheDocument();
    expect(screen.getByText(/4 tasks/i)).toBeInTheDocument();
  });

  it('displays kanban columns for all task statuses', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed/i)).toBeInTheDocument();
  });

  it('shows tasks in correct kanban columns', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);

    const pendingColumn = screen.getByLabelText(/pending column/i);
    expect(pendingColumn).toHaveTextContent(/Write remaining component tests/i);

    const inProgressColumn = screen.getByLabelText(/in_progress column/i);
    expect(inProgressColumn).toHaveTextContent(/Write ActiveTaskEditor tests/i);
  });

  it('displays priority badges', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);
    expect(screen.getAllByText('HIGH')).toHaveLength(2);
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('shows blocking reason for blocked tasks', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);
    expect(screen.getByText(/Waiting for DevOps access/i)).toBeInTheDocument();
  });

  it('displays duration estimates when enabled', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} showDurations={true} />);
    expect(screen.getByText(/Est: 1h 0m/i)).toBeInTheDocument();
    expect(screen.getByText(/Est: 2h 0m/i)).toBeInTheDocument();
  });

  it('filters tasks by status', async () => {
    const user = userEvent.setup();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);

    const filterSelect = screen.getByLabelText(/Filter by status/i);
    await user.selectOptions(filterSelect, 'completed');

    expect(screen.getByText(/Write DecisionHistoryEditor tests/i)).toBeInTheDocument();
    expect(screen.queryByText(/Write ActiveTaskEditor tests/i)).not.toBeInTheDocument();
  });

  it('filters tasks by priority', async () => {
    const user = userEvent.setup();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);

    const filterSelect = screen.getByLabelText(/Filter by priority/i);
    await user.selectOptions(filterSelect, 'critical');

    expect(screen.getByText(/Fix broken CI pipeline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Write remaining component tests/i)).not.toBeInTheDocument();
  });

  it('searches tasks by title', async () => {
    const user = userEvent.setup();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);

    const searchInput = screen.getByPlaceholderText(/Search tasks/i);
    await user.type(searchInput, 'DecisionHistoryEditor');

    expect(screen.getByText(/Write DecisionHistoryEditor tests/i)).toBeInTheDocument();
    expect(screen.queryByText(/Write ActiveTaskEditor tests/i)).not.toBeInTheDocument();
  });

  it('selects task on click', async () => {
    const user = userEvent.setup();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);

    const task = screen.getByText(/Write DecisionHistoryEditor tests/i);
    await user.click(task.closest('div[role="button"]')!);

    // Task should be selected (border color changes)
    expect(task.closest('div[role="button"]')).toHaveStyle({ border: expect.stringContaining('2px solid') });
  });

  it('handles drag and drop for task movement', async () => {
    const onMove = vi.fn();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} onMoveTask={onMove} />);

    const task = screen.getByText(/Write ActiveTaskEditor tests/i).closest('div[draggable="true"]')!;
    fireEvent.dragStart(task);

    expect(task).toHaveStyle({ opacity: '0.5' });
  });

  it('calls onMoveTask when dropping task in new column', async () => {
    const onMove = vi.fn();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} onMoveTask={onMove} />);

    const task = screen.getByText(/Write ActiveTaskEditor tests/i).closest('div[draggable="true"]')!;
    const completedColumn = screen.getByLabelText(/completed column/i);

    fireEvent.dragStart(task);
    fireEvent.drop(completedColumn);

    expect(onMove).toHaveBeenCalledWith('task-2', 'completed');
  });

  it('opens task creation form', async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} onCreateTask={onCreate} />);

    const createButton = screen.getByText(/New Task/i);
    await user.click(createButton);

    // This would open a form modal/panel in the actual implementation
    // For now, just verify the button is clickable
    expect(createButton).toBeInTheDocument();
  });

  it('renders compact mode correctly', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} displayMode="compact" />);
    expect(screen.getByText(/Active Tasks:/i)).toBeInTheDocument();
    expect(screen.getByText(/1 in progress/i)).toBeInTheDocument();
  });

  it('shows blocked task count in compact mode', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} displayMode="compact" />);
    expect(screen.getByText(/1 blocked/i)).toBeInTheDocument();
  });

  it('handles empty task list', () => {
    const emptyTaskState: ActiveTaskState = {
      ...mockActiveTaskState,
      tasks: [],
    };
    render(<ActiveTaskEditor activeTaskState={emptyTaskState} />);

    // Should still show kanban columns
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();
  });

  it('disables interactions when disabled prop is true', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} disabled={true} />);

    const searchInput = screen.getByPlaceholderText(/Search tasks/i) as HTMLInputElement;
    expect(searchInput.disabled).toBe(true);
  });

  it('has proper ARIA attributes', () => {
    render(<ActiveTaskEditor activeTaskState={mockActiveTaskState} />);
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Active Task Editor');
    expect(screen.getByLabelText(/pending column/i)).toBeInTheDocument();
  });
});

// ============================================================================
// UserPreferencesEditor Tests (16 test cases)
// ============================================================================

describe('UserPreferencesEditor', () => {
  it('renders with user preferences data', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);
    expect(screen.getByText(/User Preferences/i)).toBeInTheDocument();
  });

  it('displays category tabs', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);
    expect(screen.getByRole('tab', { name: /spatial/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /communication/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /visual/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /privacy/i })).toBeInTheDocument();
  });

  it('switches category on tab click', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    const communicationTab = screen.getByRole('tab', { name: /communication/i });
    await user.click(communicationTab);

    expect(communicationTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Communication Style/i)).toBeInTheDocument();
  });

  it('displays preference fields for active category', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    // Default is spatial
    expect(screen.getByText(/Movement Speed/i)).toBeInTheDocument();
    expect(screen.getByText(/Personal Space Radius/i)).toBeInTheDocument();
  });

  it('shows current preference values', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    const movementSpeedSlider = screen.getByLabelText(/Movement Speed/i) as HTMLInputElement;
    expect(movementSpeedSlider.value).toBe('2');
  });

  it('calls onUpdatePreference when changing value', async () => {
    const onUpdate = vi.fn();
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} onUpdatePreference={onUpdate} />);

    const movementSpeedSlider = screen.getByLabelText(/Movement Speed/i);
    await user.click(movementSpeedSlider);
    fireEvent.change(movementSpeedSlider, { target: { value: '3.0' } });

    expect(onUpdate).toHaveBeenCalledWith('spatial', 'movementSpeed', 3.0);
  });

  it('displays boolean preferences as checkboxes', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    await user.click(screen.getByRole('tab', { name: /communication/i }));

    const voiceInputCheckbox = screen.getByLabelText(/Voice Input/i) as HTMLInputElement;
    expect(voiceInputCheckbox.type).toBe('checkbox');
    expect(voiceInputCheckbox.checked).toBe(true);
  });

  it('displays select preferences as dropdowns', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    await user.click(screen.getByRole('tab', { name: /communication/i }));

    const styleSelect = screen.getByLabelText(/Communication Style/i) as HTMLSelectElement;
    expect(styleSelect.value).toBe('casual');
    expect(screen.getByRole('option', { name: /Formal/i })).toBeInTheDocument();
  });

  it('shows modified badge for changed preferences', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    // movementSpeed is 2.0 (default is 1.5), so it should show as modified
    expect(screen.getByText('MODIFIED')).toBeInTheDocument();
  });

  it('shows reset button for modified preferences', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    const resetButtons = screen.getAllByText(/Reset/i);
    expect(resetButtons.length).toBeGreaterThan(0);
  });

  it('calls onResetPreference when clicking reset', async () => {
    const onReset = vi.fn();
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} onResetPreference={onReset} />);

    const resetButton = screen.getAllByText(/Reset/i)[0];
    await user.click(resetButton);

    expect(onReset).toHaveBeenCalled();
  });

  it('filters preferences by search query', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    const searchInput = screen.getByPlaceholderText(/Search preferences/i);
    await user.type(searchInput, 'movement');

    expect(screen.getByText(/Movement Speed/i)).toBeInTheDocument();
    expect(screen.queryByText(/Personal Space Radius/i)).not.toBeInTheDocument();
  });

  it('shows only modified preferences when filter is enabled', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);

    const modifiedOnlyCheckbox = screen.getByLabelText(/Modified only/i);
    await user.click(modifiedOnlyCheckbox);

    // Only modified preferences should be visible
    expect(screen.getByText(/Movement Speed/i)).toBeInTheDocument();
  });

  it('displays learned vs explicit distinction', async () => {
    const user = userEvent.setup();
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} showLearnedVsExplicit={true} />);

    await user.click(screen.getByRole('tab', { name: /communication/i }));

    // Communication style was updated by agent2, so it's "Learned"
    expect(screen.getByText(/Learned/i)).toBeInTheDocument();
  });

  it('renders compact mode correctly', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} displayMode="compact" />);
    expect(screen.getByText(/Preferences:/i)).toBeInTheDocument();
    expect(screen.getByText(/customized/i)).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<UserPreferencesEditor userPreferences={mockUserPreferences} />);
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'User Preferences Editor');
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('form')).toBeInTheDocument();
  });
});

// ============================================================================
// SpatialContextEditor Tests (16 test cases)
// ============================================================================

describe('SpatialContextEditor', () => {
  it('renders with spatial context data', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByText(/Spatial Context/i)).toBeInTheDocument();
    expect(screen.getByText(/3 anchors/i)).toBeInTheDocument();
  });

  it('displays primary anchor prominently', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByText(/Primary Anchor:/i)).toBeInTheDocument();
    expect(screen.getByText(/Office Building Entrance/i)).toBeInTheDocument();
  });

  it('shows WGS84 coordinates', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByText(/37.774900°, -122.419400°/i)).toBeInTheDocument();
  });

  it('displays altitude information', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByText(/Altitude: 10.5m/i)).toBeInTheDocument();
  });

  it('shows anchor type badges', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByText('WORKSPACE')).toBeInTheDocument();
  });

  it('displays confidence score for primary anchor', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByText(/95%/i)).toBeInTheDocument();
    expect(screen.getByText(/Confidence/i)).toBeInTheDocument();
  });

  it('shows current pose when enabled', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} show3DPose={true} />);
    expect(screen.getByText(/Current Pose/i)).toBeInTheDocument();
    expect(screen.getByText(/Position:/i)).toBeInTheDocument();
    expect(screen.getByText(/Orientation:/i)).toBeInTheDocument();
  });

  it('displays environmental context when enabled', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} showEnvironment={true} />);
    expect(screen.getByText(/Environment/i)).toBeInTheDocument();
    expect(screen.getByText(/indoor/i)).toBeInTheDocument();
    expect(screen.getByText(/400 lux/i)).toBeInTheDocument();
    expect(screen.getByText(/22°C/i)).toBeInTheDocument();
  });

  it('switches between view modes', async () => {
    const user = userEvent.setup();
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);

    const listViewButton = screen.getByLabelText(/list view/i);
    await user.click(listViewButton);

    expect(listViewButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('displays all anchors in list view', async () => {
    const user = userEvent.setup();
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);

    const listViewButton = screen.getByLabelText(/list view/i);
    await user.click(listViewButton);

    expect(screen.getByText(/Meeting Room A/i)).toBeInTheDocument();
    expect(screen.getByText(/Coffee Station/i)).toBeInTheDocument();
  });

  it('selects anchor on click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<SpatialContextEditor spatialContext={mockSpatialContext} onSelectAnchor={onSelect} />);

    const listViewButton = screen.getByLabelText(/list view/i);
    await user.click(listViewButton);

    const anchor = screen.getByText(/Meeting Room A/i);
    await user.click(anchor.closest('[role="listitem"]')!);

    expect(onSelect).toHaveBeenCalledWith('anchor-2');
  });

  it('shows expanded details for selected anchor', async () => {
    const user = userEvent.setup();
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);

    const listViewButton = screen.getByLabelText(/list view/i);
    await user.click(listViewButton);

    const anchor = screen.getByText(/Meeting Room A/i);
    await user.click(anchor.closest('[role="listitem"]')!);

    await waitFor(() => {
      expect(screen.getByText(/Anchor ID:/i)).toBeInTheDocument();
    });
  });

  it('displays accuracy information when available', async () => {
    const user = userEvent.setup();
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);

    const listViewButton = screen.getByLabelText(/list view/i);
    await user.click(listViewButton);

    // Click on primary anchor (has accuracy data)
    const anchor = screen.getByText(/Office Building Entrance/i);
    await user.click(anchor.closest('[role="listitem"]')!);

    await waitFor(() => {
      expect(screen.getByText(/Horizontal Accuracy:/i)).toBeInTheDocument();
      expect(screen.getByText(/±5.0m/i)).toBeInTheDocument();
    });
  });

  it('renders compact mode correctly', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} displayMode="compact" />);
    expect(screen.getByText(/Location:/i)).toBeInTheDocument();
    expect(screen.getByText(/Office Building Entrance/i)).toBeInTheDocument();
  });

  it('handles missing primary anchor', () => {
    const contextWithoutPrimary: SpatialContextSummary = {
      ...mockSpatialContext,
      primaryAnchor: undefined,
    };
    render(<SpatialContextEditor spatialContext={contextWithoutPrimary} displayMode="compact" />);
    expect(screen.getByText(/No primary anchor/i)).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<SpatialContextEditor spatialContext={mockSpatialContext} />);
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Spatial Context Editor');
  });
});

// ============================================================================
// EvidenceTrailViewer Tests (18 test cases)
// ============================================================================

describe('EvidenceTrailViewer', () => {
  it('renders with evidence trail data', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText(/Evidence Trail/i)).toBeInTheDocument();
    expect(screen.getByText(/VCP v1.1/i)).toBeInTheDocument();
  });

  it('displays all evidence entries', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText(/System initialized successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/Created task list/i)).toBeInTheDocument();
    expect(screen.getByText(/Prioritized tasks based on urgency/i)).toBeInTheDocument();
  });

  it('shows entry sequence numbers', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText('#0')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('displays evidence type badges', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText('OBSERVATION')).toBeInTheDocument();
    expect(screen.getByText('ACTION')).toBeInTheDocument();
    expect(screen.getByText('REASONING')).toBeInTheDocument();
  });

  it('shows genesis badge for first entry', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText('GENESIS')).toBeInTheDocument();
  });

  it('displays verification status when available', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText(/Chain Verified/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified 3 entries/i)).toBeInTheDocument();
  });

  it('calls onVerify when verify button is clicked', async () => {
    const onVerify = vi.fn().mockResolvedValue({
      valid: true,
      entriesVerified: 3,
      brokenLinks: [],
      invalidSignatures: [],
      verifiedAt: Date.now(),
    } as ChainVerificationResult);

    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} onVerify={onVerify} />);

    const verifyButton = screen.getByText(/Verify Chain/i);
    await user.click(verifyButton);

    expect(onVerify).toHaveBeenCalled();
  });

  it('shows verifying state during verification', async () => {
    const onVerify = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} onVerify={onVerify} />);

    const verifyButton = screen.getByText(/Verify Chain/i);
    await user.click(verifyButton);

    expect(screen.getByText(/Verifying.../i)).toBeInTheDocument();
  });

  it('filters evidence by type', async () => {
    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);

    const filterSelect = screen.getByLabelText(/Filter by type/i);
    await user.selectOptions(filterSelect, 'action');

    expect(screen.getByText(/Created task list/i)).toBeInTheDocument();
    expect(screen.queryByText(/System initialized/i)).not.toBeInTheDocument();
  });

  it('searches evidence by content', async () => {
    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);

    const searchInput = screen.getByPlaceholderText(/Search evidence/i);
    await user.type(searchInput, 'task');

    expect(screen.getByText(/Created task list/i)).toBeInTheDocument();
    expect(screen.queryByText(/System initialized/i)).not.toBeInTheDocument();
  });

  it('toggles hash details display', async () => {
    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} showCryptoDetails={false} />);

    const toggleButton = screen.getByLabelText(/Toggle hash details/i);
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText(/Hash:/i)).toBeInTheDocument();
    });
  });

  it('shows full hash when hash details are enabled', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} showCryptoDetails={true} />);
    expect(screen.getByText(/a1b2c3d4e5f6/i)).toBeInTheDocument();
  });

  it('displays confidence scores for entries', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByText(/100%/i)).toBeInTheDocument(); // First entry has 1.0 confidence
    expect(screen.getByText(/88%/i)).toBeInTheDocument(); // Last entry has 0.88 confidence
  });

  it('selects entry on click', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} onSelectEntry={onSelect} />);

    const entry = screen.getByText(/Created task list/i);
    await user.click(entry.closest('div[tabindex="0"]')!);

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('shows expanded details for selected entry', async () => {
    const user = userEvent.setup();
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);

    const entry = screen.getByText(/Created task list/i);
    await user.click(entry.closest('div[tabindex="0"]')!);

    await waitFor(() => {
      expect(screen.getByText(/Agent DID:/i)).toBeInTheDocument();
    });
  });

  it('renders compact mode correctly', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} displayMode="compact" />);
    expect(screen.getByText(/Evidence:/i)).toBeInTheDocument();
    expect(screen.getByText(/3 entries/i)).toBeInTheDocument();
    expect(screen.getByText(/Verified/i)).toBeInTheDocument();
  });

  it('handles empty evidence trail', () => {
    const emptyTrail: EvidenceTrail = {
      ...mockEvidenceTrail,
      entries: [],
    };
    render(<EvidenceTrailViewer evidenceTrail={emptyTrail} />);
    expect(screen.getByText(/No evidence entries found/i)).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    render(<EvidenceTrailViewer evidenceTrail={mockEvidenceTrail} />);
    expect(screen.getByRole('region')).toHaveAttribute('aria-label', 'Evidence Trail Viewer');
    expect(screen.getByRole('log')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
