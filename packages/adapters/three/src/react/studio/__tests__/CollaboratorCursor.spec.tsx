/**
 * Tests for CollaboratorCursor component
 *
 * Verifies rendering of remote collaborator cursors:
 *   - Renders cursor at correct position
 *   - Shows name badge with display name
 *   - Applies collaborator color
 *   - Hides when no cursor position
 *   - Shows selection indicator when collaborator has active selection
 *   - Supports label and indicator visibility toggles
 *
 * @module studio/__tests__/CollaboratorCursor.spec
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CollaboratorCursor } from '../CollaboratorCursor';
import type { Collaborator } from '../usePresence';

// =============================================================================
// Helpers
// =============================================================================

function createCollaborator(
  overrides: Partial<Collaborator> = {},
): Collaborator {
  return {
    playerId: 'alice',
    displayName: 'Alice',
    color: '#3b82f6',
    cursorPosition: { x: 100, y: 200 },
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

describe('CollaboratorCursor', () => {
  it('should render cursor at the correct position', () => {
    const collab = createCollaborator({
      cursorPosition: { x: 150, y: 250 },
    });

    const { container } = render(
      <CollaboratorCursor collaborator={collab} />,
    );

    const root = container.firstChild as HTMLElement;
    expect(root).not.toBeNull();
    expect(root.style.left).toBe('150px');
    expect(root.style.top).toBe('250px');
  });

  it('should display the collaborator name in the badge', () => {
    const collab = createCollaborator({ displayName: 'Bob Builder' });

    render(<CollaboratorCursor collaborator={collab} />);

    expect(screen.getByText('Bob Builder')).toBeTruthy();
  });

  it('should return null when cursor position is null', () => {
    const collab = createCollaborator({ cursorPosition: null });

    const { container } = render(
      <CollaboratorCursor collaborator={collab} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('should set aria-label with collaborator name', () => {
    const collab = createCollaborator({ displayName: 'Charlie' });

    render(<CollaboratorCursor collaborator={collab} />);

    const element = screen.getByRole('status');
    expect(element.getAttribute('aria-label')).toBe("Charlie's cursor");
  });

  it('should hide label when showLabel is false', () => {
    const collab = createCollaborator({ displayName: 'DanName' });

    const { container } = render(
      <CollaboratorCursor collaborator={collab} showLabel={false} />,
    );

    // The SVG cursor should still render
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    // But the name text should not appear
    expect(screen.queryByText('DanName')).toBeNull();
  });

  it('should show selection indicator when activeSelection is set', () => {
    const collab = createCollaborator({
      activeSelection: 'entity-42',
    });

    const { container } = render(
      <CollaboratorCursor collaborator={collab} />,
    );

    // Selection indicator has a title attribute
    const indicator = container.querySelector('[title="Editing: entity-42"]');
    expect(indicator).not.toBeNull();
  });

  it('should not show selection indicator when activeSelection is null', () => {
    const collab = createCollaborator({ activeSelection: null });

    const { container } = render(
      <CollaboratorCursor collaborator={collab} />,
    );

    const indicator = container.querySelector('[title^="Editing:"]');
    expect(indicator).toBeNull();
  });

  it('should allow position override via props', () => {
    const collab = createCollaborator({
      cursorPosition: { x: 100, y: 200 },
    });

    const { container } = render(
      <CollaboratorCursor
        collaborator={collab}
        position={{ x: 300, y: 400 }}
      />,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.style.left).toBe('300px');
    expect(root.style.top).toBe('400px');
  });

  it('should apply custom cursor size', () => {
    const collab = createCollaborator();

    const { container } = render(
      <CollaboratorCursor collaborator={collab} cursorSize={32} />,
    );

    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.style.width).toBe('32px');
    expect(svg!.style.height).toBe('32px');
  });

  it('should have pointer-events: none for non-interactive overlay', () => {
    const collab = createCollaborator();

    const { container } = render(
      <CollaboratorCursor collaborator={collab} />,
    );

    const root = container.firstChild as HTMLElement;
    expect(root.style.pointerEvents).toBe('none');
  });
});
