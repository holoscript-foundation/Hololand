import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// Note: VR support requires @react-three/xr v6+ with updated API
// For now, using desktop-only mode

import VRBrittneyPanel from '@/components/vr/VRBrittneyPanel';
import VRToolsMenu, { VRCrosshair, VRTool } from '@/components/vr/VRToolsMenu';
import { useDesktopGodMode } from '@/hooks/useGodMode';
import { getVoiceService, speak, VoiceRecognitionResult } from '@/services/voiceService';
import { getWorldSpawner, EntityType, SpawnedEntity } from '@/services/worldSpawnerService';
import { translateToHoloScript } from '@/services/brittneyService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function VRBuilderPage() {
  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm Brittney. Say my name or press V to talk. Tell me what to build!",
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [activeTool, setActiveTool] = useState<VRTool>('spawn');
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('box');
  const [spawnedEntities, setSpawnedEntities] = useState<SpawnedEntity[]>([]);
  const [showUI, setShowUI] = useState(true);

  // Refs
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Initialize voice service
  useEffect(() => {
    const voice = getVoiceService({ wakeWord: 'brittney' });

    // Handle voice results
    const unsubResult = voice.onResult((result: VoiceRecognitionResult) => {
      setCurrentTranscript(result.transcript);

      if (result.isFinal) {
        handleVoiceCommand(result.transcript);
        setCurrentTranscript('');
      }
    });

    // Handle status changes
    const unsubStatus = voice.onStatus((status) => {
      setIsListening(status === 'listening');
    });

    // Start listening
    voice.start();

    return () => {
      unsubResult();
      unsubStatus();
      voice.stop();
    };
  }, []);

  // Handle voice commands to Brittney
  const handleVoiceCommand = useCallback(async (command: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: command }]);
    setIsGenerating(true);

    try {
      // Check for quick commands
      const lowerCommand = command.toLowerCase();

      if (lowerCommand.includes('undo') || lowerCommand.includes('delete last')) {
        const spawner = getWorldSpawner();
        const entities = spawner.getAll();
        if (entities.length > 0) {
          spawner.delete(entities[entities.length - 1].id);
          setSpawnedEntities(spawner.getAll());
          const response = 'Done! Removed the last object.';
          setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
          speak(response);
        }
        setIsGenerating(false);
        return;
      }

      if (lowerCommand.includes('clear') || lowerCommand.includes('delete all')) {
        const spawner = getWorldSpawner();
        spawner.clear();
        setSpawnedEntities([]);
        const response = 'Cleared everything! Fresh canvas.';
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
        speak(response);
        setIsGenerating(false);
        return;
      }

      // Call Brittney AI
      const result = await translateToHoloScript(command, { style: 'minimal' });

      if (result.success && result.holoScript) {
        // Spawn entities from HoloScript
        const spawner = getWorldSpawner();
        const spawned = spawner.spawnFromHoloScript(result.holoScript);
        setSpawnedEntities(spawner.getAll());

        const response = `Created ${spawned.length} object${spawned.length !== 1 ? 's' : ''}!`;
        setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
        speak(response);
      } else {
        const errorMsg = result.errors?.[0] || "I couldn't understand that. Try again?";
        setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
        speak(errorMsg);
      }
    } catch (error) {
      console.error('[VRBuilder] Error:', error);
      const errorMsg = 'Oops! Something went wrong. Try again.';
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMsg }]);
      speak(errorMsg);
    }

    setIsGenerating(false);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // V to toggle voice
      if (e.code === 'KeyV') {
        const voice = getVoiceService();
        voice.toggle();
      }

      // H to toggle UI
      if (e.code === 'KeyH') {
        setShowUI((prev) => !prev);
      }

      // 1-5 for tools
      if (e.code === 'Digit1') setActiveTool('spawn');
      if (e.code === 'Digit2') setActiveTool('delete');
      if (e.code === 'Digit3') setActiveTool('move');
      if (e.code === 'Digit4') setActiveTool('scale');
      if (e.code === 'Digit5') setActiveTool('rotate');

      // Z to undo
      if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey)) {
        const spawner = getWorldSpawner();
        const entities = spawner.getAll();
        if (entities.length > 0) {
          spawner.delete(entities[entities.length - 1].id);
          setSpawnedEntities(spawner.getAll());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="absolute inset-0">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2, 10], fov: 60 }}
        shadows
        onCreated={({ scene }) => {
          sceneRef.current = scene;
          getWorldSpawner().setScene(scene);
        }}
      >
        <Suspense fallback={null}>
          {/* Environment */}
          <BrightDaytimeSky />

          {/* God Mode Movement */}
          <GodModeController />

          {/* Ground */}
          <GrassGround />

          {/* Spawn Point Marker */}
          <SpawnMarker activeTool={activeTool} entityType={selectedEntityType} />

          {/* VR UI */}
          {showUI && (
            <>
              <VRBrittneyPanel
                messages={messages}
                isListening={isListening}
                isGenerating={isGenerating}
                currentTranscript={currentTranscript}
              />

              <VRToolsMenu
                activeTool={activeTool}
                onToolSelect={setActiveTool}
                selectedEntityType={selectedEntityType}
                onEntityTypeSelect={setSelectedEntityType}
              />

              <VRCrosshair visible={activeTool !== 'spawn'} />
            </>
          )}

          {/* Click handler for spawning */}
          <ClickToSpawn
            activeTool={activeTool}
            entityType={selectedEntityType}
            onSpawn={() => setSpawnedEntities(getWorldSpawner().getAll())}
            onDelete={(id) => {
              getWorldSpawner().delete(id);
              setSpawnedEntities(getWorldSpawner().getAll());
            }}
          />

          {/* Desktop controls */}
          <OrbitControls enabled={false} enablePan={false} />
        </Suspense>
      </Canvas>

      {/* Desktop UI Overlay */}
      {showUI && (
        <>
          {/* Top bar */}
          <div className="absolute top-4 left-4 glass rounded-2xl px-5 py-3 shadow-meadow">
            <h1 className="text-lg font-bold text-meadow-text">VR Builder</h1>
            <p className="text-xs text-meadow-text-muted">
              God Mode Active · {spawnedEntities.length} objects
            </p>
          </div>

          {/* Voice status */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div
              className={`
                glass rounded-full px-4 py-2 flex items-center gap-2 transition-all
                ${isListening ? 'bg-meadow-success/20 border-meadow-success' : ''}
                ${isGenerating ? 'bg-meadow-golden/20' : ''}
              `}
            >
              <div
                className={`w-3 h-3 rounded-full ${
                  isListening ? 'bg-meadow-success animate-pulse' : 'bg-meadow-text-muted'
                }`}
              />
              <span className="text-sm text-meadow-text">
                {isListening
                  ? currentTranscript || 'Listening... (say "Brittney")'
                  : isGenerating
                    ? 'Thinking...'
                    : 'Press V to talk'}
              </span>
            </div>
          </div>

          {/* Controls hint */}
          <div className="absolute bottom-4 left-4 glass rounded-xl px-4 py-3 text-sm">
            <p className="text-meadow-text font-medium mb-2">Controls:</p>
            <div className="text-meadow-text-muted text-xs space-y-1">
              <p>WASD - Move · Mouse - Look · Space/Ctrl - Up/Down</p>
              <p>V - Voice · H - Toggle UI · Click - Place/Select</p>
              <p>1-5 - Tools · Shift - Speed Boost · Ctrl+Z - Undo</p>
            </div>
          </div>

          {/* Quick spawn palette */}
          <div className="absolute bottom-4 right-4 glass rounded-xl p-3">
            <p className="text-xs text-meadow-text-muted mb-2">Quick Spawn (Click)</p>
            <div className="flex gap-2">
              {(['box', 'sphere', 'tree', 'lamp', 'building'] as EntityType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedEntityType(type)}
                  className={`
                    px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                    ${
                      selectedEntityType === type
                        ? 'bg-meadow-grass text-white'
                        : 'bg-meadow-cream-dark text-meadow-text hover:bg-meadow-grass/20'
                    }
                  `}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Bright Mediterranean sky setup
function BrightDaytimeSky() {
  return (
    <>
      <Sky
        sunPosition={[100, 80, 50]}
        turbidity={8}
        rayleigh={0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Environment preset="park" />
      <ambientLight intensity={0.7} color="#FFF8E7" />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.5}
        color="#FFD54F"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#87CEEB', '#7CB342', 0.4]} />

      {/* Clouds */}
      <Cloud position={[-20, 20, -20]} speed={0.2} opacity={0.6} segments={20} />
      <Cloud position={[30, 25, -25]} speed={0.15} opacity={0.5} segments={18} />
      <Cloud position={[0, 22, -35]} speed={0.1} opacity={0.55} segments={22} />
    </>
  );
}

// Grass ground
function GrassGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#7CB342" roughness={0.9} />
    </mesh>
  );
}

// God mode controller component
function GodModeController() {
  useDesktopGodMode({ flySpeed: 15, verticalSpeed: 8 });
  return null;
}

// Spawn marker showing where object will be placed
function SpawnMarker({ activeTool, entityType }: { activeTool: VRTool; entityType: EntityType }) {
  const markerRef = useRef<THREE.Mesh>(null);
  const { camera, raycaster, pointer } = useThree();

  useFrame(() => {
    if (!markerRef.current || activeTool !== 'spawn') {
      if (markerRef.current) markerRef.current.visible = false;
      return;
    }

    markerRef.current.visible = true;

    // Raycast to find ground position
    raycaster.setFromCamera(pointer, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersection);

    if (intersection) {
      markerRef.current.position.copy(intersection);
      markerRef.current.position.y = 0.05;
    }
  });

  return (
    <mesh ref={markerRef} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.4, 0.5, 32]} />
      <meshBasicMaterial color="#7CB342" transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Click handler for spawning/deleting
function ClickToSpawn({
  activeTool,
  entityType,
  onSpawn,
  onDelete,
}: {
  activeTool: VRTool;
  entityType: EntityType;
  onSpawn: (entity: SpawnedEntity) => void;
  onDelete: (id: string) => void;
}) {
  const { camera, raycaster, pointer, scene } = useThree();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Only handle left clicks
      if (e.button !== 0) return;

      raycaster.setFromCamera(pointer, camera);

      if (activeTool === 'spawn') {
        // Raycast to ground
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, intersection);

        if (intersection) {
          const spawner = getWorldSpawner();
          const entity = spawner.spawnSimple(entityType, intersection);
          if (entity) onSpawn(entity);
        }
      } else if (activeTool === 'delete') {
        // Raycast to objects
        const intersects = raycaster.intersectObjects(scene.children, true);
        for (const hit of intersects) {
          // Find the root entity
          let obj: THREE.Object3D | null = hit.object;
          while (obj && !obj.name.startsWith('entity_')) {
            obj = obj.parent;
          }
          if (obj && obj.name.startsWith('entity_')) {
            onDelete(obj.name);
            break;
          }
        }
      }
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [activeTool, entityType, camera, raycaster, pointer, scene, onSpawn, onDelete]);

  return null;
}
