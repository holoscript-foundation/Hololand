/**
 * Avatar Studio SDK
 *
 * The embeddable SDK for third-party developers. This is the direct
 * replacement for Ready Player Me's integration SDK.
 *
 * Ready Player Me's key value proposition was that developers could
 * embed an iframe or redirect to RPM's avatar creator, get back a
 * .glb/.vrm URL, and render it in their game/app. When RPM shut down
 * on Jan 31, 2026, ~25,000 developers lost this capability.
 *
 * HoloLand's Avatar Studio SDK provides:
 *
 * 1. **Iframe embed** - Drop-in replacement for RPM's iframe integration
 * 2. **Popup mode** - Opens avatar studio in a popup window
 * 3. **Inline mode** - Mount directly into a div in your app
 * 4. **API mode** - Programmatic avatar creation without UI
 * 5. **VRM export** - Avatars exported as VRM (open standard)
 * 6. **Webhook** - Server-side notification when avatar is created
 *
 * ## Quick Start (RPM Migration)
 *
 * ```typescript
 * // Before (Ready Player Me - BROKEN after Jan 31, 2026)
 * const subdomain = 'my-app';
 * const iframe = document.createElement('iframe');
 * iframe.src = `https://${subdomain}.readyplayer.me/avatar`;
 * iframe.addEventListener('message', (e) => {
 *   const avatarUrl = e.data; // RPM CDN URL - now dead
 * });
 *
 * // After (HoloLand Avatar Studio SDK)
 * import { AvatarStudioSDK } from '@hololand/avatar-studio';
 *
 * const sdk = new AvatarStudioSDK({
 *   appId: 'my-app',
 *   onAvatarCreated: (result) => {
 *     const avatarUrl = result.vrmUrl;     // Hosted VRM URL
 *     const avatarBlob = result.vrmBlob;   // Or use the blob directly
 *     const thumbnail = result.thumbnailUrl;
 *   },
 * });
 *
 * // Option 1: Open popup (like RPM's popup mode)
 * sdk.openPopup();
 *
 * // Option 2: Embed iframe (like RPM's iframe mode)
 * sdk.embedIframe(document.getElementById('avatar-container'));
 *
 * // Option 3: Mount inline (new - no iframe needed)
 * sdk.mountInline(document.getElementById('avatar-container'));
 *
 * // Option 4: API mode (programmatic creation)
 * const avatar = await sdk.createFromDescription('athletic build, dark curly hair, blue eyes');
 * ```
 */

import type { AvatarBlueprint, ExportQuality } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AvatarStudioSDKConfig {
  /** Your application ID (register at studio.hololand.io) */
  appId: string;
  /** API key for authenticated operations */
  apiKey?: string;
  /** Studio URL (defaults to hosted studio) */
  studioUrl?: string;
  /** Callback when avatar creation is completed */
  onAvatarCreated?: (result: AvatarCreationResult) => void;
  /** Callback when user cancels */
  onCancel?: () => void;
  /** Callback for errors */
  onError?: (error: AvatarStudioError) => void;
  /** Default export quality */
  exportQuality?: ExportQuality;
  /** Whether to upload VRM to HoloLand CDN */
  uploadToCDN?: boolean;
  /** Custom CSS class for the container */
  containerClass?: string;
  /** Restrict available body presets */
  allowedBodyPresets?: string[];
  /** Restrict available clothing categories */
  allowedClothingCategories?: string[];
  /** Show/hide export button (for apps that handle export separately) */
  showExportButton?: boolean;
  /** Pre-populate with an existing blueprint */
  initialBlueprint?: Partial<AvatarBlueprint>;
  /** Webhook URL for server-side notification */
  webhookUrl?: string;
  /** User token for authentication */
  userToken?: string;
  /** Locale for UI */
  locale?: string;
  /** Theme */
  theme?: 'light' | 'dark' | 'auto';
}

export interface AvatarCreationResult {
  /** The avatar blueprint */
  blueprint: AvatarBlueprint;
  /** VRM file as Blob (if available) */
  vrmBlob?: Blob;
  /** VRM CDN URL (if uploaded) */
  vrmUrl?: string;
  /** GLB CDN URL (if uploaded) */
  glbUrl?: string;
  /** Thumbnail image URL */
  thumbnailUrl?: string;
  /** Thumbnail as data URL */
  thumbnailDataUrl?: string;
  /** Avatar ID for future reference */
  avatarId: string;
  /** Export stats */
  stats?: {
    polyCount: number;
    textureMemoryMB: number;
    fileSizeKB: number;
  };
}

export interface AvatarStudioError {
  code: string;
  message: string;
  details?: unknown;
}

// =============================================================================
// SDK IMPLEMENTATION
// =============================================================================

export class AvatarStudioSDK {
  private config: AvatarStudioSDKConfig;
  private popupWindow: Window | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private inlineContainer: HTMLElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;

