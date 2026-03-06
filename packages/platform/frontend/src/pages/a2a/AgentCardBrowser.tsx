/**
 * A2A Agent Card Discovery Browser
 *
 * A visual interface for browsing, searching, and inspecting A2A Agent Cards.
 * Implements the Agent-to-Agent protocol's AgentCard specification for
 * capability discovery and agent interoperability.
 *
 * Features:
 * - Grid and list view layouts
 * - Full-text search across name, description, skills, and tags
 * - Filter by capabilities, provider, security type, and status
 * - Sortable by name, provider, skill count, and version
 * - Detailed agent inspection panel with skill and security info
 * - Status indicators (online/offline/unknown)
 * - Responsive layout
 * - WCAG 2.1 AA accessible
 *
 * Budget: 400KB max (lazy loaded)
 *
 * @see https://a2a-protocol.org/latest/specification/
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type {
  AgentCardWithStatus,
  AgentSkill,
  BrowserFilters,
  CapabilityFilter,
  SortField,
  SortDirection,
} from './types';
import { sampleAgents } from './sampleAgents';

// ============================================================
// Constants
// ============================================================

const CAPABILITY_LABELS: Record<CapabilityFilter, string> = {
  streaming: 'Streaming',
  pushNotifications: 'Push Notifications',
  extendedAgentCard: 'Extended Card',
};

const STATUS_CONFIG = {
  online: { color: '#22c55e', bg: '#f0fdf4', label: 'Online' },
  offline: { color: '#ef4444', bg: '#fef2f2', label: 'Offline' },
  unknown: { color: '#f59e0b', bg: '#fffbeb', label: 'Unknown' },
} as const;

const SORT_LABELS: Record<SortField, string> = {
  name: 'Name',
  provider: 'Provider',
  skills: 'Skill Count',
  version: 'Version',
};

const DEFAULT_FILTERS: BrowserFilters = {
  search: '',
  capabilities: [],
  providers: [],
  securityTypes: [],
  sortField: 'name',
  sortDirection: 'asc',
};

// ============================================================
// Utility Functions
// ============================================================

function matchesSearch(agent: AgentCardWithStatus, query: string): boolean {
  if (!query) return true;
  const lower = query.toLowerCase();
  return (
    agent.name.toLowerCase().includes(lower) ||
    agent.description.toLowerCase().includes(lower) ||
    agent.provider.name.toLowerCase().includes(lower) ||
    agent.skills.some(s => s.name.toLowerCase().includes(lower) || s.description.toLowerCase().includes(lower)) ||
    (agent.tags?.some(t => t.toLowerCase().includes(lower)) ?? false)
  );
}

function matchesCapabilities(agent: AgentCardWithStatus, caps: CapabilityFilter[]): boolean {
  if (caps.length === 0) return true;
  return caps.every(cap => agent.capabilities[cap]);
}

function matchesProviders(agent: AgentCardWithStatus, providers: string[]): boolean {
  if (providers.length === 0) return true;
  return providers.includes(agent.provider.name);
}

function matchesSecurityTypes(agent: AgentCardWithStatus, types: string[]): boolean {
  if (types.length === 0) return true;
  if (!agent.securitySchemes) return false;
  const agentTypes = Object.values(agent.securitySchemes).map(s => s.type);
  return types.some(t => agentTypes.includes(t));
}

function sortAgents(agents: AgentCardWithStatus[], field: SortField, dir: SortDirection): AgentCardWithStatus[] {
  const sorted = [...agents].sort((a, b) => {
    let cmp = 0;
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'provider':
        cmp = a.provider.name.localeCompare(b.provider.name);
        break;
      case 'skills':
        cmp = a.skills.length - b.skills.length;
        break;
      case 'version':
        cmp = a.version.localeCompare(b.version);
        break;
    }
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

function getUniqueProviders(agents: AgentCardWithStatus[]): string[] {
  return [...new Set(agents.map(a => a.provider.name))].sort();
}

function getUniqueSecurityTypes(agents: AgentCardWithStatus[]): string[] {
  const types = new Set<string>();
  agents.forEach(a => {
    if (a.securitySchemes) {
      Object.values(a.securitySchemes).forEach(s => types.add(s.type));
    }
  });
  return [...types].sort();
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  } catch {
    return 'N/A';
  }
}

// ============================================================
// Sub-Components
// ============================================================

/** Status badge showing online/offline/unknown */
const StatusBadge: React.FC<{ status: 'online' | 'offline' | 'unknown' }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      role="status"
      aria-label={`Agent is ${cfg.label.toLowerCase()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: cfg.color,
        backgroundColor: cfg.bg,
        border: `1px solid ${cfg.color}33`,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: cfg.color,
          display: 'inline-block',
        }}
      />
      {cfg.label}
    </span>
  );
};

/** Capability pill */
const CapabilityPill: React.FC<{ label: string; active: boolean }> = ({ label, active }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.7rem',
      fontWeight: 500,
      color: active ? '#1d4ed8' : '#9ca3af',
      backgroundColor: active ? '#dbeafe' : '#f3f4f6',
      border: `1px solid ${active ? '#93c5fd' : '#e5e7eb'}`,
      textDecoration: active ? 'none' : 'line-through',
    }}
  >
    {label}
  </span>
);

/** Skill list item within the detail panel */
const SkillItem: React.FC<{ skill: AgentSkill; index: number }> = ({ skill, index }) => (
  <div
    style={{
      padding: '12px 16px',
      borderBottom: '1px solid #f0f0f0',
      background: index % 2 === 0 ? '#fafafa' : '#ffffff',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
      <code
        style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#1e293b',
          backgroundColor: '#f1f5f9',
          padding: '2px 6px',
          borderRadius: '4px',
        }}
      >
        {skill.name}
      </code>
    </div>
    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
      {skill.description}
    </p>
    {skill.contentTypes && skill.contentTypes.length > 0 && (
      <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {skill.contentTypes.map(ct => (
          <span
            key={ct}
            style={{
              display: 'inline-block',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '0.65rem',
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              fontFamily: 'monospace',
            }}
          >
            {ct}
          </span>
        ))}
      </div>
    )}
  </div>
);

/** Tag display */
const TagBadge: React.FC<{ tag: string }> = ({ tag }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.7rem',
      fontWeight: 500,
      color: '#7c3aed',
      backgroundColor: '#f5f3ff',
      border: '1px solid #ddd6fe',
    }}
  >
    {tag}
  </span>
);

// ============================================================
// Agent Card Component (Grid Item)
// ============================================================

interface AgentCardItemProps {
  agent: AgentCardWithStatus;
  isSelected: boolean;
  viewMode: 'grid' | 'list';
  onSelect: (agent: AgentCardWithStatus) => void;
}

const AgentCardItem: React.FC<AgentCardItemProps> = ({ agent, isSelected, viewMode, onSelect }) => {
  const isGrid = viewMode === 'grid';

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`View details for ${agent.name}`}
      aria-selected={isSelected}
      onClick={() => onSelect(agent)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(agent);
        }
      }}
      style={{
        padding: isGrid ? '20px' : '16px 20px',
        border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
        borderRadius: '12px',
        background: isSelected ? '#eff6ff' : '#ffffff',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: isGrid ? 'flex' : 'flex',
        flexDirection: isGrid ? 'column' : 'row',
        gap: isGrid ? '12px' : '20px',
        alignItems: isGrid ? 'stretch' : 'center',
        outline: 'none',
        boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
      onFocus={(e) => {
        if (!isSelected) e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.5)';
      }}
      onBlur={(e) => {
        if (!isSelected) e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
      }}
    >
      {/* Header row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexShrink: 0,
        minWidth: isGrid ? 'auto' : '240px',
        flexDirection: isGrid ? 'row' : 'column',
        gap: isGrid ? '0' : '6px',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
            {agent.name}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
            {agent.provider.name}
          </p>
        </div>
        <StatusBadge status={agent.status} />
      </div>

      {/* Description */}
      <p style={{
        margin: 0,
        fontSize: '0.82rem',
        color: '#475569',
        lineHeight: 1.5,
        flex: isGrid ? 'none' : '1 1 auto',
        display: '-webkit-box',
        WebkitLineClamp: isGrid ? 3 : 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {agent.description}
      </p>

      {/* Footer info */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        alignItems: 'center',
        marginTop: isGrid ? 'auto' : '0',
        flexShrink: 0,
      }}>
        {/* Capabilities */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <CapabilityPill label="Stream" active={agent.capabilities.streaming} />
          <CapabilityPill label="Push" active={agent.capabilities.pushNotifications} />
          <CapabilityPill label="Extended" active={agent.capabilities.extendedAgentCard} />
        </div>

        {/* Skill count */}
        <span style={{
          fontSize: '0.72rem',
          color: '#64748b',
          backgroundColor: '#f1f5f9',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: 500,
        }}>
          {agent.skills.length} skill{agent.skills.length !== 1 ? 's' : ''}
        </span>

        {/* Version */}
        <span style={{
          fontSize: '0.7rem',
          color: '#64748b',
          fontFamily: 'monospace',
        }}>
          v{agent.version}
        </span>
      </div>

      {/* Tags */}
      {agent.tags && agent.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: isGrid ? '0' : '0' }}>
          {agent.tags.slice(0, isGrid ? 3 : 5).map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
          {agent.tags.length > (isGrid ? 3 : 5) && (
            <span style={{ fontSize: '0.7rem', color: '#64748b', alignSelf: 'center' }}>
              +{agent.tags.length - (isGrid ? 3 : 5)} more
            </span>
          )}
        </div>
      )}
    </article>
  );
};

// ============================================================
// Detail Panel Component
// ============================================================

interface DetailPanelProps {
  agent: AgentCardWithStatus | null;
  onClose: () => void;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ agent, onClose }) => {
  const panelRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    if (!agent || !panelRef.current) return;
    // Move focus into the panel on open
    const closeBtn = panelRef.current.querySelector<HTMLButtonElement>('button[aria-label="Close detail panel"]');
    if (closeBtn) closeBtn.focus();

    // Trap focus within the panel
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [agent, onClose]);

  if (!agent) return null;

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label={`Details for ${agent.name}`}
      style={{
        width: '420px',
        minWidth: '420px',
        borderLeft: '1px solid #e5e7eb',
        background: '#ffffff',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Panel Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        position: 'sticky',
        top: 0,
        background: '#ffffff',
        zIndex: 1,
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
              {agent.name}
            </h2>
            <StatusBadge status={agent.status} />
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            {agent.provider.name}
            {agent.provider.url && (
              <>
                {' '}&middot;{' '}
                <a
                  href={agent.provider.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'none' }}
                >
                  Website
                </a>
              </>
            )}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            background: 'none',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '1rem',
            color: '#64748b',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Panel Body */}
      <div style={{ padding: '20px 24px', flex: 1 }}>
        {/* Description */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Description
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.6 }}>
            {agent.description}
          </p>
        </section>

        {/* Connection Info */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Connection
          </h3>
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Endpoint</span>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: '#1e293b',
                wordBreak: 'break-all',
                marginTop: '2px',
              }}>
                {agent.url}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Version</span>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e293b', marginTop: '2px' }}>
                  {agent.version}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>ID</span>
                <div style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#1e293b', marginTop: '2px' }}>
                  {agent.id}
                </div>
              </div>
            </div>
            {agent.lastChecked && (
              <div style={{ marginTop: '8px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Last Checked</span>
                <div style={{ fontSize: '0.78rem', color: '#1e293b', marginTop: '2px' }}>
                  {formatTimestamp(agent.lastChecked)}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Capabilities */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Capabilities
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {(Object.entries(CAPABILITY_LABELS) as [CapabilityFilter, string][]).map(([key, label]) => {
              const active = agent.capabilities[key];
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: active ? '#f0fdf4' : '#fafafa',
                    border: `1px solid ${active ? '#bbf7d0' : '#e5e7eb'}`,
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: '#374151' }}>{label}</span>
                  <span
                    aria-label={`${label}: ${active ? 'Supported' : 'Not supported'}`}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: active ? '#16a34a' : '#9ca3af',
                    }}
                  >
                    {active ? 'Yes' : 'No'}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Interfaces */}
        {agent.interfaces && agent.interfaces.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Interfaces
            </h3>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {agent.interfaces.map((iface, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    color: '#0369a1',
                    backgroundColor: '#e0f2fe',
                    border: '1px solid #7dd3fc',
                    fontFamily: 'monospace',
                  }}
                >
                  {iface.type}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Security */}
        {agent.securitySchemes && Object.keys(agent.securitySchemes).length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Security
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(agent.securitySchemes).map(([name, scheme]) => (
                <div
                  key={name}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: '#fffbeb',
                    border: '1px solid #fde68a',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: '#92400e',
                      backgroundColor: '#fef3c7',
                      padding: '1px 6px',
                      borderRadius: '3px',
                    }}>
                      {name}
                    </code>
                    <span style={{
                      fontSize: '0.72rem',
                      color: '#a16207',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                    }}>
                      {scheme.type}
                      {scheme.scheme ? ` / ${scheme.scheme}` : ''}
                    </span>
                  </div>
                  {scheme.description && (
                    <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#92400e' }}>
                      {scheme.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {agent.security && agent.security.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#6b7280' }}>
                Required: {agent.security.join(', ')}
              </p>
            )}
          </section>
        )}

        {/* Skills */}
        <section style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Skills ({agent.skills.length})
          </h3>
          <div style={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            {agent.skills.map((skill, i) => (
              <SkillItem key={skill.name} skill={skill} index={i} />
            ))}
          </div>
        </section>

        {/* Tags */}
        {agent.tags && agent.tags.length > 0 && (
          <section style={{ marginBottom: '24px' }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tags
            </h3>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {agent.tags.map(tag => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        {agent.provider.contactEmail && (
          <section>
            <h3 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: 600, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Contact
            </h3>
            <a
              href={`mailto:${agent.provider.contactEmail}`}
              style={{ fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none' }}
            >
              {agent.provider.contactEmail}
            </a>
          </section>
        )}
      </div>
    </aside>
  );
};

// ============================================================
// Filters Sidebar
// ============================================================

interface FiltersSidebarProps {
  filters: BrowserFilters;
  onFilterChange: (filters: BrowserFilters) => void;
  agents: AgentCardWithStatus[];
  onReset: () => void;
}

const FiltersSidebar: React.FC<FiltersSidebarProps> = ({ filters, onFilterChange, agents, onReset }) => {
  const providers = useMemo(() => getUniqueProviders(agents), [agents]);
  const securityTypes = useMemo(() => getUniqueSecurityTypes(agents), [agents]);

  const hasActiveFilters =
    filters.capabilities.length > 0 ||
    filters.providers.length > 0 ||
    filters.securityTypes.length > 0;

  const toggleCapability = (cap: CapabilityFilter) => {
    const next = filters.capabilities.includes(cap)
      ? filters.capabilities.filter(c => c !== cap)
      : [...filters.capabilities, cap];
    onFilterChange({ ...filters, capabilities: next });
  };

  const toggleProvider = (p: string) => {
    const next = filters.providers.includes(p)
      ? filters.providers.filter(x => x !== p)
      : [...filters.providers, p];
    onFilterChange({ ...filters, providers: next });
  };

  const toggleSecurityType = (t: string) => {
    const next = filters.securityTypes.includes(t)
      ? filters.securityTypes.filter(x => x !== t)
      : [...filters.securityTypes, t];
    onFilterChange({ ...filters, securityTypes: next });
  };

  const sectionHeaderStyle: React.CSSProperties = {
    margin: '0 0 8px',
    fontSize: '0.72rem',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  const checkboxLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.82rem',
    color: '#374151',
    cursor: 'pointer',
    padding: '4px 0',
  };

  return (
    <nav
      aria-label="Agent filters"
      style={{
        width: '220px',
        minWidth: '220px',
        padding: '16px 20px',
        borderRight: '1px solid #e5e7eb',
        background: '#fafbfc',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      {/* Capabilities */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={sectionHeaderStyle}>Capabilities</legend>
        {(Object.entries(CAPABILITY_LABELS) as [CapabilityFilter, string][]).map(([key, label]) => (
          <label key={key} style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={filters.capabilities.includes(key)}
              onChange={() => toggleCapability(key)}
              style={{ accentColor: '#3b82f6' }}
            />
            {label}
          </label>
        ))}
      </fieldset>

      {/* Providers */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={sectionHeaderStyle}>Provider</legend>
        {providers.map(p => (
          <label key={p} style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={filters.providers.includes(p)}
              onChange={() => toggleProvider(p)}
              style={{ accentColor: '#3b82f6' }}
            />
            {p}
          </label>
        ))}
      </fieldset>

      {/* Security Type */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={sectionHeaderStyle}>Security Type</legend>
        {securityTypes.map(t => (
          <label key={t} style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={filters.securityTypes.includes(t)}
              onChange={() => toggleSecurityType(t)}
              style={{ accentColor: '#3b82f6' }}
            />
            <span style={{ textTransform: 'capitalize' }}>{t}</span>
          </label>
        ))}
      </fieldset>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={onReset}
          aria-label="Reset all filters"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            color: '#6b7280',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Reset Filters
        </button>
      )}
    </nav>
  );
};

// ============================================================
// Main Browser Component
// ============================================================

const AgentCardBrowser: React.FC = () => {
  const [filters, setFilters] = useState<BrowserFilters>(DEFAULT_FILTERS);
  const [selectedAgent, setSelectedAgent] = useState<AgentCardWithStatus | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Apply all filters and sorting
  const filteredAgents = useMemo(() => {
    let result = sampleAgents.filter(agent =>
      matchesSearch(agent, filters.search) &&
      matchesCapabilities(agent, filters.capabilities) &&
      matchesProviders(agent, filters.providers) &&
      matchesSecurityTypes(agent, filters.securityTypes)
    );
    result = sortAgents(result, filters.sortField, filters.sortDirection);
    return result;
  }, [filters]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  }, []);

  const handleSortFieldChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, sortField: e.target.value as SortField }));
  }, []);

  const toggleSortDirection = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      capabilities: [],
      providers: [],
      securityTypes: [],
    }));
  }, []);

  const handleSelectAgent = useCallback((agent: AgentCardWithStatus) => {
    setSelectedAgent(prev => prev?.id === agent.id ? null : agent);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  // Counts for summary
  const onlineCount = sampleAgents.filter(a => a.status === 'online').length;
  const totalSkills = sampleAgents.reduce((sum, a) => sum + a.skills.length, 0);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#1e293b',
      background: '#f8fafc',
    }}>
      <a
        href="#agent-cards-main"
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 'auto',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        onFocus={(e) => { e.currentTarget.style.cssText = 'position:fixed;top:0;left:0;z-index:10000;padding:8px 16px;background:#000;color:#fff;font-size:1rem;'; }}
        onBlur={(e) => { e.currentTarget.style.cssText = 'position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden;'; }}
      >Skip to main content</a>
      {/* Top Bar */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '0.85rem' }}>
            &larr; Home
          </Link>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
              A2A Agent Discovery
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
              {sampleAgents.length} agents registered &middot; {onlineCount} online &middot; {totalSkills} skills available
            </p>
          </div>
        </div>

        {/* Search + Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="search"
              value={filters.search}
              onChange={handleSearch}
              placeholder="Search agents, skills, tags..."
              aria-label="Search agents"
              style={{
                width: '280px',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#f9fafb',
              }}
            />
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.9rem',
                color: '#9ca3af',
                pointerEvents: 'none',
              }}
            >
              &#x1F50D;
            </span>
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label htmlFor="agent-sort-field" style={{ fontSize: '0.78rem', color: '#64748b', whiteSpace: 'nowrap' }}>
              Sort:
            </label>
            <select
              id="agent-sort-field"
              value={filters.sortField}
              onChange={handleSortFieldChange}
              style={{
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '0.8rem',
                background: '#ffffff',
                cursor: 'pointer',
              }}
            >
              {(Object.entries(SORT_LABELS) as [SortField, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <button
              onClick={toggleSortDirection}
              aria-label={`Sort ${filters.sortDirection === 'asc' ? 'descending' : 'ascending'}`}
              title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                cursor: 'pointer',
                fontSize: '0.85rem',
                lineHeight: 1,
              }}
            >
              {filters.sortDirection === 'asc' ? '\u2191' : '\u2193'}
            </button>
          </div>

          {/* View mode toggle */}
          <div style={{
            display: 'flex',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            overflow: 'hidden',
          }}>
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              style={{
                padding: '6px 10px',
                border: 'none',
                background: viewMode === 'grid' ? '#3b82f6' : '#ffffff',
                color: viewMode === 'grid' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                lineHeight: 1,
              }}
            >
              &#9638;&#9638;
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              style={{
                padding: '6px 10px',
                border: 'none',
                borderLeft: '1px solid #d1d5db',
                background: viewMode === 'list' ? '#3b82f6' : '#ffffff',
                color: viewMode === 'list' ? '#ffffff' : '#64748b',
                cursor: 'pointer',
                fontSize: '0.85rem',
                lineHeight: 1,
              }}
            >
              &#9776;
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Filters Sidebar */}
        <FiltersSidebar
          filters={filters}
          onFilterChange={setFilters}
          agents={sampleAgents}
          onReset={handleResetFilters}
        />

        {/* Agent Cards Grid/List */}
        <main
          id="agent-cards-main"
          role="main"
          aria-label="Agent cards"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
          }}
        >
          {filteredAgents.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              color: '#64748b',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>&#x1F50E;</div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: '#64748b' }}>
                No agents found
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', textAlign: 'center', maxWidth: '400px' }}>
                Try adjusting your search query or filters to find the agents you are looking for.
              </p>
              <button
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                }}
                style={{
                  marginTop: '16px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Result count */}
              <p style={{
                margin: '0 0 16px',
                fontSize: '0.78rem',
                color: '#64748b',
              }}>
                Showing {filteredAgents.length} of {sampleAgents.length} agents
              </p>

              {/* Cards */}
              <div
                style={
                  viewMode === 'grid'
                    ? {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '16px',
                      }
                    : {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }
                }
              >
                {filteredAgents.map(agent => (
                  <AgentCardItem
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    viewMode={viewMode}
                    onSelect={handleSelectAgent}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        {/* Detail Panel */}
        {selectedAgent && (
          <DetailPanel agent={selectedAgent} onClose={handleCloseDetail} />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '8px 24px',
        borderTop: '1px solid #e5e7eb',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.72rem',
        color: '#64748b',
      }}>
        <span>
          A2A Protocol v0.3 &middot;{' '}
          <a
            href="https://a2a-protocol.org/latest/specification/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#3b82f6', textDecoration: 'none' }}
          >
            Specification
          </a>
        </span>
        <span>Bundle budget: 400KB max | Lazy loaded</span>
      </footer>
    </div>
  );
};

export default AgentCardBrowser;
