# HoloScript Composition Editor

A visual composition editor for HoloScript that allows users to create and configure HoloScript compositions using an interactive vertical-to-trait mapping matrix.

## Features

### 1. Interactive Vertical-Trait Matrix (15x200+)
- **Color-coded relevance scores**: Visual representation of trait relevance for each vertical
  - Green (90-100%): Highly relevant traits
  - Dark Green (75-89%): Medium-high relevance
  - Orange (60-74%): Medium relevance
  - Gray (<60%): Low relevance
- **Interactive cells**: Click any cell to view trait details and configuration options
- **Applied trait indicators**: Visual checkmarks show which traits are already in your composition
- **Selected trait highlighting**: Blue border highlights the currently selected trait
- **Filterable**: Filter by vertical and search by trait name

### 2. Vertical Selector
- Dropdown selector with all 15 industry verticals:
  - Healthcare
  - Education
  - Retail & E-Commerce
  - Gaming
  - Architecture & Construction
  - Manufacturing & Industrial
  - Entertainment & Media
  - Real Estate
  - Fitness & Sports
  - Social & Metaverse
  - Art & Museums
  - Automotive
  - Aerospace & Defense
  - Tourism & Hospitality
  - Robotics & IoT
- Shows vertical description when selected
- Filter option to show all verticals or just one

### 3. Trait Detail Panel
- **Documentation**: Rationale explaining why the trait is relevant
- **Configuration editor**: JSON-based configuration with recommended properties
- **Usage examples**: Sample .holo code showing trait usage
- **Add/Remove buttons**: One-click trait application to composition
- **Update configuration**: Real-time config updates for applied traits

### 4. Live Composition Preview
- **Tree view**: Hierarchical display of object and traits
- **Applied traits**: Shows all traits with their current configuration
- **Click to edit**: Click any trait in the preview to select it for editing
- **Statistics**: Displays count of applied traits and selected vertical

### 5. HoloScript Code Generator
- **Real-time generation**: Generates valid .holo syntax code as you build
- **Proper formatting**: Correctly formatted trait config properties
- **Header comments**: Includes metadata, vertical, and generation timestamp
- **Copy to clipboard**: One-click code copying
- **Export as .holo**: Download button for saving compositions

### 6. Import/Export Functionality
- **Export**: Download composition as a `.holo` file
- **Import**: Upload existing `.holo` files to continue editing
- **File validation**: Ensures only `.holo` files are imported
- **Round-trip support**: Export and re-import without data loss

## Architecture

### Component Structure

```
CompositionEditorPage (main container)
├── VerticalSelector (dropdown)
├── VerticalTraitMatrix (15 rows x 200+ cols)
│   └── TraitCell (individual cell with relevance color)
├── TraitDetailPanel (sidebar)
│   ├── TraitDocumentation
│   ├── ConfigPropertyEditor
│   └── UsageExamples
├── CompositionPreview (visual preview)
└── HoloCodeGenerator (code output + export)
```

### State Management
- **React Context + useReducer**: Centralized state management
- **editorReducer**: Handles all state transitions
- **Actions**:
  - `SET_VERTICAL`: Set active vertical filter
  - `SELECT_TRAIT`: Select trait for detail view
  - `ADD_TRAIT`: Add or update trait in composition
  - `REMOVE_TRAIT`: Remove trait from composition
  - `UPDATE_TRAIT_CONFIG`: Update trait configuration
  - `SET_SEARCH`: Set search query filter
  - `LOAD_COMPOSITION`: Load composition from file
  - `RESET`: Reset to initial state

### Data Flow

1. User selects a vertical → filters visible traits in matrix
2. User clicks trait cell → shows detail panel with trait info
3. User configures trait → updates composition state
4. Composition state → generates .holo code in real-time
5. Export button → downloads .holo file

## Usage

### Accessing the Editor

Navigate to `/composition-editor` in the application.

### Creating a Composition

1. **Select a Vertical**: Choose an industry vertical from the dropdown
2. **Browse Traits**: Review the color-coded matrix to see relevant traits
3. **Click a Trait**: Click any colored cell to view trait details
4. **Configure Trait**: Edit the JSON configuration in the detail panel
5. **Add Trait**: Click "Add to Composition" to apply the trait
6. **Repeat**: Add more traits as needed
7. **Preview**: Review your composition in the preview panel
8. **Export**: Click "Export as .holo" to download your composition

