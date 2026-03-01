/**
 * @hololand/ar-mobile-companion - Spatial Mesh Scanning Pipeline Types
 *
 * Defines the complete type system for the 6-stage mesh scanning pipeline:
 * CAPTURE -> PROCESS -> OPTIMIZE -> SYNC -> PERSIST -> RENDER
 */

import type { AABB, Pose6DoF, PlaneClassification, CameraIntrinsicsCompact, MeshResolution } from '../types';

// =============================================================================
// STAGE 1: CAPTURE
// =============================================================================

/**
 * Classification labels for mesh faces.
 * Aligned with ARKit scene classification + custom HoloLand extensions.
 */
export enum MeshClassificationLabel {
  NONE = 0,
  FLOOR = 1,
  WALL = 2,
  CEILING = 3,
  TABLE = 4,
  SEAT = 5,
  DOOR = 6,
  WINDOW = 7,
  // HoloLand extensions
  STAIRS = 8,
  RAMP = 9,
  FURNITURE = 10,
  FIXTURE = 11,  // Light fixtures, vents, etc.
  OBJECT = 12,   // Freestanding object on surface
  CUSTOM = 255,  // User-defined
}

/**
 * A single mesh capture frame from the native AR system.
 * This is the raw output before any processing.
 */
export interface MeshCaptureFrame {
  /** Monotonically increasing frame identifier */
  frameId: number;
  /** Capture timestamp (ms since session start) */
  timestamp: number;
  /** Camera pose at time of capture */
  cameraPose: Pose6DoF;
  /** Camera intrinsics at time of capture */
  cameraIntrinsics: CameraIntrinsicsCompact;
  /**
   * Interleaved vertex positions in world coordinates.
   * Layout: [x0, y0, z0, x1, y1, z1, ...]
   * Units: meters
   */
  vertices: Float32Array;
  /**
   * Per-vertex normals.
   * Layout: [nx0, ny0, nz0, nx1, ny1, nz1, ...]
   */
  normals: Float32Array;
  /**
   * Triangle face indices.
   * Every 3 consecutive values form one triangle.
   */
  indices: Uint32Array;
  /**
   * Per-vertex RGBA colors projected from camera image.
   * Layout: [r0, g0, b0, a0, r1, g1, b1, a1, ...]
   * Range: 0-255
   * Optional: may not be available on all devices.
   */
  colors?: Uint8Array;
  /**
   * Per-face classification labels.
   * Length = indices.length / 3 (one label per triangle).
   * Values map to MeshClassificationLabel enum.
   */
  classifications?: Uint8Array;
  /**
   * Per-vertex confidence scores [0, 1].
   * Higher = more reliable measurement.
   * Derived from depth sensor confidence or reconstruction quality.
   */
  confidence?: Float32Array;
  /** Axis-aligned bounding box of the captured mesh */
  boundingBox: AABB;
  /** Total vertex count */
  vertexCount: number;
  /** Total triangle count */
  triangleCount: number;
  /** Source of mesh data */
  source: MeshCaptureSource;
}

export type MeshCaptureSource =
  | 'arkit_lidar'         // iOS LiDAR via ARMeshAnchor
  | 'arkit_scene_geometry' // iOS scene geometry API
  | 'arcore_depth'        // Android depth API + TSDF reconstruction
  | 'arcore_raw_depth'    // Android raw depth frames
  | 'webxr_depth'         // WebXR depth API
  | 'external';           // External scanner (e.g., Matterport)

// =============================================================================
// STAGE 2: PROCESS
// =============================================================================

/**
 * Configuration for the mesh processing stage.
 */
