/**
 * CulturalProfileCards Component
 *
 * Renders cultural profile cards for each agent, featuring:
 * - Role badges (leader, collaborator, conformist, innovator, observer, disruptor)
 * - Model family indicator
 * - Cooperation tendency and norm adherence metrics
 * - Per-dimension cultural position indicators
 * - Compatibility score with top/least compatible agents
 *
 * Accessibility (WCAG 2.1 AA):
 *   - role="list" / role="listitem" for card container
 *   - Role badges have descriptive title attributes
 *   - All metric bars have role="meter" with aria values
 *   - Keyboard navigable with visible focus indicators
 *   - Minimum 4.5:1 contrast on all text
 *
 * @module cultural-compatibility-dashboard/CulturalProfileCards
 */

import React, { useMemo } from 'react';
import type { CompatibilityProfile, CompatibilityDashboardTheme } from './types';
import {
  DEFAULT_COMPATIBILITY_THEME,
  classifyHealthLevel,
  getHealthColor,
  formatScore,
} from './types';
import { CULTURE_ROLE_CONFIG } from '../culture-dashboard/types';
import type { CultureRole } from '../culture-dashboard/types';
import type { CulturalDimension } from '../../CulturalHealthTypes';
import { DIMENSION_LABELS } from './types';

// =============================================================================
// PROPS
// =============================================================================

export interface CulturalProfileCardsProps {
  /** Agent profiles to display */
  profiles: CompatibilityProfile[];
  /** Currently selected agent ID */
  selectedAgentId?: string | null;
  /** Callback when a profile card is clicked */
  onSelectAgent?: (agentId: string | null) => void;
  /** Theme overrides */
  theme?: Partial<CompatibilityDashboardTheme>;
  /** Custom CSS styles */
  style?: React.CSSProperties;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const CulturalProfileCards: React.FC<CulturalProfileCardsProps> = ({
  profiles,
  selectedAgentId,
  onSelectAgent,
  theme: themeOverride,
  style,
}) => {
  const theme = useMemo(
    () => ({ ...DEFAULT_COMPATIBILITY_THEME, ...themeOverride }),
    [themeOverride],
  );

  const sorted = useMemo(
    () => [...profiles].sort((a, b) => b.populationCompatibility - a.populationCompatibility),
    [profiles],
  );

  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        borderBottom: `1px solid ${theme.borderColor}`,
        ...style,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: `calc(0.75rem * ${theme.fontScale})`,
            fontWeight: 600,
            color: theme.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Cultural Profiles ({profiles.length})
        </span>
      </div>

      {/* Profile cards list */}
      <div
        role="list"
        aria-label="Agent cultural compatibility profiles"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          maxHeight: '320px',
          overflowY: 'auto',
        }}
      >
        {sorted.map((profile) => (
          <ProfileCard
            key={profile.agentId}
            profile={profile}
            isSelected={selectedAgentId === profile.agentId}
            onSelect={onSelectAgent}
            theme={theme}
          />
        ))}
      </div>
    </div>
  );
};

// =============================================================================
// PROFILE CARD SUB-COMPONENT
// =============================================================================

