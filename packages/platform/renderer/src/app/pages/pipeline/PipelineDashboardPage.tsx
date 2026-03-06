/**
 * Pipeline Dashboard Page
 *
 * Placeholder page for the ML Pipeline monitoring dashboard.
 * This route was wired alongside the GRPO dashboard to ensure both
 * ML-related routes are accessible from the main navigation.
 *
 * When a PipelineDashboard component is built (similar to the GRPO
 * dashboard), replace the placeholder content with the actual component.
 *
 * @module pages/pipeline/PipelineDashboardPage
 */

import React, { useEffect } from 'react';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

const PipelineDashboardPage: React.FC = () => {
  // Set document title
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Pipeline | AI Ecosystem';
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <article
      aria-labelledby="pipeline-page-heading"
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#e0e0f0',
        backgroundColor: '#0a0a1a',
        padding: '2rem',
      }}
    >
      <h2
        id="pipeline-page-heading"
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '1rem',
        }}
      >
        Pipeline Dashboard
      </h2>
      <p
        style={{
          color: '#9898c0',
          fontSize: '0.95rem',
          maxWidth: '480px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        The ML pipeline monitoring dashboard is being developed. It will
        display training pipeline status, data preprocessing stages, model
        evaluation results, and deployment readiness.
      </p>
      <div
        style={{
          marginTop: '1.5rem',
          padding: '0.75rem 1.5rem',
          border: '1px solid #2a2a4a',
          borderRadius: '8px',
          backgroundColor: '#12122a',
          color: '#9898c0',
          fontSize: '0.8rem',
        }}
        role="status"
      >
        Status: Coming Soon
      </div>
    </article>
  );
};

export default PipelineDashboardPage;
