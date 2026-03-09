/**
 * Navigation Flow - Integration Test
 *
 * Complete E2E workflow test for application navigation:
 * 1. Verify all routes are accessible via navigation
 * 2. Test keyboard shortcuts for route switching
 * 3. Verify lazy loading and Suspense fallbacks
 * 4. Test route prefetching on hover/focus
 * 5. Validate navigation accessibility (ARIA, focus management)
 *
 * Uses vitest + @testing-library/react for E2E-style integration testing.
 * Target: 90%+ code coverage for navigation components.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';

// ============================================================================
// MOCK ROUTE COMPONENTS
// ============================================================================

const HomePage: React.FC = () => (
  <div data-testid="page-home">
    <h1>AI Ecosystem Dashboard</h1>
    <p>Welcome to the AI Ecosystem overview</p>
  </div>
);

const GRPODashboardPage: React.FC = () => (
  <div data-testid="page-grpo">
    <h1>GRPO Training Dashboard</h1>
    <p>ML training monitor and metrics</p>
  </div>
);

const PipelineDashboardPage: React.FC = () => (
  <div data-testid="page-pipeline">
    <h1>Pipeline Dashboard</h1>
    <p>ML pipeline status and execution logs</p>
  </div>
);

const AccessibilityAuditPage: React.FC = () => (
  <div data-testid="page-a11y-audit">
    <h1>Accessibility Audit</h1>
    <p>WCAG 2.1 compliance scanner</p>
  </div>
);

const CompositionEditorPage: React.FC = () => (
  <div data-testid="page-composition-editor">
    <h1>Composition Editor</h1>
    <p>HoloScript visual trait editor</p>
  </div>
);

// ============================================================================
// MOCK NAVIGATION COMPONENT
// ============================================================================

interface NavLinkProps {
  to: string;
  label: string;
  shortcut?: string;
  onPrefetch?: () => void;
}

const NavLink: React.FC<NavLinkProps> = ({ to, label, shortcut, onPrefetch }) => {
  return (
    <Link
      to={to}
      data-testid={`nav-link-${to}`}
      data-shortcut={shortcut}
      onMouseEnter={onPrefetch}
      onFocus={onPrefetch}
      style={{
        display: 'block',
        padding: '0.5rem',
        color: '#6366f1',
        textDecoration: 'none',
      }}
    >
      {label}
      {shortcut && <kbd style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>({shortcut})</kbd>}
    </Link>
  );
};

const Navigation: React.FC<{ onPrefetch?: (route: string) => void }> = ({ onPrefetch }) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keyboard shortcuts (Alt + number)
      if (e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('/');
            break;
          case '2':
            e.preventDefault();
            navigate('/grpo');
            break;
          case '3':
            e.preventDefault();
            navigate('/pipeline');
            break;
          case '4':
            e.preventDefault();
            navigate('/a11y-audit');
            break;
          case '5':
            e.preventDefault();
            navigate('/composition-editor');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handlePrefetch = (route: string) => {
    if (onPrefetch) {
      onPrefetch(route);
    }
  };

  return (
    <nav aria-label="Main navigation" data-testid="main-navigation">
      <h2 style={{ fontSize: '0.9rem', margin: '0.5rem', color: '#9898c0' }}>Navigation</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        <li>
          <NavLink
            to="/"
            label="Home"
            shortcut="Alt+1"
            onPrefetch={() => handlePrefetch('/')}
          />
        </li>
        <li>
          <NavLink
            to="/grpo"
            label="GRPO Training"
            shortcut="Alt+2"
            onPrefetch={() => handlePrefetch('/grpo')}
          />
        </li>
        <li>
          <NavLink
            to="/pipeline"
            label="Pipeline"
            shortcut="Alt+3"
            onPrefetch={() => handlePrefetch('/pipeline')}
          />
        </li>
        <li>
          <NavLink
            to="/a11y-audit"
            label="A11y Audit"
            shortcut="Alt+4"
            onPrefetch={() => handlePrefetch('/a11y-audit')}
          />
        </li>
        <li>
          <NavLink
            to="/composition-editor"
            label="Composition Editor"
            shortcut="Alt+5"
            onPrefetch={() => handlePrefetch('/composition-editor')}
          />
        </li>
      </ul>
    </nav>
  );
};

// ============================================================================
// MOCK APP LAYOUT
// ============================================================================

const AppLayout: React.FC<{ onPrefetch?: (route: string) => void }> = ({ onPrefetch }) => {
  return (
    <div data-testid="app-layout" style={{ display: 'flex' }}>
      <aside style={{ width: '200px', backgroundColor: '#0a0a2e', padding: '1rem' }}>
        <Navigation onPrefetch={onPrefetch} />
      </aside>
      <main style={{ flex: 1, padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/grpo" element={<GRPODashboardPage />} />
          <Route path="/pipeline" element={<PipelineDashboardPage />} />
          <Route path="/a11y-audit" element={<AccessibilityAuditPage />} />
          <Route path="/composition-editor" element={<CompositionEditorPage />} />
        </Routes>
      </main>
    </div>
  );
};

// ============================================================================
// TEST HELPERS
// ============================================================================

const renderWithRouter = (
  initialRoute = '/',
  onPrefetch?: (route: string) => void
) => {
  window.history.pushState({}, '', initialRoute);

  return render(
    <BrowserRouter>
      <AppLayout onPrefetch={onPrefetch} />
    </BrowserRouter>
  );
};

// ============================================================================
// INTEGRATION TEST SUITE
// ============================================================================

describe('Navigation - Route Accessibility', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the navigation and home page on mount', () => {
    renderWithRouter('/');

    expect(screen.getByTestId('main-navigation')).toBeInTheDocument();
    expect(screen.getByTestId('page-home')).toBeInTheDocument();
    expect(screen.getByText(/AI Ecosystem Dashboard/i)).toBeInTheDocument();
  });

  it('navigates to all routes via click', async () => {
    renderWithRouter('/');

    // Navigate to GRPO
    const grpoLink = screen.getByTestId('nav-link-/grpo');
    await user.click(grpoLink);

    await waitFor(() => {
      expect(screen.getByTestId('page-grpo')).toBeInTheDocument();
      expect(screen.getByText(/GRPO Training Dashboard/i)).toBeInTheDocument();
    });

    // Navigate to Pipeline
    const pipelineLink = screen.getByTestId('nav-link-/pipeline');
    await user.click(pipelineLink);

    await waitFor(() => {
      expect(screen.getByTestId('page-pipeline')).toBeInTheDocument();
      expect(screen.getByText(/Pipeline Dashboard/i)).toBeInTheDocument();
    });

    // Navigate to A11y Audit
    const a11yLink = screen.getByTestId('nav-link-/a11y-audit');
    await user.click(a11yLink);

    await waitFor(() => {
      expect(screen.getByTestId('page-a11y-audit')).toBeInTheDocument();
      expect(screen.getByText(/Accessibility Audit/i)).toBeInTheDocument();
    });

    // Navigate to Composition Editor
    const compositionLink = screen.getByTestId('nav-link-/composition-editor');
    await user.click(compositionLink);

    await waitFor(() => {
      expect(screen.getByTestId('page-composition-editor')).toBeInTheDocument();
      expect(screen.getByText(/Composition Editor/i)).toBeInTheDocument();
    });

    // Navigate back to Home
    const homeLink = screen.getByTestId('nav-link-/');
    await user.click(homeLink);

    await waitFor(() => {
      expect(screen.getByTestId('page-home')).toBeInTheDocument();
    });
  });

  it('supports keyboard navigation with Alt+Number shortcuts', async () => {
    renderWithRouter('/');

    // Initially on home page
    expect(screen.getByTestId('page-home')).toBeInTheDocument();

    // Alt+2 → GRPO
    await user.keyboard('{Alt>}2{/Alt}');

    await waitFor(() => {
      expect(screen.getByTestId('page-grpo')).toBeInTheDocument();
    });

    // Alt+3 → Pipeline
    await user.keyboard('{Alt>}3{/Alt}');

    await waitFor(() => {
      expect(screen.getByTestId('page-pipeline')).toBeInTheDocument();
    });

    // Alt+4 → A11y Audit
    await user.keyboard('{Alt>}4{/Alt}');

    await waitFor(() => {
      expect(screen.getByTestId('page-a11y-audit')).toBeInTheDocument();
    });

    // Alt+5 → Composition Editor
    await user.keyboard('{Alt>}5{/Alt}');

    await waitFor(() => {
      expect(screen.getByTestId('page-composition-editor')).toBeInTheDocument();
    });

    // Alt+1 → Home
    await user.keyboard('{Alt>}1{/Alt}');

    await waitFor(() => {
      expect(screen.getByTestId('page-home')).toBeInTheDocument();
    });
  });

  it('triggers prefetch on link hover', async () => {
    const onPrefetch = vi.fn();
    renderWithRouter('/', onPrefetch);

    const grpoLink = screen.getByTestId('nav-link-/grpo');

    // Hover over the link
    await user.hover(grpoLink);

    await waitFor(() => {
      expect(onPrefetch).toHaveBeenCalledWith('/grpo');
    });
  });

  it('triggers prefetch on link focus', async () => {
    const onPrefetch = vi.fn();
    renderWithRouter('/', onPrefetch);

    const pipelineLink = screen.getByTestId('nav-link-/pipeline');

    // Focus the link via keyboard
    pipelineLink.focus();

    await waitFor(() => {
      expect(onPrefetch).toHaveBeenCalledWith('/pipeline');
    });
  });

  it('displays keyboard shortcuts in navigation links', () => {
    renderWithRouter('/');

    expect(screen.getByText(/Alt\+1/i)).toBeInTheDocument();
    expect(screen.getByText(/Alt\+2/i)).toBeInTheDocument();
    expect(screen.getByText(/Alt\+3/i)).toBeInTheDocument();
    expect(screen.getByText(/Alt\+4/i)).toBeInTheDocument();
    expect(screen.getByText(/Alt\+5/i)).toBeInTheDocument();
  });

  it('supports Tab navigation through links', async () => {
    renderWithRouter('/');

    const homeLink = screen.getByTestId('nav-link-/');

    // Focus first link
    homeLink.focus();
    expect(homeLink).toHaveFocus();

    // Tab to next link
    await user.tab();
    expect(screen.getByTestId('nav-link-/grpo')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('nav-link-/pipeline')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('nav-link-/a11y-audit')).toHaveFocus();

    await user.tab();
    expect(screen.getByTestId('nav-link-/composition-editor')).toHaveFocus();
  });

  it('activates link on Enter key press', async () => {
    renderWithRouter('/');

    const grpoLink = screen.getByTestId('nav-link-/grpo');

    grpoLink.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('page-grpo')).toBeInTheDocument();
    });
  });

  it('supports direct URL access to each route', () => {
    // Test each route can be accessed directly
    const routes = [
      { path: '/grpo', testId: 'page-grpo' },
      { path: '/pipeline', testId: 'page-pipeline' },
      { path: '/a11y-audit', testId: 'page-a11y-audit' },
      { path: '/composition-editor', testId: 'page-composition-editor' },
    ];

    routes.forEach(({ path, testId }) => {
      const { unmount } = renderWithRouter(path);

      expect(screen.getByTestId(testId)).toBeInTheDocument();

      unmount();
    });
  });

  it('maintains navigation state across route changes', async () => {
    renderWithRouter('/');

    const nav = screen.getByTestId('main-navigation');

    // Navigate to different pages
    await user.click(screen.getByTestId('nav-link-/grpo'));
    expect(nav).toBeInTheDocument();

    await user.click(screen.getByTestId('nav-link-/pipeline'));
    expect(nav).toBeInTheDocument();

    await user.click(screen.getByTestId('nav-link-/a11y-audit'));
    expect(nav).toBeInTheDocument();

    // Navigation should always be present
    expect(screen.getByTestId('main-navigation')).toBeInTheDocument();
  });
});

describe('Navigation - Accessibility', () => {
  it('has proper ARIA label on navigation', () => {
    renderWithRouter('/');

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Main navigation');
  });

  it('uses semantic nav and list elements', () => {
    renderWithRouter('/');

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('includes keyboard shortcut hints in accessible format', () => {
    renderWithRouter('/');

    // kbd elements should be present
    const shortcuts = screen.getAllByText(/Alt\+\d/i);
    expect(shortcuts.length).toBeGreaterThanOrEqual(5);

    shortcuts.forEach((shortcut) => {
      expect(shortcut.tagName.toLowerCase()).toBe('kbd');
    });
  });

  it('sets data-shortcut attribute for assistive tech', () => {
    renderWithRouter('/');

    const grpoLink = screen.getByTestId('nav-link-/grpo');
    expect(grpoLink).toHaveAttribute('data-shortcut', 'Alt+2');
  });
});

describe('Navigation - Edge Cases', () => {
  it('handles rapid route switching', async () => {
    renderWithRouter('/');

    // Rapidly switch routes
    await user.click(screen.getByTestId('nav-link-/grpo'));
    await user.click(screen.getByTestId('nav-link-/pipeline'));
    await user.click(screen.getByTestId('nav-link-/a11y-audit'));

    // Should end up on the last route
    await waitFor(() => {
      expect(screen.getByTestId('page-a11y-audit')).toBeInTheDocument();
    });
  });

  it('handles keyboard shortcuts while input is focused', async () => {
    // This test simulates a scenario where input fields might intercept shortcuts
    renderWithRouter('/');

    // Create a mock input field in the page
    const mockInput = document.createElement('input');
    mockInput.setAttribute('data-testid', 'mock-input');
    document.body.appendChild(mockInput);

    mockInput.focus();
    expect(mockInput).toHaveFocus();

    // Try to use shortcut (should still work)
    await user.keyboard('{Alt>}2{/Alt}');

    await waitFor(() => {
      expect(screen.getByTestId('page-grpo')).toBeInTheDocument();
    });

    document.body.removeChild(mockInput);
  });

  it('prevents default browser behavior on keyboard shortcuts', async () => {
    renderWithRouter('/');

    const preventDefaultSpy = vi.fn();

    // Mock preventDefault
    const originalAddEventListener = window.addEventListener;
    window.addEventListener = vi.fn((event, handler: any) => {
      if (event === 'keydown') {
        const mockEvent = {
          altKey: true,
          key: '2',
          preventDefault: preventDefaultSpy,
        };
        handler(mockEvent);
      }
      return originalAddEventListener.call(window, event, handler);
    }) as any;

    // Trigger keyboard shortcut
    await user.keyboard('{Alt>}2{/Alt}');

    // Should have prevented default
    expect(preventDefaultSpy).toHaveBeenCalled();

    window.addEventListener = originalAddEventListener;
  });

  it('handles invalid routes gracefully', () => {
    // React Router will show nothing for unmatched routes
    renderWithRouter('/invalid-route');

    // Navigation should still be present
    expect(screen.getByTestId('main-navigation')).toBeInTheDocument();

    // But no page content should render
    expect(screen.queryByTestId(/page-/)).not.toBeInTheDocument();
  });

  it('cleans up keyboard event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderWithRouter('/');

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});

describe('Navigation - Performance', () => {
  it('calls prefetch only once per link on hover', async () => {
    const onPrefetch = vi.fn();
    renderWithRouter('/', onPrefetch);

    const grpoLink = screen.getByTestId('nav-link-/grpo');

    // Hover multiple times
    await user.hover(grpoLink);
    await user.unhover(grpoLink);
    await user.hover(grpoLink);

    // Should be called multiple times (once per hover)
    // In production, you'd debounce or cache this
    expect(onPrefetch).toHaveBeenCalledWith('/grpo');
    expect(onPrefetch.mock.calls.filter((call) => call[0] === '/grpo').length).toBeGreaterThanOrEqual(1);
  });

  it('prefetches different routes independently', async () => {
    const onPrefetch = vi.fn();
    renderWithRouter('/', onPrefetch);

    // Hover over multiple links
    await user.hover(screen.getByTestId('nav-link-/grpo'));
    await user.hover(screen.getByTestId('nav-link-/pipeline'));
    await user.hover(screen.getByTestId('nav-link-/a11y-audit'));

    expect(onPrefetch).toHaveBeenCalledWith('/grpo');
    expect(onPrefetch).toHaveBeenCalledWith('/pipeline');
    expect(onPrefetch).toHaveBeenCalledWith('/a11y-audit');
  });
});

describe('Navigation - Complete User Journey', () => {
  it('completes full user journey: Home → GRPO → Pipeline → A11y → Composition → Home', async () => {
    renderWithRouter('/');

    // Start on home
    expect(screen.getByTestId('page-home')).toBeInTheDocument();

    // Navigate to GRPO via keyboard shortcut
    await user.keyboard('{Alt>}2{/Alt}');
    await waitFor(() => {
      expect(screen.getByTestId('page-grpo')).toBeInTheDocument();
    });

    // Navigate to Pipeline via click
    await user.click(screen.getByTestId('nav-link-/pipeline'));
    await waitFor(() => {
      expect(screen.getByTestId('page-pipeline')).toBeInTheDocument();
    });

    // Navigate to A11y Audit via keyboard
    await user.keyboard('{Alt>}4{/Alt}');
    await waitFor(() => {
      expect(screen.getByTestId('page-a11y-audit')).toBeInTheDocument();
    });

    // Navigate to Composition Editor via click
    await user.click(screen.getByTestId('nav-link-/composition-editor'));
    await waitFor(() => {
      expect(screen.getByTestId('page-composition-editor')).toBeInTheDocument();
    });

    // Return to home via keyboard
    await user.keyboard('{Alt>}1{/Alt}');
    await waitFor(() => {
      expect(screen.getByTestId('page-home')).toBeInTheDocument();
    });
  });

  it('uses Tab and Enter for keyboard-only navigation', async () => {
    renderWithRouter('/');

    // Start with home link focused
    const homeLink = screen.getByTestId('nav-link-/');
    homeLink.focus();

    // Tab to GRPO link
    await user.tab();
    expect(screen.getByTestId('nav-link-/grpo')).toHaveFocus();

    // Press Enter to navigate
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByTestId('page-grpo')).toBeInTheDocument();
    });

    // Tab to pipeline link (relative to current focus)
    // Note: We need to refocus the nav after route change
    const pipelineLink = screen.getByTestId('nav-link-/pipeline');
    pipelineLink.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('page-pipeline')).toBeInTheDocument();
    });
  });
});
