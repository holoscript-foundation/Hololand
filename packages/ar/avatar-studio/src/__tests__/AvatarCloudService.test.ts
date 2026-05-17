/**
 * Tests for AvatarCloudService
 *
 * Validates cloud persistence, CDN upload, versioning, and sharing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AvatarCloudService } from '../AvatarCloudService';
import { AvatarBlueprintManager } from '../AvatarBlueprintManager';

const mockFetch = vi.fn();
Object.defineProperty(globalThis, 'fetch', {
  value: mockFetch,
  writable: true,
});

describe('AvatarCloudService', () => {
  let service: AvatarCloudService;
  let blueprintManager: AvatarBlueprintManager;

  beforeEach(() => {
    vi.clearAllMocks();

    service = new AvatarCloudService({
      apiUrl: 'https://api.hololand.io',
      apiKey: 'test-api-key',
      userToken: 'test-user-token',
      appId: 'test-app',
      timeoutMs: 5000,
      retryCount: 0, // No retries in tests
    });

    blueprintManager = new AvatarBlueprintManager();
  });

  // ===========================================================================
  // AVATAR CRUD
  // ===========================================================================

  describe('createAvatar', () => {
    it('sends POST request with blueprint', async () => {
      const blueprint = blueprintManager.getBlueprint();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_cloud_123',
            blueprint,
            userId: 'user_1',
            appId: 'test-app',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: 1,
            isPublic: false,
            downloadCount: 0,
            viewCount: 0,
            tags: [],
          }),
      });

      const result = await service.createAvatar(blueprint, {
        tags: ['my-avatar'],
        isPublic: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hololand.io/api/v1/avatars',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
            'X-User-Token': 'test-user-token',
            'X-App-ID': 'test-app',
          }),
        })
      );

      expect(result.id).toBe('avt_cloud_123');
    });
  });

  describe('updateAvatar', () => {
    it('sends PUT request with updated blueprint', async () => {
      blueprintManager.setSkinColor('#ff0000');
      const blueprint = blueprintManager.getBlueprint();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_cloud_123',
            blueprint,
            version: 2,
          }),
      });

      const result = await service.updateAvatar(
        'avt_cloud_123',
        blueprint,
        'Changed skin color to red'
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hololand.io/api/v1/avatars/avt_cloud_123',
        expect.objectContaining({
          method: 'PUT',
        })
      );

      expect(result.version).toBe(2);
    });
  });

  describe('getAvatar', () => {
    it('fetches avatar by ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_cloud_123',
            blueprint: blueprintManager.getBlueprint(),
          }),
      });

      const result = await service.getAvatar('avt_cloud_123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hololand.io/api/v1/avatars/avt_cloud_123',
        expect.any(Object)
      );
      expect(result.id).toBe('avt_cloud_123');
    });

    it('throws on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Avatar not found' }),
      });

      await expect(service.getAvatar('nonexistent')).rejects.toThrow('Avatar not found');
    });
  });

  describe('deleteAvatar', () => {
    it('sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await service.deleteAvatar('avt_cloud_123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hololand.io/api/v1/avatars/avt_cloud_123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('listAvatars', () => {
    it('fetches avatar list with pagination', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            avatars: [{ id: 'avt_1' }, { id: 'avt_2' }],
            total: 10,
            hasMore: true,
            nextCursor: 'cursor_abc',
          }),
      });

      const result = await service.listAvatars({
        limit: 2,
        sortBy: 'createdAt',
        sortDirection: 'desc',
      });

      expect(result.avatars.length).toBe(2);
      expect(result.total).toBe(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('cursor_abc');
    });

    it('includes query parameters in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ avatars: [], total: 0, hasMore: false }),
      });

      await service.listAvatars({
        limit: 5,
        tags: ['character', 'anime'],
        sortBy: 'name',
        sortDirection: 'asc',
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('limit=5');
      expect(url).toContain('tags=character%2Canime');
      expect(url).toContain('sort=name');
      expect(url).toContain('dir=asc');
    });
  });

  // ===========================================================================
  // VERSIONING
  // ===========================================================================

  describe('versioning', () => {
    it('fetches version history', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            { version: 1, createdAt: '2026-01-01T00:00:00Z' },
            { version: 2, createdAt: '2026-01-02T00:00:00Z', changeDescription: 'Updated hair' },
          ]),
      });

      const versions = await service.getVersionHistory('avt_cloud_123');

      expect(versions.length).toBe(2);
      expect(versions[1].changeDescription).toBe('Updated hair');
    });

    it('restores a specific version', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_cloud_123',
            version: 1,
          }),
      });

      const result = await service.restoreVersion('avt_cloud_123', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.hololand.io/api/v1/avatars/avt_cloud_123/versions/1/restore',
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.version).toBe(1);
    });
  });

  // ===========================================================================
  // SHARING
  // ===========================================================================

  describe('sharing', () => {
    it('creates a share link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            shareToken: 'tok_abc123',
            shareUrl: 'https://studio.hololand.io/shared/tok_abc123',
          }),
      });

      const result = await service.createShareLink('avt_cloud_123');

      expect(result.shareToken).toBe('tok_abc123');
      expect(result.shareUrl).toContain('tok_abc123');
    });

    it('revokes a share link', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

      await service.revokeShareLink('avt_cloud_123');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/share'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('sets avatar public visibility', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_cloud_123',
            isPublic: true,
          }),
      });

      const result = await service.setPublic('avt_cloud_123', true);

      expect(result.isPublic).toBe(true);
    });

    it('fetches shared avatar without auth', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_cloud_123',
            isPublic: true,
          }),
      });

      await service.getSharedAvatar('tok_abc123');

      // Should not include auth headers
      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  // ===========================================================================
  // DISCOVERY
  // ===========================================================================

  describe('discovery', () => {
    it('browses public avatar gallery', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            avatars: [{ id: 'avt_public_1' }],
            total: 50,
            hasMore: true,
          }),
      });

      const result = await service.browsePublicAvatars({
        search: 'anime',
        sortBy: 'trending',
        limit: 10,
      });

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain('/gallery');
      expect(url).toContain('q=anime');
      expect(url).toContain('sort=trending');
      expect(result.avatars.length).toBe(1);
    });

    it('clones a public avatar', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            id: 'avt_clone_789',
            version: 1,
          }),
      });

      const result = await service.cloneAvatar('avt_public_1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/clone'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(result.id).toBe('avt_clone_789');
    });
  });

  // ===========================================================================
  // ERROR HANDLING
  // ===========================================================================

  describe('error handling', () => {
    it('throws on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ message: 'Server error' }),
      });

      await expect(service.getAvatar('avt_123')).rejects.toThrow();
    });

    it('throws on network error without retries', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getAvatar('avt_123')).rejects.toThrow('Network error');
    });

    it('retries on transient failures', async () => {
      const retryService = new AvatarCloudService({
        apiUrl: 'https://api.hololand.io',
        appId: 'test-app',
        retryCount: 1,
        timeoutMs: 5000,
      });

      // First call fails, second succeeds
      mockFetch.mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: 'avt_123' }),
      });

      const result = await retryService.getAvatar('avt_123');
      expect(result.id).toBe('avt_123');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('does not retry on 4xx client errors', async () => {
      const retryService = new AvatarCloudService({
        apiUrl: 'https://api.hololand.io',
        appId: 'test-app',
        retryCount: 2,
        timeoutMs: 5000,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: () => Promise.resolve({ message: 'HTTP 403: Forbidden' }),
      });

      await expect(retryService.getAvatar('avt_123')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retry
    });
  });
});
