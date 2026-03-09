/**
 * @hololand/spatial-builder - AssetDropZone
 *
 * Drag-and-drop zone for importing 3D asset files (GLTF, GLB, OBJ, FBX).
 * Validates file types and sizes, creates Object URLs for preview,
 * and renders an inline GLTFPreview for GLTF/GLB files before adding
 * them to the scene.
 *
 * Features:
 * - File drag-and-drop with visual feedback (hover highlight, drop animation)
 * - Click-to-browse fallback via hidden file input
 * - File type validation (GLTF, GLB, OBJ, FBX)
 * - File size limit enforcement (50 MB default)
 * - Inline 3D preview for GLTF/GLB via GLTFPreview component
 * - Asset metadata collection (triangle count, bounding box)
 * - Queued imports with individual confirm/remove actions
 * - Automatic Object URL lifecycle management (revoke on unmount)
 */

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, FileBox, X, Check, AlertTriangle } from 'lucide-react';
import { GLTFPreview } from './GLTFPreview';
import type { SceneEditorAPI } from './useSceneEditor';
import type { ImportedAssetMeta, AssetFileType, Vec3 } from './types';
import { ACCEPTED_ASSET_EXTENSIONS, MAX_ASSET_FILE_SIZE } from './types';

// =============================================================================
// TYPES
// =============================================================================

export interface AssetDropZoneProps {
  /** The scene editor API from useSceneEditor */
  editor: SceneEditorAPI;
  /** Optional CSS class for the root element */
  className?: string;
}

/** State for a single staged (not-yet-added) asset import */
interface StagedAsset {
  /** Unique key for React list rendering */
  key: string;
  /** Display file name */
  fileName: string;
  /** Detected file type */
  fileType: AssetFileType;
  /** File size in bytes */
  fileSize: number;
  /** Object URL created from the dropped file */
  objectUrl: string;
  /** Whether preview has loaded */
  previewLoaded: boolean;
  /** Preview metadata (populated after GLTFPreview loads) */
  triangleCount?: number;
  /** Preview bounding box */
  boundingBox?: { min: Vec3; max: Vec3 };
  /** Error message if file is invalid or preview failed */
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

let dropKeyCounter = 0;

function generateDropKey(): string {
  dropKeyCounter += 1;
  return `drop-${Date.now().toString(36)}-${dropKeyCounter}`;
}

function getFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex >= 0 ? fileName.substring(dotIndex).toLowerCase() : '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripFileExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

// =============================================================================
// ASSET DROP ZONE COMPONENT
// =============================================================================

/**
 * AssetDropZone
 *
 * A drag-and-drop target area for importing 3D model files.
 * Shows inline GLTF/GLB previews and lets users confirm or cancel
 * before adding assets to the scene graph.
 */
export const AssetDropZone: React.FC<AssetDropZoneProps> = ({
  editor,
  className,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [stagedAssets, setStagedAssets] = useState<StagedAsset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Revoke Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      stagedAssets.forEach((asset) => {
        URL.revokeObjectURL(asset.objectUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------ File Processing ------

  const processFiles = useCallback((files: FileList | File[]) => {
    const newAssets: StagedAsset[] = [];

    for (const file of Array.from(files)) {
      const ext = getFileExtension(file.name);
      const fileType = ACCEPTED_ASSET_EXTENSIONS[ext];

      if (!fileType) {
        newAssets.push({
          key: generateDropKey(),
          fileName: file.name,
          fileType: 'glb', // placeholder
          fileSize: file.size,
          objectUrl: '',
          previewLoaded: false,
          error: `Unsupported format: ${ext || 'unknown'}. Use .gltf, .glb, .obj, or .fbx`,
        });
        continue;
      }

      if (file.size > MAX_ASSET_FILE_SIZE) {
        newAssets.push({
          key: generateDropKey(),
          fileName: file.name,
          fileType,
          fileSize: file.size,
          objectUrl: '',
          previewLoaded: false,
          error: `File too large (${formatFileSize(file.size)}). Max: ${formatFileSize(MAX_ASSET_FILE_SIZE)}`,
        });
        continue;
      }

      const objectUrl = URL.createObjectURL(file);

      newAssets.push({
        key: generateDropKey(),
        fileName: file.name,
        fileType,
        fileSize: file.size,
        objectUrl,
        previewLoaded: false,
      });
    }

    setStagedAssets((prev) => [...prev, ...newAssets]);
  }, []);

  // ------ Drag Events ------

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      // Only process external file drops (not palette drag)
      if (e.dataTransfer.getData('application/hololand-asset')) {
        return; // Let the viewport handle palette drops
      }

      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  // ------ Click to Browse ------

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        // Reset the input so the same file can be selected again
        e.target.value = '';
      }
    },
    [processFiles],
  );

  // ------ Staged Asset Actions ------

  const handlePreviewLoad = useCallback(
    (
      key: string,
      meta: { triangleCount: number; boundingBox: { min: Vec3; max: Vec3 } },
    ) => {
      setStagedAssets((prev) =>
        prev.map((a) =>
          a.key === key
            ? {
                ...a,
                previewLoaded: true,
                triangleCount: meta.triangleCount,
                boundingBox: meta.boundingBox,
              }
            : a,
        ),
      );
    },
    [],
  );

  const handlePreviewError = useCallback((key: string, error: Error) => {
    setStagedAssets((prev) =>
      prev.map((a) =>
        a.key === key
          ? { ...a, previewLoaded: true, error: error.message }
          : a,
      ),
    );
  }, []);

  const handleConfirmAsset = useCallback(
    (asset: StagedAsset) => {
      const assetMeta: ImportedAssetMeta = {
        fileName: asset.fileName,
        fileType: asset.fileType,
        fileSize: asset.fileSize,
        objectUrl: asset.objectUrl,
        boundingBox: asset.boundingBox,
        triangleCount: asset.triangleCount,
      };

      const displayName = stripFileExtension(asset.fileName);
      editor.addImportedAsset(displayName, assetMeta);

      // Remove from staged list (do NOT revoke URL since scene now uses it)
      setStagedAssets((prev) => prev.filter((a) => a.key !== asset.key));
    },
    [editor],
  );

  const handleRemoveAsset = useCallback((asset: StagedAsset) => {
    // Revoke the Object URL since we are discarding
    if (asset.objectUrl) {
      URL.revokeObjectURL(asset.objectUrl);
    }
    setStagedAssets((prev) => prev.filter((a) => a.key !== asset.key));
  }, []);

  // ------ Render ------

  const acceptStr = Object.keys(ACCEPTED_ASSET_EXTENSIONS).join(',');
  const isGltfPreviewable = (fileType: AssetFileType) =>
    fileType === 'gltf' || fileType === 'glb';

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptStr}
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
        aria-label="Import 3D asset files"
      />

      {/* Drop zone target */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
        aria-label="Drop 3D files here or click to browse"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '12px 8px',
          margin: '0 4px',
          borderRadius: 8,
          border: `2px dashed ${isDragOver ? '#6366f1' : 'rgba(255, 255, 255, 0.15)'}`,
          background: isDragOver
            ? 'rgba(99, 102, 241, 0.1)'
            : 'rgba(255, 255, 255, 0.03)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
        }}
      >
        <Upload
          size={18}
          style={{
            color: isDragOver ? '#818cf8' : 'rgba(255, 255, 255, 0.3)',
            transition: 'color 0.2s ease',
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: isDragOver ? '#a5b4fc' : 'rgba(255, 255, 255, 0.35)',
            textAlign: 'center',
            lineHeight: 1.4,
            transition: 'color 0.2s ease',
          }}
        >
          {isDragOver ? 'Drop to import' : 'Drop 3D files or click'}
        </span>
        <span
          style={{
            fontSize: 8,
            color: 'rgba(255, 255, 255, 0.2)',
            textAlign: 'center',
          }}
        >
          GLTF, GLB, OBJ, FBX
        </span>
      </div>

