/**
 * @hololand/spatial-builder - EditorTransformControls
 *
 * Wraps drei's TransformControls to provide translate/rotate/scale gizmos
 * for the currently selected scene object. Updates the scene editor state
 * when the user drags a gizmo handle.
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { TransformControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneObject, TransformMode, TransformSpace, Vec3, EulerRotation } from './types';

export interface EditorTransformControlsProps {
  /** The currently selected object (null = no gizmo shown) */
  selectedObject: SceneObject | null;
  /** Current gizmo mode */
  mode: TransformMode;
  /** Current coordinate space */
  space: TransformSpace;
  /** Whether snapping is enabled */
  snapEnabled: boolean;
  /** Translation snap increment */
  snapTranslate: number;
  /** Rotation snap increment (degrees) */
  snapRotate: number;
  /** Scale snap increment */
  snapScale: number;
  /** Called continuously while dragging */
  onTransformChange: (id: string, transform: {
    position?: Vec3;
    rotation?: EulerRotation;
    scale?: Vec3;
  }) => void;
  /** Called when dragging ends (for undo snapshot) */
  onTransformEnd: () => void;
}

/**
 * EditorTransformControls
 *
 * Attaches drei TransformControls to the selected object's mesh in the scene.
 * Disables OrbitControls while dragging to prevent camera conflict.
 */
export const EditorTransformControls: React.FC<EditorTransformControlsProps> = ({
  selectedObject,
  mode,
  space,
  snapEnabled,
  snapTranslate,
  snapRotate,
  snapScale,
  onTransformChange,
  onTransformEnd,
}) => {
  const transformRef = useRef<any>(null);
  const { scene } = useThree();

  // Find the mesh in the scene graph by traversal
  const targetMesh = useRef<THREE.Object3D | null>(null);

  useEffect(() => {
    if (!selectedObject) {
      targetMesh.current = null;
      return;
    }

    // Find the mesh by matching position (simple approach)
    // In production, use a ref registry. For now, we traverse the scene.
    let found: THREE.Object3D | null = null;
    scene.traverse((child) => {
      if (found) return;
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        const pos = child.position;
        const objPos = selectedObject.position;
        if (
          Math.abs(pos.x - objPos.x) < 0.001 &&
          Math.abs(pos.y - objPos.y) < 0.001 &&
          Math.abs(pos.z - objPos.z) < 0.001 &&
          child.userData?.editorId === selectedObject.id
        ) {
          found = child;
        }
      }
    });

    targetMesh.current = found;
  }, [selectedObject, scene]);

  // Compute snap values
  const translationSnap = snapEnabled ? snapTranslate : null;
  const rotationSnap = snapEnabled ? (snapRotate * Math.PI) / 180 : null;
  const scaleSnap = snapEnabled ? snapScale : null;

  const handleChange = useCallback(() => {
    if (!transformRef.current || !selectedObject) return;

    const ctrl = transformRef.current;
    const obj = ctrl.object;
    if (!obj) return;

    const position: Vec3 = {
      x: parseFloat(obj.position.x.toFixed(4)),
      y: parseFloat(obj.position.y.toFixed(4)),
      z: parseFloat(obj.position.z.toFixed(4)),
    };

    const rotation: EulerRotation = {
      x: parseFloat((obj.rotation.x * (180 / Math.PI)).toFixed(2)),
      y: parseFloat((obj.rotation.y * (180 / Math.PI)).toFixed(2)),
      z: parseFloat((obj.rotation.z * (180 / Math.PI)).toFixed(2)),
    };

    const scale: Vec3 = {
      x: parseFloat(obj.scale.x.toFixed(4)),
      y: parseFloat(obj.scale.y.toFixed(4)),
      z: parseFloat(obj.scale.z.toFixed(4)),
    };

    onTransformChange(selectedObject.id, { position, rotation, scale });
  }, [selectedObject, onTransformChange]);

  const handleMouseUp = useCallback(() => {
    onTransformEnd();
  }, [onTransformEnd]);

  if (!selectedObject) return null;

  return (
    <TransformControls
      ref={transformRef}
      mode={mode}
      space={space}
      translationSnap={translationSnap}
      rotationSnap={rotationSnap}
      scaleSnap={scaleSnap}
      position={[
        selectedObject.position.x,
        selectedObject.position.y,
        selectedObject.position.z,
      ]}
      onObjectChange={handleChange}
      onMouseUp={handleMouseUp}
      size={0.75}
    />
  );
};
