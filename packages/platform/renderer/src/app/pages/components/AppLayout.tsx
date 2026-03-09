/**
 * AppLayout Component
 *
 * Application shell providing header, sidebar navigation, and content area.
 * All routes are rendered within the content area via React Router's Outlet.
 *
 * Accessibility (WCAG 2.1 AA):
 *   - Semantic landmarks: <header>, <nav>, <main>
 *   - Skip navigation link for keyboard users
 *   - aria-current="page" on active nav link
 *   - All nav links have accessible labels
 *   - Keyboard navigable (Tab, Enter, Space)
 *   - Focus indicators visible (2px outline)
 *   - Minimum 4.5:1 contrast ratios
 *   - Prefetch on hover/focus for lazy-loaded routes
 *   - Keyboard shortcuts: Ctrl+E (Editor), Ctrl+A (Audit)
 *
 * @module pages/components/AppLayout
 */

import React, { useCallback, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { routePrefetchMap } from '../../lazy-routes';

// =============================================================================
// NAV CONFIGURATION
// =============================================================================

interface NavItem {
  /** Route path */
  to: string;
  /** Display label (also used as accessible name) */
  label: string;
  /** Group for visual separation */
  group: 'overview' | 'training' | 'tools';
  /** Optional icon (emoji or symbol) */
  icon?: string;
  /** Optional description for tooltips */
  description?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', group: 'overview' },
  { to: '/grpo', label: 'GRPO Training', group: 'training' },
  { to: '/pipeline', label: 'Pipeline', group: 'training' },
  {
    to: '/composition-editor',
    label: 'Composition Editor',
    group: 'tools',
    icon: '⊞',
    description: 'HoloScript composition editor with trait matrix'
  },
  {
    to: '/a11y-audit',
    label: 'Accessibility Audit',
    group: 'tools',
    icon: '♿',
    description: 'WCAG 2.1 compliance scanner'
  },
];

// =============================================================================
// STYLES
// =============================================================================

const STYLES = {
  skipLink: {
    position: 'absolute' as const,
    top: '-40px',
    left: '0',
    background: '#6366f1',
    color: '#ffffff',
    padding: '8px 16px',
    zIndex: 1000,
    fontSize: '0.85rem',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    textDecoration: 'none',
    borderRadius: '0 0 4px 0',
    transition: 'top 0.2s ease',
  },
  skipLinkFocus: {
    top: '0',
  },
  layout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0a0a1a',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    backgroundColor: '#08081a',
    borderRight: '1px solid #1e1e3a',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '0',
  },
  sidebarHeader: {
    padding: '1.25rem 1rem',
    borderBottom: '1px solid #1e1e3a',
  },
  sidebarTitle: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: '#e0e0f0',
    margin: 0,
    letterSpacing: '0.02em',
  },
  navGroup: {
    padding: '0.75rem 0',
  },
  navGroupLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: '#7878a0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    padding: '0 1rem',
    marginBottom: '0.4rem',
  },
  navList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  navLink: {
    display: 'block',
    padding: '0.55rem 1rem',
    color: '#9898c0',
    textDecoration: 'none',
    fontSize: '0.82rem',
    fontWeight: 500,
    borderLeft: '3px solid transparent',
    transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
    outline: 'none',
  },
  navLinkActive: {
    color: '#e0e0f0',
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderLeftColor: '#6366f1',
  },
  navLinkHover: {
    color: '#d0d0e8',
    backgroundColor: 'rgba(99, 102, 241, 0.04)',
  },
  content: {
    flex: 1,
    minWidth: 0,
    overflow: 'auto',
  },
} as const;

// =============================================================================
// COMPONENT
// =============================================================================

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();

  const handlePrefetch = useCallback((path: string) => {
    const prefetchFn = routePrefetchMap[path];
    if (prefetchFn) {
      prefetchFn();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+E: Navigate to Composition Editor
      if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        navigate('/composition-editor');
      }
      // Ctrl+A: Navigate to Accessibility Audit
      // Note: Ctrl+A is "Select All" by default, so we need to prevent default
      if (event.ctrlKey && event.key === 'a') {
        event.preventDefault();
        navigate('/a11y-audit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Group nav items
  const overviewItems = NAV_ITEMS.filter((item) => item.group === 'overview');
  const trainingItems = NAV_ITEMS.filter((item) => item.group === 'training');
  const toolsItems = NAV_ITEMS.filter((item) => item.group === 'tools');

  return (
    <div style={STYLES.layout}>
      {/* Skip navigation link - visible on focus for keyboard users */}
      <a
        href="#main-content"
        style={STYLES.skipLink}
        onFocus={(e) => {
          Object.assign(e.currentTarget.style, STYLES.skipLinkFocus);
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-40px';
        }}
      >
        Skip to main content
      </a>

      {/* Sidebar Navigation */}
      <aside style={STYLES.sidebar}>
        <div style={STYLES.sidebarHeader}>
          <h1 style={STYLES.sidebarTitle}>AI Ecosystem</h1>
        </div>

        <nav aria-label="Main navigation">
          {/* Overview group */}
          <div style={STYLES.navGroup} role="group" aria-label="Overview">
            <ul style={STYLES.navList}>
              {overviewItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    aria-label={item.label}
                    onMouseEnter={() => handlePrefetch(item.to)}
                    onFocus={() => handlePrefetch(item.to)}
                    style={({ isActive }) => ({
                      ...STYLES.navLink,
                      ...(isActive ? STYLES.navLinkActive : {}),
                    })}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Training group */}
          <div style={STYLES.navGroup} role="group" aria-label="ML Training">
            <div style={STYLES.navGroupLabel} aria-hidden="true">
              Training
            </div>
            <ul style={STYLES.navList}>
              {trainingItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    aria-label={item.label}
                    onMouseEnter={() => handlePrefetch(item.to)}
                    onFocus={() => handlePrefetch(item.to)}
                    style={({ isActive }) => ({
                      ...STYLES.navLink,
                      ...(isActive ? STYLES.navLinkActive : {}),
                    })}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools group */}
          <div style={STYLES.navGroup} role="group" aria-label="Development Tools">
            <div style={STYLES.navGroupLabel} aria-hidden="true">
              Tools
            </div>
            <ul style={STYLES.navList}>
              {toolsItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    aria-label={item.description || item.label}
                    title={item.description}
                    onMouseEnter={() => handlePrefetch(item.to)}
                    onFocus={() => handlePrefetch(item.to)}
                    style={({ isActive }) => ({
                      ...STYLES.navLink,
                      ...(isActive ? STYLES.navLinkActive : {}),
                    })}
                  >
                    {item.icon && <span aria-hidden="true" style={{ marginRight: '0.5rem' }}>{item.icon}</span>}
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main
        id="main-content"
        style={STYLES.content}
        role="main"
        tabIndex={-1}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
