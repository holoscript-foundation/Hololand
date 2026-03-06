/**
 * Lazy Route Configuration for GRPO Training Dashboard
 *
 * Provides a React.lazy-loaded route definition that can be integrated
 * into any React Router setup.
 *
 * Usage with react-router-dom:
 * ```tsx
 * import { grpoRoute } from '@hololand/renderer/components/grpo-training-dashboard/lazy-route';
 *
 * const router = createBrowserRouter([
 *   ...otherRoutes,
 *   grpoRoute,
 * ]);
 * ```
 *
 * Or import directly into an existing lazy-routes file:
 * ```tsx
 * import { GRPODashboardLazy } from '@hololand/renderer/components/grpo-training-dashboard/lazy-route';
 *
 * <Route path="/grpo" element={
 *   <Suspense fallback={<div>Loading GRPO Dashboard...</div>}>
 *     <GRPODashboardLazy />
 *   </Suspense>
 * } />
 * ```
 *
 * @module grpo-training-dashboard/lazy-route
 */

import React, { Suspense } from 'react';

/**
 * Lazy-loaded GRPODashboard component.
 * Only loads the dashboard bundle when the route is visited.
 */
export const GRPODashboardLazy = React.lazy(() =>
  import('./GRPODashboard').then((mod) => ({ default: mod.GRPODashboard })),
);

/**
 * Loading fallback for the GRPO dashboard route.
 */
const GRPOLoadingFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#0a0a1a',
      color: '#9898c0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '0.9rem',
    }}
    role="status"
    aria-label="Loading GRPO Training Dashboard"
  >
    Loading GRPO Training Dashboard...
  </div>
);

/**
 * Wrapped lazy component with Suspense boundary.
 */
export const GRPODashboardRoute: React.FC = () => (
  <Suspense fallback={<GRPOLoadingFallback />}>
    <GRPODashboardLazy />
  </Suspense>
);

/**
 * Route configuration object compatible with react-router-dom v6 createBrowserRouter.
 *
 * ```ts
 * import { grpoRoute } from '...';
 * const router = createBrowserRouter([grpoRoute]);
 * ```
 */
export const grpoRoute = {
  path: '/grpo',
  element: React.createElement(GRPODashboardRoute),
};

export default GRPODashboardRoute;
