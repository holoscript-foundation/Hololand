/**
 * In-Memory Avatar Store
 *
 * Scaffold implementation of avatar persistence. In production, this
 * connects to PostgreSQL via the HoloLand backend at localhost:3001.
 *
 * Migration path:
 * 1. Replace this module with calls to AvatarCloudService
 * 2. Or use direct PostgreSQL/Prisma queries from API routes
 * 3. Add Redis caching for frequently accessed avatars
 * 4. Add S3/R2 upload for VRM files
 */

import type { AvatarBlueprint } from './types';

export interface StoredAvatar {
  id: string;
  blueprint: AvatarBlueprint;
  userId: string;
  appId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isPublic: boolean;
  tags: string[];
  vrmUrl?: string;
  thumbnailUrl?: string;
}

// In-memory store (replaced by PostgreSQL in production)
const avatars = new Map<string, StoredAvatar>();

export function createAvatar(
  blueprint: AvatarBlueprint,
  options?: {
    userId?: string;
    appId?: string;
    tags?: string[];
    isPublic?: boolean;
  },
): StoredAvatar {
  const now = new Date().toISOString();
  const stored: StoredAvatar = {
    id: blueprint.id,
    blueprint,
    userId: options?.userId ?? 'anonymous',
    appId: options?.appId ?? 'studio',
    createdAt: now,
    updatedAt: now,
    version: 1,
    isPublic: options?.isPublic ?? false,
    tags: options?.tags ?? [],
  };
  avatars.set(stored.id, stored);
  return stored;
}

export function getAvatar(id: string): StoredAvatar | undefined {
  return avatars.get(id);
}

export function updateAvatar(
  id: string,
  blueprint: AvatarBlueprint,
  changeDescription?: string,
): StoredAvatar | undefined {
  const existing = avatars.get(id);
  if (!existing) return undefined;

  const updated: StoredAvatar = {
    ...existing,
    blueprint: {
      ...blueprint,
      version: existing.version + 1,
      updatedAt: Date.now(),
    },
    updatedAt: new Date().toISOString(),
    version: existing.version + 1,
  };
  avatars.set(id, updated);
  return updated;
}

export function deleteAvatar(id: string): boolean {
  return avatars.delete(id);
}

export function listAvatars(options?: {
  userId?: string;
  appId?: string;
  limit?: number;
  offset?: number;
  tags?: string[];
}): { avatars: StoredAvatar[]; total: number; hasMore: boolean } {
  let results = Array.from(avatars.values());

  if (options?.userId) {
    results = results.filter((a) => a.userId === options.userId);
  }
  if (options?.appId) {
    results = results.filter((a) => a.appId === options.appId);
  }
  if (options?.tags && options.tags.length > 0) {
    results = results.filter((a) =>
      options.tags!.some((t) => a.tags.includes(t)),
    );
  }

  // Sort by updatedAt descending
  results.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const total = results.length;
  const offset = options?.offset ?? 0;
  const limit = options?.limit ?? 20;
  const page = results.slice(offset, offset + limit);

  return {
    avatars: page,
    total,
    hasMore: offset + limit < total,
  };
}
