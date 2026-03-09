/**
 * @hololand/spatial-builder - SceneEditorViewport
 *
 * The main 3D viewport component using @react-three/fiber Canvas.
 * Renders the R3F scene with:
 *   - All EditorObjects from the scene graph
 *   - TransformControls gizmo on the selected object
 *   - OrbitControls for camera navigation
 *   - Grid + axes helpers
 *   - Drop zone for drag-and-drop object spawning
 *   - Default lighting + environment
 */

import React, { useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Environment,
} from '@react-three/drei';
import * as THREE from 'three';
import { EditorObject } from './EditorObject';
import { EditorTransformControls } from './EditorTransformControls';
import type { SceneEditorAPI } from './useSceneEditor';
import type { AssetPaletteItem, Vec3 } from './types';

export interface SceneEditorViewportProps {
  /** The scene editor API from useSceneEditor */
  editor: SceneEditorAPI;
  /** Optional CSS class for the outer container */
  className?: string;
  /** Optional inline style for the outer container */
  style?: React.CSSProperties;
}

/**
 * Inner scene content (rendered inside the R3F Canvas).
 */
function SceneContent({ editor }: { editor: SceneEditorAPI }) {
  const {
    objects,
    selectedId,
    selectedObject,
    transformMode,
    transformSpace,
    showGrid,
    showAxes,
    snapEnabled,
    snapTranslate,
    snapRotate,
    snapScale,
    selectObject,
    updateTransform,
    commitTransform,
  } = editor;

  const handleBackgroundClick = useCallback(() => {
    selectObject(null);
  }, [selectObject]);

  return (
    <>
      {/* Default lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Environment map for reflections */}
      <Suspense fallback={null}>
        <Environment preset="apartment" background={false} />
      </Suspense>

      {/* Camera controls */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={1}
        maxDistance={100}
      />

      {/* Grid helper */}
      {showGrid && (
        <Grid
          args={[30, 30]}
          position={[0, -0.001, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#4a4a5a"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#6366f1"
          fadeDistance={40}
          fadeStrength={1}
          followCamera={false}
          infiniteGrid
        />
      )}

      {/* Axes helper */}
      {showAxes && <axesHelper args={[5]} />}

      {/* Gizmo helper (orientation cube in corner) */}
      <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
        <GizmoViewport
          axisColors={['#f43f5e', '#22c55e', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>

      {/* Ground plane for click-to-deselect */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onClick={handleBackgroundClick}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial
          color="#1a1a2e"
          transparent
          opacity={0}
        />
      </mesh>

      {/* Render all scene objects */}
      {objects.map((obj) => (
        <group key={obj.id} userData={{ editorId: obj.id }}>
          <EditorObject
            object={obj}
            isSelected={selectedId === obj.id}
            onSelect={selectObject}
          />
        </group>
      ))}

      {/* Transform controls on selected object */}
      <EditorTransformControls
        selectedObject={selectedObject}
        mode={transformMode}
        space={transformSpace}
        snapEnabled={snapEnabled}
        snapTranslate={snapTranslate}
        snapRotate={snapRotate}
        snapScale={snapScale}
        onTransformChange={updateTransform}
        onTransformEnd={commitTransform}
      />
    </>
  );
}

/**
 * SceneEditorViewport
 *
 * Full 3D viewport with R3F Canvas. Accepts drag-and-drop events from
 * the AssetPalette to spawn new objects at the drop location.
 */
export const SceneEditorViewport: React.FC<SceneEditorViewportProps> = ({
  editor,
  className,
  style,
}) => {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();

    const data = e.dataTransfer.getData('application/hololand-asset');
    if (!data) return;

    try {
      const item: AssetPaletteItem = JSON.parse(data);

      // Compute approximate drop position in world space.
      // Since we cannot raycast from a DOM event easily, we place at origin
      // with a small random offset to prevent stacking.
      const randomOffset: Vec3 = {
        x: (Math.random() - 0.5) * 4,
        y: item.kind === 'light' ? 3 : 0.5,
        z: (Math.random() - 0.5) * 4,
      };

      if (item.kind === 'primitive' && item.primitiveType) {
        editor.addPrimitive(item.primitiveType, randomOffset);
      } else if (item.kind === 'light' && item.lightType) {
        editor.addLight(item.lightType, randomOffset);
      }
    } catch {
      // Silently ignore invalid drag data
    }
  }, [editor]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#0f0f1a',
        ...style,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Canvas
        shadows
        camera={{
          position: [6, 5, 8],
          fov: 50,
          near: 0.1,
          far: 500,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.0,
        }}
        onPointerMissed={() => editor.selectObject(null)}
      >
        <SceneContent editor={editor} />
      </Canvas>
    </div>
  );
};
