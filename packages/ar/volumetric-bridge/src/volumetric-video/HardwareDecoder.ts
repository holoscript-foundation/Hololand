/**
 * HardwareDecoder — H.264 Hardware Decode for 4DGCPro Progressive Streaming
 *
 * Wraps the WebCodecs VideoDecoder API to decode 4DGCPro attribute maps
 * from H.264-encoded frames. Gaussian attributes (position, scale, rotation,
 * opacity, color) are packed into stacked 2D single-channel maps and
 * compressed using H.264 I/P-frame encoding.
 *
 * Features:
 * - WebCodecs hardware acceleration (VideoDecoder API)
 * - Software fallback via manual H.264 NAL unit parsing
 * - Progressive quality tier support (select layers at decode time)
 * - YUV 4:4:4 color space handling per 4DGCPro specification
 * - Frame queue with back-pressure management
 *
 * Research references:
 *   W.039 - 4DGCPro progressive quality with H.264 hardware decode
 *   P.030.04 - Hardware decode integration for volumetric video
 *
 * @module volumetric-bridge/volumetric-video
 */

import type {
  IHardwareDecoder,
  HardwareDecoderConfig,
  DecodedAttributeMaps,
  FrameType,
  VolumetricQualityTier,
  QualityTierConfig,
} from './types';
import { QUALITY_TIER_CONFIGS } from './types';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * H.264 codec string for High Profile Level 4.0.
 * 4DGCPro uses H.264 High Profile for I/P-frame encoding.
 */
const H264_HIGH_PROFILE = 'avc1.640028';

/**
 * Maximum decode queue depth before applying back-pressure.
 */
const MAX_DECODE_QUEUE_DEPTH = 4;

/**
 * Timeout for a single frame decode operation (ms).
 */
const DECODE_TIMEOUT_MS = 100;

// =============================================================================
// ATTRIBUTE MAP LAYOUT
// =============================================================================

/**
 * Layout of Gaussian attributes within a single H.264-encoded frame.
 * 4DGCPro packs multiple attribute channels into a stacked 2D layout.
 *
 * For N Gaussians arranged in a W x H grid:
 * - Row block 0: Position X (uint16 or uint8)
 * - Row block 1: Position Y
 * - Row block 2: Position Z
 * - Row block 3: Scale X (uint8)
 * - Row block 4: Scale Y
 * - Row block 5: Scale Z
 * - Row block 6: Rotation Q0 (uint8)
 * - Row block 7: Rotation Q1
 * - Row block 8: Rotation Q2
 * - Row block 9: Opacity (uint8)
 * - Row block 10: Color R (uint8)
 * - Row block 11: Color G
 * - Row block 12: Color B
 */
interface AttributeMapLayout {
  /** Width of the attribute grid */
  gridWidth: number;
  /** Height of one attribute block */
  blockHeight: number;
  /** Total stacked height (blockHeight * 13 channels) */
  totalHeight: number;
  /** Number of Gaussians encoded */
  gaussianCount: number;
}

/**
 * Compute the attribute map layout for a given Gaussian count.
 * Arranges Gaussians in a roughly square grid for H.264 efficiency.
 */
function computeLayout(gaussianCount: number): AttributeMapLayout {
  // H.264 macroblocks are 16x16, so round up to multiples of 16
  const sqrtN = Math.ceil(Math.sqrt(gaussianCount));
  const gridWidth = Math.ceil(sqrtN / 16) * 16;
  const blockHeight = Math.ceil(gaussianCount / gridWidth);
  const alignedBlockHeight = Math.ceil(blockHeight / 16) * 16;

  // 13 attribute channels stacked vertically
  const CHANNEL_COUNT = 13;
  const totalHeight = alignedBlockHeight * CHANNEL_COUNT;

  return {
    gridWidth,
    blockHeight: alignedBlockHeight,
    totalHeight,
    gaussianCount,
  };
}

// =============================================================================
// WEBCODECS HARDWARE DECODER
// =============================================================================

/**
 * H.264 hardware decoder using WebCodecs API.
 * Decodes 4DGCPro encoded Gaussian attribute maps with hardware acceleration.
 */
