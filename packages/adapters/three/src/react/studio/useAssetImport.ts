/**
 * useAssetImport Hook
 *
 * Core React hook that manages the full asset import lifecycle:
 * file classification, validation, progressive preview generation,
 * and import queue management.
 *
 * Designed for the Studio IDE's drag-and-drop asset import workflow.
 *
 * @module studio/useAssetImport
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  AssetCategory,
  ImportState,
  PreviewStage,
  DEFAULT_IMPORT_QUEUE_CONFIG,
  type ImportEntry,
  type ImportQueueConfig,
  type ImportEvents,
  type AssetPreview,
} from './types';
import {
  classifyFile,
  extractFileMetadata,
  validateFile,
  createEmptyPreview,
  generateImageThumbnail,
  generateAudioPreview,
  generateVideoThumbnail,
  extractGLBMetadata,
  computeFileHash,
  generateImportId,
} from './assetUtils';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAssetImportOptions {
  /** Import queue configuration */
  config?: Partial<ImportQueueConfig>;
  /** Event callbacks */
  events?: Partial<ImportEvents>;
  /** Called when files are ready to be committed to the project */
  onImport?: (entries: ImportEntry[]) => Promise<void>;
}

export interface UseAssetImportReturn {
  /** Current import entries */
  entries: ImportEntry[];
  /** Add files to the import queue */
  addFiles: (files: FileList | File[]) => Promise<void>;
  /** Remove an entry from the queue */
  removeEntry: (id: string) => void;
  /** Clear all entries */
  clearAll: () => void;
  /** Start importing all queued entries */
  importAll: () => Promise<void>;
  /** Import a single entry */
  importEntry: (id: string) => Promise<void>;
  /** Cancel an in-progress import */
  cancelEntry: (id: string) => void;
  /** Retry a failed import */
  retryEntry: (id: string) => Promise<void>;
  /** Update an entry's alias */
  updateAlias: (id: string, alias: string) => void;
  /** Update an entry's target path */
  updateTargetPath: (id: string, path: string) => void;
  /** Toggle entry selection */
  toggleSelection: (id: string) => void;
  /** Select all entries */
  selectAll: () => void;
  /** Deselect all entries */
  deselectAll: () => void;
  /** Whether any imports are in progress */
  isImporting: boolean;
  /** Whether all entries are complete (no errors, no pending) */
  isAllComplete: boolean;
  /** Overall progress across all entries (0-1) */
  overallProgress: number;
  /** Count of entries by state */
  stateCounts: Record<ImportState, number>;
  /** Total size of all files */
  totalSize: number;
  /** The resolved config */
  config: ImportQueueConfig;
}

// =============================================================================
// HOOK IMPLEMENTATION
// =============================================================================

