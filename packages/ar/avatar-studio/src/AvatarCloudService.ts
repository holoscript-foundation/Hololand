/**
 * Avatar Cloud Service
 *
 * Handles server-side persistence, CDN hosting, and cloud operations
 * for avatars. This provides the backend integration that transforms
 * the avatar studio from a client-side tool into a platform service.
 *
 * Features:
 * - Save/load blueprints to cloud
 * - Upload VRM files to CDN with edge caching
 * - Generate VRM URLs for cross-platform avatar usage
 * - Avatar versioning and history
 * - User avatar gallery management
 * - Share avatars publicly or via link
 * - Analytics tracking (creation, downloads, views)
 *
 * ## Architecture
 *
 * ```
 * Client                 API Gateway              Storage
 * ------                 -----------              -------
 * AvatarStudio  ----->   /api/v1/avatars  ----->  PostgreSQL (blueprints)
 * VRMExporter   ----->   /api/v1/upload   ----->  S3/R2 (VRM files)
 *                        /api/v1/cdn      ----->  CDN edge (cached VRM URLs)
 * ```
 *
 * The API is designed to be self-hosted or use HoloLand's hosted service.
 * Third-party developers can point the SDK at their own backend.
 */

import type { AvatarBlueprint, ExportQuality } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface CloudServiceConfig {
  /** API base URL */
  apiUrl: string;
  /** API key for authentication */
  apiKey?: string;
  /** User authentication token */
  userToken?: string;
  /** Application ID */
  appId: string;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Retry count for failed requests */
  retryCount?: number;
}

export interface CloudAvatar {
  /** Server-assigned avatar ID */
  id: string;
  /** Blueprint data */
  blueprint: AvatarBlueprint;
  /** VRM file URL on CDN */
  vrmUrl?: string;
  /** GLB file URL on CDN */
  glbUrl?: string;
  /** Thumbnail URL */
  thumbnailUrl?: string;
  /** Owner user ID */
  userId: string;
  /** Application that created this avatar */
  appId: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
  /** Version number */
  version: number;
  /** Public sharing enabled */
  isPublic: boolean;
  /** Share link token */
  shareToken?: string;
  /** Export quality used */
  exportQuality: ExportQuality;
  /** File size in bytes */
  fileSizeBytes?: number;
  /** Download count */
  downloadCount: number;
  /** View count */
  viewCount: number;
  /** Tags for organization */
  tags: string[];
}

export interface CloudAvatarListResult {
  avatars: CloudAvatar[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface UploadResult {
  /** CDN URL for the VRM file */
  vrmUrl: string;
  /** CDN URL for GLB variant */
  glbUrl?: string;
  /** CDN URL for thumbnail */
  thumbnailUrl?: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Upload duration in ms */
  uploadDurationMs: number;
}

export interface AvatarVersion {
  version: number;
  createdAt: string;
  changeDescription?: string;
  vrmUrl?: string;
  thumbnailUrl?: string;
}

// =============================================================================
// CLOUD SERVICE
// =============================================================================

export class AvatarCloudService {
  private config: CloudServiceConfig;

  constructor(config: CloudServiceConfig) {
    this.config = {
      timeoutMs: 30000,
      retryCount: 2,
      ...config,
    };
  }

  // ===========================================================================
  // AVATAR CRUD
  // ===========================================================================

  /**
   * Save a new avatar to the cloud.
   */
  async createAvatar(
    blueprint: AvatarBlueprint,
    options?: {
      tags?: string[];
      isPublic?: boolean;
    },
  ): Promise<CloudAvatar> {
    return this.request<CloudAvatar>('/api/v1/avatars', {
      method: 'POST',
      body: JSON.stringify({
        blueprint,
        tags: options?.tags ?? [],
        isPublic: options?.isPublic ?? false,
      }),
    });
  }

  /**
   * Update an existing avatar's blueprint.
   */
  async updateAvatar(
    avatarId: string,
    blueprint: AvatarBlueprint,
    changeDescription?: string,
  ): Promise<CloudAvatar> {
    return this.request<CloudAvatar>(`/api/v1/avatars/${avatarId}`, {
      method: 'PUT',
      body: JSON.stringify({
        blueprint,
        changeDescription,
      }),
    });
  }

  /**
   * Get an avatar by ID.
   */
  async getAvatar(avatarId: string): Promise<CloudAvatar> {
    return this.request<CloudAvatar>(`/api/v1/avatars/${avatarId}`);
  }

  /**
   * Get an avatar by share token (no auth required).
   */
  async getSharedAvatar(shareToken: string): Promise<CloudAvatar> {
    return this.request<CloudAvatar>(`/api/v1/avatars/shared/${shareToken}`, {
      skipAuth: true,
    });
  }

  /**
   * Delete an avatar.
   */
  async deleteAvatar(avatarId: string): Promise<void> {
    await this.request(`/api/v1/avatars/${avatarId}`, {
      method: 'DELETE',
    });
  }

  /**
   * List avatars for the current user.
   */
  async listAvatars(options?: {
    limit?: number;
    cursor?: string;
    tags?: string[];
    sortBy?: 'createdAt' | 'updatedAt' | 'name';
    sortDirection?: 'asc' | 'desc';
  }): Promise<CloudAvatarListResult> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.tags) params.set('tags', options.tags.join(','));
    if (options?.sortBy) params.set('sort', options.sortBy);
    if (options?.sortDirection) params.set('dir', options.sortDirection);

    return this.request<CloudAvatarListResult>(
      `/api/v1/avatars?${params.toString()}`
    );
  }

