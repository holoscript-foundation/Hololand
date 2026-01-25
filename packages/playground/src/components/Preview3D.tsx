/**
 * 3D Preview Component
 * 
 * Renders HoloScript AST in real-time using React Three Fiber.
 */

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Stats } from '@react-three/drei';
import type { HoloAST, HoloObject } from '../types';

interface Preview3DProps {
  ast: HoloAST | null;
  isCompiling: boolean;
}

// Map HoloScript object types to Three.js geometries
function HoloObject3D({ object }: { object: HoloObject }) {
  const position = object.position || [0, 0, 0];
  const scale = object.scale || [1, 1, 1];
  const color = object.color || '#00d4ff';
  
  // Parse geometry type
  const GeometryComponent = useMemo(() => {
    switch (object.geometry || object.type || 'box') {
      case 'sphere':
      case 'orb':
        return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'cone':
        return <coneGeometry args={[0.5, 1, 32]} />;
      case 'torus':
        return <torusGeometry args={[0.5, 0.2, 16, 32]} />;
      case 'plane':
        return <planeGeometry args={[1, 1]} />;
      case 'capsule':
        return <capsuleGeometry args={[0.3, 0.5, 4, 16]} />;
      case 'box':
      case 'cube':
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [object.geometry, object.type]);
  
  // Handle traits
  const isGlowing = object.traits?.includes('@glowing') || object.glow;
  const isTransparent = object.traits?.includes('@transparent');
  
  return (
    <mesh
      position={position as [number, number, number]}
      scale={scale as [number, number, number]}
      castShadow
      receiveShadow
    >
      {GeometryComponent}
      <meshStandardMaterial
        color={color}
        emissive={isGlowing ? color : '#000000'}
        emissiveIntensity={isGlowing ? 0.5 : 0}
        transparent={isTransparent}
        opacity={isTransparent ? 0.7 : 1}
        metalness={0.3}
        roughness={0.4}
      />
    </mesh>
  );
}

// Scene component that renders all objects from AST
function Scene({ ast }: { ast: HoloAST | null }) {
  if (!ast) return null;
  
  // Extract objects from AST
  const objects = useMemo(() => {
    const result: HoloObject[] = [];
    
    // Handle different AST structures
    if (ast.objects) {
      result.push(...ast.objects);
    }
    
    if (ast.composition?.objects) {
      result.push(...ast.composition.objects);
    }
    
    // Handle spatial_groups
    if (ast.spatial_groups) {
      ast.spatial_groups.forEach(group => {
        if (group.objects) {
          result.push(...group.objects);
        }
      });
    }
    
    return result;
  }, [ast]);
  
  // Environment from AST
  const environment = ast.environment || ast.composition?.environment || {};
  
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={environment.ambient_light ?? 0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#ff6b9d" />
      
      {/* Render all objects */}
      {objects.map((obj, index) => (
        <HoloObject3D key={obj.name || obj.id || index} object={obj} />
      ))}
    </>
  );
}

// Loading fallback
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#2d2d44" wireframe />
    </mesh>
  );
}

export function Preview3D({ ast, isCompiling }: Preview3DProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [5, 5, 5], fov: 50 }}
      style={{ background: 'transparent' }}
    >
      <Suspense fallback={<LoadingFallback />}>
        {/* Environment */}
        <Environment preset="night" />
        
        {/* Grid */}
        <Grid
          infiniteGrid
          fadeDistance={50}
          fadeStrength={5}
          cellColor="#2d2d44"
          sectionColor="#00d4ff"
          sectionSize={5}
        />
        
        {/* Scene from AST */}
        <Scene ast={ast} />
        
        {/* Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={50}
        />
        
        {/* Dev stats */}
        {process.env.NODE_ENV === 'development' && <Stats />}
      </Suspense>
      
      {/* Compiling overlay */}
      {isCompiling && (
        <mesh>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial color="#0f0f1a" transparent opacity={0.5} />
        </mesh>
      )}
    </Canvas>
  );
}
