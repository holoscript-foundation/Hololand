/**
 * @hololand/spatial-builder - ConformanceSuite
 *
 * Operations Hub component: Verification Runner
 * Replaces the "Play" button paradigm with a property-based test runner.
 * Executes conformance checks against the HoloScript AST, validating
 * behavioral contracts, physics standards, and platform compliance.
 *
 * Part of Track 1: Studio Quality DX & Operations Hub Refinement.
 */

import React, { useState, useCallback, useMemo } from 'react';

// -- Types --

export type ConformanceStatus = 'idle' | 'running' | 'passed' | 'failed' | 'warning';

export interface ConformanceRule {
  /** Unique rule identifier (e.g., "PHYS-001", "ACC-012") */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Rule category */
  category: 'physics' | 'accessibility' | 'performance' | 'platform' | 'security' | 'networking';
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  /** Description of what this rule checks */
  description: string;
  /** Whether this rule is enabled */
  enabled: boolean;
}

export interface ConformanceResult {
  /** The rule that was checked */
  rule: ConformanceRule;
  /** Result status */
  status: 'passed' | 'failed' | 'skipped' | 'warning';
  /** Duration of the check in milliseconds */
  durationMs: number;
  /** Detailed message */
  message: string;
  /** AST path to the failing node (e.g., "scene.objects[3].@physics") */
  astPath?: string;
  /** Line number in the .holo source */
  line?: number;
  /** Suggested fix */
  suggestion?: string;
}

export interface ConformanceSuiteProps {
  /** All available conformance rules */
  rules: ConformanceRule[];
  /** Results from the last run */
  results: ConformanceResult[];
  /** Current suite status */
  status: ConformanceStatus;
  /** Callback to run the full conformance suite */
  onRunAll?: () => void;
  /** Callback to run a specific category */
  onRunCategory?: (category: ConformanceRule['category']) => void;
  /** Callback to toggle a rule on/off */
  onToggleRule?: (ruleId: string) => void;
  /** Total run duration */
  totalDurationMs?: number;
}

// -- Category metadata --

const CATEGORY_META: Record<
  ConformanceRule['category'],
  { label: string; color: string; icon: string }
> = {
  physics: { label: 'Physics', color: '#f59e0b', icon: 'G' },
  accessibility: { label: 'Accessibility', color: '#22c55e', icon: 'A' },
  performance: { label: 'Performance', color: '#3b82f6', icon: 'P' },
  platform: { label: 'Platform', color: '#8b5cf6', icon: 'T' },
  security: { label: 'Security', color: '#ef4444', icon: 'S' },
  networking: { label: 'Networking', color: '#14b8a6', icon: 'N' },
};

// -- Component --

