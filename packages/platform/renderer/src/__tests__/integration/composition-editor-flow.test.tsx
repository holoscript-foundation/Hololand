/**
 * Composition Editor Flow - Integration Test
 *
 * Complete E2E workflow test for the HoloScript Composition Editor:
 * 1. Vertical selection
 * 2. Trait discovery and application
 * 3. Trait configuration
 * 4. Composition preview
 * 5. Code export (.holo file generation)
 * 6. Import verification
 *
 * Uses vitest + @testing-library/react for E2E-style integration testing.
 * Target: 90%+ code coverage for composition editor components.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Component under test
import { CompositionEditorPage } from '../../components/composition-editor/CompositionEditorPage';

// Mock react-router-dom to avoid routing errors
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
  BrowserRouter: ({ children }: any) => <div>{children}</div>,
}));

// Mock module CSS imports
vi.mock('../../components/composition-editor/CompositionEditorPage.module.css', () => ({
  default: {
    page: 'page',
    pageHeader: 'pageHeader',
    headerContent: 'headerContent',
    pageTitle: 'pageTitle',
    pageDescription: 'pageDescription',
    headerActions: 'headerActions',
    importButton: 'importButton',
    fileInput: 'fileInput',
    resetButton: 'resetButton',
    controls: 'controls',
    searchContainer: 'searchContainer',
    searchLabel: 'searchLabel',
    searchInput: 'searchInput',
    mainContent: 'mainContent',
    leftPanel: 'leftPanel',
    rightPanel: 'rightPanel',
    detailPanel: 'detailPanel',
    previewPanel: 'previewPanel',
    footer: 'footer',
  },
}));

// Mock all child components with test IDs for easier targeting
vi.mock('../../components/composition-editor/VerticalSelector', () => ({
  VerticalSelector: ({ verticals, activeVertical, onVerticalChange }: any) => (
    <div data-testid="vertical-selector">
      <select
        data-testid="vertical-select"
        value={activeVertical || ''}
        onChange={(e) => onVerticalChange(e.target.value || null)}
        aria-label="Select industry vertical"
      >
        <option value="">All Verticals</option>
        {verticals.map((v: any) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('../../components/composition-editor/VerticalTraitMatrix', () => ({
  VerticalTraitMatrix: ({ verticals, activeVertical, selectedTrait, appliedTraits, searchQuery, onTraitClick }: any) => {
    const vertical = activeVertical ? verticals.find((v: any) => v.id === activeVertical) : null;
    const traits = vertical ? vertical.traits : verticals.flatMap((v: any) => v.traits.map((t: any) => ({ ...t, verticalId: v.id })));

    const filteredTraits = searchQuery
      ? traits.filter((t: any) => t.trait.toLowerCase().includes(searchQuery.toLowerCase()))
      : traits;

    return (
      <div data-testid="trait-matrix">
        {filteredTraits.map((trait: any) => {
          const traitId = trait.trait;
          const verticalId = trait.verticalId || activeVertical;
          const isApplied = appliedTraits.has(traitId);
          const isSelected = selectedTrait === traitId;

          return (
            <button
              key={traitId}
              data-testid={`trait-${traitId}`}
              data-applied={isApplied}
              data-selected={isSelected}
              onClick={() => onTraitClick(traitId, verticalId)}
              aria-label={`${traitId} trait${isApplied ? ' (applied)' : ''}`}
              aria-pressed={isSelected}
            >
              {traitId} {isApplied && '✓'}
            </button>
          );
        })}
      </div>
    );
  },
}));

vi.mock('../../components/composition-editor/TraitDetailPanel', () => ({
  TraitDetailPanel: ({ traitName, traitData, configuredTrait, onAddTrait, onRemoveTrait, onUpdateConfig }: any) => {
    if (!traitName) {
      return <div data-testid="trait-detail-panel">Select a trait to view details</div>;
    }

    const isApplied = !!configuredTrait;

    return (
      <div data-testid="trait-detail-panel">
        <h3>{traitName}</h3>
        {traitData && <p>{traitData.description || 'Trait description'}</p>}

        {!isApplied && (
          <button
            data-testid="add-trait-button"
            onClick={() => onAddTrait({ name: traitName, config: {} })}
          >
            Add Trait
          </button>
        )}

        {isApplied && (
          <>
            <button
              data-testid="remove-trait-button"
              onClick={() => onRemoveTrait(traitName)}
            >
              Remove Trait
            </button>

            {/* Simple config editor */}
            <div data-testid="trait-config-editor">
              <label>
                Sample Config Value:
                <input
                  type="text"
                  value={configuredTrait.config.sampleValue || ''}
                  onChange={(e) => onUpdateConfig(traitName, { ...configuredTrait.config, sampleValue: e.target.value })}
                  data-testid="config-input-sampleValue"
                />
              </label>
            </div>
          </>
        )}
      </div>
    );
  },
}));