  constructor(config: AvatarStudioSDKConfig) {
    this.config = {
      studioUrl: 'https://studio.hololand.io',
      exportQuality: 'optimized',
      uploadToCDN: true,
      showExportButton: true,
      theme: 'auto',
      locale: 'en',
      ...config,
    };

    // Setup cross-origin message listener
    this.setupMessageListener();
  }

  // ===========================================================================
  // POPUP MODE (RPM-compatible)
  // ===========================================================================

  /**
   * Open the avatar studio in a popup window.
   * This is the closest equivalent to RPM's popup integration.
   */
  openPopup(options?: {
    width?: number;
    height?: number;
  }): void {
    const width = options?.width ?? 1024;
    const height = options?.height ?? 768;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    const url = this.buildStudioUrl('popup');

    this.popupWindow = window.open(
      url,
      'hololand-avatar-studio',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
    );

    if (!this.popupWindow) {
      this.config.onError?.({
        code: 'POPUP_BLOCKED',
        message: 'Popup was blocked by the browser. Please allow popups for this site.',
      });
    }
  }

  /**
   * Close the popup window
   */
  closePopup(): void {
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
    }
    this.popupWindow = null;
  }

  // ===========================================================================
  // IFRAME MODE (RPM-compatible)
  // ===========================================================================

  /**
   * Embed the avatar studio as an iframe in a container element.
   * Drop-in replacement for RPM's iframe integration.
   */
  embedIframe(container: HTMLElement, options?: {
    width?: string;
    height?: string;
  }): HTMLIFrameElement {
    // Clean up any existing iframe
    this.removeIframe();

    const url = this.buildStudioUrl('iframe');

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = options?.width ?? '100%';
    iframe.style.height = options?.height ?? '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '8px';
    iframe.allow = 'camera; microphone; xr-spatial-tracking';
    iframe.title = 'HoloLand Avatar Studio';

    if (this.config.containerClass) {
      iframe.className = this.config.containerClass;
    }

    container.appendChild(iframe);
    this.iframe = iframe;

    return iframe;
  }

  /**
   * Remove the embedded iframe
   */
  removeIframe(): void {
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
  }

  // ===========================================================================
  // INLINE MODE (New - no iframe)
  // ===========================================================================

  /**
   * Mount the avatar studio directly into a DOM element.
   * No iframe needed - renders directly in your page's DOM.
   * This provides the best performance and deepest integration.
   */
  async mountInline(container: HTMLElement): Promise<void> {
    this.inlineContainer = container;

    // Dynamically load the studio React component
    try {
      // Create canvas for 3D preview
      const canvas = document.createElement('canvas');
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      container.appendChild(canvas);

      // Import and initialize the AvatarStudio
      const { AvatarStudio } = await import('./AvatarStudio');

      const studio = new AvatarStudio({
        canvas,
        width: container.clientWidth,
        height: container.clientHeight,
        background: this.config.theme === 'dark' ? 'studio-dark' : 'studio-light',
        initialBlueprint: this.config.initialBlueprint,
      });

      await studio.initialize();

      // Store reference for cleanup
      container.dataset.studioInstance = 'true';
      (container as any).__hololandStudio = studio;

      // Handle resize
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          studio.resize(entry.contentRect.width, entry.contentRect.height);
        }
      });
      resizeObserver.observe(container);
      (container as any).__hololandResizeObserver = resizeObserver;

    } catch (error) {
      this.config.onError?.({
        code: 'MOUNT_FAILED',
        message: 'Failed to mount inline avatar studio',
        details: error,
      });
    }
  }

  /**
   * Unmount the inline studio
   */
  unmountInline(): void {
    if (this.inlineContainer) {
      const studio = (this.inlineContainer as any).__hololandStudio;
      if (studio) {
        studio.dispose();
      }

      const observer = (this.inlineContainer as any).__hololandResizeObserver;
      if (observer) {
        observer.disconnect();
      }

      this.inlineContainer.innerHTML = '';
      this.inlineContainer = null;
    }
  }

  // ===========================================================================
  // API MODE (Programmatic)
  // ===========================================================================

  /**
   * Create an avatar programmatically from a text description.
   * Uses AI to translate natural language to blueprint configuration.
   *
   * @example
   * ```typescript
   * const result = await sdk.createFromDescription(
   *   'Athletic male build, dark curly hair, blue eyes, wearing a hoodie'
   * );
   * ```
   */
  async createFromDescription(description: string): Promise<AvatarCreationResult> {
    const apiUrl = `${this.config.studioUrl}/api/v1/avatars/from-description`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': this.config.appId,
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        ...(this.config.userToken ? { 'X-User-Token': this.config.userToken } : {}),
      },
      body: JSON.stringify({
        description,
        exportQuality: this.config.exportQuality,
        uploadToCDN: this.config.uploadToCDN,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message ?? `API error: ${response.status}`);
    }

    return await response.json() as AvatarCreationResult;
  }

  /**
   * Create an avatar programmatically from a blueprint.
   */
  async createFromBlueprint(blueprint: Partial<AvatarBlueprint>): Promise<AvatarCreationResult> {
    const apiUrl = `${this.config.studioUrl}/api/v1/avatars/from-blueprint`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-ID': this.config.appId,
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        blueprint,
        exportQuality: this.config.exportQuality,
        uploadToCDN: this.config.uploadToCDN,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message ?? `API error: ${response.status}`);
    }

    return await response.json() as AvatarCreationResult;
  }

  /**
   * Create avatar from a selfie photo (like Avaturn/RPM photo mode).
   */
  async createFromPhoto(photoBlob: Blob): Promise<AvatarCreationResult> {
    const apiUrl = `${this.config.studioUrl}/api/v1/avatars/from-photo`;

    const formData = new FormData();
    formData.append('photo', photoBlob, 'selfie.jpg');
    formData.append('appId', this.config.appId);
    formData.append('exportQuality', this.config.exportQuality ?? 'optimized');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message ?? `API error: ${response.status}`);
    }

    return await response.json() as AvatarCreationResult;
  }

  // ===========================================================================
  // AVATAR MANAGEMENT
  // ===========================================================================

  /**
   * Load a previously saved avatar by ID.
   */
  async loadAvatar(avatarId: string): Promise<AvatarCreationResult> {
    const apiUrl = `${this.config.studioUrl}/api/v1/avatars/${avatarId}`;

    const response = await fetch(apiUrl, {
      headers: {
        'X-App-ID': this.config.appId,
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load avatar: ${response.status}`);
    }

    return await response.json() as AvatarCreationResult;
  }

  /**
   * List all avatars for the current user/app.
   */
  async listAvatars(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    avatars: AvatarCreationResult[];
    total: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const apiUrl = `${this.config.studioUrl}/api/v1/avatars?${params.toString()}`;

    const response = await fetch(apiUrl, {
      headers: {
        'X-App-ID': this.config.appId,
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
        ...(this.config.userToken ? { 'X-User-Token': this.config.userToken } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list avatars: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Delete an avatar by ID.
   */
  async deleteAvatar(avatarId: string): Promise<void> {
    const apiUrl = `${this.config.studioUrl}/api/v1/avatars/${avatarId}`;

    const response = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'X-App-ID': this.config.appId,
        ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete avatar: ${response.status}`);
    }
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Dispose the SDK and clean up all resources
   */
  dispose(): void {
    this.closePopup();
    this.removeIframe();
    this.unmountInline();

    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
  }

  // ===========================================================================
  // INTERNAL: MESSAGE HANDLING
  // ===========================================================================

  private setupMessageListener(): void {
    this.messageHandler = (event: MessageEvent) => {
      // Verify origin
      const studioOrigin = new URL(this.config.studioUrl!).origin;
      if (event.origin !== studioOrigin && event.origin !== window.location.origin) {
        return;
      }

      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.source !== 'hololand-avatar-studio') return;

      switch (data.type) {
        case 'avatar:created':
          this.config.onAvatarCreated?.(data.payload as AvatarCreationResult);
          // Notify webhook if configured
          if (this.config.webhookUrl) {
            this.notifyWebhook(data.payload as AvatarCreationResult);
          }
          break;

        case 'avatar:cancelled':
          this.config.onCancel?.();
          break;

        case 'avatar:error':
          this.config.onError?.(data.payload as AvatarStudioError);
          break;
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  private buildStudioUrl(mode: 'popup' | 'iframe'): string {
    const params = new URLSearchParams({
      appId: this.config.appId,
      mode,
      quality: this.config.exportQuality ?? 'optimized',
      upload: String(this.config.uploadToCDN ?? true),
      theme: this.config.theme ?? 'auto',
      locale: this.config.locale ?? 'en',
    });

    if (this.config.showExportButton !== undefined) {
      params.set('showExport', String(this.config.showExportButton));
    }

    if (this.config.allowedBodyPresets) {
      params.set('bodyPresets', this.config.allowedBodyPresets.join(','));
    }

    if (this.config.allowedClothingCategories) {
      params.set('clothingCategories', this.config.allowedClothingCategories.join(','));
    }

    if (this.config.userToken) {
      params.set('userToken', this.config.userToken);
    }

    if (this.config.initialBlueprint) {
      params.set('blueprint', btoa(JSON.stringify(this.config.initialBlueprint)));
    }

    return `${this.config.studioUrl}/embed?${params.toString()}`;
  }

  private async notifyWebhook(result: AvatarCreationResult): Promise<void> {
    if (!this.config.webhookUrl) return;

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        body: JSON.stringify({
          event: 'avatar.created',
          appId: this.config.appId,
          avatarId: result.avatarId,
          vrmUrl: result.vrmUrl,
          thumbnailUrl: result.thumbnailUrl,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn('Failed to notify webhook:', error);
    }
  }
}
