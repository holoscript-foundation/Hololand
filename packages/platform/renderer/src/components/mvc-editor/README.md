# MVC Editor Component Suite

Comprehensive React component suite for editing MVC (Model-View-Controller) state with CRDT integration. All components integrate with `@holoscript/mvc-schema` for cross-reality agent state management.

## Components

### 1. DecisionHistoryEditor

Timeline view of agent decisions with rationale, outcomes, and causal relationships.

**Features:**
- Timeline visualization with chronological decision flow
- Decision type categorization (task, preference, strategy, resource, social)
- Outcome badges (success, failure, pending)
- Confidence score visualization
- Causal chain graph showing parent-child relationships
- Search and filter by type, outcome, agent
- Add new decisions with form validation

**Props:**
```typescript
interface DecisionHistoryEditorProps {
  decisionHistory: DecisionHistory;
  onAddDecision?: (decision: Omit<DecisionEntry, 'id' | 'timestamp'>) => void;
  onSelectDecision?: (decisionId: string) => void;
  maxDecisions?: number;
  filterType?: DecisionEntry['type'] | 'all';
  sortOrder?: 'newest' | 'oldest' | 'type';
  showOutcomes?: boolean;
  showConfidence?: boolean;
  showCausalChains?: boolean;
}
```

**Example:**
```tsx
import { DecisionHistoryEditor } from '@hololand/renderer/components/mvc-editor';

<DecisionHistoryEditor
  decisionHistory={decisionHistory}
  showOutcomes={true}
  showConfidence={true}
  onAddDecision={(decision) => console.log('New decision:', decision)}
/>
```

---

### 2. ActiveTaskEditor

Kanban board for goal and subtask management with drag-drop support.

**Features:**
- Kanban board with customizable columns (pending/in_progress/blocked/completed/cancelled)
- Drag-drop task movement between status columns
- Task priority and status badges
- Subtask hierarchies with inline display
- Duration estimates and tracking
- Task creation and editing with form validation
- Filter by status, priority, assignee

**Props:**
```typescript
interface ActiveTaskEditorProps {
  activeTaskState: ActiveTaskState;
  onCreateTask?: (task: Omit<TaskEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTask?: (taskId: string, updates: Partial<TaskEntry>) => void;
  onDeleteTask?: (taskId: string) => void;
  onMoveTask?: (taskId: string, newStatus: TaskStatus) => void;
  showSubtasks?: boolean;
  showDurations?: boolean;
  groupBy?: 'status' | 'priority' | 'assignee';
  kanbanColumns?: TaskStatus[];
}
```

**Example:**
```tsx
import { ActiveTaskEditor } from '@hololand/renderer/components/mvc-editor';

<ActiveTaskEditor
  activeTaskState={taskState}
  showDurations={true}
  onMoveTask={(taskId, newStatus) => {
    console.log(`Moving task ${taskId} to ${newStatus}`);
  }}
/>
```

---

### 3. UserPreferencesEditor

Key-value editor for user/agent preferences with learned vs explicit distinction.

**Features:**
- Category-based organization (spatial, communication, visual, privacy)
- Field-level editing with type-appropriate controls (text, number, boolean, select, range)
- Learned vs explicit preference visualization
- Last updated metadata display
- Reset to default functionality
- Search and filter
- Validation feedback

**Props:**
```typescript
interface UserPreferencesEditorProps {
  userPreferences: UserPreferences;
  onUpdatePreference?: (category: string, field: string, value: unknown) => void;
  onResetPreference?: (category: string, field: string) => void;
  showLearnedVsExplicit?: boolean;
  showMetadata?: boolean;
  categories?: Array<'spatial' | 'communication' | 'visual' | 'privacy'>;
  allowEditing?: boolean;
}
```

**Example:**
```tsx
import { UserPreferencesEditor } from '@hololand/renderer/components/mvc-editor';

<UserPreferencesEditor
  userPreferences={preferences}
  showLearnedVsExplicit={true}
  showMetadata={true}
  onUpdatePreference={(category, field, value) => {
    console.log(`Updated ${category}.${field} to ${value}`);
  }}
/>
```

---

### 4. SpatialContextEditor

Map view showing geospatial anchors (WGS84) and movement history.

**Features:**
- Interactive map with WGS84 coordinate visualization
- Spatial anchor markers with labels
- Primary anchor highlighting
- Movement history trail
- 3D pose visualization (position + orientation quaternion)
- Environmental context display
- Anchor creation and editing
- Search and filter anchors

**Props:**
```typescript
interface SpatialContextEditorProps {
  spatialContext: SpatialContextSummary;
  onAddAnchor?: (anchor: Omit<SpatialAnchor, 'id' | 'createdAt' | 'lastVerified'>) => void;
  onUpdateAnchor?: (anchorId: string, updates: Partial<SpatialAnchor>) => void;
  onDeleteAnchor?: (anchorId: string) => void;
  onSelectAnchor?: (anchorId: string) => void;
  mapCenter?: { latitude: number; longitude: number };
  mapZoom?: number;
  showMovementHistory?: boolean;
  showEnvironment?: boolean;
  show3DPose?: boolean;
}
```

