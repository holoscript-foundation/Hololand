import React, { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, Environment, Sparkles, Stars } from '@react-three/drei';
import { HoloScriptCodeParser, ASTNode } from '@holoscript/core';
import { Mesh } from 'three';

// --- 1. Asset Registry (Mapping Script Names to Files) ---
const ASSET_TO_URL: Record<string, string> = {
  // In a real app, these would be real paths. We use placeholders or generic objects for now
  fountain: '/assets/models/fountain_art_deco.glb',
  dome: '/assets/models/dome_grandeur.glb',
  tree: '/assets/models/solarpunk_tree.glb',
  // Fallbacks using standard Three attributes
  orb: 'primitve:sphere',
  cube: 'primitive:box',
};

// --- Types ---
interface HoloEntityData {
  id?: string;
  type: string;
  position: [number, number, number];
  scale: [number, number, number];
  color?: string;
  mesh?: string;
  text?: string;
  glow?: boolean;
  interactive?: boolean;
  traits?: string[];
  properties?: Record<string, unknown>;
}

// --- 2. Trait System (Interaction Logic) ---
const useTraits = (entity: HoloEntityData, meshRef: React.MutableRefObject<Mesh | null>) => {
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Trait: Rotate
    // Syntax: animate MyOrb { rotate: true } (implied) or traits
    if (entity.traits?.includes('rotate') || (entity.properties?.rotate as boolean)) {
      meshRef.current.rotation.y += delta * 0.5;
    }

    // Trait: Float
    // Handled by <Float> wrapper usually, but manual here:
    if (entity.traits?.includes('float')) {
      meshRef.current.position.y = entity.position[1] + Math.sin(state.clock.elapsedTime) * 0.2;
    }

    // Trait: Pulse (Glow)
    if (entity.glow || entity.traits?.includes('pulse')) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.set(
        entity.scale[0] * scale,
        entity.scale[1] * scale,
        entity.scale[2] * scale
      );
    }
  });

  // Interaction Handlers
  const events = useMemo(() => {
    if (!entity.interactive && !entity.traits?.includes('interactive')) return {};

    return {
      onClick: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        setActive(!active);
        console.log(`Clicked entity: ${entity.id || 'unknown'}`);
        // Trigger script event here in full runtime
      },
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        setHover(false);
        document.body.style.cursor = 'auto';
      },
    };
  }, [entity, active]);

  return { hovered, active, events };
};

// --- 3. Entity Component (The renderer) ---
interface HoloEntityProps {
  entity: HoloEntityData;
}

const HoloEntity: React.FC<HoloEntityProps> = ({ entity }) => {
  const meshRef = useRef<Mesh>(null);
  const { hovered, active, events } = useTraits(entity, meshRef);

  // Asset Loading Strategy
  const assetKey = entity.mesh || (entity.properties?.shape as string) || 'orb';
  const assetUrl = ASSET_TO_URL[assetKey];
  const isGLB = assetUrl && assetUrl.endsWith('.glb');

  // Material (Dynamic Halo Style)
  const color = active ? 'hotpink' : hovered ? '#ffaa00' : entity.color || 'cyan';

  // GLB Loader Model
  const GLBModel = ({ url }: { url: string }) => {
    // Safety: fallback if file missing
    try {
      const { scene } = useGLTF(url);
      return <primitive object={scene.clone()} />;
    } catch {
      return <boxGeometry args={[1, 1, 1]} />; // Fallback
    }
  };

  const GeometryRenderer = () => {
    if (isGLB)
      return (
        <Suspense fallback={null}>
          <GLBModel url={assetUrl} />
        </Suspense>
      );

    // Primitives
    switch (assetKey) {
      case 'cube':
        return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere':
      case 'orb':
        return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'pyramid':
        return <coneGeometry args={[0.5, 1, 4]} />;
      case 'fountain':
        return <cylinderGeometry args={[0.5, 0.5, 2, 8]} />; // Placeholder Primitive
      case 'plane':
        return <planeGeometry args={[10, 10]} />;
      default:
        return <dodecahedronGeometry args={[0.5]} />;
    }
  };

  return (
    <group position={entity.position || [0, 0, 0]} scale={entity.scale || [1, 1, 1]} {...events}>
      {/* Floating Text Label */}
      {(hovered || entity.text) && (
        <Text
          position={[0, 1.5, 0]}
          fontSize={0.5}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {entity.text || entity.type.toUpperCase()}
        </Text>
      )}

      <mesh ref={meshRef}>
        <GeometryRenderer />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          emissive={entity.glow ? color : 'black'}
          emissiveIntensity={entity.glow ? 0.5 : 0}
        />
      </mesh>

      {/* Particle Effects for Special Entities */}
      {entity.glow && (
        <Sparkles count={20} scale={2} size={2} speed={0.4} opacity={0.5} color={color} />
      )}
    </group>
  );
};

// --- Main Renderer ---
interface HoloScriptRendererProps {
  scriptContent: string;
}

export const HoloScriptRenderer: React.FC<HoloScriptRendererProps> = ({ scriptContent }) => {
  const [entities, setEntities] = useState<HoloEntityData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Parser Logic (Same as before, robustly handling AST)
    const parseAndLoad = () => {
      try {
        const parser = new HoloScriptCodeParser();
        const parseResult = parser.parse(scriptContent);

        if (!parseResult.success) {
          console.error('Parse Errors:', parseResult.errors);
          setError(parseResult.errors.map((e) => `Line ${e.line}: ${e.message}`).join('\n'));
          return;
        }

        const newEntities: HoloEntityData[] = [];
        const traverse = (nodes: ASTNode[]) => {
          nodes.forEach((node) => {
            if (node.type === 'orb' || node.type === 'building') {
              // Safe casting or extraction since ASTNode types might vary
              // Assuming node has these properties based on parser implementation
              const hologram = (node as any).hologram;
              const properties = (node as any).properties || {};
              const position = (node as any).position;

              const size = hologram?.size || (node.type === 'building' ? 5 : 1);

              const traits = Object.keys(properties).filter((k) => properties[k] === true);

              newEntities.push({
                id: (node as any).name,
                type: node.type,
                position: [position?.x || 0, position?.y || 0, position?.z || 0],
                scale: [size, size, size],
                color: hologram?.color,
                mesh: hologram?.shape || (node.type === 'building' ? 'cube' : 'orb'),
                text: properties?.text || hologram?.text,
                glow: hologram?.glow,
                interactive: hologram?.interactive,
                traits: traits,
                properties: properties,
              });
            }
            // Recursive imports or compositions could go here
          });
        };

        traverse(parseResult.ast);
        setEntities(newEntities);
        setError(null);
      } catch (err: unknown) {
        console.error(err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(String(err));
        }
      }
    };

    parseAndLoad();
  }, [scriptContent]);

  if (error)
    return (
      <group position={[0, 1.5, -2]}>
        <Text color="red" fontSize={0.3} maxWidth={4}>{`Script Error:\n${error}`}</Text>
      </group>
    );

  return (
    <group>
      {/* 4. Solarpunk Atmosphere */}
      <Environment preset="sunset" blur={0.6} background />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />

      {/* Render Entities */}
      {entities.map((ent, i) => (
        <HoloEntity key={i} entity={ent} />
      ))}

      {/* Ground Plane (Infinite Grid) */}
      <gridHelper args={[100, 100, 0x00ffff, 0x222222]} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
    </group>
  );
};
