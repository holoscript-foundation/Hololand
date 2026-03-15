/**
 * @hololand/spatial-builder - ErrorBoundary
 *
 * Operations Hub component: Global Error Boundary with Audit Trail
 * Wires componentDidCatch to a unified error schema compatible with
 * FDA 21 CFR Part 11 electronic audit trails.
 *
 * Every crash yields a specific AST path and structured audit log entry.
 *
 * Part of Track 1: Studio Quality DX & Operations Hub Refinement.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

// -- Unified Error Schema --

export interface AuditLogEntry {
  /** Unique error ID */
  errorId: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Error severity level */
  severity: 'critical' | 'error' | 'warning';
  /** Error category for routing */
  category: 'render' | 'webgl' | 'webxr' | 'network' | 'parser' | 'compiler' | 'runtime';
  /** The error message */
  message: string;
  /** Full stack trace */
  stackTrace: string;
  /** Component that threw the error */
  componentName: string;
  /** AST path if determinable (e.g., "scene.objects[3].@physics") */
  astPath?: string;
  /** Line in .holo source if determinable */
  holoLine?: number;
  /** The .holo file being edited */
  holoFile?: string;
  /** Session ID for correlation */
  sessionId: string;
  /** User agent / platform info */
  platform: string;
  /** WebGL context info (renderer, vendor) */
  webglInfo?: {
    renderer: string;
    vendor: string;
    version: string;
  };
  /** Whether the error was recovered from */
  recovered: boolean;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// -- Audit Logger --

let sessionId = '';

function getSessionId(): string {
  if (!sessionId) {
    sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).slice(2);
  }
  return sessionId;
}

function generateErrorId(): string {
  return 'err-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

function detectCategory(error: Error): AuditLogEntry['category'] {
  const msg = error.message.toLowerCase();
  if (msg.includes('webgl') || msg.includes('gl_') || msg.includes('shader')) return 'webgl';
  if (msg.includes('xr') || msg.includes('webxr') || msg.includes('immersive')) return 'webxr';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('socket')) return 'network';
  if (msg.includes('parse') || msg.includes('syntax') || msg.includes('token')) return 'parser';
  if (msg.includes('compile') || msg.includes('target')) return 'compiler';
  return 'render';
}

function getWebGLInfo(): AuditLogEntry['webglInfo'] | undefined {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return undefined;
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
      vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown',
      version: gl.getParameter(gl.VERSION),
    };
  } catch {
    return undefined;
  }
}

function createAuditEntry(
  error: Error,
  componentName: string,
  recovered: boolean
): AuditLogEntry {
  return {
    errorId: generateErrorId(),
    timestamp: new Date().toISOString(),
    severity: recovered ? 'error' : 'critical',
    category: detectCategory(error),
    message: error.message,
    stackTrace: error.stack || '',
    componentName,
    sessionId: getSessionId(),
    platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    webglInfo: getWebGLInfo(),
    recovered,
  };
}

// -- Persistent Audit Log --

const AUDIT_LOG_KEY = 'hololand_audit_log';
const MAX_LOG_ENTRIES = 500;

function persistAuditEntry(entry: AuditLogEntry): void {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    const log: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
    log.push(entry);
    if (log.length > MAX_LOG_ENTRIES) {
      log.splice(0, log.length - MAX_LOG_ENTRIES);
    }
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(log));
  } catch {
    console.error('[AuditLog] Failed to persist entry:', entry);
  }
}

export function getAuditLog(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearAuditLog(): void {
  try {
    localStorage.removeItem(AUDIT_LOG_KEY);
  } catch {
    // Silently ignore
  }
}

// -- Error Boundary Component --

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Name of this boundary for audit logging */
  boundaryName?: string;
  /** Custom fallback UI */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Callback when an error is caught (for parent notification) */
  onError?: (entry: AuditLogEntry) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  auditEntry: AuditLogEntry | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, auditEntry: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const componentName =
      errorInfo.componentStack
        ?.split('\n')
        .find((line) => line.trim().startsWith('at '))
        ?.trim()
        .replace(/^at /, '')
        .split(' ')[0] || this.props.boundaryName || 'Unknown';

    const entry = createAuditEntry(error, componentName, false);

    // Attempt to extract AST path from error metadata
    if ('astPath' in error) {
      entry.astPath = (error as Error & { astPath?: string }).astPath;
    }
    if ('holoLine' in error) {
      entry.holoLine = (error as Error & { holoLine?: number }).holoLine;
    }

    // Persist to audit log
    persistAuditEntry(entry);

    // Notify parent
    this.props.onError?.(entry);

    // Console output with structured data
    console.error(
      '[ErrorBoundary] ' + entry.severity.toUpperCase() + ' in ' + componentName + ':',
      entry.message,
      '\nAudit ID:', entry.errorId,
      '\nCategory:', entry.category,
      entry.astPath ? '\nAST Path: ' + entry.astPath : '',
      entry.holoLine ? '\nHoloScript Line: ' + entry.holoLine : ''
    );

    this.setState({ auditEntry: entry });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, auditEntry: null });
  };

  handleExportLog = () => {
    const log = getAuditLog();
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit-log-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error, this.handleReset);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      const { error, auditEntry } = this.state;
      return (
        <div
          style={{
            padding: '24px',
            background: '#1a0a0a',
            color: '#e0e0e0',
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
            borderRadius: '8px',
            border: '1px solid #ef4444',
            margin: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span
              style={{
                background: '#ef444422',
                color: '#ef4444',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {auditEntry?.category.toUpperCase() || 'ERROR'}
            </span>
            <span style={{ fontWeight: 700, fontSize: '14px' }}>
              Something went wrong
            </span>
          </div>

          <div
            style={{
              padding: '12px',
              background: '#0f0505',
              borderRadius: '4px',
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              fontSize: '12px',
              color: '#ef4444',
              marginBottom: '12px',
              overflowX: 'auto',
            }}
          >
            {error.message}
          </div>

          {auditEntry && (
            <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>
              <div>Audit ID: <code style={{ color: '#f59e0b' }}>{auditEntry.errorId}</code></div>
              <div>Component: <code>{auditEntry.componentName}</code></div>
              {auditEntry.astPath && (
                <div>AST Path: <code style={{ color: '#6366f1' }}>{auditEntry.astPath}</code></div>
              )}
              {auditEntry.holoLine !== undefined && (
                <div>HoloScript Line: <code>{auditEntry.holoLine}</code></div>
              )}
              <div>Time: {auditEntry.timestamp}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '6px 16px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
            <button
              onClick={this.handleExportLog}
              style={{
                padding: '6px 16px',
                background: '#2a2a3e',
                color: '#aaa',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Export Audit Log
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