**Example:**
```tsx
import { SpatialContextEditor } from '@hololand/renderer/components/mvc-editor';

<SpatialContextEditor
  spatialContext={spatialContext}
  showEnvironment={true}
  show3DPose={true}
  onSelectAnchor={(anchorId) => console.log('Selected anchor:', anchorId)}
/>
```

---

### 5. EvidenceTrailViewer

Read-only audit log with cryptographic verification UI.

**Features:**
- Hash chain visualization with cryptographic links
- Entry sequence display in chronological order
- Evidence type categorization (observation, action, reasoning, external_data, credential, attestation, measurement)
- Cryptographic verification status
- Digital signature verification UI
- Broken link highlighting
- Hash detail inspection
- Search and filter by type

**Props:**
```typescript
interface EvidenceTrailViewerProps {
  evidenceTrail: EvidenceTrail;
  onSelectEntry?: (entrySequence: number) => void;
  onVerify?: () => Promise<ChainVerificationResult>;
  showCryptoDetails?: boolean;
  showSignatures?: boolean;
  filterType?: EvidenceType | 'all';
  maxEntries?: number;
  highlightBrokenLinks?: boolean;
}
```

**Example:**
```tsx
import { EvidenceTrailViewer } from '@hololand/renderer/components/mvc-editor';

<EvidenceTrailViewer
  evidenceTrail={evidenceTrail}
  showCryptoDetails={true}
  showSignatures={true}
  onVerify={async () => {
    // Verify hash chain
    return verificationResult;
  }}
/>
```

---

## Common Props

All components support these common props:

```typescript
interface BaseEditorProps {
  displayMode?: 'full' | 'compact' | 'overlay' | 'readonly';
  theme?: Partial<MVCEditorTheme>;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  disabled?: boolean;
}
```

### Display Modes

- **full**: Full-featured UI with all panels and controls
- **compact**: Minimal HUD bar with key metric values
- **overlay**: Semi-transparent overlay for VR environments
- **readonly**: Read-only mode (no editing controls)

### Theming

All components support custom theming:

```typescript
const customTheme: Partial<MVCEditorTheme> = {
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  backgroundColor: '#1f2937',
  textColor: '#f3f4f6',
  overlayOpacity: 0.85,
};

<DecisionHistoryEditor theme={customTheme} />
```

---

## Accessibility (WCAG 2.1 AA)

All components meet WCAG 2.1 Level AA standards:

- ✅ Proper ARIA roles and labels
- ✅ Keyboard navigation support
- ✅ Focus visible indicators
- ✅ 4.5:1 contrast ratios throughout
- ✅ Semantic HTML structure
- ✅ Screen reader compatible

---

## Integration with @holoscript/mvc-schema

All components integrate seamlessly with CRDT types from `@holoscript/mvc-schema`:

```typescript
import {
  DecisionHistory,
  ActiveTaskState,
  UserPreferences,
  SpatialContextSummary,
  EvidenceTrail,
} from '@holoscript/mvc-schema';
```

The MVC schema package provides:
- **CRDT types** for conflict-free state merging across agents
- **Validation schemas** (JSON Schema, Zod, TypeBox)
- **Compression utilities** (CBOR encoding, schema compression)
- **<2KB target** for all MVC objects (compressed)

---

## Testing

Comprehensive test suite with 84+ test cases covering:
- Component rendering
- User interactions (clicks, keyboard, drag-drop)
- CRDT integration
- Accessibility compliance
- Edge cases and error states

Run tests:
```bash
npm test src/components/mvc-editor
```

---

## Storybook Stories

Interactive documentation and visual testing:

```bash
npm run storybook
```

Available stories:
- DecisionHistoryEditor: 6 stories
- ActiveTaskEditor: 5 stories
- UserPreferencesEditor: 5 stories
- SpatialContextEditor: 5 stories
- EvidenceTrailViewer: 6 stories

---

## Performance

All components optimized for VR environments:
- **<1ms render time** per frame (O(1) complexity)
- **No heavy computation** in render path
- **React state batching** prevents excessive re-renders
- **Memoized calculations** for filtered/sorted data

---

## Architecture

```
mvc-editor/
├── types.ts                      # Shared types, theme, utilities
├── index.ts                      # Public exports
├── DecisionHistoryEditor.tsx     # Timeline view of decisions
├── ActiveTaskEditor.tsx          # Kanban board for tasks
├── UserPreferencesEditor.tsx     # Key-value preference editor
├── SpatialContextEditor.tsx      # Geospatial anchor map
├── EvidenceTrailViewer.tsx       # Cryptographic audit log
├── __tests__/
│   └── mvc-editor.test.tsx       # 84+ test cases
└── mvc-editor.stories.tsx        # Storybook stories
```

---

## License

MIT License - See LICENSE file for details

---

## Contributing

1. Follow the existing component patterns
2. Maintain WCAG 2.1 AA compliance
3. Write comprehensive tests (minimum 15 test cases per component)
4. Create Storybook stories for all variations
5. Document props and usage examples

---

## Related Packages

- `@holoscript/mvc-schema` - CRDT types and validation
- `@hololand/world` - VR world integration
- `@hololand/quality-profiles` - Performance monitoring
