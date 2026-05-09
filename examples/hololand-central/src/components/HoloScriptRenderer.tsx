import React, { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, useGLTF, useAnimations, Html, Environment, Sparkles, Stars, ContactShadows } from '@react-three/drei';
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
import { OasisHUD } from './OasisHUD';
import { THEMES, getNextTheme } from '../themes/themes';
import { Theme } from '../themes/types';
import {
  EventBus,
  NPCSystem,
  NPCTrait,
  DialogManager,
  HoloScriptLoader
} from '@hololand/world';
import { SplatRenderer } from './spatial/SplatRenderer';
import { NeRFRenderer } from './spatial/NeRFRenderer';
import { VolumetricPlayer } from './spatial/VolumetricPlayer';
import { traitRegistry } from '@hololand/traits';

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
  const traitsAppliedRef = useRef(false);

  // Apply traits when mesh is available
  useEffect(() => {
    if (!meshRef.current || traitsAppliedRef.current || !entity.traits) return;

    // Apply all traits from the trait registry
    entity.traits.forEach((trait) => {
      // Map legacy trait names to new @-prefixed names
      const traitName = trait.startsWith('@') ? trait : `@${trait}`;

      // Apply trait with entity properties
      traitRegistry.apply(meshRef.current!, traitName, entity.properties);
    });

    traitsAppliedRef.current = true;
  }, [meshRef.current, entity.traits, entity.properties]);

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

    // Update all active traits via trait registry
    traitRegistry.update(delta);

    // Legacy fallback: Handle traits not yet in registry
    if (entity.traits?.includes('rotate') && !entity.traits.includes('@rotate')) {
      meshRef.current.rotation.y += delta * 0.5;
    }

    if (entity.traits?.includes('float') && !entity.traits.includes('@float')) {
      meshRef.current.position.y = entity.position[1] + Math.sin(state.clock.elapsedTime) * 0.2;
    }

    // Custom grabbable behavior with active state
    if (entity.traits?.includes('grabbable') && active && playerPosition) {
      const targetPos = playerPosition.clone().add(new Vector3(0, 0.5, -2));
      meshRef.current.position.lerp(targetPos, 0.1);
    }

    // Custom lookAtPlayer behavior
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
const GLBModel: React.FC<{ url: string; animation?: string }> = ({ url, animation }) => {
  try {
    const { scene, animations } = useGLTF(url);
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const { ref, actions } = useAnimations(animations, clonedScene);

    useEffect(() => {
      if (actions && animation && actions[animation]) {
        actions[animation].fadeIn(0.5).play();
        return () => {
          actions[animation]?.fadeOut(0.5).stop();
        };
      } else if (actions && Object.keys(actions).length > 0) {
        // Play first animation if none specified
        const firstAction = actions[Object.keys(actions)[0]];
        firstAction?.fadeIn(0.5).play();
        return () => {
           firstAction?.fadeOut(0.5).stop();
        };
      }
    }, [actions, animation]);

    return <primitive ref={ref} object={clonedScene} />;
  } catch (err) {
    console.warn(`Failed to load GLB: ${url}`, err);
    return <boxGeometry args={[1, 1, 1]} />;
  }
};

const Avatar: React.FC<{ url: string; animation?: string }> = ({ url, animation }) => {
  return (
    <Suspense fallback={<Text color="white">Loading Avatar...</Text>}>
      <GLBModel url={url} animation={animation} />
    </Suspense>
  );
};

const DNA: React.FC<{ properties: Record<string, any> }> = ({ properties }) => {
  // DNA is a metadata node, it doesn't render anything itself but might affect parent
  return null;
};