vi.mock('../../components/composition-editor/CompositionPreview', () => ({
  CompositionPreview: ({ composition, onTraitClick }: any) => (
    <div data-testid="composition-preview">
      <h4>Composition: {composition.objectId}</h4>
      <p>Traits: {composition.traits.length}</p>
      <ul>
        {composition.traits.map((trait: any) => (
          <li key={trait.name}>
            <button onClick={() => onTraitClick(trait.name)} data-testid={`preview-trait-${trait.name}`}>
              {trait.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  ),
}));

vi.mock('../../components/composition-editor/HoloCodeGenerator', () => ({
  HoloCodeGenerator: ({ composition, onExport }: any) => {
    const generateCode = () => {
      // Simple code generation
      const code = `object ${composition.objectId} {\n${composition.traits.map((t: any) => `  ${t.name}\n`).join('')}}`;
      return code;
    };

    return (
      <div data-testid="holo-code-generator">
        <button
          data-testid="export-button"
          onClick={() => onExport(generateCode(), `${composition.objectId}.holo`)}
        >
          Export .holo
        </button>
        <pre data-testid="generated-code">{generateCode()}</pre>
      </div>
    );
  },
}));

// Mock vertical mappings data
vi.mock('../../components/composition-editor/traitVerticalData-full', () => ({
  VERTICAL_MAPPINGS: [
    {
      id: 'healthcare',
      name: 'Healthcare',
      traits: [
        { trait: '@accessible', description: 'Accessibility support' },
        { trait: '@hipaa_compliant', description: 'HIPAA compliance' },
      ],
    },
    {
      id: 'gaming',
      name: 'Gaming',
      traits: [
        { trait: '@physics', description: 'Physics simulation' },
        { trait: '@multiplayer', description: 'Multiplayer support' },
      ],
    },
    {
      id: 'education',
      name: 'Education',
      traits: [
        { trait: '@interactive', description: 'Interactive elements' },
        { trait: '@accessible', description: 'Accessibility support' },
      ],
    },
  ],
}));

// Mock editor reducer
vi.mock('../../components/composition-editor/editorReducer', () => ({
  editorReducer: (state: any, action: any) => {
    switch (action.type) {
      case 'SET_VERTICAL':
        return { ...state, activeVertical: action.vertical };
      case 'SELECT_TRAIT':
        return { ...state, selectedTrait: action.trait };
      case 'ADD_TRAIT':
        return {
          ...state,
          composition: {
            ...state.composition,
            traits: [...state.composition.traits, action.trait],
          },
        };
      case 'REMOVE_TRAIT':
        return {
          ...state,
          composition: {
            ...state.composition,
            traits: state.composition.traits.filter((t: any) => t.name !== action.traitName),
          },
        };
      case 'UPDATE_TRAIT_CONFIG':
        return {
          ...state,
          composition: {
            ...state.composition,
            traits: state.composition.traits.map((t: any) =>
              t.name === action.traitName ? { ...t, config: action.config } : t
            ),
          },
        };
      case 'LOAD_COMPOSITION':
        return {
          ...state,
          composition: action.composition,
        };
      case 'RESET':
        return {
          activeVertical: null,
          selectedTrait: null,
          composition: {
            objectId: 'NewComposition',
            objectType: 'object',
            vertical: null,
            traits: [],
            metadata: {},
          },
        };
      default:
        return state;
    }
  },
  initialEditorState: {
    activeVertical: null,
    selectedTrait: null,
    composition: {
      objectId: 'NewComposition',
      objectType: 'object',
      vertical: null,
      traits: [],
      metadata: {},
    },
  },
}));

// ============================================================================
// INTEGRATION TEST SUITE
// ============================================================================

describe('Composition Editor - Complete Workflow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Reset any mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the composition editor page', () => {
    render(<CompositionEditorPage />);

    expect(screen.getByText(/HoloScript Composition Editor/i)).toBeInTheDocument();
    expect(screen.getByTestId('vertical-selector')).toBeInTheDocument();
    expect(screen.getByTestId('trait-matrix')).toBeInTheDocument();
    expect(screen.getByTestId('trait-detail-panel')).toBeInTheDocument();
    expect(screen.getByTestId('composition-preview')).toBeInTheDocument();
    expect(screen.getByTestId('holo-code-generator')).toBeInTheDocument();
  });

  it('completes full workflow: vertical selection → trait application → configuration → export', async () => {
    render(<CompositionEditorPage />);

    // STEP 1: Select a vertical (Healthcare)
    const verticalSelect = screen.getByTestId('vertical-select');
    await user.selectOptions(verticalSelect, 'healthcare');

    await waitFor(() => {
      expect(verticalSelect).toHaveValue('healthcare');
    });

    // STEP 2: Verify traits filtered to healthcare vertical
    const accessibleTrait = screen.getByTestId('trait-@accessible');
    const hipaaCompliantTrait = screen.getByTestId('trait-@hipaa_compliant');

    expect(accessibleTrait).toBeInTheDocument();
    expect(hipaaCompliantTrait).toBeInTheDocument();

    // STEP 3: Click on @accessible trait to view details
    await user.click(accessibleTrait);

    await waitFor(() => {
      expect(screen.getByText('@accessible')).toBeInTheDocument();
      expect(screen.getByTestId('add-trait-button')).toBeInTheDocument();
    });

    // STEP 4: Add @accessible trait to composition
    const addButton = screen.getByTestId('add-trait-button');
    await user.click(addButton);

    await waitFor(() => {
      // Trait should now be applied (button changes to "Remove")
      expect(screen.getByTestId('remove-trait-button')).toBeInTheDocument();
      // Trait should show checkmark in matrix
      expect(accessibleTrait).toHaveAttribute('data-applied', 'true');
    });

    // STEP 5: Configure the trait
    const configInput = screen.getByTestId('config-input-sampleValue');
    await user.type(configInput, 'test-value');

    await waitFor(() => {
      expect(configInput).toHaveValue('test-value');
    });

    // STEP 6: Add another trait (@hipaa_compliant)
    await user.click(hipaaCompliantTrait);

    await waitFor(() => {
      expect(screen.getByTestId('add-trait-button')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('add-trait-button'));

    await waitFor(() => {
      expect(hipaaCompliantTrait).toHaveAttribute('data-applied', 'true');
    });

    // STEP 7: Verify composition preview shows both traits
    const preview = screen.getByTestId('composition-preview');

    await waitFor(() => {
      expect(within(preview).getByText(/Traits: 2/i)).toBeInTheDocument();
    });

    // STEP 8: Export the composition
    const exportButton = screen.getByTestId('export-button');

    // Mock the download functionality
    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.fn();
    createElementSpy.mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
      style: {},
    } as any);

    await user.click(exportButton);

    await waitFor(() => {
      // Verify download was triggered
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
  });

  it('searches and filters traits across all verticals', async () => {
    render(<CompositionEditorPage />);

    // Initially, all traits should be visible (no vertical selected)
    expect(screen.getByTestId('trait-@accessible')).toBeInTheDocument();
    expect(screen.getByTestId('trait-@physics')).toBeInTheDocument();

    // Search for "accessible"
    const searchInput = screen.getByPlaceholderText(/Filter traits by name/i);
    await user.type(searchInput, 'accessible');

    await waitFor(() => {
      // Only @accessible trait should be visible
      expect(screen.getByTestId('trait-@accessible')).toBeInTheDocument();
      expect(screen.queryByTestId('trait-@physics')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trait-@multiplayer')).not.toBeInTheDocument();
    });

    // Clear search
    await user.clear(searchInput);

    await waitFor(() => {
      // All traits visible again
      expect(screen.getByTestId('trait-@accessible')).toBeInTheDocument();
      expect(screen.getByTestId('trait-@physics')).toBeInTheDocument();
    });
  });

  it('removes traits from composition', async () => {
    render(<CompositionEditorPage />);

    // Add a trait first
    const accessibleTrait = screen.getByTestId('trait-@accessible');
    await user.click(accessibleTrait);
    await user.click(screen.getByTestId('add-trait-button'));

    await waitFor(() => {
      expect(screen.getByTestId('remove-trait-button')).toBeInTheDocument();
    });

    // Remove the trait
    await user.click(screen.getByTestId('remove-trait-button'));

    await waitFor(() => {
      // Button should change back to "Add"
      expect(screen.getByTestId('add-trait-button')).toBeInTheDocument();
      // Checkmark should be removed
      expect(accessibleTrait).toHaveAttribute('data-applied', 'false');
    });
  });

  it('resets composition and clears all traits', async () => {
    render(<CompositionEditorPage />);

    // Add multiple traits
    const accessibleTrait = screen.getByTestId('trait-@accessible');
    await user.click(accessibleTrait);
    await user.click(screen.getByTestId('add-trait-button'));

    const physicsTrait = screen.getByTestId('trait-@physics');
    await user.click(physicsTrait);
    await user.click(screen.getByTestId('add-trait-button'));

    await waitFor(() => {
      expect(screen.getByText(/Traits: 2/i)).toBeInTheDocument();
    });

    // Mock window.confirm to auto-accept
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Click reset button
    const resetButton = screen.getByText(/Reset/i);
    await user.click(resetButton);

    await waitFor(() => {
      // Composition should be empty
      expect(screen.getByText(/Traits: 0/i)).toBeInTheDocument();
      // Traits should no longer be marked as applied
      expect(accessibleTrait).toHaveAttribute('data-applied', 'false');
      expect(physicsTrait).toHaveAttribute('data-applied', 'false');
    });

    confirmSpy.mockRestore();
  });

  it('imports .holo file and loads composition', async () => {
    render(<CompositionEditorPage />);

    // Create a mock .holo file
    const holoContent = `
object ImportedObject {
  @accessible
  @physics
}
    `;

    const file = new File([holoContent], 'test.holo', { type: 'text/plain' });

    // Mock window.alert for success message
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    // Find the file input
    const fileInput = screen.getByLabelText(/Import .holo file/i) as HTMLInputElement;

    // Upload the file
    await user.upload(fileInput, file);

    await waitFor(() => {
      // Check that success alert was called
      expect(alertSpy).toHaveBeenCalledWith('Composition imported successfully!');

      // Composition should be loaded (objectId = "ImportedObject")
      expect(screen.getByText(/Composition: ImportedObject/i)).toBeInTheDocument();
    });

    alertSpy.mockRestore();
  });

  it('validates file extension on import', async () => {
    render(<CompositionEditorPage />);

    // Create a file with wrong extension
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    const fileInput = screen.getByLabelText(/Import .holo file/i) as HTMLInputElement;
    await user.upload(fileInput, invalidFile);

    await waitFor(() => {
      // Should show error alert
      expect(alertSpy).toHaveBeenCalledWith('Please select a .holo file');
    });

    alertSpy.mockRestore();
  });

  it('navigates between trait detail and preview by clicking preview items', async () => {
    render(<CompositionEditorPage />);

    // Add two traits
    await user.click(screen.getByTestId('trait-@accessible'));
    await user.click(screen.getByTestId('add-trait-button'));

    await user.click(screen.getByTestId('trait-@physics'));
    await user.click(screen.getByTestId('add-trait-button'));

    // Now click on a trait in the preview panel
    const previewTraitButton = screen.getByTestId('preview-trait-@accessible');
    await user.click(previewTraitButton);

    await waitFor(() => {
      // Detail panel should show @accessible
      const detailPanel = screen.getByTestId('trait-detail-panel');
      expect(within(detailPanel).getByText('@accessible')).toBeInTheDocument();
    });

    // Click on another trait in the preview
    const previewTraitButton2 = screen.getByTestId('preview-trait-@physics');
    await user.click(previewTraitButton2);

    await waitFor(() => {
      // Detail panel should now show @physics
      const detailPanel = screen.getByTestId('trait-detail-panel');
      expect(within(detailPanel).getByText('@physics')).toBeInTheDocument();
    });
  });

  it('maintains trait configuration when switching between traits', async () => {
    render(<CompositionEditorPage />);

    // Add and configure first trait
    await user.click(screen.getByTestId('trait-@accessible'));
    await user.click(screen.getByTestId('add-trait-button'));

    const configInput1 = screen.getByTestId('config-input-sampleValue');
    await user.type(configInput1, 'config1');

    // Add second trait
    await user.click(screen.getByTestId('trait-@physics'));
    await user.click(screen.getByTestId('add-trait-button'));

    // Go back to first trait
    await user.click(screen.getByTestId('trait-@accessible'));

    await waitFor(() => {
      // Configuration should still be there
      const configInput = screen.getByTestId('config-input-sampleValue');
      expect(configInput).toHaveValue('config1');
    });
  });

  it('shows "Select a trait to view details" when no trait is selected', () => {
    render(<CompositionEditorPage />);

    const detailPanel = screen.getByTestId('trait-detail-panel');
    expect(detailPanel).toHaveTextContent('Select a trait to view details');
  });

  it('supports keyboard navigation with Enter key on trait selection', async () => {
    render(<CompositionEditorPage />);

    const accessibleTrait = screen.getByTestId('trait-@accessible');

    // Focus and press Enter
    accessibleTrait.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      // Trait detail panel should show @accessible
      expect(screen.getByText('@accessible')).toBeInTheDocument();
      expect(accessibleTrait).toHaveAttribute('aria-pressed', 'true');
    });
  });

  it('generates valid .holo code with multiple traits', async () => {
    render(<CompositionEditorPage />);

    // Add multiple traits
    await user.click(screen.getByTestId('trait-@accessible'));
    await user.click(screen.getByTestId('add-trait-button'));

    await user.click(screen.getByTestId('trait-@hipaa_compliant'));
    await user.click(screen.getByTestId('add-trait-button'));

    await user.click(screen.getByTestId('trait-@physics'));
    await user.click(screen.getByTestId('add-trait-button'));

    // Check generated code
    const generatedCode = screen.getByTestId('generated-code');

    await waitFor(() => {
      const codeText = generatedCode.textContent || '';
      expect(codeText).toContain('object NewComposition');
      expect(codeText).toContain('@accessible');
      expect(codeText).toContain('@hipaa_compliant');
      expect(codeText).toContain('@physics');
    });
  });

  it('handles vertical change while traits are selected', async () => {
    render(<CompositionEditorPage />);

    // Select healthcare vertical and add trait
    const verticalSelect = screen.getByTestId('vertical-select');
    await user.selectOptions(verticalSelect, 'healthcare');

    await user.click(screen.getByTestId('trait-@accessible'));
    await user.click(screen.getByTestId('add-trait-button'));

    // Switch to gaming vertical
    await user.selectOptions(verticalSelect, 'gaming');

    await waitFor(() => {
      // @accessible should not be visible (it's not in gaming vertical)
      expect(screen.queryByTestId('trait-@accessible')).not.toBeInTheDocument();
      // @physics should be visible (gaming trait)
      expect(screen.getByTestId('trait-@physics')).toBeInTheDocument();
    });

    // But the applied trait should still be in the composition
    const preview = screen.getByTestId('composition-preview');
    expect(within(preview).getByText(/Traits: 1/i)).toBeInTheDocument();
  });
});

describe('Composition Editor - Accessibility', () => {
  it('has proper ARIA labels for all interactive elements', () => {
    render(<CompositionEditorPage />);

    expect(screen.getByLabelText(/Select industry vertical/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Search traits/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Import .holo file/i)).toBeInTheDocument();
  });

  it('supports keyboard navigation throughout the interface', async () => {
    const user = userEvent.setup();
    render(<CompositionEditorPage />);

    // Tab through interactive elements
    await user.tab();
    expect(screen.getByTestId('vertical-select')).toHaveFocus();

    await user.tab();
    expect(screen.getByPlaceholderText(/Filter traits by name/i)).toHaveFocus();
  });

  it('announces state changes with aria-pressed on trait buttons', async () => {
    const user = userEvent.setup();
    render(<CompositionEditorPage />);

    const trait = screen.getByTestId('trait-@accessible');

    // Initially not pressed
    expect(trait).toHaveAttribute('aria-pressed', 'false');

    await user.click(trait);

    // After selection, should be pressed
    expect(trait).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Composition Editor - Edge Cases', () => {
  it('handles empty composition gracefully', () => {
    render(<CompositionEditorPage />);

    const preview = screen.getByTestId('composition-preview');
    expect(within(preview).getByText(/Traits: 0/i)).toBeInTheDocument();
  });

  it('handles malformed .holo file on import', async () => {
    const user = userEvent.setup();
    render(<CompositionEditorPage />);

    const malformedContent = 'not valid holo syntax {{{';
    const file = new File([malformedContent], 'malformed.holo', { type: 'text/plain' });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const fileInput = screen.getByLabelText(/Import .holo file/i) as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      // Should show error alert
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to parse'));
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('prevents reset when user cancels confirmation', async () => {
    const user = userEvent.setup();
    render(<CompositionEditorPage />);

    // Add a trait
    await user.click(screen.getByTestId('trait-@accessible'));
    await user.click(screen.getByTestId('add-trait-button'));

    // Mock confirm to return false (cancel)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    const resetButton = screen.getByText(/Reset/i);
    await user.click(resetButton);

    await waitFor(() => {
      // Trait should still be there
      expect(screen.getByText(/Traits: 1/i)).toBeInTheDocument();
    });

    confirmSpy.mockRestore();
  });
});
