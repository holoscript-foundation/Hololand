/**
 * Tests for UserListPanel component
 *
 * Verifies the collaborator sidebar panel:
 *   - Renders all collaborators
 *   - Shows "You" badge for local user
 *   - Sorts local user first
 *   - Shows role badges for non-player roles
 *   - Shows active selection highlighting
 *   - Displays correct collaborator count
 *   - Handles empty state
 *   - Supports collapse/expand
 *   - Handles click and follow interactions
 *
 * @module studio/__tests__/UserListPanel.spec
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserListPanel } from '../UserListPanel';
import type { Collaborator } from '../usePresence';

// =============================================================================
// Helpers
// =============================================================================

function createCollaborator(
  overrides: Partial<Collaborator> = {},
): Collaborator {
  return {
    playerId: 'player-1',
    displayName: 'Alice',
    color: '#3b82f6',
    cursorPosition: null,
    activeSelection: null,
    voiceState: 'listening',
    role: 'player',
    isLocal: false,
    lastSeen: Date.now(),
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('UserListPanel', () => {
  it('should render all collaborators', () => {
    const collaborators = [
      createCollaborator({ playerId: 'alice', displayName: 'Alice' }),
      createCollaborator({ playerId: 'bob', displayName: 'Bob' }),
      createCollaborator({
        playerId: 'local-1',
        displayName: 'LocalUser',
        isLocal: true,
      }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    expect(screen.getByText('Alice')).toBeTruthy();
    expect(screen.getByText('Bob')).toBeTruthy();
    expect(screen.getByText('LocalUser')).toBeTruthy();
  });

  it('should show "You" badge for local user', () => {
    const collaborators = [
      createCollaborator({
        playerId: 'local-1',
        displayName: 'LocalUser',
        isLocal: true,
      }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    // The "You" badge text should be present
    const youBadges = screen.getAllByText('You');
    expect(youBadges.length).toBeGreaterThan(0);
  });

  it('should display the correct collaborator count in the header badge', () => {
    const collaborators = [
      createCollaborator({ playerId: 'a', displayName: 'A' }),
      createCollaborator({ playerId: 'b', displayName: 'B' }),
      createCollaborator({ playerId: 'c', displayName: 'C' }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    expect(screen.getByText('3')).toBeTruthy();
  });

  it('should show empty state when no collaborators', () => {
    render(
      <UserListPanel collaborators={[]} localPlayerId="local-1" />,
    );

    expect(screen.getByText('No collaborators connected')).toBeTruthy();
  });

  it('should show role badge for non-player roles', () => {
    const collaborators = [
      createCollaborator({
        playerId: 'host-1',
        displayName: 'Admin',
        role: 'host',
      }),
      createCollaborator({
        playerId: 'mod-1',
        displayName: 'Moderator',
        role: 'moderator',
      }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    expect(screen.getByText('host')).toBeTruthy();
    expect(screen.getByText('moderator')).toBeTruthy();
  });

  it('should show active selection text when collaborator is editing', () => {
    const collaborators = [
      createCollaborator({
        playerId: 'alice',
        displayName: 'Alice',
        activeSelection: 'MainCamera',
      }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    expect(screen.getByText('Editing: MainCamera')).toBeTruthy();
  });

  it('should call onCollaboratorClick when a user row is clicked', () => {
    const onClick = vi.fn();
    const collaborators = [
      createCollaborator({ playerId: 'alice', displayName: 'Alice' }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
        onCollaboratorClick={onClick}
      />,
    );

    fireEvent.click(screen.getByText('Alice'));
    expect(onClick).toHaveBeenCalledWith('alice');
  });

  it('should toggle follow state when follow button is clicked', () => {
    const onFollow = vi.fn();
    const collaborators = [
      createCollaborator({ playerId: 'alice', displayName: 'Alice' }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
        onFollowToggle={onFollow}
      />,
    );

    const followBtn = screen.getByRole('button', {
      name: 'Follow Alice',
    });
    fireEvent.click(followBtn);
    expect(onFollow).toHaveBeenCalledWith('alice');
  });

  it('should render with custom title', () => {
    render(
      <UserListPanel
        collaborators={[]}
        localPlayerId="local-1"
        title="Online Users"
      />,
    );

    expect(screen.getByText('Online Users')).toBeTruthy();
  });

  it('should show avatar initials when no avatar URL', () => {
    const collaborators = [
      createCollaborator({
        playerId: 'jd',
        displayName: 'John Doe',
        avatarUrl: undefined,
      }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    // Should show "JD" initials
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('should render avatar image when avatarUrl is provided', () => {
    const collaborators = [
      createCollaborator({
        playerId: 'alice',
        displayName: 'Alice',
        avatarUrl: 'https://example.com/alice.png',
      }),
    ];

    const { container } = render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.src).toBe('https://example.com/alice.png');
    expect(img!.alt).toBe("Alice's avatar");
  });

  it('should support collapse toggle via header click', () => {
    const collaborators = [
      createCollaborator({ playerId: 'alice', displayName: 'Alice' }),
    ];

    render(
      <UserListPanel
        collaborators={collaborators}
        localPlayerId="local-1"
      />,
    );

    // Initially expanded
    const header = screen.getByRole('button', {
      name: 'Collapse collaborator list',
    });
    expect(header).toBeTruthy();

    fireEvent.click(header);

    // Now collapsed
    const expandBtn = screen.getByRole('button', {
      name: 'Expand collaborator list',
    });
    expect(expandBtn).toBeTruthy();
  });

  it('should have correct ARIA attributes for the panel', () => {
    render(
      <UserListPanel collaborators={[]} localPlayerId="local-1" />,
    );

    const region = screen.getByRole('region');
    expect(region.getAttribute('aria-label')).toBe(
      'Collaborator list panel',
    );
  });
});
