/**
 * Scene Version Control - Tier 4
 * Snapshot comparison, history, and rollback capabilities
 */

export interface SceneSnapshot {
  id: string;
  sceneId: string;
  name: string;
  description: string;
  timestamp: number;
  author: string;
  content: string; // Serialized scene state
  tags: string[];
  parentSnapshotId?: string;
  metadata: {
    objectCount: number;
    constraints: number;
    fileSize: number;
    checksum: string;
  };
}

export interface SceneChange {
  type: 'create' | 'update' | 'delete' | 'property';
  objectId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: number;
  author: string;
}

export interface SnapshotDiff {
  added: SceneChange[];
  modified: SceneChange[];
  deleted: SceneChange[];
  similarity: number; // 0-1
}

/**
 * Scene Version Control Manager
 */
export class SceneVersionControl {
  private snapshots: Map<string, SceneSnapshot> = new Map();
  private sceneId: string;
  private currentSnapshot: SceneSnapshot | null = null;
  private history: SceneSnapshot[] = [];

  constructor(sceneId: string) {
    this.sceneId = sceneId;
  }

  /**
   * Create a new snapshot
   */
  createSnapshot(
    content: string,
    name: string,
    author: string,
    description: string = ''
  ): SceneSnapshot {
    const snapshot: SceneSnapshot = {
      id: `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sceneId: this.sceneId,
      name,
      description,
      timestamp: Date.now(),
      author,
      content,
      tags: [],
      parentSnapshotId: this.currentSnapshot?.id,
      metadata: {
        objectCount: this.countObjects(content),
        constraints: this.countConstraints(content),
        fileSize: new Blob([content]).size,
        checksum: this.generateChecksum(content),
      },
    };

    this.snapshots.set(snapshot.id, snapshot);
    this.history.push(snapshot);
    this.currentSnapshot = snapshot;

    return snapshot;
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(id: string): SceneSnapshot | null {
    return this.snapshots.get(id) || null;
  }

  /**
   * List all snapshots
   */
  getAllSnapshots(): SceneSnapshot[] {
    return this.history;
  }

  /**
   * Get snapshot history for timeline view
   */
  getHistory(limit: number = 50): SceneSnapshot[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Restore to a previous snapshot
   */
  restoreSnapshot(id: string): SceneSnapshot | null {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return null;

    this.currentSnapshot = snapshot;
    return snapshot;
  }

  /**
   * Delete a snapshot (soft delete - keep in history)
   */
  deleteSnapshot(id: string): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return false;

    // Mark as deleted but keep in history
    snapshot.tags.push('deleted');
    return true;
  }

  /**
   * Tag a snapshot
   */
  tagSnapshot(id: string, tags: string[]): boolean {
    const snapshot = this.snapshots.get(id);
    if (!snapshot) return false;

    snapshot.tags.push(...tags);
    return true;
  }

  /**
   * Compare two snapshots
   */
  compareSnapshots(snapshotA: SceneSnapshot, snapshotB: SceneSnapshot): SnapshotDiff {
    const changesA = this.parseChanges(snapshotA.content);
    const changesB = this.parseChanges(snapshotB.content);

    const added: SceneChange[] = [];
    const modified: SceneChange[] = [];
    const deleted: SceneChange[] = [];

    // Find added/modified objects
    for (const changeB of changesB) {
      const matchingA = changesA.find((c) => c.objectId === changeB.objectId);

      if (!matchingA) {
        added.push(changeB);
      } else if (!this.objectsEqual(matchingA, changeB)) {
        modified.push({
          ...changeB,
          oldValue: matchingA,
        });
      }
    }

    // Find deleted objects
    for (const changeA of changesA) {
      if (!changesB.find((c) => c.objectId === changeA.objectId)) {
        deleted.push(changeA);
      }
    }

    const similarity = this.calculateSimilarity(changesA, changesB);

    return {
      added,
      modified,
      deleted,
      similarity,
    };
  }

  /**
   * Get diff between current and another snapshot
   */
  getDiff(snapshotId: string): SnapshotDiff | null {
    if (!this.currentSnapshot) return null;

    const other = this.snapshots.get(snapshotId);
    if (!other) return null;

    return this.compareSnapshots(this.currentSnapshot, other);
  }

  /**
   * Merge snapshots (3-way merge)
   */
  mergeSnapshots(
    base: SceneSnapshot,
    ours: SceneSnapshot,
    theirs: SceneSnapshot
  ): SceneSnapshot | null {
    const baseChanges = this.parseChanges(base.content);
    const ourChanges = this.parseChanges(ours.content);
    const theirChanges = this.parseChanges(theirs.content);

    const mergedChanges: SceneChange[] = [];
    const conflicts: { objectId: string; ours: SceneChange; theirs: SceneChange }[] = [];

    // Process our changes
    for (const change of ourChanges) {
      const theirChange = theirChanges.find((c) => c.objectId === change.objectId);

      if (!theirChange) {
        mergedChanges.push(change);
      } else if (this.objectsEqual(change, theirChange)) {
        mergedChanges.push(change);
      } else {
        // Conflict!
        conflicts.push({
          objectId: change.objectId,
          ours: change,
          theirs: theirChange,
        });
      }
    }

    // Process their unique changes
    for (const change of theirChanges) {
      if (!ourChanges.find((c) => c.objectId === change.objectId)) {
        mergedChanges.push(change);
      }
    }

    if (conflicts.length > 0) {
      console.warn('Merge conflicts detected:', conflicts);
      // Return null to indicate conflicts - caller must resolve
      return null;
    }

    const mergedContent = this.serializeChanges(mergedChanges);
    const merged = this.createSnapshot(
      mergedContent,
      `Merged: ${ours.name} + ${theirs.name}`,
      'system',
      `Merged from ${ours.id} and ${theirs.id}`
    );

    return merged;
  }

  /**
   * Get changes between two snapshots as readable diffs
   */
  getReadableDiff(snapshotA: string, snapshotB: string): string[] {
    const a = this.snapshots.get(snapshotA);
    const b = this.snapshots.get(snapshotB);

    if (!a || !b) return [];

    const diff = this.compareSnapshots(a, b);
    const lines: string[] = [];

    lines.push(`\n=== Scene Diff: ${a.name} vs ${b.name} ===`);
    lines.push(`Similarity: ${(diff.similarity * 100).toFixed(2)}%\n`);

    if (diff.added.length > 0) {
      lines.push(`📝 Added (${diff.added.length}):`);
      diff.added.forEach((change) => {
        lines.push(`  + ${change.objectId}: ${JSON.stringify(change.newValue).substring(0, 50)}`);
      });
      lines.push('');
    }

    if (diff.modified.length > 0) {
      lines.push(`✏️  Modified (${diff.modified.length}):`);
      diff.modified.forEach((change) => {
        lines.push(`  ~ ${change.objectId}`);
        lines.push(`    Before: ${JSON.stringify(change.oldValue).substring(0, 40)}`);
        lines.push(`    After:  ${JSON.stringify(change.newValue).substring(0, 40)}`);
      });
      lines.push('');
    }

    if (diff.deleted.length > 0) {
      lines.push(`🗑️  Deleted (${diff.deleted.length}):`);
      diff.deleted.forEach((change) => {
        lines.push(`  - ${change.objectId}`);
      });
    }

    return lines;
  }

  /**
   * Helper methods
   */
  private countObjects(content: string): number {
    try {
      const parsed = JSON.parse(content);
      return parsed.objects?.length || 0;
    } catch {
      return 0;
    }
  }

  private countConstraints(content: string): number {
    try {
      const parsed = JSON.parse(content);
      return parsed.constraints?.length || 0;
    } catch {
      return 0;
    }
  }

  private generateChecksum(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private parseChanges(content: string): SceneChange[] {
    try {
      const parsed = JSON.parse(content);
      const changes: SceneChange[] = [];

      if (parsed.objects) {
        parsed.objects.forEach((obj: any) => {
          changes.push({
            type: 'create',
            objectId: obj.id,
            newValue: obj,
            timestamp: Date.now(),
            author: 'unknown',
          });
        });
      }

      return changes;
    } catch (error) {
      console.error('Failed to parse changes:', error);
      return [];
    }
  }

  private serializeChanges(changes: SceneChange[]): string {
    const objects = changes
      .filter((c) => c.type === 'create')
      .map((c) => c.newValue);

    return JSON.stringify({ objects }, null, 2);
  }

  private objectsEqual(a: SceneChange, b: SceneChange): boolean {
    return (
      a.type === b.type &&
      a.objectId === b.objectId &&
      JSON.stringify(a.newValue) === JSON.stringify(b.newValue)
    );
  }

  private calculateSimilarity(a: SceneChange[], b: SceneChange[]): number {
    const intersection = a.filter((changeA) =>
      b.find((changeB) => this.objectsEqual(changeA, changeB))
    ).length;

    const union = new Set([...a, ...b]).size;
    return union === 0 ? 1 : intersection / union;
  }
}

/**
 * Snapshot Storage Backend (Local/Cloud)
 */
export class SnapshotStorage {
  private type: 'local' | 'cloud';
  private apiUrl?: string;
  private authToken?: string;

  constructor(type: 'local' | 'cloud' = 'local', apiUrl?: string) {
    this.type = type;
    this.apiUrl = apiUrl;
  }

  async saveSnapshot(snapshot: SceneSnapshot): Promise<boolean> {
    try {
      if (this.type === 'local') {
        const key = `snapshot-${snapshot.sceneId}-${snapshot.id}`;
        localStorage.setItem(key, JSON.stringify(snapshot));
        return true;
      } else if (this.type === 'cloud' && this.apiUrl) {
        const response = await fetch(`${this.apiUrl}/snapshots`, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(snapshot),
        });
        return response.ok;
      }
      return false;
    } catch (error) {
      console.error('Failed to save snapshot:', error);
      return false;
    }
  }

  async loadSnapshot(sceneId: string, snapshotId: string): Promise<SceneSnapshot | null> {
    try {
      if (this.type === 'local') {
        const key = `snapshot-${sceneId}-${snapshotId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } else if (this.type === 'cloud' && this.apiUrl) {
        const response = await fetch(`${this.apiUrl}/snapshots/${snapshotId}`, {
          headers: this.getAuthHeaders(),
        });
        return response.ok ? await response.json() : null;
      }
      return null;
    } catch (error) {
      console.error('Failed to load snapshot:', error);
      return null;
    }
  }

  async deleteSnapshot(sceneId: string, snapshotId: string): Promise<boolean> {
    try {
      if (this.type === 'local') {
        const key = `snapshot-${sceneId}-${snapshotId}`;
        localStorage.removeItem(key);
        return true;
      } else if (this.type === 'cloud' && this.apiUrl) {
        const response = await fetch(`${this.apiUrl}/snapshots/${snapshotId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        });
        return response.ok;
      }
      return false;
    } catch (error) {
      console.error('Failed to delete snapshot:', error);
      return false;
    }
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }
}