export const ConformanceSuite: React.FC<ConformanceSuiteProps> = ({
  rules,
  results,
  status,
  onRunAll,
  onRunCategory,
  onToggleRule,
  totalDurationMs,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showOnlyFailures, setShowOnlyFailures] = useState(false);

  const summary = useMemo(() => {
    const passed = results.filter((r) => r.status === 'passed').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const warnings = results.filter((r) => r.status === 'warning').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;
    return { passed, failed, warnings, skipped, total: results.length };
  }, [results]);

  const groupedResults = useMemo(() => {
    const groups = new Map<string, ConformanceResult[]>();
    for (const r of results) {
      const cat = r.rule.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(r);
    }
    return groups;
  }, [results]);

  const filteredResults = useCallback(
    (categoryResults: ConformanceResult[]) => {
      if (!showOnlyFailures) return categoryResults;
      return categoryResults.filter((r) => r.status === 'failed' || r.status === 'warning');
    },
    [showOnlyFailures]
  );

  const statusIcon = (s: ConformanceResult['status']) => {
    switch (s) {
      case 'passed': return { text: 'PASS', bg: '#22c55e22', fg: '#22c55e' };
      case 'failed': return { text: 'FAIL', bg: '#ef444422', fg: '#ef4444' };
      case 'warning': return { text: 'WARN', bg: '#f59e0b22', fg: '#f59e0b' };
      case 'skipped': return { text: 'SKIP', bg: '#64748b22', fg: '#64748b' };
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0f0f1a',
        color: '#e0e0e0',
        fontSize: '12px',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid #2a2a3e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '13px' }}>Conformance Suite</span>
          {status === 'running' && (
            <span style={{ color: '#3b82f6', fontSize: '11px', fontStyle: 'italic' }}>
              Running...
            </span>
          )}
        </div>
        <button
          onClick={onRunAll}
          disabled={status === 'running'}
          style={{
            padding: '4px 12px',
            background: status === 'running' ? '#333' : '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: status === 'running' ? 'not-allowed' : 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          {status === 'running' ? 'Verifying...' : 'Verify All'}
        </button>
      </div>

      {/* Summary Bar */}
      {results.length > 0 && (
        <div
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #2a2a3e',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: summary.failed > 0 ? '#ef444411' : '#22c55e11',
          }}
        >
          <span style={{ color: '#22c55e', fontWeight: 600 }}>{summary.passed} passed</span>
          <span style={{ color: '#ef4444', fontWeight: 600 }}>{summary.failed} failed</span>
          <span style={{ color: '#f59e0b' }}>{summary.warnings} warnings</span>
          <span style={{ color: '#64748b' }}>{summary.skipped} skipped</span>
          {totalDurationMs !== undefined && (
            <span style={{ color: '#666', marginLeft: 'auto', fontSize: '10px' }}>
              {totalDurationMs}ms
            </span>
          )}
        </div>
      )}

      {/* Filter toggle */}
      <div style={{ padding: '6px 12px', borderBottom: '1px solid #1a1a2e' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showOnlyFailures}
            onChange={(e) => setShowOnlyFailures(e.target.checked)}
            style={{ accentColor: '#6366f1' }}
          />
          <span style={{ fontSize: '11px', color: '#888' }}>Show only failures</span>
        </label>
      </div>

      {/* Category groups */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
          const catResults = groupedResults.get(catKey) || [];
          const filtered = filteredResults(catResults);
          const catRules = rules.filter((r) => r.category === catKey);
          const isExpanded = expandedCategory === catKey;
          const catFailed = catResults.filter((r) => r.status === 'failed').length;
          const catPassed = catResults.filter((r) => r.status === 'passed').length;

          return (
            <div key={catKey}>
              <div
                onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #1a1a2e',
                  background: isExpanded ? '#1a1a2e' : 'transparent',
                }}
              >
                <span
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    background: meta.color + '22',
                    color: meta.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 700,
                    marginRight: '8px',
                    flexShrink: 0,
                  }}
                >
                  {meta.icon}
                </span>
                <span style={{ fontWeight: 600, flex: 1 }}>{meta.label}</span>
                <span style={{ color: '#666', fontSize: '10px', marginRight: '8px' }}>
                  {catRules.length} rules
                </span>
                {catResults.length > 0 && (
                  <>
                    <span style={{ color: '#22c55e', fontSize: '10px', marginRight: '4px' }}>
                      {catPassed}P
                    </span>
                    <span style={{ color: '#ef4444', fontSize: '10px', marginRight: '8px' }}>
                      {catFailed}F
                    </span>
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRunCategory?.(catKey as ConformanceRule['category']);
                  }}
                  style={{
                    padding: '2px 8px',
                    background: '#2a2a3e',
                    color: '#aaa',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '10px',
                  }}
                >
                  Run
                </button>
              </div>

              {isExpanded && (
                <div style={{ background: '#0a0a14' }}>
                  {filtered.length === 0 ? (
                    <div style={{ padding: '12px 20px', color: '#555', fontStyle: 'italic' }}>
                      {catResults.length === 0 ? 'Not yet run' : 'All checks passed'}
                    </div>
                  ) : (
                    filtered.map((result, i) => {
                      const si = statusIcon(result.status);
                      return (
                        <div
                          key={result.rule.id + '-' + i}
                          style={{
                            padding: '8px 20px',
                            borderBottom: '1px solid #0f0f1a',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                padding: '1px 5px',
                                borderRadius: '3px',
                                fontSize: '9px',
                                fontWeight: 700,
                                background: si.bg,
                                color: si.fg,
                              }}
                            >
                              {si.text}
                            </span>
                            <span style={{ fontWeight: 500, fontSize: '11px' }}>
                              [{result.rule.id}] {result.rule.name}
                            </span>
                            <span style={{ color: '#555', fontSize: '10px', marginLeft: 'auto' }}>
                              {result.durationMs}ms
                            </span>
                          </div>
                          <div style={{ marginTop: '4px', color: '#aaa', fontSize: '11px' }}>
                            {result.message}
                          </div>
                          {result.astPath && (
                            <div style={{ marginTop: '2px', color: '#6366f1', fontSize: '10px' }}>
                              AST: {result.astPath}
                              {result.line ? ' (line ' + result.line + ')' : ''}
                            </div>
                          )}
                          {result.suggestion && (
                            <div
                              style={{
                                marginTop: '4px',
                                padding: '4px 8px',
                                background: '#22c55e11',
                                borderLeft: '2px solid #22c55e',
                                color: '#22c55e',
                                fontSize: '10px',
                              }}
                            >
                              Fix: {result.suggestion}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