export function useAssetImport(options: UseAssetImportOptions = {}): UseAssetImportReturn {
  const config = useMemo(
    () => ({ ...DEFAULT_IMPORT_QUEUE_CONFIG, ...options.config }),
    [options.config],
  );

  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const entriesRef = useRef<ImportEntry[]>([]);
  const processingRef = useRef<Set<string>>(new Set());
  const cancelledRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // -------------------------------------------------------------------------
  // Entry update helper
  // -------------------------------------------------------------------------

  const updateEntry = useCallback((id: string, updates: Partial<ImportEntry>) => {
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  }, []);

  // -------------------------------------------------------------------------
  // Preview generation pipeline
  // -------------------------------------------------------------------------

  const generatePreview = useCallback(
    async (entry: ImportEntry): Promise<AssetPreview> => {
      const preview: AssetPreview = { ...createEmptyPreview() };

      // Stage 1: Icon (immediate)
      preview.stage = PreviewStage.ICON;
      updateEntry(entry.id, { preview: { ...preview } });

      // Stage 2: Thumbnail (async)
      try {
        switch (entry.category) {
          case AssetCategory.TEXTURE: {
            const { imageUrl, aspectRatio, dominantColor } = await generateImageThumbnail(
              entry.file,
              256,
            );
            preview.stage = PreviewStage.THUMBNAIL;
            preview.imageUrl = imageUrl;
            preview.aspectRatio = aspectRatio;
            preview.dominantColor = dominantColor;
            updateEntry(entry.id, { preview: { ...preview } });
            break;
          }

          case AssetCategory.VIDEO: {
            const { imageUrl, aspectRatio } = await generateVideoThumbnail(entry.file, 256);
            preview.stage = PreviewStage.THUMBNAIL;
            preview.imageUrl = imageUrl;
            preview.aspectRatio = aspectRatio;
            updateEntry(entry.id, { preview: { ...preview } });
            break;
          }

          case AssetCategory.AUDIO: {
            const audioInfo = await generateAudioPreview(entry.file);
            preview.stage = PreviewStage.FULL_PREVIEW;
            preview.audioInfo = audioInfo;
            updateEntry(entry.id, { preview: { ...preview } });
            return preview; // Audio goes straight to full preview
          }

          case AssetCategory.MODEL_3D: {
            // Extract GLB metadata without full parse
            const modelInfo = await extractGLBMetadata(entry.file);
            if (modelInfo) {
              preview.modelInfo = modelInfo;
              preview.stage = PreviewStage.THUMBNAIL;
              updateEntry(entry.id, { preview: { ...preview } });
            }
            break;
          }

          default:
            // No thumbnail generation for other types
            preview.stage = PreviewStage.ICON;
            break;
        }
      } catch (err) {
        // Preview generation failure is non-fatal -- keep the icon stage
        console.warn(`[useAssetImport] Preview generation failed for ${entry.file.name}:`, err);
      }

      // Stage 3: Full preview (only for certain types)
      if (config.generate3DPreviews && entry.category === AssetCategory.MODEL_3D) {
        // Full 3D preview is handled by the AssetPreviewCard component
        // which renders a tiny Three.js canvas. We just set the stage.
        preview.stage = PreviewStage.FULL_PREVIEW;
        updateEntry(entry.id, { preview: { ...preview } });
      } else if (
        entry.category === AssetCategory.TEXTURE &&
        preview.stage === PreviewStage.THUMBNAIL
      ) {
        // For textures, thumbnail IS the full preview
        preview.stage = PreviewStage.FULL_PREVIEW;
        updateEntry(entry.id, { preview: { ...preview } });
      }

      return preview;
    },
    [config.generate3DPreviews, updateEntry],
  );

  // -------------------------------------------------------------------------
  // File processing pipeline (per file)
  // -------------------------------------------------------------------------

  const processFile = useCallback(
    async (entry: ImportEntry): Promise<void> => {
      const id = entry.id;
      if (cancelledRef.current.has(id)) return;

      // Step 1: Validate
      updateEntry(id, { state: ImportState.VALIDATING, progress: 0.1 });

      const existingFiles = entriesRef.current
        .filter((e) => e.id !== id)
        .map((e) => e.file);

      const validation = validateFile(entry.file, config, existingFiles);
      updateEntry(id, { validation, progress: 0.2 });

      if (!validation.isValid) {
        updateEntry(id, {
          state: ImportState.ERROR,
          error: validation.messages
            .filter((m) => m.severity === 'error')
            .map((m) => m.message)
            .join('; '),
          progress: 0,
        });
        return;
      }

      if (cancelledRef.current.has(id)) return;

      // Step 2: Generate preview
      updateEntry(id, { state: ImportState.GENERATING_PREVIEW, progress: 0.3 });

      try {
        await Promise.race([
          generatePreview(entry),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Preview generation timed out')), config.previewTimeout),
          ),
        ]);
      } catch (err) {
        // Preview timeout is non-fatal
        console.warn(`[useAssetImport] Preview timed out for ${entry.file.name}`);
      }

      if (cancelledRef.current.has(id)) return;

      // Step 3: Compute file hash (for dedup)
      updateEntry(id, { state: ImportState.READING, progress: 0.5 });

      try {
        const fileHash = await computeFileHash(entry.file);

        // Check for duplicates
        const duplicateEntry = entriesRef.current.find(
          (e) => e.id !== id && e.validation?.fileHash === fileHash,
        );

        updateEntry(id, {
          validation: {
            ...validation,
            fileHash,
            isDuplicate: !!duplicateEntry,
            duplicatePath: duplicateEntry?.targetPath,
          },
          progress: 0.6,
        });
      } catch {
        // Hash failure is non-fatal
      }

      if (cancelledRef.current.has(id)) return;

      // Step 4: Ready for import (queued state)
      updateEntry(id, { state: ImportState.QUEUED, progress: 0.7 });

      // If auto-import is enabled, continue to import
      if (config.autoImport) {
        await performImport(id);
      }
    },
    [config, generatePreview, updateEntry],
  );

  // -------------------------------------------------------------------------
  // Import execution
  // -------------------------------------------------------------------------

  const performImport = useCallback(
    async (id: string): Promise<void> => {
      if (processingRef.current.has(id)) return;
      processingRef.current.add(id);

      try {
        updateEntry(id, { state: ImportState.IMPORTING, progress: 0.8 });

        const entry = entriesRef.current.find((e) => e.id === id);
        if (!entry) return;

        if (cancelledRef.current.has(id)) {
          updateEntry(id, { state: ImportState.CANCELLED });
          return;
        }

        // Call the user's import handler
        if (options.onImport) {
          await options.onImport([entry]);
        }

        updateEntry(id, {
          state: ImportState.COMPLETE,
          progress: 1,
          completedAt: Date.now(),
        });

        options.events?.onProgress?.(entry);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const entry = entriesRef.current.find((e) => e.id === id);

        updateEntry(id, {
          state: ImportState.ERROR,
          error: errorMsg,
          completedAt: Date.now(),
        });

        if (entry) {
          options.events?.onError?.(entry, err instanceof Error ? err : new Error(errorMsg));
        }
      } finally {
        processingRef.current.delete(id);
      }
    },
    [options, updateEntry],
  );

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  const addFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      const fileArray = Array.from(files);
      const newEntries: ImportEntry[] = [];

      for (const file of fileArray) {
        const metadata = extractFileMetadata(file);
        const entry: ImportEntry = {
          id: generateImportId(),
          file,
          category: metadata.category,
          state: ImportState.QUEUED,
          progress: 0,
          preview: createEmptyPreview(),
          validation: null,
          error: null,
          startedAt: Date.now(),
          completedAt: null,
          alias: metadata.suggestedAlias,
          targetPath: `${config.defaultTargetPath}${metadata.suggestedAlias}${metadata.extension}`,
          selected: false,
        };
        newEntries.push(entry);
      }

      setEntries((prev) => [...prev, ...newEntries]);
      options.events?.onFilesAdded?.(newEntries);

      // Process each file in parallel (up to concurrency limit)
      const processing: Promise<void>[] = [];
      for (const entry of newEntries) {
        if (processing.length >= config.concurrency) {
          await Promise.race(processing);
        }
        const promise = processFile(entry).then(() => {
          const idx = processing.indexOf(promise);
          if (idx !== -1) processing.splice(idx, 1);
        });
        processing.push(promise);
      }

      await Promise.all(processing);
    },
    [config, options.events, processFile],
  );

  const removeEntry = useCallback((id: string) => {
    cancelledRef.current.add(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    entries.forEach((e) => cancelledRef.current.add(e.id));
    setEntries([]);
  }, [entries]);

  const importAll = useCallback(async () => {
    const importable = entriesRef.current.filter(
      (e) => e.state === ImportState.QUEUED && e.validation?.isValid !== false,
    );

    const promises: Promise<void>[] = [];
    for (const entry of importable) {
      if (promises.length >= config.concurrency) {
        await Promise.race(promises);
      }
      const promise = performImport(entry.id).then(() => {
        const idx = promises.indexOf(promise);
        if (idx !== -1) promises.splice(idx, 1);
      });
      promises.push(promise);
    }

    await Promise.all(promises);

    // Notify all complete
    const final = entriesRef.current;
    const allDone = final.every(
      (e) => e.state === ImportState.COMPLETE || e.state === ImportState.ERROR || e.state === ImportState.CANCELLED,
    );
    if (allDone) {
      options.events?.onAllComplete?.(final);
    }
  }, [config.concurrency, performImport, options.events]);

  const importEntry = useCallback(
    async (id: string) => {
      await performImport(id);
    },
    [performImport],
  );

  const cancelEntry = useCallback(
    (id: string) => {
      cancelledRef.current.add(id);
      updateEntry(id, { state: ImportState.CANCELLED });
      options.events?.onCancel?.(entriesRef.current.find((e) => e.id === id)!);
    },
    [updateEntry, options.events],
  );

  const retryEntry = useCallback(
    async (id: string) => {
      cancelledRef.current.delete(id);
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry) return;

      updateEntry(id, {
        state: ImportState.QUEUED,
        error: null,
        progress: 0,
        completedAt: null,
      });

      await processFile(entry);
    },
    [processFile, updateEntry],
  );

  const updateAlias = useCallback(
    (id: string, alias: string) => {
      updateEntry(id, { alias });
    },
    [updateEntry],
  );

  const updateTargetPath = useCallback(
    (id: string, path: string) => {
      updateEntry(id, { targetPath: path });
    },
    [updateEntry],
  );

  const toggleSelection = useCallback(
    (id: string) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, selected: !e.selected } : e)),
      );
    },
    [],
  );

  const selectAll = useCallback(() => {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setEntries((prev) => prev.map((e) => ({ ...e, selected: false })));
  }, []);

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const isImporting = useMemo(
    () =>
      entries.some(
        (e) =>
          e.state === ImportState.IMPORTING ||
          e.state === ImportState.READING ||
          e.state === ImportState.OPTIMIZING ||
          e.state === ImportState.VALIDATING ||
          e.state === ImportState.GENERATING_PREVIEW,
      ),
    [entries],
  );

  const isAllComplete = useMemo(
    () =>
      entries.length > 0 &&
      entries.every(
        (e) =>
          e.state === ImportState.COMPLETE ||
          e.state === ImportState.ERROR ||
          e.state === ImportState.CANCELLED,
      ),
    [entries],
  );

  const overallProgress = useMemo(() => {
    if (entries.length === 0) return 0;
    return entries.reduce((sum, e) => sum + e.progress, 0) / entries.length;
  }, [entries]);

  const stateCounts = useMemo(() => {
    const counts: Record<ImportState, number> = {
      [ImportState.QUEUED]: 0,
      [ImportState.VALIDATING]: 0,
      [ImportState.GENERATING_PREVIEW]: 0,
      [ImportState.READING]: 0,
      [ImportState.OPTIMIZING]: 0,
      [ImportState.IMPORTING]: 0,
      [ImportState.COMPLETE]: 0,
      [ImportState.ERROR]: 0,
      [ImportState.CANCELLED]: 0,
    };
    for (const entry of entries) {
      counts[entry.state]++;
    }
    return counts;
  }, [entries]);

  const totalSize = useMemo(
    () => entries.reduce((sum, e) => sum + e.file.size, 0),
    [entries],
  );

  return {
    entries,
    addFiles,
    removeEntry,
    clearAll,
    importAll,
    importEntry,
    cancelEntry,
    retryEntry,
    updateAlias,
    updateTargetPath,
    toggleSelection,
    selectAll,
    deselectAll,
    isImporting,
    isAllComplete,
    overallProgress,
    stateCounts,
    totalSize,
    config,
  };
}
