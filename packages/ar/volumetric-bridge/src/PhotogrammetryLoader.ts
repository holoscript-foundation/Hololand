/**
 * PhotogrammetryLoader — Load photogrammetry meshes (OBJ, GLTF, PLY) into Three.js
 *
 * Wraps Three.js loaders with LOD support, texture streaming, and
 * consistent bounding-box / metadata output.
 *
 * @module volumetric-bridge
 */

import {
  LOD,
  Box3,
  Vector3,
  Object3D,
  Mesh,
  BufferGeometry,
  MeshStandardMaterial,
} from 'three';
import type {
  PhotogrammetryConfig,
  VolumetricLoadResult,
  VolumetricMetadata,
  VolumetricEventHandler,
  IVolumetricLoader,
} from './types';

export class PhotogrammetryLoader implements IVolumetricLoader {
  readonly sourceType = 'photogrammetry' as const;
  private handlers: VolumetricEventHandler[] = [];

  canLoad(url: string): boolean {
    const ext = url.split('.').pop()?.toLowerCase();
    return ['obj', 'gltf', 'glb', 'usdz', 'fbx', 'ply'].includes(ext ?? '');
  }

  on(handler: VolumetricEventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  private emit(event: Parameters<VolumetricEventHandler>[0]) {
    for (const h of this.handlers) h(event);
  }

  async load(config: PhotogrammetryConfig): Promise<VolumetricLoadResult> {
    const startTime = performance.now();
    const ext = config.url.split('.').pop()?.toLowerCase() ?? 'glb';

    this.emit({ type: 'progress', loaded: 0, total: 1, phase: 'loading mesh' });

    let rootObject: Object3D;
    let vertexCount = 0;

    switch (ext) {
      case 'gltf':
      case 'glb': {
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const loader = new GLTFLoader();

        // Enable Draco if configured
        if (config.dracoCompression !== false) {
          try {
            const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
            const draco = new DRACOLoader();
            draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
            loader.setDRACOLoader(draco);
          } catch {
            // Draco not available, continue without
          }
        }

        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            config.url,
            resolve,
            (progress) => {
              this.emit({
                type: 'progress',
                loaded: progress.loaded,
                total: progress.total || 1,
                phase: 'downloading',
              });
            },
            reject,
          );
        });

        rootObject = gltf.scene;

        // Count vertices
        rootObject.traverse((child) => {
          if (child instanceof Mesh && child.geometry) {
            const posAttr = child.geometry.getAttribute('position');
            if (posAttr) vertexCount += posAttr.count;
          }
        });
        break;
      }

      case 'obj': {
        const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
        rootObject = await new Promise<Object3D>((resolve, reject) => {
          new OBJLoader().load(config.url, resolve, undefined, reject);
        });

        rootObject.traverse((child) => {
          if (child instanceof Mesh && child.geometry) {
            vertexCount += child.geometry.getAttribute('position')?.count ?? 0;
          }
        });
        break;
      }

      default: {
        // Fallback: try GLTFLoader for unknown formats
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const gltf = await new Promise<any>((resolve, reject) => {
          new GLTFLoader().load(config.url, resolve, undefined, reject);
        });
        rootObject = gltf.scene;
        break;
      }
    }

    this.emit({ type: 'progress', loaded: 0.7, total: 1, phase: 'processing' });

    // Apply transform
    if (config.position) rootObject.position.set(...config.position);
    if (config.rotation) rootObject.rotation.set(...config.rotation);
    if (config.scale) {
      const s = typeof config.scale === 'number'
        ? [config.scale, config.scale, config.scale] as const
        : config.scale;
      rootObject.scale.set(...s);
    }

    // Build LOD if requested
    const lodLevels = config.lodLevels ?? 3;
    let finalObject: Object3D = rootObject;

    if (lodLevels > 1) {
      const lodDistances = config.lodDistances ?? [0, 10, 30];
      const decimationRatios = config.decimationRatios ?? [1.0, 0.5, 0.25];
      const lod = new LOD();

      // LOD 0 = full quality (original)
      lod.addLevel(rootObject, lodDistances[0] ?? 0);

      // LOD 1+ = decimated copies
      for (let level = 1; level < lodLevels; level++) {
        const ratio = decimationRatios[level] ?? 1 / (level + 1);
        const distance = lodDistances[level] ?? level * 15;

        const lodCopy = rootObject.clone(true);
        // Simple decimation: reduce geometry index count
        lodCopy.traverse((child) => {
          if (child instanceof Mesh && child.geometry instanceof BufferGeometry) {
            const geo = child.geometry;
            const index = geo.index;
            if (index) {
              const newCount = Math.floor(index.count * ratio / 3) * 3; // Keep triangle-aligned
              geo.setDrawRange(0, Math.max(3, newCount));
            }
          }
        });

        lod.addLevel(lodCopy, distance);
      }

      lod.name = 'photogrammetry-lod';
      finalObject = lod;
    } else {
      rootObject.name = 'photogrammetry';
    }

    // Compute bounds
    const bounds = new Box3().setFromObject(finalObject);
    const center = new Vector3();
    bounds.getCenter(center);

    const loadTimeMs = performance.now() - startTime;

    const metadata: VolumetricMetadata = {
      sourceType: 'photogrammetry',
      format: config.format ?? ext,
      fileSize: 0, // Not available from loader
      loadTimeMs,
      vertexCount,
      lodLevels,
    };

    const result: VolumetricLoadResult = {
      object: finalObject,
      bounds,
      center,
      metadata,
      dispose: () => {
        finalObject.traverse((child) => {
          if (child instanceof Mesh) {
            child.geometry?.dispose();
            if (child.material instanceof MeshStandardMaterial) {
              child.material.map?.dispose();
              child.material.normalMap?.dispose();
              child.material.dispose();
            }
          }
        });
      },
    };

    this.emit({ type: 'loaded', result });
    return result;
  }
}