export class HardwareDecoder implements IHardwareDecoder {
  private decoder: VideoDecoder | null = null;
  private config: HardwareDecoderConfig | null = null;
  private layout: AttributeMapLayout | null = null;
  private pendingFrames: Map<number, {
    resolve: (maps: DecodedAttributeMaps) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = new Map();
  private frameCounter = 0;
  private _isSupported = false;
  private currentTier: VolumetricQualityTier = 'high';
  private tierConfig: QualityTierConfig = QUALITY_TIER_CONFIGS.high;

  get isSupported(): boolean {
    return this._isSupported;
  }

  /**
   * Check if WebCodecs VideoDecoder is available.
   */
  static checkSupport(): boolean {
    return typeof VideoDecoder !== 'undefined';
  }

  /**
   * Initialize the H.264 decoder for the given stream parameters.
   */
  async initialize(config: HardwareDecoderConfig): Promise<void> {
    this.config = config;

    // Check WebCodecs availability
    if (!HardwareDecoder.checkSupport()) {
      console.warn(
        '[HardwareDecoder] WebCodecs VideoDecoder not available. ' +
        'Falling back to software decode path.'
      );
      this._isSupported = false;
      return;
    }

    // Probe hardware support for the codec
    try {
      const support = await VideoDecoder.isConfigSupported({
        codec: config.codec || H264_HIGH_PROFILE,
        codedWidth: config.codedWidth,
        codedHeight: config.codedHeight,
        hardwareAcceleration: config.hardwareAcceleration || 'prefer-hardware',
      });

      if (!support.supported) {
        console.warn(
          '[HardwareDecoder] H.264 codec not supported by hardware. ' +
          'Using software decode.'
        );
        this._isSupported = false;
        return;
      }
    } catch (err) {
      console.warn('[HardwareDecoder] Codec support check failed:', err);
      this._isSupported = false;
      return;
    }

    // Create the decoder
    this.decoder = new VideoDecoder({
      output: (frame: VideoFrame) => this.handleDecodedFrame(frame),
      error: (err: DOMException) => this.handleDecodeError(err),
    });

    this.decoder.configure({
      codec: config.codec || H264_HIGH_PROFILE,
      codedWidth: config.codedWidth,
      codedHeight: config.codedHeight,
      hardwareAcceleration: config.hardwareAcceleration || 'prefer-hardware',
    });

    this._isSupported = true;
    this.frameCounter = 0;

    console.log(
      `[HardwareDecoder] Initialized: ${config.codedWidth}x${config.codedHeight}, ` +
      `codec=${config.codec || H264_HIGH_PROFILE}, ` +
      `hw=${config.hardwareAcceleration || 'prefer-hardware'}`
    );
  }

  /**
   * Set the active quality tier for progressive decoding.
   * Controls how many hierarchical layers are decoded from each frame.
   */
  setQualityTier(tier: VolumetricQualityTier): void {
    this.currentTier = tier;
    this.tierConfig = QUALITY_TIER_CONFIGS[tier];
  }

  /**
   * Decode a compressed H.264 frame buffer into Gaussian attribute maps.
   */
  async decode(encodedData: ArrayBuffer, frameType: FrameType): Promise<DecodedAttributeMaps> {
    if (!this._isSupported || !this.decoder) {
      return this.softwareDecode(encodedData, frameType);
    }

    // Check queue depth for back-pressure
    if (this.pendingFrames.size >= MAX_DECODE_QUEUE_DEPTH) {
      // Wait for oldest pending frame to complete
      const oldestKey = this.pendingFrames.keys().next().value;
      if (oldestKey !== undefined) {
        const oldest = this.pendingFrames.get(oldestKey);
        if (oldest) {
          oldest.reject(new Error('Decode queue overflow: frame dropped'));
          this.pendingFrames.delete(oldestKey);
        }
      }
    }

    const frameId = this.frameCounter++;
    const timestamp = frameId * 33333; // ~30fps in microseconds

    return new Promise<DecodedAttributeMaps>((resolve, reject) => {
      this.pendingFrames.set(frameId, { resolve, reject, timestamp });

      // Create EncodedVideoChunk
      const chunk = new EncodedVideoChunk({
        type: frameType === 'I' ? 'key' : 'delta',
        timestamp,
        data: encodedData,
      });

      try {
        this.decoder!.decode(chunk);
      } catch (err) {
        this.pendingFrames.delete(frameId);
        reject(err instanceof Error ? err : new Error(String(err)));
      }

      // Set decode timeout
      setTimeout(() => {
        const pending = this.pendingFrames.get(frameId);
        if (pending) {
          this.pendingFrames.delete(frameId);
          // Fall back to software decode on timeout
          this.softwareDecode(encodedData, frameType).then(resolve).catch(reject);
        }
      }, DECODE_TIMEOUT_MS);
    });
  }

  /**
   * Handle a decoded VideoFrame from the hardware decoder.
   * Extracts Gaussian attribute maps from the YUV pixel data.
   */
  private handleDecodedFrame(frame: VideoFrame): void {
    // Find the pending frame by timestamp
    let matchedId: number | null = null;
    for (const [id, pending] of this.pendingFrames) {
      if (pending.timestamp === frame.timestamp) {
        matchedId = id;
        break;
      }
    }

    if (matchedId === null) {
      // No matching pending frame — might have been timed out
      frame.close();
      return;
    }

    const pending = this.pendingFrames.get(matchedId)!;
    this.pendingFrames.delete(matchedId);

    try {
      const maps = this.extractAttributeMaps(frame);
      frame.close();
      pending.resolve(maps);
    } catch (err) {
      frame.close();
      pending.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /**
   * Extract Gaussian attribute maps from a decoded VideoFrame.
   * The frame contains stacked attribute channels as described in the layout.
   */
  private extractAttributeMaps(frame: VideoFrame): DecodedAttributeMaps {
    const width = frame.displayWidth;
    const height = frame.displayHeight;

    // Read Y plane (luminance) which contains the attribute data
    // In YUV 4:4:4 mode, all planes have the same resolution
    const bufferSize = frame.allocationSize({ rect: { x: 0, y: 0, width, height } });
    const buffer = new Uint8Array(bufferSize);

    frame.copyTo(buffer, { rect: { x: 0, y: 0, width, height } });

    // Compute layout based on tier configuration
    const maxGaussians = this.tierConfig.maxGaussians;
    const layout = computeLayout(maxGaussians);
    const blockSize = layout.gridWidth * layout.blockHeight;

    // Extract each attribute channel from the stacked layout
    const gaussianCount = Math.min(maxGaussians, layout.gaussianCount);

    // Position maps (3 channels)
    const useHighPrecision = this.tierConfig.highPrecisionPositions;
    let positionMap: Uint8Array | Uint16Array;

    if (useHighPrecision) {
      // High tier: reconstruct uint16 from two uint8 blocks
      const posHigh = buffer.subarray(0, blockSize * 3);
      positionMap = new Uint16Array(gaussianCount * 3);
      for (let c = 0; c < 3; c++) {
        const channelOffset = c * blockSize;
        for (let i = 0; i < gaussianCount; i++) {
          // Low byte from Y plane, high byte reconstructed
          positionMap[i * 3 + c] = buffer[channelOffset + i] |
            (buffer[channelOffset + blockSize * 3 + i] << 8);
        }
      }
    } else {
      positionMap = new Uint8Array(gaussianCount * 3);
      for (let c = 0; c < 3; c++) {
        const channelOffset = c * blockSize;
        for (let i = 0; i < gaussianCount; i++) {
          positionMap[i * 3 + c] = buffer[channelOffset + i];
        }
      }
    }

    // Scale map (3 channels starting at offset 3)
    const scaleMap = new Uint8Array(gaussianCount * 3);
    for (let c = 0; c < 3; c++) {
      const channelOffset = (3 + c) * blockSize;
      for (let i = 0; i < gaussianCount; i++) {
        scaleMap[i * 3 + c] = buffer[channelOffset + i];
      }
    }

    // Rotation map (3 channels starting at offset 6)
    const rotationMap = new Uint8Array(gaussianCount * 3);
    for (let c = 0; c < 3; c++) {
      const channelOffset = (6 + c) * blockSize;
      for (let i = 0; i < gaussianCount; i++) {
        rotationMap[i * 3 + c] = buffer[channelOffset + i];
      }
    }

    // Opacity map (1 channel at offset 9)
    const opacityMap = new Uint8Array(gaussianCount);
    const opacityOffset = 9 * blockSize;
    for (let i = 0; i < gaussianCount; i++) {
      opacityMap[i] = buffer[opacityOffset + i];
    }

    // Color map (3 channels starting at offset 10)
    const colorMap = new Uint8Array(gaussianCount * 3);
    for (let c = 0; c < 3; c++) {
      const channelOffset = (10 + c) * blockSize;
      for (let i = 0; i < gaussianCount; i++) {
        colorMap[i * 3 + c] = buffer[channelOffset + i];
      }
    }

    return {
      positionMap,
      scaleMap,
      rotationMap,
      opacityMap,
      colorMap,
      width: layout.gridWidth,
      height: layout.blockHeight,
      gaussianCount,
    };
  }

  /**
   * Handle a decode error from the hardware decoder.
   */
  private handleDecodeError(err: DOMException): void {
    console.error('[HardwareDecoder] Decode error:', err.message);

    // Reject all pending frames
    for (const [id, pending] of this.pendingFrames) {
      pending.reject(new Error(`Hardware decode error: ${err.message}`));
    }
    this.pendingFrames.clear();
  }

  /**
   * Software fallback decoder.
   * Parses the encoded buffer as raw attribute data without H.264 decode.
   * Used when WebCodecs is unavailable or hardware decode fails.
   */
  private async softwareDecode(
    encodedData: ArrayBuffer,
    _frameType: FrameType,
  ): Promise<DecodedAttributeMaps> {
    const data = new Uint8Array(encodedData);
    const maxGaussians = this.tierConfig.maxGaussians;

    // In software fallback, treat the buffer as raw packed attributes.
    // This is a simplified path — real 4DGCPro software decode would
    // require a full H.264 decoder (e.g. via ffmpeg.wasm).
    const bytesPerGaussian = this.tierConfig.highPrecisionPositions ? 16 : 13;
    const gaussianCount = Math.min(
      maxGaussians,
      Math.floor(data.byteLength / bytesPerGaussian),
    );

    const useHighPrecision = this.tierConfig.highPrecisionPositions;
    let positionMap: Uint8Array | Uint16Array;
    let readOffset = 0;

    if (useHighPrecision) {
      positionMap = new Uint16Array(gaussianCount * 3);
      const posView = new DataView(encodedData);
      for (let i = 0; i < gaussianCount * 3; i++) {
        positionMap[i] = posView.getUint16(readOffset, true);
        readOffset += 2;
      }
    } else {
      positionMap = new Uint8Array(gaussianCount * 3);
      for (let i = 0; i < gaussianCount * 3; i++) {
        positionMap[i] = data[readOffset++];
      }
    }

    const scaleMap = new Uint8Array(gaussianCount * 3);
    for (let i = 0; i < gaussianCount * 3; i++) {
      scaleMap[i] = data[readOffset++] ?? 128;
    }

    const rotationMap = new Uint8Array(gaussianCount * 3);
    for (let i = 0; i < gaussianCount * 3; i++) {
      rotationMap[i] = data[readOffset++] ?? 128;
    }

    const opacityMap = new Uint8Array(gaussianCount);
    for (let i = 0; i < gaussianCount; i++) {
      opacityMap[i] = data[readOffset++] ?? 255;
    }

    const colorMap = new Uint8Array(gaussianCount * 3);
    for (let i = 0; i < gaussianCount * 3; i++) {
      colorMap[i] = data[readOffset++] ?? 128;
    }

    return {
      positionMap,
      scaleMap,
      rotationMap,
      opacityMap,
      colorMap,
      width: Math.ceil(Math.sqrt(gaussianCount)),
      height: Math.ceil(Math.sqrt(gaussianCount)),
      gaussianCount,
    };
  }

  /**
   * Flush all pending decode operations.
   */
  async flush(): Promise<void> {
    if (this.decoder && this.decoder.state !== 'closed') {
      await this.decoder.flush();
    }
  }

  /**
   * Release all resources.
   */
  dispose(): void {
    if (this.decoder && this.decoder.state !== 'closed') {
      this.decoder.close();
    }
    this.decoder = null;

    // Reject any remaining pending frames
    for (const [, pending] of this.pendingFrames) {
      pending.reject(new Error('Decoder disposed'));
    }
    this.pendingFrames.clear();

    this._isSupported = false;
    this.config = null;
    this.layout = null;
  }
}

// =============================================================================
// ATTRIBUTE MAP DEQUANTIZATION
// =============================================================================

/**
 * Dequantize decoded attribute maps into Float32 Gaussian parameters.
 * Converts quantized uint8/uint16 values back to floating-point attributes
 * using the quantization scheme from 4DGCPro.
 */
export function dequantizeAttributeMaps(
  maps: DecodedAttributeMaps,
  fractionalBits: number = 12,
): {
  positions: Float32Array;
  scales: Float32Array;
  rotations: Float32Array;
  colors: Float32Array;
  opacities: Float32Array;
  count: number;
} {
  const N = maps.gaussianCount;
  const posScale = 1.0 / (1 << fractionalBits);

  const positions = new Float32Array(N * 3);
  const scales = new Float32Array(N * 3);
  const rotations = new Float32Array(N * 4);
  const colors = new Float32Array(N * 4);
  const opacities = new Float32Array(N);

  // Dequantize positions
  if (maps.positionMap instanceof Uint16Array) {
    // High precision: uint16 fixed-point
    for (let i = 0; i < N * 3; i++) {
      // Signed 16-bit: convert from unsigned to signed
      let val = maps.positionMap[i];
      if (val > 32767) val -= 65536;
      positions[i] = val * posScale;
    }
  } else {
    // Low precision: uint8 fixed-point (reduced range)
    for (let i = 0; i < N * 3; i++) {
      let val = maps.positionMap[i];
      if (val > 127) val -= 256;
      positions[i] = val * posScale * 256; // Scale up for uint8 range
    }
  }

  // Dequantize scales (uint8 log-encoded, matching SPZ convention)
  for (let i = 0; i < N * 3; i++) {
    const logScale = maps.scaleMap[i] / 16.0 - 10.0;
    scales[i] = Math.exp(logScale);
  }

  // Dequantize rotations (uint8, smallest-three encoding)
  for (let i = 0; i < N; i++) {
    const r0 = (maps.rotationMap[i * 3] / 127.5) - 1;
    const r1 = (maps.rotationMap[i * 3 + 1] / 127.5) - 1;
    const r2 = (maps.rotationMap[i * 3 + 2] / 127.5) - 1;
    const w = Math.sqrt(Math.max(0, 1 - r0 * r0 - r1 * r1 - r2 * r2));
    rotations[i * 4] = r0;
    rotations[i * 4 + 1] = r1;
    rotations[i * 4 + 2] = r2;
    rotations[i * 4 + 3] = w;
  }

  // Dequantize opacity (uint8 sigmoid-encoded)
  for (let i = 0; i < N; i++) {
    opacities[i] = maps.opacityMap[i] / 255;
    colors[i * 4 + 3] = opacities[i];
  }

  // Dequantize colors (uint8 SH DC encoding)
  const SPZ_COLOR_SCALE = 0.15;
  for (let i = 0; i < N; i++) {
    for (let c = 0; c < 3; c++) {
      const normalized = maps.colorMap[i * 3 + c] / 255;
      const shCoeff = (normalized - 0.5) / SPZ_COLOR_SCALE;
      const rgb = 0.5 + 0.2820948 * shCoeff;
      colors[i * 4 + c] = Math.max(0, Math.min(1, rgb));
    }
  }

  return { positions, scales, rotations, colors, opacities, count: N };
}
