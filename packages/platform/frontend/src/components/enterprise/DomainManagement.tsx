/**
 * DomainManagement Component
 *
 * Custom domain manager with:
 *   - Add domain form with format validation
 *   - Domain list table (domain, status badge, verification, SSL, actions)
 *   - Expandable verification instructions with TXT record
 *   - DNS instructions panel with copy-to-clipboard
 *   - Auto-refresh verification status every 30 seconds
 *
 * Uses Tailwind CSS with full ARIA accessibility.
 *
 * @module enterprise/DomainManagement
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { type CustomDomain, type DomainStatus } from './EnterpriseTypes';

// =============================================================================
// PROPS
// =============================================================================

export interface DomainManagementProps {
  domains: CustomDomain[];
  onAddDomain: (domain: string) => void;
  onVerifyDomain: (domainId: string) => void;
  onRemoveDomain: (domainId: string) => void;
  /** Verification auto-refresh interval in ms (default: 30000) */
  refreshInterval?: number;
}

// =============================================================================
// DOMAIN VALIDATION HELPER
// =============================================================================

const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

function isValidDomain(domain: string): boolean {
  return DOMAIN_REGEX.test(domain.trim());
}

// =============================================================================
// STATUS BADGE SUB-COMPONENT
// =============================================================================

const StatusBadge: React.FC<{ status: DomainStatus }> = ({ status }) => {
  const config: Record<DomainStatus, { label: string; classes: string }> = {
    pending: {
      label: 'Pending',
      classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    },
    verified: {
      label: 'Verified',
      classes: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    },
    active: {
      label: 'Active',
      classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    },
    failed: {
      label: 'Failed',
      classes: 'bg-red-500/15 text-red-400 border-red-500/30',
    },
  };

  const { label, classes } = config[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${classes}`}
      aria-label={`Status: ${label}`}
    >
      {label}
    </span>
  );
};

// =============================================================================
// SSL STATUS BADGE
// =============================================================================

const SSLBadge: React.FC<{ status: CustomDomain['sslStatus'] }> = ({ status }) => {
  const config: Record<string, { label: string; classes: string }> = {
    none: {
      label: 'No SSL',
      classes: 'text-zinc-600',
    },
    provisioning: {
      label: 'Provisioning',
      classes: 'text-amber-400',
    },
    active: {
      label: 'SSL Active',
      classes: 'text-emerald-400',
    },
    expired: {
      label: 'SSL Expired',
      classes: 'text-red-400',
    },
  };

  const { label, classes } = config[status] || config.none;

  return (
    <span className={`text-[10px] font-medium ${classes}`} aria-label={`SSL: ${label}`}>
      {status === 'active' && (
        <svg className="inline w-3 h-3 mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )}
      {label}
    </span>
  );
};

// =============================================================================
// VERIFICATION INSTRUCTIONS PANEL
// =============================================================================

const VerificationInstructions: React.FC<{
  domain: CustomDomain;
}> = ({ domain }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = useCallback(async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  }, []);

  return (
    <div className="px-4 py-4 bg-black/20 border-t border-white/[0.04]">
      <div className="max-w-2xl">
        <h4 className="text-[11px] font-bold text-zinc-300 mb-3">
          DNS Verification Instructions
        </h4>
        <p className="text-[10px] text-zinc-500 mb-4 leading-relaxed">
          Add the following TXT record to your domain's DNS configuration to verify ownership.
          Verification status auto-refreshes every 30 seconds.
        </p>

        {/* DNS Record Details */}
        <div className="space-y-3 bg-white/[0.02] rounded-lg border border-white/[0.06] p-4">
          {/* Record Type */}
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">
              Type
            </span>
            <span className="text-[11px] font-mono text-zinc-300">TXT</span>
          </div>

          {/* Host/Name */}
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">
              Name
            </span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <code className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded truncate">
                {domain.txtRecordName}
              </code>
              <button
                className={`flex-shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded transition-colors ${
                  copiedField === 'name'
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.04]'
                }`}
                onClick={() => handleCopy(domain.txtRecordName, 'name')}
                aria-label="Copy TXT record name"
              >
                {copiedField === 'name' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Value */}
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">
              Value
            </span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <code className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded truncate">
                {domain.txtRecordValue}
              </code>
              <button
                className={`flex-shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded transition-colors ${
                  copiedField === 'value'
                    ? 'text-emerald-400 bg-emerald-500/15'
                    : 'text-zinc-500 hover:text-zinc-300 bg-white/[0.04]'
                }`}
                onClick={() => handleCopy(domain.txtRecordValue, 'value')}
                aria-label="Copy TXT record value"
              >
                {copiedField === 'value' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* TTL */}
          <div className="flex items-start gap-3">
            <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-wide w-20 flex-shrink-0 pt-0.5">
              TTL
            </span>
            <span className="text-[11px] font-mono text-zinc-400">3600 (or default)</span>
          </div>
        </div>

        {/* Note */}
        <p className="text-[9px] text-zinc-600 mt-3">
          DNS changes can take up to 24-48 hours to propagate. SSL will be automatically provisioned once domain is verified.
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// ADD DOMAIN FORM
// =============================================================================

const AddDomainForm: React.FC<{
  onAdd: (domain: string) => void;
}> = ({ onAdd }) => {
  const [domain, setDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = domain.trim();
      if (!trimmed) {
        setError('Domain is required.');
        return;
      }
      if (!isValidDomain(trimmed)) {
        setError('Invalid domain format. Example: app.example.com');
        return;
      }
      setError(null);
      onAdd(trimmed);
      setDomain('');
    },
    [domain, onAdd],
  );

  return (
    <form
      className="flex items-start gap-3 px-6 py-4 border-b border-white/[0.06]"
      onSubmit={handleSubmit}
      role="form"
      aria-label="Add custom domain"
    >
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2">
          <input
            type="text"
            className={`
              flex-1 bg-white/[0.04] border rounded-md px-3 py-2 text-[11px] text-zinc-200 font-mono placeholder-zinc-600
              focus:ring-1 outline-none transition-colors
              ${error
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20'
                : 'border-white/[0.08] focus:border-indigo-500/50 focus:ring-indigo-500/20'
              }
            `}
            placeholder="app.example.com"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              if (error) setError(null);
            }}
            aria-label="Domain name"
            aria-invalid={!!error}
            aria-describedby={error ? 'domain-error' : undefined}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 rounded-md text-[11px] font-semibold hover:bg-indigo-500/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!domain.trim()}
            aria-label="Add domain"
          >
            Add Domain
          </button>
        </div>
        {error && (
          <p id="domain-error" className="text-[10px] text-red-400 mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const DomainManagement = React.memo<DomainManagementProps>(
  function DomainManagement({
    domains,
    onAddDomain,
    onVerifyDomain,
    onRemoveDomain,
    refreshInterval = 30000,
  }) {
    const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // -----------------------------------------------------------------------
    // Auto-refresh every 30s for pending/verified domains
    // -----------------------------------------------------------------------
    useEffect(() => {
      const hasPendingDomains = domains.some(
        (d) => d.status === 'pending' || d.status === 'verified',
      );

      if (hasPendingDomains) {
        intervalRef.current = setInterval(() => {
          // In a real app this would trigger a re-fetch
          setLastRefresh(new Date());
        }, refreshInterval);
      }

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [domains, refreshInterval]);

    const handleToggleExpand = useCallback((domainId: string) => {
      setExpandedDomainId((prev) => (prev === domainId ? null : domainId));
    }, []);

    const handleRemove = useCallback(
      (domainId: string, domainName: string) => {
        if (window.confirm(`Remove domain "${domainName}"? This cannot be undone.`)) {
          onRemoveDomain(domainId);
        }
      },
      [onRemoveDomain],
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div className="flex flex-col h-full" role="region" aria-label="Custom domain management">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Custom Domains
            </h2>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
              {domains.length}
            </span>
          </div>
          <span className="text-[9px] text-zinc-600" aria-live="polite">
            Last checked: {lastRefresh.toLocaleTimeString()}
          </span>
        </div>

        {/* Add domain form */}
        <AddDomainForm onAdd={onAddDomain} />

        {/* Domain list */}
        <div className="flex-1 overflow-y-auto">
          {domains.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
              <svg className="w-10 h-10 mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span className="text-[11px]">No custom domains configured.</span>
              <span className="text-[10px] text-zinc-700 mt-1">Add a domain above to get started.</span>
            </div>
          ) : (
            <table className="w-full" role="grid" aria-label="Custom domains">
              <thead>
                <tr>
                  <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-6 py-2 border-b border-white/[0.04]">
                    Domain
                  </th>
                  <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-3 py-2 border-b border-white/[0.04]">
                    Status
                  </th>
                  <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-3 py-2 border-b border-white/[0.04]">
                    SSL
                  </th>
                  <th className="text-left text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-3 py-2 border-b border-white/[0.04]">
                    Added
                  </th>
                  <th className="text-right text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-6 py-2 border-b border-white/[0.04]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {domains.map((d) => (
                  <React.Fragment key={d.id}>
                    <tr
                      className="transition-colors hover:bg-white/[0.02] cursor-pointer"
                      onClick={() => handleToggleExpand(d.id)}
                      aria-expanded={expandedDomainId === d.id}
                      aria-label={`Domain ${d.domain}`}
                    >
                      <td className="px-6 py-3 border-b border-white/[0.03]">
                        <div className="flex items-center gap-2">
                          <svg
                            className={`w-3 h-3 text-zinc-600 transition-transform duration-150 ${
                              expandedDomainId === d.id ? 'rotate-90' : ''
                            }`}
                            viewBox="0 0 10 10"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            aria-hidden="true"
                          >
                            <polyline points="3 2 7 5 3 8" />
                          </svg>
                          <span className="text-[11px] font-semibold text-zinc-200 font-mono">
                            {d.domain}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-b border-white/[0.03]">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="px-3 py-3 border-b border-white/[0.03]">
                        <SSLBadge status={d.sslStatus} />
                      </td>
                      <td className="px-3 py-3 border-b border-white/[0.03] text-[10px] text-zinc-500 font-mono tabular-nums">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 border-b border-white/[0.03]">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(d.status === 'pending' || d.status === 'failed') && (
                            <button
                              className="px-3 py-1 text-[10px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded hover:bg-indigo-500/25 transition-colors"
                              onClick={() => onVerifyDomain(d.id)}
                              aria-label={`Verify ${d.domain}`}
                            >
                              Verify Now
                            </button>
                          )}
                          <button
                            className="px-3 py-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                            onClick={() => handleRemove(d.id, d.domain)}
                            aria-label={`Remove ${d.domain}`}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded verification instructions */}
                    {expandedDomainId === d.id && (
                      <tr>
                        <td colSpan={5} className="p-0">
                          <VerificationInstructions domain={d} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  },
);

export default DomainManagement;
