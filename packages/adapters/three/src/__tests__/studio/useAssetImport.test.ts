/**
 * Tests for useAssetImport Hook
 *
 * Tests the import pipeline state machine: file addition, validation,
 * preview generation, progress tracking, and queue management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetImport } from '../../react/studio/useAssetImport';
import {
  ImportState,
  PreviewStage,
  AssetCategory,
  DEFAULT_IMPORT_QUEUE_CONFIG,
} from '../../react/studio/types';

// =============================================================================
// HELPERS
// =============================================================================

function createMockFile(
  name: string,
  size: number = 1024,
  type: string = '',
): File {
  const content = new Uint8Array(size);
  // Fill with some data to avoid empty file validation error
  for (let i = 0; i < Math.min(size, 100); i++) {
    content[i] = i % 256;
  }
  const blob = new Blob([content], { type });
  return new File([blob], name, { type, lastModified: Date.now() });
}

function createMockFileList(files: File[]): FileList {
  return {
    length: files.length,
    item: (i: number) => files[i] ?? null,
    [Symbol.iterator]: function* () {
      for (const file of files) {
        yield file;
      }
    },
    ...files.reduce((acc, file, i) => ({ ...acc, [i]: file }), {}),
  } as unknown as FileList;
}

// Mock crypto.subtle.digest for hashing
const originalCrypto = globalThis.crypto;

beforeEach(() => {
  // Mock crypto.subtle if not available in test env
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
        },
      },
      writable: true,
      configurable: true,
    });
  }
});

// =============================================================================
// BASIC HOOK BEHAVIOR
// =============================================================================

describe('useAssetImport', () => {
  it('initializes with empty state', () => {
    const { result } = renderHook(() => useAssetImport());

    expect(result.current.entries).toEqual([]);
    expect(result.current.isImporting).toBe(false);
    expect(result.current.isAllComplete).toBe(false);
    expect(result.current.overallProgress).toBe(0);
    expect(result.current.totalSize).toBe(0);
    expect(result.current.config).toBeDefined();
  });

  it('uses default config when none provided', () => {
    const { result } = renderHook(() => useAssetImport());

    expect(result.current.config.maxFiles).toBe(DEFAULT_IMPORT_QUEUE_CONFIG.maxFiles);
    expect(result.current.config.concurrency).toBe(DEFAULT_IMPORT_QUEUE_CONFIG.concurrency);
  });

  it('merges custom config with defaults', () => {
    const { result } = renderHook(() =>
      useAssetImport({ config: { maxFiles: 10 } }),
    );

    expect(result.current.config.maxFiles).toBe(10);
    expect(result.current.config.concurrency).toBe(DEFAULT_IMPORT_QUEUE_CONFIG.concurrency);
  });

  // -------------------------------------------------------------------------
  // File Addition
  // -------------------------------------------------------------------------

  describe('addFiles', () => {
    it('adds files to the entries list', async () => {
      const { result } = renderHook(() => useAssetImport());
      const file = createMockFile('model.glb', 1024, 'model/gltf-binary');

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.entries.length).toBe(1);
      expect(result.current.entries[0].file.name).toBe('model.glb');
      expect(result.current.entries[0].category).toBe(AssetCategory.MODEL_3D);
    });

    it('generates correct alias from filename', async () => {
      const { result } = renderHook(() => useAssetImport());
      const file = createMockFile('My Cool Model.glb', 1024);

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.entries[0].alias).toBe('my_cool_model');
    });

    it('sets default target path', async () => {
      const { result } = renderHook(() =>
        useAssetImport({ config: { defaultTargetPath: '/assets/models/' } }),
      );
      const file = createMockFile('tree.glb', 1024);

      await act(async () => {
        await result.current.addFiles([file]);
      });

      expect(result.current.entries[0].targetPath).toContain('/assets/models/');
    });

    it('handles multiple files', async () => {
      const { result } = renderHook(() => useAssetImport());
      const files = [
        createMockFile('model.glb', 1024),
        createMockFile('texture.png', 2048),
        createMockFile('sound.mp3', 512),
      ];

      await act(async () => {
        await result.current.addFiles(files);
      });

      expect(result.current.entries.length).toBe(3);
      expect(result.current.totalSize).toBe(1024 + 2048 + 512);
    });

    it('calls onFilesAdded event', async () => {
      const onFilesAdded = vi.fn();
      const { result } = renderHook(() =>
        useAssetImport({ events: { onFilesAdded } }),
      );

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      expect(onFilesAdded).toHaveBeenCalledTimes(1);
      expect(onFilesAdded).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ file: expect.any(File) }),
        ]),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Entry Management
  // -------------------------------------------------------------------------

  describe('entry management', () => {
    it('removes an entry', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1024),
          createMockFile('b.glb', 1024),
        ]);
      });

      const idToRemove = result.current.entries[0].id;

      act(() => {
        result.current.removeEntry(idToRemove);
      });

      expect(result.current.entries.length).toBe(1);
      expect(result.current.entries[0].id).not.toBe(idToRemove);
    });

    it('clears all entries', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1024),
          createMockFile('b.glb', 1024),
        ]);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.entries.length).toBe(0);
    });

    it('updates alias', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      const id = result.current.entries[0].id;

      act(() => {
        result.current.updateAlias(id, 'custom_alias');
      });

      expect(result.current.entries[0].alias).toBe('custom_alias');
    });

    it('updates target path', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      const id = result.current.entries[0].id;

      act(() => {
        result.current.updateTargetPath(id, '/custom/path/model.glb');
      });

      expect(result.current.entries[0].targetPath).toBe('/custom/path/model.glb');
    });
  });

  // -------------------------------------------------------------------------
  // Selection
  // -------------------------------------------------------------------------

  describe('selection', () => {
    it('toggles entry selection', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      const id = result.current.entries[0].id;

      expect(result.current.entries[0].selected).toBe(false);

      act(() => {
        result.current.toggleSelection(id);
      });

      expect(result.current.entries[0].selected).toBe(true);

      act(() => {
        result.current.toggleSelection(id);
      });

      expect(result.current.entries[0].selected).toBe(false);
    });

    it('selects all entries', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1024),
          createMockFile('b.glb', 1024),
        ]);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.entries.every((e) => e.selected)).toBe(true);
    });

    it('deselects all entries', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1024),
          createMockFile('b.glb', 1024),
        ]);
      });

      act(() => {
        result.current.selectAll();
      });

      act(() => {
        result.current.deselectAll();
      });

      expect(result.current.entries.every((e) => !e.selected)).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // State Counts
  // -------------------------------------------------------------------------

  describe('computed values', () => {
    it('calculates state counts correctly', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1024),
          createMockFile('b.glb', 1024),
        ]);
      });

      const counts = result.current.stateCounts;
      // After processing, entries should be in QUEUED state
      const totalCounted = Object.values(counts).reduce((a, b) => a + b, 0);
      expect(totalCounted).toBe(2);
    });

    it('calculates total size correctly', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1000),
          createMockFile('b.png', 2000),
        ]);
      });

      expect(result.current.totalSize).toBe(3000);
    });
  });

  // -------------------------------------------------------------------------
  // Import Execution
  // -------------------------------------------------------------------------

  describe('import execution', () => {
    it('calls onImport callback during importAll', async () => {
      const onImport = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAssetImport({ onImport }));

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      await act(async () => {
        await result.current.importAll();
      });

      expect(onImport).toHaveBeenCalled();
    });

    it('marks entries as COMPLETE after successful import', async () => {
      const onImport = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAssetImport({ onImport }));

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      await act(async () => {
        await result.current.importAll();
      });

      expect(result.current.entries[0].state).toBe(ImportState.COMPLETE);
      expect(result.current.entries[0].completedAt).not.toBeNull();
    });

    it('marks entries as ERROR on import failure', async () => {
      const onImport = vi.fn().mockRejectedValue(new Error('Upload failed'));
      const { result } = renderHook(() => useAssetImport({ onImport }));

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      await act(async () => {
        await result.current.importAll();
      });

      expect(result.current.entries[0].state).toBe(ImportState.ERROR);
      expect(result.current.entries[0].error).toBe('Upload failed');
    });

    it('imports a single entry', async () => {
      const onImport = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAssetImport({ onImport }));

      await act(async () => {
        await result.current.addFiles([
          createMockFile('a.glb', 1024),
          createMockFile('b.glb', 1024),
        ]);
      });

      const id = result.current.entries[0].id;

      await act(async () => {
        await result.current.importEntry(id);
      });

      expect(result.current.entries[0].state).toBe(ImportState.COMPLETE);
      // Second entry should still be queued
      expect(result.current.entries[1].state).not.toBe(ImportState.COMPLETE);
    });
  });

  // -------------------------------------------------------------------------
  // Cancel and Retry
  // -------------------------------------------------------------------------

  describe('cancel and retry', () => {
    it('cancels an entry', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      const id = result.current.entries[0].id;

      act(() => {
        result.current.cancelEntry(id);
      });

      expect(result.current.entries[0].state).toBe(ImportState.CANCELLED);
    });

    it('retries a failed entry', async () => {
      const onImport = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useAssetImport({ onImport }));

      await act(async () => {
        await result.current.addFiles([createMockFile('model.glb', 1024)]);
      });

      await act(async () => {
        await result.current.importAll();
      });

      expect(result.current.entries[0].state).toBe(ImportState.ERROR);

      const id = result.current.entries[0].id;

      await act(async () => {
        await result.current.retryEntry(id);
      });

      // After retry, the entry should be re-processed
      expect(result.current.entries[0].error).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Validation Integration
  // -------------------------------------------------------------------------

  describe('validation', () => {
    it('rejects empty files during processing', async () => {
      const { result } = renderHook(() => useAssetImport());

      await act(async () => {
        await result.current.addFiles([createMockFile('empty.glb', 0)]);
      });

      expect(result.current.entries[0].state).toBe(ImportState.ERROR);
      expect(result.current.entries[0].error).toBeTruthy();
    });
  });
});
