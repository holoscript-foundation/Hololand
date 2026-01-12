/**
 * Type definitions for @hololand/world
 */

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}