### Editing Traits

- **Select trait**: Click the trait cell in the matrix or in the preview panel
- **Update config**: Edit the JSON in the configuration editor
- **Apply changes**: Click "Update Configuration"

### Removing Traits

- **Select trait**: Click the trait you want to remove
- **Remove**: Click "Remove from Composition" in the detail panel

### Importing Existing Compositions

1. Click "Import .holo" button
2. Select a `.holo` file from your file system
3. The composition will be loaded with all traits and configuration

## File Structure

```
composition-editor/
├── types.ts                      # TypeScript type definitions
├── editorReducer.ts              # State reducer
├── traitVerticalData-full.ts     # Trait-vertical mappings data
├── VerticalSelector.tsx          # Vertical dropdown component
├── VerticalSelector.module.css
├── VerticalTraitMatrix.tsx       # Main matrix component
├── VerticalTraitMatrix.module.css
├── TraitDetailPanel.tsx          # Trait detail/config panel
├── TraitDetailPanel.module.css
├── CompositionPreview.tsx        # Composition tree preview
├── CompositionPreview.module.css
├── HoloCodeGenerator.tsx         # Code generation component
├── HoloCodeGenerator.module.css
├── CompositionEditorPage.tsx     # Main page component
├── CompositionEditorPage.module.css
├── README.md                     # This file
└── __tests__/
    ├── editorReducer.test.ts     # Reducer tests
    ├── VerticalTraitMatrix.test.tsx  # Matrix tests
    ├── HoloCodeGenerator.test.ts # Code generator tests
    └── integration.test.ts       # Integration tests
```

## Testing

The composition editor includes comprehensive test coverage:

### Unit Tests
- **editorReducer.test.ts**: Tests all state transitions and actions
- **VerticalTraitMatrix.test.tsx**: Tests matrix rendering, filtering, and interactions
- **HoloCodeGenerator.test.ts**: Tests code generation and formatting

### Integration Tests
- **integration.test.ts**: Tests complete workflows from vertical selection to code export

### Running Tests

```bash
npm test composition-editor
```

## Security

All file operations are client-side only:
- **Import**: Uses FileReader API (no server upload)
- **Export**: Creates Blob and downloads via browser
- **File validation**: Only `.holo` files accepted
- **Input sanitization**: JSON parsing with error handling
- **No eval()**: No dynamic code execution

## Accessibility

The composition editor is designed with accessibility in mind:
- **Keyboard navigation**: All interactive elements are keyboard accessible
- **ARIA labels**: Proper labeling for screen readers
- **Focus indicators**: Clear visual focus states
- **Semantic HTML**: Proper use of headings, labels, and roles

## Performance

Optimizations for handling 15x200+ matrix:
- **Memoization**: useMemo for expensive computations
- **Virtual scrolling**: CSS overflow for large tables
- **Efficient filtering**: Set-based lookups for applied traits
- **Lazy loading**: React.lazy for page-level code splitting

## Integration with HoloScript LSP

The composition editor uses trait-vertical mappings from the HoloScript LSP package:
- **Source**: `@holoscript/lsp/src/data/trait-vertical-mappings.ts`
- **Local copy**: `traitVerticalData-full.ts` (maintains data for UI)
- **Sync**: Update local copy when LSP mappings change

## Future Enhancements

Potential future features:
- [ ] Template system for common composition patterns
- [ ] Trait conflict detection and warnings
- [ ] AI-powered trait recommendations
- [ ] Collaborative editing (multi-user)
- [ ] Version control integration
- [ ] Advanced search with filters (by relevance, category, etc.)
- [ ] Drag-and-drop trait ordering
- [ ] Visual trait dependency graph
- [ ] Export to multiple formats (JSON, YAML, etc.)

## Contributing

When adding new features:
1. Update type definitions in `types.ts`
2. Add new actions to the reducer if needed
3. Update component props and state handling
4. Add comprehensive tests
5. Update this README

## License

Part of the HoloLand platform. See main repository for license information.
