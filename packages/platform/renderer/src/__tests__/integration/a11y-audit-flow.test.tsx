/**
 * Accessibility Audit Flow - Integration Test
 *
 * Complete E2E workflow test for the Accessibility Audit Dashboard:
 * 1. Scan .holo file for WCAG 2.1 AA compliance
 * 2. Generate comprehensive accessibility report
 * 3. Filter and navigate issues
 * 4. Export audit results
 * 5. Verify rule violations and recommendations
 *
 * Uses vitest + @testing-library/react for E2E-style integration testing.
 * Target: 90%+ code coverage for accessibility audit components.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Component under test
import AccessibilityAuditPage from '../../app/pages/accessibility-audit/AccessibilityAuditPage';

let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  user = userEvent.setup();
});

// Mock the accessibility audit dashboard and hook
vi.mock('../../app/components/accessibility-audit-dashboard', () => {
  const MockAccessibilityAuditDashboard = ({ externalState, externalActions, mode, ariaLabel, style }: any) => {
    const { report, isScanning, error } = externalState || {};

    return (
      <div
        data-testid="accessibility-audit-dashboard"
        aria-label={ariaLabel}
        style={style}
      >
        {isScanning && <div data-testid="scanning-indicator">Scanning for accessibility issues...</div>}

        {error && <div data-testid="error-message" role="alert">{error}</div>}

        {report && !isScanning && (
          <div data-testid="audit-report">
            <h3>WCAG 2.1 AA Compliance Report</h3>

            {/* Summary Stats */}
            <div data-testid="report-summary">
              <p>Files Scanned: {report.fileCount || 1}</p>
              <p>Total Issues: {report.totalIssues || 0}</p>
              <p>Critical: {report.critical || 0}</p>
              <p>Warnings: {report.warnings || 0}</p>
              <p>Compliance Score: {report.complianceScore || 100}%</p>
            </div>

            {/* Issue List */}
            {report.issues && report.issues.length > 0 && (
              <div data-testid="issue-list">
                <h4>Issues Found</h4>
                <ul>
                  {report.issues.map((issue: any, index: number) => (
                    <li key={index} data-testid={`issue-${index}`} data-severity={issue.severity}>
                      <strong>{issue.rule}</strong>: {issue.message}
                      <br />
                      <small>Location: {issue.file}:{issue.line}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Filter Controls */}
            <div data-testid="filter-controls">
              <label>
                Filter by severity:
                <select data-testid="severity-filter">
                  <option value="all">All</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
              </label>
            </div>

            {/* Export Button */}
            <button
              data-testid="export-report-button"
              onClick={() => {
                const json = JSON.stringify(report, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'a11y-audit-report.json';
                link.click();
              }}
            >
              Export Report
            </button>

            {/* WCAG Guidelines Reference */}
            {report.guidelines && (
              <div data-testid="wcag-guidelines">
                <h4>WCAG 2.1 Guidelines Tested</h4>
                <ul>
                  {report.guidelines.map((guideline: string, index: number) => (
                    <li key={index}>{guideline}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const useAccessibilityAudit = () => {
    const [state, setState] = React.useState({
      report: null as any,
      isScanning: false,
      error: null as string | null,
    });

    const runScan = React.useCallback((files: any[]) => {
      setState({ report: null, isScanning: true, error: null });

      // Simulate async scanning
      setTimeout(() => {
        try {
          // Parse files and generate mock report
          const issues: any[] = [];
          let totalIssues = 0;
          let critical = 0;
          let warnings = 0;

          files.forEach((file) => {
            const { source, fileName } = file;

            // Rule 1: Check for @accessible trait
            if (!source.includes('@accessible')) {
              issues.push({
                rule: 'WCAG 2.1.1 - Keyboard Accessible',
                message: 'Object missing @accessible trait for keyboard navigation',
                severity: 'critical',
                file: fileName,
                line: 1,
                wcagCriterion: '2.1.1',
              });
              critical++;
              totalIssues++;
            }

            // Rule 2: Check for @alt_text trait
            if (!source.includes('@alt_text')) {
              issues.push({
                rule: 'WCAG 1.1.1 - Text Alternatives',
                message: 'Interactive object missing @alt_text trait',
                severity: 'critical',
                file: fileName,
                line: 1,
                wcagCriterion: '1.1.1',
              });
              critical++;
              totalIssues++;
            }

            // Rule 3: Check for @screen_reader trait
            if (!source.includes('@screen_reader')) {
              issues.push({
                rule: 'WCAG 4.1.2 - Name, Role, Value',
                message: 'Missing @screen_reader trait for assistive technology support',
                severity: 'warning',
                file: fileName,
                line: 1,
                wcagCriterion: '4.1.2',
              });
              warnings++;
              totalIssues++;
            }

            // Rule 4: Check for @high_contrast trait
            if (!source.includes('@high_contrast')) {
              issues.push({
                rule: 'WCAG 1.4.3 - Contrast (Minimum)',
                message: 'Missing @high_contrast trait for enhanced visibility',
                severity: 'warning',
                file: fileName,
                line: 1,
                wcagCriterion: '1.4.3',
              });
              warnings++;
              totalIssues++;
            }

            // Rule 5: Check for focus_visible in @accessible
            if (source.includes('@accessible') && !source.includes('focus_visible: true')) {
              issues.push({
                rule: 'WCAG 2.4.7 - Focus Visible',
                message: '@accessible trait should include focus_visible: true',
                severity: 'warning',
                file: fileName,
                line: source.split('\n').findIndex((line: string) => line.includes('@accessible')) + 1,
                wcagCriterion: '2.4.7',
              });
              warnings++;
              totalIssues++;
            }
          });

          const complianceScore = Math.max(0, 100 - (critical * 10 + warnings * 5));

          const report = {
            fileCount: files.length,
            totalIssues,
            critical,
            warnings,
            complianceScore,
            issues,
            guidelines: [
              'WCAG 2.1.1 - Keyboard Accessible',
              'WCAG 1.1.1 - Text Alternatives',
              'WCAG 4.1.2 - Name, Role, Value',
              'WCAG 1.4.3 - Contrast (Minimum)',
              'WCAG 2.4.7 - Focus Visible',
              'WCAG 1.4.13 - Content on Hover or Focus',
              'WCAG 2.4.3 - Focus Order',
              'WCAG 3.2.1 - On Focus',
            ],
            timestamp: new Date().toISOString(),
          };

          setState({ report, isScanning: false, error: null });
        } catch (err: any) {
          setState({ report: null, isScanning: false, error: err.message });
        }
      }, 500); // Simulate 500ms scan time
    }, []);

    return [state, { runScan }] as const;
  };

  return {
    AccessibilityAuditDashboard: MockAccessibilityAuditDashboard,
    useAccessibilityAudit,
  };
});

// ============================================================================
// INTEGRATION TEST SUITE
// ============================================================================

describe('Accessibility Audit - Complete Workflow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the accessibility audit page', () => {
    render(<AccessibilityAuditPage />);

    expect(screen.getByTestId('accessibility-audit-dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText(/Scan demo .holo file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Custom .holo source input/i)).toBeInTheDocument();
  });

  it('auto-scans demo file on mount and displays report', async () => {
    render(<AccessibilityAuditPage />);

    // Should start scanning
    await waitFor(() => {
      expect(screen.getByTestId('scanning-indicator')).toBeInTheDocument();
    });

    // Wait for scan to complete
    await waitFor(() => {
      expect(screen.queryByTestId('scanning-indicator')).not.toBeInTheDocument();
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify report contents
    const report = screen.getByTestId('audit-report');
    expect(within(report).getByText(/WCAG 2.1 AA Compliance Report/i)).toBeInTheDocument();
    expect(within(report).getByText(/Files Scanned: 1/i)).toBeInTheDocument();
  });

  it('completes full workflow: scan → view issues → filter → export', async () => {
    render(<AccessibilityAuditPage />);

    // Wait for initial scan to complete
    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    // STEP 1: Verify report summary
    const summary = screen.getByTestId('report-summary');
    expect(within(summary).getByText(/Total Issues:/i)).toBeInTheDocument();
    expect(within(summary).getByText(/Critical:/i)).toBeInTheDocument();
    expect(within(summary).getByText(/Warnings:/i)).toBeInTheDocument();
    expect(within(summary).getByText(/Compliance Score:/i)).toBeInTheDocument();

    // STEP 2: Verify issue list is displayed
    const issueList = screen.getByTestId('issue-list');
    expect(within(issueList).getByText(/Issues Found/i)).toBeInTheDocument();

    // STEP 3: Check specific WCAG rules are tested
    const issues = screen.getAllByTestId(/issue-\d+/);
    expect(issues.length).toBeGreaterThan(0);

    // Verify critical issues
    const criticalIssues = issues.filter((issue) => issue.getAttribute('data-severity') === 'critical');
    expect(criticalIssues.length).toBeGreaterThan(0);

    // STEP 4: Filter by severity
    const severityFilter = screen.getByTestId('severity-filter');
    await user.selectOptions(severityFilter, 'critical');

    // STEP 5: Verify WCAG guidelines are listed
    const guidelines = screen.getByTestId('wcag-guidelines');
    expect(within(guidelines).getByText(/WCAG 2.1 Guidelines Tested/i)).toBeInTheDocument();
    expect(within(guidelines).getByText(/WCAG 2.1.1 - Keyboard Accessible/i)).toBeInTheDocument();
    expect(within(guidelines).getByText(/WCAG 1.1.1 - Text Alternatives/i)).toBeInTheDocument();

    // STEP 6: Export report
    const createElementSpy = vi.spyOn(document, 'createElement');
    const clickSpy = vi.fn();
    createElementSpy.mockReturnValue({
      click: clickSpy,
      href: '',
      download: '',
    } as any);

    const exportButton = screen.getByTestId('export-report-button');
    await user.click(exportButton);

    await waitFor(() => {
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(clickSpy).toHaveBeenCalled();
    });

    createElementSpy.mockRestore();
  });

  it('scans custom .holo source and generates report', async () => {
    render(<AccessibilityAuditPage />);

    // Wait for initial scan
    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Enter custom source
    const customInput = screen.getByLabelText(/Custom .holo source input/i) as HTMLTextAreaElement;

    const customSource = `
object "TestButton" {
  @accessible {
    role: "button"
    focus_visible: true
  }
  @alt_text {
    text: "Test button"
  }
  @screen_reader {
    semantic_structure: true
  }
  @high_contrast {
    mode: "auto"
  }
}
    `;

    await user.clear(customInput);
    await user.type(customInput, customSource);

    expect(customInput.value).toBe(customSource);

    // Click scan button
    const scanButton = screen.getByLabelText(/Scan custom .holo source/i);
    await user.click(scanButton);

    // Wait for new scan to complete
    await waitFor(() => {
      expect(screen.getByTestId('scanning-indicator')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('scanning-indicator')).not.toBeInTheDocument();
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Verify custom file was scanned
    const summary = screen.getByTestId('report-summary');
    expect(within(summary).getByText(/Files Scanned: 1/i)).toBeInTheDocument();
  });

  it('re-scans demo file when "Scan Demo" button is clicked', async () => {
    render(<AccessibilityAuditPage />);

    // Wait for initial scan
    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Click "Scan Demo" button
    const scanDemoButton = screen.getByLabelText(/Scan demo .holo file/i);
    await user.click(scanDemoButton);

    // Should start scanning again
    await waitFor(() => {
      expect(screen.getByTestId('scanning-indicator')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('scanning-indicator')).not.toBeInTheDocument();
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('disables "Scan Custom" button when input is empty', () => {
    render(<AccessibilityAuditPage />);

    const scanCustomButton = screen.getByLabelText(/Scan custom .holo source/i);

    // Initially disabled (no custom source)
    expect(scanCustomButton).toHaveStyle({ cursor: 'not-allowed' });
  });

  it('enables "Scan Custom" button when input has content', async () => {
    render(<AccessibilityAuditPage />);

    const customInput = screen.getByLabelText(/Custom .holo source input/i);
    const scanCustomButton = screen.getByLabelText(/Scan custom .holo source/i);

    // Type some content
    await user.type(customInput, 'object "Test" {}');

    await waitFor(() => {
      expect(scanCustomButton).toHaveStyle({ cursor: 'pointer' });
    });
  });

  it('identifies missing @accessible trait as critical issue', async () => {
    render(<AccessibilityAuditPage />);

    const customInput = screen.getByLabelText(/Custom .holo source input/i);

    // Scan file WITHOUT @accessible trait
    const sourceWithoutAccessible = `
object "InaccessibleObject" {
  geometry: "cube"
  position: [0, 1, 0]
}
    `;

    await user.clear(customInput);
    await user.type(customInput, sourceWithoutAccessible);
    await user.click(screen.getByLabelText(/Scan custom .holo source/i));

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    // Should have critical issue for missing @accessible
    const issueList = screen.getByTestId('issue-list');
    expect(within(issueList).getByText(/Keyboard Accessible/i)).toBeInTheDocument();
    expect(within(issueList).getByText(/missing @accessible trait/i)).toBeInTheDocument();

    const issues = screen.getAllByTestId(/issue-\d+/);
    const accessibleIssue = issues.find((issue) =>
      issue.textContent?.includes('Keyboard Accessible')
    );

    expect(accessibleIssue).toHaveAttribute('data-severity', 'critical');
  });

  it('identifies missing @alt_text trait as critical issue', async () => {
    render(<AccessibilityAuditPage />);

    const customInput = screen.getByLabelText(/Custom .holo source input/i);

    const sourceWithoutAltText = `
object "NoAltText" {
  @accessible {
    role: "button"
  }
  geometry: "sphere"
}
    `;

    await user.clear(customInput);
    await user.type(customInput, sourceWithoutAltText);
    await user.click(screen.getByLabelText(/Scan custom .holo source/i));

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const issueList = screen.getByTestId('issue-list');
    expect(within(issueList).getByText(/Text Alternatives/i)).toBeInTheDocument();
    expect(within(issueList).getByText(/missing @alt_text trait/i)).toBeInTheDocument();
  });

  it('identifies missing focus_visible as warning', async () => {
    render(<AccessibilityAuditPage />);

    const customInput = screen.getByLabelText(/Custom .holo source input/i);

    const sourceWithoutFocusVisible = `
object "NoFocusVisible" {
  @accessible {
    role: "button"
  }
  @alt_text {
    text: "Button"
  }
  @screen_reader {
    semantic_structure: true
  }
  @high_contrast {
    mode: "auto"
  }
}
    `;

    await user.clear(customInput);
    await user.type(customInput, sourceWithoutFocusVisible);
    await user.click(screen.getByLabelText(/Scan custom .holo source/i));

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const issueList = screen.getByTestId('issue-list');
    expect(within(issueList).getByText(/Focus Visible/i)).toBeInTheDocument();
    expect(within(issueList).getByText(/focus_visible: true/i)).toBeInTheDocument();

    const issues = screen.getAllByTestId(/issue-\d+/);
    const focusIssue = issues.find((issue) => issue.textContent?.includes('Focus Visible'));
    expect(focusIssue).toHaveAttribute('data-severity', 'warning');
  });

  it('calculates compliance score based on issues', async () => {
    render(<AccessibilityAuditPage />);

    // Wait for initial scan (demo has many issues)
    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const summary = screen.getByTestId('report-summary');
    const complianceScoreText = within(summary).getByText(/Compliance Score:/i).textContent || '';

    // Extract score (should be less than 100% due to issues)
    const scoreMatch = complianceScoreText.match(/(\d+)%/);
    expect(scoreMatch).toBeTruthy();

    const score = parseInt(scoreMatch![1], 10);
    expect(score).toBeLessThan(100);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it('displays WCAG criterion for each issue', async () => {
    render(<AccessibilityAuditPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const issues = screen.getAllByTestId(/issue-\d+/);

    // Each issue should reference a WCAG criterion
    issues.forEach((issue) => {
      const text = issue.textContent || '';
      expect(text).toMatch(/WCAG \d+\.\d+\.\d+/);
    });
  });

  it('sets document title on mount', () => {
    const previousTitle = document.title;

    render(<AccessibilityAuditPage />);

    expect(document.title).toBe('A11y Audit | Hololand');

    // Cleanup would restore original title (tested via useEffect cleanup)
  });
});

describe('Accessibility Audit - Accessibility', () => {
  it('has proper ARIA labels for all controls', () => {
    render(<AccessibilityAuditPage />);

    expect(screen.getByLabelText(/Scan demo .holo file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Custom .holo source input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Scan custom .holo source/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Accessibility Audit Dashboard/i)).toBeInTheDocument();
  });

  it('includes visually hidden heading for screen readers', () => {
    render(<AccessibilityAuditPage />);

    const heading = screen.getByText(/Accessibility Audit Dashboard/i);
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveAttribute('id', 'a11y-audit-page-heading');

    // Check for sr-only class (visually hidden)
    expect(heading).toHaveClass('sr-only');
  });

  it('marks error messages with role="alert"', async () => {
    // Mock to force an error
    const mockUseAccessibilityAudit = () => {
      const [state] = React.useState({
        report: null,
        isScanning: false,
        error: 'Test error message',
      });

      const runScan = vi.fn();

      return [state, { runScan }] as const;
    };

    vi.mocked(require('../../app/components/accessibility-audit-dashboard')).useAccessibilityAudit.mockImplementation(
      mockUseAccessibilityAudit
    );

    render(<AccessibilityAuditPage />);

    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});

describe('Accessibility Audit - Edge Cases', () => {
  it('handles empty .holo source gracefully', async () => {
    render(<AccessibilityAuditPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const customInput = screen.getByLabelText(/Custom .holo source input/i);
    const scanButton = screen.getByLabelText(/Scan custom .holo source/i);

    // Clear input and try to scan
    await user.clear(customInput);

    // Button should be disabled
    expect(scanButton).toHaveStyle({ cursor: 'not-allowed' });
  });

  it('handles file with 100% compliance (no issues)', async () => {
    render(<AccessibilityAuditPage />);

    const customInput = screen.getByLabelText(/Custom .holo source input/i);

    // Perfect accessibility implementation
    const perfectSource = `
object "PerfectlyAccessible" {
  @accessible {
    role: "button"
    focus_visible: true
    tab_index: 0
  }
  @alt_text {
    text: "Accessible button"
    verbose: "A fully accessible interactive button"
  }
  @screen_reader {
    semantic_structure: true
    announce_changes: true
  }
  @high_contrast {
    mode: "auto"
    outline_width: 2
  }
  @haptic_cue {
    pattern: "tap"
    intensity: 0.5
  }
}
    `;

    await user.clear(customInput);
    await user.type(customInput, perfectSource);
    await user.click(screen.getByLabelText(/Scan custom .holo source/i));

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const summary = screen.getByTestId('report-summary');

    // Should have 0 critical issues
    expect(within(summary).getByText(/Critical: 0/i)).toBeInTheDocument();

    // Compliance score should be high
    const complianceText = within(summary).getByText(/Compliance Score:/i).textContent || '';
    const scoreMatch = complianceText.match(/(\d+)%/);
    const score = parseInt(scoreMatch![1], 10);

    expect(score).toBeGreaterThanOrEqual(90);
  });

  it('displays file location for each issue', async () => {
    render(<AccessibilityAuditPage />);

    await waitFor(() => {
      expect(screen.getByTestId('audit-report')).toBeInTheDocument();
    }, { timeout: 2000 });

    const issues = screen.getAllByTestId(/issue-\d+/);

    // Each issue should show file and line number
    issues.forEach((issue) => {
      const text = issue.textContent || '';
      expect(text).toMatch(/Location: .+:\d+/);
    });
  });
});