export interface MeshProcessConfig {
  /** Vertex welding distance threshold (meters). Default: 0.005 (5mm) */
  weldingEpsilon: number;
  /** Recompute vertex normals from face geometry. Default: true */
  recomputeNormals: boolean;
  /** Enable hole filling for missing data. Default: true */
  holeFillEnabled: boolean;
  /** Maximum hole diameter to fill (meters). Default: 0.10 (10cm) */
  holeFillMaxDiameter: number;
  /** Extend planar surfaces (floors/walls) to fill large gaps. Default: true */
  planarExtensionEnabled: boolean;
  /** Propagate classification labels to unclassified faces. Default: true */
  classificationPropagation: boolean;
  /** Minimum face count to keep a connected component. Default: 10 */
  minComponentFaces: number;
  /** Remove degenerate triangles (zero area). Default: true */
  removeDegenerateTriangles: boolean;
  /** Apply Laplacian smoothing. Default: false */
  smoothingEnabled: boolean;
  /** Laplacian smoothing iterations. Default: 2 */
  smoothingIterations: number;
  /** Smoothing lambda (0-1, higher = more smoothing). Default: 0.5 */
  smoothingLambda: number;
}

export const DEFAULT_MESH_PROCESS_CONFIG: MeshProcessConfig = {
  weldingEpsilon: 0.005,
  recomputeNormals: true,
  holeFillEnabled: true,
  holeFillMaxDiameter: 0.10,
  planarExtensionEnabled: true,
  classificationPropagation: true,
  minComponentFaces: 10,
  removeDegenerateTriangles: true,
  smoothingEnabled: false,
  smoothingIterations: 2,
  smoothingLambda: 0.5,
};

/**
 * Result of mesh processing stage.
 */
export interface MeshProcessResult {
  /** Processed vertex positions */
  vertices: Float32Array;
  /** Processed normals */
  normals: Float32Array;
  /** Processed face indices */
  indices: Uint32Array;
  /** Updated per-vertex colors */
  colors?: Uint8Array;
  /** Updated per-face classifications */
  classifications?: Uint8Array;
  /** Updated per-vertex confidence */
  confidence?: Float32Array;
  /** Bounding box after processing */
  boundingBox: AABB;
  /** Processing statistics */
  stats: MeshProcessStats;
}

export interface MeshProcessStats {
  /** Vertices before processing */
  inputVertexCount: number;
  /** Vertices after processing */
  outputVertexCount: number;
  /** Vertices removed by welding */
  verticesWelded: number;
  /** Triangles before processing */
  inputTriangleCount: number;
  /** Triangles after processing */
  outputTriangleCount: number;
  /** Holes detected */
  holesDetected: number;
  /** Holes filled */
  holesFilled: number;
  /** Faces classified by propagation */
  facesClassified: number;
  /** Small components removed */
  componentsRemoved: number;
  /** Degenerate triangles removed */
  degenerateTrianglesRemoved: number;
  /** Processing time (ms) */
  processingTimeMs: number;
}

// =============================================================================
// STAGE 3: OPTIMIZE
// =============================================================================

/**
 * LOD (Level of Detail) level specification.
 */
export interface LODLevel {
  /** LOD index (0 = highest detail) */
  level: number;
  /** Target reduction ratio (1.0 = no reduction) */
  targetRatio: number;
  /** Maximum triangle count */
  maxTriangles: number;
  /** Minimum screen-space error threshold for selection */
  screenSpaceError: number;
  /** Distance range for selection [minDistance, maxDistance] in meters */
  distanceRange: [number, number];
  /** Description for debugging */
  label: string;
}

export const DEFAULT_LOD_LEVELS: LODLevel[] = [
  { level: 0, targetRatio: 1.0,  maxTriangles: Infinity, screenSpaceError: 0,    distanceRange: [0, 1],      label: 'Ultra' },
  { level: 1, targetRatio: 0.5,  maxTriangles: 100_000,  screenSpaceError: 2,    distanceRange: [1, 3],      label: 'High' },
  { level: 2, targetRatio: 0.25, maxTriangles: 25_000,   screenSpaceError: 5,    distanceRange: [3, 10],     label: 'Medium' },
  { level: 3, targetRatio: 0.10, maxTriangles: 5_000,    screenSpaceError: 10,   distanceRange: [10, 50],    label: 'Low' },
  { level: 4, targetRatio: 0.02, maxTriangles: 1_000,    screenSpaceError: 25,   distanceRange: [50, 1000],  label: 'Thumbnail' },
];

