import React, { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, Html, Environment, Sparkles, Stars, ContactShadows } from '@react-three/drei';
// Post-processing temporarily disabled - uncomment when needed
// import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing';
import { HoloScriptCodeParser, HoloScriptRuntime } from '@holoscript/core';
import { PlayerController } from './PlayerController';
import { Vector3, Mesh } from 'three';

// --- 1. Asset Registry (Mapping Script Names to Files) ---
const ASSET_TO_URL: Record<string, string> = {
  fountain: '/assets/models/fountain_art_deco.glb',
  dome: '/assets/models/dome_grandeur.glb',
  tree: '/assets/models/solarpunk_tree.glb',
  arch: '/assets/models/deco_arch.glb',
  shop_front: '/assets/models/shop_facade_deco.glb',
  vines: '/assets/models/hanging_vines.glb',
  lamp_post: '/assets/models/solarpunk_lamp.glb',
  vending_machine: '/assets/models/solarpunk_vending.glb',
  'bio-dome': '/assets/models/biosphere_dome.glb',
  avatar: '/assets/models/Brian_Flexing.glb',
  brian_boxing: '/assets/models/Brian_Boxing.glb',
  brian_situps: '/assets/models/Brian_Situps.glb',
  brian_bicycle: '/assets/models/Brian_BicycleCrunch.glb',
  brian_flexing: '/assets/models/Brian_Flexing.glb',
  // Fallbacks
  orb: 'primitive:sphere',
  cube: 'primitive:box',
  sphere: 'primitive:sphere',
  column: 'primitive:cylinder',
  torus: 'primitive:torus',
  hologram_panel: 'primitive:plane',
};

// --- Zone to Asset Mapping (for preloading) ---
const ZONE_ASSETS: Record<string, string[]> = {
  arcade: ['vending_machine', 'lamp_post', 'brian_boxing', 'hologram_panel'],
  casino_interior: ['brian_flexing', 'brian_situps', 'brian_boxing', 'torus'],
  legends: [],
};

// Global preloader call (needs to be inside a component or hook context if it uses useGLTF directly,
// but useGLTF.preload is static/global)
const triggerPreload = (zone: string) => {
  const assets = ZONE_ASSETS[zone] || [];
  assets.forEach((key) => {
    const url = ASSET_TO_URL[key as keyof typeof ASSET_TO_URL];
    if (url && url.endsWith('.glb')) {
      useGLTF.preload(url);
    }
  });
};

// --- Types ---
interface HoloEntityData {
  id?: string;
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
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
const useTraits = (
  entity: HoloEntityData,
  meshRef: React.MutableRefObject<Mesh | null>,
  runtime: HoloScriptRuntime,
  playerPosition?: Vector3
) => {
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);
  const [collected, setCollected] = useState(false);
  const [nearPlayer, setNearPlayer] = useState(false);
  const preloadedRef = useRef(false);

