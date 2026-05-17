/**
 * postMessage Communication Layer
 *
 * Handles bidirectional communication between the hosted avatar studio
 * and its parent window (when embedded via iframe or opened as popup).
 *
 * This is the bridge that makes the AvatarStudioSDK work:
 * - SDK opens studio.hololand.io/embed in iframe or popup
 * - Studio uses this module to send avatar:created, avatar:cancelled, etc.
 * - SDK's message listener (in AvatarStudioSDK.ts) receives and routes events
 */

import type { StudioMessage, StudioMessageType } from './types';

const SOURCE = 'hololand-avatar-studio' as const;

/**
 * Send a message to the parent window (for iframe mode)
 * or the opener window (for popup mode).
 */
export function sendToParent(type: StudioMessageType, payload?: unknown): void {
  const message: StudioMessage = {
    source: SOURCE,
    type,
    payload,
  };

  // Try parent window (iframe mode)
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*');
  }

  // Try opener window (popup mode)
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(message, '*');
  }
}

/**
 * Check if the studio is running in embedded mode (iframe or popup).
 */
export function isEmbedded(): boolean {
  if (typeof window === 'undefined') return false;
  return window.parent !== window || window.opener !== null;
}

/**
 * Listen for messages from the parent/opener.
 * Returns a cleanup function.
 */
export function onParentMessage(handler: (type: string, payload: unknown) => void): () => void {
  const listener = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    // Accept messages from SDK (parent sends commands to studio)
    if (data.source === 'hololand-avatar-sdk') {
      handler(data.type, data.payload);
    }
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

/**
 * Notify the parent that the studio is ready to receive input.
 */
export function notifyReady(): void {
  sendToParent('studio:ready');
}

/**
 * Notify the parent that an avatar was created/exported.
 */
export function notifyAvatarCreated(payload: {
  avatarId: string;
  blueprint: unknown;
  vrmUrl?: string;
  glbUrl?: string;
  thumbnailUrl?: string;
  thumbnailDataUrl?: string;
  stats?: {
    polyCount: number;
    textureMemoryMB: number;
    fileSizeKB: number;
  };
}): void {
  sendToParent('avatar:created', payload);
}

/**
 * Notify the parent that the user cancelled avatar creation.
 */
export function notifyCancelled(): void {
  sendToParent('avatar:cancelled');
}

/**
 * Notify the parent of an error.
 */
export function notifyError(error: { code: string; message: string; details?: unknown }): void {
  sendToParent('avatar:error', error);
}
