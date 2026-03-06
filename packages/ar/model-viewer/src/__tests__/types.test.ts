/**
 * Tests for type definitions
 *
 * These are compile-time type tests that verify the TypeScript interfaces
 * are correctly defined. They use type assertions to ensure type safety
 * at compile time.
 */

import { describe, it, expect } from 'vitest';
import type {
  HTMLModelElement,
  Vector3,
  Quaternion,
  Scale3,
  EntityTransform,
  BoundingBox,
  ModelAnimation,
  AnimationPlaybackState,
  ModelCamera,
  ModelEntity,
  ModelElementEventMap,
  ModelLoadingState,
  ModelError,
  ModelViewerProps,
  ModelGalleryProps,
  ModelGalleryItem,
  UseModelElementReturn,
} from '../types';

describe('Type definitions', () => {
  describe('Vector3', () => {
    it('has x, y, z properties', () => {
      const v: Vector3 = { x: 1, y: 2, z: 3 };
      expect(v.x).toBe(1);
      expect(v.y).toBe(2);
      expect(v.z).toBe(3);
    });
  });

  describe('Quaternion', () => {
    it('has x, y, z, w properties', () => {
      const q: Quaternion = { x: 0, y: 0, z: 0, w: 1 };
      expect(q.x).toBe(0);
      expect(q.w).toBe(1);
    });
  });

  describe('Scale3', () => {
    it('has x, y, z properties', () => {
      const s: Scale3 = { x: 1, y: 1, z: 1 };
      expect(s.x).toBe(1);
    });
  });

  describe('EntityTransform', () => {
    it('has position, rotation, and scale', () => {
      const t: EntityTransform = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      };
      expect(t.position.x).toBe(0);
      expect(t.rotation.w).toBe(1);
      expect(t.scale.x).toBe(1);
    });
  });

  describe('BoundingBox', () => {
    it('has min and max vectors', () => {
      const bb: BoundingBox = {
        min: { x: -1, y: -1, z: -1 },
        max: { x: 1, y: 1, z: 1 },
      };
      expect(bb.min.x).toBe(-1);
      expect(bb.max.x).toBe(1);
    });
  });

  describe('ModelAnimation', () => {
    it('has name and duration', () => {
      const anim: ModelAnimation = { name: 'walk', duration: 2.5 };
      expect(anim.name).toBe('walk');
      expect(anim.duration).toBe(2.5);
    });
  });

  describe('AnimationPlaybackState', () => {
    it('accepts valid states', () => {
      const states: AnimationPlaybackState[] = ['playing', 'paused', 'stopped'];
      expect(states).toHaveLength(3);
    });
  });

  describe('ModelCamera', () => {
    it('has pitch, yaw, and distance', () => {
      const cam: ModelCamera = { pitch: 0.5, yaw: 1.2, distance: 5 };
      expect(cam.pitch).toBe(0.5);
      expect(cam.distance).toBe(5);
    });
  });

  describe('ModelEntity', () => {
    it('has name, transform, boundingBox, and children', () => {
      const entity: ModelEntity = {
        name: 'root',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
        boundingBox: {
          min: { x: -1, y: -1, z: -1 },
          max: { x: 1, y: 1, z: 1 },
        },
        children: [],
      };
      expect(entity.name).toBe('root');
      expect(entity.children).toHaveLength(0);
    });

    it('supports nested children', () => {
      const entity: ModelEntity = {
        name: 'root',
        transform: {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 },
        },
        boundingBox: {
          min: { x: -1, y: -1, z: -1 },
          max: { x: 1, y: 1, z: 1 },
        },
        children: [
          {
            name: 'child',
            transform: {
              position: { x: 1, y: 0, z: 0 },
              rotation: { x: 0, y: 0, z: 0, w: 1 },
              scale: { x: 1, y: 1, z: 1 },
            },
            boundingBox: {
              min: { x: 0, y: -1, z: -1 },
              max: { x: 2, y: 1, z: 1 },
            },
            children: [],
          },
        ],
      };
      expect(entity.children[0].name).toBe('child');
    });
  });

  describe('ModelLoadingState', () => {
    it('accepts valid states', () => {
      const states: ModelLoadingState[] = ['idle', 'loading', 'ready', 'error'];
      expect(states).toHaveLength(4);
    });
  });

  describe('ModelError', () => {
    it('requires message and accepts optional fields', () => {
      const error: ModelError = {
        message: 'Failed to load',
        code: '404',
      };
      expect(error.message).toBe('Failed to load');
      expect(error.code).toBe('404');
    });

    it('works with just message', () => {
      const error: ModelError = { message: 'Failed' };
      expect(error.message).toBe('Failed');
      expect(error.code).toBeUndefined();
    });
  });

  describe('ModelGalleryItem', () => {
    it('requires id, src, alt and accepts optional fields', () => {
      const item: ModelGalleryItem = {
        id: '1',
        src: 'test.usdz',
        alt: 'Test',
        title: 'Test Model',
        description: 'A test',
        poster: 'poster.jpg',
        fallbackSrc: 'fallback.jpg',
      };
      expect(item.id).toBe('1');
      expect(item.title).toBe('Test Model');
    });

    it('works with required fields only', () => {
      const item: ModelGalleryItem = {
        id: '2',
        src: 'test2.usdz',
        alt: 'Test 2',
      };
      expect(item.id).toBe('2');
      expect(item.title).toBeUndefined();
    });
  });
});
