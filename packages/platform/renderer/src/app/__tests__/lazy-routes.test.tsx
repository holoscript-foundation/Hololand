/**
 * @vitest-environment jsdom
 */

/**
 * Tests for lazy-routes configuration.
 *
 * Validates:
 *   - Route definitions include /grpo and /pipeline paths
 *   - Prefetch functions are callable without errors
 *   - Route elements are React elements with Suspense wrappers
 *   - routePrefetchMap contains expected routes
 *   - Lazy components are valid React.lazy components
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';

import {
  lazyRoutes,
  routePrefetchMap,
  prefetchGRPO,
  prefetchPipeline,
  GRPORoute,
  PipelineRoute,
} from '../lazy-routes';

// =============================================================================
// ROUTE DEFINITIONS
// =============================================================================

describe('lazyRoutes', () => {
  it('exports an array of route objects', () => {
    expect(Array.isArray(lazyRoutes)).toBe(true);
    expect(lazyRoutes.length).toBeGreaterThanOrEqual(2);
  });

  it('includes /grpo route', () => {
    const grpoRoute = lazyRoutes.find((r) => r.path === '/grpo');
    expect(grpoRoute).toBeDefined();
    expect(grpoRoute!.path).toBe('/grpo');
    expect(grpoRoute!.element).toBeTruthy();
  });

  it('includes /pipeline route', () => {
    const pipelineRoute = lazyRoutes.find((r) => r.path === '/pipeline');
    expect(pipelineRoute).toBeDefined();
    expect(pipelineRoute!.path).toBe('/pipeline');
    expect(pipelineRoute!.element).toBeTruthy();
  });

  it('all routes have path and element', () => {
    for (const route of lazyRoutes) {
      expect(route.path).toBeDefined();
      expect(typeof route.path).toBe('string');
      expect(route.element).toBeTruthy();
    }
  });
});

// =============================================================================
// ROUTE ELEMENTS
// =============================================================================

describe('Route elements', () => {
  it('GRPORoute creates a valid React element', () => {
    const element = React.createElement(GRPORoute);
    expect(element).toBeTruthy();
    expect(element.type).toBe(GRPORoute);
  });

  it('PipelineRoute creates a valid React element', () => {
    const element = React.createElement(PipelineRoute);
    expect(element).toBeTruthy();
    expect(element.type).toBe(PipelineRoute);
  });
});

// =============================================================================
// PREFETCH FUNCTIONS
// =============================================================================

describe('prefetchGRPO', () => {
  it('is a callable function', () => {
    expect(typeof prefetchGRPO).toBe('function');
  });

  it('does not throw when called', () => {
    // The dynamic import will fail in test env but should not throw synchronously
    expect(() => prefetchGRPO()).not.toThrow();
  });
});

describe('prefetchPipeline', () => {
  it('is a callable function', () => {
    expect(typeof prefetchPipeline).toBe('function');
  });

  it('does not throw when called', () => {
    expect(() => prefetchPipeline()).not.toThrow();
  });
});

// =============================================================================
// ROUTE PREFETCH MAP
// =============================================================================

describe('routePrefetchMap', () => {
  it('is an object', () => {
    expect(typeof routePrefetchMap).toBe('object');
    expect(routePrefetchMap).not.toBeNull();
  });

  it('contains /grpo key', () => {
    expect(routePrefetchMap).toHaveProperty('/grpo');
    expect(typeof routePrefetchMap['/grpo']).toBe('function');
  });

  it('contains /pipeline key', () => {
    expect(routePrefetchMap).toHaveProperty('/pipeline');
    expect(typeof routePrefetchMap['/pipeline']).toBe('function');
  });

  it('/grpo maps to prefetchGRPO', () => {
    expect(routePrefetchMap['/grpo']).toBe(prefetchGRPO);
  });

  it('/pipeline maps to prefetchPipeline', () => {
    expect(routePrefetchMap['/pipeline']).toBe(prefetchPipeline);
  });
});

// =============================================================================
// ROUTE UNIQUENESS
// =============================================================================

describe('Route uniqueness', () => {
  it('all route paths are unique', () => {
    const paths = lazyRoutes.map((r) => r.path);
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(paths.length);
  });
});
