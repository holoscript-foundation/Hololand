/**
 * Brittney Model Downloader
 * 
 * Downloads and verifies Brittney AI models from official sources.
 */

import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { getModelInfo, getDefaultModel, type ModelInfo } from './registry.js';

export interface DownloadOptions {
  /** Destination directory */
  destination?: string;
  /** Show progress bar */
  showProgress?: boolean;
  /** Force re-download even if exists */
  force?: boolean;
  /** Verify checksum after download */
  verify?: boolean;
  /** Alternative mirror URL */
  mirror?: string;
  /** Progress callback */
  onProgress?: (progress: DownloadProgress) => void;
}

export interface DownloadProgress {
  /** Bytes downloaded */
  downloaded: number;
  /** Total bytes */
  total: number;
  /** Percentage 0-100 */
  percent: number;
  /** Download speed in bytes/s */
  speed: number;
  /** Estimated time remaining in seconds */
  eta: number;
}

export interface DownloadResult {
  /** Path to downloaded file */
  path: string;
  /** Model info */
  model: ModelInfo;
  /** Whether file was downloaded (false if already existed) */
  downloaded: boolean;
  /** Checksum verification result */
  verified?: boolean;
}

/**
 * Default models directory
 */
export function getDefaultModelsDir(): string {
  return process.env.BRITTNEY_MODELS_DIR || join(homedir(), '.brittney', 'models');
}

/**
 * Get path to a model file
 */
export async function getModelPath(modelId: string, modelsDir?: string): Promise<string | null> {
  const model = getModelInfo(modelId);
  if (!model) return null;
  
  const dir = modelsDir || getDefaultModelsDir();
  const fileName = `brittney-${modelId}.gguf`;
  const filePath = join(dir, fileName);
  
  if (existsSync(filePath)) {
    return filePath;
  }
  
  return null;
}

/**
 * Check if a model is already downloaded
 */
export async function isModelDownloaded(modelId: string, modelsDir?: string): Promise<boolean> {
  const path = await getModelPath(modelId, modelsDir);
  return path !== null;
}

/**
 * Download a Brittney model
 */
export async function downloadModel(
  modelId: string = 'v1-free',
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const model = getModelInfo(modelId);
  if (!model) {
    throw new Error(`Unknown model: ${modelId}. Run 'brittney-download --list' to see available models.`);
  }
  
  const {
    destination = getDefaultModelsDir(),
    showProgress = true,
    force = false,
    verify = true,
    mirror,
    onProgress,
  } = options;
  
  // Ensure destination directory exists
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }
  
  const fileName = `brittney-${modelId}.gguf`;
  const filePath = join(destination, fileName);
  
  // Check if already exists
  if (!force && existsSync(filePath)) {
    const stats = statSync(filePath);
    if (stats.size === model.sizeBytes) {
      console.log(`✅ Model already exists: ${filePath}`);
      return {
        path: filePath,
        model,
        downloaded: false,
        verified: verify ? await verifyChecksum(filePath, model.checksum) : undefined,
      };
    } else {
      console.log(`⚠️  Existing file has incorrect size, re-downloading...`);
      unlinkSync(filePath);
    }
  }
  
  // Get download URL
  const url = mirror 
    ? `${mirror}/brittney-v${model.version}/${modelId}.gguf`
    : model.downloadUrl;
  
  console.log(`\n📦 Downloading ${model.name} (${model.size})...`);
  console.log(`   From: ${url}`);
  console.log(`   To: ${filePath}\n`);
  
  // Download with progress
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }
  
  const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
  const total = contentLength || model.sizeBytes;
  
  let downloaded = 0;
  const startTime = Date.now();
  
  const writeStream = createWriteStream(filePath);
  const reader = response.body?.getReader();
  
  if (!reader) {
    throw new Error('Failed to get response body reader');
  }
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      writeStream.write(value);
      downloaded += value.length;
      
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = downloaded / elapsed;
      const remaining = total - downloaded;
      const eta = remaining / speed;
      
      const progress: DownloadProgress = {
        downloaded,
        total,
        percent: Math.round((downloaded / total) * 100),
        speed,
        eta,
      };
      
      if (showProgress) {
        const bar = createProgressBar(progress.percent);
        const speedStr = formatBytes(speed) + '/s';
        const etaStr = formatTime(eta);
        process.stdout.write(`\r${bar} ${progress.percent}% | ${speedStr} | ETA: ${etaStr}   `);
      }
      
      onProgress?.(progress);
    }
    
    writeStream.end();
  } finally {
    reader.releaseLock();
  }
  
  console.log('\n\n✅ Download complete!');
  
  // Verify checksum
  let verified: boolean | undefined;
  if (verify && !model.checksum.includes('pending')) {
    console.log('🔍 Verifying checksum...');
    verified = await verifyChecksum(filePath, model.checksum);
    if (verified) {
      console.log('✅ Checksum verified!');
    } else {
      console.log('⚠️  Checksum mismatch! File may be corrupted.');
    }
  }
  
  return {
    path: filePath,
    model,
    downloaded: true,
    verified,
  };
}

/**
 * Verify file checksum
 */
async function verifyChecksum(filePath: string, expectedChecksum: string): Promise<boolean> {
  if (!expectedChecksum || expectedChecksum.includes('pending')) {
    return true; // Skip verification if no checksum available
  }
  
  const [algorithm, expected] = expectedChecksum.split(':');
  if (algorithm !== 'sha256') {
    console.warn(`Unknown checksum algorithm: ${algorithm}`);
    return true;
  }
  
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  
  const actual = hash.digest('hex');
  return actual === expected;
}

/**
 * Create ASCII progress bar
 */
function createProgressBar(percent: number, width: number = 30): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

/**
 * Format bytes as human readable
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/**
 * Format seconds as human readable time
 */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}