const GeometryRenderer: React.FC<{ assetKey: string; assetUrl?: string; entity: HoloEntityData }> = ({
  assetKey,
  assetUrl,
  entity
}) => {
  const isGLB = assetUrl && assetUrl.endsWith('.glb');

  if (entity.type === 'Avatar' || entity.type === 'avatar') {
    return <Avatar url={assetUrl || ''} animation={entity.properties?.animation as string} />;
  }

  if (entity.type === 'DNA' || entity.type === 'dna') {
    return <DNA properties={entity.properties || {}} />;
  }

  if (entity.type === 'GaussianSplat' || entity.type === 'gaussian_splat' || entity.type === 'splat') {
    return (
      <SplatRenderer 
        src={assetUrl || (entity.properties?.src as string)} 
        opacity={(entity.properties?.opacity as number) || 1}
      />
    );
  }

  if (entity.type === 'NeRF' || entity.type === 'nerf') {
    return (
      <NeRFRenderer 
        src={assetUrl || (entity.properties?.src as string)} 
        quality={entity.properties?.quality as any}
      />
    );
  }

  if (entity.type === 'VolumetricVideo' || entity.type === 'volumetric_video') {
    return (
      <VolumetricPlayer 
        src={assetUrl || (entity.properties?.src as string)}
        autoplay={entity.properties?.autoplay !== false}
        loop={entity.properties?.loop !== false}
      />
    );
  }

  if (isGLB && assetUrl)
    return (
      <Suspense fallback={null}>
        <GLBModel url={assetUrl} animation={entity.properties?.animation as string} />
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
        <GeometryRenderer assetKey={assetKey} assetUrl={assetUrl} entity={entity} />
        {(!assetUrl || !assetUrl.endsWith('.glb')) && (
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
        )}
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
  // Pass up the dialog manager so OasisPage can render the overlay
  // Or render overlay here? Render props pattern might be better but for now let's expose it 
  // actually, let's keep it self contained and assume parent handles layout.
  // Wait, the renderer is inside Canvas. Overlay must be HTML.
  const [entities, setEntities] = useState<HoloEntityData[]>([]);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playerPosition, setPlayerPosition] = useState(new Vector3(0, 0, 10));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  // Theming State
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES.cyberpunk);
  const [isFading, setIsFading] = useState(false);
  
  const cycleTheme = () => {
      setIsFading(true);
      setTimeout(() => {
          setCurrentTheme(prev => getNextTheme(prev.name));
          setTimeout(() => setIsFading(false), 100);
      }, 300);
  };
  
  // Bridge and Runtime State
  const rendererBridge = useMemo(() => new ReactHoloRenderer(setEntities), []);
  const runtimeRef = useRef<HoloScriptPlusRuntimeImpl | null>(null);

  // NPC Systems State
  const [npcEntities, setNpcEntities] = useState<HoloEntityData[]>([]);
  
  // Initialize Systems (Memoized to persist across renders)
  const systems = useMemo(() => {
      const eventBus = new EventBus();
      const npcSystem = new NPCSystem(eventBus);
      const dialogManager = new DialogManager(eventBus);
      const loader = new HoloScriptLoader(npcSystem, dialogManager);
      
      // Expose to window for debugging
      (window as any).__HOLOLAND_SYSTEMS__ = { npcSystem, dialogManager, eventBus };
      
      return { eventBus, npcSystem, dialogManager, loader };
  }, []);

  // Expose dialog manager to parent via event or ref? 
  // Actually, we can dispatch a custom event when systems are ready so parent can grab the manager
  useEffect(() => {
      if (systems) {
          const detail = { dialogManager: systems.dialogManager };
          window.dispatchEvent(new CustomEvent('hololand:systems-ready', { detail }));
      }
  }, [systems]);

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

    const unsubSettings = runtime.on('show-settings', handleShowSettings);
    const unsubChat = runtime.on('show-chat', handleShowChat);
    const unsubModal = runtime.on('open_modal', handleOpenModal);

    return () => {
      unsubSettings();
      unsubChat();
      unsubModal();
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
  useFrame((state, delta, frame) => {
    if (runtimeRef.current) {
      // Gather WebXR controller and hand tracking data
      const xr = (state.gl as any).xr;
      const session = xr?.getSession?.();
      const referenceSpace = xr?.getReferenceSpace?.();

      let leftController: any = null;
      let rightController: any = null;
      let leftHand: any = null;
      let rightHand: any = null;

      if (session && frame && referenceSpace) {
        for (const inputSource of session.inputSources as any[]) {
          const handedness = inputSource.handedness as 'left' | 'right' | 'none';
          if (handedness !== 'left' && handedness !== 'right') continue;

          // Controller pose from gripSpace
          if (inputSource.gripSpace) {
            const pose = (frame as XRFrame).getPose(inputSource.gripSpace, referenceSpace);
            if (pose) {
              const gamepad = inputSource.gamepad;
              const controllerData = {
                connected: true,
                position: [pose.transform.position.x, pose.transform.position.y, pose.transform.position.z] as [number, number, number],
                rotation: [pose.transform.orientation.x, pose.transform.orientation.y, pose.transform.orientation.z, pose.transform.orientation.w] as [number, number, number, number],
                trigger: gamepad?.buttons[0]?.pressed || false,
                grip: gamepad?.buttons[1]?.pressed || false,
                thumbstick: { x: gamepad?.axes[2] || 0, y: gamepad?.axes[3] || 0 },
              };
              if (handedness === 'left') leftController = controllerData;
              else rightController = controllerData;
            }
          }

          // Hand tracking via WebXR Hand API
          if (inputSource.hand && (frame as any).getJointPose) {
            const handJoints: any[] = [];
            const jointNames = [
              'wrist',
              'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
              'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
              'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
              'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
              'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
            ];

            for (const jointName of jointNames) {
              const joint = inputSource.hand.get(jointName);
              if (!joint) continue;
              const jointPose = (frame as any).getJointPose(joint, referenceSpace);
              if (jointPose) {
                handJoints.push({
                  name: jointName,
                  position: [jointPose.transform.position.x, jointPose.transform.position.y, jointPose.transform.position.z] as [number, number, number],
                  rotation: [jointPose.transform.orientation.x, jointPose.transform.orientation.y, jointPose.transform.orientation.z, jointPose.transform.orientation.w] as [number, number, number, number],
                  radius: jointPose.radius || 0.01,
                });
              }
            }

            // Simple gesture detection (pinch)
            const thumbTip = handJoints.find((j: any) => j.name === 'thumb-tip');
            const indexTip = handJoints.find((j: any) => j.name === 'index-finger-tip');
            const wrist = handJoints.find((j: any) => j.name === 'wrist');
            let gesture: string | null = null;
            if (thumbTip && indexTip && wrist) {
              const dist = Math.sqrt(
                Math.pow(thumbTip.position[0] - indexTip.position[0], 2) +
                Math.pow(thumbTip.position[1] - indexTip.position[1], 2) +
                Math.pow(thumbTip.position[2] - indexTip.position[2], 2)
              );
              if (dist < 0.03) gesture = 'pinch';
            }

            const handData = {
              joints: handJoints,
              gesture,
              confidence: Math.min(handJoints.length / 25, 1.0),
            };

            if (handedness === 'left') leftHand = handData;
            else rightHand = handData;
          }
        }
      }

      // Update VR context for traits (@hand_tracked, @grabbable, controller-driven)
      runtimeRef.current.updateVRContext({
          hands: { left: leftHand, right: rightHand },
          headset: {
              position: [state.camera.position.x, state.camera.position.y, state.camera.position.z],
              rotation: [state.camera.rotation.x, state.camera.rotation.y, state.camera.rotation.z]
          },
          controllers: { left: leftController, right: rightController }
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

    // Update NPC System
    if (systems && playerPosition) {
        systems.npcSystem.update({ x: playerPosition.x, y: playerPosition.y, z: playerPosition.z });
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
    
    // Also load the script into the NPC loader to extract traits
    if (systems) {
        console.log("Loading script into NPC Loader...");
        systems.loader.load(scriptContent);
        
        // Convert NPC traits to HoloEntityData for rendering
        const traits = systems.npcSystem.getAll();
        const visualEntities: HoloEntityData[] = traits.map((t, idx) => ({
            id: t.id,
            type: 'npc',
            // Use trait position if available, else spread them out
            position: t.position ? [t.position.x, t.position.y, t.position.z] : [5 + (idx * 2), 0, 5], 
            scale: [1, 1, 1],
            mesh: t.model || 'robot_v2', // Use trait model or fallback
            text: t.name,
            traits: ['talkable', 'lookAtPlayer', 'hover'],
            properties: {
                dialogue: "...", // Placeholder, actual dialog handled by UI overlay
                opacity: 1
            },
            color: '#ff00ff', // Pink for NPCs
            glow: true
        }));
        
        setNpcEntities(visualEntities);
    }

  }, [scriptContent, systems]);

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
      {/* 4. Dynamic Theming Atmosphere */}
      <Environment preset={currentTheme.name === 'snowy-town' || currentTheme.name === 'holiday' ? 'city' : 'night'} blur={0.6} background />
      
      {currentTheme.name === 'cyberpunk' && (
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={0.5} />
      )}
      
      {/* Theme-specific Particles */}
      {currentTheme.decorations?.map((dec, i) => (
          dec.type === 'particle' && (
              <Sparkles key={i} count={dec.count} scale={20} size={dec.size * 50} speed={0.4} opacity={0.5} color={dec.color} />
          )
      ))}
      
      {/* High-Depth Lighting (Dynamic based on Theme) */}
      <ambientLight intensity={currentTheme.lighting.ambientIntensity || 0.2} />
      
      {currentTheme.lighting.pointLights.map((pl, i) => (
          <pointLight 
            key={i}
            position={pl.position as [number, number, number]} 
            intensity={pl.intensity * 5} 
            color={pl.color} 
            castShadow 
            distance={pl.distance}
          />
      ))}
      
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={currentTheme.lighting.mainLightIntensity || 1.2} 
        color={currentTheme.lighting.mainLightColor || '#ffffff'}
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

      {/* Render Entities */}
      {syncedEntities.map((ent, i) => (
        <HoloEntity 
            key={`${i}-${ent.id}`} 
            entity={ent} 
            runtime={runtimeRef.current} 
            playerPosition={playerPosition}
        />
      ))}

      {/* Render NPC Entities (Bridge) */}
      {npcEntities.map((ent, i) => {
          // Safety: Skip if position is missing (initialization delay)
          if (!ent.position || !playerPosition) return null;
          
          const dist = playerPosition.distanceTo(new Vector3(...ent.position));
          const inRange = dist < 5;
          return (
             <group key={`npc-group-${ent.id}`}>
                <HoloEntity
                    entity={ent}
                    runtime={runtimeRef.current}
                    playerPosition={playerPosition}
                />
                <Html position={[ent.position[0], ent.position[1] + 2.5, ent.position[2]]} distanceFactor={8}>
                    <div style={{
                        opacity: inRange ? 1 : 0,
                        transform: inRange ? 'scale(1)' : 'scale(0.8)',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '5px',
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            padding: '6px 12px',
                            background: 'rgba(0, 255, 255, 0.9)',
                            backdropFilter: 'blur(4px)',
                            color: '#000',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '1px',
                            boxShadow: '0 0 15px rgba(0, 255, 255, 0.6)',
                            animation: inRange ? 'bounce 0.8s infinite alternate cubic-bezier(0.45, 0, 0.55, 1)' : 'none',
                            whiteSpace: 'nowrap'
                        }}>
                             TALK [E]
                        </div>
                        <div style={{ 
                            width: 0, 
                            height: 0, 
                            borderLeft: '6px solid transparent', 
                            borderRight: '6px solid transparent', 
                            borderTop: '8px solid rgba(0, 255, 255, 0.9)',
                            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                        }} />
                    </div>
                    <style>{`
                        @keyframes bounce {
                            from { transform: translateY(0); }
                            to { transform: translateY(-8px); }
                        }
                    `}</style>
                </Html>
             </group>
          );
      })}

      {/* Player Character */}
      <Suspense fallback={null}>
        <PlayerController 
          avatarUrl="/assets/models/Brian_Flexing.glb"
          onPositionUpdate={setPlayerPosition}
          onInteract={() => window.dispatchEvent(new CustomEvent('player-interact'))}
        />
      </Suspense>

      {/* NEW HUD & OVERLAYS */}
      <Html fullscreen>
        {/* Cinematic Screen Fade */}
        <div style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            opacity: isFading ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: 'none',
            zIndex: 3000
        }} />

        <OasisHUD 
            playerPosition={playerPosition || new Vector3(0,0,0)}
            bitsCollected={(runtimeRef.current?.getVariable('bitsCollected') as number) ?? 0}
            visitorCount={(runtimeRef.current?.getVariable('visitorCount') as number) ?? 128}
        />
        
        {/* Theme Toggle Button (Experimental) */}
        <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            pointerEvents: 'auto',
            zIndex: 1000
        }}>
            <button 
                onClick={cycleTheme}
                style={{
                    padding: '10px 15px',
                    background: 'rgba(26, 26, 46, 0.8)',
                    border: '1px solid #00ffff',
                    color: '#00ffff',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                }}
            >
                THEME: {currentTheme.displayName.toUpperCase()}
            </button>
        </div>

        <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <BrittneyChat isOpen={chatOpen} onClose={() => setChatOpen(false)} runtime={runtimeRef.current as any} />
      </Html>

      {/* Ground Plane (Dynamic Color) */}
      <gridHelper args={[100, 100, currentTheme.colors.primary, 0x222222]} position={[0, -0.01, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color={currentTheme.colors.floor || '#1a1a2e'} roughness={0.8} />
      </mesh>
    </group>
  );
};
