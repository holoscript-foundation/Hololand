/**
 * Lazy Route Definitions
 *
 * Centralized lazy-loaded route configuration for the AI Ecosystem dashboard.
 * All routes use React.lazy with Suspense boundaries for code-splitting.
 *
 * Routes:
 *   /           - Home / Overview
 *   /grpo       - GRPO Training Dashboard (ML training monitor)
 *   /pipeline   - Pipeline Dashboard (ML pipeline status)
 *
 * Prefetching:
 *   Each route exports a prefetch function that triggers the dynamic import
 *   on hover/focus of navigation links, reducing perceived load time.
 *
 * @module lazy-routes
 */

import React, { Suspense } from 'react';
import type { RouteObject } from 'react-router-dom';

// =============================================================================
// LOADING FALLBACK
// =============================================================================

interface RouteLoadingFallbackProps {
  label: string;
}

const RouteLoadingFallback: React.FC<RouteLoadingFallbackProps> = ({ label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      color: '#9898c0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '0.9rem',
    }}
    role="status"
    aria-label={`Loading ${label}`}
  >
    <span aria-hidden="true" style={{ marginRight: '0.5rem' }}>
      Loading {label}...
    </span>
  </div>
);

// =============================================================================
// LAZY IMPORTS
// =============================================================================

/**
 * Lazy-loaded GRPO Training Dashboard page.
 * Loads the full dashboard bundle only when the /grpo route is visited.
 */
const GRPODashboardPage = React.lazy(
  () => import('./pages/grpo/GRPODashboardPage'),
);

/**
 * Lazy-loaded Pipeline Dashboard page.
 * Loads the pipeline monitoring bundle only when the /pipeline route is visited.
 */
const PipelineDashboardPage = React.lazy(
  () => import('./pages/pipeline/PipelineDashboardPage'),
);

// =============================================================================
// PREFETCH FUNCTIONS
// =============================================================================

/**
 * Prefetch the GRPO Dashboard bundle.
 * Call on link hover/focus to warm the cache before navigation.
 */
export function prefetchGRPO(): void {
  import('./pages/grpo/GRPODashboardPage');
}

/**
 * Prefetch the Pipeline Dashboard bundle.
 * Call on link hover/focus to warm the cache before navigation.
 */
export function prefetchPipeline(): void {
  import('./pages/pipeline/PipelineDashboardPage');
}

// =============================================================================
// ROUTE ELEMENTS (with Suspense wrappers)
// =============================================================================

export const GRPORoute: React.FC = () => (
  <Suspense fallback={<RouteLoadingFallback label="GRPO Training Dashboard" />}>
    <GRPODashboardPage />
  </Suspense>
);

export const PipelineRoute: React.FC = () => (
  <Suspense fallback={<RouteLoadingFallback label="Pipeline Dashboard" />}>
    <PipelineDashboardPage />
  </Suspense>
);

// =============================================================================
// ROUTE DEFINITIONS (react-router-dom v6)
// =============================================================================

/**
 * All lazy-loaded route definitions for use with createBrowserRouter or
 * <Routes> configuration.
 */
export const lazyRoutes: RouteObject[] = [
  {
    path: '/grpo',
    element: React.createElement(GRPORoute),
  },
  {
    path: '/pipeline',
    element: React.createElement(PipelineRoute),
  },
];

/**
 * Map of route paths to their prefetch functions.
 * Used by the navigation component to prefetch on hover/focus.
 */
export const routePrefetchMap: Record<string, () => void> = {
  '/grpo': prefetchGRPO,
  '/pipeline': prefetchPipeline,
};

export default lazyRoutes;
