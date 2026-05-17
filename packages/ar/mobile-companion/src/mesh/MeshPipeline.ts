/**
 * Mesh Pipeline Orchestrator
 *
 * Coordinates the 6-stage spatial mesh scanning pipeline:
 *   CAPTURE -> PROCESS -> OPTIMIZE -> SYNC -> PERSIST -> RENDER
 *
 * The pipeline runs as a state machine with configurable processing
 * at each stage. Stages can run in real-time (streaming) or batch mode.
 *
 * Integration points:
 *   - Receives MeshCaptureFrame from native ARKit/ARCore via platform channel
 *   - Sends MeshChunkDelta to backend via REST/WebSocket
 *   - Exposes LODMesh data for AR renderer
 *   - Emits progress events for Flutter UI
 */

import type {
  MeshCaptureFrame,
  MeshProcessConfig,
  MeshProcessResult,
  MeshProcessStats,
  MeshOptimizeConfig,
  MeshOptimizeResult,
  MeshSyncConfig,
  MeshSyncStatus,
  MeshRenderConfig,
  MeshRenderState,
  MeshChunk,
  MeshChunkId,
  MeshChunkDelta,
  MeshScanConfig,
  MeshScanProgressEvent,
  MeshScanResult,
  MeshClassificationLabel,
  LODMesh,
} from './types';
import {
  DEFAULT_MESH_PROCESS_CONFIG,
  DEFAULT_MESH_OPTIMIZE_CONFIG,
  DEFAULT_MESH_SYNC_CONFIG,
  DEFAULT_MESH_RENDER_CONFIG,
} from './types';
import type { AABB, Pose6DoF } from '../types';

// =============================================================================
// PIPELINE STATE
// =============================================================================

export type PipelineState =
  | 'idle' // Not scanning
  | 'scanning' // Receiving capture frames
  | 'processing' // Processing captured data
  | 'optimizing' // Generating LODs
  | 'syncing' // Uploading to cloud
  | 'complete' // Scan finished
  | 'error'; // Pipeline error

export type PipelineEventType =
  | 'stateChanged'
  | 'frameProcessed'
  | 'chunkCreated'
  | 'chunkUpdated'
  | 'chunkSynced'
  | 'progress'
  | 'error';

export interface PipelineEvent {
  type: PipelineEventType;
  timestamp: number;
  data: unknown;
}

export type PipelineEventHandler = (event: PipelineEvent) => void;

// =============================================================================
// MESH PIPELINE
// =============================================================================

/**
 * Mesh Pipeline Orchestrator
 *
 * Manages the complete lifecycle of spatial mesh scanning,
 * from raw AR frame capture to cloud-synchronized mesh chunks.
 */
export class MeshPipeline {
  // Configuration
  private processConfig: MeshProcessConfig;
  private optimizeConfig: MeshOptimizeConfig;
  private syncConfig: MeshSyncConfig;
  private renderConfig: MeshRenderConfig;

  // State
  private state: PipelineState = 'idle';
  private worldId: string = '';
  private sessionId: string = '';
  private startTime: number = 0;

  // Data
  private chunks: Map<string, MeshChunk> = new Map();
  private pendingFrames: MeshCaptureFrame[] = [];
  private renderStates: Map<string, MeshRenderState> = new Map();

  // Statistics
  private totalVertices: number = 0;
  private totalTriangles: number = 0;
  private scannedArea: number = 0;
  private framesProcessed: number = 0;

  // Events
  private eventHandlers: Set<PipelineEventHandler> = new Set();

