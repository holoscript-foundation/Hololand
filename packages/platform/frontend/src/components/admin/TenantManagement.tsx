/**
 * TenantManagement Component
 *
 * Multi-tenant management panel with CRUD operations for organizations,
 * member management, and role assignment. Follows PostProcessingControls
 * pattern with inline CSS-in-JS styling and full ARIA accessibility.
 *
 * @module admin/TenantManagement
 */

import React, { useState, useCallback, useMemo, type CSSProperties } from 'react';
import {
  type Organization,
  type OrgMember,
  type OrgInvite,
  type OrgRole,
  type OrgStatus,
  type SubscriptionTier,
} from './AdminTypes';
import { adminStyles, COLORS, FONTS } from './AdminStyles';

// =============================================================================
// PROPS
// =============================================================================

export interface TenantManagementProps {
  organizations: Organization[];
  onCreateOrg: (data: { name: string; tier: SubscriptionTier }) => void;
  onUpdateOrg: (orgId: string, updates: Partial<Organization>) => void;
  onDeleteOrg: (orgId: string) => void;
  onSuspendOrg: (orgId: string) => void;
  onReactivateOrg: (orgId: string) => void;
  /** Fetches members for a given org */
  onFetchMembers: (orgId: string) => Promise<OrgMember[]>;
  onInviteMember: (orgId: string, email: string, role: OrgRole) => void;
  onRemoveMember: (orgId: string, memberId: string) => void;
  onChangeMemberRole: (orgId: string, memberId: string, newRole: OrgRole) => void;
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

/** Status badge for organization */
const OrgStatusBadge: React.FC<{ status: OrgStatus }> = ({ status }) => {
  const colorMap: Record<OrgStatus, CSSProperties> = {
    active: { ...adminStyles.badge, ...adminStyles.badgeSuccess },
    trial: { ...adminStyles.badge, ...adminStyles.badgeInfo },
    suspended: { ...adminStyles.badge, ...adminStyles.badgeWarning },
    deactivated: { ...adminStyles.badge, ...adminStyles.badgeError },
  };
  return <span style={colorMap[status]}>{status.toUpperCase()}</span>;
};

/** Tier badge */
const TierBadge: React.FC<{ tier: SubscriptionTier }> = ({ tier }) => {
  const style: CSSProperties = {
    ...adminStyles.badge,
    backgroundColor:
      tier === 'enterprise'
        ? COLORS.accentBg
        : tier === 'professional'
          ? COLORS.successBg
          : tier === 'starter'
            ? COLORS.infoBg
            : 'rgba(255,255,255,0.06)',
    color:
      tier === 'enterprise'
        ? COLORS.accent
        : tier === 'professional'
          ? COLORS.success
          : tier === 'starter'
            ? COLORS.info
            : COLORS.textMuted,
  };
  return <span style={style}>{tier.toUpperCase()}</span>;
};

/** Role selector dropdown */
const RoleSelector: React.FC<{
  value: OrgRole;
  onChange: (role: OrgRole) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <select
    style={adminStyles.select}
    value={value}
    onChange={(e) => onChange(e.target.value as OrgRole)}
    disabled={disabled}
    aria-label="Select role"
  >
    <option value="viewer">Viewer</option>
    <option value="editor">Editor</option>
    <option value="admin">Admin</option>
    <option value="owner">Owner</option>
  </select>
);

/** Create Organization modal form */
const CreateOrgForm: React.FC<{
  onSubmit: (data: { name: string; tier: SubscriptionTier }) => void;
  onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [tier, setTier] = useState<SubscriptionTier>('starter');

  const handleSubmit = useCallback(() => {
    if (name.trim()) {
      onSubmit({ name: name.trim(), tier });
    }
  }, [name, tier, onSubmit]);

  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'rgba(99, 102, 241, 0.06)',
        borderTop: `1px solid ${COLORS.accentBorder}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      role="form"
      aria-label="Create organization"
    >
      <div style={adminStyles.sectionTitle}>Create Organization</div>
      <input
        style={adminStyles.input}
        type="text"
        placeholder="Organization name..."
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        aria-label="Organization name"
        autoFocus
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, color: COLORS.textMuted }}>Tier:</span>
        <select
          style={adminStyles.select}
          value={tier}
          onChange={(e) => setTier(e.target.value as SubscriptionTier)}
          aria-label="Subscription tier"
        >
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="professional">Professional</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button style={adminStyles.button} onClick={onCancel} aria-label="Cancel">
          Cancel
        </button>
        <button
          style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
          onClick={handleSubmit}
          disabled={!name.trim()}
          aria-label="Create organization"
        >
          Create
        </button>
      </div>
    </div>
  );
};

/** Member list panel for a selected org */
const MemberPanel: React.FC<{
  org: Organization;
  members: OrgMember[];
  loading: boolean;
  onInvite: (email: string, role: OrgRole) => void;
  onRemove: (memberId: string) => void;
  onChangeRole: (memberId: string, newRole: OrgRole) => void;
}> = ({ org, members, loading, onInvite, onRemove, onChangeRole }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('viewer');
  const [showInvite, setShowInvite] = useState(false);

  const handleInvite = useCallback(() => {
    if (inviteEmail.trim()) {
      onInvite(inviteEmail.trim(), inviteRole);
      setInviteEmail('');
      setShowInvite(false);
    }
  }, [inviteEmail, inviteRole, onInvite]);

  return (
    <div
      style={{
        borderTop: `1px solid ${COLORS.border}`,
        backgroundColor: 'rgba(0, 0, 0, 0.15)',
      }}
    >
      {/* Member panel header */}
      <div style={{ ...adminStyles.toolbar, justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.textSecondary }}>
          Members ({members.length})
        </span>
        <button
          style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
          onClick={() => setShowInvite((s) => !s)}
          aria-label="Invite member"
        >
          + Invite
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div
          style={{
            padding: '8px 16px',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
            borderBottom: `1px solid ${COLORS.borderLight}`,
          }}
        >
          <input
            style={{ ...adminStyles.input, flex: 1 }}
            type="email"
            placeholder="Email address..."
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            aria-label="Invite email address"
            autoFocus
          />
          <RoleSelector value={inviteRole} onChange={setInviteRole} />
          <button
            style={{ ...adminStyles.button, ...adminStyles.buttonSuccess }}
            onClick={handleInvite}
            disabled={!inviteEmail.trim()}
            aria-label="Send invite"
          >
            Send
          </button>
        </div>
      )}

      {/* Members list */}
      {loading ? (
        <div style={adminStyles.emptyState}>Loading members...</div>
      ) : members.length === 0 ? (
        <div style={adminStyles.emptyState}>No members found.</div>
      ) : (
        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
          <table style={adminStyles.table} role="grid" aria-label={`Members of ${org.name}`}>
            <thead>
              <tr>
                <th style={adminStyles.tableHeader}>Name</th>
                <th style={adminStyles.tableHeader}>Email</th>
                <th style={adminStyles.tableHeader}>Role</th>
                <th style={adminStyles.tableHeader}>Last Active</th>
                <th style={adminStyles.tableHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} style={adminStyles.tableRow}>
                  <td style={adminStyles.tableCell}>
                    <span style={{ fontWeight: 600 }}>{member.displayName}</span>
                  </td>
                  <td style={{ ...adminStyles.tableCell, color: COLORS.textMuted }}>
                    {member.email}
                  </td>
                  <td style={adminStyles.tableCell}>
                    <RoleSelector
                      value={member.role}
                      onChange={(newRole) => onChangeRole(member.id, newRole)}
                      disabled={member.role === 'owner'}
                    />
                  </td>
                  <td style={{ ...adminStyles.tableCell, color: COLORS.textMuted }}>
                    {new Date(member.lastActiveAt).toLocaleDateString()}
                  </td>
                  <td style={adminStyles.tableCell}>
                    {member.role !== 'owner' && (
                      <button
                        style={{ ...adminStyles.button, ...adminStyles.buttonDanger }}
                        onClick={() => onRemove(member.id)}
                        aria-label={`Remove ${member.displayName}`}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const TenantManagement = React.memo<TenantManagementProps>(
  function TenantManagement({
    organizations,
    onCreateOrg,
    onUpdateOrg,
    onDeleteOrg,
    onSuspendOrg,
    onReactivateOrg,
    onFetchMembers,
    onInviteMember,
    onRemoveMember,
    onChangeMemberRole,
  }) {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [members, setMembers] = useState<OrgMember[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [filterTier, setFilterTier] = useState<SubscriptionTier | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<OrgStatus | 'all'>('all');

    // -----------------------------------------------------------------------
    // Filtered organizations
    // -----------------------------------------------------------------------
    const filteredOrgs = useMemo(() => {
      return organizations.filter((org) => {
        const matchesSearch =
          !searchQuery ||
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.slug.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTier = filterTier === 'all' || org.tier === filterTier;
        const matchesStatus = filterStatus === 'all' || org.status === filterStatus;
        return matchesSearch && matchesTier && matchesStatus;
      });
    }, [organizations, searchQuery, filterTier, filterStatus]);

    // -----------------------------------------------------------------------
    // Select organization and load members
    // -----------------------------------------------------------------------
    const handleSelectOrg = useCallback(
      async (orgId: string) => {
        if (selectedOrgId === orgId) {
          setSelectedOrgId(null);
          setMembers([]);
          return;
        }
        setSelectedOrgId(orgId);
        setMembersLoading(true);
        try {
          const result = await onFetchMembers(orgId);
          setMembers(result);
        } catch {
          setMembers([]);
        } finally {
          setMembersLoading(false);
        }
      },
      [selectedOrgId, onFetchMembers],
    );

    // -----------------------------------------------------------------------
    // Edit handlers
    // -----------------------------------------------------------------------
    const handleStartEdit = useCallback(
      (org: Organization) => {
        setEditingOrgId(org.id);
        setEditName(org.name);
      },
      [],
    );

    const handleSaveEdit = useCallback(
      (orgId: string) => {
        if (editName.trim()) {
          onUpdateOrg(orgId, { name: editName.trim() });
        }
        setEditingOrgId(null);
        setEditName('');
      },
      [editName, onUpdateOrg],
    );

    const handleCancelEdit = useCallback(() => {
      setEditingOrgId(null);
      setEditName('');
    }, []);

    // -----------------------------------------------------------------------
    // Create handler
    // -----------------------------------------------------------------------
    const handleCreate = useCallback(
      (data: { name: string; tier: SubscriptionTier }) => {
        onCreateOrg(data);
        setShowCreateForm(false);
      },
      [onCreateOrg],
    );

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------
    return (
      <div style={adminStyles.panelRoot} role="region" aria-label="Tenant management">
        {/* Header */}
        <div style={adminStyles.panelHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={adminStyles.panelTitle}>Tenant Management</span>
            <span style={{ ...adminStyles.badge, ...adminStyles.badgeAccent }}>
              {organizations.length}
            </span>
          </div>
          <button
            style={{ ...adminStyles.button, ...adminStyles.buttonPrimary }}
            onClick={() => setShowCreateForm((s) => !s)}
            aria-label="Create new organization"
          >
            + New Org
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <CreateOrgForm
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Toolbar: search + filters */}
        <div style={adminStyles.toolbar}>
          <div style={adminStyles.searchContainer}>
            <input
              style={{ ...adminStyles.input, paddingLeft: 8 }}
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search organizations"
            />
          </div>
          <select
            style={adminStyles.select}
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as SubscriptionTier | 'all')}
            aria-label="Filter by tier"
          >
            <option value="all">All Tiers</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select
            style={adminStyles.select}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as OrgStatus | 'all')}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="suspended">Suspended</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>

        {/* Organization list */}
        <div style={adminStyles.panelBody}>
          {filteredOrgs.length === 0 ? (
            <div style={adminStyles.emptyState}>
              <span style={{ fontSize: 14 }}>--</span>
              <span>No organizations found.</span>
            </div>
          ) : (
            <table style={adminStyles.table} role="grid" aria-label="Organizations">
              <thead>
                <tr>
                  <th style={adminStyles.tableHeader}>Organization</th>
                  <th style={adminStyles.tableHeader}>Tier</th>
                  <th style={adminStyles.tableHeader}>Status</th>
                  <th style={adminStyles.tableHeader}>Members</th>
                  <th style={adminStyles.tableHeader}>Created</th>
                  <th style={adminStyles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => (
                  <React.Fragment key={org.id}>
                    <tr
                      style={{
                        ...adminStyles.tableRow,
                        ...(selectedOrgId === org.id ? { backgroundColor: COLORS.bgCardHover } : {}),
                      }}
                      onClick={() => handleSelectOrg(org.id)}
                      aria-expanded={selectedOrgId === org.id}
                      aria-label={`Organization ${org.name}`}
                    >
                      <td style={adminStyles.tableCell}>
                        {editingOrgId === org.id ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <input
                              style={{ ...adminStyles.input, width: 140 }}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(org.id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              aria-label="Edit organization name"
                            />
                            <button
                              style={{ ...adminStyles.button, ...adminStyles.buttonSuccess, padding: '3px 6px' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveEdit(org.id);
                              }}
                              aria-label="Save"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>
                              {org.name}
                            </span>
                            <span style={{ fontSize: 8, color: COLORS.textDim }}>{org.slug}</span>
                          </div>
                        )}
                      </td>
                      <td style={adminStyles.tableCell}>
                        <TierBadge tier={org.tier} />
                      </td>
                      <td style={adminStyles.tableCell}>
                        <OrgStatusBadge status={org.status} />
                      </td>
                      <td style={{ ...adminStyles.tableCell, fontVariantNumeric: 'tabular-nums' }}>
                        {org.memberCount}
                      </td>
                      <td style={{ ...adminStyles.tableCell, color: COLORS.textMuted }}>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td style={adminStyles.tableCell}>
                        <div
                          style={{ display: 'flex', gap: 4 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            style={adminStyles.button}
                            onClick={() => handleStartEdit(org)}
                            aria-label={`Edit ${org.name}`}
                          >
                            Edit
                          </button>
                          {org.status === 'active' ? (
                            <button
                              style={{ ...adminStyles.button, ...adminStyles.badgeWarning }}
                              onClick={() => onSuspendOrg(org.id)}
                              aria-label={`Suspend ${org.name}`}
                            >
                              Suspend
                            </button>
                          ) : org.status === 'suspended' ? (
                            <button
                              style={{ ...adminStyles.button, ...adminStyles.buttonSuccess }}
                              onClick={() => onReactivateOrg(org.id)}
                              aria-label={`Reactivate ${org.name}`}
                            >
                              Reactivate
                            </button>
                          ) : null}
                          <button
                            style={{ ...adminStyles.button, ...adminStyles.buttonDanger }}
                            onClick={() => {
                              if (window.confirm(`Delete organization "${org.name}"? This cannot be undone.`)) {
                                onDeleteOrg(org.id);
                              }
                            }}
                            aria-label={`Delete ${org.name}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded member panel */}
                    {selectedOrgId === org.id && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <MemberPanel
                            org={org}
                            members={members}
                            loading={membersLoading}
                            onInvite={(email, role) => onInviteMember(org.id, email, role)}
                            onRemove={(memberId) => onRemoveMember(org.id, memberId)}
                            onChangeRole={(memberId, newRole) =>
                              onChangeMemberRole(org.id, memberId, newRole)
                            }
                          />
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

export default TenantManagement;
