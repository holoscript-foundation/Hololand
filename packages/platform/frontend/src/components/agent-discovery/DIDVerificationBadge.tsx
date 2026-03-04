/**
 * DIDVerificationBadge Component
 *
 * Displays the DID verification status of an agent with visual indicators.
 * Shows the DID method, verification status, and optional expandable details
 * including the full DID string, verifier, and expiration information.
 *
 * Features:
 * - Color-coded status badge (verified, pending, expired, revoked, unverified)
 * - DID method label (did:key, did:web, did:ethr, did:ion, did:pkh)
 * - Expandable detail panel with full DID, verifier, expiration
 * - Compact and full display modes
 * - Accessible status announcements
 *
 * @module agent-discovery/DIDVerificationBadge
 */

import React, { useState, useMemo } from 'react';
import type { DIDVerification } from './ansTypes';
import { DID_STATUS_CONFIG } from './ansTypes';

// =============================================================================
// TYPES
// =============================================================================

export interface DIDVerificationBadgeProps {
  /** DID verification details */
  verification: DIDVerification;
  /** Whether to show in compact mode (badge only) or full mode (with details) */
  compact?: boolean;
  /** Whether to allow expanding to show full DID details */
  expandable?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Click handler */
  onClick?: (did: DIDVerification) => void;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDID(did: string): string {
  if (did.length <= 28) return did;
  return `${did.slice(0, 16)}...${did.slice(-8)}`;
}

function formatTimestamp(ts: number | null): string {
  if (ts === null) return 'N/A';
  const date = new Date(ts);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getExpirationLabel(expiresAt: number | null): { text: string; urgent: boolean } {
  if (expiresAt === null) return { text: 'No expiration', urgent: false };
  const now = Date.now();
  const diffMs = expiresAt - now;

  if (diffMs <= 0) return { text: 'Expired', urgent: true };

  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days === 0) return { text: 'Expires today', urgent: true };
  if (days === 1) return { text: 'Expires tomorrow', urgent: true };
  if (days <= 7) return { text: `Expires in ${days} days`, urgent: true };
  if (days <= 30) return { text: `Expires in ${days} days`, urgent: false };
  return { text: `Expires ${formatTimestamp(expiresAt)}`, urgent: false };
}

function getMethodLabel(method: string): string {
  switch (method) {
    case 'did:key': return 'Key';
    case 'did:web': return 'Web';
    case 'did:ethr': return 'Ethereum';
    case 'did:ion': return 'ION';
    case 'did:pkh': return 'PKH';
    default: return method.replace('did:', '');
  }
}

// =============================================================================
// COMPONENT
// =============================================================================

export const DIDVerificationBadge: React.FC<DIDVerificationBadgeProps> = ({
  verification,
  compact = false,
  expandable = true,
  className,
  onClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusConfig = DID_STATUS_CONFIG[verification.status];
  const expiration = useMemo(() => getExpirationLabel(verification.expiresAt), [verification.expiresAt]);

  const handleClick = () => {
    if (expandable && !compact) {
      setIsExpanded(!isExpanded);
    }
    onClick?.(verification);
  };

  const accessibleLabel = `DID ${verification.status}: ${getMethodLabel(verification.method)} method, ${verification.verificationCount} verifications`;

  // ---- Compact Mode ----
  if (compact) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.15rem 0.5rem',
          borderRadius: '999px',
          border: `1px solid ${statusConfig.color}40`,
          backgroundColor: `${statusConfig.color}10`,
          fontSize: '0.68rem',
          fontWeight: 600,
          color: statusConfig.color,
          cursor: onClick ? 'pointer' : 'default',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          whiteSpace: 'nowrap',
        }}
        role="status"
        aria-label={accessibleLabel}
        onClick={onClick ? () => onClick(verification) : undefined}
        title={`${statusConfig.label} - ${getMethodLabel(verification.method)}`}
      >
        <span aria-hidden="true">{statusConfig.icon}</span>
        {statusConfig.label}
      </span>
    );
  }

  // ---- Full Mode ----
  return (
    <div
      className={className}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: `1px solid ${statusConfig.color}30`,
        borderRadius: '8px',
        backgroundColor: '#fff',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
      role="region"
      aria-label={accessibleLabel}
    >
      {/* Main Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.6rem 0.75rem',
          cursor: expandable ? 'pointer' : 'default',
        }}
        onClick={handleClick}
        onKeyDown={expandable ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        } : undefined}
        tabIndex={expandable ? 0 : undefined}
        aria-expanded={expandable ? isExpanded : undefined}
      >
        {/* Status Icon */}
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: `${statusConfig.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '0.9rem',
          }}
          aria-hidden="true"
        >
          {statusConfig.icon}
        </div>

        {/* Status Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: statusConfig.color }}>
              {statusConfig.label}
            </span>
            <span
              style={{
                fontSize: '0.6rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '3px',
                backgroundColor: '#f3f4f6',
                color: '#6b7280',
                fontWeight: 500,
              }}
            >
              {getMethodLabel(verification.method)}
            </span>
            {verification.resolvable && (
              <span
                style={{
                  fontSize: '0.6rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '3px',
                  backgroundColor: '#ECFDF5',
                  color: '#059669',
                  fontWeight: 500,
                }}
              >
                Resolvable
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.15rem' }}>
            {formatDID(verification.did)}
          </div>
        </div>

        {/* Verification count */}
        <div
          style={{
            textAlign: 'right',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a2e' }}>
            {verification.verificationCount}
          </div>
          <div style={{ fontSize: '0.6rem', color: '#9ca3af' }}>
            {verification.verificationCount === 1 ? 'verification' : 'verifications'}
          </div>
        </div>

        {/* Expand indicator */}
        {expandable && (
          <span
            style={{
              fontSize: '0.65rem',
              color: '#9ca3af',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {'\u25B6'}
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          style={{
            padding: '0.5rem 0.75rem 0.75rem',
            borderTop: `1px solid ${statusConfig.color}15`,
            backgroundColor: '#fafafa',
          }}
        >
          {/* Detail Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              fontSize: '0.7rem',
            }}
          >
            <DetailRow label="Full DID" value={verification.did} monospace />
            <DetailRow label="Method" value={verification.method} />
            <DetailRow label="Verifier" value={verification.verifier} />
            <DetailRow
              label="Last Verified"
              value={formatTimestamp(verification.verifiedAt)}
            />
            <DetailRow
              label="Expiration"
              value={expiration.text}
              highlight={expiration.urgent}
            />
            <DetailRow
              label="Resolvable"
              value={verification.resolvable ? 'Yes' : 'No'}
              highlight={!verification.resolvable}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DETAIL ROW SUB-COMPONENT
// =============================================================================

interface DetailRowProps {
  label: string;
  value: string;
  monospace?: boolean;
  highlight?: boolean;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, monospace, highlight }) => (
  <div style={{ overflow: 'hidden' }}>
    <div style={{ color: '#9ca3af', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.1rem' }}>
      {label}
    </div>
    <div
      style={{
        color: highlight ? '#DC2626' : '#374151',
        fontSize: '0.7rem',
        fontFamily: monospace ? 'ui-monospace, monospace' : 'inherit',
        wordBreak: monospace ? 'break-all' : 'normal',
        fontWeight: highlight ? 600 : 400,
      }}
    >
      {value}
    </div>
  </div>
);

export default DIDVerificationBadge;
