/**
 * EvidenceTrailViewer Component
 *
 * Read-only audit log with cryptographic verification UI.
 * Integrates with @holoscript/mvc-schema EvidenceTrail (VCP v1.1 hash chain).
 *
 * Features:
 * - Hash chain visualization with cryptographic links
 * - Entry sequence display in chronological order
 * - Evidence type categorization with color coding
 * - Cryptographic verification status
 * - Digital signature verification UI
 * - Broken link highlighting
 * - Hash detail inspection
 * - Search and filter by type
 * - Export chain for external verification
 *
 * Accessibility (WCAG 2.1 AA):
 * - role="region" with aria-label on container
 * - role="log" for evidence entries (ARIA live region)
 * - role="status" for verification results
 * - Keyboard navigation
 * - Focus visible indicators
 * - 4.5:1 contrast ratios
 * - Monospace fonts for hashes (better readability)
 *
 * @module mvc-editor/EvidenceTrailViewer
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  EvidenceTrailViewerProps,
  EvidenceTrailViewerState,
  MVCEditorTheme,
} from './types';
import {
  mergeTheme,
  applyOverlayOpacity,
  formatRelativeTime,
  getEvidenceTypeColor,
  truncateText,
} from './types';
import type { EvidenceEntry, EvidenceType } from '@holoscript/mvc-schema';

/**
 * EvidenceTrailViewer component
 */