/**
 * Configuration for mesh optimization.
 */
export interface MeshOptimizeConfig {
  /** LOD levels to generate */
  lodLevels: LODLevel[];
  /** Preserve classification boundaries during decimation. Default: true */
  preserveClassificationBoundaries: boolean;
  /** Preserve mesh boundary edges during decimation. Default: true */
  preserveBoundaryEdges: boolean;
  /** Generate texture atlas from camera projections. Default: true */
  generateTextureAtlas: boolean;
  /** Texture atlas resolution (per LOD level). Default: [2048, 1024, 512, 256, 128] */
  atlasResolutions: number[];
  /** Atlas padding in pixels. Default: 1 */
  atlasPadding: number;
  /** Generate mipmaps for texture atlases. Default: true */
  generateMipmaps: boolean;
  /** Compression format for mesh data */
  compressionFormat: MeshCompressionFormat;
}

export type MeshCompressionFormat =
  | 'none'
  | 'draco'       // Google Draco mesh compression
  | 'meshopt'     // meshoptimizer (glTF extension)
  | 'quantized';  // Position/normal quantization only

export const DEFAULT_MESH_OPTIMIZE_CONFIG: MeshOptimizeConfig = {
  lodLevels: DEFAULT_LOD_LEVELS,
  preserveClassificationBoundaries: true,
  preserveBoundaryEdges: true,
  generateTextureAtlas: true,
  atlasResolutions: [2048, 1024, 512, 256, 128],
  atlasPadding: 1,
  generateMipmaps: true,
  compressionFormat: 'draco',
};

/**
 * A single LOD mesh output.
 */
export interface LODMesh {
  /** LOD level index */
  level: number;
  /** Vertex positions (may be quantized) */
  vertices: Float32Array;
  /** Vertex normals */
  normals: Float32Array;
  /** Face indices */
  indices: Uint32Array;
  /** UV coordinates for texture atlas */
  uvs?: Float32Array;
  /** Per-face classifications */
  classifications?: Uint8Array;
  /** Triangle count at this LOD */
  triangleCount: number;
  /** Vertex count at this LOD */
  vertexCount: number;
  /** Texture atlas image (RGBA) */
  textureAtlas?: {
    data: Uint8Array;
    width: number;
    height: number;
    format: 'rgba8' | 'rgb8' | 'bc1' | 'bc3' | 'etc2' | 'astc4x4';
  };
  /** Compressed mesh data (if compression enabled) */
  compressedData?: ArrayBuffer;
  /** Compression format used */
  compressionFormat: MeshCompressionFormat;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Uncompressed size in bytes */
  uncompressedSize: number;
}

/**
 * Complete optimization result with all LOD levels.
 */
export interface MeshOptimizeResult {
  /** All generated LOD meshes */
  lods: LODMesh[];
  /** Global bounding box */
  boundingBox: AABB;
  /** Optimization statistics */
  stats: MeshOptimizeStats;
}

export interface MeshOptimizeStats {
  /** LOD levels generated */
  lodCount: number;
  /** Total triangles across all LODs */
  totalTriangles: number;
  /** Total compressed size (bytes) */
  totalCompressedSize: number;
  /** Total uncompressed size (bytes) */
  totalUncompressedSize: number;
  /** Compression ratio */
  compressionRatio: number;
  /** Time for decimation (ms) */
  decimationTimeMs: number;
  /** Time for atlas generation (ms) */
  atlasTimeMs: number;
  /** Time for compression (ms) */
  compressionTimeMs: number;
  /** Total optimization time (ms) */
  totalTimeMs: number;
}

// =============================================================================
// STAGE 4: SYNC
// =============================================================================

/**
 * Spatial chunk identifier and metadata.
 */
export interface MeshChunkId {
  /** Spatial hash key (encodes grid cell position) */
  key: string;
  /** Grid cell coordinates */
  cellX: number;
  cellY: number;
  cellZ: number;
  /** Chunk size in meters */
  cellSize: number;
}

/**
 * A mesh chunk (spatial subdivision for sync).
 */