  useFrame((state, delta) => {
    if (!meshRef.current || collected) return;

    // Phase 7: Player Proximity Detection
    if (playerPosition) {
      const dist = meshRef.current.position.distanceTo(playerPosition);
      const isNear = dist < 3;
      if (isNear !== nearPlayer) setNearPlayer(isNear);
    }

    // PHASE 6: Proximity Preloading
    if (entity.traits?.includes('portal-gate') && !preloadedRef.current) {
      const dist = meshRef.current.position.distanceTo(state.camera.position);
      if (dist < 15) {
        const dest = entity.properties?.destination as string;
        if (dest) {
          triggerPreload(dest);
          preloadedRef.current = true;
          console.log(`PROXIMITY TRIGGER: Preloading ${dest}...`);
        }
      }
    }

    // ... existing traits ...
    if (entity.traits?.includes('rotate') || (entity.properties?.rotate as boolean)) {
      meshRef.current.rotation.y += delta * 0.5;
    }

    if (entity.traits?.includes('float')) {
      meshRef.current.position.y = entity.position[1] + Math.sin(state.clock.elapsedTime) * 0.2;
    }

    if (entity.glow || entity.traits?.includes('pulse')) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      meshRef.current.scale.set(
        entity.scale[0] * scale,
        entity.scale[1] * scale,
        entity.scale[2] * scale
      );
    }

    if (entity.traits?.includes('sway')) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.3) * 0.05;
    }

    if (entity.traits?.includes('flicker')) {
      meshRef.current.visible = Math.random() > 0.02;
    }

    if (entity.traits?.includes('rotate-slow')) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  const events = useMemo(() => {
    // Interaction Logic Unification (Click or 'E')
    const triggerAction = () => {
      if (collected) return;
      setActive(!active);
      
      if (entity.traits?.includes('collectible')) {
        setCollected(true);
        const currentBits = (runtime.getVariable('bitsCollected') as number) || 0;
        runtime.setVariable('bitsCollected', currentBits + 1);
        console.log(`COLLECTED: ${entity.id}. Total Bits: ${runtime.getVariable('bitsCollected')}`);
      }

      if (entity.traits?.includes('portal-gate')) {
        const dest = entity.properties?.destination as string;
        if (dest === 'legends') window.location.href = '/legends';
        console.log(`PORTAL ACTIVATED: ${dest}`);
      }

      if (entity.traits?.includes('talkable')) {
        console.log(`DIALOGUE: ${entity.properties?.dialogue || 'Hello traveler.'}`);
      }
    };

    if (!entity.interactive && !entity.traits?.includes('interactive')) return { triggerAction };

    return {
      onClick: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        triggerAction();
      },
      onPointerOver: (e: { stopPropagation: () => void }) => {
        if (collected) return;
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      },
      onPointerOut: () => {
        setHover(false);
        document.body.style.cursor = 'auto';
      },
      triggerAction
    };
  }, [entity, active, collected, runtime]);

  return { hovered, active, collected, nearPlayer, events };
};

// --- 3. Entity Component (The renderer) ---
interface HoloEntityProps {
  entity: HoloEntityData;
  runtime: HoloScriptRuntime;
  playerPosition?: Vector3;
}

// --- 3. Sub-components for Rendering ---
const GLBModel: React.FC<{ url: string }> = ({ url }) => {
  try {
    const { scene } = useGLTF(url);
    // Use a memoized clone to avoid re-cloning on every frame if the component re-renders
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    return <primitive object={clonedScene} />;
  } catch (err) {
    console.warn(`Failed to load GLB: ${url}`, err);
    return <boxGeometry args={[1, 1, 1]} />;
  }
};

const GeometryRenderer: React.FC<{ assetKey: string; assetUrl?: string }> = ({
  assetKey,
  assetUrl,
}) => {
  const isGLB = assetUrl && assetUrl.endsWith('.glb');

  if (isGLB && assetUrl)
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
      return <cylinderGeometry args={[0.5, 0.5, 2, 8]} />;
    case 'plane':
      return <planeGeometry args={[1, 1]} />;
    default:
      return <dodecahedronGeometry args={[0.5]} />;
  }
};



