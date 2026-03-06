/**
 * GRPO Training Dashboard Page
 *
 * Lightweight page wrapper that integrates the GRPODashboard component from
 * the Hololand renderer into the AI Ecosystem application shell.
 *
 * Responsibilities:
 *   - Renders within the application layout (header, nav already provided by AppLayout)
 *   - Configures the useGRPOData hook with WebSocket connection to the MCP orchestrator
 *   - Provides page-level metadata (document title)
 *   - Maintains WCAG 2.1 AA accessibility
 *
 * Data Flow:
 *   ws://localhost:5567/grpo/events -> useGRPOData -> GRPODashboard
 *
 * @module pages/grpo/GRPODashboardPage
 */

import React, { useEffect, useMemo } from 'react';

import {
  GRPODashboard,
  useGRPOData,
  type UseGRPODataConfig,
} from './grpo-imports';

// =============================================================================
// CONFIGURATION
// =============================================================================

const GRPO_WS_URL = 'ws://localhost:5567/grpo/events';
const GRPO_REST_URL = 'http://localhost:5567/api/grpo';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export interface GRPODashboardPageProps {
  /** Override WebSocket URL (useful for testing) */
  wsUrl?: string;
  /** Override REST URL (useful for testing) */
  restUrl?: string;
}

const GRPODashboardPage: React.FC<GRPODashboardPageProps> = ({
  wsUrl = GRPO_WS_URL,
  restUrl = GRPO_REST_URL,
}) => {
  // Set document title
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'GRPO Training | AI Ecosystem';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const config: UseGRPODataConfig = useMemo(
    () => ({
      wsUrl,
      restUrl,
      pollIntervalMs: 5000,
      maxRewardHistory: 500,
      maxKLHistory: 500,
      maxCompletionGroups: 50,
    }),
    [wsUrl, restUrl],
  );

  const [state, actions] = useGRPOData(config);

  return (
    <article
      aria-labelledby="grpo-page-heading"
      style={{ padding: '0' }}
    >
      <h2
        id="grpo-page-heading"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        GRPO Training Dashboard
      </h2>
      <GRPODashboard
        externalState={state}
        externalActions={actions}
        config={config}
        ariaLabel="GRPO Training Dashboard"
      />
    </article>
  );
};

export default GRPODashboardPage;