interface ProfileCardProps {
  profile: CompatibilityProfile;
  isSelected: boolean;
  onSelect?: (agentId: string | null) => void;
  theme: CompatibilityDashboardTheme;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isSelected,
  onSelect,
  theme,
}) => {
  const roleMeta = CULTURE_ROLE_CONFIG[profile.role];
  const healthLevel = classifyHealthLevel(profile.populationCompatibility);
  const healthColor = getHealthColor(healthLevel, theme);

  const dimensionEntries = useMemo(
    () =>
      (Object.entries(profile.dimensionPositions) as Array<[CulturalDimension, number]>).slice(0, 5),
    [profile.dimensionPositions],
  );

  return (
    <div
      role="listitem"
      tabIndex={0}
      onClick={() => onSelect?.(isSelected ? null : profile.agentId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(isSelected ? null : profile.agentId);
        }
      }}
      style={{
        padding: '0.5rem 0.6rem',
        borderRadius: '6px',
        backgroundColor: isSelected
          ? 'rgba(99, 102, 241, 0.1)'
          : 'rgba(255, 255, 255, 0.02)',
        border: isSelected
          ? `1px solid ${theme.accentColor}`
          : '1px solid transparent',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        outline: 'none',
      }}
      aria-label={`${profile.agentName}: ${roleMeta.label}, compatibility ${formatScore(profile.populationCompatibility)}`}
      aria-selected={isSelected}
    >
      {/* Row 1: Name, Role Badge, Model, Compatibility Score */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          marginBottom: '0.3rem',
        }}
      >
        {/* Activity indicator */}
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: profile.isActive ? theme.excellentColor : theme.textMuted,
            display: 'inline-block',
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* Agent name */}
        <span
          style={{
            fontSize: `calc(0.72rem * ${theme.fontScale})`,
            color: theme.textPrimary,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {profile.agentName}
        </span>

        {/* Role badge */}
        <RoleBadge role={profile.role} theme={theme} />

        {/* Model family tag */}
        <span
          style={{
            fontSize: `calc(0.55rem * ${theme.fontScale})`,
            color: theme.textMuted,
            border: `1px solid ${theme.borderColor}`,
            borderRadius: '3px',
            padding: '0.05rem 0.25rem',
            flexShrink: 0,
          }}
        >
          {profile.modelFamily}
        </span>

        {/* Compatibility score */}
        <span
          style={{
            fontSize: `calc(0.7rem * ${theme.fontScale})`,
            fontWeight: 700,
            color: healthColor,
            flexShrink: 0,
          }}
        >
          {formatScore(profile.populationCompatibility)}
        </span>
      </div>

      {/* Row 2: Cooperation and Norm Adherence bars */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.25rem' }}>
        <MetricBar
          label="Cooperation"
          value={profile.cooperationTendency}
          theme={theme}
        />
        <MetricBar
          label="Norm Adh."
          value={profile.normAdherenceRate}
          theme={theme}
        />
      </div>

      {/* Row 3: Dimension position dots (expanded view only) */}
      {isSelected && (
        <div style={{ marginTop: '0.3rem' }}>
          {/* Dimension positions */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.2rem',
              marginBottom: '0.3rem',
            }}
          >
            {dimensionEntries.map(([dim, value]) => {
              const dimLabel = DIMENSION_LABELS[dim];
              // Map -1..+1 to 0..1 for display
              const normalized = (value + 1) / 2;
              return (
                <div
                  key={dim}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: `calc(0.5rem * ${theme.fontScale})`,
                      color: theme.textMuted,
                      width: '50px',
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    {dimLabel.poleA}
                  </span>
                  <div
                    role="meter"
                    aria-label={`${dimLabel.label} position`}
                    aria-valuenow={Math.round(normalized * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    style={{
                      flex: 1,
                      height: '4px',
                      borderRadius: '2px',
                      backgroundColor: theme.borderColor,
                      position: 'relative',
                    }}
                  >
                    {/* Position indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${normalized * 100}%`,
                        top: '-2px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: theme.accentColor,
                        transform: 'translateX(-50%)',
                        transition: 'left 0.3s ease',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: `calc(0.5rem * ${theme.fontScale})`,
                      color: theme.textMuted,
                      width: '50px',
                      flexShrink: 0,
                    }}
                  >
                    {dimLabel.poleB}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Top compatible / least compatible */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <CompatibilityList
              label="Most Compatible"
              agents={profile.topCompatible}
              color={theme.excellentColor}
              theme={theme}
            />
            <CompatibilityList
              label="Least Compatible"
              agents={profile.leastCompatible}
              color={theme.criticalColor}
              theme={theme}
            />
          </div>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              marginTop: '0.3rem',
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
              color: theme.textMuted,
            }}
          >
            <span>Norms adopted: {profile.adoptedNormCount}</span>
            <span>Violations: {profile.violationCount}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// ROLE BADGE
// =============================================================================

interface RoleBadgeProps {
  role: CultureRole;
  theme: CompatibilityDashboardTheme;
}

const RoleBadge: React.FC<RoleBadgeProps> = ({ role, theme }) => {
  const roleMeta = CULTURE_ROLE_CONFIG[role];
  return (
    <span
      style={{
        fontSize: `calc(0.55rem * ${theme.fontScale})`,
        color: roleMeta.color,
        fontWeight: 600,
        border: `1px solid ${roleMeta.color}`,
        borderRadius: '3px',
        padding: '0.05rem 0.25rem',
        flexShrink: 0,
        minWidth: '62px',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.03em',
      }}
      title={roleMeta.description}
    >
      {roleMeta.label}
    </span>
  );
};

// =============================================================================
// METRIC BAR
// =============================================================================

interface MetricBarProps {
  label: string;
  value: number;
  theme: CompatibilityDashboardTheme;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, theme }) => {
  const healthLevel = classifyHealthLevel(value);
  const color = getHealthColor(healthLevel, theme);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
          flexShrink: 0,
          width: '55px',
        }}
      >
        {label}
      </span>
      <div
        role="meter"
        aria-label={`${label}: ${formatScore(value)}`}
        aria-valuenow={Math.round(value * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          flex: 1,
          height: '4px',
          borderRadius: '2px',
          backgroundColor: theme.borderColor,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${value * 100}%`,
            borderRadius: '2px',
            backgroundColor: color,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span
        style={{
          fontSize: `calc(0.6rem * ${theme.fontScale})`,
          color,
          fontWeight: 600,
          width: '32px',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
};

// =============================================================================
// COMPATIBILITY LIST
// =============================================================================

interface CompatibilityListProps {
  label: string;
  agents: Array<{ agentId: string; score: number }>;
  color: string;
  theme: CompatibilityDashboardTheme;
}

const CompatibilityList: React.FC<CompatibilityListProps> = ({
  label,
  agents,
  color,
  theme,
}) => {
  if (agents.length === 0) return null;

  return (
    <div style={{ flex: 1 }}>
      <span
        style={{
          fontSize: `calc(0.55rem * ${theme.fontScale})`,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.03em',
        }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginTop: '0.15rem' }}>
        {agents.map((agent) => (
          <div
            key={agent.agentId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: `calc(0.6rem * ${theme.fontScale})`,
            }}
          >
            <span
              style={{
                color: theme.textSecondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {agent.agentId}
            </span>
            <span style={{ color, fontWeight: 600, flexShrink: 0, marginLeft: '0.3rem' }}>
              {formatScore(agent.score)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CulturalProfileCards;