const HoloEntity: React.FC<HoloEntityProps> = ({ entity, runtime, playerPosition }) => {
  const meshRef = useRef<Mesh>(null);
  const { hovered, active, collected, nearPlayer, events } = useTraits(
    entity,
    meshRef,
    runtime,
    playerPosition
  );

  useEffect(() => {
    const handleInteract = () => {
      if (nearPlayer && (events as any).triggerAction) {
        (events as any).triggerAction();
      }
    };
    window.addEventListener('player-interact', handleInteract);
    return () => window.removeEventListener('player-interact', handleInteract);
  }, [nearPlayer, events]);

  if (collected) return null;

  const assetKey = entity.mesh || (entity.properties?.shape as string) || 'orb';
  const assetUrl = ASSET_TO_URL[assetKey];
  const color = active ? 'hotpink' : hovered ? '#ffaa00' : entity.color || 'cyan';

  return (
    <group
      position={entity.position || [0, 0, 0]}
      rotation={entity.rotation || [0, 0, 0]}
      scale={entity.scale || [1, 1, 1]}
      {...events}
    >
      {/* Floating Interaction Prompt */}
      {nearPlayer && !collected && (
        <Text
          position={[0, 2.2, 0]}
          fontSize={0.2}
          color="#4ade80"
          anchorX="center"
          outlineWidth={0.02}
        >
          [E] INTERACT
        </Text>
      )}

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
          {String(entity.text || entity.type.toUpperCase()).replace(/\$(\w+)/g, (_, name) => {
            const val = runtime.getVariable(name);
            return val !== undefined ? String(val) : `$${name}`;
          })}
        </Text>
      )}

      <mesh ref={meshRef}>
        <GeometryRenderer assetKey={assetKey} assetUrl={assetUrl} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          metalness={0.8}
          emissive={entity.glow ? color : 'black'}
          emissiveIntensity={entity.glow ? 0.5 : 0}
          transparent={!!entity.properties?.transparent}
          opacity={(entity.properties?.opacity as number) || 1}
          side={2} // DoubleSide
        />
      </mesh>
      {/* Particle Effects for Special Entities */}
      {entity.glow && (
        <Sparkles count={20} scale={2} size={2} speed={0.4} opacity={0.5} color={color} />
      )}

      {/* Holographic Dialogue Box for AI NPCs */}
      {active && entity.traits?.includes('talkable') && (
        <group position={[0, 2.5, 0]}>
          <mesh>
            <planeGeometry args={[4, 1.5]} />
            <meshStandardMaterial color="#000000" transparent opacity={0.6} />
          </mesh>
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.2}
            color="cyan"
            maxWidth={3.5}
            textAlign="center"
          >
            {(entity.properties?.dialogue as string) || '...'}
          </Text>
        </group>
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
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const runtimeRef = useRef(new HoloScriptRuntime());
  const [playerPosition, setPlayerPosition] = useState(new Vector3(0, 0, 10));

  // Memoized HUD Styles for performance
  const hudStyle = useMemo<React.CSSProperties>(
    () => ({
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '15px 25px',
      background: 'rgba(26, 26, 46, 0.8)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(74, 222, 128, 0.3)',
      borderRadius: '15px',
      color: '#4ade80',
      fontFamily: "'Inter', sans-serif",
      pointerEvents: 'none',
      zIndex: 1000,
      boxShadow: '0 0 20px rgba(74, 222, 128, 0.2)',
    }),
    []
  );

  // --- Pinball System State ---
  const [ballPos, setBallPos] = useState({ x: 0, y: 1.6, z: -2 });
  const [ballVel, setBallVel] = useState({ x: 0, y: 0, z: 0.05 });
  const [leftFlipperRot, setLeftFlipperRot] = useState(0);
  const [rightFlipperRot, setRightFlipperRot] = useState(0);
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const onUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Update runtime animations and mini-games on every frame
  useFrame((_, delta) => {
    if (runtimeRef.current) {
      runtimeRef.current.updateAnimations();
      runtimeRef.current.updateParticles(delta);

      // Brian Smash Pinball Logic
      const context = runtimeRef.current.getContext();
      if (context.spatialMemory.has('Pinball')) {
        // Flipper Movement
        const targetLeft = keys.current['a'] ? -0.8 : 0;
        const targetRight = keys.current['d'] ? 0.8 : 0;
        setLeftFlipperRot((l) => l + (targetLeft - l) * delta * 20);
        setRightFlipperRot((r) => r + (targetRight - r) * delta * 20);

        // Ball Physics
        let newX = ballPos.x + ballVel.x;
        let newZ = ballPos.z + ballVel.z;
        let newVX = ballVel.x;
        let newVZ = ballVel.z;

        newVZ += 0.005; // Gravity

        if (Math.abs(newX) > 1.4) {
          newVX *= -0.8;
          newX = Math.sign(newX) * 1.4;
        }
        if (newZ < -2.4) {
          newVZ *= -0.8;
          newZ = -2.4;
        }
        if (newZ > 2.4) {
          newX = 0;
          newZ = -2;
          newVX = 0;
          newVZ = 0.05;
        }

        // Flipper Collision
        if (newZ > 1.5 && newZ < 2) {
          if (newX < -0.2 && newX > -1) {
            if (keys.current['a']) {
              newVZ = -0.15;
              newVX = 0.05;
            } else {
              newVZ *= -0.5;
            }
          }
          if (newX > 0.2 && newX < 1) {
            if (keys.current['d']) {
              newVZ = -0.15;
              newVX = -0.05;
            } else {
              newVZ *= -0.5;
            }
          }
        }

        setBallPos({ x: newX, y: 1.6, z: newZ });
        setBallVel({ x: newVX, y: 0, z: newVZ });
      }

      setTick((t) => t + 1);
    }
  });

  useEffect(() => {
    const parseAndLoad = async () => {
      try {
        const parser = new HoloScriptCodeParser();
        const parseResult = parser.parse(scriptContent);

        if (!parseResult.success) {
          setError(parseResult.errors.map((e) => `Line ${e.line}: ${e.message}`).join('\n'));
          return;
        }

        // Initialize Runtime
        const runtime = runtimeRef.current;
        runtime.reset();

        // Seed initial state/variables
        runtime.setVariable('visitorCount', Math.floor(Math.random() * 500) + 100);
        runtime.setVariable('bitsCollected', 0);

        // Sync Hololand Legends progress
        const legendsProgress = localStorage.getItem('hololand_legends_progress');
        if (legendsProgress) {
          try {
            const progress = JSON.parse(legendsProgress);
            runtime.setVariable('legendsLevel', progress.level || 1);
          } catch (e) {
            console.error('Failed to parse legends progress', e);
            runtime.setVariable('legendsLevel', 1);
          }
        } else {
          runtime.setVariable('legendsLevel', 1);
        }

        await runtime.execute(parseResult.ast);

        // Sync Entities from Runtime Context
        const context = runtime.getContext();
        const newEntities: HoloEntityData[] = [];

        // We pull entities from spatialMemory and hologramStates
        context.spatialMemory.forEach((pos, name) => {
          const hologram = context.hologramState.get(name);
          const variables = runtime.getVariable(name) as any;
          const properties = variables?.properties || {};

          const assetKey = hologram?.shape || 'orb';

          const size = hologram?.size || 1;
          const traits = Object.keys(properties).filter((k) => k !== 'shape' && k !== 'text');

          newEntities.push({
            id: name,
            type: variables?.__type || 'orb',
            position: [pos.x, pos.y, pos.z] as [number, number, number],
            scale: [size, size, size] as [number, number, number],
            color: hologram?.color,
            mesh: assetKey,
            text: properties?.text || (hologram as any)?.text,
            glow: hologram?.glow,
            interactive: hologram?.interactive,
            traits: traits,
            properties: properties,
          });
        });

        setEntities(newEntities);
        setError(null);
      } catch (err: unknown) {
        // console.error(err); // Removed for cleaner console
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    parseAndLoad();
  }, [scriptContent]);

  // Sync entity data from runtime variables on every tick
  const syncedEntities = useMemo(() => {
    return entities.map((ent) => {
      if (!ent.id || !runtimeRef.current) return ent;
      const runtimeVar = runtimeRef.current.getVariable(ent.id) as any;

      // Update position and properties from runtime
      let pos = runtimeVar?.position
        ? ([runtimeVar.position.x, runtimeVar.position.y, runtimeVar.position.z] as [
            number,
            number,
            number,
          ])
        : ent.position;
      let rot = ent.rotation || ([0, 0, 0] as [number, number, number]);

      // PINBALL OVERRIDES
      if (ent.id === 'Pinball') {
        pos = [ballPos.x - 10, ballPos.y, ballPos.z - 5]; // Offset by PinballMachine position [-10, 0, -5]
      }
      if (ent.id === 'Flipper_Left') {
        rot = [0, leftFlipperRot, 0];
      }
      if (ent.id === 'Flipper_Right') {
        rot = [0, rightFlipperRot, 0];
      }

      let assetKey = ent.mesh;
      // Model Swapping for both Trainer and Tuxedo Brian
      if (ent.id === 'NPC_Brian' || ent.id === 'NPC_Brian_Tux') {
        const bits = (runtimeRef.current.getVariable('bitsCollected') as number) || 0;
        if (bits >= 5) assetKey = 'brian_flexing' as any;
        else if (bits > 0) assetKey = 'brian_situps' as any;
        else assetKey = 'brian_boxing' as any;
      }

      return {
        ...ent,
        mesh: assetKey,
        position: pos,
        rotation: rot,
        properties: runtimeVar?.properties || ent.properties,
      };
    });
  }, [entities, tick, ballPos, leftFlipperRot, rightFlipperRot]);

  if (error)
    return (
      <group position={[0, 1.5, -2]}>
        <Text color="red" fontSize={0.3} maxWidth={4}>{`Script Error:\n${error}`}</Text>
      </group>
    );

  return (
    <group>
      {/* 4. Night-time Solarpunk Atmosphere */}
      <Environment preset="night" blur={0.6} background />
      <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      
      {/* High-Depth Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={2.5} color="#4cc9f0" castShadow />
      <pointLight position={[-10, 5, -10]} intensity={1.5} color="#ff00ff" />
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />

      {/* Realistic Shadows */}
      <ContactShadows 
         position={[0, 0, 0]} 
         opacity={0.4} 
         scale={40} 
         blur={2} 
         far={10} 
         resolution={256} 
         color="#000000" 
      />

      {/* Premium Post-Processing - Temporarily Disabled to Fix Crash */}
      {/* <Suspense fallback={null}>
        <EffectComposer>
          <Bloom 
            luminanceThreshold={1.0} 
            mipmapBlur 
            intensity={1.2} 
            radius={0.4}
          />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
          <Noise opacity={0.02} />
          <ToneMapping adaptive={true} />
        </EffectComposer>
      </Suspense> */}

      {/* Render Entities */}
      {syncedEntities.map((ent, i) => (
        <HoloEntity 
            key={i} 
            entity={ent} 
            runtime={runtimeRef.current} 
            playerPosition={playerPosition}
        />
      ))}

      {/* Player Character */}
      {/* Player Character */}
      <Suspense fallback={null}>
        <PlayerController 
          avatarUrl="/assets/models/Brian_Flexing.glb"
          onPositionUpdate={setPlayerPosition}
          onInteract={() => window.dispatchEvent(new CustomEvent('player-interact'))}
        />
      </Suspense>

      {/* Holographic HUD Overlay */}
      <Html fullscreen>
        <div style={hudStyle}>
          <div style={{ fontSize: '12px', opacity: 0.7, marginBottom: '5px' }}>
            OASIS INTERFACE v4.0
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
            THE OASIS HUB
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
              <span>DATA BITS:</span>
              <span style={{ color: '#fff' }}>
                {String(runtimeRef.current?.getVariable('bitsCollected') || 0)}/5
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
              <span>LEGENDS LEVEL:</span>
              <span style={{ color: '#fff' }}>
                {String(runtimeRef.current?.getVariable('legendsLevel') || 1)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px' }}>
              <span>TOTAL VISITORS:</span>
              <span style={{ color: '#fff' }}>
                {String(runtimeRef.current?.getVariable('visitorCount') || '---')}
              </span>
            </div>
          </div>

          {((runtimeRef.current?.getVariable('bitsCollected') as number) || 0) >= 5 && (
            <div
              style={{
                marginTop: '15px',
                padding: '8px',
                background: 'rgba(74, 222, 128, 0.2)',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '14px',
                color: '#fff',
                border: '1px solid #4ade80',
              }}
            >
              MISSION COMPLETE! TALK TO BRIAN
            </div>
          )}
        </div>
      </Html>

      {/* Ground Plane (Infinite Grid) */}
      <gridHelper args={[100, 100, 0x00ffff, 0x222222]} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
    </group>
  );
};