export const EvidenceTrailViewer: React.FC<EvidenceTrailViewerProps> = ({
  evidenceTrail,
  onSelectEntry,
  onVerify,
  showCryptoDetails = false,
  showSignatures = true,
  filterType = 'all',
  maxEntries = 100,
  highlightBrokenLinks = true,
  displayMode = 'full',
  theme: themeOverride,
  className = '',
  style,
  ariaLabel = 'Evidence Trail Viewer',
  disabled = false,
}) => {
  const theme = mergeTheme(themeOverride);

  // State
  const [state, setState] = useState<EvidenceTrailViewerState>({
    selectedSequence: null,
    filterType,
    searchQuery: '',
    viewMode: 'chain',
    verificationResult: evidenceTrail.lastVerification || null,
    isVerifying: false,
    showHashDetails: showCryptoDetails,
  });

  // Filtered entries
  const filteredEntries = useMemo(() => {
    let entries = [...evidenceTrail.entries];

    // Filter by type
    if (state.filterType !== 'all') {
      entries = entries.filter((e) => e.type === state.filterType);
    }

    // Filter by search query
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.content.toLowerCase().includes(query) ||
          e.source?.toLowerCase().includes(query)
      );
    }

    // Limit
    return entries.slice(-maxEntries);
  }, [evidenceTrail.entries, state.filterType, state.searchQuery, maxEntries]);

  // Broken links (from verification result)
  const brokenLinks = useMemo(() => {
    return new Set(state.verificationResult?.brokenLinks || []);
  }, [state.verificationResult]);

  // Invalid signatures
  const invalidSignatures = useMemo(() => {
    return new Set(state.verificationResult?.invalidSignatures || []);
  }, [state.verificationResult]);

  // Handlers
  const handleSelectEntry = useCallback(
    (sequence: number) => {
      setState((prev) => ({
        ...prev,
        selectedSequence: prev.selectedSequence === sequence ? null : sequence,
      }));
      onSelectEntry?.(sequence);
    },
    [onSelectEntry]
  );

  const handleVerify = useCallback(async () => {
    if (onVerify && !state.isVerifying) {
      setState((prev) => ({ ...prev, isVerifying: true }));
      try {
        const result = await onVerify();
        setState((prev) => ({ ...prev, verificationResult: result, isVerifying: false }));
      } catch (error) {
        setState((prev) => ({ ...prev, isVerifying: false }));
      }
    }
  }, [onVerify, state.isVerifying]);

  const handleFilterChange = useCallback((filterType: EvidenceType | 'all') => {
    setState((prev) => ({ ...prev, filterType }));
  }, []);

  const handleSearchChange = useCallback((searchQuery: string) => {
    setState((prev) => ({ ...prev, searchQuery }));
  }, []);

  const handleViewModeChange = useCallback((viewMode: 'chain' | 'list' | 'graph') => {
    setState((prev) => ({ ...prev, viewMode }));
  }, []);

  const handleToggleHashDetails = useCallback(() => {
    setState((prev) => ({ ...prev, showHashDetails: !prev.showHashDetails }));
  }, []);

  // Format hash (truncate for display)
  const formatHash = useCallback((hash: string, full: boolean = false): string => {
    if (full || state.showHashDetails) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  }, [state.showHashDetails]);

  // Check if entry has broken link
  const hasBrokenLink = useCallback(
    (sequence: number): boolean => {
      return highlightBrokenLinks && brokenLinks.has(sequence);
    },
    [highlightBrokenLinks, brokenLinks]
  );

  // Check if entry has invalid signature
  const hasInvalidSignature = useCallback(
    (sequence: number): boolean => {
      return showSignatures && invalidSignatures.has(sequence);
    },
    [showSignatures, invalidSignatures]
  );

  // Compact mode
  if (displayMode === 'compact') {
    return (
      <div
        className={`evidence-trail-viewer-compact ${className}`}
        style={{
          ...style,
          padding: theme.panelSpacing / 2,
          backgroundColor: applyOverlayOpacity(theme.backgroundColor, theme.overlayOpacity),
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          fontSize: theme.baseFontSize,
        }}
        role="region"
        aria-label={ariaLabel}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: theme.textColor, fontWeight: 600 }}>Evidence:</span>
          <span style={{ color: theme.primaryColor }}>
            {filteredEntries.length} entries
          </span>
          {state.verificationResult && (
            <span
              style={{
                color: state.verificationResult.valid ? theme.successColor : theme.errorColor,
              }}
            >
              • {state.verificationResult.valid ? 'Verified' : 'Invalid'}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full mode
  return (
    <div
      className={`evidence-trail-viewer ${className}`}
      style={{
        ...style,
        padding: theme.panelSpacing,
        backgroundColor: applyOverlayOpacity(theme.backgroundColor, theme.overlayOpacity),
        borderRadius: theme.borderRadius,
        fontFamily: theme.fontFamily,
        fontSize: theme.baseFontSize,
        color: theme.textColor,
      }}
      role="region"
      aria-label={ariaLabel}
    >
      {/* Header */}
      <div style={{ marginBottom: theme.panelSpacing }}>
        <h2 style={{ margin: 0, fontSize: theme.baseFontSize + 6, fontWeight: 700 }}>
          Evidence Trail (VCP v{evidenceTrail.vcpMetadata.version})
        </h2>
        <p style={{ margin: '8px 0 0', color: theme.disabledColor, fontSize: theme.baseFontSize - 2 }}>
          {filteredEntries.length} entries • Hash: {evidenceTrail.vcpMetadata.hashAlgorithm} • Last
          updated {formatRelativeTime(evidenceTrail.lastUpdated)}
        </p>
      </div>

      {/* Verification Status */}
      {state.verificationResult && (
        <div
          role="status"
          style={{
            padding: theme.panelSpacing,
            backgroundColor: applyOverlayOpacity(
              state.verificationResult.valid ? theme.successColor : theme.errorColor,
              0.2
            ),
            border: `2px solid ${
              state.verificationResult.valid ? theme.successColor : theme.errorColor
            }`,
            borderRadius: theme.borderRadius,
            marginBottom: theme.panelSpacing,
          }}
          aria-live="polite"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: theme.baseFontSize + 2,
                  fontWeight: 600,
                  color: state.verificationResult.valid ? theme.successColor : theme.errorColor,
                }}
              >
                {state.verificationResult.valid ? '✓ Chain Verified' : '✗ Chain Invalid'}
              </h3>
              <p style={{ margin: 0, fontSize: theme.baseFontSize - 1 }}>
                Verified {state.verificationResult.entriesVerified} entries •{' '}
                {formatRelativeTime(state.verificationResult.verifiedAt)}
              </p>
              {!state.verificationResult.valid && (
                <p
                  style={{
                    margin: '8px 0 0',
                    color: theme.errorColor,
                    fontSize: theme.baseFontSize - 1,
                  }}
                >
                  {state.verificationResult.brokenLinks.length} broken links •{' '}
                  {state.verificationResult.invalidSignatures.length} invalid signatures
                </p>
              )}
              {state.verificationResult.error && (
                <p
                  style={{
                    margin: '8px 0 0',
                    color: theme.errorColor,
                    fontSize: theme.baseFontSize - 2,
                    fontFamily: 'monospace',
                  }}
                >
                  Error: {state.verificationResult.error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: theme.panelSpacing / 2,
          marginBottom: theme.panelSpacing,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <input
          type="text"
          placeholder="Search evidence..."
          value={state.searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          disabled={disabled}
          style={{
            flex: '1 1 200px',
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Search evidence"
        />

        {/* Filter by type */}
        <select
          value={state.filterType}
          onChange={(e) => handleFilterChange(e.target.value as EvidenceType | 'all')}
          disabled={disabled}
          style={{
            padding: '8px 12px',
            backgroundColor: applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize,
          }}
          aria-label="Filter by type"
        >
          <option value="all">All Types</option>
          <option value="observation">Observation</option>
          <option value="action">Action</option>
          <option value="reasoning">Reasoning</option>
          <option value="external_data">External Data</option>
          <option value="credential">Credential</option>
          <option value="attestation">Attestation</option>
          <option value="measurement">Measurement</option>
        </select>

        {/* Toggle Hash Details */}
        <button
          onClick={handleToggleHashDetails}
          disabled={disabled}
          style={{
            padding: '8px 12px',
            backgroundColor: state.showHashDetails
              ? theme.primaryColor
              : applyOverlayOpacity(theme.borderColor, 0.5),
            border: `1px solid ${theme.borderColor}`,
            borderRadius: theme.borderRadius / 2,
            color: theme.textColor,
            fontSize: theme.baseFontSize - 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          aria-label="Toggle hash details"
          aria-pressed={state.showHashDetails}
        >
          {state.showHashDetails ? 'Hide' : 'Show'} Hashes
        </button>

        {/* Verify Button */}
        {onVerify && (
          <button
            onClick={handleVerify}
            disabled={disabled || state.isVerifying}
            style={{
              marginLeft: 'auto',
              padding: '8px 16px',
              backgroundColor: theme.successColor,
              border: 'none',
              borderRadius: theme.borderRadius / 2,
              color: theme.textColor,
              fontSize: theme.baseFontSize,
              fontWeight: 600,
              cursor: disabled || state.isVerifying ? 'not-allowed' : 'pointer',
            }}
            aria-label="Verify chain"
          >
            {state.isVerifying ? 'Verifying...' : '🔒 Verify Chain'}
          </button>
        )}
      </div>

      {/* Evidence Entries */}
      <div
        role="log"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.panelSpacing / 2,
          maxHeight: displayMode === 'overlay' ? '400px' : 'none',
          overflowY: 'auto',
        }}
      >
        {filteredEntries.length === 0 ? (
          <div
            style={{
              padding: theme.panelSpacing * 2,
              textAlign: 'center',
              color: theme.disabledColor,
            }}
          >
            No evidence entries found
          </div>
        ) : (
          filteredEntries.map((entry, index) => {
            const isBroken = hasBrokenLink(entry.sequence);
            const hasInvalidSig = hasInvalidSignature(entry.sequence);
            const isGenesis = entry.previousHash === null;

            return (
              <div
                key={entry.sequence}
                tabIndex={0}
                onClick={() => handleSelectEntry(entry.sequence)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectEntry(entry.sequence);
                  }
                }}
                style={{
                  padding: theme.panelSpacing,
                  backgroundColor: applyOverlayOpacity(
                    isBroken || hasInvalidSig
                      ? theme.errorColor
                      : state.selectedSequence === entry.sequence
                      ? theme.primaryColor
                      : theme.borderColor,
                    isBroken || hasInvalidSig ? 0.2 : state.selectedSequence === entry.sequence ? 0.3 : 0.5
                  ),
                  border: `2px solid ${
                    isBroken || hasInvalidSig
                      ? theme.errorColor
                      : state.selectedSequence === entry.sequence
                      ? theme.primaryColor
                      : 'transparent'
                  }`,
                  borderRadius: theme.borderRadius,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                aria-selected={state.selectedSequence === entry.sequence}
              >
                {/* Entry Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  {/* Sequence Number */}
                  <span
                    style={{
                      padding: '4px 8px',
                      backgroundColor: theme.disabledColor,
                      borderRadius: theme.borderRadius / 2,
                      fontSize: theme.baseFontSize - 3,
                      fontWeight: 600,
                      fontFamily: 'monospace',
                    }}
                  >
                    #{entry.sequence}
                  </span>

                  {/* Type Badge */}
                  <span
                    style={{
                      padding: '4px 8px',
                      backgroundColor: getEvidenceTypeColor(entry.type, theme),
                      borderRadius: theme.borderRadius / 2,
                      fontSize: theme.baseFontSize - 4,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                    }}
                  >
                    {entry.type}
                  </span>

                  {/* Genesis Badge */}
                  {isGenesis && (
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme.secondaryColor,
                        borderRadius: theme.borderRadius / 2,
                        fontSize: theme.baseFontSize - 4,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      Genesis
                    </span>
                  )}

                  {/* Broken Link Badge */}
                  {isBroken && (
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme.errorColor,
                        borderRadius: theme.borderRadius / 2,
                        fontSize: theme.baseFontSize - 4,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      ⚠ Broken Link
                    </span>
                  )}

                  {/* Invalid Signature Badge */}
                  {hasInvalidSig && (
                    <span
                      style={{
                        padding: '4px 8px',
                        backgroundColor: theme.errorColor,
                        borderRadius: theme.borderRadius / 2,
                        fontSize: theme.baseFontSize - 4,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      ⚠ Invalid Signature
                    </span>
                  )}

                  {/* Timestamp */}
                  <span
                    style={{
                      marginLeft: 'auto',
                      color: theme.disabledColor,
                      fontSize: theme.baseFontSize - 2,
                    }}
                  >
                    {formatRelativeTime(entry.timestamp)}
                  </span>

                  {/* Confidence Score */}
                  {entry.confidence !== undefined && (
                    <span
                      style={{
                        color: theme.disabledColor,
                        fontSize: theme.baseFontSize - 2,
                      }}
                    >
                      {Math.round(entry.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* Content */}
                <p style={{ margin: '0 0 8px', fontSize: theme.baseFontSize, fontWeight: 400 }}>
                  {entry.content}
                </p>

                {/* Source */}
                {entry.source && (
                  <p
                    style={{
                      margin: 0,
                      color: theme.disabledColor,
                      fontSize: theme.baseFontSize - 2,
                    }}
                  >
                    Source: {entry.source}
                  </p>
                )}

                {/* Hash Chain Link */}
                {state.showHashDetails && (
                  <div
                    style={{
                      marginTop: theme.panelSpacing / 2,
                      padding: theme.panelSpacing / 2,
                      backgroundColor: applyOverlayOpacity(theme.borderColor, 0.3),
                      borderRadius: theme.borderRadius / 2,
                      fontSize: theme.baseFontSize - 3,
                      fontFamily: 'monospace',
                    }}
                  >
                    <div style={{ marginBottom: 4 }}>
                      <span style={{ color: theme.disabledColor }}>Hash: </span>
                      <span style={{ color: theme.successColor, wordBreak: 'break-all' }}>
                        {formatHash(entry.hash, true)}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: theme.disabledColor }}>Previous: </span>
                      <span
                        style={{
                          color: isBroken ? theme.errorColor : theme.textColor,
                          wordBreak: 'break-all',
                        }}
                      >
                        {entry.previousHash ? formatHash(entry.previousHash, true) : 'null (genesis)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {state.selectedSequence === entry.sequence && (
                  <div
                    style={{
                      marginTop: theme.panelSpacing,
                      paddingTop: theme.panelSpacing,
                      borderTop: `1px solid ${theme.borderColor}`,
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
                      <span style={{ color: theme.disabledColor }}>Agent DID:</span>
                      <span
                        style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}
                      >
                        {truncateText(entry.agentDid, 50)}
                      </span>

                      {entry.relatedTo && (
                        <>
                          <span style={{ color: theme.disabledColor }}>Related To:</span>
                          <span
                            style={{ fontFamily: 'monospace', fontSize: theme.baseFontSize - 2 }}
                          >
                            {entry.relatedTo}
                          </span>
                        </>
                      )}

                      {entry.signature && showSignatures && (
                        <>
                          <span style={{ color: theme.disabledColor }}>Signature:</span>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: theme.baseFontSize - 3,
                              wordBreak: 'break-all',
                              color: hasInvalidSig ? theme.errorColor : theme.successColor,
                            }}
                          >
                            {truncateText(entry.signature, 60)}
                          </span>
                        </>
                      )}

                      <span style={{ color: theme.disabledColor }}>Timestamp:</span>
                      <span style={{ fontSize: theme.baseFontSize - 2 }}>
                        {new Date(entry.timestamp).toISOString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EvidenceTrailViewer;