  // ===========================================================================
  // FILE UPLOAD
  // ===========================================================================

  /**
   * Upload a VRM file to CDN.
   */
  async uploadVRM(
    avatarId: string,
    vrmBlob: Blob,
    thumbnailBlob?: Blob,
    onProgress?: (progress: number) => void,
  ): Promise<UploadResult> {
    const startTime = performance.now();

    const formData = new FormData();
    formData.append('vrm', vrmBlob, `${avatarId}.vrm`);
    if (thumbnailBlob) {
      formData.append('thumbnail', thumbnailBlob, `${avatarId}_thumb.png`);
    }

    // Use XMLHttpRequest for progress tracking
    return new Promise<UploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.config.apiUrl}/api/v1/avatars/${avatarId}/upload`);

      // Set auth headers
      if (this.config.apiKey) {
        xhr.setRequestHeader('Authorization', `Bearer ${this.config.apiKey}`);
      }
      if (this.config.userToken) {
        xhr.setRequestHeader('X-User-Token', this.config.userToken);
      }
      xhr.setRequestHeader('X-App-ID', this.config.appId);

      // Progress handler
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress?.(Math.round((e.loaded / e.total) * 100));
        }
      };

      // Completion handler
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const result = JSON.parse(xhr.responseText);
          resolve({
            ...result,
            uploadDurationMs: Math.round(performance.now() - startTime),
          });
        } else {
          reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Upload failed: network error'));
      };

      xhr.timeout = this.config.timeoutMs!;
      xhr.ontimeout = () => {
        reject(new Error('Upload timed out'));
      };

      xhr.send(formData);
    });
  }

  // ===========================================================================
  // VERSIONING
  // ===========================================================================

  /**
   * Get version history for an avatar.
   */
  async getVersionHistory(avatarId: string): Promise<AvatarVersion[]> {
    return this.request<AvatarVersion[]>(
      `/api/v1/avatars/${avatarId}/versions`
    );
  }

  /**
   * Restore a specific version.
   */
  async restoreVersion(avatarId: string, version: number): Promise<CloudAvatar> {
    return this.request<CloudAvatar>(
      `/api/v1/avatars/${avatarId}/versions/${version}/restore`,
      { method: 'POST' }
    );
  }

  // ===========================================================================
  // SHARING
  // ===========================================================================

  /**
   * Generate a share link for an avatar.
   */
  async createShareLink(avatarId: string): Promise<{
    shareToken: string;
    shareUrl: string;
  }> {
    return this.request(`/api/v1/avatars/${avatarId}/share`, {
      method: 'POST',
    });
  }

  /**
   * Revoke a share link.
   */
  async revokeShareLink(avatarId: string): Promise<void> {
    await this.request(`/api/v1/avatars/${avatarId}/share`, {
      method: 'DELETE',
    });
  }

  /**
   * Set avatar public visibility.
   */
  async setPublic(avatarId: string, isPublic: boolean): Promise<CloudAvatar> {
    return this.request<CloudAvatar>(`/api/v1/avatars/${avatarId}/visibility`, {
      method: 'PUT',
      body: JSON.stringify({ isPublic }),
    });
  }

  // ===========================================================================
  // DISCOVERY (Public Gallery)
  // ===========================================================================

  /**
   * Browse the public avatar gallery.
   */
  async browsePublicAvatars(options?: {
    search?: string;
    tags?: string[];
    sortBy?: 'popular' | 'newest' | 'trending';
    limit?: number;
    cursor?: string;
  }): Promise<CloudAvatarListResult> {
    const params = new URLSearchParams();
    if (options?.search) params.set('q', options.search);
    if (options?.tags) params.set('tags', options.tags.join(','));
    if (options?.sortBy) params.set('sort', options.sortBy);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.cursor) params.set('cursor', options.cursor);

    return this.request<CloudAvatarListResult>(
      `/api/v1/gallery?${params.toString()}`,
      { skipAuth: true }
    );
  }

  /**
   * Clone a public avatar to your own collection.
   */
  async cloneAvatar(avatarId: string): Promise<CloudAvatar> {
    return this.request<CloudAvatar>(`/api/v1/avatars/${avatarId}/clone`, {
      method: 'POST',
    });
  }

  // ===========================================================================
  // INTERNAL: HTTP CLIENT
  // ===========================================================================

  private async request<T = any>(
    path: string,
    options?: RequestInit & { skipAuth?: boolean },
  ): Promise<T> {
    const { skipAuth, ...fetchOptions } = options ?? {};
    const url = `${this.config.apiUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-App-ID': this.config.appId,
      ...(fetchOptions.headers as Record<string, string> ?? {}),
    };

    if (!skipAuth) {
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      if (this.config.userToken) {
        headers['X-User-Token'] = this.config.userToken;
      }
    }

    let lastError: Error | null = null;
    const maxRetries = this.config.retryCount ?? 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          this.config.timeoutMs
        );

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(
            errorBody.message ?? `HTTP ${response.status}: ${response.statusText}`
          );
        }

        // Handle 204 No Content
        if (response.status === 204) {
          return undefined as T;
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx)
        if (lastError.message.includes('HTTP 4')) {
          throw lastError;
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }
}
