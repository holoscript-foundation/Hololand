import React, { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, Html, Environment, Sparkles, Stars, ContactShadows } from '@react-three/drei';
// Post-processing temporarily disabled - uncomment when needed
// import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing';
import { 
  HoloScriptPlusParser, 
  HoloScriptPlusRuntimeImpl,
  VRTraitRegistry
} from '@holoscript/core';
import { PlayerController } from './PlayerController';
import { Vector3, Mesh } from 'three';
import { AssetRegistry } from '../services/AssetRegistry';
import { SettingsModal } from './SettingsModal';
import { BrittneyChat } from './BrittneyChat';
import { ReactHoloRenderer, HoloEntityData } from '../services/HoloPlusRendererBridge';

// --- Static Helpers Moved to AssetRegistry ---
const assetRegistry = AssetRegistry.getInstance();

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
    const url = assetRegistry.resolve(key);
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
  runtime: any,
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

    // HoloScript+ Trait: @grabbable
    if (entity.traits?.includes('grabbable') && active && playerPosition) {
        const targetPos = playerPosition.clone().add(new Vector3(0, 0.5, -2));
        meshRef.current.position.lerp(targetPos, 0.1);
    }

    // HoloScript+ Trait: @lookAtPlayer
    if (entity.traits?.includes('lookAtPlayer') && playerPosition) {
        meshRef.current.lookAt(playerPosition);
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

      if (entity.traits?.includes('settings')) {
        runtime.emit('show-settings');
        console.log('SETTINGS TRAIT ACTIVATED');
      }

      if (entity.traits?.includes('chat')) {
        runtime.emit('show-chat');
        console.log('CHAT TRAIT ACTIVATED');
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
  runtime: any;
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
  const assetUrl = assetRegistry.resolve(assetKey);
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
  const [playerPosition, setPlayerPosition] = useState(new Vector3(0, 0, 10));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Bridge and Runtime State
  const rendererBridge = useMemo(() => new ReactHoloRenderer(setEntities), []);
  const runtimeRef = useRef<HoloScriptPlusRuntimeImpl | null>(null);

  useEffect(() => {
    if (!runtimeRef.current) return;
    const runtime = runtimeRef.current;

    const handleShowSettings = () => {
      setSettingsOpen(true);
    };
    const handleShowChat = () => {
      setChatOpen(true);
    };
    const handleOpenModal = (payload: any) => {
        if (payload.id === 'settings') setSettingsOpen(true);
        if (payload.id === 'chat') setChatOpen(true);
    };

    runtime.on('show-settings', handleShowSettings);
    runtime.on('show-chat', handleShowChat);
    runtime.on('open_modal', handleOpenModal);

    return () => {
      runtime.off('show-settings', handleShowSettings);
      runtime.off('show-chat', handleShowChat);
    };
  }, [tick]); // Re-bind when runtime is recreated

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

  // Update runtime animations on every frame
  useFrame((state, delta) => {
    if (runtimeRef.current) {
      // Update VR context for traits
      runtimeRef.current.updateVRContext({
          hands: { left: null, right: null }, // TODO: Integrate with controllers
          headset: { 
              position: [state.camera.position.x, state.camera.position.y, state.camera.position.z],
              rotation: [state.camera.rotation.x, state.camera.rotation.y, state.camera.rotation.z]
          },
          controllers: { left: null, right: null }
      });

      // Update the plus engine (this drives the renderer bridge)
      (runtimeRef.current as any).update(delta);

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
        setEntities([]); // Reset entities for new script

        const parser = new HoloScriptPlusParser({ enableVRTraits: true });
        const result = parser.parse(scriptContent);

        if (!result.success) {
          setError(result.errors.map((e) => `Line ${e.line}: ${e.message}`).join('\n'));
          return;
        }

        const runtime = new HoloScriptPlusRuntimeImpl(result.ast, {
          renderer: rendererBridge,
          vrEnabled: true,
        });

        // Initialize state/variables
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

        runtime.mount(null); // Mount to our bridge
        runtimeRef.current = runtime;

        setError(null);
        setTick((t) => t + 1); // Trigger re-render to bind events
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    parseAndLoad();
  }, [scriptContent]);

  // Entity sync for special game logic (Pinball, etc)
  const syncedEntities = useMemo(() => {
    return entities.map((ent) => {
      if (!ent.id || !runtimeRef.current) return ent;

      // PINBALL OVERRIDES
      let pos = ent.position;
      let rot = ent.rotation || ([0, 0, 0] as [number, number, number]);

      if (ent.id === 'Pinball') {
        pos = [ballPos.x - 10, ballPos.y, ballPos.z - 5];
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
        if (bits >= 5) assetKey = 'brian_flexing';
        else if (bits > 0) assetKey = 'brian_situps';
        else assetKey = 'brian_boxing';
      }

      return {
        ...ent,
        mesh: assetKey,
        position: pos,
        rotation: rot,
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
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>THE OASIS HUB</span>
            <button 
              onClick={() => setSettingsOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4ade80',
                cursor: 'pointer',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'auto'
              }}
              title="Settings"
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
            </button>
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
        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <BrittneyChat isOpen={chatOpen} onClose={() => setChatOpen(false)} runtime={runtimeRef.current as any} />
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
