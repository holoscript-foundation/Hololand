/**
 * AgentCard Component
 *
 * Displays a summary card for a single ANS agent in the discovery dashboard.
 * Combines trust tier badge, DID verification status, capability tags,
 * reputation sparkline, and key metrics in a compact card layout.
 *
 * Features:
 * - Trust tier badge with score percentage
 * - DID verification status indicator
 * - Reputation trend sparkline (30-day)
 * - Capability category icons
 * - Online status indicator
 * - Endorsement count
 * - Time since last active
 * - Expandable detail view
 * - Accessible card with keyboard navigation
 *
 * @module agent-discovery/AgentCard
 */

import React, { useMemo, useState } from 'react';
import type { ANSAgentRecord, TrustTier } from './ansTypes';
import { TRUST_TIER_CONFIG, CAPABILITY_CATEGORY_CONFIG, DID_STATUS_CONFIG } from './ansTypes';
import { DIDVerificationBadge } from './DIDVerificationBadge';
import { ReputationTrendGraph } from './ReputationTrendGraph';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentCardProps {
  /** The agent record to display */
  agent: ANSAgentRecord;
  /** Whether to show the expanded detail view */
  expanded?: boolean;
  /** Callback when the card is clicked */
  onClick?: (agentId: string) => void;
  /** Callback when "View Details" is clicked */
  onViewDetails?: (agentId: string) => void;
  /** Custom CSS class name */
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(1)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

// =============================================================================
// COMPONENT
// =============================================================================

export const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  expanded: initialExpanded = false,
  onClick,
  onViewDetails,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const tierConfig = TRUST_TIER_CONFIG[agent.trustTier];
  const didStatusConfig = DID_STATUS_CONFIG[agent.did.status];

  // Get unique capability categories
  const capabilityCategories = useMemo(() => {
    const cats = new Set(agent.capabilities.map((c) => c.category));
    return Array.from(cats);
  }, [agent.capabilities]);

  const activeCapCount = useMemo(
    () => agent.capabilities.filter((c) => c.active).length,
    [agent.capabilities],
  );

  const handleCardClick = () => {
    onClick?.(agent.agentId);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDetails) {
      onViewDetails(agent.agentId);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={className}
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        border: `1px solid ${tierConfig.borderColor}60`,
        borderRadius: '10px',
        backgroundColor: '#fff',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s, border-color 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      role="article"
      aria-label={`Agent: ${agent.displayName}, Trust tier ${agent.trustTier}, ${agent.online ? 'Online' : 'Offline'}`}
      onClick={handleCardClick}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      } : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Card Header */}
      <div
        style={{
          padding: '0.75rem 0.85rem 0.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.6rem',
        }}
      >
        {/* Avatar Placeholder */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: `${tierConfig.color}18`,
            border: `2px solid ${tierConfig.color}40`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '1rem',
            position: 'relative',
          }}
          aria-hidden="true"
        >
          <span style={{ color: tierConfig.color, fontWeight: 700, fontSize: '0.8rem' }}>
            {agent.displayName.charAt(0)}
          </span>

          {/* Online indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '-1px',
              right: '-1px',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: agent.online ? '#059669' : '#9CA3AF',
              border: '2px solid #fff',
            }}
            title={agent.online ? 'Online' : 'Offline'}
            aria-label={agent.online ? 'Online' : 'Offline'}
          />
        </div>

        {/* Name and ANS */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1a1a2e' }}>
              {agent.displayName}
            </span>

            {/* Trust Tier Badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.15rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '999px',
                backgroundColor: tierConfig.backgroundColor,
                border: `1px solid ${tierConfig.borderColor}`,
                color: tierConfig.color,
                fontSize: '0.62rem',
                fontWeight: 700,
              }}
              title={tierConfig.description}
            >
              <span aria-hidden="true">{tierConfig.icon}</span>
              {agent.trustTier}
            </span>
          </div>

          {/* ANS Name */}
          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.1rem' }}>
            {agent.ansName}
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: tierConfig.color,
              lineHeight: 1,
            }}
          >
            {(agent.trustScore * 100).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.55rem', color: '#9ca3af', fontWeight: 600 }}>
            TRUST
          </div>
        </div>
      </div>

      {/* Description */}
      <div
        style={{
          padding: '0 0.85rem 0.5rem',
          fontSize: '0.72rem',
          color: '#6b7280',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {agent.description}
      </div>

      {/* DID + Reputation Row */}
      <div
        style={{
          padding: '0 0.85rem 0.5rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'stretch',
        }}
      >
        {/* DID Status (compact) */}
        <div style={{ flex: '0 0 auto' }}>
          <DIDVerificationBadge verification={agent.did} compact />
        </div>

        {/* Reputation Sparkline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ReputationTrendGraph
            trend={agent.reputation}
            width={160}
            height={40}
            showSummary={false}
            showTooltip={false}
            mode="sparkline"
          />
        </div>
      </div>

      {/* Capability Category Icons + Metrics */}
      <div
        style={{
          padding: '0.4rem 0.85rem',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Capability Categories */}
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {capabilityCategories.map((cat) => {
            const meta = CAPABILITY_CATEGORY_CONFIG[cat];
            return (
              <span
                key={cat}
                title={`${meta.label}: ${meta.description}`}
                aria-label={meta.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '22px',
                  height: '22px',
                  borderRadius: '4px',
                  backgroundColor: `${meta.color}12`,
                  fontSize: '0.7rem',
                }}
              >
                {meta.icon}
              </span>
            );
          })}
          <span style={{ fontSize: '0.6rem', color: '#9ca3af', marginLeft: '0.15rem' }}>
            {activeCapCount}/{agent.capabilities.length}
          </span>
        </div>

        {/* Quick Metrics */}
        <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.62rem', color: '#9ca3af' }}>
          <span title="Endorsements">
            {'\u2605'} {formatNumber(agent.endorsements)}
          </span>
          <span title="Interactions">
            {'\u21C4'} {formatNumber(agent.interactionsCompleted)}
          </span>
          <span title="Last active">
            {formatTimeAgo(agent.lastActiveAt)}
          </span>
        </div>
      </div>

      {/* Expanded Detail View */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid #e0e0e0',
            padding: '0.75rem 0.85rem',
            backgroundColor: '#fafafa',
          }}
        >
          {/* Tags */}
          <div style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.3rem' }}>
              Tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
              {agent.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    fontSize: '0.62rem',
                    fontWeight: 500,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* DID Full View */}
          <div style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.3rem' }}>
              DID Verification
            </div>
            <DIDVerificationBadge verification={agent.did} expandable={true} />
          </div>

          {/* Reputation Trend (full) */}
          <div style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.3rem' }}>
              Reputation Trend (30 days)
            </div>
            <ReputationTrendGraph
              trend={agent.reputation}
              width={340}
              height={120}
              showBands
              showSummary
              showTooltip
              mode="chart"
            />
          </div>

          {/* Capabilities List */}
          <div>
            <div style={{ fontSize: '0.62rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '0.3rem' }}>
              Capabilities ({activeCapCount} active / {agent.capabilities.length} total)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {agent.capabilities.map((cap) => {
                const catMeta = CAPABILITY_CATEGORY_CONFIG[cap.category];
                return (
                  <div
                    key={cap.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.25rem 0.4rem',
                      borderRadius: '4px',
                      backgroundColor: cap.active ? `${catMeta.color}08` : '#f9fafb',
                      opacity: cap.active ? 1 : 0.5,
                    }}
                  >
                    <span style={{ fontSize: '0.65rem' }} aria-hidden="true">{catMeta.icon}</span>
                    <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: cap.active ? 500 : 400, color: '#374151' }}>
                      {cap.name}
                    </span>
                    <span style={{ fontSize: '0.58rem', color: '#9ca3af' }}>
                      v{cap.version}
                    </span>
                    {cap.active && (
                      <span style={{ fontSize: '0.58rem', color: catMeta.color, fontWeight: 600 }}>
                        {(cap.successRate * 100).toFixed(0)}%
                      </span>
                    )}
                    {!cap.active && (
                      <span style={{ fontSize: '0.58rem', color: '#d1d5db' }}>
                        {cap.requiredTier}+
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.4rem',
              marginTop: '0.6rem',
              padding: '0.5rem',
              backgroundColor: '#fff',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
            }}
          >
            <StatBox label="Worlds" value={agent.worldsJoined} />
            <StatBox label="Interactions" value={agent.interactionsCompleted} />
            <StatBox label="Endorsements" value={agent.endorsements} />
            <StatBox label="Transitions" value={agent.reputation.totalTransitions} />
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div
        style={{
          padding: '0.4rem 0.85rem',
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <button
          onClick={handleViewDetails}
          style={{
            background: 'none',
            border: 'none',
            color: '#2563EB',
            fontSize: '0.7rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? 'Collapse' : 'View Details'}
        </button>

        {/* Trend indicator */}
        <ReputationTrendGraph
          trend={agent.reputation}
          width={60}
          height={16}
          showSummary={false}
          showTooltip={false}
          showBands={false}
          mode="sparkline"
        />
      </div>
    </div>
  );
};

// =============================================================================
// STAT BOX SUB-COMPONENT
// =============================================================================

interface StatBoxProps {
  label: string;
  value: number;
}

const StatBox: React.FC<StatBoxProps> = ({ label, value }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a1a2e' }}>
      {formatNumber(value)}
    </div>
    <div style={{ fontSize: '0.55rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
      {label}
    </div>
  </div>
);

export default AgentCard;