export interface MeshChunk {
  /** Chunk identifier */
  id: MeshChunkId;
  /** Version counter (monotonically increasing) */
  version: number;
  /** LOD mesh data for this chunk */
  lods: LODMesh[];
  /** Chunk bounding box */
  boundingBox: AABB;
  /** Vertex count in LOD 0 */
  vertexCount: number;
  /** Triangle count in LOD 0 */
  triangleCount: number;
  /** Last modification timestamp */
  lastModified: number;
  /** Device that last modified this chunk */
  lastModifiedBy: string;
  /** Whether this chunk has unsynchronized local changes */
  isDirty: boolean;
}

/**
 * Delta update for a single chunk.
 * Sent to the server for incremental mesh synchronization.
 */
export interface MeshChunkDelta {
  /** Chunk identifier */
  chunkId: string;
  /** New version number */
  version: number;
  /** Previous version (for conflict detection) */
  previousVersion: number;
  /** Vertices added in this update */
  addedVertices: Float32Array;
  /** Indices of removed vertices */
  removedVertexIndices: Uint32Array;
  /** Modified vertex positions (sparse update) */
  modifiedVertices: Array<{
    index: number;
    position: [number, number, number];
    normal?: [number, number, number];
  }>;
  /** New face indices added */
  addedFaces: Uint32Array;
  /** Indices of removed faces */
  removedFaceIndices: Uint32Array;
  /** Classification updates (sparse) */
  classificationUpdates: Array<{
    faceIndex: number;
    classification: MeshClassificationLabel;
  }>;
  /** Device identifier that produced this delta */
  sourceDeviceId: string;
  /** Camera pose when delta was computed */
  sourcePose: Pose6DoF;
  /** Confidence of this update [0, 1] */
  confidence: number;
  /** Serialized delta size (bytes) */
  compressedSize: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Sync configuration.
 */
export interface MeshSyncConfig {
  /** Chunk cell size in meters. Default: 1.0 */
  chunkCellSize: number;
  /** Enable delta compression. Default: true */
  deltaCompressionEnabled: boolean;
  /** Minimum vertex change count to trigger sync. Default: 10 */
  minChangesForSync: number;
  /** Maximum time between syncs (ms). Default: 5000 */
  maxSyncInterval: number;
  /** Conflict resolution strategy */
  conflictStrategy: 'serverWins' | 'clientWins' | 'highestConfidence' | 'merge';
  /** Maximum upload bandwidth (bytes/sec). Default: 1MB/s */
  maxUploadBandwidth: number;
  /** Upload priority: newer chunks first vs. nearest chunks first */
  uploadPriority: 'newest' | 'nearest' | 'largest';
}

export const DEFAULT_MESH_SYNC_CONFIG: MeshSyncConfig = {
  chunkCellSize: 1.0,
  deltaCompressionEnabled: true,
  minChangesForSync: 10,
  maxSyncInterval: 5000,
  conflictStrategy: 'highestConfidence',
  maxUploadBandwidth: 1_000_000,
  uploadPriority: 'nearest',
};

/**
 * Sync status for the mesh pipeline.
 */
export interface MeshSyncStatus {
  /** Total chunks tracked locally */
  totalChunks: number;
  /** Chunks with unsynchronized changes */
  dirtyChunks: number;
  /** Chunks currently uploading */
  uploadingChunks: number;
  /** Chunks pending upload */
  pendingChunks: number;
  /** Last successful sync timestamp */
  lastSyncTimestamp: number;
  /** Current upload bandwidth usage (bytes/sec) */
  currentBandwidth: number;
  /** Total bytes uploaded this session */
  totalBytesUploaded: number;
  /** Total bytes downloaded this session */
  totalBytesDownloaded: number;
  /** Sync errors since last success */
  errorCount: number;
}

// =============================================================================
// STAGE 5: PERSIST
// =============================================================================

/**
 * Local mesh storage metadata entry.
 */
export interface MeshStorageEntry {
  /** World ID this mesh belongs to */
  worldId: string;
  /** Chunk identifier */
  chunkId: string;
  /** Version number */
  version: number;
  /** Local file path for vertex data */
  vertexDataPath: string;
  /** Local file path for index data */
  indexDataPath: string;
  /** Local file path for texture atlas */
  textureAtlasPath?: string;
  /** Total size on disk (bytes) */
  diskSize: number;
  /** Last access timestamp */
  lastAccessed: number;
  /** Last modified timestamp */
  lastModified: number;
  /** Whether this entry has been synced to cloud */
  cloudSynced: boolean;
  /** Cloud storage URL (if synced) */
  cloudUrl?: string;
}

/**
 * Local storage configuration.
 */
export interface MeshStorageConfig {
  /** Maximum local cache size (bytes). Default: 500MB */
  maxCacheSize: number;
  /** Eviction policy */
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  /** Compress data at rest. Default: true */
  compressAtRest: boolean;
  /** Encrypt data at rest. Default: true */
  encryptAtRest: boolean;
  /** Local database path */
  databasePath: string;
  /** Data directory for binary mesh files */
  dataDirectory: string;
}

export const DEFAULT_MESH_STORAGE_CONFIG: MeshStorageConfig = {
  maxCacheSize: 500 * 1024 * 1024, // 500MB
  evictionPolicy: 'lru',
  compressAtRest: true,
  encryptAtRest: true,
  databasePath: 'mesh_cache.db',
  dataDirectory: 'mesh_data/',
};

// =============================================================================
// STAGE 6: RENDER
// =============================================================================

/**
 * Mesh render state per chunk.
 */
export interface MeshRenderState {
  /** Chunk identifier */
  chunkId: string;
  /** Currently active LOD level */
  activeLOD: number;
  /** Whether chunk is visible (in frustum) */
  isVisible: boolean;
  /** Distance from camera to chunk center (meters) */
  distanceFromCamera: number;
  /** GPU memory used (bytes) */
  gpuMemory: number;
  /** Whether chunk mesh is loaded in GPU */
  isLoaded: boolean;
  /** Last frame this chunk was rendered */
  lastRenderedFrame: number;
}

/**
 * Render configuration for mesh overlay.
 */
export interface MeshRenderConfig {
  /** Render mesh as wireframe overlay. Default: false */
  wireframeMode: boolean;
  /** Show classification colors. Default: false */
  showClassificationColors: boolean;
  /** Classification color mapping */
  classificationColors: Record<MeshClassificationLabel, string>;
  /** Mesh opacity [0, 1]. Default: 0.0 (invisible, used only for occlusion) */
  meshOpacity: number;
  /** Enable occlusion (real mesh hides virtual objects). Default: true */
  occlusionEnabled: boolean;
  /** Enable shadow receiving on mesh. Default: true */
  shadowReceivingEnabled: boolean;
  /** Enable physics collision with mesh. Default: true */
  physicsCollisionEnabled: boolean;
  /** Maximum GPU memory for mesh rendering (bytes). Default: 100MB */
  maxGPUMemory: number;
  /** LOD selection bias (-1 to 1, negative = prefer lower LOD). Default: 0 */
  lodBias: number;
}

export const DEFAULT_MESH_RENDER_CONFIG: MeshRenderConfig = {
  wireframeMode: false,
  showClassificationColors: false,
  classificationColors: {
    [MeshClassificationLabel.NONE]: '#808080',
    [MeshClassificationLabel.FLOOR]: '#4CAF50',
    [MeshClassificationLabel.WALL]: '#2196F3',
    [MeshClassificationLabel.CEILING]: '#9C27B0',
    [MeshClassificationLabel.TABLE]: '#FF9800',
    [MeshClassificationLabel.SEAT]: '#FF5722',
    [MeshClassificationLabel.DOOR]: '#795548',
    [MeshClassificationLabel.WINDOW]: '#00BCD4',
    [MeshClassificationLabel.STAIRS]: '#CDDC39',
    [MeshClassificationLabel.RAMP]: '#FFC107',
    [MeshClassificationLabel.FURNITURE]: '#E91E63',
    [MeshClassificationLabel.FIXTURE]: '#607D8B',
    [MeshClassificationLabel.OBJECT]: '#F44336',
    [MeshClassificationLabel.CUSTOM]: '#FFFFFF',
  },
  meshOpacity: 0.0,
  occlusionEnabled: true,
  shadowReceivingEnabled: true,
  physicsCollisionEnabled: true,
  maxGPUMemory: 100 * 1024 * 1024, // 100MB
  lodBias: 0,
};

// =============================================================================
// MESH SCAN SESSION
// =============================================================================

/**
 * Configuration for a complete mesh scan session.
 */
export interface MeshScanConfig {
  /** Mesh capture resolution */
  resolution: MeshResolution;
  /** Processing configuration */
  processConfig: MeshProcessConfig;
  /** Optimization configuration */
  optimizeConfig: MeshOptimizeConfig;
  /** Sync configuration */
  syncConfig: MeshSyncConfig;
  /** Render configuration */
  renderConfig: MeshRenderConfig;
  /** World ID to associate scan with */
  worldId: string;
  /** Enable real-time processing (vs. batch after scan). Default: true */
  realTimeProcessing: boolean;
  /** Enable adaptive resolution (reduce when device is hot). Default: true */
  adaptiveResolution: boolean;
  /** Thermal throttle temperature (Celsius). Default: 40 */
  thermalThrottleTemp: number;
}

/**
 * Mesh scan session progress event.
 */
export interface MeshScanProgressEvent {
  /** Current scan phase */
  phase: 'scanning' | 'processing' | 'optimizing' | 'syncing' | 'complete';
  /** Progress within current phase [0, 1] */
  progress: number;
  /** Total vertices captured so far */
  totalVertices: number;
  /** Total triangles captured so far */
  totalTriangles: number;
  /** Total area scanned (m^2) */
  scannedArea: number;
  /** Number of chunks created */
  chunkCount: number;
  /** Current frame rate */
  fps: number;
  /** Device temperature (Celsius, if available) */
  deviceTemp?: number;
  /** Estimated time remaining (ms, if calculable) */
  estimatedTimeRemaining?: number;
}

/**
 * Complete mesh scan result.
 */
export interface MeshScanResult {
  /** World ID */
  worldId: string;
  /** Session identifier */
  sessionId: string;
  /** All chunks produced */
  chunks: MeshChunk[];
  /** Total vertex count (LOD 0) */
  totalVertices: number;
  /** Total triangle count (LOD 0) */
  totalTriangles: number;
  /** Total scanned area (m^2) */
  scannedArea: number;
  /** Total scan duration (ms) */
  scanDuration: number;
  /** Processing statistics */
  processStats: MeshProcessStats;
  /** Optimization statistics */
  optimizeStats: MeshOptimizeStats;
  /** Sync status */
  syncStatus: MeshSyncStatus;
  /** Bounding box of entire scan */
  boundingBox: AABB;
  /** Anchors placed during scan */
  anchors: string[];
  /** Classifications found */
  classificationSummary: Record<MeshClassificationLabel, number>;
}

// =============================================================================
// MESH EXPORT FORMATS
// =============================================================================

export type MeshExportFormat =
  | 'glb'           // glTF Binary (default)
  | 'gltf'          // glTF JSON + bin
  | 'obj'           // Wavefront OBJ
  | 'ply'           // Stanford PLY (point cloud)
  | 'usdz'          // Apple USD (for Quick Look)
  | 'fbx'           // Autodesk FBX
  | 'holoscript';   // HoloScript spatial declaration

/**
 * Mesh export options.
 */
export interface MeshExportOptions {
  /** Export format */
  format: MeshExportFormat;
  /** LOD level to export (null = all) */
  lodLevel?: number;
  /** Include texture atlas */
  includeTexture: boolean;
  /** Include classification data */
  includeClassification: boolean;
  /** Coordinate system */
  coordinateSystem: 'y-up-right-handed' | 'y-up-left-handed' | 'z-up-right-handed';
  /** Scale factor (1.0 = meters) */
  scaleFactor: number;
  /** Origin offset */
  originOffset: { x: number; y: number; z: number };
}