      {/* Staged assets list */}
      {stagedAssets.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            padding: '6px 4px 0',
          }}
        >
          {stagedAssets.map((asset) => (
            <div
              key={asset.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: 6,
                borderRadius: 6,
                background: asset.error
                  ? 'rgba(239, 68, 68, 0.08)'
                  : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${
                  asset.error
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(255, 255, 255, 0.08)'
                }`,
              }}
            >
              {/* File info row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <FileBox
                  size={14}
                  style={{
                    color: asset.error ? '#f87171' : '#818cf8',
                    flexShrink: 0,
                  }}
                />
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255, 255, 255, 0.7)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={asset.fileName}
                  >
                    {asset.fileName}
                  </div>
                  <div
                    style={{
                      fontSize: 8,
                      color: 'rgba(255, 255, 255, 0.3)',
                    }}
                  >
                    {formatFileSize(asset.fileSize)}
                    {asset.fileType && ` \u00B7 ${asset.fileType.toUpperCase()}`}
                    {asset.triangleCount != null &&
                      ` \u00B7 ${asset.triangleCount.toLocaleString()} tris`}
                  </div>
                </div>

                {/* Action buttons */}
                <div
                  style={{
                    display: 'flex',
                    gap: 2,
                    flexShrink: 0,
                  }}
                >
                  {!asset.error && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmAsset(asset);
                      }}
                      title="Add to scene"
                      aria-label={`Add ${asset.fileName} to scene`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        border: 'none',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#4ade80',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAsset(asset);
                    }}
                    title="Remove"
                    aria-label={`Remove ${asset.fileName}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      border: 'none',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Error message */}
              {asset.error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 4,
                    padding: '4px 2px 0',
                  }}
                >
                  <AlertTriangle
                    size={10}
                    style={{
                      color: '#f87171',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 9,
                      color: '#fca5a5',
                      lineHeight: 1.3,
                    }}
                  >
                    {asset.error}
                  </span>
                </div>
              )}

              {/* GLTF/GLB 3D Preview */}
              {!asset.error &&
                isGltfPreviewable(asset.fileType) &&
                asset.objectUrl && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      paddingTop: 2,
                    }}
                  >
                    <GLTFPreview
                      url={asset.objectUrl}
                      width={160}
                      height={120}
                      autoRotate
                      onLoad={(meta) => handlePreviewLoad(asset.key, meta)}
                      onError={(err) => handlePreviewError(asset.key, err)}
                    />
                  </div>
                )}

              {/* Non-GLTF fallback info */}
              {!asset.error && !isGltfPreviewable(asset.fileType) && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px 4px',
                    borderRadius: 4,
                    background: 'rgba(255, 255, 255, 0.03)',
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: 'rgba(255, 255, 255, 0.3)',
                      textAlign: 'center',
                    }}
                  >
                    Preview not available for {asset.fileType.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