  constructor(config?: Partial<MeshScanConfig>) {
    this.processConfig = config?.processConfig ?? { ...DEFAULT_MESH_PROCESS_CONFIG };
    this.optimizeConfig = config?.optimizeConfig ?? { ...DEFAULT_MESH_OPTIMIZE_CONFIG };
    this.syncConfig = config?.syncConfig ?? { ...DEFAULT_MESH_SYNC_CONFIG };
    this.renderConfig = config?.renderConfig ?? { ...DEFAULT_MESH_RENDER_CONFIG };
    this.worldId = config?.worldId ?? '';
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Start a new mesh scan session.
   */
  start(worldId: string): string {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start scan: pipeline is in '${this.state}' state`);
    }

    this.worldId = worldId;
    this.sessionId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    this.startTime = Date.now();
    this.state = 'scanning';

    this.emitEvent({ type: 'stateChanged', timestamp: Date.now(), data: { state: 'scanning' } });

    return this.sessionId;
  }

  /**
   * Stop the current scan and finalize results.
   */
  async stop(): Promise<MeshScanResult> {
    if (this.state !== 'scanning') {
      throw new Error(`Cannot stop scan: pipeline is in '${this.state}' state`);
    }

    // Process any remaining frames
    this.state = 'processing';
    this.emitEvent({ type: 'stateChanged', timestamp: Date.now(), data: { state: 'processing' } });
    await this.processRemainingFrames();

    // Optimize all chunks
    this.state = 'optimizing';
    this.emitEvent({ type: 'stateChanged', timestamp: Date.now(), data: { state: 'optimizing' } });
    await this.optimizeAllChunks();

    // Sync to cloud
    this.state = 'syncing';
    this.emitEvent({ type: 'stateChanged', timestamp: Date.now(), data: { state: 'syncing' } });
    await this.syncAllChunks();

    // Build result
    this.state = 'complete';
    this.emitEvent({ type: 'stateChanged', timestamp: Date.now(), data: { state: 'complete' } });

    const result = this.buildResult();

    // Reset
    this.reset();

    return result;
  }

  /**
   * Reset the pipeline to idle state.
   */
  reset(): void {
    this.state = 'idle';
    this.chunks.clear();
    this.pendingFrames = [];
    this.renderStates.clear();
    this.totalVertices = 0;
    this.totalTriangles = 0;
    this.scannedArea = 0;
    this.framesProcessed = 0;
  }

  // ==========================================================================
  // FRAME INGESTION (Stage 1: Capture)
  // ==========================================================================

  /**
   * Ingest a new mesh capture frame from the native AR system.
   *
   * In real-time mode, the frame is processed immediately.
   * In batch mode, it is queued for later processing.
   */
  ingestFrame(frame: MeshCaptureFrame): void {
    if (this.state !== 'scanning') {
      return; // Silently ignore frames when not scanning
    }

    this.framesProcessed++;

    // Assign to spatial chunk(s)
    const chunkIds = this.computeChunkIds(frame.boundingBox);

    for (const chunkId of chunkIds) {
      const key = chunkId.key;

      if (!this.chunks.has(key)) {
        // Create new chunk
        const chunk = this.createChunk(chunkId, frame);
        this.chunks.set(key, chunk);
        this.emitEvent({ type: 'chunkCreated', timestamp: Date.now(), data: { chunkId: key } });
      } else {
        // Update existing chunk with new frame data
        this.updateChunk(key, frame);
        this.emitEvent({ type: 'chunkUpdated', timestamp: Date.now(), data: { chunkId: key } });
      }
    }

    // Update statistics
    this.totalVertices += frame.vertexCount;
    this.totalTriangles += frame.triangleCount;
    this.updateScannedArea(frame.boundingBox);

    // Emit progress
    this.emitProgress();
  }

  // ==========================================================================
  // SPATIAL CHUNKING
  // ==========================================================================

  /**
   * Compute which spatial chunks a bounding box overlaps.
   */
  private computeChunkIds(bbox: AABB): MeshChunkId[] {
    const cellSize = this.syncConfig.chunkCellSize;
    const ids: MeshChunkId[] = [];

    const minCellX = Math.floor(bbox.min.x / cellSize);
    const minCellY = Math.floor(bbox.min.y / cellSize);
    const minCellZ = Math.floor(bbox.min.z / cellSize);
    const maxCellX = Math.floor(bbox.max.x / cellSize);
    const maxCellY = Math.floor(bbox.max.y / cellSize);
    const maxCellZ = Math.floor(bbox.max.z / cellSize);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        for (let cz = minCellZ; cz <= maxCellZ; cz++) {
          ids.push({
            key: `${cx}_${cy}_${cz}`,
            cellX: cx,
            cellY: cy,
            cellZ: cz,
            cellSize,
          });
        }
      }
    }

    return ids;
  }

  /**
   * Create a new mesh chunk from a capture frame.
   */
  private createChunk(chunkId: MeshChunkId, frame: MeshCaptureFrame): MeshChunk {
    return {
      id: chunkId,
      version: 1,
      lods: [], // Generated during optimize stage
      boundingBox: {
        min: {
          x: chunkId.cellX * chunkId.cellSize,
          y: chunkId.cellY * chunkId.cellSize,
          z: chunkId.cellZ * chunkId.cellSize,
        },
        max: {
          x: (chunkId.cellX + 1) * chunkId.cellSize,
          y: (chunkId.cellY + 1) * chunkId.cellSize,
          z: (chunkId.cellZ + 1) * chunkId.cellSize,
        },
      },
      vertexCount: frame.vertexCount,
      triangleCount: frame.triangleCount,
      lastModified: Date.now(),
      lastModifiedBy: this.sessionId,
      isDirty: true,
    };
  }

  /**
   * Update an existing chunk with new frame data.
   */
  private updateChunk(key: string, frame: MeshCaptureFrame): void {
    const chunk = this.chunks.get(key);
    if (!chunk) return;

    chunk.version++;
    chunk.vertexCount += frame.vertexCount;
    chunk.triangleCount += frame.triangleCount;
    chunk.lastModified = Date.now();
    chunk.lastModifiedBy = this.sessionId;
    chunk.isDirty = true;
  }

  // ==========================================================================
  // PROCESSING (Stage 2: Process)
  // ==========================================================================

  /**
   * Process all remaining queued frames.
   */
  private async processRemainingFrames(): Promise<void> {
    // In a real implementation, this would run the full processing pipeline:
    // 1. Vertex welding
    // 2. Normal recomputation
    // 3. Hole filling
    // 4. Classification propagation
    // 5. Degenerate triangle removal

    // For the architecture, we document the interface
    this.emitEvent({
      type: 'progress',
      timestamp: Date.now(),
      data: { phase: 'processing', progress: 1.0 },
    });
  }

  // ==========================================================================
  // OPTIMIZATION (Stage 3: Optimize)
  // ==========================================================================

  /**
   * Generate LOD levels for all chunks.
   */
  private async optimizeAllChunks(): Promise<void> {
    const chunkCount = this.chunks.size;
    let processed = 0;

    for (const [key, chunk] of this.chunks) {
      // In a real implementation, this would:
      // 1. Run QEM decimation for each LOD level
      // 2. Generate texture atlas from camera projections
      // 3. Apply mesh compression (Draco/meshopt)

      processed++;
      this.emitEvent({
        type: 'progress',
        timestamp: Date.now(),
        data: { phase: 'optimizing', progress: processed / chunkCount },
      });
    }
  }

  // ==========================================================================
  // SYNC (Stage 4: Sync)
  // ==========================================================================

  /**
   * Upload all dirty chunks to the cloud.
   */
  private async syncAllChunks(): Promise<void> {
    const dirtyChunks = Array.from(this.chunks.values()).filter((c) => c.isDirty);
    let synced = 0;

    for (const chunk of dirtyChunks) {
      // In a real implementation, this would:
      // 1. Compute delta from previous version
      // 2. Compress delta
      // 3. Upload via REST API
      // 4. Handle conflict resolution

      chunk.isDirty = false;
      synced++;

      this.emitEvent({
        type: 'chunkSynced',
        timestamp: Date.now(),
        data: { chunkId: chunk.id.key, version: chunk.version },
      });
      this.emitEvent({
        type: 'progress',
        timestamp: Date.now(),
        data: { phase: 'syncing', progress: synced / dirtyChunks.length },
      });
    }
  }

  // ==========================================================================
  // RENDER STATE (Stage 6: Render)
  // ==========================================================================

  /**
   * Update render state for a camera position.
   * Determines which chunks are visible and selects appropriate LOD levels.
   */
  updateRenderState(cameraPose: Pose6DoF): Map<string, MeshRenderState> {
    const cameraPos = cameraPose.position;

    for (const [key, chunk] of this.chunks) {
      const chunkCenter = {
        x: (chunk.boundingBox.min.x + chunk.boundingBox.max.x) / 2,
        y: (chunk.boundingBox.min.y + chunk.boundingBox.max.y) / 2,
        z: (chunk.boundingBox.min.z + chunk.boundingBox.max.z) / 2,
      };

      const dx = cameraPos.x - chunkCenter.x;
      const dy = cameraPos.y - chunkCenter.y;
      const dz = cameraPos.z - chunkCenter.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Select LOD based on distance
      let activeLOD = 0;
      if (distance > 50) activeLOD = 4;
      else if (distance > 10) activeLOD = 3;
      else if (distance > 3) activeLOD = 2;
      else if (distance > 1) activeLOD = 1;

      // Apply LOD bias from config
      activeLOD = Math.max(0, Math.min(4, activeLOD + this.renderConfig.lodBias));

      this.renderStates.set(key, {
        chunkId: key,
        activeLOD,
        isVisible: true, // TODO: frustum culling
        distanceFromCamera: distance,
        gpuMemory: 0, // TODO: track GPU allocation
        isLoaded: chunk.lods.length > 0,
        lastRenderedFrame: Date.now(),
      });
    }

    return this.renderStates;
  }

  // ==========================================================================
  // STATISTICS & EVENTS
  // ==========================================================================

  /**
   * Update estimated scanned area from bounding box.
   */
  private updateScannedArea(bbox: AABB): void {
    const width = bbox.max.x - bbox.min.x;
    const depth = bbox.max.z - bbox.min.z;
    // Rough estimate: project to floor plane
    this.scannedArea = Math.max(this.scannedArea, width * depth);
  }

  /**
   * Emit a progress event.
   */
  private emitProgress(): void {
    const event: MeshScanProgressEvent = {
      phase: this.state === 'scanning' ? 'scanning' : (this.state as any),
      progress: 0, // Scanning has no defined end
      totalVertices: this.totalVertices,
      totalTriangles: this.totalTriangles,
      scannedArea: this.scannedArea,
      chunkCount: this.chunks.size,
      fps: 0, // TODO: Calculate actual FPS
    };

    this.emitEvent({ type: 'progress', timestamp: Date.now(), data: event });
  }

  /**
   * Build the final scan result.
   */
  private buildResult(): MeshScanResult {
    const classificationSummary: Record<number, number> = {};

    return {
      worldId: this.worldId,
      sessionId: this.sessionId,
      chunks: Array.from(this.chunks.values()),
      totalVertices: this.totalVertices,
      totalTriangles: this.totalTriangles,
      scannedArea: this.scannedArea,
      scanDuration: Date.now() - this.startTime,
      processStats: {
        inputVertexCount: this.totalVertices,
        outputVertexCount: this.totalVertices,
        verticesWelded: 0,
        inputTriangleCount: this.totalTriangles,
        outputTriangleCount: this.totalTriangles,
        holesDetected: 0,
        holesFilled: 0,
        facesClassified: 0,
        componentsRemoved: 0,
        degenerateTrianglesRemoved: 0,
        processingTimeMs: 0,
      },
      optimizeStats: {
        lodCount: 5,
        totalTriangles: this.totalTriangles,
        totalCompressedSize: 0,
        totalUncompressedSize: 0,
        compressionRatio: 1,
        decimationTimeMs: 0,
        atlasTimeMs: 0,
        compressionTimeMs: 0,
        totalTimeMs: 0,
      },
      syncStatus: this.getSyncStatus(),
      boundingBox: this.computeGlobalBoundingBox(),
      anchors: [],
      classificationSummary: classificationSummary as Record<MeshClassificationLabel, number>,
    };
  }

  /**
   * Get current sync status.
   */
  getSyncStatus(): MeshSyncStatus {
    let dirtyCount = 0;
    for (const chunk of this.chunks.values()) {
      if (chunk.isDirty) dirtyCount++;
    }

    return {
      totalChunks: this.chunks.size,
      dirtyChunks: dirtyCount,
      uploadingChunks: 0,
      pendingChunks: dirtyCount,
      lastSyncTimestamp: Date.now(),
      currentBandwidth: 0,
      totalBytesUploaded: 0,
      totalBytesDownloaded: 0,
      errorCount: 0,
    };
  }

  /**
   * Compute the global bounding box across all chunks.
   */
  private computeGlobalBoundingBox(): AABB {
    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const chunk of this.chunks.values()) {
      minX = Math.min(minX, chunk.boundingBox.min.x);
      minY = Math.min(minY, chunk.boundingBox.min.y);
      minZ = Math.min(minZ, chunk.boundingBox.min.z);
      maxX = Math.max(maxX, chunk.boundingBox.max.x);
      maxY = Math.max(maxY, chunk.boundingBox.max.y);
      maxZ = Math.max(maxZ, chunk.boundingBox.max.z);
    }

    if (!isFinite(minX)) {
      return { min: { x: 0, y: 0, z: 0 }, max: { x: 0, y: 0, z: 0 } };
    }

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
    };
  }

  // ==========================================================================
  // EVENT SYSTEM
  // ==========================================================================

  /**
   * Subscribe to pipeline events.
   */
  on(handler: PipelineEventHandler): () => void {
    this.eventHandlers.add(handler);
    return () => this.eventHandlers.delete(handler);
  }

  /**
   * Emit a pipeline event.
   */
  private emitEvent(event: PipelineEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Pipeline event handler error:', error);
      }
    }
  }

  // ==========================================================================
  // GETTERS
  // ==========================================================================

  getState(): PipelineState {
    return this.state;
  }
  getWorldId(): string {
    return this.worldId;
  }
  getSessionId(): string {
    return this.sessionId;
  }
  getChunkCount(): number {
    return this.chunks.size;
  }
  getTotalVertices(): number {
    return this.totalVertices;
  }
  getTotalTriangles(): number {
    return this.totalTriangles;
  }
  getScannedArea(): number {
    return this.scannedArea;
  }
  getFramesProcessed(): number {
    return this.framesProcessed;
  }
}
